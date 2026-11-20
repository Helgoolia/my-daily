import type { Settings } from '../data/types';

type Lang = Settings['language'];

const strings = {
  en: {
    week: 'Week',
    task: 'Task',
    total: 'Total',
    today: 'Today',
    weekTotal: 'Week total',
    includingActiveTimer: 'Including active timer',
    nameATask: 'Name a task',
    start: 'Start',
    stop: 'Stop',
  },
  uk: {
    week: 'тиждень',
    task: 'Задача',
    total: 'Разом',
    today: 'Сьогодні',
    weekTotal: 'Усього за тиждень',
    includingActiveTimer: 'Разом з активним таймером',
    nameATask: 'Назвіть задачу',
    start: 'Почати',
    stop: 'Зупинити',
  },
} satisfies Record<Lang, Record<string, string>>;

export type StringKey = keyof typeof strings.en;

export const t = (lang: Lang, key: StringKey) => strings[lang][key];

const locale = (lang: Lang) => (lang === 'uk' ? 'uk-UA' : 'en-GB');

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "November" / "Листопад" — standalone month name */
export const monthName = (lang: Lang, d: Date) =>
  cap(new Intl.DateTimeFormat(locale(lang), { month: 'long' }).format(d));

/** "Mon" / "Пн" */
export const weekdayShort = (lang: Lang, d: Date) =>
  cap(new Intl.DateTimeFormat(locale(lang), { weekday: 'short' }).format(d)).replace('.', '');

/**
 * "9–15 November" / "9–15 листопада". The year is added only when the week is not in the
 * current year (rule from the plan); a week across two years shows both.
 */
export function weekRange(lang: Lang, monday: Date, sunday: Date, now = new Date()): string {
  const fmt = (d: Date, withYear: boolean) =>
    new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long', ...(withYear && { year: 'numeric' }) })
      .format(d)
      .replace(' р.', '');
  const crossYear = monday.getFullYear() !== sunday.getFullYear();
  const showYear = crossYear || sunday.getFullYear() !== now.getFullYear();
  if (crossYear) return `${fmt(monday, true)} – ${fmt(sunday, true)}`;
  if (monday.getMonth() !== sunday.getMonth()) return `${fmt(monday, false)} – ${fmt(sunday, showYear)}`;
  return `${monday.getDate()}–${fmt(sunday, showYear)}`;
}
