import { RouletteNumber } from '../Types';

/**
 * Formatting, object and DOM helpers shared across modules.
 */

/** Stable string key for a roulette number (`0`, `00`, `17`). */
export function numberKey(value: RouletteNumber): string {
  return String(value);
}

/** Parse a key produced by {@link numberKey} back into a RouletteNumber. */
export function parseNumberKey(key: string): RouletteNumber {
  return key === '00' ? '00' : Number(key);
}

/**
 * Compact currency formatting used on chips, the balance readout and payout
 * labels: 1234 -> "1.23K", 2_500_000 -> "2.5M".
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return trimZeros(value / 1_000_000_000) + 'B';
  if (abs >= 1_000_000) return trimZeros(value / 1_000_000) + 'M';
  if (abs >= 1_000) return trimZeros(value / 1_000) + 'K';
  return String(Math.round(value * 100) / 100);
}

function trimZeros(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/** Full currency formatting with thousands separators, e.g. "12,345.00". */
export function formatCurrency(value: number, currency = '', decimals = 2): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value < 0 ? '-' : '';
  const body = fraction ? `${grouped}.${fraction}` : grouped;
  return currency ? `${sign}${currency}${body}` : `${sign}${body}`;
}

/** `mm:ss` for the countdown; clamps negatives to zero. */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Recursive merge of a partial config over a base config.
 *
 * Arrays are replaced wholesale rather than merged element-wise - a partial
 * chip ladder should override the default ladder, not interleave with it.
 */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(patch)) return patch as unknown as T;
  if (typeof patch !== 'object' || typeof base !== 'object' || base === null) {
    return patch as T;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = result[key];
    result[key] =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? deepMerge(current, value)
        : value;
  }
  return result as T;
}

/** Structural clone that survives `readonly` config objects. */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Monotonically increasing id with a caller-supplied prefix. */
let idCounter = 0;
export function uniqueId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** True when the current environment exposes a touch-capable pointer. */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    window.matchMedia?.('(pointer: coarse)').matches === true
  );
}

/**
 * Read the CSS `env(safe-area-inset-*)` values.
 *
 * They are only resolvable through the cascade, so we mount a throwaway probe
 * element, read its computed padding and remove it. Called on resize only -
 * never per frame.
 */
export function readSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
  const fallback = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof document === 'undefined') return fallback;

  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'top:0',
    'left:0',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
  ].join(';');

  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const insets = {
    top: parseFloat(computed.paddingTop) || 0,
    right: parseFloat(computed.paddingRight) || 0,
    bottom: parseFloat(computed.paddingBottom) || 0,
    left: parseFloat(computed.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Break a stake into chip denominations, largest first, so a 2,750 bet renders
 * as a believable stack rather than 2,750 one-unit chips.
 */
export function decomposeIntoChips(
  amount: number,
  denominations: readonly number[],
  maxChips = 12,
): number[] {
  const sorted = [...denominations].sort((a, b) => b - a);
  const chips: number[] = [];
  let remaining = amount;

  for (const denomination of sorted) {
    while (remaining >= denomination && chips.length < maxChips) {
      chips.push(denomination);
      remaining -= denomination;
    }
  }
  // Anything left over (odd amount, or the stack cap was hit) rides on the
  // smallest chip so the visual total never under-represents the stake.
  if (remaining > 0 && chips.length > 0) {
    chips[chips.length - 1] += remaining;
  } else if (remaining > 0) {
    chips.push(remaining);
  }
  return chips;
}

/** Promise that resolves after `seconds`, cancellable through the returned handle. */
export function delay(seconds: number): { promise: Promise<void>; cancel: () => void } {
  let timeout = 0;
  let settle: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    settle = resolve;
    timeout = window.setTimeout(resolve, seconds * 1000);
  });
  return {
    promise,
    cancel: () => {
      window.clearTimeout(timeout);
      settle();
    },
  };
}
