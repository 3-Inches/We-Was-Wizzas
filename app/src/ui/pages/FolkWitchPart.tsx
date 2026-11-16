// Game Table › Dice › Hedge magic, for folk witches (Hedge Magic, Revised Edition, Chapter Three): a
// power used by incantation or fetish against its Ease Factor, a potion drunk, a season in the kitchen
// (a brew of potions, a fetish, a curse woven, vis drawn from the aura, a longevity ritual, a familiar
// bound), and the Witch Moon that each new Warping Score brings.

import { useState } from 'react';
import { WITCH_CURSES, WITCH_FETISHES, WITCH_HEALING, WITCH_POWERS } from '../../data/hedgeFolkWitch';
import { describeStress, stressDie } from '../../engine/dice';
import {
  brew, familiarBinding, healingCost, kitchenLabTotal, kitchenVisLimit, potionAbility, witchCastingScore, witchMoonEnds, witchMoonOutcome, witchMoonWound, witchPenetration, witchPowers,
  witchVisExtraction,
} from '../../engine/folkWitch';
import { applySeason, newSeasonEntry } from '../../engine/longterm';
import { seasonBusy } from '../../engine/time';
import type { AuraState } from '../../engine/magic';
import type { Character, WitchThing } from '../../engine/types';
import { warpingScoreFromPoints } from '../../engine/xp';
import { FOLK_APPRENTICESHIP } from '../../engine/character/derive';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';
import type { CharEditor } from '../character/useChar';

