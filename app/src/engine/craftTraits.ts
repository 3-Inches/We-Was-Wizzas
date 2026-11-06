// The Virtues and Flaws that matter at a craftsman's work, for a character or one of the covenant's
// craftsmen. Craftsmen are people met at random, so some are lucky and some are not: a smith with
// Palsied Hands works below their Craft score, one with Puissant Craft above it, and others are
// helped or held back in ways less plain than either (Keen Vision on fine work, Leprosy and a Craft
// Reputation, the Gift at the market stall). Each entry says what it does and where, from the book.
//
// The ones that always apply change the score a craftsman works at: their Workshop Total, their
// Labor Points, what they save the covenant, and the Build Points a covenant pays for them (a
// covenant pays for the craftsman it gets, not the Craft score on paper). The rest say when they
// apply, and the troupe applies them (a season of fine work, a sale, an apprentice taught).

import type { GameData } from '../data';
import type { Rng } from './dice';
import type { Character, Specialist } from './types';

export interface CraftTrait {
  /** the Virtue or Flaw (data id) */
  id: string;
  good: boolean;
  /** to the score they work at, always (their Workshop Total, Labor Points, savings and cost) */
  work?: number;
  /** to the Workshop Total only in some work: what work, and how much */
  when?: { mod: number; work: string };
  /** cannot work most crafts at all */
  cannot?: boolean;
  /** what it does at the craft, in a line */
  text: string;
  /** where the rule is */
  ref: string;
  /** how often a craftsman met at random has it (a Virtue or Flaw a person may simply have) */
  chance?: number;
}

