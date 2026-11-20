// The hedge traditions and faerie wizards the guided build and Quick build make: what each requires,
// who is a member, who asks to be one, and which Virtues and Flaws are drawn for them (guided/traditions.ts
// makes them; score.ts gates the rest out of the shortlist). Hedge Magic, Revised Edition (HMRE): Folk
// Witches (line 1570), Gruagachan (line 2786), Learned Magicians (line 4117), Vitkir (line 6144).
// Realms of Power: Faerie, Pagan Traditions (line 7501).

import type { CharType, GameData } from '../../data';
import { folkWitchVirtueDefs } from '../../data/hedgeFolkWitch';
import { ELEMENTAL_ART_IDS } from '../../data/hedgeElemental';
import type { Character, GuidedState } from '../types';

export type Tradition = 'witch' | 'gruagach' | 'learned' | 'vitki' | 'faerie';

interface TraditionDef {
  id: Tradition;
  /** a member, as the log says it: "a folk witch" */
  member: string;
  /** the tradition's own Social Status (a faerie wizard has none) */
  status?: string;
  gift: 'never' | 'either' | 'always';
  /** the (Organization) Lore of its people, as the chapter names it */
  lore?: string;
  /**
   * Virtues and Flaws of this tradition alone. Outside it they cast nothing ("useless unless the
   * character also possesses a Technique", HMRE line 2853), so the build draws them only for a member.
   */
  own: string[];
  /** the Hermetic Virtues and Flaws the chapter allows a Gifted member; others are not drawn for one */
  hermetic?: string[];
  /** the Virtues whose powers or Arts a Gifted member's Opening gives free, so they are not drawn for one */
  opens?: string[];
}

const FOLK_OWN = folkWitchVirtueDefs(new Set()).map((d) => d.id);
const DEFENSES = ['greater-magical-defenses', 'no-magical-defenses-flaw', 'known-hedge-wizard-flaw'];

