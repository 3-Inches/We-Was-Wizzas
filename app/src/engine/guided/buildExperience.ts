// The guided build's experience (design spec, section 7): native language and childhood, a magus's
// apprenticeship and the years after Gauntlet (Abilities, Arts and spells), and every other pool, each
// spent on the Abilities the answers rank highest.

import { ARTS, CHILDHOOD_ABILITIES, SAMPLE_CHILDHOODS, TECHNIQUES, type Art, type Form, type Technique } from '../../data';
import { EX_MISC_TRADITIONS } from '../../data/houses';
import { nativeLanguageFor } from '../../data/lists';
import type { CharSpell, Character, GuidedState, XpSource } from '../types';
import { canSpend, sumAlloc, type DerivedCharacter, type XpBudget } from '../character/derive';
import { ensureAbility, MYTHIC_TYPES } from '../character/factory';
import { abilityAvailability } from '../character/restrictions';
import { creationSpellLimit } from '../magic';
import { abilityScoreFromXp, abilityXpForScore, artScoreFromXp, artXpForScore } from '../xp';
import { uid } from '../../util/id';
import { abilityTag } from './records';
import { tagWeights, type GuidedContext } from './score';
import { tagLabel } from './tags';
import { HOLY_METHODS, HOLY_POWERS } from '../../data/divine';
import { mythicAbility } from '../character/factory';

import { TRIBUNAL_LANGUAGE, answer, mythicTypeOf, type BuildInput } from './buildShared';
import { powerVirtue } from './buildVirtues';

const ABILITY_CHOICES: Record<string, string[]> = {
  combat: ['single-weapon', 'brawl', 'athletics', 'great-weapon', 'bows'],
  social: ['charm', 'folk-ken', 'guile', 'etiquette', 'intrigue', 'bargain'],
  leadership: ['leadership', 'etiquette'],
  scholarship: ['artes-liberales', 'philosophiae', 'theology-christian', 'civil-and-canon-law'],
  lore: ['magic-lore', 'faerie-lore', 'dominion-lore', 'infernal-lore', 'area-lore'],
  crafts: ['craft-type', 'profession-type'],
  outdoors: ['survival', 'hunt', 'ride', 'animal-handling', 'swim'],
  animals: ['animal-handling', 'ride'],
  stealth: ['stealth', 'legerdemain', 'awareness'],
  perception: ['awareness'],
  healing: ['chirurgy', 'medicine'],
  performance: ['music', 'carouse'],
  politics: ['code-of-hermes', 'intrigue'],
  lab: ['magic-theory'],
  casting: ['finesse', 'concentration'],
  penetration: ['penetration'],
  concentration: ['concentration'],
  'magic-resistance': ['parma-magica'],
  teaching: ['teaching'],
};
const MAGUS_BASE = ['concentration', 'finesse', 'penetration', 'awareness', 'code-of-hermes', 'magic-lore'];
const COMPANION_BASE = ['awareness', 'charm', 'folk-ken', 'athletics', 'area-lore'];
const GROG_BASE = ['awareness', 'athletics', 'brawl', 'single-weapon'];

/** The choice of the character's best Ability of this kind (their trade), if they have one. */
function bestParam(c: Character, id: string): string | undefined {
  const own = c.abilities.filter((a) => a.abilityId === id && a.param);
  return own.length ? own.reduce((a, b) => (sumAlloc(b.xp) > sumAlloc(a.xp) ? b : a)).param : undefined;
}

/**
 * A craftsman's trade is their Craft and a merchant's their Profession: a build that wants "a craft
 * or trade" raises the one they have and does not start the other (a baker is not also a steward).
 */
function secondTrade(c: Character, id: string): boolean {
  const other = id === 'craft-type' ? 'profession-type' : id === 'profession-type' ? 'craft-type' : undefined;
  return !!other && !c.abilities.some((a) => a.abilityId === id) && c.abilities.some((a) => a.abilityId === other && sumAlloc(a.xp) > 0);
}

