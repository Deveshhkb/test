const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

// Every game frontend in the repo, mounted at /games/<folder>/.
// `gtype` links the page to its backend game (games.config.json).
// Add a row here when you drop a new game folder into the repo.
const GAME_SITES = [
  { gtype: "dt20", title: "Dragon Tiger", web: "dragonTiger_Web", mobile: "dragontiger_mobile" },
  { gtype: "dtl20", title: "Dragon Tiger Lion", web: "dragontigerlion_web", mobile: "dragontigerlion_mobile" },
  { gtype: "t20", title: "20-20 Teen Patti", web: "teenpati", mobile: "teenpatti_mobile" },
  { gtype: "otp", title: "Open Teen Patti", web: "ovteenpatti", mobile: "overtp_mobile" },
  { gtype: "lucky7A", title: "Lucky 7-A", web: "lucky7_web", mobile: "lucky7_mobile" },
  { gtype: "aaa", title: "Amar Akbar Anthony", web: "aaatp_web", mobile: "aaa_mobile" },
  { gtype: "bwdtbl", title: "Bollywood Casino", web: "bollywood-web", mobile: "bollywood_mobile" },
];

module.exports = {
  PORT: Number(process.env.PORT) || 8080,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  TOKEN_TTL_SECONDS: 24 * 60 * 60,
  ADMIN_KEY: process.env.ADMIN_KEY || "admin-key-change-me",
  DB_FILE: process.env.DB_FILE || path.join(__dirname, "..", "data", "db.json"),

  ROOT,
  GAME_SITES,
  PUBLIC_DIR: path.join(__dirname, "..", "public"), // login + lobby pages

  STAKE_BUTTONS: [100, 500, 1000, 5000, 10000, 25000],
  STARTING_BALANCE: 100000,
};
