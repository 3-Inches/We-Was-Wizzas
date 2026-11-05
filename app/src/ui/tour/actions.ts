// What a tutorial can do for the player when asked: the heavy lifting the toolkit already knows how
// to do, run on the saga, character or covenant the tutorial is following. Each goes through the
// store, so it can be undone like any other change. Loaded with the tutorial panel only.

import { applyBaseCovenant, newCovenant } from '../../engine/covenant';
import { newCharacter } from '../../engine/character/factory';
import { generateCharacter } from '../../engine/generate/character';
import { newWorkshop } from '../../engine/workshop';
import { newSeed } from '../../engine/generate/random';
import type { Character, Covenant } from '../../engine/types';
import { newLab } from '../../engine/lab';
import { gameDataFor } from '../../store/hooks';
import { useStore } from '../../store/store';
import { buildWholeCharacter } from '../character/buildWhole';
import { tourNeeds, type Tour, type TourActionId, type TourCtx } from './tours';

export interface ActionResult {
  /** what was done, for the notice */
  notice: string;
  /** the title of the tutorial step to go on to */
  goto?: string;
}

/** Build a whole draft of the character from its concept themes and any guided-build answers. */
function buildDraft(c: TourCtx): ActionResult | undefined {
  const r = c.charId ? buildWholeCharacter(c.charId) : undefined;
  return r && { notice: r.notice, goto: 'Review and finalize' };
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

/** The note that marks what a tutorial made for practice. */
export const PRACTICE_NOTE = 'Made for practice by a tutorial.';
const isPractice = (x: { notes?: string } | undefined) => !!x && (x.notes ?? '').includes(PRACTICE_NOTE);
/** A covenant a tutorial made for practice (an older version named it so, without the note). */
export const isPracticeCovenant = (x: { notes?: string; name?: string } | undefined) => isPractice(x) || x?.name === 'Practice covenant';

/**
 * What a tutorial needs to work on, made for practice: the saga if none is open, a practice covenant
 * (the Medium package), and the tutorial's practice character (a finished one from Quick build, with
 * a laboratory for a magus, or a blank draft). Practice things stay apart from the troupe's own: a
 * practice character joins the practice covenant, never the troupe's, and one already made for this
 * tutorial is used again rather than made twice. One Undo takes it all back.
 */
export function makePractice(tour: Tour, c: TourCtx, what: { character?: boolean; covenant?: boolean } = tourNeeds(tour)): { sagaId: string; charId?: string; covId?: string; notice: string } {
  const st = useStore.getState();
  const saga = (c.sagaId ? st.sagas[c.sagaId] : undefined) ?? st.createSaga('Practice saga');
  const made: string[] = [];
  const reused: string[] = [];
  let movedFrom = '';
  const p = tour.practice;
  const wantsChar = !!what.character && !!p;
  const inSaga = Object.values(st.covenants).filter((x) => x.sagaId === saga.id && !x.living);
  const tag = `${PRACTICE_NOTE} (${tour.title})`;
  // the practice covenant: the one chosen if it is a practice one, else one made for practice before, else a new one when wanted
  const chosen = c.covId ? st.covenants[c.covId] : undefined;
  const earlier = (isPracticeCovenant(chosen) ? chosen : undefined) ?? inSaga.find(isPracticeCovenant);
  let cov: Covenant | undefined = earlier ? structuredClone(earlier) : undefined;
  if (!cov && (what.covenant || (wantsChar && !p!.draft))) {
    cov = newCovenant(saga.id, saga.currentYear);
    cov.name = 'Practice covenant';
    cov.notes = PRACTICE_NOTE;
    applyBaseCovenant(cov, 'Medium');
    made.push('a practice covenant (the Medium package)');
  } else if (cov && what.covenant) reused.push(`${cov.name || 'the practice covenant'}, made for practice before`);
  let ch: Character | undefined;
  let moved: Covenant | undefined;
  // the practice character this tutorial made before, if it is still about, else a new one
  const before = wantsChar ? Object.values(st.characters).find((x) => x.sagaId === saga.id && (x.notes ?? '').includes(tag) && !x.wounds.dead) : undefined;
  // with a covenant asked for, the practice character the tutorial is working on comes along to it
  const current = c.charId ? st.characters[c.charId] : undefined;
  const bring = before ?? (what.covenant && isPractice(current) ? current : undefined);
  if (bring) {
    ch = structuredClone(bring);
    if (wantsChar) reused.push(`${ch.name}, the ${p!.label.replace(/^an? /, '')} made before`);
  } else if (wantsChar) {
    const names = Object.values(st.characters).filter((x) => x.sagaId === saga.id).map((x) => x.name);
    if (p!.draft) {
      ch = newCharacter(p!.type, saga.id, saga.currentYear);
      ch.name = `Practice ${p!.type}`;
    } else {
      ch = generateCharacter({ type: p!.type, role: p!.role, variety: 'focused', npc: false, finished: true, seed: newSeed(), avoidNames: names }, { data: gameDataFor(saga), saga, rules: saga.houseRules, covenant: cov }).c;
    }
    ch.notes = [ch.notes, tag].filter(Boolean).join('\n');
    // a craftsman's livelihood tracked from the start, for the tutorial to show
    const trade = ch.abilities.find((a) => a.abilityId === 'craft-type' || a.abilityId === 'profession-type');
    if (p!.role === 'master-craftsman' && trade && !ch.workshop) {
      ch.workshop = newWorkshop(trade.uid, trade.abilityId === 'profession-type');
      // worked with the better of Dexterity and Strength (Strength for a smith or a mason)
      if (ch.characteristics.Str > ch.characteristics.Dex) ch.workshop.primary = 'Str';
    }
    made.unshift(`${p!.label}, ${ch.name}`);
  }
  if (ch && cov && ch.covenantId !== cov.id) {
    // out of any other covenant it was put in (a troupe's own, by an older version), with its laboratory
    const old = ch.covenantId ? st.covenants[ch.covenantId] : undefined;
    if (old && old.id !== cov.id) {
      moved = structuredClone(old);
      moved.memberIds = moved.memberIds.filter((id) => id !== ch!.id);
      const lab = moved.labs.find((l) => l.ownerId === ch!.id);
      if (lab) {
        moved.labs = moved.labs.filter((l) => l !== lab);
        cov.labs.push(lab);
      }
      movedFrom = `${ch.name} moved to ${cov.name || 'the practice covenant'} from ${old.name || 'the other covenant'}`;
    }
    ch.covenantId = cov.id;
    if (!cov.memberIds.includes(ch.id)) cov.memberIds.push(ch.id);
  }
  if (ch && cov && ch.type === 'magus' && !cov.labs.some((l) => l.ownerId === ch!.id)) cov.labs.push(newLab(`${ch.name || 'Magus'}'s laboratory`, ch.id));
  if (ch || cov) st.putRecords({ characters: ch ? [ch] : [], covenants: [cov, moved].filter((x): x is Covenant => !!x) }, `Practice for ${tour.title}`);
  return {
    sagaId: saga.id, charId: ch?.id, covId: cov?.id,
    notice:
      made.length || reused.length || movedFrom
        ? `${[made.length ? `Made ${made.join(' and ')}` : '', reused.length ? `Using ${reused.join(' and ')}` : '', movedFrom].filter(Boolean).join('; ')}, in ${saga.name}. Your own covenant and characters are left as they are; Undo takes this back.`
        : `Working in ${saga.name}.`,
  };
}
