const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");

// Tiny JSON-file store: good enough for a single-process game server.
// Swap for a real database by re-implementing the exported functions.

let db = {
  users: {}, // username -> { username, passwordHash, balance }
  bets: [], // { id, username, mid, sid, nat, rate, stake, status, pnl, placeTime, createdAt }
  results: [], // { mid, winner, C1, C2, dragonDetail, tigerDetail, winnerDetail, createdAt } newest first
};

function load() {
  try {
    db = { ...db, ...JSON.parse(fs.readFileSync(config.DB_FILE, "utf8")) };
  } catch {
    /* first run */
  }
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.mkdirSync(path.dirname(config.DB_FILE), { recursive: true });
    fs.writeFileSync(config.DB_FILE, JSON.stringify(db, null, 2));
  }, 200);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

function getUser(username) {
  return db.users[username];
}

function createUser(username, password, balance = config.STARTING_BALANCE) {
  if (db.users[username]) return null;
  db.users[username] = {
    username,
    passwordHash: hashPassword(password),
    balance,
  };
  save();
  return db.users[username];
}

function adjustBalance(username, delta) {
  const user = db.users[username];
  if (!user) return null;
  user.balance = Math.round((user.balance + delta) * 100) / 100;
  save();
  return user.balance;
}

function addBet(bet) {
  db.bets.push(bet);
  save();
}

function betsForRound(username, mid) {
  return db.bets.filter((b) => b.username === username && b.mid === mid);
}

function openBets(mid) {
  return db.bets.filter((b) => b.mid === mid && b.status === "open");
}

function betsForUserToday(username) {
  const dayStart = new Date().setHours(0, 0, 0, 0);
  return db.bets
    .filter((b) => b.username === username && b.createdAt >= dayStart)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function addResult(result) {
  db.results.unshift(result);
  if (db.results.length > 200) db.results.length = 200;
  // keep the bets list from growing forever
  if (db.bets.length > 20000) db.bets.splice(0, db.bets.length - 20000);
  save();
}

function lastResults(n = 10) {
  return db.results.slice(0, n);
}

function resultByMid(mid) {
  return db.results.find((r) => r.mid === String(mid));
}

load();

module.exports = {
  load,
  save,
  getUser,
  createUser,
  verifyPassword,
  adjustBalance,
  addBet,
  betsForRound,
  openBets,
  betsForUserToday,
  addResult,
  lastResults,
  resultByMid,
};
