// Teen Patti hand ranking, shared by t20 and otp.
// Score is [category, ...tiebreakers] compared lexicographically; higher wins.
//   6 trail  5 pure sequence  4 sequence  3 colour  2 pair  1 high card

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
  // A-2-3 ranks as the second-highest sequence, just under A-K-Q
  if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) straightHigh = 13.5;

  if (trio) return [6, ranks[0]];
  if (straightHigh && flush) return [5, straightHigh];
  if (straightHigh) return [4, straightHigh];
  if (flush) return [3, ...ranks];
  if (pair) {
    const pairRank = ranks[1]; // the middle card is always part of the pair
    const kicker = ranks[0] === pairRank ? ranks[2] : ranks[0];
    return [2, pairRank, kicker];
  }
  return [1, ...ranks];
}

function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function compareHands(a, b) {
  return compareScores(scoreHand(a), scoreHand(b));
}

// indexes (0-based) of every hand tied for best
function bestHandIndexes(hands) {
  const scores = hands.map(scoreHand);
  let best = scores[0];
  for (const s of scores) if (compareScores(s, best) > 0) best = s;
  return scores
    .map((s, i) => (compareScores(s, best) === 0 ? i : -1))
    .filter((i) => i >= 0);
}

module.exports = { scoreHand, compareHands, compareScores, bestHandIndexes };
