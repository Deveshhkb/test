import { IST_OFFSET_MINUTES } from "../config/marketHours";

const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 86_400_000;

/**
 * Wall-clock representation of an instant in IST. We shift the epoch rather
 * than relying on `Intl` time zones so the result is identical on a server in
 * UTC and a browser in any locale.
 */
export interface IstParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0 = Sunday
  hours: number;
  minutes: number;
  seconds: number;
  /** Minutes elapsed since IST midnight. */
  minutesOfDay: number;
  /** yyyy-mm-dd in IST. */
  isoDate: string;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function toIstParts(instant: Date | number = Date.now()): IstParts {
  const ms = instant instanceof Date ? instant.getTime() : instant;
  const shifted = new Date(ms + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  return {
    year,
    month,
    day,
    weekday: shifted.getUTCDay(),
    hours,
    minutes,
    seconds: shifted.getUTCSeconds(),
    minutesOfDay: hours * 60 + minutes,
    isoDate: `${year}-${pad(month)}-${pad(day)}`,
  };
}

/** Epoch milliseconds for a given IST wall-clock date and minute-of-day. */
export function istToEpoch(isoDate: string, minutesOfDay = 0): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utcMidnight = Date.UTC(year, (month ?? 1) - 1, day ?? 1);
  return utcMidnight + (minutesOfDay - IST_OFFSET_MINUTES) * MS_PER_MINUTE;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Whole calendar days between two IST dates (`to - from`). */
export function daysBetweenIso(fromIso: string, toIso: string): number {
  return Math.round((istToEpoch(toIso) - istToEpoch(fromIso)) / MS_PER_DAY);
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** `2026-09-17` -> `17 SEP 2026`. */
export function formatExpiryLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${pad(day ?? 1)} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}

export function formatIstClock(instant: Date | number = Date.now()): string {
  const parts = toIstParts(instant);
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

export function formatIstTimestamp(instant: Date | number = Date.now()): string {
  const parts = toIstParts(instant);
  return `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year}, ${pad(parts.hours)}:${pad(parts.minutes)} IST`;
}

export function relativeTimeFromNow(timestamp: number, now = Date.now()): string {
  const diffSeconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
