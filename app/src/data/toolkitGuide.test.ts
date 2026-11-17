// The Guide's "Using the toolkit" page: held to the design principles' rules for text (principle 7)
// and to roadmap 1.5's targets, and each system from a book written as steps (principle 8).

import { describe, expect, it } from 'vitest';
import { TOOLKIT_GUIDE } from './toolkitGuide';
import { guideTexts, plain, sentences, words } from './guideText';
import { DICE_SUBS, TABLE_TABS } from '../ui/routes';
import { DICE_LABELS } from '../ui/play';

const texts = guideTexts(TOOLKIT_GUIDE);

/** The sections for a system from a book, each written as numbered steps with a bold lead. */
const SYSTEMS = ['covenant', 'characters', 'magic', 'lab', 'seasons', 'dice', 'divine', 'church', 'faerie', 'mysteries', 'hedge', 'projects', 'city', 'tribunal'];

describe('the Guide’s toolkit page', () => {
  it('stays under 6,000 words', () => {
    expect(texts.reduce((t, x) => t + words(x.text), 0)).toBeLessThan(6000);
  });

  it('keeps sentences under 40 words and blocks under 85', () => {
    const long: string[] = [];
    for (const { section, text } of texts) {
      if (words(text) > 85) long.push(`${section}: a block of ${words(text)} words: “${text.slice(0, 50)}…”`);
      for (const x of sentences(text)) if (words(x) > 40) long.push(`${section}: a sentence of ${words(x)} words: “${x.slice(0, 50)}…”`);
    }
    expect(long).toEqual([]);
  });

  it('uses no parentheses inside parentheses', () => {
    for (const { section, text } of texts) expect(/\([^)]*\(/.test(plain(text)), `${section}: ${text.slice(0, 40)}`).toBe(false);
  });

  it('has sections of unique ids, each with a one-line summary', () => {
    const ids = TOOLKIT_GUIDE.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of TOOLKIT_GUIDE.sections) expect(words(s.summary), s.id).toBeLessThanOrEqual(16);
  });

  it('writes each system as numbered steps, each led in bold', () => {
    for (const id of SYSTEMS) {
      const s = TOOLKIT_GUIDE.sections.find((x) => x.id === id);
      expect(s, id).toBeDefined();
      const steps = s!.blocks.filter((b) => 'list' in b && b.ordered);
      expect(steps.length, `${id} has no numbered steps`).toBeGreaterThan(0);
      for (const b of steps) for (const item of 'list' in b ? b.list : []) expect(item, id).toMatch(/^\*\*[^*]+\*\*/);
    }
  });

  it('links only to the toolkit’s own pages or by https', () => {
    for (const { section, text } of texts) {
      for (const m of text.matchAll(/\]\(([^)]*)\)/g)) expect(m[1], section).toMatch(/^(#\/[a-z/?=A-Z]*|https:\/\/[a-z0-9.-]+\/)/);
    }
  });

  it('names the Game Table’s pages and the Dice page’s parts as the toolkit does', () => {
    const table = TOOLKIT_GUIDE.sections.find((s) => s.id === 'table')!;
    const rows = table.blocks.flatMap((b) => ('table' in b ? b.table.rows.map((r) => r[0]) : []));
    expect(rows.length).toBe(TABLE_TABS.length);
    const all = texts.map((x) => x.text).join(' ');
    for (const id of DICE_SUBS) if (id !== 'roll') expect(all, DICE_LABELS[id]).toContain(`Dice › ${DICE_LABELS[id]}`);
  });
});
