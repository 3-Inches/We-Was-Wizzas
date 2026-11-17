// The Church (Ars Magica Fifth Edition): Devotion to the saints and its Devotion Points; indulgences,
// vigils and fasting; pilgrimages and their Oppositional Elements; the contemplative mystic's
// Spiritual Paths and the monistic mystic's Revelations. (Petitioning the Church is in society.ts.)

import type { DerivedCharacter } from './character/derive';
import type { Character } from './types';
import { abilityScoreFromXp } from './xp';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);

// ------------------------------------------------------------------------------------------------
// Devotion

/** A Devotion advances as an Ability, on Devotion Points rather than experience. */
export const devotionScore = (points: number) => abilityScoreFromXp(Math.max(0, points));

/** The Pious score that sets Devotions: the Personality Trait, or 3 for the Minor Pious Flaw and 6 for the Major. */
export function piousScore(c: Pick<Character, 'personality' | 'virtues'>): number {
  const trait = c.personality.filter((p) => /^pious/i.test(p.trait.trim())).reduce((m, p) => Math.max(m, p.score), 0);
  const flaw = c.virtues.find((v) => v.defId === 'pious-flaw');
  return Math.max(trait, flaw ? (flaw.size === 'Major' ? 6 : 3) : 0);
}

/** At creation a pious Christian has that many saints at Devotion 0 and that many Devotion Points to share among them. */
export const creationDevotionPoints = (c: Pick<Character, 'personality' | 'virtues'>) => piousScore(c);

/** A relic of the saint adds its Faith Points × 2 to the Devotion Total, once a day, and waives the unfamiliar saint’s −15. */
export const relicDevotionBonus = (faithPoints: number) => 2 * Math.max(0, faithPoints);

/** Ways to gain Devotion Points, with the book's amounts. Those marked `season` take a season, and are worked on the Seasons page. */
export const DEVOTION_GAINS: { id: string; label: string; min: number; max: number; text: string; season?: true }[] = [
  { id: 'season', label: 'A season of personal devotion at the saint’s shrine', min: 5, max: 5, text: 'Exposure in Dominion or Church Lore the only experience.', season: true },
  { id: 'endow', label: 'Endowing a church, chapel or monastery to the saint', min: 5, max: 50, text: '5 for a small chapel without a story, 50 for a cathedral at the center of a saga.' },
  { id: 'guild', label: 'The saint’s guild', min: 2, max: 3, text: '3 on joining, 2 on becoming a journeyman, 2 a master.' },
  { id: 'site', label: 'Visiting a site of the saint (tomb, relic, martyrdom, miracle)', min: 1, max: 10, text: '1 in one’s home town; 5 or more for a season’s journey or out of the way; 10 for a hazardous story of a season.' },
  { id: 'art', label: 'Sponsoring church art of the saint', min: 1, max: 20, text: 'Its Aesthetic Quality; only the best work for each saint counts.' },
  { id: 'hagiography', label: 'A season studying the saint’s hagiography', min: 1, max: 10, text: 'Its Quality ÷ 2 (a general work on the saints, 1 once per saint; a work by the saint, 5 a season).', season: true },
  { id: 'cultus', label: 'Furthering the saint’s cultus', min: 3, max: 30, text: 'The Petition Ease Factor: recognition, a work accepted, a church consecrated.' },
  { id: 'miracle', label: 'Witnessing a genuine miracle of the saint', min: 5, max: 10, text: '10 when it saved one’s life; none if invoked trivially.' },
  { id: 'procession', label: 'The saint’s feast-day procession', min: 1, max: 6, text: '1 if part of a story or a hardship, 1 to 5 more for honoring the saint beyond the usual.' },
  { id: 'pilgrimage', label: 'A pilgrimage to the saint’s shrine', min: 10, max: 20, text: '10, +5 for each other site of the saint’s life, up to 5 more for relics seen.' },
  { id: 'vision', label: 'A dream or vision from the saint (Visions or Premonitions)', min: 1, max: 1, text: 'During a story.' },
  { id: 'feast', label: 'The saint’s day not kept', min: -3, max: -3, text: 'At least 3 lost; the day is lost to seasonal work when it is kept.' },
];

// ------------------------------------------------------------------------------------------------
// Indulgences, vigils, fasting, the cross

