import type { SymbolId } from '@neon/game-math';
import { glowFilter, lin, rad, svg } from './svgKit';

/** All symbol art is original, authored for NEON BREAK. 256x256 viewBox. */
const S = 256;

interface CardStyle {
  border: string;
  border2: string;
  bgTop: string;
  bgBottom: string;
}

function card(id: string, st: CardStyle, inner: string) {
  return svg(
    S,
    S,
    `<defs>
      ${lin(`${id}bg`, [[0, st.bgTop], [1, st.bgBottom]])}
      ${lin(`${id}bd`, [[0, st.border], [0.5, '#ffffff'], [1, st.border2]], 0, 0, 1, 1)}
      ${rad(`${id}lt`, [[0, st.border, 0.55], [1, st.border, 0]], 0.5, 0.35, 0.6)}
      ${glowFilter(`${id}gl`, 5, 2)}
      <clipPath id="${id}clip"><rect x="14" y="14" width="228" height="228" rx="26"/></clipPath>
    </defs>
    <rect x="10" y="10" width="236" height="236" rx="30" fill="url(#${id}bg)"/>
    <g clip-path="url(#${id}clip)">
      <rect x="0" y="0" width="256" height="256" fill="url(#${id}lt)"/>
      ${cityLines(st.border)}
      ${inner}
      <rect x="14" y="170" width="228" height="80" fill="url(#${id}bg)" opacity="0.0"/>
    </g>
    <rect x="12" y="12" width="232" height="232" rx="28" fill="none" stroke="url(#${id}bd)" stroke-width="6" filter="url(#${id}gl)"/>
    <rect x="22" y="22" width="212" height="212" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>`,
  );
}

function cityLines(color: string) {
  // faint skyline silhouette behind characters
  return `<g opacity="0.35">
    <path d="M14 190 L14 120 L40 120 L40 90 L62 90 L62 140 L84 140 L84 70 L108 70 L108 150 L150 150 L150 100 L172 100 L172 60 L196 60 L196 130 L222 130 L222 95 L242 95 L242 190 Z" fill="#0a0420"/>
    <g fill="${color}" opacity="0.7">
      <rect x="90" y="80" width="4" height="4"/><rect x="98" y="92" width="4" height="4"/><rect x="178" y="70" width="4" height="4"/>
      <rect x="186" y="84" width="4" height="4"/><rect x="48" y="100" width="4" height="4"/><rect x="228" y="105" width="4" height="4"/>
    </g></g>`;
}

interface Portrait {
  skin: string;
  skinShade: string;
  eye: string;
  backHair?: string;
  frontHair: string;
  outfit: string;
  extras?: string;
  male?: boolean;
}

