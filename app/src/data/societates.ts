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
      "This is a Major Virtue that empowers the character’s music with the ability to control those who listen to it. A successful roll of Communication + Music versus the target’s Stamina roll allows the character to issue a command to any individual or group who hears the music. The target remains in the character’s command as long as she produces music. Another roll is required to change or issue new commands. The command is not necessarily articulated in the lyrics of the song. A target does not know why he is following the command, only that it has something to do with the magical melody.\n\nIf a group of musicians performs together, the Music scores of the other members are added to the singer’s roll. No more than two musicians’ scores can assist the singer in performing a song, and the amount each assistant adds can be no more than the singer’s score in Music.\n\nA victim’s resistance roll is modified based on the same factors as the Entrancement Ability.\n\n| Command      | Example                    | Target’s Bonus |\n|--------------|----------------------------|----------------|\n| Innocuous    | Listen to my song          | +0             |\n| Questionable | Come to me                 | +3             |\n| Dangerous    | Follow me out of town      | +6             |\n| Heinous      | Kill your fellows          | +9             |\n| Suicidal     | Crash your ship upon the rocks | +12        |\n\n**Specialties:** Men, children, rats. (Supernatural)\n\nAlthough Siren Song is a more powerful Virtue than Enchanting Music, the two Virtues may be used in combination. Unlike the Enchanting Music Ability, which creates an emotion in a person and can influence individuals on a long-term basis, Siren Song actually controls the mind of the person while he listens to the music. When a character uses both Virtues, her initial command made with Siren Song can be reinforced by an appropriate emotion provided by the Enchanting Music Virtue. The combination can continue to influence the victim after the music has ceased. For the Abilities to be combined, the character must successfully overcome the victim’s Stamina on both rolls. If other Seirenes accompany the character in performing, their Enchanting Music scores may be added to the leader’s roll. The same restrictions and benefits from the Siren Song Virtue apply to a group performing with the Enchanting Music Ability.",
  },
  {
    id: 'sanguine-humors-blessing', name: 'Sanguine Humor’s Blessing', kind: 'virtue', sizes: ['Major'], categories: ['General'], tainted: false,
    source: { book: 'HoH_S', line: 4971 },
    text:
      "Of the four humors of Hippocrates, blood is said to govern passion and heat. A character with this Virtue has strong connections to others who support him, and he can draw on these bonds to give insight to specific tasks.\n\nA character with this Virtue receives a bonus to certain rolls. This is based on his Story Flaw, if appropriate; however, the roll in question does not need to involve the Flaw directly. The Flaw must indicate a True Feeling, and this determination is left up to the storyguide or troupe, but some examples are given below. The bonus is +1 to Ability rolls for Minor Story Flaws and +3 for Major Story Flaws; Hermetic magi with this Virtue, including Orphic *magoi*, gain a +3 bonus to appropriate spellcasting rolls for Minor Flaws and a +5 bonus for Major ones. Note that this is a General Virtue, and thus available to those outside of the Cult of Orpheus.\n\nIf the character ever loses the Story Flaw in question, through in-game resolution, this Virtue ceases to provide any benefit until the character gains another such Flaw. If a character has two appropriate Flaws for any reason, only the first one gained affects this Virtue; note, however, that under normal circumstances a character may only begin play with one Story Flaw.\n\nSome appropriate Flaws and their corresponding bonuses appear below. Other Flaws may be appropriate, as determined by your troupe or storyguide.\n\n| Flaw                     | Bonus                                   |\n|--------------------------|-----------------------------------------|\n| Dependent                | Rolls to support or protect             |\n| Enemies                  | Rolls to attack or defend               |\n| True Love (NPC)          | Rolls to impress or persuade            |\n| Animal/Magical Animal Companion | Rolls involving the natural world |\n| Close Family Ties        | Rolls to empathize with or understand another person |\n| Mentor                   | Rolls to recall or comprehend information |\n\nFor example, a character with the Story Flaw Enemies receives a +3 bonus to any mundane roll that involves attack or defense, or a +5 bonus to such Hermetic spells, regardless of whether the target of the roll is an Enemy as defined by the Flaw. A character with Close Family Ties receives a bonus to rolls to comprehend other people, regardless of whether they are family.",
  },
  {
    id: 'goetic-summoning', name: 'Summoning (Goetic Art)', kind: 'virtue', sizes: ['Major'], categories: ['Supernatural'], tainted: false,
    source: { book: 'RoP_I', line: 4335 },
    text:
      "This Virtue gives the character the primary Art of the Ars Goetia, Summoning. She begins with this Art at 0, and may increase it through study and practice. When combined with the other Goetic Arts, she can bind, destroy, and control demons and other spirits, as described in Chapter 11: Ars Goetia.",
  },
];

const SOCIETATES_ABILITIES: AbilityDef[] = [
  {
    id: 'siren-song', name: 'Siren Song', type: 'Supernatural', restricted: true, specialties: ['men', 'children', 'rats'],
    text: 'Music that commands those who hear it. Roll Communication + Music against the target’s Stamina roll to issue a command, which holds while the music lasts; a new command needs a new roll. The target adds to the roll by how bad the command is (Innocuous +0, Questionable +3, Dangerous +6, Heinous +9, Suicidal +12). Up to two other musicians add their Music scores, each no more than the singer’s. The Siren Song score cannot be higher than Music (Houses of Hermes: Societates, Seirenes).',
    source: { book: 'HoH_S', line: 5627 },
  },
  {
    id: 'goetic-summoning', name: 'Summoning (Goetic Art)', type: 'Supernatural', restricted: true, asArt: true, specialties: ['demons', 'ghosts', 'spirits of a place', 'scouring'],
    text: 'The first Art of the Ars Goetia: drawing a spirit into a circle to bargain with it. It opens at 0 and rises as an Art does (1 xp for a score of 1, 3 for 2, 6 for 3). Summoning Total: stress die + Presence + Summoning + (Realm) Lore + aura + (Penetration × its multiplier), against the spirit’s Might × 2; a specific spirit needs an Arcane Connection (for a demon, its True Name). Under double the Target Level, dealing with the spirit takes Stamina + Concentration rolls to hold the circle (Realms of Power: The Infernal, Ars Goetia).',
    source: { book: 'RoP_I', line: 5813 },
  },
];

export function societatesVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  return SOCIETATES_VF.filter((v) => !existing.has(v.id));
}

export function societatesAbilityDefs(existing: Set<string>): AbilityDef[] {
  return SOCIETATES_ABILITIES.filter((a) => !existing.has(a.id));
}
