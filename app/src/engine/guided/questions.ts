// The guided build's question bank (design spec, sections 5 and 6). Each question is a
// statement the player rates 0-10; 5 is neutral and skipping counts as 5. A follow-up appears
// only when its parent is far enough from 5 (7 or more, or 3 or less) and still leaves enough
// candidates to be worth narrowing. Questions describe what the player wants to happen, never a
// Virtue by name: the tags decide which Virtues that means.

import { ARTS, ART_NAMES, CHARACTERISTICS, TECHNIQUES, type Art, type CharType, type Characteristic } from '../../data';
import { ARCHETYPES } from './magnitudes';

export type SectionId = 'A' | 'O' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

export interface Question {
  id: string;
  section: SectionId;
  text: string;
  /** labels for the two ends of a two-ended question */
  low?: string;
  high?: string;
  /** tag → how much each point above or below 5 counts */
  tags: Record<string, number>;
  parent?: string;
  /** which side of the parent opens this follow-up (default: high) */
  when?: 'high' | 'low';
  /** who is asked (default: everyone) */
  types?: CharType[];
  /** the answer also steers the automatic build, so it is asked even with few candidates */
  build?: boolean;
  explainer?: string;
  /** concept themes (Concept step) that pre-set the answer */
  presets?: Record<string, number>;
  /** answered from the covenant when the character has one */
  covenant?: 'vis' | 'wealth' | 'library' | 'aura';
  /** what the best options for it give, shown at the end of the question (else worked out from the options) */
  hint?: string;
  /** no list of options at the end */
  noHint?: boolean;
  /** one of a set picked together under its parent (shown as a choice, not rated 0-10) */
  chip?: boolean;
}

export const SECTIONS: { id: SectionId; title: string; intro: string; types?: CharType[] }[] = [
  { id: 'A', title: 'The big picture', intro: 'A few broad questions first. Skip any you have no opinion on: a skipped question counts as 5.' },
  { id: 'O', title: 'What your magus does', intro: 'What you want your magus to be good at: casting spells, lab work, or both. Rate each activity, then the parts of it you care about, then how narrow you want to go. The numbers at the end of a question show what the best options for it give.', types: ['magus'] },
  { id: 'B', title: 'The Arts', intro: 'Which of the fifteen Arts your magus is best at.', types: ['magus'] },
  { id: 'C', title: 'How you cast', intro: 'The situations your magus casts spells in.', types: ['magus'] },
  { id: 'D', title: 'Magical conflict', intro: 'Magic aimed at you, and your magic against others.' },
  { id: 'E', title: 'The lab and the long game', intro: 'How the seasons between stories are spent.' },
  { id: 'F', title: 'Realms and the world', intro: 'What your character’s stories are tied to. Interests are not exclusive: rate each one.' },
  { id: 'G', title: 'Status, story and personality', intro: 'Who your character is, and the trouble you would like to find them.' },
  { id: 'H', title: 'Abilities', intro: 'What your character is good at outside magic.' },
  { id: 'I', title: 'Your covenant', intro: 'Asked only when the character has no covenant in the toolkit; otherwise the covenant answers these.' },
];

const MAGI: CharType[] = ['magus'];
const NOT_GROGS: CharType[] = ['magus', 'companion', 'mythic'];
const NON_MAGI: CharType[] = ['companion', 'mythic', 'grog'];

const ART_BLURB: Record<Art, string> = {
  Cr: 'making, healing and perfecting',
  In: 'perceiving and learning about things',
  Mu: 'changing things into something else',
  Pe: 'destroying and weakening',
  Re: 'controlling and moving things',
  An: 'animals',
  Aq: 'water and liquids',
  Au: 'air and weather',
  Co: 'the human body',
  He: 'plants and wood',
  Ig: 'fire, heat and light',
  Im: 'images, sounds and illusions',
  Me: 'minds, spirits and ghosts',
  Te: 'earth, stone and metal',
  Vi: 'magic itself: wards, dispelling, vis',
};

