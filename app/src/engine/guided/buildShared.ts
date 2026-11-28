// What the guided build's steps share (autobuild.ts and the files it calls): its input and result,
// the answers, sub-choices, and Quick build's draw among the options that fit.

import { ARTS, CHARACTERISTICS, TECHNIQUES, type Characteristic, type GameData, type VFSize, type VirtueFlawDef } from '../../data';
import type { Character, Covenant, GuidedState, HouseRules, Saga } from '../types';
import { deriveCharacter } from '../character/derive';
import { MYTHIC_TYPES } from '../character/factory';
import { type Issue } from '../character/validate';
import type { Rng } from '../dice';
import { isStriking, markGroup, rarity, weightedPick } from '../generate/variety';
import { QUESTION_BY_ID } from './questions';
import { answerOf, type GuidedContext, type Scored } from './score';

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

export const SIZE_POINTS: Record<VFSize, number> = { Major: 3, Minor: 1, Free: 0 };

export const TRIBUNAL_LANGUAGE: Record<string, string> = {
  Rhine: 'German', 'Greater Alps': 'German', Stonehenge: 'English', Normandy: 'French', 'Provençal': 'Occitan', Iberian: 'Castilian', Rome: 'Italian',
  Hibernian: 'Irish Gaelic', 'Loch Leglean': 'Scots Gaelic', Theban: 'Greek', Transylvanian: 'Hungarian', Novgorod: 'Russian', Levant: 'Arabic',
};

export function ctxFor(c: Character, inp: BuildInput): GuidedContext {
  return { c, d: deriveCharacter(c, inp.data, inp.rules), data: inp.data, rules: inp.rules, saga: inp.saga, covenant: inp.covenant, archetypes: inp.archetypes };
}

export function answer(id: string, st: GuidedState, ctx: GuidedContext): number {
  const q = QUESTION_BY_ID.get(id);
  return q ? answerOf(q, st, ctx).value : 5;
}

/** A generic value for a text sub-choice the player still has to decide. */
export const TO_DECIDE = 'to be decided';

export function paramFor(s: Scored, rng?: Rng, w?: Record<string, number>, c?: Character, raised?: Set<string>): string | undefined {
  const spec = s.def.param;
  if (!spec) return undefined;
  if (s.param) {
    // a Flaw's Art or Characteristic the player did not care about either way: any such, not the
    // first; never one a Virtue raises (Poor Strength beside Giant Blood undoes it)
    const kind = s.rec.paramKind;
    if (w && s.def.kind === 'flaw' && (kind === 'art' || kind === 'char') && (rng || (kind === 'char' && raised?.has(s.param)))) {
      const all: string[] = spec.options?.length ? spec.options : kind === 'char' ? [...CHARACTERISTICS] : spec.kind === 'technique' ? [...TECHNIQUES] : spec.kind === 'form' ? ARTS.filter((a) => !(TECHNIQUES as readonly string[]).includes(a)) : [...ARTS];
      const tag = (x: string) => `${kind}:${x}`;
      const needed = kind === 'char' ? new Set([...neededCharacteristics(w, s.def, c), ...(raised ?? [])]) : new Set<string>();
      if ((w[tag(s.param)] ?? 0) === 0 || needed.has(s.param)) {
        const free = all.filter((x) => (w[tag(x)] ?? 0) <= 0 && !needed.has(x));
        if (free.length) return rng ? free[Math.floor(rng() * free.length)] : free[0];
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

export function neededCharacteristics(w: Record<string, number>, def: VirtueFlawDef, c?: Character): Set<string> {
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
export function choose(inp: BuildInput, c: Character, xs: Scored[], sizeOf: (s: Scored) => VFSize | undefined, top = 8): Scored | undefined {
  const held = c.virtues.map((v) => inp.data.vfById.get(v.defId)).filter((d): d is NonNullable<typeof d> => !!d);
  const marked = new Set(held.map((d) => markGroup(d)).filter(Boolean));
  // and only one striking mark in all: a grave bodily Flaw, a bloodline or True Faith
  const struck = held.some(isStriking);
  const free = (s: Scored) => !marked.has(markGroup(s.def)) && !(struck && isStriking(s.def));
  // one off a hedge tradition's suitable list only when nothing on it is left (score.ts, onListFirst)
  const ys = xs.some((s) => !s.offList && free(s)) ? xs.filter((s) => !s.offList) : xs;
  if (!inp.rng) return ys.find(free);
  const pool = ys.filter(free).slice(0, top);
  return weightedPick(inp.rng, pool, (s) => rarity(s.def, c.type, sizeOf(s)) * Math.sqrt(Math.max(1, s.fit)));
}

/** The first few options that pass a check, without checking every one (the check derives the character). */
export function firstPassing(xs: Scored[], ok: (s: Scored) => boolean, n: number): Scored[] {
  const out: Scored[] = [];
  for (const x of xs) {
    if (out.length >= n) break;
    if (ok(x)) out.push(x);
  }
  return out;
}

/** The Mythic Companion type chosen for a character (DE p.63), by the free Virtue that defines it. */
export const mythicTypeOf = (c: Character) => {
  const v = c.virtues.find((x) => x.freeReason === 'Mythic Companion');
  return v ? Object.entries(MYTHIC_TYPES).find(([, t]) => t.virtue === v.defId)?.[0] : undefined;
};

