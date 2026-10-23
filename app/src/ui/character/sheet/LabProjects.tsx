// Laboratory projects worked season by season: inventing a spell (or learning one from a Laboratory
// Text), preparing an item (a talisman a little at a time), attuning a talisman, instilling an effect,
// extracting vis, taming a creature, a Longevity Ritual, binding a familiar, strengthening and
// empowering the bond. Each is planned here and worked as a season's activity: from this card for
// the saga's current season, or as the character's season activity on the Seasons page. The lab's
// restrictions, its Specializations and the choice to experiment apply to every one.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ART_NAMES, FORMS, TECHNIQUES, type Form, type Technique } from '../../../data';
import { CORD_COST, cordPointsCost } from '../../../engine/enchant';
import { experimentBotchDice } from '../../../engine/experiment';
import { conditionalBonuses } from '../../../engine/magic';
import { applySeason, newSeasonEntry } from '../../../engine/longterm';
import { LAB_ROUTINES, ROUTINE_IDS, toggleRoutine } from '../../../engine/labRoutines';
import { optionOn } from '../../../engine/optional';
import { PROJECT_KINDS, canExperiment, itemOf, newProject, pawnsUsed, planProject, seasonVisLimit, visShort, workProject } from '../../../engine/projects';
import { loggedThisSeason } from '../../../engine/time';
import type { Character, LabProject } from '../../../engine/types';
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
export function useWorkProject(ed: CharEditor): (p: LabProject) => string[] {
  const { c, d, data, ctx, saga } = ed;
  const putSagaState = useStore((s) => s.putSagaState);
  const chars = useSagaCharacters(saga?.id);
  const covs = useSagaCovenants(saga?.id);
  return (p) => {
    if (!c || !d || !saga) return [];
    const year = saga.currentYear;
    const season = saga.currentSeason;
    const state = structuredClone({ saga, characters: chars, covenants: covs });
    const x = state.characters.find((y) => y.id === c.id)!;
    const cov = ctx.covenant ? state.covenants.find((y) => y.id === ctx.covenant!.id) : undefined;
    const lines = workProject(x, d, ctx, cov, p.uid, data, year, { chars: state.characters, season });
    const theory = d.abilities.find((a) => a.abilityId === d.theoryAbility);
    const e = newSeasonEntry(year, season, 'other', `Lab: ${p.name}`, theory ? { [`ability:${theory.uid}`]: 2 } : {});
    e.notes = lines.join(' ');
    applySeason(x, e, 1);
    x.seasonLog.push(e);
    const touched = state.characters.filter((y) => y.id === x.id || y.id === p.subjectId);
    putSagaState({ saga: state.saga, characters: touched, covenants: cov ? [cov] : [] });
    return [...lines, theory ? `+2 xp Exposure in ${theory.name}.` : ''].filter(Boolean);
  };
}

export function LabProjects({ ed }: { ed: CharEditor }) {
  const { c, d, ctx, saga, update } = ed;
  const chars = useSagaCharacters(saga?.id);
  const workSeason = useWorkProject(ed);
  const [kind, setKind] = useState<LabProject['kind']>('invent');
  const [log, setLog] = useState<string[]>([]);
  if (!c || !d || !saga) return null;
  const projects = c.projects ?? [];
  const year = saga.currentYear;
  const season = saga.currentSeason;
  const busy = loggedThisSeason(c, year, season).length > 0;
  const ruled = ctx.lab?.impossible ?? [];
  const add = () => update((x) => void (x.projects = [...(x.projects ?? []), newProject(kind)]));
  const set = (u: string, fn: (p: LabProject) => void) => update((x) => { const p = x.projects?.find((y) => y.uid === u); if (p) fn(p); });
  const work = (p: LabProject) => {
    const lines = workSeason(p);
    setLog((l) => [`${season} ${year}: ${lines.join(' ')}`, ...l].slice(0, 10));
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
        Plan the work here, then spend a season on it: <b>Work a season</b> logs it for {season} {year}
        {busy ? ' (this character already has this season logged)' : ''}, and <b>Work it each season</b> makes it the season activity the Seasons page carries on with
        until it is done. Vis comes from the purse ({(purseOf(structuredClone(c)).vis ?? []).map((v) => `${v.pawns} ${v.art}`).join(', ') || 'empty'}) or the covenant&apos;s stocks;
        at most {seasonVisLimit(d)} pawns a season (twice Magic Theory).
        {ruled.length > 0 && <span className="bad-text"> {ctx.lab?.lab.name} cannot be used for {ruled.join(', ')}.</span>}
      </p>
      {kind && <p className="small muted" style={{ margin: '0 0 6px' }}>{PROJECT_KINDS.find((k) => k.id === kind)?.blurb}</p>}
      {projects.length === 0 && <div className="small muted">No projects yet.</div>}
      {projects.map((p) => (
        <ProjectRow key={p.uid} p={p} ed={ed} chars={chars} set={(fn) => set(p.uid, fn)} onWork={() => work(p)} busy={busy} />
      ))}
      {log.map((l, i) => (
        <div key={i} className="small list-row" style={{ whiteSpace: 'pre-wrap' }}>
          {l}
        </div>
      ))}
    </Card>
  );
}

function ProjectRow({ p, ed, chars, set, onWork, busy }: { p: LabProject; ed: CharEditor; chars: Character[]; set: (fn: (p: LabProject) => void) => void; onWork: () => void; busy: boolean }) {
  const { c, d, data, update, ctx, saga } = ed;
  const [history, setHistory] = useState(false);
  if (!c || !d || !saga) return null;
  const subject = p.subjectId ? chars.find((x) => x.id === p.subjectId) : undefined;
  const plan0 = planProject(p, c, d, ctx, { subject, data });
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
            <button className="small primary" disabled={plan.problems.length > 0} onClick={onWork} title={busy ? 'This season is already logged for the character; this adds another entry' : `Spend ${saga.currentSeason} ${saga.currentYear} on it`}>
              Work a season
            </button>
            <button
              className="small ghost"
              disabled={standing}
              onClick={() => update((x) => void (x.standing = { kind: 'lab', projectUid: p.uid }))}
              title="Make it the character's season activity: the Seasons page works it every season nothing else is logged, until it is done"
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
            </>
          )}
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
            <Field label="Effect" hint={it.kind === 'charged' ? 'A charged item is made in one season' : `${it.openedPawns - pawnsUsed(it)} of ${it.openedPawns} pawns of room left`}>
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
            <Field label="Experiment" hint={`A simple die${p.experiment?.risk ? ` + ${p.experiment.risk}` : ''} on the Lab Total${labSpec ? ` and the lab's Experimentation +${labSpec}` : ''}; a roll on the Extraordinary Results Chart with ${experimentBotchDice({ risk: p.experiment?.risk ?? 0, auraStrength: ctx.aura.strength, safety: ctx.lab?.characteristics.Safety ?? 0, goldenCord: c.familiar?.golden ?? 0 })} botch dice`}>
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
