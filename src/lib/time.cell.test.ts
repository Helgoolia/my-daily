import { describe, expect, it } from 'vitest';
import { autoColon, parseCellTime } from './time';

describe('parseCellTime (Input Type=Time)', () => {
  it('reads the formats from Figma', () => {
    expect(parseCellTime('2:30')).toBe(150);
    expect(parseCellTime('230')).toBe(150);
    expect(parseCellTime('2')).toBe(120);
    expect(parseCellTime('45')).toBe(45);
    expect(parseCellTime('2h30')).toBe(150);
    expect(parseCellTime('2h')).toBe(120);
    expect(parseCellTime('90m')).toBe(90);
    expect(parseCellTime('1.5')).toBe(90);
    expect(parseCellTime('1,5')).toBe(90);
    expect(parseCellTime('')).toBe(0);
    expect(parseCellTime('25:00')).toBe(1500); // the day limit catches it, not the format
  });
  it('rejects what it cannot read', () => {
    expect(parseCellTime('2:75')).toBeNull();
    expect(parseCellTime('abc')).toBeNull();
    expect(parseCellTime('290')).toBeNull();
  });
  it('inserts the colon while typing digits', () => {
    expect(autoColon('23')).toBe('23');
    expect(autoColon('230')).toBe('2:30');
    expect(autoColon('1234')).toBe('12:34');
    expect(autoColon('2:3')).toBe('2:3');
  });
});
