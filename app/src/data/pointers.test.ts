// Batch F, item 3: every Virtue, Flaw and Ability points at its own heading in its book. A heading
// with its name lies from 6 lines above the pointer to 2 below. A pointer to a section that holds it
// with others, or that describes it under another name, says so (`source.group`), and that heading
// must be there instead. The book's own misspellings of a heading are listed below.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '.';
import { BOOK_BY_ID } from './constants';
import type { SourceRef } from './types';

const bookFiles = import.meta.glob<string>(['../../../reviewed/*.md', '../../../wip/*.md'], { query: '?raw', import: 'default', eager: true });
const lines = new Map(Object.entries(bookFiles).map(([p, t]) => [p.split('/').pop()!, t.split('\n')]));

/** The book's own spelling of a heading, where it misprints the name (id -> the word as printed). */
const BOOK_TYPOS: Record<string, string> = {};

/** Words only (a hyphen is a space: "Brother-Knight", Church line 4565): the parenthesized part of a name ("Cursing (Folk Witch)") is the toolkit's, not the book's. */
export const headingWords = (s: string) =>
  ` ${s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[’']/g, "'").replace(/[^a-z0-9'&]+/g, ' ').replace(/\s+/g, ' ').trim()} `;

/** The heading a line of a book is, if any: a `#` heading (in a sidebar too), or a name set in bold on its own or before a colon. */
export function headingOf(line: string): string | undefined {
  const l = line.replace(/^(>\s*)+/, '');
  if (/^#/.test(l)) return l.replace(/^#+\s*/, '');
  return l.match(/^\*\*([^*]+)\*\*\s*(<br>)?\s*$/)?.[1] ?? l.match(/^\*\*([^*]+?):?\*\*:/)?.[1];
}

/** Is there a heading naming `name` from 6 lines above the pointer to 2 below? */
export function headingNear(book: string[], line: number, name: string): boolean {
  const n = headingWords(name).trim();
  for (let i = Math.max(1, line - 6); i <= line + 2; i++) {
    const h = book[i - 1] !== undefined ? headingOf(book[i - 1]) : undefined;
    // a heading may name them in the plural ("Mythic Companion: Zahids", RoP: The Divine line 5907)
    if (h && (headingWords(h).includes(` ${n} `) || headingWords(h).includes(` ${n}s `))) return true;
  }
  return false;
}

const data = buildGameData();

function misses(items: { id: string; name: string; source: SourceRef }[]): string[] {
  return items.flatMap(({ id, name, source }) => {
    const file = BOOK_BY_ID[source.book]?.file;
    const book = file ? lines.get(file) : undefined;
    if (!book || source.line === undefined) return [`${id}: no book or no line (${source.book})`];
    const heading = BOOK_TYPOS[id] ?? source.group ?? name;
    return headingNear(book, source.line, heading) ? [] : [`${id} "${heading}" at ${source.book} line ${source.line}: ${(book[source.line - 1] ?? '').slice(0, 60)}`];
  });
}

describe('every Virtue, Flaw and Ability points at its heading', () => {
  it('finds the books and the definitions', () => {
    expect(lines.size).toBeGreaterThan(50);
    expect(data.virtuesFlaws.length + data.abilities.length).toBeGreaterThan(1200);
  });

  it('each Virtue and Flaw', () => {
    expect(misses(data.virtuesFlaws.filter((v) => v.source.line !== undefined))).toEqual([]);
  });

  it('each Ability', () => {
    expect(misses(data.abilities.filter((a) => a.source.line !== undefined))).toEqual([]);
  });

  it('each second source of a Virtue, Flaw or Ability (`alsoIn`)', () => {
    const also = [...data.virtuesFlaws, ...data.abilities].flatMap((x) => (x.alsoIn ?? []).filter((s) => s.line !== undefined).map((source) => ({ id: x.id, name: x.name, source })));
    expect(also.length).toBeGreaterThan(0);
    expect(misses(also)).toEqual([]);
  });

  it('a typo on the list is still in its book, so the list stays short', () => {
    for (const [id, spelled] of Object.entries(BOOK_TYPOS)) {
      const v = data.vfById.get(id)!;
      expect(headingNear(lines.get(BOOK_BY_ID[v.source.book].file)!, v.source.line!, v.name), `${id} is now spelled as its name`).toBe(false);
      expect(spelled, id).not.toBe(v.name);
    }
  });

  it('finds a pointer that misses: the folk witch Abilities at Animal Ken, as they were', () => {
    const hm = lines.get(BOOK_BY_ID.HMRE.file)!;
    expect(headingNear(hm, 1763, 'Cursing (Folk Witch)')).toBe(false);
    expect(headingNear(hm, 1771, 'Cursing (Folk Witch)')).toBe(true);
    // a heading set in bold, and a name inside a longer heading does not count
    expect(headingNear(hm, 2965, 'Give (Gruagach)')).toBe(true);
    expect(headingNear(hm, 1602, 'Life-Linked Folk Witch Magic')).toBe(false);
  });
});