/** In the order they matter most; the chance is out of the craftsmen met (a few in a hundred each). */
export const CRAFT_TRAITS: CraftTrait[] = [
  // ---- helps
  { id: 'puissant-ability', good: true, work: 2, text: 'adds 2 to their Craft whenever they use it', ref: 'DE, Puissant (Ability)', chance: 0.05 },
  { id: 'affinity-with-ability', good: true, text: 'learns the Craft half again as fast: each year at work and in their free seasons counts for more', ref: 'DE, Affinity with (Ability)', chance: 0.04 },
  { id: 'great-characteristic', good: true, text: 'a Dexterity above +3, in every Workshop Total and season’s Labor Points', ref: 'DE, Great (Characteristic)' },
  { id: 'keen-vision', good: true, when: { mod: 3, work: 'fine work by eye (jewels, engraving, illumination, glass)' }, text: '+3 to all rolls involving sight', ref: 'DE, Keen Vision', chance: 0.03 },
  { id: 'light-touch', good: true, when: { mod: 1, work: 'fine handwork (locks, jewels, instruments, sewing)' }, text: '+1 to subtle work with the hands, and one botch die fewer on it (exerting in the workshop)', ref: 'DE, Light Touch', chance: 0.03 },
  { id: 'free-expression', good: true, when: { mod: 3, work: 'a new work of art (a painting, a carving, a new design)' }, text: '+3 to all rolls to create a new work of art', ref: 'DE, Free Expression', chance: 0.03 },
  { id: 'prolific-artist', good: true, text: 'a work of art takes three-quarters of the time (a season’s piece in nine weeks), though no assistant can keep up', ref: 'Art & Academe, Prolific Artist' },
  { id: 'craft-guild-training', good: true, text: 'trained by a guild master: 50 more experience in their crafts at the start (in their score already)', ref: 'DE, Craft Guild Training', chance: 0.04 },
  { id: 'forge-companion', good: true, text: '50 more experience in the crafts of the Verditius they work for (in their score already)', ref: 'DE, Forge Companion' },
  { id: 'eye-of-hephaestus', good: true, text: 'knows an item’s quality, and any flaw in it, by touch: a sure appraisal at market, and a chance to tell a wondrous item’s power', ref: 'DE, Eye of Hephaestus', chance: 0.01 },
  { id: 'crafters-eye', good: true, text: 'knows an item’s quality, and any flaw in it, by touch', ref: 'Between Sand & Sea, Crafter’s Eye' },
  { id: 'good-teacher', good: true, text: '+5 to the Source Quality of the apprentice they teach', ref: 'DE, Good Teacher', chance: 0.03 },
  { id: 'self-confident', good: true, text: 'a Confidence Point spent adds +3 to a roll: exertion in the workshop, a sale', ref: 'DE, Self-Confident', chance: 0.03 },
  { id: 'wealthy', good: true, text: 'works one season a year (Labor Points ×6 in it), with three free', ref: 'DE, Wealthy; City & Guild ch.2' },
  { id: 'mythic-farrier', good: true, text: 'shoes horses with wondrous horseshoes (one Form): a limited Touched by (Realm)', ref: 'Grogs, Mythic Farrier' },
  { id: 'crafters-healing', good: true, text: 'heals wounds by touching them with the tools of the trade', ref: 'DE, Crafter’s Healing' },
  { id: 'maker-of-textured-vessels', good: true, text: 'pots with mystical patterns that hold an effect', ref: 'DE, Maker of Textured Vessels' },
  { id: 'maker-of-water-vessels', good: true, text: 'a drink from their vessel lends their Craft score', ref: 'DE, Maker of Water Vessels' },
  { id: 'enchanting-ability', good: true, text: 'stirs feelings and beliefs through their work', ref: 'DE, Enchanting (Ability)' },
  { id: 'lesser-craft-magic', good: true, text: 'makes items holding raw vis into lesser enchanted devices', ref: 'Rival Magic, Lesser Craft Magic' },
  { id: 'craft-magic', good: true, text: 'magic worked through the craft', ref: 'Houses of Hermes: Societates, Craft Magic' },
  { id: 'craft-amulets', good: true, text: 'makes amulets imbued with supernatural effects', ref: 'Realms of Power: The Divine, Craft Amulets' },
  { id: 'mythic-saddle-maker', good: true, text: 'saddles and woodwork with magical effects (one Form)', ref: 'Between Sand & Sea, Mythic Saddle-Maker' },
  // ---- hurts
  { id: 'palsied-hands-flaw', good: false, work: -2, text: 'all rolls holding or wielding an object at −2: every tool', ref: 'DE, Palsied Hands', chance: 0.04 },
  { id: 'clumsy-flaw', good: false, work: -3, text: '−3 to rolls of the hands and body, and an extra botch die on Dexterity (exerting in the workshop)', ref: 'DE, Clumsy', chance: 0.04 },
  { id: 'arthritis-flaw', good: false, work: -3, text: '−3 to repetitive movement sustained over time: a season at the bench', ref: 'DE, Arthritis', chance: 0.04 },
  { id: 'missing-hand-flaw', good: false, work: -3, text: 'work that needs both hands at −3 or worse', ref: 'DE, Missing Hand', chance: 0.02 },
  { id: 'no-hands-flaw', good: false, cannot: true, text: 'nothing that needs hands is possible', ref: 'DE, No Hands' },
  { id: 'blind-flaw', good: false, cannot: true, text: 'little or no sight: most crafts are beyond them', ref: 'DE, Blind' },
  { id: 'poor-eyesight-flaw', good: false, when: { mod: -3, work: 'fine work by eye (jewels, engraving, illumination, glass)' }, text: '−3 to all rolls involving sight', ref: 'DE, Poor Eyesight', chance: 0.04 },
  { id: 'independent-craftsman-flaw', good: false, when: { mod: -3, work: 'work with assistants, or as one' }, text: 'Craft counts 3 lower with assistants or as one, which also cuts the assistants they can lead', ref: 'DE, Independent Craftsman; City & Guild p.73', chance: 0.04 },
  { id: 'primitive-equipment-flaw', good: false, text: 'can use only the simplest tools and equipment', ref: 'DE, Primitive Equipment' },
  { id: 'failed-master-flaw', good: false, text: 'ran a workshop into the ground: works as a journeyman in town, with a bad Reputation of 4 there', ref: 'DE, Failed Master', chance: 0.02 },
  { id: 'leprosy-flaw', good: false, text: 'can gain no good Reputation, so no Craft Reputation however fine the work; Living Conditions −2', ref: 'DE, Leprosy; City & Guild ch.4', chance: 0.01 },
  { id: 'poor-flaw', good: false, text: 'works three seasons a year to get by (Labor Points ×2 each), with one free', ref: 'DE, Poor; City & Guild ch.2' },
  { id: 'weak-characteristics-flaw', good: false, text: 'fewer points for Characteristics: often a poor Dexterity, in every Workshop Total', ref: 'DE, Weak Characteristics' },
  { id: 'poor-characteristic-flaw', good: false, text: 'a Dexterity below −3, in every Workshop Total and season’s Labor Points', ref: 'DE, Poor (Characteristic)' },
  { id: 'blatant-gift-flaw', good: false, text: '−6 to dealing with people: selling, bargaining, keeping customers', ref: 'DE, Blatant Gift' },
  { id: 'the-gift', good: false, text: '−3 to dealing with people (The Gift): selling and bargaining', ref: 'DE, The Gift' },
  { id: 'social-handicap-flaw', good: false, text: '−3 to dealing with people: selling and bargaining', ref: 'DE, Social Handicap', chance: 0.03 },
  { id: 'afflicted-tongue-flaw', good: false, text: '−2 to rolls of the voice: bargaining and selling', ref: 'DE, Afflicted Tongue', chance: 0.02 },
  { id: 'disfigured-flaw', good: false, text: '−3 to Presence for looks and respect: buyers', ref: 'DE, Disfigured', chance: 0.02 },
  { id: 'infamous-flaw', good: false, text: 'a bad Reputation of 4: buyers know of them', ref: 'DE, Infamous' },
];

