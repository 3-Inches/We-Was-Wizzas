import { useMemo, useState } from 'react';
import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type Form, type Technique } from '../../../data';
import { castingFatigue, castingOutcome, castingRules, castingScore, certamenFatigue, certamenTotals, conditionalBonuses, labTotal, lifeLinkedFatigue, magicBotchDice, magicResistance, ritualVis, visWithWaste, penetrationBonus, penetrationTotal, spontaneousTotal, type AuraState, type PenetrationOptions, type Realm } from '../../../engine/magic';
import { describeStress, stressDie, simpleDie } from '../../../engine/dice';
import { MASTERY_ABILITIES } from '../../../engine/spellDesign';
import type { CharSpell } from '../../../engine/types';
import type { CertamenArt } from '../../../engine/magic';
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
  // the talisman attunement that matches what is being cast (DE: only when touching it, and only the highest that applies)
  const [attunement, setAttunement] = useState(-1);
  const talisman = attunement >= 0;
  const [tech, setTech] = useState<Technique>('Cr');
  const [form, setForm] = useState<Form>('Co');
  const [log, setLog] = useState<string[]>([]);
  // what applies right now: one click instead of doing the arithmetic by hand
  const [focusNow, setFocusNow] = useState(false);
  const [conds, setConds] = useState<string[]>([]);
  const [lifeBoost, setLifeBoost] = useState(0);
  const [other, setOther] = useState(0);
  const [daysAway, setDaysAway] = useState(0);
  // raw vis spent to raise a Casting Score: +2 a pawn, a botch die each (DE, Vis Boost to Casting Score)
  const [visBoost, setVisBoost] = useState(0);
  const [similar, setSimilar] = useState('');
  // spontaneous casting: ceremonial casting, and the level declared for Life-Linked or Chaotic Magic
  const [ceremonial, setCeremonial] = useState(false);
  const [declared, setDeclared] = useState(10);
  const [lifeLinkedOn, setLifeLinkedOn] = useState(false);
  // All According to Plan: once per session, reroll a botch die
  const [aatp, setAatp] = useState<{ spell: string; faces: number[] } | null>(null);

  const talismanItem = c?.items.find((i) => i.uid === c.talismanUid);
  const talismanBonus = talismanItem?.attunements[attunement]?.bonus ?? 0;

  const grid = useMemo(() => {
    if (!d) return null;
    const lab = useLab && ctx.lab ? labContextOf(ctx.lab) : undefined;
    const cs: Record<string, number> = {};
    const lt: Record<string, number> = {};
    for (const t of TECHNIQUES)
      for (const f of FORMS) {
        cs[t + f] = castingScore(d, { technique: t, form: f }, { kind: 'formulaic', aura, wordsGestures: words, inFocus: focusNow, circumstance: conds, other }).total;
        lt[t + f] = labTotal(d, { technique: t, form: f }, { activity: 'spells', aura, lab, inFocus: focusNow, circumstance: conds, other, daysAway }).total;
      }
    return { cs, lt };
  }, [d, aura, useLab, ctx.lab, words, focusNow, conds, other, daysAway]);

  if (!c || !d || !grid) return null;
  const labCtx = useLab && ctx.lab ? labContextOf(ctx.lab) : undefined;
  const pb = penetrationBonus(d, pen);
  const similarSp = c.spells.find((x) => x.uid === similar);
  const rules = castingRules(d);
  // ceremonial casting needs experience in Artes Liberales or Philosophiae (DE, Ceremonial Casting)
  const canCeremonial = d.abilities.some((a) => (a.abilityId === 'artes-liberales' || a.abilityId === 'philosophiae') && a.effectiveXp > 0);
  const cer = rules.ceremonialSpontaneous || (ceremonial && canCeremonial);
  const spontOpts = {
    kind: 'spontaneous' as const, aura, wordsGestures: words, talismanBonus: talisman ? talismanBonus : 0, inFocus: focusNow, circumstance: conds, other, ceremonial: cer,
    similarSpell: similarSp ? { name: similarSp.spell.name, magnitude: Math.ceil((similarSp.spell.level ?? 0) / 5) } : undefined,
  };
  const spont = castingScore(d, { technique: tech, form }, spontOpts);
  const spontExerted = rules.diedne ? castingScore(d, { technique: tech, form }, { ...spontOpts, diedneExerted: true }) : spont;
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
  const golden = d.char.familiar?.golden ?? 0;
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 30));

  /** a magical botch: one Warping Point per zero; Twilight is checked on 2+ (1 with Twilight Prone) */
  const onBotch = (name: string, wp: number, faces: number[]) => {
    if (!wp) return;
    update((x) => void (x.warpingPoints += wp));
    const check = wp >= 2 || (wp >= 1 && d.twilightProne);
    push(`Botch: ${wp} Warping Point${wp > 1 ? 's' : ''} added.${check ? ` Check for Wizard's Twilight${d.twilightProne && wp < 2 ? ' (Twilight Prone)' : ''}: Advancement tab, Warping & Twilight (points already added).` : ''}`);
    if (aatpReady) setAatp({ spell: name, faces });
  };
  /** Fatigue spent on a casting, after Vulnerable and Withstand Casting; Life Boost and Life-Linked levels are added as they are */
  const spendFatigue = (levels: number, longTerm: boolean) => {
    if (!levels) return '';
    const left = 5 - (c.fatigueLost + c.longTermFatigueLost);
    const over = Math.max(0, levels - left);
    update((x) => {
      if (longTerm) x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + levels);
      else x.fatigueLost = Math.min(5, x.fatigueLost + levels);
    });
    return over ? ` ${over} level${over > 1 ? 's' : ''} beyond your Fatigue: ${longTerm ? 'they become wounds' : 'unconscious an hour for each'}.` : '';
  };
  const fatigueNote = rules.vulnerable || rules.withstand ? ` (${[rules.vulnerable && `Vulnerable Casting +${rules.vulnerable}`, rules.withstand && `Withstand Casting −${rules.withstand}`].filter(Boolean).join(', ')})` : '';

  /** raw vis to boost a casting: no more than the Technique and Form scores together, less any Ritual vis; Rigid Magic forbids it; Waster of Vis loses a quarter */
  const visBoostFor = (te: Technique, fo: Form, ritualPawns: number) => {
    if (!visBoost) return { pawns: 0, used: 0, text: '' };
    if (rules.rigid) return { pawns: 0, used: 0, text: ' Rigid Magic: no vis when casting.' };
    const limit = Math.max(0, d.arts[te].score + d.arts[fo].score - ritualPawns);
    const pawns = Math.min(visBoost, limit);
    const w = visWithWaste(pawns, rules.wasterOfVis);
    return {
      pawns, used: w.pawns,
      text: ` Raw vis: ${w.pawns} pawn${w.pawns === 1 ? '' : 's'} (+${2 * pawns})${pawns < visBoost ? `, held to ${limit} by your ${te} and ${fo} scores` : ''}${w.wasted ? `, ${w.wasted} wasted (Waster of Vis)` : ''}; no more than your score in each Art may be of its kind.`,
    };
  };

  const castSpell = (sp: CharSpell, stress: boolean) => {
    const ms = masteryScore(sp, d);
    // Unstructured Caster: every Formulaic spell is cast as a Ritual, vis and all
    const ritual = !!sp.spell.ritual || rules.unstructured;
    if (ritual && rules.rigid) {
      push(`${sp.spell.name}: Rigid Magic: you cannot use vis when casting, so you cannot cast Ritual spells.`);
      return;
    }
    const level = sp.spell.level ?? 0;
    // a Ritual's vis: a botch die per pawn, including the pawns that make the Ritual possible (DE, Vis Botch Dice)
    const vis = ritual ? ritualVis(level, rules) : { pawns: 0, wasted: 0 };
    const visB = visBoostFor(sp.spell.technique, sp.spell.form, vis.pawns);
    const res = castingScore(d, { technique: sp.spell.technique, form: sp.spell.form, requisites: sp.spell.requisites }, {
      kind: ritual ? 'ritual' : 'formulaic', aura, inFocus: spellFocus(sp), wordsGestures: words, circumstance: conds, other, lifeBoost,
      talismanBonus: talisman ? talismanBonus : 0, extra: ms ? [{ label: 'Mastery', value: ms }] : [], visPawns: visB.pawns,
    });
    const botchDice = Math.max(rules.unpredictable ? 1 : 0, magicBotchDice((res.botchDice ?? 0) + vis.pawns + visB.used, golden, ms));
    // a stress die for stress, for Rituals and mastered spells, and always with Unpredictable Magic; calm and
    // mastered means no botch dice, and a calm Ritual still risks a botch unless it is mastered
    const canBotch = stress || (ritual && ms === 0) || rules.unpredictable;
    let dieText: string;
    let die: number;
    let botched = false;
    let botchCount = 0;
    let lastBotchFaces: number[] = [];
    if (stress || ritual || ms > 0 || rules.unpredictable) {
      const r = stressDie(canBotch ? botchDice : 0, undefined, !canBotch);
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
    const out = castingOutcome(ritual ? 'ritual' : 'formulaic', total, level);
    const penT = out.cast ? penetrationTotal(d, total, level, { ...pen, masteryScore: sp.masteryAbilities.includes('Penetration') ? ms : 0 }) : 0;
    const visText = ritual
      ? ` Vis: ${vis.pawns} pawn${vis.pawns > 1 ? 's' : ''}${rules.ritualVisMultiplier !== 1 ? ' (Mercurian Magic: half, rounded up)' : ''}${vis.wasted ? `, ${vis.wasted} of them wasted (Waster of Vis)` : ''}.${sp.spell.ritual ? '' : ' Unstructured Caster: cast as a Ritual.'}`
      : '';
    const fatigue = castingFatigue(out.fatigue, rules);
    // Life Boost: the Fatigue levels are spent whatever the result; past Unconscious they become damage
    const boost = hasLifeBoost ? lifeBoost : 0;
    const left = 5 - c.fatigueLost;
    const overBy = Math.max(0, boost - left);
    const boostText = boost ? ` Life Boost spends ${boost} Fatigue level${boost > 1 ? 's' : ''}${overBy ? `; ${overBy} beyond your Fatigue: Soak ${5 * overBy} + stress die without armor` : ''}.` : '';
    const fatigueText = fatigue !== out.fatigue ? ` Fatigue lost: ${fatigue}${fatigueNote}.` : '';
    push(`${sp.spell.name}: ${res.total} + die ${dieText} = ${total} vs level ${level}. ${botched ? `BOTCH (${botchDice} botch dice). ` : ''}${out.text}${fatigueText}${out.cast ? ` Penetration ${penT}.` : ''}${visText}${visB.text}${boostText}`);
    onBotch(sp.spell.name, botched ? botchCount : 0, lastBotchFaces);
    const over = spendFatigue(fatigue, out.longTerm);
    if (boost) update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + boost)));
    if (over) push(`${sp.spell.name}:${over}`);
  };

  /**
   * Spontaneous magic: calm (÷5, no roll), Diedne's calm option (÷2 on a stress die, no Fatigue), or
   * exerted (÷2 on a stress die, a Fatigue level). Weak Spontaneous Magic still checks for a botch under
   * stress, and Unpredictable Magic always does.
   */
  const castSpont = (mode: 'calm' | 'calm-stress' | 'diedne' | 'exerted') => {
    const name = `Spontaneous ${tech}${form}${cer ? ' (ceremonial)' : ''}`;
    const boost = visBoostFor(tech, form, 0);
    const score = (mode === 'exerted' ? spontExerted.total : spont.total) + 2 * boost.pawns;
    const dice = Math.max(rules.unpredictable ? 1 : 0, magicBotchDice((spont.botchDice ?? 0) + boost.used, golden));
    let total: number;
    let text: string;
    let botch = { n: 0, faces: [] as number[] };
    if (mode === 'calm' || mode === 'calm-stress') {
      total = Math.floor(spontaneousTotal(score, false));
      text = `${name} (non-fatiguing): ${score}/5 = ${total} (rounded down)`;
      if (mode === 'calm-stress' || rules.unpredictable) {
        const r = stressDie(dice);
        if (r.botches) {
          total = 0;
          botch = { n: r.botches, faces: r.botchFaces };
        }
        text += `; botch check ${describeStress(r)}${r.botches ? `: BOTCH (${dice} botch dice)` : ''}${rules.unpredictable ? ' (Unpredictable Magic)' : ''}`;
      }
      text += '.';
    } else {
      const r = stressDie(dice);
      total = r.botches ? 0 : Math.floor(spontaneousTotal(score, true, r.value));
      if (r.botches) botch = { n: r.botches, faces: r.botchFaces };
      text = `${name} (${mode === 'diedne' ? 'Diedne Magic, no Fatigue' : 'fatiguing'}): (${score} + ${describeStress(r)}) / 2 = ${total} (rounded down)${r.botches ? `: BOTCH (${dice} botch dice)` : ''}.`;
    }
    const target = rules.chaotic || (rules.lifeLinked && lifeLinkedOn) ? declared : null;
    if (target !== null && !botch.n) {
      text += ` Declared level ${target}.`;
      if (rules.chaotic && Math.abs(total - target) > 1) text += ' Chaotic Magic: more than one level off, so the storyguide decides what the spell does.';
    }
    let levels = mode === 'exerted' ? castingFatigue(1, rules) : 0;
    if (mode === 'exerted' && rules.lifeLinked && lifeLinkedOn && !botch.n) {
      const extra = lifeLinkedFatigue(total, declared);
      if (extra) {
        text += ` Life-Linked: ${extra} more Fatigue level${extra > 1 ? 's' : ''} to reach it.`;
        levels += extra;
      } else text += ' Life-Linked: the spell reaches it.';
    }
    if (levels) text += ` Lose ${levels} Fatigue level${levels > 1 ? 's' : ''}${fatigueNote}.`;
    text += boost.text;
    push(text);
    onBotch(name, botch.n, botch.faces);
    const over = spendFatigue(levels, false);
    if (over) push(`${name}:${over}${rules.lifeLinked && lifeLinkedOn ? ' Life-Linked: the levels still needed count as Damage beyond your Soak (DE).' : ''}`);
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
          {talismanItem && talismanItem.attunements.length > 0 && (
            <Field label="Talisman attunement" hint="Touching the talisman, for a spell the attunement fits">
              <select value={attunement} onChange={(e) => setAttunement(Number(e.target.value))}>
                <option value={-1}>none applies</option>
                {talismanItem.attunements
                  .map((a, i) => ({ a, i }))
                  .sort((x, y) => y.a.bonus - x.a.bonus)
                  .map(({ a, i }) => (
                    <option key={i} value={i}>
                      +{a.bonus} {a.label}
                    </option>
                  ))}
              </select>
            </Field>
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
          <Field label="Raw vis to boost a casting" hint={rules.rigid ? 'Rigid Magic: none' : '+2 Casting Score a pawn, a botch die each; up to your Technique + Form'}>
            <Stepper value={visBoost} min={0} max={30} width={36} onChange={setVisBoost} />
          </Field>
          <Field label="Days away from the lab" hint={daysAway > 20 ? 'Past twenty: no lab work this season' : daysAway > 10 ? `Lab Totals ${10 + 2 * (daysAway - 10) > 30 ? -30 : -(10 + 2 * (daysAway - 10))}` : 'Up to ten cost nothing'}>
            <Stepper value={daysAway} min={0} max={30} width={36} onChange={setDaysAway} />
          </Field>
          <button className="small ghost" onClick={() => setAura(ctx.aura)}>
            Reset to covenant aura ({ctx.aura.realm} {ctx.aura.strength})
          </button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Current penalties: wounds {d.currentWoundPenalty}, fatigue {d.currentFatiguePenalty}{d.currentDiseasePenalty ? `, disease ${d.currentDiseasePenalty}` : ''}, encumbrance {-d.encumbrance}. These are included in every total below.
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
                    const l = labTotal(d, { technique: t, form: f }, { activity: 'spells', aura, lab: labCtx, inFocus: focusNow, circumstance: conds, other, daysAway });
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
                      kind: sp.spell.ritual || rules.unstructured ? 'ritual' : 'formulaic', aura, inFocus: spellFocus(sp), wordsGestures: words, circumstance: conds, other, lifeBoost,
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
                          {(!(sp.spell.ritual || rules.unstructured) || ms > 0) && (
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
          Formulaic: fail by 1–10 and the spell still works at a cost of one Fatigue level. Ritual: always costs long-term Fatigue and 1 pawn of vis per magnitude, and each pawn is a
          botch die; a Ritual always rolls a stress die. Mastery adds its score to the Casting Total and removes a botch die per point.
        </p>
        <CastingRulesNote rules={rules} />
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
            <span className="v">
              {rules.weakSpontaneous ? '—' : <Total value={Math.floor(spontaneousTotal(spontExerted.total, true, 5.5))} parts={spontExerted.parts} notes={['Exerted: (Casting Score + stress die) ÷ 2, shown with an average die of 5.5.', ...spontExerted.notes]} label="Exerted spontaneous" />}
            </span>
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
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <label className="inline small" title={canCeremonial ? 'Fifteen minutes per magnitude; the spell is limited to one magnitude per fifteen minutes spent' : 'Needs experience in Artes Liberales or Philosophiae'}>
            <input type="checkbox" checked={cer} disabled={rules.ceremonialSpontaneous || !canCeremonial} onChange={(e) => setCeremonial(e.target.checked)} /> Ceremonial casting (+Artes Liberales
            and Philosophiae; 15 minutes a magnitude){rules.ceremonialSpontaneous ? ': required by Ceremonial Spontaneous Magic' : ''}
          </label>
          {(rules.chaotic || rules.lifeLinked) && (
            <Field label="Declared level" hint={rules.chaotic ? 'Chaotic Magic: declare every spontaneous spell (Penetration levels included)' : 'Life-Linked: may include levels for Penetration'}>
              <Stepper value={declared} min={1} step={1} width={40} onChange={setDeclared} />
            </Field>
          )}
          {rules.lifeLinked && (
            <label className="inline small">
              <input type="checkbox" checked={lifeLinkedOn} onChange={(e) => setLifeLinkedOn(e.target.checked)} /> Use Life-Linked Spontaneous Magic (a Fatigue level per 5 points short)
            </label>
          )}
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <button onClick={() => castSpont('calm')} disabled={rules.difficultSpontaneous} title={rules.difficultSpontaneous ? 'Difficult Spontaneous Magic: you must exert yourself' : 'Casting Score ÷ 5, no roll'}>
            Cast (no fatigue)
          </button>
          {rules.weakSpontaneous && !rules.difficultSpontaneous && (
            <button onClick={() => castSpont('calm-stress')} title="Weak Spontaneous Magic: under stress you still roll for a botch, but the die adds nothing">
              Cast under stress (÷5, botch check)
            </button>
          )}
          {rules.diedne && !rules.difficultSpontaneous && (
            <button onClick={() => castSpont('diedne')} title="Diedne Magic: divide by 2 instead of 5 with a stress die (may botch), without spending Fatigue">
              Cast (no fatigue, ÷2 on a stress die)
            </button>
          )}
          <button onClick={() => castSpont('exerted')} disabled={rules.weakSpontaneous} title={rules.weakSpontaneous ? 'Weak Spontaneous Magic: you may not exert yourself' : 'Stress die, ÷ 2, one Fatigue level'}>
            Cast (fatiguing)
          </button>
        </div>
        <p className="small muted">Totals are rounded down (the DE default when a rule doesn't say otherwise).</p>
        {rules.weakSpontaneous && rules.difficultSpontaneous && <p className="small bad-text">Weak and Difficult Spontaneous Magic together: you cannot cast spontaneous spells at all.</p>}
        {rules.diedne && <p className="small good-text">Diedne Magic: exerted, your lowest Art counts twice before dividing by two (in the fatiguing total); calm, you may divide by 2 on a stress die instead of by 5.</p>}
      </Card>

      <Certamen ed={ed} push={push} />

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

/** Certamen (DE): the totals for the chosen Technique and Form, and a round rolled against an opponent's numbers. */
function Certamen({ ed, push }: { ed: CharEditor; push: (s: string) => void }) {
  const { c, d, update } = ed;
  const [tech, setTech] = useState<Technique>('Re');
  const [form, setForm] = useState<Form>('Te');
  const [attackWith, setAttackWith] = useState<CertamenArt>('technique');
  const [vis, setVis] = useState(0);
  const [opp, setOpp] = useState({ defense: 10, resistance: 5, attack: 12, weakening: 4 });
  if (!c || !d) return null;
  const t = certamenTotals(d, tech, form);
  const defendWith: CertamenArt = attackWith === 'technique' ? 'form' : 'technique';
  const artName = (w: CertamenArt) => (w === 'technique' ? ART_NAMES[tech] : ART_NAMES[form]);
  const visMax = (w: CertamenArt) => t.visLimit[w];
  const pawns = (w: CertamenArt) => Math.min(vis, visMax(w));
  const roll = (base: number) => {
    const r = stressDie(1);
    return { r, total: r.botches ? 0 : base + r.value };
  };
  const rollInitiative = () => {
    const { r, total } = roll(t.initiative.total);
    push(`Certamen initiative: ${t.initiative.total} + ${describeStress(r)} = ${total}.`);
  };
  const attack = () => {
    const p = pawns(attackWith);
    const { r, total } = roll(t.attack[attackWith].total + 2 * p);
    const adv = total - opp.defense;
    const weak = t.weakening.total + Math.max(0, adv);
    const lost = adv > 0 ? certamenFatigue(weak, opp.resistance) : 0;
    push(
      `Certamen attack with ${artName(attackWith)}: ${t.attack[attackWith].total}${p ? ` + ${p} pawns of vis (+${2 * p})` : ''} + ${describeStress(r)} = ${total} vs Defense ${opp.defense}. ` +
        (r.botches ? 'Botch: the storyguide decides what goes wrong.' : adv > 0 ? `Attack Advantage ${adv}; Weakening ${weak} vs Resistance ${opp.resistance}: the opponent loses ${lost} Fatigue level${lost === 1 ? '' : 's'}.` : 'No damage (the defender wins ties).'),
    );
  };
  const defend = () => {
    const p = pawns(defendWith);
    const { r, total } = roll(t.defense[defendWith].total + 2 * p);
    const adv = opp.attack - total;
    const lost = adv > 0 ? certamenFatigue(opp.weakening + adv, t.resistance.total) : 0;
    push(
      `Certamen defense with ${artName(defendWith)}: ${t.defense[defendWith].total}${p ? ` + ${p} pawns of vis (+${2 * p})` : ''} + ${describeStress(r)} = ${total} vs Attack ${opp.attack}. ` +
        (r.botches ? 'Botch: the storyguide decides what goes wrong. ' : '') +
        (adv > 0 ? `Their Weakening ${opp.weakening} + Advantage ${adv} vs your Resistance ${t.resistance.total}: you lose ${lost} Fatigue level${lost === 1 ? '' : 's'}.` : 'You hold (the defender wins ties).'),
    );
    if (lost) {
      const over = Math.max(0, c.fatigueLost + lost - 5);
      update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + lost)));
      if (over) push(`Unconscious: ${over} more hour${over > 1 ? 's' : ''} for the levels beyond your Fatigue. You lose the certamen.`);
    }
  };
  const stat = (label: string, r: { total: number; parts: { label: string; value: number }[]; notes: string[] }) => (
    <div className="stat">
      <span className="v">
        <Total value={r.total} parts={r.parts} notes={r.notes} label={label} />
      </span>
      <span className="l">{label}</span>
    </div>
  );
  return (
    <Card title="Certamen">
      <div className="row">
        <Field label="Technique (the challenger picks)">
          <select value={tech} onChange={(e) => setTech(e.target.value as Technique)}>
            {TECHNIQUES.map((x) => (
              <option key={x} value={x}>
                {ART_NAMES[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Form (the defender picks)">
          <select value={form} onChange={(e) => setForm(e.target.value as Form)}>
            {FORMS.map((x) => (
              <option key={x} value={x}>
                {ART_NAMES[x]}
              </option>
            ))}
          </select>
        </Field>
        {stat('Initiative', t.initiative)}
        {stat(`Attack with ${ART_NAMES[tech]}`, t.attack.technique)}
        {stat(`Attack with ${ART_NAMES[form]}`, t.attack.form)}
        {stat(`Defense with ${ART_NAMES[tech]}`, t.defense.technique)}
        {stat(`Defense with ${ART_NAMES[form]}`, t.defense.form)}
        {stat('Weakening', t.weakening)}
        {stat('Resistance', t.resistance)}
      </div>
      <h4>A round</h4>
      <div className="row">
        <Field label="This round you attack with">
          <select value={attackWith} onChange={(e) => setAttackWith(e.target.value as CertamenArt)}>
            <option value="technique">{ART_NAMES[tech]} (defend with {ART_NAMES[form]})</option>
            <option value="form">{ART_NAMES[form]} (defend with {ART_NAMES[tech]})</option>
          </select>
        </Field>
        <Field label="Raw vis this round (+2 a pawn)" hint={`Attuned to the Art it adds to; at most your score in it (${visMax('technique')} ${tech}, ${visMax('form')} ${form})`}>
          <Stepper value={vis} min={0} max={Math.max(visMax('technique'), visMax('form'))} width={36} onChange={setVis} />
        </Field>
        <Field label="Opponent's Defense Total">
          <Stepper value={opp.defense} min={-20} max={99} width={40} onChange={(v) => setOpp({ ...opp, defense: v })} />
        </Field>
        <Field label="Opponent's Resistance">
          <Stepper value={opp.resistance} min={-10} max={60} width={40} onChange={(v) => setOpp({ ...opp, resistance: v })} />
        </Field>
        <Field label="Opponent's Attack Total">
          <Stepper value={opp.attack} min={-20} max={99} width={40} onChange={(v) => setOpp({ ...opp, attack: v })} />
        </Field>
        <Field label="Opponent's Weakening">
          <Stepper value={opp.weakening} min={-10} max={60} width={40} onChange={(v) => setOpp({ ...opp, weakening: v })} />
        </Field>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <button className="small" onClick={rollInitiative}>
          Roll initiative
        </button>
        <button className="small" onClick={attack}>
          Roll attack
        </button>
        <button className="small" onClick={defend} title="Adds the Fatigue levels you lose">
          Roll defense
        </button>
      </div>
      <p className="small muted" style={{ marginBottom: 0 }}>
        Each round, use one Art to attack and the other to defend; you may swap them between rounds. Every 5 points (or fraction) of Weakening over Resistance costs a Fatigue level,
        and Fatigue penalties count against Attack and Defense. Certamen causes no wounds. Win by knocking the opponent unconscious (you may then cast one spell of the duel&apos;s
        Arts through their Parma), by their surrender, or by their failed Concentration roll (DE, Certamen).
      </p>
    </Card>
  );
}

/** Which casting Virtues and Flaws the roller applies, and reminders for the ones it can't. */
function CastingRulesNote({ rules }: { rules: ReturnType<typeof castingRules> }) {
  const applied = [
    rules.unstructured && 'Unstructured Caster (Formulaic spells cast as Rituals)',
    rules.rigid && 'Rigid Magic (no Rituals)',
    rules.unpredictable && 'Unpredictable Magic (always a stress die, at least one botch die)',
    rules.vulnerable && `Vulnerable Casting (+${rules.vulnerable} Fatigue)`,
    rules.withstand && `Withstand Casting (−${rules.withstand} Fatigue, never below one)`,
    rules.ritualVisMultiplier !== 1 && 'Mercurian Magic (half the Ritual vis)',
    rules.wasterOfVis && 'Waster of Vis (a quarter of the vis lost)',
    rules.weakSpontaneous && 'Weak Spontaneous Magic',
    rules.difficultSpontaneous && 'Difficult Spontaneous Magic',
    rules.ceremonialSpontaneous && 'Ceremonial Spontaneous Magic',
    rules.diedne && 'Diedne Magic',
    rules.lifeLinked && 'Life-Linked Spontaneous Magic',
    rules.chaotic && 'Chaotic Magic',
  ].filter(Boolean);
  if (!applied.length && !rules.notes.length) return null;
  return (
    <div className="small">
      {applied.length > 0 && (
        <div>
          <b>Applied when you cast:</b> {applied.join('; ')}.
        </div>
      )}
      {rules.notes.map((n) => (
        <div key={n} className="muted">
          {n}
        </div>
      ))}
    </div>
  );
}
