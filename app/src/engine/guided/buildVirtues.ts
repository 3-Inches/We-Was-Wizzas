// The guided build's Virtues and Flaws (design spec, section 7): Personality Flaws first, then a holy
// pair when asked for, the best-fitting Virtues within the budget, a magus's magic of their own, the
// Flaws that pay for them, and Minor Virtues for any points left over.

import { secondDivination } from '../hermeticMysteries';
import { ARTS, type Art, type VFSize, type VirtueFlawDef } from '../../data';
import type { Character, GuidedState } from '../types';
import { addVirtue, removeVirtue } from '../character/factory';
import { vfProblems } from '../character/restrictions';
import { HOUSE_ARTS } from '../generate/variety';
import { isHolyCharacter, suitedTradition } from '../holy';
import { evaluate, onListFirst, scoreOption, shortlist, tagWeights, traceOf, type Evaluation, type GuidedContext, type Scored } from './score';
import { vfRecords } from './records';
import { HOLY_METHODS, HOLY_POWERS, METHOD_POWERS } from '../../data/divine';

import { SIZE_POINTS, TO_DECIDE, answer, choose, firstPassing, paramFor, type BuildInput } from './buildShared';
import { addTraditionVirtues } from './traditions';
import { addMystery } from './buildMysteries';

export function buildVirtuesAndFlaws(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[], toDecide: string[]) {
  const { data, rules } = inp;
  const maxFlaws = c.type === 'grog' ? rules.grogMaxFlawPoints : rules.maxFlawPoints;
  const ratio = c.type === 'mythic' ? rules.mythicVirtueRatio : 1;
  const taken: string[] = [];
  const complexityOk = answer('a-complexity', st, get()) >= 7;
  // the Characteristics the character's Virtues raise, which a Flaw should not lower
  const raised = () => new Set(get().d.effects.flatMap((e) => ((e.type === 'charBonus' || e.type === 'greatChar') && e.amount > 0 ? [String(e.char)] : [])));
  const add = (s: Scored, size: VFSize) => {
    const cv = addVirtue(c, data, s.def.id, size, paramFor(s, inp.rng, tagWeights(st, get()), c, raised()));
    cv.why = s.fit > 0 ? traceOf(s, st, get()) : s.def.kind === 'flaw' ? 'from: a Flaw that costs little given your answers' : 'from: broadly useful for this character';
    taken.push(cv.uid);
    if (cv.param === TO_DECIDE) toDecide.push(`${s.def.name}: ${s.def.param?.label ?? 'choice'}`);
    if (s.rec.flags.spellLike) toDecide.push(`${s.def.name}: effects to be chosen`);
    refresh();
    return cv;
  };
  const clean = (def: VirtueFlawDef, size: VFSize) => !vfProblems(get().d, data, def, undefined, { rules, size }).some((p) => p.severity === 'error' || p.code === 'limit-story' || p.code === 'limit-personality' || p.code === 'mystery-init');
  // the same Virtue twice only when it can be repeated with a different choice
  const dup = (s: Scored) => c.virtues.some((v) => v.defId === s.def.id && (!s.def.repeatable || v.param === paramFor(s)));
  // options with a subsystem of their own go into a draft only when the player asked for them
  // holy Methods and Powers are asked for by their own question, whatever was said of complexity
  const wantsHoly = () => c.type !== 'grog' && (tagWeights(st, get())['holy-power'] ?? 0) >= 2;
  const named = (id: string) => (st.answers[`vf:${id}`] ?? 0) >= 7;
  // Holy Magic remakes a magus's whole craft (no Magic Theory, every spell by a Method), and a Holy
  // Method or Power does nothing without its other half and a life of faith: none of them by chance
  // (a hedge tradition's own Virtues are gated out for others where they are scored: score.ts)
  const simpleEnough = (s: Scored) => (s.def.id === 'holy-magic' || isHolyVirtue(s.def.id) ? named(s.def.id) || wantsHoly()
    : complexityOk || !(s.rec.flags.complexity || s.rec.flags.spellLike) || named(s.def.id));
  const sizeFor = (s: Scored, room: number) => {
    const sizes = s.def.sizes.filter((z) => z !== 'Free' || s.def.sizes.length === 1);
    if (c.type === 'grog') return sizes.includes('Minor') ? 'Minor' : undefined;
    if (secondDivination(c, s.def.id)) return 'Minor';
    return sizes.includes('Major') && s.fit >= 25 && room >= 3 ? 'Major' : sizes.includes('Minor') ? 'Minor' : sizes[0];
  };

  // Personality Flaws first, for as many points as the rules allow: one Major and one Minor (a grog
  // two Minor). They tell the troupe how the character acts, and pay for Virtues (DE, Personality Flaws)
  addPersonalityFlaws(c, st, inp, get, log, add, clean, dup, simpleEnough, maxFlaws);

  // holy powers: a Method and a Power that go together, before anything else takes their points
  if (wantsHoly()) addHolyPair(c, st, inp, get, log, add, clean, maxFlaws * ratio);
  // a hedge tradition's Virtues and the Flaw its chapter requires; a magus's Mystery
  addTraditionVirtues(c, st, inp, get, log, add, clean, maxFlaws * ratio);
  addMystery(c, st, inp, get, log, add, clean, maxFlaws * ratio);

  // Virtues: best fit first, while there is room (a Major only when it fits clearly better)
  const ev = evaluate(st, get());
  let virtues = shortlist(ev, 'virtue').filter((s) => simpleEnough(s));
  // a Virtue that opens the Abilities the player wants (Warrior, Educated, Arcane Lore) comes first
  const typeTag = (t: string) => (t === 'Martial' ? 'combat' : t === 'Academic' ? 'scholarship' : 'lore');
  const accessWanted = (s: Scored) =>
    c.type !== 'magus' &&
    !!s.def.effects?.some((e) => e.type === 'abilityAccess' && (e.abilityTypes ?? []).some((t) => !get().d.abilityAccess.types.has(t) && (ev.weights[typeTag(t)] ?? 0) >= 2));
  // a Virtue asked for by name comes first of all (Quick build's named Virtues, a tutorial's practice character)
  // (one the questions gate out, as adding complexity, is still taken: the player asked for it)
  // (it takes the evaluation the list was drawn from: scoring every Virtue again for each pick doubled the build's time)
  const namedFirst = (xs: Scored[], ev: Evaluation) => {
    const asked = Object.keys(st.answers).filter((k) => k.startsWith('vf:') && named(k.slice(3)) && !st.declined.includes(k.slice(3))).map((k) => k.slice(3));
    if (!asked.length) return xs;
    const recs = vfRecords(data);
    const scoredOf = (id: string) => ev.scored.find((x) => x.def.id === id) ?? (data.vfById.get(id) && recs.get(id) ? scoreOption(data.vfById.get(id)!, recs.get(id)!, st, ev.weights, get()) : undefined);
    return [...asked.map(scoredOf).filter((x): x is Scored => !!x && x.def.kind === 'virtue' && !x.excluded && simpleEnough(x)), ...xs];
  };
  virtues = namedFirst([...virtues.filter(accessWanted), ...virtues.filter((s) => !accessWanted(s))], ev);
  const cap = maxFlaws * ratio;
  const anyFit = virtues.some((x) => x.fit > 0);
  const tried = new Set<string>();
  for (let guard = 0; guard < 40; guard++) {
    // re-rank after each choice: a new Virtue can change the best sub-choice (Warrior opens weapons)
    const now = guard === 0 ? null : evaluate(st, get());
    const list = now ? namedFirst([...virtues.filter(accessWanted), ...shortlist(now, 'virtue').filter((x) => simpleEnough(x))], now) : virtues;
    const open = list.filter((x) => !tried.has(x.def.id));
    // a Virtue named or one that opens wanted Abilities still comes first; the rest by fit (Quick build: drawn among the best)
    const s = open[0] && (named(open[0].def.id) || accessWanted(open[0])) ? open[0] : choose(inp, c, anyFit ? open.filter((x) => x.fit > 0) : open, (x) => sizeFor(x, cap - get().d.tally.virtuePoints));
    if (!s) break;
    tried.add(s.def.id);
    const t = get().d.tally;
    if (t.virtuePoints >= cap) break;
    if (anyFit && s.fit <= 0) break;
    if (!anyFit && t.virtuePoints >= 6) break; // neutral answers: a modest, well-rounded set
    if (dup(s)) continue;
    // a pair works wonders; more Methods and Powers would leave no room for the faith behind them (a Mythic Companion has room for a third)
    if (isHolyVirtue(s.def.id) && c.virtues.filter((v) => isHolyVirtue(v.defId)).length >= (c.type === 'mythic' ? 3 : 2)) continue;
    // a magus with no Hermetic Virtue of their own yet keeps a point back for one (see addMagicalIdentity)
    const held = c.type === 'magus' && !isOwnHermetic(s.def) && !hasOwnHermeticVirtue(c, data) ? 1 : 0;
    const size = sizeFor(s, cap - held - t.virtuePoints);
    if (!size || t.virtuePoints + SIZE_POINTS[size] > cap - held) continue;
    if (s.def.categories.includes('Mystery') && !c.virtues.some((v) => v.defId === 'cabal-legacy-flaw')) continue;
    if (!clean(s.def, size)) continue;
    add(s, size);
    log.push(`Virtue: ${s.def.name}${c.virtues.at(-1)?.param ? ` (${c.virtues.at(-1)!.param})` : ''}, ${size} — ${c.virtues.at(-1)!.why}.`);
  }

  // a magus the choices above left with no magic of their own gets an Affinity or Puissance in the Art they care most about
  if (c.type === 'magus') addMagicalIdentity(c, st, inp, get, log, add, clean, cap);

  // Flaws: enough points to pay for the Virtues, by the direction rules
  addFlaws(c, st, inp, get, log, add, clean, dup, simpleEnough, ratio);
  balance(c, inp, get, refresh, log, taken);
  // the Flaws' points not yet spent buy Minor Virtues that suit the character
  spendVirtuePoints(c, st, inp, get, log, add, clean, dup, simpleEnough);
  // a holy character belongs to the tradition whose favored Abilities they have (RoP: The Divine, Holy Traditions);
  // one with no faith behind their Second Sight or Premonitions belongs to none
  const dHoly = get().d;
  if (!c.holy?.tradition && (dHoly.trueFaith > 0 || isHolyCharacter(dHoly))) {
    const t = suitedTradition(c);
    if (t) {
      c.holy = { ...(c.holy ?? {}), tradition: t.id };
      log.push(`Holy tradition: ${t.name} (favored: ${t.favored.join(', ')}).`);
    }
  }
}

