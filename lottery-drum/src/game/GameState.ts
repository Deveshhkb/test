import { GameState } from './types';

/**
 * The legal phase order for one draw. Kept as data so the sequence director and
 * the debug overlay agree on what may follow what, and an illegal transition
 * fails loudly in development instead of silently wedging the machine.
 */
const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  idle: ['spinning'],
  spinning: ['draining'],
  draining: ['settling'],
  settling: ['revealing'],
  revealing: ['returning'],
  returning: ['idle'],
};

export const STATE_ORDER: readonly GameState[] = [
  'idle',
  'spinning',
  'draining',
  'settling',
  'revealing',
  'returning',
];

export function canTransition(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Human-readable Indonesian labels, matching the reference HUD. */
export const STATE_LABEL: Record<GameState, string> = {
  idle: 'Siap',
  spinning: 'Mengaduk',
  draining: 'Mengeluarkan',
  settling: 'Menetap',
  revealing: 'Hasil',
  returning: 'Selesai',
};
