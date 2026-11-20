// Data model v1 — see docs/data-model.md for the rules behind it.

export type ISODate = string; // "2026-11-09" — a local calendar day
export type ISODateTime = string; // "2026-11-09T09:48:00.000Z"

export type Task = {
  id: string;
  name: string; // unique, case-insensitive
  hidden: boolean;
  createdAt: ISODateTime;
};

export type Entry = {
  id: string;
  taskId: string;
  date: ISODate;
  minutes: number; // whole minutes, 1:30 = 90
  source: 'timer' | 'manual' | 'import';
  importId?: string;
};

export type RunningTimer = {
  taskId: string;
  startedAt: ISODateTime;
};

/** key = Monday of the week; value = task ids shown as rows, in order */
export type WeekMembership = Record<ISODate, string[]>;

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  language: 'uk' | 'en';
  sort: 'most-tracked' | 'recent' | 'name';
};

export type ImportBatch = {
  id: string;
  at: ISODateTime;
  entryIds: string[];
  createdTaskIds: string[];
};

export type AppData = {
  version: 1;
  tasks: Task[];
  entries: Entry[];
  timer: RunningTimer | null;
  weeks: WeekMembership;
  settings: Settings;
  lastImport: ImportBatch | null;
};

export const emptyData = (): AppData => ({
  version: 1,
  tasks: [],
  entries: [],
  timer: null,
  weeks: {},
  settings: { theme: 'system', language: 'en', sort: 'most-tracked' },
  lastImport: null,
});