function portrait(id: string, p: Portrait) {
  const jaw = p.male
    ? `M80 104 Q80 160 104 176 Q128 192 152 176 Q176 160 176 104 Q176 52 128 52 Q80 52 80 104 Z`
    : `M84 104 Q84 158 106 174 Q128 188 150 174 Q172 158 172 104 Q172 54 128 54 Q84 54 84 104 Z`;
  return `
    <defs>
      ${lin(`${id}sk`, [[0, p.skin], [1, p.skinShade]], 0, 0, 1, 1)}
      ${glowFilter(`${id}eg`, 2.5, 2)}
    </defs>
    ${p.backHair ?? ''}
    <path d="M112 168 L144 168 L148 205 L108 205 Z" fill="${p.skinShade}"/>
    ${p.outfit}
    <path d="${jaw}" fill="url(#${id}sk)"/>
    <path d="M128 60 Q160 70 168 120 Q168 150 152 172 Q170 140 166 104 Q160 70 128 60 Z" fill="#000" opacity="0.12"/>
    <!-- rim lights -->
    <path d="${jaw}" fill="none" stroke="#29e6ff" stroke-width="2" opacity="0.55" transform="translate(-2 0)"/>
    <!-- eyes -->
    <g>
      <path d="M100 112 Q110 104 120 112 Q110 117 100 112 Z" fill="#fff"/>
      <path d="M136 112 Q146 104 156 112 Q146 117 136 112 Z" fill="#fff"/>
      <circle cx="110" cy="111" r="4" fill="${p.eye}" filter="url(#${id}eg)"/>
      <circle cx="146" cy="111" r="4" fill="${p.eye}" filter="url(#${id}eg)"/>
      <circle cx="110" cy="111" r="1.6" fill="#111"/><circle cx="146" cy="111" r="1.6" fill="#111"/>
      <path d="M98 102 Q110 ${p.male ? 96 : 95} 122 101" stroke="#2a1410" stroke-width="${p.male ? 4.5 : 3}" fill="none" stroke-linecap="round"/>
      <path d="M134 101 Q146 ${p.male ? 96 : 95} 158 102" stroke="#2a1410" stroke-width="${p.male ? 4.5 : 3}" fill="none" stroke-linecap="round"/>
      ${p.male ? '' : '<path d="M99 110 L96 107 M157 110 L160 107" stroke="#1a0a0a" stroke-width="2"/>'}
    </g>
    <path d="M128 116 L124 136 Q128 139 133 136" stroke="${p.skinShade}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M116 150 Q128 ${p.male ? 154 : 157} 140 150" stroke="${p.male ? '#7a3a2a' : '#c2185b'}" stroke-width="${p.male ? 3 : 4.5}" fill="none" stroke-linecap="round"/>
    ${p.frontHair}
    ${p.extras ?? ''}`;
}

const charStyle: CardStyle = { border: '#ff2bd6', border2: '#8b3dff', bgTop: '#2a0b4d', bgBottom: '#0b0628' };
const charStyleCyan: CardStyle = { border: '#29e6ff', border2: '#8b3dff', bgTop: '#08254a', bgBottom: '#090a2a' };

const hero = card(
  'hero',
  charStyle,
  portrait('hero', {
    skin: '#ffd9c2',
    skinShade: '#e0a48a',
    eye: '#2cff9a',
    backHair: `<path d="M150 70 Q220 60 228 130 Q232 190 196 236 Q214 170 186 120 Z" fill="#d61f2c"/>
               <path d="M160 80 Q210 80 214 140 Q212 180 196 214" stroke="#ff6b4a" stroke-width="5" fill="none" opacity="0.8"/>`,
    frontHair: `<path d="M80 108 Q74 46 130 40 Q186 40 178 104 Q170 76 150 66 Q132 88 92 92 Q84 98 80 108 Z" fill="#e3262f"/>
                <path d="M92 92 Q110 64 150 66 Q128 70 108 92 Z" fill="#ff5a3c"/>
                <path d="M106 50 Q140 36 168 62" stroke="#ff9a7a" stroke-width="4" fill="none" opacity="0.8"/>`,
    outfit: `<path d="M30 256 Q36 206 92 192 L128 212 L164 192 Q220 206 226 256 Z" fill="#1d5fd1"/>
             <path d="M96 196 L128 236 L160 196 L150 256 L106 256 Z" fill="#ff7a1a"/>
             <path d="M30 256 Q36 206 92 192 L108 210 L84 256 Z" fill="#163f99"/>
             <path d="M92 192 L110 214 M164 192 L146 214" stroke="#ff2bd6" stroke-width="4"/>
             <path d="M40 240 L80 214" stroke="#29e6ff" stroke-width="3" opacity="0.8"/>`,
    extras: `<circle cx="86" cy="130" r="4" fill="#29e6ff"/><path d="M160 136 L176 132" stroke="#29e6ff" stroke-width="2" opacity="0.8"/>`,
  }),
);

const braids = Array.from({ length: 9 }, (_, i) => {
  const x = 78 + i * 12.5;
  return `<path d="M${x} 70 Q${x - 6} 140 ${x - 2 + (i % 2) * 4} 210" stroke="#1a0d0a" stroke-width="7" fill="none" stroke-linecap="round"/>
          <path d="M${x} 70 Q${x - 6} 140 ${x - 2 + (i % 2) * 4} 210" stroke="#6b3a1e" stroke-width="2" stroke-dasharray="4 5" fill="none"/>
          <circle cx="${x - 2 + (i % 2) * 4}" cy="208" r="3.5" fill="${i % 2 ? '#ffb020' : '#ff2bd6'}"/>`;
}).join('');

