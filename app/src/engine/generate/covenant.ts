// Filling out a covenant's people and holdings, everything the Covenfolk page counts: the staff a
// covenant runs on (steward and chamberlain or an autocrat, turb captain, scribe), a teacher for what
// its people lack, a bookbinder and illuminator, a drill sergeant, the craftsmen whose work saves it
// money, grogs for its turb as full characters, soldiers for its soldier Boons, the servants,
// teamsters, laborers and horses it needs, the weapons and armor it keeps, the Redcap visits and
// feast days of its year, books for its library, and the Build Points left over as vis or money.
// Everything is bought with Build Points (the resource pools set aside for it first, then its own
// budget for that kind of purchase, never past what the covenant has left), or, for a covenant
// already in play, recruited at no Build Point cost. Seeded, like the character generator.

import { ARTS, ART_NAMES, type Art, type GameData } from '../../data';
import type { BudgetKind, Character, Covenant, HouseRules, Saga, Specialist } from '../types';
import { abilityCapAtAge, CRAFTS, specialistCost } from '../covenantRules';
import {
  STARTING_RESERVE, VIS_STOCKS, addCostSavingCraftsmen, addGuildAbilities, ageForScore, budgetLeft, deriveCovenant, fitCovenfolk, optimalLaborers, payFromPools, summaCost,
} from '../covenant';
import { CRAFT_GUILD_RANKS, FEAST_CYCLE, guildRanksApply, hasGuildHook, newSoldierGroup, soldierBoonsWithoutGroups, soldierKindOf, suggestedGuildRank, weaponArmorEstimate } from '../covenfolk';
import { optionOn } from '../optional';
import { deriveCharacter } from '../character/derive';
import { abilityXpForScore } from '../xp';
import { stockLibrary, type LibraryOptions } from './library';
import { uid } from '../../util/id';
import { generateCharacter, type Generated } from './character';
import { freshName, homelandGroupFor, regionOf } from './names';
import { between, chance, seeded } from './random';

export interface FillOptions {
  /** steward, chamberlain, turb captain and scribe, each if the covenant has none */
  staff: boolean;
  /** one autocrat in place of a steward and a chamberlain (the Loyalty of both roles) */
  autocrat?: boolean;
  /** a teacher for the Abilities the covenant's people lack most, if there is none */
  teacher: boolean;
  /** the teacher has the Good Teacher Virtue (+5 Quality) */
  goodTeacher?: boolean;
  /** craftsmen who save the covenant money, carpenters first */
  craftsmen: boolean;
  /** a skilled bookbinder and illuminator (Profession 6: +1 Quality each to the books the covenant makes) */
  bookmakers?: boolean;
  /** a drill sergeant for a turb of three or more, and a sergeant for each body of five soldiers or more */
  drill?: boolean;
  /** grogs for the turb, made as full characters */
  grogs: number;
  /** servants and teamsters at the numbers needed, laborers at the number that saves most */
  counts: boolean;
  /** soldiers for each soldier Boon that has none yet */
  soldiers?: boolean;
  /** a riding horse for each magus and companion, a draught horse for each teamster */
  horses?: boolean;
  /** the weapons and armor points worked out from the turb and its soldiers */
  gear?: boolean;
  /** four Redcap visits a year and a cycle of four feast days (a Loyalty point a year) */
  yearly?: boolean;
  /** starting covenfolk, bought with Build Points; else recruited in play at no cost */
  bought: boolean;
  /** books for the library, within its budget */
  library?: LibraryOptions;
  /** what the Build Points left at the end are spent on: vis sources (5 a pawn a year), vis in store (5 pawns a point), silver (10 £ a point), or a third each */
  rest?: 'split' | 'vis-sources' | 'vis' | 'money' | 'none';
  seed: number;
}

export interface FillResult {
  cov: Covenant;
  grogs: Generated[];
  log: string[];
}

