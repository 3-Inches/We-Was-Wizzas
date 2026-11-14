// The twelve Houses of Hermes and their character-creation benefits (DE p.43-44),
// plus the Ex Miscellanea traditions described in the Definitive Edition.

export type HouseType = 'True Lineage' | 'Mystery Cult' | 'Societas';

export interface HouseBenefitChoice {
  /** V&F id granted free */
  virtueId: string;
  label: string;
  param?: string;
}

export interface HouseDef {
  id: string;
  name: string;
  type: HouseType;
  description: string;
  benefitText: string;
  /** The free Minor Virtue options (player picks one). Empty = see special handling. */
  benefitOptions: HouseBenefitChoice[];
  /** Jerbiton: free choice among a list of minor virtues */
  freeChoiceFrom?: string[];
  /** Jerbiton: the Abilities that suit a free Virtue tied to one (Houses of Hermes: Societates, Free Virtue) */
  freeChoiceAbilities?: string[];
  exMiscellanea?: boolean;
  notes?: string[];
  domusMagna: string;
  primus?: string;
  tags: string[];
}

export const HOUSES: HouseDef[] = [
  {
    id: 'bjornaer', name: 'Bjornaer', type: 'Mystery Cult', domusMagna: 'Crintera',
    description: 'Magi who are animals as well as humans.',
    benefitText: 'Heartbeast (Outer Mystery), beginning score of 1 in the Heartbeast Ability.',
    benefitOptions: [{ virtueId: 'heartbeast', label: 'Heartbeast' }],
    notes: ['Bjornaer magi cannot bind familiars.', 'Casting in heartbeast form normally takes a –15 penalty (no words/gestures).'],
    tags: ['animals', 'wilderness', 'shapeshifting'],
  },
  {
    id: 'bonisagus', name: 'Bonisagus', type: 'True Lineage', domusMagna: 'Durenmar',
    description: 'Divided between researchers and politicians (Trianomae).',
    benefitText: 'Puissant Magic Theory (researchers) or Puissant Intrigue (politicians).',
    benefitOptions: [
      { virtueId: 'puissant-ability', label: 'Puissant Magic Theory (researcher)', param: 'magic-theory' },
      { virtueId: 'puissant-ability', label: 'Puissant Intrigue (Trianoma)', param: 'intrigue' },
    ],
    notes: ['A Bonisagus may claim any apprentice (DE p.270).', 'Obligated to share discoveries with the Order.'],
    tags: ['lab', 'research', 'politics'],
  },
  {
    id: 'criamon', name: 'Criamon', type: 'Mystery Cult', domusMagna: 'Cave of Twisting Shadows',
    description: 'Mystical philosophers and masters of riddles.',
    benefitText: 'The Enigma (Outer Mystery), beginning score of 1 in Enigmatic Wisdom.',
    benefitOptions: [{ virtueId: 'the-enigma', label: 'The Enigma' }],
    notes: ['Enigmatic Wisdom makes Twilight more likely but easier to comprehend.'],
    tags: ['twilight', 'philosophy'],
  },
  {
    id: 'ex-miscellanea', name: 'Ex Miscellanea', type: 'Societas', domusMagna: 'Cad Gadu',
    description: 'Many magi from different traditions, not all fully Hermetic.',
    benefitText: 'A free Minor Hermetic Virtue, a free Major non-Hermetic Virtue, and a compulsory Major Hermetic Flaw (all outside the normal allowance), representing the tradition.',
    benefitOptions: [],
    exMiscellanea: true,
    tags: ['hedge', 'tradition'],
  },
  {
    id: 'flambeau', name: 'Flambeau', type: 'Societas', domusMagna: 'Val-Negra (lost); Castra Solis',
    description: 'Martial masters of fire and destruction.',
    benefitText: 'Puissant Perdo or Puissant Ignem.',
    benefitOptions: [
      { virtueId: 'puissant-art', label: 'Puissant Perdo', param: 'Pe' },
      { virtueId: 'puissant-art', label: 'Puissant Ignem', param: 'Ig' },
    ],
    tags: ['combat', 'fire', 'destruction'],
  },
  {
    id: 'guernicus', name: 'Guernicus', type: 'True Lineage', domusMagna: 'Magvillus',
    description: 'Investigators, lawyers, and mediators (Quaesitores).',
    benefitText: 'Hermetic Prestige.',
    benefitOptions: [{ virtueId: 'hermetic-prestige', label: 'Hermetic Prestige' }],
    tags: ['law', 'investigation', 'politics'],
  },
  {
    id: 'jerbiton', name: 'Jerbiton', type: 'Societas', domusMagna: 'Valnastium',
    description: 'Nobles, scholars, and artists.',
    benefitText: 'A Minor Virtue relating to scholarship, arts, or mundane interaction.',
    benefitOptions: [],
    // the list in Houses of Hermes: Societates first, then others of the core book that fit the theme
    freeChoiceFrom: [
      'affinity-with-ability', 'apt-student', 'book-learner', 'cautious-with-ability', 'educated', 'enchanting-ability', 'free-expression',
      'good-teacher', 'gossip', 'inspirational', 'learn-ability-from-mistakes', 'light-touch', 'long-winded', 'piercing-gaze',
      'privileged-upbringing', 'protection', 'puissant-ability', 'social-contacts', 'temporal-influence', 'troupe-upbringing',
      'true-love-pc', 'venus-blessing', 'well-traveled',
      'linguist', 'aristotelian-training', 'academic-concentration-subject', 'knows-people', 'natural-leader', 'arcane-lore',
      'student-of-realm', 'clear-thinker', 'mystical-choreography', 'performance-magic',
    ],
    freeChoiceAbilities: [
      'area-lore', 'artes-liberales', 'bargain', 'carouse', 'charm', 'civil-and-canon-law', 'common-law', 'craft-type', 'dead-language',
      'enchanting-ability', 'etiquette', 'folk-ken', 'guile', 'infernal-lore', 'intrigue', 'leadership', 'legerdemain', 'living-language',
      'magic-lore', 'music', 'organization-lore', 'philosophiae', 'profession-type', 'theology-christian', 'theology-islam', 'theology-judaism',
    ],
    tags: ['social', 'scholar', 'art', 'mundane'],
  },
  {
    id: 'mercere', name: 'Mercere', type: 'True Lineage', domusMagna: 'Harco',
    description: 'Messengers of the Order (Redcaps).',
    benefitText: 'Puissant Creo or Puissant Muto. UnGifted Redcaps are companions with the Redcap Major Social Status instead.',
    benefitOptions: [
      { virtueId: 'puissant-art', label: 'Puissant Creo', param: 'Cr' },
      { virtueId: 'puissant-art', label: 'Puissant Muto', param: 'Mu' },
    ],
    tags: ['travel', 'messenger'],
  },
  {
    id: 'merinita', name: 'Merinita', type: 'Mystery Cult', domusMagna: 'Irencillia',
    description: 'Faerie magi.',
    benefitText: 'Faerie Magic (Outer Mystery), beginning score of 1 in Faerie Magic. Without a faerie-related Virtue or Flaw the magus starts with 1 Warping Point.',
    benefitOptions: [{ virtueId: 'faerie-magic', label: 'Faerie Magic' }],
    notes: ['Attuned to both Magic and Faerie auras.', 'Gains special Ranges/Durations/Targets: Road, Bargain, Fire, Until (Condition), Year+1, Bloodline.', 'Charms: +2 Penetration multiplier with an Arcane Connection (roll 6+ temporary, 9+ permanent).'],
    tags: ['faerie'],
  },
  {
    id: 'tremere', name: 'Tremere', type: 'True Lineage', domusMagna: 'Coeris',
    description: 'A hierarchical and disciplined House.',
    benefitText: 'Minor Magical Focus (Certamen).',
    benefitOptions: [{ virtueId: 'minor-magical-focus', label: 'Minor Magical Focus (Certamen)', param: 'Certamen' }],
    tags: ['certamen', 'politics', 'discipline'],
  },
  {
    id: 'tytalus', name: 'Tytalus', type: 'Societas', domusMagna: 'Fengheld',
    description: 'Magi who thrive on conflict of any sort.',
    benefitText: 'Self-Confident.',
    benefitOptions: [{ virtueId: 'self-confident', label: 'Self-Confident' }],
    tags: ['conflict', 'mentem', 'social'],
  },
  {
    id: 'verditius', name: 'Verditius', type: 'Mystery Cult', domusMagna: 'Verdi',
    description: 'Crafters of enchanted items.',
    benefitText: 'Verditius Magic (Outer Mystery).',
    benefitOptions: [{ virtueId: 'verditius-magic', label: 'Verditius Magic' }],
    notes: [
      'Needs casting tools for Formulaic/Ritual spells.',
      'Adds Philosophiae to Shape & Material bonuses when crafting the item (still capped by Magic Theory).',
      'Adds relevant Craft score to Lab Totals enchanting items they crafted; reduces opening vis by Craft (min 1).',
    ],
    tags: ['enchanting', 'craft', 'lab'],
  },
];