export const TRADITIONS: TraditionDef[] = [
  {
    id: 'witch', member: 'a folk witch', status: 'folk-witch', gift: 'either', lore: 'Folk Witches', own: [...FOLK_OWN, ...DEFENSES],
    // "seven favored Supernatural Abilities ... you may freely spend experience points on these" (HMRE line 1580)
    opens: ['witch-healing', 'witch-cursing', 'witch-flight', 'animal-ken', 'second-sight', 'dowsing', 'shapeshifter'],
    // HMRE line 1709: the Hermetic Virtues and Flaws suitable for a Gifted folk witch
    hermetic: [
      'gentle-gift', 'adept-laboratory-student', 'cautious-sorcerer', 'cyclic-magic', 'fast-caster', 'free-study', 'harnessed-magic', 'inventive-genius', 'magical-memory', 'personal-vis-source', 'quiet-magic', 'side-effect', 'special-circumstances', 'subtle-magic',
      'blatant-gift-flaw', 'difficult-longevity-ritual-flaw', 'necessary-condition-flaw', 'painful-magic-flaw', 'restriction-flaw', 'rigid-magic-flaw', 'waster-of-vis-flaw',
      'careless-sorcerer-flaw', 'creative-block-flaw', 'cyclic-magic-flaw', 'deleterious-circumstances-flaw', 'disorienting-magic-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'unimaginative-learner-flaw', 'warped-magic-flaw', 'weak-magic-flaw', 'weird-magic-flaw',
      'flawed-folk-witch-gift-opening',
    ],
  },
  {
    id: 'gruagach', member: 'a gruagach', status: 'gruagach', gift: 'either', lore: 'Gruagachan',
    opens: ['give', 'take', 'blessing', 'curse', 'shape', 'vision'],
    own: ['gruagach', 'gruagach-master', 'cailleach-magic', 'external-soul', 'give', 'take', 'blessing', 'curse', 'shape', 'vision', 'flexible-gruagach-magic', 'tattoo-mastery', 'well-trained-gruagach', 'no-tattoo-magic-flaw', 'transformation-prone-flaw', 'inflexible-magic-flaw', 'poorly-trained-gruagach-flaw', 'weak-tattoo-magic-flaw', 'incompatible-hedge-arts-flaw', ...DEFENSES],
    // HMRE line 2945: "Gruagach may only take Hermetic Virtues or Flaws on the above list"
    hermetic: [
      'flawless-magic', 'gentle-gift', 'major-magical-focus', 'secondary-insight',
      'adept-laboratory-student', 'affinity-with-art', 'cautious-sorcerer', 'deft-form', 'fast-caster', 'free-study', 'harnessed-magic', 'inventive-genius', 'life-boost', 'minor-magical-focus', 'magical-memory', 'personal-vis-source', 'puissant-art', 'side-effect', 'skilled-parens', 'special-circumstances', 'subtle-magic',
      'blatant-gift-flaw', 'deficient-technique-flaw', 'necessary-condition-flaw', 'painful-magic-flaw', 'restriction-flaw', 'short-ranged-magic-flaw', 'waster-of-vis-flaw',
      'careless-sorcerer-flaw', 'creative-block-flaw', 'deficient-form-flaw', 'deleterious-circumstances-flaw', 'disorienting-magic-flaw', 'incompatible-arts-flaw', 'infamous-master-flaw', 'offensive-to-animals-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'unimaginative-learner-flaw', 'unpredictable-magic-flaw', 'warped-magic-flaw', 'weak-magic-flaw', 'weird-magic-flaw',
    ],
  },
  {
    id: 'learned', member: 'a learned magician', status: 'mathematicus-of-bologna', gift: 'either', lore: 'Mathematici of Bologna',
    // "opens the apprentice's Gift to the powers of the learned magician's tradition — Tueor, Succurro, Vulnero, Fortunam, Magicam, and Salutem — and the Entreat the Powers Virtue" (HMRE line 4123)
    opens: ['tueor', 'succurro', 'vulnero', 'fortunam', 'magicam', 'salutem', 'entreat-the-powers'],
    own: [
      'mathematicus-of-bologna', 'entreat-the-powers', 'entreat-the-realm-powers', 'strong-amulet-magic', 'strong-verbal-charms', 'tueor', 'succurro', 'vulnero', 'fortunam', 'magicam', 'salutem', 'skilled-master',
      'charm-magician-flaw', 'intervention-prone-flaw', 'laboratory-magician-flaw', 'weak-verbal-charms-flaw', 'no-chartae-making-flaw', 'no-text-casting-flaw', 'poorly-trained-magician-flaw', 'weak-amulets-flaw', 'weak-chartae-flaw', 'incompatible-hedge-arts-flaw', ...DEFENSES,
    ],
    // HMRE line 4384
    hermetic: [
      'gentle-gift', 'major-magical-focus', 'secondary-insight',
      'adept-laboratory-student', 'affinity-with-art', 'cautious-sorcerer', 'deft-form', 'enduring-magic', 'fast-caster', 'harnessed-magic', 'inventive-genius', 'minor-magical-focus', 'magical-memory', 'personal-vis-source', 'puissant-art', 'quiet-magic', 'side-effect', 'special-circumstances', 'subtle-magic',
      'blatant-gift-flaw', 'deficient-technique-flaw', 'necessary-condition-flaw', 'painful-magic-flaw', 'restriction-flaw', 'rigid-magic-flaw', 'short-ranged-magic-flaw',
      'careless-sorcerer-flaw', 'creative-block-flaw', 'deficient-form-flaw', 'deleterious-circumstances-flaw', 'disorienting-magic-flaw', 'short-lived-magic-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'warped-magic-flaw', 'weak-magic-flaw', 'weak-scholar-flaw', 'weird-magic-flaw',
    ],
  },
  {
    id: 'vitki', member: 'a vitki', status: 'vitki', gift: 'always',
    own: ['vitki', 'deft-rune', 'mastered-rune', 'minor-rune-focus', 'major-rune-focus', 'nameless-runes', 'secret-runes', 'minor-magical-deficiency-flaw', 'major-magical-deficiency-flaw', 'natt-thel-prone-flaw', 'short-lived-runes-flaw', 'known-hedge-wizard-flaw'],
    // HMRE line 6176: the Hermetic Virtues and Flaws a vitki may take, as Supernatural ones for rune magic
    hermetic: [
      'gentle-gift', 'secondary-insight', 'cyclic-magic', 'fast-caster', 'free-study', 'inoffensive-to-animals', 'inventive-genius', 'life-boost', 'personal-vis-source', 'side-effect', 'special-circumstances',
      'blatant-gift-flaw', 'magic-addiction-flaw', 'painful-magic-flaw', 'restriction-flaw',
      'careless-sorcerer-flaw', 'cyclic-magic-flaw', 'deleterious-circumstances-flaw', 'disorienting-magic-flaw', 'offensive-to-animals-flaw', 'slow-caster-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'warped-magic-flaw', 'weird-magic-flaw',
    ],
  },
  {
    id: 'faerie', member: 'a faerie wizard', gift: 'never',
    own: ['evocation', 'enchantment', 'empathy', 'beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe', 'summoning', 'bonding', 'captivating', 'dismissing'],
  },
];
export const TRADITION_BY_ID = new Map(TRADITIONS.map((t) => [t.id, t]));
/** The Social Statuses of the traditions, taken only by a member. */
export const TRADITION_STATUSES = new Set(TRADITIONS.flatMap((t) => (t.status ? [t.status] : [])).concat('gruagach-master'));

