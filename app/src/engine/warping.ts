// What follows Warping Points. Each tradition has its own reaction to Warping, and the toolkit owes it
// on the Seasons page's Resolve list as the points come, so nobody has to remember it:
// - a Hermetic magus rolls to avoid Wizard's Twilight on 2 or more points from a single event, not from
//   prolonged exposure, or a single magical botch with Twilight Prone (DE, Entering Twilight; Twilight Prone);
// - a folk witch suffers the Witch Moon each time the Warping Score rises, whatever the source
//   (HMRE, The Witch Moon, line 2069);
// - a vitki rolls to avoid Nátt-thel on 2 or more points from a single event, or a single supernatural
//   botch with Nátt-thel Prone (HMRE, Nátt-thel, line 6350; Nátt-thel Prone, line 6314);
// - one with Sympathy Traits and no tradition of another realm suffers Faerie Calling on 2 or more points
//   at once (RoP: Faerie, Faerie Calling, lines 6717 and 6739).
// The Magic realm's traditions take precedence over Faerie (line 6739): a learned magician, gruagach or
// elementalist has a reaction of their own and does not suffer the Calling.

import { uid } from '../util/id';
import type { DerivedCharacter } from './character/derive';
import { isElementalist } from './elementalMagic';
import { callingApplies } from './faerieWizardry';
import { isFolkWitch, witchWarping } from './folkWitch';
import { isGruagach } from './gruagach';
import { isLearnedMagician } from './learnedMagic';
import type { Character, Owed, Season } from './types';
import { isVitki, nattThelFollows } from './vitkir';
import { warpingScoreFromPoints } from './xp';

export type WarpingReaction = Extract<Owed['kind'], 'twilight' | 'witch-moon' | 'natt-thel' | 'calling'>;

/** What the character suffers in place of the ordinary effects of Warping, if anything the toolkit follows. */
export function warpingReaction(c: Character, d: DerivedCharacter): WarpingReaction | undefined {
  if (d.isMagus) return 'twilight';
  if (isFolkWitch(c)) return 'witch-moon';
  if (isVitki(c, d)) return 'natt-thel';
  if (isLearnedMagician(c, d) || isGruagach(c, d) || isElementalist(c, d)) return undefined;
  return callingApplies(c, d) ? 'calling' : undefined;
}

/** The name of each reaction, as the books give it. */
export const REACTION_NAMES: Record<WarpingReaction, string> = {
  twilight: 'Wizard’s Twilight',
  'witch-moon': 'the Witch Moon',
  'natt-thel': 'Nátt-thel',
  calling: 'Faerie Calling',
};

export interface WarpingGain {
  points: number;
  /** where they came from, to finish "N Warping Points …": "from a botched casting" */
  why: string;
  /** the season it happened in, for the Resolve list */
  year: number;
  season: Season;
  /** from a botch: Twilight Prone and Nátt-thel Prone react to a single point */
  botch?: boolean;
  /** from prolonged exposure (a year in an aura, a constant effect): only the Witch Moon follows */
  prolonged?: boolean;
  /** the reaction is rolled where the points came, so it is not owed again */
  handled?: boolean;
}

/** Whether a gain of Warping Points brings on the reaction. `before` is the Warping Points before the gain. */
export function reactionFollows(c: Character, d: DerivedCharacter, reaction: WarpingReaction, g: Pick<WarpingGain, 'points' | 'botch' | 'prolonged'>, before: number): boolean {
  if (g.points <= 0) return false;
  if (reaction === 'witch-moon') return warpingScoreFromPoints(before + g.points) > warpingScoreFromPoints(before) && !c.folkWitch?.witchMoon;
  if (g.prolonged) return false;
  if (reaction === 'twilight') return g.points >= 2 || (!!g.botch && d.twilightProne);
  if (reaction === 'natt-thel') return nattThelFollows(c, g.points, g.botch);
  return g.points >= 2;
}

const pts = (n: number) => `${n} Warping Point${n === 1 ? '' : 's'}`;

/** The line owed on the Resolve list (the Witch Moon's is folkWitch.ts's). */
function owedText(reaction: WarpingReaction, g: WarpingGain): string {
  const gained = `${pts(g.points)} ${g.why}`.trim();
  if (reaction === 'twilight') return `${gained}: roll to avoid Wizard’s Twilight.`;
  if (reaction === 'natt-thel') return `${gained}: roll Stamina + Concentration to avoid Nátt-thel.`;
  return `${gained}: Faerie Calling. Play out the scene, then roll to resolve it.`;
}

/**
 * Add Warping Points to a character and owe what follows on the Resolve list. Changes `c`. Returns a line
 * to add to the result that brought the points, when something follows.
 */
export function gainWarping(c: Character, d: DerivedCharacter, g: WarpingGain): string | undefined {
  if (g.points <= 0) return undefined;
  if (!g.handled && warpingReaction(c, d) === 'witch-moon') return witchWarping(c, g.points, g);
  const before = c.warpingPoints;
  c.warpingPoints += g.points;
  const reaction = warpingReaction(c, d);
  if (!reaction || g.handled || !reactionFollows(c, d, reaction, g, before)) return undefined;
  (c.owed ??= []).push({ uid: uid(), year: g.year, season: g.season, kind: reaction, text: owedText(reaction, g), points: g.points });
  return `${REACTION_NAMES[reaction][0].toUpperCase()}${REACTION_NAMES[reaction].slice(1)} follows: it waits on Game Table › Seasons, under Resolve.`;
}

/** The oldest of a reaction still owed, if any. */
export const owedReaction = (c: Pick<Character, 'owed'>, reaction: WarpingReaction) => c.owed?.find((o) => o.kind === reaction);

/** The saga's season, for a gain of Warping Points made at the table. */
export const nowOf = (saga?: { currentYear: number; currentSeason: Season }) => ({ year: saga?.currentYear ?? 0, season: saga?.currentSeason ?? ('Spring' as Season) });
