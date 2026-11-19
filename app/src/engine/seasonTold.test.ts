// The Chronicle tells each kind of season from what it did (audit 3, B2): a season's work gives a phrase
// from its own result, kept on the entry as `told`, and the Chronicle prefers it to its stock phrases.
// A botched study from vis is told as a botch, with the Twilight it leaves; an entry from before `told`
// was kept is told as it was; a season unlogged leaves the Chronicle.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { seasonTelling, tellPeople, writeChronicle, type ChronicleFacts } from './chronicle';
import { newCovenant } from './covenant';
import { ensureAbility, newCharacter } from './character/factory';
import { applyInitiation } from './initiation';
import { newLab } from './lab';
import { newSeasonEntry } from './longterm';
import { newProject } from './projects';
import {
  amuletTold, apprenticeTold, charmTold, clarifyTold, devotionTold, gatheringTold, gruagachTold, helperTold, holyWorkTold, kitchenTold, labTold, masonTold, merchantTold,
  refiningTold, researchTold, vitkiTold, wondrousTold, workshopImproveTold,
} from './seasonTold';
import { DEFAULT_ADVANCE, advanceSeason, loggedThisSeason } from './time';
import { unlogSeason } from './unlog';
import { abilityXpForScore, artXpForScore } from './xp';
import type { Character, SeasonLogEntry } from './types';

const data = buildGameData();
const steady = () => {
  let i = 0;
  return () => (i++ * 0.37) % 1;
};
const quiet = { ...DEFAULT_ADVANCE, rollAging: false };
const people = (story: { title: string; text: string }[]) => story.find((s) => s.title === 'At the covenant')?.text ?? '';
/** The Chronicle's sentence for one magus whose season is this entry. */
const toldOf = (e: SeasonLogEntry, c?: Pick<Character, 'owed'>) => {
  const f: ChronicleFacts = { year: e.year, season: e.season, covenants: [], people: [{ name: 'Aldith', type: 'magus', ...seasonTelling(e, c?.owed) }], news: [] };
  return people(writeChronicle(f, steady()));
};
/** What the Chronicle says of an 'other' season with no phrase of its own: the fallback the cards used to get. */
const stock = toldOf(newSeasonEntry(1220, 'Spring', 'other', 'Something'));

