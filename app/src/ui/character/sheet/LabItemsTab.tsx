import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ART_NAMES, FORMS, TECHNIQUES, type Form, type Technique } from '../../../data';
import { CORD_COST, cordPointsCost, familiarBindingLevel, familiarBindingVis, investEffect, longevityBonus, longevityVisCost, visLimit } from '../../../engine/enchant';
import { labTotal } from '../../../engine/magic';
import type { Familiar } from '../../../engine/types';
import { Card, Field, Stepper, Total, signed, HowItWorks } from '../../kit';
import ItemsEditor, { characterTalismanCapacity } from '../../items/ItemEditor';
import type { CharEditor } from '../useChar';
import { uid } from '../../../util/id';
import { labContextOf } from '../../../engine/lab';
import { LabProjects } from './LabProjects';
import { OriginalResearch } from './OriginalResearch';
import { describeStress, stressDie } from '../../../engine/dice';
import { experimentBotchDice, researchRiskLimit, rollExperiment } from '../../../engine/experiment';

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
  const labCtx = lab ? labContextOf(lab) : undefined;
  const mt = d.abilities.find((a) => a.abilityId === d.theoryAbility)?.total ?? 0;

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
        <Card title="Laboratory" className="accent" tour="sheet-lab">
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
              {lab.impossible.length > 0 && (
                <div className="small" style={{ marginTop: 6 }}>
                  <span className="badge bad">Missing Equipment</span> No {lab.impossible.join(', ')} in this lab.
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
        note={magus ? `Talisman capacity: up to ${characterTalismanCapacity(d)} pawns of Vim vis (highest Technique + highest Form). Instilling effects into your own talisman gives +5 to the Lab Total.` : undefined}
      />

      {magus && <LabProjects ed={ed} />}
      {magus && <Experimentation ed={ed} magicTheory={mt} />}
      {magus && <OriginalResearch ed={ed} magicTheory={mt} />}

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
                Golden: one fewer botch die per point when using magic, never down to none (taken off on the Magic tab and in Experimentation). Silver: a bonus to Personality rolls and to
                resisting mental influence, natural or supernatural. Bronze: a bonus to Soak (added: Soak {signed(d.soak)}), healing (added to recovery rolls), deprivation and aging rolls
                (added); not Fatigue. Cords cost 5/15/30/50/75 points; the total can&apos;t exceed the Lab Total. Strengthening uses the same Arts and costs one pawn per 5 points of the new
                Lab Total minus pawns already spent ({fam.pawnsSpent}).
              </p>
              <SilverRescue silver={fam.silver} name={fam.name || 'The familiar'} />
              <BondPower ed={ed} fam={fam} />
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

/** When the magus's mind is overcome, the familiar may free it: 9+ on a stress die plus the silver cord, once a day (DE, The Three Cords). */
function SilverRescue({ silver, name }: { silver: number; name: string }) {
  const [out, setOut] = useState('');
  const roll = () => {
    const r = stressDie(1);
    const total = r.botches ? 0 : r.value + silver;
    setOut(`${describeStress(r)}${silver ? ` + silver cord ${silver}` : ''} = ${r.botches ? 'BOTCH' : total}: ${r.botches ? "the familiar's mind is overcome along with yours." : total >= 9 ? 'your mind is freed.' : 'not this time (one attempt a day).'}`);
  };
  return (
    <div className="row small">
      <button className="small ghost" onClick={roll} title="Stress die + silver cord, 9+ frees you; one attempt a day">
        {name} tries to free your mind
      </button>
      {out && <span>{out}</span>}
    </div>
  );
}

/**
 * Empowering the bond (DE): investing a power in the familiar bond, as in an invested device, but with
 * no limit on powers, +5 to the Lab Total for an effect in the binding Technique or Form (+10 for both)
 * instead of the bonus from other powers, effects only on the magus or the familiar, and no Verditius bonus.
 */
function BondPower({ ed, fam }: { ed: CharEditor; fam: Familiar }) {
  const { d, ctx } = ed;
  const [te, setTe] = useState<Technique>(fam.bindingTechnique);
  const [fo, setFo] = useState<Form>(fam.bindingForm);
  const [level, setLevel] = useState(10);
  if (!d) return null;
  const match = Number(te === fam.bindingTechnique) + Number(fo === fam.bindingForm);
  const lt = labTotal(d, { technique: te, form: fo }, { activity: 'items', aura: ctx.aura, lab: ctx.lab ? labContextOf(ctx.lab) : undefined, familiarBond: match === 2 ? 'both' : match ? 'one' : 'none' });
  const inv = investEffect(lt.total, level, 'invested');
  return (
    <details>
      <summary className="small">Empower the bond: invest a power</summary>
      <div className="row" style={{ marginTop: 6 }}>
        <Field label="Effect">
          <div className="row tight">
            <select value={te} onChange={(e) => setTe(e.target.value as Technique)}>
              {TECHNIQUES.map((t) => (
                <option key={t} value={t}>
                  {ART_NAMES[t]}
                </option>
              ))}
            </select>
            <select value={fo} onChange={(e) => setFo(e.target.value as Form)}>
              {FORMS.map((f) => (
                <option key={f} value={f}>
                  {ART_NAMES[f]}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Effect level" hint="With uses a day and other modifications">
          <Stepper value={level} min={1} width={40} onChange={setLevel} />
        </Field>
        <div className="stat">
          <span className="v">
            <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Lab Total to empower the bond" />
          </span>
          <span className="l">Lab Total</span>
        </div>
        <div className="stat">
          <span className={`v ${inv.possible ? '' : 'bad-text'}`}>{inv.possible ? inv.seasons : '—'}</span>
          <span className="l">Seasons</span>
        </div>
        <div className="stat">
          <span className="v">{inv.vis}</span>
          <span className="l">Pawns</span>
        </div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {inv.reason ?? `${inv.pointsPerSeason} points a season toward level ${level}.`} The power may affect only you, the familiar or both; one affecting only you is worked by the
        familiar, one affecting only the familiar by you, and you always count as touching. There is no limit on the number of powers, and their vis does not count toward
        strengthening the cords. Record the power in the notes below.
      </p>
    </details>
  );
}

/** Arcane Experimentation (DE): a season's Lab Total bonus and its roll on the Extraordinary Results Chart. */
function Experimentation({ ed, magicTheory }: { ed: CharEditor; magicTheory: number }) {
  const { c, update, ctx } = ed;
  const [risk, setRisk] = useState(0);
  const [aura, setAura] = useState(ctx.aura.strength);
  const [research, setResearch] = useState(false);
  const [enchantment, setEnchantment] = useState(false);
  const [safety, setSafety] = useState(ctx.lab?.characteristics.Safety ?? 0);
  const [log, setLog] = useState<string[][]>([]);
  if (!c) return null;
  const maxRisk = research ? researchRiskLimit(magicTheory) : 3;
  // the lab's Familiar Virtue already puts the golden cord into Safety (Covenants: "a restatement")
  const golden = ctx.lab?.parts.Safety.some((p) => p.label === 'Familiar') ? 0 : (c.familiar?.golden ?? 0);
  const opts = { risk: Math.min(risk, maxRisk), auraStrength: aura, originalResearch: research, enchantment, safety, goldenCord: golden };
  const dice = experimentBotchDice(opts);
  const roll = () => {
    const r = rollExperiment(opts);
    const lines = [...r.lines];
    if (r.warpingPoints) {
      update((x) => void (x.warpingPoints += r.warpingPoints));
      lines.push(`${r.warpingPoints} Warping Point${r.warpingPoints > 1 ? 's' : ''} added to this character.${r.warpingPoints >= 2 ? " Roll for Wizard's Twilight on the Advancement tab." : ''}`);
    }
    setLog((l) => [lines, ...l].slice(0, 12));
  };
  return (
    <Card title="Experimentation">
      <HowItWorks summary="A simple die and the risk on the season’s Lab Total, and a roll on the Extraordinary Results Chart.">
        Experimenting adds a simple die (plus the risk modifier) to the season&apos;s Lab Total but rolls on the Extraordinary Results Chart, with a botch die for each point of risk and
        of the laboratory&apos;s aura. You cannot experiment while working from a Laboratory Text. In original research for a Breakthrough, the risk is limited by Magic Theory and is
        used to move the chart roll onto a Discovery instead of adding to the Lab Total (DE, Arcane Experimentation and Arcane Discovery).
      </HowItWorks>
      <div className="row">
        <Field label="Risk modifier" hint={research ? `Up to +${maxRisk} with Magic Theory ${magicTheory}` : '+1 to +3: more Lab Total, more risk'}>
          <Stepper value={Math.min(risk, maxRisk)} min={0} max={maxRisk} width={36} onChange={setRisk} />
        </Field>
        <Field label="Aura strength" hint="Any realm: each point is a botch die">
          <Stepper value={aura} min={0} max={10} width={36} onChange={setAura} />
        </Field>
        <Field label="Lab Safety" hint={ctx.lab ? `This lab: ${signed(ctx.lab.characteristics.Safety)}` : 'Takes botch dice off; negative adds them'}>
          <Stepper value={safety} min={-10} max={10} width={36} onChange={setSafety} />
        </Field>
        <label className="inline small">
          <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} /> Original research (Breakthrough)
        </label>
        <label className="inline small">
          <input type="checkbox" checked={enchantment} onChange={(e) => setEnchantment(e.target.checked)} /> an enchanted item or familiar
        </label>
        <button onClick={roll}>Roll a season</button>
      </div>
      <div className="small muted">
        Botch dice on the chart: <b>{dice}</b> (1 + risk {opts.risk} + aura {aura}{safety ? ` ${safety > 0 ? '−' : '+'} Safety ${Math.abs(safety)}` : ''}
        {golden ? ` − golden cord ${golden}, never down to none` : ''}).
      </div>
      {log.map((lines, i) => (
        <div key={log.length - i} className="list-row small" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          {lines.map((l, k) => (
            <div key={k} style={{ whiteSpace: 'pre-wrap' }}>
              {l}
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

