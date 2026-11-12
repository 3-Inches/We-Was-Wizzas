// Realms of Power: The Divine, as data: the holy Methods and Powers and their guidelines, the
// tragedies of hubris, miracles, invoking God's aid, the saints and holy forbears, tempers, holy
// traditions, Holy Magic's Ranges, Durations and Targets, the commanding aura, the Rings of Solomon,
// and the Virtues and Abilities the extracted lists lack. Engine: engine/holy.ts.

import type { AbilityDef, Characteristic, VirtueFlawDef } from './types';

// ------------------------------------------------------------------------------------------------
// Methods and Powers (Blessed by God, Miraculous Effects)

/** The three Methods; a Jewish or musical Method works as one of them. */
export type MethodKind = 'invocation' | 'meditation' | 'purity';

export interface HolyMethod {
  /** its Ability's id */
  id: string;
  name: string;
  /** the Method it works as */
  as: MethodKind;
  /** the Characteristic added to the effect total */
  char: Characteristic;
  /** what the character does before the die is rolled */
  activation: string;
}

const INVOKE = 'Cry the prayer out in a loud voice, or write it, and spend a Confidence (or Faith) Point. A stress die may be rolled instead of a simple one: commanding rather than entreating God’s aid.';
const MEDITATE = 'About an hour of chanting or focus on a performance: a Stamina roll against 6 every ten minutes (a failure loses a Fatigue level, a botch ends it), and a Concentration roll if distracted.';
const PURIFY = 'Fasting, vigil or other deprivation hard enough to lose a long-term Fatigue level or take a Light Wound. The ritual may be repeated before rolling, each time spending Confidence anew.';

export const HOLY_METHODS: HolyMethod[] = [
  { id: 'invocation', name: 'Invocation', as: 'invocation', char: 'Com', activation: INVOKE },
  { id: 'meditation', name: 'Meditation', as: 'meditation', char: 'Int', activation: MEDITATE },
  { id: 'purity', name: 'Purity', as: 'purity', char: 'Sta', activation: PURIFY },
  { id: 'holy-music', name: 'Holy Music', as: 'meditation', char: 'Pre', activation: 'Sing a devotional song (Presence + Music against an Ease Factor the circumstances set), a Concentration roll if distracted; Presence counts for the effect.' },
  { id: 'dream-interpretation', name: 'Dream Interpretation', as: 'meditation', char: 'Int', activation: 'An hour of ritual prayer, a full night of restful sleep, then (6 − Dream Interpretation, at least 1) hours contemplating the dream.' },
  { id: 'gematria', name: 'Gematria', as: 'meditation', char: 'Int', activation: '(12 − Gematria, at least 1) hours studying a text; the lower of Gematria and the book’s Quality counts as the Method. A book other than the Torah needs a stress die; not a book on an Art or an Accelerated Ability.' },
  { id: 'kabbalah', name: 'Kabbalah', as: 'invocation', char: 'Com', activation: INVOKE },
  { id: 'merkavah', name: 'Merkavah', as: 'purity', char: 'Sta', activation: PURIFY },
];

export interface HolyPower {
  id: string;
  name: string;
  methods: MethodKind[];
  text: string;
  /** what a tragedy of hubris with it tends to be */
  tragedy: string;
}

export const HOLY_POWERS: HolyPower[] = [
  { id: 'adjuration', name: 'Adjuration', methods: ['invocation', 'purity'], text: 'Summon, control and banish supernatural creatures, dispel their powers, witness oaths. Invocation compels; Purity binds or protects.', tragedy: 'The target is angered, freed or summoned, or the caster made more vulnerable.' },
  { id: 'blessing', name: 'Blessing', methods: ['invocation', 'meditation'], text: 'Aid and protect by dedicating to God. Invocation draws supernatural aid; Meditation nurtures by natural means. One always under a blessing gains a Warping Point a year.', tragedy: 'Warping Points or Flaws.' },
  { id: 'cursing', name: 'Cursing', methods: ['invocation', 'purity'], text: 'Bring ruin on God’s enemies. Invocation removes God’s protection for a while; Purity destroys at once.', tragedy: 'The curse falls on the caster instead.' },
  { id: 'intervention', name: 'Intervention', methods: ['meditation', 'purity'], text: 'God’s will worked on the world directly: apparitions through Meditation, the body or matter changed and perfected through Purity. It marks all who see it.', tragedy: 'Frightening visions, madness, or unwanted attention from supernatural beings.' },
  { id: 'transcendence', name: 'Transcendence', methods: ['meditation', 'purity'], text: 'Overcome the body’s limits: the spirit travels (Meditation) or the body is strengthened from the other world (Purity). Too long away may Warp.', tragedy: 'Trapped in the spiritual world, aged, wounded, or memories lost.' },
  { id: 'understanding', name: 'Understanding', methods: ['meditation'], text: 'Visions of the Divine plan and the future: hard to read, less clear the more a subject is asked about.', tragedy: 'False, harmful or abusive information; painful memories; secrets one did not want.' },
  { id: 'wonders', name: 'Wonders', methods: ['invocation'], text: 'Conjure living creatures, things and forces of nature by God’s name; God keeps His hand on them.', tragedy: 'Unwanted things (rotten food, vermin, mud), or the effect out of control.' },
];

/** Which Method works with which Power. */
export const METHOD_POWERS: Record<MethodKind, string[]> = {
  invocation: ['adjuration', 'blessing', 'cursing', 'wonders'],
  meditation: ['blessing', 'intervention', 'transcendence', 'understanding'],
  purity: ['adjuration', 'cursing', 'intervention', 'transcendence'],
};

export interface HolyGuideline {
  power: string;
  method: MethodKind;
  /** its level; for a general guideline, the level the player picks (the lowest that does anything) */
  level: number;
  general?: boolean;
  text: string;
  /** a general guideline: what it gives at a level */
  gives?: (level: number) => string;
}

