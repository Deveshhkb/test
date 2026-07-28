const path = require("path");

module.exports = {
  PORT: Number(process.env.PORT) || 8080,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  TOKEN_TTL_SECONDS: 24 * 60 * 60,
  ADMIN_KEY: process.env.ADMIN_KEY || "admin-key-change-me",
  DB_FILE: process.env.DB_FILE || path.join(__dirname, "..", "data", "db.json"),
  FRONTEND_DIR:
    process.env.FRONTEND_DIR ||
    path.join(__dirname, "..", "..", "dragonTiger_Web"),

  // Game timing (seconds)
  BET_SECONDS: 45, // betting window; frontend expects a 45s timer
  REVEAL_C1_AT: 1.0, // seconds after betting closes
  REVEAL_C2_AT: 2.5,
  RESULT_AT: 4.0, // winner published + bets settled
  ROUND_GAP: 10.0, // betting closed -> next round opens

  MATCH_ID: 14,
  GAME_NAME: "VDragon Tiger",
  MIN_STAKE: 100,
  MAX_STAKE: 100000,
  STAKE_BUTTONS: [100, 500, 1000, 5000, 10000, 25000],
  STARTING_BALANCE: 100000,
};