/** The Virtue that gives a Holy Power its Ability (Blessing's is named apart from the gruagach's Form). */
export const powerVirtue = (abilityId: string) => (abilityId === 'blessing' ? 'blessing-power' : abilityId);
/** The Holy Methods and Powers (RoP: The Divine): a role that asks for them keeps them in a Plain build (generate/character.ts). */
export const HOLY_VIRTUES = new Set([...HOLY_METHODS.map((m) => m.id), ...HOLY_POWERS.map((p) => powerVirtue(p.id))]);
const isHolyVirtue = (id: string) => HOLY_VIRTUES.has(id);
/** The Power each kind of Method calls first when nothing else decides. */
const FIRST_POWER: Record<string, string[]> = { invocation: ['blessing', 'wonders', 'adjuration', 'cursing'], meditation: ['understanding', 'blessing', 'intervention', 'transcendence'], purity: ['intervention', 'transcendence', 'adjuration', 'cursing'] };

/** A Hermetic Virtue that is the magus's own: not The Gift, and not the House's free one (an Ex Miscellanea tradition's counts). */
const isOwnHermetic = (def: VirtueFlawDef | undefined) => !!def && def.kind === 'virtue' && def.categories.includes('Hermetic') && def.id !== 'the-gift';
function hasOwnHermeticVirtue(c: Character, data: BuildInput['data']): boolean {
  return c.virtues.some((v) => isOwnHermetic(data.vfById.get(v.defId)) && (!v.free || v.freeReason === 'Ex Miscellanea'));
}

