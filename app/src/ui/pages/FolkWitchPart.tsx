// Folk witches (Hedge Magic, Revised Edition, Chapter Three). On Game Table › Dice › Hedge magic: a power
// used by incantation or fetish against its Ease Factor, a potion drunk, and the Witch Moon that each new
// Warping Score brings. On the Seasons page: a season in the kitchen (a brew of potions, a fetish, a curse
// woven, vis drawn from the aura, a longevity ritual, a familiar bound), its vis from the stores.

import { useState } from 'react';
import { WITCH_CURSES, WITCH_FETISHES, WITCH_HEALING, WITCH_POWERS } from '../../data/hedgeFolkWitch';
import { describeStress, stressDie } from '../../engine/dice';
import {
  familiarBinding, firstKitchenWork, healingCost, kitchenAbility, kitchenPowers, kitchenSeason, kitchenVisArts, kitchenWorks, potionAbility, witchCastingScore, witchMoonEnds,
  witchMoonOutcome, witchMoonWound, witchPenetration, witchPowers, witchWarping, type KitchenWork,
} from '../../engine/folkWitch';
import { artsText, putInto, spendFrom, visInPlaces } from '../../engine/vis';
import { bestFirst } from '../../engine/firstChoice';
import type { Art } from '../../data';
import type { AuraState } from '../../engine/magic';
import type { WitchThing } from '../../engine/types';
import { warpingScoreFromPoints } from '../../engine/xp';
import { nowOf, owedReaction } from '../../engine/warping';
import { settle } from '../../engine/seasonPlan';
import { FOLK_APPRENTICESHIP } from '../../engine/character/derive';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';
import type { CharEditor } from '../character/useChar';
import { useSeasonWork, useVisSource } from '../seasonWork';

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
  // the core book's Ease Factors for the powers the folk witch chapter sends there (DE: Dowsing, Second Sight, Shapeshifter)
  if (power === 'dowsing') {
    return [
      { label: 'Something common, like water, within 25 paces (9)', ease: 9, vis: 0 },
      { label: 'Something rarer or farther, like gold within 100 paces (15)', ease: 15, vis: 0 },
    ];
  }
  if (power === 'shapeshifter') return [{ label: 'Change shape, or change back (9)', ease: 9, vis: 0 }];
  if (power === 'second-sight') {
    return [1, 2, 3, 4, 5, 6].map((m) => ({ label: `Through an illusion of magnitude ${m}: Might ${5 * m - 4}–${5 * m}, or a level ${5 * m} spell (${6 + m})`, ease: 6 + m, vis: 0 }));
  }
  return [];
}

