// Bet placer — mounted at /VirtualCasinoBetPlacer/vc/
//   POST place-bet, POST liability, POST casino-game-list

const express = require("express");
const config = require("../config");
const engine = require("../game/engine");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);

router.post("/place-bet", (req, res) => {
  const { selectionId, stake, marketId } = req.body || {};
  const result = engine.placeBet(req.username, { selectionId, stake, marketId });
  res.status(result.status ? 200 : 400).json(result);
});

router.post("/liability", (req, res) => {
  const { roundId } = req.body || {};
  res.json({ status: true, data: engine.liabilityFor(req.username, roundId) });
});

router.post("/casino-game-list", (req, res) => {
  res.json({
    status: true,
    data: [
      {
        id: config.MATCH_ID,
        name: config.GAME_NAME,
        gameType: "virtual",
        gtype: "dt20",
      },
    ],
  });
});

module.exports = router;