function abilityParam(id: string, c: Character, inp: BuildInput): string | undefined {
  const region = (inp.covenant?.tribunal || inp.saga?.tribunal || '').trim();
  switch (id) {
    case 'area-lore': return c.nationality || (region ? `${region} Tribunal` : 'Home');
    // the character's own trade, raised rather than a second one begun
    case 'craft-type': return bestParam(c, 'craft-type') ?? 'Blacksmith';
    case 'profession-type': return bestParam(c, 'profession-type') ?? (c.type === 'magus' ? 'Scribe' : c.virtues.some((v) => v.defId === 'merchant') ? 'Merchant' : 'Steward');
    // the tongue of the character's own people, wherever the saga is set (a Syrian in the Rhine speaks Arabic)
    case 'living-language': return nativeLanguageFor(c.nationality) ?? TRIBUNAL_LANGUAGE[region] ?? 'French';
    case 'dead-language': return 'Latin';
    case 'organization-lore': return 'Order of Hermes';
    default: return undefined;
  }
}

/** Abilities in order of how much the player wants them, with the tag that put them there. */
function rankedAbilities(c: Character, st: GuidedState, ctx: GuidedContext): { id: string; w: number; tag: string }[] {
  const w = tagWeights(st, ctx);
  const score = new Map<string, { w: number; tag: string }>();
  const bump = (id: string, v: number, tag: string) => {
    const cur = score.get(id);
    if (!cur || v > cur.w) score.set(id, { w: v, tag });
  };
  for (const [tag, ids] of Object.entries(ABILITY_CHOICES)) ids.forEach((id, i) => bump(id, (w[tag] ?? 0) - i * 0.5, tag));
  const base = c.type === 'magus' ? MAGUS_BASE : c.type === 'grog' ? GROG_BASE : COMPANION_BASE;
  base.forEach((id, i) => bump(id, 1.5 - i * 0.2, 'base'));
  // a Holy Method or Power the character has is what they pray with: raised whatever else was said
  const holy = [...HOLY_METHODS, ...HOLY_POWERS].filter((x) => c.abilities.some((a) => a.abilityId === x.id) && c.virtues.some((v) => v.defId === powerVirtue(x.id)));
  for (const x of holy) bump(x.id, 3 + (w['holy-power'] ?? 0), 'holy-power');
  // the devout: Dominion Lore, their faith's Theology where they may learn it, Concentration to pray for a miracle
  const piety = Math.max(w.piety ?? 0, holy.length ? 2 : 0);
  if (piety > 0) {
    const theology = c.society === 'Islamic' ? 'theology-islam' : c.society === 'Jewish' ? 'theology-judaism' : 'theology-christian';
    ['dominion-lore', 'concentration', theology].forEach((id, i) => bump(id, piety - i * 0.5, 'piety'));
  }
  return [...score.entries()].map(([id, v]) => ({ id, ...v })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w);
}

function spendPoolOnAbilities(c: Character, budget: XpBudget, xp: number, ranked: { id: string; w: number; tag: string }[], width: number, inp: BuildInput, get: () => GuidedContext, refresh: () => void, st: GuidedState, log: string[]) {
  let left = xp;
  const existing = new Set(c.abilities.map((a) => a.uid));
  const allowed = (id: string) => {
    const def = inp.data.abilityById.get(id);
    const have = c.abilities.some((a) => a.abilityId === id);
    return !!def && inp.data.inBooks(def) && !secondTrade(c, id) && (have || abilityAvailability(get().d, inp.data, id).ok) && canSpend(get().d, inp.data, budget, { abilityId: id, param: abilityParam(id, c, inp) }).ok;
  };
  const usable = ranked.filter((r) => allowed(r.id)).slice(0, width);
  if (!usable.length) return 0;
  for (let guard = 0; guard < 60 && left > 0; guard++) {
    // raise the most wanted Ability that is furthest below its share
    let did = false;
    for (const r of usable) {
      // once a Craft is begun, no Profession beside it as a second trade (and the other way round)
      if (secondTrade(c, r.id)) continue;
      const ab = ensureAbility(c, r.id, {}, abilityParam(r.id, c, inp));
      const cur = sumAlloc(ab.xp);
      const score = abilityScoreFromXp(cur);
      const step = abilityXpForScore(score + 1) - cur;
      const capScore = get().d.abilityByUid.get(ab.uid)?.cap ?? get().d.ageCap;
      if (step > left || score + 1 > capScore) continue;
      ab.xp[budget.id] = (ab.xp[budget.id] ?? 0) + step;
      if (!ab.why) ab.why = r.tag === 'base' ? `from: what a ${c.type} usually needs` : `from: your rating of ${tagLabel(r.tag)}`;
      left -= step;
      did = true;
      break;
    }
    if (!did) break;
    // rotate so the next raise goes to the next Ability
    usable.push(usable.shift()!);
  }
  // a small remainder: a new Ability at score 1 rather than wasted xp
  if (left >= 5) {
    for (const r of ranked) {
      if (left < 5) break;
      if (c.abilities.some((a) => a.abilityId === r.id)) continue;
      if (!allowed(r.id)) continue;
      const ab = ensureAbility(c, r.id, { [budget.id]: 5 }, abilityParam(r.id, c, inp));
      ab.why = r.tag === 'base' ? `from: what a ${c.type} usually needs` : `from: your rating of ${tagLabel(r.tag)}`;
      left -= 5;
    }
  }
  // clean up Abilities this pass created that took nothing
  c.abilities = c.abilities.filter((a) => existing.has(a.uid) || sumAlloc(a.xp) > 0);
  refresh();
  void st;
  void log;
  return xp - left;
}