export function WitchPowerCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const powers = c && d ? witchPowers(c, d).filter((p) => p.methods.some((m) => m !== 'potion')) : [];
  // it opens on her best power (the card checklist)
  const [power, setPower] = useState(bestFirst(powers, (p) => p.score)[0]?.id ?? '');
  const [ei, setEi] = useState(0);
  const [ease, setEase] = useState(9);
  const [vis, setVis] = useState(0);
  const [fatigue, setFatigue] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d || !powers.length) return null;
  const p = powers.find((x) => x.id === power) ?? bestFirst(powers, (x) => x.score)[0];
  const def = WITCH_POWERS.find((x) => x.id === p.id)!;
  const effects = effectsOf(p.id);
  // the last choice of the list is a free Ease Factor
  const eff = ei < effects.length ? effects[ei] : undefined;
  const ef = eff?.ease ?? ease;
  const tot = witchCastingScore(c, d, p.id, aura, { vis, fatigue });
  const method = p.methods.filter((m) => m !== 'potion').join(' or ');
  const pen = score(d, 'penetration');
  const cast = () => {
    const r = stressDie(1 + tot.auraBotch);
    const botches = r.zero ? r.botches : 0;
    const total = tot.total + r.value;
    const out = [`${p.name} by ${method}: stress die ${describeStress(r)} + ${tot.total} = ${total}, against ${ef}${eff ? ` (${eff.label})` : ''}.`];
    if (botches) out.push(`BOTCH ×${botches}: the effect happens, uncontrolled and not as the witch meant; ${botches} Warping Point${botches === 1 ? '' : 's'}.`);
    else if (total >= ef) out.push(`It works. Penetration ${witchPenetration(total, ef, pen)} (the total + Penetration ${pen} − the Ease Factor).${eff?.vis ? ` It costs ${eff.vis} pawns of ${def.form} vis.` : ''}`);
    else out.push('It fails.');
    let moon: string | undefined;
    update((x) => {
      if (p.id === 'witch-flight' && p.methods.includes('fetish')) x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + 1 + botches);
      if (fatigue) x.fatigueLost = Math.min(5, x.fatigueLost + fatigue);
      if (botches) moon = witchWarping(x, botches, { ...nowOf(ed.saga), why: `from a botched ${p.name}` });
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
        {effects.length > 0 && (
          <Field label="Effect">
            <select value={ei} onChange={(e) => setEi(Number(e.target.value))}>
              {effects.map((x, i) => (
                <option key={x.label} value={i}>{x.label}</option>
              ))}
              <option value={effects.length}>another Ease Factor (the storyguide decides)</option>
            </select>
          </Field>
        )}
        {!eff && (
          <Field label="Ease Factor" hint="The storyguide sets it by how hard the thing is">
            <Stepper value={ease} min={0} max={30} width={36} onChange={setEase} />
          </Field>
        )}
        {d.hasGift && (
          <Field label="Vis" hint={`+1 a pawn of ${def.form} vis, up to the Ability + the effect's own cost. Take it from the purse by hand.`}>
            <Stepper value={vis} min={0} max={p.score + (eff?.vis ?? 0)} width={32} onChange={setVis} />
          </Field>
        )}
        {c.virtues.some((v) => v.defId === 'life-linked-folk-witch-magic') && (
          <Field label="Fatigue levels" hint="Life-Linked Magic: +5 each">
            <Stepper value={fatigue} min={0} max={5} width={32} onChange={setFatigue} />
          </Field>
        )}
      </div>
      {p.id === 'witch-cursing' && <p className="small muted">A curse by fetish is woven over a season in the kitchen (Game Table › Seasons), and rolled in Resolve when that season ends. This card rolls a curse cast otherwise.</p>}
      <p className="small">
        Casting Score <Total value={tot.total} parts={tot.parts} notes={tot.notes} label="Casting Score" /> + stress die against {ef}.
      </p>
      {tot.notes.map((n) => (
        <p key={n} className="small warn-text">{n}</p>
      ))}
      <button onClick={cast} disabled={!!c.folkWitch?.witchMoon}>
        Roll {p.name}
      </button>
      <Lines lines={lines} />
    </Card>
  );
}

const KITCHEN_TITLES: Record<KitchenWork, string> = { brew: 'a brew of potions', fetish: 'a fetish', curse: 'a curse woven', vis: 'vis from the aura', longevity: 'a longevity ritual', familiar: 'a familiar bound' };
const KITCHEN_BUTTONS: Record<KitchenWork, string> = { brew: 'Brew', fetish: 'Make the fetish', curse: 'Weave the curse', vis: 'Draw vis', longevity: 'Make the ritual', familiar: 'Bind the familiar' };
const KITCHEN_LABELS: Record<KitchenWork, string> = { brew: 'brew potions', fetish: 'make a fetish', curse: 'weave a curse', vis: 'draw vis from the aura', longevity: 'a longevity ritual', familiar: 'bind a familiar' };

