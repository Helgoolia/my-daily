import { describe, expect, it } from 'vitest';
import { formatElapsed, formatMinutes, mondayOf, parseDuration, toISODate, weekOfMonth } from './time';

describe('formatMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatMinutes(90)).toBe('1:30');
    expect(formatMinutes(0)).toBe('0:00');
    expect(formatMinutes(25 * 60 + 5)).toBe('25:05');
  });
});

describe('formatElapsed', () => {
  it('shows seconds for the running timer', () => {
    expect(formatElapsed(5118)).toBe('1:25:18');
  });
});

describe('parseDuration', () => {
  it('reads h:mm', () => expect(parseDuration('1:30')).toEqual({ ok: true, minutes: 90 }));
  it('reads decimal hours with a dot or a comma', () => {
    expect(parseDuration('1.5')).toMatchObject({ ok: true, minutes: 90 });
    expect(parseDuration('1,5')).toMatchObject({ ok: true, minutes: 90 });
  });
  it('flags "3,4" as ambiguous: 3:24 by default, 3:40 as the alternative', () => {
    expect(parseDuration('3,4')).toEqual({
      ok: true,
      minutes: 204,
      ambiguous: { decimal: 204, hoursMinutes: 220 },
    });
  });
  it('does not flag values that cannot be minutes', () => {
    expect(parseDuration('1,75')).toEqual({ ok: true, minutes: 105 });
  });
  it('rejects garbage', () => {
    expect(parseDuration('abc')).toEqual({ ok: false });
    expect(parseDuration('1:75')).toEqual({ ok: false });
  });
});

describe('weeks', () => {
  it('starts on Monday', () => {
    expect(toISODate(mondayOf(new Date(2026, 10, 11)))).toBe('2026-11-09'); // Wed → Mon
    expect(toISODate(mondayOf(new Date(2026, 10, 15)))).toBe('2026-11-09'); // Sun → Mon
  });
  it('numbers weeks inside the month', () => {
    expect(weekOfMonth(new Date(2026, 10, 9))).toBe(2);
    expect(weekOfMonth(new Date(2026, 10, 2))).toBe(1);
  });
});
