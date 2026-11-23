import type { Settings } from '../data/types';

export type Lang = Settings['language'];

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
    allTasks: 'All tasks',
    allTime: 'All-time',
    sort: 'Sort',
    sortMostTracked: 'Most tracked',
    sortRecent: 'Recently used',
    sortName: 'Name A–Z',
    hidden: 'Hidden',
    addToThisWeek: 'Add to this week',
    unhide: 'Unhide',
    running: 'Timer running',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    collapse: 'Collapse',
    expand: 'Expand',
    moreActions: 'More actions',
    rename: 'Rename',
    removeFromWeek: 'Remove from this week',
    hide: 'Hide',
    hideHint: 'Keeps all its {time}',
    restore: 'Restore',
    delete: 'Delete',
    cancel: 'Cancel',
    remove: 'Remove',
    undo: 'Undo',
    removeTitle: 'Remove task from this week?',
    removeBody: '{name}: {time} tracked this week will be deleted. The task stays in your list with its time from other weeks.',
    removeBodyRunning: '{name}: the timer will stop, and {time} tracked this week will be deleted. The task stays in your list with its time from other weeks.',
    deleteTitle: 'Delete task?',
    deleteBody: '{name} and all {time} tracked across all weeks will be deleted.',
    deleteBodyRunning: '{name} and all {time} tracked across all weeks will be deleted. The running timer stops too.',
    toastRemoved: 'Removed from this week: {name}',
    toastHidden: 'Hidden: {name}',
    toastDeleted: 'Deleted: {name}',
    toastRestored: 'Restored: {name}',
    toastAdded: 'Added to this week: {name}',
    nameExists: 'A task named {name} already exists',
    thisWeek: 'This week',
    trackingNow: 'Tracking now',
    notTracked: 'Not tracked yet',
    metaInWeek: 'in this week',
    metaLastTracked: 'last tracked {ago}',
    metaNotTracked: 'not tracked yet',
    metaHidden: 'Hidden',
    createTask: 'Create task “{name}”',
    emptyTasks: 'Your tasks will appear here.',
    allHidden: 'All tasks are hidden.',
    taskName: 'Task name',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
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
    allTasks: 'Усі задачі',
    allTime: 'За весь час',
    sort: 'Сортування',
    sortMostTracked: 'Найбільше часу',
    sortRecent: 'Нещодавні',
    sortName: 'За назвою А–Я',
    hidden: 'Приховані',
    addToThisWeek: 'Додати в цей тиждень',
    unhide: 'Повернути',
    running: 'Таймер працює',
    collapseSidebar: 'Згорнути панель',
    expandSidebar: 'Розгорнути панель',
    collapse: 'Згорнути',
    expand: 'Розгорнути',
    moreActions: 'Більше дій',
    rename: 'Перейменувати',
    removeFromWeek: 'Прибрати з тижня',
    hide: 'Приховати',
    hideHint: 'Усі {time} збережуться',
    restore: 'Повернути',
    delete: 'Видалити',
    cancel: 'Скасувати',
    remove: 'Прибрати',
    undo: 'Скасувати',
    removeTitle: 'Прибрати задачу з цього тижня?',
    removeBody: '{name}: {time} за цей тиждень буде видалено. Задача лишиться у списку разом із часом за інші тижні.',
    removeBodyRunning: '{name}: таймер зупиниться, а {time} за цей тиждень буде видалено. Задача лишиться у списку разом із часом за інші тижні.',
    deleteTitle: 'Видалити задачу?',
    deleteBody: '{name} і {time} за всі тижні буде видалено.',
    deleteBodyRunning: '{name} і {time} за всі тижні буде видалено. Запущений таймер теж зупиниться.',
    toastRemoved: 'Прибрано з цього тижня: {name}',
    toastHidden: 'Приховано: {name}',
    toastDeleted: 'Видалено: {name}',
    toastRestored: 'Повернуто: {name}',
    toastAdded: 'Додано в цей тиждень: {name}',
    nameExists: 'Задача з назвою {name} вже існує',
    thisWeek: 'Цього тижня',
    trackingNow: 'Зараз відстежується',
    notTracked: 'Ще не відстежувалась',
    metaInWeek: 'у цьому тижні',
    metaLastTracked: 'востаннє {ago}',
    metaNotTracked: 'ще не відстежувалась',
    metaHidden: 'прихована',
    createTask: 'Створити задачу «{name}»',
    emptyTasks: 'Тут з’являться ваші задачі.',
    allHidden: 'Усі задачі приховані.',
    taskName: 'Назва задачі',
    theme: 'Тема',
    light: 'Світла',
    dark: 'Темна',
    language: 'Мова',
  },
} satisfies Record<Lang, Record<string, string>>;

export type StringKey = keyof typeof strings.en;

export const t = (lang: Lang, key: StringKey) => strings[lang][key];

/** t() with {placeholders}: tf('en', 'toastHidden', { name: 'Job' }) */
export const tf = (lang: Lang, key: StringKey, vars: Record<string, string>) =>
  strings[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);

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
