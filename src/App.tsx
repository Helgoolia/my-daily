import { useEffect, useState } from 'react';
import { WeekGrid } from './components/WeekGrid';
import { demoData } from './data/demo';
import { load } from './data/storage';
import type { AppData } from './data/types';
import { mondayOf } from './lib/time';

function initialData(): AppData {
  const { data } = load();
  // Sample week (never saved): in development, or on any build with ?demo in the address —
  // handy for reviewing Vercel previews before real tracking exists.
  const wantsDemo = import.meta.env.DEV || new URLSearchParams(location.search).has('demo');
  if (wantsDemo && data.tasks.length === 0) return demoData();
  return data;
}

export default function App() {
  const [data] = useState<AppData>(initialData);
  const [today, setToday] = useState(() => new Date());

  // Keep "today" right if the tab stays open past midnight.
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Theme: "system" follows the OS; otherwise force light/dark on <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = data.settings.theme;
    root.lang = data.settings.language;
  }, [data.settings.theme, data.settings.language]);

  return (
    <main className="app">
      <WeekGrid data={data} monday={mondayOf(today)} today={today} />
    </main>
  );
}
