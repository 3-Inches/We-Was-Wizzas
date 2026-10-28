// The "In the app" pointers, and the optional rules' topics, name real mechanics topics.
import { describe, expect, it } from 'vitest';
import index from './generated/mechanics/index.json';
import { APP_PLACES } from './appPlaces';
import { OPTIONAL_RULES } from '../engine/optional';

describe('app places', () => {
  it('points only at topics the mechanics reference has', () => {
    const ids = new Set((index as { areas: { groups: { id: string }[]; gated: { id: string }[] }[] }).areas.flatMap((a) => [...a.groups, ...a.gated].map((g) => g.id)));
    expect(Object.keys(APP_PLACES).filter((k) => !ids.has(k))).toEqual([]);
  });
  it('ties every optional rule to topics the mechanics reference has', () => {
    const ids = new Set((index as { areas: { groups: { id: string }[]; gated: { id: string }[] }[] }).areas.flatMap((a) => [...a.groups, ...a.gated].map((g) => g.id)));
    for (const r of OPTIONAL_RULES) {
      expect(r.topics.length, r.id).toBeGreaterThan(0);
      expect(r.topics.filter((t) => !ids.has(t)), r.id).toEqual([]);
    }
  });
});
