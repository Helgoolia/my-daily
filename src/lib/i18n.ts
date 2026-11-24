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
    removeFromWeekPast: 'Remove from week',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    goToThisWeek: 'This week',
    removeTitlePast: 'Remove task from {week}?',
    removeBodyPast: '{name}: {time} tracked that week will be deleted. The task stays in your list with its time from other weeks.',
    toastRemovedPast: 'Removed from {week}: {name}',
    toastAddedPast: 'Added to {week}: {name}',
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
    data: 'Data',
    exportData: 'Export data',
    importData: 'Import data',
    undoImport: 'Undo import',
    importIntro: 'Upload a CSV with date, task and duration — one row per time entry.',
    dropHere: 'Drop a CSV file here or click to browse',
    importFormat: 'date, task, duration (1:30 or 1.5)',
    notCsv: '{file} isn’t a CSV file.',
    notCsvHelp: 'Save it as .csv or download the template.',
    importTitle: 'Import data',
    downloadTemplate: 'Download template',
    continue: 'Continue',
    reviewImport: 'Review import',
    commaQuestion: 'Duration {example} =',
    appliesTo: 'Applies to {rows}',
    needsAttention: 'Needs attention · {n}',
    skipped: 'Skipped',
    problemDate: 'can’t read the date',
    problemFuture: 'date in the future',
    problemTask: 'no task name',
    problemDuration: 'can’t read the duration',
    problemDayFull: 'the day would go over 24:00',
    problemTooLong: 'longer than 24:00',
    dropToUpload: 'Drop to upload',
    line: 'Line {n}',
    importN: 'Import {entries}',
    nothingToImport: 'Nothing to import',
    toastImported: 'Imported {entries} from {weeks}',
    undoImportTitle: 'Undo import?',
    undoImportBody: '{entries} from {file} will be removed. Time you tracked in the app stays.',
    removeEntries: 'Remove entries',
    toastImportUndone: 'Import undone: {entries} removed',
    storageNote: 'Your data is stored in this browser only. Export to keep a backup.',
    toastExported: 'Exported: {file}',
    close: 'Close',
    toastCleared: 'Time deleted: {name} · {day}',
    toastDayFull: 'Timer stopped: this day already has 24:00',
    nameExists: 'A task named {name} already exists',
    thisWeek: 'This week',
    trackingNow: 'Tracking now',
    notTracked: 'No time yet',
    metaRunning: 'tracking now',
    metaInWeek: 'in this week',
    metaLastTracked: 'last tracked {ago}',
    metaNotTracked: 'no time yet',
    metaHidden: 'Hidden',
    createTask: 'Create task “{name}”',
    emptyTasks: 'Your tasks will appear here.',
    allHidden: 'All tasks are hidden.',
    editTime: 'Edit time',
    stopToEdit: 'Stop the timer to edit',
    futureBlocked: 'You can’t add time to future days',
    timeFormat: 'Use h:mm, like 1:45',
    canAddMore: 'You can add {time} more',
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
    removeFromWeekPast: 'Прибрати з тижня',
    prevWeek: 'Попередній тиждень',
    nextWeek: 'Наступний тиждень',
    goToThisWeek: 'Цей тиждень',
    removeTitlePast: 'Прибрати задачу з тижня {week}?',
    removeBodyPast: '{name}: {time} за той тиждень буде видалено. Задача лишиться у списку разом із часом за інші тижні.',
    toastRemovedPast: 'Прибрано з тижня {week}: {name}',
    toastAddedPast: 'Додано в тиждень {week}: {name}',
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
    data: 'Дані',
    exportData: 'Експортувати дані',
    importData: 'Імпортувати дані',
    undoImport: 'Скасувати імпорт',
    importIntro: 'Завантажте CSV з датою, задачею й тривалістю — один рядок на запис.',
    dropHere: 'Перетягніть сюди CSV-файл або натисніть, щоб обрати',
    importFormat: 'дата, задача, тривалість (1:30 або 1.5)',
    notCsv: '{file} — не CSV-файл.',
    notCsvHelp: 'Збережіть його як .csv або завантажте шаблон.',
    importTitle: 'Імпорт даних',
    downloadTemplate: 'Завантажити шаблон',
    continue: 'Продовжити',
    reviewImport: 'Перевірка імпорту',
    commaQuestion: 'Тривалість {example} =',
    appliesTo: 'Стосується {rows}',
    needsAttention: 'Потребує уваги · {n}',
    skipped: 'Пропущено',
    problemDate: 'не вдалося прочитати дату',
    problemFuture: 'дата в майбутньому',
    problemTask: 'немає назви задачі',
    problemDuration: 'не вдалося прочитати тривалість',
    problemDayFull: 'день перевищить 24:00',
    problemTooLong: 'довше за 24:00',
    dropToUpload: 'Відпустіть, щоб завантажити',
    line: 'Рядок {n}',
    importN: 'Імпортувати {entries}',
    nothingToImport: 'Нічого імпортувати',
    toastImported: 'Імпортовано {entries} за {weeks}',
    undoImportTitle: 'Скасувати імпорт?',
    undoImportBody: '{entries} з {file} буде видалено. Час, відстежений у застосунку, залишиться.',
    removeEntries: 'Видалити записи',
    toastImportUndone: 'Імпорт скасовано: видалено {entries}',
    storageNote: 'Дані зберігаються лише в цьому браузері. Експортуйте, щоб мати резервну копію.',
    toastExported: 'Експортовано: {file}',
    close: 'Закрити',
    toastCleared: 'Час видалено: {name} · {day}',
    toastDayFull: 'Таймер зупинено: у цьому дні вже 24:00',
    nameExists: 'Задача з назвою {name} вже існує',
    thisWeek: 'Цього тижня',
    trackingNow: 'Таймер іде',
    notTracked: 'Часу ще немає',
    metaRunning: 'таймер іде',
    metaInWeek: 'у цьому тижні',
    metaLastTracked: 'востаннє {ago}',
    metaNotTracked: 'часу ще немає',
    metaHidden: 'прихована',
    createTask: 'Створити задачу «{name}»',
    emptyTasks: 'Тут з’являться ваші задачі.',
    allHidden: 'Усі задачі приховані.',
    editTime: 'Змінити час',
    stopToEdit: 'Зупиніть таймер, щоб змінити час',
    futureBlocked: 'У майбутні дні час додати не можна',
    timeFormat: 'Формат г:хх, наприклад 1:45',
    canAddMore: 'Можна додати ще {time}',
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

