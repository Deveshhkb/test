import { SlotEngine } from '@/services/SlotEngine';

/**
 * In-browser fallback RGS. Runs the exact same SlotEngine as the Node
 * backend (server/app.ts), so the game works offline / without a server —
 * gameApi falls back to this instance transparently on network failure.
 */
export const mockServer = new SlotEngine();
