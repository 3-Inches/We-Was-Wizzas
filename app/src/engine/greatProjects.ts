// Hermetic Projects: a great building's progress and its stress check (Chapter Three, the Great
// Tower), and a menagerie's breeding, birthing and young (Chapter Seven).

import { defaultRng, describeStress, stressDie, type Rng, type StressResult } from './dice';

// ------------------------------------------------------------------------------------------------
// Building

/**
 * A master mason's progress: one level (20 feet) a season at Craft: Mason 5, two at 10, three at 15.
 * Craft magic adds to the score for this, each kind of device once, never more than the score itself.
 */
export function masonProgress(craftMason: number, craftMagic = 0): { effective: number; levelsPerSeason: number; feetPerSeason: number; feetPerYear: number } {
  const effective = Math.max(0, craftMason) + Math.min(Math.max(0, craftMagic), Math.max(0, craftMason));
  const levels = Math.floor(effective / 5);
  return { effective, levelsPerSeason: levels, feetPerSeason: 20 * levels, feetPerYear: 80 * levels };
}

/** Seasons to raise a building to a height at that pace (Infinity if it does not move). */
export const seasonsToHeight = (feet: number, feetPerSeason: number) => (feetPerSeason > 0 ? Math.ceil(Math.max(0, feet) / feetPerSeason) : Infinity);

/** What calls for a building's stress check. */
export const STRUCTURE_EVENTS = ['Severe storms and hurricane winds', 'Fire, inside or outside', 'Earthquake or subsidence', 'Magical or mundane assault'];

/** A structure's stress check: stress die + Craft: Mason + the quality's modifier (−1 if repaired before), against 15. */
export function structureCheckModifiers(craftMason: number, qualityMod: number, repaired: boolean, other = 0): number {
  return craftMason + qualityMod - (repaired ? 1 : 0) + other;
}

// ------------------------------------------------------------------------------------------------
// The menagerie: breeding

export interface BreedingInput {
  adequateDiet?: boolean;
  inadequateDiet?: boolean;
  /** a Ferocity (or similar aggressive) Personality Trait, taken off */
  ferocity?: number;
  agreeableEnvironment?: boolean;
  unsatisfactoryEnvironment?: boolean;
  /** magnitudes of a fitting Hermetic spell: +1 for each two */
  spellMagnitudes?: number;
  carnivore?: boolean;
  herbivore?: boolean;
  /** the lead handler's Animal Handling: +1 a fifth, rounded up */
  animalHandling?: number;
  /** the lead handler's Magic Lore: +1 a fifth, rounded up */
  magicLore?: number;
  /** a magical creature's Might: − its magnitudes */
  might?: number;
  onlyOfItsKind?: boolean;
  similarNearby?: boolean;
  tamed?: boolean;
}

/** The Breeding Roll's modifiers, each with its label. */
export function breedingModifiers(b: BreedingInput): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  const add = (cond: unknown, label: string, value: number) => cond && value && out.push({ label, value });
  add(b.adequateDiet, 'Adequate diet', 1);
  add(b.inadequateDiet, 'Inadequate diet', -2);
  add(b.ferocity, 'Aggressive (− the Personality Trait)', -Math.max(0, b.ferocity ?? 0));
  add(b.agreeableEnvironment, 'Agreeable environment', 1);
  add(b.unsatisfactoryEnvironment, 'Unsatisfactory environment', -2);
  add(b.spellMagnitudes, 'A fitting Hermetic spell (+1 per 2 magnitudes)', Math.floor(Math.max(0, b.spellMagnitudes ?? 0) / 2));
  add(b.carnivore, 'Carnivore', -1);
  add(b.herbivore, 'Herbivore', 1);
  add(b.animalHandling, 'Competent handler (Animal Handling ÷ 5, rounded up)', Math.ceil(Math.max(0, b.animalHandling ?? 0) / 5));
  add(b.magicLore, 'Enlightened handler (Magic Lore ÷ 5, rounded up)', Math.ceil(Math.max(0, b.magicLore ?? 0) / 5));
  add(b.might, 'Magical creature (− Might in magnitudes)', -Math.ceil(Math.max(0, b.might ?? 0) / 5));
  add(b.onlyOfItsKind, 'The only beast of its kind besides its mate', -3);
  add(b.similarNearby, 'Similar animals nearby', 1);
  add(b.tamed, 'Tamed', 3);
  return out;
}

