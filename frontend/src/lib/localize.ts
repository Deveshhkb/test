import type { Localized } from './types';
import type { LanguageCode } from '@/i18n/languages';

/**
 * Resolve a localized string for the active language, falling back to English
 * and finally to the first available translation.
 */
export function localize(value: Localized | undefined, lang: string): string {
  if (!value) return '';
  const code = lang as LanguageCode;
  return value[code] || value.en || Object.values(value)[0] || '';
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Deterministic date formatting (fixed locale + UTC) so server and client render
 * identical text and avoid hydration mismatches.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
}
