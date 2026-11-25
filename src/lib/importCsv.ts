import type { AppData, Entry, ISODate, Task } from '../data/types';
import { mondayOf, parseDuration, toISODate } from './time';

/**
 * Import (Figma Flow 8) — reads the CSV that Export writes, and what people make by hand or bring
 * from other apps: `date, task, duration`, one row per time entry.
 * - Separator: comma or semicolon (Excel in Ukrainian locale saves ";"). Quotes per RFC 4180. BOM ok.
 * - Header optional and in any order: date/дата, task/задача/name/project, duration/тривалість/time/hours.
 * - Dates: 2026-11-09, 09.11.2026, 09/11/2026, 09.11.26 (day first). A line with the other separator still reads.
 * - Duration: 1:30, 1.5 / 1,5, 2, 45, 045, 446 (like a week cell), 90m, 2h30. "3,4" is ambiguous (3:24 decimal or 3:40 h.mm) — the
 *   review dialog asks once for the whole file (`comma` option); decimal by default.
 * Rows that can't be read are skipped and listed under "Needs attention".
 */

export type CommaMode = 'decimal' | 'hoursMinutes';

export type ImportRow = { line: number; date: ISODate; task: string; minutes: number; ambiguous: boolean; rawDuration: string };
export type ImportProblem = {
  line: number;
  reason: 'date' | 'future' | 'duration' | 'task' | 'tooLong' | 'dayFull';
  raw: string;
};

export type ImportAnalysis = {
  rows: ImportRow[];
  problems: ImportProblem[];
  /** rows whose duration had a comma or dot that reads two ways */
  ambiguousCount: number;
  weeks: number;
  tasks: number;
  from: ISODate | null;
  to: ISODate | null;
  totalMinutes: number;
};

// Figma File Drop: header + 3 examples — h:mm, a decimal, a weekend date
export const TEMPLATE_CSV = '\uFEFFdate,task,duration\r\n2026-11-09,Site Portfolio,1:30\r\n2026-11-10,Job search,1.5\r\n2026-11-14,Reading,0:45\r\n';

/** Splits CSV text into rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = count(firstLine, ';') > count(firstLine, ',') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  // A hand-edited line may use the other separator (or both): if it has too few cells, split on either
  return rows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => (r.length < 3 && /[,;]/.test(r.join('')) ? r.join(sep).split(/[,;]/) : r));
}

const count = (s: string, ch: string) => s.split(ch).length - 1;

const HEADERS = {
  date: /^(date|day|дата|день)$/i,
  task: /^(task|task name|name|project|задача|назва|проєкт|проект)$/i,
  duration: /^(duration|time|hours|тривалість|час|години)$/i,
};

export function parseDate(v: string): ISODate | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const ymd = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/);
  const dmy = m ? [m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]), Number(m[1])] : null;
  const [y, mo, d] = ymd ?? dmy ?? [];
  if (!y) return null;
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? toISODate(date) : null;
}

function parseImportDuration(v: string, comma: CommaMode): { minutes: number; ambiguous: boolean } | null {
  const s = v.trim().toLowerCase().replace(/\s+/g, '');
  let m = s.match(/^(\d{1,3})(?:h|г|год)(?:([0-5]?\d)(?:m|хв)?)?$/);
  if (m) return { minutes: Number(m[1]) * 60 + Number(m[2] ?? 0), ambiguous: false };
  m = s.match(/^(\d{1,4})(?:m|min|хв)$/);
  if (m) return { minutes: Number(m[1]), ambiguous: false };
  // Whole numbers read like a week cell: 2 = 2:00, 45 = 0:45, 045 = 0:45, 446 = 4:46
  m = s.match(/^\d{1,4}$/);
  if (m) {
    if (s.length <= 2) return { minutes: Number(s) <= 24 ? Number(s) * 60 : Number(s), ambiguous: false };
    const mm = Number(s.slice(-2));
    return mm <= 59 ? { minutes: Number(s.slice(0, -2)) * 60 + mm, ambiguous: false } : null;
  }
  const d = parseDuration(s);
  if (!d.ok) return null;
  if (d.ambiguous) return { minutes: comma === 'decimal' ? d.ambiguous.decimal : d.ambiguous.hoursMinutes, ambiguous: true };
  return { minutes: d.minutes, ambiguous: false };
}

export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');
const key = (name: string) => normalizeName(name).toLowerCase();

/**
 * Reads the file and checks it against what's already in the app:
 * a day can't go over 24:00 together with the time already there (the extra row is skipped).
 */