const STAFF: { role: Specialist['role']; label: string; ability: { id: string; param?: string; name: string }; chars: Specialist['chars'] }[] = [
  { role: 'steward', label: 'Steward', ability: { id: 'profession-type', param: 'Steward', name: 'Profession: Steward' }, chars: { Int: 1, Com: 1, Pre: 1 } },
  { role: 'chamberlain', label: 'Chamberlain', ability: { id: 'profession-type', param: 'Chamberlain', name: 'Profession: Chamberlain' }, chars: { Pre: 1, Com: 1 } },
  { role: 'turb-captain', label: 'Turb captain', ability: { id: 'leadership', name: 'Leadership' }, chars: { Pre: 1, Sta: 1 } },
  // a skilled scribe (Profession 6) adds a point of Quality to the books the covenant makes (Covenants ch.7)
  { role: 'scribe', label: 'Scribe', ability: { id: 'profession-type', param: 'Scribe', name: 'Profession: Scribe' }, chars: { Dex: 1, Int: 1 } },
];

/** A Hermetic scribe also reads Latin and has Magic Theory and Magic Lore, or the copies they make of the Arts are corrupt (DE, Corrupted Copies; Covenants ch.7, Scriptoria); below their Profession, these cost nothing more. */
const SCRIBE_EXTRAS = (sc: number) => [
  { id: 'dead-language', param: 'Latin', score: Math.min(5, sc) },
  { id: 'artes-liberales', score: Math.min(2, sc) },
  { id: 'magic-theory', score: 1 },
  { id: 'magic-lore', score: 1 },
];

/** Abilities a covenant teacher (who has no Gift) may teach, and how much they matter to magi, companions and grogs. */
const TEACHABLE: { id: string; param?: string; name: string; magus: number; other: number }[] = [
  { id: 'concentration', name: 'Concentration', magus: 1.2, other: 0.3 },
  { id: 'artes-liberales', name: 'Artes Liberales', magus: 1, other: 0.4 },
  { id: 'philosophiae', name: 'Philosophiae', magus: 1, other: 0.2 },
  { id: 'dead-language', param: 'Latin', name: 'Latin', magus: 0.8, other: 0.4 },
  { id: 'medicine', name: 'Medicine', magus: 0.6, other: 0.6 },
  { id: 'magic-lore', name: 'Magic Lore', magus: 0.6, other: 0.3 },
  { id: 'etiquette', name: 'Etiquette', magus: 0.5, other: 0.5 },
  { id: 'folk-ken', name: 'Folk Ken', magus: 0.5, other: 0.5 },
  { id: 'civil-and-canon-law', name: 'Civil and Canon Law', magus: 0.4, other: 0.4 },
  { id: 'theology-christian', name: 'Theology: Christian', magus: 0.3, other: 0.4 },
  { id: 'leadership', name: 'Leadership', magus: 0.3, other: 0.6 },
];

