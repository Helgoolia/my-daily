import { describe, expect, it } from 'vitest';
import { emptyData, type AppData } from '../data/types';
import { exportCsv } from './csv';
import { analyzeImport, applyImport, parseCsv, parseDate, undoImport } from './importCsv';

const now = new Date(2026, 10, 24, 12, 0);

describe('parseCsv', () => {
  it('reads commas, semicolons, quotes and a BOM', () => {
    expect(parseCsv('﻿date,task,duration\r\n2026-11-09,"A, ""B""",1:30\r\n')).toEqual([
      ['date', 'task', 'duration'],
      ['2026-11-09', 'A, "B"', '1:30'],
    ]);
    expect(parseCsv('дата;задача;тривалість\n09.11.2026;Задача;1,5')).toEqual([
      ['дата', 'задача', 'тривалість'],
      ['09.11.2026', 'Задача', '1,5'],
    ]);
  });
});

describe('parseDate', () => {
  it('reads ISO and day-first dates, rejects impossible ones', () => {
    expect(parseDate('2026-11-09')).toBe('2026-11-09');
    expect(parseDate('9.11.2026')).toBe('2026-11-09');
    expect(parseDate('09/11/2026')).toBe('2026-11-09');
    expect(parseDate('31.02.2026')).toBeNull();
  });
});

describe('analyzeImport', () => {
  it('summarises the file and lists rows it can’t use', () => {
    const csv = [
      'task,duration,date', // any column order
      'Site Portfolio,1:30,2026-11-09',
      'site portfolio,0:30,2026-11-10',
      'Job,3,4,2026-11-10', // unquoted comma → columns shift → bad date
      'Job,"3,4",2026-11-11',
      'Job,1:00,2026-12-01', // future
      ',1:00,2026-11-11', // no task
      'Job,soon,2026-11-11',
    ].join('\n');
    const a = analyzeImport(csv, emptyData(), now);
    expect(a.rows.map((r) => [r.task, r.minutes])).toEqual([['Site Portfolio', 90], ['site portfolio', 30], ['Job', 204]]);
    expect(a.ambiguousCount).toBe(1);
    expect(a.problems.map((p) => p.reason)).toEqual(['date', 'future', 'task', 'duration']);
    expect(a).toMatchObject({ tasks: 2, weeks: 1, from: '2026-11-09', to: '2026-11-11', totalMinutes: 324 });
    expect(analyzeImport(csv, emptyData(), now, 'hoursMinutes').rows[2].minutes).toBe(220); // 3,4 = 3:40
  });

  it('skips a row that would push a day over 24:00', () => {
    const data: AppData = { ...emptyData(), tasks: [{ id: 'a', name: 'A', hidden: false, createdAt: '' }], entries: [{ id: '1', taskId: 'a', date: '2026-11-09', minutes: 23 * 60, source: 'timer' }] };
    const a = analyzeImport('2026-11-09,A,0:30\n2026-11-09,B,1:00', data, now);
    expect(a.rows).toHaveLength(1);
    expect(a.problems[0].reason).toBe('dayFull');
  });
});

describe('applyImport / undoImport', () => {
  it('matches names case-insensitively, adds week rows, and undo removes exactly the batch', () => {
    let data: AppData = {
      ...emptyData(),
      tasks: [{ id: 'a', name: 'Site Portfolio', hidden: true, createdAt: '' }],
      entries: [{ id: '1', taskId: 'a', date: '2026-11-23', minutes: 60, source: 'timer' }],
      weeks: { '2026-11-23': ['a'] },
    };
    const a = analyzeImport('2026-11-09,site portfolio,1:30\n2026-11-24,New task,0:45', data, now);
    data = applyImport(data, a, 'x.csv', now);
    expect(data.tasks.map((t) => [t.name, t.hidden])).toEqual([['Site Portfolio', true], ['New task', false]]);
    expect(data.entries).toHaveLength(3);
    expect(data.weeks['2026-11-09']).toEqual(['a']);
    expect(data.weeks['2026-11-23']).toHaveLength(2);
    expect(data.lastImport).toMatchObject({ fileName: 'x.csv' });

    const back = undoImport(data);
    expect(back.entries.map((e) => e.id)).toEqual(['1']);
    expect(back.tasks.map((t) => t.name)).toEqual(['Site Portfolio']);
    expect(back.weeks['2026-11-09']).toEqual([]);
    expect(back.weeks['2026-11-23']).toEqual(['a']);
    expect(back.lastImport).toBeNull();
  });

  it('reads back its own export', () => {
    const data: AppData = {
      ...emptyData(),
      tasks: [{ id: 'a', name: 'Exploring (CV, jobs, "Linkdn")', hidden: false, createdAt: '' }],
      entries: [{ id: '1', taskId: 'a', date: '2026-11-20', minutes: 95, source: 'manual' }],
    };
    const a = analyzeImport(exportCsv(data, now), emptyData(), now);
    expect(a.problems).toEqual([]);
    expect(a.rows).toMatchObject([{ date: '2026-11-20', task: 'Exploring (CV, jobs, "Linkdn")', minutes: 95 }]);
  });
});
