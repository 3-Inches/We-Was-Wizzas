// Limits that may only go down. The toolkit's older writing and largest files do not yet meet the
// design principles (docs/design-principles.md); these numbers record where they stand so that they
// cannot get worse. When you improve one, lower its limit to the new value. Never raise a limit to
// make a change pass: shorten something else instead.

import { describe, expect, it } from 'vitest';
import { APP_PLACES } from './data/appPlaces';
import index from './data/generated/mechanics/index.json';
import { TOURS } from './ui/tour/tours';

const raw = (glob: Record<string, unknown>) => Object.entries(glob as Record<string, string>);
const guide = raw(import.meta.glob('./ui/pages/HelpPage.tsx', { query: '?raw', import: 'default', eager: true }))[0][1];
const readme = raw(import.meta.glob('../README.md', { query: '?raw', import: 'default', eager: true }))[0][1];
const sources = raw(import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./data/generated/**'], { query: '?raw', import: 'default', eager: true }));

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.split(/(?<=[.?!]) (?=[A-Z])/);

/** The Guide's paragraphs and list items as plain text. */
function guideBlocks(): string[] {
  const out: string[] = [];
  for (const m of guide.matchAll(/<(li|p)[ >]([\s\S]*?)<\/\1>/g)) {
    const t = m[2].replace(/\{[^{}]*\}/g, ' ').replace(/<[^>]+>/g, '').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (t.length >= 40) out.push(t);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// The limits. Lower them as the text improves.

const LIMITS = {
  /** the Guide's "Using the toolkit" page, in words (the audit asks for about half of this) */
  guideWords: 9510,
  /** its longest sentence, in words (the principle is 40) */
  guideLongestSentence: 247,
  /** its paragraphs over 150 words */
  guideLongBlocks: 13,
  /** tutorial steps over 70 words (they fill a phone's screen) */
  tutorialLongSteps: 56,
  /** the longest tutorial step, in words */
  tutorialLongestStep: 185,
  /** the README, in characters (rounded up a little, so a line of news can be swapped in) */
  readmeChars: 123800,
  /** the README's longest line, in characters */
  readmeLongestLine: 11467,
  /** Game Mechanics topics with no "In the app" pointer */
  topicsWithoutPointer: 56,
};

/** Source files over 800 lines. A file may leave this list; none may join it. */
const BIG_FILES: string[] = [
  'src/engine/character/derive.ts',
  'src/engine/covenant.ts',
  'src/engine/guided/autobuild.ts',
  'src/engine/holy.ts',
  'src/engine/projects.ts',
  'src/engine/time.ts',
  'src/engine/types.ts',
  'src/ui/character/sheet/AdvancementTab.tsx',
  'src/ui/character/sheet/LabProjects.tsx',
  'src/ui/character/sheet/MagicTab.tsx',
  'src/ui/covenant/CovenfolkCards.tsx',
  'src/ui/covenant/FinancesTab.tsx',
  'src/ui/pages/HelpPage.tsx',
  'src/ui/pages/HolyPart.tsx',
  'src/ui/pages/MarketPage.tsx',
  'src/ui/pages/QuickBuildPage.tsx',
  'src/ui/tour/tours.ts',
];

describe('limits that may only go down', () => {
  const blocks = guideBlocks();
  const steps = TOURS.flatMap((t) => t.steps.map((s) => words(s.body)));
  const topics: string[] = [];
  const walk = (o: unknown) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>;
      if (typeof r.id === 'string' && typeof r.title === 'string' && Array.isArray(r.counts)) topics.push(r.id);
      Object.values(r).forEach(walk);
    }
  };
  walk(index);
  const measured = {
    guideWords: blocks.reduce((t, b) => t + words(b), 0),
    guideLongestSentence: Math.max(...blocks.flatMap((b) => sentences(b).map(words))),
    guideLongBlocks: blocks.filter((b) => words(b) > 150).length,
    tutorialLongSteps: steps.filter((n) => n > 70).length,
    tutorialLongestStep: Math.max(...steps),
    readmeChars: readme.length,
    readmeLongestLine: Math.max(...readme.split('\n').map((l) => l.length)),
    topicsWithoutPointer: topics.filter((id) => !(APP_PLACES as Record<string, unknown>)[id]).length,
  };

  for (const k of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    it(`${k} is no worse than before`, () => {
      expect(measured[k], `${k} is ${measured[k]}; the limit is ${LIMITS[k]}. Shorten something, do not raise the limit.`).toBeLessThanOrEqual(LIMITS[k]);
    });
  }

  it('finds the Game Mechanics topics', () => {
    expect(topics.length).toBeGreaterThan(50);
  });

  it('lets no new source file grow past 800 lines', () => {
    const big = sources.filter(([, text]) => text.split('\n').length > 800).map(([path]) => path.replace(/^\.\//, 'src/'));
    expect(big.filter((p) => !BIG_FILES.includes(p)), 'a file passed 800 lines: split it (principle 12)').toEqual([]);
  });

  it('keeps the list of big files current', () => {
    const big = new Set(sources.filter(([, text]) => text.split('\n').length > 800).map(([path]) => path.replace(/^\.\//, 'src/')));
    expect(BIG_FILES.filter((p) => !big.has(p)), 'these are no longer over 800 lines: take them off BIG_FILES').toEqual([]);
  });
});
