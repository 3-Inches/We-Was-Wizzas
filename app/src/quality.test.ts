// Limits that may only go down, and two ceilings. The toolkit's older writing and largest files do not
// yet meet the design principles (docs/design-principles.md); the limits record where they stand so that
// they cannot get worse. When you improve one, lower its limit to the new value. Never raise a limit to
// make a change pass: shorten something else instead.
// The README and the Guide's toolkit page have ceilings instead, set by the owner (19 November 2026): room
// to grow, at most 300 words a pull request each (CLAUDE.md), so new systems are not written in by
// cutting what is there.

import { describe, expect, it } from 'vitest';
import { APP_PLACES } from './data/appPlaces';
import index from './data/generated/mechanics/index.json';
import { TOURS } from './ui/tour/tours';
import { TOOLKIT_GUIDE } from './data/toolkitGuide';
import { guideTexts, sentences as guideSentences, words as guideWords } from './data/guideText';

const raw = (glob: Record<string, unknown>) => Object.entries(glob as Record<string, string>);
const readme = raw(import.meta.glob('../README.md', { query: '?raw', import: 'default', eager: true }))[0][1];
const sources = raw(import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./data/generated/**'], { query: '?raw', import: 'default', eager: true }));

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** The Guide's paragraphs and list items as plain text (src/data/toolkitGuide.ts). */
function guideBlocks(): string[] {
  return guideTexts(TOOLKIT_GUIDE).map((x) => x.text);
}

// ------------------------------------------------------------------------------------------------
// The limits. Lower them as the text improves.

const LIMITS = {
  /** its longest sentence, in words (the principle is 40) */
  guideLongestSentence: 34,
  /** its paragraphs over 85 words (the principle) */
  guideLongBlocks: 0,
  /** tutorial steps over 60 words (they fill a phone's screen and hide the control; roadmap 1.7) */
  tutorialLongSteps: 0,
  /** the longest tutorial step, in words */
  tutorialLongestStep: 60,
  /** the README's longest line, in characters */
  readmeLongestLine: 431,
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
  'src/ui/pages/HolyPart.tsx',
  'src/ui/pages/MarketPage.tsx',
  'src/ui/pages/QuickBuildPage.tsx',
];

describe('limits that may only go down', () => {
  const blocks = guideBlocks();
  const steps = TOURS.flatMap((t) => t.steps.flatMap((s) => [s.body, ...(s.variants ?? []).map((v) => v.body)].map(words)));
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
    guideLongestSentence: Math.max(...blocks.flatMap((b) => guideSentences(b).map(guideWords))),
    guideLongBlocks: blocks.filter((b) => guideWords(b) > 85).length,
    tutorialLongSteps: steps.filter((n) => n > 60).length,
    tutorialLongestStep: Math.max(...steps),
    readmeLongestLine: Math.max(...readme.split('\n').map((l) => l.length)),
    topicsWithoutPointer: topics.filter((id) => !(APP_PLACES as Record<string, unknown>)[id]).length,
  };

  for (const k of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    it(`${k} is no worse than before`, () => {
      expect(measured[k], `${k} is ${measured[k]}; the limit is ${LIMITS[k]}. Shorten something, do not raise the limit.`).toBeLessThanOrEqual(LIMITS[k]);
    });
  }

  // ceilings, not limits: room to grow, at most 300 words a pull request (CLAUDE.md)
  const CEILINGS = {
    /** the Guide's "Using the toolkit" page, in words (roadmap 1.5 asked for under 6,000) */
    guideWords: { at: blocks.reduce((t, b) => t + guideWords(b), 0), most: 6000 },
    /** the README, in words */
    readmeWords: { at: words(readme), most: 5000 },
  };
  for (const [k, { at, most }] of Object.entries(CEILINGS)) {
    it(`${k} is under its ceiling`, () => {
      expect(at, `${k} is ${at}; the ceiling is ${most}. Shorten something before raising it.`).toBeLessThanOrEqual(most);
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

// ------------------------------------------------------------------------------------------------
// What follows Warping (Twilight, the Witch Moon, Nátt-thel, Faerie Calling) is owed on the Resolve list by
// gainWarping (engine/warping.ts). These files change Warping Points (a character's, a season entry's, a
// covenfolk's) another way, each for its reason.
const RAW_WARPING: Record<string, string> = {
  'src/engine/warping.ts': 'gainWarping itself',
  'src/engine/folkWitch.ts': 'witchWarping, which gainWarping calls for a folk witch',
  'src/engine/longterm.ts': 'applySeason: a season entry’s points, on and off; seasonWarping owes what follows',
  'src/engine/unlog.ts': 'Unlog takes a season’s points off',
  'src/engine/time.ts': 'a living covenant’s people, for whom nothing is owed; a season entry’s points, with seasonWarping',
  'src/ui/character/sheet/AdvancementTab.tsx': 'a season logged by hand: its points on the entry, with seasonWarping',
  'src/engine/projects.ts': 'a project worked with no season given',
  'src/engine/experiment.ts': 'it counts the points; its caller adds them',
  'src/engine/labRoutines.ts': 'a point a few seasons: prolonged, and only magi keep lab routines',
  'src/engine/effects.ts': 'a powerful effect’s point: prolonged; and taken off when it ends',
  'src/engine/rituals.ts': 'covenfolk with no sheet; and a cast taken back',
  'src/engine/covenantBoons.ts': 'Distorted Covenfolk, as they are made',
  'src/engine/generate/character.ts': 'a generated character’s past',
  'src/engine/character/factory.ts': 'a new magus’s House point',
  'src/engine/character/fixes.ts': 'a fix to a character being made',
  'src/engine/character/statBlock.ts': 'a character read from a stat block',
  'src/ui/character/steps/DetailsStep.tsx': 'a character being made',
  'src/ui/character/steps/ReviewStep.tsx': 'a character being finished: its Virtues’ points',
  'src/ui/AfterRoll.tsx': 'a botch die rerolled: its points taken off',
  'src/ui/covenant/CovenantEffects.tsx': 'a caster with no sheet to derive',
  'src/ui/character/sheet/OriginalResearch.tsx': 'a magus with no sheet to derive',
  'src/ui/character/sheet/Twilight.tsx': 'Twilight’s own card',
  'src/ui/pages/FolkWitchPart.tsx': 'the Witch Moon’s own card',
  'src/ui/pages/VitkirPart.tsx': 'Nátt-thel’s own card',
  'src/ui/pages/HolyPart.tsx': 'the Divine Ascent, rolled on its own card',
};

// any change to Warping Points: `x.warpingPoints += n`, `= n`, `-= n`, `++`, and a season entry's `e.warpingPoints = n`
const CHANGES_WARPING = /(?<!(?:let|const|var)\s+)\bwarpingPoints\s*(?:[-+*/]?=(?!=)|\+\+|--)|(?:\+\+|--)\s*[\w.?!]*\bwarpingPoints\b/;

describe('Warping', () => {
  it('is changed through gainWarping, so what follows it is not forgotten', () => {
    const raw = sources.filter(([, text]) => CHANGES_WARPING.test(text)).map(([path]) => path.replace(/^\.\//, 'src/'));
    expect(raw.filter((p) => !RAW_WARPING[p]), 'add Warping Points with gainWarping (engine/warping.ts), or give the reason here').toEqual([]);
    expect(Object.keys(RAW_WARPING).filter((p) => !raw.includes(p)), 'these no longer change Warping Points directly: take them off RAW_WARPING').toEqual([]);
  });

  it('catches each way of changing the points', () => {
    for (const t of ['c.warpingPoints += 2', 'x.warpingPoints = v', 'c.warpingPoints -= 1', 'c.warpingPoints++', '++c.warpingPoints', 'e.warpingPoints = warping', 'entry.warpingPoints=visBotch'])
      expect(CHANGES_WARPING.test(t), t).toBe(true);
    for (const t of ['const warpingPoints = 0', 'let warpingPoints = 0', 'c.warpingPoints === 2', 'c.warpingPoints >= 5', '{ warpingPoints: 5 }'])
      expect(CHANGES_WARPING.test(t), t).toBe(false);
  });
});
