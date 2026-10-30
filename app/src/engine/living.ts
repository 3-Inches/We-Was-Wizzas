// Living covenants: the covenants a Tribunal book describes, built into a saga with the magi it
// names (and those it counts without naming), their laboratories, library, vis, covenfolk and
// accounts, so that they carry on by themselves as the seasons pass. Their people follow season
// priority lists (priorities.ts); the turn of the year closes their books like any covenant's, keeps
// their treasuries whole, brings new magi to fill places left empty, and now and then has one of
// them come to the players' covenant with an offer, a request or trouble from the book. Tribunal
// gatherings (every seven years at Durenmar, in the Rhine, from Walpurgis Night) take the season of
// every living magus. The magi the book describes who belong to no covenant (the wanderers) are built
// with the covenant they start at, as its guests.

import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type GameData } from '../data';
import { bookCovenant, tribunalBook, type BookApproach, type BookCovenant, type BookMagus, type BookWanderer, type TribunalBook } from '../data/livingCovenants';
import type { BookItem, MagusExtras } from '../data/livingCovenants/types';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { addVirtue, newCharacter } from './character/factory';
import { applyStatBlock, type StatBlock } from './character/statBlock';
import { familiarBindingVis, longevityBonus, talismanCapacity } from './enchant';
import { issueRedcapDevices, makeTalisman, redcapLevels, servedByMercerHouse } from './generate/items';
import { optionOn } from './optional';
import { labTotal } from './magic';
import { generateFamiliar } from './generate/spellsAndFamiliars';
import { freshName } from './generate/names';
import { deriveCovenant, newCovenant } from './covenant';
import { DEFAULT_YEAR_END, planYearEnd } from './covenantYear';
import type { Rng } from './dice';
import { generateCharacter } from './generate/character';
import { fillCovenant } from './generate/covenant';
import { stockLibrary } from './generate/library';
import { greatLibraryBooks } from './generate/greatLibraryStock';
import { seeded } from './generate/random';
import { newSoldierGroup, soldierBoonsWithoutGroups, soldierKindOf } from './covenfolk';
import { newLab } from './lab';
import { defaultPriorities, houseDuty } from './priorities';
import type { Character, Covenant, EnchantedEffectRecord, EnchantedItem, HouseRules, PriorityKind, Saga, Season, TribunalNews, VisSource } from './types';
import { addVis, takeVis, visAvailable, visText } from './vis';
import { transfer } from './market';
import { uid } from '../util/id';
import { HOUSE_BY_ID } from '../data/houses';

/** A House's name, from its id ("Ex Miscellanea" for ex-miscellanea). */
export const houseName = (id?: string) => HOUSE_BY_ID[id ?? '']?.name ?? id ?? '';

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

/** The ids of a saga's living covenants and of everyone who belongs to one, or wanders among them. */
export function livingIds(covenants: Covenant[], characters: Character[] = []): { covenants: Set<string>; members: Set<string> } {
  const covs = covenants.filter((c) => c.living);
  return { covenants: new Set(covs.map((c) => c.id)), members: new Set([...covs.flatMap((c) => c.memberIds), ...characters.filter((c) => c.wanderer).map((c) => c.id)]) };
}