const mag = (level: number) => Math.max(1, Math.ceil(level / 5));
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** The guidelines for the seven Powers, in the book's order. */
export const HOLY_GUIDELINES: HolyGuideline[] = [
  // Adjuration
  { power: 'adjuration', method: 'purity', level: 1, general: true, text: 'Dispel magic, infernal or faerie effects of level less than (this effect’s level + 10).', gives: (l) => `dispels effects below level ${l + 10}` },
  { power: 'adjuration', method: 'purity', level: 1, general: true, text: 'Keep a supernatural creature with Might less than (the level + 10) from crossing a clearly defined circle or affecting those on the other side.', gives: (l) => `holds back Might below ${l + 10}` },
  { power: 'adjuration', method: 'purity', level: 1, general: true, text: 'Protect a target against all supernatural creatures with Might of (the level + 10) and their powers.', gives: (l) => `protects against Might ${l + 10}` },
  { power: 'adjuration', method: 'invocation', level: 4, text: 'Bind a supernatural creature to the terms of a contract.' },
  { power: 'adjuration', method: 'purity', level: 4, text: 'Create a temporary holy connection to a person or thing within range.' },
  { power: 'adjuration', method: 'invocation', level: 5, text: 'Compel a supernatural creature within range to manifest in your presence.' },
  { power: 'adjuration', method: 'purity', level: 5, text: 'Drive away a non-divine supernatural creature: it cannot stand your presence nor return for the Duration.' },
  { power: 'adjuration', method: 'invocation', level: 10, text: 'Compel a supernatural creature to answer one question honestly, even a demon.' },
  { power: 'adjuration', method: 'purity', level: 10, text: 'Open a spiritual portal to a supernatural being within range: you see and hear each other.' },
  { power: 'adjuration', method: 'invocation', level: 15, text: 'Compel a supernatural creature to obey one command exactly for the Duration.' },
  { power: 'adjuration', method: 'purity', level: 15, text: 'Ward the target against all non-divine supernatural creatures.' },
  { power: 'adjuration', method: 'invocation', level: 20, text: 'Compel a mundane creature to do your bidding, as above.' },
  { power: 'adjuration', method: 'invocation', level: 25, text: 'Compel a human being to do your bidding, within the person’s nature (Personality Traits).' },
  // Blessing
  { power: 'blessing', method: 'invocation', level: 1, general: true, text: 'Give a person, object or area Magic Resistance equal to (the level + 15), not cumulative with other resistance.', gives: (l) => `Magic Resistance ${l + 15}` },
  { power: 'blessing', method: 'invocation', level: 20, general: true, text: 'A bonus to all rolls for a virtuous task equal to (the magnitude − 3), +3 at most.', gives: (l) => `${signed(Math.min(3, Math.max(0, mag(l) - 3)))} to the task` },
  { power: 'blessing', method: 'invocation', level: 20, general: true, text: 'Enchant a tool or object: the next time it is used for a virtuous purpose, the wielder adds (the magnitude − 3), +3 at most.', gives: (l) => `${signed(Math.min(3, Math.max(0, mag(l) - 3)))} on its next use` },
  { power: 'blessing', method: 'invocation', level: 25, general: true, text: 'Temper a Divine aura with a value of half (the magnitude − 3), +3 at most.', gives: (l) => `a temper of ${signed(Math.min(3, Math.max(0, Math.floor((mag(l) - 3) / 2))))}` },
  { power: 'blessing', method: 'meditation', level: 1, general: true, text: 'A bonus to Recovery rolls of ((the magnitude + 4) × 3); below level 5, +3 a level (Level 1: +3 … Level 4: +12).', gives: (l) => `${signed(l < 5 ? 3 * l : (mag(l) + 4) * 3)} to Recovery` },
  { power: 'blessing', method: 'meditation', level: 5, general: true, text: 'A bonus to aging rolls equal to the magnitude; Year Duration only.', gives: (l) => `${signed(mag(l))} to aging rolls that year` },
  { power: 'blessing', method: 'meditation', level: 4, text: 'Cause the target to feel a powerful emotion.' },
  { power: 'blessing', method: 'meditation', level: 5, text: 'Raise or lower a Personality Trait by one step for a while, +3 or −3 at most.' },
  { power: 'blessing', method: 'invocation', level: 10, text: 'Give the target Free Expression or Inspirational for the Duration.' },
  { power: 'blessing', method: 'meditation', level: 15, text: 'Pass a Confidence Point from you to the target.' },
  // Cursing
  { power: 'cursing', method: 'invocation', level: 1, general: true, text: 'Reduce a supernatural creature’s Might by (the level + 10), if you overcome its resistance.', gives: (l) => `−${l + 10} Might` },
  { power: 'cursing', method: 'invocation', level: 1, general: true, text: 'Half (the magnitude + 3) extra botch dice on all the target’s stress rolls.', gives: (l) => `+${Math.floor((mag(l) + 3) / 2)} botch dice` },
  { power: 'cursing', method: 'invocation', level: 1, general: true, text: 'A penalty on all the target’s rolls of half (the magnitude + 1), rounded up.', gives: (l) => `−${Math.ceil((mag(l) + 1) / 2)} to all rolls` },
  { power: 'cursing', method: 'invocation', level: 1, general: true, text: 'A penalty on all the target’s Recovery rolls of ((the magnitude + 3) × 3).', gives: (l) => `−${(mag(l) + 3) * 3} to Recovery` },
  { power: 'cursing', method: 'invocation', level: 5, general: true, text: 'A penalty to aging rolls of (the magnitude + 5); Year Duration only.', gives: (l) => `−${mag(l) + 5} to aging rolls that year` },
  { power: 'cursing', method: 'purity', level: 4, text: 'Destroy a single non-living object.' },
  { power: 'cursing', method: 'purity', level: 5, text: 'Hamper a person without injury: lame, or the senses blurred.' },
  { power: 'cursing', method: 'purity', level: 5, text: 'Destroy a tree or another living plant.' },
  { power: 'cursing', method: 'purity', level: 10, text: 'Inflict a Light Wound, with great pain.' },
  { power: 'cursing', method: 'purity', level: 10, text: 'Cause the loss of a Fatigue level.' },
  { power: 'cursing', method: 'purity', level: 15, text: 'Inflict a Medium Wound, crippling a limb.' },
  { power: 'cursing', method: 'purity', level: 15, text: 'Reduce a person’s mind to a young child’s.' },
  { power: 'cursing', method: 'purity', level: 20, text: 'Inflict a Heavy Wound, destroying a major sense.' },
  { power: 'cursing', method: 'purity', level: 20, text: 'Give a person or animal a major disease.' },
  { power: 'cursing', method: 'purity', level: 30, text: 'Strike a person or animal dead.' },
  // Intervention
  { power: 'intervention', method: 'meditation', level: 1, general: true, text: 'Make active supernatural effects of level up to (this level + 25) apparent to one of your senses, showing their realm and something of their purpose.', gives: (l) => `reveals effects up to level ${l + 25}` },
  { power: 'intervention', method: 'purity', level: 1, text: 'Prevent a corpse from decaying.' },
  { power: 'intervention', method: 'meditation', level: 3, text: 'Perceive the boundaries of a regio (with Vision, how to enter or leave it).' },
  { power: 'intervention', method: 'meditation', level: 4, text: 'Perceive the evil in a target by how deformed its image looks.' },
  { power: 'intervention', method: 'meditation', level: 4, text: 'Create or change an image and make it move as you direct (each sense beyond the first: +1 magnitude).' },
  { power: 'intervention', method: 'meditation', level: 5, text: 'Translate unfamiliar spoken words into a language you speak.' },
  { power: 'intervention', method: 'purity', level: 5, text: 'Transform non-living material into something of similar shape and substance.' },
  { power: 'intervention', method: 'purity', level: 10, text: 'Permanently mend a non-living object (missing pieces not restored).' },
  { power: 'intervention', method: 'purity', level: 10, text: 'Permanently change one non-living thing into several of the same size, shape and material.' },
  { power: 'intervention', method: 'meditation', level: 15, text: 'Read unfamiliar writing, with divine messages and censorship of the profane.' },
  { power: 'intervention', method: 'meditation', level: 20, text: 'Harry the target with visible images of its sins.' },
  { power: 'intervention', method: 'purity', level: 20, text: 'Transform a living target into something of similar shape and substance.' },
  { power: 'intervention', method: 'meditation', level: 25, text: 'A sign of God’s will about the target appears.' },
  { power: 'intervention', method: 'purity', level: 30, text: 'Turn living into non-living or back (a person to stone, a statue to an animal).' },
  { power: 'intervention', method: 'purity', level: 30, text: 'Mend a living person or animal: limbs reattached, senses restored.' },
  { power: 'intervention', method: 'purity', level: 35, text: 'Open a temporary one-way entrance into Purgatory.' },
  { power: 'intervention', method: 'purity', level: 35, text: 'Permanently heal a Light Wound.' },
  { power: 'intervention', method: 'purity', level: 40, text: 'Permanently heal a Medium Wound.' },
  { power: 'intervention', method: 'purity', level: 45, text: 'Permanently heal a Heavy Wound.' },
  { power: 'intervention', method: 'purity', level: 50, text: 'Create a terrestrial regio of level 1 (+5 levels: +1 level or another layer); its maker comes and goes as a native.' },
  { power: 'intervention', method: 'purity', level: 50, text: 'Permanently heal an Incapacitating Wound.' },
  { power: 'intervention', method: 'purity', level: 55, text: 'Permanently heal all wounds.' },
  { power: 'intervention', method: 'purity', level: 60, text: 'Create a celestial regio of level 1.' },
  { power: 'intervention', method: 'purity', level: 70, text: 'Return the dead to life, if the spirit is willing and the body undecayed: a Warping Point for each dawn and dusk since death, and one each year after.' },
  // Transcendence
  { power: 'transcendence', method: 'meditation', level: 1, general: true, text: 'You cannot be targeted by spells or powers of level less than (this level + 5).', gives: (l) => `untouched by effects below level ${l + 5}` },
  { power: 'transcendence', method: 'purity', level: 1, general: true, text: 'Soak + (the magnitude + 3).', gives: (l) => `+${mag(l) + 3} Soak` },
  { power: 'transcendence', method: 'meditation', level: 2, text: 'See clearly through a type of material (water, stone, mist).' },
  { power: 'transcendence', method: 'meditation', level: 4, text: 'Take no damage from a single material, such as wood or metal.' },
  { power: 'transcendence', method: 'meditation', level: 5, text: 'Perceive events elsewhere within range, out of your body.' },
  { power: 'transcendence', method: 'meditation', level: 5, text: 'Walk on water as if it were solid.' },
  { power: 'transcendence', method: 'purity', level: 10, text: 'Ignore all Fatigue penalties.' },
  { power: 'transcendence', method: 'purity', level: 10, text: 'Ignore all wound penalties.' },
  { power: 'transcendence', method: 'meditation', level: 10, text: 'Survive without food, water, air or shelter.' },
  { power: 'transcendence', method: 'purity', level: 10, text: 'Postpone a minor aging crisis.' },
  { power: 'transcendence', method: 'meditation', level: 15, text: 'Read another’s thoughts as if written in a book.' },
  { power: 'transcendence', method: 'meditation', level: 15, text: 'Float and move through the air at will.' },
  { power: 'transcendence', method: 'purity', level: 15, text: 'Postpone a serious aging crisis.' },
  { power: 'transcendence', method: 'meditation', level: 20, text: 'Speak mind to mind with someone you know well or have a holy connection to, while you concentrate.' },
  { power: 'transcendence', method: 'purity', level: 20, text: 'Postpone a major aging crisis.' },
  { power: 'transcendence', method: 'meditation', level: 25, text: 'Pass through solid matter as if it were liquid.' },
  { power: 'transcendence', method: 'purity', level: 25, text: 'Restore a Fatigue level.' },
  { power: 'transcendence', method: 'purity', level: 25, text: 'Postpone a critical aging crisis.' },
  { power: 'transcendence', method: 'purity', level: 30, text: 'Permanently restore a mind that was damaged or tampered with.' },
  { power: 'transcendence', method: 'meditation', level: 30, text: 'Become immune to all physical damage.' },
  { power: 'transcendence', method: 'purity', level: 30, text: 'Go without sleep for the Duration.' },
  { power: 'transcendence', method: 'purity', level: 30, text: 'Purge the body of all poisons, diseases and malign influences.' },
  { power: 'transcendence', method: 'purity', level: 30, text: 'Postpone a terminal aging crisis.' },
  { power: 'transcendence', method: 'purity', level: 35, text: 'Resolve a minor aging crisis.' },
  { power: 'transcendence', method: 'meditation', level: 40, text: 'Travel to any place within range in the blink of an eye.' },
  { power: 'transcendence', method: 'purity', level: 40, text: 'Resolve a serious aging crisis.' },
  { power: 'transcendence', method: 'purity', level: 45, text: 'Resolve a major aging crisis.' },
  { power: 'transcendence', method: 'purity', level: 50, text: 'Resolve a critical aging crisis.' },
  { power: 'transcendence', method: 'purity', level: 55, text: 'Resolve a terminal aging crisis.' },
  // Understanding
  { power: 'understanding', method: 'meditation', level: 5, general: true, text: 'Roll fewer botch dice, by the magnitude, by choosing the best time for virtuous actions.', gives: (l) => `${mag(l)} fewer botch dice` },
  { power: 'understanding', method: 'meditation', level: 5, text: 'Bring back the details of a memory from the last day.' },
  { power: 'understanding', method: 'meditation', level: 10, text: 'A vision summing up your situation.' },
  { power: 'understanding', method: 'meditation', level: 10, text: 'Bring back the details of a memory from the last year.' },
  { power: 'understanding', method: 'meditation', level: 15, text: 'A vision with simple advice, as Common Sense.' },
  { power: 'understanding', method: 'meditation', level: 15, text: 'Revisit an enhanced memory for details you missed.' },
  { power: 'understanding', method: 'meditation', level: 20, text: 'A vision with cryptic advice: what God thinks best for you.' },
  { power: 'understanding', method: 'meditation', level: 25, text: 'A vision answering a specific question about your situation.' },
  { power: 'understanding', method: 'meditation', level: 30, text: 'The most likely outcome of an action, in a word (“ruin”, “justice”).' },
  { power: 'understanding', method: 'meditation', level: 35, text: 'A prophetic vision of the future.' },
  { power: 'understanding', method: 'meditation', level: 35, text: 'Learn whether it is God’s Will that you do a particular thing.' },
  { power: 'understanding', method: 'meditation', level: 40, text: 'A vision answering a question beyond your own situation.' },
  // Wonders
  { power: 'wonders', method: 'invocation', level: 1, general: true, text: 'Create a dangerous substance (fire, poison) that does +(base level) damage on contact.', gives: (l) => `+${l} damage` },
  { power: 'wonders', method: 'invocation', level: 1, general: true, text: 'Create a natural substance that harms non-divine supernatural creatures (water like acid, light that burns), +(base level + 5) damage.', gives: (l) => `+${l + 5} damage to the unholy` },
  { power: 'wonders', method: 'invocation', level: 2, text: 'Create a mature living plant, or make a plant grow faster.' },
  { power: 'wonders', method: 'invocation', level: 3, text: 'Create and control a common force of nature (a gust, a burst of flame).' },
  { power: 'wonders', method: 'invocation', level: 3, text: 'Create a non-living natural object (a corpse, driftwood, a rock).' },
  { power: 'wonders', method: 'invocation', level: 5, text: 'Create and control an unusual force of nature (a storm from a clear sky, a light like day).' },
  { power: 'wonders', method: 'invocation', level: 5, text: 'Create nourishing food or drink for one person.' },
  { power: 'wonders', method: 'invocation', level: 5, text: 'Create a processed non-living object (a leather coat, a lance, a coin).' },
  { power: 'wonders', method: 'invocation', level: 15, text: 'Create and control a powerful force of nature (winds that lift a man, a flame lighting the sky for miles).' },
  { power: 'wonders', method: 'invocation', level: 15, text: 'Create a living, docile bird, fish, lizard or amphibian.' },
  { power: 'wonders', method: 'invocation', level: 20, text: 'Create a living, docile mammal.' },
  { power: 'wonders', method: 'invocation', level: 30, text: 'Create an animal with Divine Might 5 (each 5 more Might: +10 levels).' },
];

