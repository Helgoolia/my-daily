import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { WeekGrid } from './components/WeekGrid';
import { addTaskToWeek, ensureInWeek, setHidden, startTimer, stopTimer } from './data/actions';
import { formatMinutes, mondayOf } from './lib/time';
import { useAppData, useNow } from './lib/useAppData';

export default function App() {
  const { data, update } = useAppData();
  const now = useNow(data.timer ? 1000 : 60_000);
  const collapsed = data.settings.sidebarCollapsed === true;
  const setSettings = (patch: Partial<typeof data.settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  // Theme: "system" follows the OS; otherwise force light/dark on <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = data.settings.theme;
    root.lang = data.settings.language;
  }, [data.settings.theme, data.settings.language]);

  // Tab: idle "My Daily" + grey icon; running "1:25 · Site Portfolio" + brand icon (updates once a minute).
  const runningTask = data.timer ? data.tasks.find((t) => t.id === data.timer!.taskId) : undefined;
  const runningMinutes = data.timer ? (now.getTime() - new Date(data.timer.startedAt).getTime()) / 60_000 : 0;
  const title = runningTask ? `${formatMinutes(runningMinutes)} · ${runningTask.name}` : 'My Daily';
  useEffect(() => {
    document.title = title;
    const icon = document.getElementById('favicon') as HTMLLinkElement | null;
    if (icon) icon.href = runningTask ? '/favicon-running.svg' : '/favicon.svg';
  }, [title, runningTask]);

  return (
    <div className="layout">
      {/* Kept mounted so collapse/expand can animate; inert removes it from tab order while hidden */}
      <div className={`sidebar-wrap ${collapsed ? 'is-collapsed' : ''}`} inert={collapsed}>
        <Sidebar
          data={data}
          now={now}
          onCollapse={() => setSettings({ sidebarCollapsed: true })}
          onAddToWeek={(id) => update((d) => ensureInWeek(d, id, now))}
          onUnhide={(id) => update((d) => setHidden(d, id, false))}
          onSettings={setSettings}
        />
      </div>
      <main className="app">
        <WeekGrid
          data={data}
          monday={mondayOf(now)}
          now={now}
          onStart={(id) => update((d) => startTimer(d, id))}
          onStop={() => update((d) => stopTimer(d))}
          onAddTask={(name) => update((d) => addTaskToWeek(d, name).data)}
          onExpandSidebar={collapsed ? () => setSettings({ sidebarCollapsed: false }) : undefined}
        />
      </main>
    </div>
  );
}