const BY_ID = new Map(CRAFT_TRAITS.map((t) => [t.id, t]));

const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** A covenant craftsman's traits by name, without the game data (their Puissant and Affinity are in their trade). */
export const TRAIT_NAMES: Record<string, string> = {
  'puissant-ability': 'Puissant Craft', 'affinity-with-ability': 'Affinity with Craft', 'great-characteristic': 'Great Dexterity', 'keen-vision': 'Keen Vision', 'light-touch': 'Light Touch',
  'free-expression': 'Free Expression', 'prolific-artist': 'Prolific Artist', 'craft-guild-training': 'Craft Guild Training', 'forge-companion': 'Forge Companion', 'eye-of-hephaestus': 'Eye of Hephaestus',
  'crafters-eye': 'Crafter’s Eye', 'good-teacher': 'Good Teacher', 'self-confident': 'Self-Confident', wealthy: 'Wealthy', 'mythic-farrier': 'Mythic Farrier', 'crafters-healing': 'Crafter’s Healing',
  'maker-of-textured-vessels': 'Maker of Textured Vessels', 'maker-of-water-vessels': 'Maker of Water Vessels', 'enchanting-ability': 'Enchanting Ability', 'lesser-craft-magic': 'Lesser Craft Magic',
  'craft-magic': 'Craft Magic', 'craft-amulets': 'Craft Amulets', 'mythic-saddle-maker': 'Mythic Saddle-Maker', 'palsied-hands-flaw': 'Palsied Hands', 'clumsy-flaw': 'Clumsy', 'arthritis-flaw': 'Arthritis',
  'missing-hand-flaw': 'Missing Hand', 'no-hands-flaw': 'No Hands', 'blind-flaw': 'Blind', 'poor-eyesight-flaw': 'Poor Eyesight', 'independent-craftsman-flaw': 'Independent Craftsman',
  'primitive-equipment-flaw': 'Primitive Equipment', 'failed-master-flaw': 'Failed Master', 'leprosy-flaw': 'Leprosy', 'poor-flaw': 'Poor', 'weak-characteristics-flaw': 'Weak Characteristics',
  'poor-characteristic-flaw': 'Poor Dexterity', 'blatant-gift-flaw': 'Blatant Gift', 'the-gift': 'The Gift', 'social-handicap-flaw': 'Social Handicap', 'afflicted-tongue-flaw': 'Afflicted Tongue',
  'disfigured-flaw': 'Disfigured', 'infamous-flaw': 'Infamous',
};

