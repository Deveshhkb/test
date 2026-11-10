import { glowFilter, lin, rad, svg } from './svgKit';

/** Full-body cyberpunk heroine shown left of the reels (original art). 480x1000. */
export const HERO_W = 480;
export const HERO_H = 1000;

export const heroBodySvg = svg(
  HERO_W,
  HERO_H,
  `<defs>
    ${lin('skin', [[0, '#ffe0cc'], [1, '#d99a7e']], 0, 0, 1, 1)}
    ${lin('jean', [[0, '#2a3a66'], [0.5, '#1a2548'], [1, '#0c1228']], 0, 0, 1, 0)}
    ${lin('jacket', [[0, '#3f8cff'], [0.6, '#1d4fc0'], [1, '#0f2a70']], 0, 0, 1, 1)}
    ${lin('top', [[0, '#ffb04a'], [1, '#ff6a00']])}
    ${lin('boot', [[0, '#3a3f52'], [1, '#0d0f18']])}
    ${lin('gun', [[0, '#dfe7f5'], [0.5, '#6f7c96'], [1, '#262d3f']], 0, 0, 1, 0)}
    ${rad('rimL', [[0, '#29e6ff', 0.9], [1, '#29e6ff', 0]])}
    ${glowFilter('hg', 4, 2)}${glowFilter('hg2', 8, 2)}
  </defs>
  <!-- ground glow -->
  <ellipse cx="225" cy="985" rx="170" ry="16" fill="#ff2bd6" opacity="0.35" filter="url(#hg2)"/>
  <!-- legs -->
  <path d="M168 520 L250 520 L246 640 Q240 760 226 880 L170 884 Q160 760 156 640 Z" fill="url(#jean)"/>
  <path d="M236 520 L320 516 Q326 640 316 720 Q308 800 318 884 L262 888 Q254 800 252 720 Q246 640 236 560 Z" fill="url(#jean)"/>
  <path d="M176 560 Q172 700 186 860" stroke="#5a78c8" stroke-width="3" fill="none" opacity="0.7"/>
  <path d="M300 560 Q300 700 292 860" stroke="#29e6ff" stroke-width="3" fill="none" opacity="0.6"/>
  <path d="M190 690 L230 696 M262 700 L304 694" stroke="#0a0f20" stroke-width="5"/>
  <!-- boots -->
  <path d="M164 860 L232 860 L236 960 L250 976 L250 994 L150 994 L156 940 Z" fill="url(#boot)" stroke="#05060c" stroke-width="3"/>
  <path d="M258 864 L322 862 L326 950 L352 972 L354 994 L254 994 Z" fill="url(#boot)" stroke="#05060c" stroke-width="3"/>
  <path d="M164 900 L232 900 M260 902 L324 902" stroke="#ff2bd6" stroke-width="4" filter="url(#hg)"/>
  <!-- belt & holster -->
  <rect x="160" y="500" width="166" height="28" rx="6" fill="#1a1420" stroke="#05060c" stroke-width="2"/>
  <rect x="226" y="502" width="34" height="24" rx="4" fill="#c9d1e0"/>
  <path d="M300 520 L336 520 L330 610 L304 610 Z" fill="#2a2030" stroke="#05060c" stroke-width="2"/>
  <rect x="306" y="540" width="20" height="6" fill="#29e6ff" filter="url(#hg)"/>
  <!-- midriff -->
  <path d="M176 390 L306 390 L312 504 L168 504 Z" fill="url(#skin)"/>
  <path d="M240 448 L240 494" stroke="#c98a70" stroke-width="2" opacity="0.6"/>
  <path d="M206 470 Q240 480 276 470" stroke="#c98a70" stroke-width="2" fill="none" opacity="0.4"/>
  <!-- left arm (hanging, hand on hip) -->
  <path d="M150 262 Q112 330 108 420 Q106 480 140 532 L162 520 Q138 470 142 420 Q148 350 176 300 Z" fill="url(#skin)"/>
  <path d="M146 520 L170 516 L172 548 L150 552 Z" fill="#1a1420"/>
  <!-- torso top -->
  <path d="M170 262 L312 262 L316 430 Q240 446 168 430 Z" fill="url(#top)"/>
  <path d="M200 300 Q240 330 282 300" stroke="#ffe0a0" stroke-width="3" fill="none" opacity="0.6"/>
  <!-- jacket -->
  <path d="M128 250 Q150 232 200 236 L214 300 L196 420 L150 420 Q120 340 128 250 Z" fill="url(#jacket)" stroke="#071440" stroke-width="3"/>
  <path d="M352 250 Q330 232 280 236 L266 300 L284 420 L330 420 Q360 340 352 250 Z" fill="url(#jacket)" stroke="#071440" stroke-width="3"/>
  <path d="M200 236 L214 300 L196 420 M280 236 L266 300 L284 420" stroke="#ff2bd6" stroke-width="4" fill="none" filter="url(#hg)"/>
  <path d="M120 300 Q110 360 118 410 L142 420 Q134 360 148 300 Z" fill="#163f99"/>
  <path d="M136 330 L160 330 M138 350 L156 350" stroke="#29e6ff" stroke-width="3" filter="url(#hg)"/>
  <!-- neck & head -->
  <path d="M212 196 L254 196 L258 244 L208 244 Z" fill="#d99a7e"/>
  <path d="M182 150 Q180 214 214 234 Q232 244 250 234 Q284 214 282 150 Q282 88 232 86 Q182 88 182 150 Z" fill="url(#skin)"/>
  <path d="M232 92 Q276 100 278 160 Q276 210 252 232 Q272 196 270 152 Q266 106 232 92 Z" fill="#000" opacity="0.1"/>
  <!-- face -->
  <path d="M206 154 Q218 146 230 154 Q218 159 206 154 Z" fill="#fff"/>
  <path d="M246 154 Q258 146 270 154 Q258 159 246 154 Z" fill="#fff"/>
  <circle cx="219" cy="153" r="4.6" fill="#2cff9a" filter="url(#hg)"/><circle cx="258" cy="153" r="4.6" fill="#2cff9a" filter="url(#hg)"/>
  <circle cx="219" cy="153" r="2" fill="#0a0a0a"/><circle cx="258" cy="153" r="2" fill="#0a0a0a"/>
  <path d="M204 143 Q218 136 232 142 M244 142 Q258 136 272 143" stroke="#3a1410" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <path d="M240 158 L236 180 Q240 183 245 180" stroke="#c48468" stroke-width="2.4" fill="none"/>
  <path d="M226 198 Q240 206 254 198" stroke="#d0164f" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M272 168 L286 164" stroke="#29e6ff" stroke-width="2.5"/>
  <circle cx="188" cy="174" r="4" fill="#29e6ff" filter="url(#hg)"/>
  <!-- hair front -->
  <path d="M178 160 Q166 76 236 70 Q298 72 286 150 Q278 112 254 102 Q232 128 194 132 Q182 140 178 160 Z" fill="#e3262f"/>
  <path d="M194 132 Q214 98 254 102 Q228 108 210 132 Z" fill="#ff5a3c"/>
  <path d="M206 82 Q248 66 280 100" stroke="#ff9a7a" stroke-width="5" fill="none" opacity="0.8"/>
  <!-- raised right arm with pistol -->
  <path d="M330 262 Q384 300 386 340 Q384 372 352 356 Q324 330 304 300 Z" fill="url(#jacket)" stroke="#071440" stroke-width="3"/>
  <path d="M352 356 Q330 330 320 290 L340 280 Q352 318 372 336 Z" fill="url(#skin)"/>
  <path d="M352 356 Q340 300 330 250 L350 244 Q362 300 376 344 Z" fill="url(#skin)"/>
  <g transform="rotate(-8 340 200)">
    <rect x="326" y="96" width="32" height="128" rx="6" fill="url(#gun)" stroke="#0b0f1c" stroke-width="3"/>
    <rect x="320" y="200" width="44" height="60" rx="8" fill="#2a3246" stroke="#0b0f1c" stroke-width="3"/>
    <rect x="334" y="110" width="8" height="90" rx="3" fill="#29e6ff" filter="url(#hg)"/>
    <rect x="330" y="84" width="24" height="16" rx="4" fill="#5a6680"/>
  </g>
  <path d="M332 232 Q324 248 336 258 L360 252 Q366 236 356 226 Z" fill="url(#skin)"/>
  <!-- rim light (city glow) -->
  <path d="M350 250 Q366 330 340 420" stroke="#ff2bd6" stroke-width="3" fill="none" opacity="0.7" filter="url(#hg)"/>
  <path d="M130 254 Q114 340 124 418" stroke="#29e6ff" stroke-width="3" fill="none" opacity="0.8" filter="url(#hg)"/>`,
);

