// The Nightwalkers (Hedge Magic, Revised Edition, Chapter Six): straying, the spirit's travel and the
// rolls around it (leading others astray, changing form in combat, drowsiness, remembering dreamed
// talk, recognizing a foe by day), and the fertility battles whose outcome sets the harvest.

import type { DerivedCharacter } from './character/derive';
import type { IncomeModification } from './types';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);

/** Spirit travel: Stamina + Athletics (+ stress die) against the destination's Ease Factor, +3 for each object carried beyond the tradition's own. */
export const STRAY_DESTINATIONS: { ease: number; text: string }[] = [
  { ease: 3, text: 'A place seen daily' },
  { ease: 6, text: 'A place seen in the last week' },
  { ease: 9, text: 'A place seen within the last year' },
  { ease: 12, text: 'A place visited before, by a known mundane route' },
  { ease: 15, text: 'A place never visited, by a known route or an Arcane Connection' },
];

export const strayEase = (base: number, objects = 0) => base + 3 * Math.max(0, objects);
export const strayTotal = (d: DerivedCharacter) => d.characteristics.Sta.value + score(d, 'athletics');

/** Leading a willing person astray: Stamina + Leadership against the journey's Ease Factor + 3, or 3 to draw them out where they are. */
export const leadTotal = (d: DerivedCharacter) => d.characteristics.Sta.value + score(d, 'leadership');
export const leadEase = (travelEase?: number) => (travelEase === undefined ? 3 : travelEase + 3);

/** Other rolls of the chapter. */
export const NIGHTWALKER_ROLLS: { what: string; roll: string; ease: string }[] = [
  { what: 'Becoming tangible or intangible, or changing between human and animal shape, in combat (three rounds otherwise)', roll: 'Stamina + Concentration', ease: '15' },
  { what: 'Staying awake near a hostile phantasticum (without Magic Resistance)', roll: 'Stamina + Concentration', ease: '3' },
  { what: 'Remembering a detailed conversation held in a dream', roll: 'Intelligence + Concentration', ease: '12' },
  { what: 'Finding an enemy of similar skill, or a champion, on the field of a night battle', roll: 'Perception + Awareness', ease: '9' },
  { what: 'Recognizing one of one’s own militia by day', roll: 'Perception + Awareness', ease: '15 − Reputation (12 − Reputation if met in processions)' },
  { what: 'Recognizing an Infernal witch fought at night', roll: 'Perception + Awareness', ease: '18 − Reputation' },
  { what: 'Seeing an intangible phantasticum', roll: 'Second Sight', ease: '9' },
];

/** A fertility battle's outcome, and the year's Income Modification it sets for the land (Covenants ch.5). */
export const BATTLE_OUTCOMES: { text: string; mod: IncomeModification }[] = [
  { text: 'The favored side is utterly defeated and harried through the countryside', mod: 'Slump' },
  { text: 'The favored side is routed', mod: 'Contraction' },
  { text: 'The favored side flees the field in good order', mod: 'Stagnation' },
  { text: 'The favored side wins the field', mod: 'Status Quo' },
  { text: 'The favored side routs its enemies', mod: 'Growth' },
  { text: 'The favored side harries the routed enemies through the night', mod: 'Expansion' },
  { text: 'The favored side traps and annihilates the enemy militia', mod: 'Boom' },
];

/** The sources of income a fertility battle governs: crops, herds, fish and the woods. */
export const HARVEST_INCOME = ['Agriculture', 'Livestock', 'Fishing', 'Forestry'];
