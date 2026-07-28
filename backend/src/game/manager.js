// Game registry: builds one RoundEngine per enabled game.
// Games and their overrides come from backend/games.config.json — add a new
// game there (and a module in games/) and it appears everywhere:
// data feeds, bet placement, settlement, game list.

const fs = require("fs");
const path = require("path");
const { RoundEngine } = require("./engine");

const MODULES = {
  dt20: require("./games/dt20"),
  lucky7: require("./games/lucky7"),
  teen20: require("./games/teen20"),
  ab20: require("./games/ab20"),
};

const CONFIG_FILE =
  process.env.GAMES_CONFIG || path.join(__dirname, "..", "..", "games.config.json");

const engines = new Map(); // gtype -> RoundEngine

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {}; // no config file -> every known game with defaults
  }
}

function init() {
  const config = loadConfig();
  for (const [gtype, factory] of Object.entries(MODULES)) {
    const overrides = config[gtype] || {};
    if (overrides.enabled === false) continue;
    const { enabled, ...gameOverrides } = overrides;
    const game = factory(gameOverrides);
    engines.set(gtype, new RoundEngine(game));
  }
  if (engines.size === 0) throw new Error("No games enabled in " + CONFIG_FILE);
}

function byGtype(gtype) {
  return engines.get(String(gtype));
}

function byMatchId(matchId) {
  for (const e of engines.values())
    if (String(e.game.matchId) === String(matchId)) return e;
  return null;
}

// find the engine a round id belongs to: live round first, then matchId prefix
function byMid(mid) {
  const m = String(mid || "");
  for (const e of engines.values()) if (e.state.mid === m) return e;
  for (const e of engines.values())
    if (m.startsWith(String(e.game.matchId))) return e;
  return null;
}

function all() {
  return [...engines.values()];
}

function start() {
  init();
  for (const e of engines.values()) e.startRound();
  setInterval(() => {
    for (const e of engines.values()) e.tick();
  }, 250);
}

module.exports = { start, byGtype, byMatchId, byMid, all };
