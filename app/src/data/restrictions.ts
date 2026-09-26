// Who may take each Virtue or Flaw, and what else it needs. Curated from the sentences in the
// books that restrict a Virtue or Flaw ("only available to", "may not take", "must also have",
// "requires ... as a prerequisite"...). The quoted wording goes into `restrictionText`, which the
// rules check shows when it flags the Virtue or Flaw.
//
// These entries are merged under the hand-written mechanics (src/data/mechanics.ts), and saga house
// rules can override any field. `excludes` is made symmetric when the data is assembled.

import type { Mechanics } from './mechanics';
import type { CharType, VFNeed } from './types';

const need = (anyOf: string[], label: string, extra: Partial<VFNeed> = {}): VFNeed => ({ anyOf, label, ...extra });
const EDUCATED_HEBREW = need(['educated-hebrew'], 'the Educated (Hebrew) Virtue');
const TRUE_FAITH = need(['true-faith'], 'True Faith');
const FAERIE_BLOOD = need(['faerie-blood', 'strong-faerie-blood'], 'Faerie Blood or Strong Faerie Blood');
const GIFT_OR_AIR = need(['$gift', 'magical-air-flaw'], 'The Gift or the Magical Air Flaw');
const ACADEMIC = need(['$academic'], 'a Virtue that allows Academic Abilities (such as Educated)');

const onlyTypes = (types: CharType[], restrictionText: string): Mechanics => ({ forTypes: types, restrictionText });
const notTypes = (types: CharType[], restrictionText: string): Mechanics => ({ notForTypes: types, restrictionText });
const houseOnly = (houses: string[], restrictionText: string, houseSeverity: 'error' | 'warning' = 'error'): Mechanics => ({ houses, restrictionText, houseSeverity });
const male = (restrictionText = 'This Virtue is only available to male characters.'): Mechanics => ({ maleOnly: true, restrictionText });

// ------------------------------------------------------------------ non-human beings
// Virtues and Flaws from the character-creation chapters for faeries, magic beings, jinn and
// corrupted beasts. Player characters built with the normal rules cannot take them.
const BEINGS: Record<string, string[]> = {
  'faerie characters (Realms of Power: Faerie, Chapter 3)': [
    'improved-powers', 'reduced-power-flaw', 'faerie-instructor', 'faerie-trainer', 'aloof-flaw', 'freshly-sprung-flaw', 'ostentatious', 'pretentious',
    'incognizant-flaw', 'highly-cognizant', 'fast-might-recovery', 'feast-of-the-fae', 'feast-of-the-dead', 'increased-faerie-might', 'time-or-place-of-power',
    'slow-might-recovery-flaw', 'might-recovery-requires-vitality-flaw', 'negative-reaction-flaw', 'positive-folktales', 'infiltrator', 'huge', 'little-flaw',
    'faerie-beast', 'humanoid-faerie', 'hybrid-form', 'immune-to-source-of-damage', 'improved-damage', 'improved-initiative', 'improved-soak', 'puissant-pretense',
    'residual-power', 'poor-combatant-flaw', 'reduced-damage-flaw', 'reduced-initiative-flaw', 'reduced-soak-flaw', 'role-requires-suffering-flaw',
    'susceptible-to-deprivation-flaw',
  ],
  'magic beings (Realms of Power: Magic, Chapter 4)': ['bound-to-magic-flaw', 'essential-flaw-flaw', 'magical-friend-flaw', 'magical-monster-flaw'],
  'jinn and other faerie beings (The Cradle & the Crescent, Lands of the Jinn)': [
    'external-vis', 'faerie-sight', 'faerie-speech', 'reputation-as-confidence', 'intangible-flesh-flaw', 'traditional-ward-flaw', 'monstrous-appearance-flaw',
    'sovereign-ward-flaw', 'vulnerable-to-folk-tradition-islamic-flaw',
  ],
  'corrupted beasts (Realms of Power: The Infernal, Chapter 8)': ['corrupted-beast-flaw', 'demonic-weakness-flaw', 'horrifying-appearance-flaw', 'greater-infernal-power', 'lesser-infernal-power'],
  'animals': ['domestic-animal', 'ferocity', 'companion-animal-flaw'],
  'pharaonic ghosts (Lands of the Nile)': ['blood-of-the-old-gods'],
};

