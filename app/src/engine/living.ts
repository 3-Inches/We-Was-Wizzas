// Living covenants: the covenants a Tribunal book describes, built into a saga with the magi it
// names (and those it counts without naming), their laboratories, library, vis, covenfolk and
// accounts, so that they carry on by themselves as the seasons pass. Their people follow season
// priority lists (priorities.ts); the turn of the year closes their books like any covenant's, keeps
// their treasuries whole, brings new magi to fill places left empty, and now and then has one of
// them come to the players' covenant with an offer, a request or trouble from the book. Tribunal
// gatherings (every seven years at Durenmar, in the Rhine) take the season of every living magus.

import { ARTS, ART_NAMES, type Art, type GameData } from '../data';
import { bookCovenant, tribunalBook, type BookApproach, type BookCovenant, type BookMagus, type TribunalBook } from '../data/livingCovenants';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { addVirtue, ensureAbility } from './character/factory';
import { deriveCovenant, newCovenant } from './covenant';
import { DEFAULT_YEAR_END, planYearEnd } from './covenantYear';
import type { Rng } from './dice';
import { generateCharacter } from './generate/character';
import { fillCovenant } from './generate/covenant';
import { stockLibrary } from './generate/library';
import { seeded } from './generate/random';
import { newLab } from './lab';
import { defaultPriorities } from './priorities';
import type { Character, Covenant, HouseRules, PriorityKind, Saga, Season, TribunalNews, VisSource } from './types';
import { addVis, takeVis, visAvailable, visText } from './vis';
import { transfer } from './market';
import { abilityXpForScore, artXpForScore } from './xp';
import { uid } from '../util/id';

export interface LivingContext {
  data: GameData;
  saga: Saga;
  rules: HouseRules;
}

export interface LivingBuild {
  cov: Covenant;
  chars: Character[];
  log: string[];
}

/** Living covenants (and their people) are the storyguide's, not the players'. */
export function isLiving(cov: Covenant | undefined): boolean {
  return !!cov?.living;
}

/** The ids of a saga's living covenants and of everyone who belongs to one. */
export function livingIds(covenants: Covenant[]): { covenants: Set<string>; members: Set<string> } {
  const covs = covenants.filter((c) => c.living);
  return { covenants: new Set(covs.map((c) => c.id)), members: new Set(covs.flatMap((c) => c.memberIds)) };
}

/** A character of a living covenant (by membership, or by its home covenant). */
export function isLivingMember(c: Character, covenants: Covenant[]): boolean {
  return covenants.some((cov) => cov.living && (cov.memberIds.includes(c.id) || c.covenantId === cov.id));
}

const SPELL_CAP: Record<BookMagus['rank'], number> = { journeyman: 20, master: 30, archmage: 40 };
const LIBRARY_BP: Record<BookCovenant['library'], number> = { poor: 10, modest: 50, good: 140, great: 360 };
const VIS_YEAR: Record<BookCovenant['vis'], number> = { scarce: 4, some: 10, rich: 22, 'very rich': 40 };
const LIVING: Record<BookCovenant['wealth'], number> = { poor: -1, modest: 0, comfortable: 0, rich: 1, 'very rich': 2 };
const MARGIN: Record<BookCovenant['wealth'], number> = { poor: 0.05, modest: 0.1, comfortable: 0.2, rich: 0.35, 'very rich': 0.6 };
/** Roles for the magi a book counts without naming, by House. */
const HOUSE_ROLES: Record<string, string[]> = {
  bonisagus: ['lab', 'scholar'], tremere: ['politician', 'battle-mage'], flambeau: ['battle-mage'], jerbiton: ['social', 'scholar'], merinita: ['faerie'],
  'ex-miscellanea': ['mystic', 'explorer', 'healer'], verditius: ['enchanter'], criamon: ['mystic'], bjornaer: ['beast'], guernicus: ['politician'], mercere: ['explorer'], tytalus: ['politician', 'social'],
};
const VIS_PLACES = ['a spring', 'an ancient oak', 'a standing stone', 'a pool in the forest', 'a hollow in the hills', 'a cave', 'a ruined shrine', 'a grove', 'a barrow', 'a waterfall'];

