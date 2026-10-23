import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ART_NAMES, FORMS, TECHNIQUES, type Form, type Technique } from '../../../data';
import { bestCords, cordPointsCost, familiarBindingLevel, longevityBonus, longevityVisCost, visLimit } from '../../../engine/enchant';
import { labTotal } from '../../../engine/magic';
import { newProject } from '../../../engine/projects';
import { generateFamiliar } from '../../../engine/generate/spellsAndFamiliars';
import { newSeed, seeded } from '../../../engine/generate/random';
import type { Familiar, LabProject } from '../../../engine/types';
import { Card, Field, Stepper, Total, signed } from '../../kit';
import ItemsEditor, { characterTalismanCapacity, newEffect } from '../../items/ItemEditor';
import type { CharEditor } from '../useChar';
import { labContextOf } from '../../../engine/lab';
import { LabProjects } from './LabProjects';
import { OriginalResearch } from './OriginalResearch';
import { describeStress, stressDie } from '../../../engine/dice';
import { useStore } from '../../../store/store';
import { uid } from '../../../util/id';

const newFamiliar = (): Familiar => ({
  name: '', species: '', might: 5, size: -2, realm: 'Magic', bindingTechnique: 'Re', bindingForm: 'An', bindingLabTotal: 0, golden: 0, silver: 0, bronze: 0, pawnsSpent: 0, powers: [],
});

export default function LabItemsTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, ctx, saga } = ed;
  const updateCovenant = useStore((s) => s.updateCovenant);
  if (!c || !d || !saga) return null;
  const magus = d.isMagus;
  const lab = ctx.lab;
  const labCtx = lab ? labContextOf(lab) : undefined;
  const mt = d.abilities.find((a) => a.abilityId === d.theoryAbility)?.total ?? 0;

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
                <div className="small bad-text" style={{ marginTop: 6 }}>
                  This lab cannot be used for {lab.impossible.join(', ')} (its Flaws rule {lab.impossible.length > 1 ? 'them' : 'it'} out).
                </div>
              )}
              {lab.halved.length > 0 && <div className="small bad-text">Missing Ingredients: Lab Totals with {lab.halved.map((a) => ART_NAMES[a as Technique]).join(' or ')} are halved.</div>}
              <ul className="small muted" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>General Quality {signed(lab.characteristics['General Quality'])} and the Specializations go on every Lab Total they fit (not teaching or copying).</li>
                <li>
                  Safety {signed(lab.characteristics.Safety)}: {lab.characteristics.Safety >= 0 ? `takes ${lab.characteristics.Safety} off the botch dice of experiments and vis study` : `an unsafe lab: each season of work may bring an accident (rolled when the season is worked), and ${-lab.characteristics.Safety} more botch dice`}.
                </li>
                {lab.characteristics.Warping > 0 && <li>Warping {lab.characteristics.Warping}: each season&apos;s work may come out warped (rolled when the season is worked).</li>}
                {lab.characteristics.Health !== 0 && (
                  <li>
                    Health {signed(lab.characteristics.Health)}: added to wound recovery rolls, and {signed(Math.floor(lab.characteristics.Health / 2))} to Living Conditions for aging.
                  </li>
                )}
                {lab.characteristics.Aesthetics !== 0 && <li>Aesthetics {signed(lab.characteristics.Aesthetics)}: {5 * Math.abs(lab.characteristics.Aesthetics)} experience points toward a Reputation for the lab.</li>}
              </ul>
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
        onPlan={magus ? (kind, itemUid, effectUid) => update((x) => void (x.projects = [...(x.projects ?? []), { ...newProject(kind), itemUid, effectUid, name: kind === 'open' ? `Prepare ${x.items.find((i) => i.uid === itemUid)?.name ?? 'the item'}` : `Instill ${x.items.find((i) => i.uid === itemUid)?.effects.find((e) => e.uid === effectUid)?.name ?? 'an effect'} in ${x.items.find((i) => i.uid === itemUid)?.name ?? 'the item'}` }])) : undefined}
        onInstall={magus && lab && ctx.covenant ? (item) => updateCovenant(ctx.covenant!.id, (x) => void x.labs.find((l) => l.uid === lab.lab.uid)?.virtues.push({ uid: uid(), defId: 'magic-item', note: item.name, fromItem: item.uid })) : undefined}
        installedIn={(item) => (lab?.lab.virtues.some((v) => v.fromItem === item.uid) ? lab.lab.name : undefined)}
        note={magus ? `Talisman capacity: up to ${characterTalismanCapacity(d)} pawns of Vim vis (highest Technique + highest Form). Instilling effects into your own talisman gives +5 to the Lab Total.` : undefined}
      />

      {magus && <LabProjects ed={ed} />}
      {magus && <OriginalResearch ed={ed} magicTheory={mt} />}

      <LongevityCard ed={ed} />

      {magus && <FamiliarCard ed={ed} />}
    </div>
  );
}

