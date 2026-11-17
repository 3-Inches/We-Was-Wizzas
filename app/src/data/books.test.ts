// The books on the reader's shelves against the book files in the repository and the extractors'
// registry (tools/extract/books.py). When upstream adds, moves or renames a book, this fails and
// says which: see tools/books/README.md.
import { describe, expect, it } from 'vitest';
import { BOOKS, BOOK_BY_ID, BOOK_SHELVES, REFERENCE_BOOKS, readOnlyMark } from './constants';
import { bookUrl } from '../ui/bookText';

// the files' paths only: nothing is loaded
const files = Object.keys(import.meta.glob(['../../../reviewed/*.md', '../../../wip/*.md', '../../../3rd-party/*.md'])).map((p) => p.replace(/^(\.\.\/)+/, ''));
const registry = Object.values(import.meta.glob<string>('../../../tools/extract/books.py', { query: '?raw', import: 'default', eager: true }))[0];

/** id -> path, for every book books.py lists (BOOKS and REFERENCE_BOOKS) */
const registered = new Map([...registry.matchAll(/\(\s*"([^"]+)",\s*"((?:reviewed|wip|3rd-party)\/[^"]+)"/g)].map((m) => [m[1], m[2]]));
const leftOut = [...(registry.match(/NOT_REGISTERED = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const all = [...BOOKS, ...REFERENCE_BOOKS];

describe('the books', () => {
  it('finds the book files and the registry', () => {
    expect(files.length).toBeGreaterThan(60);
    expect(registered.size).toBeGreaterThan(60);
  });

  it('every book file in the repository is on a shelf, or is left out on purpose', () => {
    const known = new Set([...registered.values(), ...leftOut]);
    expect(files.filter((f) => !known.has(f))).toEqual([]);
  });

  it('every registered book has its file, where the registry says it is', () => {
    expect([...registered.values(), ...leftOut].filter((p) => !files.includes(p))).toEqual([]);
  });

  it('the app lists the same books as the registry, each once', () => {
    expect(all.map((b) => b.id).sort()).toEqual([...registered.keys()].sort());
    expect(new Set(all.map((b) => b.id)).size).toBe(all.length);
    expect(Object.keys(BOOK_BY_ID).length).toBe(all.length);
    for (const b of all) expect(registered.get(b.id)?.split('/')[1], b.id).toBe(b.file);
  });

  it('every book’s address is one a static server finds: decoded as a whole address, it is the file’s name', () => {
    // Lands of the Nile and Land of Fire & Ice have a comma in their names
    for (const b of all) expect(decodeURI(bookUrl(b.file)), b.id).toBe(`books/${b.file}`);
  });

  it('a book is marked as transcription in progress exactly when it is in wip/', () => {
    for (const b of all) expect(b.status, b.id).toBe(registered.get(b.id)!.startsWith('wip/') ? 'wip' : 'reviewed');
  });

  it('only Fifth Edition books are sources of rules: the others are for reading, and say so', () => {
    for (const b of BOOKS) {
      expect(registered.get(b.id), b.id).toMatch(/^(reviewed|wip)\/Ars Magica (5e -|- Definitive Edition)/);
      expect(readOnlyMark(b), b.id).toBe('');
    }
    for (const b of REFERENCE_BOOKS) {
      expect(readOnlyMark(b), b.id).not.toBe('');
      if (b.category === 'earlier') expect(b.file, b.id).toMatch(b.abbr === 'ArM3' ? /^Ars Magica 3e / : /^Ars Magica 4e /);
      else expect(registered.get(b.id), b.id).toMatch(/^3rd-party\//);
    }
    expect(BOOK_SHELVES.flatMap((s) => s.books).length).toBe(all.length);
    expect(BOOK_SHELVES.filter((s) => s.books !== BOOKS).every((s) => s.note)).toBe(true);
  });
});