/** Raise each Ability to the least score a Mythic Companion type begins with, from later life (or the first pool that may buy it). */
function spendMinimums(c: Character, mins: Record<string, number>, label: string, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[]) {
  const done: string[] = [];
  for (const [key, min] of Object.entries(mins)) {
    const { id, param: named } = mythicAbility(key);
    const def = inp.data.abilityById.get(id);
    if (!def || !inp.data.inBooks(def)) continue;
    const param = named ?? abilityParam(id, c, inp);
    const have = c.abilities.some((a) => a.abilityId === id && (!named || (a.param ?? '').toLowerCase() === named.toLowerCase()));
    const pools = get().d.budgets.filter((b) => !['native', 'childhood'].includes(b.id) && b.kind !== 'art+ability' && b.total - b.spent > 0);
    const pool = pools.find((b) => (have || abilityAvailability(get().d, inp.data, id).ok || b.abilities?.length || b.abilityTypes?.length) && canSpend(get().d, inp.data, b, { abilityId: id, param }).ok);
    if (!pool) continue;
    const ab = ensureAbility(c, id, {}, param);
    const cur = sumAlloc(ab.xp);
    const want = abilityXpForScore(min) - cur;
    if (want <= 0) continue;
    const spend = Math.min(want, pool.total - pool.spent);
    if (spend <= 0) continue;
    ab.xp[pool.id] = (ab.xp[pool.id] ?? 0) + spend;
    ab.why ??= `from: a ${label} begins with at least ${min}`;
    done.push(`${def.name.replace(/\([^)]*\)/, named ?? '$&')} ${min}`);
    refresh();
  }
  c.abilities = c.abilities.filter((a) => sumAlloc(a.xp) > 0 || a.native);
  if (done.length) log.push(`${label}: its least Ability scores first (${done.join(', ')}).`);
}

function artRanking(st: GuidedState, ctx: GuidedContext): { art: Art; w: number }[] {
  const w = tagWeights(st, ctx);
  const prior: Partial<Record<Art, number>> = { Cr: 1, Re: 1, In: 0.8, Co: 0.6, Vi: 0.6, Mu: 0.5, Pe: 0.5, Ig: 0.4, Te: 0.4, Me: 0.4 };
  return ARTS.map((a) => ({ art: a, w: (w[`art:${a}`] ?? 0) + (prior[a] ?? 0) })).sort((a, b) => b.w - a.w);
}