/**
 * A fallback, so that no built magus is without magic of their own beyond the House's gift. The core
 * book's quick guidelines give a magus a Minor Magical Focus, and Puissant and Affinity in one
 * Technique that overlaps it (DE, Quick and Easy Virtues and Flaws); most builds reach something of
 * the kind through the answers. A magus the Virtue choices left with no Hermetic Virtue of their own
 * (the House's free one aside, though an Ex Miscellanea tradition's counts) is given an Affinity
 * with, or Puissance in, the Art they care most about: the one the answers weigh highest, else the
 * House's own Puissant Art, else the best of the House's Arts. The Virtue choices keep a point back
 * for it. It is skipped when the player turned both Virtues down.
 */
function addMagicalIdentity(
  c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, log: string[],
  add: (s: Scored, size: VFSize) => { why?: string; param?: string }, clean: (def: VirtueFlawDef, size: VFSize) => boolean, cap: number,
) {
  const data = inp.data;
  if (hasOwnHermeticVirtue(c, data) || cap - get().d.tally.virtuePoints < 1) return;
  const d = get().d;
  const w = tagWeights(st, get());
  const deficient = new Set(c.virtues.filter((v) => v.defId === 'deficient-technique-flaw' || v.defId === 'deficient-form-flaw').map((v) => v.param));
  const houseFree = c.virtues.find((v) => v.freeReason === 'House Virtue' && v.defId === 'puissant-art')?.param as Art | undefined;
  const known = (c.house && HOUSE_ARTS[c.house]) || [...ARTS];
  const ranked = [...ARTS]
    .filter((a) => !deficient.has(a))
    .sort((a, b) => (w[`art:${b}`] ?? 0) - (w[`art:${a}`] ?? 0) || +(b === houseFree) - +(a === houseFree) || +known.includes(b) - +known.includes(a) || d.arts[b].score - d.arts[a].score);
  const art = ranked[0];
  if (!art) return;
  const ev = evaluate(st, get());
  const scored = (id: string) => ev.scored.find((x) => x.def.id === id && !x.excluded && !st.declined.includes(id));
  // Affinity where the House already makes the Art Puissant; else whichever fits the answers better
  const options = (houseFree === art ? ['affinity-with-art'] : ['affinity-with-art', 'puissant-art'])
    .map(scored)
    .filter((x): x is Scored => !!x && clean(x.def, 'Minor') && !c.virtues.some((v) => v.defId === x.def.id && v.param === art))
    .sort((a, b) => b.fit - a.fit);
  const pick = inp.rng && options.length > 1 && Math.abs(options[0].fit - options[1].fit) < 5 ? options[Math.floor(inp.rng() * options.length)] : options[0];
  if (!pick) return;
  const cv = add({ ...pick, param: art }, 'Minor');
  cv.why = `from: a magus's magic of their own, in the Art ${art === houseFree ? 'the House already favors' : 'they care most about'}`;
  log.push(`Virtue: ${pick.def.name} (${art}), Minor — a magus's magic of their own.`);
}

