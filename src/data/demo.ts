import { addDays, mondayOf, toISODate } from '../lib/time';
import { emptyData, type AppData, type Entry, type Task } from './types';

/** Development-only sample week, close to the Figma screens. Never used in production. */
export function demoData(now = new Date()): AppData {
  const data = emptyData();
  const monday = mondayOf(now);
  const day = (i: number) => toISODate(addDays(monday, i));
  const created = new Date(2026, 0, 1).toISOString();

  const names = ['My Daily (Web App)', 'Exploring (CV, jobs, Linkdn)', 'Site Portfolio', 'Case (PereHOD-Nava)', 'UX/UI AI exploring', 'Product Metrics (Basic)'];
  const tasks: Task[] = names.map((name, i) => ({ id: `t${i + 1}`, name, hidden: false, createdAt: created }));

  // Three sample days ending today (day before yesterday, yesterday, today). Future days never get
  // time — on a Monday only today's column is used, the earlier ones would fall in last week.
  const todayIndex = (now.getDay() + 6) % 7;
  const grid: number[][] = [
    [150, 120, 85],
    [60, 90, 30],
    [75, 60, 0],
    [30, 45, 0],
    [30, 15, 20],
    [0, 0, 0],
  ];
  const entries: Entry[] = [];
  grid.forEach((row, ti) =>
    row.forEach((minutes, di) => {
      const index = todayIndex - 2 + di;
      if (minutes > 0 && index >= 0) entries.push({ id: `e${ti}-${di}`, taskId: tasks[ti].id, date: day(index), minutes, source: 'manual' });
    }),
  );

  // Older history: all-time totals, tasks that are not in this week, hidden tasks.
  const past = (weeksAgo: number) => toISODate(addDays(monday, -7 * weeksAgo));
  const extra: [string, boolean, number][] = [
    ['Helgoolia', false, 580],
    ['Interview SigmaSoftw', false, 180],
    ['Looking for a job', true, 24720],
    ['Webflow course', true, 900],
  ];
  extra.forEach(([name, hidden, minutes], i) => {
    const id = `x${i}`;
    tasks.push({ id, name, hidden, createdAt: created });
    entries.push({ id: `ex${i}`, taskId: id, date: past(i + 2), minutes, source: 'manual' });
  });
  const olderTotals = [2490, 1735, 1985, 935, 650, 380];
  olderTotals.forEach((minutes, i) => entries.push({ id: `old${i}`, taskId: tasks[i].id, date: past(1), minutes, source: 'manual' }));

  data.tasks = tasks;
  data.entries = entries;
  data.weeks[day(0)] = tasks.slice(0, 6).map((t) => t.id);
  return data;
}
