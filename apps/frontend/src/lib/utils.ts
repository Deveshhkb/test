import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price with Indian digit grouping (₹1,23,456).
 *
 * Grouping is computed manually rather than via Intl.NumberFormat so the
 * server and client always produce byte-identical output regardless of the
 * Node vs. browser ICU/locale data — avoiding React hydration mismatches.
 */
export function formatPrice(value: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : '';
  const n = Math.round(Math.abs(value) || 0);
  const digits = n.toString();
  let grouped = digits;
  if (digits.length > 3) {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${rest},${last3}`;
  }
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${grouped}`;
}

export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
