// Open Teen Patti (otp, matchId 24) — 8 players, three cards each, best
// teen patti hand wins. The frontend reads all 24 cards from C1 as a single
// comma-separated string and splits winner on "," too, so ties can share.
// Market names: "player 1" ... "player 8".

const { drawCards, cardLabel } = require("../../cards");
const { bestHandIndexes } = require("../handrank");

const PLAYERS = 8;

module.exports = function otp(overrides = {}) {
  const rates = { main: 8.5, ...overrides.rates };

  const game = {
    gtype: "otp",
    name: "VOpen Teenpatti",
    matchId: 24,
    betSeconds: 60, // this frontend's timer runs 60s
    resultAt: 5.0,
    roundGap: 11.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
  };

  // all 24 cards ship in C1 as one comma-separated list, revealed together
  game.reveals = [1.5];
  game.joinCards = true; // engine emits C1 = "c1,c2,..." instead of C1..Cn

  game.selections = Array.from({ length: PLAYERS }, (_, i) => ({
    sid: i + 1,
    nat: `Player ${i + 1}`,
    rate: rates.main,
  }));

  game.deal = () => {
    const cards = drawCards(PLAYERS * 3);
    // deal round-robin: player i gets cards i, i+8, i+16
    const hands = Array.from({ length: PLAYERS }, (_, i) => [
      cards[i],
      cards[i + PLAYERS],
      cards[i + PLAYERS * 2],
    ]);
    const winnerIdx = bestHandIndexes(hands);
    // display order is player-by-player so the UI's card slots line up
    return {
      cards: hands.flat(),
      hands,
      winnerIdx,
      winner: winnerIdx.map((i) => String(i + 1)).join(","),
    };
  };

  game.payout = (sid, o) => {
    if (!o.winnerIdx.includes(sid - 1)) return 0;
    // split the profit if several players tie for best hand
    return 1 + (rates.main - 1) / o.winnerIdx.length;
  };

  game.detail = (o) => {
    const d = {};
    o.hands.forEach((h, i) => {
      d[`player${i + 1}Detail`] = `Player ${i + 1} : ${h.map(cardLabel).join(" ")}`;
    });
    d.winnerDetail = o.winnerIdx.map((i) => `Player ${i + 1}`).join(" & ") + " Win";
    return d;
  };

  return game;
};