const ART_PRESETS: Partial<Record<Art, Record<string, number>>> = {
  Cr: { healer: 8, enchanter: 7 }, In: { scholar: 7, mystic: 7 }, Re: { 'battle-mage': 7 }, Pe: { 'battle-mage': 7, 'demon-hunter': 7 },
  An: { beast: 8 }, Aq: { elemental: 8 }, Au: { elemental: 8 }, Co: { healer: 8, warrior: 6 }, He: { explorer: 6 }, Ig: { elemental: 8, 'battle-mage': 8 },
  Im: { rogue: 7, faerie: 7 }, Me: { social: 7, politician: 7 }, Te: { elemental: 8, craftsman: 7 }, Vi: { lab: 7, 'demon-hunter': 8 },
};

const CHAR_TEXT: Record<Characteristic, string> = {
  Int: 'clever and quick to learn (Intelligence)',
  Per: 'observant (Perception)',
  Str: 'strong (Strength)',
  Sta: 'tough and tireless (Stamina)',
  Pre: 'striking and commanding (Presence)',
  Com: 'eloquent and persuasive (Communication)',
  Dex: 'deft and graceful (Dexterity)',
  Qik: 'quick to react (Quickness)',
};

const CHAR_PRESETS: Partial<Record<Characteristic, Record<string, number>>> = {
  Int: { scholar: 8, lab: 8, enchanter: 7 }, Per: { rogue: 7, explorer: 7, mystic: 7 }, Str: { warrior: 8 }, Sta: { warrior: 8, 'battle-mage': 7 },
  Pre: { social: 8, noble: 8, politician: 7 }, Com: { social: 8, politician: 8, scholar: 6 }, Dex: { warrior: 7, rogue: 8, craftsman: 7 }, Qik: { warrior: 7, rogue: 7, 'battle-mage': 7 },
};

export const EXPLAINERS = {
  progression:
    'Virtues that speed up progression (more experience, an Affinity, Elemental Magic, better study) pay off most when taken at the start, because they compound over every season of play. Flat bonuses (Puissant Art, a Magical Focus, Life Boost) give the same edge whenever you get them. But Virtues are hard to gain after creation: only through Initiation into a Mystery, Original Research or Twilight, all slow or risky. A magus may have only one Major Hermetic Virtue (DE p.63), so which one you take is the most build-defining choice you make: Elemental Magic and a Major Magical Focus, for example, can\'t both be had at the start.',
  narrow:
    'A Magical Focus adds your lowest Art in it a second time, but only inside its area (a Major Focus covers a broad area such as fire, a Minor one a narrow one such as healing wounds). Puissant Art and an Affinity help everything one Art does. Broad boosts such as Life Boost or Method Caster help every spell. Flaws like a Deficient Art or a Restriction pay for a narrow strength with a weakness elsewhere.',
  focus:
    'Hermetic magic adds a Technique to a Form, so one strong Technique helps every Form it is paired with, and one strong Form helps every Technique. Each extra point in an Art costs more experience than the last. Concentrating gets you high numbers early in a narrow specialty; spreading gets you more spells you can cast and learn, none of them great. Neither is wrong: it is what the character will spend their time on.',
  abilitiesVsArts:
    'An Ability costs five times as much experience per level as an Art. After play starts, Arts have more ways to grow: raw vis, the covenant’s Art books, and experience from lab work. Abilities mostly grow from teachers and Ability books. So experience spent on Abilities at creation buys the harder-to-replace thing, at the cost of weaker Casting and Lab Totals for the first few seasons. A good covenant library tips this towards Abilities; a poor one towards Arts.',
};

