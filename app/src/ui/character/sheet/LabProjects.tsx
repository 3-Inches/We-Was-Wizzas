// Laboratory projects worked season by season: inventing a spell (or learning one from a Laboratory
// Text, several of the same Technique and Form at once), preparing an item (a talisman a little at a
// time), attuning a talisman, instilling an effect, extracting vis, taming a creature, a Longevity
// Ritual, binding a familiar, strengthening and empowering the bond, and improving the lab: its
// Refinement, a Virtue installed, a Flaw put right. Each is planned here and worked as a season's activity: from this card for
// the saga's current season, or as the character's season activity on the Seasons page. The lab's
// restrictions, its Specializations and the choice to experiment apply to every one.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ART_NAMES, FORMS, TECHNIQUES, type Form, type LabVFDef, type Technique } from '../../../data';
import { CORD_COST, cordPointsCost } from '../../../engine/enchant';
import { conditionalBonuses } from '../../../engine/magic';
import { applySeason, computeStudy, newSeasonEntry } from '../../../engine/longterm';
import { LAB_ROUTINES, ROUTINE_IDS, toggleRoutine } from '../../../engine/labRoutines';
import { optionOn } from '../../../engine/optional';
import { LAB_IMPROVEMENTS, PROJECT_KINDS, alongsideCandidates, canExperiment, inventedWith, itemOf, newProject, pawnsUsed, planProject, projectBotchDice, seasonVisLimit, visShort, workProject } from '../../../engine/projects';
import { extraFree, inPlay, seasonBusy, seasonTaken } from '../../../engine/time';
import { type Character, type HouseRules, type LabProject, type LabVirtueEntry, type Season } from '../../../engine/types';
import { cannotHelp, helpValue, maxHelpers, type LabHelper } from '../../../engine/labHelp';
import { bindFamiliarSheets } from '../../../engine/teaching';
import { deriveCharacter, type DerivedCharacter } from '../../../engine/character/derive';
import { ensureAbility } from '../../../engine/character/factory';
import type { GameData } from '../../../data';
import { purseOf } from '../../../engine/vis';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Card, Field, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

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
    const lines = workProject(x, d, ctx, cov, p.uid, data, year, { chars: state.characters, season, helpers });
    const theory = d.abilities.find((a) => a.abilityId === d.theoryAbility);
    const e = newSeasonEntry(year, season, 'other', `Lab: ${p.name}`, theory ? { [`ability:${theory.uid}`]: 2 } : {});
    e.notes = lines.join(' ');
    e.labKind = p.kind;
    applySeason(x, e, 1);
    x.seasonLog.push(e);
    for (const h of helpers.filter((y) => y.used)) {
      const mt = ensureAbility(h.c, 'magic-theory', {});
      const r = computeStudy(h.d, { kind: 'exposure', subject: 'Magic Theory' }, { abilityUid: mt.uid });
      const he = newSeasonEntry(year, season, 'other', `${h.extra ? 'Extra season (needs no sleep): ' : ''}Helped ${x.name || 'a magus'} in the lab: ${p.name} (+${r.xp} xp Exposure in Magic Theory)`, r.xp ? { [`ability:${mt.uid}`]: r.xp } : {});
      if (h.extra) he.extra = true;
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

/** The helpers chosen, as the Lab Total sees them, to plan with before the season is worked. */
export function previewHelpers(ids: string[], chars: Character[], magus: Character, data: GameData, rules: HouseRules): LabHelper[] {
  return chars
    .filter((y) => ids.includes(y.id))
    .map((y) => {
      const yd = deriveCharacter(y, data, rules);
      return { c: y, d: yd, value: helpValue(yd), familiar: y.creature?.familiarOf === magus.id, extra: false };
    });
}

/** Covenant-mates who could help this magus in the lab this season, with why each other cannot. */
export function labHelpers(c: Character, mates: Character[], data: GameData, rules: HouseRules, year: number, season: Season): { c: Character; value: number; why?: string; extra: boolean }[] {
  return mates
    .filter((y) => y.id !== c.id && inPlay(y))
    .map((y) => {
      const yd = deriveCharacter(y, data, rules);
      const busy = seasonBusy(y, year, season);
      const why = cannotHelp(y, yd, c) ?? (busy && !extraFree(y, yd, year, season) ? 'has no season free' : undefined);
      return { c: y, value: helpValue(yd), why, extra: busy };
    });
}

export function LabProjects({ ed }: { ed: CharEditor }) {
  const { c, d, ctx, saga, update, data } = ed;
  const chars = useSagaCharacters(saga?.id);
  const workSeason = useWorkProject(ed);
  const [kind, setKind] = useState<LabProject['kind']>('invent');
  const [log, setLog] = useState<string[]>([]);
  const [helperIds, setHelperIds] = useState<string[]>([]);
  if (!c || !d || !saga) return null;
  const projects = c.projects ?? [];
  const year = saga.currentYear;
  const season = saga.currentSeason;
  // a season holds one lab project's work (an adventure aside)
  const taken = seasonTaken(c, year, season);
  const busy = taken.length > 0;
  const ruled = ctx.lab?.impossible ?? [];
  const add = () => update((x) => void (x.projects = [...(x.projects ?? []), newProject(kind)]));
  const set = (u: string, fn: (p: LabProject) => void) => update((x) => { const p = x.projects?.find((y) => y.uid === u); if (p) fn(p); });
  const work = (p: LabProject) => {
    const lines = workSeason(p, helperIds);
    setLog((l) => [`${season} ${year}: ${lines.join(' ')}`, ...l].slice(0, 10));
    setHelperIds([]);
  };

  return (
    <Card
      title="Lab projects"
      tour="lab-projects"
      actions={
        <span className="row tight">
          <select value={kind} onChange={(e) => setKind(e.target.value as LabProject['kind'])} aria-label="Kind of project">
            {PROJECT_KINDS.map((k) => (
              <option key={k.id} value={k.id} title={k.blurb}>
                {k.label}
                {k.activity && ruled.includes(k.activity) ? ' (not in this lab)' : ''}
              </option>
            ))}
          </select>
          <button className="small" onClick={add}>
            + Project
          </button>
        </span>
      }
    >
      <p className="small muted" style={{ marginTop: 0 }}>
        Plan the work here. <b>Work a season</b> spends {season} {year} on it; <b>Work it each season</b> keeps working it every season, when time moves on, until it is
        done.
        {busy && <span className="warn-text"> {season} {year} is already spent ({taken.map((e) => e.summary).join('; ')}): move to the next season on the Seasons page to work again.</span>} Vis comes from the purse ({(purseOf(structuredClone(c)).vis ?? []).map((v) => `${v.pawns} ${v.art}`).join(', ') || 'empty'}) or the covenant&apos;s stocks;
        at most {seasonVisLimit(d)} pawns a season (twice Magic Theory).
        {ruled.length > 0 && <span className="bad-text"> {ctx.lab?.lab.name} cannot be used for {ruled.join(', ')}.</span>}
      </p>
      {!busy && <HelpersRow c={c} d={d} chars={chars} ed={ed} helperIds={helperIds} setHelperIds={setHelperIds} />}
      {kind && <p className="small muted" style={{ margin: '0 0 6px' }}>{PROJECT_KINDS.find((k) => k.id === kind)?.blurb}</p>}
      {projects.length === 0 && <div className="small muted">No projects yet.</div>}
      {projects.map((p) => (
        <ProjectRow key={p.uid} p={p} ed={ed} chars={chars} set={(fn) => set(p.uid, fn)} onWork={() => work(p)} busy={busy} helpers={previewHelpers(helperIds, chars, c, data, saga.houseRules)} />
      ))}
      {log.map((l, i) => (
        <div key={i} className="small list-row" style={{ whiteSpace: 'pre-wrap' }}>
          {l}
        </div>
      ))}
    </Card>
  );
}

function ProjectRow({ p, ed, chars, set, onWork, busy, helpers }: { p: LabProject; ed: CharEditor; chars: Character[]; set: (fn: (p: LabProject) => void) => void; onWork: () => void; busy: boolean; helpers?: LabHelper[] }) {
  const { c, d, data, update, ctx, saga } = ed;
  const [history, setHistory] = useState(false);
  if (!c || !d || !saga) return null;
  const subject = p.subjectId ? chars.find((x) => x.id === p.subjectId) : undefined;
  const plan0 = planProject(p, c, d, ctx, { subject, data, helpers });
  // the vis is checked where it comes from before the season is worked
  const short = visShort(p, c, ctx, plan0);
  const plan = short ? { ...plan0, problems: [...plan0.problems, short] } : plan0;
  const it = itemOf(c, p);
  const isTalisman = !!it && c.talismanUid === it.uid;
  const smBonuses = it ? it.shapeMaterialIds.flatMap((id) => data.shapeMaterial.find((s) => s.id === id)?.bonuses.map((b) => ({ ...b, from: data.shapeMaterial.find((s) => s.id === id)!.name })) ?? []) : [];
  const standing = c.standing?.kind === 'lab' && c.standing.projectUid === p.uid;
  const fam = c.familiar;
  const experimentable = canExperiment(p);
  const conds = conditionalBonuses(d).filter((b) => b.lab);
  const labSpec = ctx.lab?.specializations.Experimentation ?? 0;
  const restricted = (x: string) => /cannot be used for/.test(x);
  // spells the saga's players designed come first, then the books'
  const designed = data.spells.filter((sp) => sp.custom && sp.level !== null && !c.spells.some((k) => k.spellId === sp.id));
  const books = data.spells.filter((sp) => !sp.custom && sp.level !== null && !c.spells.some((k) => k.spellId === sp.id));
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', opacity: p.done ? 0.6 : 1 }}>
      <div className="row">
        <input value={p.name} onChange={(e) => set((x) => void (x.name = e.target.value))} style={{ flex: '1 1 160px' }} aria-label="Project name" />
        <span className="badge">{PROJECT_KINDS.find((k) => k.id === p.kind)?.label}</span>
        {p.done ? (
          <span className={`badge ${p.failed ? 'bad' : 'good'}`}>{p.failed ? 'came to nothing' : 'done'}</span>
        ) : (
          <>
            {plan.total && (
              <span className="stat">
                <span className="v">
                  <Total value={plan.total.total} parts={plan.total.parts} notes={plan.total.notes} label={p.name} />
                </span>
                <span className="l">Lab Total</span>
              </span>
            )}
            {(p.kind === 'invent' || p.kind === 'instill' || p.kind === 'tame' || p.kind === 'empower') && plan.target > 1 && !p.fromText && (
              <span className="small">
                {p.progress}/{plan.target} points{plan.gain ? `, +${plan.gain} a season, ${plan.seasonsLeft} season${plan.seasonsLeft === 1 ? '' : 's'} to go` : ''}
              </span>
            )}
            <button className="small primary" disabled={plan.problems.length > 0 || busy} onClick={onWork} title={busy ? `${saga.currentSeason} ${saga.currentYear} is already spent on something else` : `Spend ${saga.currentSeason} ${saga.currentYear} on it`}>
              Work a season
            </button>
            <button
              className="small ghost"
              disabled={standing || plan.problems.some(restricted) || !!inventedWith(p, c)}
              onClick={() => update((x) => void (x.standing = { kind: 'lab', projectUid: p.uid }))}
              title={plan.problems.some(restricted) ? 'This lab cannot be used for it' : "Make it the character's season activity: the Seasons page works it every season nothing else is logged, until it is done"}
            >
              {standing ? '✓ worked each season' : 'Work it each season'}
            </button>
          </>
        )}
        <button className="small ghost" onClick={() => update((x) => void (x.projects = (x.projects ?? []).filter((y) => y.uid !== p.uid)))} aria-label="Remove the project">
          ✕
        </button>
      </div>
      {!p.done && (
        <div className="row small">
          {p.kind === 'invent' && (
            <>
              <Field label="Spell" hint={<Link to={`/saga/${saga.id}/spells`}>design a new one in the Spell designer ›</Link>}>
                <select
                  value={p.spell?.id ?? ''}
                  onChange={(e) => {
                    const sp = data.spells.find((x) => x.id === e.target.value);
                    set((x) => {
                      x.spell = sp;
                      if (sp) {
                        x.name = `Invent ${sp.name}`;
                        x.technique = sp.technique;
                        x.form = sp.form;
                        x.level = sp.level ?? x.level;
                        x.requisites = sp.requisites;
                      }
                    });
                  }}
                  style={{ maxWidth: 260 }}
                >
                  <option value="">— an effect of your own (Arts and level below) —</option>
                  {designed.length > 0 && (
                    <optgroup label="Designed in this saga">
                      {designed.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({sp.technique}
                          {sp.form} {sp.level})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="From the books">
                    {books.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} ({sp.technique}
                        {sp.form} {sp.level})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              {!p.spell && (
                <>
                  <ArtPair te={p.technique ?? 'Cr'} fo={p.form ?? 'An'} onChange={(te, fo) => set((x) => void ((x.technique = te), (x.form = fo)))} />
                  <Field label="Level">
                    <Stepper value={p.level ?? 5} min={1} width={40} onChange={(v) => set((x) => void (x.level = v))} />
                  </Field>
                </>
              )}
              <label className="inline" title="With a Laboratory Text the spell is learned in one season once the Lab Total reaches its level; no experimenting (DE)">
                <input type="checkbox" checked={!!p.fromText} onChange={(e) => set((x) => void ((x.fromText = e.target.checked || undefined), e.target.checked && (x.experiment = undefined)))} /> from a Laboratory Text
              </label>
              {!p.fromText && (
                <Field label="Similar spell or other bonus" hint="+ the magnitude of the highest similar spell you know">
                  <Stepper value={p.bonus ?? 0} min={-20} max={30} width={36} onChange={(v) => set((x) => void (x.bonus = v || undefined))} />
                </Field>
              )}
              <Alongside p={p} c={c} set={set} />
            </>
          )}
          {LAB_IMPROVEMENTS.includes(p.kind) && <LabWorkFields p={p} ed={ed} set={set} />}
          {(p.kind === 'open' || p.kind === 'attune' || p.kind === 'instill') && (
            <Field label="Item">
              <select value={p.itemUid ?? ''} onChange={(e) => set((x) => void ((x.itemUid = e.target.value || undefined), (x.effectUid = undefined)))}>
                <option value="">— choose (add it under Enchanted items) —</option>
                {c.items.map((i) => (
                  <option key={i.uid} value={i.uid}>
                    {i.name}
                    {c.talismanUid === i.uid ? ' (talisman)' : ''} — {i.kind === 'charged' ? 'charged' : `${i.openedPawns} pawns opened`}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {p.kind === 'open' && isTalisman && (
            <Field label="Pawns this season" hint="A talisman can be opened a little at a time">
              <Stepper value={p.pawns ?? 1} min={1} max={seasonVisLimit(d)} width={36} onChange={(v) => set((x) => void (x.pawns = v))} />
            </Field>
          )}
          {p.kind === 'instill' && it && (
            <Field label="Effect" hint={it.kind === 'charged' ? 'A charged item is made in one season, for no vis' : `${Math.max(0, it.openedPawns - pawnsUsed(it, p.effectUid))} of ${it.openedPawns} pawns of room left`}>
              <select
                value={p.effectUid ?? ''}
                onChange={(e) =>
                  update((x) => {
                    const pr = x.projects?.find((y) => y.uid === p.uid);
                    const ef = x.items.find((i) => i.uid === it.uid)?.effects.find((y) => y.uid === e.target.value);
                    if (!pr) return;
                    pr.effectUid = e.target.value || undefined;
                    // the effect does not work until the project is done
                    if (ef) {
                      pr.name = `Instill ${ef.name} in ${it.name}`;
                      ef.pending = true;
                    }
                  })
                }
              >
                <option value="">— an effect added to the item —</option>
                {it.effects.map((e) => (
                  <option key={e.uid} value={e.uid}>
                    {e.name} ({e.technique}
                    {e.form} level {e.modifiedLevel}){e.pending === false ? ', working' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {p.kind === 'tame' && (
            <>
              <Field label="The creature's Form">
                <select value={p.form ?? ''} onChange={(e) => set((x) => void (x.form = (e.target.value || undefined) as Form | undefined))}>
                  <option value="">— choose —</option>
                  {FORMS.map((f) => (
                    <option key={f} value={f}>
                      {ART_NAMES[f]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Its Might" hint="A mundane beast: 1 + twice its Confidence">
                <Stepper value={p.level ?? 1} min={1} max={100} width={40} onChange={(v) => set((x) => void (x.level = v))} />
              </Field>
              <Field label="Taming Lab Text or other bonus" hint="+1 for every 5 levels of a taming Lab Text of this Form">
                <Stepper value={p.bonus ?? 0} min={-20} max={30} width={36} onChange={(v) => set((x) => void (x.bonus = v || undefined))} />
              </Field>
            </>
          )}
          {p.kind === 'longevity' && (
            <>
              <Field label="For" hint="Someone else needs a Lab Total of 30; a mundane gains a point for every 10">
                <select value={p.subjectId ?? ''} onChange={(e) => set((x) => void ((x.subjectId = e.target.value || undefined), (x.name = `Longevity Ritual for ${e.target.value ? chars.find((y) => y.id === e.target.value)?.name ?? 'someone' : 'yourself'}`)))}>
                  <option value="">yourself</option>
                  {chars
                    .filter((x) => x.id !== c.id && x.creation.finalized)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name || 'Unnamed'} ({x.type}, age {x.age})
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Extra vis" hint="+1 to the Lab Total each, and the same again whenever the ritual is renewed">
                <Stepper value={p.extraVis ?? 0} min={0} width={36} onChange={(v) => set((x) => void (x.extraVis = v || undefined))} />
              </Field>
              {(subject ?? c).longevity && <span className="muted">Current ritual: −{(subject ?? c).longevity!.bonus}; a new one replaces it.</span>}
            </>
          )}
          {(p.kind === 'bind' || p.kind === 'strengthen') && fam && (
            <>
              <span className="muted">
                {fam.name || 'The familiar'} (Might {fam.might}, Size {fam.size}), with {ART_NAMES[fam.bindingTechnique]} {ART_NAMES[fam.bindingForm]}
                {p.kind === 'strengthen' ? `; bond Lab Total ${fam.bindingLabTotal}, ${fam.pawnsSpent} pawns spent` : ''}
              </span>
              {(['golden', 'silver', 'bronze'] as const).map((k) => {
                const cur = p.cords?.[k] ?? fam[k];
                return (
                  <Field key={k} label={`${k[0].toUpperCase() + k.slice(1)} cord`} hint={`${CORD_COST[cur]} points`}>
                    <Stepper
                      value={cur}
                      min={p.kind === 'strengthen' ? fam[k] : 0}
                      max={5}
                      width={30}
                      onChange={(v) => set((x) => void (x.cords = { golden: x.cords?.golden ?? fam.golden, silver: x.cords?.silver ?? fam.silver, bronze: x.cords?.bronze ?? fam.bronze, [k]: v }))}
                    />
                  </Field>
                );
              })}
              <span className={cordPointsCost(p.cords?.golden ?? fam.golden, p.cords?.silver ?? fam.silver, p.cords?.bronze ?? fam.bronze) > (plan.total?.total ?? 0) ? 'bad-text' : 'muted'}>
                cords {cordPointsCost(p.cords?.golden ?? fam.golden, p.cords?.silver ?? fam.silver, p.cords?.bronze ?? fam.bronze)} of {plan.total?.total ?? 0} points
              </span>
            </>
          )}
          {p.kind === 'empower' && fam && (
            <Field label="Power" hint="Add it on the Familiar card first">
              <select value={p.effectUid ?? ''} onChange={(e) => set((x) => void ((x.effectUid = e.target.value || undefined), (x.name = `Empower the bond: ${fam.powers.find((y) => y.uid === e.target.value)?.name ?? ''}`)))}>
                <option value="">— a power of the bond —</option>
                {fam.powers.map((e) => (
                  <option key={e.uid} value={e.uid}>
                    {e.name} ({e.technique}
                    {e.form} level {e.modifiedLevel}){e.pending === false ? ', working' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {isTalisman && (p.kind === 'open' || p.kind === 'instill') && (
            <Field label="Add an attunement this season" hint="One a season, while preparing or instilling (DE)">
              <select
                value={p.attunement ? smBonuses.findIndex((b) => `${b.from}: ${b.effect}` === p.attunement!.label) : -1}
                onChange={(e) => {
                  const b = smBonuses[Number(e.target.value)];
                  set((x) => void (x.attunement = b ? { label: `${b.from}: ${b.effect}`, bonus: b.bonus } : undefined));
                }}
              >
                <option value={-1}>— none —</option>
                {smBonuses.map((b, i) => (
                  <option key={i} value={i}>
                    +{b.bonus} {b.effect} ({b.from})
                  </option>
                ))}
              </select>
            </Field>
          )}
          {plan.total && (d.magicalFocus !== 'none' || conds.length > 0) && (
            <Field label="Also applies" hint="Your Magical Focus, and Virtues that help in some circumstances">
              <span className="row tight" style={{ flexWrap: 'wrap' }}>
                {d.magicalFocus !== 'none' && (
                  <label className="inline">
                    <input type="checkbox" checked={!!p.inFocus} onChange={(e) => set((x) => void (x.inFocus = e.target.checked || undefined))} /> within your Magical Focus
                  </label>
                )}
                {conds.map((b) => (
                  <label key={b.uid} className="inline">
                    <input
                      type="checkbox"
                      checked={!!p.circumstances?.includes(b.uid)}
                      onChange={(e) => set((x) => void (x.circumstances = e.target.checked ? [...(x.circumstances ?? []), b.uid] : (x.circumstances ?? []).filter((u) => u !== b.uid)))}
                    />
                    {b.label} ({b.lab! >= 0 ? '+' : ''}
                    {b.lab})
                  </label>
                ))}
              </span>
            </Field>
          )}
          {experimentable && (
            <Field label="Experiment" hint={`A simple die${p.experiment?.risk ? ` + ${p.experiment.risk}` : ''} on the Lab Total${labSpec ? ` and the lab's Experimentation +${labSpec}` : ''}; a roll on the Extraordinary Results Chart with ${projectBotchDice(c, ctx, p.experiment?.risk ?? 0)} botch dice`}>
              <span className="row tight">
                <label className="inline">
                  <input type="checkbox" checked={!!p.experiment} onChange={(e) => set((x) => void (x.experiment = e.target.checked ? { risk: 0 } : undefined))} /> experiment
                </label>
                {p.experiment && (
                  <>
                    risk +<Stepper value={p.experiment.risk} min={0} max={3} width={32} onChange={(v) => set((x) => void (x.experiment = { risk: v }))} />
                  </>
                )}
              </span>
            </Field>
          )}
          {plan.total && (optionOn(ed.saga, 'labRoutines') || !!p.routines?.length) && (
            <Field label="Lab routine (optional)" hint="Covenants: odd hours or overtime for a bonus to this season's Lab Total, at a cost">
              <span className="row tight" style={{ flexWrap: 'wrap' }}>
                {ROUTINE_IDS.map((r) => (
                  <label key={r} className="inline" title={LAB_ROUTINES[r].cost} style={{ flexWrap: 'nowrap' }}>
                    <input type="checkbox" checked={!!p.routines?.includes(r)} onChange={() => set((x) => void (x.routines = toggleRoutine(x.routines ?? [], r)))} />
                    {LAB_ROUTINES[r].label} (+{LAB_ROUTINES[r].bonus})
                  </label>
                ))}
              </span>
            </Field>
          )}
          {plan.pounds ? (
            <Field label="Pounds from">
              <select value={p.visFrom ?? 'covenant'} onChange={(e) => set((x) => void (x.visFrom = e.target.value as 'purse' | 'covenant'))}>
                <option value="covenant">the covenant&apos;s treasury</option>
                <option value="purse">the purse</option>
              </select>
            </Field>
          ) : null}
          {(plan.vis?.pawns ?? 0) > 0 || p.kind === 'extract' ? (
            <Field label={p.kind === 'extract' ? 'The vis goes to' : 'Vis from'}>
              <select value={p.visFrom ?? 'purse'} onChange={(e) => set((x) => void (x.visFrom = e.target.value as 'purse' | 'covenant'))}>
                <option value="purse">the purse</option>
                <option value="covenant">the covenant&apos;s stocks</option>
              </select>
            </Field>
          ) : null}
          <span className="muted">
            {plan.summary}
            {plan.vis?.pawns ? ` Vis: ${plan.vis.pawns} pawn${plan.vis.pawns > 1 ? 's' : ''} of ${plan.vis.arts.map((a) => ART_NAMES[a]).join(' or ')}.` : ''}
            {ctx.lab && (ctx.lab.characteristics.Safety < 0 || ctx.lab.characteristics.Warping > 0)
              ? ` Each season the lab rolls its ${[ctx.lab.characteristics.Safety < 0 ? `Safety ${ctx.lab.characteristics.Safety}` : '', ctx.lab.characteristics.Warping > 0 ? `Warping ${ctx.lab.characteristics.Warping}` : ''].filter(Boolean).join(' and ')}.`
              : ''}
          </span>
          {plan.problems.map((x) => (
            <span key={x} className={restricted(x) ? 'bad-text' : 'warn-text'}>
              {x}
            </span>
          ))}
        </div>
      )}
      {(p.results?.length ?? 0) > 0 && (
        <div className="small">
          <span className="clickable muted" onClick={() => setHistory((v) => !v)}>
            {history ? '▾' : '▸'} what the experiments and the lab did to it ({p.results!.length})
          </span>
          {history && (
            <div style={{ whiteSpace: 'pre-wrap', paddingLeft: 12 }}>
              {p.results!.map((r, i) => (
                <div key={i}>{r}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Other spells of the same Technique and Form to invent in the same seasons: their levels added, against the lowest Lab Total (DE). */
function Alongside({ p, c, set }: { p: LabProject; c: Character; set: (fn: (p: LabProject) => void) => void }) {
  if (inventedWith(p, c)) return null;
  const chosen = (p.alongside ?? []).map((u) => c.projects?.find((x) => x.uid === u)).filter((x): x is LabProject => !!x);
  const options = [...chosen, ...alongsideCandidates(p, c).filter((x) => !chosen.includes(x))];
  if (!options.length) return null;
  return (
    <Field label="Alongside it" hint="Other spells of the same Technique and Form, worked in the same seasons: their levels are added together (DE)">
      <span className="row tight" style={{ flexWrap: 'wrap' }}>
        {options.map((x) => (
          <label key={x.uid} className="inline" title={p.progress ? 'The work has begun: the spells it is done with are settled' : undefined}>
            <input
              type="checkbox"
              disabled={p.progress > 0}
              checked={chosen.includes(x)}
              onChange={(e) => set((y) => void (y.alongside = e.target.checked ? [...(y.alongside ?? []), x.uid] : (y.alongside ?? []).filter((u) => u !== x.uid)))}
            />
            {x.name} ({x.level})
          </label>
        ))}
      </span>
    </Field>
  );
}

/** What a season improving the lab works on: the Virtue to install, a Virtue to take out, a Flaw to put right. */
function LabWorkFields({ p, ed, set }: { p: LabProject; ed: CharEditor; set: (fn: (p: LabProject) => void) => void }) {
  const { data, ctx } = ed;
  const lab = ctx.lab?.lab;
  if (!lab) return null;
  const entries = lab.virtues
    .filter((v) => !v.fromItem)
    .map((v) => ({ v, def: data.labVFById.get(v.defId) }))
    .filter((x): x is { v: LabVirtueEntry; def: LabVFDef } => !!x.def);
  const label = (x: { v: LabVirtueEntry; def: LabVFDef }) => `${x.def.name}${x.v.note ? ` (${x.v.note})` : ''}, ${x.def.size}`;
  const virtues = entries.filter((x) => x.def.kind === 'virtue' && x.def.size !== 'Free');
  const flaws = entries.filter((x) => x.def.kind === 'flaw' && (p.kind === 'repair' || x.def.size !== 'Major'));
  const installable = data.labVirtuesFlaws.filter((v) => v.kind === 'virtue' && (v.size !== 'Free' || v.id === 'spotless') && (v.repeatable || !lab.virtues.some((x) => x.defId === v.id)));
  const groups = [...new Set(installable.map((v) => v.group))];
  const remove = (title: string, list: typeof entries, none: string) => (
    <Field label={title}>
      <select
        value={p.removeUid ?? ''}
        onChange={(e) =>
          set((x) => {
            x.removeUid = e.target.value || undefined;
            const def = entries.find((y) => y.v.uid === e.target.value)?.def;
            if (x.kind === 'repair' && def) x.name = `Put ${def.name} right`;
          })
        }
        style={{ maxWidth: 260 }}
      >
        <option value="">{none}</option>
        {list.map((x) => (
          <option key={x.v.uid} value={x.v.uid}>
            {p.kind === 'refine' ? (x.def.kind === 'flaw' ? 'put right: ' : 'take out: ') : ''}
            {label(x)}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <>
      <span className="muted">
        {lab.name}: Size {ctx.lab!.size}, Refinement {lab.refinement}, {ctx.lab!.boundless ? 'Boundless' : `${ctx.lab!.freeSpace} free space`}
      </span>
      {p.kind === 'install' && (
        <Field label="Virtue" hint="Free Virtues take a day or so: add them on the lab’s card (Spotless takes a season)">
          <select
            value={p.labVirtue?.defId ?? ''}
            onChange={(e) => {
              const def = data.labVFById.get(e.target.value);
              set((x) => void ((x.labVirtue = def ? { defId: def.id } : undefined), def && (x.name = `Install ${def.name}`)));
            }}
            style={{ maxWidth: 260 }}
          >
            <option value="">— choose —</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {installable
                  .filter((v) => v.group === g)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.size})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
      )}
      {p.kind === 'refine' && remove('With it', [...flaws, ...virtues], '— the Refinement only —')}
      {p.kind === 'install' && virtues.length > 0 && remove('Taking out', virtues, '— nothing —')}
      {p.kind === 'repair' && remove('Flaw', flaws, '— choose —')}
    </>
  );
}

function ArtPair({ te, fo, onChange }: { te: Technique; fo: Form; onChange: (te: Technique, fo: Form) => void }) {
  return (
    <Field label="Arts">
      <span className="row tight">
        <select value={te} onChange={(e) => onChange(e.target.value as Technique, fo)}>
          {TECHNIQUES.map((t) => (
            <option key={t} value={t}>
              {ART_NAMES[t]}
            </option>
          ))}
        </select>
        <select value={fo} onChange={(e) => onChange(te, e.target.value as Form)}>
          {FORMS.map((f) => (
            <option key={f} value={f}>
              {ART_NAMES[f]}
            </option>
          ))}
        </select>
      </span>
    </Field>
  );
}

/**
 * Helpers for the season worked here (DE, Help in the Laboratory): covenant-mates with The Gift and
 * Magic Theory, or the magus's bound familiar; as many as Leadership allows (a familiar and one more).
 */
export function HelpersRow({ c, d, chars, ed, helperIds, setHelperIds }: { c: Character; d: DerivedCharacter; chars: Character[]; ed: CharEditor; helperIds: string[]; setHelperIds: (ids: string[]) => void }) {
  const { saga, data, ctx } = ed;
  const mates = useMemo(() => chars.filter((y) => ctx.covenant?.memberIds.includes(y.id) || (!!c.covenantId && y.covenantId === c.covenantId)), [chars, ctx.covenant, c.covenantId]);
  const all = useMemo(() => (saga ? labHelpers(c, mates, data, saga.houseRules, saga.currentYear, saga.currentSeason) : []), [c, mates, data, saga]);
  if (!saga) return null;
  const able = all.filter((h) => !h.why);
  // those who cannot help are named only when they might have been meant to: the familiar, a companion of the magus, one set to help
  const meant = all.filter((h) => h.why && (h.c.id === c.familiar?.characterId || h.c.creature?.ownerId === c.id || (h.c.standing?.kind === 'assist' && h.c.standing.helps === c.id)));
  if (!able.length && !meant.length) return null;
  const cap = maxHelpers(d, able.some((h) => h.c.creature?.familiarOf === c.id && helperIds.includes(h.c.id)));
  return (
    <div className="row tight small" style={{ marginBottom: 6 }}>
      <b>Helpers this season:</b>
      {able.map((h) => {
        const on = helperIds.includes(h.c.id);
        return (
          <label key={h.c.id} className="inline" title={h.extra ? 'In an extra season: their own is spent' : undefined}>
            <input type="checkbox" checked={on} disabled={!on && helperIds.length >= cap} onChange={(e) => setHelperIds(e.target.checked ? [...helperIds, h.c.id] : helperIds.filter((x) => x !== h.c.id))} /> {h.c.name || 'Unnamed'} (+{h.value}
            {h.extra ? ', extra season' : ''})
          </label>
        );
      })}
      {able.length > 0 && <span className="muted">at most {cap} (Leadership)</span>}
      {meant.map((h) => (
        <span key={h.c.id} className="muted">
          {h.c.name || 'Unnamed'}: {h.why}.
        </span>
      ))}
    </div>
  );
}