export function spendExperience(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void, why: Record<string, string>, log: string[]) {
  const { data, rules } = inp;
  // native language
  if (!c.abilities.some((a) => a.native)) {
    const lang = abilityParam('living-language', c, inp)!;
    const ab = ensureAbility(c, 'living-language', { native: rules.nativeLanguageXp }, lang);
    ab.native = true;
    ab.why = 'from: your homeland';
    log.push(`Native language: ${lang}.`);
    refresh();
  }
  // Abilities a Virtue gives (Second Sight from Strong Faerie Blood) say which one
  for (const ab of c.abilities) {
    if (ab.why || !ab.xp.free) continue;
    const by = c.virtues.find((v) => data.vfById.get(v.defId)?.effects?.some((e) => e.type === 'grantAbility' && (e.ability === ab.abilityId || (e.ability === '$param' && v.param === ab.abilityId))));
    if (by) ab.why = `from: ${data.vfById.get(by.defId)?.name}${by.grantedBy ? ` (free with ${data.vfById.get(c.virtues.find((v) => v.uid === by.grantedBy)?.defId ?? '')?.name})` : ''}`;
  }
  const focus = answer('a-focus', st, get());
  const width = focus >= 8 ? 3 : focus >= 6 ? 4 : focus <= 3 ? 7 : 5;
  const ranked = rankedAbilities(c, st, get());
  // a Mythic Companion's least scores (the 90 experience points its type sets) before anything else
  const mt = c.type === 'mythic' ? MYTHIC_TYPES[mythicTypeOf(c) ?? ''] : undefined;
  if (mt) spendMinimums(c, mt.minAbilities, mt.label, inp, get, refresh, log);
  // a tradition's own Ability rests on a mundane one (a Seirene's Music limits her Siren Song)
  const tradition = c.house === 'ex-miscellanea' ? EX_MISC_TRADITIONS.find((t) => t.id === c.creation.exMiscTradition) : undefined;
  for (const [id, min] of Object.entries(tradition?.minAbilities ?? {})) {
    const ab = ensureAbility(c, id, {});
    const want = abilityXpForScore(min) - sumAlloc(ab.xp);
    const pool = get().d.budgets.find((x) => x.id === 'apprenticeship' && x.total - x.spent >= want);
    if (want > 0 && pool) {
      ab.xp.apprenticeship = (ab.xp.apprenticeship ?? 0) + want;
      ab.why ??= `from: a magus of the ${tradition!.name} needs at least ${min}`;
      refresh();
    } else if (!sumAlloc(ab.xp)) c.abilities = c.abilities.filter((x) => x !== ab);
  }

  // childhood: the sample childhood that fits best
  const child = get().d.budgets.find((b) => b.id === 'childhood');
  if (child && child.spent === 0) {
    const w = tagWeights(st, get());
    const fitOf = (abilities: Record<string, number>) => Object.keys(abilities).reduce((s, id) => s + Math.max(0, w[abilityTag(id)] ?? 0) + 0.1, 0);
    const pick = [...SAMPLE_CHILDHOODS].sort((a, b) => fitOf(b.abilities) - fitOf(a.abilities))[0];
    for (const [id, score] of Object.entries(pick.abilities)) {
      const native = abilityParam('living-language', c, inp);
      const param = id === 'area-lore' ? abilityParam(id, c, inp) : id === 'living-language' ? (native === 'French' ? 'German' : 'French') : undefined;
      const ab = ensureAbility(c, id, { childhood: abilityXpForScore(score) }, param);
      ab.why = `from: ${pick.name}`;
    }
    c.creation.childhoodPackage = pick.name;
    log.push(`Childhood: ${pick.name}.`);
    refresh();
    // what the sample leaves over goes to the childhood Abilities the player wants most
    const b = get().d.budgets.find((x) => x.id === 'childhood')!;
    if (b.total > b.spent) spendPoolOnAbilities(c, b, b.total - b.spent, [...ranked, ...CHILDHOOD_ABILITIES.map((id) => ({ id, w: 0.1, tag: 'base' }))], 20, inp, get, refresh, st, log);
  }

  if (c.type === 'magus') {
    // the Hermetic essentials first
    const app = get().d.budgets.find((b) => b.id === 'apprenticeship');
    if (app) {
      // a short apprenticeship (Weak Parens, Savantism) still leaves the Arts something: Latin 3, not 4
      const latin = app.total - app.spent >= 160 ? 4 : 3;
      const need: [string, number, string?][] = [['dead-language', latin, 'Latin'], ['artes-liberales', 1], [get().d.theoryAbility, 3], ['parma-magica', 1]];
      for (const [id, score, param] of need) {
        const ab = ensureAbility(c, id, {}, param);
        const cur = sumAlloc(ab.xp);
        const want = abilityXpForScore(score);
        if (cur < want) ab.xp.apprenticeship = (ab.xp.apprenticeship ?? 0) + (want - cur);
        ab.why ??= 'from: every magus needs it (DE p.49)';
      }
      refresh();
      const left = () => {
        const b = get().d.budgets.find((x) => x.id === 'apprenticeship')!;
        return b.total - b.spent;
      };
      const abilitiesSide = answer('a-abilities', st, get());
      const artShare = Math.max(0.35, Math.min(0.95, 0.75 - (abilitiesSide - 5) * 0.08));
      const artXp = Math.floor(left() * artShare);
      spendArts(c, st, get, refresh, 'apprenticeship', artXp, focus, why);
      spendPoolOnAbilities(c, get().d.budgets.find((b) => b.id === 'apprenticeship')!, left(), ranked, width, inp, get, refresh, st, log);
      // anything left over goes to the top Art
      const rest = left();
      if (rest > 0) spendArts(c, st, get, refresh, 'apprenticeship', rest, 10, why);
      log.push(`Apprenticeship: ${Math.round(artShare * 100)}% of the free experience on Arts (your answer on Abilities vs Arts: ${abilitiesSide}).`);
      // the apprenticeship's spells, from the Arts at Gauntlet
      chooseSpells(c, st, inp, get, refresh, log);
    }
    const pg = get().d.budgets.find((b) => b.id === 'postGauntlet');
    if (pg && pg.total > pg.spent) {
      // the years after Gauntlet as a magus spends them (DE p.50): the Hermetic Abilities a career
      // raises, the Abilities the player wants, the Arts, and spells learned along the way
      const total = pg.total - pg.spent;
      const pool = () => get().d.budgets.find((x) => x.id === 'postGauntlet')!;
      const pgLeft = () => pool().total - pool().spent;
      const abilitiesSide = answer('a-abilities', st, get());
      const careerShare = Math.max(0.25, Math.min(0.55, 0.42 + (abilitiesSide - 5) * 0.03));
      spendCareer(c, c.creation.yearsPostGauntlet, Math.floor(total * careerShare), st, inp, get, refresh);
      spendPoolOnAbilities(c, pool(), Math.floor(total * 0.08), ranked, width, inp, get, refresh, st, log);
      const spellShare = Math.floor(total * 0.15);
      spendArts(c, st, get, refresh, 'postGauntlet', Math.max(0, pgLeft() - spellShare), focus, why);
      chooseSpells(c, st, inp, get, refresh, log, 'postGauntlet');
      // what the spells left goes to the Arts, then to Abilities
      if (pgLeft() > 0) spendArts(c, st, get, refresh, 'postGauntlet', pgLeft(), focus, why);
      if (pgLeft() > 0) spendPoolOnAbilities(c, pool(), pgLeft(), ranked, width, inp, get, refresh, st, log);
      log.push(`After Gauntlet: ${c.creation.yearsPostGauntlet} years, ${Math.round(careerShare * 100)}% of the points on the Hermetic Abilities a career raises.`);
    }
  }

  // every other pool: later life, Virtue pools
  for (let guard = 0; guard < 8; guard++) {
    const pools = get().d.budgets.filter((b) => !['native', 'childhood', 'apprenticeship', 'postGauntlet'].includes(b.id) && b.total - b.spent > 0 && b.kind !== 'art+ability');
    const b = pools[0];
    if (!b) break;
    const before = b.total - b.spent;
    const spent = spendPoolOnAbilities(c, b, before, ranked, width + 2, inp, get, refresh, st, log);
    if (!spent) {
      // nothing ranked fits this pool: the first Abilities it allows
      const fallback = data.abilities.filter((a) => a.source.book === 'DE' && !a.id.endsWith('-type')).map((a) => ({ id: a.id, w: 1, tag: 'base' }));
      if (!spendPoolOnAbilities(c, b, before, fallback, 3, inp, get, refresh, st, log)) break;
    }
  }
  refresh();
}