const hacker = card(
  'hack',
  charStyle,
  portrait('hack', {
    skin: '#a8714f',
    skinShade: '#6e4128',
    eye: '#ffb020',
    backHair: `<g>${braids}</g>`,
    frontHair: `<path d="M82 104 Q76 44 128 42 Q182 44 174 104 Q166 66 128 62 Q92 64 82 104 Z" fill="#1a0d0a"/>
                <path d="M96 56 Q128 44 160 56" stroke="#ff2bd6" stroke-width="3" fill="none" opacity="0.9"/>`,
    outfit: `<path d="M30 256 Q40 204 96 192 L128 210 L160 192 Q216 204 226 256 Z" fill="#3a1060"/>
             <path d="M96 192 L128 210 L160 192 L156 214 L128 228 L100 214 Z" fill="#ff2bd6" opacity="0.85"/>
             <path d="M50 250 L90 210 M206 250 L166 210" stroke="#ffb020" stroke-width="3"/>`,
    extras: `<path d="M78 98 Q76 70 98 62" stroke="#c9d6e8" stroke-width="7" fill="none"/>
             <rect x="70" y="96" width="14" height="26" rx="5" fill="#c9d6e8"/>
             <path d="M77 120 Q82 150 112 154" stroke="#c9d6e8" stroke-width="3" fill="none"/>
             <circle cx="112" cy="154" r="4" fill="#ff2bd6"/>
             <rect x="72" y="102" width="10" height="4" fill="#29e6ff"/>`,
  }),
);

const fighter = card(
  'fight',
  charStyleCyan,
  portrait('fight', {
    male: true,
    skin: '#e8b48f',
    skinShade: '#b07a58',
    eye: '#29e6ff',
    frontHair: `<path d="M78 100 Q70 40 128 34 Q190 36 180 100 L172 78 L160 90 L156 66 L140 80 L132 56 L118 78 L106 60 L100 84 L88 72 Z" fill="#141018"/>
                <path d="M84 96 L80 120 M176 96 L180 120" stroke="#141018" stroke-width="8"/>
                <path d="M104 50 Q130 40 160 52" stroke="#5b4bff" stroke-width="3" fill="none" opacity="0.8"/>`,
    outfit: `<path d="M24 256 Q34 200 96 188 L128 206 L160 188 Q222 200 232 256 Z" fill="#121220"/>
             <path d="M96 188 L120 230 L104 256 L70 256 Z M160 188 L136 230 L152 256 L186 256 Z" fill="#26263c"/>
             <path d="M96 188 L120 230 M160 188 L136 230" stroke="#ff2bd6" stroke-width="3"/>
             <path d="M112 206 L128 222 L144 206" stroke="#888" stroke-width="2" fill="none"/>`,
    extras: `<path d="M98 160 Q128 186 158 160 Q150 176 128 180 Q106 176 98 160 Z" fill="#3a2418" opacity="0.35"/>
             <path d="M160 120 L170 128 L164 140" stroke="#29e6ff" stroke-width="2.5" fill="none" opacity="0.9"/>`,
  }),
);

