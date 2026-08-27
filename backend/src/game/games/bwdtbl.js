// Bollywood Casino (bwdtbl, matchId 13) — one card.
// The movie markets are back+lay (frontend reads obj.layrate); the rest are
// back only. Market names must match bollywood-web / bollywood_mobile:
//   don, amar akbar anthony, sahib bibi aur ghulam, dharam veer,
//   kis kisko pyaar karoon, ghulam, odd, dulha dulhan k-q, barati j-a,
//   black, red, card j, card q, card k, card a

const { drawCards, isRed, isEven, cardLabel } = require("../../cards");

// Card ranks (1 = Ace ... 11 = J, 12 = Q, 13 = K) behind each movie market.
// Override in games.config.json to match your operator's rule set.
const DEFAULT_GROUPS = {
  don: [1, 2],
  "amar akbar anthony": [3, 4, 5],
  "sahib bibi aur ghulam": [6, 7, 8],
  "dharam veer": [9, 10],
  "kis kisko pyaar karoon": [11, 12, 13],
};

module.exports = function bwdtbl(overrides = {}) {
  const rates = {
    don: 6.5,
    aaa: 4.3,
    sbg: 4.3,
    dharamVeer: 6.5,
    kkpk: 4.3,
    ghulam: 3.9,
    odd: 1.83,
    dulhaDulhan: 5.8,
    baratiJA: 5.8,
    color: 1.97,
    card: 12,
    ...overrides.rates,
  };
  const layRates = {
    don: 6.7,
    aaa: 4.4,
    sbg: 4.4,
    dharamVeer: 6.7,
    kkpk: 4.4,
    ghulam: 4.0,
    odd: 1.93,
    ...overrides.layRates,
  };
  const groups = { ...DEFAULT_GROUPS, ...overrides.groups };

  const game = {
    gtype: "bwdtbl",
    name: "VBollywood Casino",
    matchId: 13,
    betSeconds: 45,
    reveals: [1.5], // C1
    resultAt: 3.0,
    roundGap: 9.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
    layRates,
    groups,
  };

  const sel = [];
  const add = (nat, rate, layrate) =>
    sel.push({ sid: sel.length + 1, nat, rate, ...(layrate ? { layrate } : {}) });

  add("Don", rates.don, layRates.don);
  add("Amar Akbar Anthony", rates.aaa, layRates.aaa);
  add("Sahib Bibi Aur Ghulam", rates.sbg, layRates.sbg);
  add("Dharam Veer", rates.dharamVeer, layRates.dharamVeer);
  add("Kis Kisko Pyaar Karoon", rates.kkpk, layRates.kkpk);
  add("Ghulam", rates.ghulam, layRates.ghulam);
  add("Odd", rates.odd, layRates.odd);
  add("Dulha Dulhan K-Q", rates.dulhaDulhan);
  add("Barati J-A", rates.baratiJA);
  add("Black", rates.color);
  add("Red", rates.color);
  add("Card J", rates.card);
  add("Card Q", rates.card);
  add("Card K", rates.card);
  add("Card A", rates.card);
  game.selections = sel;

  const inGroup = (name, rank) => (groups[name] || []).includes(rank);
  const GROUP_NAMES = Object.keys(DEFAULT_GROUPS);

  game.deal = () => {
    const [card] = drawCards(1);
    const idx = GROUP_NAMES.findIndex((n) => inGroup(n, card.rank));
    return { cards: [card], card, winner: String(idx + 1 || 1) };
  };

  game.payout = (sid, o) => {
    const s = game.selections[sid - 1];
    if (!s) return 0;
    const c = o.card;
    let won;
    switch (sid) {
      case 1: won = inGroup("don", c.rank); break;
      case 2: won = inGroup("amar akbar anthony", c.rank); break;
      case 3: won = inGroup("sahib bibi aur ghulam", c.rank); break;
      case 4: won = inGroup("dharam veer", c.rank); break;
      case 5: won = inGroup("kis kisko pyaar karoon", c.rank); break;
      case 6: won = c.rank === 11; break; // Ghulam = Jack
      case 7: won = !isEven(c); break;
      case 8: won = c.rank === 12 || c.rank === 13; break; // Dulha Dulhan K-Q
      case 9: won = c.rank === 11 || c.rank === 1; break; // Barati J-A
      case 10: won = !isRed(c); break;
      case 11: won = isRed(c); break;
      case 12: won = c.rank === 11; break;
      case 13: won = c.rank === 12; break;
      case 14: won = c.rank === 13; break;
      case 15: won = c.rank === 1; break;
      default: won = false;
    }
    return won ? s.rate : 0;
  };

  const winnerName = (o) => {
    const hit = GROUP_NAMES.find((n) => inGroup(n, o.card.rank));
    return hit ? hit.replace(/\b\w/g, (m) => m.toUpperCase()) : cardLabel(o.card);
  };

  game.detail = (o) => ({
    cardDetail: `Card : ${cardLabel(o.card)}`,
    winnerDetail: winnerName(o),
  });

  // the page splits `detail` on " || " and fills four result slots
  game.detailParts = (o) => [
    `Card : ${cardLabel(o.card)}`,
    `Result : ${winnerName(o)}`,
    `Colour : ${isRed(o.card) ? "Red" : "Black"}`,
    `Odd/Even : ${isEven(o.card) ? "Even" : "Odd"}`,
  ];

  return game;
};
