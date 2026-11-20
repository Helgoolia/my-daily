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