const soldier = card(
  'sold',
  charStyleCyan,
  portrait('sold', {
    male: true,
    skin: '#f0c4a2',
    skinShade: '#b9876a',
    eye: '#ff3355',
    frontHair: `<path d="M80 98 Q76 44 128 40 Q182 42 178 98 Q170 64 150 58 Q120 66 96 62 Q86 74 80 98 Z" fill="#d8dde6"/>
                <path d="M96 62 Q120 52 152 58" stroke="#ffffff" stroke-width="4" fill="none"/>`,
    outfit: `<path d="M20 256 Q28 200 92 190 L128 204 L164 190 Q228 200 236 256 Z" fill="#3d4658"/>
             <path d="M20 256 Q26 214 70 200 L84 256 Z M236 256 Q230 214 186 200 L172 256 Z" fill="#596478"/>
             <rect x="104" y="196" width="48" height="16" rx="4" fill="#2a3040"/>
             <circle cx="56" cy="224" r="5" fill="#29e6ff"/><circle cx="200" cy="224" r="5" fill="#29e6ff"/>
             <path d="M92 236 L164 236" stroke="#29e6ff" stroke-width="2" opacity="0.7"/>`,
    extras: `<path d="M136 100 L162 100 L162 122 L136 122 Z" fill="#20242e" opacity="0.85"/>
             <circle cx="146" cy="111" r="6" fill="#ff3355" opacity="0.9"/>
             <path d="M162 108 L178 104" stroke="#ff3355" stroke-width="2"/>
             <path d="M100 150 Q128 170 156 150" stroke="#7a5a48" stroke-width="2" fill="none" opacity="0.5"/>`,
  }),
);

/* ---------- premium objects (no card, glowing silhouettes) ---------- */
function objectArt(id: string, glow: string, body: string) {
  return svg(
    S,
    S,
    `<defs>${rad(`${id}halo`, [[0, glow, 0.55], [0.6, glow, 0.12], [1, glow, 0]])}${glowFilter(`${id}g`, 4, 2)}${glowFilter(`${id}g2`, 9, 2)}</defs>
     <circle cx="128" cy="128" r="118" fill="url(#${id}halo)"/>
     ${body}`,
  );
}

const rifle = objectArt(
  'rif',
  '#29e6ff',
  `<defs>${lin('rifm', [[0, '#e8eef8'], [0.5, '#7d8aa8'], [1, '#2b3346']])}</defs>
   <g transform="rotate(-28 128 128)">
     <rect x="30" y="112" width="190" height="34" rx="8" fill="url(#rifm)" stroke="#0b1020" stroke-width="3"/>
     <rect x="200" y="120" width="40" height="14" rx="4" fill="#5b667e"/>
     <path d="M70 146 L96 146 L86 200 L60 200 Z" fill="#3a4258" stroke="#0b1020" stroke-width="3"/>
     <path d="M120 146 L140 146 L136 176 L118 176 Z" fill="#3a4258"/>
     <rect x="96" y="96" width="70" height="18" rx="5" fill="#2b3346" stroke="#0b1020" stroke-width="2"/>
     <rect x="104" y="100" width="54" height="8" rx="3" fill="#29e6ff" filter="url(#rifg)"/>
     <rect x="40" y="124" width="150" height="8" rx="4" fill="#2cff9a" filter="url(#rifg)"/>
     <circle cx="236" cy="127" r="7" fill="#2cff9a" filter="url(#rifg2)"/>
   </g>`,
);

