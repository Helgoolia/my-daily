import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from './components/Dialog';
import { Sidebar } from './components/Sidebar';
import { Toast, type ToastData } from './components/Toast';
import { WeekGrid } from './components/WeekGrid';
import {
  addTaskToWeek,
  deleteTask,
  ensureInWeek,
  hideTask,
  removeFromWeek,
  renameTask,
  setHidden,
  startTimer,
  stopTimer,
  weekMinutes,
} from './data/actions';
import type { AppData } from './data/types';
import { t, tf } from './lib/i18n';
import { allTimeTotal } from './lib/totals';
import { formatMinutes, mondayOf } from './lib/time';
import { useAppData, useNow } from './lib/useAppData';

type Confirm = { title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void };

/** Puts the task name in bold inside a dialog sentence ("{name} and all 22:30 …") */
function withName(text: string, name: string): ReactNode {
  const [before, after] = text.split('{name}');
  return after === undefined ? text : (<>{before}<strong>{name}</strong>{after}</>);
}

/** Briefly highlights a row (grid or sidebar) so the eye finds what came back or was added */
function flash(selector: string) {
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.classList.remove('is-new');
      void el.offsetWidth; // restart the animation
      el.classList.add('is-new');
    });
  });
}

export default function App() {
  const { data, update } = useAppData();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const toastId = useRef(0);
  const lang = data.settings.language;
  const nameOf = (id: string) => data.tasks.find((x) => x.id === id)?.name ?? '';

  const showToast = (message: string, onUndo?: () => void) =>
    setToast({ id: ++toastId.current, message, undoLabel: onUndo ? t(lang, 'undo') : undefined, onUndo });

  /** Applies a change and offers Undo: restores the data from before it, keeping settings changed since. */
  const withUndo = (taskId: string, next: (d: AppData) => AppData, message: string) => {
    const before = data;
    update(next);
    showToast(message, () => {
      update((d) => ({ ...before, settings: d.settings }));
      flash(`[data-row="${taskId}"], [data-task="${taskId}"]`);
    });
  };

  const removeNow = (id: string) =>
    withUndo(id, (d) => removeFromWeek(d, id, now), tf(lang, 'toastRemoved', { name: nameOf(id) }));
  const deleteNow = (id: string) =>
    withUndo(id, (d) => deleteTask(d, id), tf(lang, 'toastDeleted', { name: nameOf(id) }));

  const onRemoveFromWeek = (id: string) => {
    const minutes = weekMinutes(data, id, now);
    const running = data.timer?.taskId === id;
    // Nothing to lose → no question, just Undo
    if (minutes <= 0 && !running) return removeNow(id);
    const time = formatMinutes(minutes + (running ? runningMinutes : 0));
    setConfirm({
      title: t(lang, 'removeTitle'),
      body: withName(tf(lang, running ? 'removeBodyRunning' : 'removeBody', { time }), nameOf(id)),
      confirmLabel: t(lang, 'remove'),
      onConfirm: () => removeNow(id),
    });
  };

  const onDelete = (id: string) => {
    const minutes = allTimeTotal(data.entries, id);
    const running = data.timer?.taskId === id;
    if (minutes <= 0 && !running) return deleteNow(id);
    const time = formatMinutes(minutes + (running ? runningMinutes : 0));
    setConfirm({
      title: t(lang, 'deleteTitle'),
      body: withName(tf(lang, running ? 'deleteBodyRunning' : 'deleteBody', { time }), nameOf(id)),
      confirmLabel: t(lang, 'delete'),
      onConfirm: () => deleteNow(id),
    });
  };

  const onRename = (id: string, name: string): string | null => {
    const result = renameTask(data, id, name);
    if (result.ok) {
      update(() => result.data);
      return null;
    }
    return result.reason === 'exists' ? tf(lang, 'nameExists', { name: result.existingName ?? name.trim() }) : null;
  };
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
          onAddToWeek={(id) => {
            update((d) => ensureInWeek(d, id, now));
            showToast(tf(lang, 'toastAdded', { name: nameOf(id) }));
            flash(`[data-row="${id}"]`);
          }}
          onUnhide={(id) => {
            withUndo(id, (d) => setHidden(d, id, false), tf(lang, 'toastRestored', { name: nameOf(id) }));
            flash(`[data-task="${id}"]`);
          }}
          onHide={(id) => withUndo(id, (d) => hideTask(d, id, now), tf(lang, 'toastHidden', { name: nameOf(id) }))}
          onDelete={onDelete}
          onRename={onRename}
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
          onAddTask={(name) => {
            // Compute once from current data so the id is known right away (for focus).
            const result = addTaskToWeek(data, name, now);
            update(() => result.data);
            return result.taskId;
          }}
          onExpandSidebar={collapsed ? () => setSettings({ sidebarCollapsed: false }) : undefined}
          onRename={onRename}
          onRemoveFromWeek={onRemoveFromWeek}
        />
      </main>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={t(lang, 'cancel')}
          onConfirm={() => {
            setConfirm(null);
            confirm.onConfirm();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
