// Batch F, item 4: every string shown as the book's is the book's. A Virtue's or Flaw's text (the
// book-text place of `VFText`) is found in its own book; a `restrictionText`, a `need.quote` and a
// quotation in the toolkit's code are found in a Fifth Edition book; a comment that quotes a book at a
// line is found in that book. Spacing, quotation marks, dashes and markdown are normalized, and a cut
// inside a quotation shows "…". A quotation that ends a sentence where the book goes on is a cut too:
// the period is kept, so it is not found. The test cannot see a cut that changes the meaning; the
// review and the tests of behavior must.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '.';
import { BOOK_BY_ID } from './constants';

const bookFiles = import.meta.glob<string>(['../../../reviewed/*.md', '../../../wip/*.md'], { query: '?raw', import: 'default', eager: true });
const sourceFiles = import.meta.glob<string>(['../**/*.ts', '../**/*.tsx', '!../data/generated/**', '!../**/zz_*'], { query: '?raw', import: 'default', eager: true });

/** Words, numbers and stops only: markdown, escapes, the kind of quotation mark and dash, and spacing do not count. */
export const norm = (s: string) =>
  s
    .replace(/([a-z])-\n+\s*([a-z])/g, '$1$2') // a word the book breaks across lines ("con-" / "stant", BS&S line 5104)
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/\\([*_[\]()#.!-])/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/[’‘“”"]/g, "'")
    .replace(/[—–−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Fifth Edition books only: the Third and Fourth Editions' are for their setting. */
const books = new Map(
  Object.entries(bookFiles)
    .filter(([p]) => !/Ars Magica [34]e /.test(p))
    .map(([p, t]) => [p.split('/').pop()!, norm(t)]),
);
const all = [...books.values()];

/** Is `quote` in one of the books, its parts in order where it is cut with "…"? */
export function found(quote: string, hay: string[]): boolean {
  const parts = norm(quote).split(/\s*(?:…|\.\.\.)\s*/).filter((x) => x.length > 0);
  return hay.some((h) => {
    let at = 0;
    for (const p of parts) {
      const i = h.indexOf(p, at);
      if (i < 0) return false;
      at = i + p.length;
    }
    return true;
  });
}

const data = buildGameData();

/** The toolkit's own words in curly quotes, which are no quotation of a book ("a label in curly quotes is not a quotation", CLAUDE.md). */
const NOT_QUOTED: [file: string, text: string, why: string][] = [
  ['roleplay.ts', 'the Tuesday after Michaelmas', 'an example of how a date is said'],
  ['roleplay.ts', 'do not trust this person', 'what the Gift says to those who meet a magus, in the toolkit’s words'],
  ['roleplay.ts', 'Primer for New Players', 'the title of a web page'],
  ['RecoveryCard.tsx', 'gives their season to it', 'the toolkit’s own checkbox'],
  ['divine.ts', 'work wonders through prayer', 'the guided build’s own question'],
];

/** Each curly-quoted string of 20 or more characters on a line of code that is not a comment. */
function codeQuotations(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const [path, src] of Object.entries(sourceFiles)) {
    if (/\.test\.tsx?$/.test(path)) continue;
    src.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const m of line.matchAll(/“([^”]{20,})”/g)) out.push({ where: `${path}:${i + 1}`, text: m[1].replace(/\$\{[^}]*\}/g, '…') });
    });
  }
  return out;
}

/** A book named in a comment ("DE", "HoH: MC", "RoP: Faerie", "Hedge Magic"), as a file. */
function bookFile(name: string): string | undefined {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9&]/g, '');
  const n = key(name.split(',')[0]);
  const b = Object.values(BOOK_BY_ID).find((x) => key(x.abbr) === n || key(x.id) === n || key(x.title) === n || key(x.title).startsWith(n));
  return b?.file;
}

