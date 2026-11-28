// The Mysteries (Revised Edition): the totals and rolls of its Mystery Virtues that the lab and the
// Game Table use. Hermetic Astrology's horoscopes (Planetary Magic, Celestial Magic, Periapt),
// Hermetic and Philosophic Alchemy, the Lesser and Great Elixirs, Hermetic Divination and Dream
// Interpretation, Theurgy's invoked spirits, Hermetic Empowerment, Numerology's rotes and Synthemata.

import type { Form } from '../data';
import type { DerivedCharacter } from './character/derive';
import { describeStress, simpleDie, stressDie, defaultRng, type Rng } from './dice';
import type { Character, LabProject, LongevityRitual } from './types';
import { artScoreFromXp } from './xp';

export const holds = (c: Pick<Character, 'virtues'>, id: string) => c.virtues.some((v) => v.defId === id);

const best = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).sort((a, b) => b.total - a.total)[0];

/** A score, with +1 when its specialty names the subject: Artes Liberales (astronomy), (Realm) Lore and the like. */
export function scoreFor(d: DerivedCharacter, id: string, specialty?: RegExp): number {
  const all = d.abilities.filter((a) => a.abilityId === id);
  if (!all.length) return 0;
  return Math.max(...all.map((a) => a.total + (specialty && a.specialty && specialty.test(a.specialty) ? 1 : 0)));
}

/** Artes Liberales, with its specialty when it is the branch named: astronomy, arithmetic, geometry. */
export const liberalArt = (d: DerivedCharacter, branch: 'astronomy' | 'arithmetic' | 'geometry') => scoreFor(d, 'artes-liberales', new RegExp(branch === 'astronomy' ? 'astronom|astrolog' : branch, 'i'));

// ------------------------------------------------------------------------------------------------
// Hermetic Astrology

/**
 * Which Laboratory Horoscope a magus may make for this work: Planetary Magic only for creating an
 * enchanted device; Celestial Magic, which replaces it, for any laboratory activity (TMRE, Planetary
 * Magic; Improved Laboratory Horoscopes).
 */
export function horoscopeFor(c: Character, kind: LabProject['kind']): 'planetary' | 'celestial' | undefined {
  const lab = ['invent', 'open', 'instill', 'extract', 'tame', 'longevity', 'bind', 'strengthen', 'empower', 'castingTool', 'elixir'];
  if (holds(c, 'celestial-magic') && lab.includes(kind)) return 'celestial';
  if ((holds(c, 'planetary-magic') || holds(c, 'celestial-magic')) && (kind === 'instill' || kind === 'castingTool')) return 'planetary';
  return undefined;
}

export interface HoroscopeResult {
  ease: number;
  total: number;
  /** the bonus gained: the one chosen on a success, 0 otherwise */
  bonus: number;
  /** a botch: the whole season is wasted, and its vis */
  botched: boolean;
  line: string;
}

/**
 * A Laboratory Horoscope: stress die + Intelligence + Artes Liberales (astronomy) against three
 * times the bonus chosen (1 to 5). Failure only loses the bonus; on a zero, as many botch dice as
 * the bonus, and any botch wastes the season and its vis (TMRE, Planetary Magic).
 */
export function rollHoroscope(d: DerivedCharacter, desired: number, rng: Rng = defaultRng, o: { ease?: number; botchDice?: number; what?: string } = {}): HoroscopeResult {
  const want = Math.max(1, Math.min(5, Math.round(desired)));
  const ease = o.ease ?? 3 * want;
  const base = d.characteristics.Int.value + liberalArt(d, 'astronomy');
  const r = stressDie(o.botchDice ?? want, rng);
  const total = base + r.value;
  const botched = r.botches > 0;
  const ok = !botched && total >= ease;
  const what = o.what ?? `Laboratory Horoscope for +${want}`;
  const line = `${what}: stress die ${describeStress(r)} + Intelligence + Astronomy ${base} = ${total} against ${ease}: ${botched ? 'BOTCH, the season is wasted' : ok ? 'the heavens favor the work' : 'faulty, no bonus this season'}.`;
  return { ease, total, bonus: ok && o.ease === undefined ? want : 0, botched, line };
}

/** Periapt: charges from the whole Lab Total, a fifth rounded up, for an effect no higher than 5 × Astronomy (TMRE, Periapt). */
export const periaptCharges = (labTotal: number) => Math.max(0, Math.ceil(labTotal / 5));
export const periaptMaxLevel = (d: DerivedCharacter) => 5 * liberalArt(d, 'astronomy');