/**
 * What a magus's years after Gauntlet usually give each Hermetic Ability, in experience a year: Magic
 * Theory for every lab season, Parma Magica for safety, Penetration, Concentration and Finesse for
 * casting, Latin to read the Order's books, and its law and lore for its politics. DE p.50 leaves the
 * split to the player; this is the pattern of the Tribunal books' magi, leaning toward what the player
 * rated (a lab magus raises Magic Theory faster, a battle magus Penetration).
 */
const CAREER: { id: string; perYear: number; tag?: string; param?: string; max?: number; least?: number }[] = [
  { id: 'magic-theory', perYear: 5, tag: 'lab', least: 0.8 },
  { id: 'parma-magica', perYear: 3, tag: 'magic-resistance', least: 0.8 },
  { id: 'penetration', perYear: 1.5, tag: 'penetration' },
  { id: 'concentration', perYear: 1.2, tag: 'concentration' },
  { id: 'finesse', perYear: 0.8, tag: 'casting' },
  { id: 'dead-language', perYear: 3, param: 'Latin', max: 5 },
  { id: 'code-of-hermes', perYear: 0.6, tag: 'politics' },
  { id: 'organization-lore', perYear: 0.5, param: 'Order of Hermes', tag: 'politics' },
  { id: 'magic-lore', perYear: 0.5, tag: 'lore' },
];