export interface HolyExample {
  name: string;
  power: string;
  method: MethodKind;
  level: number;
  range: string;
  duration: string;
  target: string;
  text: string;
  design: string;
  /** a general guideline's effect: the level may be set higher */
  general?: boolean;
}

/** The book's named effects. */
export const HOLY_EXAMPLES: HolyExample[] = [
  { name: 'My covenant will I not break', power: 'adjuration', method: 'invocation', level: 20, range: 'Personal', duration: 'Momentary', target: 'Individual', text: 'Invoked as a bargain with a supernatural being is struck: neither side can act against its terms. Dissolved by mutual agreement.', design: 'Base 4, +4 (as a Ritual would be)' },
  { name: 'Give unto the LORD the glory due unto his name', power: 'adjuration', method: 'invocation', level: 50, range: 'Arcane Connection', duration: 'Concentration', target: 'Individual', text: 'Through a holy connection, summon a supernatural being before you (Penetration needed). It need do nothing more than attend.', design: 'Base 5, +4 Arc, +1 Conc, +4 (as a Ritual would be)' },
  { name: 'The angel of the LORD encampeth round about them', power: 'adjuration', method: 'purity', level: 25, range: 'Voice', duration: 'Sun', target: 'Individual', text: 'A magical, faerie or infernal being sees you surrounded by holiness: demons flee, others cannot look at or touch you.', design: 'Base 5, +2 Voice, +2 Sun' },
  { name: 'The LORD shall preserve thee from all evil', power: 'blessing', method: 'invocation', level: 15, range: 'Touch', duration: 'Sun', target: 'Individual', text: 'Magic Resistance from the Divine equal to the effect’s level; not added to Parma Magica or True Faith.', design: 'General, +1 Touch, +2 Sun', general: true },
  { name: 'Thou wilt prolong the king’s life', power: 'blessing', method: 'meditation', level: 30, range: 'Touch', duration: 'Year', target: 'Individual', text: 'A bonus to all aging rolls that year of (the magnitude − 5): +1 at 30, +3 at 40, +5 at 50.', design: 'General, +1 Touch, +4 Year', general: true },
  { name: 'My heart is inditing a good matter', power: 'blessing', method: 'invocation', level: 20, range: 'Personal', duration: 'Sun', target: 'Individual', text: 'Free Expression until the sun passes through the heavens.', design: 'Base 10, +2 Sun' },
  { name: 'As he loved cursing, so let it come unto him', power: 'cursing', method: 'invocation', level: 20, range: 'Voice', duration: 'Sun', target: 'Individual', text: 'A penalty to all the target’s actions of half (the magnitude − 3): −1 at 20, −2 at 30, −3 at 40.', design: 'General, +2 Voice, +2 Sun', general: true },
  { name: 'God shall likewise destroy thee for ever', power: 'cursing', method: 'purity', level: 40, range: 'Voice', duration: 'Momentary', target: 'Individual', text: 'The target is struck dead, unmarked. Unless serving God’s justice or in self-defense, a grievous sin.', design: 'Base 30, +2 Voice' },
  { name: 'Let death seize upon them', power: 'cursing', method: 'purity', level: 85, range: 'Sight', duration: 'Momentary', target: 'Boundary', text: 'Utter waste: buildings and trees leveled, everyone within the boundary slain.', design: 'Base 30, +3 Sight, +4 Bound, +4 (as a Ritual would be)' },
  { name: 'Man is like to vanity', power: 'intervention', method: 'meditation', level: 20, range: 'Voice', duration: 'Concentration', target: 'Individual', text: 'The appearance of a person, with a voice and no substance, not wholly under your control.', design: 'Base 4, +2 Voice, +1 Conc, +1 sense' },
  { name: 'That he should still live for ever, and not see corruption', power: 'intervention', method: 'meditation', level: 25, range: 'Personal', duration: 'Concentration', target: 'Vision', text: 'See the stain of sin on people, twisting them to your sight; demons posing as angels may be known.', design: 'Base 4, +1 Conc, +4 Vision' },
  { name: 'Have mercy upon me, O LORD for I am weak', power: 'intervention', method: 'purity', level: 50, range: 'Touch', duration: 'Momentary', target: 'Individual', text: 'Heals a Heavy Wound at once.', design: 'Base 45, +1 Touch' },
  { name: 'For they intended evil against thee', power: 'transcendence', method: 'meditation', level: 5, range: 'Personal', duration: 'Concentration', target: 'Individual', text: 'While you concentrate, supernatural effects below this level cannot target you (aimed spells still can). Not Magic Resistance.', design: 'General, +1 Conc', general: true },
  { name: 'Surely every man walketh in a vain shew', power: 'transcendence', method: 'meditation', level: 30, range: 'Personal', duration: 'Concentration', target: 'Individual', text: 'Push through non-living obstacles as through mud.', design: 'Base 25, +1 Conc' },
  { name: 'Behold, he that keepeth Israel shall neither slumber nor sleep', power: 'transcendence', method: 'purity', level: 50, range: 'Personal', duration: 'Year', target: 'Individual', text: 'A year without sleep: two more seasons of Practice or Adventure, or a seasonal activity finished in two months.', design: 'Base 30, +4 Year' },
  { name: 'Teach me thy way, O LORD', power: 'understanding', method: 'meditation', level: 15, range: 'Personal', duration: 'Momentary', target: 'Individual', text: 'The storyguide tells you something you already know that matters now, as Common Sense.', design: 'Base 15' },
  { name: 'Thou shalt guide me with thy counsel', power: 'understanding', method: 'meditation', level: 20, range: 'Personal', duration: 'Momentary', target: 'Individual', text: 'A cryptic vision of what you should do to follow God’s purpose.', design: 'Base 20' },
  { name: 'I delight to do thy will, O my God', power: 'understanding', method: 'meditation', level: 35, range: 'Personal', duration: 'Momentary', target: 'Individual', text: 'Learn if a course of action is God’s will; if it is, you cannot botch while engaged in it.', design: 'Base 35' },
  { name: 'Fire, and hail; snow, and vapour', power: 'wonders', method: 'invocation', level: 35, range: 'Sight', duration: 'Concentration', target: 'Individual', text: 'Summon and steer a powerful force of nature; the storyguide judges how it manifests.', design: 'Base 15, +3 Sight, +1 Conc' },
  { name: 'For every beast of the forest is mine', power: 'wonders', method: 'invocation', level: 40, range: 'Touch', duration: 'Moon', target: 'Individual', text: 'Create any mammal, which obeys you for the Duration.', design: 'Base 20, +1 Touch, +3 Moon' },
];