export interface CraftTraitNote extends CraftTrait {
  /** the Virtue or Flaw's name, with its choice */
  name: string;
}

/** Puissant or Affinity in a Craft (any Craft, or the one named), as a character's Virtue gives it. */
const isCraftChoice = (param: string | undefined, craft?: string) => {
  if (!param) return false;
  if (param === 'craft-type' || param === 'profession-type') return true;
  const m = /^(craft|profession)-type:(.*)$/.exec(param);
  return !!m && (!craft || m[2].trim().toLowerCase() === craft.trim().toLowerCase());
};

/**
 * A character's Virtues and Flaws that matter at their craft (their best Craft, or the one named),
 * each with what it does there. A Flaw a Boon holds off (flawHeld) does not count.
 */
export function characterCraftTraits(c: Character, data: GameData, craft?: string): CraftTraitNote[] {
  const out: CraftTraitNote[] = [];
  for (const v of c.virtues) {
    if (v.heldBy) continue;
    const t = BY_ID.get(v.defId);
    if (!t) continue;
    if ((t.id === 'puissant-ability' || t.id === 'affinity-with-ability') && !isCraftChoice(v.param, craft)) continue;
    if ((t.id === 'great-characteristic' || t.id === 'poor-characteristic-flaw') && v.param !== 'Dex') continue;
    // what counts only in some work, only where the craft does that work (Keen Vision is nothing to a thatcher)
    if (t.when && craft && t.id !== 'independent-craftsman-flaw' && !traitApplies(t, craft)) continue;
    const def = data.vfById.get(v.defId);
    // Puissant Blacksmith and Great Dexterity, not Puissant Ability and Great (Characteristic)
    const chosen = ['puissant-ability', 'affinity-with-ability', 'great-characteristic', 'poor-characteristic-flaw'].includes(t.id);
    const trade = v.param?.replace(/^(craft|profession)-type:?/, '').trim();
    const name = (chosen ? def?.name.replace(/\(?\b(Ability|Characteristic)\b\)?/, t.id.includes('characteristic') ? 'Dexterity' : trade || (v.param?.startsWith('profession') ? 'Profession' : 'Craft')) : TRAIT_NAMES[t.id] ?? def?.name) ?? v.defId;
    out.push({ ...t, name });
  }
  // the Gift (or the Blatant Gift, which replaces its penalty) is a Virtue of magi and the Gifted
  if (out.some((t) => t.id === 'blatant-gift-flaw')) return out.filter((t) => t.id !== 'the-gift');
  return out;
}

/** A covenant craftsman's Virtues and Flaws that matter at their work (their Puissant and Affinity are in their trade). */
export function specialistCraftTraits(s: Specialist, data: GameData, craft?: string): CraftTraitNote[] {
  const ids = [...(s.traits ?? []), ...(s.wealth === 'wealthy' ? ['wealthy'] : s.wealth === 'poor' ? ['poor-flaw'] : [])];
  return [...new Set(ids)].flatMap((id) => {
    const t = BY_ID.get(id);
    return t ? [{ ...t, name: (TRAIT_NAMES[id] ?? data.vfById.get(id)?.name ?? id).replace(/\bCraft$/, craft ?? 'Craft') }] : [];
  });
}

/** What the traits always add to the score they work at (Puissant +2, Palsied Hands −2…). */
export const workMod = (traits: CraftTrait[]) => traits.reduce((t, x) => t + (x.work ?? 0), 0);

/** The score a covenant craftsman works at: their Craft with what their Virtues and Flaws always add. */
export function workingCraft(s: Specialist): number {
  const mod = (s.traits ?? []).reduce((t, id) => t + (BY_ID.get(id)?.work ?? 0), 0);
  return Math.max(0, s.score + mod);
}

