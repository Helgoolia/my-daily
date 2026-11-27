import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from './components/Dialog';
import { Sidebar } from './components/Sidebar';
import { Toast, type ToastData } from './components/Toast';
import { WeekGrid } from './components/WeekGrid';
import {
  addTaskToWeek,
  deleteTask,
  ensureInWeek,
  startWeek,
  timerInWeek,
  hideTask,
  removeFromWeek,
  setDayMinutes,
  renameTask,
  setHidden,
  startTimer,
  stopTimer,
  weekMinutes,
  weekRows,
} from './data/actions';
import type { AppData } from './data/types';
import { plural, t, tf, weekRange, weekdayShort } from './lib/i18n';
import { applyImport, undoImport } from './lib/importCsv';
import { ImportDialog } from './components/ImportDialog';
import { ForgottenTimer } from './components/ForgottenTimer';
import { FORGOTTEN_AFTER_MIN, clock } from './lib/forgotten';
import { allTimeTotal, minutesFor } from './lib/totals';
import { download, exportCsv, exportFileName } from './lib/csv';
import { addDays, formatMinutes, fromISODate, mondayOf, toISODate } from './lib/time';
import { useAppData, useMedia, useNow } from './lib/useAppData';
import { recording } from './lib/clarity';
import { LogoMark } from './components/Logo';

const LAST_SEEN_KEY = 'mydaily-last-seen';
const KEPT_KEY = 'mydaily-kept-session';
function readLastSeen(): Date | null {
  try {
    const v = localStorage.getItem(LAST_SEEN_KEY);
    return v ? new Date(v) : null;
  } catch { return null; }
}
const keptSession = () => { try { return sessionStorage.getItem(KEPT_KEY); } catch { return null; } };
const keepSession = (startedAt: string) => { try { sessionStorage.setItem(KEPT_KEY, startedAt); } catch { /* ignore */ } };

