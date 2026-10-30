// Writing and copying books (DE Writing Books, Copying Books, Laboratory Texts; Covenants ch.7).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import {
  annotateGain, bookQuality, clarifyProblems, copyOfBook, copyProblems, copyRate, covenantArtisans, florilegiumBonus, glossProblems, labTextRate, libraryYearEnd, planBook, refreshQuality,
  scriptoriumSeason, workWriting,
} from './books';
import { deriveCharacter } from './character/derive';
import { ensureAbility, newCharacter } from './character/factory';
import { newCovenant } from './covenant';
import { DEFAULT_ADVANCE, advanceSeason } from './time';
import { DEFAULT_HOUSE_RULES, type Character, type LibraryBook, type Specialist, type WritingProject } from './types';

const data = buildGameData();
const derive = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const abilityXp = (n: number) => (5 * n * (n + 1)) / 2;

function author(o: { com?: number; art?: number; latin?: number; theory?: number; scribe?: number; artes?: number } = {}) {
  const c = newCharacter('magus', 's1');
  c.name = 'Auctor';
  c.creation.finalized = true;
  c.characteristics.Com = o.com ?? 2;
  c.arts.Ig = { play: ((o.art ?? 20) * ((o.art ?? 20) + 1)) / 2 };
  ensureAbility(c, 'dead-language', { play: abilityXp(o.latin ?? 5) }, 'Latin');
  ensureAbility(c, 'magic-theory', { play: abilityXp(o.theory ?? 4) });
  ensureAbility(c, 'artes-liberales', { play: abilityXp(o.artes ?? 1) });
  if (o.scribe) ensureAbility(c, 'profession-type', { play: abilityXp(o.scribe) }, 'Scribe');
  return c;
}

const book = (o: Partial<LibraryBook> = {}): LibraryBook => ({ uid: 'b1', title: 'De Igne', kind: 'summa', subjectType: 'art', subject: 'Ig', level: 10, quality: 10, language: 'Latin', ...o });

describe('book Quality under the extended rules (Covenants ch.7)', () => {
  it('takes 3 + skilled artisans + resonant materials in place of 6, resonance only for the Arts and Arcane Abilities', () => {
    const d = derive(author());
    const make = { scribe: true, binder: true, illuminator: true, resonance: 1 };
    const art = planBook(d, { kind: 'tractatus', isArt: true, score: 20, com: 2, language: 5, extended: make, resonant: true });
    expect(art.quality).toBe(2 + 3 + 3 + 1);
    expect(art.textQuality).toBe(5);
    const mundane = planBook(d, { kind: 'tractatus', isArt: false, score: 6, com: 2, language: 5, extended: make, resonant: false });
    expect(mundane.quality).toBe(8);
    // won in a story +2, clarified +1 more: at most +3
    expect(planBook(d, { kind: 'tractatus', isArt: true, score: 20, com: 2, language: 5, extended: { resonance: 2, clarified: true }, resonant: true }).quality).toBe(2 + 3 + 3);
    // an exemplar is 3 lower; a commentary 1 higher
    expect(planBook(d, { kind: 'tractatus', isArt: true, score: 20, com: 2, language: 5, extended: { format: 'exemplar' } }).quality).toBe(2);
    expect(planBook(d, { kind: 'commentary', isArt: true, score: 20, com: 2, language: 5 }).quality).toBe(9);
  });
  it('caps the bonus for a lower Level at Communication + Virtues + artisans + 3', () => {
    const d = derive(author());
    const r = planBook(d, { kind: 'summa', isArt: true, score: 20, level: 2, com: 2, language: 5, extended: { scribe: true, binder: true }, resonant: true });
    // base 2 + 3 + 2 = 7; dropped 8 Levels, capped at 2 + 0 + 2 + 3 = 7
    expect(r.quality).toBe(14);
    expect(r.textQuality).toBe(12);
  });
  it('dictation goes at the slower of author and notary; a lab’s Texts adds 1 to the language per 3', () => {
    const d = derive(author());
    expect(planBook(d, { kind: 'summa', isArt: true, score: 20, com: 2, language: 5, notary: 4 }).perSeason).toBe(4);
    expect(planBook(d, { kind: 'summa', isArt: true, score: 20, com: 2, language: 5, labTexts: 6 }).perSeason).toBe(9);
    expect(planBook(d, { kind: 'tractatus', isArt: true, score: 20, com: 2, language: 5, written: 4 }).problems.join()).toMatch(/most allowed/);
  });
});

