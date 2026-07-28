// Lucky 7 — one card. Below 7 = Low, above 7 = High, exactly 7 = Tie
// (Low/High stakes are half-returned on a 7, the standard casino rule).

const { drawCards, isRed, isEven, cardLabel, RANK_CODE } = require("../../cards");

module.exports = function lucky7(overrides = {}) {
  const rates = {
    lowHigh: 2,
    even: 2.1,
    odd: 1.79,
    color: 1.95,
    card: 12,
    ...overrides.rates,
  };

  const game = {
    gtype: "lucky7",
    name: "Lucky 7",
    matchId: 27,
    betSeconds: 30,
    reveals: [1.5], // C1: the single card
    resultAt: 3.0,
    roundGap: 8.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
  };

  const sel = [];
  const add = (nat, rate) => sel.push({ sid: sel.length + 1, nat, rate });
  add("Low Card", rates.lowHigh);
  add("High Card", rates.lowHigh);
  add("Even", rates.even);
  add("Odd", rates.odd);
  add("Red", rates.color);
  add("Black", rates.color);
  RANK_CODE.forEach((r) => add(`Card ${r}`, rates.card));
  game.selections = sel;

  game.deal = () => {
    const [card] = drawCards(1);
    const winner = card.rank < 7 ? "1" : card.rank > 7 ? "2" : "3";
    return { cards: [card], card, winner };
  };

  const wins = (sid, o) => {
    switch (sid) {
      case 1: return o.winner === "1";
      case 2: return o.winner === "2";
      case 3: return isEven(o.card);
      case 4: return !isEven(o.card);
      case 5: return isRed(o.card);
      case 6: return !isRed(o.card);
      default: return o.card.rank === sid - 6; // Card A..K
    }
  };

  game.payout = (sid, o) => {
    const s = game.selections[sid - 1];
    if (!s) return 0;
    if (wins(sid, o)) return s.rate;
    if ((sid === 1 || sid === 2) && o.winner === "3") return 0.5;
    return 0;
  };

  game.detail = (o) => ({
    cardDetail: `Card : ${cardLabel(o.card)}`,
    winnerDetail:
      o.winner === "1" ? "Low Card" : o.winner === "2" ? "High Card" : "Lucky 7",
  });

  return game;
};