/**
 * Holy effects have no rituals or vis: what would need a Ritual in Hermetic magic (a permanent effect,
 * a Boundary Target, a summoning) adds four magnitudes instead. The book's Year examples add none.
 */
export const HOLY_RITUAL_MAGNITUDES = 4;

// ------------------------------------------------------------------------------------------------
// Tragedies of hubris

export const TRAGEDIES = {
  minor: { label: 'Minor tragedy (failed by 1–10)', examples: ['a Method, Power or other Supernatural Ability halved', 'a Minor Flaw (Lesser Malediction, Fear, Poor Memory, Simple-Minded)', 'a Light Wound', 'three extra botch dice on all rolls', 'a Warping Point'] },
  major: { label: 'Major tragedy (failed by 11–20)', examples: ['a Method, Power or other Supernatural Ability lost', 'a Major Flaw (Greater Malediction, Lycanthrope, Blind, Enfeebled)', 'a Heavy Wound', 'a minor tragedy for good', 'a Decrepitude Point'] },
  ultimate: { label: 'Ultimate tragedy (failed by 21 or more)', examples: ['all Supernatural Abilities lost', 'possessed by a supernatural creature', 'an Incapacitating Wound', 'a major tragedy for good', 'plague, war or famine on the whole region'] },
} as const;
export type TragedyKind = keyof typeof TRAGEDIES;

// ------------------------------------------------------------------------------------------------
// Miracles, God's aid, holy influence

export const MIRACLE_TIMELINESS = [
  { id: 'immediate', label: 'Immediate (at once to a few hours)', mod: 10 },
  { id: 'day', label: 'Within a day', mod: 5 },
  { id: 'week', label: 'Within a week', mod: 0 },
  { id: 'month', label: 'Within a month', mod: -5 },
  { id: 'year', label: 'Within a year', mod: -10 },
  { id: 'generation', label: 'Within a generation (fifteen years)', mod: -20 },
] as const;

