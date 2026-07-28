// Shared 52-card deck utilities + the card-image route.
// Card codes look like "ASS", "10HH", "KDD" (rank + 2-letter suit), matching
// what the frontends request from /images/cards/<CODE>.png.

const crypto = require("crypto");

const SUITS = ["SS", "HH", "CC", "DD"]; // spade, heart, club, diamond
const SUIT_GLYPH = { SS: "♠", HH: "♥", CC: "♣", DD: "♦" };
const RANK_CODE = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function toCard(n) {
  const rank = (n % 13) + 1; // 1 = Ace ... 13 = King
  const suit = SUITS[Math.floor(n / 13)];
  return { rank, suit, code: RANK_CODE[rank - 1] + suit };
}

// n distinct cards from a freshly shuffled deck (CSPRNG Fisher-Yates prefix)
function drawCards(n) {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const out = [];
  for (let i = 0; i < n; i++) {
    const j = i + crypto.randomInt(52 - i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
    out.push(toCard(deck[i]));
  }
  return out;
}

const isRed = (c) => c.suit === "HH" || c.suit === "DD";
const isEven = (c) => c.rank % 2 === 0;
const cardLabel = (c) => `${RANK_CODE[c.rank - 1]}${SUIT_GLYPH[c.suit]}`;

// ---- SVG card images (served at .png URLs; browsers go by Content-Type) ----

function renderCard(code) {
  const m = /^(A|[2-9]|10|J|Q|K)(SS|HH|CC|DD)$/i.exec(String(code));
  if (!m) return null;
  const rank = m[1].toUpperCase();
  const suit = m[2].toUpperCase();
  const glyph = SUIT_GLYPH[suit];
  const color = suit === "HH" || suit === "DD" ? "#d0021b" : "#1a1a1a";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="168" viewBox="0 0 120 168">
  <rect x="1.5" y="1.5" width="117" height="165" rx="10" fill="#ffffff" stroke="#b9b9b9" stroke-width="3"/>
  <text x="12" y="34" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="${color}">${rank}</text>
  <text x="12" y="62" font-family="Georgia, serif" font-size="26" fill="${color}">${glyph}</text>
  <text x="60" y="118" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="${color}">${glyph}</text>
  <g transform="rotate(180 60 84)">
    <text x="12" y="34" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="${color}">${rank}</text>
    <text x="12" y="62" font-family="Georgia, serif" font-size="26" fill="${color}">${glyph}</text>
  </g>
</svg>`;
}

function cardsRoute(req, res) {
  const code = String(req.params.card || "").replace(/\.png$/i, "");
  const svg = renderCard(code);
  if (!svg) return res.status(404).send("Unknown card");
  res.set("Content-Type", "image/svg+xml");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(svg);
}

module.exports = { drawCards, isRed, isEven, cardLabel, cardsRoute, RANK_CODE };
