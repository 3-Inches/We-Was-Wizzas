// The guided tutorials on the Guide page. Each is a list of steps; a step says where it happens
// (the panel offers to go there, and Next goes there itself), which control to point at (a
// data-tour name, the first found on the page), and, in the character wizard, which step to open.
// Steps explain, and the player does the clicking; a step can also offer to do the work (build a
// whole draft, apply a package), or to step into another tutorial and come back.

import type { CharType } from '../../data';
import { useStore } from '../../store/store';

export interface TourCtx {
  sagaId?: string;
  charId?: string;
  covId?: string;
}

export interface TourStep {
  title: string;
  /** markdown */
  body: string;
  /** the page this step happens on; undefined while what it needs is still to be made */
  at?: (c: TourCtx) => string | undefined;
  /** what `at` needs, for the line shown when it is missing */
  needs?: 'saga' | 'character' | 'covenant';
  /** data-tour names to point at, the first found */
  target?: string | string[];
  /** the character wizard step to open */
  wizard?: string;
  /** what the toolkit can do here for the player (see actions.ts); each can be undone */
  actions?: { id: TourActionId; label: string }[];
  /** another tutorial to step into here, coming back to this one when it ends */
  detour?: { tour: string; label: string };
  /** the step goes on by itself when the button it asks for is pressed: a button in the target (one whose label matches) */
  advance?: { press?: RegExp };
}

export type TourActionId = 'buildDraft' | 'basePackage' | 'standardLabs';

export type TourGroup = 'Start here' | 'The saga and covenant' | 'Characters' | 'Magic' | 'In play' | 'Storyguide';

export interface Tour {
  id: string;
  title: string;
  blurb: string;
  group: TourGroup;
  /** the kind of character the tour follows; any if unset */
  charType?: CharType;
  /** the tour works in a saga */
  inSaga?: boolean;
  /** the tour has the player make a character, and follows that one */
  makesCharacter?: boolean;
  /** the kind of character to follow when none is open, for a tour about any character */
  prefers?: CharType;
  /** follows a character still in creation (the newest draft when none is open) */
  wantsDraft?: boolean;
  /** when none is open, follows a character with a Craft or Profession (a livelihood to show) */
  prefersTrade?: boolean;
  /** when none is open, follows a character who works holy powers (a Holy Method and a Power) */
  prefersHoly?: boolean;
  /** the practice character the tutorial can make to work on, when the saga has none that suits */
  practice?: PracticeSpec;
  steps: TourStep[];
}

/** A practice character a tutorial makes: a finished one built by Quick build, or a blank draft. */
export interface PracticeSpec {
  type: CharType;
  /** a Quick build role (roles.ts) */
  role?: string;
  /** a blank character still in creation, for a tutorial about the wizard */
  draft?: boolean;
  /** the practice covenant gets people to work with: a few grogs, servants, craftsmen and money in the treasury */
  folk?: boolean;
  /** guided-build answers that steer the practice character (a Virtue by name: 'vf:invocation') */
  answers?: Record<string, number>;
  /** Virtues the practice character has whatever the build chose, given free if it did not take them */
  ensure?: string[];
  label: string;
}

import { toolkitTour } from './tutorials/toolkit';
import { playerTour } from './tutorials/player';
import { sagaTour } from './tutorials/saga';
import { covenantTour } from './tutorials/covenant';
import { optionalTour } from './tutorials/optional';
import { magusTour } from './tutorials/magus';
import { companionTour } from './tutorials/companion';
import { grogTour } from './tutorials/grog';
import { guidedTour } from './tutorials/guided';
import { spellTour } from './tutorials/spell';
import { powerTour } from './tutorials/power';
import { labTour } from './tutorials/lab';
import { quickTour } from './tutorials/quick';
import { tableTour } from './tutorials/table';
import { cityGuildTour } from './tutorials/cityGuild';
import { divineTour } from './tutorials/divine';
import { tribunalTour } from './tutorials/tribunal';
import { seasonTour } from './tutorials/season';

export const TOURS: Tour[] = [toolkitTour, playerTour, sagaTour, covenantTour, optionalTour, magusTour, companionTour, grogTour, guidedTour, spellTour, powerTour, labTour, quickTour, tableTour, cityGuildTour, divineTour, tribunalTour, seasonTour];

export const TOUR_BY_ID = new Map(TOURS.map((t) => [t.id, t]));

/**
 * Every tutorial in one run, in the order that builds on what came before: the saga, its covenant
 * and its characters, then magic, play between stories and at the table, and the storyguide's
 * tools. Each can be skipped; one that needs something not yet made offers a practice one.
 */
export const COURSE = ['toolkit', 'saga', 'covenant', 'magus', 'companion', 'grog', 'guided', 'player', 'optional', 'spell', 'power', 'lab', 'season', 'table', 'city-guild', 'divine', 'quick', 'tribunal'];

/** The tutorial after this one in the run. */
export function nextTour(id: string): Tour | undefined {
  const i = COURSE.indexOf(id);
  return i >= 0 && i < COURSE.length - 1 ? TOUR_BY_ID.get(COURSE[i + 1]) : undefined;
}

/** What a tutorial works on: a character (not one it makes), a covenant (not one it founds). */
export function tourNeeds(t: Tour): { character: boolean; covenant: boolean } {
  return { character: !t.makesCharacter && t.steps.some((s) => s.needs === 'character'), covenant: t.id !== 'covenant' && t.steps.some((s) => s.needs === 'covenant') };
}

/** Pages with a tutorial of their own: a tutorial that reaches one offers to step into it. */
export const DETOUR_OFFERS: { match: RegExp; tour: string; label: string }[] = [{ match: /^\/saga\/[^/]+\/character\/[^/]+\/guided/, tour: 'guided', label: 'Walk me through the guided build' }];

/** Start a tutorial, in the saga open now (or the one the tutorial before it used); `course` runs every tutorial after it in turn. */
export function startTour(id: string, o: { course?: boolean; sagaId?: string } = {}) {
  const st = useStore.getState();
  const sagaId = o.sagaId && st.sagas[o.sagaId] ? o.sagaId : st.activeSagaId && st.sagas[st.activeSagaId] ? st.activeSagaId : undefined;
  st.setTour({ id, step: 0, sagaId, startedAt: new Date().toISOString(), course: o.course || undefined });
}
