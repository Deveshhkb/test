// Bet placer — mounted at /VirtualCasinoBetPlacer/vc/
// Works for every registered game; the game is resolved from the bet's
// matchId (or from the round id when matchId is absent).

const express = require("express");
const manager = require("../game/manager");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);

router.post("/place-bet", (req, res) => {
  const { selectionId, stake, marketId, matchId, isBack } = req.body || {};
  const engine =
    (matchId != null && manager.byMatchId(matchId)) || manager.byMid(marketId);
  if (!engine)
    return res.status(400).json({ status: false, message: "Unknown game" });
  const result = engine.placeBet(req.username, {
    selectionId,
    stake,
    marketId,
    isBack,
  });
  res.status(result.status ? 200 : 400).json(result);
});

router.post("/liability", (req, res) => {
  const { roundId } = req.body || {};
  const engine = manager.byMid(roundId) || manager.all()[0];
  res.json({ status: true, data: engine.liabilityFor(req.username, roundId) });
});

router.post("/casino-game-list", (req, res) => {
  res.json({
    status: true,
    data: manager.all().map((e) => ({
      id: e.game.matchId,
      name: e.game.name,
      gameType: "virtual",
      gtype: e.game.gtype,
    })),
  });
});

module.exports = router;
