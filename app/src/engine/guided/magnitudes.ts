// How big an edge a Virtue or Flaw gives on the Totals a player rates (Casting, Lab, Penetration,
// spontaneous magic, progression), so options are ranked against the others that move the same
// Total rather than by seasons saved. Each also carries a very short note of what it does, used
// at the end of questions and in the shortlist. Archetypes link Virtues that only make sense for
// one kind of character (Elemental Magic for an elementalist) to a question about that kind.

/** Rough points on the Total in a typical use (negative for Flaws); `xp` is progression on a 0-10 scale. */
export interface Magnitude {
  casting?: number;
  lab?: number;
  spont?: number;
  penetration?: number;
  'lab-invent'?: number;
  'lab-texts'?: number;
  'lab-enchant'?: number;
  xp?: number;
  /** a very short note on what it does */
  note: string;
}

export const MAGNITUDES: Record<string, Magnitude> = {
  // casting
  'life-boost': { casting: 10, penetration: 10, note: '+5 per Fatigue level spent, even into Wounds' },
  'major-magical-focus': { casting: 10, lab: 10, note: 'lowest Art added twice, in a broad area' },
  'minor-magical-focus': { casting: 8, lab: 8, note: 'lowest Art added twice, in a narrow area' },
  'potent-magic': { casting: 3, lab: 3, note: 'a bonus in a narrow field; stacks with a Focus' },
  'puissant-art': { casting: 3, lab: 3, note: '+3 to one Art' },
  'method-caster': { casting: 3, note: '+3 to Formulaic and Ritual casting' },
  'special-circumstances': { casting: 2, note: '+3 to casting in an uncommon situation' },
  'cyclic-magic-positive': { casting: 2, lab: 2, note: '+3 at one time of a cycle' },
  'mythic-blood': { casting: 2, note: 'no Fatigue on near misses; Rituals cost 3 Fatigue less' },
  'affinity-with-art': { casting: 2, lab: 2, xp: 5, note: 'one Art learned 1½ times as fast' },
  'fast-caster': { casting: 1, note: '+3 Initiative and fast-casting speed' },
  // spontaneous magic
  'diedne-magic': { spont: 6, note: 'unfatiguing spontaneous spells divided by 2, not 5' },
  'life-linked-spontaneous-magic': { spont: 8, penetration: 6, note: 'spontaneous spells at a chosen level, paid in Fatigue' },
  'spell-improvisation': { spont: 3, note: 'a similar spell’s magnitude added to spontaneous casting' },
  // lab
  'inventive-genius': { lab: 3, 'lab-invent': 6, note: '+3 inventing, +3 more when experimenting' },
  'adept-laboratory-student': { 'lab-texts': 6, note: '+6 learning from lab texts' },
  'verditius-magic': { 'lab-enchant': 5, note: 'Craft adds to enchanting' },
  // progression
  'elemental-magic': { xp: 10, note: 'studying one element teaches the other three half as much' },
  'secondary-insight': { xp: 6, note: 'studying an Art also teaches its neighbours' },
  'skilled-parens': { xp: 5, note: '+60 xp and 30 spell levels at creation' },
  'book-learner': { xp: 3, note: '+3 Quality from books' },
  'apt-student': { xp: 3, note: '+5 Quality from teachers' },
  'free-study': { xp: 3, note: '+3 Quality studying vis' },
  'independent-study': { xp: 3, note: '+2 practice, +3 adventure Quality' },
  'study-bonus': { xp: 2, note: '+2 Quality from books and vis' },
  'mastered-spells': { xp: 2, note: '50 xp of spell Mastery' },
  'affinity-with-ability': { xp: 3, note: 'one Ability learned 1½ times as fast' },
  // Flaws
  'deficient-form-flaw': { casting: -8, lab: -8, note: 'halves totals with one Form' },
  'deficient-technique-flaw': { casting: -10, lab: -10, note: 'halves totals with one Technique' },
  'short-ranged-magic-flaw': { casting: -8, lab: -4, note: 'halves casting beyond Touch' },
  'cyclic-magic-negative-flaw': { casting: -2, lab: -2, note: '−3 at one time of a cycle' },
  'weak-magic-flaw': { penetration: -8, note: 'halves Penetration' },
  'creative-block-flaw': { 'lab-invent': -3, note: '−3 inventing' },
  'unimaginative-learner-flaw': { xp: -3, note: '−3 studying vis' },
  'restriction-flaw': { note: 'no casting at all in one uncommon condition' },
  'necessary-condition-flaw': { note: 'must perform an action to cast at all' },
};

/** The Totals a magnitude is ranked on, with their labels. */
export const RANKED_TOTALS: { tag: keyof Omit<Magnitude, 'note'>; label: string }[] = [
  { tag: 'casting', label: 'Casting Totals' },
  { tag: 'spont', label: 'Spontaneous magic' },
  { tag: 'penetration', label: 'Penetration' },
  { tag: 'lab', label: 'Lab Totals' },
  { tag: 'lab-invent', label: 'Inventing spells' },
  { tag: 'lab-texts', label: 'Learning from lab texts' },
  { tag: 'lab-enchant', label: 'Enchanting' },
  { tag: 'xp', label: 'Progression' },
];

