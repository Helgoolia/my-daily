import type { ISODate } from '../data/types';

/** 90 → "1:30", 0 → "0:00" */
export function formatMinutes(total: number): string {
  // Floor like a clock (1:29:59 shows 1:29); the epsilon absorbs float sums like 89.9999999.
  const m = Math.max(0, Math.floor(total + 1e-6));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Elapsed seconds → "1:25:18" (running timer) */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export type ParsedDuration =
  | { ok: true; minutes: number; ambiguous?: { decimal: number; hoursMinutes: number } }
  | { ok: false };

/**
 * "1:30" → 90 · "1.5" / "1,5" → 90 (decimal hours) · "2" → 120.
 * A value like "3,4" is read as decimal hours (3:24), but is flagged:
 * the import review may offer "3:40" instead when every decimal in the file is ≤ .59 (see plan).
 */
export function parseDuration(input: string): ParsedDuration {
  const v = input.trim();
  let match = v.match(/^(\d{1,3}):([0-5]\d)$/);
  if (match) return { ok: true, minutes: Number(match[1]) * 60 + Number(match[2]) };
  match = v.match(/^(\d{1,3})(?:[.,](\d{1,2}))?$/);
  if (!match) return { ok: false };
  const hours = Number(match[1]);
  const frac = match[2];
  if (!frac) return { ok: true, minutes: hours * 60 };
  const decimal = Math.round((hours + Number(`0.${frac}`)) * 60);
  const asMinutes = Number(frac.padEnd(2, '0'));
  const hoursMinutes = asMinutes <= 59 ? hours * 60 + asMinutes : null;
  return hoursMinutes === null || hoursMinutes === decimal
    ? { ok: true, minutes: decimal }
    : { ok: true, minutes: decimal, ambiguous: { decimal, hoursMinutes } };
}

/** Local calendar day as "YYYY-MM-DD" (not UTC — a late-evening session belongs to today). */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Weeks start on Monday. */
export function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (r.getDay() + 6) % 7; // Mon=0 … Sun=6
  r.setDate(r.getDate() - shift);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Week number inside the month of its Monday: Nov 9–15, 2026 → 2 */
export function weekOfMonth(monday: Date): number {
  return Math.ceil(monday.getDate() / 7);
}
