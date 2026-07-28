// Teen Patti 20-20 (teen20) — Player A vs Player B, three cards each,
// standard teen patti hand ranking (trail > pure sequence > sequence >
// colour > pair > high card, Ace high, A-2-3 is the second-highest sequence).

const { drawCards, cardLabel } = require("../../cards");

// hand score: [category, tiebreakers...] compared lexicographically
function scoreHand(cards) {
  const ranks = cards
    .map((c) => (c.rank === 1 ? 14 : c.rank)) // Ace high
    .sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const flush = suits[0] === suits[1] && suits[1] === suits[2];
  const trio = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const pair = !trio && (ranks[0] === ranks[1] || ranks[1] === ranks[2]);

  let straightHigh = 0;
  if (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1) straightHigh = ranks[0];
  // A-2-3: ranks sorted desc = [14,3,2]; ranks second-highest sequence (below A-K-Q)
  if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) straightHigh = 13.5;

  if (trio) return [6, ranks[0]];
  if (straightHigh && flush) return [5, straightHigh];
  if (straightHigh) return [4, straightHigh];
  if (flush) return [3, ...ranks];
  if (pair) {
    const pairRank = ranks[1]; // middle card is always part of the pair
    const kicker = ranks[0] === pairRank ? ranks[2] : ranks[0];
    return [2, pairRank, kicker];
  }
  return [1, ...ranks];
}

function compareHands(a, b) {
  const sa = scoreHand(a);
  const sb = scoreHand(b);
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const d = (sa[i] || 0) - (sb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

// pair-plus payout multiplier by hand category (stake included)
const PAIR_PLUS = { 2: 2, 3: 5, 4: 7, 5: 41, 6: 31 };

module.exports = function teen20(overrides = {}) {
  const rates = { main: 1.98, pairPlus: 1, ...overrides.rates };

  const game = {
    gtype: "teen20",
    name: "20-20 Teen Patti",
    matchId: 21,
    betSeconds: 30,
    // A gets C1,C3,C5 — B gets C2,C4,C6, revealed alternately
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
    { sid: 3, nat: "Pair Plus A", rate: rates.pairPlus },
    { sid: 4, nat: "Pair Plus B", rate: rates.pairPlus },
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
    switch (sid) {
      case 1:
        if (o.winner === "3") return 1; // push on exact tie
        return o.winner === "1" ? rates.main : 0;
      case 2:
        if (o.winner === "3") return 1;
        return o.winner === "2" ? rates.main : 0;
      case 3:
        return PAIR_PLUS[scoreHand(o.handA)[0]] || 0;
      case 4:
        return PAIR_PLUS[scoreHand(o.handB)[0]] || 0;
      default:
        return 0;
    }
  };

  game.detail = (o) => ({
    playerADetail: `Player A : ${o.handA.map(cardLabel).join(" ")}`,
    playerBDetail: `Player B : ${o.handB.map(cardLabel).join(" ")}`,
    winnerDetail:
      o.winner === "1" ? "Player A Win" : o.winner === "2" ? "Player B Win" : "Tie",
  });

  return game;
};