// ------------------------------------------------------------------ hedge traditions
// Members of these traditions take these Virtues and Flaws; Hermetic magi normally do not.
const TRADITIONS: Record<string, string[]> = {
  'Gruagachan (Hedge Magic)': [
    'cailleach-magic', 'external-soul', 'give', 'take', 'gruagach-master', 'blessing', 'curse', 'fetch', 'flexible-gruagach-magic', 'shape', 'tattoo-mastery', 'vision',
    'well-trained-gruagach', 'no-tattoo-magic-flaw', 'transformation-prone-flaw', 'incompatible-hedge-arts-flaw', 'inflexible-magic-flaw', 'poorly-trained-gruagach-flaw',
    'weak-tattoo-magic-flaw',
  ],
  'Learned Magicians (Hedge Magic)': [
    'mathematicus-of-bologna', 'entreat-the-powers', 'mythic-alchemy', 'charm-magician-flaw', 'intervention-prone-flaw', 'laboratory-magician-flaw', 'weak-verbal-charms-flaw',
    'no-chartae-making-flaw', 'no-text-casting-flaw', 'poorly-trained-magician-flaw', 'weak-amulets-flaw', 'weak-chartae-flaw',
  ],
  'hedge wizards (Hedge Magic)': ['greater-magical-defenses', 'known-hedge-wizard-flaw', 'no-magical-defenses-flaw'],
  'Vitkir (Hedge Magic)': ['major-magical-deficiency-flaw', 'minor-magical-deficiency-flaw', 'natt-thel-prone-flaw', 'short-lived-runes-flaw', 'deft-rune', 'major-rune-focus', 'mastered-rune', 'minor-rune-focus'],
  'Nightwalkers (Hedge Magic)': ['half-taltos', 'hamr', 'sleepwalker', 'nightwalker', 'versatile-phantasticum'],
  'Amazons (Rival Magic)': [
    'amazonian-slave-flaw', 'beloved-slave-flaw', 'bitter-mistress-flaw', 'frail-magic-flaw', 'friendly-mistress-flaw', 'magic-aura-temple-flaw', 'prolonged-apprenticeship-flaw',
    'amazon', 'amazon-sorceress', 'martial-connection-to-magic', 'proven-raider', 'strong-magic', 'symbolic-understanding',
  ],
  'Storm Wizards (Against the Dark)': ['storm-calling', 'storm-riding', 'storm-fighting', 'storm-wizard'],
  'Sorginak (Faith & Flame)': ['ecstatic-magic', 'sorgina'],
  'Tuareg settuten (Between Sand & Sea)': ['settut', 'disjunction', 'dislocation', 'dismay', 'dismissal', 'dissidence', 'dissolution'],
  'Mobeds (The Cradle & the Crescent)': ['blessing-of-ameshaspand', 'gifts-of-gayomart', 'righteousness-of-the-wise', 'saoshyants-elixir', 'mazdean-alchemy', 'mazdean-astrology'],
};

const REGIONS: Record<string, string[]> = {
  Ireland: ['bard', 'senior-bard', 'master-bard'],
  'North Africa': ['ineslemen'],
  'the Iberian Peninsula': ['almogaten', 'almogavar'],
};

const NIZARI = ['fidai', 'lasiq'];
const UNIVERSITY = ['simple-student', 'baccalaureus', 'magister-in-artibus', 'doctor-in-faculty', 'magister-in-medicina', 'beadle', 'lupus-the-wolf', 'nuntius', 'jurist', 'university-grammar-teacher'];
const WEALTH_SETTING = ['covenfolk', 'custos', 'turb-trained', 'almogavar', 'guild-apprentice'];

