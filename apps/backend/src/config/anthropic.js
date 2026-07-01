import Anthropic from '@anthropic-ai/sdk';

let client = null;

/**
 * Lazily construct the Anthropic client. Returns null when no credentials are
 * configured so the assistant can fall back to the deterministic engine.
 */
export const getAnthropic = () => {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return client;
};

/**
 * Models that reject sampling parameters (temperature/top_p/top_k) with a 400.
 * For these we must omit `temperature` from the request.
 */
export const NO_SAMPLING_MODELS = new Set([
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-sonnet-5',
  'claude-fable-5',
]);

export const isAiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