function spendCareer(c: Character, years: number, xp: number, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void) {
  if (years <= 0 || xp <= 0) return;
  const w = tagWeights(st, get());
  let left = xp;
  for (const k of CAREER) {
    const id = k.id === 'magic-theory' ? get().d.theoryAbility : k.id;
    const pool = get().d.budgets.find((b) => b.id === 'postGauntlet');
    if (!pool || !canSpend(get().d, inp.data, pool, { abilityId: id, param: k.param }).ok) continue;
    if (!c.abilities.some((a) => a.abilityId === id) && !abilityAvailability(get().d, inp.data, id).ok) continue;
    // Magic Theory and Parma Magica no magus neglects for long, whatever else they care about
    const lean = Math.max(k.least ?? 0.5, 1 + Math.min(1, (k.tag ? (w[k.tag] ?? 0) : 0) / 8));
    const jitter = inp.rng ? 0.8 + inp.rng() * 0.45 : 1;
    const ab = ensureAbility(c, id, {}, k.param);
    const have = sumAlloc(ab.xp);
    const scholar = id === 'dead-language' && (w.scholarship ?? 0) >= 2;
    const max = Math.min(k.max ? k.max + (scholar ? 1 : 0) : 99, get().d.abilityByUid.get(ab.uid)?.cap ?? get().d.ageCap);
    const target = have + Math.round(k.perYear * years * lean * jitter);
    let score = abilityScoreFromXp(have);
    let spent = 0;
    while (score < max) {
      const step = abilityXpForScore(score + 1) - abilityXpForScore(score);
      const cur = have + spent;
      if (abilityXpForScore(score + 1) > target || step > left) break;
      const add = abilityXpForScore(score + 1) - cur;
      spent += add;
      left -= add;
      score++;
    }
    if (spent) {
      ab.xp.postGauntlet = (ab.xp.postGauntlet ?? 0) + spent;
      ab.why ??= 'from: the years after Gauntlet (what a magus’s career raises)';
    } else if (!have) c.abilities = c.abilities.filter((a) => a !== ab);
    refresh();
  }
}

function spendArts(c: Character, st: GuidedState, get: () => GuidedContext, refresh: () => void, pool: XpSource, xp: number, focus: number, why: Record<string, string>) {
  const ranking = artRanking(st, get());
  const techs = ranking.filter((r) => (TECHNIQUES as readonly string[]).includes(r.art));
  const forms = ranking.filter((r) => !(TECHNIQUES as readonly string[]).includes(r.art));
  const k = focus >= 8 ? [1, 2] : focus >= 6 ? [2, 2] : focus <= 3 ? [3, 4] : [2, 3];
  const chosen = [...techs.slice(0, k[0]), ...forms.slice(0, k[1])];
  let left = xp;
  for (let guard = 0; guard < 200 && left > 0; guard++) {
    // raise the Art with the best weight per xp; Arts that are already high cost more
    let best: { art: Art; cost: number; value: number } | null = null;
    for (const r of chosen) {
      const cur = sumAlloc(c.arts[r.art] ?? {});
      const score = artScoreFromXp(cur);
      const cost = artXpForScore(score + 1) - cur;
      if (cost > left) continue;
      const value = (r.w + 3) / cost;
      if (!best || value > best.value) best = { art: r.art, cost, value };
    }
    if (!best) break;
    const alloc = (c.arts[best.art] ??= {});
    alloc[pool] = (alloc[pool] ?? 0) + best.cost;
    left -= best.cost;
    const w = tagWeights(st, get())[`art:${best.art}`] ?? 0;
    why[`art:${best.art}`] = w > 0 ? `from: your rating of ${tagLabel(`art:${best.art}`)}` : 'from: a broadly useful Art';
  }
  refresh();
  return xp - left;
}

