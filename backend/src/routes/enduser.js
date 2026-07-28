// User API — mounted at /admin-new-apis/enduser/
//   POST get-user-balance, POST get-stake-button, POST bet-list-by-matchid

const express = require("express");
const config = require("../config");
const db = require("../db");
const manager = require("../game/manager");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);

router.post("/get-user-balance", (req, res) => {
  const user = db.getUser(req.username);
  // exposure = open stakes across every live round of every game
  const open = manager
    .all()
    .reduce((sum, e) => sum + e.openStake(req.username), 0);
  res.json({
    status: true,
    data: { balance: user.balance, libality: open > 0 ? -open : 0 },
  });
});

router.post("/get-stake-button", (req, res) => {
  const data = {};
  config.STAKE_BUTTONS.forEach((v, i) => (data[`buttonValue${i + 1}`] = v));
  res.json({ status: true, data });
});

router.post("/bet-list-by-matchid", (req, res) => {
  const { matchId } = req.body || {};
  const engine = matchId != null ? manager.byMatchId(matchId) : null;
  const bets = db.betsForUserToday(req.username);

  const toRow = (b) => ({
    nation: b.nat,
    rate: b.rate,
    amount: b.stake,
    roundId: b.mid,
    status: b.status,
    pnl: b.pnl,
  });

  if (engine) {
    // one game requested -> keyed by that game's display name
    const rows = bets.filter((b) => b.gtype === engine.game.gtype).map(toRow);
    return res.json({ status: true, data: { [engine.game.name]: rows } });
  }

  // no/unknown matchId -> all games, grouped by name
  const data = {};
  for (const e of manager.all())
    data[e.game.name] = bets.filter((b) => b.gtype === e.game.gtype).map(toRow);
  res.json({ status: true, data });
});

module.exports = router;
