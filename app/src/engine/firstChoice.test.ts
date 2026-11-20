// What a card offers, and the choice it opens on (audit 3, A2 and B4).
// Hedge Magic, Revised Edition, line 433: a hedge wizard "is not able to learn any of the Hermetic Arts
// unless he has his Gift Opened for the Hermetic Arts" (and line 846: "a hedge wizard cannot learn
// Hermetic Arts in this manner (as his Gift has not been Opened by the Order of Hermes)").
import { describe, expect, it } from 'vitest';
import { ARTS, buildGameData } from '../data';
import { deriveCharacter } from './character/derive';
import { characterContext } from './context';
import { bestAbility, bestFirst, firstDoable, learnsArts } from './firstChoice';
import { firstKitchenWork, kitchenSeason, kitchenVisArts, witchPowers } from './folkWitch';
import { firstGruagachWork, gruagachBookSpells, gruagachPairs, gruagachSeason, GRUAGACH_SEASON_SET, tattooVisArts } from './gruagach';
import { bestStudy } from './priorities';
import { teachableSubjects } from './teaching';
import { advanceSeason, loggedThisSeason } from './time';
import { visInPlaces } from './vis';
import { DEFAULT_HOUSE_RULES, type Character, type Covenant, type Saga } from './types';
import type { Art } from '../data';

const data = buildGameData();
const derive = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
type Fixture = { saga: Saga; characters: Character[]; covenants: Covenant[] };
const fixtures = import.meta.glob('../../scripts/qa/fixtures/*.saga.json', { eager: true, import: 'default' }) as Record<string, Fixture>;
const saga = (file: string): Fixture => structuredClone(Object.entries(fixtures).find(([k]) => k.endsWith(`/${file}.saga.json`))![1]);
const who = (s: Fixture, id: string) => s.characters.find((c) => c.id === id)!;
const covOf = (s: Fixture, c: Character) => s.covenants.find((k) => k.id === c.covenantId);
// the fuller of the purse and the covenant's stores, as the season cards choose
const have = (c: Character, cov: Covenant | undefined) => (arts: Art[]) => Math.max(...Object.values(visInPlaces(c, cov, arts)));
const NO_AURA = undefined;

const WITCH = '2f21ffa5c86f';
const GRUAGACH = 'bf5f92f9a31e';

