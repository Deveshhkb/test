const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
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

// the frontends ask this service for the client's IP
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

// Sounds the pages reference but that were never shipped in the game
// folders — serve the equivalent file that is present instead of 404ing.
const AUDIO_ALIASES = {
  "dealerplacebets.mp3": "startbetting.mp3",
  "dealerbetclosed.mp3": "stopbetting.mp3",
  "winroulette.wav": "winsong.mp3",
  "roulette_spinning_sound.mp3": "waitsound.mp3",
};

// --- game frontends: every folder mounted at /games/<folder>/ ---
const mounted = [];
for (const site of config.GAME_SITES) {
  for (const variant of ["web", "mobile"]) {
    const folder = site[variant];
    if (!folder) continue;
    const dir = path.join(config.ROOT, folder);
    if (!fs.existsSync(dir)) continue;

    app.get(`/games/${folder}/assets/audio/:file`, (req, res, next) => {
      const asked = path.join(dir, "assets", "audio", req.params.file);
      if (fs.existsSync(asked)) return res.sendFile(asked);
      const alias = AUDIO_ALIASES[req.params.file.toLowerCase()];
      const fallback = alias && path.join(dir, "assets", "audio", alias);
      if (fallback && fs.existsSync(fallback)) return res.sendFile(fallback);
      next();
    });

    app.use(`/games/${folder}`, express.static(dir));
    mounted.push({ ...site, variant, folder });
  }
}

// what the lobby page lists: only games that have both a frontend and a
// running backend game
app.get("/api/lobby", (req, res) => {
  const engines = new Map(manager.all().map((e) => [e.game.gtype, e]));
  const bySite = new Map();
  for (const m of mounted) {
    if (!engines.has(m.gtype)) continue;
    if (!bySite.has(m.gtype))
      bySite.set(m.gtype, { gtype: m.gtype, title: m.title, links: {} });
    bySite.get(m.gtype).links[m.variant] = `/games/${m.folder}/index.html`;
  }
  res.json({
    status: true,
    data: [...bySite.values()].map((g) => {
      const e = engines.get(g.gtype);
      return {
        ...g,
        matchId: e.game.matchId,
        autotime: e.autotime(),
        bettingOpen: e.isBettingOpen(),
      };
    }),
  });
});

// --- login + lobby pages at the root ---
app.use(express.static(config.PUBLIC_DIR));
app.get("/", (req, res) =>
  res.sendFile(path.join(config.PUBLIC_DIR, "lobby.html"))
);

// seed a demo account so the games are playable out of the box
if (!db.getUser("demo")) {
  db.createUser("demo", "demo1234");
  console.log("Seeded demo user: demo / demo1234");
}

manager.start();
app.listen(config.PORT, () => {
  console.log(`Casino backend on http://localhost:${config.PORT}`);
  console.log(`Lobby: http://localhost:${config.PORT}/  (login: demo / demo1234)`);
  console.log(
    `Games running: ${manager.all().map((e) => e.game.gtype).join(", ")}`
  );
  console.log(`Frontends mounted: ${mounted.length}`);
});
