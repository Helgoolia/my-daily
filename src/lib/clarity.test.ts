import { describe, expect, it } from 'vitest';
import { testerTag } from './clarity';

describe('testerTag', () => {
  it('lowercases and joins words with dashes', () => {
    expect(testerTag('Natasha K.')).toBe('natasha-k');
    expect(testerTag('  sister ')).toBe('sister');
  });
  it('keeps Cyrillic', () => {
    expect(testerTag('Наташа')).toBe('наташа');
  });
  it('is empty when nothing usable is left', () => {
    expect(testerTag(' -- ')).toBe('');
  });
  it('caps the length', () => {
    expect(testerTag('a'.repeat(50))).toHaveLength(32);
  });
});