/** The magi a book's covenant has: those it names (not the Redcaps) and those it counts. */
export function magiTarget(def: BookCovenant): number {
  return def.magi.filter((m) => !m.ungifted).length + (def.others ?? []).reduce((t, o) => t + o.count, 0);
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

/**
 * One of the book's named magi (or Redcaps), built from their stat block: the book's own where it
 * prints one, else the one written to what it says of them (data/livingCovenants). Seeded, so their
 * familiar comes out the same each time.
 */
function bookMagus(m: BookMagus, book: TribunalBook, def: BookCovenant, cov: Covenant, g: LivingContext, seed: number, avoid: string[], log: string[]): Character | undefined {
  const years = g.saga.currentYear - book.present;
  const age = m.age + years;
  if (age < 20) {
    log.push(`${m.name} is still an apprentice in ${g.saga.currentYear}; left out.`);
    return undefined;
  }
  const magus = !m.ungifted;
  const sheet = book.sheets?.[m.name];
  const c = sheet ? sheetCharacter(m, sheet, g, age, seed, log) : generatedMagus(m, cov, g, age, seed, avoid);
  c.name = m.name;
  c.gender = m.gender;
  c.age = age;
  c.birthYear = g.saga.currentYear - age;
  if (!magus) c.house = 'mercere';
  c.personality = m.traits.map(([trait, score]) => ({ uid: uid(), trait, score }));
  // the toolkit's summary, then what the book says, in its words
  const text = book.texts?.[m.name];
  c.description = [[m.title, m.note].filter(Boolean).join('. '), text].filter(Boolean).join('\n\n');
  const notes = [
    `From ${book.title} (line ${m.line}).`,
    sheet ? '' : 'Made by the generator: the book gives no stat block and none has been written.',
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
  if (book.tribunal === 'Rhine') c.rhine = { rank: m.rank, gild: m.gild ?? def.gild };
  c.priorities = m.priorities
    ? m.priorities.map((kind) => (m.arts && ['read', 'vis', 'invent', 'enchant'].includes(kind) ? { kind: kind as PriorityKind, arts: m.arts } : { kind: kind as PriorityKind }))
    : defaultPriorities(c, { role: m.role, arts: m.arts, ungifted: m.ungifted });
  c.standing = m.inactive ? { kind: 'none' } : { kind: 'priorities' };
  if (m.chapter) c.auraTime = 'away';
  c.npc = true;
  c.covenantId = cov.id;
  finishMagus(c, g, seeded(seed + 7), log, book.extras?.[m.name]);
  return c;
}

/** The Houses peregrinatores come from (a Gifted Mercere is rare, and has the Mercer Houses to stay at). */
const PEREGRINE_HOUSES = ['bonisagus', 'tremere', 'flambeau', 'jerbiton', 'merinita', 'ex-miscellanea', 'verditius', 'criamon', 'tytalus', 'guernicus', 'bjornaer'];

/** Common heartbeasts for a Bjornaer the book does not give one (HoH:MC lists many more). */
const HEARTBEASTS = ['wolf', 'bear', 'boar', 'stag', 'raven', 'owl', 'fox', 'badger', 'hawk', 'otter', 'lynx', 'eagle', 'horse', 'hare', 'wildcat', 'beaver'];

/**
 * What a living magus has beyond their sheet: the book's items and familiar, the House Mysteries
 * they have been initiated into (when the saga uses Mystery Initiation), a talisman for most magi
 * of some standing, a heartbeast for a Bjornaer, and a Redcap's devices from the Mercer House.
 */
function finishMagus(c: Character, g: LivingContext, rng: Rng, log: string[], extras?: MagusExtras): void {
  const d = c.type === 'magus' ? deriveCharacter(c, g.data, g.rules) : undefined;
  // a talisman holds as many pawns as the highest Technique and Form (DE, Talisman)
  const capacity = d ? talismanCapacity(Math.max(...TECHNIQUES.map((a) => d.arts[a].score)), Math.max(...FORMS.map((a) => d.arts[a].score))) : 0;
  for (const it of extras?.items ?? []) {
    const item = bookItem(it, c, capacity);
    c.items.push(item);
    if (it.kind === 'talisman') c.talismanUid = item.uid;
  }
  const bf = extras?.familiar;
  if (bf) {
    c.familiar = {
      name: bf.name, species: bf.species, might: bf.might, size: bf.size, realm: bf.realm, bindingTechnique: bf.technique, bindingForm: bf.form, bindingLabTotal: bf.labTotal,
      golden: bf.golden, silver: bf.silver, bronze: bf.bronze, pawnsSpent: familiarBindingVis(bf.labTotal), notes: bf.notes,
      powers: bf.powers.map((p) => effectRecord({ name: p.name, technique: p.technique, form: p.form, level: p.level, range: 'Personal', duration: 'Sun', target: 'Individual', final: p.level, text: p.text })),
    };
  }
  if (extras?.mysteries?.length && optionOn(g.saga, 'mysteries'))
    for (const [id, why] of extras.mysteries) {
      const def = g.data.vfById.get(id);
      if (!def || c.virtues.some((v) => v.defId === id)) continue;
      addVirtue(c, g.data, id, def.sizes[0], undefined, { free: true, freeReason: 'Initiated before play', note: `Not in the book: ${why}` });
    }
  if (c.type === 'magus') {
    // a House duty (a Quaesitor's investigations, a Gifted Mercere's season as a Redcap) on a list the book gave
    if (houseDuty(c) && c.priorities && !c.priorities.some((p) => p.kind === 'house')) c.priorities.splice(c.priorities[0]?.kind === 'longevity' ? 1 : 0, 0, { kind: 'house' });
    if (c.house === 'bjornaer' && !c.heartbeast) c.heartbeast = HEARTBEASTS[Math.floor(rng() * HEARTBEASTS.length)];
    // a talisman: every archmage, most masters, some journeymen of long standing
    const rank = c.rhine?.rank;
    const pg = Math.max(0, c.age - c.creation.apprenticeshipStartAge - 15);
    const chance = rank === 'archmage' ? 1 : rank === 'master' || pg >= 30 ? 0.7 : pg >= 15 ? 0.3 : 0;
    if (!c.talismanUid && d && rng() < chance) {
      const t = makeTalisman(c, d, g.data, rng);
      c.items.push(t);
      c.talismanUid = t.uid;
    }
  } else if (servedByMercerHouse(c)) {
    // the Mercer House's devices for carrying messages: fifty levels at the Gauntlet and two a year since
    c.redcap = { levels: redcapLevels(c, Math.max(0, c.age - 25)), spent: 0 };
    const got = issueRedcapDevices(c, g.data, rng);
    if (got.length) log.push(`${c.name}: a Redcap’s devices from the Mercer House (${got.join(', ')}).`);
  }
}

function effectRecord(e: { name: string; technique: EnchantedEffectRecord['technique']; form: EnchantedEffectRecord['form']; requisites?: EnchantedEffectRecord['requisites']; level: number; range: string; duration: string; target: string; uses?: string; penetration?: number; environmental?: boolean; linked?: boolean; concentration?: boolean; final: number; text: string }): EnchantedEffectRecord {
  return {
    uid: uid(), name: e.name, technique: e.technique, form: e.form, requisites: e.requisites ?? [], baseLevel: e.level, range: e.range, duration: e.duration, target: e.target, usesPerDay: e.uses ?? '1',
    penetration: e.penetration ?? 0, concentration: !!e.concentration, effectUse: false, environmentalTrigger: !!e.environmental, fastTrigger: false, linkedTrigger: !!e.linked, expiry: 'none',
    modifiedLevel: e.final, description: e.text, investedPawns: Math.ceil(e.final / 10),
  };
}

/** An item as the book gives it: its effects at the book's final levels, a talisman opened to the magus's capacity. */
function bookItem(it: BookItem, c: Character, capacity: number): EnchantedItem {
  const effects = it.effects.map(effectRecord);
  const pawns = effects.reduce((t, e) => t + (e.investedPawns ?? 0), 0);
  return {
    uid: uid(), name: it.name, kind: it.kind, material: it.material, size: it.size, shapeMaterialIds: [], openedPawns: it.kind === 'talisman' ? Math.max(pawns, capacity) : it.kind === 'invested' ? pawns : 0,
    effects, attunements: (it.attunements ?? []).map(([label, bonus]) => ({ label, bonus })), creatorId: c.id, attuned: it.kind === 'talisman' ? true : undefined,
    notes: [it.text, it.carriedBy ? `Carried by ${it.carriedBy}.` : ''].filter(Boolean).join(' '),
  };
}


/** One of the book's wanderers, as a guest of the covenant they start at, with a laboratory of their own there. */
function buildWanderer(w: BookWanderer, book: TribunalBook, def: BookCovenant, cov: Covenant, g: LivingContext, seed: number, avoid: string[], log: string[]): Character | undefined {
  const c = bookMagus({ ...w, guest: false }, book, def, cov, g, seed, avoid, log);
  if (!c) return undefined;
  c.wanderer = { wanders: w.wanders, since: g.saga.currentYear, stay: w.stay, winters: w.winters, favors: w.favors, book: book.book, key: w.name, visited: [cov.id] };
  if (c.rhine) c.rhine.gild = w.gild;
  c.acknowledgedIssues = [...new Set([...c.acknowledgedIssues, ...validateCharacter(deriveCharacter(c, g.data, g.rules), g.data, g.rules).filter((i) => i.severity === 'error').map((i) => i.id)])];
  c.notes = [c.notes, w.wanders === 'peregrinator' ? `A peregrinator: stays ${w.stay ?? 3} years or so at a covenant as its guest, then moves on.` : `Winters at a covenant (${bookCovenant(w.winters)?.cov.name ?? 'any that will have them'}) and spends the summer on the road.`, `A guest of ${cov.name}, not a member.`].join(' ');
  cov.labs.push(newLab(`${c.name}’s laboratory`, c.id));
  return c;
}

/** A named magus from their stat block, with what a magus of their years has that a block leaves out. */
function sheetCharacter(m: BookMagus, sheet: StatBlock, g: LivingContext, age: number, seed: number, log: string[]): Character {
  const rng = seeded(seed);
  const magus = !m.ungifted;
  const c = newCharacter(magus ? 'magus' : 'companion', g.saga.id, g.saga.currentYear);
  c.name = m.name;
  c.gender = m.gender;
  c.age = age;
  c.birthYear = g.saga.currentYear - age;
  c.house = magus ? m.house : undefined;
  if (magus) {
    // the years the stat block stands for: from the Gauntlet to the book's present
    const gauntlet = sheet.gauntlet ?? Math.min(25, m.age);
    c.creation.apprenticeshipStartAge = Math.max(5, gauntlet - 15);
    c.creation.yearsPostGauntlet = Math.max(0, m.age - gauntlet);
  }
  const r = applyStatBlock(c, sheet, g.data, g.rules);
  for (const p of r.problems) log.push(`${m.name}: the toolkit does not know ${p}; left out.`);
  if (sheet.apparentAge) c.apparentAge = sheet.apparentAge + (age - m.age);
  if (magus) {
    const d = deriveCharacter(c, g.data, g.rules);
    // a Longevity Ritual from 35, as strong as their own Lab Total makes it, where the block gives none
    if (!c.longevity && m.age >= 35) {
      const lt = labTotal(d, { technique: 'Cr', form: 'Co' }, { activity: 'longevity', aura: { strength: 3, realm: 'Magic' }, forSelfLongevity: true }).total;
      const bonus = longevityBonus(lt, 0, false);
      if (bonus > 0) c.longevity = { labTotal: lt, bonus, extraVis: 0, createdYear: c.birthYear + 35 };
    }
    if (c.longevity) c.longevity.createdYear ??= c.birthYear + 35;
    if (m.familiar) {
      const f = generateFamiliar(d, rng, { bind: true }).familiar;
      const [name, rest] = m.familiar.includes(',') ? m.familiar.split(/,\s*/, 2) : ['', m.familiar];
      // the book's name for it, or one of the toolkit's
      c.familiar = { ...f, name: name || freshName(rng, 'latin', rng() < 0.5, [m.name]), species: rest.replace(/^(an?|her|his)\s+/i, '').replace(/\s+(she|he|who|that)\b.*$/, '') || f.species };
    }
  }
  c.creation.finalized = true;
  return c;
}

/** A named magus a book gives no stat block for and none has been written: made by the generator, keeping to the book's Arts and role. */
function generatedMagus(m: BookMagus, cov: Covenant, g: LivingContext, age: number, seed: number, avoid: string[]): Character {
  const magus = !m.ungifted;
  const startAge = age >= 25 ? 10 : Math.max(5, age - 15);
  const answers: Record<string, number> = magus && m.arts?.length ? { 'b-arts': 10, 'a-focus': 5, ...Object.fromEntries(m.arts.map((a) => [`b-art-${a}`, 10])) } : {};
  return generateCharacter(
    {
      type: magus ? 'magus' : 'companion', role: magus ? `magus-${m.role}` : 'redcap', house: magus ? m.house : undefined, gender: m.gender, age: magus ? undefined : age,
      yearsPostGauntlet: magus ? Math.max(0, age - startAge - 15) : undefined, startAge: magus ? startAge : undefined, answers,
      spells: magus ? { maxLevel: SPELL_CAP[m.rank], arts: m.arts } : undefined, familiar: magus && !!m.familiar, variety: 'focused', npc: true, seed, avoidNames: avoid,
    },
    { ...g, covenant: cov },
  ).c;
}

/** One of the magi a book counts without naming (or a new one: a journeyman just out of apprenticeship, with pg 0). */
export function otherMagus(house: string, rank: BookMagus['rank'] | 'mixed', book: TribunalBook, def: BookCovenant, cov: Covenant, g: LivingContext, rng: Rng, seed: number, avoid: string[], note: string, o: { pg?: number } = {}): Character {
  const roles = HOUSE_ROLES[house] ?? ['scholar'];
  const role = roles[Math.floor(rng() * roles.length)];
  const r = rank === 'mixed' ? (rng() < 0.6 ? 'journeyman' : 'master') : rank;
  const pg = o.pg ?? (r === 'journeyman' ? 2 + Math.floor(rng() * 20) : r === 'master' ? 26 + Math.floor(rng() * 35) : 60 + Math.floor(rng() * 30));
  const gen = generateCharacter({ type: 'magus', role: `magus-${role}`, house, yearsPostGauntlet: pg, spells: { maxLevel: SPELL_CAP[r] }, familiar: rng() < 0.4, variety: 'varied', npc: true, seed, avoidNames: avoid }, { ...g, covenant: cov });
  const c = gen.c;
  c.notes = `One of ${note} (${book.title}, line ${def.line}); the book does not name them, so the toolkit made them.`;
  if (book.tribunal === 'Rhine') c.rhine = { rank: r, gild: def.gild };
  c.priorities = defaultPriorities(c, { role });
  c.standing = { kind: 'priorities' };
  c.npc = true;
  c.covenantId = cov.id;
  finishMagus(c, g, rng, []);
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
  cov.auraRealm = def.realm;
  // its Boons and Hooks, read from the book; the Aura Boons and a Weak Aura Hook are part of the book's aura
  cov.hooksBoons = (def.hooksBoons ?? []).flatMap((e) => {
    const [id, note] = typeof e === 'string' ? [e, undefined] : e;
    const hb = g.data.hookBoonById.get(id);
    return hb ? [{ uid: uid(), defId: hb.id, name: hb.name, kind: hb.kind, size: hb.size, note }] : [];
  });
  // the soldiers its soldier Boons bring, as the book counts them (else ten), so their pay is in its accounts
  for (const hb of soldierBoonsWithoutGroups(cov)) (cov.finances.soldiers ??= []).push(newSoldierGroup(soldierKindOf(hb.name)!.id, def.soldiers?.[hb.defId ?? ''] ?? 10, hb.uid));
  const auraBoons = cov.hooksBoons.filter((h) => h.kind === 'boon' && h.size === 'Minor' && /^aura$/i.test(h.name)).length;
  const weak = cov.hooksBoons.some((h) => h.kind === 'hook' && /^weak aura$/i.test(h.name)) ? 1 : 0;
  cov.aura = Math.max(0, def.aura - auraBoons + weak);
  if (def.labAura) cov.labAura = { name: def.labAura.name, realm: def.labAura.realm, strength: def.labAura.strength, count: def.labAura.count, seasonsEach: def.labAura.seasonsEach, text: def.labAura.text };
  cov.description = def.summary;
  cov.notes = [
    `${def.place}. From ${book.title} (line ${def.line}).`,
    def.seasonGuess ? 'The book does not give its season: this is a likely one from what it says.' : '',
    def.auraGuess ? 'The book does not give its aura: this is a likely one.' : '',
    def.auraNote ?? '',
    def.hooksBoons?.length ? 'The book gives no Boons and Hooks: these are read from what it says of the covenant (a non-player covenant’s need not balance).' : '',
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
  if (def.greatLibrary) cov.library.push(...greatLibraryBooks(g.data, rng).map((b) => ({ ...b, inPlay: true })));
  else {
    const lib = stockLibrary(cov, chars, g, LIBRARY_BP[def.library], { arts: true, abilities: true, labTexts: true, mundane: true }, rng);
    cov.library.push(...lib.books.map((b) => ({ ...b, inPlay: true })));
  }
  log.push(`Library: ${cov.library.length} books.`);

  // accounts that hold: income enough for the year's costs, with a margin by its wealth, and a year in the treasury
  cov.finances.treasury = 0;
  const plan = planYearEnd(cov, deriveCovenant(cov, g.data, chars), DEFAULT_YEAR_END);
  const need = Math.ceil(plan.expenditure * (1 + MARGIN[def.wealth]) - plan.income);
  if (need > 0) cov.income.push({ uid: uid(), name: 'Holdings and dealings', type: 'Other', level: 'Typical', pounds: need, customPounds: true, inPlay: true });
  cov.finances.treasury = Math.round(plan.expenditure * (0.5 + MARGIN[def.wealth] * 2));
  log.push(`Accounts: about ${Math.round(plan.expenditure)} £ a year spent, ${cov.finances.treasury} £ in the treasury.`);

  // peregrinatores: around a sixth of the Rhine's magi live as guests under its guest-laws, mostly
  // journeymen (GotF, Laws of Hospitality): about one for every five members, Bjornaer at Crintera
  if (o.others !== false && book.tribunal === 'Rhine' && optionOn(g.saga, 'rhineGilds')) {
    const guests = Math.round(chars.filter((c) => c.type === 'magus').length / 5);
    for (let i = 0; i < guests; i++) {
      yield 'a peregrinator, a guest';
      const c = newPeregrinator(book, def, cov, g, rng, o.seed * 1000 + k++, avoid, year);
      avoid.push(c.name);
      chars.push(c);
    }
  }

  // the book's wanderers who start here, as its guests (not members)
  for (const w of (book.wanderers ?? []).filter((x) => x.startsAt === def.id && !(o.avoidNames ?? []).includes(x.name))) {
    yield `${w.name}, a guest`;
    const c = buildWanderer(w, book, def, cov, g, o.seed * 1000 + k++, avoid, log);
    if (c) chars.push(c);
  }
  return { cov, chars, log };
}

// ================================================================ the Tribunal through the years

/** The season a Tribunal's gatherings take: the book's (the Rhine's open on Walpurgis Night, the eve of the 1st of May), else Summer. */
/** A peregrinator staying at a covenant as its guest, with a laboratory of their own there: mostly journeymen, Bjornaer at Crintera (GotF, Laws of Hospitality). */
function newPeregrinator(book: TribunalBook, def: BookCovenant, cov: Covenant, g: LivingContext, rng: Rng, seed: number, avoid: string[], since: number): Character {
  const house = def.domusMagna === 'bjornaer' ? 'bjornaer' : PEREGRINE_HOUSES[Math.floor(rng() * PEREGRINE_HOUSES.length)];
  const c = otherMagus(house, 'journeyman', book, def, cov, g, rng, seed, avoid, 'the peregrinatores who stay as guests', { pg: 1 + Math.floor(rng() * 12) });
  c.notes = `A peregrinator the toolkit made, a guest of ${cov.name}: around a sixth of the Rhine’s magi are peregrinatores, living from covenant to covenant under its guest-laws (${book.title}, line 568).`;
  c.wanderer = { wanders: 'peregrinator', since, stay: 3 + Math.floor(rng() * 3), favors: 'any', book: book.book, key: c.name, visited: [cov.id] };
  cov.labs.push(newLab(`${c.name}’s laboratory`, c.id));
  return c;
}

export function gatheringSeason(book: TribunalBook | undefined): Season {
  return book?.gathering.season ?? 'Summer';
}

/**
 * Does the Tribunal meet this year? Every so many years from its first, but a gathering that would
 * fall in a Grand Tribunal's year is held a year earlier (GotF timeline: the Rhine's of 1227, "a year
 * earlier than usual to accommodate the Grand Tribunal next year").
 */
export function isGatheringYear(book: TribunalBook, year: number): boolean {
  const g = book.gathering;
  const grand = book.otherGatherings?.find((o) => o.grand);
  const meets = (y: number) => y >= g.from && (y - g.from) % g.every === 0;
  const isGrand = (y: number) => !!grand && y >= grand.from && (y - grand.from) % grand.every === 0;
  if (!g.beforeGrand) return meets(year);
  return (meets(year) && !isGrand(year)) || (meets(year + 1) && isGrand(year + 1));
}

/** The Tribunal gathering that takes this season, if any. */
export function gatheringIn(saga: Saga, year: number, season: Season): { name: string; at: string } | undefined {
  const book = tribunalBook(saga.tribunal);
  if (!book || season !== gatheringSeason(book) || !isGatheringYear(book, year)) return undefined;
  return { name: `the ${book.tribunal} Tribunal`, at: book.covenants.find((c) => c.id === book.gathering.at)?.name ?? book.gathering.at };
}

/** A House's own gathering that takes this season (the Bjornaer's Gathering of Twelve Years at Crintera): the book gives no season, so the toolkit takes Summer. */
export function houseGatheringIn(saga: Saga, year: number, season: Season): { name: string; at: string; house: string } | undefined {
  if (season !== 'Summer') return undefined;
  const book = tribunalBook(saga.tribunal);
  const o = book?.otherGatherings?.find((x) => x.house && year >= x.from && (year - x.from) % x.every === 0);
  return o && book ? { name: o.name, at: book.covenants.find((c) => c.id === o.at)?.name ?? o.at, house: o.house! } : undefined;
}

/** The next gatherings after a year: the Tribunal's and any House's. */
export function nextGatherings(saga: Saga, year: number): { name: string; year: number; at: string; house?: string }[] {
  const book = tribunalBook(saga.tribunal);
  if (!book) return [];
  const next = (from: number, every: number) => (year <= from ? from : from + Math.ceil((year - from) / every) * every);
  const at = (id: string) => book.covenants.find((c) => c.id === id)?.name ?? id;
  let tribunal = Math.max(year, book.gathering.from - 1);
  while (!isGatheringYear(book, tribunal)) tribunal++;
  return [
    { name: `The ${book.tribunal} Tribunal`, year: tribunal, at: at(book.gathering.at) },
    ...(book.otherGatherings ?? []).map((o) => ({ name: o.name, year: next(o.from, o.every), at: at(o.at), house: o.house })),
  ];
}

const news = (year: number, season: Season, x: Omit<TribunalNews, 'uid' | 'year' | 'season'>): TribunalNews => ({ uid: uid(), year, season, ...x });

/** The names taken in a saga: its characters', and those of their apprentices still in training. */
export function takenNames(characters: Character[]): string[] {
  return characters.flatMap((c) => (c.apprentice ? [c.name, c.apprentice.name] : [c.name]));
}

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
  // an approach left unanswered for two years lapses: the covenant may come again with it
  for (const n of state.saga.tribunalNews ?? []) if (n.kind === 'approach' && !n.done && n.year < year) Object.assign(n, { done: true, lapsed: true });
  for (const cov of living) {
    const found = bookCovenant(cov.living!.key);
    const members = state.characters.filter((c) => cov.memberIds.includes(c.id));
    // a treasury that went below nothing is made good from the covenant's holdings
    if (cov.finances.treasury < 0) {
      lines.push({ who: cov.name, tribunal: cov.id, text: `${cov.name} makes good its shortfall of ${Math.abs(Math.round(cov.finances.treasury))} £ from its holdings.` });
      cov.finances.treasury = 0;
    }
    // its accounts as costs and inflation rise: a covenant that ran at a loss improves its income by magic,
    // and one that has piled up more than five years' spending puts the rest into its lands and holdings
    lines.push(...livingAccounts(cov, members, g.data));
    // deaths
    for (const c of members) {
      if (c.wounds.dead && wasAlive.has(c.id)) out.push(news(year, 'Winter', { kind: 'death', covenantId: cov.id, characterId: c.id, text: `${c.name} of ${cov.name} has died (aged ${c.age}).` }));
    }
    if (!found) continue;
    // a covenant short of the magi its book gives it takes in a new journeyman now and then
    const magi = members.filter((c) => c.type === 'magus' && !c.wounds.dead && !c.retired).length;
    const target = magiTarget(found.cov);
    if (magi < target && rng() < 0.25) {
      const houses = found.cov.domusMagna ? [found.cov.domusMagna] : found.cov.magi.map((m) => m.house).filter((h) => h !== 'mercere');
      const house = houses[Math.floor(rng() * houses.length)] ?? 'ex-miscellanea';
      const c = otherMagus(house, 'journeyman', found.book, found.cov, cov, { ...g, saga: state.saga }, rng, Math.floor(rng() * 1e9), takenNames(state.characters), `the magi who join ${cov.name} in play`);
      c.notes = `Joined ${cov.name} in ${year + 1}, a journeyman the toolkit made to fill a place left empty.`;
      state.characters.push(c);
      cov.memberIds.push(c.id);
      const lab = newLab(`${c.name}’s laboratory`, c.id);
      cov.labs.push(lab);
      out.push(news(year, 'Winter', { kind: 'member', covenantId: cov.id, characterId: c.id, text: `${c.name}, a young magus of House ${houseName(house)}, joins ${cov.name}.` }));
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
  lines.push(...peregrinatoresArrive(state, { ...g, saga: state.saga }, living, year, rng));
  return { lines, news: out };
}

/** The income a living covenant's magi have raised by enchantments and rituals in play. */
export const IMPROVED_INCOME = 'Improved by magic in play';

/**
 * A living covenant keeping its accounts in a long saga, as its magi would: inflation rises every year
 * (Covenants ch.5), so a covenant that ran at a loss raises its income by Magical Improvement (enchanted
 * devices and rituals) by the shortfall and a little more; and a treasury beyond five years' spending
 * goes into its lands and holdings, which make good a shortfall in a bad year.
 */
export function livingAccounts(cov: Covenant, members: Character[], data: GameData): { who: string; text: string; tribunal: string }[] {
  const out: { who: string; text: string; tribunal: string }[] = [];
  const f = deriveCovenant(cov, data, members).finances;
  if (f.balance < 0) {
    const add = Math.ceil(-f.balance + f.totalExpenditure * 0.02);
    let src = cov.income.find((s) => s.inPlay && s.name === IMPROVED_INCOME);
    if (!src) cov.income.push((src = { uid: uid(), name: IMPROVED_INCOME, type: 'Magical improvement', level: 'Typical', pounds: 0, customPounds: true, inPlay: true }));
    src.pounds += add;
    out.push({ who: cov.name, tribunal: cov.id, text: `${cov.name}’s magi raise its income by ${add} £ a year with enchantments and rituals, as its costs and inflation outgrow it (Covenants, Magical Improvement).` });
  }
  const cap = Math.round(5 * f.totalExpenditure);
  if (cap > 0 && cov.finances.treasury > cap) {
    const extra = Math.round(cov.finances.treasury - cap);
    cov.finances.treasury = cap;
    out.push({ who: cov.name, tribunal: cov.id, text: `${cov.name} puts ${extra} £ beyond five years’ spending into its lands and holdings.` });
  }
  return out;
}

/**
 * Under the Rhine's guest-laws about a sixth of its magi live as peregrinatores. When fewer do (some
 * have died, or the covenants were added before the Tribunal's customs were turned on), new ones come
 * from other Tribunals, a few a year, each the guest of a living covenant.
 */
function peregrinatoresArrive(state: { saga: Saga; characters: Character[]; covenants: Covenant[] }, g: LivingContext, living: Covenant[], year: number, rng: Rng): { who: string; text: string; tribunal: string }[] {
  const book = tribunalBook(state.saga.tribunal);
  if (book?.tribunal !== 'Rhine' || !optionOn(state.saga, 'rhineGilds') || !living.length) return [];
  const magi = state.characters.filter((c) => c.type === 'magus' && !c.wounds.dead && !c.retired && (!!c.wanderer || living.some((v) => v.memberIds.includes(c.id))));
  const guests = magi.filter((c) => c.wanderer?.wanders === 'peregrinator').length;
  const short = Math.round(magi.length / 6) - guests;
  const out: { who: string; text: string; tribunal: string }[] = [];
  for (let i = 0; i < Math.ceil(short / 4); i++) {
    if (short <= 2 && rng() >= 0.5) break;
    const host = living[Math.floor(rng() * living.length)];
    const found = bookCovenant(host.living!.key);
    if (!found) continue;
    const c = newPeregrinator(found.book, found.cov, host, g, rng, Math.floor(rng() * 1e9), takenNames(state.characters), year + 1);
    state.characters.push(c);
    out.push({ who: host.name, tribunal: host.id, text: `${c.name}, a peregrinator of House ${houseName(c.house)} from another Tribunal, comes to ${host.name} as its guest.` });
  }
  return out;
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