/** The Periapt Horoscope, made at the season's start: stress die + Intelligence + Astronomy against 9; a botch wastes the season. */
export const rollPeriaptHoroscope = (d: DerivedCharacter, rng: Rng = defaultRng) => rollHoroscope(d, 1, rng, { ease: 9, botchDice: 1, what: 'Periapt Horoscope' });

/**
 * An Astrological Duration (Celestial Magic): die + Intelligence + Astronomy against 6 + the number
 * of units (minutes, hours, days or signs; a year at most). Knowing the hour by Sense the Hour takes 3
 * off. A failure is out by up to the shortfall in units; a botch makes the spell botch.
 */
export const ASTRO_UNITS = [
  { id: 'minutes', label: 'Astrological Minutes (Diameters)', max: 1000 },
  { id: 'hours', label: 'Astrological Hours', max: 1000 },
  { id: 'days', label: 'Astrological Days', max: 365 },
  { id: 'signs', label: 'Astrological Signs (months)', max: 12 },
] as const;
export const astroDurationEase = (units: number, knowsHour = false) => 6 + Math.max(1, units) - (knowsHour ? 3 : 0);

// ------------------------------------------------------------------------------------------------
// Hermetic and Philosophic Alchemy

/** Seasons an automatic extraction digests: a year for Minor Philosophic Alchemy, one season for Major (TMRE). */
export function digestSeasons(c: Character): number {
  const v = c.virtues.find((x) => x.defId === 'philosophic-alchemy');
  if (!v) return 0;
  return v.size === 'Major' ? 1 : 4;
}

/** Pawns from an alchemical extraction: a tenth of the Lab Total for Vim, a twentieth for a Form, rounded up (TMRE, Hermetic Alchemy). */
export const alchemyYield = (labTotal: number, form?: Form) => Math.ceil(Math.max(0, labTotal) / (form ? 20 : 10));

// ------------------------------------------------------------------------------------------------
// The Lesser and Great Elixirs

/** An ingredient's Elixir Points: its Shape and Material bonus, doubled for one the alchemist found by Vulgar Alchemy, never above Magic Theory. */
export const ingredientPoints = (bonus: number, ownDiscovery: boolean, magicTheory: number) => Math.max(0, Math.min(ownDiscovery ? 2 * bonus : bonus, magicTheory));

/** The Elixir Level: Elixir Points on the Art table (1, 3, 6, 10…), no higher than Magic Theory when the formula is devised. */
export const elixirLevel = (points: number, magicTheory: number) => Math.max(0, Math.min(artScoreFromXp(points), magicTheory));

/** What a Longevity Ritual takes off aging rolls, with a Lesser Elixir's level when it has one (TMRE: Aging Bonus = ritual modifier + Elixir Level). */
export const longevityModifier = (lr?: LongevityRitual) => (lr ? lr.bonus + (lr.elixir?.level ?? 0) : 0);

/** The Great Elixir's test: simple die + Stamina + Elixir Level + a +1 for each earlier attempt (to Magic Theory), against the magus's age / 10, rounded up. */
export function greatElixirTest(c: Character, d: DerivedCharacter, rng: Rng = defaultRng): { ease: number; total: number; ok: boolean; line: string } {
  const g = c.greatElixir ?? {};
  const ease = Math.ceil((g.transformedAge ?? c.age) / 10);
  const mt = best(d, d.theoryAbility)?.total ?? 0;
  const reroll = Math.min(g.attempts ?? 0, mt);
  const level = c.longevity?.elixir?.level ?? c.longevityLapsed?.elixir?.level ?? 0;
  const die = simpleDie(rng);
  const total = die.value + d.characteristics.Sta.value + level + reroll;
  const ok = total >= ease;
  return {
    ease, total, ok,
    line: `Simple die ${die.value} + Stamina ${d.characteristics.Sta.value} + Elixir Level ${level}${reroll ? ` + ${reroll} for earlier attempts` : ''} = ${total} against ${ease}: ${ok ? 'the Elixir works' : 'these effects do not work for this magus'}.`,
  };
}

/** Grant Might gives Magic Might of half (its level − 20). */
export const grantMight = (level: number) => Math.max(0, Math.floor((level - 20) / 2));

// ------------------------------------------------------------------------------------------------
// Hermetic Divination and Dream Interpretation

