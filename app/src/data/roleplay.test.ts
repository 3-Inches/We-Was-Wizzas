// The Guide's roleplay pages: every "From the books" pointer lands on the heading it names, the
// outside links are well-formed, and the text keeps to the readable shape the Guide asks of it
// (short sentences, short paragraphs), so it cannot drift back into an inventory.

import { describe, expect, it } from 'vitest';
import { BOOK_BY_ID } from './constants';
import { headingOf } from '../ui/bookText';
import { PLAYER_GUIDE, ROLEPLAY_GUIDES, STORYGUIDE_GUIDE, type RpBlock } from './roleplay';

const bookFiles = import.meta.glob<string>(['../../../reviewed/*.md', '../../../wip/*.md'], { query: '?raw', import: 'default', eager: true });
const cache = new Map<string, string[]>();
function bookLines(id: string): string[] {
  if (!cache.has(id)) {
    const file = BOOK_BY_ID[id]?.file;
    const text = Object.entries(bookFiles).find(([path]) => path.endsWith(`/${file}`))?.[1];
    cache.set(id, text ? text.split(/\r?\n/) : []);
  }
  return cache.get(id)!;
}

/** Every run of prose in a block, for the readability checks. */
function texts(b: RpBlock): string[] {
  if ('p' in b) return [b.p];
  if ('heading' in b) return [];
  if ('points' in b) return b.points.map(([lead, text]) => `${lead} ${text}`);
  if ('list' in b) return b.list;
  if ('table' in b) return b.table.rows.flat();
  if ('tryThis' in b) return [b.tryThis];
  return [b.inApp];
}
const plain = (s: string) => s.replace(/\*+/g, '');
const words = (s: string) => plain(s).split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => plain(s).split(/(?<=[.?!])\s+(?=[A-Z“])/);

describe('the roleplay pages of the Guide', () => {
  const sections = ROLEPLAY_GUIDES.flatMap((g) => g.sections.map((s) => ({ g, s })));

  it('has both pages, with sections of unique ids and a summary each', () => {
    expect(PLAYER_GUIDE.sections.length).toBeGreaterThanOrEqual(8);
    expect(STORYGUIDE_GUIDE.sections.length).toBeGreaterThanOrEqual(8);
    for (const g of ROLEPLAY_GUIDES) {
      expect(new Set(g.sections.map((s) => s.id)).size).toBe(g.sections.length);
      for (const s of g.sections) {
        expect(s.summary.length, `${g.id}/${s.id} summary`).toBeGreaterThan(10);
        expect(s.blocks.length, `${g.id}/${s.id} blocks`).toBeGreaterThan(0);
      }
    }
  });

  it('points every source at the heading it names, in a known book', () => {
    const bad: string[] = [];
    for (const { g, s } of sections) {
      for (const src of s.sources ?? []) {
        const lines = bookLines(src.book);
        const h = headingOf(lines[src.line - 1]);
        if (!h || !h.text.replace(/[*_\\]/g, '').toLowerCase().includes(src.label.toLowerCase())) bad.push(`${g.id}/${s.id}: ${src.book} line ${src.line} is “${lines[src.line - 1]?.slice(0, 60)}”, not “${src.label}”`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('gives every section drawn from the books at least one source', () => {
    for (const { g, s } of sections) expect((s.sources?.length ?? 0) + (s.links?.length ?? 0), `${g.id}/${s.id}`).toBeGreaterThan(0);
  });

  it('links outside only by https, each with a label', () => {
    for (const { s } of sections) {
      for (const l of s.links ?? []) {
        expect(l.url).toMatch(/^https:\/\/[a-z0-9.-]+\//);
        expect(l.label.length).toBeGreaterThan(3);
      }
    }
  });

  it('keeps sentences and paragraphs short', () => {
    const long: string[] = [];
    for (const { g, s } of sections) {
      for (const b of s.blocks) {
        for (const t of texts(b)) {
          if (words(t) > 85) long.push(`${g.id}/${s.id}: a block of ${words(t)} words: “${t.slice(0, 50)}…”`);
          for (const x of sentences(t)) if (words(x) > 40) long.push(`${g.id}/${s.id}: a sentence of ${words(x)} words: “${x.slice(0, 50)}…”`);
        }
      }
    }
    expect(long).toEqual([]);
  });

  it('uses no parentheses inside parentheses', () => {
    for (const { g, s } of sections) for (const b of s.blocks) for (const t of texts(b)) expect(/\([^)]*\(/.test(t), `${g.id}/${s.id}: ${t.slice(0, 40)}`).toBe(false);
  });
});
