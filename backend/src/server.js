const express = require("express");
const cors = require("cors");
const fs = require("fs");
const config = require("./config");
const db = require("./db");
const manager = require("./game/manager");
const { cardsRoute } = require("./cards");

const app = express();
app.use(cors());
app.use(express.json());

// --- API routes (paths match what the game frontends call) ---
app.use("/CasinoAdmin", require("./routes/casino"));
app.use("/VirtualCasinoBetPlacer/vc", require("./routes/bet"));
app.use("/admin-new-apis/enduser", require("./routes/enduser"));
app.use("/auth", require("./routes/auth"));

// card images: /images/cards/KHH.png etc.
app.get("/images/cards/:card", cardsRoute);

// the frontend asks this service for the client's IP
app.get("/betfair_api/my-ip", (req, res) => {
  res.json({ ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.ip });
});

app.get("/health", (req, res) =>
  res.json({
    ok: true,
    uptime: process.uptime(),
    games: manager.all().map((e) => ({
      gtype: e.game.gtype,
      mid: e.state.mid,
      autotime: e.autotime(),
    })),
  })
);

// --- static frontend ---
if (fs.existsSync(config.FRONTEND_DIR)) {
  app.use(express.static(config.FRONTEND_DIR));
}

// seed a demo account so the game is playable out of the box
if (!db.getUser("demo")) {
  db.createUser("demo", "demo1234");
  console.log("Seeded demo user: demo / demo1234");
}

manager.start();
app.listen(config.PORT, () => {
  console.log(`Casino backend on http://localhost:${config.PORT}`);
  console.log(
    "Games:",
    manager
      .all()
      .map((e) => `${e.game.name} (${e.game.gtype}, matchId ${e.game.matchId})`)
      .join(", ")
  );
  console.log(`Game page: http://localhost:${config.PORT}/login.html`);
});
