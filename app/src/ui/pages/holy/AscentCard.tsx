// The Divine Ascent.

import { useState } from 'react';
import { ASCENT_FORMS, ascentCheck, ascentDuration, ascentOutcome, type AscentForm } from '../../../engine/holy';
import { describeStress, stressDie } from '../../../engine/dice';
import type { AuraState } from '../../../engine/magic';
import { Card, Field, Stepper, Total } from '../../kit';
import type { CharEditor } from '../../character/useChar';
import { useLines, Lines } from './shared';

const VIRTUES = ['Justice', 'Fortitude', 'Temperance', 'Wisdom', 'Faith', 'Hope', 'Charity'];
const HOLY_ABILITY = /^(dominion-lore|adjuration|blessing|cursing|intervention|transcendence|understanding|wonders|invocation|meditation|purity|ceremony|holy-music|holy-magic|sense-holiness-and-unholiness|gematria|kabbalah|merkavah|dream-interpretation|craft-amulets|ars-notoria)$/;

export function AscentCard({ ed, aura, gained: fromPower }: { ed: CharEditor; aura: AuraState; gained: number }) {
  const { c, d, update } = ed;
  const [gained, setGained] = useState(Math.max(2, fromPower));
  const [onSheet, setOnSheet] = useState(true);
  const [form, setForm] = useState<AscentForm>('gloom');
  const [virtue, setVirtue] = useState('Temperance');
  const [trait, setTrait] = useState('Temperate');
  const [gloom, setGloom] = useState<{ points: number; to: string; from: string } | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [later, setLater] = useState(1);
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const pts = onSheet ? Math.max(0, d.warpingPoints - gained) : d.warpingPoints;
  const check = ascentCheck({ ...d, warpingPoints: pts }, gained, aura, welcome);
  const roll = () => {
    const mine = stressDie(1);
    const theirs = stressDie(0, undefined, true);
    const r = ascentOutcome(check, mine, theirs.value);
    const out = [`${check.resist.parts.map((x) => x.label).join(' + ')} ${check.resist.total} + ${describeStress(mine)} = ${mine.botches ? 'BOTCH' : r.mine}, against ${check.against.total} + the storyguide’s ${theirs.value} = ${r.against}.`];
    if (!r.ascends) {
      if (!onSheet) update((x) => void (x.warpingPoints += gained));
      out.push('Too tied to the world: no Ascent.');
      return show(out);
    }
    const before = check.against.parts[0].value;
    const dur = ascentDuration(before, gained + r.margin, d.trueFaith);
    update((x) => void (x.warpingPoints += r.margin + (onSheet ? 0 : gained)));
    out.push(`The Divine Ascent: ${r.margin ? `${r.margin} more Warping Point${r.margin > 1 ? 's' : ''}` : 'no more Warping Points (welcomed, not failed)'}, lifted into the Divine for ${dur.n} ${dur.unit}. The body stays, untouched by any power, illness or want, or vanishes until it returns.`);
    const chosen = c.holy?.ascent;
    if (chosen === 'gloom') setGloom({ points: gained + r.margin, to: '', from: '' });
    if (!chosen) out.push('Choose the form of the Ascent below: it is the same for the rest of the character’s life.');
    show(out);
  };
  const holyAbilities = d.abilities.filter((a) => HOLY_ABILITY.test(a.abilityId));
  const mundane = d.abilities.filter((a) => !HOLY_ABILITY.test(a.abilityId) && a.effectiveXp > 0 && (a.type === 'General' || a.type === 'Academic' || a.type === 'Martial'));
  const applyGloom = () => {
    if (!gloom || !gloom.to || !gloom.from) return;
    update((x) => {
      const to = x.abilities.find((a) => a.uid === gloom.to);
      const from = x.abilities.find((a) => a.uid === gloom.from);
      if (to) to.xp.laterLife = (to.xp.laterLife ?? 0) + gloom.points;
      if (from) {
        let n = gloom.points;
        for (const k of Object.keys(from.xp) as (keyof typeof from.xp)[]) {
          const take = Math.min(n, from.xp[k] ?? 0);
          from.xp[k] = (from.xp[k] ?? 0) - take;
          n -= take;
        }
      }
    });
    show(`Divine Gloom: ${gloom.points} experience points to ${d.abilities.find((a) => a.uid === gloom.to)?.name}, ${gloom.points} from ${d.abilities.find((a) => a.uid === gloom.from)?.name}.`);
    setGloom(null);
  };
  return (
    <Card title="The Divine Ascent" tour="holy-ascent" fold="holy-ascent" summary={c.holy?.ascent ? `Divine ${c.holy.ascent}` : 'when two or more Warping Points come at once'}>
      <p className="small muted">A holy character gaining two or more Warping Points at once: Presence + Concentration (or Meditation) + stress die, against Warping Score + the points gained + True Faith + aura + a stress die.</p>
      <div className="row">
        <Field label="Warping Points gained">
          <Stepper value={gained} min={2} max={30} width={36} onChange={setGained} />
        </Field>
        <label className="inline small">
          <input type="checkbox" checked={onSheet} onChange={(e) => setOnSheet(e.target.checked)} /> already on the sheet
        </label>
        <span>
          <Total value={check.resist.total} parts={check.resist.parts} label="Resisting" /> + die against <Total value={check.against.total} parts={check.against.parts} notes={check.against.notes} label="The Divine" /> + die
        </span>
        <button onClick={roll}>Roll</button>
      </div>
      {check.meditation > 0 && (
        <label className="inline small" title="Realms of Power: The Divine, Meditation: “You may subtract your score in Meditation from your roll to avoid Divine Ascent, and this does not increase the number of additional Warping points you receive from the experience.”">
          <input type="checkbox" checked={welcome} onChange={(e) => setWelcome(e.target.checked)} /> Welcome the Ascent: subtract Meditation ({check.meditation}) from the roll; the Warping Points it brings are not increased
        </label>
      )}
      <Lines lines={lines} />
      {c.holy?.ascent === 'gloom' && !gloom && (
        <div className="row small" data-tour="holy-gloom">
          <span className="muted">Divine Gloom: every gain of Warping Points, from any cause, moves as many experience points from mundane Abilities to holy ones.</span>
          <Field label="Warping Points gained">
            <Stepper value={later} min={1} max={30} width={36} onChange={setLater} />
          </Field>
          <button className="small" onClick={() => setGloom({ points: later, to: '', from: '' })}>
            Move the experience
          </button>
        </div>
      )}
      {gloom && (
        <div className="row small">
          Divine Gloom: {gloom.points} experience points
          <select value={gloom.to} onChange={(e) => setGloom({ ...gloom, to: e.target.value })} aria-label="To a holy Ability">
            <option value="">to…</option>
            {holyAbilities.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name} {a.total}
              </option>
            ))}
          </select>
          <select value={gloom.from} onChange={(e) => setGloom({ ...gloom, from: e.target.value })} aria-label="From a mundane Ability">
            <option value="">from…</option>
            {mundane.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name} {a.total}
              </option>
            ))}
          </select>
          <button className="small" disabled={!gloom.to || !gloom.from} onClick={applyGloom}>
            Shift them
          </button>
        </div>
      )}
      {!c.holy?.ascent && (
        <div className="row small">
          <Field label="Its form, for life" hint={ASCENT_FORMS[form]}>
            <select value={form} onChange={(e) => setForm(e.target.value as AscentForm)}>
              <option value="gloom">Divine Gloom</option>
              <option value="form">Divine Form</option>
              <option value="unity">Divine Unity</option>
            </select>
          </Field>
          {form === 'unity' && (
            <>
              <Field label="The virtue">
                <select value={virtue} onChange={(e) => setVirtue(e.target.value)}>
                  {VIRTUES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Its Personality Trait">
                <input value={trait} onChange={(e) => setTrait(e.target.value)} />
              </Field>
            </>
          )}
          <button className="small" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), ascent: form, ...(form === 'unity' ? { unity: { virtue, trait } } : {}) }))}>
            Set it
          </button>
        </div>
      )}
    </Card>
  );
}
