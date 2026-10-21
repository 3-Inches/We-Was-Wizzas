// The mechanics reference against the books: every entry's heading is where it says, and the
// section the app cuts out holds its quotes (the same check build_mechanics.py makes, run on what
// the app actually ships and with the app's own section code).
import { describe, expect, it } from 'vitest';
import { BOOK_BY_ID } from './constants';
import { headingOf, sectionLines } from '../ui/bookText';
import type { MechanicsArea, MechanicsIndex } from './mechanicsTypes';
import index from './generated/mechanics/index.json';

// the books as the reader gets them (scripts/copy-books.mjs copies these folders), and the area files
const bookFiles = import.meta.glob<string>(['../../../reviewed/*.md', '../../../wip/*.md'], { query: '?raw', import: 'default', eager: true });
const areaFiles = import.meta.glob<MechanicsArea>('./generated/mechanics/*.json', { import: 'default', eager: true });
const books = new Map<string, string[]>();
function bookLines(id: string): string[] | null {
  const book = BOOK_BY_ID[id];
  if (!book) return null;
  if (!books.has(id)) {
    const text = Object.entries(bookFiles).find(([path]) => path.endsWith(`/${book.file}`))?.[1];
    books.set(id, text ? text.split(/\r?\n/) : []);
  }
  return books.get(id)!;
}
const norm = (s: string) => s.replace(/[*_\\]/g, '').replace(/^>\s?/gm, '').replace(/\s+/g, ' ');

describe('mechanics reference', () => {
  const idx = index as unknown as MechanicsIndex;
  const areas = idx.areas.map((a) => areaFiles[`./generated/mechanics/${a.id}.json`]);
  const entries = areas.flatMap((a) => [...a.groups, ...a.gated].flatMap((g) => g.entries));

  it('has every area the index lists, with matching counts', () => {
    for (const [i, a] of areas.entries()) {
      const s = idx.areas[i];
      expect(a.id).toBe(s.id);
      expect([...a.groups, ...a.gated].map((g) => g.entries.length)).toEqual([...s.groups, ...s.gated].map((g) => g.counts[0]));
    }
    expect(new Set(entries.map((e) => e.id)).size).toBe(idx.total);
  });

  it('points every entry at a heading in a known book', () => {
    const bad = entries.filter((e) => {
      const ls = bookLines(e.book);
      return !ls || !headingOf(ls[e.line - 1]) || (e.endLine !== undefined && e.endLine < e.line);
    });
    expect(bad.map((e) => `${e.id} ${e.title}`)).toEqual([]);
  });

  it('finds each quote in the section the app shows', () => {
    const bad: string[] = [];
    for (const e of entries) {
      const text = norm(sectionLines(bookLines(e.book)!, e.line, e.endLine).join(' '));
      for (const q of e.quotes ?? []) if (!text.includes(norm(q))) bad.push(`${e.id}: ${q.slice(0, 60)}`);
    }
    expect(bad).toEqual([]);
  });

  it('links "see also" notes only to mechanics that exist', () => {
    const ids = new Set(entries.map((e) => e.id));
    const groups = new Set(idx.areas.flatMap((a) => [...a.groups, ...a.gated].map((g) => `/mechanics/${a.id}/${g.id}`)));
    for (const e of entries)
      for (const r of e.related ?? [])
        if (r.to) {
          const [path, id] = r.to.split('#');
          expect(groups.has(path) && ids.has(id), r.to).toBe(true);
        }
  });
});