describe('copying (DE, Copying Books and Corrupted Copies)', () => {
  it('goes at 6 + Scribe a season, three times as fast when quick, and Latin × 20 or Scribe × 60 for lab texts', () => {
    expect(copyRate(5)).toBe(11);
    expect(copyRate(5, 3, true)).toBe(36);
    expect(labTextRate('write', 5)).toBe(100);
    expect(labTextRate('copy', 3, 3)).toBe(240);
  });
  it('is corrupt without the language, Artes Liberales, or Magic Theory for the Arts', () => {
    const ok = author();
    expect(copyProblems(ok, derive(ok), book(), data)).toEqual([]);
    const grog = newCharacter('grog', 's1');
    ensureAbility(grog, 'dead-language', { play: abilityXp(3) }, 'Latin');
    ensureAbility(grog, 'artes-liberales', { play: abilityXp(1) });
    expect(copyProblems(grog, derive(grog), book(), data)).toEqual(['Magic Theory 1 or more']);
    expect(copyProblems(grog, derive(grog), book({ subjectType: 'ability', subject: 'charm' }), data)).toEqual([]);
    expect(copyProblems(grog, derive(grog), book({ language: 'Greek' }), data)[0]).toMatch(/Greek/);
  });
  it('keeps the text’s Quality with the copy’s own making, 1 lower when quick', () => {
    const extended = book({ quality: 12, textQuality: 9, make: { scribe: true, binder: true, illuminator: true } });
    expect(copyOfBook(extended, { data }).quality).toBe(9);
    expect(copyOfBook(extended, { quick: true, make: { scribe: true, resonance: 1 }, data }).quality).toBe(10);
    const core = book({ quality: 12 });
    expect(copyOfBook(core, { quick: true }).quality).toBe(11);
    expect(copyOfBook(core, { corrupt: true }).corrupt).toBe(true);
    expect(copyOfBook(core, {}).inPlay).toBe(true);
  });
});

