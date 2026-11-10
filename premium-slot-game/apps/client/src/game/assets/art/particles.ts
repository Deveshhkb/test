/** Particle textures drawn with Canvas2D into one small atlas. */
export const PARTICLE_CELL = 96;
export const PARTICLE_NAMES = ['coin', 'spark', 'star', 'clover', 'glow', 'ring', 'shard', 'bolt'] as const;
export type ParticleName = (typeof PARTICLE_NAMES)[number];

export function drawParticleAtlas(): HTMLCanvasElement {
  const C = PARTICLE_CELL;
  const c = document.createElement('canvas');
  c.width = C * 4;
  c.height = C * 2;
  const ctx = c.getContext('2d')!;
  const at = (i: number, fn: (cx: number, cy: number) => void) => {
    ctx.save();
    fn((i % 4) * C + C / 2, Math.floor(i / 4) * C + C / 2);
    ctx.restore();
  };
  // coin
  at(0, (x, y) => {
    const g = ctx.createRadialGradient(x - 10, y - 12, 4, x, y, 40);
    g.addColorStop(0, '#fff6c0');
    g.addColorStop(0.45, '#ffc02a');
    g.addColorStop(1, '#a35a00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a3e00';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#ffe680';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8a4a00';
    ctx.font = 'bold 36px Orbitron, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x + 1, y + 2);
    ctx.fillStyle = '#fff2b0';
    ctx.fillText('N', x - 1, y);
  });
  // spark
  at(1, (x, y) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 40);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 46, y - 46, 92, 92);
  });
  // star
  at(2, (x, y) => {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 40 : 8;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
  // clover
  at(3, (x, y) => {
    ctx.fillStyle = '#2cff6a';
    ctx.shadowColor = '#2cff6a';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#12a040';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 10, y + 30, x + 4, y + 42);
    ctx.stroke();
  });
  // glow
  at(4, (x, y) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 46);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 48, y - 48, 96, 96);
  });
  // ring
  at(5, (x, y) => {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.stroke();
  });
  // shard
  at(6, (x, y) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x, y + 40);
    ctx.lineTo(x - 12, y);
    ctx.closePath();
    ctx.fill();
  });
  // bolt
  at(7, (x, y) => {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#29e6ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 42);
    ctx.lineTo(x - 18, y + 4);
    ctx.lineTo(x - 2, y + 4);
    ctx.lineTo(x - 10, y + 42);
    ctx.lineTo(x + 20, y - 8);
    ctx.lineTo(x + 4, y - 8);
    ctx.closePath();
    ctx.fill();
  });
  return c;
}
