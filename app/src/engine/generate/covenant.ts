// Filling out a covenant's people: the staff a covenant runs on (steward, chamberlain, turb captain,
// scribe, a teacher), the craftsmen whose work saves it money, the servants, teamsters and laborers
// it needs, grogs for its turb as full characters, and books for its library. Everything is bought
// with Build Points (the resource pools set aside for it first, then its own budget for that kind of
// purchase, never past what the covenant has left), or, for a covenant already in play, recruited at
// no Build Point cost. Seeded, like the character generator.

import type { GameData } from '../../data';
import type { BudgetKind, Character, Covenant, HouseRules, Saga, Specialist } from '../types';
import { abilityCapAtAge } from '../covenantRules';
import { addCostSavingCraftsmen, budgetLeft, deriveCovenant, fitCovenfolk, optimalLaborers, payFromPools, summaCost } from '../covenant';
import { stockLibrary, type LibraryOptions } from './library';
import { uid } from '../../util/id';
import { generateCharacter, type Generated } from './character';
import { freshName, homelandGroupFor, regionOf } from './names';
import { between, chance, seeded } from './random';

export interface FillOptions {
  /** steward, chamberlain, turb captain and scribe, each if the covenant has none */
  staff: boolean;
  /** a teacher of Latin and the liberal arts, if there is none */
  teacher: boolean;
  /** craftsmen who save the covenant money, the best saving for the Build Points first */
  craftsmen: boolean;
  /** grogs for the turb, made as full characters */
  grogs: number;
  /** servants and teamsters at the numbers needed, laborers at the number that saves most */
  counts: boolean;
  /** starting covenfolk, bought with Build Points; else recruited in play at no cost */
  bought: boolean;
  /** books for the library, within its budget */
  library?: LibraryOptions;
  seed: number;
}

export interface FillResult {
  cov: Covenant;
  grogs: Generated[];
  log: string[];
}

