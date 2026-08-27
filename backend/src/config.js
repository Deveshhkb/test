const path = require("path");

// Server-level settings. Per-game settings (odds, timers, stakes) live in
// backend/games.config.json and the modules in src/game/games/.

module.exports = {
  PORT: Number(process.env.PORT) || 8080,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  TOKEN_TTL_SECONDS: 24 * 60 * 60,
  ADMIN_KEY: process.env.ADMIN_KEY || "admin-key-change-me",
  DB_FILE: process.env.DB_FILE || path.join(__dirname, "..", "data", "db.json"),
  FRONTEND_DIR:
    process.env.FRONTEND_DIR ||
    path.join(__dirname, "..", "..", "lucky7_web"),
    // path.join(__dirname, "..", "..", "dragonTiger_Web"),

  STAKE_BUTTONS: [100, 500, 1000, 5000, 10000, 25000],
  STARTING_BALANCE: 100000,
};
