// Andar Bahar 20-20 (ab20) — a joker card is cut, then cards are dealt
// alternately to Andar and Bahar (Andar first) until one side matches the
// joker's rank. That side wins.

const { drawCards, cardLabel } = require("../../cards");

module.exports = function ab20(overrides = {}) {
  const rates = { main: 1.97, ...overrides.rates };

  const game = {
    gtype: "ab20",
    name: "Andar Bahar",
    matchId: 26,
    betSeconds: 30,
    reveals: [1.0], // C1: the joker; the dealt sequence goes in the detail
    resultAt: 4.0,
    roundGap: 9.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
  };

  game.selections = [
    { sid: 1, nat: "Andar", rate: rates.main },
    { sid: 2, nat: "Bahar", rate: rates.main },
  ];

  game.deal = () => {
    const deck = drawCards(52);
    const joker = deck[0];
    const andar = [];
    const bahar = [];
    let winner = null;
    for (let i = 1; i < deck.length; i++) {
      const side = (i - 1) % 2 === 0 ? andar : bahar;
      side.push(deck[i]);
      if (deck[i].rank === joker.rank) {
        winner = side === andar ? "1" : "2";
        break;
      }
    }
    return { cards: [joker], joker, andar, bahar, winner };
  };

  game.payout = (sid, o) => {
    const s = game.selections[sid - 1];
    if (!s) return 0;
    return (sid === 1 && o.winner === "1") || (sid === 2 && o.winner === "2")
      ? s.rate
      : 0;
  };

  game.detail = (o) => ({
    jokerDetail: `Joker : ${cardLabel(o.joker)}`,
    andarDetail: `Andar : ${o.andar.map(cardLabel).join(" ")}`,
    baharDetail: `Bahar : ${o.bahar.map(cardLabel).join(" ")}`,
    winnerDetail: o.winner === "1" ? "Andar Win" : "Bahar Win",
  });

  return game;
};