export const MIRACLE_NEED = [
  { id: 'calamitous', label: 'Calamitous: desperate need, such as assault by supernatural forces', mod: -15 },
  { id: 'dire', label: 'Dire: selfless, rights a great injustice, or mercy for many innocents', mod: -10 },
  { id: 'grave', label: 'Grave: undoes infernal work, deeply benefits believers, or saves from imminent danger', mod: -5 },
  { id: 'beneficial', label: 'Beneficial: a holy quest, or stops sinful supernatural work', mod: 0 },
  { id: 'frivolous', label: 'Frivolous: only for comfort, or the supplicant in mortal sin', mod: 10 },
  { id: 'impious', label: 'Impious: a pagan or unbeliever, or a sinful motive', mod: 20 },
] as const;

/** Divine Aid, Holy Influence and Tempering share one table: 9+ gives +1, 15+ +2, 24+ +3. */
export const DIVINE_AID_TABLE = [
  { atLeast: 24, bonus: 3 },
  { atLeast: 15, bonus: 2 },
  { atLeast: 9, bonus: 1 },
] as const;

export interface Temper {
  id: string;
  name: string;
  vice: string;
  positive: string[];
  negative: string[];
  text: string;
}

export const TEMPERS: Temper[] = [
  { id: 'loyal', name: 'Loyal', vice: 'Proud', positive: ['Dedicated', 'Faithful', 'Humble', 'Reliable', 'Trusting'], negative: ['Arrogant', 'Haughty', 'Rebellious', 'Suspicious', 'Vain'], text: 'Following orders, aiding a friend or partner, fulfilling obligations, giving something up for the greater good.' },
  { id: 'calm', name: 'Calm', vice: 'Wrathful', positive: ['Cheerful', 'Hopeful', 'Optimistic', 'Patient', 'Peaceful'], negative: ['Angry', 'Desperate', 'Spiteful', 'Vengeful', 'Violent'], text: 'Tolerance, reasoned debate, common ground; most fighting is opposed.' },
  { id: 'kind', name: 'Kind', vice: 'Envious', positive: ['Charitable', 'Compassionate', 'Forgiving', 'Generous', 'Merciful'], negative: ['Cruel', 'Gossipy', 'Gruff', 'Jealous', 'Meddlesome'], text: 'Helping others through hardship, caring for the needy, the sick and strangers.' },
  { id: 'brave', name: 'Brave', vice: 'Slothful', positive: ['Bold', 'Courageous', 'Determined', 'Ready', 'Zealous'], negative: ['Cowardly', 'Cynical', 'Indecisive', 'Lazy', 'Shy'], text: 'Holding ground or advancing against danger, diligent work at a hard task.' },
  { id: 'wise', name: 'Wise', vice: 'Lustful', positive: ['Careful', 'Cautious', 'Chaste', 'Practical', 'Prudent'], negative: ['Fanatical', 'Lecherous', 'Naïve', 'Overconfident', 'Reckless'], text: 'Reason over base desire; seeing people and things as they are.' },
  { id: 'strong', name: 'Strong', vice: 'Greedy', positive: ['Healthy', 'Pious', 'Selfless', 'Temperate', 'Vigilant'], negative: ['Gluttonous', 'Indulgent', 'Selfish', 'Sickly', 'Weak'], text: 'Self-control, enduring hardship, resisting temptation and excess.' },
  { id: 'just', name: 'Just', vice: 'Avaricious', positive: ['Even-handed', 'Fair', 'Honest', 'Honorable', 'Straightforward'], negative: ['Ambitious', 'Corrupt', 'Cunning', 'Devious', 'Manipulative'], text: 'Fairness, giving others their due, discerning truth from lies.' },
];

// ------------------------------------------------------------------------------------------------
// Saints and holy forbears (Mythic Christianity, Saints; Mythic Islam, Holy Forbears)

export interface SaintPower {
  name: string;
  cost: number;
  init: number;
  form: string;
  text: string;
  curse?: boolean;
}

export const SAINT_POWERS: SaintPower[] = [
  { name: 'Acknowledgment of Evil', cost: 1, init: 10, form: 'Vim', text: 'Every demon within Voice range of the petitioner declares its Infernal nature aloud (Penetration: Might − 5 × cost against its Infernal Might).' },
  { name: 'Apparition', cost: 0, init: 20, form: 'Imaginem', text: 'The saint manifests in person, still immune to physical harm.' },
  { name: 'Celestial Immunity', cost: 5, init: 15, form: 'Corpus', text: 'The recipient is immune to physical damage while the threat lasts.' },
  { name: 'Cure Blindness', cost: 2, init: 3, form: 'Corpus', text: 'Sight restored for good, whatever the cause, even age.' },
  { name: 'Expel Demons', cost: 1, init: 15, form: 'Vim', text: 'A demon is driven from a person or place back to Hell, as Demon’s Eternal Oblivion: the saint’s Might + a stress die (no botch) against its Might.' },
  { name: 'Grant of Serenity', cost: 1, init: -10, form: 'Mentem', text: 'Calms fear and worry, as Enchantment of Detachment, and ends any malign Mentem spell on the target.' },
  { name: 'Mass Healing', cost: 5, init: 0, form: 'Corpus', text: 'A crowd healed of all disease, blindness, lameness, deafness, afflictions of age and wounds (not Decrepitude or aged Characteristics).' },
  { name: 'Raise the Dead', cost: 7, init: 0, form: 'Corpus', text: 'Life restored to a corpse whose soul is not yet in Heaven.' },
  { name: 'Resist Temptation', cost: 1, init: 5, form: 'Mentem', text: 'Magic Resistance equal to the saint’s Might against Infernal temptation.' },
  { name: 'Sanctuary of Virginity', cost: 4, init: 10, form: 'Corpus', text: 'A follower’s virginity protected in some miraculous way.' },
  { name: 'Scourging of Snakes', cost: 4, init: 13, form: 'Animal', text: 'All snakes and crawling reptiles driven from an island as large as Ireland, for good.' },
  { name: 'Straighten the Crippled', cost: 3, init: 10, form: 'Corpus', text: 'Heals the lame and deformed, damage from spells too (not Decrepitude or Warping).' },
  { name: 'The Dutiful Shepherd', cost: 4, init: 10, form: 'Imaginem', text: 'The saint’s image leads a lost petitioner to safety: +10 Soak and Magic Resistance 10 meanwhile.' },
  { name: 'The Faithful Made Whole', cost: 4, init: 15, form: 'Corpus', text: 'Cures all disease and heals all wounds.' },
  { name: 'The Incombustible Shroud', cost: 3, init: 20, form: 'Ignem', text: 'Immune to damage from fire, however great.' },
  { name: 'The Laborer’s Boon', cost: 1, init: 10, form: 'Terram', text: 'A broken tool mended or a lost one replaced.' },
  { name: 'The Leap of the Faithful', cost: 5, init: 5, form: 'Corpus', text: 'One person carried instantly anywhere, often out of prison.' },
  { name: 'Tomorrow’s Bounty', cost: 2, init: 0, form: 'Herbam', text: 'Food for a large crowd.' },
  { name: 'Blindness', cost: 1, init: 8, form: 'Corpus', curse: true, text: 'The target is blinded until magic or a miracle restores sight.' },
  { name: 'Blisters of Humility', cost: 1, init: 12, form: 'Corpus', curse: true, text: 'Boils and sores for a week: −6 on all physical actions.' },
  { name: 'Dysenteric Infliction', cost: 5, init: 9, form: 'Corpus', curse: true, text: 'A fatal attack of dysentery.' },
  { name: 'Flabbergast the Impertinent', cost: 2, init: 3, form: 'Mentem', curse: true, text: 'A night’s snoring sleep no magic can end; two long-term Fatigue levels down in the morning.' },
  { name: 'Humility of Caesar', cost: 1, init: 12, form: 'Animal', curse: true, text: 'A rider is thrown, or a walker falls flat on the face.' },
  { name: 'Ignis Domini', cost: 4, init: 18, form: 'Ignem', curse: true, text: 'A pillar of fire from heaven: +30 damage.' },
  { name: 'Rebuke the Unfaithful', cost: 4, init: 13, form: 'Mentem', curse: true, text: 'A vision: die within thirty days unless a named sin stops.' },
  { name: 'Smiting of the Lord', cost: 4, init: 13, form: 'Auram', curse: true, text: 'A lightning bolt: +35 damage.' },
  { name: 'Swallowed Alive and Sent to Hell', cost: 5, init: 3, form: 'Terram', curse: true, text: 'The earth opens straight to Hell and closes again.' },
  { name: 'Terrify the Unbeliever', cost: 2, init: 18, form: 'Mentem', curse: true, text: 'Terror until dawn, fleeing to safety, unless a Brave (or like) Personality roll of 12+.' },
  { name: 'The Earth’s Riches', cost: 3, init: 10, form: 'Terram', curse: true, text: 'Sticks and stones turned to gold and gems, as Touch of Midas: a warning against earthly riches.' },
  { name: 'The Feast of Worms', cost: 3, init: 5, form: 'Corpus', curse: true, text: 'Maggots: +10 damage, and a Stamina stress roll of 12+ or a point of Presence lost for good.' },
];

