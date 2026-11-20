import type { AppData } from '../data/types';
import { monthName, t, weekRange, weekdayShort } from '../lib/i18n';
import { addDays, formatMinutes, toISODate, weekDays, weekOfMonth } from '../lib/time';
import { dayTotal, minutesFor, taskTotalInRange } from '../lib/totals';
import './WeekGrid.css';

type Props = { data: AppData; monday: Date; today: Date };

/**
 * Week grid — Figma: Design / 1 · Screens / "Week · Current (1440)".
 * Columns: Task 280 · days (fill) · Today 140 · Total 100. Row height 72.
 */
export function WeekGrid({ data, monday, today }: Props) {
  const lang = data.settings.language;
  const days = weekDays(monday);
  const dates = days.map(toISODate);
  const todayISO = toISODate(today);
  const taskIds = data.weeks[toISODate(monday)] ?? [];
  const tasks = taskIds.map((id) => data.tasks.find((x) => x.id === id)).filter((x) => x !== undefined);
  const weekTotal = dates.reduce((sum, d) => sum + dayTotal(data.entries, d, taskIds), 0);

  return (
    <section className="week" aria-label={`${monthName(lang, monday)} · ${t(lang, 'week')} ${weekOfMonth(monday)}`}>
      <header className="week-header">
        <div>
          <h1 className="t-heading-l">
            {monthName(lang, monday)} · {t(lang, 'week')} {weekOfMonth(monday)}
          </h1>
          <p className="t-body-s week-range">{weekRange(lang, monday, addDays(monday, 6))}</p>
        </div>
        <div className="week-summary">
          <span className="t-overline week-summary-label">{t(lang, 'weekTotal')}</span>
          <span className="t-numeric-l">{formatMinutes(weekTotal)}</span>
        </div>
      </header>

      <div className="grid" role="table">
        <div className="row row-head" role="row">
          <div className="cell cell-task t-body-s cell-muted" role="columnheader">{t(lang, 'task')}</div>
          {days.map((d, i) => {
            const isToday = dates[i] === todayISO;
            return (
              <div key={dates[i]} className={`cell cell-day-head ${isToday ? 'is-today' : ''}`} role="columnheader">
                <span className="t-caption cell-muted">{weekdayShort(lang, d)}</span>
                <span className="t-numeric-m">{d.getDate()}</span>
                {isToday && <span className="t-overline">{t(lang, 'today')}</span>}
              </div>
            );
          })}
          <div className="cell cell-total t-body-s cell-muted" role="columnheader">{t(lang, 'total')}</div>
        </div>

        {tasks.map((task) => (
          <div className="row" role="row" key={task.id}>
            <div className="cell cell-task t-body-m" role="rowheader">
              <span className="task-name">{task.name}</span>
            </div>
            {dates.map((date) => {
              const minutes = minutesFor(data.entries, task.id, date);
              const isToday = date === todayISO;
              const isFuture = date > todayISO;
              return (
                <div key={date} className={`cell cell-time ${isToday ? 'is-today' : ''}`} role="cell">
                  {isFuture ? null : minutes > 0 ? (
                    <span className="t-numeric-m">{formatMinutes(minutes)}</span>
                  ) : isToday ? (
                    <span className="t-numeric-m cell-subtle">0:00</span>
                  ) : (
                    <span className="t-numeric-m cell-subtle">—</span>
                  )}
                </div>
              );
            })}
            <div className="cell cell-total t-numeric-m" role="cell">
              {formatMinutes(taskTotalInRange(data.entries, task.id, dates))}
            </div>
          </div>
        ))}

        <div className="row row-total" role="row">
          <div className="cell cell-task t-body-m cell-muted" role="rowheader">{t(lang, 'total')}</div>
          {dates.map((date) => (
            <div key={date} className={`cell cell-time ${date === todayISO ? 'is-today' : ''}`} role="cell">
              {date <= todayISO && <span className="t-numeric-m">{formatMinutes(dayTotal(data.entries, date, taskIds))}</span>}
            </div>
          ))}
          <div className="cell cell-total t-numeric-m" role="cell">{formatMinutes(weekTotal)}</div>
        </div>
      </div>
    </section>
  );
}
