// Living covenants (Guardians of the Forests): built from the book, run by season priority lists,
// meeting at the Tribunal, coming to the players; the Great Library's rules; trading with them.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RHINE } from '../data/livingCovenants/rhine';
import { newSaga } from '../store/store';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { characterContext } from './context';
import { auraOf } from './aura';
import { deriveCovenant, newCovenant } from './covenant';
import { DEFAULT_YEAR_END, planYearEnd } from './covenantYear';
import { ensureAbility, newCharacter } from './character/factory';
import { applyStatBlock } from './character/statBlock';
import { generateCharacter } from './generate/character';
import { seeded } from './generate/random';
import { findLabText, findSumma, tractatusQuality } from './greatLibrary';
import { newLab } from './lab';
import { approachChance, buyCopyFrom, buildLivingCovenant, gatheringIn, livingIds, nextGatherings, tradeWith } from './living';
import { choosePriority } from './priorities';
import { advanceSeasons, DEFAULT_ADVANCE } from './time';
import { DEFAULT_HOUSE_RULES } from './types';
import { abilityXpForScore } from './xp';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const def = (id: string) => RHINE.covenants.find((c) => c.id === id)!;
const sagaAt = (year = 1220, season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' = 'Spring') => {
  const s = newSaga('Living');
  s.tribunal = 'Rhine';
  s.currentYear = year;
  s.currentSeason = season;
  s.options = { rhineGilds: true };
  return s;
};
/** A die that always shows the same faces, in turn. */
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

describe('the named magi, from their stat blocks', () => {
  const sheets = RHINE.sheets ?? {};
  const named = RHINE.covenants.flatMap((c) => c.magi);

  it('has a stat block for every named magus, and every name in it is one the toolkit knows', () => {
    for (const m of named) expect(sheets[m.name], m.name).toBeTruthy();
    for (const [name, sb] of Object.entries(sheets)) {
      const c = newCharacter(named.find((m) => m.name === name)?.ungifted ? 'companion' : 'magus', 's', 1220);
      c.house = named.find((m) => m.name === name)?.house ?? 'guernicus';
      expect(applyStatBlock(c, sb, data, rules).problems, name).toEqual([]);
    }
  });

  it('keeps the written ones within the creation rules: balanced Virtues and Flaws, Characteristics within their points', () => {
    // the book's own blocks are as printed (Felicia's and Ioannes Acer's are not quite balanced)
    const printed = new Set(['Tabanus', 'Felicia', 'Philippus Niger', 'Imanitos Mendax', 'Falke', 'Ioannes Acer']);
    for (const m of named.filter((x) => !printed.has(x.name))) {
      const c = newCharacter(m.ungifted ? 'companion' : 'magus', 's', 1220);
      c.house = m.ungifted ? undefined : m.house;
      applyStatBlock(c, sheets[m.name], data, rules);
      const d = deriveCharacter(c, data, rules);
      expect(d.tally.virtuePoints, m.name).toBe(d.tally.flawPoints);
      const errors = validateCharacter(d, data, rules).filter((i) => i.severity === 'error' && !/age-based maximum/.test(i.message));
      expect(errors.map((i) => i.message), m.name).toEqual([]);
    }
  });

  it('builds them as the book has them: Philippus’s Perdo and Intelligence, Handri as the secretive Primus, the book’s own words', () => {
    const s = sagaAt();
    const durenmar = buildLivingCovenant(RHINE, def('durenmar'), { data, saga: s, rules }, { seed: 4, others: false });
    const ph = durenmar.chars.find((c) => c.name === 'Philippus Niger')!;
    const d = deriveCharacter(ph, data, rules);
    expect(d.arts.Pe.score).toBe(35);
    expect(d.characteristics.Int.value).toBe(5);
    expect(ph.familiar?.name).toBe('Sordus');
    expect(ph.spells.some((x) => x.spell.name === "Demon's Eternal Oblivion" && x.spell.level === 25)).toBe(true);
    expect(ph.description).toMatch(/Protector of Durenmar[\s\S]*\n\nAppearance: Philippus is a smallish/);
    const iren = buildLivingCovenant(RHINE, def('irencillia'), { data, saga: s, rules }, { seed: 4, others: false });
    const handri = iren.chars.find((c) => c.name === 'Handri')!;
    const ids = handri.virtues.map((v) => v.defId);
    expect(ids).toContain('faerie-magic');
    expect(ids).toContain('dark-secret-flaw');
    for (const odd of ['horrifying-appearance-snake-legs-flaw', 'gender-nonconforming-flaw', 'homunculus-wizard-flaw']) expect(ids).not.toContain(odd);
    expect(handri.description).toContain('Handri, the Primus of House Merinita, is a secretive man');
  });
});

