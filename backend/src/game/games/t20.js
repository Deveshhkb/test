// Teen Patti 20-20 (t20, matchId 15) — Player A vs Player B, three cards each.
// The frontend matches nat exactly: "Player A" / "Player B".
// Cards C1..C6 are dealt A,B,A,B,A,B.

const { drawCards, cardLabel } = require("../../cards");
const { compareHands } = require("../handrank");

module.exports = function t20(overrides = {}) {
  const rates = { main: 1.98, ...overrides.rates };

  const game = {
    gtype: "t20",
    name: "VT20", // must match res.data.data.VT20 in the frontend
    matchId: 15,
    betSeconds: 45,
    reveals: [1.0, 1.6, 2.2, 2.8, 3.4, 4.0],
    resultAt: 5.0,
    roundGap: 10.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
  };

  game.selections = [
    { sid: 1, nat: "Player A", rate: rates.main },
    { sid: 2, nat: "Player B", rate: rates.main },
  ];

  game.deal = () => {
    const cards = drawCards(6);
    const handA = [cards[0], cards[2], cards[4]];
    const handB = [cards[1], cards[3], cards[5]];
    const cmp = compareHands(handA, handB);
    const winner = cmp > 0 ? "1" : cmp < 0 ? "2" : "3";
    return { cards, handA, handB, winner };
  };

  game.payout = (sid, o) => {
    if (o.winner === "3") return 1; // exact tie -> stake returned
    if (sid === 1) return o.winner === "1" ? rates.main : 0;
    if (sid === 2) return o.winner === "2" ? rates.main : 0;
    return 0;
  };

  game.detail = (o) => ({
    playerADetail: `Player A : ${o.handA.map(cardLabel).join(" ")}`,
    playerBDetail: `Player B : ${o.handB.map(cardLabel).join(" ")}`,
    winnerDetail:
      o.winner === "1" ? "Player A Win" : o.winner === "2" ? "Player B Win" : "Tie",
  });

  return game;
};