export const DEVOTIONAL_PRACTICES: { id: string; label: string; text: string }[] = [
  { id: 'indulgence', label: 'An indulgence', text: 'Shortens a penance, in free seasons. About 6 pennies a season for the poor, a pound or more a season for the wealthy, and a season of charitable works: experience in a Reputation for Piety equal to the seasons bought, and one temporary Faith Point (spent as Confidence).' },
  { id: 'vigil', label: 'A vigil', text: 'A night of prayer before an important event: a Fatigue level lost until a full night’s sleep, and a Confidence Point for the next day’s virtuous task.' },
  { id: 'fast', label: 'A fast', text: 'A season on bread and water: +1 (not cumulative) to petitioning a saint, and a Fatigue level all season.' },
  { id: 'cross', label: 'Taking the cross', text: 'A vow to serve a crusade: a temporary Faith Point, and all outstanding penance forgiven. In 1220: the Albigensian Crusade, the Fifth Crusade at Damietta, the Northern Crusade, and Iberia.' },
];

// ------------------------------------------------------------------------------------------------
// Pilgrimage

/** What a pilgrimage seeks, and the Target Level its Oppositional Elements must reach. */
export const PILGRIMAGE_AIMS: { target: 18 | 30; label: string }[] = [
  { target: 18, label: 'A Minor Virtue (a Divine Supernatural Ability at 1)' },
  { target: 18, label: 'To lose a Minor Flaw (or Virtue)' },
  { target: 18, label: 'To remove a negative Personality Trait' },
  { target: 18, label: 'A penance of 18' },
  { target: 30, label: 'A Major Virtue (a Divine Ability, Method or Power)' },
  { target: 30, label: 'To lose a Major Flaw (or Virtue)' },
  { target: 30, label: 'To ask for a miracle' },
  { target: 30, label: 'To self-initiate in Holy Magic (True Faith)' },
  { target: 30, label: 'A penance of 30' },
];

/** The Oppositional Elements a pilgrim overcomes; travel abroad counts once, the higher of the two. */
export const OPPOSITIONAL_ELEMENTS: { value: number; label: string; once?: 'abroad' }[] = [
  { value: 3, label: 'A season on the road' },
  { value: 3, label: 'Natural hazards: virulent disease' },
  { value: 3, label: 'A Christian land outside one’s homeland', once: 'abroad' },
  { value: 3, label: 'A temptation of a sort one is prone to' },
  { value: 3, label: 'Another trial of faith and perseverance' },
  { value: 6, label: 'Dangerous mundane foes: bandits or robbers' },
  { value: 6, label: 'Religious or political enemies' },
  { value: 6, label: 'Dangerous natural hazards: storms, avalanches, blizzards' },
  { value: 6, label: 'Non-Christian or heretic-held lands', once: 'abroad' },
  { value: 6, label: 'A harder trial of faith' },
  { value: 9, label: 'A supernatural encounter on the road' },
  { value: 9, label: 'A shipwreck' },
  { value: 9, label: 'Distractions that make abandoning it attractive' },
  { value: 9, label: 'A great trial of faith' },
  { value: 12, label: 'Direct demonic opposition' },
];

/** Elements overcome, with the travel-abroad bonus counted once (the higher). */
export function pilgrimageProgress(overcome: { value: number; once?: string }[], target: number): { total: number; left: number; done: boolean } {
  const abroad = overcome.filter((x) => x.once === 'abroad').reduce((m, x) => Math.max(m, x.value), 0);
  const total = overcome.filter((x) => x.once !== 'abroad').reduce((s, x) => s + x.value, 0) + abroad;
  return { total, left: Math.max(0, target - total), done: total >= target };
}

// ------------------------------------------------------------------------------------------------
// Mysticism

/** A contemplative's Spiritual Path: the Path Total for the Revelation sought. */
export const PATH_TOTALS: { total: number; label: string }[] = [
  { total: 15, label: 'A Minor Holy Method, Power or Supernatural Ability' },
  { total: 18, label: 'A Minor Virtue' },
  { total: 27, label: 'A Major Holy Method, Power or Supernatural Ability' },
  { total: 30, label: 'A Major Virtue (never True Faith)' },
];