describe('the Hermetic Arts are offered only to a magus (A2)', () => {
  it('a Gifted folk witch cannot learn them; a magus can', () => {
    const s = saga('witch');
    const witch = derive(who(s, WITCH));
    expect(witch.hasGift).toBe(true);
    expect(learnsArts(witch)).toBe(false);
    const magus = s.characters.find((c) => c.type === 'magus')!;
    expect(learnsArts(derive(magus))).toBe(true);
  });

  it('a magus teaching offers the witch no Art, and a fellow magus their Arts', () => {
    const s = saga('witch');
    const [m1, m2] = s.characters.filter((c) => c.type === 'magus');
    const witch = who(s, WITCH);
    // a language in common, so that what is offered is the question
    const lang = m1.abilities.find((a) => a.abilityId === 'living-language' || a.abilityId === 'dead-language')!;
    witch.abilities.push({ ...structuredClone(lang), uid: 'shared-language' });
    const teacher = { c: m1, d: derive(m1) };
    const toWitch = teachableSubjects(teacher, { c: witch, d: derive(witch) }, data);
    expect(toWitch.language).toBeTruthy();
    expect(toWitch.subjects.length).toBeGreaterThan(0);
    expect(toWitch.subjects.filter((x) => x.isArt)).toEqual([]);
    // a magus student with every Art at 0 is offered the teacher's Arts of 5 or more
    const pupil = structuredClone(m2);
    for (const a of ARTS) pupil.arts[a] = {};
    const toMagus = teachableSubjects(teacher, { c: pupil, d: derive(pupil) }, data);
    expect(toMagus.subjects.some((x) => x.isArt)).toBe(true);
  });

  it('the covenant’s summae on an Art are no study for the witch, and are for a magus', () => {
    const s = saga('witch');
    const witch = who(s, WITCH);
    const cov = covOf(s, witch)!;
    // the library's books on the Arts alone, and no teacher
    cov.specialists = [];
    cov.library = cov.library.filter((b) => b.subjectType === 'art' && (b.kind === 'summa' || b.kind === 'tractatus'));
    expect(cov.library.length).toBeGreaterThan(0);
    const forWitch = bestStudy(witch, derive(witch), cov, s.saga.currentYear, s.saga.currentSeason, s.characters);
    expect(forWitch).toBeUndefined();
    // a magus with no Arts would study one from the library
    const magus = structuredClone(s.characters.find((c) => c.type === 'magus' && cov.memberIds.includes(c.id))!);
    for (const a of ARTS) magus.arts[a] = {};
    const forMagus = bestStudy(magus, derive(magus), cov, s.saga.currentYear, s.saga.currentSeason, s.characters);
    expect(forMagus?.standing.target).toMatch(/^art:/);
  });

  it('a season set on an Art for the witch (Exposure, vis, a book) gives her no Art, and goes to her own work instead', () => {
    for (const standing of [{ kind: 'exposure' as const, target: 'art:Cr' }, { kind: 'vis' as const, target: 'art:Co' }]) {
      const s = saga('witch');
      const witch = who(s, WITCH);
      witch.standing = standing;
      witch.purse = { pounds: 0, vis: [{ art: 'Co', pawns: 10 }] };
      const before = structuredClone(witch.arts);
      const { state, report } = advanceSeason({ saga: s.saga, characters: [witch], covenants: s.covenants }, data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: () => 0.55 });
      const after = state.characters.find((c) => c.id === WITCH)!;
      expect(after.arts, standing.kind).toEqual(before);
      const logged = loggedThisSeason(after, s.saga.currentYear, s.saga.currentSeason);
      expect(logged.length, standing.kind).toBeGreaterThan(0);
      expect(logged.flatMap((e) => Object.keys(e.gains)).filter((k) => k.startsWith('art:')), standing.kind).toEqual([]);
      expect(after.purse?.vis, standing.kind).toEqual([{ art: 'Co', pawns: 10 }]);
      expect(report.lines.some((l) => /only a magus learns the Hermetic Arts/.test(l.text)), standing.kind).toBe(true);
    }
  });

  it('a study opens, for one who cannot learn Arts, on their own best Ability', () => {
    const witch = derive(saga('witch').characters.find((c) => c.id === WITCH)!);
    const best = bestAbility(witch.abilities)!;
    expect(witch.abilities.every((a) => a.score <= best.score)).toBe(true);
  });
});

describe('a card opens on what this character can do (B4)', () => {
  it('helpers: best first keeps the list’s order among equals; the first doable, else the first', () => {
    expect(bestFirst([{ n: 'a', s: 1 }, { n: 'b', s: 3 }, { n: 'c', s: 3 }], (x) => x.s).map((x) => x.n)).toEqual(['b', 'c', 'a']);
    expect(firstDoable([1, 2, 3], (x) => x < 2 && 'too small')).toBe(2);
    expect(firstDoable([1, 2, 3], () => 'never')).toBe(1);
  });

  it('the folk witch’s kitchen opens on a work she can do, with her best power for it', () => {
    const s = saga('witch');
    const c = who(s, WITCH);
    const d = derive(c);
    const cov = covOf(s, c);
    const aura = characterContext(c, s.covenants, data).aura;
    const first = firstKitchenWork(c, d, aura, have(c, cov), () => 3)!;
    expect(first).toBeTruthy();
    expect(first.work).not.toBe('curse');
    const ks = kitchenSeason(c, d, aura, first.work, first.power, { have: have(c, cov)(kitchenVisArts(first.work, first.power)), effectVis: first.work === 'brew' ? 3 : 0 });
    expect(ks.blocked).toBeUndefined();
    // with no vis anywhere, the season opens on drawing vis from the aura, which needs none
    const poor = structuredClone(c);
    poor.purse = { pounds: 0, vis: [] };
    expect(firstKitchenWork(poor, derive(poor), aura, () => 0)?.work).toBe('vis');
  });

  it('the folk witch’s power card opens on her best power, not the first in the list', () => {
    const c = who(saga('witch'), WITCH);
    const powers = witchPowers(c, derive(c)).filter((p) => p.methods.some((m) => m !== 'potion'));
    const top = bestFirst(powers, (p) => p.score)[0];
    expect(top.score).toBe(Math.max(...powers.map((p) => p.score)));
    expect(top.score).toBeGreaterThan(powers[0].score);
  });

  it('a gruagach’s season opens on a tattoo within the Lab Total, with the vis to hand', () => {
    const s = saga('gru');
    const c = who(s, GRUAGACH);
    const d = derive(c);
    const cov = covOf(s, c);
    const aura = characterContext(c, s.covenants, data).aura;
    const pairs = gruagachPairs(c, d);
    const first = firstGruagachWork(c, d, aura, have(c, cov))!;
    expect(first.work).toBe('tattoo');
    const spell = gruagachBookSpells(pairs).find((x) => x.name === first.spell)!;
    const gs = gruagachSeason(c, d, aura, first.work, spell, { ...GRUAGACH_SEASON_SET, have: have(c, cov)(tattooVisArts(spell.tf)) }, pairs);
    expect(gs.blocked).toBeUndefined();
    // the book's first spell, which the card opened on before, is beyond this gruagach as a tattoo
    const was = gruagachBookSpells(pairs)[0];
    expect(gruagachSeason(c, d, aura, 'tattoo', was, { ...GRUAGACH_SEASON_SET, have: 99 }, pairs).blocked).toBe('tattoo');
    // a spell invented must make progress: a Lab Total no higher than its level is refused
    expect(gruagachSeason(c, d, NO_AURA, 'invent', { tf: pairs[0], level: 200 }, { ...GRUAGACH_SEASON_SET, have: 0 }, pairs).blocked).toBe('no-gain');
  });
});

