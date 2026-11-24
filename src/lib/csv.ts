import type { AppData } from '../data/types';
import { toISODate } from './time';

/**
 * Export — docs/data-model.md: the same CSV the import reads, `date,task,duration`.
 * One row per task per day (a day's sessions summed), oldest first, then by task name.
 * Duration h:mm, rounded to the nearest minute. A running timer is included up to `now`,
 * so the file matches what the screen shows. Tasks without time aren't in the file (no rows).
 * UTF-8 with a BOM so Excel shows Cyrillic names correctly; RFC 4180 quoting.
 */
export function exportCsv(data: AppData, now: Date): string {
  const byKey = new Map<string, { date: string; taskId: string; minutes: number }>();
  const add = (date: string, taskId: string, minutes: number) => {
    const k = `${date}\u0000${taskId}`;
    const row = byKey.get(k) ?? { date, taskId, minutes: 0 };
    row.minutes += minutes;
    byKey.set(k, row);
  };
  for (const e of data.entries) add(e.date, e.taskId, e.minutes);
  if (data.timer) {
    const started = new Date(data.timer.startedAt);
    add(toISODate(started), data.timer.taskId, Math.max(0, (now.getTime() - started.getTime()) / 60_000));
  }
  const name = new Map(data.tasks.map((t) => [t.id, t.name]));
  const rows = [...byKey.values()]
    .map((r) => ({ ...r, minutes: Math.round(r.minutes), task: name.get(r.taskId) }))
    .filter((r): r is typeof r & { task: string } => r.task !== undefined && r.minutes > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.task.localeCompare(b.task));
  const lines = ['date,task,duration', ...rows.map((r) => `${r.date},${quote(r.task)},${Math.floor(r.minutes / 60)}:${String(r.minutes % 60).padStart(2, '0')}`)];
  return '﻿' + lines.join('\r\n') + '\r\n';
}

const quote = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** my-daily-2026-11-24.csv (Figma: Result · Exported) */
export const exportFileName = (now: Date) => `my-daily-${toISODate(now)}.csv`;

/** Hands the file to the browser as a download. */
export function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
