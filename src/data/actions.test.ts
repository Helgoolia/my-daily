import { describe, expect, it } from 'vitest';
import { addTaskToWeek, deleteTask, hideTask, removeFromWeek, renameTask, startTimer, stopTimer } from './actions';
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
