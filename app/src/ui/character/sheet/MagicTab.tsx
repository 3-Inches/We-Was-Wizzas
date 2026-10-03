import { useMemo, useState } from 'react';
import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type Form, type Technique } from '../../../data';
import { castingOutcome, castingScore, conditionalBonuses, labTotal, magicResistance, penetrationBonus, penetrationTotal, spontaneousTotal, type AuraState, type PenetrationOptions, type Realm } from '../../../engine/magic';
import { describeStress, stressDie, simpleDie } from '../../../engine/dice';
import { MASTERY_ABILITIES } from '../../../engine/spellDesign';
import type { CharSpell } from '../../../engine/types';
import { Card, Field, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';
import { masteryScore } from '../steps/SpellsStep';
import { labContextOf } from '../../../engine/lab';

const REALMS: Realm[] = ['Magic', 'Faerie', 'Divine', 'Infernal', 'None'];

export default function MagicTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, ctx } = ed;
  const [aura, setAura] = useState<AuraState>(ctx.aura);
  const [useLab, setUseLab] = useState(true);
  const [pen, setPen] = useState<PenetrationOptions>({ arcaneConnection: 'none', sympathetic: 0 });
  const [words, setWords] = useState(0);
  const [talisman, setTalisman] = useState(false);
  const [tech, setTech] = useState<Technique>('Cr');
  const [form, setForm] = useState<Form>('Co');
  const [log, setLog] = useState<string[]>([]);
  // what applies right now: one click instead of doing the arithmetic by hand
  const [focusNow, setFocusNow] = useState(false);
  const [conds, setConds] = useState<string[]>([]);
  const [lifeBoost, setLifeBoost] = useState(0);
  const [other, setOther] = useState(0);
  const [similar, setSimilar] = useState('');
  // All According to Plan: once per session, reroll a botch die
  const [aatp, setAatp] = useState<{ spell: string; faces: number[] } | null>(null);

  const talismanItem = c?.items.find((i) => i.uid === c.talismanUid);
  const talismanBonus = talismanItem ? talismanItem.attunements.reduce((s, a) => Math.max(s, a.bonus), 0) : 0;

  const grid = useMemo(() => {
    if (!d) return null;
    const lab = useLab && ctx.lab ? labContextOf(ctx.lab) : undefined;
    const cs: Record<string, number> = {};
    const lt: Record<string, number> = {};
    for (const t of TECHNIQUES)
      for (const f of FORMS) {
        cs[t + f] = castingScore(d, { technique: t, form: f }, { kind: 'formulaic', aura, wordsGestures: words, inFocus: focusNow, circumstance: conds, other }).total;
        lt[t + f] = labTotal(d, { technique: t, form: f }, { activity: 'spells', aura, lab, inFocus: focusNow, circumstance: conds, other }).total;
      }
    return { cs, lt };
  }, [d, aura, useLab, ctx.lab, words, focusNow, conds, other]);

  if (!c || !d || !grid) return null;
  const labCtx = useLab && ctx.lab ? labContextOf(ctx.lab) : undefined;
  const pb = penetrationBonus(d, pen);
  const similarSp = c.spells.find((x) => x.uid === similar);
  const spont = castingScore(d, { technique: tech, form }, {
    kind: 'spontaneous', aura, wordsGestures: words, talismanBonus: talisman ? talismanBonus : 0, inFocus: focusNow, circumstance: conds, other,
    similarSpell: similarSp ? { name: similarSp.spell.name, magnitude: Math.ceil((similarSp.spell.level ?? 0) / 5) } : undefined,
  });
  const hasLifeBoost = d.virtues.some((v) => v.cv.defId === 'life-boost');
  const hasImprovisation = d.virtues.some((v) => v.cv.defId === 'spell-improvisation');
  const conditional = conditionalBonuses(d);
  const spellFocus = (sp: CharSpell) => sp.inFocus ?? !!sp.notes?.includes('[focus]');
  const aatpReady = d.virtues.some((v) => v.cv.defId === 'all-according-to-plan') && !c.session?.aatpUsed;
  const useAatp = () => {
    if (!aatp) return;
    const i = aatp.faces.indexOf(0);
    const again = simpleDie().value % 10;
    const faces = [...aatp.faces];
    if (i >= 0) faces[i] = again;
    const left = faces.filter((f) => f === 0).length;
    push(`All According to Plan (${aatp.spell}): rerolled a botch die: ${again}. ${left === 0 ? 'No botch left: the roll counts as a 0 instead (take back the Warping Points from the botch).' : `${left} zero${left > 1 ? 's' : ''} remain.`}`);
    if (left < aatp.faces.filter((f) => f === 0).length) update((x) => void ((x.warpingPoints = Math.max(0, x.warpingPoints - 1)), (x.session = { ...(x.session ?? {}), aatpUsed: true })));
    else update((x) => void (x.session = { ...(x.session ?? {}), aatpUsed: true }));
    setAatp(null);
  };
  const diedne = d.virtues.some((v) => v.cv.defId === 'diedne-magic');
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 30));

  const castSpell = (sp: CharSpell, stress: boolean) => {
    const ms = masteryScore(sp, d);
    const res = castingScore(d, { technique: sp.spell.technique, form: sp.spell.form, requisites: sp.spell.requisites }, {
      kind: sp.spell.ritual ? 'ritual' : 'formulaic', aura, inFocus: spellFocus(sp), wordsGestures: words, circumstance: conds, other, lifeBoost,
      talismanBonus: talisman ? talismanBonus : 0, extra: ms ? [{ label: 'Mastery', value: ms }] : [],
    });
    const level = sp.spell.level ?? 0;
    const botchDice = Math.max(0, (res.botchDice ?? 0) + 1 - ms);
    let dieText: string;
    let die: number;
    let botched = false;
    let botchCount = 0;
    let lastBotchFaces: number[] = [];
    if (stress || sp.spell.ritual || ms > 0) {
      const r = stressDie(stress ? botchDice : 0, undefined, !stress);
      die = r.value;
      botched = r.botches > 0;
      botchCount = r.botches;
      lastBotchFaces = r.botchFaces;
      dieText = describeStress(r);
    } else {
      const r = simpleDie();
      die = r.value;
      dieText = String(die);
    }
    const raw = res.parts.reduce((s, p) => s + p.value, 0);
    let total = res.halved ? Math.ceil((raw + die) / 2) : res.total + die;
    if (botched) total = 0;
    // a magical botch: one Warping Point per zero; Twilight is checked on 2+ (1 with Twilight Prone)
    const wp = botched ? botchCount : 0;
    if (wp) {
      update((x) => void (x.warpingPoints += wp));
      const check = wp >= 2 || (wp >= 1 && d.twilightProne);
      push(`Botch: ${wp} Warping Point${wp > 1 ? 's' : ''} added.${check ? ` Check for Wizard's Twilight${d.twilightProne && wp < 2 ? ' (Twilight Prone)' : ''}: Advancement tab, Warping & Twilight (points already added).` : ''}`);
      if (aatpReady) setAatp({ spell: sp.spell.name, faces: lastBotchFaces });
    }
    const out = castingOutcome(sp.spell.ritual ? 'ritual' : 'formulaic', total, level);
    const penT = out.cast ? penetrationTotal(d, total, level, { ...pen, masteryScore: sp.masteryAbilities.includes('Penetration') ? ms : 0 }) : 0;
    // Life Boost: the Fatigue levels are spent whatever the result; past Unconscious they become damage
    const boost = hasLifeBoost ? lifeBoost : 0;
    const left = 5 - c.fatigueLost;
    const overBy = Math.max(0, boost - left);
    const boostText = boost ? ` Life Boost spends ${boost} Fatigue level${boost > 1 ? 's' : ''}${overBy ? `; ${overBy} beyond your Fatigue: Soak ${5 * overBy} + stress die without armor` : ''}.` : '';
    push(`${sp.spell.name}: ${res.total} + die ${dieText} = ${total} vs level ${level}. ${botched ? `BOTCH (${botchDice} botch dice). ` : ''}${out.text}${out.cast ? ` Penetration ${penT}.` : ''}${boostText}`);
    if (out.fatigue || boost) {
      update((x) => {
        if (out.longTerm) x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + out.fatigue);
        else x.fatigueLost = Math.min(5, x.fatigueLost + out.fatigue);
        x.fatigueLost = Math.min(5, x.fatigueLost + boost);
      });
    }
  };

  const castSpont = (fatiguing: boolean) => {
    if (!fatiguing) {
      push(`Spontaneous ${tech}${form} (non-fatiguing): ${spont.total}/5 = ${Math.floor(spontaneousTotal(spont.total, false))} (rounded down)`);
      return;
    }
    const r = stressDie((spont.botchDice ?? 0) + 1);
    const tot = r.botches ? 0 : spontaneousTotal(spont.total, true, r.value, diedne);
    push(`Spontaneous ${tech}${form} (fatiguing): (${spont.total} + ${describeStress(r)}) / 2 = ${Math.floor(tot)} (rounded down). Lose one Fatigue level.`);
    update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + 1)));
  };

  return (
    <div className="stack">
      <Card title="Circumstances" className="accent">
        <div className="row">
          <Field label="Aura">
            <div className="row tight">
              <select value={aura.realm} onChange={(e) => setAura({ ...aura, realm: e.target.value as Realm })}>
                {REALMS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <Stepper value={aura.strength} min={0} max={10} width={40} onChange={(v) => setAura({ ...aura, strength: v })} />
              <label className="inline small">
                <input type="checkbox" checked={!!aura.regio} onChange={(e) => setAura({ ...aura, regio: e.target.checked })} /> regio
              </label>
            </div>
          </Field>
          <Field label="Words & gestures">
            <select value={words} onChange={(e) => setWords(Number(e.target.value))}>
              <option value={-10}>silent & motionless (−10)</option>
              <option value={-5}>quiet or motionless (−5)</option>
              <option value={0}>firm voice & bold gestures (0)</option>
              <option value={1}>loud voice or exaggerated gestures (+1)</option>
              <option value={2}>loud & exaggerated (+2)</option>
            </select>
          </Field>
          {talismanItem && (
            <label className="inline small">
              <input type="checkbox" checked={talisman} onChange={(e) => setTalisman(e.target.checked)} /> using talisman attunement (+{talismanBonus})
            </label>
          )}
          {ctx.lab && (
            <label className="inline small">
              <input type="checkbox" checked={useLab} onChange={(e) => setUseLab(e.target.checked)} /> Lab Totals in {ctx.lab.lab.name}
            </label>
          )}
        </div>
        <h4>What applies right now</h4>
        <div className="row">
          {d.magicalFocus !== 'none' && (
            <label className="inline small" title="Adds the lower of the Technique and Form again. Each spell has its own Focus box below.">
              <input type="checkbox" checked={focusNow} onChange={(e) => setFocusNow(e.target.checked)} /> Inside my Magical Focus ({d.focusText ?? d.magicalFocus}) for the grid,
              Lab Totals and spontaneous magic
            </label>
          )}
          {conditional.map((b) => (
            <label key={b.uid} className="inline small">
              <input type="checkbox" checked={conds.includes(b.uid)} onChange={(e) => setConds(e.target.checked ? [...conds, b.uid] : conds.filter((x) => x !== b.uid))} /> {b.label}
              {b.casting ? ` (casting ${b.casting > 0 ? '+' : ''}${b.casting})` : ''}
              {b.lab ? ` (Lab ${b.lab > 0 ? '+' : ''}${b.lab})` : ''}
            </label>
          ))}
          {hasLifeBoost && (
            <Field label="Life Boost: Fatigue levels to spend" hint="+5 each on Formulaic and Ritual Casting Totals; spent when you cast">
              <Stepper value={lifeBoost} min={0} max={10} width={36} onChange={setLifeBoost} />
            </Field>
          )}
          <Field label="Other modifier" hint="Anything temporary or obscure; applies to every total here">
            <Stepper value={other} min={-30} max={30} width={40} onChange={setOther} />
          </Field>
          <button className="small ghost" onClick={() => setAura(ctx.aura)}>
            Reset to covenant aura ({ctx.aura.realm} {ctx.aura.strength})
          </button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Current penalties: wounds {d.currentWoundPenalty}, fatigue {d.currentFatiguePenalty}, encumbrance {-d.encumbrance}. These are included in every total below.
        </p>
      </Card>

      <Card title="Arts">
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>Art</th>
                <th className="num">Score</th>
                <th className="num">xp</th>
                <th>Notes</th>
                <th>Adjust xp</th>
                <th>Magic Resistance</th>
              </tr>
            </thead>
            <tbody>
              {ARTS.map((a: Art) => {
                const ar = d.arts[a];
                const mr = FORMS.includes(a as Form) ? magicResistance(d, a as Form, { aura, includeAura: false }) : null;
                return (
                  <tr key={a}>
                    <td>
                      {ART_NAMES[a]} <span className="muted small">({a})</span>
                    </td>
                    <td className="num">
                      <b>{ar.score}</b>
                      {ar.puissant ? <span className="small good-text"> +{ar.puissant}</span> : null}
                      {ar.remainder ? <span className="small muted"> ({ar.remainder})</span> : null}
                    </td>
                    <td className="num">
                      <Total value={ar.effectiveXp} parts={Object.entries(ar.xp).map(([k, v]) => ({ label: k, value: v ?? 0 }))} />
                    </td>
                    <td>
                      {ar.affinity && <span className="badge info">Affinity</span>}
                      {ar.deficient !== 'none' && <span className="badge bad">Deficient</span>}
                      {ar.elementalBonus ? <span className="badge">Elemental +{ar.elementalBonus}</span> : null}
                    </td>
                    <td>
                      <Stepper
                        value={c.arts[a]?.adjust ?? 0}
                        width={46}
                        onChange={(v) => update((x) => { x.arts[a] = x.arts[a] ?? {}; if (v) x.arts[a].adjust = v; else delete x.arts[a].adjust; })}
                      />
                    </td>
                    <td>{mr && <Total value={mr.total} parts={mr.parts} notes={mr.notes} label={`Magic Resistance vs ${ART_NAMES[a]}`} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted">Click any number to see how it was calculated. Magic Resistance = the highest of Parma Magica × 5 + Form, True Faith × 10, or a relic's Faith × 10; they do not add together (DE p.55, p.221, p.419).</p>
      </Card>

      <Card title="Casting Scores and Lab Totals">
        <p className="small muted" style={{ marginTop: 0 }}>
          Top: Casting Score (Te + Fo + Sta + aura + modifiers; add a die for a Formulaic Casting Total). Bottom: Lab Total for inventing spells (Te + Fo + Int + {d.theoryAbility === "magic-theory" ? "Magic Theory" : data.abilityById.get(d.theoryAbility)?.name} + aura + lab).
        </p>
        <div className="table-wrap">
          <table className="compact grid-table">
            <thead>
              <tr>
                <th />
                {FORMS.map((f) => (
                  <th key={f} className="num" title={ART_NAMES[f]}>
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TECHNIQUES.map((t) => (
                <tr key={t}>
                  <th title={ART_NAMES[t]}>{t}</th>
                  {FORMS.map((f) => {
                    const r = castingScore(d, { technique: t, form: f }, { kind: 'formulaic', aura, wordsGestures: words, inFocus: focusNow, circumstance: conds, other });
                    const l = labTotal(d, { technique: t, form: f }, { activity: 'spells', aura, lab: labCtx, inFocus: focusNow, circumstance: conds, other });
                    return (
                      <td key={f} className="num">
                        <div>
                          <Total value={grid.cs[t + f]} parts={r.parts} notes={r.notes} label={`Casting Score ${t}${f}`} />
                        </div>
                        <div className="small muted">
                          <Total value={grid.lt[t + f]} parts={l.parts} notes={l.notes} label={`Lab Total ${t}${f}`} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Penetration">
        <div className="row">
          <Field label="Arcane connection">
            <select value={pen.arcaneConnection} onChange={(e) => setPen({ ...pen, arcaneConnection: e.target.value as PenetrationOptions['arcaneConnection'] })}>
              <option value="none">none (×1)</option>
              <option value="hours">lasts hours/days (×2)</option>
              <option value="weeks">lasts weeks/months (×3)</option>
              <option value="years">lasts years (×4)</option>
              <option value="indefinite">indefinite (×5)</option>
            </select>
          </Field>
          <Field label="Sympathetic connections (+multiplier)">
            <Stepper value={pen.sympathetic ?? 0} min={0} max={10} width={40} onChange={(v) => setPen({ ...pen, sympathetic: v })} />
          </Field>
          <label className="inline small">
            <input type="checkbox" checked={!!pen.specialty} onChange={(e) => setPen({ ...pen, specialty: e.target.checked })} /> Penetration specialty applies
          </label>
          <div className="stat">
            <span className="v">
              <Total value={pb.bonus} parts={pb.parts} label={`× ${pb.multiplier}`} />
            </span>
            <span className="l">Penetration bonus (×{pb.multiplier})</span>
          </div>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Penetration Total = Casting Total + Penetration bonus − spell level (DE p.215).</p>
      </Card>

      <Card title="Spells">
        {c.spells.length === 0 && <div className="small muted">No spells known.</div>}
        {c.spells.length > 0 && (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>Spell</th>
                  <th>Arts</th>
                  <th className="num">Level</th>
                  <th>R / D / T</th>
                  <th className="num">Casting Score</th>
                  <th className="num">Pen. (avg die)</th>
                  <th>Mastery</th>
                  <th>Cast</th>
                </tr>
              </thead>
              <tbody>
                {c.spells
                  .slice()
                  .sort((a, b) => (a.spell.technique + a.spell.form).localeCompare(b.spell.technique + b.spell.form) || (a.spell.level ?? 0) - (b.spell.level ?? 0))
                  .map((sp) => {
                    const ms = masteryScore(sp, d);
                    const r = castingScore(d, { technique: sp.spell.technique, form: sp.spell.form, requisites: sp.spell.requisites }, {
                      kind: sp.spell.ritual ? 'ritual' : 'formulaic', aura, inFocus: spellFocus(sp), wordsGestures: words, circumstance: conds, other, lifeBoost,
                      talismanBonus: talisman ? talismanBonus : 0, extra: ms ? [{ label: 'Mastery', value: ms }] : [],
                    });
                    const lvl = sp.spell.level ?? 0;
                    const avg = r.total + 5;
                    const penAvg = penetrationTotal(d, avg, lvl, { ...pen, masteryScore: sp.masteryAbilities.includes('Penetration') ? ms : 0 });
                    const risky = r.total + 10 < lvl;
                    return (
                      <tr key={sp.uid}>
                        <td>
                          <b>{sp.spell.name}</b>
                          {sp.spell.ritual && <span className="badge accent">Ritual</span>}
                          {d.magicalFocus !== 'none' && (
                            <label className="inline small" title="This spell is inside your Magical Focus">
                              <input type="checkbox" checked={spellFocus(sp)} onChange={(e) => update((x) => void (x.spells.find((z) => z.uid === sp.uid)!.inFocus = e.target.checked))} /> Focus
                            </label>
                          )}
                        </td>
                        <td>
                          {sp.spell.technique}
                          {sp.spell.form}
                          {sp.spell.requisites.length ? <span className="small muted"> ({sp.spell.requisites.join(',')})</span> : null}
                        </td>
                        <td className="num">{lvl}</td>
                        <td className="small">
                          {sp.spell.range} / {sp.spell.duration} / {sp.spell.target}
                        </td>
                        <td className={`num ${r.total >= lvl ? 'good-text' : risky ? 'bad-text' : 'warn-text'}`}>
                          <Total value={r.total} parts={r.parts} notes={r.notes} label={sp.spell.name} />
                        </td>
                        <td className="num">{penAvg}</td>
                        <td>
                          <span className="badge">{ms}</span>
                          <Stepper
                            value={sp.masteryXp.play ?? 0}
                            min={0}
                            step={5}
                            width={38}
                            title="Mastery xp gained in play"
                            onChange={(v) => update((x) => { const y = x.spells.find((z) => z.uid === sp.uid)!; if (v) y.masteryXp.play = v; else delete y.masteryXp.play; })}
                          />
                          {sp.masteryAbilities.map((m) => (
                            <span key={m} className="badge" title={MASTERY_ABILITIES.find((x) => x.name === m)?.text}>
                              {m}
                            </span>
                          ))}
                        </td>
                        <td className="nowrap">
                          {!sp.spell.ritual && (
                            <button className="small" onClick={() => castSpell(sp, false)} title="Calm: simple die (or stress die without botch if mastered)">
                              Calm
                            </button>
                          )}
                          <button className="small" onClick={() => castSpell(sp, true)} title="Stress die with botch dice">
                            Stress
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">
          Formulaic: fail by 1–10 and the spell still works at a cost of one Fatigue level. Ritual: always costs long-term Fatigue and 1 pawn of vis per magnitude. Mastery adds its score
          to the Casting Total and removes a botch die per point.
        </p>
      </Card>

      <Card title="Spontaneous magic">
        <div className="row">
          <select value={tech} onChange={(e) => setTech(e.target.value as Technique)}>
            {TECHNIQUES.map((t) => (
              <option key={t} value={t}>
                {ART_NAMES[t]}
              </option>
            ))}
          </select>
          <select value={form} onChange={(e) => setForm(e.target.value as Form)}>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
          <div className="stat">
            <span className="v">
              <Total value={spont.total} parts={spont.parts} notes={spont.notes} />
            </span>
            <span className="l">Casting Score</span>
          </div>
          <div className="stat">
            <span className="v" title={`exact ${spontaneousTotal(spont.total, false)}`}>{Math.floor(spontaneousTotal(spont.total, false))}</span>
            <span className="l">Non-fatiguing (÷5)</span>
          </div>
          <div className="stat">
            <span className="v">{Math.floor(spontaneousTotal(spont.total, true, 5.5))}</span>
            <span className="l">Fatiguing, avg die (÷2)</span>
          </div>
          {hasImprovisation && (
            <Field label="Similar Formulaic spell (Spell Improvisation)" hint="Adds its magnitude">
              <select value={similar} onChange={(e) => setSimilar(e.target.value)}>
                <option value="">— none —</option>
                {c.spells
                  .filter((x) => !x.spell.ritual)
                  .map((x) => (
                    <option key={x.uid} value={x.uid}>
                      {x.spell.name} (+{Math.ceil((x.spell.level ?? 0) / 5)})
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <button onClick={() => castSpont(false)}>Cast (no fatigue)</button>
          <button onClick={() => castSpont(true)}>Cast (fatiguing)</button>
        </div>
        <p className="small muted">Totals are rounded down (the DE default when a rule doesn't say otherwise).</p>
        {diedne && <p className="small good-text">Diedne Magic: non-fatiguing spontaneous spells may roll as fatiguing without losing Fatigue.</p>}
      </Card>

      {aatp && (
        <div className="issue warning">
          <span className="badge warn">botch</span>
          <div className="msg">
            {aatp.spell} botched (botch dice {aatp.faces.join(', ')}). All According to Plan lets you reroll one botch die once this session: describe the contingency plan.
          </div>
          <button className="small" onClick={useAatp}>
            Reroll a botch die
          </button>
          <button className="small ghost" onClick={() => setAatp(null)}>
            Keep it
          </button>
        </div>
      )}
      {log.length > 0 && (
        <Card title="Casting log" actions={<button className="small ghost" onClick={() => setLog([])}>Clear</button>}>
          {log.map((l, i) => (
            <div key={i} className="small list-row">
              {l}
            </div>
          ))}
        </Card>
      )}
      <p className="small muted">Botch dice: 1 for a stressful casting, plus the aura strength in a non-Magic aura (doubled in a regio), plus Virtues and Flaws, minus Mastery.</p>
    </div>
  );
}