const blaster = objectArt(
  'bla',
  '#ff7a1a',
  `<defs>${lin('blam', [[0, '#ffe2c4'], [0.45, '#d06a2a'], [1, '#4a1e10']])}${lin('blac', [[0, '#3a4258'], [1, '#141824']])}</defs>
   <g transform="rotate(-12 128 128)">
     <path d="M40 100 L190 100 Q214 100 214 118 L214 132 L120 132 L110 150 L60 150 L60 132 L40 132 Z" fill="url(#blac)" stroke="#05070d" stroke-width="3"/>
     <path d="M70 150 L108 150 L96 214 L58 214 Z" fill="url(#blam)" stroke="#05070d" stroke-width="3"/>
     ${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${120 + i * 16}" cy="116" rx="6" ry="16" fill="none" stroke="#ff7a1a" stroke-width="4" filter="url(#blag)"/>`).join('')}
     <rect x="200" y="108" width="34" height="18" rx="6" fill="#ffb020" filter="url(#blag2)"/>
     <rect x="50" y="106" width="50" height="6" rx="3" fill="#ff2bd6"/>
   </g>`,
);

const helmet = objectArt(
  'hel',
  '#8b3dff',
  `<defs>${lin('helm', [[0, '#c9d6ff'], [0.4, '#5a63c8'], [1, '#1b1d4a']], 0, 0, 1, 1)}${lin('helv', [[0, '#ff2bd6'], [1, '#29e6ff']], 0, 0, 1, 0)}</defs>
   <path d="M52 140 Q50 46 128 40 Q206 46 204 140 L196 186 Q180 212 128 214 Q76 212 60 186 Z" fill="url(#helm)" stroke="#070818" stroke-width="4"/>
   <path d="M66 118 Q128 92 190 118 L184 152 Q128 138 72 152 Z" fill="url(#helv)" filter="url(#helg)"/>
   <path d="M76 122 Q128 104 180 122" stroke="#fff" stroke-width="3" opacity="0.7" fill="none"/>
   <path d="M100 176 L156 176 L148 198 L108 198 Z" fill="#202450"/>
   ${[0, 1, 2].map((i) => `<rect x="${110 + i * 14}" y="180" width="8" height="12" rx="2" fill="#29e6ff"/>`).join('')}
   <path d="M128 40 L128 92" stroke="#ff2bd6" stroke-width="5" filter="url(#helg)"/>
   <circle cx="58" cy="150" r="9" fill="#29e6ff" filter="url(#helg)"/><circle cx="198" cy="150" r="9" fill="#29e6ff" filter="url(#helg)"/>`,
);

const grenade = objectArt(
  'gre',
  '#2cff9a',
  `<defs>${lin('grem', [[0, '#5a6a80'], [0.5, '#242c3c'], [1, '#0d1118']], 0, 0, 1, 0)}</defs>
   <rect x="84" y="70" width="88" height="150" rx="34" fill="url(#grem)" stroke="#05070d" stroke-width="4"/>
   ${[0, 1, 2].map((i) => `<rect x="84" y="${100 + i * 36}" width="88" height="10" fill="#2cff9a" filter="url(#greg)"/>`).join('')}
   <rect x="104" y="44" width="48" height="30" rx="6" fill="#3a4458" stroke="#05070d" stroke-width="3"/>
   <path d="M150 54 Q196 40 192 90 L182 140" stroke="#9aa6bd" stroke-width="8" fill="none" stroke-linecap="round"/>
   <circle cx="112" cy="40" r="14" fill="none" stroke="#c9d1e0" stroke-width="5"/>
   <circle cx="128" cy="160" r="12" fill="#ff2bd6" filter="url(#greg2)"/>`,
);

const battery = objectArt(
  'bat',
  '#2cff9a',
  `<defs>${lin('batg', [[0, '#7dffbf'], [1, '#0a8f55']])}${lin('batm', [[0, '#7a879e'], [0.5, '#c8d2e4'], [1, '#3a4458']], 0, 0, 1, 0)}</defs>
   <rect x="70" y="50" width="116" height="170" rx="16" fill="#0b1a14" stroke="url(#batm)" stroke-width="10"/>
   <rect x="104" y="30" width="48" height="22" rx="5" fill="url(#batm)"/>
   <rect x="84" y="66" width="88" height="138" rx="8" fill="url(#batg)" opacity="0.9" filter="url(#batg)"/>
   <path d="M136 80 L104 140 L128 140 L116 192 L156 124 L132 124 L146 80 Z" fill="#ffffff" filter="url(#batg)"/>
   <path d="M84 110 L172 110 M84 160 L172 160" stroke="#063a24" stroke-width="3" opacity="0.6"/>`,
);

const holo = objectArt(
  'hol',
  '#29e6ff',
  `<defs>${lin('holm', [[0, '#3a4458'], [1, '#141824']])}${lin('holb', [[0, '#29e6ff', ], [1, '#29e6ff']])}</defs>
   <path d="M60 190 L196 190 L214 214 L42 214 Z" fill="url(#holm)" stroke="#05070d" stroke-width="3"/>
   <ellipse cx="128" cy="190" rx="60" ry="10" fill="#29e6ff" filter="url(#holg)"/>
   <path d="M76 186 L96 64 L160 64 L180 186 Z" fill="#29e6ff" opacity="0.18"/>
   <rect x="86" y="58" width="84" height="104" rx="8" fill="#082436" stroke="#29e6ff" stroke-width="4" filter="url(#holg)"/>
   <path d="M98 82 L158 82 M98 98 L140 98 M98 114 L150 114" stroke="#29e6ff" stroke-width="5" stroke-linecap="round"/>
   <circle cx="128" cy="138" r="13" fill="none" stroke="#ff2bd6" stroke-width="4"/>
   <path d="M128 130 L128 146 M120 138 L136 138" stroke="#ff2bd6" stroke-width="3"/>`,
);

/* ---------- specials ---------- */
const wild = svg(
  S,
  S,
  `<defs>
    ${lin('wbg', [[0, '#0a2a5a'], [1, '#060a24']])}
    ${lin('wmet', [[0, '#bfe8ff'], [0.45, '#2f7fd6'], [1, '#0b1f4a']], 0, 0, 1, 1)}
    ${lin('wbd', [[0, '#29e6ff'], [0.5, '#ffffff'], [1, '#ff2bd6']], 0, 0, 1, 1)}
    ${glowFilter('wg', 5, 2)}${glowFilter('wg2', 10, 2)}
  </defs>
  <rect x="10" y="10" width="236" height="236" rx="30" fill="url(#wbg)"/>
  <path d="M128 26 Q200 30 206 104 L196 150 L176 170 L80 170 L60 150 L50 104 Q56 30 128 26 Z" fill="url(#wmet)" stroke="#04102a" stroke-width="4"/>
  <path d="M56 70 L28 40 L64 56 Z M200 70 L228 40 L192 56 Z" fill="#2f7fd6" stroke="#04102a" stroke-width="3"/>
  <path d="M70 100 L118 112 L112 128 L74 120 Z" fill="#ff1f3d" filter="url(#wg)"/>
  <path d="M186 100 L138 112 L144 128 L182 120 Z" fill="#ff1f3d" filter="url(#wg)"/>
  <path d="M96 140 L160 140 L150 168 L106 168 Z" fill="#04102a"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${104 + i * 13}" y="144" width="8" height="18" rx="2" fill="#bfe8ff"/>`).join('')}
  <path d="M128 30 L128 88" stroke="#29e6ff" stroke-width="4" filter="url(#wg)"/>
  <rect x="12" y="12" width="232" height="232" rx="28" fill="none" stroke="url(#wbd)" stroke-width="7" filter="url(#wg)"/>`,
);

const scatter = svg(
  S,
  S,
  `<defs>
    ${lin('sbg', [[0, '#3a0a52'], [1, '#0d0626']])}
    ${lin('shood', [[0, '#ff4fd8'], [1, '#6a14b8']], 0, 0, 1, 1)}
    ${lin('sbd', [[0, '#ff2bd6'], [0.5, '#ffd6f6'], [1, '#8b3dff']], 0, 0, 1, 1)}
    ${lin('svis', [[0, '#29e6ff'], [1, '#ff2bd6']], 0, 0, 1, 0)}
    ${glowFilter('sg', 5, 2)}
  </defs>
  <rect x="10" y="10" width="236" height="236" rx="30" fill="url(#sbg)"/>
  <path d="M40 246 Q40 180 80 160 Q60 100 80 60 Q128 10 176 60 Q196 100 176 160 Q216 180 216 246 Z" fill="url(#shood)"/>
  <path d="M86 110 Q86 60 128 58 Q170 60 170 110 Q170 160 128 176 Q86 160 86 110 Z" fill="#f7cdb8"/>
  <path d="M86 104 Q90 64 128 64 Q166 64 170 104 Q150 84 128 96 Q106 84 86 104 Z" fill="#b01ec0"/>
  <path d="M84 102 L172 102 L166 126 L90 126 Z" fill="url(#svis)" filter="url(#sg)" stroke="#1a0630" stroke-width="3"/>
  <path d="M92 110 L164 110" stroke="#fff" stroke-width="2" opacity="0.8"/>
  <path d="M114 150 Q128 158 142 150" stroke="#c2185b" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M60 210 Q128 190 196 210" stroke="#29e6ff" stroke-width="3" fill="none" opacity="0.7"/>
  <rect x="12" y="12" width="232" height="232" rx="28" fill="none" stroke="url(#sbd)" stroke-width="7" filter="url(#sg)"/>`,
);

const bonus = svg(
  S,
  S,
  `<defs>
    ${lin('bbg', [[0, '#3a2206'], [1, '#120a02']])}
    ${lin('bgold', [[0, '#fff2b0'], [0.4, '#ffb020'], [1, '#8a4a00']], 0, 0, 1, 1)}
    ${lin('bside', [[0, '#c27a10'], [1, '#5a3000']])}
    ${glowFilter('bg', 5, 2)}${glowFilter('bg2', 10, 3)}
  </defs>
  <rect x="10" y="10" width="236" height="236" rx="30" fill="url(#bbg)"/>
  <path d="M128 40 L212 84 L212 172 L128 216 L44 172 L44 84 Z" fill="url(#bside)" stroke="#2a1600" stroke-width="4"/>
  <path d="M128 40 L212 84 L128 128 L44 84 Z" fill="url(#bgold)" stroke="#2a1600" stroke-width="3"/>
  <path d="M128 128 L128 216" stroke="#2a1600" stroke-width="4"/>
  <path d="M44 84 L128 128 L212 84" stroke="#ffe680" stroke-width="2" fill="none"/>
  <path d="M138 62 L112 100 L130 100 L118 128 L148 90 L130 90 Z" fill="#fff" filter="url(#bg)"/>
  <path d="M60 120 L112 146 M60 150 L112 176 M196 120 L144 146 M196 150 L144 176" stroke="#ff7a1a" stroke-width="5" filter="url(#bg)"/>
  <rect x="12" y="12" width="232" height="232" rx="28" fill="none" stroke="url(#bgold)" stroke-width="7" filter="url(#bg)"/>`,
);

export const SYMBOL_SVGS: Partial<Record<SymbolId, string>> = {
  HERO: hero,
  HACKER: hacker,
  FIGHTER: fighter,
  SOLDIER: soldier,
  RIFLE: rifle,
  BLASTER: blaster,
  HELMET: helmet,
  GRENADE: grenade,
  BATTERY: battery,
  HOLO: holo,
  WILD: wild,
  SCATTER: scatter,
  BONUS: bonus,
};

/** Neon card-letter symbols are drawn with Canvas2D so they can use the bundled web font. */
export const LOW_SYMBOL_STYLE: Partial<Record<SymbolId, { text: string; top: string; bottom: string; glow: string }>> = {
  A: { text: 'A', top: '#7fd8ff', bottom: '#1f4fff', glow: '#29a8ff' },
  K: { text: 'K', top: '#ff9cf2', bottom: '#b01ec0', glow: '#ff2bd6' },
  Q: { text: 'Q', top: '#ff8a8a', bottom: '#d0102a', glow: '#ff2b4a' },
  J: { text: 'J', top: '#ffd27a', bottom: '#ff6a00', glow: '#ff8a1a' },
  TEN: { text: '10', top: '#9affc8', bottom: '#0fae4a', glow: '#2cff9a' },
};

/** Label banners rendered over special symbols. */
export const SPECIAL_LABELS: Partial<Record<SymbolId, { text: string; color: string; stroke: string }>> = {
  WILD: { text: 'WILD', color: '#ff4fd8', stroke: '#2a0030' },
  SCATTER: { text: 'SCATTER', color: '#ff7ae6', stroke: '#2a0030' },
  BONUS: { text: 'BONUS', color: '#ffd23a', stroke: '#3a1a00' },
};