/** What an older magus knows besides the Arts, by years since the Gauntlet (the generator spends most of those years on two or three Arts). */
const ELDER: { id: string; param?: string; score: (pg: number) => number }[] = [
  { id: 'magic-theory', score: (pg) => Math.min(9, 5 + Math.floor(pg / 10)) },
  { id: 'parma-magica', score: (pg) => Math.min(7, 3 + Math.floor(pg / 15)) },
  { id: 'concentration', score: (pg) => Math.min(5, 2 + Math.floor(pg / 20)) },
  { id: 'penetration', score: (pg) => Math.min(6, 1 + Math.floor(pg / 15)) },
  { id: 'dead-language', param: 'Latin', score: () => 5 },
  { id: 'organization-lore', param: 'Order of Hermes', score: (pg) => Math.min(5, 1 + Math.floor(pg / 15)) },
  { id: 'code-of-hermes', score: (pg) => Math.min(4, 1 + Math.floor(pg / 20)) },
];

/** Move post-Gauntlet experience from the magus' strongest Arts into what a magus of those years would know, so the totals stay within the creation budget. */
function balanceElder(c: Character, g: LivingContext) {
  const pg = c.creation.yearsPostGauntlet;
  if (c.type !== 'magus' || pg < 5) return;
  const sum = (x: Partial<Record<string, number>>) => Object.values(x).reduce((t: number, n) => t + (n ?? 0), 0);
  for (const e of ELDER) {
    if (!g.data.abilityById.has(e.id)) continue;
    const ab = ensureAbility(c, e.id, {}, e.param);
    let need = abilityXpForScore(e.score(pg)) - sum(ab.xp);
    // from the Arts with the most post-Gauntlet experience, a little at a time so they come down together
    for (let guard = 0; need > 0 && guard < 400; guard++) {
      const top = [...ARTS].filter((a) => (c.arts[a].postGauntlet ?? 0) > 0).sort((a, b) => sum(c.arts[b]) - sum(c.arts[a]))[0];
      if (!top) break;
      const take = Math.min(need, 10, c.arts[top].postGauntlet ?? 0);
      c.arts[top] = { ...c.arts[top], postGauntlet: (c.arts[top].postGauntlet ?? 0) - take };
      ab.xp.postGauntlet = (ab.xp.postGauntlet ?? 0) + take;
      need -= take;
    }
  }
}

/** The Arts a book's magus gets, raised to at the least, with the experience put in as a correction (the book's own scores). */
function raiseArts(c: Character, g: LivingContext, arts: Partial<Record<Art, number>>) {
  for (let pass = 0; pass < 3; pass++) {
    const d = deriveCharacter(c, g.data, g.rules);
    let changed = false;
    for (const art of ARTS) {
      const want = arts[art];
      if (want === undefined || d.arts[art].score >= want) continue;
      const need = artXpForScore(want) - d.arts[art].effectiveXp;
      const mult = d.arts[art].multiplier || 1;
      c.arts[art] = { ...c.arts[art], adjust: (c.arts[art].adjust ?? 0) + Math.ceil(need / mult) };
      changed = true;
    }
    if (!changed) return;
  }
}

function addBookVirtues(c: Character, g: LivingContext, ids: string[]) {
  for (const s of ids) {
    const [id, param] = s.split(':');
    if (!g.data.vfById.has(id) || c.virtues.some((v) => v.defId === id && (!param || v.param === param))) continue;
    addVirtue(c, g.data, id, undefined, param);
  }
}

