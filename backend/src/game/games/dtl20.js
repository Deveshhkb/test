// Dragon Tiger Lion 20-20 (dtl20, matchId 31) — three cards, highest wins.
// The frontend builds names as `${row} ${col}` for the main rows
// (winner/black/red/odd/even with d|t|l) and `${side} ${rank}` for the card
// markets (dragon|tiger|lion with a,2..10,j,q,k). 5*3 + 13*3 = 54 selections.

const { drawCards, isRed, isEven, cardLabel } = require("../../cards");

const SIDES = ["dragon", "tiger", "lion"];
const SHORT = { dragon: "d", tiger: "t", lion: "l" };
const RANK_NAMES = ["a", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"];

const title = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());

module.exports = function dtl20(overrides = {}) {
  const rates = {
    winner: 2.9,
    color: 1.97,
    even: 2.12,
    odd: 1.83,
    card: 12,
    ...overrides.rates,
  };

  const game = {
    gtype: "dtl20",
    name: "VDragon Tiger Lion",
    matchId: 31,
    betSeconds: 45,
    reveals: [1.0, 2.0, 3.0], // C1 dragon, C2 tiger, C3 lion
    resultAt: 4.5,
    roundGap: 10.0,
    minStake: 100,
    maxStake: 100000,
    ...overrides,
    rates,
  };

  // Built in the same order the frontend indexes them: for each row, the
  // three sides in d/t/l order.
  const sel = [];
  const meta = []; // parallel array: how each sid is decided
  const add = (nat, rate, kind, side) => {
    sel.push({ sid: sel.length + 1, nat, rate });
    meta.push({ kind, side });
  };

  const MAIN_ROWS = [
    ["winner", rates.winner],
    ["black", rates.color],
    ["red", rates.color],
    ["odd", rates.odd],
    ["even", rates.even],
  ];
  for (const [row, rate] of MAIN_ROWS)
    for (const side of SIDES)
      add(`${title(row)} ${SHORT[side].toUpperCase()}`, rate, row, side);

  RANK_NAMES.forEach((rn, i) => {
    for (const side of SIDES)
      add(`${title(side)} ${rn.toUpperCase()}`, rates.card, `card:${i + 1}`, side);
  });

  game.selections = sel;

  game.deal = () => {
    const [dragon, tiger, lion] = drawCards(3);
    const hands = { dragon, tiger, lion };
    const top = Math.max(dragon.rank, tiger.rank, lion.rank);
    // ties share the win; winner is a comma list of the sides that tied
    const winners = SIDES.filter((s) => hands[s].rank === top);
    const winner = winners.map((s) => String(SIDES.indexOf(s) + 1)).join(",");
    return { cards: [dragon, tiger, lion], ...hands, hands, top, winners, winner };
  };

  game.payout = (sid, o) => {
    const s = game.selections[sid - 1];
    const m = meta[sid - 1];
    if (!s || !m) return 0;
    const card = o.hands[m.side];
    let won = false;
    if (m.kind === "winner") won = card.rank === o.top;
    else if (m.kind === "black") won = !isRed(card);
    else if (m.kind === "red") won = isRed(card);
    else if (m.kind === "odd") won = !isEven(card);
    else if (m.kind === "even") won = isEven(card);
    else if (m.kind.startsWith("card:")) won = card.rank === Number(m.kind.slice(5));
    if (!won) return 0;
    // a shared top splits the winner market's profit
    if (m.kind === "winner" && o.winners.length > 1)
      return 1 + (s.rate - 1) / o.winners.length;
    return s.rate;
  };

  game.detail = (o) => ({
    dragonDetail: `Dragon : ${cardLabel(o.dragon)}`,
    tigerDetail: `Tiger : ${cardLabel(o.tiger)}`,
    lionDetail: `Lion : ${cardLabel(o.lion)}`,
    winnerDetail: o.winners.map(title).join(" & ") + " Win",
  });

  return game;
};