describe('the covenants’ Boons, Hooks and auras', () => {
  it('gives each covenant Boons and Hooks from the book, keeping its aura at the book’s figure', () => {
    const s = sagaAt();
    for (const d of RHINE.covenants) {
      const b = buildLivingCovenant(RHINE, d, { data, saga: s, rules }, { seed: 2, others: false });
      expect(b.cov.hooksBoons.length, d.name).toBeGreaterThan(0);
      for (const h of b.cov.hooksBoons) expect(h.defId && data.hookBoonById.has(h.defId), `${d.name}: ${h.name}`).toBe(true);
      const a = auraOf(b.cov);
      expect(a.strength, d.name).toBe(d.aura);
      expect(a.realm, d.name).toBe(d.realm);
    }
    const crintera = buildLivingCovenant(RHINE, def('crintera'), { data, saga: s, rules }, { seed: 2, others: false }).cov;
    expect(crintera.hooksBoons.some((h) => h.name === 'Regio')).toBe(true);
    expect(crintera.notes).toMatch(/auras of 1, 3, 5 and 8/);
    expect(def('triamore').season).toBe('Summer');
  });

  it('lets Oculus Septentrionalis’s magi work under the magestones two seasons a year each, three at a time', () => {
    const s = sagaAt(1220, 'Spring');
    const b = buildLivingCovenant(RHINE, def('oculus-septentrionalis'), { data, saga: s, rules }, { seed: 6 });
    expect(auraOf(b.cov)).toMatchObject({ realm: 'Divine', strength: 3 });
    expect(b.cov.labAura?.count).toBe(3);
    const r = advanceSeasons({ saga: s, characters: b.chars, covenants: [b.cov] }, data, 8, { ...DEFAULT_ADVANCE, rng: seeded(9) });
    const stoneLines = r.reports.map((rep) => ({ rep, lines: rep.lines.filter((l) => /Under the magestones/.test(l.text)) }));
    expect(stoneLines.some((x) => x.lines.length > 0)).toBe(true);
    for (const x of stoneLines) expect(new Set(x.lines.map((l) => l.who)).size, `${x.rep.season} ${x.rep.year}`).toBeLessThanOrEqual(3);
    for (const year of [1220, 1221]) {
      const byMagus = new Map<string, number>();
      for (const x of stoneLines.filter((y) => y.rep.year === year)) for (const who of new Set(x.lines.map((l) => l.who))) byMagus.set(who, (byMagus.get(who) ?? 0) + 1);
      for (const [who, n] of byMagus) expect(n, `${who} in ${year}`).toBeLessThanOrEqual(2);
    }
    // no lab work in the Divine aura itself
    const labInDivine = r.reports.flatMap((rep) => rep.lines).filter((l) => /^(Invent|Extract|Refine) [^:]+: (\+|\d)/.test(l.text) && !/Under the magestones/.test(l.text));
    expect(labInDivine.map((l) => l.text)).toEqual([]);
  }, 120_000);
});