/**
 * Traditions the build does not make (the elementalists and nightwalkers of Hedge Magic): their own
 * Virtues are drawn only when the player names one.
 */
const UNBUILT_OWN = [...ELEMENTAL_ART_IDS, 'type-summoning', 'type-controlling', 'type-divining', 'type-refining', 'elemental-affinity', 'elementalist-magic', 'elemental-medicine', 'elemental-philosophiae', 'elemental-theurgy', 'vulnerable-to-form-flaw', 'weak-elemental-resistance-flaw', 'nightwalker', 'versatile-phantasticum', 'half-taltos', 'hamr', 'sleepwalker'];

/** A faerie wizard's Methods and Powers: rites need one of each (RoP: Faerie line 7505). */
export const FAERIE_METHOD_IDS: readonly string[] = ['evocation', 'enchantment', 'empathy'];
export const FAERIE_POWER_IDS: readonly string[] = ['beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe'];
/** The Virtues of faerie bargaining, "usually Summoning" (RoP: Faerie line 7505). */
const FAERIE_BARGAIN_IDS = ['summoning', 'bonding', 'captivating', 'dismissing'];

/** The chips of the guided build's `f-tradition`, in the order the build takes them if several are picked. */
export const TRADITION_CHIPS: Record<Tradition, string> = { witch: 'f-trad-witch', gruagach: 'f-trad-gruagach', learned: 'f-trad-learned', vitki: 'f-trad-vitki', faerie: 'f-trad-faerie' };
const TRADITION_TYPES: CharType[] = ['companion'];

/** A member's tradition, from the Social Status they hold (a faerie wizard by a Method, a Power or Summoning). */
export function traditionOf(c: Pick<Character, 'virtues'>): Tradition | undefined {
  const has = (id: string) => c.virtues.some((v) => v.defId === id);
  const t = TRADITIONS.find((x) => x.status && has(x.status));
  if (t) return t.id;
  return TRADITION_BY_ID.get('faerie')!.own.some(has) ? 'faerie' : undefined;
}

/**
 * The tradition the answers ask for: a choice under `f-tradition`, the first in the book's order if
 * several are picked, or the tradition's Social Status asked for by name. Only a companion is made
 * one (the book's Gifted and unGifted companions; the grogs and Mythic Companions it allows are left
 * for later).
 */
export function wantedTradition(st: GuidedState, c: Pick<Character, 'type'>, data: GameData): Tradition | undefined {
  if (!TRADITION_TYPES.includes(c.type)) return undefined;
  // a choice counts while its question is rated high enough to show it
  const asked = (st.answers['f-tradition'] ?? 5) >= 7;
  for (const t of TRADITIONS) {
    if (!traditionOpen(t.id, st, data)) continue;
    if (asked && (st.answers[TRADITION_CHIPS[t.id]] ?? 0) >= 7) return t.id;
    if (t.status && (st.answers[`vf:${t.status}`] ?? 0) >= 7) return t.id;
  }
  return undefined;
}

/**
 * Whether the saga's books and the player's answers leave the tradition open: its Social Status (a
 * faerie wizard's Methods, Powers and Sympathy) in the saga's books, and not declined, as a plain
 * build declines every book beyond the core. A faerie wizard needs a Method or a Virtue of bargaining,
 * and a Sympathy Trait "either from a Virtue or a Flaw" (RoP: Faerie line 7505).
 */
export function traditionOpen(t: Tradition, st: GuidedState, data: GameData): boolean {
  const open = (id: string) => {
    const def = data.vfById.get(id);
    return !!def && data.inBooks(def) && !st.declined.includes(id);
  };
  const def = TRADITION_BY_ID.get(t)!;
  if (def.status) return open(def.status);
  return [...FAERIE_METHOD_IDS, ...FAERIE_BARGAIN_IDS].some(open) && ['faerie-sympathy', 'faerie-antipathy-flaw'].some(open);
}