/** The augury phenomena and the questions each favors (TMRE, Ceremonial Augury Phenomena): the ceremonial bonus. */
export const AUGURY_METHODS: { name: string; seen: string; uses: string }[] = [
  { name: 'Aeromancy', seen: 'patterns in the air', uses: 'health of nobles +3, weather +5' },
  { name: 'Alectryomancy', seen: 'chickens eating', uses: 'Corpus +2, Mentem +3' },
  { name: 'Aleuromancy', seen: 'burning or cooking flour', uses: 'Herbam +2, crops +5' },
  { name: 'Alomancy', seen: 'thrown salt', uses: 'Aquam +1, Terram +2, weather +3' },
  { name: 'Alphitomancy', seen: 'eating barley bread', uses: 'guilt or innocence +5' },
  { name: 'Apantomancy', seen: 'chance meetings with animals', uses: 'locations and buildings +3' },
  { name: 'Ashagalomancy', seen: 'casting bones', uses: 'ghosts +3, Corpus +4' },
  { name: 'Astrology', seen: 'the heavens (needs Planetary Magic)', uses: '+5 + the horoscope’s bonus' },
  { name: 'Axinomancy', seen: 'balancing a hatchet', uses: 'treasure +3, thieves +5' },
  { name: 'Belomancy', seen: 'arrows shot in the air', uses: 'Auram +1, battle +3' },
  { name: 'Botanomancy', seen: 'burning carved sticks', uses: 'Herbam +5' },
  { name: 'Capnomancy', seen: 'poppy fumes', uses: 'Imaginem +2, dreams +2, mental illness +3' },
  { name: 'Causimomancy', seen: 'objects in a fire', uses: 'curses and bindings +3, Ignem +2' },
  { name: 'Cephalomancy', seen: 'a goat’s or donkey’s head', uses: 'Animal +5, travel +5' },
  { name: 'Ceroscopy', seen: 'wax dripped in water', uses: 'marriage +1, happiness +3' },
  { name: 'Cleidomancy', seen: 'a key hung from the Bible', uses: 'sin +3, lying +5' },
  { name: 'Cleromancy', seen: 'dice or lots', uses: 'courts +2, business +3, money +5' },
  { name: 'Crystalomancy', seen: 'crystal-gazing', uses: 'friends +1, enemies +2, Vim +3' },
  { name: 'Dream Interpretation', seen: 'dreams (Hermetic Dream Interpreter)', uses: '+5' },
  { name: 'Geomancy', seen: 'patterns in earth', uses: 'kingdoms +2, Terram +5' },
  { name: 'Haruspicy', seen: 'entrails', uses: 'Animal +4, disease +5' },
  { name: 'Hippomancy', seen: 'horses', uses: 'nobles +3, war +4' },
  { name: 'Hydromancy', seen: 'water', uses: 'judgments +3, Aquam +5' },
  { name: 'Lecanomancy', seen: 'bowls of fluid', uses: 'ghosts +5, spirits +3' },
  { name: 'Myomancy', seen: 'mice and rats', uses: 'battle +2, disaster +5' },
  { name: 'Numerology', seen: 'numbers (needs Hermetic Numerology)', uses: 'the numerologist’s book: +4 or +8' },
  { name: 'Onomancy', seen: 'comparing names', uses: 'Mentem +2, Corpus +3, settling conflicts +5' },
  { name: 'Ooscopy', seen: 'eggs', uses: 'youth +4, children +5' },
  { name: 'Ophiomancy', seen: 'serpents', uses: 'spirits +3, sciences +4' },
  { name: 'Phyllorhodomancy', seen: 'rose leaves', uses: 'love +3, desire +5' },
  { name: 'Pyromancy', seen: 'flames', uses: 'Ignem +5' },
  { name: 'Rhabdomancy', seen: 'divining rods', uses: 'hidden objects +4, things underground +5' },
  { name: 'Scapulomancy', seen: 'roasted shoulder blades', uses: 'farming +2, herds +5' },
  { name: 'Scrying', seen: 'reflective surfaces', uses: 'clairvoyance +5' },
];

/** The second method of Hermetic divination is a Minor Virtue: "If she has the Virtue Divination, she may Initiate into Dream Interpretation as an additional method as a Minor Virtue, and vice versa" (TMRE line 2493). True when the character holds the other of the pair at Major (`uid`, the Virtue's own, is not counted): both cannot be the second. */
export const DIVINATION_PAIR = ['divination-and-augury', 'hermetic-dream-interpreter'];
export const secondDivination = (c: Character, defId: string, uid?: string) =>
  DIVINATION_PAIR.includes(defId) && c.virtues.some((v) => v.uid !== uid && v.defId !== defId && DIVINATION_PAIR.includes(v.defId) && v.size !== 'Minor');

/** The sizes a Virtue may be taken at by this character: its own, and Minor for the second divination method. */
export const vfSizesFor = <S extends string>(c: Character, def: { id: string; sizes: S[] }, uid?: string): S[] =>
  secondDivination(c, def.id, uid) && !def.sizes.includes('Minor' as S) ? [...def.sizes, 'Minor' as S] : def.sizes;

