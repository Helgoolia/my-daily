import { useCallback, useEffect, useState } from 'react';
import { demoData } from '../data/demo';
import { load, save } from '../data/storage';
import type { AppData } from '../data/types';

/** App data + an update function that saves to localStorage. ?demo shows a sample week that is never saved. */
export function useAppData() {
  const [initial] = useState(() => {
    const { data } = load();
    // ?demo always shows the sample week (your saved data stays untouched underneath);
    // in development the sample appears only while nothing is saved yet.
    const forced = new URLSearchParams(location.search).has('demo');
    const devEmpty = import.meta.env.DEV && data.tasks.length === 0;
    if (!(forced || devEmpty)) return { data, isDemo: false };
    const demo = demoData();
    // ?demo&forgot: a timer left running 9 h — opens the Forgotten timer dialog (Flow 7) for review
    if (new URLSearchParams(location.search).has('forgot')) demo.timer = { taskId: demo.tasks[0].id, startedAt: new Date(Date.now() - (9 * 60 + 12) * 60_000).toISOString() };
    return { data: demo, isDemo: true };
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
