import { describe, expect, it } from 'vitest';
import { addTaskToWeek, hideTask, removeFromWeek } from '../data/actions';
import { emptyData, type AppData } from '../data/types';
import { ago, rowStatus, suggestions, taskInfos } from './taskInfo';

const now = new Date(2026, 10, 23, 12); // Mon 23 Nov 2026

function sample(): AppData {
  let d = emptyData();
  for (const name of ['Job', 'Exploring (CV, jobs, Linkdn)', 'Site Portfolio']) d = addTaskToWeek(d, name, now).data;
  const id = (n: string) => d.tasks.find((t) => t.name === n)!.id;
  d = {
    ...d,
    entries: [
      { id: 'e1', taskId: id('Job'), date: '2026-03-10', minutes: 412 * 60, source: 'manual' },
      { id: 'e2', taskId: id('Exploring (CV, jobs, Linkdn)'), date: '2026-11-23', minutes: 60, source: 'manual' },
    ],
  };
  d = removeFromWeek(d, id('Job'), now);
  d = hideTask(d, id('Job'), now);
  return d;
}

describe('ago', () => {
  it('uses days, weeks, months, years — always numeric', () => {
    expect(ago('en', '2026-11-20', now)).toBe('3 days ago');
    expect(ago('en', '2026-11-16', now)).toBe('1 week ago');
    expect(ago('en', '2026-03-10', now)).toBe('8 months ago');
    expect(ago('uk', '2026-03-10', now)).toBe('8 місяців тому');
  });
});

describe('suggestions (Flow 10)', () => {
  it('starts at 2 letters and includes hidden tasks with meta', () => {
    const d = sample();
    expect(suggestions(d, 'j', 'en', now)).toEqual([]);
    const s = suggestions(d, 'jo', 'en', now);
    expect(s.map((x) => x.name)).toEqual(['Job', 'Exploring (CV, jobs, Linkdn)']);
    expect(s[0].meta).toBe('412:00 · last tracked 8 months ago · Hidden');
    expect(s[1].meta).toBe('1:00 · in this week');
    expect(s.some((x) => x.exact)).toBe(false);
  });

  it('marks an exact, case-insensitive match and puts it first', () => {
    const s = suggestions(sample(), 'JOB', 'en', now);
    expect(s[0]).toMatchObject({ name: 'Job', exact: true });
  });
});

describe('row status', () => {
  it('this week / last tracked / not tracked', () => {
    const d = sample();
    const infos = taskInfos(d, now);
    const by = (n: string) => infos.get(d.tasks.find((t) => t.name === n)!.id)!;
    expect(rowStatus('en', by('Exploring (CV, jobs, Linkdn)'), now)).toBe('This week');
    expect(rowStatus('en', by('Job'), now)).toBe('8 months ago');
    expect(rowStatus('en', by('Site Portfolio'), now)).toBe('This week');
  });
});
