// Laboratory projects worked season by season: inventing a spell, preparing an item (a talisman a
// little at a time), attuning a talisman, instilling an effect, extracting vis. A season's work is
// logged for the saga's current season; the Seasons page carries on with the standing project.

import { useState } from 'react';
import { ART_NAMES, FORMS, TECHNIQUES, type Form, type Technique } from '../../../data';
import { applySeason, newSeasonEntry } from '../../../engine/longterm';
import { PROJECT_KINDS, itemOf, newProject, pawnsUsed, planProject, seasonVisLimit, workProject } from '../../../engine/projects';
import { loggedThisSeason } from '../../../engine/time';
import type { LabProject } from '../../../engine/types';
import { purseOf } from '../../../engine/vis';
import { useStore } from '../../../store/store';
import { Card, Field, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

export function LabProjects({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, ctx, saga } = ed;
  const putCovenant = useStore((s) => s.putCovenant);
  const [kind, setKind] = useState<LabProject['kind']>('invent');
  const [log, setLog] = useState<string[]>([]);
  if (!c || !d || !saga) return null;
  const projects = c.projects ?? [];
  const year = saga.currentYear;
  const season = saga.currentSeason;
  const busy = loggedThisSeason(c, year, season).length > 0;
  const add = () => update((x) => void (x.projects = [...(x.projects ?? []), newProject(kind)]));
  const set = (u: string, fn: (p: LabProject) => void) => update((x) => { const p = x.projects?.find((y) => y.uid === u); if (p) fn(p); });

  /** a season's work: progress, vis, the result, and the season logged with Exposure in Magic Theory */
  const work = (p: LabProject) => {
    const cov = ctx.covenant ? structuredClone(ctx.covenant) : undefined;
    let lines: string[] = [];
    update((x) => {
      lines = workProject(x, d, ctx, cov, p.uid, data);
      const theory = d.abilities.find((a) => a.abilityId === d.theoryAbility);
      const e = newSeasonEntry(year, season, 'other', `Lab: ${p.name}`, theory ? { [`ability:${theory.uid}`]: 2 } : {});
      e.notes = lines.join(' ');
      applySeason(x, e, 1);
      x.seasonLog.push(e);
    });
    if (cov && p.visFrom === 'covenant') putCovenant(cov);
    setLog((l) => [`${season} ${year}: ${lines.join(' ')} (+2 xp Exposure in Magic Theory)`, ...l].slice(0, 10));
  };

  return (
    <Card
      title="Lab projects"
      actions={
        <span className="row tight">
          <select value={kind} onChange={(e) => setKind(e.target.value as LabProject['kind'])}>
            {PROJECT_KINDS.map((k) => (
              <option key={k.id} value={k.id} title={k.blurb}>
                {k.label}
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
        A season of lab work on a project for {season} {year}{busy ? ' (this character already has this season logged)' : ''}. Set one as the standing activity (Seasons &amp; Aging
        tab) and the Seasons page works it every season. Vis comes from the purse ({(purseOf(structuredClone(c)).vis ?? []).map((v) => `${v.pawns} ${v.art}`).join(', ') || 'empty'}) or the
        covenant&apos;s stocks; at most {seasonVisLimit(d)} pawns a season (twice Magic Theory).
      </p>
      {projects.length === 0 && <div className="small muted">No projects yet.</div>}
      {projects.map((p) => (
        <ProjectRow key={p.uid} p={p} ed={ed} set={(fn) => set(p.uid, fn)} onWork={() => work(p)} busy={busy} />
      ))}
      {log.map((l, i) => (
        <div key={i} className="small list-row">
          {l}
        </div>
      ))}
    </Card>
  );
}

function ProjectRow({ p, ed, set, onWork, busy }: { p: LabProject; ed: CharEditor; set: (fn: (p: LabProject) => void) => void; onWork: () => void; busy: boolean }) {
  const { c, d, data, update, ctx } = ed;
  if (!c || !d) return null;
  const plan = planProject(p, c, d, ctx);
  const it = itemOf(c, p);
  const isTalisman = !!it && c.talismanUid === it.uid;
  const smBonuses = it ? it.shapeMaterialIds.flatMap((id) => data.shapeMaterial.find((s) => s.id === id)?.bonuses.map((b) => ({ ...b, from: data.shapeMaterial.find((s) => s.id === id)!.name })) ?? []) : [];
  const standing = c.standing?.kind === 'lab' && c.standing.projectUid === p.uid;
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', opacity: p.done ? 0.6 : 1 }}>
      <div className="row">
        <input value={p.name} onChange={(e) => set((x) => void (x.name = e.target.value))} style={{ flex: '1 1 160px' }} />
        <span className="badge">{PROJECT_KINDS.find((k) => k.id === p.kind)?.label}</span>
        {p.done ? (
          <span className="badge good">done</span>
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
            {p.kind !== 'extract' && p.kind !== 'open' && p.kind !== 'attune' && plan.target > 1 && (
              <span className="small">
                {p.progress}/{plan.target} points{plan.gain ? `, +${plan.gain} a season, ${plan.seasonsLeft} season${plan.seasonsLeft === 1 ? '' : 's'} to go` : ''}
              </span>
            )}
            <button className="small primary" disabled={plan.problems.length > 0 && !(p.kind === 'extract' && plan.gain)} onClick={onWork} title={busy ? 'This season is already logged for the character; this adds another entry' : ''}>
              Work a season
            </button>
            <button className="small ghost" disabled={standing} onClick={() => update((x) => void (x.standing = { kind: 'lab', projectUid: p.uid }))} title="Work it in every season nothing else is planned">
              {standing ? 'standing project' : 'Make standing'}
            </button>
          </>
        )}
        <button className="small ghost" onClick={() => update((x) => void (x.projects = (x.projects ?? []).filter((y) => y.uid !== p.uid)))}>
          ✕
        </button>
      </div>
      {!p.done && (
        <div className="row small">
          {p.kind === 'invent' && (
            <>
              <Field label="Spell">
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
                  style={{ maxWidth: 240 }}
                >
                  <option value="">— your own effect —</option>
                  {data.spells
                    .filter((sp) => sp.level !== null && !c.spells.some((k) => k.spellId === sp.id))
                    .map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} ({sp.technique}
                        {sp.form} {sp.level})
                      </option>
                    ))}
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
              <Field label="Similar spell or other bonus" hint="+ the magnitude of the highest similar spell you know">
                <Stepper value={p.bonus ?? 0} min={-20} max={30} width={36} onChange={(v) => set((x) => void (x.bonus = v || undefined))} />
              </Field>
            </>
          )}
          {(p.kind === 'open' || p.kind === 'attune' || p.kind === 'instill') && (
            <Field label="Item">
              <select value={p.itemUid ?? ''} onChange={(e) => set((x) => void ((x.itemUid = e.target.value || undefined), (x.effectUid = undefined)))}>
                <option value="">— choose (add it under Enchanted items) —</option>
                {c.items.map((i) => (
                  <option key={i.uid} value={i.uid}>
                    {i.name}
                    {c.talismanUid === i.uid ? ' (talisman)' : ''} — {i.openedPawns} pawns opened
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
            <Field label="Effect" hint={`${it.openedPawns - pawnsUsed(it)} of ${it.openedPawns} pawns of room left`}>
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
          </span>
          {plan.problems.map((x) => (
            <span key={x} className="warn-text">
              {x}
            </span>
          ))}
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
