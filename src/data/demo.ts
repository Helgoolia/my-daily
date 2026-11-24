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

  // Older history, spread over real days (a day never holds more than 24:00), so past weeks look
  // like the Figma "Week · Past week": four weeks back, weekdays busier, weekends light.
  const back = (days: number) => toISODate(addDays(monday, -days));
  let n = 0;
  const add = (taskId: string, date: string, minutes: number) => {
    if (minutes > 0) entries.push({ id: `h${n++}`, taskId, date, minutes, source: 'manual' });
  };
  for (let w = 1; w <= 4; w++)
    for (let d = 0; d < 7; d++)
      tasks.slice(0, 6).forEach((task, i) => {
        const weekend = d >= 5;
        const steps = (i * (weekend ? 1 : 3) + d * 5 + w * 7) % (weekend ? 3 : 7); // a few varied sessions
        add(task.id, back(7 * w - d), steps * (weekend ? 10 : [30, 20, 20, 15, 10, 10][i]));
      });
  // Tasks that are not in this week and hidden ones; long-running ones go far back
  const extra: [string, boolean, [number, number, number][]][] = [
    ['Helgoolia', false, [[9, 3, 120], [8, 2, 100]]], // [days ago, sessions, minutes each]
    ['Interview SigmaSoftw', false, [[17, 1, 180]]],
    ['Looking for a job', true, [[240, 103, 240]]],
    ['Webflow course', true, [[300, 6, 150]]],
  ];
  extra.forEach(([name, hidden, runs], i) => {
    const id = `x${i}`;
    tasks.push({ id, name, hidden, createdAt: created });
    runs.forEach(([from, count, minutes]) => {
      for (let k = 0; k < count; k++) add(id, back(from - k), minutes);
    });
  });

  data.tasks = tasks;
  data.entries = entries;
  data.weeks[day(0)] = tasks.slice(0, 6).map((t) => t.id);
  return data;
}