export function analyzeImport(text: string, data: AppData, now: Date, comma: CommaMode = 'decimal'): ImportAnalysis {
  const table = parseCsv(text);
  let cols = { date: 0, task: 1, duration: 2 };
  let start = 0;
  const head = table[0]?.map((c) => c.trim()) ?? [];
  const found = {
    date: head.findIndex((h) => HEADERS.date.test(h)),
    task: head.findIndex((h) => HEADERS.task.test(h)),
    duration: head.findIndex((h) => HEADERS.duration.test(h)),
  };
  if (found.date >= 0 && found.task >= 0 && found.duration >= 0) { cols = found; start = 1; }
  else if (table[0] && !parseDate(table[0][0] ?? '')) start = 1; // some other header row

  const today = toISODate(now);
  const dayTotals = new Map<ISODate, number>();
  for (const e of data.entries) dayTotals.set(e.date, (dayTotals.get(e.date) ?? 0) + e.minutes);

  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];
  let ambiguousCount = 0;
  table.slice(start).forEach((cells, i) => {
    const line = i + start + 1;
    const raw = cells.join(', ');
    const date = parseDate(cells[cols.date] ?? '');
    const task = normalizeName(cells[cols.task] ?? '');
    const dur = parseImportDuration(cells[cols.duration] ?? '', comma);
    if (!date) return problems.push({ line, reason: 'date', raw });
    if (date > today) return problems.push({ line, reason: 'future', raw });
    if (!task) return problems.push({ line, reason: 'task', raw });
    if (!dur) return problems.push({ line, reason: 'duration', raw });
    if (dur.minutes <= 0) return; // empty day: nothing to add
    if (dur.minutes > 24 * 60) return problems.push({ line, reason: 'tooLong', raw });
    const total = (dayTotals.get(date) ?? 0) + dur.minutes;
    if (total > 24 * 60 + 1e-9) return problems.push({ line, reason: 'dayFull', raw });
    dayTotals.set(date, total);
    if (dur.ambiguous) ambiguousCount++;
    rows.push({ line, date, task, minutes: dur.minutes, ambiguous: dur.ambiguous, rawDuration: (cells[cols.duration] ?? '').trim() });
  });

  const dates = rows.map((r) => r.date).sort();
  return {
    rows,
    problems,
    ambiguousCount,
    weeks: new Set(rows.map((r) => toISODate(mondayOf(new Date(r.date + 'T12:00'))))).size,
    tasks: new Set(rows.map((r) => key(r.task))).size,
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
    totalMinutes: rows.reduce((s, r) => s + r.minutes, 0),
  };
}

const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * Adds the rows as one import batch. Names match existing tasks case-insensitively; the rest become
 * new tasks. Each task is shown in the weeks it has time in. Hidden tasks stay hidden.
 */
export function applyImport(data: AppData, analysis: ImportAnalysis, fileName: string, now: Date): AppData {
  const id = newId();
  const byName = new Map(data.tasks.map((t) => [key(t.name), t]));
  const created: Task[] = [];
  const entries: Entry[] = [];
  const weeks = { ...data.weeks };
  const addedRows: [ISODate, string][] = [];
  for (const r of analysis.rows) {
    let task = byName.get(key(r.task));
    if (!task) {
      task = { id: newId(), name: r.task, hidden: false, createdAt: now.toISOString() };
      byName.set(key(r.task), task);
      created.push(task);
    }
    entries.push({ id: newId(), taskId: task.id, date: r.date, minutes: r.minutes, source: 'import', importId: id });
    const monday = toISODate(mondayOf(new Date(r.date + 'T12:00')));
    const ids = weeks[monday] ?? [];
    if (!ids.includes(task.id)) { weeks[monday] = [...ids, task.id]; addedRows.push([monday, task.id]); }
  }
  return {
    ...data,
    tasks: [...data.tasks, ...created],
    entries: [...data.entries, ...entries],
    weeks,
    lastImport: { id, at: now.toISOString(), fileName, entryIds: entries.map((e) => e.id), createdTaskIds: created.map((t) => t.id), addedRows },
  };
}

/**
 * Undo import: removes exactly that batch's entries. Tasks it created go too, unless they got time
 * in the app since (then they stay with that time). Week rows it added go if the task has no time
 * left in that week. Time tracked in the app is never touched.
 */
export function undoImport(data: AppData): AppData {
  const batch = data.lastImport;
  if (!batch) return data;
  const entries = data.entries.filter((e) => e.importId !== batch.id);
  const hasTime = (taskId: string) => entries.some((e) => e.taskId === taskId) || data.timer?.taskId === taskId;
  const dropTasks = new Set(batch.createdTaskIds.filter((t) => !hasTime(t)));
  const weeks: AppData['weeks'] = {};
  const added = new Set((batch.addedRows ?? []).map(([w, t]) => `${w}|${t}`));
  for (const [monday, ids] of Object.entries(data.weeks)) {
    const end = new Date(monday + 'T12:00'); end.setDate(end.getDate() + 6);
    const inWeek = (t: string) => entries.some((e) => e.taskId === t && e.date >= monday && e.date <= toISODate(end));
    weeks[monday] = ids.filter((t) => !dropTasks.has(t) && !(added.has(`${monday}|${t}`) && !inWeek(t) && data.timer?.taskId !== t));
  }
  return { ...data, entries, tasks: data.tasks.filter((t) => !dropTasks.has(t.id)), weeks, lastImport: null };
}

/* ── Review choices (Figma Review import): similar names merged, rows adding to a day that has time ── */

const STOP = new Set(['my', 'a', 'an', 'the', 'for', 'of', 'to', 'and', 'мій', 'моя', 'моє', 'мої', 'для', 'та', 'і', 'й']);

