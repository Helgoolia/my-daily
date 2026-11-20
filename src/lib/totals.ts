import type { Entry, ISODate } from '../data/types';

/** Totals are never stored — always derived from entries. */
export function minutesFor(entries: Entry[], taskId: string, date: ISODate): number {
  let sum = 0;
  for (const e of entries) if (e.taskId === taskId && e.date === date) sum += e.minutes;
  return sum;
}

export function dayTotal(entries: Entry[], date: ISODate, taskIds: string[]): number {
  const ids = new Set(taskIds);
  let sum = 0;
  for (const e of entries) if (e.date === date && ids.has(e.taskId)) sum += e.minutes;
  return sum;
}

export function taskTotalInRange(entries: Entry[], taskId: string, dates: ISODate[]): number {
  const set = new Set(dates);
  let sum = 0;
  for (const e of entries) if (e.taskId === taskId && set.has(e.date)) sum += e.minutes;
  return sum;
}

export function allTimeTotal(entries: Entry[], taskId: string): number {
  let sum = 0;
  for (const e of entries) if (e.taskId === taskId) sum += e.minutes;
  return sum;
}