/** Ponytail (separate sprite for sway). Same coordinate space as the body. */
export const heroPonytailSvg = svg(
  HERO_W,
  HERO_H,
  `<defs>${lin('pt', [[0, '#ff3b2f'], [1, '#9a0f1c']], 0, 0, 1, 1)}</defs>
   <path d="M206 92 Q150 60 112 112 Q76 170 98 260 Q110 320 84 380 Q140 330 140 250 Q140 180 176 140 Q196 118 214 112 Z" fill="url(#pt)"/>
   <path d="M190 96 Q140 90 122 140 Q104 200 118 270" stroke="#ff8a6a" stroke-width="5" fill="none" opacity="0.7"/>
   <circle cx="204" cy="100" r="10" fill="#ff2bd6"/>`,
);

/** Glow for gun tip (additive). */
export const muzzleGlowSvg = svg(
  128,
  128,
  `<defs>${rad('mg', [[0, '#ffffff', 1], [0.25, '#29e6ff', 0.9], [1, '#29e6ff', 0]])}</defs><circle cx="64" cy="64" r="64" fill="url(#mg)"/>`,
);

/** Boss mech for the bonus round. 640x680. */
export const BOSS_W = 640;
export const BOSS_H = 680;
export const bossSvg = svg(
  BOSS_W,
  BOSS_H,
  `<defs>
    ${lin('bm', [[0, '#8e86c8'], [0.45, '#4a3f86'], [1, '#1a1438']], 0, 0, 1, 1)}
    ${lin('bm2', [[0, '#6c64a8'], [1, '#221a48']], 0, 0, 1, 1)}
    ${rad('core', [[0, '#ffffff'], [0.3, '#ff6ae6'], [0.7, '#ff2bd6', 0.6], [1, '#ff2bd6', 0]])}
    ${glowFilter('bg', 6, 2)}${glowFilter('bg3', 14, 2)}
  </defs>
  <!-- legs -->
  <path d="M220 470 L290 470 L280 640 L196 640 Z" fill="url(#bm2)" stroke="#0a0820" stroke-width="5"/>
  <path d="M350 470 L420 470 L444 640 L360 640 Z" fill="url(#bm2)" stroke="#0a0820" stroke-width="5"/>
  <path d="M176 640 L296 640 L300 676 L170 676 Z M344 640 L464 640 L470 676 L340 676 Z" fill="#2a2450" stroke="#0a0820" stroke-width="4"/>
  <!-- arms -->
  <path d="M120 190 L60 300 L70 440 L130 450 L150 320 L190 250 Z" fill="url(#bm)" stroke="#0a0820" stroke-width="5"/>
  <path d="M50 430 L150 430 L146 520 L56 520 Z" fill="#2a2450" stroke="#0a0820" stroke-width="5"/>
  <circle cx="100" cy="520" r="22" fill="#ff2bd6" filter="url(#bg)"/>
  <path d="M520 190 L580 300 L570 440 L510 450 L490 320 L450 250 Z" fill="url(#bm)" stroke="#0a0820" stroke-width="5"/>
  <path d="M490 430 L590 430 L584 520 L496 520 Z" fill="#2a2450" stroke="#0a0820" stroke-width="5"/>
  <circle cx="540" cy="520" r="22" fill="#ff2bd6" filter="url(#bg)"/>
  <!-- torso -->
  <path d="M170 170 L470 170 L440 400 L380 480 L260 480 L200 400 Z" fill="url(#bm)" stroke="#0a0820" stroke-width="6"/>
  <path d="M220 200 L420 200 L400 360 L240 360 Z" fill="#2a2058" opacity="0.7"/>
  <circle cx="320" cy="290" r="78" fill="url(#core)" filter="url(#bg3)"/>
  <circle cx="320" cy="290" r="46" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.9"/>
  <circle cx="320" cy="290" r="62" fill="none" stroke="#29e6ff" stroke-width="3" stroke-dasharray="14 10" opacity="0.8"/>
  <path d="M240 400 L400 400 M260 430 L380 430" stroke="#29e6ff" stroke-width="4" filter="url(#bg)"/>
  <!-- shoulders -->
  <path d="M90 150 Q110 100 200 110 L220 200 Q150 230 100 210 Z" fill="url(#bm)" stroke="#0a0820" stroke-width="6"/>
  <path d="M550 150 Q530 100 440 110 L420 200 Q490 230 540 210 Z" fill="url(#bm)" stroke="#0a0820" stroke-width="6"/>
  <path d="M110 160 L200 140 M530 160 L440 140" stroke="#ff2bd6" stroke-width="5" filter="url(#bg)"/>
  <!-- head -->
  <path d="M262 70 L378 70 L396 140 L360 176 L280 176 L244 140 Z" fill="url(#bm)" stroke="#0a0820" stroke-width="6"/>
  <path d="M262 110 L378 110 L370 136 L270 136 Z" fill="#ff1f3d" filter="url(#bg)"/>
  <path d="M290 30 L300 70 M350 30 L340 70" stroke="#8e86c8" stroke-width="8"/>
  <circle cx="290" cy="28" r="7" fill="#29e6ff" filter="url(#bg)"/><circle cx="350" cy="28" r="7" fill="#29e6ff" filter="url(#bg)"/>`,
);

export const BOSS_CORE = { x: 320, y: 290 };
