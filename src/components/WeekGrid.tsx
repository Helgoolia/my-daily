import { IconArrowBarRight, IconPlayerPlayFilled, IconPlayerStopFilled } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import type { AppData } from '../data/types';
import { monthName, t, weekRange, weekdayShort } from '../lib/i18n';
import { addDays, formatMinutes, toISODate, weekDays, weekOfMonth } from '../lib/time';
import { dayTotal, minutesFor, taskTotalInRange } from '../lib/totals';
import { AddTask } from './AddTask';
import { Tooltip } from './Tooltip';
import './WeekGrid.css';

type Props = {
  data: AppData;
  monday: Date;
  now: Date;
  onStart: (taskId: string) => void;
  onStop: () => void;
  /** Returns the id of the created (or re-used) task, so focus can move to its ▶ */
  onAddTask: (name: string) => string | null;
  onExpandSidebar?: () => void;
};

/**
 * Week grid — Figma: Design / 1 · Screens / "Week · Current (1440)".
 * Columns: Task 280 · days (fill) · Today 140 · Total 100. Row height 72.
 */
export function WeekGrid({ data, monday, now, onStart, onStop, onAddTask, onExpandSidebar }: Props) {
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
  });
  const days = weekDays(monday);
  const dates = days.map(toISODate);
  const todayISO = toISODate(now);
  const taskIds = data.weeks[toISODate(monday)] ?? [];
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
  const weekTotal = dates.reduce((sum, d) => sum + dayMinutes(d), 0);

  return (
    <section className="week" aria-label={`${monthName(lang, monday)} · ${t(lang, 'week')} ${weekOfMonth(monday)}`}>
      <header className="week-header">
        <div className="week-title">
          {onExpandSidebar && (
            <Tooltip label={t(lang, 'expand')} placement="below">
              <button type="button" className="ghost-icon" onClick={onExpandSidebar} aria-label={t(lang, 'expandSidebar')}>
                <IconArrowBarRight size={16} />
              </button>
            </Tooltip>
          )}
          <div>
          <h1 className="t-heading-l">
            {monthName(lang, monday)} · {t(lang, 'week')} {weekOfMonth(monday)}
          </h1>
          <p className="t-body-s week-range">{weekRange(lang, monday, addDays(monday, 6))}</p>
          </div>
        </div>
        <div className="week-summary">
          <span className="t-overline week-summary-label">{t(lang, 'weekTotal')}</span>
          <span className="t-numeric-l">{formatMinutes(weekTotal)}</span>
          {/* Always rendered so the header height doesn't jump when a timer starts or stops */}
          <span className="t-caption week-summary-label" aria-hidden={!runningInWeek} style={{ visibility: runningInWeek ? 'visible' : 'hidden' }}>
            {t(lang, 'includingActiveTimer')}
          </span>
        </div>
      </header>

      {/* Today's column is 140 px (room for time + play/stop); other days share the rest */}
      <div
        className="grid"
        role="table"
        style={{ '--cols': `280px ${dates.map((d) => (d === todayISO ? '140px' : 'minmax(64px, 1fr)')).join(' ')} 100px` } as React.CSSProperties}
      >
        <div className="row row-head" role="row">
          <div className="cell cell-task cell-head-label t-caption" role="columnheader">{t(lang, 'task')}</div>
          {days.map((d, i) => {
            const isToday = dates[i] === todayISO;
            const isWeekend = i >= 5;
            return (
              <div
                key={dates[i]}
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
              <div className="cell cell-task t-body-m" role="rowheader">
                <span className="task-name">{task.name}</span>
              </div>
              {dates.map((date) => {
                const minutes = cellMinutes(task.id, date);
                const isToday = date === todayISO;
                const isFuture = date > todayISO;
                if (isToday) {
                  return (
                    <div key={date} className="cell cell-today is-today" role="cell">
                      {isRunning ? (
                        <span className="t-numeric-m">
                          {formatMinutes(minutes)}
                          <span className="seconds">:{String(Math.floor(minutes * 60 + 1e-6) % 60).padStart(2, '0')}</span>
                        </span>
                      ) : (
                        <span className={`t-numeric-m ${minutes === 0 ? 'cell-subtle' : ''}`}>{formatMinutes(minutes)}</span>
                      )}
                      <button
                        type="button"
                        className={`icon-button ${isRunning ? 'is-primary' : ''}`}
                        onClick={() => (isRunning ? onStop() : onStart(task.id))}
                        aria-label={`${isRunning ? t(lang, 'stop') : t(lang, 'start')}: ${task.name}`}
                      >
                        {isRunning ? <IconPlayerStopFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={date} className="cell cell-time" role="cell">
                    {isFuture ? null : minutes > 0 ? (
                      <span className="t-numeric-m">{formatMinutes(minutes)}</span>
                    ) : (
                      <span className="t-numeric-m cell-subtle">—</span>
                    )}
                  </div>
                );
              })}
              <div className="cell cell-total t-numeric-m" role="cell">
                {formatMinutes(taskTotalInRange(data.entries, task.id, dates) + dates.reduce((s, d) => s + liveMinutes(task.id, d), 0))}
              </div>
            </div>
          );
        })}

        {tasks.length > 0 && (
          <div className="row row-total" role="row">
            <div className="cell cell-task t-body-m cell-muted" role="rowheader">{t(lang, 'total')}</div>
            {dates.map((date) => (
              <div key={date} className={`cell cell-time ${date === todayISO ? 'is-today' : ''}`} role="cell">
                {date <= todayISO && <span className="t-numeric-m">{formatMinutes(dayMinutes(date))}</span>}
              </div>
            ))}
            <div className="cell cell-total t-numeric-m" role="cell">{formatMinutes(weekTotal)}</div>
          </div>
        )}
      </div>

      <AddTask lang={lang} onAdd={(name) => { flashTask.current = onAddTask(name); }} />
    </section>
  );
}