const BREEDING_BOTCH = ['', 'one or the other escapes', 'one of them is sterile', 'one is harmed during mating', 'something worse, as the storyguide decides'];

/** A season together: stress die + modifiers against 9 for offspring; a botch, by the number of botches, goes worse. */
export function breedingRoll(modifiers: number, rng: Rng = defaultRng): { success: boolean; total: number; botches: number; text: string } {
  const r = stressDie(1, rng);
  if (r.botches) return { success: false, total: 0, botches: r.botches, text: `${describeStress(r)}: no offspring, and ${BREEDING_BOTCH[Math.min(4, r.botches)]}.` };
  const total = r.value + modifiers;
  return { success: total >= 9, total, botches: 0, text: `${describeStress(r)} ${modifiers < 0 ? '−' : '+'} ${Math.abs(modifiers)} = ${total} against 9: ${total >= 9 ? 'offspring, if they survive the birth' : 'no offspring this season'}.` };
}

/** Breeding for the best: a stress die says how the young differ from the parents (no Supernatural Virtue or Flaw for a mundane beast). */
export function breedingForBest(r: StressResult): string {
  if (r.botches) return 'A Major Supernatural Flaw or Magical Inferiority.';
  if (r.zero) return 'A Minor Supernatural Flaw or Magical Inferiority.';
  const v = r.value;
  if (v <= 3) return 'Weak: Stamina −1 (or another physical Characteristic the beast is known for).';
  if (v <= 12) return 'The young resembles its parents.';
  if (v <= 15) return 'Exceptionally hardy: Stamina +1 (or another physical Characteristic the beast is known for).';
  if (v <= 17) return 'A Minor Supernatural Virtue or Magical Quality.';
  return 'A Major Supernatural Virtue or Magical Quality.';
}

/**
 * Birthing: the mother is treated as having a Medium Wound and makes Recovery rolls (a handler adds
 * Animal Handling); every two hours at Size 0 or less, the interval doubling for each Size above 0.
 */
export const birthingIntervalHours = (size: number) => 2 * 2 ** Math.max(0, size);

/** Hatching: Stamina + Survival + stress die against 9 (a handler adds Animal Handling). */
export const HATCHING_EASE = 9;

/** A magical beast's Might while young: the adult's ÷ the years it takes to mature (five for most). */
export const juvenileMight = (adultMight: number, yearsToMature = 5) => Math.floor(Math.max(0, adultMight) / Math.max(1, yearsToMature));

// ------------------------------------------------------------------------------------------------
// Ships

/** The book's ships: Size, cargo, crew, cost in pounds; damage levels follow City & Guild by quality and Size. */
export const SHIP_SIZES: { id: string; label: string; size: number; capacity: string; crew: number; cost: string }[] = [
  { id: 'ship-ferry', label: 'Small river ferry', size: 3, capacity: '1 ton', crew: 2, cost: '1/5 pound' },
  { id: 'ship-lighter', label: 'Lighter', size: 3, capacity: '8 tons', crew: 2, cost: '2 pounds' },
  { id: 'ship-barge', label: 'River barge', size: 4, capacity: '20 tons', crew: 3, cost: '4 pounds' },
  { id: 'ship-buss', label: 'Coastal buss, knarr or small cog', size: 5, capacity: '20 tons', crew: 8, cost: '8 pounds' },
  { id: 'ship-cog', label: 'Medium cog or large nef', size: 6, capacity: '100 tons', crew: 12, cost: '40 pounds' },
  { id: 'ship-large-cog', label: 'Large merchant cog', size: 7, capacity: '240 tons', crew: 18, cost: '100 pounds' },
  { id: 'ship-grain-barge', label: 'Mediterranean grain barge', size: 8, capacity: '800 tons', crew: 150, cost: '320 pounds' },
  { id: 'ship-large-grain-barge', label: 'Large Mediterranean grain barge', size: 9, capacity: '1,200 tons', crew: 200, cost: '600 pounds' },
];