type Confirm = { kind: 'remove' | 'delete'; taskId: string; day: Date };

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
  const { data, update, saveFailed } = useAppData();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [importing, setImporting] = useState(false);
  const [undoImportOpen, setUndoImportOpen] = useState(false);
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

  const removeNow = (id: string, day: Date) =>
    withUndo(id, (d) => removeFromWeek(d, id, day), msg('toastRemoved', nameOf(id)));
  const deleteNow = (id: string) =>
    withUndo(id, (d) => deleteTask(d, id), tf(lang, 'toastDeleted', { name: nameOf(id) }));

  const onRemoveFromWeek = (id: string) => {
    // Nothing to lose → no question, just Undo
    const day = shownMonday;
    if (weekMinutes(data, id, day) <= 0 && !timerInWeek(data, id, day)) return removeNow(id, day);
    setConfirm({ kind: 'remove', taskId: id, day });
  };

  const onDelete = (id: string) => {
    if (allTimeTotal(data.entries, id) <= 0 && data.timer?.taskId !== id) return deleteNow(id);
    setConfirm({ kind: 'delete', taskId: id, day: now });
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
  // Week on screen: null = this week (follows the clock, so Monday opens the new week by itself)
  const [viewWeek, setViewWeek] = useState<string | null>(null);
  const thisMonday = mondayOf(now);
  const shownMonday = viewWeek && viewWeek < toISODate(thisMonday) ? fromISODate(viewWeek) : thisMonday;
  const isCurrent = toISODate(shownMonday) === toISODate(thisMonday);
  // New week (Flow 12): on the first visit of a week, last week's tasks with time become its rows
  const thisKey = toISODate(thisMonday);
  const weekStarted = data.weeks[thisKey] !== undefined;
  useEffect(() => {
    if (!weekStarted) update((d) => startWeek(d, fromISODate(thisKey)));
  }, [thisKey, weekStarted, update]);
  const goToWeek = (monday: Date) => setViewWeek(toISODate(monday) < toISODate(thisMonday) ? toISODate(monday) : null);
  // "this week" in messages becomes the dates of the week on screen
  const weekLabel = weekRange(lang, shownMonday, addDays(shownMonday, 6), now);
  const msg = (key: 'toastRemoved' | 'toastAdded', name: string) =>
    isCurrent ? tf(lang, key, { name }) : tf(lang, key === 'toastRemoved' ? 'toastRemovedPast' : 'toastAddedPast', { name, week: weekLabel });
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
  // Forgotten timer (Flow 7): 4+ hours running → ask when the person comes back to the tab (or opens
  // the app). Not while they are here and working. "Keep all" isn't asked again for that session.
  const [forgotten, setForgotten] = useState(false);
  const lastSeen = useRef<Date | null>(readLastSeen());
  useEffect(() => {
    const check = () => {
      const timer = data.timer;
      if (!timer || document.visibilityState !== 'visible') return;
      const minutes = (Date.now() - new Date(timer.startedAt).getTime()) / 60_000;
      if (minutes >= FORGOTTEN_AFTER_MIN && keptSession() !== timer.startedAt) setForgotten(true);
    };
    const leave = () => {
      if (document.visibilityState === 'hidden') {
        lastSeen.current = new Date();
        try { localStorage.setItem(LAST_SEEN_KEY, lastSeen.current.toISOString()); } catch { /* storage off: in memory only */ }
      } else check();
    };
    check();
    document.addEventListener('visibilitychange', leave);
    window.addEventListener('focus', check);
    return () => { document.removeEventListener('visibilitychange', leave); window.removeEventListener('focus', check); };
  }, [data.timer]);
  // Widths (Figma 5 · Narrow windows): below 1280 the sidebar collapses by itself and opens over the grid;
  // the saved preference (sidebarCollapsed) is only for wide windows. Below 768: a stub.
  const narrow = useMedia('(max-width: 1279px)');
  const tooNarrow = useMedia('(max-width: 767px)');
  const [overlayOpen, setOverlayOpen] = useState(false);
  const collapsed = narrow ? !overlayOpen : data.settings.sidebarCollapsed === true;
  const sidebarWrap = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!narrow) setOverlayOpen(false); }, [narrow]);
  // The floating sidebar closes on a click outside it and on Esc (not while a dialog or menu has it)
  useEffect(() => {
    if (!narrow || !overlayOpen) return;
    const outside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sidebarWrap.current?.contains(target) || (target as Element).closest?.('.menu, [role=dialog], [role=alertdialog], .toast')) return;
      setOverlayOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role=dialog], [role=alertdialog], .menu')) return;
      setOverlayOpen(false);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
  }, [narrow, overlayOpen]);
  // Storage refused a save: say it once, sticky (the app did it, not the person)
  useEffect(() => {
    if (saveFailed) showSticky(t(lang, 'saveFailed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveFailed]);
  const setSettings = (patch: Partial<typeof data.settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  // Theme: "system" follows the OS; otherwise force light/dark on <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = data.settings.theme;
    root.lang = data.settings.language;
  }, [data.settings.theme, data.settings.language]);

  // Tab: idle "My Daily" + grey icon; running "2:15 · Site Portfolio" + brand icon (updates once a minute).
  // The time is the running cell's value (the task's time on the session's day), the same number as in the grid:
  // a session-only time appears nowhere in the UI and reads as a mistake.
  const runningTask = data.timer ? data.tasks.find((t) => t.id === data.timer!.taskId) : undefined;
  const runningMinutes = data.timer ? (now.getTime() - new Date(data.timer.startedAt).getTime()) / 60_000 : 0;
  const runningCellMinutes = data.timer
    ? minutesFor(data.entries, data.timer.taskId, toISODate(new Date(data.timer.startedAt))) + runningMinutes
    : 0;
  // While Clarity records (tests only) the name stays out: it records <title> text unmasked
  const title = runningTask ? `${formatMinutes(runningCellMinutes)} · ${recording ? 'My Daily' : runningTask.name}` : 'My Daily';
  useEffect(() => {
    document.title = title;
    const icon = document.getElementById('favicon') as HTMLLinkElement | null;
    if (icon) icon.href = runningTask ? '/favicon-running.svg' : '/favicon.svg';
  }, [title, runningTask]);

  // < 768: an honest stub instead of a squeezed grid; a running timer keeps counting (tab title too)
  if (tooNarrow) {
    return (
      <main className="too-narrow">
        <LogoMark />
        <h1 className="t-body-m-medium">{t(lang, 'tooNarrowTitle')}</h1>
        <p className="t-body-s">{t(lang, 'tooNarrowBody')}</p>
      </main>
    );
  }

  return (
    <div className="layout">
      {/* Kept mounted so collapse/expand can animate; inert removes it from tab order while hidden */}
      <div ref={sidebarWrap} className={`sidebar-wrap ${collapsed ? 'is-collapsed' : ''} ${narrow ? 'is-overlay' : ''}`} inert={collapsed}>
        <Sidebar
          data={data}
          now={now}
          onCollapse={() => (narrow ? setOverlayOpen(false) : setSettings({ sidebarCollapsed: true }))}
          onHome={() => { setViewWeek(null); setOverlayOpen(false); }}
          onAddToWeek={(id) => {
            setOverlayOpen(false); // picking a task closes the floating sidebar
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
          onImport={() => setImporting(true)}
          onUndoImport={() => setUndoImportOpen(true)}
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
          monday={shownMonday}
          now={now}
          isCurrent={isCurrent}
          onPrevWeek={() => goToWeek(addDays(shownMonday, -7))}
          onNextWeek={() => goToWeek(addDays(shownMonday, 7))}
          onThisWeek={() => setViewWeek(null)}
          onShareDownloaded={(file) => showToast(tf(lang, 'toastImageDownloaded', { file }))}
          onShareLinkCopied={(url) =>
            setToast({
              id: ++toastId.current,
              message: tf(lang, 'toastLinkCopied', { week: weekLabel }),
              actionLabel: t(lang, 'open'),
              onAction: () => window.open(url, '_blank', 'noopener'),
            })
          }
          onStart={(id) => update((d) => startTimer(d, id))}
          onStop={() => update((d) => stopTimer(d))}
          onAddTask={(name) => {
            // Compute once from current data so the id is known right away (for focus).
            const result = addTaskToWeek(data, name, now, shownMonday);
            update(() => result.data);
            return result.taskId;
          }}
          onPickTask={(id) => {
            const task = data.tasks.find((x) => x.id === id);
            const inWeek = weekRows(data, shownMonday).includes(id);
            // Already here and visible: just show where it is
            if (task && inWeek && !task.hidden) return flash(`[data-row="${id}"]`);
            withUndo(id, (d) => ensureInWeek(setHidden(d, id, false), id, shownMonday), msg('toastAdded', nameOf(id)));
            flash(`[data-row="${id}"], [data-task="${id}"]`);
          }}
          onExpandSidebar={collapsed ? () => (narrow ? setOverlayOpen(true) : setSettings({ sidebarCollapsed: false })) : undefined}
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
        const { kind, taskId, day } = confirm;
        const running = kind === 'remove' ? timerInWeek(data, taskId, day) : data.timer?.taskId === taskId;
        const base = kind === 'remove' ? weekMinutes(data, taskId, day) : allTimeTotal(data.entries, taskId);
        const time = formatMinutes(base + (running ? runningMinutes : 0));
        // A past week: "that week" + its dates instead of "this week"
        const past = kind === 'remove' && toISODate(mondayOf(day)) !== toISODate(thisMonday);
        const key = kind === 'remove' ? (past ? 'removeBodyPast' : running ? 'removeBodyRunning' : 'removeBody') : (running ? 'deleteBodyRunning' : 'deleteBody');
        return (
        <ConfirmDialog
          title={past ? tf(lang, 'removeTitlePast', { week: weekRange(lang, mondayOf(day), addDays(mondayOf(day), 6), now) }) : t(lang, kind === 'remove' ? 'removeTitle' : 'deleteTitle')}
          body={withFacts(t(lang, key), nameOf(taskId), time)}
          confirmLabel={t(lang, kind === 'remove' ? 'remove' : 'delete')}
          cancelLabel={t(lang, 'cancel')}
          onConfirm={() => {
            setConfirm(null);
            if (kind === 'remove') removeNow(taskId, day);
            else deleteNow(taskId);
          }}
          onCancel={() => setConfirm(null)}
        />
        );
      })()}
      {importing && (
        <ImportDialog
          lang={lang}
          data={data}
          now={now}
          onCancel={() => setImporting(false)}
          onImport={(analysis, fileName) => {
            setImporting(false);
            const before = data;
            update((d) => applyImport(d, analysis, fileName, now));
            showToast(tf(lang, 'toastImported', { entries: plural(lang, analysis.rows.length, 'entry'), weeks: plural(lang, analysis.weeks, 'week') }), () =>
              update((d) => ({ ...before, settings: d.settings })),
            );
          }}
        />
      )}
      {undoImportOpen && data.lastImport && (
        <ConfirmDialog
          title={t(lang, 'undoImportTitle')}
          body={tf(lang, 'undoImportBody', { entries: plural(lang, data.lastImport.entryIds.length, 'entry'), file: data.lastImport.fileName ?? 'CSV' })}
          confirmLabel={t(lang, 'removeEntries')}
          cancelLabel={t(lang, 'cancel')}
          onCancel={() => setUndoImportOpen(false)}
          onConfirm={() => {
            setUndoImportOpen(false);
            const before = data;
            const n = data.lastImport?.entryIds.length ?? 0;
            update((d) => undoImport(d));
            showToast(tf(lang, 'toastImportUndone', { entries: plural(lang, n, 'entry') }), () => update((d) => ({ ...before, settings: d.settings })));
          }}
        />
      )}
      {forgotten && data.timer && (
        <ForgottenTimer
          lang={lang}
          taskName={nameOf(data.timer.taskId)}
          startedAt={new Date(data.timer.startedAt)}
          now={now}
          lastSeen={lastSeen.current}
          onKeep={() => {
            keepSession(data.timer!.startedAt);
            setForgotten(false);
          }}
          onStopAt={(at) => {
            setForgotten(false);
            keepSession(data.timer!.startedAt); // Undo brings the timer back without asking again
            withUndo(data.timer!.taskId, (d) => stopTimer(d, at), tf(lang, 'toastStoppedAt', { time: clock(at) }));
          }}
          onDiscard={() => {
            setForgotten(false);
            keepSession(data.timer!.startedAt);
            const id = data.timer!.taskId;
            withUndo(id, (d) => ({ ...d, timer: null }), tf(lang, 'toastDiscarded', { name: nameOf(id) }));
          }}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
