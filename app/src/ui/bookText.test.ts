import { describe, expect, it } from 'vitest';
import { findAnchor, parseBook } from './bookText';
import { tableRowAt } from './tables';

const files = import.meta.glob<string>('../../../reviewed/Ars Magica - Definitive Edition (Core Rules).md', { query: '?raw', import: 'default', eager: true });
const lines = Object.values(files)[0].split(/\r?\n/);
const { headings, sections } = parseBook(lines);

describe('the reader finds what the Definitive Edition links to', () => {
  it('every link in the book opens its heading, but for the book’s own wrong links', () => {
    const links = [...lines.join('\n').matchAll(/\]\(#([^)\s]+)\)/g)].map((m) => decodeURIComponent(m[1]));
    expect(links.length).toBeGreaterThan(3000);
    const dead = [...new Set(links.filter((l) => !findAnchor(headings, l)))].sort();
    // links whose heading the book spells otherwise, or does not have
    expect(dead).toEqual(
      [
        'attack-advantage',
        'buran-of-yenghissar-the',
        'failed-monknun',
        'gydryty-kom-the-giant',
        'head-and-corrosion',
        'latent-magical-ability',
        'story-flaws',
        'templar-confrereconsoeur',
        'true-love-npc',
        'unraveling-the-fabric-of-form',
      ].sort(),
    );
  });

  it('a heading in a sidebar is found, and opens no section of its own', () => {
    const h = findAnchor(headings, 'ability-roll');
    expect(lines[h!.line]).toBe('> ## Ability Roll:');
    expect(h!.sidebar).toBe(true);
    expect(sections.some((s) => s.start === h!.line)).toBe(false);
    expect(lines[findAnchor(headings, 'medium-covenant')!.line]).toBe('> ### Medium Covenant');
  });

  it('a repeated heading is numbered across sidebars too, as the book’s links count it', () => {
    const second = findAnchor(headings, 'example-darius-of-flambeau-1');
    expect(second).toBeDefined();
    expect(second!.slug).toBe('example-darius-of-flambeau-1');
  });
});

describe('tableRowAt', () => {
  const t = ['text', '', '| Entry | Page |', '| --- | --- |', '| Abilities | 27 |', '| Aging | 170 |', 'after'];
  it('names the drawn body row of a line in a table, and none for its header', () => {
    expect(tableRowAt(t, 5)).toEqual({ start: 2, row: 1 });
    expect(tableRowAt(t, 4)).toEqual({ start: 2, row: 0 });
    expect(tableRowAt(t, 2)).toEqual({ start: 2, row: null });
    expect(tableRowAt(t, 0)).toBeNull();
  });
  it('counts every row of a table with no header', () => {
    expect(tableRowAt(['| a | b |', '| c | d |'], 1)).toEqual({ start: 0, row: 1 });
  });
});
