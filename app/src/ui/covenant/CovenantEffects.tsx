// Magic on the covenant: wards that last a year and are cast again (the Aegis of the Hearth), and
// rituals or Ritual Powers cast on everyone at once (Creo Corpus and Creo Mentem Characteristic
// rituals, Grant Virtue), paid for, rolled and applied with one button.

import { useState } from 'react';
import { ART_NAMES, CHAR_NAMES, CHARACTERISTICS, FORMS, TECHNIQUES, type Art, type Characteristic, type Form, type Technique, type VFSize } from '../../data';
import { deriveCharacter } from '../../engine/character/derive';
import { powerStats } from '../../engine/character/powers';
import { characterContext } from '../../engine/context';
import { describeStress, stressDie } from '../../engine/dice';
import { MENTAL, PHYSICAL, checkPowerUse, payPower } from '../../engine/effects';
import { castingFatigue, castingOutcome, castingRules, castingScore, magicBotchDice, ritualVis } from '../../engine/magic';
import { applyRitual, guidelineLevel, type RitualPlan } from '../../engine/rituals';
import type { ActiveEffect, Character, Covenant } from '../../engine/types';
import { purseOf, takeVis, visAvailable, visText } from '../../engine/vis';
import { useGameData, useSaga, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Field, Stepper } from '../kit';

export function CovenantEffects({ cov, chars }: { cov: Covenant; chars: Character[] }) {
  const saga = useSaga(cov.sagaId);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [name, setName] = useState('Aegis of the Hearth');
  const [level, setLevel] = useState(20);
  const [caster, setCaster] = useState('');
  const [open, setOpen] = useState(false);
  if (!saga) return null;
  const magi = chars.filter((c) => cov.memberIds.includes(c.id) && c.type === 'magus');
  const effects = cov.effects ?? [];
  const addWard = () =>
    updateCovenant(cov.id, (x) => {
      const fx: ActiveEffect = { uid: uid(), name, year: saga.currentYear, season: saga.currentSeason, duration: 'year', renew: { casterId: caster || undefined, level, art: 'Vi' } };
      x.effects = [...(x.effects ?? []), fx];
    });
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <div className="row small">
        <b>Magic on the covenant:</b>
        {effects.length === 0 && <span className="muted">none recorded</span>}
        {effects.map((e) => (
          <span key={e.uid} className="badge" title={e.notes}>
            {e.name}
            {e.duration === 'year' ? ` (since ${e.season} ${e.year}${e.renew ? ', renewed each year' : ''})` : e.duration === 'permanent' ? ` (${e.year})` : ''}{' '}
            <span className="clickable" title="Remove" onClick={() => updateCovenant(cov.id, (x) => void (x.effects = (x.effects ?? []).filter((y) => y.uid !== e.uid)))}>
              ✕
            </span>
          </span>
        ))}
        <button className="small ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : '+ Ward that lasts a Year'}
        </button>
      </div>
      {open && (
        <div className="row small">
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: 180 }} />
          <Field label="Level">
            <Stepper value={level} min={5} step={5} width={40} onChange={setLevel} />
          </Field>
          <Field label="Cast each year by">
            <select value={caster} onChange={(e) => setCaster(e.target.value)}>
              <option value="">— anyone —</option>
              {magi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <button className="small" onClick={addWard} title={`Cast again at each year's turn with ${Math.ceil(level / 5)} pawns of Rego or Vim vis from the covenant's stocks`}>
            Record
          </button>
          <span className="muted">At each year&apos;s turn it is cast again with a pawn of Rego or Vim vis per magnitude from the covenant&apos;s stocks.</span>
        </div>
      )}
      <CovenantRitual cov={cov} chars={chars} />
    </div>
  );
}

type Target = 'physical' | 'mental' | Characteristic;

