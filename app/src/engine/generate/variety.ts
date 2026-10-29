// How Quick build varies a character. The guided build alone always takes the best fit, so every
// generated character of a role came out alike, with the same first choice of each Virtue (Strong
// Faerie Blood was always the Bee King) and the dramatic Flaws that cost least in seasons turning up
// far more often than in any book's characters. Quick build instead draws among the options that fit,
// weighted so that the rare ones stay rare, never stacks two of a kind that mark a character out
// (a Horrifying Appearance and Leprosy, two faerie bloodlines), and gives each magus favorite Arts
// of their own, leaning toward what their House is known for.

import { ARTS, FORMS, TECHNIQUES, type Art, type CharType, type VirtueFlawDef } from '../../data';
import type { Rng } from '../dice';

/** Draw one item, each in proportion to its weight (none when no weight is above 0). */
export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (x: T) => number): T | undefined {
  const ws = items.map((x) => Math.max(0, weight(x)));
  const total = ws.reduce((s, w) => s + w, 0);
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  return items.at(-1);
}

const BODY_MAJOR = ['blind-flaw', 'deaf-flaw', 'mute-flaw', 'crippled-flaw', 'leprosy-flaw', 'dwarf-flaw'];
const BODY_MINOR = ['lame-flaw', 'missing-ear-flaw', 'missing-eye-flaw', 'missing-hand-flaw', 'hunchback-flaw', 'disfigured-flaw', 'feral-scent-flaw', 'warped-senses-flaw'];
const BLOODLINES = [
  'faerie-blood', 'strong-faerie-blood', 'magical-blood', 'mythic-blood', 'mythic-blood-zmey', 'giant-blood', 'blood-of-the-nephilim', 'demonic-blood', 'monstrous-blood-flaw',
  'samovily-blood', 'strong-angelic-heritage', 'bee-king', 'faerie-heritage-flaw', 'blood-of-the-old-gods', 'faerie-blood-jentil', 'faerie-blood-laminak', 'of-kings-and-giants-antaeus-bloodline',
];

/** How often a generated character takes an option, against an ordinary one (1). */
const RARITY: Record<string, number> = {
  ...Object.fromEntries(BODY_MAJOR.map((id) => [id, 0.12])),
  ...Object.fromEntries(BODY_MINOR.map((id) => [id, 0.35])),
  'gender-nonconforming-flaw': 0.15, 'gender-shift': 0.2,
  'homunculus-wizard-flaw': 0.1, 'faerie-heritage-flaw': 0.25, 'lycanthrope-flaw': 0.15, 'unbaptized-flaw': 0.15, 'tainted-offspring-flaw': 0.2,
  'plagued-by-supernatural-entity-flaw': 0.4, 'monastic-vows-flaw': 0.3, 'monastic-vows-hermetic-flaw': 0.3, 'outlaw-flaw': 0.3,
  'strong-faerie-blood': 0.25, 'bee-king': 0.1, 'blood-of-the-nephilim': 0.15, 'demonic-blood': 0.1, 'giant-blood': 0.2, 'mythic-blood': 0.3, 'faerie-blood': 0.6, 'magical-blood': 0.5,
  'true-faith': 0.15, 'ghostly-warder': 0.3, 'shapeshifter': 0.3, 'guardian-angel': 0.3,
  'age-quickly-flaw': 0.4, 'death-prophecy': 0.3, 'raised-from-the-dead-flaw': 0.2,
  'magic-addiction-flaw': 0.3, 'twilight-prone-flaw': 0.4, 'tainted-with-evil-flaw': 0.35, 'cursed-guile-flaw': 0.5, 'nocturnal-flaw': 0.35, 'heroic-personality-flaw': 0.4,
};

/** What a magus rarely is, though anyone else may be. */
const MAGUS_RARITY: Record<string, number> = {
  'true-faith': 0.03, 'guardian-angel': 0.1, 'physician-of-salerno': 0.2, 'life-boost': 0.5, 'guest-of-house-criamon': 0.15, 'guest-of-the-house': 0.15, 'craft-guild-training': 0.4,
  // halves every Advancement Total: crippling for a magus, whose life is study
  'savantism-flaw': 0.03, 'holy-magic': 0.2,
};

/**
 * How likely a generated character is to take an option, against an ordinary one: low for the
 * dramatic and the strange, lower still for a Major Flaw of the sort that takes over a character's
 * stories, and a little lower for options from the supplements, which suit fewer sagas.
 */
export function rarity(def: VirtueFlawDef, type: CharType, size?: string): number {
  let r = (type === 'magus' ? MAGUS_RARITY[def.id] : undefined) ?? RARITY[def.id] ?? 1;
  if (def.id.startsWith('horrifying-appearance')) r = 0.03;
  if (def.kind === 'flaw' && size === 'Major' && (def.categories.includes('Personality') || def.categories.includes('Story'))) r *= 0.6;
  if (def.source.book !== 'DE') r *= def.categories.includes('Supernatural') && def.sizes.includes('Major') ? 0.4 : 0.7;
  return r;
}

/** Kinds of option a character takes at most one of, because two make a caricature. */
export function markGroup(def: VirtueFlawDef): string | undefined {
  if (def.id.startsWith('horrifying-appearance') || BODY_MAJOR.includes(def.id) || BODY_MINOR.includes(def.id)) return 'body';
  if (BLOODLINES.includes(def.id)) return 'blood';
  return undefined;
}

/** The Arts each House is known for (Houses of Hermes; DE, The Order of Hermes). */
export const HOUSE_ARTS: Record<string, Art[]> = {
  bjornaer: ['Mu', 'An', 'Co', 'He'],
  bonisagus: ['Vi', 'In', 'Cr', 'Re'],
  criamon: ['Vi', 'Me', 'In', 'Mu'],
  'ex-miscellanea': [...ARTS],
  flambeau: ['Pe', 'Ig', 'Cr', 'Te', 'Co'],
  guernicus: ['In', 'Me', 'Te', 'Re'],
  jerbiton: ['Im', 'Mu', 'Me', 'Cr', 'He'],
  mercere: ['Re', 'Cr', 'Mu', 'Au', 'Vi'],
  merinita: ['Mu', 'He', 'An', 'Im', 'Me'],
  tremere: ['Vi', 'Re', 'Pe', 'Me'],
  tytalus: ['Re', 'Me', 'Mu', 'Im'],
  verditius: ['Re', 'Vi', 'Cr', 'Te', 'Ig'],
};

/**
 * A magus's favorite Arts, at random: a Technique and one or two Forms, mostly from what their
 * House is known for (keeping to the role), sometimes from anywhere (varied), or from anywhere
 * at all (anything goes). The answers rate them high, so the build raises them first.
 */
export function favoriteArts(rng: Rng, house: string | undefined, variety: 'focused' | 'varied' | 'wild'): Art[] {
  const known = (house && HOUSE_ARTS[house]) || [...ARTS];
  const fromHouse = variety === 'focused' ? 0.9 : variety === 'varied' ? 0.65 : 0.3;
  const draw = (pool: readonly Art[], taken: Art[]) => {
    const own = known.filter((a) => pool.includes(a) && !taken.includes(a));
    const any = pool.filter((a) => !taken.includes(a));
    const from = own.length && rng() < fromHouse ? own : any;
    return from[Math.floor(rng() * from.length)];
  };
  const out: Art[] = [draw(TECHNIQUES, [])];
  out.push(draw(FORMS, out));
  if (rng() < 0.6) out.push(draw(FORMS, out));
  if (variety !== 'focused' && rng() < 0.3) out.push(draw(TECHNIQUES, out));
  return out.filter(Boolean);
}