/** The Path Target: the Path Total less the Pious score. */
export const pathTarget = (pathTotal: number, pious: number) => Math.max(0, pathTotal - Math.max(0, pious));

/** Quest Components (The Church, Spiritual Paths). Those marked `season` take a season, and are worked on the Seasons page; `once` counts only once. */
export const QUEST_COMPONENTS: { value: number; label: string; season?: true; once?: true }[] = [
  { value: 1, label: 'A season serving the poor or the Church', season: true },
  { value: 1, label: 'A season of personal devotion (a Devotion Point, exposure in Dominion Lore)', season: true },
  { value: 3, label: 'A season preaching the Gospel (once)', season: true, once: true },
  { value: 6, label: 'A minor pilgrimage to a fitting shrine (a story)' },
  { value: 6, label: 'A Vow (a new Minor Flaw)' },
  { value: 6, label: 'A quest (a story: a supernatural foe, protecting innocents, healing)' },
  { value: 9, label: 'A season preaching to heretics, pagans or infidels (a story)', season: true },
  { value: 9, label: 'Exposing error or corruption and having it put right (a story)' },
  { value: 9, label: 'Giving away one’s wealth (lose Wealthy, or gain Poor)' },
  { value: 9, label: 'A year on a Church-sanctioned crusade' },
];

/** A season at a saint's shrine: "5 Devotion Points. The only Experience Points gained are exposure in Church Lore or Dominion Lore" (The Church, line 769). */
export const SHRINE_SEASON_POINTS = 5;

export type HagiographyKind = 'about' | 'by' | 'general';

/**
 * Devotion Points for a season with a hagiography (The Church, line 789): Quality ÷ 2 for a work entirely
 * about the saint, or by the saint (the City of God, Quality 10, gives 5); a general work on the saints 1,
 * once for each saint. The book does not say how an odd Quality rounds; it is rounded down here.
 */
export function hagiographyPoints(kind: HagiographyKind, quality: number, generalBefore = false): number {
  if (kind === 'general') return generalBefore ? 0 : 1;
  return Math.floor(Math.max(0, quality) / 2);
}

/**
 * Which Church cards can apply: "an impious character does not possess Devotions" (The Church, line 727),
 * and both mystic's paths need a positive Pious. What is already under way is always shown.
 */
export function churchCardsOpen(c: Pick<Character, 'personality' | 'virtues' | 'devotions' | 'spiritualPath'>): { devotions: boolean; mystic: boolean } {
  const pious = piousScore(c) > 0;
  return { devotions: pious || !!c.devotions?.length, mystic: pious || !!c.spiritualPath };
}

/** Who may walk a contemplative's path: positive Pious, no sinful traits, the Divine's. */
export function contemplativeProblems(c: Character, d: DerivedCharacter): string[] {
  const out: string[] = [];
  if (piousScore(c) <= 0) out.push('a positive Pious Personality Trait');
  if (!d.trueFaith && !d.abilities.some((a) => /sense-holy|holy|divine/i.test(a.abilityId)) && !c.virtues.some((v) => /true-faith/.test(v.defId))) out.push('a tie to the Divine (True Faith, a Divine Supernatural Ability, or Divine Warping)');
  return out;
}

/** A monistic mystic practicing a Holy Ability gains experience equal to Concentration, not 4. */
export const monisticPracticeXp = (d: DerivedCharacter) => Math.max(4, score(d, 'concentration'));

/** On Divine Ascent, integrating it: Intelligence + Concentration + stress die against Warping Score + stress die (no botch). */
export const monisticIntegration = (d: DerivedCharacter) => d.characteristics.Int.value + score(d, 'concentration');

/** What an integrated Revelation may give, by the Warping Points gained. */
export function monisticRevelations(gained: number, first: boolean): string[] {
  const out = ['Keep the mundane experience Divine Gloom would take (the Warping and holy experience still come).'];
  if (gained >= 3) out.push(first ? 'Second Sight (the first Revelation is always Second Sight).' : `A ${gained >= 5 ? 'Major' : 'Minor'} Virtue fitting the Revelation.`);
  if (gained >= 7) out.push('Dominion Lore stands for Magic or Faerie Lore (then the other, then Infernal Lore).');
  return out;
}
