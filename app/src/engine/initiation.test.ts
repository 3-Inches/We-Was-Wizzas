// Mystery Initiation (DE; HoH: Mystery Cults): targets, Ordeal discounts, applying an Initiation, the
// House Mysteries in the Virtue list, the books' Scripts and the Criamon stations; words and gestures.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { CRIAMON_PATHS, CRIAMON_STATIONS, HOUSE_MYSTERIES, MYSTERY_SCRIPTS, scriptsFor } from '../data/mysteries';
import { addVirtue, newCharacter, setHouse } from './character/factory';
import { deriveCharacter } from './character/derive';
import { vfProblems } from './character/restrictions';
import { applyInitiation, baseTarget, criamonProgress, initiationTarget, ordealReduction, stationLoreNeeded, varyScript } from './initiation';
import { wordsGesturesModifier } from './magic';
import { DEFAULT_HOUSE_RULES, type Character, type InitiationRecord } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const rec = (o: Partial<InitiationRecord>): InitiationRecord => ({ uid: 'r', year: 1220, season: 'Spring', virtueId: 'x', virtueName: 'X', size: 'Minor', mystagogue: 'M', total: 15, target: 15, ...o });
const magus = (house: string) => {
  const c = newCharacter('magus', 's');
  setHouse(c, data, house, 0);
  return c;
};

describe('Initiation targets', () => {
  it('is 15 or 21 for a Virtue the Mystagogue has, 18 or 30 for one he does not', () => {
    expect([baseTarget('Minor', true), baseTarget('Major', true), baseTarget('Minor', false), baseTarget('Major', false)]).toEqual([15, 21, 18, 30]);
  });

  it('lowers the target after an Ordeal, less each time, and never below 9', () => {
    const major = [rec({ ordeal: 'Major', virtueName: 'Epitome' })];
    expect(ordealReduction(major).amount).toBe(9); // first Initiation after it
    expect(ordealReduction([...major, rec({})]).amount).toBe(6);
    expect(ordealReduction([...major, rec({}), rec({})]).amount).toBe(3);
    expect(ordealReduction([...major, rec({}), rec({}), rec({})]).amount).toBe(0);
    expect(initiationTarget('Minor', true, major).target).toBe(9); // 15 − 9 = 6, at least 9
    // only one Ordeal counts: the better one
    expect(ordealReduction([rec({ ordeal: 'Major' }), rec({ ordeal: 'Minor' })]).amount).toBe(6);
    expect(ordealReduction([], { tier: 'Medium', nth: 1 }).amount).toBe(6);
  });

  it('varies a Script on Int + Lore + stress die against 9', () => {
    const r = varyScript(2, 4, 'extend', () => 0.5); // die 5
    expect(r).toMatchObject({ total: 11, ease: 9, ok: true });
    expect(varyScript(2, 4, 'change', () => 0.5).ok).toBe(false); // 11 vs 12
  });
});

describe('applying an Initiation', () => {
  it('adds the Virtue free, the Ordeal Flaw, the record and the season', () => {
    const c = magus('bjornaer');
    applyInitiation(c, data, {
      virtueId: 'theriomorphy', size: 'Minor', mystagogue: 'Ulf', total: 16, target: 15, year: 1221, season: 'Summer',
      ordeal: { tier: 'Minor', text: 'gains a Minor Flaw', flawId: 'weak-magic-resistance-flaw', flawSize: 'Minor' },
    });
    expect(c.virtues.find((v) => v.defId === 'theriomorphy')).toMatchObject({ free: true, freeReason: 'Initiation' });
    expect(c.virtues.find((v) => v.defId === 'weak-magic-resistance-flaw')).toMatchObject({ free: true });
    expect(c.initiations).toHaveLength(1);
    expect(c.initiations![0]).toMatchObject({ ordeal: 'Minor', total: 16, target: 15 });
    expect(c.seasonLog.at(-1)?.summary).toContain('Theriomorphy');
    // the next Initiation is 3 easier
    expect(initiationTarget('Minor', true, c.initiations!).target).toBe(12);
  });

  it('can take a Virtue away, or make a Minor Flaw Major, as the Ordeal', () => {
    const c = magus('verditius');
    const v = addVirtue(c, data, 'puissant-art', 'Minor', 'Vi');
    applyInitiation(c, data, { virtueId: 'items-of-quality', size: 'Minor', mystagogue: 'M', total: 15, target: 15, year: 1220, season: 'Spring', ordeal: { tier: 'Minor', text: '', loseUid: v.uid } });
    expect(c.virtues.some((x) => x.uid === v.uid)).toBe(false);
  });
});

