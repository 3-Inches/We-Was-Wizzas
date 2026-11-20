// The books' markdown, as the reader and the mechanics reference load it: fetched once from
// public/books (copied there by scripts/copy-books.mjs) and kept, with helpers to cut out the
// section under a heading or a sidebar.

import { useEffect, useState } from 'react';
import { BOOK_BY_ID } from '../data';

/** Lines of each book file, by file name. */
export const bookCache = new Map<string, string[]>();
const pending = new Map<string, Promise<string[]>>();

/**
 * A book file's address. "&" and "," are left as they are: some static servers (Vite's among them)
 * decode a path as a whole address, which leaves "%26" and "%2C" alone, and then do not find the file.
 */
export const bookUrl = (file: string) => `books/${encodeURIComponent(file).replace(/%26/g, '&').replace(/%2C/g, ',')}`;

export function loadBookLines(file: string): Promise<string[]> {
  const hit = bookCache.get(file);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(file);
  if (!p) {
    p = fetch(bookUrl(file))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((t) => {
        // a server that does not have the file may answer with the app's own page
        if (/^\s*<!doctype html/i.test(t)) throw new Error('not found');
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

export interface BookHeading {
  line: number; // 0-based
  level: number;
  text: string;
  slug: string;
  /** a heading in a boxed sidebar ("> ### Title"): a link may point at it, but it opens no section */
  sidebar: boolean;
}

export interface BookSection {
  start: number;
  end: number; // exclusive
  heading: BookHeading;
}

/** GitHub-style heading slug (what the books' internal links use), with -1, -2 for duplicates. */
function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/**
 * A book's headings, in order, with the slugs its own links use, and the sections the reader shows
 * one at a time (one to a heading of level 3 or above, outside a sidebar). Headings in sidebars
 * count too: GitHub numbers a repeated slug across every heading, boxed or not.
 */
export function parseBook(lines: string[]): { headings: BookHeading[]; sections: BookSection[] } {
  const headings: BookHeading[] = [];
  const seen = new Map<string, number>();
  let inCode = false;
  lines.forEach((l, i) => {
    if (l.startsWith('```')) inCode = !inCode;
    if (inCode) return;
    const m = /^(>\s*)?(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    if (!m) return;
    const base = githubSlug(m[3]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    headings.push({ line: i, level: m[2].length, text: m[3].replace(/[*_]/g, ''), slug: n ? `${base}-${n}` : base, sidebar: !!m[1] });
  });
  const tops = headings.filter((h) => h.level <= 3 && !h.sidebar);
  const sections: BookSection[] = [];
  if (!tops.length || tops[0].line > 0)
    sections.push({ start: 0, end: tops[0]?.line ?? lines.length, heading: { line: 0, level: 1, text: 'Front matter', slug: 'front', sidebar: false } });
  tops.forEach((h, i) => sections.push({ start: h.line, end: tops[i + 1]?.line ?? lines.length, heading: h }));
  return { headings, sections };
}

function looseSlug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The heading a book's own link ("#some-heading") points at: by its slug, else by a looser match; none when the book's link is wrong. */
export function findAnchor(headings: BookHeading[], anchor: string): BookHeading | undefined {
  const a = anchor.replace(/^#/, '');
  return (
    headings.find((x) => x.slug === a) ??
    headings.find((x) => looseSlug(x.text) === looseSlug(a)) ??
    headings.find((x) => looseSlug(x.slug) === looseSlug(a.replace(/-\d+$/, ''))) ??
    // the link names the heading's first words ("#muqta" for "Muqta' (Muq-Ta')")
    headings.find((x) => looseSlug(x.slug).startsWith(`${looseSlug(a)}-`))
  );
}