describe('writing season by season', () => {
  const project = (o: Partial<WritingProject>): WritingProject => ({
    uid: 'p1', kind: 'summa', title: 'Summa Ignis', subjectType: 'art', subject: 'Ig', language: 'Latin', level: 12, needed: 12, rate: 4, points: 0, started: { year: 1220, season: 'Spring' }, ...o,
  });
  it('gathers points each season, gives Exposure, and puts the finished book in the library free of Build Points', () => {
    const c = author();
    const cov = newCovenant('s1', 1220);
    const p = project({ quality: 5, exposure: 'art:Ig', authorScore: 24 });
    c.writing = [p];
    const d = derive(c);
    workWriting(c, d, cov, p, 1220, 'Spring', data);
    workWriting(c, d, cov, p, 1220, 'Summer', data);
    expect(cov.library).toHaveLength(0);
    const out = workWriting(c, d, cov, p, 1220, 'Autumn', data);
    expect(p.done).toEqual({ year: 1220, season: 'Autumn' });
    expect(cov.library[0]).toMatchObject({ kind: 'summa', level: 12, quality: 5, authorId: c.id, inPlay: true, authorScore: 24 });
    expect(out.join(' ')).toMatch(/finished/);
    expect(c.seasonLog.filter((e) => e.activity === 'write-book')).toHaveLength(3);
    expect(c.arts.Ig.play).toBe(210 + 6);
  });
  it('goes on to the next summa with what is left of a season, but a tractatus takes its whole season', () => {
    const c = author();
    const cov = newCovenant('s1', 1220);
    // 12 a season: a Level 5 summa on an Art finishes with 7 to spare, which go on to the next (another language, 8 a season: 4 points)
    const short = project({ uid: 'a', title: 'Summa Brevis', level: 5, needed: 5, rate: 12, quality: 5, exposure: 'art:Ig' });
    const tract = project({ uid: 't', kind: 'tractatus', title: 'On Flames', level: 0, needed: 1, rate: 1, quality: 7 });
    const next = project({ uid: 'b', title: 'Summa Altera', language: 'Greek', level: 10, needed: 10, rate: 8, quality: 4 });
    c.writing = [short, tract, next];
    const out = workWriting(c, derive(c), cov, short, 1220, 'Spring', data);
    expect(short.done).toBeTruthy();
    expect(next.points).toBe(4);
    expect(tract.points).toBe(0);
    expect(out.join(' ')).toMatch(/The rest of the season goes on to Summa Altera: \+4, 4 of 10/);
    // one season logged, one Exposure
    expect(c.seasonLog).toHaveLength(1);
    expect(c.seasonLog[0].summary).toMatch(/then Summa Altera \(4\/10\)/);
    // enough for a second one: both finish in the season
    const c2 = author();
    const a = project({ uid: 'a', title: 'One', level: 3, needed: 3, rate: 12, quality: 5 });
    const b = project({ uid: 'b', title: 'Two', level: 4, needed: 4, rate: 12, quality: 5 });
    c2.writing = [a, b];
    workWriting(c2, derive(c2), cov, a, 1220, 'Spring', data);
    expect([!!a.done, !!b.done]).toEqual([true, true]);
    expect(cov.library.map((x) => x.title)).toEqual(['Summa Brevis', 'One', 'Two']);
    // a tractatus finished leaves nothing over
    const c3 = author();
    const t1 = project({ uid: 't1', kind: 'tractatus', title: 'T1', level: 0, needed: 1, rate: 1, quality: 7 });
    const s3 = project({ uid: 's3', title: 'S3' });
    c3.writing = [t1, s3];
    workWriting(c3, derive(c3), cov, t1, 1220, 'Spring', data);
    expect(s3.points).toBe(0);
  });
  it('puts bought resonant materials on the Sundry', () => {
    const c = author();
    const cov = newCovenant('s1', 1220);
    const p = project({ kind: 'tractatus', level: 0, needed: 1, rate: 1, quality: 9, textQuality: 5, make: { scribe: true, binder: true, illuminator: true, resonance: 1 } });
    workWriting(c, derive(c), cov, p, 1220, 'Spring', data);
    expect(cov.library[0].quality).toBe(9);
    expect(cov.finances.sundry).toBe(1);
  });
  it('runs as the standing activity when time passes', () => {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Spring';
    const cov = newCovenant(s.id, 1220);
    const c = author();
    c.sagaId = s.id;
    c.age = 30;
    cov.memberIds.push(c.id);
    c.covenantId = cov.id;
    c.writing = [project({ kind: 'tractatus', level: 0, needed: 1, rate: 1, quality: 8 })];
    c.standing = { kind: 'write' };
    const { state } = advanceSeason({ saga: s, characters: [c], covenants: [cov] }, data, { ...DEFAULT_ADVANCE, rollAging: false });
    expect(state.covenants[0].library.map((b) => b.title)).toEqual(['Summa Ignis']);
    expect(state.characters[0].writing![0].done).toBeTruthy();
  });
});

