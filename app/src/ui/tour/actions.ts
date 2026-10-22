// What a tutorial can do for the player when asked: the heavy lifting the toolkit already knows how
// to do, run on the saga, character or covenant the tutorial is following. Each goes through the
// store, so it can be undone like any other change. Loaded with the tutorial panel only.

import { autoBuild, resetChoices } from '../../engine/guided/autobuild';
import { applyBaseCovenant } from '../../engine/covenant';
import { newLab } from '../../engine/lab';
import { gameDataFor } from '../../store/hooks';
import { useStore } from '../../store/store';
import { visibleSteps } from '../character/wizardSteps';
import type { TourActionId, TourCtx } from './tours';

export interface ActionResult {
  /** what was done, for the notice */
  notice: string;
  /** the title of the tutorial step to go on to */
  goto?: string;
}

/** Build a whole draft of the character from its concept themes and any guided-build answers. */
function buildDraft(c: TourCtx): ActionResult | undefined {
  const st = useStore.getState();
  const ch = c.charId ? st.characters[c.charId] : undefined;
  const saga = c.sagaId ? st.sagas[c.sagaId] : undefined;
  if (!ch || !saga) return undefined;
  const x = structuredClone(ch);
  resetChoices(x);
  const covenant = x.covenantId ? st.covenants[x.covenantId] : undefined;
  const res = autoBuild(x, x.guided ?? { answers: {}, declined: [] }, { data: gameDataFor(saga), rules: saga.houseRules, saga, covenant, archetypes: x.creation.archetypes ?? [] });
  x.creation.step = visibleSteps(x.type).findIndex((s) => s.id === 'review');
  x.updatedAt = new Date().toISOString();
  st.putCharacter(x);
  const left = res.remaining.length ? ` ${res.remaining.length} issue${res.remaining.length > 1 ? 's' : ''} left for you to settle.` : '';
  return { notice: `Built a whole draft: ${res.log.length} choices, each with its reason.${left} Undo puts the character back as it was.`, goto: 'Review and finalize' };
}

function basePackage(c: TourCtx): ActionResult | undefined {
  const st = useStore.getState();
  if (!c.covId || !st.covenants[c.covId]) return undefined;
  st.updateCovenant(c.covId, (x) => applyBaseCovenant(x, 'Medium'));
  return { notice: 'Applied the Medium package: 800 Build Points, a starting library, lab texts and vis, their subjects still to choose.' };
}

function standardLabs(c: TourCtx): ActionResult | undefined {
  const st = useStore.getState();
  const cov = c.covId ? st.covenants[c.covId] : undefined;
  if (!cov) return undefined;
  const magi = cov.memberIds.map((id) => st.characters[id]).filter((m) => m?.type === 'magus' && !cov.labs.some((l) => l.ownerId === m.id));
  if (!magi.length) return { notice: 'Every member magus already has a laboratory.' };
  st.updateCovenant(cov.id, (x) => void x.labs.push(...magi.map((m) => newLab(`${m.name || 'Magus'}'s laboratory`, m.id))));
  return { notice: `Gave ${magi.length} ${magi.length > 1 ? 'magi' : 'magus'} a standard laboratory.` };
}

export const ACTIONS: Record<TourActionId, (c: TourCtx) => ActionResult | undefined> = { buildDraft, basePackage, standardLabs };