/** Words of a name: "Dayly app_Redesign" → dayly, app, redesign; "My dailyApp" → daily, app */
export function nameWords(name: string): string[] {
  return name
    .replace(/([\p{Ll}])(\p{Lu})/gu, '$1 $2')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !STOP.has(w));
}

function closeEnough(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  // one typo: a single insert, delete or swap of letters
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  return long.slice(i + 1) === short.slice(i);
}

/**
 * Similar = every word of the shorter name is in the longer one (allowing one typo per word):
 * "Job" ~ "Looking for a job", "My Daily app" ~ "Dayly app_Redesign". Not every guess is right —
 * that's what "Keep separate" is for.
 */
export function similarNames(a: string, b: string): boolean {
  const compact = (n: string) => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  if (compact(a) && compact(a) === compact(b)) return true; // "My dailyApp" ~ "mydaily app"
  const [x, y] = [nameWords(a), nameWords(b)];
  if (!x.length || !y.length) return false;
  const [small, large] = x.length <= y.length ? [x, y] : [y, x];
  if (small.length === 1 && small[0].length < 3) return false;
  return small.every((w) => large.some((v) => closeEnough(w, v)));
}

export type MergeGroup = {
  id: string;
  /** Names in the file that become `target` */
  names: string[];
  target: string;
  /** Rows of the file that change name */
  rows: number;
};

/**
 * Groups of similar names. The target is the existing task when the group has one (time goes where it
 * already is), otherwise the name used in most rows. Two existing tasks are never merged with each other.
 */
export function findMerges(rows: ImportRow[], data: AppData): MergeGroup[] {
  const count = new Map<string, number>();
  const shown = new Map<string, string>();
  for (const r of rows) {
    count.set(key(r.task), (count.get(key(r.task)) ?? 0) + 1);
    if (!shown.has(key(r.task))) shown.set(key(r.task), r.task);
  }
  const existing = new Map(data.tasks.map((t) => [key(t.name), t.name]));
  const keys = [...new Set([...count.keys(), ...existing.keys()])];
  const parent = new Map(keys.map((k) => [k, k]));
  const root = (k: string): string => (parent.get(k) === k ? k : root(parent.get(k)!));
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const [a, b] = [keys[i], keys[j]];
      if (existing.has(a) && existing.has(b)) continue;
      if (!count.has(a) && !count.has(b)) continue;
      const name = (k: string) => shown.get(k) ?? existing.get(k)!;
      if (similarNames(name(a), name(b))) parent.set(root(a), root(b));
    }
  const groups = new Map<string, string[]>();
  for (const k of keys) groups.set(root(k), [...(groups.get(root(k)) ?? []), k]);
  const out: MergeGroup[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const old = members.filter((k) => existing.has(k));
    if (old.length > 1) continue; // would join two of your tasks — leave it to you
    const inFile = members.filter((k) => count.has(k));
    const targetKey = old[0] ?? [...inFile].sort((p, q) => count.get(q)! - count.get(p)! || p.length - q.length)[0];
    const names = inFile.filter((k) => k !== targetKey);
    if (!names.length) continue;
    out.push({
      id: [targetKey, ...names].join('|'),
      names: names.map((k) => shown.get(k)!),
      target: existing.get(targetKey) ?? shown.get(targetKey)!,
      rows: names.reduce((s, k) => s + count.get(k)!, 0),
    });
  }
  return out;
}

/** The import as it will happen: merged names, skipped rows left out, the summary recounted */
export function applyChoices(a: ImportAnalysis, merges: MergeGroup[], keep: Set<string>, skip: Set<number>): ImportAnalysis {
  const rename = new Map<string, string>();
  for (const g of merges) if (!keep.has(g.id)) for (const n of g.names) rename.set(key(n), g.target);
  const rows = a.rows.filter((r) => !skip.has(r.line)).map((r) => ({ ...r, task: rename.get(key(r.task)) ?? r.task }));
  const dates = rows.map((r) => r.date).sort();
  return {
    ...a,
    rows,
    weeks: new Set(rows.map((r) => toISODate(mondayOf(new Date(r.date + 'T12:00'))))).size,
    tasks: new Set(rows.map((r) => key(r.task))).size,
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
    totalMinutes: rows.reduce((s, r) => s + r.minutes, 0),
  };
}

export type Overlap = { line: number; date: ISODate; task: string; existing: number; adding: number };

/** Rows that add time to a day where that task already has time (re-importing, or a second source) */
export function findOverlaps(rows: ImportRow[], data: AppData): Overlap[] {
  const ids = new Map(data.tasks.map((t) => [key(t.name), t]));
  const had = new Map<string, number>();
  for (const e of data.entries) had.set(`${e.taskId}|${e.date}`, (had.get(`${e.taskId}|${e.date}`) ?? 0) + e.minutes);
  const out: Overlap[] = [];
  for (const r of rows) {
    const task = ids.get(key(r.task));
    const existing = task ? had.get(`${task.id}|${r.date}`) ?? 0 : 0;
    if (task && existing > 0) out.push({ line: r.line, date: r.date, task: task.name, existing, adding: r.minutes });
  }
  return out;
}
