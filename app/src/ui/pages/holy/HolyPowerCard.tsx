// Holy powers, worked with a Method and a Power.

import { useMemo, useState } from 'react';
import { HOLY_EXAMPLES, HOLY_GUIDELINES, TRAGEDIES } from '../../../data/divine';
import { CHAR_NAMES } from '../../../data';
import {
  holyEffectLevel, holyEffectTotal, holyMethodsOf, holyOutcome, holyPowersOf, methodWorksWith, wouldBeRitual, type CeremonyGroup,
} from '../../../engine/holy';
import { describeStress, simpleDie, stressDie } from '../../../engine/dice';
import { DURATIONS, RANGES, TARGETS } from '../../../engine/spellDesign';
import type { AuraState } from '../../../engine/magic';
import { Card, Field, HowItWorks, Stepper, Total } from '../../kit';
import { AfterRoll } from '../../AfterRoll';
import type { CharEditor } from '../../character/useChar';
import { type Fellow, useLines, Lines, spendPoint, CeremonyPicker } from './shared';

export function HolyPowerCard({ ed, aura, fellows, onWarping }: { ed: CharEditor; aura: AuraState; fellows: Fellow[]; onWarping: (n: number) => void }) {
  const { c, d, update, saga } = ed;
  const methods = useMemo(() => (d ? holyMethodsOf(d) : []), [d]);
  const powers = useMemo(() => (d ? holyPowersOf(d) : []), [d]);
  const [mid, setMid] = useState('');
  const [pid, setPid] = useState('');
  const [effect, setEffect] = useState('custom');
  const [base, setBase] = useState(5);
  const [range, setRange] = useState('Personal');
  const [duration, setDuration] = useState('Momentary');
  const [target, setTarget] = useState('Individual');
  const [asRitual, setAsRitual] = useState(false);
  const [extra, setExtra] = useState(0);
  const [mSpec, setMSpec] = useState(false);
  const [pSpec, setPSpec] = useState(false);
  const [textQ, setTextQ] = useState(10);
  const [purityCost, setPurityCost] = useState<'fatigue' | 'wound'>('fatigue');
  const [pay, setPay] = useState<'confidence' | 'faith'>('confidence');
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [other, setOther] = useState(0);
  const [lines, show] = useLines();
  const [last, setLast] = useState<{ total: number; level: number; faces?: number[]; trueFaith: number } | null>(null);
  if (!c || !d) return null;
  const pairs = methods.flatMap((m) => powers.filter((p) => methodWorksWith(m.as, p.id)).map((p) => ({ m, p })));
  const m = methods.find((x) => x.id === mid && pairs.some((y) => y.m.id === x.id)) ?? pairs[0]?.m;
  const okPowers = powers.filter((p) => m && methodWorksWith(m.as, p.id));
  const p = okPowers.find((x) => x.id === pid) ?? okPowers[0];
  if (!m || !p) return null;
  const guides = HOLY_GUIDELINES.map((g, i) => ({ g, i })).filter(({ g }) => g.power === p.id && g.method === m.as);
  const examples = HOLY_EXAMPLES.map((e, i) => ({ e, i })).filter(({ e }) => e.power === p.id && e.method === m.as);
  const guide = effect.startsWith('g:') ? HOLY_GUIDELINES[Number(effect.slice(2))] : undefined;
  const example = effect.startsWith('e:') ? HOLY_EXAMPLES[Number(effect.slice(2))] : undefined;
  const designed = holyEffectLevel({ base, range, duration, target, asRitual, extra });
  const level = example && !example.general ? example.level : designed.level;
  const total = holyEffectTotal(d, {
    method: m.id, power: p.id, aura, methodSpecialty: mSpec, powerSpecialty: pSpec, textQuality: m.id === 'gematria' ? textQ : undefined, ceremony, other,
  });
  const pickEffect = (v: string) => {
    setEffect(v);
    if (v.startsWith('g:')) {
      const g = HOLY_GUIDELINES[Number(v.slice(2))];
      setBase(g.level);
    } else if (v.startsWith('e:')) {
      const e = HOLY_EXAMPLES[Number(v.slice(2))];
      setRange(e.range);
      setDuration(e.duration);
      setTarget(e.target);
      setAsRitual(/as a Ritual/.test(e.design));
      const b = Number(e.design.match(/^Base (\d+)/)?.[1]);
      setBase(Number.isFinite(b) && b > 0 ? b : 1);
      setExtra(0);
    }
  };
  const setT = (t: string) => {
    setTarget(t);
    setAsRitual(wouldBeRitual(t, duration) && !/year|grace/i.test(duration) ? true : asRitual);
  };
  const year = saga?.currentYear ?? 1220;
  const season = saga?.currentSeason ?? 'Spring';

  const call = (stress: boolean) => {
    const out: string[] = [];
    // the Method's activity: Invocation spends a point, Meditation an hour of Stamina rolls, Purity a long-term Fatigue level or a Light Wound
    if (m.as === 'invocation') {
      const spent = spendPoint(ed, pay);
      if (!spent) return show(`${m.name} needs a Confidence (or Faith) Point to bring the effect into being, and none is left.`);
      out.push(`${m.name}: the prayer cried aloud (or written); ${spent} spent.`);
    } else if (m.as === 'meditation' && m.id !== 'gematria' && m.id !== 'dream-interpretation') {
      let lost = 0;
      for (let i = 0; i < 6; i++) {
        const r = stressDie(1);
        if (r.botches) {
          update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + lost)));
          return show([...out, `${m.name}: a Stamina roll botched (${describeStress(r)}): the ritual is disrupted after ${(i + 1) * 10} minutes${lost ? `, ${lost} Fatigue level${lost > 1 ? 's' : ''} lost` : ''}.`]);
        }
        if (r.value + d.characteristics.Sta.value < 6) lost++;
      }
      if (lost) update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + lost)));
      const left = 5 - (c.fatigueLost + lost + c.longTermFatigueLost);
      out.push(`${m.name}: an hour, six Stamina rolls against 6${lost ? `, ${lost} failed (${lost} Fatigue level${lost > 1 ? 's' : ''} lost)` : ', none failed'}.`);
      if (left <= 0) return show([...out, 'Unconscious before the ritual is done: no effect.']);
    } else if (m.as === 'purity') {
      if (purityCost === 'fatigue') {
        if (c.fatigueLost + c.longTermFatigueLost >= 5) return show(`${m.name}: no long-term Fatigue level left to give.`);
        update((x) => void (x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + 1)));
        out.push(`${m.name}: deprivation enough to lose a long-term Fatigue level.`);
      } else {
        update((x) => void (x.wounds.light += 1));
        out.push(`${m.name}: deprivation enough to take a Light Wound.`);
      }
    } else out.push(`${m.name}: ${m.activation}`);
    let die: number;
    let faces: number[] | undefined;
    let botches = 0;
    if (stress) {
      const r = stressDie(1 + (total.botchDice ?? 0));
      die = r.value;
      botches = r.botches;
      faces = r.botches ? r.botchFaces : undefined;
      out.push(`Stress die: ${describeStress(r)}.`);
    } else {
      die = simpleDie().value;
      out.push(`Simple die: ${die}.`);
    }
    const t = total.total + die;
    const o = holyOutcome(t, level, d.trueFaith, botches);
    out.push(`${p.name} by ${m.name}: ${total.total} + ${die} = ${t} against level ${level}: ${o.works ? 'the effect happens.' : botches ? `BOTCH (${botches}).` : 'it does not happen.'}`);
    if (o.works && o.warpsTarget) out.push('An effect of level 30 or more: whoever it works on (but its caster) gains a Warping Point.');
    if (o.tragedy) out.push(`${TRAGEDIES[o.tragedy].label}: ${TRAGEDIES[o.tragedy].examples.join('; ')}. ${p.tragedy}${o.faithSaved ? ' (True Faith: Faith × 10 counted for the tragedy.)' : ''}`);
    else if (o.faithSaved) out.push('True Faith: Faith × 10 reaches the level, so no tragedy of hubris.');
    if (botches) {
      update((x) => void (x.warpingPoints += botches));
      out.push(`+${botches} Warping Point${botches > 1 ? 's' : ''} (a zero on each botch die).${botches >= 2 ? ' Two or more at once: check the Divine Ascent below.' : ''}`);
      onWarping(botches);
    }
    if (o.tragedy) update((x) => void (x.holy = { ...(x.holy ?? {}), tragedies: [...(x.holy?.tragedies ?? []), { year, season, kind: o.tragedy!, text: `${p.name} by ${m.name}, level ${level}: a total of ${t}.` }] }));
    setLast({ total: t, level, faces, trueFaith: d.trueFaith });
    show(out);
  };

  return (
    <Card title="Holy powers" className="accent" tour="holy-powers">
      <p className="small muted">
        Simple die + {CHAR_NAMES[m.char]} + Method + Power + aura, against the effect’s level (no Rituals, no vis: what would need a Ritual adds four magnitudes). Below it, a tragedy of hubris; True Faith counts Faith × 10 for the tragedy if higher.
      </p>
      <div className="row">
        <Field label="Method">
          <select value={m.id} onChange={(e) => (setMid(e.target.value), setEffect('custom'))}>
            {methods.filter((x) => pairs.some((y) => y.m.id === x.id)).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} {x.score}
                {x.id !== x.as ? ` (as ${x.as[0].toUpperCase() + x.as.slice(1)})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Power">
          <select value={p.id} onChange={(e) => (setPid(e.target.value), setEffect('custom'))}>
            {okPowers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} {x.score}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effect" hint={guide?.general ? guide.gives?.(base) : example?.text ?? guide?.text}>
          <select value={effect} onChange={(e) => pickEffect(e.target.value)} data-tour="holy-effect">
            <option value="custom">— design one (base level) —</option>
            {guides.length > 0 && (
              <optgroup label="Guidelines">
                {guides.map(({ g, i }) => (
                  <option key={i} value={`g:${i}`}>
                    {g.general ? 'General' : `Level ${g.level}`}: {g.text.length > 80 ? `${g.text.slice(0, 78)}…` : g.text}
                  </option>
                ))}
              </optgroup>
            )}
            {examples.length > 0 && (
              <optgroup label="The book’s effects">
                {examples.map(({ e, i }) => (
                  <option key={i} value={`e:${i}`}>
                    {e.name} ({e.general ? 'General' : `Level ${e.level}`})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
      </div>
      {!(example && !example.general) && (
        <div className="row small" data-tour="holy-design">
          <Field label={guide?.general || example?.general ? 'Base level (sets what it gives)' : 'Base level'}>
            <Stepper value={base} min={1} max={100} width={44} onChange={setBase} />
          </Field>
          {(
            [
              ['Range', RANGES, range, setRange],
              ['Duration', DURATIONS, duration, setDuration],
              ['Target', TARGETS, target, setT],
            ] as const
          ).map(([label, list, v, setV]) => (
            <Field key={label} label={label}>
              <select value={v} onChange={(e) => setV(e.target.value)}>
                {list.filter((o) => !o.requires || o.requires === 'holy-magic').map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name} (+{o.magnitude})
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Field label="More magnitudes" hint="Another sense, a larger target, an intricate effect">
            <Stepper value={extra} min={0} max={10} width={34} onChange={setExtra} />
          </Field>
          <label className="inline" title="A permanent effect, a Boundary Target, a summoning: what would need a Ritual in Hermetic magic adds four magnitudes instead (Powers and Effects). The book's Year examples add none.">
            <input type="checkbox" checked={asRitual} onChange={(e) => setAsRitual(e.target.checked)} /> as a Ritual would be (+4)
          </label>
        </div>
      )}
      <div className="row small">
        <span>
          Level <b>{level}</b>
          {!(example && !example.general) && <span className="muted"> {designed.design}</span>}
          {(guide?.general || example?.general) && <span> — {guide?.gives?.(base) ?? example?.text}</span>}
        </span>
      </div>
      <div className="row small">
        <label className="inline">
          <input type="checkbox" checked={mSpec} onChange={(e) => setMSpec(e.target.checked)} /> {m.name} specialty{m.specialty ? ` (${m.specialty})` : ''} applies
        </label>
        <label className="inline">
          <input type="checkbox" checked={pSpec} onChange={(e) => setPSpec(e.target.checked)} /> {p.name} specialty{p.specialty ? ` (${p.specialty})` : ''} applies
        </label>
        {m.id === 'gematria' && (
          <Field label="The text’s Quality">
            <Stepper value={textQ} min={0} max={30} width={36} onChange={setTextQ} />
          </Field>
        )}
        {m.as === 'invocation' && (
          <Field label="Spend">
            <select value={pay} onChange={(e) => setPay(e.target.value as typeof pay)}>
              <option value="confidence">a Confidence Point</option>
              <option value="faith">a Faith Point</option>
            </select>
          </Field>
        )}
        {m.as === 'purity' && (
          <Field label="The deprivation costs">
            <select value={purityCost} onChange={(e) => setPurityCost(e.target.value as typeof purityCost)}>
              <option value="fatigue">a long-term Fatigue level</option>
              <option value="wound">a Light Wound</option>
            </select>
          </Field>
        )}
        <Field label="Other">
          <Stepper value={other} min={-20} max={20} width={36} onChange={setOther} />
        </Field>
      </div>
      <CeremonyPicker
        focus={d}
        fellows={fellows}
        value={ceremony}
        onChange={setCeremony}
        adds={(f) => {
          const same = holyMethodsOf(f.d).filter((x) => x.as === m.as).reduce((mx, x) => Math.max(mx, x.score), 0);
          return f.d.characteristics[m.char].value + same;
        }}
      />
      <HowItWorks summary={<>Activation: {m.activation.split('.')[0]}.</>}>
        <p className="small">{m.activation}</p>
        <p className="small">{p.text}</p>
      </HowItWorks>
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label={`${p.name} by ${m.name}`} /> + die against {level}
        </span>
        <button onClick={() => call(false)} data-tour="holy-call-effect">
          {m.as === 'invocation' ? 'Entreat (simple die)' : 'Call the effect'}
        </button>
        {m.as === 'invocation' && (
          <button className="ghost" onClick={() => call(true)} title="Commanding rather than entreating: more power, greater offense if unworthy">
            Command (stress die)
          </button>
        )}
      </div>
      <Lines lines={lines} />
      {last && <AfterRoll key={last.total + ':' + last.level + ':' + lines.length} c={c} d={d} total={last.total} ease={last.level} botchFaces={last.faces} what="Effect total" judge={(n) => (n >= last.level ? 'the effect happens.' : `short by ${last.level - n}: ${TRAGEDIES[holyOutcome(n, last.level, last.trueFaith).tragedy ?? 'minor'].label.toLowerCase()}.`)} />}
    </Card>
  );
}
