import type { EmitConfig } from './ParticleSystem';

/** Ready-made particle bursts. Positions are filled in at emit time. */

type Preset = Omit<EmitConfig, 'x' | 'y'>;

export const PARTICLE_PRESETS = {
  coinBurst: {
    texture: 'coin',
    count: 40,
    angle: -Math.PI / 2,
    spread: Math.PI * 0.9,
    speedMin: 350,
    speedMax: 900,
    gravity: 1600,
    lifeMin: 1.2,
    lifeMax: 2.0,
    scaleMin: 0.7,
    scaleMax: 1.2,
    scaleEnd: 0.9,
    rotation: true,
  } satisfies Preset,

  coinFountain: {
    texture: 'coin',
    count: 120,
    angle: -Math.PI / 2,
    spread: Math.PI * 0.6,
    speedMin: 600,
    speedMax: 1300,
    gravity: 1500,
    lifeMin: 1.6,
    lifeMax: 2.6,
    scaleMin: 0.8,
    scaleMax: 1.4,
    scaleEnd: 1,
    rotation: true,
  } satisfies Preset,

  starBurst: {
    texture: 'star',
    count: 24,
    spread: Math.PI * 2,
    speedMin: 120,
    speedMax: 420,
    drag: 2.5,
    lifeMin: 0.5,
    lifeMax: 1.0,
    scaleMin: 0.5,
    scaleMax: 1.1,
    rotation: true,
  } satisfies Preset,

  sparkle: {
    texture: 'sparkle',
    count: 14,
    spread: Math.PI * 2,
    speedMin: 40,
    speedMax: 200,
    drag: 3,
    lifeMin: 0.35,
    lifeMax: 0.8,
    scaleMin: 0.3,
    scaleMax: 0.8,
    rotation: true,
  } satisfies Preset,

  fire: {
    texture: 'fire',
    count: 30,
    angle: -Math.PI / 2,
    spread: Math.PI * 0.5,
    speedMin: 80,
    speedMax: 260,
    gravity: -250,
    lifeMin: 0.4,
    lifeMax: 0.9,
    scaleMin: 0.6,
    scaleMax: 1.3,
    scaleEnd: 0.1,
    alphaEnd: 0,
  } satisfies Preset,

  smoke: {
    texture: 'smoke',
    count: 12,
    angle: -Math.PI / 2,
    spread: Math.PI * 0.6,
    speedMin: 40,
    speedMax: 120,
    gravity: -80,
    lifeMin: 1.0,
    lifeMax: 2.0,
    scaleMin: 0.6,
    scaleMax: 1.4,
    scaleEnd: 2.2,
    alphaEnd: 0,
  } satisfies Preset,

  magic: {
    texture: 'magic',
    count: 26,
    spread: Math.PI * 2,
    speedMin: 60,
    speedMax: 320,
    drag: 2,
    lifeMin: 0.5,
    lifeMax: 1.1,
    scaleMin: 0.4,
    scaleMax: 1.0,
    rotation: true,
  } satisfies Preset,
} as const;

export type ParticlePresetName = keyof typeof PARTICLE_PRESETS;
