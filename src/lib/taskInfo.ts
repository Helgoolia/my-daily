import type { AppData, Task } from '../data/types';
import { t, tf, type Lang } from './i18n';
import { formatMinutes, fromISODate, toISODate } from './time';
import { weekRows } from '../data/actions';

/**
 * Per-task facts shown in the sidebar tooltip and in the "Name a task" suggestions:
 * all-time total (with the running session), whether it is in this week, when it was last tracked.
 */
export type TaskInfo = {
  task: Task;
  total: number;
  inWeek: boolean;
  running: boolean;
  /** ISO date of the last entry, or null if never tracked */
  last: string | null;
};

export function taskInfos(data: AppData, now: Date): Map<string, TaskInfo> {
  const week = new Set(weekRows(data, now));
  const live = data.timer ? Math.max(0, (now.getTime() - new Date(data.timer.startedAt).getTime()) / 60_000) : 0;
  const map = new Map<string, TaskInfo>();
  for (const task of data.tasks) {
    const running = data.timer?.taskId === task.id;
    map.set(task.id, { task, total: running ? live : 0, inWeek: week.has(task.id), running, last: running ? toISODate(now) : null });
  }
  for (const e of data.entries) {
    const info = map.get(e.taskId);
    if (!info) continue;
    info.total += e.minutes;
    if (!info.last || e.date > info.last) info.last = e.date;
  }
  return map;
}

/** "3 days ago", "1 week ago", "8 months ago" — numeric always, as in Figma ("1 week ago", not "last week"). */
export function ago(lang: Lang, isoDate: string, now: Date): string {
  const days = Math.max(0, Math.round((fromISODate(toISODate(now)).getTime() - fromISODate(isoDate).getTime()) / 86_400_000));
  const rtf = new Intl.RelativeTimeFormat(lang === 'uk' ? 'uk' : 'en', { numeric: 'always' });
  if (days < 7) return rtf.format(-Math.max(1, days), 'day');
  if (days < 30) return rtf.format(-Math.floor(days / 7), 'week');
  if (days < 365) return rtf.format(-Math.max(1, Math.floor(days / 30.44)), 'month');
  return rtf.format(-Math.floor(days / 365), 'year');
}

/** Sidebar row tooltip, second line: Tracking now · This week · 1 week ago · Not tracked yet */
export function rowStatus(lang: Lang, info: TaskInfo, now: Date): string {
  if (info.running) return t(lang, 'trackingNow');
  if (info.inWeek) return t(lang, 'thisWeek');
  return info.last ? ago(lang, info.last, now) : t(lang, 'notTracked');
}

/** Suggestion meta: "412:00 · last tracked 8 months ago · Hidden" (Figma Flow 10) */
export function suggestionMeta(lang: Lang, info: TaskInfo, now: Date): string {
  const parts = [formatMinutes(info.total)];
  // Same status as the sidebar tooltip: a running task says so
  if (info.running) parts.push(t(lang, 'metaRunning'));
  else if (info.inWeek) parts.push(t(lang, 'metaInWeek'));
  else parts.push(info.last ? tf(lang, 'metaLastTracked', { ago: ago(lang, info.last, now) }) : t(lang, 'metaNotTracked'));
  if (info.task.hidden) parts.push(t(lang, 'metaHidden'));
  return parts.join(' · ');
}

export type Suggestion = { id: string; name: string; meta: string; exact: boolean };

/**
 * From 2 letters: tasks whose name contains the text (hidden and not-in-week included).
 * Exact match first, then names that start with the text, then the most tracked. Max 5.
 */
export function suggestions(data: AppData, query: string, lang: Lang, now: Date): Suggestion[] {
  const q = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (q.length < 2) return [];
  const infos = taskInfos(data, now);
  return [...infos.values()]
    .filter((i) => i.task.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const rank = (i: TaskInfo) => (i.task.name.toLowerCase() === q ? 0 : i.task.name.toLowerCase().startsWith(q) ? 1 : 2);
      return rank(a) - rank(b) || b.total - a.total;
    })
    .slice(0, 5)
    .map((i) => ({ id: i.task.id, name: i.task.name, meta: suggestionMeta(lang, i, now), exact: i.task.name.toLowerCase() === q }));
}