describe('building a covenant from its book', () => {
  it('makes Heorot’s three magi as the book gives them, with labs, a library, vis and accounts that hold', () => {
    const saga = sagaAt(1222);
    const { cov, chars } = buildLivingCovenant(RHINE, def('heorot'), { data, saga, rules }, { seed: 3 });
    expect(chars.map((c) => c.name)).toEqual(['Signum Irruptus', 'Theoderich of Augsburg', 'Pancrestis filius Occultes']);
    expect(chars.map((c) => [c.house, c.rhine?.rank, c.age])).toEqual([['criamon', 'master', 55], ['jerbiton', 'journeyman', 39], ['bonisagus', 'journeyman', 30]]);
    expect(cov.living).toMatchObject({ book: 'GotF', key: 'heorot', tribunal: 'Rhine' });
    expect(cov.memberIds).toEqual(chars.map((c) => c.id));
    expect(cov.labs.map((l) => l.ownerId)).toEqual(chars.map((c) => c.id));
    expect(cov.library.length).toBeGreaterThan(0);
    expect(cov.visSources.reduce((t, s) => t + s.pawnsPerYear, 0)).toBe(10);
    expect(planYearEnd(cov, deriveCovenant(cov, data, chars), DEFAULT_YEAR_END).balance).toBeGreaterThanOrEqual(0);
    for (const c of chars) {
      expect(c.npc).toBe(true);
      expect(c.standing).toEqual({ kind: 'priorities' });
      expect(c.priorities?.length).toBeGreaterThan(3);
      expect(c.fromBook?.book).toBe('GotF');
      expect(validateCharacter(deriveCharacter(c, data, rules), data, rules).filter((i) => i.severity === 'error')).toEqual([]);
    }
    // Signum's own list from the book: travel among the trolls before books
    expect(chars[0].priorities!.map((p) => p.kind)).toEqual(['longevity', 'travel', 'read', 'vis', 'invent']);
  });

  it('leaves out a magus still in apprenticeship when the saga is set earlier, and gives an older one a fitting age', () => {
    const { chars, log } = buildLivingCovenant(RHINE, def('dankmar'), { data, saga: sagaAt(1210), rules }, { seed: 4 });
    expect(chars.map((c) => c.name)).not.toContain('Larinda');
    expect(log.join(' ')).toMatch(/Larinda is still an apprentice/);
    expect(chars.find((c) => c.name === 'Jiphella')?.age).toBe(63);
  });

  it('keeps the living covenants and their people apart from the players', () => {
    const saga = sagaAt();
    const { cov, chars } = buildLivingCovenant(RHINE, def('triamore'), { data, saga, rules }, { seed: 5 });
    const ours = newCovenant(saga.id, 1220);
    const ids = livingIds([ours, cov]);
    expect([...ids.covenants]).toEqual([cov.id]);
    expect(chars.every((c) => ids.members.has(c.id))).toBe(true);
  });
});

describe('season priorities', () => {
  const magus = (seed: number, age: number) => {
    const saga = sagaAt();
    const r = generateCharacter({ type: 'magus', variety: 'focused', npc: true, seed, yearsPostGauntlet: age - 25, house: 'bonisagus' }, { data, saga, rules });
    const cov = newCovenant(saga.id, 1200);
    cov.aura = 5;
    cov.memberIds = [r.c.id];
    r.c.covenantId = cov.id;
    cov.labs.push(newLab('Lab', r.c.id));
    return { saga, c: r.c, cov };
  };

  it('takes each entry a season a year, the first that can be done, and practice when the list is spent', () => {
    const { saga, c, cov } = magus(21, 30);
    c.longevity = undefined;
    c.priorities = [{ kind: 'politics' }, { kind: 'travel' }];
    c.standing = { kind: 'priorities' };
    const { state } = advanceSeasons({ saga, characters: [c], covenants: [cov] }, data, 3, { ...DEFAULT_ADVANCE, rng: seeded(1) });
    const log = state.characters[0].seasonLog.filter((e) => e.year === 1220);
    expect(log.map((e) => e.priority)).toEqual(['politics', 'travel', 'practice']);
  });

  it('makes a Longevity Ritual from the covenant’s vis once a magus is 35 and has none', () => {
    const { saga, c, cov } = magus(22, 40);
    c.longevity = undefined;
    // the lab theory at 5: the ritual's 8 pawns are within twice it
    ensureAbility(c, deriveCharacter(c, data, rules).theoryAbility).xp.adjust = abilityXpForScore(5);
    c.priorities = [{ kind: 'longevity' }, { kind: 'politics' }];
    c.standing = { kind: 'priorities' };
    cov.visStocks = [{ art: 'Cr', pawns: 10 }, { art: 'Co', pawns: 10 }];
    const d = deriveCharacter(c, data, rules);
    const pick = choosePriority(structuredClone(c), d, characterContext(c, [cov], data), structuredClone(cov), data, 1220, 'Spring', seeded(1), [c]);
    expect(pick.choice?.kind).toBe('longevity');
    const { state } = advanceSeasons({ saga, characters: [c], covenants: [cov] }, data, 1, { ...DEFAULT_ADVANCE, rng: seeded(1) });
    expect(state.characters[0].longevity?.bonus).toBeGreaterThan(0);
    expect(state.covenants[0].visStocks.reduce((t, v) => t + v.pawns, 0)).toBe(12);
  });

  it('reads the library’s best book for the favored Art, and a tractatus only once', () => {
    const { c, cov } = magus(23, 30);
    c.longevity = undefined;
    c.priorities = [{ kind: 'read', arts: ['Ig'] }, { kind: 'read', arts: ['Ig'] }];
    cov.library = [
      { uid: 'b1', title: 'Notes on Ignem', kind: 'tractatus', subjectType: 'art', subject: 'Ig', level: 0, quality: 9, language: 'Latin' },
      { uid: 'b2', title: 'A Primer of Aquam', kind: 'summa', subjectType: 'art', subject: 'Aq', level: 3, quality: 6, language: 'Latin' },
    ];
    const d = deriveCharacter(c, data, rules);
    const ctx = characterContext(c, [cov], data);
    const pick = choosePriority(c, d, ctx, cov, data, 1220, 'Spring', seeded(1), [c]);
    expect(pick.choice?.standing).toMatchObject({ kind: 'read', bookUid: 'b1', target: 'art:Ig' });
    cov.library[0].readBy = [c.id];
    expect(choosePriority(c, d, ctx, cov, data, 1220, 'Spring', seeded(1), [c]).choice?.standing.bookUid).not.toBe('b1');
  });
});

