// A season's work done from a card: logged on the character with the experience it brings, its vis taken
// from the purse or the covenant's stores (or put there), as one change that Undo and Unlog take back.
// The hedge traditions', the holy and the mason's season cards use it, on the Seasons page, in a character's season in full.

import { useState } from 'react';
import { ART_NAMES, type Art } from '../data';
import { applySeason, newSeasonEntry } from '../engine/longterm';
import { seasonBusy } from '../engine/time';
import { visUndo } from '../engine/unlog';
import { artsText, fullerPlace, visInPlaces, visShortText, type VisPlace } from '../engine/vis';
import type { Character, Covenant, SeasonUndo } from '../engine/types';
import { useStore } from '../store/store';
import type { CharEditor } from './character/useChar';
import { Field } from './kit';

export interface SeasonWorkResult {
  /** what the season did, in lines, kept in the season log */
  lines: string[];
  /** why it cannot be done: nothing is changed or logged */
  refused?: string;
  /** what the season made that stays on the sheet (a potion, a tattoo): the season can then not be unlogged */
  made?: string;
  /** experience the season gives besides its Exposure (`ability:<uid>` → points), and how to say it */
  gains?: Record<string, number>;
  gainText?: string;
  /** what else Unlog must put back (a great building's progress) */
  undo?: SeasonUndo;
}

/** A season's work for the character being edited: this season, whether it is spent, their covenant, and the work itself. */
export function useSeasonWork(ed: CharEditor) {
  const putSagaState = useStore((s) => s.putSagaState);
  const { c, d, ctx, saga } = ed;
  const year = saga?.currentYear ?? 1220;
  const season = saga?.currentSeason ?? 'Spring';
  const busy = !!c && seasonBusy(c, year, season);
  const cov = ctx.covenant;
  /**
   * Spend the season. `fn` changes copies of the character and their covenant, and says what happened;
   * it is given the season log entry's uid. The season is logged with 2 experience points of Exposure
   * in `ability` (an Ability id), and with what Unlog needs. Returns the lines to show.
   */
  const work = (title: string, ability: string | undefined, fn: (x: Character, cov: Covenant | undefined, entryUid: string) => SeasonWorkResult): string[] => {
    if (!c || !saga) return [];
    if (seasonBusy(c, year, season)) return [`${season} ${year} is already spent.`];
    const x = structuredClone(c);
    const k = cov ? structuredClone(cov) : undefined;
    const ab = ability ? x.abilities.find((a) => a.abilityId === ability) : undefined;
    const e = newSeasonEntry(year, season, 'other', title, ab ? { [`ability:${ab.uid}`]: 2 } : {});
    const r = fn(x, k, e.uid);
    if (r.refused) return [r.refused];
    const lines = r.lines.filter(Boolean);
    if (r.gains) for (const [k, v] of Object.entries(r.gains)) e.gains[k] = (e.gains[k] ?? 0) + v;
    e.notes = lines.join(' ');
    const u = { ...visUndo(c, x, cov, k), ...r.undo, ...(r.made ? { final: `This season made ${r.made}, which is on the sheet, so the season stays logged (remove what it made by hand if it must go).` } : {}) };
    if (Object.keys(u).length) e.undo = u;
    applySeason(x, e, 1);
    x.seasonLog.push(e);
    putSagaState({ saga, characters: [x], covenants: k ? [k] : [] });
    const abName = ab ? d?.abilities.find((a) => a.uid === ab.uid)?.name : undefined;
    const said = [abName ? `+2 experience in ${abName}` : '', r.gainText ?? ''].filter(Boolean).join(', ');
    return [...lines, `${season} ${year} logged${said ? `, ${said}` : ''}.`];
  };
  return { year, season, busy, cov, work };
}

/**
 * Where a season's vis comes from, or where vis it draws goes: the purse or the covenant's stores, and
 * which of the Arts that serve. The place that holds more is chosen until the player picks one.
 */
export function useVisSource(c: Character | undefined, cov: Covenant | undefined, arts: Art[]) {
  const [placeChosen, setPlace] = useState<VisPlace | undefined>();
  const [artChosen, setArt] = useState<Art | undefined>();
  const use = artChosen && arts.includes(artChosen) ? [artChosen] : arts;
  const place: VisPlace = !cov ? 'purse' : (placeChosen ?? (c ? fullerPlace(c, cov, use) : 'purse'));
  const have = c ? visInPlaces(c, cov, use) : { purse: 0, covenant: 0 };
  const covName = `${cov?.name || 'the covenant'}’s stores`;
  /** The controls: where from (or, with `to`, where to), and which Art when more than one serves. */
  const node = (to = false) => (
    <>
      {cov ? (
        <Field label={to ? 'Vis goes to' : 'Vis from'}>
          <select value={place} onChange={(e) => setPlace(e.target.value as VisPlace)}>
            <option value="purse">the purse{to ? '' : ` (${have.purse})`}</option>
            <option value="covenant">
              {covName}
              {to ? '' : ` (${have.covenant})`}
            </option>
          </select>
        </Field>
      ) : null}
      {!to && arts.length > 1 && (
        <Field label="Of">
          <select value={artChosen && arts.includes(artChosen) ? artChosen : ''} onChange={(e) => setArt((e.target.value || undefined) as Art | undefined)}>
            <option value="">{artsText(arts)} vis</option>
            {arts.map((a) => (
              <option key={a} value={a}>
                {ART_NAMES[a]} ({c ? visInPlaces(c, cov, [a])[place] : 0})
              </option>
            ))}
          </select>
        </Field>
      )}
    </>
  );
  /** The line under the controls: what will be taken, or what is missing. */
  const line = (pawns: number) => {
    if (pawns <= 0 || !c) return null;
    const short = visShortText(c, cov, place, use, pawns);
    const where = place === 'purse' ? 'the purse' : covName;
    return short ? <span className="warn-text">{short}</span> : <span>It takes {pawns} pawn{pawns === 1 ? '' : 's'} of {artsText(use)} vis from {where} ({have[place]} there).</span>;
  };
  return { place, arts: use, have: have[place], node, line, short: (pawns: number) => (c ? visShortText(c, cov, place, use, pawns) : undefined) };
}