describe('glosses, florilegia, annotation and clarification (Covenants ch.7)', () => {
  it('a gloss needs half the Level and more Communication than the author, and adds 1 once', () => {
    const b = book({ authorCom: 1 });
    expect(glossProblems(5, 2, b, data)).toEqual([]);
    expect(glossProblems(4, 2, b, data)[0]).toMatch(/half the Level/);
    expect(glossProblems(5, 1, b, data)[0]).toMatch(/higher than the author/);
    const before = { make: b.make, glossed: b.glossed, florilegium: b.florilegium };
    b.glossed = { by: 'Reader', year: 1220 };
    refreshQuality(b, data, before);
    expect(b.quality).toBe(11);
    expect(glossProblems(5, 2, b, data)[0]).toMatch(/glossed already/);
    expect(glossProblems(5, 2, book({ make: { resonance: 1 } }), data)[0]).toMatch(/resonan/);
  });
  it('a florilegium adds 1 to each tractatus, 2 from an authority with a peerless collection', () => {
    expect(florilegiumBonus(6, false, 6, 3)).toEqual({ bonus: 1, problems: [] });
    expect(florilegiumBonus(10, false, 25, 5).bonus).toBe(2);
    expect(florilegiumBonus(5, false, 10, 2).problems[0]).toMatch(/needs 6/);
    expect(florilegiumBonus(6, false, 5, 3).problems[0]).toMatch(/twice as many/);
    expect(florilegiumBonus(6, false, 20, 4).problems[0]).toMatch(/at most 3/);
  });
  it('a florilegium’s tractatus lose resonant materials, as glosses do', () => {
    const t = book({ kind: 'tractatus', level: 0, quality: 9, textQuality: 5, make: { scribe: true, binder: true, illuminator: true, resonance: 1 } });
    t.florilegium = { name: 'Flores', bonus: 1 };
    expect(bookQuality(t, data)).toBe(5 + 3 + 1);
  });
  it('annotation adds a third of the score gained since writing to the Level', () => {
    expect(annotateGain(book({ authorScore: 20 }), 29)).toBe(3);
    expect(annotateGain(book(), 29)).toBe(0);
  });
  it('clarification needs Art 15, resonant materials and a Magic aura, and is done after 12 / aura years', () => {
    const c = author({ art: 15 });
    const b = book({ textQuality: 10, quality: 11, make: { resonance: 1 } });
    expect(clarifyProblems(derive(c), b, { realm: 'Magic', strength: 3 }, data)).toEqual([]);
    expect(clarifyProblems(derive(author({ art: 14 })), b, { realm: 'Magic', strength: 3 }, data).join()).toMatch(/15/);
    expect(clarifyProblems(derive(c), book(), { realm: 'Magic', strength: 3 }, data).join()).toMatch(/resonant/);
    expect(clarifyProblems(derive(c), b, { realm: 'Divine', strength: 3 }, data).join()).toMatch(/Magic aura/);
    const cov = newCovenant('s1', 1220);
    b.clarifying = { since: 1220, aura: 3 };
    cov.library.push(b);
    expect(libraryYearEnd(cov, 1223, data)).toEqual([]);
    expect(libraryYearEnd(cov, 1224, data)[0]).toMatch(/clarified/);
    expect(b.quality).toBe(12);
    expect(b.clarifying).toBeUndefined();
  });
});

describe('the covenant’s scribes and artisans', () => {
  const scribe = (extra: Specialist['abilities'] = []): Specialist => ({
    uid: 'sc', name: 'Brother Ivo', role: 'scribe', ability: 'Profession: Scribe', score: 6, abilities: [{ id: 'profession-type', param: 'Scribe', score: 6 }, { id: 'dead-language', param: 'Latin', score: 5 }, { id: 'artes-liberales', score: 1 }, ...extra],
  });
  it('copies in their seasons, corrupt without Magic Theory for an Art', () => {
    const cov = newCovenant('s1', 1220);
    cov.specialists.push(scribe());
    cov.library.push(book({ level: 12 }));
    cov.scriptorium = [{ uid: 'j', sourceUid: 'b1', points: 0 }];
    expect(scriptoriumSeason(cov, 'sc', data)[0]).toMatch(/12 of 12|finishes/);
    expect(cov.library[1].corrupt).toBe(true);
    const good = newCovenant('s1', 1220);
    good.specialists.push(scribe([{ id: 'magic-theory', score: 1 }]));
    good.library.push(book({ level: 24 }));
    good.scriptorium = [{ uid: 'j', sourceUid: 'b1', points: 0 }];
    expect(scriptoriumSeason(good, 'sc', data)[0]).toMatch(/12 of 24/);
    scriptoriumSeason(good, 'sc', data);
    expect(good.library[1]).toMatchObject({ copyOf: 'b1', quality: 10, inPlay: true });
    expect(good.scriptorium).toEqual([]);
    // a copy left to a scribe who has gone is taken up by another
    good.scriptorium = [{ uid: 'k', sourceUid: 'b1', points: 0, scribeUid: 'gone' }];
    expect(scriptoriumSeason(good, 'sc', data)[0]).toMatch(/12 of 24/);
  });
  it('finds the best skilled scribe, binder and illuminator among specialists and members', () => {
    const cov = newCovenant('s1', 1220);
    cov.specialists.push(scribe(), { uid: 'bb', name: 'Binder', role: 'craftsman', craft: 'bookbinder', ability: 'Craft (Bookbinder)', score: 7, abilities: [{ id: 'craft-type', param: 'Bookbinder', score: 7 }] });
    const m = author({ scribe: 8 });
    const a = covenantArtisans(cov, [{ c: m, d: derive(m) }]);
    expect(a.scribe).toMatchObject({ name: 'Auctor', score: 8 });
    expect(a.binder).toMatchObject({ name: 'Binder', score: 7 });
    expect(a.illuminator).toBeUndefined();
  });
});
