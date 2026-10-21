// The books' markdown, as the reader and the mechanics reference load it: fetched once from
// public/books (copied there by scripts/copy-books.mjs) and kept, with helpers to cut out the
// section under a heading or a sidebar.

import { useEffect, useState } from 'react';
import { BOOK_BY_ID } from '../data';

/** Lines of each book file, by file name. */
export const bookCache = new Map<string, string[]>();
const pending = new Map<string, Promise<string[]>>();

export function loadBookLines(file: string): Promise<string[]> {
  const hit = bookCache.get(file);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(file);
  if (!p) {
    p = fetch(`books/${encodeURIComponent(file)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((t) => {
        const ls = t.split(/\r?\n/);
        bookCache.set(file, ls);
        return ls;
      })
      .finally(() => pending.delete(file));
    pending.set(file, p);
  }
  return p;
}

/** A markdown heading: its level, its text, and whether it opens a sidebar ("> ### Title"). */
export function headingOf(line: string | undefined): { level: number; text: string; sidebar: boolean } | null {
  if (line === undefined) return null;
  const m = /^(>\s*)?(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
  return m ? { level: m[2].length, text: m[3], sidebar: !!m[1] } : null;
}

/**
 * The lines of a section: from its heading (1-based `line`) to `endLine` if given; otherwise to
 * the next heading of the same or a higher level, or, for a sidebar, to the end of the
 * blockquote. A sidebar's "> " markers are taken off so it reads as plain text.
 */
export function sectionLines(lines: string[], line: number, endLine?: number): string[] {
  const start = Math.max(0, line - 1);
  const h = headingOf(lines[start]);
  let end: number;
  if (endLine) end = Math.min(lines.length, endLine);
  else if (h?.sidebar) {
    end = start + 1;
    while (end < lines.length && /^>/.test(lines[end])) end++;
  } else {
    end = start + 1;
    let inCode = false;
    for (; end < lines.length; end++) {
      if (lines[end].startsWith('```')) inCode = !inCode;
      if (inCode) continue;
      const n = headingOf(lines[end]);
      if (n && !n.sidebar && h && n.level <= h.level) break;
    }
  }
  const out = lines.slice(start, end);
  return h?.sidebar || out.every((l) => !l.trim() || /^>/.test(l)) ? out.map((l) => l.replace(/^>\s?/, '')) : out;
}

/** The text of a book section, loaded when `enabled` turns true. */
export function useBookSection(bookId: string, line: number, endLine: number | undefined, enabled: boolean) {
  const book = BOOK_BY_ID[bookId];
  const [state, setState] = useState<{ text?: string; error?: string }>({});
  useEffect(() => {
    if (!enabled || !book) return;
    let live = true;
    loadBookLines(book.file)
      .then((ls) => live && setState({ text: sectionLines(ls, line, endLine).join('\n') }))
      .catch((e) => live && setState({ error: `Could not load ${book.title} (${(e as Error).message}).` }));
    return () => {
      live = false;
    };
  }, [enabled, book, line, endLine]);
  return { ...state, loading: enabled && !state.text && !state.error };
}
