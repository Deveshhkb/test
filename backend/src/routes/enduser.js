// User/admin API — mounted at /admin-new-apis/enduser/
//   POST get-user-balance, POST get-stake-button, POST bet-list-by-matchid

const express = require("express");
const config = require("../config");
const db = require("../db");
const engine = require("../game/engine");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);

router.post("/get-user-balance", (req, res) => {
  const user = db.getUser(req.username);
  const open = engine.openStake(req.username);
  res.json({
    status: true,
    data: {
      balance: user.balance,
      libality: open > 0 ? -open : 0,
    },
  });
});

router.post("/get-stake-button", (req, res) => {
  const data = {};
  config.STAKE_BUTTONS.forEach((v, i) => (data[`buttonValue${i + 1}`] = v));
  res.json({ status: true, data });
});

router.post("/bet-list-by-matchid", (req, res) => {
  const bets = db.betsForUserToday(req.username).map((b) => ({
    nation: b.nat,
    rate: b.rate,
    amount: b.stake,
    roundId: b.mid,
    status: b.status,
    pnl: b.pnl,
  }));
  res.json({ status: true, data: { [config.GAME_NAME]: bets } });
});

module.exports = router;
