// Auto-build (design spec, section 7): turn the guided build's answers into a complete, legal
// draft. It takes the best-fitting options within the Virtue budget, balances them with Flaws
// chosen by the direction rules, sets every sub-choice to the best fit, spends Characteristic
// points and experience by the ratings, and then runs the rules check and its fixes until the
// draft is clean. Every item records why it was chosen.

import { ARTS, CHARACTERISTICS, CHILDHOOD_ABILITIES, SAMPLE_CHILDHOODS, TECHNIQUES, type Art, type Characteristic, type Form, type Technique, type GameData, type VFSize, type VirtueFlawDef } from '../../data';
import { EX_MISC_TRADITIONS, HOUSE_BY_ID } from '../../data/houses';
import type { CharSpell, Character, Covenant, GuidedState, HouseRules, Saga, XpSource } from '../types';
import { canSpend, deriveCharacter, sumAlloc, type DerivedCharacter, type XpBudget } from '../character/derive';
import { addVirtue, applyExMiscTradition, ensureAbility, removeVirtue, setHouse } from '../character/factory';
import { abilityAvailability, vfProblems } from '../character/restrictions';
import { validateCharacter, type Issue } from '../character/validate';
import { fixesFor, resolveAll } from '../character/fixes';
import { creationSpellLimit } from '../magic';
import { abilityScoreFromXp, abilityXpForScore, artScoreFromXp, artXpForScore } from '../xp';
import { uid } from '../../util/id';
import type { Rng } from '../dice';
import { markGroup, rarity, weightedPick } from '../generate/variety';
import { abilityTag } from './records';
import { QUESTION_BY_ID } from './questions';
import { answerOf, evaluate, recommendHouses, shortlist, statusShortlist, tagWeights, traceOf, type GuidedContext, type Scored } from './score';
import { tagLabel } from './tags';

export interface BuildInput {
  data: GameData;
  rules: HouseRules;
  saga?: Saga;
  covenant?: Covenant;
  archetypes: string[];
  /**
   * Quick build's randomness: with it, the build draws among the options that fit (the rare ones
   * rarely) and makes the choices a player would, at random; without it (the guided build), it
   * takes the best fit every time.
   */
  rng?: Rng;
}

export interface BuildResult {
  /** what was done, in order, for the preview and the notice */
  log: string[];
  /** issues the draft still has (the aim is none) */
  remaining: Issue[];
  /** options that need a choice the build could not make (effects of powers, a text sub-choice) */
  toDecide: string[];
}

const SIZE_POINTS: Record<VFSize, number> = { Major: 3, Minor: 1, Free: 0 };

const TRIBUNAL_LANGUAGE: Record<string, string> = {
  Rhine: 'German', 'Greater Alps': 'German', Stonehenge: 'English', Normandy: 'French', 'Provençal': 'Occitan', Iberian: 'Castilian', Rome: 'Italian',
  Hibernian: 'Irish Gaelic', 'Loch Leglean': 'Scots Gaelic', Theban: 'Greek', Transylvanian: 'Hungarian', Novgorod: 'Russian', Levant: 'Arabic',
};

function ctxFor(c: Character, inp: BuildInput): GuidedContext {
  return { c, d: deriveCharacter(c, inp.data, inp.rules), data: inp.data, rules: inp.rules, saga: inp.saga, covenant: inp.covenant, archetypes: inp.archetypes };
}

function answer(id: string, st: GuidedState, ctx: GuidedContext): number {
  const q = QUESTION_BY_ID.get(id);
  return q ? answerOf(q, st, ctx).value : 5;
}

/** A generic value for a text sub-choice the player still has to decide. */
const TO_DECIDE = 'to be decided';

