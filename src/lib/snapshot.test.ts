import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, type Snapshot } from './snapshot';

describe('share link', () => {
  it('packs a week into a short code and back', async () => {
    const s: Snapshot = {
      v: 1, monday: '2026-11-09', at: '2026-11-11T15:09:00.000Z', today: '2026-11-11', lang: 'uk',
      rows: [
        { name: 'My Daily (Web App)', days: [150, 120, 85, null, null, null, null] },
        { name: 'Сайт-портфоліо', days: [75, 0, 0, null, null, null, null] },
      ],
    };
    const code = await encodeSnapshot(s);
    expect(code).toMatch(/^[\w-]+$/);
    expect(await decodeSnapshot(code)).toEqual(s);
  });

  it('a broken code gives null, not an error', async () => {
    expect(await decodeSnapshot('not-a-snapshot')).toBeNull();
  });
});
