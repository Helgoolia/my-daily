import { describe, expect, it } from 'vitest';
import { addTaskToWeek, startTimer, stopTimer } from './actions';
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