/** One of the book's magi (or Redcaps), made by the generator and set to what the book says. */
function bookMagus(m: BookMagus, book: TribunalBook, def: BookCovenant, cov: Covenant, g: LivingContext, seed: number, avoid: string[], log: string[]): Character | undefined {
  const age = m.age + (g.saga.currentYear - book.present);
  if (age < 20) {
    log.push(`${m.name} is still an apprentice in ${g.saga.currentYear}; left out.`);
    return undefined;
  }
  const magus = !m.ungifted;
  const startAge = age >= 25 ? 10 : Math.max(5, age - 15);
  // the Arts the book names come first, with two Techniques and three Forms raised rather than one and two
  const answers: Record<string, number> = magus && m.arts?.length ? { 'b-arts': 10, 'a-focus': 5, ...Object.fromEntries(m.arts.map((a) => [`b-art-${a}`, 10])) } : {};
  const r = generateCharacter(
    {
      type: magus ? 'magus' : 'companion', role: magus ? `magus-${m.role}` : 'redcap', house: magus ? m.house : undefined, gender: m.gender, age: magus ? undefined : age,
      yearsPostGauntlet: magus ? Math.max(0, age - startAge - 15) : undefined, startAge: magus ? startAge : undefined, answers,
      spells: magus ? { maxLevel: SPELL_CAP[m.rank], arts: m.arts } : undefined, familiar: magus && !!m.familiar, variety: 'focused', npc: true, seed, avoidNames: avoid,
    },
    { ...g, covenant: cov },
  );
  const c = r.c;
  c.name = m.name;
  c.age = age;
  c.birthYear = g.saga.currentYear - age;
  if (!magus) c.house = 'mercere';
  c.personality = m.traits.map(([trait, score]) => ({ uid: uid(), trait, score }));
  c.description = [m.title, m.note].filter(Boolean).join('. ');
  const notes = [
    `From ${book.title} (line ${m.line}).`,
    m.ageGuess ? 'The book gives no age: this one is a likely one for the rank.' : '',
    m.chapter ? `Lives at the chapter house ${m.chapter}.` : '',
    m.guest ? `A guest at ${def.name}, not a member.` : '',
    m.familiar ? `Familiar: ${m.familiar}.` : '',
    m.heartbeast ? `Heartbeast: ${m.heartbeast}.` : '',
    m.inactive ?? '',
  ];
  c.notes = notes.filter(Boolean).join(' ');
  c.fromBook = { book: book.book, line: m.line, title: m.title };
  if (m.heartbeast) c.heartbeast = m.heartbeast;
  if (c.familiar && m.familiar && /^[A-Z][^,]*,/.test(m.familiar)) c.familiar.name = m.familiar.split(',')[0];
  balanceElder(c, g);
  // the book's magi are alive and active in its present: Decrepitude no worse than it gives (2 if it gives none),
  // and an old magus whose own ritual is weak has a stronger one, made for them by another magus
  const decrepitude = abilityXpForScore(m.decrepitude ?? 2);
  if (c.decrepitudePoints > decrepitude) c.decrepitudePoints = decrepitude;
  if (magus && age >= 80 && (c.longevity?.bonus ?? 0) < 8) c.longevity = { labTotal: 40, bonus: 8 + Math.floor((age - 80) / 20), extraVis: 0, createdYear: g.saga.currentYear - 5, createdBy: 'another magus' };
  if (m.statChars) for (const [k, v] of Object.entries(m.statChars)) c.characteristics[k as keyof typeof c.characteristics] = v!;
  if (m.statVirtues) addBookVirtues(c, g, m.statVirtues);
  if (m.statArts) raiseArts(c, g, m.statArts);
  if (book.tribunal === 'Rhine') c.rhine = { rank: m.rank, gild: m.gild ?? def.gild };
  c.priorities = m.priorities
    ? m.priorities.map((kind) => (m.arts && ['read', 'vis', 'invent'].includes(kind) ? { kind: kind as PriorityKind, arts: m.arts } : { kind: kind as PriorityKind }))
    : defaultPriorities(c, { role: m.role, arts: m.arts, ungifted: m.ungifted });
  c.standing = m.inactive ? { kind: 'none' } : { kind: 'priorities' };
  if (m.chapter) c.auraTime = 'away';
  c.npc = true;
  c.covenantId = cov.id;
  return c;
}

/** One of the magi a book counts without naming. */
function otherMagus(house: string, rank: BookMagus['rank'] | 'mixed', book: TribunalBook, def: BookCovenant, cov: Covenant, g: LivingContext, rng: Rng, seed: number, avoid: string[], note: string): Character {
  const roles = HOUSE_ROLES[house] ?? ['scholar'];
  const role = roles[Math.floor(rng() * roles.length)];
  const r = rank === 'mixed' ? (rng() < 0.6 ? 'journeyman' : 'master') : rank;
  const pg = r === 'journeyman' ? 2 + Math.floor(rng() * 20) : r === 'master' ? 26 + Math.floor(rng() * 35) : 60 + Math.floor(rng() * 30);
  const gen = generateCharacter({ type: 'magus', role: `magus-${role}`, house, yearsPostGauntlet: pg, spells: { maxLevel: SPELL_CAP[r] }, familiar: rng() < 0.4, variety: 'varied', npc: true, seed, avoidNames: avoid }, { ...g, covenant: cov });
  const c = gen.c;
  balanceElder(c, g);
  c.notes = `One of ${note} (${book.title}, line ${def.line}); the book does not name them, so the toolkit made them.`;
  if (book.tribunal === 'Rhine') c.rhine = { rank: r, gild: def.gild };
  c.priorities = defaultPriorities(c, { role });
  c.standing = { kind: 'priorities' };
  c.npc = true;
  c.covenantId = cov.id;
  return c;
}