// ------------------------------------------------------------------ spells

/**
 * Spells from the strongest Arts, the highest each allows first. The apprenticeship's spell levels
 * are a pool of their own; after Gauntlet a spell's levels come out of the year's points (DE p.50),
 * so it takes what is left of them.
 */
export function chooseSpells(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[], source: 'apprenticeship' | 'postGauntlet' = 'apprenticeship') {
  const budget = () => {
    const b = get().d.budgets.find((x) => x.id === source);
    return source === 'apprenticeship' ? b?.spellLevels : b && { total: b.total, spent: b.spent };
  };
  if (!budget() || c.spells.some((s) => s.source === source)) return;
  const d: DerivedCharacter = get().d;
  const w = tagWeights(st, get());
  const ritualOk = (w.ritual ?? 0) > 0;
  const flawless = c.virtues.some((v) => v.defId === 'flawless-magic');
  const arts = [...ARTS].sort((a, b) => d.arts[b].score - d.arts[a].score);
  const techs = arts.filter((a) => (TECHNIQUES as readonly string[]).includes(a)).slice(0, 3);
  const forms = arts.filter((a) => !(TECHNIQUES as readonly string[]).includes(a)).slice(0, 4);
  const combos = techs.flatMap((t) => forms.map((f) => ({ t, f, s: d.arts[t].score + d.arts[f].score }))).sort((a, b) => b.s - a.s);
  const perCombo = new Map<string, number>();
  for (const s of c.spells) perCombo.set(s.spell.technique + s.spell.form, (perCombo.get(s.spell.technique + s.spell.form) ?? 0) + 1);
  const most = source === 'apprenticeship' ? 2 : 4;
  const picked: string[] = [];
  for (let guard = 0; guard < 40; guard++) {
    const b = budget()!;
    const left = b.total - b.spent;
    if (left < 3) break;
    let added = false;
    for (const cb of combos) {
      if ((perCombo.get(cb.t + cb.f) ?? 0) >= most) continue;
      const limit = creationSpellLimit(get().d, { technique: cb.t as Technique, form: cb.f as Form }, inp.rules.spellLevelLimitBonus).total;
      const cands = inp.data.spells
        .filter((s) => s.technique === cb.t && s.form === cb.f && s.level !== null && !s.general && s.level <= Math.min(limit, left) && (ritualOk || !s.ritual) && !s.requisites.length && inp.data.inBooks(s))
        .filter((s) => !c.spells.some((x) => x.spell.name === s.name))
        .sort((a, b) => (b.source.book === 'DE' ? 1 : 0) - (a.source.book === 'DE' ? 1 : 0) || (b.level ?? 0) - (a.level ?? 0));
      // Quick build: one of the few highest, not always the same one
      const s = inp.rng && cands.length > 1 ? cands[Math.floor(inp.rng() * Math.min(3, cands.length))] : cands[0];
      if (!s) continue;
      const cs: CharSpell = { uid: uid(), spellId: s.id, spell: structuredClone(s), masteryXp: flawless ? { free: 5 } : {}, masteryAbilities: [], source, why: `from: your strongest Arts (${cb.t}${cb.f})` };
      c.spells.push(cs);
      perCombo.set(cb.t + cb.f, (perCombo.get(cb.t + cb.f) ?? 0) + 1);
      picked.push(`${s.name} (${s.technique}${s.form} ${s.level})`);
      refresh();
      added = true;
      break;
    }
    if (!added) break;
  }
  if (picked.length) log.push(`${source === 'apprenticeship' ? 'Spells' : 'Spells learned since Gauntlet'}: ${picked.join(', ')}.`);
}

