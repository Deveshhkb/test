// Game data feeds — one set of endpoints for every registered game:
//   GET /CasinoAdmin/GetData/<gtype>Data     e.g. dt20Data, lucky7Data
//   GET /CasinoAdmin/GetData/<gtype>Result   e.g. dt20Result
//   GET /CasinoAdmin/GameResultById?mid=...
//   GET /CasinoAdmin/Games                   list of live games + state

const express = require("express");
const manager = require("../game/manager");
const db = require("../db");

const router = express.Router();

router.get("/GetData/:key", (req, res) => {
  const key = String(req.params.key);

  if (key.endsWith("Data")) {
    const engine = manager.byGtype(key.slice(0, -4));
    if (!engine) return res.status(404).json({ success: false, message: "Unknown game" });
    return res.json({
      success: true,
      data: { t1: engine.getT1(), t2: engine.getT2() },
    });
  }

  if (key.endsWith("Result")) {
    const gtype = key.slice(0, -6);
    if (!manager.byGtype(gtype))
      return res.status(404).json({ success: false, message: "Unknown game" });
    return res.json(
      db.lastResults(10, gtype).map(({ createdAt, gtype: g, ...r }) => r)
    );
  }

  res.status(404).json({ success: false, message: "Unknown feed" });
});

router.get("/GameResultById", (req, res) => {
  const result = db.resultByMid(req.query.mid);
  if (!result)
    return res.status(404).json({ status: false, message: "Result not found" });
  const { createdAt, ...rest } = result;
  res.json(rest);
});

router.get("/Games", (req, res) => {
  res.json({
    success: true,
    data: manager.all().map((e) => ({
      gtype: e.game.gtype,
      name: e.game.name,
      matchId: e.game.matchId,
      mid: e.state.mid,
      autotime: e.autotime(),
      bettingOpen: e.isBettingOpen(),
    })),
  });
});

module.exports = router;