/** Common heartbeasts for a Bjornaer (HoH: Mystery Cults lists many more): one mundane creature, usually a noble one. */
export const HEARTBEASTS = ['wolf', 'bear', 'boar', 'stag', 'raven', 'owl', 'fox', 'badger', 'hawk', 'otter', 'lynx', 'eagle', 'horse', 'hare', 'wildcat', 'beaver'];

export const HOUSE_BY_ID: Record<string, HouseDef> = Object.fromEntries(HOUSES.map((h) => [h.id, h]));

/**
 * Virtues and Flaws that suit each House (with a suggested choice where they take one). Used for
 * recommendations and for the "House" tag and filter in the Virtue list.
 */
export const HOUSE_SUGGESTED_VF: Record<string, [string, string?][]> = {
  bonisagus: [['inventive-genius'], ['affinity-with-ability', 'magic-theory'], ['book-learner'], ['good-teacher']],
  flambeau: [['affinity-with-art', 'Ig'], ['affinity-with-art', 'Pe'], ['fast-caster'], ['flawless-magic'], ['puissant-ability', 'penetration'], ['tough']],
  guernicus: [['clear-thinker'], ['puissant-ability', 'code-of-hermes'], ['piercing-gaze'], ['strong-willed']],
  jerbiton: [['gentle-gift'], ['educated'], ['free-expression'], ['social-contacts']],
  mercere: [['well-traveled'], ['affinity-with-art', 'Re'], ['wilderness-sense']],
  merinita: [['faerie-blood'], ['second-sight'], ['affinity-with-art', 'Mu'], ['inoffensive-to-beings', 'faeries']],
  tremere: [['puissant-art', 'Vi'], ['affinity-with-art', 'Vi'], ['self-confident'], ['strong-willed']],
  tytalus: [['puissant-art', 'Me'], ['affinity-with-art', 'Me'], ['strong-willed']],
  verditius: [['inventive-genius'], ['puissant-ability', 'craft-type'], ['affinity-with-ability', 'magic-theory'], ['adept-laboratory-student']],
  bjornaer: [['puissant-ability', 'heartbeast'], ['affinity-with-art', 'An'], ['wilderness-sense']],
  criamon: [['affinity-with-ability', 'enigmatic-wisdom'], ['strong-willed'], ['clear-thinker']],
  'ex-miscellanea': [['cautious-sorcerer'], ['inventive-genius']],
};