export interface Saint {
  id: string;
  name: string;
  faith: 'christian' | 'muslim';
  might: number;
  /** where a Muslim may invoke the forbear's baraka; where a Christian saint is venerated */
  where: string;
  patron?: string;
  powers: string[];
  /** its stat block in the bestiary */
  bestiary?: string;
}

export const SAINTS: Saint[] = [
  { id: 'mary', name: 'Blessed Virgin Mary', faith: 'christian', might: 100, where: 'Throughout Mythic Europe', patron: 'the laity, women, nuns, cooks, fishermen, clothworkers; against epidemics and disasters', bestiary: 'rop-d-blessed-virgin-mary', powers: ['Apparition', 'Celestial Immunity', 'Cure Blindness', 'Grant of Serenity', 'The Incombustible Shroud', 'The Leap of the Faithful', 'Rebuke the Unfaithful', 'Resist Temptation', 'Straighten the Crippled', 'The Dutiful Shepherd'] },
  { id: 'peter', name: 'Saint Peter, Apostle', faith: 'christian', might: 75, where: 'Rome, throughout Mythic Europe', patron: 'the Church, popes and fishermen', bestiary: 'rop-d-saint-peter-apostle', powers: ['Acknowledgment of Evil', 'Apparition', 'Celestial Immunity', 'Cure Blindness', 'Expel Demons', 'Mass Healing', 'Raise the Dead', 'Sanctuary of Virginity', 'Terrify the Unbeliever', 'The Laborer’s Boon', 'Tomorrow’s Bounty'] },
  { id: 'martin', name: 'Saint Martin of Tours', faith: 'christian', might: 50, where: 'Poitiers, Tours, Paris, Normandy, France and Italy', patron: 'soldiers, horses and riders, beggars', bestiary: 'rop-d-saint-martin-of-tours', powers: ['Acknowledgment of Evil', 'Apparition', 'Celestial Immunity', 'Expel Demons', 'Grant of Serenity', 'Terrify the Unbeliever', 'The Laborer’s Boon'] },
  { id: 'nerius', name: 'Saint Nerius', faith: 'christian', might: 50, where: 'Covenants of the Order of Hermes', patron: 'Christian magi', bestiary: 'rop-d-saint-nerius', powers: ['Apparition', 'Celestial Immunity', 'Ignis Domini', 'The Incombustible Shroud', 'The Leap of the Faithful'] },
  { id: 'guinefort', name: 'Saint Guinefort', faith: 'christian', might: 25, where: 'A diocese near Lyon', patron: 'protecting local children', bestiary: 'rop-d-saint-guinefort', powers: ['Blisters of Humility', 'Grant of Serenity', 'Resist Temptation', 'Straighten the Crippled', 'The Faithful Made Whole'] },
  { id: 'quran', name: 'Khawass al-Qur’an', faith: 'muslim', might: 100, where: 'Anywhere', bestiary: 'rop-d-khawass-al-qur-an', powers: ['Acknowledgment of Evil', 'Expel Demons', 'Resist Temptation', 'Grant of Serenity', 'The Incombustible Shroud', 'Straighten the Crippled', 'The Faithful Made Whole', 'Celestial Immunity'] },
  { id: 'muhammad', name: 'Muhammad', faith: 'muslim', might: 100, where: 'Sites in and around Mecca and Medina, and the Dome of the Rock', bestiary: 'rop-d-muhammad', powers: ['Apparition', 'Acknowledgment of Evil', 'Expel Demons', 'Resist Temptation', 'Grant of Serenity', 'Cure Blindness', 'Tomorrow’s Bounty', 'The Incombustible Shroud', 'Straighten the Crippled', 'The Dutiful Shepherd', 'Sanctuary of Virginity', 'The Faithful Made Whole', 'Celestial Immunity', 'The Leap of the Faithful', 'Mass Healing', 'Raise the Dead', 'Humility of Caesar', 'Terrify the Unbeliever', 'Ignis Domini', 'Rebuke the Unfaithful'] },
  { id: 'abraham', name: 'Abraham', faith: 'muslim', might: 75, where: 'The tomb at Hebron and the haram in Mecca', bestiary: 'rop-d-abraham', powers: ['Apparition', 'Resist Temptation', 'Grant of Serenity', 'The Incombustible Shroud', 'The Dutiful Shepherd', 'The Faithful Made Whole', 'Celestial Immunity', 'Mass Healing', 'Raise the Dead'] },
  { id: 'husayn', name: 'Al-Husayn', faith: 'muslim', might: 75, where: 'The tombs at Karbala’ and Cairo', bestiary: 'rop-d-al-husayn', powers: ['Apparition', 'Acknowledgment of Evil', 'Expel Demons', 'Resist Temptation', 'Grant of Serenity', 'Straighten the Crippled', 'The Faithful Made Whole', 'Celestial Immunity', 'Mass Healing', 'Humility of Caesar', 'Terrify the Unbeliever'] },
  { id: 'rabia', name: 'Rabi’a al-’Adawiyya', faith: 'muslim', might: 50, where: 'Sites in Basra and the tomb in Jerusalem', bestiary: 'rop-d-rabi-a-al-adawiyya', powers: ['Acknowledgment of Evil', 'Resist Temptation', 'Grant of Serenity', 'The Laborer’s Boon', 'Tomorrow’s Bounty', 'The Faithful Made Whole', 'Humility of Caesar', 'The Earth’s Riches'] },
  { id: 'shafii', name: 'Al-Shafi’i', faith: 'muslim', might: 25, where: 'The tomb in Cairo', bestiary: 'rop-d-al-shafi-i', powers: ['Acknowledgment of Evil', 'Resist Temptation', 'Grant of Serenity', 'The Dutiful Shepherd', 'Humility of Caesar'] },
  { id: 'nur-al-din', name: 'Nur al-Din', faith: 'muslim', might: 25, where: 'The tomb in Damascus', bestiary: 'rop-d-nur-al-din', powers: ['Apparition', 'Expel Demons', 'The Laborer’s Boon', 'The Leap of the Faithful', 'Terrify the Unbeliever', 'Ignis Domini'] },
];

