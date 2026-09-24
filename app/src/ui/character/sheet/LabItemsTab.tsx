import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ART_NAMES, FORMS, TECHNIQUES, type Form, type Technique } from '../../../data';
import { CORD_COST, cordPointsCost, familiarBindingLevel, familiarBindingVis, longevityBonus, longevityVisCost, visLimit } from '../../../engine/enchant';
import { labTotal } from '../../../engine/magic';
import type { Familiar } from '../../../engine/types';
import { Card, Field, Stepper, Total } from '../../kit';
import ItemsEditor, { characterTalismanCapacity } from '../../items/ItemEditor';
import type { CharEditor } from '../useChar';
import { uid } from '../../../util/id';

const newFamiliar = (): Familiar => ({
  name: '', species: '', might: 5, size: -2, realm: 'Magic', bindingTechnique: 'Re', bindingForm: 'An', bindingLabTotal: 0, golden: 0, silver: 0, bronze: 0, pawnsSpent: 0, powers: [],
});

export default function LabItemsTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, ctx, saga } = ed;
  const [extraVis, setExtraVis] = useState(0);
  const [ltOverride, setLtOverride] = useState<number | null>(null);
  if (!c || !d || !saga) return null;
  const magus = d.isMagus;
  const lab = ctx.lab;
  const labCtx = lab ? { generalQuality: lab.characteristics['General Quality'], specializations: lab.specializations } : undefined;
  const mt = d.abilities.find((a) => a.abilityId === 'magic-theory')?.total ?? 0;

  const lr = labTotal(d, { technique: 'Cr', form: 'Co' }, { activity: 'longevity', aura: ctx.aura, lab: labCtx, forSelfLongevity: true });
  const lrTotal = (ltOverride ?? lr.total) + extraVis;
  const fam = c.familiar;
  const famLT = fam ? labTotal(d, { technique: fam.bindingTechnique, form: fam.bindingForm }, { activity: 'familiar', aura: ctx.aura, lab: labCtx }) : null;
  const bindLevel = fam ? familiarBindingLevel(fam.might, fam.size) : 0;
  const cordCost = fam ? cordPointsCost(fam.golden, fam.silver, fam.bronze) : 0;
  const setFam = (fn: (f: Familiar) => void) => update((x) => { if (x.familiar) fn(x.familiar); });

  return (
    <div className="stack">
      {magus && (
        <Card title="Laboratory" className="accent">
          {lab ? (
            <div>
              <div className="row">
                <b>{lab.lab.name}</b>
                <span className="small muted">
                  Size {lab.size}, Refinement {lab.refinement}, free space {lab.freeSpace}
                </span>
                {ctx.covenant && <Link to={`/saga/${saga.id}/covenant/${ctx.covenant.id}?tab=labs`}>Edit in covenant →</Link>}
              </div>
              <div className="row small" style={{ marginTop: 6 }}>
                {Object.entries(lab.characteristics).map(([k, v]) => (
                  <span key={k} className="badge">
                    {k} {v >= 0 ? `+${v}` : v}
                  </span>
                ))}
              </div>
              {Object.keys(lab.specializations).length > 0 && (
                <div className="small" style={{ marginTop: 6 }}>
                  Specializations: {Object.entries(lab.specializations).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ')}
                </div>
              )}
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              No laboratory assigned. Labs are built on the covenant page (they cost build points and have Virtues and Flaws); assign one to this magus there.
            </p>
          )}
          <p className="small muted" style={{ marginBottom: 0 }}>
            Aura: {ctx.aura.realm} {ctx.aura.strength}. Vis limit per season: {visLimit(mt)} pawns (Magic Theory × 2).
          </p>
        </Card>
      )}

      <ItemsEditor
        items={c.items}
        onChange={(fn) => update((x) => fn(x.items))}
        data={data}
        d={magus ? d : undefined}
        aura={ctx.aura}
        lab={labCtx}
        talismanUid={c.talismanUid}
        onSetTalisman={magus ? (id) => update((x) => void (x.talismanUid = id)) : undefined}
        title={magus ? `Enchanted items${c.talismanUid ? '' : ' (no talisman yet)'}` : 'Magic items & charms'}
      />
      {magus && (
        <p className="small muted" style={{ marginTop: -8 }}>
          Talisman capacity: up to {characterTalismanCapacity(d)} pawns of Vim vis (highest Technique + highest Form). Instilling effects into your own talisman gives +5 to the Lab Total.
        </p>
      )}

      <Card title="Longevity Ritual">
        <div className="row">
          <Field label="Current ritual bonus">
            <Stepper
              value={c.longevity?.bonus ?? 0}
              min={0}
              width={40}
              onChange={(v) => update((x) => { if (!v) x.longevity = undefined; else x.longevity = { ...(x.longevity ?? { labTotal: 0, extraVis: 0 }), bonus: v }; })}
            />
          </Field>
          {c.longevity && (
            <span className="small muted">
              {c.longevity.createdBy ? `by ${c.longevity.createdBy}` : ''} {c.longevity.createdYear ? `in ${c.longevity.createdYear}` : ''} (Lab Total {c.longevity.labTotal}
              {c.longevity.extraVis ? ` incl. ${c.longevity.extraVis} extra vis` : ''})
            </span>
          )}
        </div>
        {magus && (
          <>
            <h4>Create your own</h4>
            <div className="row">
              <div className="stat">
                <span className="v">
                  <Total value={lr.total} parts={lr.parts} notes={lr.notes} label="Creo Corpus Lab Total (longevity)" />
                </span>
                <span className="l">CrCo Lab Total</span>
              </div>
              <Field label="Override Lab Total (e.g. with assistants)">
                <div className="row tight">
                  <Stepper value={ltOverride ?? lr.total} min={0} width={46} onChange={setLtOverride} />
                  {ltOverride !== null && (
                    <button className="small ghost" onClick={() => setLtOverride(null)}>
                      auto
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Extra vis (+1 Lab Total each)">
                <Stepper value={extraVis} min={0} width={40} onChange={setExtraVis} />
              </Field>
              <div className="stat">
                <span className="v">−{longevityBonus(lrTotal - extraVis, extraVis, false)}</span>
                <span className="l">Aging roll bonus</span>
              </div>
              <div className="stat">
                <span className="v">{longevityVisCost(c.age, extraVis)}</span>
                <span className="l">Pawns (Cr/Co/Vi)</span>
              </div>
              <button
                className="primary"
                disabled={longevityVisCost(c.age, extraVis) > visLimit(mt)}
                title={longevityVisCost(c.age, extraVis) > visLimit(mt) ? 'Needs more vis than your Magic Theory × 2 allows in one season' : ''}
                onClick={() =>
                  update((x) => {
                    x.longevity = { labTotal: lrTotal, bonus: longevityBonus(lrTotal - extraVis, extraVis, false), extraVis, createdYear: saga.currentYear, createdBy: x.name };
                    x.seasonLog.push({ uid: uid(), year: saga.currentYear, season: saga.currentSeason, activity: 'longevity-ritual', summary: `Longevity Ritual (Lab Total ${lrTotal}, −${longevityBonus(lrTotal - extraVis, extraVis, false)})`, gains: {}, applied: true });
                  })
                }
              >
                Perform ritual (one season)
              </button>
            </div>
            <p className="small muted">
              +1 per 5 points (or fraction) of Lab Total; 1 pawn per 5 years of age. For a mundane subject: +1 per 10 points and a Lab Total of at least 30 (DE p.261). The ritual ends when
              the subject suffers an aging crisis.
            </p>
          </>
        )}
      </Card>

      {magus && (
        <Card title="Familiar" actions={!fam ? <button className="small" onClick={() => update((x) => void (x.familiar = newFamiliar()))}>+ Familiar</button> : <button className="small ghost danger" onClick={() => window.confirm('Remove the familiar?') && update((x) => void (x.familiar = undefined))}>Remove</button>}>
          {!fam && <div className="small muted">No familiar. A magus binds a familiar with any appropriate Technique + Form (DE p.265–267).</div>}
          {fam && famLT && (
            <div className="stack">
              <div className="row">
                <Field label="Name">
                  <input value={fam.name} onChange={(e) => setFam((f) => void (f.name = e.target.value))} />
                </Field>
                <Field label="Species">
                  <input value={fam.species} onChange={(e) => setFam((f) => void (f.species = e.target.value))} />
                </Field>
                <Field label="Magic Might">
                  <Stepper value={fam.might} min={0} width={40} onChange={(v) => setFam((f) => void (f.might = v))} />
                </Field>
                <Field label="Size">
                  <Stepper value={fam.size} min={-10} max={10} width={36} onChange={(v) => setFam((f) => void (f.size = v))} />
                </Field>
              </div>
              <div className="row">
                <Field label="Binding Arts">
                  <div className="row tight">
                    <select value={fam.bindingTechnique} onChange={(e) => setFam((f) => void (f.bindingTechnique = e.target.value as Technique))}>
                      {TECHNIQUES.map((t) => (
                        <option key={t} value={t}>
                          {ART_NAMES[t]}
                        </option>
                      ))}
                    </select>
                    <select value={fam.bindingForm} onChange={(e) => setFam((f) => void (f.bindingForm = e.target.value as Form))}>
                      {FORMS.map((f) => (
                        <option key={f} value={f}>
                          {ART_NAMES[f]}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
                <div className="stat">
                  <span className="v">
                    <Total value={famLT.total} parts={famLT.parts} notes={famLT.notes} label="Familiar Lab Total" />
                  </span>
                  <span className="l">Lab Total now</span>
                </div>
                <div className="stat">
                  <span className={`v ${famLT.total >= bindLevel ? 'good-text' : 'bad-text'}`}>{bindLevel}</span>
                  <span className="l">Binding level</span>
                </div>
                <div className="stat">
                  <span className="v">{familiarBindingVis(famLT.total)}</span>
                  <span className="l">Pawns to bind</span>
                </div>
                <button
                  disabled={famLT.total < bindLevel}
                  onClick={() => setFam((f) => { f.bindingLabTotal = Math.max(f.bindingLabTotal, famLT.total); f.pawnsSpent = Math.max(f.pawnsSpent, familiarBindingVis(famLT.total)); })}
                  title="Record the binding (or strengthening) with the current Lab Total"
                >
                  {fam.bindingLabTotal ? 'Strengthen bond' : 'Bind'} (one season)
                </button>
              </div>
              <div className="row">
                <Field label="Bond Lab Total (cord points)">
                  <Stepper value={fam.bindingLabTotal} min={0} width={46} onChange={(v) => setFam((f) => void (f.bindingLabTotal = v))} />
                </Field>
                {(['golden', 'silver', 'bronze'] as const).map((k) => (
                  <Field key={k} label={`${k[0].toUpperCase() + k.slice(1)} cord (${CORD_COST[fam[k]]} pts)`}>
                    <Stepper value={fam[k]} min={0} max={5} width={30} onChange={(v) => setFam((f) => void (f[k] = v))} />
                  </Field>
                ))}
                <span className={cordCost > fam.bindingLabTotal ? 'bad-text' : 'small'}>
                  Cords cost {cordCost} / {fam.bindingLabTotal}
                </span>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                Golden: −1 botch die per point (never to zero). Silver: bonus to Personality rolls and resisting mental influence. Bronze: bonus to Soak (already added: Soak {d.soak}),
                healing, deprivation and aging. Cords cost 5/15/30/50/75 points; the total can't exceed the Lab Total. Strengthening costs one pawn per 5 points of the new Lab Total minus
                pawns already spent ({fam.pawnsSpent}).
              </p>
              <Field label="Powers, bond effects & notes">
                <textarea rows={3} value={fam.notes ?? ''} onChange={(e) => setFam((f) => void (f.notes = e.target.value))} />
              </Field>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