describe('the book’s words, checked', () => {
  it('finds the Fifth Edition books, and no earlier one', () => {
    expect(books.size).toBeGreaterThan(40);
    expect([...books.keys()].some((f) => /Ars Magica [34]e /.test(f))).toBe(false);
  });

  it('each Virtue’s and Flaw’s text is in its own book', () => {
    const misses = data.virtuesFlaws.flatMap((v) => {
      if (v.textIsSummary) return [];
      const own = [v.source, ...(v.alsoIn ?? [])].map((s) => books.get(BOOK_BY_ID[s.book]?.file ?? '')).filter((x): x is string => !!x);
      if (!own.length) return [`${v.id}: no Fifth Edition book (${v.source.book})`];
      return found(v.text, own) ? [] : [`${v.id} [${v.source.book} line ${v.source.line}]: ${v.text.slice(0, 80)}`];
    });
    expect(misses).toEqual([]);
  });

  it('a summary in the toolkit’s words is marked as one, and is the only one (Ceremony)', () => {
    expect(data.virtuesFlaws.filter((v) => v.textIsSummary).map((v) => v.id)).toEqual(['ceremony']);
  });

  it('each restrictionText and need.quote is a book’s', () => {
    const misses = data.virtuesFlaws.flatMap((v) => [
      ...(v.restrictionText && !found(v.restrictionText, all) ? [`${v.id} restrictionText: ${v.restrictionText.slice(0, 80)}`] : []),
      ...(v.needs ?? []).filter((n) => n.quote && !found(n.quote, all)).map((n) => `${v.id} need.quote: ${n.quote!.slice(0, 80)}`),
    ]);
    expect(misses).toEqual([]);
  });

  it('each quotation in the code is a book’s, but for the toolkit’s own words on a short list', () => {
    const qs = codeQuotations();
    expect(qs.length).toBeGreaterThan(5);
    const own = (q: { where: string; text: string }) => NOT_QUOTED.some(([f, t]) => q.where.includes(`/${f}:`) && q.text === t);
    expect(qs.filter((q) => !own(q) && !found(q.text, all)).map((q) => `${q.where}: ${q.text.slice(0, 80)}`)).toEqual([]);
    // the list holds only what is still in the code, and nothing a book says
    for (const [f, t] of NOT_QUOTED) {
      expect(qs.some((q) => q.where.includes(`/${f}:`) && q.text === t), `${f}: “${t}” is still there`).toBe(true);
      expect(found(t, all), `“${t}” is a book’s after all`).toBe(false);
    }
  });

  it('a comment that quotes a book at a line quotes it word for word', () => {
    let checked = 0;
    const misses: string[] = [];
    for (const [path, src] of Object.entries(sourceFiles)) {
      for (const m of src.matchAll(/["“]([^"”\n]{15,})["”],? \(([^()\n]*?),? lines? (\d+)/g)) {
        const file = bookFile(m[2]);
        const book = file ? books.get(file) : undefined;
        if (!book) continue;
        checked++;
        if (!found(m[1], [book])) misses.push(`${path} [${m[2]} line ${m[3]}]: ${m[1].slice(0, 80)}`);
      }
    }
    expect(checked).toBeGreaterThan(20);
    expect(misses).toEqual([]);
  });

  it('finds a cut with no “…”, a word changed, and a sentence ended where the book goes on', () => {
    const divine = [books.get(BOOK_BY_ID.RoP_D.file)!];
    const line = 'You may subtract your score in Meditation from your roll to avoid Divine Ascent, and this does not increase the number of additional Warping points you receive from the experience.';
    expect(found(line, divine)).toBe(true);
    // AscentCard as it was: the sentence stops before "from the experience"
    expect(found(line.replace(' from the experience.', '.'), divine)).toBe(false);
    expect(found(line.replace('Meditation from your roll', 'Meditation from the roll'), divine)).toBe(false);
    expect(found(line.replace('to avoid Divine Ascent, and', 'to avoid…and'), divine)).toBe(true);
    expect(found(line.replace('your roll to avoid Divine Ascent, ', ''), divine)).toBe(false);
    // a pronoun changed is a word changed: the folk witch's "she"
    const hm = [books.get(BOOK_BY_ID.HMRE.file)!];
    expect(found('The folk witch can heal characters and has a score of 1 in the Supernatural Ability Healing (see later).', hm)).toBe(true);
    expect(found('The folk witch can heal characters and they have a score of 1 in the Supernatural Ability Healing (see later).', hm)).toBe(false);
    // a word the book breaks across lines
    expect(found('Use of this Virtue counts as a constant mystical effect with respect to Warping.', [books.get(BOOK_BY_ID.BSS.file)!])).toBe(true);
  });
});
