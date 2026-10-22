// The "In the app" pointers name real mechanics topics.
import { describe, expect, it } from 'vitest';
import index from './generated/mechanics/index.json';
import { APP_PLACES } from './appPlaces';

describe('app places', () => {
  it('points only at topics the mechanics reference has', () => {
    const ids = new Set((index as { areas: { groups: { id: string }[]; gated: { id: string }[] }[] }).areas.flatMap((a) => [...a.groups, ...a.gated].map((g) => g.id)));
    expect(Object.keys(APP_PLACES).filter((k) => !ids.has(k))).toEqual([]);
  });
});
