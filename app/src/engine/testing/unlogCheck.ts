// For the tests that log every kind of season and unlog it (engine/unlogEverySeason.test.ts and
// ui/pages/unlogEverySeason.test.tsx): the practice sagas, and what differs between two states.

import type { SagaState } from '../time';

/** The practice sagas of scripts/qa/fixtures, by name. */
export function sagaFixtures(): [string, SagaState][] {
  const files = import.meta.glob('../../../scripts/qa/fixtures/*.saga.json', { eager: true, import: 'default' }) as Record<string, SagaState>;
  return Object.entries(files).map(([k, f]) => [k.match(/([a-z]+)\.saga\.json$/)![1], f]);
}

/**
 * Plain JSON, as a save keeps it: a field set to undefined is no field, an empty list or record is none,
 * no experience from play (`play: 0`, which Unlog leaves where a season's experience was taken off) is
 * none, and when a record was last saved (`updatedAt`) is not something a season did.
 */
const empty = (v: unknown) => (Array.isArray(v) ? v.length === 0 : !!v && typeof v === 'object' && Object.keys(v).length === 0);
const plain = (x: unknown): unknown =>
  x === undefined ? undefined : JSON.parse(JSON.stringify(x), (k, v) => ((k === 'play' && v === 0) || k === 'updatedAt' || (k !== '' && !/^\d+$/.test(k) && empty(v)) ? undefined : v));

/** Where two states differ, as "path: before → after" lines (at most `most`). */
export function differences(before: unknown, after: unknown, most = 8): string[] {
  const out: string[] = [];
  const show = (v: unknown) => {
    const s = JSON.stringify(v);
    return s === undefined ? 'nothing' : s.length > 120 ? `${s.slice(0, 117)}…` : s;
  };
  const walk = (a: unknown, b: unknown, path: string) => {
    if (out.length >= most) return;
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
      if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
        out.push(`${path}: ${show(a)} → ${show(b)}`);
        return;
      }
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      return;
    }
    out.push(`${path}: ${show(a)} → ${show(b)}`);
  };
  walk(plain(before), plain(after), '');
  return out;
}
