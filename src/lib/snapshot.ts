import type { AppData, ISODate } from '../data/types';
import { weekRows } from '../data/actions';
import type { Lang } from './i18n';
import { addDays, toISODate } from './time';

/**
 * A shared week (Figma Flow 9): a frozen copy — names (or "Task 1…"), minutes per day, the moment it
 * was taken. The PNG and the link are both drawn from it, so the preview shows exactly what is shared.
 * Days after `today` are null (nothing could be tracked there yet).
 */
export type Snapshot = {
  v: 1;
  monday: ISODate;
  /** When it was taken (ISO date-time) */
  at: string;
  today: ISODate;
  lang: Lang;
  rows: { name: string; days: (number | null)[] }[];
};

export function buildSnapshot(data: AppData, monday: Date, now: Date, names: boolean, taskLabel: (n: number) => string): Snapshot {
  const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)));
  const today = toISODate(now);
  const timer = data.timer;
  const liveDate = timer ? toISODate(new Date(timer.startedAt)) : null;
  const live = timer ? Math.max(0, (now.getTime() - new Date(timer.startedAt).getTime()) / 60_000) : 0;
  const rows = weekRows(data, monday).map((id, i) => {
    const task = data.tasks.find((t) => t.id === id);
    const days = dates.map((d) => {
      if (d > today) return null;
      let m = 0;
      for (const e of data.entries) if (e.taskId === id && e.date === d) m += e.minutes;
      if (timer?.taskId === id && liveDate === d) m += live;
      return Math.floor(m + 1e-6); // whole minutes, floored like the grid
    });
    return { name: names ? (task?.name ?? '') : taskLabel(i + 1), days };
  });
  return { v: 1, monday: dates[0], at: now.toISOString(), today, lang: data.settings.language, rows };
}

export const rowTotal = (days: (number | null)[]) => days.reduce<number>((s, m) => s + (m ?? 0), 0);
/** null for a future day, else the sum of that day's rows */
export function daySum(s: Snapshot, i: number): number | null {
  if (toISODate(addDays(new Date(s.monday + 'T12:00'), i)) > s.today) return null;
  return s.rows.reduce((t, r) => t + (r.days[i] ?? 0), 0);
}

/*
 * The link carries the snapshot itself, after the # (never sent to any server): short keys → JSON →
 * deflate (CompressionStream) → base64url. A typical week is a few hundred characters.
 */
type Packed = { v: 1; m: ISODate; a: string; t: ISODate; l: Lang; r: [string, ...(number | null)[]][] };

const toB64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSnapshot(s: Snapshot): Promise<string> {
  const packed: Packed = { v: 1, m: s.monday, a: s.at, t: s.today, l: s.lang, r: s.rows.map((r) => [r.name, ...r.days]) };
  return toB64url(await pipe(new TextEncoder().encode(JSON.stringify(packed)), new CompressionStream('deflate-raw')));
}

export async function decodeSnapshot(code: string): Promise<Snapshot | null> {
  try {
    const p = JSON.parse(new TextDecoder().decode(await pipe(fromB64url(code), new DecompressionStream('deflate-raw')))) as Packed;
    if (p.v !== 1 || !Array.isArray(p.r)) return null;
    return { v: 1, monday: p.m, at: p.a, today: p.t, lang: p.l === 'uk' ? 'uk' : 'en', rows: p.r.map(([name, ...days]) => ({ name: String(name), days: days.slice(0, 7) })) };
  } catch {
    return null;
  }
}

export const shareUrl = (code: string) => `${location.origin}/#s=${code}`;