describe('each kind of season’s work is told from what it did', () => {
  // each card's work, as two different results: the phrase names what was done, and differs with it
  const cards: [string, string, string[], string, string[]][] = [
    ['the kitchen: a brew', kitchenTold({ work: 'brew', power: 'Healing', doses: 4, pawns: 7, vis: 'Corpus' }), ['Healing', 'four doses', '7 pawns of Corpus'], kitchenTold({ work: 'brew', power: 'Animal Ken', doses: 2, pawns: 2, vis: 'Animal' }), ['Animal Ken']],
    ['the kitchen: a curse', kitchenTold({ work: 'curse', curse: 'Disease', target: 'the reeve of Altdorf' }), ['disease', 'the reeve of Altdorf'], kitchenTold({ work: 'curse', curse: 'Emotion', target: 'Count Otto' }), ['Count Otto']],
    ['the kitchen: a fetish', kitchenTold({ work: 'fetish', fetish: 'a flying broom', power: 'Flight' }), ['a flying broom', 'Flight'], kitchenTold({ work: 'fetish', fetish: 'a dowsing rod', power: 'Dowsing' }), ['a dowsing rod']],
    ['refining', refiningTold({ work: 'extract', pawns: 3, art: 'Auram' }), ['3 pawns', 'Auram'], refiningTold({ work: 'characteristic', characteristic: 'Strength' }), ['Strength']],
    ['a vitki’s season', vitkiTold('invent', ['Thurs', 'Ár'], ['Frost-bite', 'Good harvest']), ['Thurs', 'Frost-bite', 'Good harvest'], vitkiTold('taught', ['Sól'], ['Sun-shield']), ['Sun-shield', 'teacher']],
    ['an amulet', amuletTold('Ward against Wolves', 'Hans'), ['Ward against Wolves', 'Hans'], amuletTold('Safe Journey'), ['Safe Journey']],
    ['charms', charmTold({ work: 'invent', charm: 'Sleep of the Infant', done: true }), ['Sleep of the Infant', 'finished'], charmTold({ work: 'teacher', charms: ['Lucky Coin', 'Bitter Draught'] }), ['Lucky Coin', 'Bitter Draught']],
    ['a gruagach’s season', gruagachTold({ work: 'tattoo', effect: 'the Bull’s Strength' }), ['tattoo', 'the Bull’s Strength'], gruagachTold({ work: 'invent', spell: 'Fog of Confusion', done: false }), ['Fog of Confusion']],
    ['a mason’s season', masonTold({ work: 'build', building: 'The great tower', feet: 20, height: 60, started: false }), ['the great tower', '20 feet', '60'], masonTold({ work: 'repair', building: 'The curtain wall' }), ['the curtain wall', 'repaired']],
    ['devotion', devotionTold({ work: 'shrine', saint: 'Saint Peter, Apostle' }), ['Saint Peter’s shrine'], devotionTold({ work: 'ring', ring: 'The Second Ring' }), ['Second Ring of Solomon']],
    ['the mystic’s path', devotionTold({ work: 'path', quest: 'A season serving the poor or the Church' }), ['serving the poor'], devotionTold({ work: 'path', quest: 'A season of personal devotion (a Devotion Point, exposure in Dominion Lore)' }), ['in personal devotion']],
    ['holy work', holyWorkTold('golem', 'Yossele', true), ['golem', 'Yossele'], holyWorkTold('trueName', 'True Name: Raziel', false), ['True Name of Raziel']],
    ['the apprentice', apprenticeTold('Wendel', true), ['opened the Arts', 'Wendel'], apprenticeTold('Wendel', false), ['taught']],
    ['original research', researchTold('Ignem as fire’s warmth', true), ['stabilized', 'Ignem as fire’s warmth'], researchTold(undefined, false), ['trying to stabilize']],
    ['vis from the aura', gruagachTold({ work: 'vis', pawns: 2 }), ['2 pawns'], gruagachTold({ work: 'vis', pawns: 0 }), ['drew none']],
    ['the workshop', workshopImproveTold('Raw Materials'), ['raw materials'], merchantTold('Leading a convoy or caravan'), ['leading a convoy']],
    ['a wondrous item', wondrousTold('the Singing Bell', false), ['the Singing Bell'], wondrousTold('the Singing Bell', true), ['finished']],
    ['a book opened', clarifyTold('The Summa of Ignem'), ['The Summa of Ignem'], clarifyTold('Tractatus on Herbs'), ['Tractatus on Herbs']],
    ['a gathering', gatheringTold('The Rhine Tribunal', 'Durenmar'), ['the Rhine Tribunal', 'Durenmar'], gatheringTold('The gathering of House Tremere', 'Coeris'), ['House Tremere']],
    ['help in the lab', helperTold('Cornelia'), ['Cornelia'], helperTold('Billy'), ['Billy']],
  ];

  it.each(cards)('%s: the Chronicle tells the work, not the stock phrase', (_card, a, aNames, b, bNames) => {
    const e = newSeasonEntry(1220, 'Spring', 'other', 'A season’s work');
    e.told = a;
    const sentence = toldOf(e);
    expect(sentence).toContain(`Aldith ${a}`);
    expect(sentence).not.toBe(stock);
    for (const n of aNames) expect(a).toContain(n);
    for (const n of bNames) expect(b).toContain(n);
    // one card, two results: two sentences, not one fixed line per card
    expect(b).not.toBe(a);
    // text for players: gender-neutral (principle 7)
    expect(`${a} ${b}`).not.toMatch(/\b(he|she|his|her|him|herself|himself)\b/i);
  });

  it('a lab project worked by the clock is told by the spell, and the helper by the magus helped', () => {
    const s = newSaga('Test');
    s.currentYear = 1220;
    s.currentSeason = 'Spring';
    const cov = newCovenant(s.id, 1220);
    const mk = (name: string) => {
      const c = newCharacter('magus', s.id);
      c.name = name;
      c.creation.finalized = true;
      c.age = 30;
      c.covenantId = cov.id;
      cov.memberIds.push(c.id);
      return c;
    };
    const billy = mk('Billy');
    const ann = mk('Ann');
    cov.labs.push(newLab('Tower', billy.id));
    billy.arts.Cr = { laterLife: artXpForScore(5) };
    billy.arts.An = { laterLife: artXpForScore(5) };
    ensureAbility(billy, 'magic-theory', { laterLife: abilityXpForScore(3) });
    ensureAbility(ann, 'magic-theory', { laterLife: abilityXpForScore(3) });
    billy.projects = [{ ...newProject('invent'), technique: 'Cr', form: 'An', level: 15, spell: { name: 'Shape of the Woodland Hound' } as never }];
    billy.standing = { kind: 'lab', projectUid: billy.projects[0].uid };
    ann.standing = { kind: 'assist', helps: billy.id };
    const { state, report } = advanceSeason({ saga: s, characters: [billy, ann], covenants: [cov] }, data, quiet);
    const [b] = loggedThisSeason(state.characters[0], 1220, 'Spring');
    const [a] = loggedThisSeason(state.characters[1], 1220, 'Spring');
    expect(b.told).toBe(labTold(state.characters[0].projects![0], state.characters[0]));
    expect(b.told).toContain('Shape of the Woodland Hound');
    expect(a.told).toContain('Billy');
    const told = people(report.story ?? []);
    expect(told).toContain(`Billy ${b.told}`);
    expect(told).toContain(`Ann ${a.told}`);
  });

  it('an Initiation is told as one', () => {
    const c = newCharacter('magus', 'saga');
    c.house = 'bjornaer';
    applyInitiation(c, data, { virtueId: 'theriomorphy', size: 'Minor', mystagogue: 'Ulf', total: 16, target: 15, year: 1221, season: 'Summer' });
    const e = c.seasonLog.at(-1)!;
    expect(e.told).toMatch(/initiated into .*Theriomorphy.* by Ulf/);
    expect(toldOf(e)).toContain(e.told!);
  });
});