const EXPLICIT: Record<string, Mechanics> = {
  // ---------------------------------------------------------------- character type
  'blood-of-the-nephilim': {
    ...notTypes(['magus', 'grog'], 'Magi and Grogs may not take this Virtue.'),
    needs: [
      need(['greedy-flaw'], 'the Minor Personality Flaw Greedy (it counts as one of your normal Flaws)', {
        auto: { id: 'greedy-flaw', size: 'Minor' },
        quote: 'Due to your great size, you must eat vast amounts of food, and have the Minor Personality Flaw Greedy (which counts as one of your normal Flaws).',
      }),
    ],
  },
  'temporal-influence': notTypes(['grog'], 'Grogs may not take this Virtue.'),
  'outlaw-leader-flaw': notTypes(['grog'], 'Grogs may not take this Flaw.'),
  'tormenting-master-flaw': onlyTypes(['magus'], 'This Flaw is only applicable to magi, although other characters could take an analogous Story Flaw.'),
  'divination-and-augury': onlyTypes(['magus'], 'It is only available to Hermetic magi, as it requires the magus to have Hermetic Arts opened.'),
  kabbalist: onlyTypes(['mythic'], 'This is a special Mythic Companion Social Status Virtue and must be taken by all kabbalists.'),
  'hermetic-patron-flaw': { needs: [need(['hermetic-magus', 'redcap', 'lone-redcap'], 'being a Redcap or a magus')], restrictionText: 'You must be a Redcap or magus to take this Flaw.' },

  // ---------------------------------------------------------------- Houses
  'brutal-artist-flaw': houseOnly(['jerbiton'], 'This Flaw is only available to magi of House Jerbiton.'),
  'consumed-casting-tools-flaw': houseOnly(['verditius'], 'This Flaw may only be taken by Verditius magi.'),
  'spontaneous-casting-tools-flaw': houseOnly(['verditius'], 'This Flaw can only be taken by Verditius magi.'),
  'primogeniture-lineage-flaw': houseOnly(['verditius'], 'This Flaw can only be taken by magi of House Verditius.'),
  'vendetta-flaw': houseOnly(['verditius'], 'This Flaw is generally restricted to magi of House Verditius, as the custom of vendetta is limited to that House.', 'warning'),
  'miles-flaw': houseOnly(['flambeau'], 'The character, who must be a member of House Flambeau, is a member of the milites.'),
  'leper-magus': {
    ...houseOnly(['tytalus'], 'This Virtue can only be bought if the character also has the Leprosy Flaw, and is only available to magi trained in House Tytalus.'),
    requires: ['leprosy-flaw'],
  },
  'inscribed-shadow-flaw': {
    needs: [need(['the-enigma', 'realm-stigmatic-flaw', 'stigmatic-catalyst-flaw', 'predictive-stigmata-flaw'], 'stigmata (normally a magus of House Criamon)', { severity: 'warning' })],
    restrictionText: 'Only characters with stigmata may have this Flaw, which normally means that they must be magi of House Criamon.',
  },

  // ---------------------------------------------------------------- gender
  alim: male(), archieunuch: male('This Virtue is only available to male characters, who must also be eunuchs.'), beadle: male(), 'brother-chaplain': male(),
  'brother-knight': male(), 'brother-sergeant': male(), bureaucrat: male(), 'cathedral-school-master': male(),
  'doctor-in-faculty': male('It is only available to male characters, with the exception of Doctors in Medicine who graduated from Salerno.'),
  eunuch: male('This Virtue is only available to male characters, who must be sexually incapable, rather than simply inactive.'),
  jurist: male('It is only available to male characters.'), knight: male(), 'magister-in-artibus': male(), mamluk: male(), 'mazdean-priest': male(),
  'mendicant-friar': male(), priest: male(), rabbi: { ...male(), requires: ['educated-hebrew'] }, 'rosh-beth-din': male(), 'templar-administrator': male(),
  'templar-commander': male('This Virtue includes the effects of the Brother-Knight Virtue, and likewise can only be taken by male characters.'),
  'brother-priest': male(), commander: male('This Virtue includes the effects of the Brother-Knight Virtue, and likewise can only be taken by male characters.'),
  'eunuch-flaw': male('This Flaw is only available to male characters.'),
  'castratus-flaw': male('This Flaw is only available to characters who were born with testicles.'),
  'male-guild-sponsor': {
    femaleOnly: true,
    restrictionText: 'This Virtue is only available to female characters. The character must select a separate guild Social Status Virtue as well.',
  },
  'paid-rights': { femaleOnly: true, restrictionText: 'This Virtue is only available to female characters.' },

  // ---------------------------------------------------------------- The Gift
  'holy-magic': { requiresGift: true, restrictionText: 'This Virtue is only available to characters with The Gift.' },
  'homunculus-wizard-flaw': { requiresGift: true, restrictionText: 'The character must have The Gift to take this Flaw.' },
  'amazon-sorceress': { requiresGift: true },
  'mechanica-of-heron': { requiresGift: true, needs: [ACADEMIC], restrictionText: 'The character with this Virtue must have The Gift and possess a Virtue that allows access to Academic Abilities.' },
  'unbearable-to-beings-flaw': { needs: [GIFT_OR_AIR], excludes: ['blatant-gift-flaw'], restrictionText: 'Only characters with The Gift or Magical Air may take this Flaw, and it cannot be combined with the Blatant Gift.' },
  'inoffensive-to-beings': { needs: [GIFT_OR_AIR], restrictionText: 'UnGifted characters may take this Virtue only if they have the Flaw Magical Air.' },
  'blatant-magical-air-flaw': { needs: [GIFT_OR_AIR], excludes: ['blatant-gift-flaw'], restrictionText: 'Only characters with a Magical Air or The Gift may take this Flaw; a character may not have both it and the Blatant Gift.' },
  'magical-air-flaw': { noGift: true, restrictionText: 'You may not take this Flaw if you actually do have The Gift; see The Blatant Gift instead.' },
  'failed-apprentice': { noGift: true, restrictionText: 'You may not have The Gift.' },
  'faerie-metamorphosis-flaw': {
    needs: [{ anyOf: ['$gift'], match: { category: 'Mythic Companion' }, label: 'The Gift, or a faerie equivalent such as a Mythic Companion Virtue' }],
    restrictionText: 'This Flaw can only be taken by characters with The Gift (as a Hermetic Flaw) or the faerie equivalent (as a Supernatural Flaw), such as a Mythic Companion Virtue.',
  },

  // ---------------------------------------------------------------- prerequisites
  'faerie-legacy': { needs: [FAERIE_BLOOD], restrictionText: 'This Virtue can only be taken by characters with Faerie Blood or Strong Faerie Blood.' },
  'faerie-heritage-flaw': { needs: [FAERIE_BLOOD], restrictionText: 'This Flaw can only be taken by characters with Faerie Blood or Strong Faerie Blood.' },
  'tamed-magic': { requires: ['mutantum-magic'], restrictionText: 'This virtue may only be taken by characters who also begin with Mutantum Magic.' },
  'demonic-might': { requires: ['demonic-blood'], restrictionText: 'You may only take this Virtue if your character has the Demonic Blood Virtue.' },
  'strong-angelic-heritage': { restrictionText: 'This Virtue may only be taken if you have the Major Virtue Blood of the Nephilim.' },
  'hermetic-empowerment': { requires: ['spell-binding'], restrictionText: 'This Virtue requires the Virtue Spell Binding as a prerequisite.' },
  'invocation-magic': { requires: ['names-of-power'], restrictionText: 'This Virtue requires the Virtue Names of Power as a prerequisite.' },
  'ascendancy-to-the-hall-of-heroes': { requires: ['hermetic-theurgy'], restrictionText: 'The Virtue requires the Hermetic Theurgy Virtue as a prerequisite.' },
  'the-greater-dream-grimoire': { requires: ['dream-magic'], restrictionText: 'This Virtue requires the Dream Magic Virtue.' },
  'philosophic-alchemy': { needs: [need(['vulgar-alchemy'], 'Hermetic Alchemy (Vulgar Alchemy)', { severity: 'warning' })], restrictionText: 'This Virtue requires Hermetic Alchemy as a prerequisite.' },
  'celestial-magic': { requires: ['planetary-magic'], restrictionText: 'This Virtue includes and replaces the benefits of Planetary Magic, which is a required prerequisite.' },
  shamash: { requires: ['educated-hebrew'], restrictionText: 'As a shamash, the character must have the Educated (Hebrew) Virtue.' },
  sofer: { requires: ['educated-hebrew'], restrictionText: 'As a sofer, the character must have the Educated (Hebrew) Virtue.' },
  gematria: { needs: [EDUCATED_HEBREW], restrictionText: 'It is only available to characters with the Education (Hebrew) Virtue.' },
  kabbalah: { needs: [EDUCATED_HEBREW], restrictionText: 'It is only available to characters with the Education (Hebrew) Virtue.' },
  merkavah: { needs: [EDUCATED_HEBREW], restrictionText: 'It is only available to characters with the Education (Hebrew) Virtue.' },
  'eremite-flaw': { needs: [TRUE_FAITH], restrictionText: 'You must have True Faith to take this Flaw.' },
  'non-traditional-flaw': { needs: [TRUE_FAITH], restrictionText: 'You must have True Faith to take this Flaw.' },
  'license-of-absence': { requires: ['priest'], excludes: ['senior-clergy'], restrictionText: 'A license of absence may only be taken by a character with the Priest Social Status. It may not be taken by Senior Clergy.' },
  'trained-assassin': { needs: [need(NIZARI, 'a Nizari Social Status (Fidai or Lasiq)')], restrictionText: 'This Virtue is only available to characters with one of the Social Status Virtues of the Nizaris.' },
  'rector-proctor-flaw': { needs: [need(UNIVERSITY, 'a university Social Status (student or master)')], restrictionText: 'The character must have a Social Status Virtue dictating his place within the university.' },
  'university-dean-flaw': {
    requires: ['doctor-in-faculty'], minAge: 40, excludes: ['poor-flaw'],
    restrictionText: 'The character must have the Virtue Doctor in (Faculty), be at least 40 years old, and can not have the Poor Flaw or any other Flaw that grants a Bad Reputation.',
  },
  'flawed-powers-flaw': {
    needs: [{ match: { category: 'Supernatural', size: 'Major', kind: 'virtue' }, label: 'a Major Supernatural Virtue' }],
    restrictionText: 'The character must have at least one Major Supernatural Virtue to take this Flaw.',
  },
  'broken-vessel-flaw': {
    needs: [need(['$supernaturalAbility', '$gift'], 'a Supernatural Ability or Art improved through experience')],
    restrictionText: 'Characters may only take this Flaw if they have at least one Supernatural Ability or Art normally improved through experience points.',
  },
  'physician-of-salerno': { needs: [ACADEMIC], restrictionText: 'To take this Virtue, you must be able to take Academic Abilities.' },
  'magic-items': { restrictionText: 'You must be a Redcap to take this Virtue.' },
  'feather-messenger': {
    needs: [need(['shapeshifter', 'skinchanger', 'heartbeast'], 'a way to take the form of a bird', { severity: 'warning' })],
    restrictionText: 'This Virtue is only available to a character who can take the form of a bird (which may be her natural form).',
  },

  // ---------------------------------------------------------------- Flaws a Virtue brings with it
  'mercurian-magic': {
    needs: [need(['ceremonial-spontaneous-magic-flaw'], 'the Minor Flaw Ceremonial Spontaneous Magic', { severity: 'warning', auto: { id: 'ceremonial-spontaneous-magic-flaw', size: 'Minor' } })],
    restrictionText: 'All known members of the Mercurian lineage also have the Minor Flaw Ceremonial Spontaneous Magic.',
  },
  'diedne-magic': {
    needs: [{ match: { category: 'Story', size: 'Major', kind: 'flaw' }, label: 'a Major Story Flaw such as Dark Secret, which gives no Virtue points', auto: { id: 'dark-secret-flaw', size: 'Major', noPoints: true } }],
    restrictionText: 'You must keep your lineage hidden from the Order, giving you a Major Story Flaw. This is in addition to your normal allowance of Flaws, and does not grant you any points.',
  },

  // ---------------------------------------------------------------- incompatible combinations
  'academic-concentration-subject': { restrictionText: 'This Virtue is incompatible with the Virtue Puissant Artes Liberales.' },
  'no-sense-of-direction-flaw': { excludes: ['well-traveled'] },
  'night-terrors-flaw': { excludes: ['sleep-disorder-flaw'] },
  'bound-magic-flaw': { excludes: ['harnessed-magic'] },
  'fettered-magic-flaw': { excludes: ['tethered-magic'] },
  'vulnerable-casting-flaw': { excludes: ['withstand-casting'] },
  'branded-criminal-flaw': { excludes: ['wealthy'] },
  'outcast-flaw': { excludes: ['wealthy'] },
  wealthy: { excludes: WEALTH_SETTING },
  'poor-flaw': { excludes: WEALTH_SETTING },

  // ---------------------------------------------------------------- Characteristics
  'supernatural-beauty': { minChar: { Pre: 1 }, restrictionText: 'A character lacking a positive Presence score may not have this Virtue.' },
  'envied-beauty-flaw': { minChar: { Pre: 1 }, restrictionText: 'A character lacking a positive Presence score may not have this Flaw.' },
  'uncontrollable-strength-flaw': { minChar: { Str: 0 }, restrictionText: "This Flaw may not be taken if the character's Strength is below 0." },
  'uninspirational-flaw': { maxChar: { Pre: 0, Com: 0 }, restrictionText: 'His Presence and Communication may not be greater than 0.' },

  // ---------------------------------------------------------------- choices (sub-options)
  'corrupted-arts-flaw': { param: { kind: 'art', label: 'Corrupted Arts', multiple: true } },
  'corrupted-abilities-flaw': { param: { kind: 'ability', label: 'Corrupted Abilities', multiple: true } },
  'corrupted-spells-flaw': { param: { kind: 'text', label: 'Corrupted spells (at least 30 levels)', optional: true } },
  'greater-purifying-touch': { param: { kind: 'text', label: 'Disease' } },
  'lesser-purifying-touch': { param: { kind: 'text', label: 'Illness' } },
  'folk-magic': {
    param: { kind: 'ability', label: '(Realm) Lore', options: ['magic-lore', 'faerie-lore', 'dominion-lore', 'infernal-lore'] },
    effects: [{ type: 'abilityAccess', abilities: ['$param'], note: 'The chosen (Realm) Lore, even without access to Arcane Abilities' }],
  },
  'life-linked-art': { param: { kind: 'text', label: 'Free Virtue', options: ['Affinity with (Craft or Profession)', 'Free Expression', 'Inspirational', 'Puissant (Craft or Profession)'] } },
  'fickle-nature-flaw': { param: { kind: 'text', label: 'Personality Trait (at +4, with its opposite at +4)' } },
  'demonic-weakness-flaw': { param: { kind: 'text', label: 'Weakness' } },
  'bound-to-role-role-flaw': { ...onlyTypes(['grog'], 'This Flaw may only be taken by grogs.'), param: { kind: 'text', label: 'Role' } },
  'hermetic-inclination-in-form': { param: { kind: 'form', label: 'Form', options: ['He', 'Im', 'Me', 'Te'] }, restrictionText: 'A Maestro, and only a maestro, may take this Virtue once, for a single Form.' },
  'mythic-characteristic': { param: { kind: 'characteristic', label: 'Characteristic' } },
  'tragic-characteristic-flaw': { param: { kind: 'characteristic', label: 'Characteristic' } },
  'vulnerable-to-form-flaw': { param: { kind: 'form', label: 'Form' }, repeatable: true },
  'realm-spirit-companion-flaw': { param: { kind: 'realm', label: 'Realm', options: ['Magic', 'Faerie', 'Divine', 'Infernal'] } },
  'magic-being-companion-flaw': { param: { kind: 'text', label: 'Magic being' } },
  'foe-art': { param: { kind: 'text', label: 'Foe' } },
};

function build(): Record<string, Mechanics> {
  const out: Record<string, Mechanics> = {};
  const put = (id: string, m: Mechanics) => (out[id] = { ...(out[id] ?? {}), ...m });
  for (const [beings, ids] of Object.entries(BEINGS)) for (const id of ids) put(id, { beings, creatureOnly: true });
  for (const [tradition, ids] of Object.entries(TRADITIONS)) for (const id of ids) put(id, { tradition });
  for (const [region, ids] of Object.entries(REGIONS)) for (const id of ids) put(id, { region });
  for (const [id, m] of Object.entries(EXPLICIT)) put(id, m);
  // The immune-to-(source) Virtue also needs its choice
  put('immune-to-source-of-damage', { param: { kind: 'text', label: 'Source of damage' } });
  return out;
}

export const RESTRICTIONS: Record<string, Mechanics> = build();

/** Extraction artifacts (summary tables caught as entries); hidden from the data. */
export const NOT_REAL_VF = new Set(['summary-of-new-flaws-flaw', 'summary-of-new-virtues', 'new-virtues-and-flaws-for-rhine-magi']);