const STAFF: { role: Specialist['role']; label: string; ability: { id: string; param?: string; name: string }; chars: Specialist['chars'] }[] = [
  { role: 'steward', label: 'Steward', ability: { id: 'profession-type', param: 'Steward', name: 'Profession: Steward' }, chars: { Int: 1, Com: 1 } },
  { role: 'chamberlain', label: 'Chamberlain', ability: { id: 'profession-type', param: 'Chamberlain', name: 'Profession: Chamberlain' }, chars: { Pre: 1, Com: 1 } },
  { role: 'turb-captain', label: 'Turb captain', ability: { id: 'leadership', name: 'Leadership' }, chars: { Pre: 1, Sta: 1 } },
  { role: 'scribe', label: 'Scribe', ability: { id: 'profession-type', param: 'Scribe', name: 'Profession: Scribe' }, chars: { Dex: 1, Int: 1 } },
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
  const members = () => characters.filter((c) => cov.memberIds.includes(c.id));
  const labs = () => deriveCovenant(cov, g.data, characters).labs;
  // what a kind of purchase may still take: the pools set aside for it, then its own budget
  const room = (kind: BudgetKind) => {
    if (!o.bought) return Infinity;
    const b = budgetLeft(cov, deriveCovenant(cov, g.data, characters), kind);
    return b.own + b.pools.reduce((t, p) => t + p.left, 0);
  };
  const pay = (kind: BudgetKind, uids: string[]) => o.bought && payFromPools(cov, g.data, characters, kind, uids);
  // what a pool could not take and the kind's own budget cannot cover comes off again
  const over = (kind: BudgetKind) => {
    if (!o.bought) return false;
    const dc = deriveCovenant(cov, g.data, characters);
    const limit = cov.budget?.[kind];
    return dc.bpSpent > cov.buildPoints || (limit !== undefined && budgetLeft(cov, dc, kind).spent > limit);
  };
  const short: string[] = [];

  if (o.staff) {
    for (const s of STAFF) {
      if (cov.specialists.some((x) => x.role === s.role)) continue;
      const age = between(rng, 30, 50);
      const score = Math.min(abilityCapAtAge(age), between(rng, 4, 6));
      if (score > room('specialist')) {
        short.push(s.label.toLowerCase());
        continue;
      }
      cov.specialists.push({ uid: uid(), name: name(), role: s.role, ability: s.ability.name, score, age, free: !o.bought, abilities: [{ id: s.ability.id, param: s.ability.param, score }], chars: s.chars });
      pay('specialist', [cov.specialists.at(-1)!.uid]);
      if (over('specialist')) {
        cov.specialists.pop();
        short.push(s.label.toLowerCase());
        continue;
      }
      log.push(`${s.label}: ${cov.specialists.at(-1)!.name}, ${s.ability.name} ${score}.`);
    }
  }
  if (o.teacher && !cov.specialists.some((x) => x.role === 'teacher')) {
    const age = between(rng, 36, 55);
    const cap = abilityCapAtAge(age);
    const latin = Math.min(cap, 5);
    const artes = Math.min(cap, between(rng, 3, 5));
    const teaching = Math.min(cap, between(rng, 2, 4));
    const com = between(rng, 1, 2);
    // a teacher costs Communication + Teaching + the best Ability (DE p.180)
    if (com + teaching + latin > room('specialist')) short.push('teacher');
    else {
      cov.specialists.push({
        uid: uid(), name: name(), role: 'teacher', ability: 'Latin', score: latin, age, free: !o.bought, teaching,
        abilities: [{ id: 'dead-language', param: 'Latin', score: latin }, { id: 'artes-liberales', score: artes }], chars: { Com: com },
      });
      pay('specialist', [cov.specialists.at(-1)!.uid]);
      if (over('specialist')) (cov.specialists.pop(), short.push('teacher'));
    }
    if (!short.includes('teacher')) log.push(`Teacher: ${cov.specialists.at(-1)!.name}, Latin ${latin} and Artes Liberales ${artes}, Teaching ${teaching}.`);
  }
  if (o.craftsmen) {
    const had = new Map(cov.specialists.map((s) => [s.uid, s.count ?? 1]));
    const added = addCostSavingCraftsmen(cov, members(), labs(), between(rng, 4, 6), room('specialist'));
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
    log.push(added.length ? `Craftsmen: ${added.join(', ')}${dropped ? `; ${dropped} of them would go past the Build Points, so ${dropped > 1 ? 'are' : 'is'} left to recruit in play` : ''}.` : `Craftsmen: ${room('specialist') < 4 ? 'no Build Points left for any' : 'none would save the covenant money'}.`);
  }
  if (short.length) log.push(`Not enough Build Points for the ${short.join(', ')}: recruit them in play instead.`);
  if (o.library) {
    const bp = room('book');
    const r = stockLibrary(cov, members(), g, bp === Infinity ? (cov.budget?.book ?? 100) : bp, o.library, rng);
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

  // grogs: a sergeant to lead a turb of three or more that has none, then archers for about a third
  // and shield grogs for the rest; finished and ready to play, by whoever in the troupe takes them
  const grogs: Generated[] = [];
  const led = characters.some((c) => c.type === 'grog' && cov.memberIds.includes(c.id) && /sergeant/i.test(c.creation.concept ?? ''));
  for (let i = 0; i < o.grogs; i++) {
    const role = i === 0 && !led && o.grogs >= 3 ? 'sergeant' : chance(rng, 0.33) ? 'archer' : 'shield-grog';
    const gen = generateCharacter({ type: 'grog', role, variety: 'varied', npc: false, finished: true, seed: o.seed + 101 * (i + 1), avoidNames: [...used] }, { ...g, covenant: cov });
    used.add(gen.c.name);
    grogs.push(gen);
    cov.memberIds.push(gen.c.id);
  }
  if (grogs.length) log.push(`Grogs: ${grogs.map((x) => `${x.c.name} (${x.role.label.toLowerCase()})`).join(', ')}.`);

  if (o.counts) {
    const all = [...characters, ...grogs.map((x) => x.c)];
    const m = all.filter((c) => cov.memberIds.includes(c.id));
    const l = deriveCovenant(cov, g.data, all).labs;
    cov.covenfolk.laborers = optimalLaborers(cov, m, l);
    fitCovenfolk(cov, m, l);
    log.push(`Servants ${cov.covenfolk.servants}, teamsters ${cov.covenfolk.teamsters}, laborers ${cov.covenfolk.laborers}.`);
  }
  return { cov, grogs, log };
}