describe('the House Mysteries', () => {
  it('puts each House Mystery and Criamon station in the Virtue list, for its House', () => {
    for (const m of HOUSE_MYSTERIES) expect(data.vfById.get(m.id), m.id).toBeTruthy();
    const t = data.vfById.get('theriomorphy')!;
    expect(t.categories).toContain('Mystery');
    expect(t.houses).toEqual(['bjornaer']);
    for (const s of CRIAMON_STATIONS) expect(data.vfById.get(s.id)?.houses, s.id).toEqual(['criamon']);
    expect(new Set(HOUSE_MYSTERIES.map((m) => m.house))).toEqual(new Set(['bjornaer', 'merinita', 'verditius']));
  });

  it('warns when a magus of another House takes one', () => {
    const c = magus('tremere');
    const probs = vfProblems(d(c), data, data.vfById.get('theriomorphy')!);
    expect(probs.some((p) => p.code === 'house-only')).toBe(true);
  });

  it('finds the books’ Scripts for a Virtue', () => {
    expect(MYSTERY_SCRIPTS.length).toBeGreaterThan(20);
    expect(scriptsFor('secret-name', 'Secret Name')[0]).toMatchObject({ ease: 15, bonus: 8 });
    expect(scriptsFor('the-mystery-of-the-chimera', 'The Mystery of the Chimera').length).toBeGreaterThan(0);
    expect(scriptsFor('bind-magical-creatures', 'Bind Magical Creatures').length).toBeGreaterThan(0);
  });

  it('orders the four Criamon Paths, five stations each, the last needing Lore 6', () => {
    expect(CRIAMON_PATHS).toHaveLength(4);
    for (const p of CRIAMON_PATHS) expect(CRIAMON_STATIONS.filter((s) => s.path === p)).toHaveLength(5);
    const body = CRIAMON_STATIONS.filter((s) => s.path === 'Path of the Body');
    expect(body.map((s) => s.target)).toEqual([21, 12, 15, 15, 17]);
    expect(stationLoreNeeded(body[4])).toBe(6);
    const c = magus('criamon');
    addVirtue(c, data, body[0].id, 'Major', undefined, { free: true });
    expect(criamonProgress(c, 'Path of the Body').map((x) => x.held)).toEqual([true, false, false, false, false]);
  });
});

describe('words and gestures (DE)', () => {
  it('adds the two modifiers: no words and no gestures is −15', () => {
    const c = magus('bjornaer');
    expect(wordsGesturesModifier(d(c), 'none', 'none').value).toBe(-15);
    expect(wordsGesturesModifier(d(c), 'none', 'exaggerated').value).toBe(-9);
    expect(wordsGesturesModifier(d(c), 'loud', 'exaggerated').value).toBe(2);
  });

  it('lets Quiet Magic (once or twice) and Subtle Magic take the penalties off', () => {
    const c = magus('bjornaer');
    addVirtue(c, data, 'quiet-magic', 'Minor');
    expect(wordsGesturesModifier(d(c), 'quiet', 'bold').value).toBe(0);
    expect(wordsGesturesModifier(d(c), 'none', 'bold').value).toBe(-5);
    addVirtue(c, data, 'quiet-magic', 'Minor');
    addVirtue(c, data, 'subtle-magic', 'Minor');
    expect(wordsGesturesModifier(d(c), 'none', 'none').value).toBe(0);
  });
});
