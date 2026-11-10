/** Small helpers for authoring original SVG art in code. */
export const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

export const glowFilter = (id: string, std = 4, strength = 2) => `
  <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="${std}" result="b"/>
    <feMerge>${'<feMergeNode in="b"/>'.repeat(strength)}<feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

export const lin = (id: string, stops: [number, string][], x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`;

export const rad = (id: string, stops: [number, string, number?][], cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`)
    .join('')}</radialGradient>`;

export const svgToDataUrl = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;

export async function loadSvgImage(s: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = svgToDataUrl(s);
  await img.decode();
  return img;
}
