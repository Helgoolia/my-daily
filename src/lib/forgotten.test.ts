import { describe, expect, it } from 'vitest';
import { clock, dayWord, resolveStop, stopOptions, suggestStop } from './forgotten';

const start = new Date(2026, 10, 11, 9, 48);
const now = new Date(2026, 10, 11, 19, 0, 30);

describe('forgotten timer', () => {
  it('lists 15-minute steps inside the session, newest first', () => {
    const o = stopOptions(start, now).map(clock);
    expect(o[0]).toBe('19:00');
    expect(o.at(-1)).toBe('10:00');
  });

  it('reads typed times and refuses ones outside the session', () => {
    expect(clock(resolveStop('13:37', start, now)!)).toBe('13:37');
    expect(clock(resolveStop('1330', start, now)!)).toBe('13:30');
    expect(clock(resolveStop('13', start, now)!)).toBe('13:00');
    expect(resolveStop('09:30', start, now)).toBeNull(); // before the start
    expect(resolveStop('19:30', start, now)).toBeNull(); // later than now → yesterday → before the start
    expect(resolveStop('25:00', start, now)).toBeNull();
  });

  it('a session past midnight reads small hours as last night', () => {
    const s = new Date(2026, 10, 10, 22, 10);
    const at = resolveStop('01:00', s, new Date(2026, 10, 11, 9, 0))!;
    expect(at.getDate()).toBe(11);
    expect(clock(at)).toBe('01:00');
  });

  it('suggests the step nearest to when the tab was left', () => {
    expect(clock(suggestStop(start, now, new Date(2026, 10, 11, 13, 34)))).toBe('13:30');
    expect(clock(suggestStop(start, now, null))).toBe('19:00');
  });

  it('names the day', () => {
    expect(dayWord(start, now)).toBe('today');
    expect(dayWord(new Date(2026, 10, 10, 23), now)).toBe('yesterday');
  });
});
