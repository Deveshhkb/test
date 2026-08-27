// Amar Akbar Anthony (aaa, matchId 20) — one card.
// Amar/Akbar/Anthony are back+lay markets (the frontend reads obj.layrate for
// the lay side); everything else is back only.
// Market names must match aaatp_web / aaa_mobile rowArr:
//   amar, akbar, anthony, even, odd, black, red, under 7, over 7, card a..card k

const { drawCards, isRed, isEven, cardLabel, RANK_CODE } = require("../../cards");

// Which card ranks belong to each of the three groups. Ranks are 1..13
// (1 = Ace ... 13 = King). Override in games.config.json to match your
// operator's rule set.
const DEFAULT_GROUPS = {
  amar: [1, 2, 3, 4],
  akbar: [5, 6, 7, 8, 9],
  anthony: [10, 11, 12, 13],
};

module.exports = function aaa(overrides = {}) {
  const rates = {
    amar: 3.35,
    akbar: 2.65,
    anthony: 3.35,
    even: 2.12,
    odd: 1.83,
    color: 1.97,
    underOver: 2.0,
    card: 12,
    ...overrides.rates,
  };
  const layRates = {
    amar: 3.45,
    akbar: 2.75,
    anthony: 3.45,
    ...overrides.layRates,
  };
  const groups = { ...DEFAULT_GROUPS, ...overrides.groups };

  const game = {
    gtype: "aaa",
    name: "VAmar Akbar Anthony",
    matchId: 20,
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

  add("Amar", rates.amar, layRates.amar);
  add("Akbar", rates.akbar, layRates.akbar);
  add("Anthony", rates.anthony, layRates.anthony);
  add("Even", rates.even);
  add("Odd", rates.odd);
  add("Black", rates.color);
  add("Red", rates.color);
  add("Under 7", rates.underOver);
  add("Over 7", rates.underOver);
  RANK_CODE.forEach((r) => add(`Card ${r}`, rates.card)); // Card A .. Card K
  game.selections = sel;

  game.deal = () => {
    const [card] = drawCards(1);
    const winner = groups.amar.includes(card.rank)
      ? "1"
      : groups.akbar.includes(card.rank)
      ? "2"
      : "3";
    return { cards: [card], card, winner };
  };

  const wins = (sid, o) => {
    const c = o.card;
    switch (sid) {
      case 1: return groups.amar.includes(c.rank);
      case 2: return groups.akbar.includes(c.rank);
      case 3: return groups.anthony.includes(c.rank);
      case 4: return isEven(c);
      case 5: return !isEven(c);
      case 6: return !isRed(c);
      case 7: return isRed(c);
      case 8: return c.rank < 7 && c.rank !== 1; // Ace is high here
      case 9: return c.rank > 7 || c.rank === 1;
      default: return c.rank === sid - 9; // Card A .. Card K
    }
  };

  game.payout = (sid, o) => {
    const s = game.selections[sid - 1];
    if (!s) return 0;
    return wins(sid, o) ? s.rate : 0;
  };

  const winnerName = (o) =>
    o.winner === "1" ? "Amar" : o.winner === "2" ? "Akbar" : "Anthony";

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
