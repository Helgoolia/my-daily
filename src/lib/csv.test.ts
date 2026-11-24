import { describe, expect, it } from 'vitest';
import { emptyData, type AppData } from '../data/types';
import { exportCsv, exportFileName } from './csv';

const now = new Date(2026, 10, 24, 12, 0);
const data = (): AppData => ({
  ...emptyData(),
  tasks: [
    { id: 'a', name: 'Site Portfolio', hidden: false, createdAt: '' },
    { id: 'b', name: 'Exploring (CV, jobs, "Linkdn")', hidden: true, createdAt: '' },
    { id: 'c', name: 'Застосунок', hidden: false, createdAt: '' },
  ],
  entries: [
    { id: '1', taskId: 'a', date: '2026-11-23', minutes: 60, source: 'timer' },
    { id: '2', taskId: 'a', date: '2026-11-23', minutes: 29.6, source: 'timer' },
    { id: '3', taskId: 'b', date: '2026-11-20', minutes: 90, source: 'manual' },
  ],
  timer: { taskId: 'c', startedAt: new Date(2026, 10, 24, 10, 15).toISOString() },
});

describe('exportCsv', () => {
  it('one row per task per day, oldest first, h:mm, quoted names, running timer up to now', () => {
    const lines = exportCsv(data(), now).replace('﻿', '').trim().split('\r\n');
    expect(lines).toEqual([
      'date,task,duration',
      '2026-11-20,"Exploring (CV, jobs, ""Linkdn"")",1:30',
      '2026-11-23,Site Portfolio,1:30',
      '2026-11-24,Застосунок,1:45',
    ]);
  });
  it('starts with a BOM for Excel', () => {
    expect(exportCsv(emptyData(), now).startsWith('﻿date,task,duration')).toBe(true);
  });
  it('names the file by date', () => {
    expect(exportFileName(now)).toBe('my-daily-2026-11-24.csv');
  });
});
