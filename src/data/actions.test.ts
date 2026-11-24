import { describe, expect, it } from 'vitest';
import { addTaskToWeek, deleteTask, hideTask, removeFromWeek, renameTask, startTimer, stopTimer, startWeek, timerInWeek, weekRows } from './actions';
import { emptyData } from './types';

const at = (h: number, m = 0) => new Date(2026, 10, 20, h, m);

describe('timer', () => {
  it('records one entry for the start day when stopped', () => {
    let { data, taskId } = addTaskToWeek(emptyData(), 'Site Portfolio', at(9));
    data = startTimer(data, taskId!, at(9));
    data = stopTimer(data, at(10, 30));
    expect(data.timer).toBeNull();
    expect(data.entries).toMatchObject([{ taskId, date: '2026-11-20', minutes: 90, source: 'timer' }]);
  });

  it('keeps short sessions so they add up', () => {
    let { data, taskId } = addTaskToWeek(emptyData(), 'A', at(9));
    for (let i = 0; i < 4; i++) {
      const start = new Date(2026, 10, 20, 9, i, 0);
      data = stopTimer(startTimer(data, taskId!, start), new Date(start.getTime() + 30_000));
    }
    const total = data.entries.reduce((s, e) => s + e.minutes, 0);
    expect(total).toBeCloseTo(2);
  });

  it('switching stops the previous task first', () => {
    let d = emptyData();
    const a = addTaskToWeek(d, 'A', at(9));
    const b = addTaskToWeek(a.data, 'B', at(9));
    d = startTimer(b.data, a.taskId!, at(9));
    d = startTimer(d, b.taskId!, at(9, 45));
    expect(d.timer?.taskId).toBe(b.taskId);
    expect(d.entries).toMatchObject([{ taskId: a.taskId, minutes: 45 }]);
  });
});

describe('add task', () => {
  it('reuses an exact name match instead of creating a duplicate', () => {
    const first = addTaskToWeek(emptyData(), 'Job', at(9));
    const again = addTaskToWeek(first.data, '  job ', at(10));
    expect(again.taskId).toBe(first.taskId);
    expect(again.data.tasks).toHaveLength(1);
  });

  it('puts the task into the current week', () => {
    const { data, taskId } = addTaskToWeek(emptyData(), 'Job', at(9));
    expect(data.weeks['2026-11-16']).toEqual([taskId]);
  });
});

describe('task actions', () => {
  const setup = () => {
    let { data, taskId: a } = addTaskToWeek(emptyData(), 'Site Portfolio', at(9));
    const b = addTaskToWeek(data, 'Job', at(9));
    data = b.data;
    data = { ...data, entries: [
      { id: 'e1', taskId: a!, date: '2026-11-20', minutes: 135, source: 'manual' },
      { id: 'e2', taskId: a!, date: '2026-11-09', minutes: 600, source: 'manual' },
    ] };
    return { data, a: a!, b: b.taskId! };
  };

  it('remove from week deletes only this week’s time', () => {
    const { data, a } = setup();
    const next = removeFromWeek(data, a, at(12));
    expect(next.entries.map((e) => e.id)).toEqual(['e2']);
    expect(next.weeks['2026-11-16']).not.toContain(a);
    expect(next.tasks).toHaveLength(2);
  });

  it('delete removes the task, all its time and stops its timer', () => {
    const { data, a } = setup();
    const next = deleteTask(startTimer(data, a, at(10)), a);
    expect(next.tasks.map((t) => t.name)).toEqual(['Job']);
    expect(next.entries).toHaveLength(0);
    expect(next.timer).toBeNull();
  });

  it('hide keeps time; a task without time this week leaves the week', () => {
    const { data, a, b } = setup();
    const withTime = hideTask(data, a, at(12));
    expect(withTime.weeks['2026-11-16']).toContain(a);
    expect(withTime.entries).toHaveLength(2);
    const noTime = hideTask(data, b, at(12));
    expect(noTime.weeks['2026-11-16']).not.toContain(b);
    expect(noTime.tasks.find((t) => t.id === b)?.hidden).toBe(true);
  });

  it('rename refuses an existing name (any case) and empty names', () => {
    const { data, a } = setup();
    expect(renameTask(data, a, ' job ')).toMatchObject({ ok: false, reason: 'exists', existingName: 'Job' });
    expect(renameTask(data, a, '  ')).toMatchObject({ ok: false, reason: 'empty' });
    const ok = renameTask(data, a, 'Portfolio website');
    expect(ok.ok && ok.data.tasks[0].name).toBe('Portfolio website');
  });
});