function paramFor(s: Scored, rng?: Rng, w?: Record<string, number>, c?: Character): string | undefined {
  const spec = s.def.param;
  if (!spec) return undefined;
  if (s.param) {
    // a Flaw's Art or Characteristic the player did not care about either way: any such, not the first
    const kind = s.rec.paramKind;
    if (rng && w && s.def.kind === 'flaw' && (kind === 'art' || kind === 'char')) {
      const all: string[] = spec.options?.length ? spec.options : kind === 'char' ? [...CHARACTERISTICS] : spec.kind === 'technique' ? [...TECHNIQUES] : spec.kind === 'form' ? ARTS.filter((a) => !(TECHNIQUES as readonly string[]).includes(a)) : [...ARTS];
      const tag = (x: string) => `${kind}:${x}`;
      const needed = kind === 'char' ? neededCharacteristics(w, s.def, c) : new Set<string>();
      if ((w[tag(s.param)] ?? 0) === 0 || needed.has(s.param)) {
        const free = all.filter((x) => (w[tag(x)] ?? 0) <= 0 && !needed.has(x));
        if (free.length) return free[Math.floor(rng() * free.length)];
      }
    }
    return s.param;
  }
  const options = spec.options?.length ? spec.options : spec.groups?.flatMap((g) => g.options);
  if (options?.length) return rng ? options[Math.floor(rng() * options.length)] : options[0];
  return spec.optional ? undefined : TO_DECIDE;
}

/** What a character's work leans on, which a Flaw that lowers a Characteristic should spare (a scribe's Intelligence). */
const TAG_CHARS: Record<string, Characteristic[]> = {
  scholarship: ['Int'], lore: ['Int'], lab: ['Int'], teaching: ['Int', 'Com'], healing: ['Int', 'Per'], crafts: ['Dex', 'Int'],
  social: ['Pre', 'Com'], leadership: ['Pre', 'Com'], performance: ['Pre', 'Com'], politics: ['Com', 'Int'],
  combat: ['Str', 'Sta', 'Dex', 'Qik'], stealth: ['Dex', 'Qik'], perception: ['Per'], outdoors: ['Per', 'Sta'],
};
const TYPE_CHARS: Record<Character['type'], Characteristic[]> = { magus: ['Int', 'Sta'], companion: [], mythic: [], grog: ['Sta'] };

function neededCharacteristics(w: Record<string, number>, def: VirtueFlawDef, c?: Character): Set<string> {
  if (def.kind !== 'flaw') return new Set();
  const out = new Set<string>(c ? TYPE_CHARS[c.type] : []);
  for (const [tag, chars] of Object.entries(TAG_CHARS)) if ((w[tag] ?? 0) >= 2) chars.forEach((k) => out.add(k));
  return out;
}

/**
 * The option to take next: the best fit for the guided build; for Quick build, one of the best few
 * drawn at random, weighted by fit and by how rare it should be, and never a second of a kind that
 * marks a character out (two disfigurements, two faerie bloodlines).
 */
function choose(inp: BuildInput, c: Character, xs: Scored[], sizeOf: (s: Scored) => VFSize | undefined, top = 8): Scored | undefined {
  if (!inp.rng) return xs[0];
  const marked = new Set(c.virtues.map((v) => inp.data.vfById.get(v.defId)).map((d) => d && markGroup(d)).filter(Boolean));
  const pool = xs.filter((s) => !marked.has(markGroup(s.def))).slice(0, top);
  return weightedPick(inp.rng, pool, (s) => rarity(s.def, c.type, sizeOf(s)) * Math.sqrt(Math.max(1, s.fit)));
}

/** The first few options that pass a check, without checking every one (the check derives the character). */
function firstPassing(xs: Scored[], ok: (s: Scored) => boolean, n: number): Scored[] {
  const out: Scored[] = [];
  for (const x of xs) {
    if (out.length >= n) break;
    if (ok(x)) out.push(x);
  }
  return out;
}

