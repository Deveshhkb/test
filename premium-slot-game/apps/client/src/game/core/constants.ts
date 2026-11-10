export const REELS = 6;
export const ROWS = 5;
export const CELL_W = 168;
export const CELL_H = 144;
export const SYMBOL_SIZE = 140;
export const GRID_W = CELL_W * REELS;
export const GRID_H = CELL_H * ROWS;
export const FRAME_PAD = 40;
export const FRAME_W = GRID_W + FRAME_PAD * 2;
export const FRAME_H = GRID_H + FRAME_PAD * 2;

export interface Timing {
  spinStagger: number;
  accelDuration: number;
  minSpinTime: number;
  stopDelay: number;
  decelDuration: number;
  bounce: number;
  anticipation: number;
  maxSpeed: number; // symbols per ms
  winHighlight: number;
  cascadeFall: number;
}

export const NORMAL_TIMING: Timing = {
  spinStagger: 70,
  accelDuration: 0.28,
  minSpinTime: 650,
  stopDelay: 170,
  decelDuration: 0.42,
  bounce: 0.2,
  anticipation: 1300,
  maxSpeed: 0.034,
  winHighlight: 900,
  cascadeFall: 0.42,
};

export const TURBO_TIMING: Timing = {
  spinStagger: 20,
  accelDuration: 0.12,
  minSpinTime: 220,
  stopDelay: 55,
  decelDuration: 0.24,
  bounce: 0.12,
  anticipation: 600,
  maxSpeed: 0.05,
  winHighlight: 450,
  cascadeFall: 0.26,
};

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