/**
 * A Holy Method and a Holy Power that work together (RoP: The Divine): the Method that fits the
 * answers and the character's Characteristics, and the Power it calls that fits best. One alone
 * does nothing, so a half the character already has is completed rather than a new pair begun.
 */
function addHolyPair(
  c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, log: string[],
  add: (s: Scored, size: VFSize) => { why?: string }, clean: (def: VirtueFlawDef, size: VFSize) => boolean, cap: number,
) {
  const has = (id: string) => c.virtues.some((v) => v.defId === id);
  const methods = () => HOLY_METHODS.filter((m) => has(m.id));
  const powers = () => HOLY_POWERS.filter((p) => has(powerVirtue(p.id)));
  if (methods().some((m) => powers().some((p) => METHOD_POWERS[m.as].includes(p.id)))) return;
  const ev = evaluate(st, get());
  const scored = (id: string) => ev.scored.find((x) => x.def.id === id && !x.excluded);
  const room = () => cap - get().d.tally.virtuePoints;
  const why = 'from: your wish to work wonders through prayer (a Holy Method and a Power it calls)';
  const take = (s: Scored) => {
    const cv = add(s, 'Major');
    cv.why = why;
  };
  let method = methods()[0];
  if (!method) {
    // the Method: the best fit, then the Characteristic it prays with
    const own = powers();
    const options = HOLY_METHODS.filter((m) => !own.length || own.some((p) => METHOD_POWERS[m.as].includes(p.id)))
      .map((m) => ({ m, s: scored(m.id) }))
      .filter((x): x is { m: (typeof HOLY_METHODS)[number]; s: Scored } => !!x.s && clean(x.s.def, 'Major'))
      .sort((a, b) => b.s.fit + 2 * get().d.characteristics[b.m.char].value - (a.s.fit + 2 * get().d.characteristics[a.m.char].value));
    // Quick build draws among the best few, unless one stands clear of the rest (it was asked for by name)
    const rank = (x: (typeof options)[number]) => x.s.fit + 2 * get().d.characteristics[x.m.char].value;
    const clear = options.length > 1 && rank(options[0]) - rank(options[1]) >= 5;
    // one asked for by name is taken, whatever else would fit
    const named = options.find((x) => (st.answers[`vf:${x.m.id}`] ?? 0) >= 7);
    const pick = named ?? (inp.rng && options.length > 1 && !clear ? options[Math.floor(inp.rng() * Math.min(3, options.length))] : options[0]);
    if (!pick || room() < 3) return;
    take(pick.s);
    method = pick.m;
    log.push(`Holy Method: ${pick.m.name}, Major — ${why}.`);
  }
  if (powers().some((p) => METHOD_POWERS[method.as].includes(p.id))) return;
  const order = FIRST_POWER[method.as];
  const options = METHOD_POWERS[method.as]
    .map((id) => ({ id, s: scored(powerVirtue(id)) }))
    .filter((x): x is { id: string; s: Scored } => !!x.s && clean(x.s.def, 'Major'))
    .sort((a, b) => b.s.fit - a.s.fit || order.indexOf(a.id) - order.indexOf(b.id));
  const pick = options.find((x) => (st.answers[`vf:${powerVirtue(x.id)}`] ?? 0) >= 7) ?? options[0];
  if (!pick || room() < 3) return;
  take(pick.s);
  log.push(`Holy Power: ${pick.s.def.name}, Major — ${method.name} calls it.`);
}

