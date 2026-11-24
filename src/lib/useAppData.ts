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
    const params = new URLSearchParams(location.search);
    // Review links: &theme=light|dark and &lang=uk|en set the sample's look (never saved)
    const theme = params.get('theme');
    if (theme === 'light' || theme === 'dark') demo.settings.theme = theme;
    const lang = params.get('lang');
    if (lang === 'uk' || lang === 'ua' || lang === 'en') demo.settings.language = lang === 'en' ? 'en' : 'uk';
    if (params.has('forgot')) demo.timer = { taskId: demo.tasks[0].id, startedAt: new Date(Date.now() - (9 * 60 + 12) * 60_000).toISOString() };
    return { data: demo, isDemo: true };
  });
  const isDemo = initial.isDemo;
  const [data, setData] = useState<AppData>(initial.data);
  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  // A full or blocked localStorage: the app keeps working in memory and says so (App shows a sticky toast)
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    // syncing with an external system (localStorage) is what effects are for
    // eslint-disable-next-line react/set-state-in-effect
    if (!isDemo) setSaveFailed(!save(data));
  }, [data, isDemo]);

  return { data, update, isDemo, saveFailed };
}

/** Live media query, e.g. useMedia('(max-width: 1279px)') */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
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