describe('setDayMinutes (edit a cell)', () => {
  it('replaces that day with one manual entry, 0 clears it', async () => {
    const { setDayMinutes } = await import('./actions');
    let { data, taskId } = addTaskToWeek(emptyData(), 'A', at(9));
    data = stopTimer(startTimer(data, taskId!, at(9)), at(10));
    data = stopTimer(startTimer(data, taskId!, at(11)), at(11, 30));
    data = setDayMinutes(data, taskId!, '2026-11-20', 105);
    expect(data.entries).toMatchObject([{ taskId, date: '2026-11-20', minutes: 105, source: 'manual' }]);
    data = setDayMinutes(data, taskId!, '2026-11-20', 0);
    expect(data.entries).toEqual([]);
  });
});

describe('past weeks', () => {
  const lastWeek = new Date(2026, 10, 12, 12); // Thu of the week before (Mon 9 Nov)
  const base = () => {
    const d = { ...emptyData(), tasks: [{ id: 'a', name: 'A', hidden: false, createdAt: '' }, { id: 'b', name: 'B', hidden: true, createdAt: '' }] };
    // Imported history: time on 10 and 9 Nov, no stored rows for that week
    d.entries = [
      { id: '1', taskId: 'b', date: '2026-11-10', minutes: 30, source: 'import' as const },
      { id: '2', taskId: 'a', date: '2026-11-09', minutes: 60, source: 'import' as const },
    ];
    return d;
  };

  it('shows every task with time that week, even without stored rows (hidden ones too)', () => {
    expect(weekRows(base(), lastWeek)).toEqual(['a', 'b']);
  });

  it('adds a task to the week on screen, keeping the rows it already shows', () => {
    const { data, taskId } = addTaskToWeek(base(), 'New', at(9), lastWeek);
    expect(data.weeks['2026-11-09']).toEqual(['a', 'b', taskId]);
    expect(data.weeks['2026-11-16']).toBeUndefined();
  });

  it('removing from a past week leaves a timer running this week alone', () => {
    const d = { ...base(), timer: { taskId: 'a', startedAt: at(9).toISOString() } };
    const next = removeFromWeek(d, 'a', lastWeek);
    expect(next.timer).not.toBeNull();
    expect(next.entries.map((e) => e.id)).toEqual(['1']);
    expect(weekRows(next, lastWeek)).toEqual(['b']);
    expect(timerInWeek(d, 'a', at(10))).toBe(true);
    expect(timerInWeek(d, 'a', lastWeek)).toBe(false);
  });
});

describe('new week (Flow 12)', () => {
  const monday = new Date(2026, 10, 23, 9); // Mon 23 Nov
  const data = () => ({
    ...emptyData(),
    tasks: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id.toUpperCase(), hidden: id === 'c', createdAt: '' })),
    entries: [
      { id: '1', taskId: 'b', date: '2026-11-17', minutes: 30, source: 'manual' as const },
      { id: '2', taskId: 'a', date: '2026-11-20', minutes: 60, source: 'manual' as const },
      { id: '3', taskId: 'c', date: '2026-11-20', minutes: 60, source: 'manual' as const }, // hidden: stays asleep
    ],
    weeks: { '2026-11-16': ['a', 'b', 'c', 'd'] }, // d had 0:00 last week: sleeps
  });

  it('carries last week’s tasks that had time, in their order', () => {
    expect(startWeek(data(), monday).weeks['2026-11-23']).toEqual(['a', 'b']);
  });

  it('carries a timer that is still running from last week', () => {
    const d = { ...data(), timer: { taskId: 'd', startedAt: new Date(2026, 10, 22, 23).toISOString() } };
    expect(startWeek(d, monday).weeks['2026-11-23']).toEqual(['a', 'b', 'd']);
  });

  it('runs once: a week with rows is left alone', () => {
    const d = { ...data(), weeks: { ...data().weeks, '2026-11-23': [] } };
    expect(startWeek(d, monday)).toBe(d);
  });
});