/** A magus who studies Creo from vis set as their season's work: Creo 6 is two pawns, so two botch dice. */
function visSaga(art: number) {
  const s = newSaga('Test');
  s.currentYear = 1220;
  s.currentSeason = 'Spring';
  const cov = newCovenant(s.id, 1220);
  const m = newCharacter('magus', s.id);
  m.name = 'Magus';
  m.creation.finalized = true;
  m.age = 30;
  m.arts.Cr = { play: (art * (art + 1)) / 2 };
  m.purse = { pounds: 0, vis: [{ art: 'Cr', pawns: 4 }] };
  m.standing = { kind: 'vis', target: 'art:Cr' };
  m.covenantId = cov.id;
  cov.memberIds.push(m.id);
  return { saga: s, characters: [m], covenants: [cov] };
}
// every face 0: a stress die of 0, and every botch die a 0
const zeros = () => 0.05;
const fives = () => 0.55;

describe('a study from vis in the Chronicle', () => {
  const run = (art: number, rng: () => number) => advanceSeason(visSaga(art), data, { ...quiet, rng });

  it('a botch is told as a botch, with the Wizard’s Twilight it leaves owed', () => {
    const { state, report } = run(6, zeros);
    const m = state.characters[0];
    expect(m.owed?.some((o) => o.kind === 'twilight')).toBe(true);
    const told = people(report.story ?? []);
    expect(told).toMatch(/Magus botched .*Creo vis/);
    expect(told).toMatch(/Twilight/);
    expect(told).not.toMatch(/glowing|drawn into understanding|until they were spent/);
  });

  it('a single botch is a botch, and no Twilight', () => {
    const told = people(run(3, zeros).report.story ?? []);
    expect(told).toMatch(/botch/);
    expect(told).not.toMatch(/Twilight/);
  });

  it('a study that does not botch is told as before', () => {
    const { state, report } = run(6, fives);
    const [e] = loggedThisSeason(state.characters[0], 1220, 'Spring');
    expect(e.warpingPoints ?? 0).toBe(0);
    expect(people(report.story ?? [])).not.toMatch(/botch/);
  });

  it('a botch logged before `told` was kept (no told) is still told as a botch', () => {
    const e = newSeasonEntry(1220, 'Spring', 'study-vis', 'Studied Creo vis: 0 (botch): botch', {});
    e.warpingPoints = 1;
    expect(toldOf(e)).toMatch(/Aldith .*botched.*Creo vis|Aldith .*Creo vis.*botched/);
  });
});

