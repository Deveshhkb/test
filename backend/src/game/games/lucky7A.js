// Lucky 7-A (lucky7A, matchId 12) — one card.
// Below 7 = Low, above 7 = High, exactly 7 = neither (Low/High stakes are
// half-returned, the standard casino rule).
// Market names must match lucky7_web / lucky7_mobile rowArr:
//   low card, high card, even, odd, black, red

const { drawCards, isRed, isEven, cardLabel } = require("../../cards");

module.exports = function lucky7A(overrides = {}) {
  const rates = {
    lowHigh: 1.98,
    even: 2.12,
    odd: 1.83,
    color: 1.97,
    ...overrides.rates,
  };

  const game = {
    gtype: "lucky7A",
    name: "VLucky7A", // must match res.data.data.VLucky7A in the frontend
    matchId: 12,
    betSeconds: 45,
    reveals: [1.5], // C1: the single card
    resultAt: 3.0,
    roundGap: 9.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
  };

  game.selections = [
    { sid: 1, nat: "Low Card", rate: rates.lowHigh },
    { sid: 2, nat: "High Card", rate: rates.lowHigh },
    { sid: 3, nat: "Even", rate: rates.even },
    { sid: 4, nat: "Odd", rate: rates.odd },
    { sid: 5, nat: "Black", rate: rates.color },
    { sid: 6, nat: "Red", rate: rates.color },
  ];

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
      case 5: return !isRed(o.card);
      case 6: return isRed(o.card);
      default: return false;
    }
  };

  game.payout = (sid, o) => {
    const s = game.selections[sid - 1];
    if (!s) return 0;
    if (wins(sid, o)) return s.rate;
    if ((sid === 1 || sid === 2) && o.winner === "3") return 0.5; // exactly 7
    return 0;
  };

  const winnerName = (o) =>
    o.winner === "1" ? "Low Card" : o.winner === "2" ? "High Card" : "Lucky 7";

  game.detail = (o) => ({
    cardDetail: `Card : ${cardLabel(o.card)}`,
    winnerDetail: winnerName(o),
  });

  // the page splits `detail` on " || " and lists each part as a result line
  game.detailParts = (o) => [
    `Card : ${cardLabel(o.card)}`,
    `Result : ${winnerName(o)}`,
    `Colour : ${isRed(o.card) ? "Red" : "Black"}`,
    `Odd/Even : ${isEven(o.card) ? "Even" : "Odd"}`,
  ];

  return game;
};
