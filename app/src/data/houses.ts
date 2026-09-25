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
    freeChoiceFrom: [
      'educated', 'free-expression', 'privileged-upbringing', 'social-contacts', 'temporal-influence',
      'venus-blessing', 'puissant-ability', 'affinity-with-ability', 'book-learner', 'good-teacher',
      'inspirational', 'gossip', 'well-traveled', 'clear-thinker', 'linguist', 'aristotelian-training',
      'academic-concentration-subject', 'knows-people', 'natural-leader', 'student-of-realm', 'arcane-lore',
      'mystical-choreography', 'performance-magic', 'subtle-magic', 'quiet-magic', 'gentleman-woman',
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

export const HOUSE_BY_ID: Record<string, HouseDef> = Object.fromEntries(HOUSES.map((h) => [h.id, h]));

export interface ExMiscTradition {
  id: string;
  name: string;
  majorNonHermetic: string; // V&F id
  minorHermetic: string;
  majorHermeticFlaw: string;
  majorHermeticFlawParam?: string;
  required?: string[];
  requiredFlaws?: string[];
  notes?: string;
  source: string;
}

export const EX_MISC_TRADITIONS: ExMiscTradition[] = [
  {
    id: 'beast-masters', name: 'Beast Masters',
    majorNonHermetic: 'summon-animals', minorHermetic: 'inoffensive-to-beings', majorHermeticFlaw: 'study-requirement-flaw',
    required: ['animal-ken', 'minor-magical-focus'], requiredFlaws: ['incompatible-arts-flaw'],
    notes: 'Inoffensive to Animals. Required: Animal Ken, Minor Magical Focus (a group of animals); Incompatible Arts (MuCo & PeAn).',
    source: 'DE',
  },
  {
    id: 'nemthengacha', name: 'Nemthengacha',
    majorNonHermetic: 'embitterment', minorHermetic: 'subtle-magic', majorHermeticFlaw: 'deficient-technique-flaw', majorHermeticFlawParam: 'Re',
    notes: 'Deficient Technique (Rego).',
    source: 'DE',
  },
  {
    id: 'tempestaria', name: 'Tempestaria (Weather Witch)',
    majorNonHermetic: 'whistle-up-the-wind', minorHermetic: 'affinity-with-art', majorHermeticFlaw: 'necessary-condition-flaw',
    notes: 'Affinity with Auram; Necessary Condition (tools for their magic).',
    source: 'DE',
  },
  {
    id: 'custom', name: 'Other tradition (choose freely)',
    majorNonHermetic: '', minorHermetic: '', majorHermeticFlaw: '',
    notes: 'Houses of Hermes: Societates describes many more traditions. Choose any Major non-Hermetic Virtue, Minor Hermetic Virtue, and Major Hermetic Flaw.',
    source: 'HoH_S',
  },
];