/** Clear the choices a draft makes, keeping who the character is (name, type, concept, age and covenant). */
export function resetChoices(c: Character) {
  c.virtues = c.virtues.filter((v) => ['the-gift', 'hermetic-magus'].includes(v.defId) || (c.type === 'grog' && v.defId === 'covenfolk'));
  if (c.type === 'magus') c.house = undefined;
  c.abilities = c.abilities.filter((a) => a.native);
  for (const k of Object.keys(c.arts)) c.arts[k as keyof Character['arts']] = {};
  c.spells = [];
  for (const k of Object.keys(c.characteristics)) c.characteristics[k as keyof Character['characteristics']] = 0;
  c.personality = c.personality.filter((p) => c.type === 'grog' && p.trait === 'Loyal');
  c.creation.childhoodPackage = undefined;
  c.creation.guidedWhy = {};
}

/** Build the draft on `c` (mutated). */
export function autoBuild(c: Character, st: GuidedState, inp: BuildInput): BuildResult {
  const log: string[] = [];
  const toDecide: string[] = [];
  const why: Record<string, string> = { ...(c.creation.guidedWhy ?? {}) };
  c.guided = structuredClone(st);
  let ctx = ctxFor(c, inp);
  const refresh = () => (ctx = ctxFor(c, inp));

  // ---------------------------------------------------------------- House
  if (c.type === 'magus' && !c.house) {
    const ev = evaluate(st, ctx);
    const pick = (st.house && HOUSE_BY_ID[st.house] ? st.house : undefined) ?? recommendHouses(ev, ctx)[0]?.id;
    if (pick) {
      const h = HOUSE_BY_ID[pick];
      // the House benefit that fits best
      let best = 0;
      let bestFit = -Infinity;
      h.benefitOptions.forEach((b, i) => {
        const s = ev.scored.find((x) => x.def.id === b.virtueId);
        if (s && s.fit > bestFit) {
          bestFit = s.fit;
          best = i;
        }
      });
      setHouse(c, inp.data, pick, best);
      // Jerbiton: the free Minor Virtue from the House's list that fits best (DE, House Jerbiton)
      if (h.freeChoiceFrom) {
        const fits = h.freeChoiceFrom
          .map((id) => ev.scored.find((x) => x.def.id === id))
          .filter((x): x is Scored => !!x && x.def.sizes.includes('Minor') && !c.virtues.some((v) => v.defId === x.def.id))
          .sort((a, b) => b.fit - a.fit);
        const choice = fits[0];
        if (choice) {
          setHouse(c, inp.data, pick, best, { defId: choice.def.id, param: paramFor(choice) });
          log.push(`Jerbiton's free Virtue: ${choice.def.name}.`);
        }
      }
      // Ex Miscellanea: the tradition whose Virtues fit best, and whose Flaw hurts least
      if (pick === 'ex-miscellanea') {
        const fitOf = (id: string) => ev.scored.find((x) => x.def.id === id)?.fit ?? 0;
        const trad = [...EX_MISC_TRADITIONS.filter((t) => t.id !== 'custom')].sort(
          (a, b) => fitOf(b.majorNonHermetic) + fitOf(b.minorHermetic) - fitOf(b.majorHermeticFlaw) - (fitOf(a.majorNonHermetic) + fitOf(a.minorHermetic) - fitOf(a.majorHermeticFlaw)),
        )[0];
        if (trad) {
          applyExMiscTradition(c, inp.data, trad.id);
          log.push(`Ex Miscellanea tradition: ${trad.name}.`);
        }
      }
      why.house = st.house ? 'you chose it' : 'from: the best fit for your answers';
      log.push(`House ${h.name} (${why.house}).`);
      refresh();
    }
  }

  // ---------------------------------------------------------------- Social Status
  if (c.type !== 'magus' && !ctx.d.tally.socialStatuses.length) {
    const ev = evaluate(st, ctx);
    const pick = statusShortlist(ev).find((s) => s.fit > 0 && s.size !== 'Major') ?? ev.scored.find((s) => s.def.id === (answer('f-travel', st, ctx) >= 7 ? 'wanderer' : 'covenfolk'));
    if (pick) {
      const cv = addVirtue(c, inp.data, pick.def.id, pick.def.sizes.includes('Free') ? 'Free' : pick.size, paramFor(pick));
      cv.why = pick.fit > 0 ? traceOf(pick, st, ctx) : 'from: the usual status for this concept';
      log.push(`Social Status: ${pick.def.name}.`);
      refresh();
    }
  }

  // ---------------------------------------------------------------- Characteristics
  const bought = spendCharacteristics(c, st, ctx, why, log);
  refresh();

  // ---------------------------------------------------------------- Virtues and Flaws
  buildVirtuesAndFlaws(c, st, inp, () => ctx, refresh, log, toDecide);
  refresh();
  // again, now that Great and Poor Characteristics and Virtue points are known
  if (bought) {
    log.pop();
    spendCharacteristics(c, st, ctx, why, log, true);
    refresh();
  }

  // ---------------------------------------------------------------- experience
  spendExperience(c, st, inp, () => ctx, refresh, why, log);
  refresh();
  if (c.type === 'magus') chooseSpells(c, st, inp, () => ctx, refresh, log);
  refresh();

  // ---------------------------------------------------------------- personality
  for (const v of ctx.d.virtues) {
    if (v.def?.kind !== 'flaw' || !v.def.categories.includes('Personality')) continue;
    const need = v.cv.size === 'Major' ? 6 : 3;
    const trait = v.def.name.replace(/\s*\(.*\)$/, '');
    if (!c.personality.some((p) => Math.abs(p.score) >= need)) c.personality.push({ uid: uid(), trait, score: need });
  }
  const fighter = c.abilities.some((a) => ['single-weapon', 'great-weapon', 'bows', 'thrown-weapon'].includes(a.abilityId) && sumAlloc(a.xp) > 0);
  if (fighter && !c.personality.some((p) => /brave|cowardly/i.test(p.trait))) c.personality.push({ uid: uid(), trait: 'Brave', score: 2 });

  c.creation.guidedWhy = why;
  refresh();

  // ---------------------------------------------------------------- rules check
  const remaining = cleanUp(c, inp, log);
  return { log, remaining, toDecide };
}

