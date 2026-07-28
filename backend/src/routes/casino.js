// Game data feed — the endpoints livegame.js polls every second.
//   GET /CasinoAdmin/GetData/dt20Data
//   GET /CasinoAdmin/GetData/dt20Result
//   GET /CasinoAdmin/GameResultById?mid=...

const express = require("express");
const engine = require("../game/engine");
const db = require("../db");

const router = express.Router();

router.get("/GetData/dt20Data", (req, res) => {
  res.json({
    success: true,
    data: { t1: engine.getT1(), t2: engine.getT2() },
  });
});

router.get("/GetData/dt20Result", (req, res) => {
  res.json(
    db.lastResults(10).map((r) => ({
      mid: r.mid,
      winner: r.winner,
      C1: r.C1,
      C2: r.C2,
    }))
  );
});

router.get("/GameResultById", (req, res) => {
  const result = db.resultByMid(req.query.mid);
  if (!result)
    return res.status(404).json({ status: false, message: "Result not found" });
  res.json({
    mid: result.mid,
    winner: result.winner,
    C1: result.C1,
    C2: result.C2,
    dragonDetail: result.dragonDetail,
    tigerDetail: result.tigerDetail,
    winnerDetail: result.winnerDetail,
  });
});

module.exports = router;
