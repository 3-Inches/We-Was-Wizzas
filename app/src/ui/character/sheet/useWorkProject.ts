// A season's work on a lab project, logged with its helpers' seasons (LabProjects.tsx draws the card).

import { uid } from '../../../util/id';
import { applySeason, computeStudy, newSeasonEntry } from '../../../engine/longterm';
import { workProject } from '../../../engine/projects';
import { seasonBusy } from '../../../engine/time';
import { type LabProject } from '../../../engine/types';
import { helpValue, type LabHelper } from '../../../engine/labHelp';
import { bindFamiliarSheets } from '../../../engine/teaching';
import { begunUndo, labUndo } from '../../../engine/unlog';
import { deriveCharacter } from '../../../engine/character/derive';
import { ensureAbility } from '../../../engine/character/factory';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import type { CharEditor } from '../useChar';
import { helperTold, labTold } from '../../../engine/seasonTold';

/**
 * A season's work on a project, logged for the saga's current season with Exposure in Magic Theory:
 * its progress, vis and result, and anyone else it changes (the subject of a Longevity Ritual, the
 * covenant's stocks). Returns what happened.
 */
export function useWorkProject(ed: CharEditor): (p: LabProject, helperIds?: string[]) => string[] {
  const { c, d, data, ctx, saga } = ed;
  const putSagaState = useStore((s) => s.putSagaState);
  const chars = useSagaCharacters(saga?.id);
  const covs = useSagaCovenants(saga?.id);
  return (p, helperIds = []) => {
    if (!c || !d || !saga) return [];
    const year = saga.currentYear;
    const season = saga.currentSeason;
    const state = structuredClone({ saga, characters: chars, covenants: covs });
    const x = state.characters.find((y) => y.id === c.id)!;
    const cov = ctx.covenant ? state.covenants.find((y) => y.id === ctx.covenant!.id) : undefined;
    // those helping (DE, Help in the Laboratory): their own season if free, else an extra one
    const helpers: LabHelper[] = state.characters
      .filter((y) => helperIds.includes(y.id))
      .map((y) => {
        const yd = deriveCharacter(y, data, saga.houseRules);
        return { c: y, d: yd, value: helpValue(yd), familiar: y.creature?.familiarOf === x.id, extra: seasonBusy(y, year, season) };
      });
    // what Unlog would take back: the project as it was, the vis spent, the Warping
    const before = structuredClone(x);
    const covBefore = cov ? structuredClone(cov) : undefined;
    const lines = workProject(x, d, ctx, cov, p.uid, data, year, { chars: state.characters, season, helpers });
    const theory = d.abilities.find((a) => a.abilityId === d.theoryAbility);
    const e = newSeasonEntry(year, season, 'other', `Lab: ${p.name}`, theory ? { [`ability:${theory.uid}`]: 2 } : {});
    e.notes = lines.join(' ');
    e.labKind = p.kind;
    e.told = labTold(x.projects?.find((y) => y.uid === p.uid) ?? p, x);
    e.undo = labUndo(before, x, p.uid, covBefore, cov);
    // the helpers' seasons are logged with it: Unlog takes back all of them (owner.md, Decided)
    if (helpers.some((y) => y.used)) e.link = uid();
    applySeason(x, e, 1);
    x.seasonLog.push(e);
    for (const h of helpers.filter((y) => y.used)) {
      const had = { abilities: [...h.c.abilities] }, mt = ensureAbility(h.c, 'magic-theory', {});
      const r = computeStudy(h.d, { kind: 'exposure', subject: 'Magic Theory' }, { abilityUid: mt.uid });
      const he = newSeasonEntry(year, season, 'other', `${h.extra ? 'Extra season (needs no sleep): ' : ''}Helped ${x.name || 'a magus'} in the lab: ${p.name} (+${r.xp} xp Exposure in Magic Theory)`, r.xp ? { [`ability:${mt.uid}`]: r.xp } : {});
      if (h.extra) he.extra = true;
      he.link = e.link;
      he.told = helperTold(x.name || 'a magus'); if (begunUndo(had, h.c).abilities) he.undo = begunUndo(had, h.c);
      applySeason(h.c, he, 1);
      h.c.seasonLog.push(he);
      lines.push(`${h.c.name || 'The helper'} helped: +${h.value} to the Lab Total, Exposure in Magic Theory +${r.xp} xp.`);
    }
    // a familiar just bound: its own sheet learns as a human does from now on
    bindFamiliarSheets(state.characters);
    const touched = state.characters.filter((y) => y.id === x.id || y.id === p.subjectId || helperIds.includes(y.id) || y.id === x.familiar?.characterId);
    putSagaState({ saga: state.saga, characters: touched, covenants: cov ? [cov] : [] });
    return [...lines, theory ? `+2 xp Exposure in ${theory.name}.` : ''].filter(Boolean);
  };
}