// ------------------------------------------------------------------ Characteristics

const TYPE_CHAR_PRIOR: Record<Character['type'], Partial<Record<Characteristic, number>>> = {
  magus: { Int: 3, Sta: 2, Com: 1, Per: 1 },
  companion: { Per: 1, Pre: 1, Com: 1, Sta: 1 },
  mythic: { Sta: 2, Per: 1, Pre: 1 },
  grog: { Sta: 2, Str: 2, Dex: 1, Qik: 1 },
};
const CHAR_COST = (v: number) => (v > 0 ? (v * (v + 1)) / 2 : -((-v * (-v + 1)) / 2));

function spendCharacteristics(c: Character, st: GuidedState, ctx: GuidedContext, why: Record<string, string>, log: string[], redo = false) {
  const d = ctx.d;
  if (!redo && d.charPointsSpent !== 0 && CHARACTERISTICS.some((ch) => c.characteristics[ch] !== 0)) return false; // the player already bought them
  const ev = evaluate(st, ctx);
  const w = (ch: Characteristic) => (ev.weights[`char:${ch}`] ?? 0) + (TYPE_CHAR_PRIOR[c.type][ch] ?? 0) * 1.5;
  const vals = Object.fromEntries(CHARACTERISTICS.map((ch) => [ch, 0])) as Record<Characteristic, number>;
  // Great (Characteristic) needs it bought at +3, Poor (Characteristic) at –3
  const pinned = new Set<Characteristic>();
  for (const e of d.effects) {
    if (e.type !== 'greatChar' || typeof e.char !== 'string' || !(CHARACTERISTICS as readonly string[]).includes(e.char)) continue;
    const ch = e.char as Characteristic;
    vals[ch] = e.amount > 0 ? 3 : -3;
    pinned.add(ch);
  }
  let budget = d.charPointsBudget - CHARACTERISTICS.reduce((s, ch) => s + CHAR_COST(vals[ch]), 0);
  // lower what the player cares least about, if they said so (each −1 buys a point)
  for (const ch of [...CHARACTERISTICS].sort((a, b) => w(a) - w(b))) {
    if (pinned.has(ch)) continue;
    if ((ev.weights[`char:${ch}`] ?? 0) <= -3 && vals[ch] > -2) {
      vals[ch] = (ev.weights[`char:${ch}`] ?? 0) <= -5 ? -2 : -1;
      budget -= CHAR_COST(vals[ch]);
    }
  }
  // then raise by weight, one step at a time
  for (let guard = 0; guard < 40 && budget > 0; guard++) {
    const options = CHARACTERISTICS.filter((ch) => !pinned.has(ch) && vals[ch] < 3 && CHAR_COST(vals[ch] + 1) - CHAR_COST(vals[ch]) <= budget && w(ch) > -2)
      .map((ch) => ({ ch, value: w(ch) / (CHAR_COST(vals[ch] + 1) - CHAR_COST(vals[ch])) }))
      .sort((a, b) => b.value - a.value);
    if (!options.length) break;
    const ch = options[0].ch;
    budget -= CHAR_COST(vals[ch] + 1) - CHAR_COST(vals[ch]);
    vals[ch]++;
  }
  for (const ch of CHARACTERISTICS) {
    c.characteristics[ch] = vals[ch];
    if (vals[ch]) why[`char:${ch}`] = (ev.weights[`char:${ch}`] ?? 0) ? `from: your rating of ${ch}` : `from: what a ${c.type} usually needs`;
  }
  log.push(`Characteristics: ${CHARACTERISTICS.filter((ch) => vals[ch]).map((ch) => `${ch} ${vals[ch] > 0 ? '+' : ''}${vals[ch]}`).join(', ') || 'all 0'}.`);
  return true;
}