describe('the Tribunal through the years', () => {
  it('meets at Durenmar every seven years from 1221, in Summer, and the Bjornaer gather at Crintera in 1227', () => {
    expect(gatheringIn(sagaAt(), 1221, 'Summer')).toEqual({ name: 'the Rhine Tribunal', at: 'Durenmar' });
    expect(gatheringIn(sagaAt(), 1221, 'Spring')).toBeUndefined();
    expect(gatheringIn(sagaAt(), 1225, 'Summer')).toBeUndefined();
    expect(nextGatherings(sagaAt(), 1222).map((g) => [g.name, g.year])).toEqual([['The Rhine Tribunal', 1228], ['The Gathering of Twelve Years', 1227]]);
  });

  it('sends a living covenant’s magi to the gathering, and its lines to the Tribunal’s part of the report', () => {
    const saga = sagaAt(1221, 'Summer');
    const { cov, chars } = buildLivingCovenant(RHINE, def('heorot'), { data, saga, rules }, { seed: 6 });
    const ours = newCovenant(saga.id, 1220);
    const { state, reports } = advanceSeasons({ saga, characters: chars, covenants: [ours, cov] }, data, 1, { ...DEFAULT_ADVANCE, rng: seeded(2) });
    for (const c of state.characters) {
      const e = c.seasonLog.find((x) => x.year === 1221 && x.season === 'Summer');
      expect(e?.summary).toMatch(/^Attended the Rhine Tribunal at Durenmar/);
      expect(e?.priority).toBe('politics');
    }
    expect(reports[0].lines.filter((l) => chars.some((c) => c.name === l.who)).every((l) => l.tribunal === cov.id)).toBe(true);
    expect(state.saga.tribunalNews?.[0]).toMatchObject({ kind: 'gathering' });
  });

  it('brings the book’s approaches to the players’ covenant at the year’s end, not the same one two years running', () => {
    const saga = sagaAt(1220, 'Winter');
    const { cov, chars } = buildLivingCovenant(RHINE, def('triamore'), { data, saga, rules }, { seed: 7 });
    const ours = newCovenant(saga.id, 1220);
    // every chance comes up
    const r1 = advanceSeasons({ saga, characters: chars, covenants: [ours, cov] }, data, 1, { ...DEFAULT_ADVANCE, rollAging: false, rng: () => 0 });
    const news = r1.state.saga.tribunalNews!.filter((n) => n.kind === 'approach');
    expect(news.map((n) => n.approach)).toEqual(['members', 'library', 'lotharingia']);
    expect(news[0]).toMatchObject({ covenantId: cov.id, year: 1221, season: 'Spring', approachKind: 'invitation' });
    const r2 = advanceSeasons(r1.state, data, 4, { ...DEFAULT_ADVANCE, rollAging: false, rng: () => 0 });
    expect(r2.state.saga.tribunalNews!.filter((n) => n.kind === 'approach')).toHaveLength(3);
  });
});

