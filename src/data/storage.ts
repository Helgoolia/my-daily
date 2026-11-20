import { emptyData, type AppData } from './types';

const KEY = 'mydaily';

export type LoadResult = { data: AppData; error: string | null };

/** Reads saved data. Never throws: broken or unknown data is kept aside, not overwritten. */
export function load(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { data: emptyData(), error: 'storage-unavailable' };
  }
  if (!raw) return { data: emptyData(), error: null };
  try {
    const parsed = JSON.parse(raw) as { version?: number };
    if (parsed.version === 1) return { data: parsed as AppData, error: null };
    // A newer or unknown version: keep a copy so nothing is lost, start clean.
    backup(raw);
    return { data: emptyData(), error: 'unknown-version' };
  } catch {
    backup(raw);
    return { data: emptyData(), error: 'corrupted' };
  }
}

/** Saves data. Returns false if the browser refused (full or blocked storage). */
export function save(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function backup(raw: string) {
  try {
    localStorage.setItem(`${KEY}-backup-${Date.now()}`, raw);
  } catch {
    /* nothing else we can do */
  }
}