/** Extra links for this-or-that questions: what kind of narrowness, steady or swinging magic. */
export const CHOICE_LINKS: Record<string, [string, number][]> = {
  'puissant-art': [['one-art', 3]],
  'affinity-with-art': [['one-art', 3]],
  'major-magical-focus': [['focus', 3]],
  'minor-magical-focus': [['focus', 3]],
  'potent-magic': [['focus', 2]],
  'deficient-form-flaw': [['trade-off', 3]],
  'deficient-technique-flaw': [['trade-off', 3]],
  'restriction-flaw': [['trade-off', 3]],
  'necessary-condition-flaw': [['trade-off', 2]],
  'cyclic-magic-positive': [['swingy', 3]],
  'cyclic-magic-negative-flaw': [['swingy', 3]],
  'special-circumstances': [['swingy', 2]],
};

export interface Archetype {
  id: string;
  name: string;
  blurb: string;
  /** Virtues and Flaws that suit it, with how strongly */
  vf: [string, number][];
  /** what else the archetype wants (question tags) */
  tags: Record<string, number>;
  /** the Concept step's theme that pre-sets it */
  preset?: string;
}

export const ARCHETYPES: Archetype[] = [
  { id: 'elementalist', name: 'Elementalist', blurb: 'commands fire, air, water and earth as one', vf: [['elemental-magic', 3], ['major-magical-focus', 1]], tags: { 'art:Ig': 0.3, 'art:Au': 0.3, 'art:Aq': 0.3, 'art:Te': 0.3 }, preset: 'elemental' },
  { id: 'shapeshifter', name: 'Shapeshifter', blurb: 'takes the shapes of beasts', vf: [['heartbeast', 3], ['shapeshifter', 3], ['skinchanger', 2], ['deft-form', 1]], tags: { shapechanged: 0.5, 'art:An': 0.3 }, preset: 'beast' },
  { id: 'healer', name: 'Healer', blurb: 'mends bodies and cures ills', vf: [['minor-magical-focus', 2], ['major-magical-focus', 1]], tags: { healing: 0.5, 'art:Cr': 0.3, 'art:Co': 0.3 }, preset: 'healer' },
  { id: 'enchanter', name: 'Enchanter', blurb: 'fills the covenant with magic items', vf: [['verditius-magic', 3], ['magic-items', 2], ['inventive-genius', 1]], tags: { 'lab-enchant': 0.5, crafts: 0.3 }, preset: 'enchanter' },
  { id: 'improviser', name: 'Improviser', blurb: 'makes up spells on the spot rather than learning them', vf: [['diedne-magic', 3], ['life-linked-spontaneous-magic', 3], ['spell-improvisation', 2]], tags: { spont: 0.5, flexible: 0.3 } },
  { id: 'ritualist', name: 'Ritualist', blurb: 'works great, slow ceremonies with vis and other magi', vf: [['mercurian-magic', 3], ['mythic-blood', 1]], tags: { ritual: 0.5, vis: 0.3 } },
  { id: 'duelist', name: 'Battle magus', blurb: 'wins magical fights: fast, hard-hitting spells that get through', vf: [['life-boost', 3], ['fast-caster', 2], ['mythic-blood', 1]], tags: { speed: 0.3, penetration: 0.5 }, preset: 'battle-mage' },
  { id: 'faerie-wizard', name: 'Faerie wizard', blurb: 'learns magic from the fae and works it their way', vf: [['faerie-magic', 2], ['faerie-raised-magic', 3]], tags: { 'realm:faerie': 0.5 }, preset: 'faerie' },
  { id: 'spirit-master', name: 'Spirit master', blurb: 'sees and deals with ghosts and spirits', vf: [['second-sight', 2], ['spirit-familiar', 2]], tags: { 'art:Me': 0.3, senses: 0.5 }, preset: 'mystic' },
];

/**
 * What each House is about, beyond its free Virtue: the answers that should point to it. A House's
 * free Virtue alone is a poor guide (Tremere's Certamen focus is a narrow bonus; Criamon's Enigma
 * is about Twilight whether you embrace it or fear it).
 */
export const HOUSE_IDENTITY: Record<string, Record<string, number>> = {
  bjornaer: { shapechanged: 3, animals: 2, 'arch:shapeshifter': 3, 'art:An': 1, outdoors: 1 },
  bonisagus: { 'lab-invent': 3, lab: 2, experiment: 2, teaching: 1, politics: 1 },
  criamon: { twilight: 3, mystery: 3, visions: 2, outsider: 1, scholarship: 1, temperament: 1 },
  'ex-miscellanea': { outsider: 2, 'realm:magic': 1, complexity: 1, 'realm:faerie': 0.5 },
  flambeau: { combat: 2, penetration: 2, speed: 1, 'arch:duelist': 3, 'art:Pe': 1, 'art:Ig': 1, 'realm:infernal': 1, rival: 1 },
  guernicus: { investigation: 3, politics: 2, order: 2, duty: 1 },
  jerbiton: { 'realm:mundane': 2, nobility: 2, social: 2, performance: 2, crafts: 1, church: 1 },
  mercere: { travel: 3, order: 2, politics: 1, wealth: 1 },
  merinita: { 'realm:faerie': 3, 'arch:faerie-wizard': 3, mystery: 2, courts: 1, outdoors: 1 },
  tremere: { politics: 2, leadership: 2, order: 1, duty: 1, rival: 1 },
  tytalus: { rival: 2, confidence: 2, politics: 1, vice: 1, temperament: 1 },
  verditius: { 'lab-enchant': 3, crafts: 3, 'arch:enchanter': 3, mystery: 1 },
};

/** Tags where a strong answer either way points to the House (Criamon embraces or masters Twilight). */
export const HOUSE_EITHER_WAY: Record<string, string[]> = { criamon: ['twilight'] };

/** How much of a House Virtue's usual worth applies: Tremere's Focus covers only Certamen. */
export const HOUSE_BENEFIT_SCALE: Record<string, number> = { tremere: 0.35 };
