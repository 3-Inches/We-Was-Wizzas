// What a tutorial can do for the player when asked: the heavy lifting the toolkit already knows how
// to do, run on the saga, character or covenant the tutorial is following. Each goes through the
// store, so it can be undone like any other change. Loaded with the tutorial panel only.

import { autoBuild, resetChoices } from '../../engine/guided/autobuild';
import { applyBaseCovenant, newCovenant } from '../../engine/covenant';
import { newCharacter } from '../../engine/character/factory';
import { generateCharacter } from '../../engine/generate/character';
import { newWorkshop } from '../../engine/workshop';
import { newSeed } from '../../engine/generate/random';
import type { Character, Covenant } from '../../engine/types';
import { newLab } from '../../engine/lab';
import { gameDataFor } from '../../store/hooks';
import { useStore } from '../../store/store';
import { visibleSteps } from '../character/wizardSteps';
import { tourNeeds, type Tour, type TourActionId, type TourCtx } from './tours';

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

/**
 * What a tutorial needs to work on, made for practice: the saga if none is open, the covenant if it
 * has none (the Medium package), and the tutorial's practice character (a finished one from Quick
 * build, with a laboratory for a magus, or a blank draft). One Undo takes it all back.
 */
export function makePractice(tour: Tour, c: TourCtx, what: { character?: boolean; covenant?: boolean } = tourNeeds(tour)): { sagaId: string; charId?: string; covId?: string; notice: string } {
  const st = useStore.getState();
  const saga = (c.sagaId ? st.sagas[c.sagaId] : undefined) ?? st.createSaga('Practice saga');
  const made: string[] = [];
  const inSaga = Object.values(st.covenants).filter((x) => x.sagaId === saga.id && !x.living);
  let cov: Covenant | undefined = c.covId && st.covenants[c.covId] ? structuredClone(st.covenants[c.covId]) : inSaga[0] ? structuredClone(inSaga[0]) : undefined;
  const p = tour.practice;
  const wantsChar = !!what.character && !!p;
  if (!cov && (what.covenant || (wantsChar && !p!.draft))) {
    cov = newCovenant(saga.id, saga.currentYear);
    cov.name = 'Practice covenant';
    applyBaseCovenant(cov, 'Medium');
    made.push('a practice covenant (the Medium package)');
  }
  let ch: Character | undefined;
  if (wantsChar) {
    const names = Object.values(st.characters).filter((x) => x.sagaId === saga.id).map((x) => x.name);
    if (p!.draft) {
      ch = newCharacter(p!.type, saga.id, saga.currentYear);
      ch.name = `Practice ${p!.type}`;
    } else {
      ch = generateCharacter({ type: p!.type, role: p!.role, variety: 'focused', npc: false, finished: true, seed: newSeed(), avoidNames: names }, { data: gameDataFor(saga), saga, rules: saga.houseRules, covenant: cov }).c;
    }
    ch.notes = [ch.notes, 'Made for practice by a tutorial.'].filter(Boolean).join('\n');
    // a craftsman's livelihood tracked from the start, for the tutorial to show
    const trade = ch.abilities.find((a) => a.abilityId === 'craft-type' || a.abilityId === 'profession-type');
    if (p!.role === 'master-craftsman' && trade && !ch.workshop) ch.workshop = newWorkshop(trade.uid, trade.abilityId === 'profession-type');
    if (cov) {
      ch.covenantId = cov.id;
      cov.memberIds.push(ch.id);
      if (ch.type === 'magus' && !cov.labs.some((l) => l.ownerId === ch!.id)) cov.labs.push(newLab(`${ch.name || 'Magus'}'s laboratory`, ch.id));
    }
    made.unshift(`${p!.label}, ${ch.name}`);
  }
  if (ch || cov) st.putRecords({ characters: ch ? [ch] : [], covenants: cov ? [cov] : [] }, `Practice for ${tour.title}`);
  return { sagaId: saga.id, charId: ch?.id, covId: cov?.id, notice: made.length ? `Made ${made.join(' and ')} in ${saga.name}; Undo takes it back.` : `Working in ${saga.name}.` };
}