describe('a covenant’s attitude to the players', () => {
  it('makes trouble likelier from those who dislike them, and offers from those who like them', () => {
    expect(approachChance(8, 'trouble', 'enemy')).toBe(32);
    expect(approachChance(8, 'invitation', 'ally')).toBe(16);
    expect(approachChance(8, 'request', 'hostile')).toBe(8);
    expect(approachChance(60, 'offer', 'ally')).toBe(90);
  });
});

describe('the Great Library of Durenmar', () => {
  it('finds a summa of an Art on a simple die + 10, more for a master, at most 20; one of an Ability on the die alone', () => {
    expect(findSumma({ level: 15, art: true, rank: 'journeyman', bonisagusOrMember: false }, faces(6, 4)).found).toBe(true);
    expect(findSumma({ level: 16, art: true, rank: 'journeyman', bonisagusOrMember: false }, faces(6, 4))).toMatchObject({ found: false, contest: true });
    expect(findSumma({ level: 18, art: true, rank: 'master', bonisagusOrMember: false }, faces(6, 4)).found).toBe(true);
    expect(findSumma({ level: 20, art: true, rank: 'archmage', bonisagusOrMember: true }, faces(9, 4)).total).toBe(20);
    expect(findSumma({ level: 5, art: false, rank: 'archmage', bonisagusOrMember: true }, faces(6, 4))).toMatchObject({ found: true, total: 6 });
    // Quality: simple die + 5, at most 30 less the level
    expect(findSumma({ level: 15, art: true, rank: 'journeyman', bonisagusOrMember: false }, faces(6, 9)).quality).toBe(14);
    expect(tractatusQuality({ lore: 9 }, faces(9)).quality).toBe(12);
  });
  it('finds a standard spell’s Lab Text against 3, with Mastery tractatus for every six over', () => {
    expect(findLabText('standard', 3, faces(2)).found).toBe(false);
    expect(findLabText('standard', 3, faces(3)).contest).toBe(true);
    expect(findLabText('standard', 3, faces(9, 5)).mastery).toEqual([7]);
  });
});

describe('dealing with a living covenant', () => {
  it('trades vis both ways, and refuses what either side lacks', () => {
    const ours = newCovenant('s', 1220);
    const theirs = newCovenant('s', 1100);
    ours.name = 'Ours';
    theirs.name = 'Theirs';
    ours.visStocks = [{ art: 'Vi', pawns: 5 }];
    theirs.visStocks = [{ art: 'Cr', pawns: 3 }];
    const when = { year: 1220, season: 'Spring' as const };
    expect(tradeWith(ours, theirs, { kind: 'vis', art: 'Vi', pawns: 4 }, { kind: 'vis', art: 'Cr', pawns: 5 }, when)).toMatch(/only 3 pawns of Creo/);
    expect(tradeWith(ours, theirs, { kind: 'vis', art: 'Vi', pawns: 4 }, { kind: 'vis', art: 'Cr', pawns: 3 }, when)).toBeUndefined();
    expect(ours.visStocks).toEqual([{ art: 'Vi', pawns: 1 }, { art: 'Cr', pawns: 3 }]);
    expect(theirs.visStocks).toEqual([{ art: 'Vi', pawns: 4 }]);
  });
  it('buys a copy of one of their books for vis', () => {
    const ours = newCovenant('s', 1220);
    const theirs = newCovenant('s', 1100);
    ours.visStocks = [{ art: 'Cr', pawns: 2 }];
    theirs.library = [{ uid: 't1', title: 'Questions on Vim', kind: 'tractatus', subjectType: 'art', subject: 'Vi', level: 0, quality: 8, language: 'Latin', readBy: ['x'] }];
    const err = buyCopyFrom(ours, theirs, 't1', { kind: 'any-vis', pawns: 2 }, { year: 1220, season: 'Spring' });
    expect(err).toBeUndefined();
    expect(ours.library.map((b) => b.title)).toEqual(['Questions on Vim']);
    expect(theirs.library).toHaveLength(1);
    expect(theirs.visStocks).toEqual([{ art: 'Cr', pawns: 2 }]);
  });
});
