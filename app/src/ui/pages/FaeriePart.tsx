// Game Table › Dice › Faerie (Realms of Power: Faerie): a faerie wizard's rite (a Method and a Power,
// its level held to five times the applicable Sympathy Traits), the four Arts of the Ars Fabulosa
// against a faerie's Might, Faerie Calling after Warping, and a faerie's change of role through a
// creative human. Sympathy experience from a 1 or a botch, Fatigue, Confidence and Warping go on the sheet.

import { useState } from 'react';
import { BARGAIN_ARTS, FAERIE_GUIDELINES, FAERIE_METHODS, FAERIE_POWERS, type BargainArtId, type FaerieMethodId, type FaeriePowerId } from '../../data/faerie';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import {
  CREATIVITY_TABLE, bargainPenetration, bargainTotal, callingActEase, callingApplies, callingResolveEase, creativityCost, enchantmentEase, evocationVisLimit, faerieArts,
  faerieRank, riteLevel, riteMaxLevel, riteOptions, riteTotal, riteWarps, sympathyCap, sympathySum, sympathyXp,
} from '../../engine/faerieWizardry';
import { auraModifier } from '../../engine/magic';
import type { Character, SympathyTrait } from '../../engine/types';
import { Card, Field, Stepper, signed } from '../kit';
import type { CharEditor } from '../character/useChar';
import { SympathyCard } from '../character/SympathyCard';
import { uid } from '../../util/id';

const WIZARDRY = ['evocation', 'enchantment', 'empathy', 'beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe', 'faerie-summoning', 'bonding', 'captivating', 'dismissing'];

/** Someone this page is for: Sympathy Traits, faerie wizardry, or a faerie. */
export const hasFaerieTable = (c: Character) =>
  !!c.sympathy?.length || c.creature?.realm === 'Faerie' || c.abilities.some((a) => WIZARDRY.includes(a.abilityId)) || c.virtues.some((v) => ['faerie-sympathy', 'faerie-antipathy-flaw', 'faerie-background', ...WIZARDRY, 'summoning'].includes(v.defId));

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

/** Tick the Sympathy Traits that apply to this target or this faerie. */
function TraitPicker({ traits, value, onChange }: { traits: SympathyTrait[]; value: string[]; onChange: (v: string[]) => void }) {
  if (!traits.length) return <span className="small warn-text">No Sympathy Traits: add them on the sheet first.</span>;
  return (
    <div className="row small" role="group" aria-label="Applicable Sympathy Traits">
      <span>Applicable traits:</span>
      {traits.map((t) => (
        <label key={t.uid} className="inline">
          <input type="checkbox" checked={value.includes(t.uid)} onChange={(e) => onChange(e.target.checked ? [...value, t.uid] : value.filter((x) => x !== t.uid))} /> {t.trait || '…'} {signed(t.score)}
        </label>
      ))}
    </div>
  );
}

/** A 1 adds an experience point to each trait used, a botch takes one away (negative traits the same way: toward or away from 0). */
function useSympathyXp(ed: CharEditor) {
  return (used: string[], delta: number) =>
    ed.update((x) => {
      const cap = ed.d ? sympathyCap(x, ed.d) : Infinity;
      x.sympathy = x.sympathy?.map((t) => (used.includes(t.uid) ? sympathyXp(t, delta, cap) : t));
    });
}

export default function FaeriePart({ ed }: { ed: CharEditor }) {
  const { c, d, ctx } = ed;
  if (!c || !d) return null;
  const aura = auraModifier('Faerie', ctx.aura).mod;
  const arts = faerieArts(d);
  const bargains = BARGAIN_ARTS.filter((a) => d.abilities.some((x) => x.abilityId === (a.id === 'summoning' ? 'faerie-summoning' : a.id)));
  const rank = faerieRank(c.sympathy);
  return (
    <>
      <p className="small muted">
        Faerie Rank <b>{signed(rank)}</b>; a Faerie effect here takes the aura as {signed(aura)}. Sympathy Traits are kept on the sheet; a 1 on the stress die gives each trait used an
        experience point, and a botch takes one away.
      </p>
      <SympathyCard ed={ed} />
      {arts.methods.length > 0 && arts.powers.length > 0 && <RiteCard ed={ed} aura={aura} />}
      {bargains.length > 0 && <BargainCard ed={ed} aura={aura} rank={rank} arts={bargains.map((a) => a.id)} />}
      {callingApplies(c, d) && <CallingCard ed={ed} rank={rank} />}
      {c.creature?.realm === 'Faerie' && <CreativityCard ed={ed} />}
    </>
  );
}