/** A Personality Flaw that says how the character acts: not an upbringing, nor Weak Personality (which allows no other). */
export const ACTS = (def: VirtueFlawDef) => def.kind === 'flaw' && def.categories.includes('Personality') && !/upbringing|weak-personality/.test(def.id);

function addPersonalityFlaws(
  c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, log: string[],
  add: (s: Scored, size: VFSize) => unknown, clean: (def: VirtueFlawDef, size: VFSize) => boolean, dup: (s: Scored) => boolean, simpleEnough: (s: Scored) => boolean, maxFlaws: number,
) {
  const personal = () => get().d.virtues.filter((v) => v.def?.kind === 'flaw' && v.def.categories.includes('Personality'));
  if (personal().some((v) => v.def!.id === 'weak-personality-flaw')) return;
  for (let slot = personal().length; slot < 2; slot++) {
    const major = personal().some((v) => v.cv.size === 'Major');
    const sizes: VFSize[] = c.type === 'grog' || major ? ['Minor'] : ['Major', 'Minor'];
    for (const size of sizes) {
      if (get().d.tally.flawPoints + SIZE_POINTS[size] > maxFlaws) continue;
      const ev = evaluate(st, get());
      const options = ev.scored.filter((f) => ACTS(f.def) && !f.excluded && f.fit >= 0 && f.def.sizes.includes(size) && simpleEnough(f) && !dup(f)).sort((a, b) => b.fit - a.fit);
      const f = choose(inp, c, firstPassing(options, (x) => clean(x.def, size), inp.rng ? 10 : 1), () => size, 10);
      if (!f) continue;
      add(f, size);
      log.push(`Personality Flaw: ${f.def.name}, ${size} — ${c.virtues.at(-1)!.why}.`);
      break;
    }
  }
}

/** Minor Virtues for the Flaw points left over, the best fits first: Flaws earn nothing unless spent. */
function spendVirtuePoints(
  c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, log: string[],
  add: (s: Scored, size: VFSize) => unknown, clean: (def: VirtueFlawDef, size: VFSize) => boolean, dup: (s: Scored) => boolean, simpleEnough: (s: Scored) => boolean,
) {
  const tried = new Set<string>();
  for (let guard = 0; guard < 12; guard++) {
    const t = get().d.tally;
    if (t.virtuePoints >= t.allowedVirtuePoints) break;
    const ev = evaluate(st, get());
    const options = ev.scored
      .filter((v) => v.def.kind === 'virtue' && !v.excluded && v.fit >= 0 && v.def.sizes.includes('Minor') && !v.def.categories.includes('Social Status') && !v.def.categories.includes('Mystery') && !tried.has(v.def.id) && simpleEnough(v) && !dup(v))
      .sort((a, b) => onListFirst(a, b) || b.fit - a.fit);
    const v = choose(inp, c, firstPassing(options, (x) => clean(x.def, 'Minor'), inp.rng ? 10 : 1), () => 'Minor', 10);
    if (!v) break;
    tried.add(v.def.id);
    add(v, 'Minor');
    log.push(`Virtue: ${v.def.name}, Minor — ${c.virtues.at(-1)!.why} (with the Flaws' points left over).`);
  }
}

