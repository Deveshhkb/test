// Serves playing-card images at /images/cards/<CODE>.png (e.g. 10HH, ASS, KDD).
// Images are generated as SVG on the fly — browsers render by Content-Type,
// so the .png extension in the frontend URLs is not a problem.

const SUITS = {
  SS: { glyph: "♠", color: "#1a1a1a" },
  CC: { glyph: "♣", color: "#1a1a1a" },
  HH: { glyph: "♥", color: "#d0021b" },
  DD: { glyph: "♦", color: "#d0021b" },
};

function renderCard(code) {
  const m = /^(A|[2-9]|10|J|Q|K)(SS|HH|CC|DD)$/i.exec(String(code));
  if (!m) return null;
  const rank = m[1].toUpperCase();
  const suit = SUITS[m[2].toUpperCase()];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="168" viewBox="0 0 120 168">
  <rect x="1.5" y="1.5" width="117" height="165" rx="10" fill="#ffffff" stroke="#b9b9b9" stroke-width="3"/>
  <text x="12" y="34" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="${suit.color}">${rank}</text>
  <text x="12" y="62" font-family="Georgia, serif" font-size="26" fill="${suit.color}">${suit.glyph}</text>
  <text x="60" y="118" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="${suit.color}">${suit.glyph}</text>
  <g transform="rotate(180 60 84)">
    <text x="12" y="34" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="${suit.color}">${rank}</text>
    <text x="12" y="62" font-family="Georgia, serif" font-size="26" fill="${suit.color}">${suit.glyph}</text>
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

module.exports = { cardsRoute };
