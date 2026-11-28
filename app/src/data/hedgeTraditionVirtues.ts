// The Virtues and Flaws of the hedge traditions, one list for the rules check (restrictions.ts: a
// Hermetic magus does not normally take them) and for Quick build (engine/guided/traditionRules.ts:
// drawn only for a member). Hedge Magic, Revised Edition (HMRE): Elementalists (line 884), Folk Witches
// (line 1570), Gruagachan (line 2786), Learned Magicians (line 4117), Nightwalkers (line 5446), Vitkir
// (line 6144). Quick build makes the folk witch, the gruagach, the learned magician and the vitki; the
// elementalists' and nightwalkers' own are drawn only when the player names one.
// Not Fetch: "other characters may also have access to a fetch" (HMRE line 2879).

import { folkWitchVirtueDefs } from './hedgeFolkWitch';

/** A hedge wizard's magical defenses, and the Flaw of being known as one (HMRE, Hedge Wizards). */
export const HEDGE_DEFENSES = ['greater-magical-defenses', 'no-magical-defenses-flaw', 'known-hedge-wizard-flaw'];

export type HedgeTradition = 'witch' | 'gruagach' | 'learned' | 'vitki' | 'elementalist' | 'nightwalker';
/** The traditions Quick build makes a member of. */
export type BuiltHedgeTradition = 'witch' | 'gruagach' | 'learned' | 'vitki';

/**
 * Each tradition's own Virtues and Flaws, its Social Status among them, with the rules check's name for
 * it. `hermeticToo`: those the book lets a magus take as a Hermetic Flaw, which the rules check does not
 * warn a magus of.
 */
export const HEDGE_TRADITION_OWN: Record<HedgeTradition, { label: string; ids: string[]; hermeticToo?: string[] }> = {
  witch: { label: 'Folk Witches (Hedge Magic)', ids: folkWitchVirtueDefs(new Set()).map((d) => d.id) },
  gruagach: {
    label: 'Gruagachan (Hedge Magic)',
    ids: [
      'gruagach', 'gruagach-master', 'cailleach-magic', 'external-soul', 'give', 'take', 'blessing', 'curse', 'shape', 'vision', 'flexible-gruagach-magic', 'tattoo-mastery', 'well-trained-gruagach',
      'no-tattoo-magic-flaw', 'transformation-prone-flaw', 'inflexible-magic-flaw', 'poorly-trained-gruagach-flaw', 'weak-tattoo-magic-flaw', 'incompatible-hedge-arts-flaw',
    ],
  },
  learned: {
    label: 'Learned Magicians (Hedge Magic)',
    // Mythic Alchemy, Mythic Herbalism and Natural Magician suit others too (Hedge Magic)
    ids: [
      'mathematicus-of-bologna', 'entreat-the-powers', 'entreat-the-realm-powers', 'strong-amulet-magic', 'strong-verbal-charms', 'tueor', 'succurro', 'vulnero', 'fortunam', 'magicam', 'salutem', 'skilled-master',
      'charm-magician-flaw', 'intervention-prone-flaw', 'laboratory-magician-flaw', 'weak-verbal-charms-flaw', 'no-chartae-making-flaw', 'no-text-casting-flaw', 'poorly-trained-magician-flaw', 'weak-amulets-flaw', 'weak-chartae-flaw', 'incompatible-hedge-arts-flaw',
    ],
  },
  vitki: {
    label: 'Vitkir (Hedge Magic)',
    // Nameless Runes and Secret Runes: HMRE line 6183
    ids: ['vitki', 'deft-rune', 'mastered-rune', 'minor-rune-focus', 'major-rune-focus', 'nameless-runes', 'secret-runes', 'minor-magical-deficiency-flaw', 'major-magical-deficiency-flaw', 'natt-thel-prone-flaw', 'short-lived-runes-flaw'],
  },
  elementalist: {
    label: 'Elementalists (Hedge Magic)',
    // the starred "new" ones of the sidebar Elementalist Virtues (HMRE line 908); Elemental Magic is `elementalist-magic`
    ids: [
      'elementalist-magic', 'elemental-medicine', 'elemental-philosophiae', 'elemental-theurgy', 'type-controlling', 'type-divining', 'type-refining', 'type-summoning',
      'elemental-affinity', 'elementalist-air', 'elementalist-earth', 'elementalist-fire', 'elementalist-water', 'weak-elemental-resistance-flaw', 'vulnerable-to-form-flaw',
    ],
    // "This Flaw can be taken as a Hermetic Flaw" (HMRE line 1068); "This Flaw can be taken by a magus as a Hermetic Flaw" (line 1077)
    hermeticToo: ['weak-elemental-resistance-flaw', 'vulnerable-to-form-flaw'],
  },
  nightwalker: {
    label: 'Nightwalkers (Hedge Magic)',
    // Nightwalker and Versatile Phantasticum (HMRE lines 5462, 5490), and the "Minor Virtues Related To Straying Traditions" (line 5496)
    ids: ['nightwalker', 'versatile-phantasticum', 'half-taltos', 'hamr', 'sleepwalker'],
  },
};

/** The tradition's Flaws a magus may take as Hermetic ones: not a tradition's own for a magus. */
export const HERMETIC_TOO: ReadonlySet<string> = new Set(Object.values(HEDGE_TRADITION_OWN).flatMap((t) => t.hermeticToo ?? []));