export function fillCovenant(cov0: Covenant, characters: Character[], g: { data: GameData; saga: Saga; rules: HouseRules }, o: FillOptions): FillResult {
  const rng = seeded(o.seed);
  const cov = structuredClone(cov0);
  const log: string[] = [];
  const region = regionOf(homelandGroupFor(g.saga.tribunal));
  // nobody is given a name someone in the saga or the covenant already has
  const used = new Set([...characters.map((c) => c.name), ...cov.specialists.map((s) => s.name)]);
  const name = () => {
    const n = freshName(rng, region, chance(rng, 0.5), used);
    used.add(n);
    return n;
  };
  const grogs: Generated[] = [];
  const all = () => [...characters, ...grogs.map((x) => x.c)];
  const members = () => all().filter((c) => cov.memberIds.includes(c.id));
  const derived = () => deriveCovenant(cov, g.data, all());
  // what a kind of purchase may still take: the pools set aside for it, then its own budget
  const room = (kind: BudgetKind) => {
    if (!o.bought) return Infinity;
    const b = budgetLeft(cov, derived(), kind);
    return b.own + b.pools.reduce((t, p) => t + p.left, 0);
  };
  const pay = (kind: BudgetKind, uids: string[]) => o.bought && payFromPools(cov, g.data, all(), kind, uids);
  // what a pool could not take and the kind's own budget cannot cover comes off again
  const over = (kind: BudgetKind) => {
    if (!o.bought) return false;
    const dc = derived();
    const limit = cov.budget?.[kind];
    return dc.bpSpent > cov.buildPoints || (limit !== undefined && budgetLeft(cov, dc, kind).spent > limit);
  };
  const bpText = (s: Specialist) => (o.bought ? ` (${specialistCost(s)} BP)` : '');
  const short: string[] = [];
  /** Hire one specialist if the Build Points allow: paid from a pool where one is set aside for it. */
  const hire = (s: Specialist, label: string, text: string) => {
    if (o.bought && specialistCost(s) > room('specialist')) return void short.push(label);
    cov.specialists.push(s);
    pay('specialist', [s.uid]);
    if (over('specialist')) return void (cov.specialists.pop(), short.push(label));
    log.push(`${text}${bpText(s)}.`);
  };
  const has = (role: Specialist['role']) => cov.specialists.some((x) => x.role === role);

  if (o.staff) {
    const autocrat = o.autocrat && !has('steward') && !has('chamberlain') && !has('autocrat');
    for (const s of STAFF) {
      if (has(s.role) || ((s.role === 'steward' || s.role === 'chamberlain') && (autocrat || has('autocrat')))) continue;
      // officers add Presence + their Ability to Loyalty; a scribe needs 6 to be skilled
      const score = s.role === 'scribe' ? 6 : between(rng, 5, 7);
      const age = Math.max(ageForScore(score), between(rng, 30, 50));
      const sc = Math.min(score, abilityCapAtAge(age));
      const sp: Specialist = { uid: uid(), name: name(), role: s.role, ability: s.ability.name, score: sc, age, free: !o.bought, abilities: [{ id: s.ability.id, param: s.ability.param, score: sc }, ...(s.role === 'scribe' ? SCRIBE_EXTRAS(sc) : [])], chars: s.chars };
      hire(sp, s.label.toLowerCase(), `${s.label}: ${sp.name}, ${s.ability.name} ${sc}`);
    }
    if (autocrat) {
      const score = between(rng, 6, 7);
      const age = Math.max(ageForScore(score), between(rng, 36, 52));
      const sc = Math.min(score, abilityCapAtAge(age));
      const s: Specialist = {
        uid: uid(), name: name(), role: 'autocrat', ability: 'Profession: Steward', score: sc, age, free: !o.bought,
        abilities: [{ id: 'profession-type', param: 'Steward', score: sc }, { id: 'profession-type', param: 'Chamberlain', score: sc }], chars: { Pre: 2, Com: 1 },
      };
      hire(s, 'autocrat', `Autocrat (steward and chamberlain): ${s.name}, Profession: Steward and Chamberlain ${sc}`);
    }
  }

  if (o.teacher && !has('teacher')) {
    // the best value is an older teacher with high Communication and Teaching and several Abilities at one
    // score, since only the highest counts toward the cost (DE p.180): the Abilities the covenant's people lack most
    const people = members().map((c) => ({ c, d: deriveCharacter(c, g.data, g.rules) }));
    const age = between(rng, 46, 60);
    const cap = abilityCapAtAge(age);
    const budget = o.bought ? room('specialist') : Infinity;
    const com = 3;
    const level = Math.max(0, Math.min(cap, Math.floor((budget - com) / 2)));
    if (level < 3) short.push('teacher');
    else {
      const score = (d: (typeof people)[number]['d'], t: (typeof TEACHABLE)[number]) =>
        Math.max(0, ...d.abilities.filter((a) => a.abilityId === t.id && (!t.param || a.name.toLowerCase().includes(t.param.toLowerCase()))).map((a) => a.total));
      const value = (t: (typeof TEACHABLE)[number]) =>
        people.reduce((sum, p) => sum + Math.max(0, abilityXpForScore(level) - abilityXpForScore(score(p.d, t))) * (p.c.type === 'magus' ? t.magus : t.other), 0);
      const subjects = [...TEACHABLE].map((t) => ({ t, v: value(t) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 4);
      const chosen = subjects.length >= 3 ? subjects : [...TEACHABLE].slice(0, 3).map((t) => ({ t, v: 0 }));
      // teaching in the lab with the best Teaching Specialization adds up to +3 (Covenants ch.9)
      const lab = derived().labs.filter((l) => (l.specializations.Teaching ?? 0) > 0).sort((a, b) => (b.specializations.Teaching ?? 0) - (a.specializations.Teaching ?? 0))[0];
      const s: Specialist = {
        uid: uid(), name: name(), role: 'teacher', ability: chosen[0].t.name, score: level, age, free: !o.bought, teaching: level, goodTeacher: o.goodTeacher || undefined,
        abilities: chosen.map((x) => ({ id: x.t.id, param: x.t.param, score: level })), chars: { Com: com }, teachIn: lab?.lab.uid,
      };
      const quality = com + level + 3 + 6 + (o.goodTeacher ? 5 : 0) + Math.min(3, lab?.specializations.Teaching ?? 0);
      hire(s, 'teacher', `Teacher: ${s.name}, aged ${age}, ${chosen.map((x) => x.t.name).join(', ')} ${level}, Teaching ${level}, Communication +${com}${o.goodTeacher ? ', Good Teacher' : ''}: Quality ${quality} for one student${lab ? ` in ${lab.lab.name || 'a lab'} (Teaching +${Math.min(3, lab.specializations.Teaching ?? 0)})` : ''}`);
    }
  }

  if (o.bookmakers) {
    for (const id of ['bookbinder', 'illuminator']) {
      const craft = CRAFTS.find((c) => c.id === id)!;
      if (cov.specialists.some((s) => s.craft === id)) continue;
      const s: Specialist = { uid: uid(), name: name(), role: 'craftsman', ability: `Craft (${craft.name})`, craft: id, score: 6, rare: true, age: ageForScore(6) + between(rng, 0, 5), free: !o.bought, abilities: [{ id: 'craft-type', param: craft.name, score: 6 }], chars: { Dex: 1 } };
      hire(s, craft.name.toLowerCase(), `${craft.name}: ${s.name}, Craft 6 (skilled: +1 Quality to the books the covenant makes)`);
    }
  }

  // grogs: a sergeant to lead a turb of three or more that has none, then archers for about a third
  // and shield grogs for the rest; finished and ready to play, by whoever in the troupe takes them
  const led = characters.some((c) => c.type === 'grog' && cov.memberIds.includes(c.id) && /sergeant/i.test(c.creation.concept ?? ''));
  for (let i = 0; i < o.grogs; i++) {
    const role = i === 0 && !led && o.grogs >= 3 ? 'sergeant' : chance(rng, 0.33) ? 'archer' : 'shield-grog';
    const gen = generateCharacter({ type: 'grog', role, variety: 'varied', npc: false, finished: true, seed: o.seed + 101 * (i + 1), avoidNames: [...used] }, { ...g, covenant: cov });
    used.add(gen.c.name);
    grogs.push(gen);
    cov.memberIds.push(gen.c.id);
  }
  if (grogs.length) log.push(`Grogs: ${grogs.map((x) => `${x.c.name} (${x.role.label.toLowerCase()})`).join(', ')}.`);

  if (o.soldiers) {
    // the soldiers a Boon brings: the book gives no number, so a body of ten (a grex is up to six)
    for (const hb of soldierBoonsWithoutGroups(cov)) {
      const kind = soldierKindOf(hb.name)!;
      const n = hb.size === 'Major' ? 20 : 10;
      (cov.finances.soldiers ??= []).push(newSoldierGroup(kind.id, n, hb.uid));
      log.push(`${hb.name}: ${n} ${kind.label.toLowerCase()}${kind.pennies ? `, ${kind.pennies} penn${kind.pennies === 1 ? 'y' : 'ies'} a day each (${kind.pennies * n} £ a year)` : ', unpaid'}${kind.horses ? `, ${kind.horses * n} horses` : ''}.`);
    }
  }

  if (o.drill) {
    const turb = cov.covenfolk.grogs + members().filter((c) => c.type === 'grog').length + (cov.finances.soldiers ?? []).filter((x) => x.inhabitants).reduce((t, x) => t + x.count, 0);
    if (turb >= 3 && !has('drill-sergeant')) {
      const age = between(rng, 41, 52);
      const cap = abilityCapAtAge(age);
      const s: Specialist = {
        uid: uid(), name: name(), role: 'drill-sergeant', ability: 'Single Weapon', score: cap, age, free: !o.bought, teaching: Math.max(3, cap - 3),
        abilities: [{ id: 'single-weapon', score: cap }, { id: 'leadership', score: Math.max(3, cap - 2) }], chars: { Com: 1, Pre: 1 },
      };
      hire(s, 'drill sergeant', `Drill sergeant: ${s.name}, Single Weapon ${cap}, Leadership ${Math.max(3, cap - 2)}, Teaching ${s.teaching}: drills the turb one season a year`);
    }
    // a unit sergeant for each body of five soldiers or more, fed, lodged and paid as a specialist (Grogs)
    const units = (cov.finances.soldiers ?? []).filter((x) => x.count >= 5);
    for (let i = cov.specialists.filter((x) => x.role === 'sergeant').length; i < units.length; i++) {
      const age = between(rng, 30, 45);
      const sc = Math.min(5, abilityCapAtAge(age));
      const sp: Specialist = { uid: uid(), name: name(), role: 'sergeant', ability: 'Leadership', score: sc, age, free: !o.bought, abilities: [{ id: 'leadership', score: sc }], chars: { Pre: 1 } };
      hire(sp, 'sergeant', `Unit sergeant for ${units[i].count} soldiers: ${sp.name}, Leadership ${sc}`);
    }
  }

  // servants, teamsters and horses as they are needed, laborers where they save most: before the
  // craftsmen, whose savings depend on how many mouths there are, and again after them
  const fitCounts = () => {
    const m = members();
    const l = derived().labs;
    for (let i = 0; i < 4; i++) {
      if (o.counts) cov.covenfolk.laborers = optimalLaborers(cov, m, l);
      if (o.counts) fitCovenfolk(cov, m, l);
      if (o.horses) cov.covenfolk.horses = m.filter((c) => c.type === 'magus' || c.type === 'companion').length + cov.covenfolk.companions + cov.covenfolk.teamsters;
    }
  };
  fitCounts();

  if (o.craftsmen) {
    const had = new Map(cov.specialists.map((s) => [s.uid, s.count ?? 1]));
    const purse = o.bought ? budgetLeft(cov, derived(), 'specialist') : undefined;
    const maxEach = purse ? Math.max(purse.own, ...purse.pools.map((p) => p.left)) : Infinity;
    const added = addCostSavingCraftsmen(cov, members(), derived().labs, 'best', room('specialist'), maxEach);
    pay('specialist', cov.specialists.filter((s) => !had.has(s.uid)).map((s) => s.uid));
    // a pool takes a craftsman only whole: those it could not, and the budget cannot cover, are not hired
    const pooled = () => new Set(cov.hooksBoons.flatMap((h) => h.resources ?? []));
    let dropped = 0;
    while (over('specialist')) {
      const s = [...cov.specialists].reverse().find((x) => x.role === 'craftsman' && !pooled().has(x.uid) && (x.count ?? 1) > (had.get(x.uid) ?? 0));
      if (!s) break;
      if ((s.count ?? 1) > 1) s.count = (s.count ?? 1) - 1;
      else cov.specialists = cov.specialists.filter((x) => x !== s);
      dropped++;
    }
    const newOnes = cov.specialists.filter((s) => s.role === 'craftsman' && (s.count ?? 1) > (had.get(s.uid) ?? 0));
    const bp = newOnes.reduce((t, s) => t + specialistCost(s) * (1 - (had.get(s.uid) ?? 0) / Math.max(1, s.count ?? 1)), 0);
    log.push(
      added.length && newOnes.length
        ? `Craftsmen (carpenters first, then where each saves most): ${newOnes.map((s) => `${(s.count ?? 1) - (had.get(s.uid) ?? 0)} ${s.name.toLowerCase()}${(s.count ?? 1) - (had.get(s.uid) ?? 0) > 1 ? 's' : ''} at Craft ${s.score}`).join(', ')}${o.bought ? ` (${Math.round(bp)} BP)` : ''}${dropped ? `; ${dropped} more would go past the Build Points, so ${dropped > 1 ? 'are' : 'is'} left to recruit in play` : ''}.`
        : `Craftsmen: ${dropped ? `none within the Build Points left (${dropped} would go past them: recruit in play)` : room('specialist') < 3 ? 'no Build Points left for any' : 'none would save the covenant money'}.`,
    );
    fitCounts();
  }
  if (short.length) log.push(`Not enough Build Points for the ${short.join(', ')}: recruit them in play instead.`);

  // under the guild rules every craftsman holds a rank, with the Abilities it needs (they cost nothing more:
  // the Craft is the highest); the Guild Hook's guild also expects standard wages and a pension
  const guilds = guildRanksApply(cov, optionOn(g.saga, 'guilds'));
  if (guilds) {
    const ranked: string[] = [];
    for (const s of cov.specialists.filter((x) => x.role === 'craftsman' && !x.characterId && !x.guildRank)) {
      s.guildRank = suggestedGuildRank(s.age, s.score);
      addGuildAbilities(s);
      ranked.push(`${s.name.toLowerCase()} ${CRAFT_GUILD_RANKS[s.guildRank].label.toLowerCase()}`);
    }
    if (ranked.length) log.push(`Guild ranks (City & Guild ch.3, by age and Craft): ${ranked.join(', ')}, with the Guild Lore, Bargain and Leadership each rank needs.`);
  }
  if (hasGuildHook(cov)) {
    const met: string[] = [];
    if (cov.finances.wages === 'none' || cov.finances.wages === 'miserly') ((cov.finances.wages = 'standard'), met.push('standard wages'));
    if (!cov.finances.pension) ((cov.finances.pension = true), met.push('a pension (+10 Loyalty)'));
    if (met.length) log.push(`The covenfolk's guild (Guild Hook) is given ${met.join(' and ')}, so it has no cause to strike.`);
  }

  if (o.library) {
    // the library's own budget if it has one, else a share of what the covenant has left (and any pools set aside for books)
    const left = budgetLeft(cov, derived(), 'book');
    const pools = left.pools.reduce((t, p) => t + p.left, 0);
    const bp = !o.bought ? Infinity : left.budget !== undefined ? left.own + pools : Math.floor(left.own * Math.min(1, Math.max(0, o.library.share ?? 0.5))) + pools;
    const r = stockLibrary(cov, members(), g, bp === Infinity ? (cov.budget?.book ?? 100) : bp, o.library, rng, cov.specialists.filter((s) => s.role === 'teacher'));
    for (const a of r.assign) {
      const b = cov.library.find((x) => x.uid === a.uid);
      if (b) ((b.subject = a.subject), (b.title = a.title));
    }
    cov.library.push(...r.books);
    pay('book', r.books.map((b) => b.uid));
    // books no pool took that the library's budget cannot cover go back, the dearest first
    const pooled = () => new Set(cov.hooksBoons.flatMap((h) => h.resources ?? []));
    const dropped: string[] = [];
    for (const b of [...r.books].reverse().sort((x, y) => summaCost(y).cost - summaCost(x).cost)) {
      if (!over('book')) break;
      if (pooled().has(b.uid) || !summaCost(b).cost) continue;
      cov.library = cov.library.filter((x) => x.uid !== b.uid);
      dropped.push(b.title);
    }
    log.push(...r.log.filter((l) => !dropped.some((t) => l.startsWith(t))));
    if (dropped.length) log.push(`Over the library's budget, so not bought: ${dropped.join(', ')}.`);
  }

  if (o.counts || o.horses) {
    fitCounts();
    log.push(
      `Servants ${cov.covenfolk.servants}, teamsters ${cov.covenfolk.teamsters}, laborers ${cov.covenfolk.laborers}${o.horses ? `, horses ${cov.covenfolk.horses}` : ''}. Past the laborers' limit (half the Provisions) another laborer costs about a pound and spares only a fifth of a teamster, so some teamsters stay.`,
    );
  }
  if (o.gear) {
    const est = weaponArmorEstimate(cov, members(), g.data);
    cov.finances.weaponArmorPoints = est.total;
    log.push(`Weapons and armor: ${est.total} points (${est.lines.map((l) => l.label).join('; ') || 'nobody armed'}), ${Math.round((est.total / 320) * 10) / 10} £ a year.`);
  }
  if (o.yearly) {
    const y = (cov.finances.yearly ??= []);
    const set = (id: string, n: number) => {
      const e = y.find((x) => x.id === id);
      if (e) e.count = Math.max(e.count, n);
      else y.push({ id, count: n });
    };
    set('redcaps', 4);
    set('feasts', FEAST_CYCLE);
    log.push(`Each year: four Redcap visits (2 £) and a cycle of ${FEAST_CYCLE} feast days, which earns a Loyalty point a year.`);
  }

  // the Build Points left: vis for the Arts the magi work in, or silver in the treasury
  if (o.rest && o.rest !== 'none' && o.bought) {
    const magi = members().filter((c) => c.type === 'magus').map((c) => deriveCharacter(c, g.data, g.rules));
    const weight = (a: Art) => magi.reduce((t, d) => t + d.arts[a].score, 0) + 1;
    const arts = [...ARTS].sort((a, b) => weight(b) - weight(a)).slice(0, 3);
    const ownLeft = () => Math.max(0, cov.buildPoints - derived().bpSpent);
    const third = Math.floor(ownLeft() / 3);
    const money = (cap: number) => {
      const free = Math.floor(Math.min(cap, room('money')));
      if (free <= 0) return;
      cov.finances.startingReserve = (cov.finances.startingReserve ?? 0) + free * 10;
      pay('money', [STARTING_RESERVE]);
      while (over('money') && (cov.finances.startingReserve ?? 0) >= 10) cov.finances.startingReserve! -= 10;
      log.push(`Build Points left (${free}) as a money reserve: ${free * 10} £ more in the treasury.`);
    };
    // sources to find and detail in play, for the Arts the magi work in most: 5 Build Points a pawn a year (Covenants ch.6)
    const sources = (cap: number) => {
      let pawns = Math.floor(Math.min(cap, room('vis')) / 5);
      const made: string[] = [];
      for (let i = 0; i < arts.length && pawns > 0; i++) {
        const n = i === arts.length - 1 ? pawns : Math.max(1, Math.round(pawns / (arts.length - i)));
        const src = { uid: uid(), name: `Vis source of ${ART_NAMES[arts[i]]} (to detail)`, art: arts[i], pawnsPerYear: n };
        cov.visSources.push(src);
        pay('vis', [src.uid]);
        if (over('vis')) {
          cov.visSources.pop();
          break;
        }
        made.push(`${n} pawn${n > 1 ? 's' : ''} of ${ART_NAMES[arts[i]]}`);
        pawns -= n;
      }
      if (made.length) log.push(`Build Points left as vis sources to find and detail in play: ${made.join(', ')} a year (5 Build Points a pawn a year).`);
    };
    // vis in store, five pawns a Build Point
    const stocks = (cap: number) => {
      const free = Math.floor(Math.min(cap, room('vis')));
      if (free <= 0) return;
      const total = arts.reduce((t, a) => t + weight(a), 0);
      const pawns = free * 5;
      const add = (a: Art, n: number) => {
        for (const list of [cov.visStocks, ...(cov.startingVisStocks ? [cov.startingVisStocks] : [])]) {
          const st = list.find((v) => v.art === a && !v.pair);
          if (st) st.pawns += n;
          else list.push({ art: a, pawns: n });
        }
      };
      let given = 0;
      const split = arts.map((a, i) => {
        const n = i === arts.length - 1 ? pawns - given : Math.round((pawns * weight(a)) / total);
        given += n;
        return { a, n };
      });
      for (const { a, n } of split) if (n > 0) add(a, n);
      pay('vis', [VIS_STOCKS]);
      // trim a pawn at a time while it goes past the Build Points
      for (let i = 0; i < 10 && over('vis'); i++) add(split[0].a, -1);
      log.push(`Build Points left (${free}) as vis in store: ${split.filter((x) => x.n > 0).map((x) => `${x.n} pawns of ${ART_NAMES[x.a]}`).join(', ')} (5 pawns a Build Point).`);
    };
    if (o.rest === 'split') {
      sources(third);
      money(third);
      stocks(Infinity);
    } else if (o.rest === 'money') money(Infinity);
    else {
      if (o.rest === 'vis-sources') sources(Infinity);
      stocks(Infinity);
    }
  }
  return { cov, grogs, log };
}