/**
 * Build one of the book's covenants for the saga: the covenant, its magi as full characters (the
 * named ones from the book, the rest generated), a laboratory each, covenfolk as counts with its
 * staff, a library, vis sources and stores, and accounts that balance. Seeded.
 */
export function buildLivingCovenant(book: TribunalBook, def: BookCovenant, g: LivingContext, o: BuildOptions): LivingBuild {
  const it = livingCovenantSteps(book, def, g, o);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

export interface BuildOptions {
  seed: number;
  /** the magi the book counts without naming, generated too (on unless false) */
  others?: boolean;
  /** names already in the saga */
  avoidNames?: string[];
}

/** The build a step at a time: each step yields what it is about to make, so a page can show progress between them. */
export function* livingCovenantSteps(book: TribunalBook, def: BookCovenant, g: LivingContext, o: BuildOptions): Generator<string, LivingBuild, void> {
  const rng = seeded(o.seed);
  const log: string[] = [];
  const year = g.saga.currentYear;
  const cov = newCovenant(g.saga.id, def.founded);
  cov.name = def.name;
  cov.tribunal = book.tribunal;
  cov.season = def.season;
  cov.aura = def.aura;
  cov.auraRealm = def.realm;
  cov.description = def.summary;
  cov.notes = [
    `${def.place}. From ${book.title} (line ${def.line}).`,
    def.seasonGuess ? 'The book does not give its season: this is a likely one.' : '',
    def.auraGuess ? 'The book does not give its aura: this is a likely one.' : '',
    'A living covenant: its people follow their season priorities as the seasons pass.',
  ].filter(Boolean).join(' ');
  cov.living = { book: book.book, key: def.id, tribunal: book.tribunal, addedYear: year };
  cov.loyalty = { ...cov.loyalty, yearsFounded: Math.max(0, year - def.founded) };
  cov.finances.livingConditions = LIVING[def.wealth];
  cov.buildPoints = 0;

  // the people
  const avoid = [...(o.avoidNames ?? []), ...def.magi.map((m) => m.name)];
  const chars: Character[] = [];
  let k = 0;
  for (const m of def.magi) {
    yield m.name;
    const c = bookMagus(m, book, def, cov, g, o.seed * 1000 + k++, avoid, log);
    if (!c) continue;
    chars.push(c);
  }
  if (o.others !== false)
    for (const grp of def.others ?? []) {
      for (let i = 0; i < grp.count; i++) {
        yield `another magus (${grp.note})`;
        const c = otherMagus(grp.houses[i % grp.houses.length], grp.rank, book, def, cov, g, rng, o.seed * 1000 + k++, avoid, grp.note);
        avoid.push(c.name);
        chars.push(c);
      }
    }
  // the book's own scores and Virtues can break the creation rules: allowed, as a troupe ruling would
  for (const c of chars) c.acknowledgedIssues = [...new Set([...c.acknowledgedIssues, ...validateCharacter(deriveCharacter(c, g.data, g.rules), g.data, g.rules).filter((i) => i.severity === 'error').map((i) => i.id)])];
  for (const c of chars) {
    cov.memberIds.push(c.id);
    if (c.type !== 'magus') continue;
    const lab = newLab(`${c.name}’s laboratory`, c.id);
    lab.refinement = c.rhine?.rank === 'archmage' ? 2 : c.rhine?.rank === 'master' ? 1 : 0;
    cov.labs.push(lab);
  }
  log.push(`${chars.filter((c) => c.type === 'magus').length} magi${chars.some((c) => c.type !== 'magus') ? ` and ${chars.filter((c) => c.type !== 'magus').length} Redcap${chars.filter((c) => c.type !== 'magus').length > 1 ? 's' : ''}` : ''}.`);

  // covenfolk: the staff and craftsmen it runs on, then the book's numbers
  yield 'its covenfolk';
  const filled = fillCovenant(cov, chars, g, { staff: true, teacher: false, craftsmen: true, grogs: 0, counts: true, bought: false, gear: true, yearly: true, rest: 'none', seed: o.seed });
  Object.assign(cov, filled.cov);
  cov.covenfolk = { ...cov.covenfolk, grogs: def.folk.grogs, servants: Math.max(cov.covenfolk.servants, def.folk.servants), laborers: Math.max(cov.covenfolk.laborers, def.folk.laborers), companions: def.folk.companions ?? cov.covenfolk.companions };
  log.push(`Covenfolk: ${def.folk.text}`);

  // vis: sources to the book's wealth in vis, across the magi's Arts, and two years' worth in store
  const want = VIS_YEAR[def.vis];
  const arts = [...new Set(chars.flatMap((c) => c.priorities?.flatMap((p) => p.arts ?? []) ?? []))];
  const pool: Art[] = arts.length ? [...arts, 'Vi'] : ['Vi', 'Cr', 'Co'];
  const sources: VisSource[] = [];
  for (let left = want, i = 0; left > 0; i++) {
    const pawns = Math.min(left, 2 + Math.floor(rng() * 5));
    const art = pool[i % pool.length];
    sources.push({ uid: uid(), name: `${VIS_PLACES[i % VIS_PLACES.length].replace(/^./, (x) => x.toUpperCase())} (${art} vis)`, art, pawnsPerYear: pawns, inPlay: true });
    left -= pawns;
  }
  cov.visSources = sources;
  cov.visStocks = [];
  for (const s of sources) addVis(cov.visStocks, s.art, s.pawnsPerYear * 2);
  // a store of Creo, Corpus and Vim for the Longevity Rituals its magi will need
  for (const a of ['Cr', 'Co', 'Vi'] as Art[]) addVis(cov.visStocks, a, Math.ceil(chars.length * (def.vis === 'scarce' ? 1 : 3)));
  log.push(`Vis: ${sources.reduce((t, s) => t + s.pawnsPerYear, 0)} pawns a year from ${sources.length} sources.`);

  // the library, bought as if with Build Points to the book's measure
  yield 'its library';
  const lib = stockLibrary(cov, chars, g, LIBRARY_BP[def.library], { arts: true, abilities: true, labTexts: true, mundane: true }, rng);
  cov.library.push(...lib.books.map((b) => ({ ...b, inPlay: true })));
  log.push(`Library: ${cov.library.length} books.`);

  // accounts that hold: income enough for the year's costs, with a margin by its wealth, and a year in the treasury
  cov.finances.treasury = 0;
  const plan = planYearEnd(cov, deriveCovenant(cov, g.data, chars), DEFAULT_YEAR_END);
  const need = Math.ceil(plan.expenditure * (1 + MARGIN[def.wealth]) - plan.income);
  if (need > 0) cov.income.push({ uid: uid(), name: 'Holdings and dealings', type: 'Other', level: 'Typical', pounds: need, customPounds: true, inPlay: true });
  cov.finances.treasury = Math.round(plan.expenditure * (0.5 + MARGIN[def.wealth] * 2));
  log.push(`Accounts: about ${Math.round(plan.expenditure)} £ a year spent, ${cov.finances.treasury} £ in the treasury.`);
  return { cov, chars, log };
}

// ================================================================ the Tribunal through the years

/** The Tribunal gathering (or a House's gathering) that takes this season, if any: in the Summer of a gathering year. */
export const GATHERING_SEASON: Season = 'Summer';

export function gatheringIn(saga: Saga, year: number, season: Season): { name: string; at: string } | undefined {
  if (season !== GATHERING_SEASON) return undefined;
  const book = tribunalBook(saga.tribunal);
  if (!book) return undefined;
  const g = book.gathering;
  if (year >= g.from && (year - g.from) % g.every === 0) return { name: `the ${book.tribunal} Tribunal`, at: book.covenants.find((c) => c.id === g.at)?.name ?? g.at };
  return undefined;
}

/** The next gatherings after a year: the Tribunal's and any House's. */
export function nextGatherings(saga: Saga, year: number): { name: string; year: number; at: string; house?: string }[] {
  const book = tribunalBook(saga.tribunal);
  if (!book) return [];
  const next = (from: number, every: number) => (year <= from ? from : from + Math.ceil((year - from) / every) * every);
  const at = (id: string) => book.covenants.find((c) => c.id === id)?.name ?? id;
  return [
    { name: `The ${book.tribunal} Tribunal`, year: next(book.gathering.from, book.gathering.every), at: at(book.gathering.at) },
    ...(book.otherGatherings ?? []).map((o) => ({ name: o.name, year: next(o.from, o.every), at: at(o.at), house: o.house })),
  ];
}

const news = (year: number, season: Season, x: Omit<TribunalNews, 'uid' | 'year' | 'season'>): TribunalNews => ({ uid: uid(), year, season, ...x });

/** How a covenant's attitude to the players changes the chance of an approach: trouble from those who dislike them, offers and invitations from those who like them. */
export function approachChance(chance: number, kind: BookApproach['kind'], attitude: NonNullable<Covenant['living']>['attitude'] = 'neutral'): number {
  const warm = attitude === 'ally' ? 2 : attitude === 'friendly' ? 1.5 : attitude === 'wary' ? 0.75 : attitude === 'hostile' ? 0.5 : attitude === 'enemy' ? 0.25 : 1;
  const mult = kind === 'trouble' ? 1 / warm : kind === 'request' || kind === 'visit' || kind === 'trade' ? 1 : warm;
  return Math.min(90, chance * mult);
}

/**
 * The living covenants' turn of the year, after the books are closed and everyone has aged: a
 * treasury that ran short is made whole from its holdings; a death is news; a covenant short of
 * the magi its book gives it may take in a new one; and an approach or two from the book's list
 * may come to the players. Returns the year's lines and the news for the storyguide.
 */
export function livingYearEnd(state: { saga: Saga; characters: Character[]; covenants: Covenant[] }, g: LivingContext, year: number, rng: Rng, wasAlive: Set<string>): { lines: { who: string; text: string; tribunal: string }[]; news: TribunalNews[] } {
  const lines: { who: string; text: string; tribunal: string }[] = [];
  const out: TribunalNews[] = [];
  const living = state.covenants.filter((c) => c.living && !c.living.paused);
  const players = state.covenants.filter((c) => !c.living);
  for (const cov of living) {
    const found = bookCovenant(cov.living!.key);
    const members = state.characters.filter((c) => cov.memberIds.includes(c.id));
    // a treasury that went below nothing is made good from the covenant's holdings
    if (cov.finances.treasury < 0) {
      lines.push({ who: cov.name, tribunal: cov.id, text: `${cov.name} makes good its shortfall of ${Math.abs(Math.round(cov.finances.treasury))} £ from its holdings.` });
      cov.finances.treasury = 0;
    }
    // deaths
    for (const c of members) {
      if (c.wounds.dead && wasAlive.has(c.id)) out.push(news(year, 'Winter', { kind: 'death', covenantId: cov.id, characterId: c.id, text: `${c.name} of ${cov.name} has died (aged ${c.age}).` }));
    }
    if (!found) continue;
    // a covenant short of the magi its book gives it takes in a new journeyman now and then
    const magi = members.filter((c) => c.type === 'magus' && !c.wounds.dead && !c.retired).length;
    const target = found.cov.magi.filter((m) => !m.ungifted).length + (found.cov.others ?? []).reduce((t, o) => t + o.count, 0);
    if (magi < target && rng() < 0.25) {
      const houses = found.cov.domusMagna ? [found.cov.domusMagna] : found.cov.magi.map((m) => m.house).filter((h) => h !== 'mercere');
      const house = houses[Math.floor(rng() * houses.length)] ?? 'ex-miscellanea';
      const c = otherMagus(house, 'journeyman', found.book, found.cov, cov, { ...g, saga: state.saga }, rng, Math.floor(rng() * 1e9), state.characters.map((x) => x.name), `the magi who join ${cov.name} in play`);
      c.notes = `Joined ${cov.name} in ${year + 1}, a journeyman the toolkit made to fill a place left empty.`;
      state.characters.push(c);
      cov.memberIds.push(c.id);
      const lab = newLab(`${c.name}’s laboratory`, c.id);
      cov.labs.push(lab);
      out.push(news(year, 'Winter', { kind: 'member', covenantId: cov.id, characterId: c.id, text: `${c.name}, a young magus of House ${house.replace(/(^|-)\w/g, (x) => x.toUpperCase()).replace('-', ' ')}, joins ${cov.name}.` }));
    }
    // approaches to the players' covenant: each by its chance a year, not the same one two years running
    if (!players.length) continue;
    cov.living!.approached ??= {};
    for (const a of found.cov.approaches) {
      const last = cov.living!.approached[a.id];
      if (last !== undefined && year - last < 2) continue;
      if (a.until !== undefined && year >= a.until) continue;
      if (rng() * 100 >= approachChance(a.chance, a.kind, cov.living!.attitude)) continue;
      cov.living!.approached[a.id] = year;
      out.push(news(year + 1, 'Spring', { kind: 'approach', covenantId: cov.id, approach: a.id, approachKind: a.kind, page: a.page, text: a.text }));
    }
  }
  return { lines, news: out };
}

/** News of a gathering, for the storyguide (the players' magi are expected there too). */
export function gatheringNews(saga: Saga, year: number, season: Season): TribunalNews | undefined {
  const g = gatheringIn(saga, year, season);
  return g ? news(year, season, { kind: 'gathering', text: `${g.name.replace(/^./, (x) => x.toUpperCase())} meets at ${g.at} this ${season}: every living covenant's magi attend, and the players' magi are expected.` }) : undefined;
}

// ================================================================ dealing with a living covenant

export type Offer = { kind: 'vis'; art: Art; pawns: number } | { kind: 'silver'; pounds: number };

/**
 * A trade between the players' covenant and a living one, as the storyguide agrees it: vis or
 * silver one way for vis or silver the other. Both covenants' stores and chronicles change. Returns
 * an error, or nothing when done.
 */
export function tradeWith(ours: Covenant, theirs: Covenant, give: Offer, get: Offer, when: { year: number; season: Season }): string | undefined {
  const a = { kind: 'covenant' as const, cov: ours };
  const b = { kind: 'covenant' as const, cov: theirs };
  const move = (from: typeof a, to: typeof a, o: Offer) => transfer(from, to, o.kind === 'silver' ? o.pounds : 0, o.kind === 'vis' ? { art: o.art, pawns: o.pawns } : undefined, 'a trade', when);
  // check both sides before either moves
  const short = (side: Covenant, o: Offer) =>
    o.kind === 'silver' ? (side.finances.treasury < o.pounds ? `${side.name} has only ${Math.round(side.finances.treasury)} £.` : undefined) : visAvailable(side.visStocks, [o.art]) < o.pawns ? `${side.name} has only ${visAvailable(side.visStocks, [o.art])} pawns of ${ART_NAMES[o.art]} vis.` : undefined;
  return short(ours, give) ?? short(theirs, get) ?? move(a, b, give) ?? move(b, a, get);
}

/** A copy of one of a living covenant's books for the players' library, paid for in vis (any Arts) or silver. */
export function buyCopyFrom(ours: Covenant, theirs: Covenant, bookUid: string, price: Offer | { kind: 'any-vis'; pawns: number }, when: { year: number; season: Season }): string | undefined {
  const book = theirs.library.find((b) => b.uid === bookUid);
  if (!book) return 'That book is not in their library.';
  const a = { kind: 'covenant' as const, cov: ours };
  const b = { kind: 'covenant' as const, cov: theirs };
  if (price.kind === 'any-vis') {
    const r = takeVis(ours.visStocks, [...ARTS], price.pawns);
    if (!r.ok) return `${ours.name} has not ${price.pawns} pawns of vis to pay with.`;
    for (const v of r.taken) addVis(theirs.visStocks, v.art, v.pawns, v.pair);
    ours.log.push({ uid: uid(), year: when.year, season: when.season, text: `Bought a copy of ${book.title} from ${theirs.name} for ${visText(r.taken)} vis.`, visDelta: r.taken.map((v) => ({ ...v, pawns: -v.pawns })) });
    theirs.log.push({ uid: uid(), year: when.year, season: when.season, text: `Sold a copy of ${book.title} to ${ours.name} for ${visText(r.taken)} vis.`, visDelta: r.taken });
  } else {
    const err = transfer(a, b, price.kind === 'silver' ? price.pounds : 0, price.kind === 'vis' ? { art: price.art, pawns: price.pawns } : undefined, `a copy of ${book.title}`, when);
    if (err) return err;
  }
  const { readBy: _read, ownerId: _owner, boonUid: _boon, ...rest } = book;
  ours.library.push({ ...rest, uid: uid(), inPlay: true, copyOf: undefined, notes: `A copy bought from ${theirs.name} in ${when.season} ${when.year}.` });
  return undefined;
}
