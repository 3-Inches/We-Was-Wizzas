// The Virtues and Flaws of the hedge traditions Quick build makes, one list for the rules check
// (restrictions.ts: a Hermetic magus does not normally take them) and for Quick build
// (engine/guided/traditionRules.ts: drawn only for a member). Hedge Magic, Revised Edition (HMRE):
// Folk Witches (line 1570), Gruagachan (line 2786), Learned Magicians (line 4117), Vitkir (line 6144).
// Not Fetch: "other characters may also have access to a fetch" (HMRE line 2879).

import { folkWitchVirtueDefs } from './hedgeFolkWitch';

/** A hedge wizard's magical defenses, and the Flaw of being known as one (HMRE, Hedge Wizards). */
export const HEDGE_DEFENSES = ['greater-magical-defenses', 'no-magical-defenses-flaw', 'known-hedge-wizard-flaw'];

export type HedgeTradition = 'witch' | 'gruagach' | 'learned' | 'vitki';

/** Each tradition's own Virtues and Flaws, its Social Status among them, with the rules check's name for it. */
export const HEDGE_TRADITION_OWN: Record<HedgeTradition, { label: string; ids: string[] }> = {
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
};
