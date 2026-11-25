import { IconArrowBarRight, IconCalendarMinus, IconChevronLeft, IconChevronRight, IconPencil } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../data/types';
import { monthName, t, weekRange, weekdayShort } from '../lib/i18n';
import { addDays, formatMinutes, toISODate, weekDays, weekOfMonth } from '../lib/time';
import { dayTotal, minutesFor, taskTotalInRange } from '../lib/totals';
import { suggestions } from '../lib/taskInfo';
import { weekRows } from '../data/actions';
import { AddTask } from './AddTask';
import { MoreMenu } from './MoreMenu';
import { RenameInput } from './RenameInput';
import { TimeCell } from './TimeCell';
import { SharePopover } from './SharePopover';
import { useMedia } from '../lib/useAppData';
import { Tooltip } from './Tooltip';
import { MASK } from '../lib/clarity';
import './WeekGrid.css';

type Props = {
  data: AppData;
  monday: Date;
  now: Date;
  onStart: (taskId: string) => void;
  onStop: () => void;
  /** Returns the id of the created (or re-used) task, so focus can move to its ▶ */
  onAddTask: (name: string) => string | null;
  /** A suggestion was picked: bring that task into this week */
  onPickTask: (taskId: string) => void;
  onExpandSidebar?: () => void;
  /** Returns an error message (name taken) or null when renamed */
  onRename: (taskId: string, name: string) => string | null;
  nameError: (taskId: string, name: string) => string | null;
  onRemoveFromWeek: (taskId: string) => void;
  /** Edit a cell: that day's time for the task, in minutes (0 clears it) */
  onSetTime: (taskId: string, date: string, minutes: number) => void;
  /** Week navigation (Figma Week Title): ‹ always; › only up to this week; "This week" when away from it */
  isCurrent: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  /** PNG saved from Share */
  onShareDownloaded: (fileName: string) => void;
  onShareLinkCopied: (url: string) => void;
};

/**
 * Week grid — Figma: Design / 1 · Screens / "Week · Current (1440)".
 * Columns: Task 280 · days (fill) · Today 140 · Total 100. Row height 72.
 */