/** What a character's Virtues and Flaws always add to the Craft they work at (no Boon holding the Flaw off). */
export function characterWorkMod(c: Character, craft?: string, o: { derived?: boolean } = {}): number {
  let mod = 0;
  for (const v of c.virtues) {
    const t = v.heldBy ? undefined : BY_ID.get(v.defId);
    if (!t?.work) continue;
    // Puissant (Ability) is in a derived Ability total already; counted here for totals made from experience alone
    if (t.id === 'puissant-ability' && (o.derived || !isCraftChoice(v.param, craft))) continue;
    mod += t.work;
  }
  return mod;
}

/** Whether a character has this Virtue or Flaw and no Boon holds it off. */
export const hasTrait = (c: Character, id: string) => c.virtues.some((v) => v.defId === id && !v.heldBy);

/** The traits a covenant craftsman may be given (the Covenfolk tab's list). */
export const SPECIALIST_TRAITS = CRAFT_TRAITS.filter((t) => !['wealthy', 'poor-flaw', 'the-gift', 'blatant-gift-flaw', 'great-characteristic', 'poor-characteristic-flaw', 'weak-characteristics-flaw', 'forge-companion'].includes(t.id));

/** Crafts of art, and crafts of fine work by eye and hand: where Free Expression, Keen Vision and the like apply. */
const ART_CRAFTS = /paint|sculpt|illumin|carv|gold|silver|jewel|embroider|engrav|glass|mosaic|instrument|tapestr|potter|weav|poet|music|minstrel/i;
const FINE_CRAFTS = /gold|silver|jewel|illumin|engrav|glass|lock|clock|instrument|bookbind|scribe|tailor|embroider|seal|gem|lapid|cutler|armor|weaponsmith|sword|automat/i;
const ASSISTED = /assist/;

/** Whether a Virtue or Flaw that applies only in some work applies to this craft. */
export function traitApplies(t: CraftTrait, craft: string): boolean {
  if (!t.when) return true;
  if (/work of art/.test(t.when.work)) return ART_CRAFTS.test(craft);
  if (/fine/.test(t.when.work)) return FINE_CRAFTS.test(craft);
  return ASSISTED.test(t.when.work);
}

/** About a third of the craftsmen met have a Virtue or Flaw that matters at the work. */
const MET_SHARE = 0.6;

/**
 * The Virtues and Flaws that matter at the craft for someone met at random: most have none, some one
 * that helps, some one that hurts, a few one of each. Lucky or unlucky, they are what they are.
 */
export function rollCraftTraits(rng: Rng, craft?: string): string[] {
  const out: string[] = [];
  for (const good of [true, false]) {
    // what helps or hurts only in some work, only for a craft that does it (Free Expression for a painter, not a brewer)
    const pool = CRAFT_TRAITS.filter((t) => t.good === good && t.chance && (!t.when || !craft || traitApplies(t, craft)));
    for (const t of pool) if (rng() < t.chance! * MET_SHARE) out.push(t.id);
  }
  // one helping and one hurting at most: a person, not a list
  const g = out.filter((id) => BY_ID.get(id)!.good).slice(0, 1);
  const b = out.filter((id) => !BY_ID.get(id)!.good).slice(0, 1);
  return [...g, ...b];
}

/** One line for a build or a hire: what helps and what hurts at the craft, and the score they work at. */
export function craftTraitsLine(traits: CraftTraitNote[], score?: number): string {
  if (!traits.length) return '';
  const part = (good: boolean) =>
    traits
      .filter((t) => t.good === good)
      .map((t) => `${t.name} (${t.work ? `${sign(t.work)} to the work` : t.when ? `${sign(t.when.mod)} on ${t.when.work.replace(/ \(.*\)$/, '')}` : t.cannot ? 'cannot work most crafts' : t.text.split(/[:;(]/)[0].trim()})`)
      .join(', ');
  const helps = part(true);
  const hurts = part(false);
  const mod = workMod(traits);
  return [helps && `helped by ${helps}`, hurts && `held back by ${hurts}`].filter(Boolean).join('; ') + (score !== undefined && mod ? `: works at ${Math.max(0, score + mod)}` : '');
}