/** Plural forms, Intl rules: en one/other, uk one/few/many ("1 запис", "2 записи", "5 записів"). */
const forms = {
  en: { entry: ['entry', 'entries'], week: ['week', 'weeks'], task: ['task', 'tasks'], row: ['row', 'rows'], hour: ['hour', 'hours'] },
  uk: { entry: ['запис', 'записи', 'записів'], week: ['тиждень', 'тижні', 'тижнів'], task: ['задача', 'задачі', 'задач'], row: ['рядка', 'рядків', 'рядків'], hour: ['год', 'год', 'год'] },
} as const;
export type Countable = keyof typeof forms.en;

export const formatNumber = (lang: Lang, n: number) => new Intl.NumberFormat(locale(lang)).format(n);

export function plural(lang: Lang, n: number, word: Countable): string {
  const rule = new Intl.PluralRules(locale(lang)).select(n);
  const f = forms[lang][word] as readonly string[];
  const w = lang === 'en' ? f[rule === 'one' ? 0 : 1] : f[rule === 'one' ? 0 : rule === 'few' ? 1 : 2];
  return `${formatNumber(lang, n)} ${w}`;
}

/** "Nov 2022 – Nov 2026" / "лист. 2022 – лист. 2026"; one month → "Nov 2026" */
export function monthRange(lang: Lang, from: Date, to: Date): string {
  const f = new Intl.DateTimeFormat(locale(lang), { month: 'short', year: 'numeric' });
  const clean = (d: Date) => f.format(d).replace(/\s*р\.$/, '');
  const a = clean(from), b = clean(to);
  return a === b ? a : `${a} – ${b}`;
}