// ------------------------------------------------------------------ Virtues and Flaws

function buildVirtuesAndFlaws(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[], toDecide: string[]) {
  const { data, rules } = inp;
  const maxFlaws = c.type === 'grog' ? rules.grogMaxFlawPoints : rules.maxFlawPoints;
  const ratio = c.type === 'mythic' ? rules.mythicVirtueRatio : 1;
  const taken: string[] = [];
  const complexityOk = answer('a-complexity', st, get()) >= 7;
  const add = (s: Scored, size: VFSize) => {
    const cv = addVirtue(c, data, s.def.id, size, paramFor(s, inp.rng, tagWeights(st, get()), c));
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
  const simpleEnough = (s: Scored) => complexityOk || !(s.rec.flags.complexity || s.rec.flags.spellLike) || (st.answers[`vf:${s.def.id}`] ?? 0) >= 7;
  const sizeFor = (s: Scored, room: number) => {
    const sizes = s.def.sizes.filter((z) => z !== 'Free' || s.def.sizes.length === 1);
    if (c.type === 'grog') return sizes.includes('Minor') ? 'Minor' : undefined;
    return sizes.includes('Major') && s.fit >= 25 && room >= 3 ? 'Major' : sizes.includes('Minor') ? 'Minor' : sizes[0];
  };

  // Virtues: best fit first, while there is room (a Major only when it fits clearly better)
  const ev = evaluate(st, get());
  let virtues = shortlist(ev, 'virtue').filter((s) => simpleEnough(s));
  // a Virtue that opens the Abilities the player wants (Warrior, Educated, Arcane Lore) comes first
  const typeTag = (t: string) => (t === 'Martial' ? 'combat' : t === 'Academic' ? 'scholarship' : 'lore');
  const accessWanted = (s: Scored) =>
    c.type !== 'magus' &&
    !!s.def.effects?.some((e) => e.type === 'abilityAccess' && (e.abilityTypes ?? []).some((t) => !get().d.abilityAccess.types.has(t) && (ev.weights[typeTag(t)] ?? 0) >= 2));
  virtues = [...virtues.filter(accessWanted), ...virtues.filter((s) => !accessWanted(s))];
  const cap = maxFlaws * ratio;
  const anyFit = virtues.some((x) => x.fit > 0);
  const tried = new Set<string>();
  for (let guard = 0; guard < 40; guard++) {
    // re-rank after each choice: a new Virtue can change the best sub-choice (Warrior opens weapons)
    const list = guard === 0 ? virtues : [...virtues.filter(accessWanted), ...shortlist(evaluate(st, get()), 'virtue').filter((x) => simpleEnough(x))];
    const open = list.filter((x) => !tried.has(x.def.id));
    // a Virtue that opens wanted Abilities still comes first; the rest by fit (Quick build: drawn among the best)
    const s = open[0] && accessWanted(open[0]) ? open[0] : choose(inp, c, anyFit ? open.filter((x) => x.fit > 0) : open, (x) => sizeFor(x, cap - get().d.tally.virtuePoints));
    if (!s) break;
    tried.add(s.def.id);
    const t = get().d.tally;
    if (t.virtuePoints >= cap) break;
    if (anyFit && s.fit <= 0) break;
    if (!anyFit && t.virtuePoints >= 6) break; // neutral answers: a modest, well-rounded set
    if (dup(s)) continue;
    const size = sizeFor(s, cap - t.virtuePoints);
    if (!size || t.virtuePoints + SIZE_POINTS[size] > cap) continue;
    if (s.def.categories.includes('Mystery') && !c.virtues.some((v) => v.defId === 'cabal-legacy-flaw')) continue;
    if (!clean(s.def, size)) continue;
    add(s, size);
    log.push(`Virtue: ${s.def.name}${c.virtues.at(-1)?.param ? ` (${c.virtues.at(-1)!.param})` : ''}, ${size} — ${c.virtues.at(-1)!.why}.`);
  }

  // Flaws: enough points to pay for the Virtues, by the direction rules
  addFlaws(c, st, inp, get, log, add, clean, dup, simpleEnough, ratio);
  balance(c, inp, get, refresh, log, taken);
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
    const cheap = ev.scored
      .filter((f) => f.def.kind === 'flaw' && !f.excluded && f.fit >= 0 && !fitting.includes(f) && f.def.source.book === 'DE' && !f.def.categories.includes('Social Status'))
      .sort((a, b) => (b.strength.seasons ?? -2) - (a.strength.seasons ?? -2));
    return [...fitting, ...cheap].filter((f) => simpleEnough(f) && !dup(f));
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
    const f = choose(inp, c, firstPassing(candidates(), (x) => clean(x.def, sizeOf(x, need)) && !(c.type === 'grog' && sizeOf(x, need) === 'Major'), inp.rng ? 12 : 1), (x) => sizeOf(x, need), 12);
    if (!f) break;
    const size = sizeOf(f, need);
    add(f, size);
    log.push(`Flaw: ${f.def.name}, ${size} — ${c.virtues.at(-1)!.why}.`);
  }
}