/**
 * The Hermetic Virtues and Flaws each chapter names for its tradition. Most are a preference: "The
 * traditions in this book indicate which Hermetic Virtues and Flaws are suitable for these hedge
 * traditions" (HMRE line 690), so Quick build draws from the list first and the rules check refuses
 * nothing off it. The gruagach's is a limit: "Gruagach may only take Hermetic Virtues or Flaws
 * on the above list, unless the troupe decides otherwise" (HMRE line 2953). The elementalists, the
 * nightwalkers and the faerie wizards have no such list.
 */
export const HEDGE_HERMETIC: Record<BuiltHedgeTradition, { line: number; limit?: true; ids: string[] }> = {
  // "suitable for Gifted Folk Witches" (HMRE line 1707)
  witch: {
    line: 1707,
    ids: [
      'gentle-gift', 'adept-laboratory-student', 'cautious-sorcerer', 'cyclic-magic-positive', 'fast-caster', 'free-study', 'harnessed-magic', 'inventive-genius', 'magical-memory', 'personal-vis-source', 'quiet-magic', 'side-effect', 'special-circumstances', 'subtle-magic',
      'blatant-gift-flaw', 'difficult-longevity-ritual-flaw', 'necessary-condition-flaw', 'painful-magic-flaw', 'restriction-flaw', 'rigid-magic-flaw', 'waster-of-vis-flaw',
      'careless-sorcerer-flaw', 'creative-block-flaw', 'cyclic-magic-negative-flaw', 'deleterious-circumstances-flaw', 'disorientating-magic-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'unimaginative-learner-flaw', 'warped-magic-flaw', 'weak-magic-flaw', 'weird-magic-flaw',
      'flawed-folk-witch-gift-opening',
    ],
  },
  // HMRE line 2941; the limit, line 2953
  gruagach: {
    line: 2953,
    limit: true,
    ids: [
      'flawless-magic', 'gentle-gift', 'major-magical-focus', 'secondary-insight',
      'adept-laboratory-student', 'affinity-with-art', 'cautious-sorcerer', 'deft-form', 'fast-caster', 'free-study', 'harnessed-magic', 'inventive-genius', 'life-boost', 'minor-magical-focus', 'magical-memory', 'personal-vis-source', 'puissant-art', 'side-effect', 'skilled-parens', 'special-circumstances', 'subtle-magic',
      'blatant-gift-flaw', 'deficient-technique-flaw', 'necessary-condition-flaw', 'painful-magic-flaw', 'restriction-flaw', 'short-ranged-magic-flaw', 'waster-of-vis-flaw',
      'careless-sorcerer-flaw', 'creative-block-flaw', 'deficient-form-flaw', 'deleterious-circumstances-flaw', 'disorientating-magic-flaw', 'incompatible-arts-flaw', 'infamous-master-flaw', 'offensive-to-beings-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'unimaginative-learner-flaw', 'unpredictable-magic-flaw', 'warped-magic-flaw', 'weak-magic-flaw', 'weird-magic-flaw',
    ],
  },
  // "Most of these are suitable for all magicians, but others are only appropriate for those magicians with The Gift" (HMRE line 4384)
  learned: {
    line: 4384,
    ids: [
      'gentle-gift', 'major-magical-focus', 'secondary-insight',
      'adept-laboratory-student', 'affinity-with-art', 'cautious-sorcerer', 'deft-form', 'enduring-magic', 'fast-caster', 'harnessed-magic', 'inventive-genius', 'minor-magical-focus', 'magical-memory', 'personal-vis-source', 'puissant-art', 'quiet-magic', 'side-effect', 'special-circumstances', 'subtle-magic',
      'blatant-gift-flaw', 'deficient-technique-flaw', 'necessary-condition-flaw', 'painful-magic-flaw', 'restriction-flaw', 'rigid-magic-flaw', 'short-ranged-magic-flaw',
      'careless-sorcerer-flaw', 'creative-block-flaw', 'deficient-form-flaw', 'deleterious-circumstances-flaw', 'disorientating-magic-flaw', 'short-lived-magic-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'warped-magic-flaw', 'weak-magic-flaw', 'weak-scholar-flaw', 'weird-magic-flaw',
    ],
  },
  // "many Hermetic Virtues and Flaws may be taken as Supernatural Virtues and Flaws" (HMRE line 6148): the
  // unstarred ones of the sidebars Vitkar Virtues (line 6164) and Vitkar Flaws (line 6274)
  vitki: {
    line: 6148,
    ids: [
      'gentle-gift', 'mythic-blood', 'secondary-insight', 'affinity-with-art', 'cyclic-magic-positive', 'fast-caster', 'free-study', 'inoffensive-to-beings', 'inventive-genius', 'life-boost', 'personal-vis-source', 'puissant-art', 'side-effect', 'special-circumstances',
      'blatant-gift-flaw', 'magic-addiction-flaw', 'painful-magic-flaw', 'restriction-flaw',
      'careless-sorcerer-flaw', 'cyclic-magic-negative-flaw', 'deleterious-circumstances-flaw', 'disorientating-magic-flaw', 'offensive-to-beings-flaw', 'slow-caster-flaw', 'susceptibility-to-divine-power-flaw', 'susceptibility-to-faerie-power-flaw', 'susceptibility-to-infernal-power-flaw', 'warped-magic-flaw', 'weird-magic-flaw',
    ],
  },
};
