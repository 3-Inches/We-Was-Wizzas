// Outcome tags for the guided build: anything a player could want more or less of. Questions,
// Virtues and Flaws all connect through this one list. A preference tag is scored from the
// player's answers; gates (region, culture, type, House, Gift, gender) are never scored, only
// filtered, and live in the restrictions data instead.

import { ARTS, ART_NAMES, CHARACTERISTICS, CHAR_NAMES } from '../../data';
import { ARCHETYPES } from './magnitudes';

export type TagFamily = 'total' | 'char' | 'art' | 'realm' | 'currency' | 'casting' | 'activity' | 'theme' | 'archetype' | 'meta';

export interface OutcomeTag {
  id: string;
  family: TagFamily;
  label: string;
}

const t = (family: TagFamily, id: string, label: string): OutcomeTag => ({ id, family, label });

export const TAGS: OutcomeTag[] = [
  // totals: the numbers the game rolls against
  t('total', 'casting', 'Casting Totals'),
  t('total', 'spont', 'Spontaneous magic'),
  t('total', 'ritual', 'Ritual magic'),
  t('total', 'lab', 'Lab Totals'),
  t('total', 'lab-invent', 'Inventing spells'),
  t('total', 'lab-texts', 'Learning from lab texts'),
  t('total', 'lab-enchant', 'Enchanting items'),
  t('total', 'lab-longevity', 'Longevity rituals'),
  t('total', 'lab-familiar', 'Binding a familiar'),
  t('total', 'experiment', 'Experimentation and breakthroughs'),
  t('total', 'penetration', 'Penetration'),
  t('total', 'magic-resistance', 'Magic Resistance'),
  t('total', 'concentration', 'Concentration'),
  t('total', 'speed', 'Casting speed and Initiative'),
  t('total', 'reliability', 'Reliable magic (fewer botches)'),
  t('total', 'mastery', 'Spell Mastery'),
  t('total', 'soak', 'Soak and toughness'),
  t('total', 'combat', 'Fighting'),
  t('total', 'social', 'Social rolls'),
  t('total', 'perception', 'Awareness and senses'),
  // Characteristics
  t('char', 'chars', 'Characteristics in general'),
  ...CHARACTERISTICS.map((c) => t('char', `char:${c}`, CHAR_NAMES[c])),
  // Arts
  ...ARTS.map((a) => t('art', `art:${a}`, ART_NAMES[a])),
  // realms
  t('realm', 'realm:magic', 'The Magic realm'),
  t('realm', 'realm:faerie', 'Faerie'),
  t('realm', 'realm:divine', 'The Divine'),
  t('realm', 'realm:infernal', 'The Infernal'),
  t('realm', 'realm:mundane', 'The mundane world'),
  // currencies: what a character spends or gains over time
  t('currency', 'seasons', 'Free seasons'),
  t('currency', 'xp', 'Experience'),
  t('currency', 'progression', 'Faster progression (rather than flat bonuses)'),
  t('currency', 'vis', 'Vis'),
  t('currency', 'wealth', 'Money'),
  t('currency', 'warping', 'Safety from Warping'),
  t('currency', 'twilight', 'Safety from Twilight'),
  t('currency', 'aging', 'Long life'),
  t('currency', 'fatigue', 'Endurance (Fatigue and Wounds)'),
  t('currency', 'confidence', 'Confidence'),
  // casting conditions
  t('casting', 'range', 'Long Range'),
  t('casting', 'duration', 'Long Duration'),
  t('casting', 'target', 'Large Targets'),
  t('casting', 'silent', 'Casting unseen and unheard'),
  t('casting', 'shapechanged', 'Casting in another shape'),
  t('casting', 'multicast', 'Casting several spells at once'),
  t('casting', 'flexible', 'Flexible spells'),
  t('casting', 'no-fatigue', 'Casting without tiring'),
  t('casting', 'cost-power', 'Power at a physical cost'),
  // activities
  t('activity', 'study', 'Study'),
  t('activity', 'teaching', 'Teaching'),
  t('activity', 'writing', 'Writing books'),
  t('activity', 'adventure', 'Adventure'),
  t('activity', 'politics', 'Hermetic politics'),
  t('activity', 'investigation', 'Investigation'),
  t('activity', 'travel', 'Travel'),
  t('activity', 'outdoors', 'The outdoors'),
  t('activity', 'animals', 'Animals'),
  t('activity', 'crafts', 'Crafts and trades'),
  t('activity', 'healing', 'Healing'),
  t('activity', 'scholarship', 'Languages and scholarship'),
  t('activity', 'lore', 'Supernatural lore'),
  t('activity', 'leadership', 'Leadership'),
  t('activity', 'stealth', 'Stealth and sleight of hand'),
  t('activity', 'performance', 'Music and performance'),
  t('activity', 'senses', 'Sensing the supernatural'),
  // themes: what Story and Personality material is about
  t('theme', 'church', 'The Church'),
  t('theme', 'good', 'Doing right'),
  t('theme', 'nobility', 'Nobility and lordship'),
  t('theme', 'order', 'The Order of Hermes'),
  t('theme', 'family', 'Family'),
  t('theme', 'courts', 'Faerie courts and bargains'),
  t('theme', 'secret', 'A dark secret'),
  t('theme', 'rival', 'Rivals and enemies'),
  t('theme', 'patron', 'A patron or mentor'),
  t('theme', 'love', 'Love and romance'),
  t('theme', 'curse', 'Curses and misfortune'),
  t('theme', 'outsider', 'Outsiders and strange blood'),
  t('theme', 'fame', 'Reputation'),
  t('theme', 'vice', 'Temptation and vice'),
  t('theme', 'duty', 'Oaths, duty and loyalty'),
  t('theme', 'heroic', 'Heroes and legends'),
  t('theme', 'companion', 'Companions and familiars'),
  t('theme', 'visions', 'Dreams, visions and prophecy'),
  t('theme', 'mystery', 'Mystery Cults'),
  t('theme', 'temperament', 'A strong temperament'),
  // meta
  t('meta', 'complexity', 'Adds complexity'),
  t('meta', 'spell-like', 'Spell-like effects'),
  t('meta', 'other-book', 'Needs another book'),
  t('meta', 'specialist', 'Excellent at a few things'),
  t('meta', 'one-art', 'A boost to one Art'),
  t('meta', 'focus', 'A Magical Focus'),
  t('meta', 'trade-off', 'A weakness elsewhere, accepted'),
  t('meta', 'swingy', 'Stronger at some times, weaker at others'),
  // archetypes: Virtues that only make sense for one kind of character
  ...ARCHETYPES.map((a) => t('archetype', `arch:${a.id}`, a.name)),
];

export const TAG_BY_ID = new Map(TAGS.map((x) => [x.id, x]));

export const FAMILY_LABEL: Record<TagFamily, string> = {
  total: 'Totals',
  char: 'Characteristics',
  art: 'Arts',
  realm: 'Realms',
  currency: 'Currencies',
  casting: 'How you cast',
  activity: 'Activities',
  theme: 'Themes',
  archetype: 'Archetypes',
  meta: 'Other',
};

export function tagLabel(id: string): string {
  return TAG_BY_ID.get(id)?.label ?? id;
}

/** Tags a Flaw can only hurt (a number or a resource) as opposed to themes it pulls stories into. */
export function isMechanicalTag(id: string): boolean {
  const f = TAG_BY_ID.get(id)?.family;
  return f === 'total' || f === 'char' || f === 'art' || f === 'currency' || f === 'casting';
}

export function isThemeTag(id: string): boolean {
  return TAG_BY_ID.get(id)?.family === 'theme';
}