/** If the Flaws cannot pay for the Virtues, drop the weakest-fitting Virtues the build added. */
function balance(c: Character, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[], taken?: string[]) {
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

// ------------------------------------------------------------------ experience

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

function abilityParam(id: string, c: Character, inp: BuildInput): string | undefined {
  const region = (inp.covenant?.tribunal || inp.saga?.tribunal || '').trim();
  switch (id) {
    case 'area-lore': return c.nationality || (region ? `${region} Tribunal` : 'Home');
    case 'craft-type': return 'Blacksmith';
    case 'profession-type': return c.type === 'magus' ? 'Scribe' : 'Steward';
    case 'living-language': return TRIBUNAL_LANGUAGE[region] ?? 'French';
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
  return [...score.entries()].map(([id, v]) => ({ id, ...v })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w);
}

function spendPoolOnAbilities(c: Character, budget: XpBudget, xp: number, ranked: { id: string; w: number; tag: string }[], width: number, inp: BuildInput, get: () => GuidedContext, refresh: () => void, st: GuidedState, log: string[]) {
  let left = xp;
  const existing = new Set(c.abilities.map((a) => a.uid));
  const allowed = (id: string) => {
    const def = inp.data.abilityById.get(id);
    const have = c.abilities.some((a) => a.abilityId === id);
    return !!def && inp.data.isBookEnabled(def.source.book) && (have || abilityAvailability(get().d, inp.data, id).ok) && canSpend(get().d, inp.data, budget, { abilityId: id, param: abilityParam(id, c, inp) }).ok;
  };
  const usable = ranked.filter((r) => allowed(r.id)).slice(0, width);
  if (!usable.length) return 0;
  for (let guard = 0; guard < 60 && left > 0; guard++) {
    // raise the most wanted Ability that is furthest below its share
    let did = false;
    for (const r of usable) {
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

function artRanking(st: GuidedState, ctx: GuidedContext): { art: Art; w: number }[] {
  const w = tagWeights(st, ctx);
  const prior: Partial<Record<Art, number>> = { Cr: 1, Re: 1, In: 0.8, Co: 0.6, Vi: 0.6, Mu: 0.5, Pe: 0.5, Ig: 0.4, Te: 0.4, Me: 0.4 };
  return ARTS.map((a) => ({ art: a, w: (w[`art:${a}`] ?? 0) + (prior[a] ?? 0) })).sort((a, b) => b.w - a.w);
}

function spendExperience(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void, why: Record<string, string>, log: string[]) {
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
function chooseSpells(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[], source: 'apprenticeship' | 'postGauntlet' = 'apprenticeship') {
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
        .filter((s) => s.technique === cb.t && s.form === cb.f && s.level !== null && !s.general && s.level <= Math.min(limit, left) && (ritualOk || !s.ritual) && !s.requisites.length && inp.data.isBookEnabled(s.source.book))
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

// ------------------------------------------------------------------ the rules check

const IGNORED = new Set(['name']);

function cleanUp(c: Character, inp: BuildInput, log: string[]): Issue[] {
  // a vf-balance error left after a drop: rebalance first
  const { data, rules } = inp;
  for (let round = 0; round < 6; round++) {
    const res = resolveAll(c, data, rules);
    for (const a of res.applied) log.push(`Fixed: ${a}`);
    // an Ability a fix emptied (one the character turned out unable to learn) goes, rather than stay at 0
    const before = deriveCharacter(c, data, rules);
    c.abilities = c.abilities.filter((a) => a.native || sumAlloc(a.xp) > 0 || before.abilityByUid.get(a.uid)?.granted);
    const d = deriveCharacter(c, data, rules);
    const issues = validateCharacter(d, data, rules).filter((i) => i.severity !== 'info' && !IGNORED.has(i.code ?? i.id));
    if (!issues.length) return [];
    let did = false;
    for (const i of issues) {
      // a warning with a safe automatic fix
      const fix = fixesFor(i, d, data, rules).find((f) => f.kind === 'apply' && f.auto);
      if (fix && fix.kind === 'apply') {
        fix.apply(c);
        log.push(`Fixed: ${fix.label}`);
        did = true;
        break;
      }
      // otherwise drop a Virtue or Flaw the build added that the check objects to
      const cv = i.vf ? c.virtues.find((v) => v.uid === i.vf && v.why) : undefined;
      if (cv) {
        const name = data.vfById.get(cv.defId)?.name ?? cv.defId;
        removeVirtue(c, data, cv.uid);
        log.push(`Dropped ${name}: ${i.message}`);
        let ctx = { c, d: deriveCharacter(c, data, rules), data, rules, saga: inp.saga, covenant: inp.covenant, archetypes: inp.archetypes };
        balance(c, inp, () => ctx, () => void (ctx = { ...ctx, d: deriveCharacter(c, data, rules) }), log);
        did = true;
        break;
      }
    }
    if (!did) return issues;
  }
  const d = deriveCharacter(c, data, rules);
  return validateCharacter(d, data, rules).filter((i) => i.severity !== 'info' && !IGNORED.has(i.code ?? i.id));
}