export function WeekGrid({ data, monday, now, onStart, onStop, onAddTask, onPickTask, onExpandSidebar, onRename, nameError, onRemoveFromWeek, onSetTime, isCurrent, onPrevWeek, onNextWeek, onThisWeek, onShareDownloaded, onShareLinkCopied }: Props) {
  const compact = useMedia('(max-width: 899px)');
  const [editing, setEditing] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Another week on screen: drop a rename in progress (not a remount — that replayed the header's
  // fade-in, so the sidebar button blinked on every week change)
  const [shownWeek, setShownWeek] = useState(toISODate(monday));
  if (shownWeek !== toISODate(monday)) {
    setShownWeek(toISODate(monday));
    setEditing(null);
    setMenuFor(null);
  }
  const lang = data.settings.language;
  // After adding a task the field lets go of focus and the new row flashes briefly, so the eye finds it;
  // its ▶ is one click away. (Moving focus to ▶ left a yellow ring that read as "active".)
  const flashTask = useRef<string | null>(null);
  useEffect(() => {
    if (!flashTask.current) return;
    const row = document.querySelector<HTMLElement>(`[data-row="${flashTask.current}"]`);
    flashTask.current = null;
    if (!row) return;
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    row.classList.remove('is-new');
    void row.offsetWidth; // restart the animation if the same task is added again
    row.classList.add('is-new');
    row.addEventListener('animationend', () => row.classList.remove('is-new'), { once: true });
  });
  // A sideways-scrolling grid opens with today in view (Figma 768: "on open the grid scrolls so today is in view")
  const scroller = useRef<HTMLDivElement>(null);
  const shownKey = toISODate(monday);
  useEffect(() => {
    const el = scroller.current;
    const today = el?.querySelector<HTMLElement>('[data-today]');
    if (!el || !today || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = today.offsetLeft - (el.clientWidth - today.offsetWidth) / 2;
  }, [shownKey]);
  const days = weekDays(monday);
  const dates = days.map(toISODate);
  const todayISO = toISODate(now);
  const taskIds = weekRows(data, monday);
  const tasks = taskIds.map((id) => data.tasks.find((x) => x.id === id)).filter((x) => x !== undefined);

  // The running session counts in its start day (rule: past midnight stays in the start day).
  const timer = data.timer;
  const runningSeconds = timer ? Math.max(0, Math.floor((now.getTime() - new Date(timer.startedAt).getTime()) / 1000)) : 0;
  const runningDate = timer ? toISODate(new Date(timer.startedAt)) : null;
  const liveMinutes = (taskId: string, date: string) =>
    timer && timer.taskId === taskId && runningDate === date ? runningSeconds / 60 : 0;
  const runningInWeek = timer !== null && runningDate !== null && dates.includes(runningDate) && taskIds.includes(timer.taskId);

  const cellMinutes = (taskId: string, date: string) => minutesFor(data.entries, taskId, date) + liveMinutes(taskId, date);
  const dayMinutes = (date: string) => dayTotal(data.entries, date, taskIds) + (timer && runningDate === date && taskIds.includes(timer.taskId) ? runningSeconds / 60 : 0);
  // Totals count only days up to today: future days take no time (and show none)
  const countedDates = dates.filter((d) => d <= todayISO);
  const weekTotal = countedDates.reduce((sum, d) => sum + dayMinutes(d), 0);
  // Day limit counts every task of that day (rows of this week or not) and the running timer
  const allDayMinutes = (date: string) =>
    data.entries.reduce((s, e) => (e.date === date ? s + e.minutes : s), 0) + (timer && runningDate === date ? runningSeconds / 60 : 0);

  return (
    <section className="week" aria-label={`${monthName(lang, monday)} · ${t(lang, 'week')} ${weekOfMonth(monday)}`}>
      <header className="week-header">
        <div className="week-title">
          {onExpandSidebar && (
            <Tooltip label={t(lang, 'expand')} placement="below-start">
              <button type="button" className="ghost-icon" onClick={onExpandSidebar} aria-label={t(lang, 'expandSidebar')}>
                <IconArrowBarRight size={16} />
              </button>
            </Tooltip>
          )}
          <div className="week-title-text">
          <h1 className="t-heading-l">
            {monthName(lang, monday)} · {t(lang, 'week')} {weekOfMonth(monday)}
          </h1>
          <p className="t-body-s week-range">{weekRange(lang, monday, addDays(monday, 6))}</p>
          </div>
          <nav className="week-nav" aria-label={t(lang, 'week')}>
            <Tooltip label={t(lang, 'prevWeek')} placement="below">
              <button type="button" className="icon-button" onClick={onPrevWeek} aria-label={t(lang, 'prevWeek')}>
                <IconChevronLeft size={16} />
              </button>
            </Tooltip>
            {/* No future weeks: nothing can be tracked there, so › stops at this week */}
            <Tooltip label={t(lang, 'nextWeek')} placement="below" suppressed={isCurrent}>
              <button type="button" className="icon-button" onClick={onNextWeek} disabled={isCurrent} aria-label={t(lang, 'nextWeek')}>
                <IconChevronRight size={16} />
              </button>
            </Tooltip>
            {!isCurrent && (
              <button type="button" className="button button-secondary t-body-m-medium" onClick={onThisWeek}>
                {t(lang, 'goToThisWeek')}
              </button>
            )}
          </nav>
        </div>
        <div className="week-header-right">
        <div className="week-summary">
          <span className="t-overline week-summary-label">{t(lang, 'weekTotal')}</span>
          <span className="t-numeric-l-medium">{formatMinutes(weekTotal)}</span>
          {/* Always rendered so the header height doesn't jump when a timer starts or stops */}
          <span className="t-caption week-summary-label" aria-hidden={!runningInWeek} style={{ visibility: runningInWeek ? 'visible' : 'hidden' }}>
            {t(lang, 'includingActiveTimer')}
          </span>
        </div>
        <SharePopover data={data} monday={monday} now={now} lang={lang} compact={compact} disabled={tasks.length === 0} onDownloaded={onShareDownloaded} onLinkCopied={onShareLinkCopied} />
        </div>
      </header>

      {/* 768–899: only the grid scrolls sideways (Task sticks left, Total right); the header stays */}
      <div className="grid-scroll" ref={scroller}>
      {/* Today's column is 140 px (room for time + play/stop); other days share the rest */}
      <div
        className="grid"
        role="table"
        style={{ '--cols': `var(--task-w) ${dates.map((d) => (d === todayISO ? '140px' : 'minmax(64px, 1fr)')).join(' ')} var(--total-w)` } as React.CSSProperties}
      >
        <div className="row row-head" role="row">
          <div className="cell cell-task cell-head-label t-caption" role="columnheader">{t(lang, 'task')}</div>
          {days.map((d, i) => {
            const isToday = dates[i] === todayISO;
            const isWeekend = i >= 5;
            return (
              <div
                key={dates[i]}
                data-today={isToday || undefined}
                className={`cell cell-day-head ${isToday ? 'is-today' : ''} ${isWeekend && !isToday ? 'is-weekend' : ''}`}
                role="columnheader"
              >
                <span className="t-caption day-head-weekday">{weekdayShort(lang, d)}</span>
                <span className="t-body-m">{d.getDate()}</span>
                {isToday && <span className="t-overline">{t(lang, 'today')}</span>}
              </div>
            );
          })}
          <div className="cell cell-total cell-head-label t-caption" role="columnheader">{t(lang, 'total')}</div>
        </div>

        {tasks.map((task) => {
          const isRunning = timer?.taskId === task.id;
          return (
            <div className="row" role="row" key={task.id} data-row={task.id}>
              {/* Task Cell: name (double-click renames) + ••• on hover/focus; its space is always reserved */}
              <div className={`cell cell-task t-body-m ${menuFor === task.id ? 'is-menu-open' : ''}`} role="rowheader">
                {editing === task.id ? (
                  <RenameInput
                    initial={task.name}
                    label={t(lang, 'taskName')}
                    onSave={(name) => {
                      const err = onRename(task.id, name);
                      if (!err) setEditing(null);
                      return err;
                    }}
                    onCancel={() => setEditing(null)}
            validate={(name) => nameError(task.id, name)}
                  />
                ) : (
                  <span {...MASK} className="task-name t-body-m-medium" onDoubleClick={() => setEditing(task.id)}>
                    {task.name}
                  </span>
                )}
                <span className="row-more">
                  <MoreMenu
                    label={`${t(lang, 'moreActions')}: ${task.name}`}
                    onOpenChange={(o) => setMenuFor(o ? task.id : null)}
                    entries={[
                      { kind: 'item', label: t(lang, 'rename'), icon: <IconPencil size={16} />, onSelect: () => setEditing(task.id) },
                      { kind: 'item', label: t(lang, isCurrent ? 'removeFromWeek' : 'removeFromWeekPast'), icon: <IconCalendarMinus size={16} />, onSelect: () => onRemoveFromWeek(task.id) },
                    ]}
                  />
                </span>
              </div>
              {dates.map((date, i) => {
                const minutes = cellMinutes(task.id, date);
                const kind = date === todayISO ? 'today' : date > todayISO ? 'future' : 'past';
                return (
                  <TimeCell
                    key={date}
                    kind={kind}
                    minutes={minutes}
                    running={isRunning && runningDate === date}
                    seconds={Math.floor(minutes * 60 + 1e-6) % 60}
                    limit={24 * 60 - (allDayMinutes(date) - minutes)}
                    label={`${task.name} · ${weekdayShort(lang, days[i])} ${days[i].getDate()}`}
                    lang={lang}
                    onSave={(m) => onSetTime(task.id, date, m)}
                    onStart={() => onStart(task.id)}
                    onStop={onStop}
                  />
                );
              })}
              <div className="cell cell-total t-numeric-m-medium" role="cell">
                {formatMinutes(taskTotalInRange(data.entries, task.id, countedDates) + countedDates.reduce((s, d) => s + liveMinutes(task.id, d), 0))}
              </div>
            </div>
          );
        })}

        {tasks.length > 0 && (
          <div className="row row-total" role="row">
            <div className="cell cell-task t-body-m cell-muted" role="rowheader">{t(lang, 'total')}</div>
            {dates.map((date) => (
              <div key={date} className={`cell cell-time ${date === todayISO ? 'is-today' : ''}`} role="cell">
                {/* Same as the cells: a past day with no time is «—», today with none is 0:00 in subtle */}
                {date <= todayISO && (() => {
                  const m = dayMinutes(date);
                  if (m >= 1 / 60) return <span className="t-numeric-m-medium">{formatMinutes(m)}</span>;
                  return <span className="t-numeric-m-medium cell-subtle">{date < todayISO ? '—' : formatMinutes(0)}</span>;
                })()}
              </div>
            ))}
            <div className="cell cell-total t-numeric-m-medium" role="cell">{formatMinutes(weekTotal)}</div>
          </div>
        )}
      </div>
      </div>

      <AddTask
        lang={lang}
        getSuggestions={(q) => suggestions(data, q, lang, now)}
        onAdd={(name) => { flashTask.current = onAddTask(name); }}
        onPick={onPickTask}
      />
    </section>
  );
}