describe('older saves and Unlog', () => {
  it('an entry with no `told` is told as it was, from its activity', () => {
    for (const activity of ['study-book', 'exposure', 'practice', 'invent-spell', 'work'] as const) {
      const e = newSeasonEntry(1220, 'Spring', activity, 'Old season');
      const before: ChronicleFacts = { year: 1220, season: 'Spring', covenants: [], people: [{ name: 'Aldith', type: 'magus', did: activity }], news: [] };
      expect(toldOf(e)).toBe(people(writeChronicle(before, steady())));
    }
  });

  it('an old lab season with no `told` is told as lab work, not as the daily round', () => {
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Lab: Invent a spell');
    e.labKind = 'invent';
    const invent: ChronicleFacts = { year: 1220, season: 'Spring', covenants: [], people: [{ name: 'Aldith', type: 'magus', did: 'invent-spell' }], news: [] };
    expect(toldOf(e)).toBe(people(writeChronicle(invent, steady())));
  });

  it('a season unlogged after its story was written leaves the Chronicle; the others stay', () => {
    const st = visSaga(6);
    const b = newCharacter('magus', st.saga.id);
    b.name = 'Bertha';
    b.creation.finalized = true;
    b.covenantId = st.covenants[0].id;
    st.covenants[0].memberIds.push(b.id);
    st.characters.push(b);
    const { state, report } = advanceSeason(st, data, { ...quiet, rng: fives });
    const sec = (report.story ?? []).find((s) => s.title === 'At the covenant')!;
    expect(sec.people?.map((p) => p.name)).toEqual(['Magus', 'Bertha']);
    const m = state.characters[0];
    const [e] = loggedThisSeason(m, 1220, 'Spring');
    const logged = (cs: Character[]) => new Set(cs.flatMap((c) => c.seasonLog.map((x) => x.uid)));
    expect(tellPeople(sec.people!, sec.grogs, (u) => logged(state.characters).has(u))).toBe(sec.text);
    expect(unlogSeason(m, e.uid, state.covenants).ok).toBe(true);
    const now = tellPeople(sec.people!, sec.grogs, (u) => logged(state.characters).has(u));
    expect(now).not.toContain('Magus');
    expect(now).toContain('Bertha');
  });

  it('no sentence names more than two people, so the season reads aloud', () => {
    const f: ChronicleFacts = {
      year: 1220,
      season: 'Spring',
      covenants: [],
      people: ['A', 'B', 'C', 'D', 'E'].map((n) => ({ name: n, type: 'magus', did: 'study-book' as const })),
      news: [],
    };
    const sentences = people(writeChronicle(f, steady())).split(/(?<=\.) /);
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toMatch(/^Of the magi, A .*, while B /);
  });
});
