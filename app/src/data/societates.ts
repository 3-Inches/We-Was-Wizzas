// Virtues and Abilities of the Ex Miscellanea traditions that the extracted book text does not
// carry as entries of their own: the Seirenes' Siren Song and the Cult of Orpheus's Sanguine
// Humor's Blessing (Houses of Hermes: Societates), and the Witches of Thessaly's Summoning, the
// Goetic Art (Realms of Power: The Infernal). Their text is the books', shortened.

import type { AbilityDef, VirtueFlawDef } from './types';

const SOCIETATES_VF: VirtueFlawDef[] = [
  {
    id: 'siren-song', name: 'Siren Song', kind: 'virtue', sizes: ['Major'], categories: ['Supernatural'], tainted: false,
    source: { book: 'HoH_S', line: 5627 },
    text:
      'The character’s music can control those who hear it. A successful Communication + Music roll against the target’s Stamina roll lets her issue a command to any individual or group who hears the music; the target obeys while she makes music, and a new command needs another roll. Up to two other musicians may add their Music scores (no more than hers each). The target resists better the worse the command: Innocuous +0, Questionable +3, Dangerous +6, Heinous +9, Suicidal +12, and as for Entrancement. A Seirene’s Music limits her skill at Siren Song. It can be combined with Enchanting Music. Gives the Supernatural Ability Siren Song 1.',
  },
  {
    id: 'sanguine-humors-blessing', name: 'Sanguine Humor’s Blessing', kind: 'virtue', sizes: ['Major'], categories: ['General'], tainted: false,
    source: { book: 'HoH_S', line: 4971 },
    text:
      'The character draws on strong bonds with others who support him. With a Story Flaw that indicates a True Feeling (the troupe decides which do), he gains +1 to Ability rolls with a Minor Story Flaw and +3 with a Major one; a Hermetic magus gains +3 to appropriate spellcasting rolls with a Minor Flaw and +5 with a Major one. Lose the Flaw in play and the Virtue does nothing until another is gained; with two, only the first counts. A General Virtue, open to those outside the Cult of Orpheus.',
  },
  {
    id: 'goetic-summoning', name: 'Summoning (Goetic Art)', kind: 'virtue', sizes: ['Major'], categories: ['Supernatural'], tainted: false,
    source: { book: 'RoP_I', line: 4335 },
    text:
      'The primary Art of the Ars Goetia: the character begins with the Art of Summoning at 0 and may raise it by study and practice. With the other Goetic Arts she can bind, destroy and control demons and other spirits (Realms of Power: The Infernal, Ars Goetia). Summoning Total: stress die + Presence + Summoning + (Realm) Lore + aura (+ Penetration); the Target Level is the spirit’s Might × 2. The Witches of Thessaly take it as their Major non-Hermetic Virtue.',
  },
];

const SOCIETATES_ABILITIES: AbilityDef[] = [
  {
    id: 'siren-song', name: 'Siren Song', type: 'Supernatural', restricted: true, specialties: ['men', 'children', 'rats'],
    text: 'Communication + Music + Siren Song is no part of the roll: Communication + Music against the target’s Stamina issues a command, and the Siren Song score is limited by Music (Houses of Hermes: Societates, Seirenes).',
    source: { book: 'HoH_S', line: 5627 },
  },
];

export function societatesVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  return SOCIETATES_VF.filter((v) => !existing.has(v.id));
}

export function societatesAbilityDefs(existing: Set<string>): AbilityDef[] {
  return SOCIETATES_ABILITIES.filter((a) => !existing.has(a.id));
}
