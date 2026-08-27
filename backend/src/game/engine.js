// Generic round engine — one instance per game.
//
// A game module provides (see games/*.js):
//   gtype, name, matchId            identity
//   betSeconds, reveals[], resultAt, roundGap   timing (seconds)
//   minStake, maxStake
//   selections: [{ sid, nat, rate, layrate? }]
//   deal() -> outcome               { cards: [...], winner: "1"|"2"|..., ... }
//   payout(sid, outcome) -> stake multiplier for a BACK bet
//                           0 = lost, >1 = won, 1 = push, 0.5 = half refund
//   detail(outcome) -> extra fields for GameResultById
//   joinCards (optional)            emit every card in C1 as "a,b,c" (otp)
//
// The engine owns the round lifecycle: betting window -> timed card reveals
// -> result published + bets settled -> gap -> next round.

const crypto = require("crypto");
const db = require("../db");

class RoundEngine {
  constructor(game) {
    this.game = game;
    this.state = {
      mid: null,
      outcome: null,
      betOpenedAt: 0,
      betClosesAt: 0,
      settled: false,
    };
    this.bySid = new Map(game.selections.map((s) => [s.sid, s]));
  }

  newMid() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return (
      `${this.game.matchId}` +
      `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}` +
      `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
    );
  }

  startRound() {
    this.state.mid = this.newMid();
    this.state.outcome = this.game.deal();
    this.state.settled = false;
    this.state.betOpenedAt = Date.now();
    this.state.betClosesAt = this.state.betOpenedAt + this.game.betSeconds * 1000;
  }

  sinceClose() {
    return (Date.now() - this.state.betClosesAt) / 1000;
  }

  isBettingOpen() {
    return Date.now() < this.state.betClosesAt;
  }

  autotime() {
    const left = Math.ceil((this.state.betClosesAt - Date.now()) / 1000);
    return Math.max(0, Math.min(this.game.betSeconds, left));
  }

  // cards visible right now; `final` ignores the reveal schedule
  cardFields(final = false) {
    const t = this.sinceClose();
    const all = this.state.outcome.cards;

    if (this.game.joinCards) {
      const shown = final || t >= this.game.reveals[0];
      return { C1: shown ? all.map((c) => c.code).join(",") : "" };
    }

    const out = {};
    this.game.reveals.forEach((revealAt, i) => {
      const card = all[i];
      out[`C${i + 1}`] = (final || t >= revealAt) && card ? card.code : "";
    });
    return out;
  }

  getT1() {
    return [
      {
        gtype: this.game.gtype,
        mid: this.state.mid,
        autotime: this.autotime(),
        min: this.game.minStake,
        max: this.game.maxStake,
        remark: "",
        ...this.cardFields(),
      },
    ];
  }

  getT2() {
    const gstatus = this.isBettingOpen() ? 1 : 0;
    return this.game.selections.map((s) => ({
      sid: s.sid,
      nat: s.nat,
      rate: s.rate,
      ...(s.layrate ? { layrate: s.layrate } : {}),
      gstatus,
      mid: this.state.mid,
      min: this.game.minStake,
      max: this.game.maxStake,
    }));
  }

  placeBet(username, { selectionId, stake, marketId, isBack }) {
    const sel = this.bySid.get(Number(selectionId));
    if (!sel) return { status: false, message: "Invalid selection" };
    if (String(marketId) !== String(this.state.mid))
      return { status: false, message: "Round is over, wait for the next round" };
    if (!this.isBettingOpen())
      return { status: false, message: "Betting is closed" };

    const back = isBack !== false;
    if (!back && !sel.layrate)
      return { status: false, message: "This market cannot be laid" };

    const amount = Number(stake);
    if (!Number.isFinite(amount) || amount < this.game.minStake)
      return { status: false, message: `Minimum bet is ${this.game.minStake}` };
    if (amount > this.game.maxStake)
      return { status: false, message: `Maximum bet is ${this.game.maxStake}` };

    // odds always come from the server, never from the client
    const odds = back ? sel.rate : sel.layrate;
    // a back bet risks the stake; a lay bet risks stake x (odds - 1)
    const risk = Math.round((back ? amount : amount * (odds - 1)) * 100) / 100;

    const user = db.getUser(username);
    if (!user) return { status: false, message: "User not found" };
    if (user.balance < risk)
      return { status: false, message: "Insufficient balance" };

    db.adjustBalance(username, -risk);
    db.addBet({
      id: crypto.randomUUID(),
      username,
      gtype: this.game.gtype,
      mid: this.state.mid,
      sid: sel.sid,
      nat: sel.nat,
      rate: odds,
      isBack: back,
      stake: amount,
      risk,
      status: "open",
      pnl: 0,
      createdAt: Date.now(),
    });
    return { status: true, message: "Bet placed" };
  }

  settleRound() {
    if (this.state.settled) return;
    this.state.settled = true;
    const outcome = this.state.outcome;

    for (const bet of db.openBets(this.state.mid)) {
      const mult = this.game.payout(bet.sid, outcome);
      let credit;
      if (bet.isBack === false) {
        // lay: the selection winning (mult > 1) costs the risk; otherwise the
        // lay side collects the backer's stake, scaled for a push or
        // half-refund result.
        credit = mult > 1 ? 0 : bet.risk + bet.stake * (1 - mult);
      } else {
        credit = bet.stake * mult;
      }
      credit = Math.round(credit * 100) / 100;
      if (credit > 0) db.adjustBalance(bet.username, credit);
      bet.pnl = Math.round((credit - bet.risk) * 100) / 100;
      bet.status = bet.pnl > 0 ? "won" : bet.pnl < 0 ? "lost" : "void";
    }

    // Several pages read a single `detail` string split on " || ".
    const detailObj = this.game.detail(outcome);
    const parts = this.game.detailParts
      ? this.game.detailParts(outcome)
      : Object.values(detailObj);

    db.addResult({
      gtype: this.game.gtype,
      mid: this.state.mid,
      winner: outcome.winner,
      ...this.cardFields(true),
      ...detailObj,
      detail: parts.join(" || "),
      createdAt: Date.now(),
    });
    db.save();
  }

  liabilityFor(username, roundId) {
    const mid = String(roundId || this.state.mid);
    const bets = db
      .betsForRound(username, mid)
      .filter((b) => b.status === "open");
    return this.game.selections.map((s) => {
      const potential = bets
        .filter((b) => b.sid === s.sid)
        .reduce(
          (sum, b) =>
            sum + (b.isBack === false ? b.stake : b.stake * (b.rate - 1)),
          0
        );
      return { sid: s.sid, liability: Math.round(potential * 100) / 100 };
    });
  }

  openStake(username) {
    return db
      .betsForRound(username, this.state.mid)
      .filter((b) => b.status === "open")
      .reduce((sum, b) => sum + (b.risk ?? b.stake), 0);
  }

  tick() {
    if (!this.state.mid) return this.startRound();
    const t = this.sinceClose();
    if (t >= this.game.resultAt && !this.state.settled) this.settleRound();
    if (t >= this.game.roundGap) this.startRound();
  }
}

module.exports = { RoundEngine };
