// The 38 market selections, in the exact order/naming the frontend's
// rowArr expects (livegame.js betkeyrate). sid = 1..38.

const CARD_NAMES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"];

const RATES = {
  main: 1.98,
  tie: 8,
  pair: 6,
  even: 2.12,
  odd: 1.83,
  color: 1.95,
  card: 12,
};

// helpers over a card object { rank: 1..13, suit: "SS"|"HH"|"CC"|"DD", code }
const isRed = (c) => c.suit === "HH" || c.suit === "DD";
const isEven = (c) => c.rank % 2 === 0;

function buildSelections() {
  const sel = [];
  const add = (nat, rate, wins) => sel.push({ sid: sel.length + 1, nat, rate, wins });

  // wins(outcome) -> bool; outcome = { dragon, tiger, winner } winner: "1"|"2"|"3"
  add("Dragon", RATES.main, (o) => o.winner === "1");
  add("Tie", RATES.tie, (o) => o.winner === "3");
  add("Tiger", RATES.main, (o) => o.winner === "2");
  add("Pair", RATES.pair, (o) => o.dragon.rank === o.tiger.rank);
  add("Dragon Even", RATES.even, (o) => isEven(o.dragon));
  add("Dragon Odd", RATES.odd, (o) => !isEven(o.dragon));
  add("Tiger Even", RATES.even, (o) => isEven(o.tiger));
  add("Tiger Odd", RATES.odd, (o) => !isEven(o.tiger));
  add("Dragon Black", RATES.color, (o) => !isRed(o.dragon));
  add("Dragon Red", RATES.color, (o) => isRed(o.dragon));
  add("Tiger Black", RATES.color, (o) => !isRed(o.tiger));
  add("Tiger Red", RATES.color, (o) => isRed(o.tiger));
  CARD_NAMES.forEach((name, i) =>
    add(`Dragon Card ${name.toUpperCase()}`, RATES.card, (o) => o.dragon.rank === i + 1)
  );
  CARD_NAMES.forEach((name, i) =>
    add(`Tiger Card ${name.toUpperCase()}`, RATES.card, (o) => o.tiger.rank === i + 1)
  );
  return sel;
}

const SELECTIONS = buildSelections();
const bySid = new Map(SELECTIONS.map((s) => [s.sid, s]));

module.exports = { SELECTIONS, bySid, RATES };
