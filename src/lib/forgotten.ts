/**
 * Forgotten timer (Figma Flow 7): the timer ran 4+ hours → on return to the tab a dialog asks.
 * "Stop at…" picks when the person really stopped: any minute from the session start to now.
 */
export const FORGOTTEN_AFTER_MIN = 4 * 60;
const STEP = 15;

/** 09:48 — 24-hour clock, as in Figma */
export const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const atMinute = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());

/** Picker list: 15-minute steps inside the session, newest first (14:00, 13:45 …) */
export function stopOptions(start: Date, now: Date): Date[] {
  const out: Date[] = [];
  const t = atMinute(now);
  t.setMinutes(Math.floor(t.getMinutes() / STEP) * STEP);
  for (; t > start; t.setMinutes(t.getMinutes() - STEP)) out.push(new Date(t));
  return out;
}

/**
 * Typed time → the moment it means: the latest such clock time not after now (a session that ran past
 * midnight reads "01:00" as tonight). null when it can't be read, or falls before the start.
 * Accepts 13:30, 1330, 930, 13.
 */
export function resolveStop(text: string, start: Date, now: Date): Date | null {
  const s = text.trim().replace(/[.\s]/g, ':');
  let m = s.match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) m = s.match(/^(\d{1,2})()$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (h > 23 || min > 59) return null;
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min);
  if (at > now) at.setDate(at.getDate() - 1);
  return at >= atMinute(start) && at > start ? at : null;
}

/**
 * Suggested stop: when the tab was last left (the person likely stopped working then), on the
 * nearest 15-minute step inside the session; with nothing known, the latest step.
 */
export function suggestStop(start: Date, now: Date, lastSeen: Date | null): Date {
  const options = stopOptions(start, now);
  if (options.length === 0) return atMinute(now);
  if (!lastSeen || lastSeen <= start || lastSeen >= now) return options[0];
  return options.reduce((best, o) => (Math.abs(o.getTime() - lastSeen.getTime()) < Math.abs(best.getTime() - lastSeen.getTime()) ? o : best));
}

/** "today" / "yesterday" / a date — for "started … at 09:48" */
export function dayWord(start: Date, now: Date): 'today' | 'yesterday' | 'date' {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(now) - day(start)) / 86_400_000);
  return diff === 0 ? 'today' : diff === 1 ? 'yesterday' : 'date';
}