function Lines({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="log small" aria-live="polite">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

const score = (d: NonNullable<CharEditor['d']>, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);

/** The effects a power can be aimed at, with their Ease Factors and vis: the curses, the healing table, or one Ease Factor typed in. */
function effectsOf(power: string): { label: string; ease: number; vis: number }[] {
  if (power === 'witch-cursing') return WITCH_CURSES.map((c) => ({ label: `Curse of ${c.name} (${c.ease})`, ease: c.ease, vis: 0 }));
  if (power === 'witch-healing' || power === 'animal-healing') {
    return WITCH_HEALING.flatMap((r) => [
      { label: `${r.wound} (${r.ease}, ${r.woundVis} vis)`, ease: r.ease, vis: r.woundVis },
      { label: `Fatigue: ${r.fatigue} (${r.ease}, ${r.fatigueVis} vis)`, ease: r.ease, vis: r.fatigueVis },
    ]);
  }
  if (power === 'witch-flight') return [{ label: 'Take to the air (9)', ease: 9, vis: 0 }];
  return [];
}

/** After a botch's Warping Points: a new Warping Score brings the Witch Moon. */
function warp(x: Character, points: number): string | undefined {
  const before = warpingScoreFromPoints(x.warpingPoints);
  x.warpingPoints += points;
  const after = warpingScoreFromPoints(x.warpingPoints);
  if (after > before && !x.folkWitch?.witchMoon) {
    x.folkWitch = { ...(x.folkWitch ?? {}), witchMoon: { months: 0, warpingScore: after, pointsGained: 0 } };
    return `Warping Score ${after}: the Witch Moon begins (the Witch Moon card).`;
  }
  return undefined;
}

export function WitchPowerCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const powers = c && d ? witchPowers(c, d).filter((p) => p.methods.some((m) => m !== 'potion')) : [];
  const [power, setPower] = useState(powers[0]?.id ?? '');
  const [ei, setEi] = useState(0);
  const [ease, setEase] = useState(9);
  const [vis, setVis] = useState(0);
  const [fatigue, setFatigue] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d || !powers.length) return null;
  const p = powers.find((x) => x.id === power) ?? powers[0];
  const def = WITCH_POWERS.find((x) => x.id === p.id)!;
  const effects = effectsOf(p.id);
  const eff = effects[Math.min(ei, effects.length - 1)];
  const ef = eff?.ease ?? ease;
  const tot = witchCastingScore(c, d, p.id, aura, { vis, fatigue });
  const method = p.methods.filter((m) => m !== 'potion').join(' or ');
  const pen = score(d, 'penetration');
  const cast = () => {
    const r = stressDie(1 + tot.auraBotch);
    const botches = r.zero ? r.botches : 0;
    const total = tot.total + r.value;
    const out = [`${p.name} by ${method}: stress die ${describeStress(r)} + ${tot.total} = ${total}, against ${ef}${eff ? ` (${eff.label})` : ''}.`];
    if (botches) out.push(`BOTCH ×${botches}: the effect happens, uncontrolled and not as she meant; ${botches} Warping Point${botches === 1 ? '' : 's'}.`);
    else if (total >= ef) out.push(`It works. Penetration ${witchPenetration(total, ef, pen)} (the total + Penetration ${pen} − the Ease Factor).${eff?.vis ? ` It costs ${eff.vis} pawns of ${def.form} vis.` : ''}`);
    else out.push('It fails.');
    let moon: string | undefined;
    update((x) => {
      if (p.id === 'witch-flight' && p.methods.includes('fetish')) x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + 1 + botches);
      if (fatigue) x.fatigueLost = Math.min(5, x.fatigueLost + fatigue);
      if (botches) moon = warp(x, botches);
    });
    if (p.id === 'witch-flight') out.push(`Flying with a fetish costs a long-term Fatigue level${botches ? `, and ${botches} more for the botch` : ''}.`);
    if (moon) out.push(moon);
    setLines(out);
  };
  return (
    <Card title="Use a folk witch power" tour="witch-power" fold="witch-power" summary={`${p.name} by ${method}`}>
      <div className="row">
        <Field label="Power" hint={def.text}>
          <select value={p.id} onChange={(e) => ((setPower(e.target.value)), setEi(0))}>
            {powers.map((x) => (
              <option key={x.id} value={x.id}>{x.name} {x.score}</option>
            ))}
          </select>
        </Field>
        {effects.length > 0 ? (
          <Field label="Effect">
            <select value={ei} onChange={(e) => setEi(Number(e.target.value))}>
              {effects.map((x, i) => (
                <option key={x.label} value={i}>{x.label}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Ease Factor" hint="As the Ability's own rules (ArM5) set it">
            <Stepper value={ease} min={0} max={30} width={36} onChange={setEase} />
          </Field>
        )}
        {d.hasGift && (
          <Field label="Vis" hint={`+1 a pawn of ${def.form} vis, up to the Ability + the effect's own cost`}>
            <Stepper value={vis} min={0} max={p.score + (eff?.vis ?? 0)} width={32} onChange={setVis} />
          </Field>
        )}
        {c.virtues.some((v) => v.defId === 'life-linked-folk-witch-magic') && (
          <Field label="Fatigue levels" hint="Life-Linked Magic: +5 each">
            <Stepper value={fatigue} min={0} max={5} width={32} onChange={setFatigue} />
          </Field>
        )}
      </div>
      {p.id === 'witch-cursing' && <p className="small muted">A curse by fetish is woven over a season in the kitchen (the season card below); this rolls it at the season&apos;s end.</p>}
      <p className="small">
        Casting Score <Total value={tot.total} parts={tot.parts} notes={tot.notes} label="Casting Score" /> + stress die against {ef}.
      </p>
      {tot.notes.map((n) => (
        <p key={n} className="small warn-text">{n}</p>
      ))}
      <button onClick={cast} disabled={!!c.folkWitch?.witchMoon}>
        Use {p.name}
      </button>
      <Lines lines={lines} />
    </Card>
  );
}

type KitchenWork = 'brew' | 'fetish' | 'curse' | 'vis' | 'longevity' | 'familiar';

export function KitchenCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update, saga } = ed;
  const powers = c && d ? witchPowers(c, d) : [];
  const [work, setWork] = useState<KitchenWork>('brew');
  const [power, setPower] = useState(powers[0]?.id ?? '');
  const [ei, setEi] = useState(0);
  const [what, setWhat] = useState('');
  const [labText, setLabText] = useState(0);
  const [visOnHand, setVisOnHand] = useState(10);
  const [familiar, setFamiliar] = useState(0);
  const [size, setSize] = useState(-4);
  const [might, setMight] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d || !powers.length) return null;
  const year = saga?.currentYear ?? 1220;
  const season = saga?.currentSeason ?? 'Spring';
  const busy = seasonBusy(c, year, season);
  const fwmt = score(d, 'folk-witch-magic-theory');
  const brewable = powers.filter((p) => p.methods.includes('potion'));
  const fetishable = powers.filter((p) => WITCH_FETISHES[p.id]);
  const works: [KitchenWork, string][] = [
    ...(brewable.length && !c.virtues.some((v) => v.defId === 'primitive-tradition-flaw') ? ([['brew', 'brew potions']] as [KitchenWork, string][]) : []),
    ...(fetishable.length ? ([['fetish', 'make a fetish']] as [KitchenWork, string][]) : []),
    ...(powers.some((x) => x.id === 'witch-cursing') ? ([['curse', 'weave a curse']] as [KitchenWork, string][]) : []),
    ['vis', 'draw vis from the aura'],
    ...(powers.some((x) => x.id === 'witch-healing') ? ([['longevity', 'a longevity ritual']] as [KitchenWork, string][]) : []),
    ...(powers.some((x) => x.id === 'animal-ken') ? ([['familiar', 'bind a familiar']] as [KitchenWork, string][]) : []),
  ];
  const w = works.some(([k]) => k === work) ? work : works[0][0];
  const pickFrom = w === 'brew' ? brewable : w === 'fetish' ? fetishable : powers;
  const p = pickFrom.find((x) => x.id === power) ?? pickFrom[0];
  const effects = p ? effectsOf(p.id) : [];
  const eff = effects[Math.min(ei, effects.length - 1)];
  const abilityFor: Record<KitchenWork, string | undefined> = { brew: p?.id, fetish: undefined, curse: 'witch-cursing', vis: undefined, longevity: 'witch-healing', familiar: 'animal-ken' };
  const lt = kitchenLabTotal(c, d, abilityFor[w], aura, { potion: w === 'brew', familiar });
  const limit = Math.min(kitchenVisLimit(c, fwmt, w === 'brew'), visOnHand);
  const b = brew(fwmt, eff?.vis ?? 0, limit, { labText });
  const plan = (): string => {
    switch (w) {
      case 'brew':
        return p ? `Brew Potency ${lt.total}: ${b.doses} of ${b.maxDoses} doses for ${b.vis} pawns (a pawn a dose${eff?.vis ? ` + ${eff.vis} for the effect` : ''}; the season allows ${kitchenVisLimit(c, fwmt, true)}). Drunk: the potency + a stress die${['animal-ken', 'second-sight', 'dowsing', 'witch-flight'].includes(p.id) ? `, or the Ability at ${potionAbility(lt.total).score}` : ''}.` : '';
      case 'fetish':
        return p ? `${WITCH_FETISHES[p.id].name[0].toUpperCase()}${WITCH_FETISHES[p.id].name.slice(1)} for ${p.name}, for a pawn of ${WITCH_FETISHES[p.id].vis} vis.` : '';
      case 'curse':
        return `A curse fabric woven with an Arcane Connection to the target, penetrating all season; the curse is rolled at the season's end (the power card).`;
      case 'vis':
        return `${witchVisExtraction(lt.total)} pawns of Vim vis from the aura (a tenth of the Lab Total, rounded up).`;
      case 'longevity':
        return `A longevity ritual for herself alone: +${Math.ceil(lt.total / 5)} to Aging rolls (the Healing Lab Total ÷ 5, as for magi).`;
      case 'familiar':
        return lt.total > familiarBinding(size, might) ? `The animal is bound (the Lab Total beats ${familiarBinding(size, might)}).` : `The Lab Total must beat ${familiarBinding(size, might)} (10 + Size + Might).`;
    }
  };
  const doSeason = () => {
    const text = `${plan()} Lab Total ${lt.total}.`;
    update((x) => {
      const things = [...(x.folkWitch?.things ?? [])];
      if (w === 'brew' && p && b.doses) things.push({ uid: uid(), kind: 'potion', power: p.id, name: `${p.name} potion${eff ? `: ${eff.label.replace(/ \(.*/, '')}` : what.trim() ? `: ${what.trim()}` : ''}`, potency: lt.total, doses: b.doses, effect: eff?.label ?? what.trim(), madeYear: year });
      if (w === 'fetish' && p) things.push({ uid: uid(), kind: 'fetish', power: p.id, name: `${WITCH_FETISHES[p.id].name}${what.trim() ? ` (${what.trim()})` : ''}`, madeYear: year });
      if (w === 'longevity' && Math.ceil(lt.total / 5) > (x.longevity?.lapsedYear ? 0 : (x.longevity?.bonus ?? 0))) x.longevity = { labTotal: lt.total, bonus: Math.ceil(lt.total / 5), extraVis: 0, createdYear: year, createdBy: x.name };
      x.folkWitch = { ...(x.folkWitch ?? {}), things };
      const ab = abilityFor[w] ? x.abilities.find((a) => a.abilityId === abilityFor[w]) : x.abilities.find((a) => a.abilityId === 'folk-witch-magic-theory');
      const e = newSeasonEntry(year, season, 'other', `Witch's kitchen: ${({ brew: 'a brew of potions', fetish: 'a fetish', curse: 'a curse woven', vis: 'vis from the aura', longevity: 'a longevity ritual', familiar: 'a familiar bound' } as const)[w]}`, ab ? { [`ability:${ab.uid}`]: 2 } : {});
      e.notes = text;
      applySeason(x, e, 1);
      x.seasonLog.push(e);
    });
    setLines([text, `${season} ${year} logged. Take the vis from the stores by hand.`]);
  };
  return (
    <Card title="A season in the kitchen" tour="witch-kitchen" fold="witch-kitchen" summary={`Folk Witch Magic Theory ${fwmt}`}>
      <div className="row">
        <Field label="Work">
          <select value={w} onChange={(e) => ((setWork(e.target.value as KitchenWork)), setEi(0))}>
            {works.map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        {(w === 'brew' || w === 'fetish') && pickFrom.length > 0 && (
          <Field label="Power">
            <select value={p?.id} onChange={(e) => ((setPower(e.target.value)), setEi(0))}>
              {pickFrom.map((x) => (
                <option key={x.id} value={x.id}>{x.name} {x.score}</option>
              ))}
            </select>
          </Field>
        )}
        {w === 'brew' && effects.length > 0 && (
          <Field label="Effect">
            <select value={ei} onChange={(e) => setEi(Number(e.target.value))}>
              {effects.map((x, i) => (
                <option key={x.label} value={i}>{x.label}</option>
              ))}
            </select>
          </Field>
        )}
        {(w === 'brew' && !effects.length) || w === 'fetish' ? (
          <Field label={p?.id === 'shapeshifter' ? 'The animal' : 'Note'}>
            <input value={what} onChange={(e) => setWhat(e.target.value)} style={{ width: 140 }} />
          </Field>
        ) : null}
      </div>
      <div className="row">
        {w === 'brew' && (
          <>
            <Field label="A potion Lab Text's level" hint="A literate witch brews as many more doses">
              <Stepper value={labText} min={0} max={20} width={32} onChange={setLabText} />
            </Field>
            <Field label="Vis on hand">
              <Stepper value={visOnHand} min={0} max={100} width={36} onChange={setVisOnHand} />
            </Field>
          </>
        )}
        {w === 'familiar' && (
          <>
            <Field label="Its Size">
              <Stepper value={size} min={-10} max={5} width={32} onChange={setSize} />
            </Field>
            <Field label="Its Magic Might">
              <Stepper value={might} min={0} max={50} width={32} onChange={setMight} />
            </Field>
          </>
        )}
        <Field label="A familiar's help" hint="Its Intelligence + Folk Witch Magic Theory">
          <Stepper value={familiar} min={0} max={20} width={32} onChange={setFamiliar} />
        </Field>
      </div>
      <p className="small">
        Lab Total <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Kitchen Lab Total" />. {plan()}
      </p>
      <button onClick={doSeason} disabled={busy || (w === 'brew' && !b.doses)} title={busy ? `${season} ${year} is already spent` : undefined}>
        Work the season
      </button>
      {busy && <span className="small muted"> {season} {year} is already spent.</span>}
      <Lines lines={lines} />
    </Card>
  );
}

export function WitchThingsCard({ ed }: { ed: CharEditor }) {
  const { c, update } = ed;
  const [lines, setLines] = useState<string[]>([]);
  const things = c?.folkWitch?.things ?? [];
  if (!c || !things.length) return null;
  const drink = (t: WitchThing) => {
    const r = stressDie(1);
    const total = (t.potency ?? 0) + r.value;
    const pa = potionAbility(t.potency ?? 0);
    const out = [`${t.name}: Brew Potency ${t.potency} + stress die ${describeStress(r)} = ${total}${r.zero && r.botches ? ': BOTCH' : ''}. It must penetrate the drinker's Magic Resistance (no Penetration bonus).`];
    if (['animal-ken', 'second-sight'].includes(t.power)) out.push(`The drinker has the Ability at ${pa.score} for ${pa.days} days.`);
    if (['dowsing', 'witch-flight'].includes(t.power)) out.push(`The drinker has the Ability at ${pa.score} for one ${t.power === 'dowsing' ? 'search' : 'flight'}.`);
    if (t.power === 'shapeshifter') out.push(`The drinker takes the animal's form for ${pa.days} days.`);
    const heal = t.effect?.match(/\((\d+)/);
    if (heal && (t.power === 'witch-healing' || t.power === 'animal-healing')) {
      const h = healingCost(/Fatigue/.test(t.effect ?? '') ? 'fatigue' : 'wound', Number(heal[1]));
      out.push(total >= Number(heal[1]) ? `It heals a ${h?.what ?? 'wound'}, or the worst lesser one.` : 'Too weak to heal.');
    }
    update((x) => void (x.folkWitch = { ...(x.folkWitch ?? {}), things: (x.folkWitch?.things ?? []).flatMap((y) => (y.uid !== t.uid ? [y] : (y.doses ?? 0) > 1 ? [{ ...y, doses: (y.doses ?? 1) - 1 }] : [])) }));
    setLines(out);
  };
  return (
    <Card title="Potions and fetishes" tour="witch-things" fold="witch-things" summary={things.map((t) => (t.kind === 'potion' ? `${t.name} ×${t.doses}` : t.name)).join(' · ')}>
      {things.map((t) => (
        <div key={t.uid} className="row small">
          <b>{t.name}</b>
          {t.kind === 'potion' ? <span>potency {t.potency}, {t.doses} dose{t.doses === 1 ? '' : 's'}</span> : <span>a fetish</span>}
          {t.madeYear ? <span className="muted">made {t.madeYear}{c.virtues.some((v) => v.defId === 'unstable-magic-flaw') ? ', lasts a year and a day' : ''}</span> : null}
          {t.kind === 'potion' && (
            <button className="small" onClick={() => drink(t)}>
              Drink a dose
            </button>
          )}
          <button className="small ghost" aria-label="Remove" onClick={() => update((x) => void (x.folkWitch = { ...(x.folkWitch ?? {}), things: (x.folkWitch?.things ?? []).filter((y) => y.uid !== t.uid) }))}>
            ✕
          </button>
        </div>
      ))}
      <Lines lines={lines} />
    </Card>
  );
}

export function WitchMoonCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const moon = c.folkWitch?.witchMoon;
  const ws = warpingScoreFromPoints(c.warpingPoints);
  const wound = witchMoonWound(c);
  const month = () => {
    if (!moon) return;
    const r = stressDie(1);
    const base = witchMoonEnds(d, ws);
    const total = base + r.value;
    const months = moon.months + 1;
    const botches = r.zero ? r.botches : 0;
    const out = [`Month ${months} of the Witch Moon${wound ? `, a ${wound} Wound of fever (a disease)` : ''}: Stamina − Warping Score ${base} + stress die ${describeStress(r)} = ${total} against 6.`];
    let gained = moon.pointsGained;
    update((x) => {
      if (total >= 6 && !botches) {
        const o = witchMoonOutcome(months, moon.warpingScore, gained);
        out.push(`It passes. ${o.text}`);
        x.folkWitch = { ...(x.folkWitch ?? {}), witchMoon: undefined };
      } else {
        const add = 1 + botches;
        gained += add;
        x.warpingPoints += add;
        out.push(`It goes on another month: ${add} Warping Point${add === 1 ? '' : 's'}${botches ? ` (a botch: ${botches} more)` : ''}.`);
        x.folkWitch = { ...(x.folkWitch ?? {}), witchMoon: { ...moon, months, pointsGained: gained } };
      }
    });
    setLines(out);
  };
  return (
    <Card title="The Witch Moon" tour="witch-moon" fold="witch-moon" summary={moon ? `Under the Witch Moon, ${moon.months} month${moon.months === 1 ? '' : 's'} so far` : `Warping Score ${ws}`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Each time her Warping Score rises, a folk witch suffers the Witch Moon in place of Twilight: for at least a month she loses her Supernatural Abilities (potions still work){wound ? ` and suffers a ${wound} Wound of fever` : ''}. At each month&apos;s end, Stamina − Warping Score + stress die against 6 ends it; a failure adds a Warping Point and another month.
      </p>
      {moon ? (
        <button onClick={month}>Roll the month&apos;s end</button>
      ) : (
        <button className="small" onClick={() => update((x) => void (x.folkWitch = { ...(x.folkWitch ?? {}), witchMoon: { months: 0, warpingScore: ws, pointsGained: 0 } }))}>
          Begin the Witch Moon (a new Warping Score)
        </button>
      )}
      <Lines lines={lines} />
    </Card>
  );
}

/** On the sheet: the apprenticeship's years (200 experience points in their place) and the folk witch's things. */
export function FolkWitchSheetCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d || !c.virtues.some((v) => v.defId === 'folk-witch') || c.type === 'magus') return null;
  const budget = d.budgets.find((b) => b.id === FOLK_APPRENTICESHIP);
  return (
    <Card title="Folk witch" tour="folk-witch-card" fold="folk-witch-card" summary={budget ? `${budget.spent} of ${budget.total} apprenticeship experience spent` : 'A folk witch'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Adopted by a witch at about ten, she is apprenticed for about ten years: those years give 200 experience points for any Abilities in place of their later-life experience
        (Well-Trained adds 50, Poorly Trained takes 50). She must take at least one Flaw that limits her magic. Powers, potions and the kitchen are on the Game Table, Dice › Hedge magic.
      </p>
      <div className="row">
        <Field label="Years of apprenticeship">
          <Stepper value={c.folkWitch?.apprenticeYears ?? 10} min={0} max={Math.max(0, c.age - 5)} width={36} onChange={(v) => update((x) => void (x.folkWitch = { ...(x.folkWitch ?? {}), apprenticeYears: v }))} />
        </Field>
        {budget && <span className="small">{budget.spent} of {budget.total} experience spent.</span>}
      </div>
    </Card>
  );
}