/** Add a lab project of this kind (or open the one already planned), so the season's work is planned on the Lab projects card. */
function usePlan(ed: CharEditor) {
  return (kind: LabProject['kind'], fill?: (p: LabProject) => void) =>
    ed.update((x) => {
      const p = newProject(kind);
      fill?.(p);
      x.projects = [...(x.projects ?? []), p];
    });
}

/** The ritual working on the character, and planning a new one as a season's lab work (DE, Longevity Rituals). */
function LongevityCard({ ed }: { ed: CharEditor }) {
  const { c, d, ctx, update } = ed;
  const plan = usePlan(ed);
  if (!c || !d) return null;
  const magus = d.isMagus;
  const lab = ctx.lab;
  const forbidden = !!lab?.impossible.includes('Longevity Rituals');
  const lr = labTotal(d, { technique: 'Cr', form: 'Co' }, { activity: 'longevity', aura: ctx.aura, lab: lab ? labContextOf(lab) : undefined, forSelfLongevity: true });
  const planned = (c.projects ?? []).find((p) => p.kind === 'longevity' && !p.done);
  return (
    <Card title="Longevity Ritual">
      <div className="row">
        <Field label="Ritual bonus now" hint="A ritual made before play, or by another magus, can be entered here">
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
            {c.longevity.extraVis ? ` incl. ${c.longevity.extraVis} extra vis` : ''}). It ends when the subject suffers an aging crisis.
          </span>
        )}
      </div>
      {magus && (
        <div className="row" style={{ marginTop: 6 }}>
          <div className="stat">
            <span className="v">
              <Total value={lr.total} parts={lr.parts} notes={lr.notes} label="Creo Corpus Lab Total (longevity)" />
            </span>
            <span className="l">CrCo Lab Total</span>
          </div>
          <div className="stat">
            <span className="v">−{longevityBonus(lr.total, 0, false)}</span>
            <span className="l">For yourself</span>
          </div>
          <div className="stat">
            <span className="v">{longevityVisCost(c.age, 0)}</span>
            <span className="l">Pawns (Cr/Co/Vi)</span>
          </div>
          {forbidden ? (
            <span className="bad-text small">{lab!.lab.name} cannot be used for Longevity Rituals: its Flaws rule them out.</span>
          ) : planned ? (
            <span className="small">Planned on the Lab projects card: {planned.name}.</span>
          ) : (
            <button onClick={() => plan('longevity', (p) => void (p.name = 'Longevity Ritual for yourself'))} title="A season of lab work: plan it on the Lab projects card, for yourself or someone else">
              Plan a Longevity Ritual ›
            </button>
          )}
        </div>
      )}
      <p className="small muted" style={{ marginBottom: 0 }}>
        −1 on aging rolls per 5 points (or part) of the Creo Corpus Lab Total, a pawn of Creo, Corpus or Vim vis for every 5 years of age, a season&apos;s work; extra pawns add to
        the Lab Total. For a mundane, a point per 10, and the Lab Total must be 30 (DE p.261).
      </p>
    </Card>
  );
}