/** Flaws until the Virtues are paid for: the best fits first, then the ones that cost least. */
function addFlaws(
  c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, log: string[],
  add: (s: Scored, size: VFSize) => unknown, clean: (def: VirtueFlawDef, size: VFSize) => boolean, dup: (s: Scored) => boolean, simpleEnough: (s: Scored) => boolean, ratio: number,
) {
  const hermetic = () => get().d.virtues.some((v) => v.def?.kind === 'flaw' && v.def.categories.includes('Hermetic') && !v.cv.free);
  const candidates = () => {
    const ev = evaluate(st, get());
    const fitting = shortlist(ev, 'flaw').filter((f) => f.fit > 0);
    // the rest: Flaws that cost least for this character (nothing the player rated high)
    // Quick build makes people met at random: a craftsman may be unlucky in their hands, and the
    // build then says so (craftTraits.ts) rather than keeping every such Flaw from them
    const unlucky = (f: Scored) => !!inp.rng && !!f.excluded && /^Hurts Crafts and trades/.test(f.excluded);
    const cheap = ev.scored
      .filter((f) => f.def.kind === 'flaw' && (!f.excluded || unlucky(f)) && (f.fit >= 0 || unlucky(f)) && !fitting.includes(f) && f.def.source.book === 'DE' && !f.def.categories.includes('Social Status'))
      .sort((a, b) => (b.strength.seasons ?? -2) - (a.strength.seasons ?? -2));
    return [...fitting, ...cheap].sort(onListFirst).filter((f) => simpleEnough(f) && !dup(f));
  };
  const sizeOf = (f: Scored, need: number): VFSize => (need >= 3 && f.def.sizes.includes('Major') && c.type !== 'grog' ? 'Major' : f.def.sizes.includes('Minor') ? 'Minor' : f.def.sizes[0]);
  // magi: at least one Hermetic Flaw (DE p.63)
  if (c.type === 'magus' && !hermetic()) {
    const minor = (x: Scored): VFSize => (x.def.sizes.includes('Minor') ? 'Minor' : x.def.sizes[0]);
    const f = choose(inp, c, firstPassing(candidates(), (x) => x.def.categories.includes('Hermetic') && clean(x.def, minor(x)), inp.rng ? 10 : 1), minor, 10);
    if (f) {
      const size: VFSize = f.def.sizes.includes('Minor') ? 'Minor' : f.def.sizes[0];
      add(f, size);
      log.push(`Flaw: ${f.def.name}, ${size} — magi take at least one Hermetic Flaw.`);
    }
  }
  for (let guard = 0; guard < 20; guard++) {
    const t = get().d.tally;
    const need = Math.ceil(t.virtuePoints / ratio) - t.flawPoints;
    if (need <= 0) break;
    // when the Minor Flaws still allowed cannot cover what is owed, a Major one must: look at those first
    const minorRoom = c.type === 'grog' ? Infinity : inp.rules.maxMinorFlaws - t.minorFlaws;
    const mustBeMajor = need > minorRoom && need >= 3;
    const pool = mustBeMajor ? candidates().filter((x) => x.def.sizes.includes('Major')) : candidates();
    const f = choose(inp, c, firstPassing(pool, (x) => clean(x.def, sizeOf(x, need)) && !(c.type === 'grog' && sizeOf(x, need) === 'Major'), inp.rng ? 12 : 1), (x) => sizeOf(x, need), 12);
    if (!f) break;
    const size = sizeOf(f, need);
    add(f, size);
    log.push(`Flaw: ${f.def.name}, ${size} — ${c.virtues.at(-1)!.why}.`);
  }
}

/** If the Flaws cannot pay for the Virtues, drop the weakest-fitting Virtues the build added. */
export function balance(c: Character, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[], taken?: string[]) {
  for (let guard = 0; guard < 10; guard++) {
    const t = get().d.tally;
    if (t.virtuePoints <= t.allowedVirtuePoints) break;
    const ours = get().d.virtues.filter((v) => (taken ? taken.includes(v.cv.uid) : !!v.cv.why) && v.def?.kind === 'virtue' && v.points > 0 && !v.def.categories.includes('Social Status'));
    const last = ours.at(-1);
    if (!last) break;
    removeVirtue(c, inp.data, last.cv.uid);
    log.push(`Dropped ${last.name}: not enough Flaw points to pay for it.`);
    refresh();
  }
}

