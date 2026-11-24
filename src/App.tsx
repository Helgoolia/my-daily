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
  setDayMinutes,
  renameTask,
  setHidden,
  startTimer,
  stopTimer,
  weekMinutes,
} from './data/actions';
import type { AppData } from './data/types';
import { t, tf, weekdayShort } from './lib/i18n';
import { allTimeTotal } from './lib/totals';
import { download, exportCsv, exportFileName } from './lib/csv';
import { formatMinutes, fromISODate, mondayOf, toISODate } from './lib/time';
import { useAppData, useNow } from './lib/useAppData';

type Confirm = { kind: 'remove' | 'delete'; taskId: string };

/**
 * Dialog sentence with the two facts in bold: the task name (with its colon) and the time that
 * will be lost — "**Site Portfolio:** **2:15** for this week will be deleted…"
 */
function withFacts(text: string, name: string, time: string): ReactNode {
  return text.split(/(\{name\}:?|\{time\})/).map((part, i) =>
    part.startsWith('{name}') ? <strong key={i}>{name}{part.slice(6)}</strong>
    : part === '{time}' ? <strong key={i} className="t-numeric-inline">{time}</strong>
    : part,
  );
}

/** Briefly highlights a row (grid or sidebar) so the eye finds what came back or was added */
function flash(selector: string) {
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      el.classList.remove('is-new');
      void el.offsetWidth; // restart the animation
      el.classList.add('is-new');
      // Drop the class when done, or the flash replays whenever the row moves (e.g. on re-sort)
      el.addEventListener('animationend', () => el.classList.remove('is-new'), { once: true });
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
  const showSticky = (message: string) => setToast({ id: ++toastId.current, message, sticky: true, closeLabel: t(lang, 'close') });

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
    // Nothing to lose → no question, just Undo
    if (weekMinutes(data, id, now) <= 0 && data.timer?.taskId !== id) return removeNow(id);
    setConfirm({ kind: 'remove', taskId: id });
  };

  const onDelete = (id: string) => {
    if (allTimeTotal(data.entries, id) <= 0 && data.timer?.taskId !== id) return deleteNow(id);
    setConfirm({ kind: 'delete', taskId: id });
  };

  /** Name taken by another task (case-insensitive) → error text, else null. Checked while typing. */
  const nameError = (id: string, name: string): string | null => {
    const clash = data.tasks.find((x) => x.id !== id && x.name.trim().toLowerCase() === name.trim().toLowerCase());
    return clash ? tf(lang, 'nameExists', { name: clash.name }) : null;
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
  // A day holds at most 24:00. If typed time plus the running timer reach it, the timer stops right at
  // the limit (it can't have run longer than the day has room for) and says why.
  useEffect(() => {
    const timer = data.timer;
    if (!timer) return;
    const started = new Date(timer.startedAt);
    const date = toISODate(started);
    const typed = data.entries.reduce((s, e) => (e.date === date ? s + e.minutes : s), 0);
    const room = 24 * 60 - typed;
    if ((now.getTime() - started.getTime()) / 60_000 < room) return;
    update((d) => stopTimer(d, new Date(started.getTime() + Math.max(0, room) * 60_000)));
    showSticky(t(lang, 'toastDayFull'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);
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
          onExport={() => {
            const file = exportFileName(now);
            download(file, exportCsv(data, now));
            showToast(tf(lang, 'toastExported', { file }));
          }}
          onRename={onRename}
          nameError={nameError}
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
          onPickTask={(id) => {
            const task = data.tasks.find((x) => x.id === id);
            const inWeek = (data.weeks[toISODate(mondayOf(now))] ?? []).includes(id);
            // Already here and visible: just show where it is
            if (task && inWeek && !task.hidden) return flash(`[data-row="${id}"]`);
            withUndo(id, (d) => ensureInWeek(setHidden(d, id, false), id, now), tf(lang, 'toastAdded', { name: nameOf(id) }));
            flash(`[data-row="${id}"], [data-task="${id}"]`);
          }}
          onExpandSidebar={collapsed ? () => setSettings({ sidebarCollapsed: false }) : undefined}
          onRename={onRename}
          nameError={nameError}
          onRemoveFromWeek={onRemoveFromWeek}
          onSetTime={(id, date, minutes) => {
            const had = data.entries.some((e) => e.taskId === id && e.date === date && e.minutes > 0);
            // Clearing a cell deletes time → Undo (rule: every remove/delete has Undo)
            if (minutes <= 0 && had) {
              const day = fromISODate(date);
              withUndo(id, (d) => setDayMinutes(d, id, date, 0), tf(lang, 'toastCleared', { name: nameOf(id), day: `${weekdayShort(lang, day)} ${day.getDate()}` }));
            } else update((d) => setDayMinutes(d, id, date, minutes));
          }}
        />
      </main>
      {confirm && (() => {
        // Built on every render so the time stays live while the timer runs, and matches the grid
        const { kind, taskId } = confirm;
        const running = data.timer?.taskId === taskId;
        const base = kind === 'remove' ? weekMinutes(data, taskId, now) : allTimeTotal(data.entries, taskId);
        const time = formatMinutes(base + (running ? runningMinutes : 0));
        const key = kind === 'remove' ? (running ? 'removeBodyRunning' : 'removeBody') : (running ? 'deleteBodyRunning' : 'deleteBody');
        return (
        <ConfirmDialog
          title={t(lang, kind === 'remove' ? 'removeTitle' : 'deleteTitle')}
          body={withFacts(t(lang, key), nameOf(taskId), time)}
          confirmLabel={t(lang, kind === 'remove' ? 'remove' : 'delete')}
          cancelLabel={t(lang, 'cancel')}
          onConfirm={() => {
            setConfirm(null);
            if (kind === 'remove') removeNow(taskId);
            else deleteNow(taskId);
          }}
          onCancel={() => setConfirm(null)}
        />
        );
      })()}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