export interface ExMiscTradition {
  id: string;
  name: string;
  majorNonHermetic: string; // V&F id
  majorParam?: string;
  minorHermetic: string;
  /** the choice the Minor Hermetic Virtue takes (an Art, a focus, a circumstance) */
  minorParam?: string;
  majorHermeticFlaw: string;
  majorHermeticFlawParam?: string;
  /** Virtues the tradition's magi must also have, at their usual cost */
  required?: { id: string; param?: string }[];
  /** Flaws they must also have, which give their points as usual */
  requiredFlaws?: { id: string; param?: string; size?: 'Minor' | 'Major' }[];
  notes?: string;
  source: string;
}

export const EX_MISC_TRADITIONS: ExMiscTradition[] = [
  {
    id: 'beast-masters', name: 'Beast Masters',
    majorNonHermetic: 'summon-animals', minorHermetic: 'inoffensive-to-beings', minorParam: 'animals', majorHermeticFlaw: 'study-requirement-flaw',
    required: [{ id: 'animal-ken' }, { id: 'minor-magical-focus', param: 'a group of animals (to be chosen)' }], requiredFlaws: [{ id: 'incompatible-arts-flaw', param: 'MuCo and PeAn' }],
    notes: 'Summon and command wild creatures. Also Animal Ken and a Minor Magical Focus in a group of animals; never taught to take animal form or to harm animals (Incompatible Arts: MuCo and PeAn).',
    source: 'DE',
  },
  {
    id: 'nemthengacha', name: 'Nemthengacha',
    majorNonHermetic: 'embitterment', minorHermetic: 'subtle-magic', majorHermeticFlaw: 'deficient-technique-flaw', majorHermeticFlawParam: 'Re',
    notes: 'Poison-tongues who turn listeners against one another. Deficient Technique (Rego).',
    source: 'DE',
  },
  {
    id: 'tempestaria', name: 'Tempestaria (Weather Witch)',
    majorNonHermetic: 'whistle-up-the-wind', minorHermetic: 'affinity-with-art', minorParam: 'Au', majorHermeticFlaw: 'necessary-condition-flaw', majorHermeticFlawParam: 'tools with a sympathy to the spell (feathers, a drum, scattered sand)',
    notes: 'Weather witches of the Saxon lands. Affinity with Auram; their magic needs simple tools.',
    source: 'DE',
  },
  // Houses of Hermes: Societates, House Ex Miscellanea
  {
    id: 'columbae', name: 'Columbae',
    majorNonHermetic: 'warding', minorHermetic: 'ring-circle-magic', majorHermeticFlaw: 'necessary-condition-flaw', majorHermeticFlawParam: 'the target must be marked',
    notes: 'The “pigeons”, warding wizards whose craft gave Hermetic magic its wards.',
    source: 'HoH_S',
  },
  {
    id: 'damhadh-duidsan', name: 'Damhadh-Duidsan',
    majorNonHermetic: 'giant-blood', minorHermetic: 'puissant-art', minorParam: 'Co', majorHermeticFlaw: 'necessary-condition-flaw', majorHermeticFlawParam: 'runes carved or drawn',
    notes: 'Gaelic rune-writers who curse and heal with Ogam. Giant Blood is common; Shapeshifter or Incantation (Realms of Power: The Infernal) in its place for some.',
    source: 'HoH_S',
  },
  {
    id: 'donatores', name: 'Donatores Requietis Aeternae',
    majorNonHermetic: 'banishing', minorHermetic: 'minor-magical-focus', minorParam: 'spirits and ghosts', majorHermeticFlaw: 'restriction-flaw', majorHermeticFlawParam: 'on consecrated ground',
    notes: 'Givers of eternal rest, who lay the dead. The focus may be the animated dead (Corpus) instead.',
    source: 'HoH_S',
  },
  {
    id: 'haruspexes', name: 'Hermetic Haruspexes',
    majorNonHermetic: 'divination-and-augury', minorHermetic: 'affinity-with-art', minorParam: 'In', majorHermeticFlaw: 'twilight-prone-flaw',
    notes: 'Keepers of the Etruscan Art: omens read in the entrails of sacrifices. Often Premonitions or Visions.',
    source: 'HoH_S',
  },
  {
    id: 'karaites', name: 'Karaites',
    majorNonHermetic: 'holy-magic', minorHermetic: 'craft-amulets', majorHermeticFlaw: 'karaite-magic-flaw',
    requiredFlaws: [{ id: 'outsider-flaw', param: 'Jew', size: 'Major' }],
    notes: 'Jewish holy magi who read the scriptures alone (Realms of Power: The Divine). Holy Magic stands as the tradition\'s Major Virtue, and Outsider (Major, Jew) is required.',
    source: 'RoP_D',
  },
  {
    id: 'malocchi', name: 'Malocchi',
    majorNonHermetic: 'entrancement', minorHermetic: 'special-circumstances', minorParam: 'eye contact', majorHermeticFlaw: 'weak-magic-resistance-flaw', majorHermeticFlawParam: 'when someone stands on their shadow',
    required: [{ id: 'piercing-gaze' }],
    notes: 'Italian magi of the evil eye. Piercing Gaze is required.',
    source: 'HoH_S',
  },
  {
    id: 'pharmacopoeians', name: 'Pharmacopoeians',
    majorNonHermetic: 'mythic-herbalism', minorHermetic: 'root-cutter', majorHermeticFlaw: 'deficient-technique-flaw', majorHermeticFlawParam: 'Pe',
    notes: 'Herbalists and root-cutters, healers before all else. Deficient Technique (Perdo).',
    source: 'HoH_S',
  },
  {
    id: 'pralicians', name: 'The Lineage of Pralix',
    majorNonHermetic: 'comprehend-magic', minorHermetic: 'minor-magical-focus', minorParam: 'exotic (non-Hermetic) magic', majorHermeticFlaw: 'weak-magic-resistance-flaw', majorHermeticFlawParam: 'against a caster not yet analyzed with Comprehend Magic',
    notes: 'Students of other traditions’ magic, who bring hedge wizards into the Order.',
    source: 'HoH_S',
  },
  {
    id: 'rustic-magi', name: 'Rustic Magi',
    majorNonHermetic: 'craft-magic', minorHermetic: 'spell-foci', majorHermeticFlaw: 'weak-spontaneous-magic-flaw',
    notes: 'Craftsmen-wizards who work magic through the things they make.',
    source: 'HoH_S',
  },
  {
    id: 'hermetic-sahirs', name: 'Hermetic Sahirs',
    majorNonHermetic: 'sihr', minorHermetic: 'minor-magical-focus', minorParam: 'jinn', majorHermeticFlaw: 'twilight-prone-flaw',
    notes: 'Summoners of the jinn from the Arabic tradition.',
    source: 'HoH_S',
  },
  {
    id: 'custom', name: 'Other tradition (choose freely)',
    majorNonHermetic: '', minorHermetic: '', majorHermeticFlaw: '',
    notes: 'Houses of Hermes: Societates describes more (Seirenes, the Cult of Orpheus, the Witches of Thessaly), and a tradition may be your own. Choose any Major non-Hermetic Virtue that shows the tradition, a Minor Hermetic Virtue, and a Major Hermetic Flaw.',
    source: 'HoH_S',
  },
];