/**
 * The Virtues and Flaws a member of the tradition may be made with: its Social Status, its own, the
 * Hermetic ones the chapter allows a Gifted member, and a faerie wizard's Sympathy or Antipathy. A
 * role picked by hand brings them even to a plain build.
 */
export function traditionVirtues(t: Tradition): string[] {
  const def = TRADITION_BY_ID.get(t)!;
  return [...(def.status ? [def.status] : []), ...def.own, ...(def.hermetic ?? []), ...(t === 'faerie' ? ['faerie-sympathy', 'faerie-antipathy-flaw'] : [])];
}

/** The tradition a role's answers ask for, whatever the books: the first chip picked. */
export function traditionOfAnswers(answers: Record<string, number>): Tradition | undefined {
  if ((answers['f-tradition'] ?? 0) < 7) return undefined;
  return TRADITIONS.find((t) => (answers[TRADITION_CHIPS[t.id]] ?? 0) >= 7)?.id;
}

/** Whether the member is Gifted: a vitki always (HMRE line 6146), a faerie wizard never; else as the answers say. */
export function wantsGift(t: Tradition, st: GuidedState, c: Pick<Character, 'virtues'>): boolean {
  const def = TRADITION_BY_ID.get(t)!;
  if (def.gift !== 'either') return def.gift === 'always';
  return c.virtues.some((v) => v.defId === 'the-gift') || (st.answers['f-trad-gift'] ?? 0) >= 7 || (st.answers['vf:the-gift'] ?? 0) >= 7;
}

/**
 * Whether the build may draw this Virtue or Flaw for the character: another tradition's own Virtues
 * only when named (a lone gruagach Form casts nothing), and for a Gifted member only the Hermetic
 * Virtues and Flaws the chapter allows.
 */
export function fitsTradition(defId: string, c: Pick<Character, 'virtues'>, data: GameData, st: GuidedState, t: Tradition | undefined): boolean {
  return !traditionGate(defId, c, data, st, t);
}

// Every Virtue and Flaw a tradition gates. The scorer asks of each one each time it ranks the
// shortlist, so the rest are let through at once.
const GATED = new Set([...TRADITIONS.flatMap((t) => [...t.own, ...(t.opens ?? [])]), ...UNBUILT_OWN, ...FAERIE_METHOD_IDS, ...FAERIE_POWER_IDS]);

/** Why the build and its shortlist leave this Virtue or Flaw out for the character's tradition, or none. */
export function traditionGate(defId: string, c: Pick<Character, 'virtues'>, data: GameData, st: GuidedState, t: Tradition | undefined): string | null {
  const mine = t ? TRADITION_BY_ID.get(t)! : undefined;
  if (!GATED.has(defId) && !mine?.hermetic) return null;
  if ((st.answers[`vf:${defId}`] ?? 0) >= 7) return null;
  const gifted = c.virtues.some((v) => v.defId === 'the-gift');
  if (gifted && mine?.opens?.includes(defId)) return `The Gift opens it for ${mine.member}`;
  // a faerie wizard's rites need a Method and a Power together (RoP: Faerie line 7505), so one who
  // bargains with faeries instead (a Borrower's Summoning) is not drawn either alone
  if (t === 'faerie' && traditionOf(c) === 'faerie') {
    const holds = (ids: readonly string[]) => c.virtues.some((v) => ids.includes(v.defId));
    if (FAERIE_POWER_IDS.includes(defId) && !holds(FAERIE_METHOD_IDS)) return 'A Faerie Power works rites only with a Faerie Method, which this character lacks';
    if (FAERIE_METHOD_IDS.includes(defId) && !holds(FAERIE_POWER_IDS)) return 'A Faerie Method works rites only with a Faerie Power, which this character lacks';
  }
  if (mine?.own.includes(defId)) return null;
  const other = TRADITIONS.find((x) => x.own.includes(defId));
  if (other) return `Of ${other.member}’s tradition, which this character does not follow`;
  if (UNBUILT_OWN.includes(defId)) return 'Of a hedge tradition this character does not follow';
  const def = data.vfById.get(defId);
  if (mine?.hermetic && def?.categories.includes('Hermetic') && defId !== 'the-gift' && gifted && !mine.hermetic.includes(defId)) return `Not among the Hermetic Virtues and Flaws ${mine.member} may take`;
  return null;
}
