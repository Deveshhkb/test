// Generic round engine — one instance per game.
//
// A game module provides (see games/*.js):
//   gtype, name, matchId            identity
//   betSeconds, reveals[], resultAt, roundGap   timing (seconds)
//   minStake, maxStake
//   selections: [{ sid, nat, rate }]
//   deal() -> outcome               { cards: [...], winner: "1"|"2"|"3", ... }
//   payout(sid, outcome) -> stake multiplier (0 = lost, rate = won,
//                                    0.5 = half refund, 1 = push)
//   detail(outcome) -> extra fields for GameResultById (dragonDetail, ...)
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

  visibleCards() {
    const t = this.sinceClose();
    const cards = {};
    this.game.reveals.forEach((revealAt, i) => {
      const card = this.state.outcome.cards[i];
      cards[`C${i + 1}`] = t >= revealAt && card ? card.code : "";
    });
    return cards;
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
        ...this.visibleCards(),
      },
    ];
  }

  getT2() {
    const gstatus = this.isBettingOpen() ? 1 : 0;
    return this.game.selections.map((s) => ({
      sid: s.sid,
      nat: s.nat,
      rate: s.rate,
      gstatus,
      mid: this.state.mid,
      min: this.game.minStake,
      max: this.game.maxStake,
    }));
  }

  placeBet(username, { selectionId, stake, marketId }) {
    const sel = this.bySid.get(Number(selectionId));
    if (!sel) return { status: false, message: "Invalid selection" };
    if (String(marketId) !== String(this.state.mid))
      return { status: false, message: "Round is over, wait for the next round" };
    if (!this.isBettingOpen())
      return { status: false, message: "Betting is closed" };

    const amount = Number(stake);
    if (!Number.isFinite(amount) || amount < this.game.minStake)
      return { status: false, message: `Minimum bet is ${this.game.minStake}` };
    if (amount > this.game.maxStake)
      return { status: false, message: `Maximum bet is ${this.game.maxStake}` };

    const user = db.getUser(username);
    if (!user) return { status: false, message: "User not found" };
    if (user.balance < amount)
      return { status: false, message: "Insufficient balance" };

    db.adjustBalance(username, -amount);
    db.addBet({
      id: crypto.randomUUID(),
      username,
      gtype: this.game.gtype,
      mid: this.state.mid,
      sid: sel.sid,
      nat: sel.nat,
      rate: sel.rate,
      stake: amount,
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
      if (mult > 0) db.adjustBalance(bet.username, bet.stake * mult);
      bet.pnl = Math.round(bet.stake * (mult - 1) * 100) / 100;
      bet.status = mult > 1 ? "won" : mult === 1 ? "void" : "lost";
    }

    db.addResult({
      gtype: this.game.gtype,
      mid: this.state.mid,
      winner: outcome.winner,
      ...this.visibleCardsFinal(),
      ...this.game.detail(outcome),
      createdAt: Date.now(),
    });
    db.save();
  }

  visibleCardsFinal() {
    const cards = {};
    this.game.reveals.forEach((_, i) => {
      cards[`C${i + 1}`] = this.state.outcome.cards[i]?.code || "";
    });
    return cards;
  }

  liabilityFor(username, roundId) {
    const mid = String(roundId || this.state.mid);
    const bets = db
      .betsForRound(username, mid)
      .filter((b) => b.status === "open");
    return this.game.selections.map((s) => {
      const potential = bets
        .filter((b) => b.sid === s.sid)
        .reduce((sum, b) => sum + b.stake * (b.rate - 1), 0);
      return { sid: s.sid, liability: Math.round(potential * 100) / 100 };
    });
  }

  openStake(username) {
    return db
      .betsForRound(username, this.state.mid)
      .filter((b) => b.status === "open")
      .reduce((sum, b) => sum + b.stake, 0);
  }

  tick() {
    if (!this.state.mid) return this.startRound();
    const t = this.sinceClose();
    if (t >= this.game.resultAt && !this.state.settled) this.settleRound();
    if (t >= this.game.roundGap) this.startRound();
  }
}

module.exports = { RoundEngine };
