/** Developer tool: renders all generated artwork for visual review (open /preview.html). */
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/russo-one/400.css';
import { SYMBOL_IDS } from '@neon/game-math';
import { createGameTextures } from '../game/assets/AssetFactory';
import { heroBodySvg, heroPonytailSvg, bossSvg } from '../game/assets/art/characters';
import { drawCityBackground } from '../game/assets/art/background';
import { drawParticleAtlas } from '../game/assets/art/particles';
import { svgToDataUrl } from '../game/assets/art/svgKit';

const out = document.getElementById('out')!;
(async () => {
  const tex = await createGameTextures();
  const row = document.createElement('div');
  row.className = 'row';
  SYMBOL_IDS.forEach((id) => {
    const img = new Image();
    img.src = tex.symbolImages[id];
    img.width = 160;
    img.title = id;
    row.appendChild(img);
  });
  out.appendChild(row);
  const row2 = document.createElement('div');
  row2.className = 'row';
  for (const s of [heroBodySvg, bossSvg]) {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    const img = new Image();
    img.src = svgToDataUrl(s);
    img.height = 520;
    wrap.appendChild(img);
    if (s === heroBodySvg) {
      const p = new Image();
      p.src = svgToDataUrl(heroPonytailSvg);
      p.height = 520;
      p.style.cssText = 'position:absolute;left:0;top:0;margin:6px;z-index:-1';
      wrap.style.zIndex = '0';
      wrap.appendChild(p);
    }
    row2.appendChild(wrap);
  }
  const pa = drawParticleAtlas();
  row2.appendChild(pa);
  out.appendChild(row2);
  const bg = drawCityBackground(1920, 1080, 'base');
  bg.style.width = '960px';
  out.appendChild(bg);
  document.body.dataset.ready = '1';
})();
