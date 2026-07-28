// Dragon Tiger 20-20 (dt20) — two cards, higher rank wins (Ace low).
// Selection order/naming must match the dragonTiger_Web frontend's rowArr.

const { drawCards, isRed, isEven, cardLabel } = require("../../cards");

const CARD_NAMES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"];

function buildSelections(rates) {
  const sel = [];
  const add = (nat, rate) => sel.push({ sid: sel.length + 1, nat, rate });
  add("Dragon", rates.main);
  add("Tie", rates.tie);
  add("Tiger", rates.main);
  add("Pair", rates.pair);
  add("Dragon Even", rates.even);
  add("Dragon Odd", rates.odd);
  add("Tiger Even", rates.even);
  add("Tiger Odd", rates.odd);
  add("Dragon Black", rates.color);
  add("Dragon Red", rates.color);
  add("Tiger Black", rates.color);
  add("Tiger Red", rates.color);
  CARD_NAMES.forEach((n) => add(`Dragon Card ${n.toUpperCase()}`, rates.card));
  CARD_NAMES.forEach((n) => add(`Tiger Card ${n.toUpperCase()}`, rates.card));
  return sel;
}

module.exports = function dt20(overrides = {}) {
  const rates = {
    main: 1.98,
    tie: 8,
    pair: 6,
    even: 2.12,
    odd: 1.83,
    color: 1.95,
    card: 12,
    ...overrides.rates,
  };

  const game = {
    gtype: "dt20",
    name: "VDragon Tiger",
    matchId: 14,
    betSeconds: 45,
    reveals: [1.0, 2.5], // C1 dragon, C2 tiger (seconds after betting closes)
    resultAt: 4.0,
    roundGap: 10.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
  };

  game.selections = buildSelections(rates);

  game.deal = () => {
    const [dragon, tiger] = drawCards(2);
    const winner =
      dragon.rank === tiger.rank ? "3" : dragon.rank > tiger.rank ? "1" : "2";
    return { cards: [dragon, tiger], dragon, tiger, winner };
  };

  const wins = (sid, o) => {
    const { dragon, tiger } = o;
    switch (sid) {
      case 1: return o.winner === "1";
      case 2: return o.winner === "3";
      case 3: return o.winner === "2";
      case 4: return dragon.rank === tiger.rank;
      case 5: return isEven(dragon);
      case 6: return !isEven(dragon);
      case 7: return isEven(tiger);
      case 8: return !isEven(tiger);
      case 9: return !isRed(dragon);
      case 10: return isRed(dragon);
      case 11: return !isRed(tiger);
      case 12: return isRed(tiger);
      default:
        if (sid <= 25) return dragon.rank === sid - 12; // Dragon Card A..K
        return tiger.rank === sid - 25; // Tiger Card A..K
    }
  };

  game.payout = (sid, o) => {
    const sel = game.selections[sid - 1];
    if (!sel) return 0;
    if (wins(sid, o)) return sel.rate;
    // casino rule: on a tie, half the Dragon/Tiger main stake is returned
    if ((sid === 1 || sid === 3) && o.winner === "3") return 0.5;
    return 0;
  };

  game.detail = (o) => ({
    dragonDetail: `Dragon : ${cardLabel(o.dragon)}`,
    tigerDetail: `Tiger : ${cardLabel(o.tiger)}`,
    winnerDetail:
      o.winner === "1" ? "Dragon Win" : o.winner === "2" ? "Tiger Win" : "Tie",
  });

  return game;
};