/** Cast a ritual or Ritual Power on the covenant: pay, roll and apply in one go. */
export function CovenantRitual({ cov, chars }: { cov: Covenant; chars: Character[] }) {
  const saga = useSaga(cov.sagaId);
  const data = useGameData(saga);
  const covs = useSagaCovenants(cov.sagaId);
  const putSagaState = useStore((s) => s.putSagaState);
  const setNotice = useStore((s) => s.setNotice);
  const [show, setShow] = useState(false);
  const [casterId, setCasterId] = useState('');
  const [source, setSource] = useState('');
  const [kind, setKind] = useState<'raise' | 'virtue'>('raise');
  const [target, setTarget] = useState<Target>('physical');
  const [max, setMax] = useState(3);
  const [virtue, setVirtue] = useState('');
  const [vsize, setVsize] = useState<VFSize>('Minor');
  const [duration, setDuration] = useState<ActiveEffect['duration']>('permanent');
  const [level, setLevel] = useState(guidelineLevel(3) + 10);
  const [te, setTe] = useState<Technique>('Cr');
  const [fo, setFo] = useState<Form>('Co');
  const [designed, setDesigned] = useState(false);
  const [toChars, setToChars] = useState(true);
  // the characters it reaches: everyone by default, or a chosen few
  const [only, setOnly] = useState<string[] | null>(null);
  const [toSpecs, setToSpecs] = useState(true);
  const [toFolk, setToFolk] = useState(true);
  const [visFrom, setVisFrom] = useState<'covenant' | 'purse'>('covenant');
  const [payWith, setPayWith] = useState<'might' | 'confidence' | 'vis'>('confidence');
  // a magic character may eat vis to refill its Might pool first (RoP: Magic, Magic Might)
  const [refill, setRefill] = useState(0);
  const [result, setResult] = useState<string[]>([]);
  if (!saga) return null;
  const members = chars.filter((c) => cov.memberIds.includes(c.id) && c.creation.finalized);
  const casters = members.filter((c) => c.type === 'magus' || (c.powers ?? []).length > 0);
  const caster = casters.find((c) => c.id === casterId);
  const d = caster ? deriveCharacter(caster, data, saga.houseRules) : undefined;
  const ctx = caster ? characterContext(caster, covs, data) : undefined;
  const spell = caster?.spells.find((s) => s.uid === source);
  const power = caster?.powers?.find((p) => p.uid === source);
  const lvl = spell ? spell.spell.level ?? level : power ? power.level : level;
  const chs: Characteristic[] = target === 'physical' ? PHYSICAL : target === 'mental' ? MENTAL : [target];
  const tech = spell?.spell.technique ?? te;
  const form = spell?.spell.form ?? (chs.every((c) => MENTAL.includes(c)) ? 'Me' : fo);
  const ritual = power ? power.kind === 'ritual' : spell ? !!spell.spell.ritual : true;
  const rules = d ? castingRules(d) : undefined;
  const problems0: string[] = [];
  const vis = d && rules && !power && ritual ? ritualVis(lvl, rules) : { pawns: 0, wasted: 0 };
  const stock = visFrom === 'covenant' ? cov.visStocks : caster ? purseOf(structuredClone(caster)).vis : [];
  const have = visAvailable(stock, [tech, form]);
  const pstats = power && caster && d ? powerStats(power, d.characteristics.Qik.value, !!d.magicChar) : undefined;
  const mightCost = pstats?.mightCost ?? pstats?.magnitude ?? 0;
  const mightForm = d?.might?.form as Art | undefined;
  const refillPay = refill && mightForm ? { pawns: refill, sameForm: true } : undefined;
  const pcheck = power && caster && d ? checkPowerUse(caster, d, mightCost, { pool: mightCost, ritual, payWith, refill: refillPay }) : undefined;
  if (refill && mightForm && visAvailable(stock, [mightForm]) < refill) problems0.push(`Only ${visAvailable(stock, [mightForm])} pawns of ${ART_NAMES[mightForm]} vis to eat.`);
  const score = d && !power ? castingScore(d, { technique: tech, form }, { kind: ritual ? 'ritual' : 'formulaic', aura: ctx?.aura }) : undefined;
  const targetsChars = toChars ? members.filter((m) => !only || only.includes(m.id)) : [];
  const targetsSpecs = toSpecs ? cov.specialists.filter((s) => !s.characterId) : [];
  const problems: string[] = [...problems0];
  if (!caster) problems.push('Choose who casts it.');
  if (duration === 'permanent' && !ritual) problems.push('Only a Ritual (Momentary Duration) changes Characteristics for good; choose a Duration, or a Ritual.');
  if (kind === 'virtue' && !virtue) problems.push('Choose the Virtue.');
  if (vis.pawns > have) problems.push(`It needs ${vis.pawns} pawns of ${ART_NAMES[tech]} or ${ART_NAMES[form]} vis; ${have} in ${visFrom === 'covenant' ? 'the covenant stocks' : 'the purse'}.`);
  if (pcheck && !pcheck.ok) problems.push(...pcheck.problems);
  if (kind === 'raise' && !power && !spell && level < guidelineLevel(max)) problems.push(`Raising to +${max} is a level ${guidelineLevel(max)} guideline before Range, Duration and Target (DE, Creo Corpus and Creo Mentem).`);

  const cast = () => {
    if (!caster || !d || !ctx) return;
    const before = { saga: structuredClone(saga), characters: structuredClone(chars), covenants: structuredClone(covs) };
    const state = structuredClone(before);
    const c = state.characters.find((x) => x.id === caster.id)!;
    const cv = state.covenants.find((x) => x.id === cov.id)!;
    const lines: string[] = [];
    let ok = true;
    if (power) {
      if (refillPay && mightForm) {
        const ate = takeVis(visFrom === 'covenant' ? cv.visStocks : purseOf(c).vis, [mightForm], refillPay.pawns);
        if (!ate.ok) return setResult([`Not ${refillPay.pawns} pawns of ${ART_NAMES[mightForm]} vis to eat.`]);
      }
      lines.push(...payPower(c, power, mightCost, { pool: mightCost, ritual, payWith, refill: refillPay }));
      if (ritual && payWith === 'vis') {
        const paid = takeVis(visFrom === 'covenant' ? cv.visStocks : purseOf(c).vis, [form, tech], mightCost);
        if (!paid.ok) return setResult([`Not enough vis for Vis Mastery (${mightCost} pawns).`]);
        lines.push(`Vis: ${visText(paid.taken)}.`);
      }
    } else {
      if (vis.pawns) {
        const paid = takeVis(visFrom === 'covenant' ? cv.visStocks : purseOf(c).vis, [tech, form], vis.pawns);
        if (!paid.ok) return setResult([`Not enough vis (${vis.pawns} pawns).`]);
        lines.push(`Vis: ${visText(paid.taken)}${vis.wasted ? ` (${vis.wasted} wasted)` : ''}.`);
      }
      const extra = score?.botchDice ?? 0;
      const r = stressDie(magicBotchDice(extra + vis.pawns, c.familiar?.golden ?? 0));
      const total = r.botches ? 0 : (score?.total ?? 0) + r.value;
      const out = castingOutcome(ritual ? 'ritual' : 'formulaic', total, lvl);
      lines.push(`Casting: ${score?.total ?? 0} + ${describeStress(r)} = ${total} vs level ${lvl}: ${out.text}`);
      const fat = castingFatigue(out.fatigue, castingRules(d));
      if (out.longTerm) c.longTermFatigueLost = Math.min(5, c.longTermFatigueLost + fat);
      else c.fatigueLost = Math.min(5, c.fatigueLost + fat);
      if (r.botches) {
        c.warpingPoints += r.botches;
        lines.push(`Botch: ${r.botches} Warping Point${r.botches > 1 ? 's' : ''}; the ritual goes awry (the storyguide decides how).`);
      }
      ok = out.cast && !r.botches;
    }
    if (ok) {
      const plan: RitualPlan = {
        name: spell?.spell.name ?? power?.name ?? (kind === 'raise' ? `Raise ${chs.map((x) => CHAR_NAMES[x]).join(', ')}` : 'Grant a Virtue'),
        level: lvl,
        effect: kind === 'raise' ? { kind: 'raise', chars: chs, max } : { kind: 'virtue', defId: virtue, size: vsize },
        duration, designedFor: designed,
        targets: { characterIds: targetsChars.map((x) => x.id), specialistUids: targetsSpecs.map((x) => x.uid), covenfolk: toFolk },
      };
      const now = (ch: Character) => {
        const dch = deriveCharacter(ch, data, saga.houseRules);
        return Object.fromEntries(CHARACTERISTICS.map((k) => [k, dch.characteristics[k].value])) as Record<Characteristic, number>;
      };
      const applied = applyRitual(plan, cv, state.characters, c.id, `${c.name}, ${power ? 'Ritual Power' : 'ritual'}`, saga.currentYear, saga.currentSeason, data, now);
      lines.push(...applied.map((l) => `${l.who}: ${l.text}`));
    }
    putSagaState(state);
    setResult(lines);
    setNotice(`${caster.name} cast on ${cov.name}.`, () => putSagaState(before));
  };

  return (
    <div className="stack">
      <button className="small" onClick={() => setShow((v) => !v)} style={{ alignSelf: 'flex-start' }}>
        {show ? 'Close' : '✦ Cast a spell, ritual or power on the covenant or chosen characters…'}
      </button>
      {show && (
        <div className="card inset stack" style={{ padding: 10 }}>
          <div className="row">
            <Field label="Who casts it">
              <select value={casterId} onChange={(e) => (setCasterId(e.target.value), setSource(''))}>
                <option value="">— choose —</option>
                {casters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {caster && (
              <Field label="Spell or power">
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="">— an effect of the level below —</option>
                  {caster.spells.length > 0 && (
                    <optgroup label="Spells">
                      {caster.spells.map((s) => (
                        <option key={s.uid} value={s.uid}>
                          {s.spell.name} ({s.spell.technique}
                          {s.spell.form} {s.spell.level}
                          {s.spell.ritual ? ', Ritual' : ''})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {(caster.powers ?? []).length > 0 && (
                    <optgroup label="Powers">
                      {caster.powers!.map((p) => (
                        <option key={p.uid} value={p.uid}>
                          {p.name} ({p.kind}, level {p.level})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </Field>
            )}
            {!spell && !power && (
              <>
                <Field label="Level" hint="with Range, Duration and Target">
                  <Stepper value={level} min={1} width={40} onChange={setLevel} />
                </Field>
                <Field label="Arts">
                  <span className="row tight">
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
                  </span>
                </Field>
              </>
            )}
          </div>
          <div className="row">
            <Field label="What it does">
              <select value={kind} onChange={(e) => setKind(e.target.value as 'raise' | 'virtue')}>
                <option value="raise">Raise Characteristics by 1</option>
                <option value="virtue">Grant a Virtue</option>
              </select>
            </Field>
            {kind === 'raise' ? (
              <>
                <Field label="Which">
                  <select value={target} onChange={(e) => setTarget(e.target.value as Target)}>
                    <option value="physical">All physical (Str, Sta, Dex, Qik)</option>
                    <option value="mental">All mental (Int, Per, Pre, Com)</option>
                    {CHARACTERISTICS.map((c) => (
                      <option key={c} value={c}>
                        {CHAR_NAMES[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="To no more than" hint={`guideline level ${guidelineLevel(max)}`}>
                  <select value={max} onChange={(e) => setMax(Number(e.target.value))}>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? '0' : `+${n}`} (level {guidelineLevel(n)})
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Virtue">
                  <select value={virtue} onChange={(e) => setVirtue(e.target.value)} style={{ maxWidth: 240 }}>
                    <option value="">— choose —</option>
                    {data.virtuesFlaws
                      .filter((v) => v.kind === 'virtue')
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Size">
                  <select value={vsize} onChange={(e) => setVsize(e.target.value as VFSize)}>
                    <option>Minor</option>
                    <option>Major</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="Duration">
              <select value={duration} onChange={(e) => setDuration(e.target.value as ActiveEffect['duration'])}>
                <option value="permanent">Momentary Ritual: for good</option>
                <option value="year">Year</option>
                <option value="moon">Moon (the season)</option>
                <option value="indefinite">Until ended</option>
              </select>
            </Field>
          </div>
          <div className="row small">
            <span>On:</span>
            <label className="inline">
              <input type="checkbox" checked={toChars} onChange={(e) => setToChars(e.target.checked)} /> {only ? `${targetsChars.length} of the ${members.length} characters` : `the ${members.length} characters`}
            </label>
            {toChars && (
              <span className="clickable muted" onClick={() => setOnly(only ? null : members.map((m) => m.id))}>
                {only ? 'all of them' : 'choose…'}
              </span>
            )}
            <label className="inline">
              <input type="checkbox" checked={toSpecs} onChange={(e) => setToSpecs(e.target.checked)} /> specialists, teachers and craftsmen ({cov.specialists.filter((s) => !s.characterId).length})
            </label>
            <label className="inline">
              <input type="checkbox" checked={toFolk} onChange={(e) => setToFolk(e.target.checked)} /> the covenfolk at large
            </label>
            <label className="inline" title="A special version invented for these targets: no Warping from a powerful effect (DE)">
              <input type="checkbox" checked={designed} onChange={(e) => setDesigned(e.target.checked)} /> designed for them
            </label>
          </div>
          {toChars && only && (
            <div className="row small">
              {members.map((m) => (
                <label key={m.id} className="inline">
                  <input type="checkbox" checked={only.includes(m.id)} onChange={(e) => setOnly(e.target.checked ? [...only, m.id] : only.filter((x) => x !== m.id))} /> {m.name || 'Unnamed'}
                </label>
              ))}
            </div>
          )}
          <div className="row small">
            {power ? (
              <>
                <span>
                  Costs {mightCost} Might Point{mightCost === 1 ? '' : 's'}
                  {ritual ? ', and as a Ritual Power the same again from:' : '.'}
                </span>
                {ritual && (
                  <select value={payWith} onChange={(e) => setPayWith(e.target.value as 'might' | 'confidence' | 'vis')}>
                    <option value="confidence">Confidence Points</option>
                    <option value="vis">vis, with Vis Mastery</option>
                    <option value="might">Might Score (returns slowly)</option>
                  </select>
                )}
              </>
            ) : (
              vis.pawns > 0 && (
                <span>
                  Ritual vis: {vis.pawns} pawn{vis.pawns > 1 ? 's' : ''} of {ART_NAMES[tech]} or {ART_NAMES[form]}
                  {vis.wasted ? ` (${vis.wasted} wasted)` : ''}. Casting Score {score?.total ?? 0} against level {lvl}.
                </span>
              )
            )}
            {power && mightForm && (
              <span className="row tight" title={`Each pawn of ${ART_NAMES[mightForm]} vis refills 5 Might Points; no more pawns than the Might Score at once`}>
                eat
                <Stepper value={refill} min={0} max={d?.might?.score ?? 0} width={30} onChange={setRefill} />
                pawns of {ART_NAMES[mightForm]} vis first (+{refill * 5} Might)
              </span>
            )}
            {(vis.pawns > 0 || (power && (payWith === 'vis' || refill > 0))) && (
              <select value={visFrom} onChange={(e) => setVisFrom(e.target.value as 'covenant' | 'purse')}>
                <option value="covenant">from the covenant&apos;s stocks</option>
                <option value="purse">from {caster?.name ?? 'the caster'}&apos;s purse</option>
              </select>
            )}
          </div>
          {kind === 'raise' && (
            <p className="small muted" style={{ margin: 0 }}>
              Each target gains a point in {chs.map((c) => CHAR_NAMES[c]).join(', ')} up to {max >= 0 ? '+' : ''}
              {max}. Communication improves teaching, Dexterity a craftsman&apos;s Workshop Total, Presence a leader&apos;s pull on Loyalty. An effect of level 30 or more gives each target
              not designed for a Warping Point (DE). Creo raises nothing past +5.
            </p>
          )}
          {problems.map((p) => (
            <div key={p} className="small warn-text">
              {p}
            </div>
          ))}
          <button className="primary" disabled={problems.length > 0} onClick={cast} style={{ alignSelf: 'flex-start' }}>
            Cast on {cov.name}
          </button>
          {result.map((l, i) => (
            <div key={i} className="small list-row">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