/** A saint of one's own making: a greater saint has Might 75, an area saint 50, a local saint 25. */
export const SAINT_TIERS = [
  { might: 75, label: 'Greater saint (apostles, Church fathers): Might 75' },
  { might: 50, label: 'Area saint (a kingdom’s or a region’s): Might 50' },
  { might: 25, label: 'Local saint (a town or two): Might 25' },
];

export interface InvocationMod {
  id: string;
  label: string;
  /** a fixed modifier; a range lets the player set it */
  mod: number;
  min?: number;
  max?: number;
}

export const SAINT_INVOCATION_MODS: InvocationMod[] = [
  { id: 'tomb', label: 'At the saint’s tomb', mod: 1 },
  { id: 'feast', label: 'The saint’s feast day', mod: 3 },
  { id: 'pilgrimage', label: 'A pilgrimage in the saint’s honor within a year', mod: 2 },
  { id: 'relic', label: 'Touching the saint’s relic', mod: 1 },
  { id: 'donation', label: 'A monetary donation', mod: 1, min: 1, max: 3 },
  { id: 'peril', label: 'Imminent peril', mod: 2 },
  { id: 'unchristian', label: 'An unchristian act in the last month', mod: -1, min: -3, max: -1 },
  { id: 'noDonation', label: 'No donation within a year', mod: -3 },
  { id: 'recentMiracle', label: 'A miracle received within a month', mod: -20 },
  { id: 'notPatron', label: 'Not one’s patron saint', mod: -15 },
];

export const FORBEAR_INVOCATION_MODS: InvocationMod[] = [
  { id: 'feast', label: 'The forbear’s feast day (normally the birthday)', mod: 3 },
  { id: 'pilgrimage', label: 'A pilgrimage made to the tomb or shrine', mod: 2 },
  { id: 'relic', label: 'Touching the forbear’s relic', mod: 1 },
  { id: 'ownRelic', label: 'Owning the forbear’s relic', mod: 2 },
  { id: 'donation', label: 'A donation', mod: 1, min: 1, max: 3 },
  { id: 'peril', label: 'Imminent peril', mod: 2 },
  { id: 'sin', label: 'A recent sinful act', mod: -1, min: -3, max: -1 },
  { id: 'noZakat', label: 'No zakat paid within a year', mod: -3 },
  { id: 'recentMiracle', label: 'A miracle received within a month', mod: -5 },
  { id: 'unfamiliar', label: 'An unfamiliar forbear', mod: -10 },
  { id: 'specific', label: 'A specific miracle rather than general aid', mod: -5 },
];

export const SAINT_THREAT_MODS: InvocationMod[] = [
  { id: 'bones', label: 'Exposing the saint’s bones', mod: 1 },
  { id: 'whip', label: 'Whipping or defiling the saint’s relics', mod: 2 },
  { id: 'berate', label: 'Berating the saint in front of others', mod: 1 },
  { id: 'bar', label: 'Barring others from venerating the saint', mod: 3 },
  { id: 'peril', label: 'Imminent peril', mod: 1 },
  { id: 'recentMiracle', label: 'A miracle received within the past month', mod: -20 },
  { id: 'unfamiliar', label: 'An unfamiliar saint', mod: -15 },
];

// ------------------------------------------------------------------------------------------------
// Holy traditions (each favors up to four Abilities)

export interface HolyTradition {
  id: string;
  name: string;
  favored: string[];
  societas?: boolean;
  faith?: string;
  text: string;
}

export const HOLY_TRADITIONS: HolyTradition[] = [
  { id: 'ascetics', name: 'Ascetics', favored: ['adjuration', 'cursing', 'purity', 'second-sight'], text: 'Purity of mind and body; vows of obedience and humility; wary of spirits and illusion. A good “generic” holy tradition, of any faith.' },
  { id: 'cantores', name: 'The Cantores', faith: 'Christian', favored: ['blessing', 'enchanting-ability', 'holy-music', 'intervention'], text: 'Worship through music in cities and great abbeys; they shun bawdy song.' },
  { id: 'sufis', name: 'Sufis', faith: 'Muslim', favored: ['ceremony', 'meditation', 'transcendence', 'understanding'], text: 'Muslim mystics in tariqas under a shaykh: dhikr and sama’ bring them close to God.' },
  { id: 'baal-shem', name: 'Ba’al Shem', faith: 'Jewish', favored: ['adjuration', 'blessing', 'craft-amulets', 'invocation'], text: 'Itinerant folk healers and amulet makers, masters of the Divine name.' },
  { id: 'kabbalists', name: 'Kabbalists', faith: 'Jewish', favored: ['ceremony', 'gematria', 'kabbalah', 'merkavah'], text: 'Students of the Sefer Yetzirah and the Sefirot; makers of golems.' },
  { id: 'sol-invictus', name: 'Sol Invictus', societas: true, favored: ['cursing', 'ceremony', 'holy-magic', 'invocation'], text: 'A Hermetic holy societas of House Jerbiton, worshipping God as the unconquered sun; they molest the fay.' },
  { id: 'priory-of-saint-nerius', name: 'The Priory of Saint Nerius', societas: true, faith: 'Christian', favored: ['holy-magic', 'intervention', 'premonitions', 'purity'], text: 'Monastic holy magi under Monastic Vows (Hermetic), seeking Nerius’s canonization; they keep The Neriusian Portal.' },
  { id: 'zoroastrians', name: 'Zoroastrians', societas: true, favored: ['invocation', 'holy-magic', 'sense-holiness-and-unholiness', 'wonders'], text: 'Magoi, mostly of House Flambeau, who venerate fire and fight the servants of Angra Mainyu.' },
  { id: 'karaites', name: 'Karaites', societas: true, faith: 'Jewish', favored: ['craft-amulets', 'holy-magic', 'merkavah', 'transcendence'], text: 'Ex Miscellanea holy magi under the Karaite Magic Flaw and Outsider (Major, Jew).' },
];

// ------------------------------------------------------------------------------------------------
// The commanding aura (Blessed by God, The Commanding Aura)

export const COMMANDING_AURA_RANKS = [
  { mr: 25, label: 'Pope, caliph, Shi’i imam, the exilarch, heads of other eastern churches (25)' },
  { mr: 20, label: 'Cardinal, patriarch, chief qadi or mufti, chief rabbi (20)' },
  { mr: 10, label: 'Archbishop, metropolitan, crowned king or sultan, senior rabbi or subordinate (10)' },
] as const;

// ------------------------------------------------------------------------------------------------
// The Rings of Solomon (Mythic Christianity, Ars Notoria)

export interface SolomonRing {
  ring: number;
  name: string;
  seasons?: ('spring' | 'summer' | 'autumn' | 'winter')[];
  text: string;
  /** temporary experience points in an Ability while the ring lasts */
  xp?: { ability: string; amount: number };
  /** a Characteristic raised while the ring lasts, to +5 at most */
  char?: { id: Characteristic; amount: number };
}