describe('a season that would draw no vis is not offered (5.14)', () => {
  it('a gruagach whose Take Vision Lab Total is under 10 draws none (Hedge Magic, line 3103)', () => {
    const s = saga('gru');
    const c = who(s, GRUAGACH);
    const d = derive(c);
    const aura = characterContext(c, s.covenants, data).aura;
    const pairs = gruagachPairs(c, d);
    expect(pairs).toContain('TaVs');
    const gs = gruagachSeason(c, d, aura, 'vis', undefined, { ...GRUAGACH_SEASON_SET, have: 0 }, pairs);
    expect(gs.lt.total).toBeLessThan(10);
    expect(gs.drawn).toBe(0);
    expect(gs.blocked).toBe('no-vis');
    // nor does the card open on it
    expect(firstGruagachWork(c, d, aura, have(c, covOf(s, c)))?.work).not.toBe('vis');
    // and vis comes only "from a magical aura": a strong Lab Total in a Divine one draws none
    const strong = { ...c, abilities: c.abilities.map((a) => ({ ...a, xp: { ...a.xp, laterLife: (a.xp.laterLife ?? 0) + 200 } })) };
    const divine = gruagachSeason(strong, derive(strong), { realm: 'Divine', strength: 0 }, 'vis', undefined, { ...GRUAGACH_SEASON_SET, have: 0 }, pairs);
    expect(divine.drawn).toBe(0);
    expect(divine.blocked).toBe('no-vis');
    expect(gruagachSeason(strong, derive(strong), { realm: 'Magic', strength: 3 }, 'vis', undefined, { ...GRUAGACH_SEASON_SET, have: 0 }, pairs).drawn).toBeGreaterThan(0);
  });

  it('a folk witch draws a tenth of her Lab Total, rounded up, so none only when it is 0 or less (line 1924)', () => {
    const s = saga('witch');
    const c = who(s, WITCH);
    const d = derive(c);
    const aura = characterContext(c, s.covenants, data).aura;
    const here = kitchenSeason(c, d, aura, 'vis', undefined, { have: 0 });
    expect(here.drawn).toBe(Math.ceil(here.lt.total / 10));
    expect(here.blocked).toBeUndefined();
    // a strong Divine aura takes the Lab Total below 1: nothing drawn, and the season is not offered
    const church = kitchenSeason(c, d, { realm: 'Divine', strength: 9 }, 'vis', undefined, { have: 0 });
    expect(church.lt.total).toBeLessThanOrEqual(0);
    expect(church.drawn).toBe(0);
    expect(church.blocked).toBe('no-vis');
  });
});