export const divines = (c: Character) => holds(c, 'divination-and-augury') || holds(c, 'hermetic-dream-interpreter');

/** The Divination score (the Supernatural Ability), with a Dream Interpretation score counted for a Dream Interpreter who has no other. */
export function divinationScore(d: DerivedCharacter, dreams = false): number {
  const div = scoreFor(d, 'divination', dreams ? /dream/i : undefined);
  return dreams ? Math.max(div, scoreFor(d, 'dream-interpretation')) : div;
}

/** A divination's Penetration: the total + the Penetration bonus − the Ease Factor. */
export const divinationPenetration = (total: number, ease: number, penBonus = 0) => total + penBonus - ease;

/** Symbolic interpretation of a dream, against the core book's Ease Factors: what the result tells. */
export function dreamReading(total: number): string {
  if (total >= 18) return 'Impressive or better: it hints at the dream’s underlying causes and consequences.';
  if (total >= 12) return `${total >= 15 ? 'Very Hard' : 'Hard'}: some of the reasons for the dream.`;
  if (total >= 9) return 'Average: an outline of the dreamer’s state.';
  return 'Too vague to read anything clearly.';
}

// ------------------------------------------------------------------------------------------------
// Spirit magic and Theurgy

/** Hermetic Empowerment: a spirit bound in a device powers a Ritual effect if twice its Might reaches the level; it loses a fifth of the level, rounded up. */
export function empowerment(might: number, ritualLevel: number): { ok: boolean; drained: number } {
  return { ok: might * 2 >= ritualLevel, drained: Math.ceil(ritualLevel / 5) };
}

/**
 * Invoke the Spirit of (spell): the daimon casts its spell-like power with Might + aura, no die; it
 * succeeds at (spell level − 10) or more. Penetration = that total − the spell level + twice the
 * levels added to the Invoke spell. Invoke the Spirit of (Form): half of Might + aura, rounded up.
 */
export function invokedSpirit(might: number, aura: number, spellLevel: number, o: { addedLevels?: number; ofForm?: boolean } = {}): { total: number; casts: boolean; penetration: number } {
  const score = might + aura;
  const total = o.ofForm ? Math.ceil(score / 2) : score;
  return { total, casts: total >= spellLevel - 10, penetration: total - spellLevel + (o.ofForm ? 0 : 2 * (o.addedLevels ?? 0)) };
}

/** Invoke the Pact of (Daimon): summoning points each casting are the spell level less the daimon's Might, until they reach its Might. */
export const pactPoints = (spellLevel: number, might: number) => Math.max(0, spellLevel - might);

/** Synthemata: Name Hiding is usually half the spirit's Might. */
export const nameHiding = (might: number) => Math.floor(might / 2);

// ------------------------------------------------------------------------------------------------
// Hermetic Numerology

/** The numerologist's book: a lesser one (8 pawns to open) gives +4, a greater (16 pawns) +8. */
export const NUMEROLOGY_BOOKS = [
  { id: 'none', label: 'No book', bonus: 0 },
  { id: 'lesser', label: 'Lesser book (+4)', bonus: 4 },
  { id: 'greater', label: 'Greater book (+8)', bonus: 8 },
] as const;

/**
 * A rote: casting score = Stamina + Technique + Form + Arithmetic + book + aura, its total half that
 * rounded up. Rote Lab Total = Technique + Form + Intelligence + Magic Theory + Arithmetic (held to Magic
 * Theory) + book + aura; no rote above the Rote Lab Total / 5, rounded up (TMRE, Rotes).
 */
export function roteTotals(d: DerivedCharacter, technique: number, form: number, book: number, aura: number) {
  const arith = liberalArt(d, 'arithmetic');
  const theory = best(d, d.theoryAbility)?.total ?? 0;
  const casting = d.characteristics.Sta.value + technique + form + arith + book + aura;
  const labArith = Math.min(arith, theory);
  const lab = technique + form + d.characteristics.Int.value + theory + labArith + book + aura;
  return { arith, labArith, casting, total: Math.ceil(casting / 2), labTotal: lab, maxLevel: Math.ceil(lab / 5) };
}

/** The Mysteries whose rolls the Game Table's Mysteries page makes. */
const ROLLED = ['celestial-magic', 'divination-and-augury', 'hermetic-dream-interpreter', 'the-great-elixir', 'hermetic-theurgy', 'hermetic-empowerment', 'hermetic-numerology', 'hermetic-synthemata'];

/** Someone with a Mystery of The Mysteries that is rolled at the table. */
export const hasTableMystery = (c: Pick<Character, 'virtues'>) => ROLLED.some((id) => holds(c, id));
