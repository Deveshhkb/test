const crypto = require("crypto");
const config = require("../config");
const db = require("../db");
const { SELECTIONS, bySid } = require("./selections");

const SUITS = ["SS", "HH", "CC", "DD"]; // spade, heart, club, diamond
const SUIT_LABEL = { SS: "♠", HH: "♥", CC: "♣", DD: "♦" };
const RANK_CODE = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function drawTwoCards() {
  // two distinct cards from a freshly shuffled 52-card deck (CSPRNG)
  const a = crypto.randomInt(52);
  let b = crypto.randomInt(51);
  if (b >= a) b += 1;
  const toCard = (n) => {
    const rank = (n % 13) + 1;
    const suit = SUITS[Math.floor(n / 13)];
    return { rank, suit, code: RANK_CODE[rank - 1] + suit };
  };
  return [toCard(a), toCard(b)];
}

function cardLabel(c) {
  return `${RANK_CODE[c.rank - 1]}${SUIT_LABEL[c.suit]}`;
}

// ---- round state ----------------------------------------------------------

const state = {
  mid: null,
  betOpenedAt: 0, // ms epoch when betting opened
  betClosesAt: 0,
  dragon: null,
  tiger: null,
  winner: null, // "1" dragon | "2" tiger | "3" tie
  settled: false,
};

function newMid() {
  // numeric-looking round id: <matchId><yymmddHHMMSS>
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${config.MATCH_ID}` +
    `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function startRound() {
  const [dragon, tiger] = drawTwoCards();
  state.mid = newMid();
  state.dragon = dragon;
  state.tiger = tiger;
  state.winner =
    dragon.rank === tiger.rank ? "3" : dragon.rank > tiger.rank ? "1" : "2";
  state.settled = false;
  state.betOpenedAt = Date.now();
  state.betClosesAt = state.betOpenedAt + config.BET_SECONDS * 1000;
}

// seconds since betting closed; negative while betting is open
function sinceClose() {
  return (Date.now() - state.betClosesAt) / 1000;
}

function isBettingOpen() {
  return Date.now() < state.betClosesAt;
}

// autotime the frontend shows: 45..1 while betting, then 0
function autotime() {
  const left = Math.ceil((state.betClosesAt - Date.now()) / 1000);
  return Math.max(0, Math.min(config.BET_SECONDS, left));
}

function visibleCards() {
  const t = sinceClose();
  return {
    C1: t >= config.REVEAL_C1_AT ? state.dragon.code : "",
    C2: t >= config.REVEAL_C2_AT ? state.tiger.code : "",
  };
}

// ---- settlement -----------------------------------------------------------

function settleRound() {
  if (state.settled) return;
  state.settled = true;

  const outcome = { dragon: state.dragon, tiger: state.tiger, winner: state.winner };

  for (const bet of db.openBets(state.mid)) {
    const sel = bySid.get(bet.sid);
    if (!sel) continue;
    const isMainBet = bet.sid === 1 || bet.sid === 3; // Dragon / Tiger
    if (sel.wins(outcome)) {
      bet.status = "won";
      bet.pnl = Math.round(bet.stake * (bet.rate - 1) * 100) / 100;
      db.adjustBalance(bet.username, bet.stake * bet.rate); // stake back + profit
    } else if (isMainBet && outcome.winner === "3") {
      // casino rule: on a tie, half the Dragon/Tiger stake is returned
      bet.status = "lost";
      bet.pnl = -bet.stake / 2;
      db.adjustBalance(bet.username, bet.stake / 2);
    } else {
      bet.status = "lost";
      bet.pnl = -bet.stake;
    }
  }

  const winnerDetail =
    state.winner === "1" ? "Dragon Win" : state.winner === "2" ? "Tiger Win" : "Tie";

  db.addResult({
    mid: state.mid,
    winner: state.winner,
    C1: state.dragon.code,
    C2: state.tiger.code,
    dragonDetail: `Dragon : ${cardLabel(state.dragon)}`,
    tigerDetail: `Tiger : ${cardLabel(state.tiger)}`,
    winnerDetail,
    createdAt: Date.now(),
  });
  db.save();
}

// ---- public API for routes ------------------------------------------------

function getT1() {
  const cards = visibleCards();
  return [
    {
      gtype: "dt20",
      mid: state.mid,
      autotime: autotime(),
      min: config.MIN_STAKE,
      max: config.MAX_STAKE,
      C1: cards.C1,
      C2: cards.C2,
      remark: "",
    },
  ];
}

function getT2() {
  const gstatus = isBettingOpen() ? 1 : 0;
  return SELECTIONS.map((s) => ({
    sid: s.sid,
    nat: s.nat,
    rate: s.rate,
    gstatus,
    mid: state.mid,
    min: config.MIN_STAKE,
    max: config.MAX_STAKE,
  }));
}

function placeBet(username, { selectionId, stake, marketId }) {
  const sel = bySid.get(Number(selectionId));
  if (!sel) return { status: false, message: "Invalid selection" };
  if (String(marketId) !== String(state.mid))
    return { status: false, message: "Round is over, wait for the next round" };
  if (!isBettingOpen()) return { status: false, message: "Betting is closed" };

  const amount = Number(stake);
  if (!Number.isFinite(amount) || amount < config.MIN_STAKE)
    return { status: false, message: `Minimum bet is ${config.MIN_STAKE}` };
  if (amount > config.MAX_STAKE)
    return { status: false, message: `Maximum bet is ${config.MAX_STAKE}` };

  const user = db.getUser(username);
  if (!user) return { status: false, message: "User not found" };
  if (user.balance < amount)
    return { status: false, message: "Insufficient balance" };

  db.adjustBalance(username, -amount);
  db.addBet({
    id: crypto.randomUUID(),
    username,
    mid: state.mid,
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

function liabilityFor(username, roundId) {
  const mid = String(roundId || state.mid);
  const bets = db.betsForRound(username, mid).filter((b) => b.status === "open");
  return SELECTIONS.map((s) => {
    const onSid = bets.filter((b) => b.sid === s.sid);
    const potential = onSid.reduce((sum, b) => sum + b.stake * (b.rate - 1), 0);
    return { sid: s.sid, liability: Math.round(potential * 100) / 100 };
  });
}

function openStake(username) {
  return db
    .betsForRound(username, state.mid)
    .filter((b) => b.status === "open")
    .reduce((sum, b) => sum + b.stake, 0);
}

function tick() {
  if (!state.mid) return startRound();
  const t = sinceClose();
  if (t >= config.RESULT_AT && !state.settled) settleRound();
  if (t >= config.ROUND_GAP) startRound();
}

function start() {
  startRound();
  setInterval(tick, 250);
}

module.exports = { start, state, getT1, getT2, placeBet, liabilityFor, openStake };