function RiteCard({ ed, aura: aura0 }: { ed: CharEditor; aura: number }) {
  const { c, d, update } = ed;
  const arts = d ? faerieArts(d) : { methods: [], powers: [] };
  const [method, setMethod] = useState<FaerieMethodId>(arts.methods[0] ?? 'evocation');
  const [power, setPower] = useState<FaeriePowerId>(arts.powers[0] ?? 'beguile');
  const [used, setUsed] = useState<string[]>([]);
  const [gi, setGi] = useState(0);
  const [base, setBase] = useState(1);
  const [range, setRange] = useState('Touch');
  const [duration, setDuration] = useState('Momentary');
  const [target, setTarget] = useState('Individual');
  const [extra, setExtra] = useState(0);
  const [aura, setAura] = useState(aura0);
  const [vis, setVis] = useState(0);
  const [extended, setExtended] = useState(false);
  const [simple, setSimple] = useState(false);
  const [performance, setPerformance] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const xp = useSympathyXp(ed);
  if (!c || !d) return null;
  const traits = (c.sympathy ?? []).filter((t) => used.includes(t.uid));
  const guides = FAERIE_GUIDELINES.filter((x) => x.power === power);
  const guide = guides[Math.min(gi, guides.length - 1)];
  const gBase = guide?.general ? base : (guide?.level ?? 1);
  const opts = riteOptions();
  const lv = riteLevel(gBase, range, duration, target, extra);
  const ritual = lv.ritual || !!guide?.ritual;
  const max = riteMaxLevel(traits, method === 'empathy' && extended);
  const tot = riteTotal(d, method, power, aura);
  const m = FAERIE_METHODS.find((x) => x.id === method)!;
  const visMax = evocationVisLimit(d, power);
  const canVis = d.abilities.some((a) => a.abilityId === 'evocation');
  const negBotch = traits.filter((t) => t.score < 0).length;
  const enchEase = enchantmentEase(lv.level);
  const cast = () => {
    const useSimple = simple && d.abilities.some((a) => a.abilityId === 'enchantment');
    const r = useSimple ? simpleDie() : stressDie(1 + negBotch + (canVis ? vis : 0));
    const v = useSimple ? r.value : r.value;
    const total = tot.total + v + (canVis ? 2 * vis : 0);
    const botched = r.kind === 'stress' && r.botches > 0;
    const reached = Math.min(total, max);
    const works = !botched && reached >= lv.level;
    const out = [
      `${m.name}/${FAERIE_POWERS.find((x) => x.id === power)!.name}: ${useSimple ? `simple die ${r.value}` : `stress die ${describeStress(r as ReturnType<typeof stressDie>)}`} + ${tot.total}${canVis && vis ? ` + ${2 * vis} (${vis} vis)` : ''} = ${total}${total > max ? `, held to ${max} by the Sympathy Traits` : ''}, against level ${lv.level}${ritual ? ' (a ritual: 15 minutes a magnitude, no vis needed)' : ''}.`,
      botched ? `BOTCH (${(r as ReturnType<typeof stressDie>).botches}): the rite goes wrong${traits.length ? '; each trait used loses an experience point' : ''}, and a Warping Point for each botch die that came up 0.` : works ? `The rite works at level ${lv.level}.${riteWarps(lv.level) ? ' At level 30 or more it Warps its target.' : ''}` : `Too weak: it reaches ${reached}.`,
    ];
    const cost: string[] = [];
    update((x) => {
      if (method === 'evocation') {
        if (x.confidence.points > 0 && !botched) {
          x.confidence.points -= 1;
          cost.push('a Confidence Point spent');
        } else {
          x.warpingPoints += 1;
          cost.push('a Warping Point gained');
        }
      }
      if (method === 'empathy') {
        const levels = extended ? 2 : 1;
        x.fatigueLost = Math.min(5, x.fatigueLost + levels);
        cost.push(`${levels} Fatigue level${levels > 1 ? 's' : ''} spent`);
      }
      if (botched) x.warpingPoints += (r as ReturnType<typeof stressDie>).botches;
    });
    if (cost.length) out.push(`Method: ${cost.join(', ')}.`);
    if (!useSimple && r.kind === 'stress' && (r as ReturnType<typeof stressDie>).exploded && traits.length) {
      xp(used, 1);
      out.push('A 1 on the die: each trait used gains an experience point.');
    }
    if (botched && traits.length) xp(used, -1);
    setLines(out);
  };
  return (
    <Card title="Faerie rite" tour="faerie-rite" fold="faerie-rite" summary={`${m.name} with ${power}, up to level ${max}`}>
      <div className="row">
        <Field label="Method" hint={m.text}>
          <select value={method} onChange={(e) => setMethod(e.target.value as FaerieMethodId)}>
            {arts.methods.map((x) => (
              <option key={x} value={x}>
                {FAERIE_METHODS.find((y) => y.id === x)!.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Power" hint={FAERIE_POWERS.find((y) => y.id === power)?.text}>
          <select value={power} onChange={(e) => ((setPower(e.target.value as FaeriePowerId)), setGi(0))}>
            {arts.powers.map((x) => (
              <option key={x} value={x}>
                {FAERIE_POWERS.find((y) => y.id === x)!.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Faerie aura">
          <Stepper value={aura} min={-10} max={10} width={36} onChange={setAura} />
        </Field>
      </div>
      <TraitPicker traits={c.sympathy ?? []} value={used} onChange={setUsed} />
      <div className="row">
        <Field label="Guideline">
          <select value={gi} onChange={(e) => setGi(Number(e.target.value))} style={{ maxWidth: 420 }}>
            {guides.map((x, i) => (
              <option key={i} value={i}>
                {x.general ? 'General' : `Level ${x.level}`}
                {x.ritual ? ' (Ritual)' : ''}: {x.text.slice(0, 90)}
                {x.text.length > 90 ? '…' : ''}
              </option>
            ))}
          </select>
        </Field>
        {guide?.general && (
          <Field label="Base level">
            <Stepper value={base} min={1} max={100} width={36} onChange={setBase} />
          </Field>
        )}
      </div>
      <div className="row">
        {(
          [
            ['Range', range, setRange, opts.ranges],
            ['Duration', duration, setDuration, opts.durations],
            ['Target', target, setTarget, opts.targets],
          ] as const
        ).map(([label, val, set, list]) => (
          <Field key={label} label={label} hint={list.find((o) => o.name === val)?.note}>
            <select value={val} onChange={(e) => set(e.target.value)}>
              {list.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name} (+{o.magnitude}){o.ritual ? ', Ritual' : ''}
                </option>
              ))}
            </select>
          </Field>
        ))}
        <Field label="Other magnitudes" hint="Size, intricacy, more targets…">
          <Stepper value={extra} min={0} max={20} width={32} onChange={setExtra} />
        </Field>
      </div>
      <div className="row">
        {method === 'empathy' && (
          <label className="inline small" title="Another Fatigue level extends the rite: the Sympathy Traits count double for its highest level, and bonuses double">
            <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} /> extended (another Fatigue level)
          </label>
        )}
        {canVis && (
          <Field label="Vis" hint={`+2 a pawn, up to ${visMax}; a botch die each unless Faerie vis`}>
            <Stepper value={vis} min={0} max={visMax} width={32} onChange={setVis} />
          </Field>
        )}
        {d.abilities.some((a) => a.abilityId === 'enchantment') && (
          <label className="inline small" title="Enchantment: cast on a simple die, with no botch and no Sympathy experience">
            <input type="checkbox" checked={simple} onChange={(e) => setSimple(e.target.checked)} /> simple die (Enchantment)
          </label>
        )}
      </div>
      {method === 'enchantment' && (
        <div className="row small">
          <Field label="Performance total so far" hint={`An Ability roll (Sing, a weapon, Charm…) against ${enchEase}, 3 × the magnitude; rolls over several rounds add up`}>
            <Stepper value={performance} min={0} max={200} width={40} onChange={setPerformance} />
          </Field>
          <span className={performance >= enchEase ? 'good-text' : 'muted'}>{performance >= enchEase ? 'The target accepts the rite: cast it next round.' : `Needs ${enchEase}.`}</span>
        </div>
      )}
      <p className="small">
        Level <b>{lv.level}</b> {lv.design}
        {ritual ? ', a ritual' : ''}. Highest level these traits allow: <b>{max}</b> (5 × {sympathySum(traits)}{method === 'empathy' && extended ? ' × 2' : ''}). Casting:{' '}
        {tot.parts.map((p) => `${p.label} ${p.value}`).join(' + ')} = {tot.total} + die. Cost: {m.cost}.
      </p>
      {lv.level > max && <p className="small warn-text">Its level is above what the chosen traits allow: tick more traits, or a lower level.</p>}
      <div className="row">
        <button onClick={cast} disabled={!traits.length || lv.level > max || (method === 'enchantment' && performance < enchEase)}>
          Perform the rite
        </button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

function BargainCard({ ed, aura: aura0, rank, arts }: { ed: CharEditor; aura: number; rank: number; arts: BargainArtId[] }) {
  const { c, d, update } = ed;
  const [art, setArt] = useState<BargainArtId>(arts[0]);
  const [used, setUsed] = useState<string[]>([]);
  const [might, setMight] = useState(10);
  const [held, setHeld] = useState(false);
  const [aura, setAura] = useState(aura0);
  const [pen, setPen] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const xp = useSympathyXp(ed);
  if (!c || !d) return null;
  const traits = (c.sympathy ?? []).filter((t) => used.includes(t.uid));
  const max = 5 * sympathySum(traits);
  const best = Math.max(0, ...traits.map((t) => t.score));
  const tot = bargainTotal(d, art, rank, aura);
  const a = BARGAIN_ARTS.find((x) => x.id === art)!;
  const roll = () => {
    const r = stressDie(1 + traits.filter((t) => t.score < 0).length);
    const total = tot.total + r.value;
    const botched = r.botches > 0;
    const penTotal = bargainPenetration(total, might, pen, best, art !== 'summoning' && held);
    const beats = art === 'summoning' ? total >= might : total > might;
    const ok = !botched && beats && penTotal >= 0;
    const what: Record<BargainArtId, [string, string]> = {
      summoning: ['The faerie is held: it must attend and listen, and the summoner is warded against it.', 'A faerie appears, but is not held: it may ignore, attack or bewitch the summoner.'],
      bonding: ['The bond is made: choose its gift (traits and senses, its powers, an enchantment, or immunity to Warping and want).', 'No bond.'],
      captivating: ['Summoner and faerie exchange places.', 'Nothing happens.'],
      dismissing: ['The effect is undone, or the being released from its bargain.', 'It holds.'],
    };
    update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + 1)));
    setLines([
      `${a.name}: stress die ${describeStress(r)} + ${tot.total} = ${total} against Might ${might}; Penetration ${penTotal}${art !== 'summoning' && held ? ' (held by a Summoning: the effect counts as level 0)' : ''}. A Fatigue level spent.`,
      botched ? `BOTCH: ${art === 'summoning' ? 'a faerie still appears, hostile, or not the one called' : 'the Art goes wrong'}.` : ok ? what[art][0] : what[art][1],
      ...(art === 'summoning' ? ['When the summoning ends: a bargain made gives an appropriate trait an experience point; none made takes one away.'] : []),
    ]);
    if (botched && traits.length) xp(used, -1);
    else if (r.exploded && traits.length) xp(used, 1);
  };
  return (
    <Card title="Faerie bargaining (Ars Fabulosa)" tour="faerie-bargain" fold="faerie-bargain" summary={`${a.name}: ${tot.total} + die, Might up to ${max}`}>
      <div className="row">
        <Field label="Art" hint={a.text}>
          <select value={art} onChange={(e) => setArt(e.target.value as BargainArtId)}>
            {arts.map((x) => (
              <option key={x} value={x}>
                {BARGAIN_ARTS.find((y) => y.id === x)!.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="The faerie’s Might">
          <Stepper value={might} min={0} max={100} width={36} onChange={setMight} />
        </Field>
        <Field label="Faerie aura">
          <Stepper value={aura} min={-10} max={10} width={36} onChange={setAura} />
        </Field>
        <Field label="Penetration">
          <Stepper value={pen} min={0} max={30} width={32} onChange={setPen} />
        </Field>
        {art !== 'summoning' && (
          <label className="inline small" title="Held by a Summoning that penetrated: the effect counts as level 0 for Penetration">
            <input type="checkbox" checked={held} onChange={(e) => setHeld(e.target.checked)} /> held by a Summoning
          </label>
        )}
      </div>
      <TraitPicker traits={c.sympathy ?? []} value={used} onChange={setUsed} />
      <p className="small">
        {tot.parts.map((p) => `${p.label} ${p.value}`).join(' + ')} = {tot.total} + stress die. It can reach Might up to <b>{max}</b> (5 × the traits ticked); the best positive trait adds {best} to Penetration.
      </p>
      {might > max && <p className="small warn-text">This faerie’s Might is above what the traits ticked allow.</p>}
      <button onClick={roll} disabled={!traits.length || might > max}>
        Use {a.name}
      </button>
      <Lines lines={lines} />
    </Card>
  );
}

function CallingCard({ ed, rank }: { ed: CharEditor; rank: number }) {
  const { c, d, update } = ed;
  const [gained, setGained] = useState(2);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const awareness = d.abilities.find((a) => a.abilityId === 'awareness')?.total ?? 0;
  const concentration = d.abilities.find((a) => a.abilityId === 'concentration')?.total ?? 0;
  const per = d.characteristics.Per.value;
  const actEase = callingActEase(d.warpingScore, gained);
  const resolveEase = callingResolveEase(d.warpingScore, rank);
  const act = () => {
    const r = stressDie(1);
    const t = per + awareness + r.value;
    setLines([`Act while called: stress die ${describeStress(r)} + Perception + Awareness ${per + awareness} = ${t} against ${actEase}: ${t >= actEase && !r.botches ? 'the character can act' : 'dazed, as if Incapacitated'}.`]);
  };
  const resolve = () => {
    const r = stressDie(1);
    const t = per + concentration + r.value;
    const good = !r.botches && t > resolveEase;
    update((x) => {
      const list = [...(x.sympathy ?? [])];
      if (good) list.push({ uid: uid(), trait: 'new (from the Calling)', score: 1 });
      else list.push({ uid: uid(), trait: 'new (from the Calling)', score: -1 });
      x.sympathy = list;
    });
    setLines([
      `Resolve the Calling: stress die ${describeStress(r)} + Perception + Concentration ${per + concentration} = ${t} against ${resolveEase}.`,
      good ? 'A positive experience: a new Sympathy Trait +1 (or raise a fitting one by 1 on the card above instead).' : 'A negative experience: a new Sympathy Trait −1 (or lower a fitting one by 1 instead).',
      ...(good && rank >= 10 ? ['With Faerie Rank 10 or more, the character does not return: transformed, into Faerieland for ever.'] : []),
      ...(!good && rank <= -10 ? ['With Faerie Rank −10 or less, the character does not return: transformed, into Faerieland for ever.'] : []),
    ]);
  };
  return (
    <Card title="Faerie Calling" tour="faerie-calling" fold="faerie-calling" summary="When 2 or more Warping Points come at once">
      <p className="small muted" style={{ marginTop: 0 }}>
        The Faerie realm comes calling when 2 or more Warping Points are gained at once: a dream scene played out with the troupe, the character dazed until it is resolved. The scene&apos;s
        setting and conflict come from the Sympathy Traits; its mood from the Faerie Rank ({signed(rank)}).
      </p>
      <div className="row">
        <Field label="Warping Points just gained">
          <Stepper value={gained} min={2} max={20} width={32} onChange={setGained} />
        </Field>
        <button onClick={act}>Try to act (Ease Factor {actEase})</button>
        <button onClick={resolve}>Resolve the Calling (Ease Factor {resolveEase})</button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

function CreativityCard({ ed }: { ed: CharEditor }) {
  const { d } = ed;
  const [row, setRow] = useState(2);
  const [vis, setVis] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [total, setTotal] = useState(0);
  if (!d) return null;
  const might = d.might?.score ?? 0;
  const r = CREATIVITY_TABLE[row];
  const ease = r.ease - bonus;
  return (
    <Card title="Change through a creative human" tour="faerie-creativity" fold="faerie-creativity" summary={`${r.effect}: ${creativityCost(row, might, vis)} Pretense points`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A faerie changes its role only when a creative human reshapes its glamour (a song, a carving), using vitality stored as unspent Pretense points. The human rolls the Ability of the art
        used; a failure wastes the vitality, and that human can never change this faerie again.
      </p>
      <div className="row">
        <Field label="The change">
          <select value={row} onChange={(e) => setRow(Number(e.target.value))}>
            {CREATIVITY_TABLE.map((x, i) => (
              <option key={i} value={i}>
                {x.ease}: {x.effect}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Encased vis spent" hint="Each pawn takes 1 off the cost">
          <Stepper value={vis} min={0} max={50} width={32} onChange={setVis} />
        </Field>
        <Field label="Bonuses" hint="+3 for Inspirational or Free Expression; +3 if the change suits its local Reputation; 3 off the Ease Factor if it brings the faerie back to the local folklore">
          <Stepper value={bonus} min={0} max={9} width={32} onChange={setBonus} />
        </Field>
        <Field label="The human’s total">
          <Stepper value={total} min={0} max={60} width={36} onChange={setTotal} />
        </Field>
      </div>
      <p className="small">
        Ease Factor <b>{ease}</b>; vitality spent: {r.cost} + Might {might} − vis {vis} = <b>{creativityCost(row, might, vis)}</b> Pretense points.{' '}
        {total > 0 && (total >= ease ? <span className="good-text">The change takes.</span> : <span className="bad-text">The vitality is wasted.</span>)}
      </p>
    </Card>
  );
}