/** The familiar: who it is, its bond and cords once bound, and the binding, strengthening and powers planned as lab work (DE, Familiars). */
function FamiliarCard({ ed }: { ed: CharEditor }) {
  const { c, d, ctx, update } = ed;
  const plan = usePlan(ed);
  const [manual, setManual] = useState(false);
  if (!c || !d) return null;
  const fam = c.familiar;
  const lab = ctx.lab;
  const forbidden = !!lab?.impossible.includes('Familiar');
  const famLT = fam ? labTotal(d, { technique: fam.bindingTechnique, form: fam.bindingForm }, { activity: 'familiar', aura: ctx.aura, lab: lab ? labContextOf(lab) : undefined }) : null;
  const bindLevel = fam ? familiarBindingLevel(fam.might, fam.size) : 0;
  const bound = !!fam && fam.bindingLabTotal > 0;
  const setFam = (fn: (f: Familiar) => void) => update((x) => { if (x.familiar) fn(x.familiar); });
  const open = (kind: LabProject['kind']) => (c.projects ?? []).find((p) => p.kind === kind && !p.done);
  return (
    <Card
      title="Familiar"
      actions={
        !fam ? (
          <span className="row tight">
            <button className="small" onClick={() => update((x) => void (x.familiar = newFamiliar()))}>
              + Familiar
            </button>
            <button
              className="small"
              title="A creature suited to your best Technique and Form, with its Might and Size (DE, Suggested Familiars by Art); bind it as a lab project"
              onClick={() => update((x) => void (x.familiar = generateFamiliar(d, seeded(newSeed()), { bind: false, aura: ctx.aura, lab: lab ? labContextOf(lab) : undefined }).familiar))}
            >
              Suggest one
            </button>
          </span>
        ) : (
          <button className="small ghost danger" onClick={() => window.confirm('Remove the familiar?') && update((x) => void (x.familiar = undefined))}>
            Remove
          </button>
        )
      }
    >
      {!fam && <div className="small muted">No familiar. Befriend a creature with Magic Might, then bind it in the lab with any appropriate Technique + Form (DE p.265–267).</div>}
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
            <Field label="Binding Arts" hint={bound ? 'Strengthening uses the same Arts' : 'Any that suit the creature or its powers'}>
              <div className="row tight">
                <select value={fam.bindingTechnique} disabled={bound} onChange={(e) => setFam((f) => void (f.bindingTechnique = e.target.value as Technique))}>
                  {TECHNIQUES.map((t) => (
                    <option key={t} value={t}>
                      {ART_NAMES[t]}
                    </option>
                  ))}
                </select>
                <select value={fam.bindingForm} disabled={bound} onChange={(e) => setFam((f) => void (f.bindingForm = e.target.value as Form))}>
                  {FORMS.map((f) => (
                    <option key={f} value={f}>
                      {ART_NAMES[f]}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
          <div className="row">
            <div className="stat">
              <span className="v">
                <Total value={famLT.total} parts={famLT.parts} notes={famLT.notes} label="Familiar Lab Total" />
              </span>
              <span className="l">Lab Total now</span>
            </div>
            {!bound && (
              <div className="stat">
                <span className={`v ${famLT.total >= bindLevel ? 'good-text' : 'bad-text'}`}>{bindLevel}</span>
                <span className="l">Binding level</span>
              </div>
            )}
            {bound ? (
              <>
                <span className="badge good">bound</span>
                <span className="small">
                  Bond Lab Total {fam.bindingLabTotal}; golden {fam.golden}, silver {fam.silver}, bronze {fam.bronze} ({cordPointsCost(fam.golden, fam.silver, fam.bronze)} points); {fam.pawnsSpent} pawns spent.
                </span>
              </>
            ) : (
              <span className="small muted">Not yet bound: no cords, and none of the bond&apos;s benefits.</span>
            )}
            {forbidden ? (
              <span className="bad-text small">{lab!.lab.name} cannot be used for familiar work: its Flaws rule it out.</span>
            ) : !bound ? (
              open('bind') ? (
                <span className="small">Binding planned on the Lab projects card.</span>
              ) : (
                <button onClick={() => plan('bind', (p) => void ((p.name = `Bind ${fam.name || 'the familiar'}`), (p.cords = bestCords(famLT.total))))} title="A season's lab work; the cords start at the best the Lab Total buys">
                  Plan the binding ›
                </button>
              )
            ) : open('strengthen') ? (
              <span className="small">Strengthening planned on the Lab projects card.</span>
            ) : (
              <button onClick={() => plan('strengthen', (p) => void ((p.name = 'Strengthen the familiar bond'), (p.cords = bestCords(famLT.total, fam))))} title="A season with the binding Arts: buy stronger cords with the new Lab Total">
                Plan strengthening the bond ›
              </button>
            )}
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Binding: a Lab Total of at least 25 + Might + 5 × Size, in one season, for a pawn of the binding Technique or Form per 5 points of the Lab Total; the cords (5/15/30/50/75
            points for +1 to +5) are bought with the Lab Total. Strengthening: the same Arts, the new Lab Total, and a pawn per 5 points of it less the pawns already spent. Golden: one
            fewer botch die when using magic (never none). Silver: Personality rolls and resisting mental influence. Bronze: Soak (now {signed(d.soak)}), healing, deprivation and aging.
          </p>
          <details open={manual} onToggle={(e) => setManual((e.target as HTMLDetailsElement).open)}>
            <summary className="small">A bond made before play: enter it as it stands</summary>
            <div className="row" style={{ marginTop: 6 }}>
              <Field label="Bond Lab Total">
                <Stepper value={fam.bindingLabTotal} min={0} width={46} onChange={(v) => setFam((f) => void (f.bindingLabTotal = v))} />
              </Field>
              <Field label="Pawns spent">
                <Stepper value={fam.pawnsSpent} min={0} width={40} onChange={(v) => setFam((f) => void (f.pawnsSpent = v))} />
              </Field>
              {(['golden', 'silver', 'bronze'] as const).map((k) => (
                <Field key={k} label={`${k[0].toUpperCase() + k.slice(1)} cord`}>
                  <Stepper value={fam[k]} min={0} max={5} width={30} onChange={(v) => setFam((f) => void (f[k] = v))} />
                </Field>
              ))}
              {cordPointsCost(fam.golden, fam.silver, fam.bronze) > fam.bindingLabTotal && (
                <span className="bad-text small">The cords cost {cordPointsCost(fam.golden, fam.silver, fam.bronze)} points, more than the bond&apos;s Lab Total.</span>
              )}
            </div>
          </details>
          {bound && <SilverRescue silver={fam.silver} name={fam.name || 'The familiar'} />}
          {bound && <BondPowers ed={ed} fam={fam} plan={plan} forbidden={forbidden} />}
          <Field label="Notes">
            <textarea rows={3} value={fam.notes ?? ''} onChange={(e) => setFam((f) => void (f.notes = e.target.value))} />
          </Field>
        </div>
      )}
    </Card>
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
 * Powers invested in the familiar bond (DE, Empowering the Bond): designed here, invested as a lab
 * project. +5 to the Lab Total for an effect in the binding Technique or Form, +10 for both, instead
 * of the bonus for other effects; effects only on the magus or the familiar; no Verditius bonus; no
 * limit on their number, and their vis does not count toward the cords.
 */
function BondPowers({ ed, fam, plan, forbidden }: { ed: CharEditor; fam: Familiar; plan: ReturnType<typeof usePlan>; forbidden: boolean }) {
  const { c, update } = ed;
  const setFam = (fn: (f: Familiar) => void) => update((x) => { if (x.familiar) fn(x.familiar); });
  if (!c) return null;
  const planned = (uid: string) => (c.projects ?? []).some((p) => p.kind === 'empower' && p.effectUid === uid && !p.done);
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="row small">
        <b>Powers of the bond</b>
        <button className="small" onClick={() => setFam((f) => void f.powers.push({ ...newEffect(), technique: f.bindingTechnique, form: f.bindingForm, name: 'New power', pending: true }))}>
          + Power
        </button>
      </div>
      {fam.powers.map((e) => (
        <div key={e.uid} className="row small">
          <input value={e.name} onChange={(v) => setFam((f) => void (f.powers.find((x) => x.uid === e.uid)!.name = v.target.value))} style={{ width: 160 }} aria-label="Power name" />
          <select value={e.technique} onChange={(v) => setFam((f) => void (f.powers.find((x) => x.uid === e.uid)!.technique = v.target.value as Technique))} aria-label="Technique">
            {TECHNIQUES.map((t) => (
              <option key={t} value={t}>
                {ART_NAMES[t]}
              </option>
            ))}
          </select>
          <select value={e.form} onChange={(v) => setFam((f) => void (f.powers.find((x) => x.uid === e.uid)!.form = v.target.value as Form))} aria-label="Form">
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
          <span>level</span>
          <Stepper value={e.modifiedLevel} min={1} width={40} onChange={(v) => setFam((f) => void ((f.powers.find((x) => x.uid === e.uid)!.modifiedLevel = v), (f.powers.find((x) => x.uid === e.uid)!.baseLevel = v)))} />
          {e.pending === false ? (
            <span className="badge good">working</span>
          ) : forbidden ? null : planned(e.uid) ? (
            <span className="muted">planned on the Lab projects card</span>
          ) : (
            <button className="small" onClick={() => plan('empower', (p) => void ((p.effectUid = e.uid), (p.name = `Empower the bond: ${e.name}`)))}>
              Plan investing it ›
            </button>
          )}
          <button className="small ghost" onClick={() => setFam((f) => void (f.powers = f.powers.filter((x) => x.uid !== e.uid)))} aria-label="Remove the power">
            ✕
          </button>
        </div>
      ))}
      {fam.powers.length > 0 && <span className="small muted">Level with uses a day and other modifications, as for an invested device. A power for you is worked by the familiar, one for the familiar by you.</span>}
    </div>
  );
}
