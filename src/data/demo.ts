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

  // minutes for Mon, Tue, Wed
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
      if (minutes > 0) entries.push({ id: `e${ti}-${di}`, taskId: tasks[ti].id, date: day(di), minutes, source: 'manual' });
    }),
  );

  data.tasks = tasks;
  data.entries = entries;
  data.weeks[day(0)] = tasks.map((t) => t.id);
  return data;
}