export const QUESTIONS: Question[] = [
  // ------------------------------------------------------------------ A. Big picture
  { id: 'a-complexity', section: 'A', text: 'I’m happy to take options that add extra rules and complexity.', tags: { complexity: 1, 'spell-like': 1 }, build: true },
  {
    id: 'a-progression', section: 'A', types: MAGI, build: true, explainer: EXPLAINERS.progression,
    text: 'At the start of play, I’d rather have Virtues that make my magus grow faster than ones that give fixed bonuses now.', low: 'fixed bonuses now', high: 'faster growth', tags: { progression: 1 },
  },
  { id: 'a-house', section: 'A', text: 'I care which House my magus belongs to.', tags: {}, types: MAGI, build: true },
  { id: 'a-chars', section: 'A', text: 'I care about my character’s Characteristics (Intelligence, Stamina and so on).', tags: { chars: 1 }, build: true },
  ...CHARACTERISTICS.map((c): Question => ({ id: `a-char-${c}`, section: 'A', parent: 'a-chars', text: `My character is ${CHAR_TEXT[c]}.`, tags: { [`char:${c}`]: 1 }, build: true, presets: CHAR_PRESETS[c] })),
  { id: 'a-focus', section: 'A', text: 'I’d rather be excellent at a few things than decent at many.', tags: { specialist: 1 }, build: true, explainer: EXPLAINERS.focus },
  { id: 'a-abilities', section: 'A', text: 'When play starts, I’d rather have strong Abilities than strong Arts.', low: 'strong Arts', high: 'strong Abilities', tags: {}, types: MAGI, build: true, explainer: EXPLAINERS.abilitiesVsArts },

  // ------------------------------------------------------------------ O. What your magus does: activities, their outputs, then broad or narrow
  { id: 'o-cast', section: 'O', text: 'Casting spells during stories is a big part of how I want to play.', tags: { casting: 1 }, types: MAGI, build: true, presets: { 'battle-mage': 9, warrior: 7, healer: 7, elemental: 8 } },
  { id: 'c-fight', section: 'O', parent: 'o-cast', text: 'I expect to cast spells in the middle of a fight.', tags: { speed: 1, casting: 0.3, concentration: 0.5, fatigue: 0.5 }, types: MAGI, presets: { 'battle-mage': 9, warrior: 7 } },
  { id: 'd-penetrate', section: 'O', parent: 'o-cast', text: 'I’ll need to get my spells past other magi’s or magical creatures’ defences.', tags: { penetration: 1 }, types: MAGI, presets: { 'battle-mage': 8, 'demon-hunter': 8 } },
  { id: 'c-improvise', section: 'O', parent: 'o-cast', text: 'I’d rather improvise a spell on the spot than learn exactly the right one.', tags: { spont: 1, flexible: 0.5 }, types: MAGI },
  { id: 'c-no-fatigue', section: 'O', parent: 'c-improvise', text: 'I’d rather my spontaneous magic didn’t tire me.', tags: { 'no-fatigue': 1, fatigue: 0.5 }, types: MAGI },
  { id: 'c-flexible', section: 'O', parent: 'c-improvise', text: 'I’d like to bend my learned spells to fit the moment (more range, a longer duration, a bigger target).', tags: { flexible: 1 }, types: MAGI },
  { id: 'c-trade', section: 'O', parent: 'o-cast', text: 'I’d spend Fatigue, even Wounds, to make a spell much stronger when it counts.', tags: { 'cost-power': 1, casting: 0.3, penetration: 0.3 }, types: MAGI },
  { id: 'c-ritual', section: 'O', parent: 'o-cast', text: 'I care about ritual magic: big, slow ceremonies that use vis.', tags: { ritual: 1 }, types: MAGI },
  { id: 'c-mastery', section: 'O', parent: 'o-cast', text: 'I’d like a few signature spells I know inside out.', tags: { mastery: 1 }, types: MAGI },
  { id: 'e-lab', section: 'O', text: 'I want to spend most of my seasons in the lab.', low: 'always out adventuring', high: 'rarely leaves the lab', tags: { lab: 1, adventure: -1 }, types: MAGI, build: true, presets: { lab: 9, enchanter: 8, scholar: 7, warrior: 3, explorer: 3 } },
  { id: 'e-invent', section: 'O', parent: 'e-lab', text: 'In the lab: inventing new spells.', tags: { 'lab-invent': 1 }, types: MAGI },
  { id: 'e-texts', section: 'O', parent: 'e-lab', text: 'In the lab: learning spells from other magi’s lab texts.', tags: { 'lab-texts': 1 }, types: MAGI },
  { id: 'e-enchant', section: 'O', parent: 'e-lab', text: 'In the lab: enchanting items.', tags: { 'lab-enchant': 1 }, types: MAGI, presets: { enchanter: 9 } },
  { id: 'e-longevity', section: 'O', parent: 'e-lab', text: 'In the lab: longevity rituals, for yourself and others.', tags: { 'lab-longevity': 1, aging: 0.5 }, types: MAGI },
  { id: 'e-familiar', section: 'O', parent: 'e-lab', text: 'In the lab: binding and strengthening a familiar.', tags: { 'lab-familiar': 1, companion: 0.5 }, types: MAGI, presets: { beast: 8 } },
  { id: 'e-experiment', section: 'O', parent: 'e-lab', text: 'In the lab: experimenting, and chasing breakthroughs.', tags: { experiment: 1 }, types: MAGI },
  { id: 'o-lab-vis', section: 'O', parent: 'e-lab', text: 'In the lab: extracting vis from the aura.', tags: { vis: 1 }, types: MAGI },
  { id: 'e-teach', section: 'O', parent: 'e-lab', text: 'Teaching apprentices and writing books.', tags: { teaching: 1, writing: 1 }, types: MAGI },
  { id: 'e-adventure-learn', section: 'O', parent: 'e-lab', when: 'low', text: 'When I’m out adventuring, I’d like it to teach me as much as the lab would.', tags: { adventure: 1, xp: 0.5 }, types: MAGI },
  {
    id: 'o-narrow', section: 'O', types: MAGI, build: true, explainer: EXPLAINERS.narrow,
    text: 'I’d rather my magic be superb in one area than a bit better at everything.', low: 'a bit better at everything', high: 'superb in one area', tags: { focus: 0.6, 'one-art': 0.6, specialist: 0.3 },
  },
  { id: 'o-narrow-focus', section: 'O', parent: 'o-narrow', text: 'That area is a kind of effect that runs across Arts, such as healing, fire, animals or illusions.', tags: { focus: 1 }, types: MAGI },
  { id: 'o-narrow-art', section: 'O', parent: 'o-narrow', text: 'That area is one Art (a Technique or a Form).', tags: { 'one-art': 1 }, types: MAGI },
  { id: 'o-narrow-cost', section: 'O', parent: 'o-narrow', text: 'I’d accept a weakness elsewhere in my magic to pay for it.', tags: { 'trade-off': 1 }, types: MAGI },
  { id: 'o-swing', section: 'O', text: 'I’m fine with magic that is stronger at some times and weaker at others (by season, day and night, or the moon).', low: 'always the same', high: 'happy with ups and downs', tags: { swingy: 1 }, types: MAGI },
  { id: 'o-archetype', section: 'O', text: 'I have a particular kind of magus in mind. (Pick any that strike your fancy.)', tags: {}, types: MAGI, noHint: true, presets: Object.fromEntries(ARCHETYPES.filter((a) => a.preset).map((a) => [a.preset!, 8])) },
  ...ARCHETYPES.map((a): Question => ({
    id: `o-arch-${a.id}`, section: 'O', parent: 'o-archetype', types: MAGI, chip: true, text: `${a.name}: ${a.blurb}.`, tags: { [`arch:${a.id}`]: 1, ...a.tags }, presets: a.preset ? { [a.preset]: 9 } : undefined,
  })),

  // ------------------------------------------------------------------ B. The Arts
  { id: 'b-arts', section: 'B', text: 'I care which Arts my magus is best at.', tags: {}, types: MAGI, build: true, presets: { elemental: 8, lab: 7, 'battle-mage': 7, healer: 7, beast: 7 } },
  ...ARTS.map((a): Question => ({
    id: `b-art-${a}`, section: 'B', parent: 'b-arts', types: MAGI, build: true, presets: ART_PRESETS[a],
    text: `${ART_NAMES[a]} (${(TECHNIQUES as readonly string[]).includes(a) ? 'Technique' : 'Form'}: ${ART_BLURB[a]}).`, tags: { [`art:${a}`]: 1 },
  })),

  // ------------------------------------------------------------------ C. How you cast
  { id: 'c-hidden', section: 'C', text: 'I’ll often cast where people mustn’t see or hear me doing magic.', tags: { silent: 1 }, types: MAGI, presets: { rogue: 8, social: 7 } },
  { id: 'c-range', section: 'C', text: 'My spells will need to reach far away.', tags: { range: 1 }, types: MAGI },
  { id: 'c-duration', section: 'C', text: 'My spells will need to last a long time.', tags: { duration: 1 }, types: MAGI },
  { id: 'c-target', section: 'C', text: 'My spells will need to affect a lot of people or things at once.', tags: { target: 1 }, types: MAGI },
  { id: 'c-shape', section: 'C', text: 'I’d like to cast while in an animal’s shape.', tags: { shapechanged: 1 }, types: MAGI, presets: { beast: 8 } },
  { id: 'c-multi', section: 'C', text: 'I’d like to cast two spells at once.', tags: { multicast: 1 }, types: MAGI },
  { id: 'c-reliable', section: 'C', text: 'I want my magic to be dependable, with few disasters.', tags: { reliability: 1 }, types: MAGI },

  // ------------------------------------------------------------------ D. Magical conflict
  { id: 'd-resist', section: 'D', text: 'I expect hostile magic to be aimed at me.', tags: { 'magic-resistance': 1 }, presets: { 'demon-hunter': 8, 'battle-mage': 7 } },
  { id: 'd-realm-faerie', section: 'D', parent: 'f-faerie', text: 'I’ll be dealing with faeries through my magic.', tags: { 'realm:faerie': 0.5, penetration: 0.5 }, types: MAGI },
  { id: 'd-realm-divine', section: 'D', parent: 'f-divine', text: 'I’ll be dealing with holy figures and places through my magic.', tags: { 'realm:divine': 0.5, 'magic-resistance': 0.5 }, types: MAGI },
  { id: 'd-realm-infernal', section: 'D', parent: 'f-infernal', text: 'I’ll be dealing with demons through my magic.', tags: { 'realm:infernal': 0.5, penetration: 0.5, 'magic-resistance': 0.5 }, types: MAGI },
  { id: 'd-concentrate', section: 'D', text: 'I’ll need to keep spells going while things go wrong around me.', tags: { concentration: 1 }, types: MAGI },
  { id: 'd-fight', section: 'D', text: 'I expect to be in the thick of the fighting, not behind it.', tags: { combat: 1, soak: 1 }, types: NON_MAGI, presets: { warrior: 9 } },
  { id: 'd-hard-to-hurt', section: 'D', parent: 'd-fight', text: 'I’d like my character to shrug off blows that would fell others.', tags: { soak: 1, fatigue: 0.5 }, types: NON_MAGI },
  { id: 'd-first', section: 'D', parent: 'd-fight', text: 'I’d like my character to strike first.', tags: { speed: 1, 'char:Qik': 0.5 }, types: NON_MAGI },

  // ------------------------------------------------------------------ E. The lab and the long game
  { id: 'e-vis', section: 'E', text: 'I want to get more out of every pawn of vis.', tags: { vis: 1 }, types: MAGI },
  { id: 'e-study', section: 'E', text: 'I want to learn faster from books and teachers.', tags: { study: 1, xp: 0.5 }, presets: { scholar: 8 } },
  { id: 'e-time', section: 'E', text: 'I want plenty of free time for my own projects.', tags: { seasons: 1 }, types: NON_MAGI },
  { id: 'e-aging', section: 'E', text: 'I want my character to live a long time.', tags: { aging: 1 } },
  { id: 'e-warping', section: 'E', text: 'I want my character kept safe from Warping and Twilight.', low: 'drawn to Twilight', high: 'kept safe', tags: { warping: 1, twilight: 1 }, types: MAGI },

  // ------------------------------------------------------------------ F. Realms and the world
  { id: 'f-magic', section: 'F', text: 'I want my character’s story tied to the Magic realm: magical beasts, spirits and places of power.', tags: { 'realm:magic': 1 }, presets: { mystic: 7, beast: 6 } },
  { id: 'f-magic-blood', section: 'F', parent: 'f-magic', text: 'I’d like magic in my character’s own blood or body.', tags: { outsider: 1, 'realm:magic': 0.5 } },
  { id: 'f-magic-beasts', section: 'F', parent: 'f-magic', text: 'I’d like magical creatures as companions, not just foes.', tags: { companion: 1, animals: 0.5 } },
  { id: 'f-faerie', section: 'F', text: 'I want my character’s story tied to Faerie.', tags: { 'realm:faerie': 1 }, presets: { faerie: 9 } },
  { id: 'f-faerie-blood', section: 'F', parent: 'f-faerie', text: 'I’d like faerie heritage in my character’s own blood.', tags: { outsider: 1, 'realm:faerie': 0.5 }, presets: { faerie: 8 } },
  { id: 'f-faerie-courts', section: 'F', parent: 'f-faerie', text: 'I’d like dealings with the faerie courts: bargains, favours and games.', tags: { courts: 1 } },
  { id: 'f-divine', section: 'F', text: 'I want my character’s story tied to the Divine.', tags: { 'realm:divine': 1 }, presets: { faith: 9, 'demon-hunter': 7 } },
  { id: 'f-divine-faith', section: 'F', parent: 'f-divine', text: 'My character’s own faith should matter: prayer, relics, miracles.', tags: { church: 0.5, good: 0.5, 'realm:divine': 0.5 }, presets: { faith: 9 } },
  { id: 'f-divine-angels', section: 'F', parent: 'f-divine', text: 'I’d like angels, saints and holy places in my character’s stories.', tags: { visions: 0.5, 'realm:divine': 0.5 } },
  { id: 'f-infernal', section: 'F', text: 'I want my character’s story tied to the Infernal.', tags: { 'realm:infernal': 1 }, presets: { 'demon-hunter': 9 } },
  { id: 'f-infernal-hunt', section: 'F', parent: 'f-infernal', text: 'I’d like to hunt demons and their servants.', tags: { good: 0.5, combat: 0.5, 'realm:infernal': 0.5 }, presets: { 'demon-hunter': 9 } },
  { id: 'f-infernal-taint', section: 'F', parent: 'f-infernal', text: 'I’d like my character tempted or tainted by the Infernal.', tags: { vice: 1, secret: 0.5 } },
  { id: 'f-mundane', section: 'F', text: 'I want my character’s story tied to the mundane world: people, towns, trade and war.', tags: { 'realm:mundane': 1 }, presets: { noble: 7, craftsman: 7 } },
  { id: 'f-politics', section: 'F', text: 'I care about Hermetic politics and the Tribunal.', tags: { politics: 1, order: 1 }, types: NOT_GROGS, presets: { politician: 9 } },
  { id: 'f-politics-law', section: 'F', parent: 'f-politics', text: 'I’d like to be involved in Hermetic law: the Code, Quaesitores and trials.', tags: { politics: 0.5, investigation: 1 }, types: NOT_GROGS },
  { id: 'f-lords', section: 'F', text: 'I care about mundane power: lords, towns, the Church’s hierarchy.', tags: { nobility: 0.5, church: 0.5, leadership: 0.5 }, types: NOT_GROGS, presets: { noble: 8 } },
  { id: 'f-mystery', section: 'F', text: 'I’d like to be initiated into a Mystery Cult’s secrets.', tags: { mystery: 1 }, types: MAGI },
  { id: 'f-travel', section: 'F', text: 'My character will travel far and often.', tags: { travel: 1 }, presets: { explorer: 8 } },
  { id: 'f-senses', section: 'F', text: 'I’d like my character to sense the supernatural: see spirits, feel danger coming, find hidden things.', tags: { senses: 1, perception: 0.5 }, presets: { mystic: 8 } },

  // ------------------------------------------------------------------ G. Status, story and personality
  { id: 'g-wealth', section: 'G', text: 'My character is…', low: 'poor', high: 'wealthy', tags: { wealth: 1 }, presets: { noble: 9, craftsman: 7 } },
  { id: 'g-birth', section: 'G', text: 'My character was born…', low: 'humble', high: 'high-born', tags: { nobility: 1 }, presets: { noble: 9 } },
  { id: 'g-fame', section: 'G', text: 'My character is…', low: 'unknown', high: 'famous (or infamous)', tags: { fame: 1 } },
  { id: 'g-church', section: 'G', text: 'I want my character’s story to involve the Church.', tags: { church: 1 }, presets: { faith: 8 } },
  { id: 'g-good', section: 'G', text: 'I want my character’s story to involve doing right, whatever it costs.', tags: { good: 1 }, presets: { faith: 7, healer: 7 } },
  { id: 'g-family', section: 'G', text: 'I want my character’s story to involve family: kin who need, help or hinder them.', tags: { family: 1 } },
  { id: 'g-secret', section: 'G', text: 'I want my character’s story to involve a dark secret.', tags: { secret: 1 }, presets: { rogue: 7 } },
  { id: 'g-rival', section: 'G', text: 'I want my character’s story to involve rivals or enemies.', tags: { rival: 1 } },
  { id: 'g-patron', section: 'G', text: 'I want my character’s story to involve a patron or mentor.', tags: { patron: 1 } },
  { id: 'g-love', section: 'G', text: 'I want my character’s story to involve love and romance.', tags: { love: 1 } },
  { id: 'g-curse', section: 'G', text: 'I want my character’s story to involve a curse or strange misfortune.', tags: { curse: 1 } },
  { id: 'g-outsider', section: 'G', text: 'I want my character to be an outsider: foreign, strange-blooded or marked as different.', tags: { outsider: 1 } },
  { id: 'g-vice', section: 'G', text: 'I want my character’s story to involve temptation, vice or a hot temper.', tags: { vice: 1 } },
  { id: 'g-duty', section: 'G', text: 'I want my character’s story to involve oaths, duty and loyalty.', tags: { duty: 1 }, presets: { warrior: 7, noble: 6 } },
  { id: 'g-heroic', section: 'G', text: 'I want my character’s story to involve heroic deeds and legends.', tags: { heroic: 1, confidence: 0.5 } },
  { id: 'g-companion', section: 'G', text: 'I want a loyal animal or supernatural companion.', tags: { companion: 1 }, presets: { beast: 8 } },
  { id: 'g-visions', section: 'G', text: 'I want my character’s story to involve dreams, visions and prophecy.', tags: { visions: 1 }, presets: { mystic: 8 } },
  { id: 'g-temperament', section: 'G', text: 'I want my character to have a strong temperament that colours everything they do: cheerful, gloomy, stubborn or lazy.', tags: { temperament: 1 } },

  // ------------------------------------------------------------------ H. Abilities
  { id: 'h-scholar', section: 'H', text: 'I want my character to be good at languages and scholarship.', tags: { scholarship: 1 }, build: true, presets: { scholar: 9, healer: 6 } },
  { id: 'h-lore', section: 'H', text: 'I want my character to know the lore of the supernatural.', tags: { lore: 1 }, build: true, presets: { mystic: 8, 'demon-hunter': 8, faerie: 7 } },
  { id: 'h-social', section: 'H', text: 'I want my character to be good at persuasion and dealing with people.', tags: { social: 1 }, build: true, presets: { social: 9, politician: 8, noble: 7, rogue: 6 } },
  { id: 'h-lead', section: 'H', parent: 'h-social', text: 'I want my character to lead others: grogs, soldiers, a household.', tags: { leadership: 1 }, build: true, presets: { noble: 8 } },
  { id: 'h-fight', section: 'H', text: 'I want my character to be good at fighting.', tags: { combat: 1 }, build: true, presets: { warrior: 9, 'battle-mage': 5 } },
  { id: 'h-craft', section: 'H', text: 'I want my character to be good at a craft or trade.', tags: { crafts: 1 }, build: true, presets: { craftsman: 9, enchanter: 7 } },
  { id: 'h-outdoors', section: 'H', text: 'I want my character at home in the wilds, with animals.', tags: { outdoors: 1, animals: 0.5 }, build: true, presets: { explorer: 9, beast: 8 } },
  { id: 'h-stealth', section: 'H', text: 'I want my character good at stealth, watchfulness and sleight of hand.', tags: { stealth: 1, perception: 0.5 }, build: true, presets: { rogue: 9, explorer: 6 } },
  { id: 'h-healing', section: 'H', text: 'I want my character to be a healer.', tags: { healing: 1 }, build: true, presets: { healer: 9 } },
  { id: 'h-performance', section: 'H', text: 'I want my character to be a performer: music, song or story.', tags: { performance: 1 }, build: true },

  // ------------------------------------------------------------------ I. Covenant (only without a covenant in the toolkit)
  { id: 'i-vis', section: 'I', text: 'My covenant has…', low: 'little vis', high: 'plenty of vis', tags: {}, covenant: 'vis', types: MAGI },
  { id: 'i-wealth', section: 'I', text: 'My covenant is…', low: 'poor', high: 'rich', tags: {}, covenant: 'wealth' },
  { id: 'i-library', section: 'I', text: 'My covenant’s library is…', low: 'poor', high: 'excellent', tags: {}, covenant: 'library', types: MAGI },
  { id: 'i-aura', section: 'I', text: 'My covenant’s magical aura is…', low: 'weak', high: 'strong', tags: {}, covenant: 'aura', types: MAGI },
];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function childrenOf(id: string): Question[] {
  return QUESTIONS.filter((q) => q.parent === id);
}
