import { useCallback, useEffect, useState } from 'react';
import { demoData } from '../data/demo';
import { load, save } from '../data/storage';
import type { AppData } from '../data/types';

/** App data + an update function that saves to localStorage. ?demo shows a sample week that is never saved. */
export function useAppData() {
  const [initial] = useState(() => {
    const { data } = load();
    const wantsDemo = import.meta.env.DEV || new URLSearchParams(location.search).has('demo');
    return wantsDemo && data.tasks.length === 0 ? { data: demoData(), isDemo: true } : { data, isDemo: false };
  });
  const isDemo = initial.isDemo;
  const [data, setData] = useState<AppData>(initial.data);
  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  useEffect(() => {
    // TODO(toasts PR): show an error toast when save() returns false (full or blocked storage).
    if (!isDemo) save(data);
  }, [data, isDemo]);

  return { data, update, isDemo };
}

/** Current time, re-rendered every `ms` (1 s while a timer runs, 1 min otherwise). */
export function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
