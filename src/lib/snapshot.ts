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
