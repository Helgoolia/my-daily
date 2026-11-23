import { mondayOf, toISODate } from '../lib/time';
import type { AppData, Entry, Task } from './types';

/** Pure functions: take data, return new data. The UI saves whatever comes back. */

const newId = () => Math.random().toString(36).slice(2, 10);

/** Stops the running timer (if any) and records the session as one entry for the day it started. */
export function stopTimer(data: AppData, now = new Date()): AppData {
  if (!data.timer) return data;
  const started = new Date(data.timer.startedAt);
  // Exact length, not rounded: many short sessions must add up (stored as fractional minutes).
  const minutes = Math.max(0, (now.getTime() - started.getTime()) / 60_000);
  const entries: Entry[] =
    minutes >= 1 / 60
      ? [...data.entries, { id: newId(), taskId: data.timer.taskId, date: toISODate(started), minutes, source: 'timer' }]
      : data.entries;
  return { ...data, entries, timer: null };
}

/** Starts a timer for a task; a running timer on another task stops first (switching is one click). */
export function startTimer(data: AppData, taskId: string, now = new Date()): AppData {
  if (data.timer?.taskId === taskId) return data;
  const stopped = stopTimer(data, now);
  return ensureInWeek({ ...stopped, timer: { taskId, startedAt: now.toISOString() } }, taskId, now);
}

/** Adds a task to the week of `day` (rows keep their order; new ones go to the end). */
export function ensureInWeek(data: AppData, taskId: string, day = new Date()): AppData {
  const key = toISODate(mondayOf(day));
  const rows = data.weeks[key] ?? [];
  if (rows.includes(taskId)) return data;
  return { ...data, weeks: { ...data.weeks, [key]: [...rows, taskId] } };
}

export const findTaskByName = (data: AppData, name: string) =>
  data.tasks.find((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase());

/**
 * "Name a task" → Enter. An exact (case-insensitive) match brings the existing task back into
 * this week with all its time — no duplicate names. Otherwise a new task is created.
 */
export function addTaskToWeek(data: AppData, rawName: string, now = new Date()): { data: AppData; taskId: string | null } {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name) return { data, taskId: null };
  const existing = findTaskByName(data, name);
  if (existing) {
    const unhidden = existing.hidden
      ? { ...data, tasks: data.tasks.map((t) => (t.id === existing.id ? { ...t, hidden: false } : t)) }
      : data;
    return { data: ensureInWeek(unhidden, existing.id, now), taskId: existing.id };
  }
  const task: Task = { id: newId(), name, hidden: false, createdAt: now.toISOString() };
  return { data: ensureInWeek({ ...data, tasks: [...data.tasks, task] }, task.id, now), taskId: task.id };
}

export const setHidden = (data: AppData, taskId: string, hidden: boolean): AppData => ({
  ...data,
  tasks: data.tasks.map((t) => (t.id === taskId ? { ...t, hidden } : t)),
});

const weekDates = (monday: Date) => Array.from({ length: 7 }, (_, i) => toISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));

/** Minutes a task has in the week of `day` (stored entries only). */
export function weekMinutes(data: AppData, taskId: string, day = new Date()): number {
  const dates = new Set(weekDates(mondayOf(day)));
  return data.entries.reduce((s, e) => (e.taskId === taskId && dates.has(e.date) ? s + e.minutes : s), 0);
}

/**
 * Remove from this week: deletes this week's time for the task and drops its row.
 * The task and its time in other weeks stay. A timer running on it stops without saving.
 */
export function removeFromWeek(data: AppData, taskId: string, day = new Date()): AppData {
  const monday = mondayOf(day);
  const key = toISODate(monday);
  const dates = new Set(weekDates(monday));
  return {
    ...data,
    entries: data.entries.filter((e) => !(e.taskId === taskId && dates.has(e.date))),
    weeks: { ...data.weeks, [key]: (data.weeks[key] ?? []).filter((id) => id !== taskId) },
    timer: data.timer?.taskId === taskId ? null : data.timer,
  };
}

/** Delete: the task, all its time and its rows in every week. A timer running on it stops. */
export function deleteTask(data: AppData, taskId: string): AppData {
  const weeks: AppData['weeks'] = {};
  for (const [k, ids] of Object.entries(data.weeks)) weeks[k] = ids.filter((id) => id !== taskId);
  return {
    ...data,
    tasks: data.tasks.filter((t) => t.id !== taskId),
    entries: data.entries.filter((e) => e.taskId !== taskId),
    weeks,
    timer: data.timer?.taskId === taskId ? null : data.timer,
  };
}

/**
 * Hide: the task leaves the sidebar list and won't carry into new weeks. No time is deleted;
 * if it has no time this week, its row leaves this week too.
 */
export function hideTask(data: AppData, taskId: string, day = new Date()): AppData {
  let next = setHidden(data, taskId, true);
  if (weekMinutes(next, taskId, day) === 0 && next.timer?.taskId !== taskId) {
    const key = toISODate(mondayOf(day));
    next = { ...next, weeks: { ...next.weeks, [key]: (next.weeks[key] ?? []).filter((id) => id !== taskId) } };
  }
  return next;
}

export type RenameResult = { ok: true; data: AppData } | { ok: false; reason: 'empty' | 'exists'; existingName?: string };

/** Rename everywhere (entries point to the id). Names stay unique, case-insensitive. */
export function renameTask(data: AppData, taskId: string, rawName: string): RenameResult {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, reason: 'empty' };
  const clash = data.tasks.find((t) => t.id !== taskId && t.name.toLowerCase() === name.toLowerCase());
  if (clash) return { ok: false, reason: 'exists', existingName: clash.name };
  return { ok: true, data: { ...data, tasks: data.tasks.map((t) => (t.id === taskId ? { ...t, name } : t)) } };
}