export const SOLOMON_RINGS: SolomonRing[] = [
  { ring: 1, name: 'The First Ring', seasons: ['spring', 'autumn'], xp: { ability: 'philosophiae', amount: 100 }, char: { id: 'Com', amount: 3 }, text: 'Knowledge of the philosophical art and a marvelous eloquence: 100 experience points in Philosophiae and +3 Communication (to +5 at most).' },
  { ring: 2, name: 'The Second Ring', seasons: ['winter'], xp: { ability: 'theology-christian', amount: 100 }, char: { id: 'Int', amount: 3 }, text: 'Theological knowledge and understanding of God’s work: 100 experience points in Theology and +3 Intelligence (to +5 at most).' },
  { ring: 3, name: 'The Third Ring', xp: { ability: 'medicine', amount: 100 }, text: 'Mastery of the physical arts: 100 experience points in Medicine and Greater Purifying Touch for a disease chosen at each recitation.' },
  { ring: 4, name: 'The Fourth Ring', text: 'A Patron Angel: the powers of a Guardian Angel, and a teacher (Communication +3; Artes Liberales, Civil and Canon Law, Medicine, Philosophiae, Teaching and Theology 7) for you alone. It leaves if you act impiously and may end the other rings.' },
  { ring: 5, name: 'The Fifth Ring', seasons: ['summer'], text: 'Sense a being’s realm: Perception + Ars Notoria against 6 + its Magic Resistance ÷ 5, without Penetration. Five over its Magic Resistance tells its weakest power, another each five more; demons cannot hide.' },
  { ring: 6, name: 'The Sixth Ring', seasons: ['spring'], text: 'Divination after a day’s fast and meditation: Perception + Ars Notoria + a stress die against 9 (tomorrow’s weather; the short-term result of your own act), 12 (its long-term result; an auspicious time to cast, adding Ars Notoria to the Casting Total; another’s short-term result), 15 (another’s long-term result) or 18 (the future of an individual).' },
  { ring: 7, name: 'The Seventh Ring', text: 'Perfect understanding: every simple die becomes a stress die, and no stress die can botch. Pride ends it.' },
];

export const ARS_NOTORIA_MODS: InvocationMod[] = [
  { id: 'fasting', label: 'Fasting on bread and water (a season each: Stamina stress roll 6+, +1 each season more)', mod: 1, min: 1, max: 4 },
  { id: 'chastity', label: 'Chastity', mod: 1 },
  { id: 'honorableMinor', label: 'An honorable Minor Personality Flaw (Compassionate, Pious…)', mod: 1 },
  { id: 'honorableMajor', label: 'An honorable Major Personality Flaw', mod: 3 },
  { id: 'dishonorableMinor', label: 'A dishonorable Minor Personality Flaw (Envious, Lecherous…)', mod: -1 },
  { id: 'dishonorableMajor', label: 'A dishonorable Major Virtue or Flaw', mod: -3 },
  { id: 'venial', label: 'A venial sin', mod: -3 },
  { id: 'mortal', label: 'A mortal sin', mod: -9 },
  { id: 'faith', label: 'True Faith and Faith (storyguide)', mod: 0, min: -3, max: 3 },
];

// ------------------------------------------------------------------------------------------------
// Craft Amulets shape and material bonuses (Mythic Judaism)

export const AMULET_MATERIALS: { name: string; bonuses: string; major: boolean }[] = [
  { name: 'Agate', bonuses: '+2 surefootedness (riding too)', major: true },
  { name: 'Amethyst', bonuses: '+3 evil spirits', major: true },
  { name: 'Asparagus', bonuses: '+2 heart or eyes', major: false },
  { name: 'Beryl', bonuses: '+1 aid digestion', major: true },
  { name: 'Bitter vetch', bonuses: '+2 bowels', major: false },
  { name: 'Black cumin', bonuses: '+2 ease chest pain', major: false },
  { name: 'Carbuncle', bonuses: '+3 longevity and aging', major: true },
  { name: 'Cucumbers', bonuses: '+2 laxative', major: false },
  { name: 'Dates', bonuses: '+2 hemorrhoids and constipation', major: false },
  { name: 'Emerald', bonuses: '+3 granting courage', major: true },
  { name: 'Lentils', bonuses: '+2 prevent croup', major: false },
  { name: 'Garlic', bonuses: '+2 vitality, +3 kill internal parasites', major: false },
  { name: 'Gold', bonuses: '+1 divination, +2 medicine, +3 justice', major: true },
  { name: 'Jasper', bonuses: '+3 temperance', major: true },
  { name: 'Milt', bonuses: '+2 healthy teeth', major: false },
  { name: 'Onyx', bonuses: '+1 charm', major: true },
  { name: 'Radishes', bonuses: '+2 aid digestion', major: false },
  { name: 'Ruby', bonuses: '+1 fertility', major: true },
  { name: 'Sapphire', bonuses: '+1 medicine, +2 eyes', major: true },
  { name: 'Silver', bonuses: '+1 purity, +3 protection against spirits', major: true },
  { name: 'Topaz', bonuses: '+2 alleviate fever, +1 love potions', major: true },
  { name: 'A coin', bonuses: '+1 (the amulet formed from it)', major: true },
  { name: 'A seal of wax or metal', bonuses: '+5 restricting the effect to a group or a person', major: true },
  { name: 'Terafim', bonuses: '+5 to an Understanding or Cursing effect', major: true },
  { name: 'The Star of David', bonuses: '+5 protection', major: true },
  { name: 'Copper plates in the shoes', bonuses: '+10 warding against wild animals', major: true },
  { name: 'Pottery bowls buried under doors', bonuses: '+10 warding a room or building against non-Divine spirits', major: true },
  { name: 'Copper amulets with a name, buried at the four points', bonuses: '+10 finding that person', major: true },
  { name: 'White', bonuses: '+1 compassion, +2 purity, +3 holiness', major: true },
  { name: 'Blue', bonuses: '+1 good fortune, +2 protection from evil', major: true },
  { name: 'Red', bonuses: '+1 the Infernal, +2 fear', major: true },
  { name: 'Black', bonuses: '+1 loss, +2 mourning', major: true },
  { name: 'Green', bonuses: '+1 beauty', major: true },
  { name: 'Purple', bonuses: '+1 love or kindness', major: true },
];

// ------------------------------------------------------------------------------------------------
// Virtues and Abilities the extracted lists lack

const DIVINE_VF: VirtueFlawDef[] = [
  {
    id: 'blessing-power', name: 'Blessing (Holy Power)', kind: 'virtue', sizes: ['Major'], categories: ['Supernatural'], tainted: false,
    notes: 'Supernatural Power', source: { book: 'RoP_D', line: 1931 },
    text: 'Through Blessing, you can invoke the protective and inspirational aspects of the Divine. Taking this Virtue grants you the Supernatural Ability Blessing 1.',
    effects: [{ type: 'grantAbility', ability: 'blessing', score: 1 }],
  },
  {
    id: 'zahid', name: 'Zahid', kind: 'virtue', sizes: ['Free'], categories: ['Social Status'], tainted: false,
    notes: 'Mythic Companion', source: { book: 'RoP_D', line: 5907 },
    text: 'An exceptionally ascetic Sufi who works karamas, miraculous acts. Must take True Faith, Meditation, Understanding and Second Sight, and a Social Status (Wise One or ’Alim in Muslim lands, Outsider (Muslim) elsewhere); a shaykh takes Ceremony and Dependent (a tariqa). 90 experience points in Concentration 1, Dominion Lore 1, Islamic Law 1, Meditation 3, Second Sight 2, Theology: Islam 2, Understanding 2.',
  },
];

const DIVINE_ABILITIES: AbilityDef[] = [
  {
    id: 'holy-music', name: 'Holy Music', type: 'Supernatural', restricted: true, specialties: ['with a certain effect', 'singing for an audience', 'affecting a specific person'],
    text: 'A Holy Method like Meditation, reaching a supernatural state of mind by praising God in music: sing a devotional song (Presence + Music against an Ease Factor the circumstances set), then use Presence for the effect. A Concentration roll if distracted.',
    source: { book: 'RoP_D', line: 4654 },
  },
];

export function divineVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  return DIVINE_VF.filter((v) => !existing.has(v.id));
}

export function divineAbilityDefs(existing: Set<string>): AbilityDef[] {
  return DIVINE_ABILITIES.filter((a) => !existing.has(a.id));
}