/** A season in the kitchen, on the Seasons page: its vis from the purse or the covenant's stores, vis drawn put there. */
export function KitchenCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d } = ed;
  const sw = useSeasonWork(ed);
  const powers = c && d ? witchPowers(c, d) : [];
  // it opens on the first work she can do with the vis to hand, with her best power for it (the card checklist)
  const [first] = useState(() => (c && d ? firstKitchenWork(c, d, aura, (arts) => Math.max(...Object.values(visInPlaces(c, sw.cov, arts))), (id) => effectsOf(id)[0]?.vis ?? 0) : undefined));
  const [work, setWork] = useState<KitchenWork>(first?.work ?? 'brew');
  const [power, setPower] = useState(first?.power ?? '');
  const [ei, setEi] = useState(0);
  const [what, setWhat] = useState('');
  const [labText, setLabText] = useState(0);
  const [familiar, setFamiliar] = useState(0);
  const [size, setSize] = useState(-4);
  const [might, setMight] = useState(0);
  const [curse, setCurse] = useState(0);
  const [target, setTarget] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const works = c ? kitchenWorks(c, powers) : [];
  const w = works.includes(work) ? work : works[0];
  const pickFrom = w ? kitchenPowers(w, powers) : [];
  // the power chosen if it serves this work, else her best that does
  const p = pickFrom.find((x) => x.id === power) ?? bestFirst(pickFrom, (x) => x.score)[0];
  const visArts: Art[] = w ? kitchenVisArts(w, p?.id) : [];
  const src = useVisSource(c, sw.cov, visArts);
  const dest = useVisSource(c, sw.cov, ['Vi']);
  if (!c || !d || !powers.length || !w) return null;
  const fwmt = score(d, 'folk-witch-magic-theory');
  const effects = p ? effectsOf(p.id) : [];
  const eff = effects[Math.min(ei, effects.length - 1)];
  const k = WITCH_CURSES[curse];
  const ks = kitchenSeason(c, d, aura, w, p?.id, { have: src.have, effectVis: eff?.vis ?? 0, labText, familiar });
  const { lt, seasonLimit, brew: b, need, drawn } = ks;
  const curseScore = witchCastingScore(c, d, 'witch-cursing', aura);
  const plan = (): string => {
    switch (w) {
      case 'brew':
        return p ? `Brew Potency ${lt.total}: ${b.doses} of ${b.maxDoses} doses for ${b.vis} pawns (a pawn a dose${eff?.vis ? ` + ${eff.vis} for the effect` : ''}; a season uses up to ${seasonLimit}). Drunk: the potency + a stress die${['animal-ken', 'second-sight', 'dowsing', 'witch-flight'].includes(p.id) ? `, or the Ability at ${potionAbility(lt.total).score}` : ''}.` : '';
      case 'fetish':
        return p ? `${WITCH_FETISHES[p.id].name[0].toUpperCase()}${WITCH_FETISHES[p.id].name.slice(1)} for ${p.name}, for a pawn of ${WITCH_FETISHES[p.id].vis} vis.` : '';
      case 'curse':
        return `The curse of ${k.name} (${k.ease}): a fabric woven with an Arcane Connection to its target, penetrating all season. It is complete when the season ends, and is rolled then, in Resolve: Casting Score ${curseScore.total} + a stress die against ${k.ease}.`;
      case 'vis':
        return `${drawn} pawn${drawn === 1 ? '' : 's'} of Vim vis from the aura (a tenth of the Lab Total, rounded up).`;
      case 'longevity':
        return `A longevity ritual for herself alone: +${Math.ceil(lt.total / 5)} to Aging rolls (the Healing Lab Total ÷ 5, as for magi), for ${need} pawns of vis (a pawn for every five years of age).`;
      case 'familiar':
        return lt.total > familiarBinding(size, might) ? `The animal is bound (the Lab Total beats ${familiarBinding(size, might)}).` : `The Lab Total must beat ${familiarBinding(size, might)} (10 + Size + Might).`;
    }
  };
  // why the season cannot be worked as set, said beside the button
  const why =
    sw.busy ? `${sw.season} ${sw.year} is already spent.`
    : ks.blocked === 'no-dose' ? (src.have ? `Too little vis for a dose and the effect (${(eff?.vis ?? 0) + 1} pawns).` : `No ${artsText(visArts)} vis in ${src.place === 'purse' ? 'the purse' : 'the covenant’s stores'}.`)
    : ks.blocked === 'over-limit' ? `It needs ${need} pawns, more than the ${seasonLimit} a season in the kitchen allows (twice Folk Witch Magic Theory).`
    : w === 'curse' && !target.trim() ? 'Name the target, to whom she holds an Arcane Connection.'
    : need ? src.short(need) : undefined;
  const doSeason = () =>
    setLines(
      sw.work(`Witch's kitchen: ${KITCHEN_TITLES[w]}`, kitchenAbility(w, p?.id) ?? 'folk-witch-magic-theory', (x, cov, entryUid) => {
        const out = [`${plan()} Lab Total ${lt.total}.`];
        if (need) {
          const r = spendFrom(x, cov, src.place, src.arts, need);
          if (!r.ok) return { lines: [], refused: r.text };
          out.push(r.text);
        }
        if (drawn) out.push(putInto(x, cov, dest.place, 'Vi', drawn));
        const things = [...(x.folkWitch?.things ?? [])];
        let made: string | undefined;
        if (w === 'brew' && p && b.doses) {
          const name = `${p.name} potion${eff ? `: ${eff.label.replace(/ \(.*/, '')}` : what.trim() ? `: ${what.trim()}` : ''}`;
          things.push({ uid: uid(), kind: 'potion', power: p.id, name, potency: lt.total, doses: b.doses, effect: eff?.label ?? what.trim(), madeYear: sw.year });
          made = `${b.doses} dose${b.doses === 1 ? '' : 's'} of ${name}`;
        }
        if (w === 'fetish' && p) {
          things.push({ uid: uid(), kind: 'fetish', power: p.id, name: `${WITCH_FETISHES[p.id].name}${what.trim() ? ` (${what.trim()})` : ''}`, madeYear: sw.year });
          made = WITCH_FETISHES[p.id].name;
        }
        if (w === 'longevity') {
          if (Math.ceil(lt.total / 5) > (x.longevity?.lapsedYear ? 0 : (x.longevity?.bonus ?? 0))) x.longevity = { labTotal: lt.total, bonus: Math.ceil(lt.total / 5), extraVis: 0, createdYear: sw.year, createdBy: x.name };
          made = 'a longevity ritual';
        }
        if (w === 'familiar' && lt.total > familiarBinding(size, might)) made = 'a familiar bound';
        x.folkWitch = { ...(x.folkWitch ?? {}), things };
        if (w === 'curse') {
          x.folkWitch.curse = { name: k.name, ease: k.ease, target: target.trim(), score: curseScore.total, auraBotch: curseScore.auraBotch, penetration: score(d, 'penetration'), year: sw.year, season: sw.season, entryUid };
          out.push('Roll it in Resolve, at the top of the Seasons page, when the season ends.');
        }
        return { lines: out, made };
      }),
    );
  return (
    <Card title="A season in the kitchen" tour="witch-kitchen" fold="witch-kitchen" summary={c.folkWitch?.curse ? `A curse of ${c.folkWitch.curse.name} woven, rolled when the season ends` : `Folk Witch Magic Theory ${fwmt}`}>
      <div className="row">
        <Field label="Work">
          <select value={w} onChange={(e) => ((setWork(e.target.value as KitchenWork)), setEi(0))}>
            {works.map((key) => (
              <option key={key} value={key}>{KITCHEN_LABELS[key]}</option>
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
        {w === 'curse' && (
          <>
            <Field label="Curse" hint={k.text}>
              <select value={curse} onChange={(e) => setCurse(Number(e.target.value))}>
                {WITCH_CURSES.map((x, i) => (
                  <option key={x.name} value={i}>{x.name} ({x.ease})</option>
                ))}
              </select>
            </Field>
            <Field label="Its target" hint="She holds an Arcane Connection to them as the season begins">
              <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="whom" style={{ width: 140 }} />
            </Field>
          </>
        )}
      </div>
      <div className="row">
        {w === 'brew' && (
          <Field label="A potion Lab Text's level" hint="A literate witch brews as many more doses">
            <Stepper value={labText} min={0} max={20} width={32} onChange={setLabText} />
          </Field>
        )}
        {need > 0 || w === 'brew' ? src.node() : null}
        {w === 'vis' && dest.node(true)}
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
        Lab Total <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Kitchen Lab Total" />. {plan()} {src.line(need)}
      </p>
      <button onClick={doSeason} disabled={!!why}>
        {KITCHEN_BUTTONS[w]} (a season)
      </button>
      {why && <span className="small muted"> {why}</span>}
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
  const owed = owedReaction(c, 'witch-moon');
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
        // settled on the Seasons page's Resolve list too
        const t = owedReaction(x, 'witch-moon');
        if (t) settle(x, t.uid);
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
    <Card title="The Witch Moon" tour="witch-moon" fold="witch-moon" startOpen={!!moon} summary={moon ? `Under the Witch Moon, ${moon.months} month${moon.months === 1 ? '' : 's'} so far` : `Warping Score ${ws}`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Each time a folk witch&apos;s Warping Score rises, they suffer the Witch Moon in place of Twilight. For at least a month they lose their Supernatural Abilities (potions still work){wound ? ` and suffer a ${wound} Wound of fever` : ''}. At each month&apos;s end, Stamina − Warping Score + stress die against 6 ends it; a failure adds a Warping Point and another month.
      </p>
      {moon ? (
        <>
          {owed && <p className="small" style={{ marginTop: 0 }}>{owed.text}</p>}
          <button onClick={month}>Roll the month&apos;s end</button>
        </>
      ) : (
        <div className="row tight small">
          <span className="muted">It begins by itself when the toolkit adds Warping Points.</span>
          <button className="small ghost" title="When the Warping Score was raised by hand on the sheet" onClick={() => update((x) => void (x.folkWitch = { ...(x.folkWitch ?? {}), witchMoon: { months: 0, warpingScore: ws, pointsGained: 0 } }))}>
            Begin it by hand
          </button>
        </div>
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
        Adopted by a witch at about ten, a folk witch is apprenticed for about ten years: those years give 200 experience points for any Abilities in place of their later-life experience
        (Well-Trained adds 50, Poorly Trained takes 50). They must take at least one Flaw that limits their magic. Powers, potions and the kitchen are on the Game Table, Dice › Hedge magic.
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
