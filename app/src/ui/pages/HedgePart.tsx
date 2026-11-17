// Game Table › Dice › Hedge magic (Hedge Magic, Revised Edition): the learned magicians. A charm
// cast from memory or read from a formulary, with Entreat the Powers against a hostile aura, Fatigue,
// Warping from botches and intervention after a double botch; a charta written in hours. The seasons of
// every hedge tradition (an amulet, charms invented or taught, a brew, a refining, a tattoo, rune
// scripts) are not here: they are on the Seasons page, in a character's season in full (HedgeSeasonCards).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HerbalismCard, hasHerbalism } from './HerbalismCard';
import { LEARNED_CHARMS } from '../../data/learnedCharms';
import { learnedArtName, type LearnedArts } from '../../data/hedgeLearned';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import {
  INTERVENTION_BOONS, INTERVENTION_PUNISHMENTS, amuletCharges, amuletItem, canCast, castingScore, charmBotchDice, charmDivisor, charmLanguage, charmOutcome, chartaTime, chartaWorks, entreatRealms,
  entreatTotal, formularySearch, horoscopeRoll, interventionAvoid, interventionFollows, inventGain, inventSeason, learnFromTeacher, learnedAura, learnedLabTotal, naturalMagicianOffset, readingCharm,
  type Horoscope,
} from '../../engine/learnedMagic';
import type { AuraState, Realm } from '../../engine/magic';
import type { Character, LearnedCharm } from '../../engine/types';
import { warpingScoreFromPoints } from '../../engine/xp';
import { Card, Field, Stepper, Total, signed } from '../kit';
import type { CharEditor } from '../character/useChar';
import { useSeasonWork } from '../seasonWork';
import { R } from '../routes';
import { CharmDesigner, LearnedCard, artPairs, hasLearnedMagic } from '../character/LearnedCard';
import { ELEMENTAL_ART_IDS } from '../../data/hedgeElemental';
import { elementalArts } from '../../engine/elementalMagic';
import { ElementalTraitsCard } from '../character/ElementalTraitsCard';
import { ElementalCard, RefiningCard } from './ElementalPart';
import { KitchenCard, WitchMoonCard, WitchPowerCard, WitchThingsCard } from './FolkWitchPart';
import { isFolkWitch, witchPowers } from '../../engine/folkWitch';
import { GruagachCastCard, GruagachSeasonCard, GruagachSheetCard, hasGruagach } from './GruagachPart';
import { NightwalkerCard, hasNightwalker } from './NightwalkerPart';
import { NattThelCard, VitkiCastCard, VitkiSeasonCard, VitkiSheetCard, hasVitki } from './VitkirPart';
import { gainWarping, nowOf } from '../../engine/warping';

const ELEMENTAL_IDS = [...ELEMENTAL_ART_IDS, 'type-summoning', 'type-controlling', 'type-divining', 'type-refining'];
/** Someone this page is for: a learned magician or an elementalist. */
export const hasHedgeMagic = (c: Character) => hasLearnedMagic(c) || hasHerbalism(c) || isFolkWitch(c) || hasGruagach(c) || hasNightwalker(c) || hasVitki(c) || c.virtues.some((v) => ELEMENTAL_IDS.includes(v.defId)) || c.abilities.some((a) => ELEMENTAL_IDS.includes(a.abilityId));

type CalledRealm = Exclude<Realm, 'None'>;
const REALMS: Realm[] = ['None', 'Magic', 'Faerie', 'Divine', 'Infernal'];

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

/** The realms called on, a stress die rolled for the entreaty, and the offset it gives against this aura. */
function useEntreaty(ed: CharEditor, aura: AuraState) {
  const [called, setCalled] = useState<CalledRealm[]>([]);
  const [roll, setRoll] = useState<{ offset: number; text: string; botch: boolean } | undefined>();
  const realms = ed.c ? entreatRealms(ed.c) : [];
  const penalty = learnedAura(aura).mod < 0;
  const node =
    realms.length > 0 && penalty ? (
      <div className="row small" role="group" aria-label="Entreat the Powers">
        <span>Entreat the powers of:</span>
        {realms.map((r) => (
          <label key={r} className="inline">
            <input type="checkbox" checked={called.includes(r)} onChange={(e) => ((setCalled(e.target.checked ? [...called, r] : called.filter((x) => x !== r))), setRoll(undefined))} /> {r}
          </label>
        ))}
        <button
          className="small"
          disabled={!called.length || !ed.d}
          onClick={() => {
            const r = stressDie(1 + called.length);
            const e = entreatTotal(ed.d!, called, aura, r.value);
            const botch = r.zero && r.botches > 0;
            setRoll({ offset: botch ? 0 : e.offset, botch, text: `Entreaty: stress die ${describeStress(r)} + ${e.parts.map((p) => `${p.label} ${p.value}`).join(' + ')}: ${botch ? 'a botch, the powers take offence' : e.text}` });
          }}
        >
          Roll the entreaty
        </button>
        {roll && <span className={roll.botch ? 'warn-text' : 'good-text'}>{roll.text}</span>}
        <span className="muted" style={{ flexBasis: '100%' }}>For a charm the powers are named aloud: no Quiet Magic or silent casting. On an amulet or charta their names are written.</span>
      </div>
    ) : null;
  return { called: roll ? called : [], offset: roll?.offset ?? 0, node, reset: () => setRoll(undefined) };
}

export default function HedgePart({ ed }: { ed: CharEditor }) {
  const { c, d, ctx } = ed;
  const [aura, setAura] = useState<AuraState>(ctx.aura ?? { realm: 'None', strength: 0 });
  if (!c || !d) return null;
  const pairs = artPairs(c, d);
  const a = learnedAura(aura);
  const learned = hasLearnedMagic(c);
  const elemental = elementalArts(c, d);
  const isElemental = elemental.techniques.length > 0 || elemental.forms.length > 0;
  // a nightwalker's and a herbalist's rolls take no aura: show its controls only to those whose magic does
  const usesAura = learned || isElemental || isFolkWitch(c) || hasGruagach(c) || hasVitki(c);
  const works = hedgeSeasonWorks(c, d);
  return (
    <>
      {usesAura && (
        <p className="small muted">
          Hedge magic is of the Magic realm: a Magic aura adds, others take away as for Hermetic magic ({signed(a.mod)} here
          {a.botch ? `, ${a.botch} more botch dice` : ''}).{learned ? ' A learned magician’s charms and years of training are kept on the sheet.' : ''}
          {isElemental ? ' An elementalist’s Elemental Traits are kept on the sheet.' : ''}
          {isFolkWitch(c) ? ' A folk witch’s apprenticeship is kept on the sheet; their potions and fetishes are here.' : ''}
        </p>
      )}
      {usesAura && (
        <div className="row">
          <Field label="Aura">
            <select value={aura.realm} onChange={(e) => setAura({ ...aura, realm: e.target.value as Realm })}>
              {REALMS.map((r) => (
                <option key={r} value={r}>{r === 'None' ? 'no aura' : r}</option>
              ))}
            </select>
          </Field>
          {aura.realm !== 'None' && (
            <Field label="Strength">
              <Stepper value={aura.strength} min={0} max={10} width={32} onChange={(v) => setAura({ ...aura, strength: v })} />
            </Field>
          )}
        </div>
      )}
      {works.length > 0 && ed.saga && (
        <p className="small">
          A season&apos;s work ({works.join(', ')}) is planned on <Link to={R.seasonsFor(ed.saga.id, c.id, 'table-plan')}>Game Table › Seasons, in {c.name ? `${c.name}’s` : 'their'} season in full ›</Link>
        </p>
      )}
      {learned && pairs.length === 0 && <p className="small warn-text">No Technique and Form of the learned magicians yet: take their Virtues on the sheet (a Gifted mathematicus has all six).</p>}
      {pairs.length > 0 && <CharmCard ed={ed} aura={aura} pairs={pairs} />}
      {pairs.length > 0 && <ChartaCard ed={ed} aura={aura} pairs={pairs} />}
      {learned && <LearnedCard ed={ed} atTable />}
      {hasHerbalism(c) && <HerbalismCard ed={ed} />}
      {isElemental && (!elemental.techniques.length || !elemental.forms.length) && (
        <p className="small warn-text">An elementalist needs a Technique and a Form: take their Virtues on the sheet.</p>
      )}
      {isElemental && elemental.forms.length > 0 && <ElementalCard ed={ed} aura={aura} />}
      {isElemental && <ElementalTraitsCard ed={ed} />}
      {isFolkWitch(c) && witchPowers(c, d).length === 0 && <p className="small warn-text">No folk witch powers yet: take their Virtues on the sheet (a Gifted folk witch has all seven).</p>}
      {isFolkWitch(c) && <WitchPowerCard ed={ed} aura={aura} />}
      {isFolkWitch(c) && <WitchThingsCard ed={ed} />}
      {isFolkWitch(c) && <WitchMoonCard ed={ed} />}
      {hasGruagach(c) && <GruagachCastCard ed={ed} aura={aura} />}
      {hasGruagach(c) && <GruagachSheetCard ed={ed} atTable />}
      {hasNightwalker(c) && <NightwalkerCard ed={ed} />}
      {hasVitki(c) && <VitkiCastCard ed={ed} aura={aura} />}
      {hasVitki(c) && <NattThelCard ed={ed} />}
      {hasVitki(c) && <VitkiSheetCard ed={ed} atTable />}
    </>
  );
}

/** The seasons of work a character's hedge magic offers, named as their cards are. */
export function hedgeSeasonWorks(c: Character, d: NonNullable<CharEditor['d']>): string[] {
  const elemental = elementalArts(c, d);
  return [
    ...(artPairs(c, d).length ? ['an amulet', 'a season of charms'] : []),
    ...(isFolkWitch(c) && witchPowers(c, d).length ? ['a season in the kitchen'] : []),
    ...(elemental.forms.length && elemental.techniques.some((t) => t.id === 'refining') ? ['a season of Refining'] : []),
    ...(hasGruagach(c) ? ['a gruagach’s season'] : []),
    ...(hasVitki(c) ? ['a vitki’s season'] : []),
  ];
}

/**
 * A character's seasons of hedge magic, on the Seasons page: each tradition's season card, worked in the
 * aura where the character lives (their covenant's), its vis from the purse or the covenant's stores.
 */
export function HedgeSeasonCards({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d } = ed;
  if (!c || !d) return null;
  const pairs = artPairs(c, d);
  const elemental = elementalArts(c, d);
  return (
    <>
      {pairs.length > 0 && <AmuletCard ed={ed} aura={aura} pairs={pairs} />}
      {pairs.length > 0 && <CharmSeasonCard ed={ed} aura={aura} pairs={pairs} />}
      {isFolkWitch(c) && <KitchenCard ed={ed} aura={aura} />}
      {elemental.forms.length > 0 && <RefiningCard ed={ed} aura={aura} />}
      {hasGruagach(c) && <GruagachSeasonCard ed={ed} aura={aura} />}
      {hasVitki(c) && <VitkiSeasonCard ed={ed} aura={aura} />}
    </>
  );
}

function CharmCard({ ed, aura, pairs }: { ed: CharEditor; aura: AuraState; pairs: LearnedArts[] }) {
  const { c, d, update } = ed;
  const known = (c?.learned?.charms ?? []).filter((x) => pairs.includes(x.tf as LearnedArts));
  const book = LEARNED_CHARMS.filter((x) => pairs.includes(x.tf as LearnedArts) && !x.general);
  const [fromText, setFromText] = useState(!known.length);
  const [ki, setKi] = useState(0);
  const [bi, setBi] = useState(0);
  const [stress, setStress] = useState(true);
  const [vis, setVis] = useState(0);
  const [formularies, setFormularies] = useState(1);
  const [lines, setLines] = useState<string[]>([]);
  const ent = useEntreaty(ed, aura);
  if (!c || !d) return null;
  const textCharm = book[Math.min(bi, book.length - 1)];
  const charm: Pick<LearnedCharm, 'name' | 'tf' | 'level' | 'range' | 'duration' | 'target' | 'text'> | undefined = fromText ? textCharm : known[Math.min(ki, known.length - 1)];
  const cannot = canCast(c, d, fromText);
  const tf = (charm?.tf ?? pairs[0]) as LearnedArts;
  const score = castingScore(c, d, tf, aura, ent.offset);
  const divisor = charmDivisor(c, fromText);
  const latin = charmLanguage(c, d);
  const reading = charm ? readingCharm(charm.level, latin) : undefined;
  const search = formularySearch(c, d, formularies);
  const pen = d.abilities.filter((x) => x.abilityId === 'penetration').reduce((m, x) => Math.max(m, x.total), 0);
  const cast = () => {
    if (!charm) return;
    const useStress = fromText || stress;
    const botchDice = charmBotchDice({ auraBotch: score.auraBotch, realms: ent.called.length, fromText, latin, vis });
    const r = useStress ? stressDie(botchDice) : simpleDie();
    const botches = r.kind === 'stress' && r.zero ? r.botches : 0;
    const sum = score.total + r.value + 2 * vis;
    const total = Math.round((sum / divisor) * 10) / 10;
    const outcome = botches ? 'fails' : charmOutcome(total, charm.level);
    const out = [
      `${charm.name} (${learnedArtName(tf)} ${charm.level}${fromText ? ', read from a text' : ''}): ${r.kind === 'stress' ? `stress die ${describeStress(r)}` : `simple die ${r.value}`} + Casting Score ${score.total}${vis ? ` + ${2 * vis} (${vis} vis)` : ''} = ${sum}${divisor > 1 ? ` ÷ ${divisor} = ${total}` : ''}.`,
    ];
    if (botches) out.push(`BOTCH ×${botches}: the charm goes wrong (for Fortunam, the opposite luck, or bad luck on the caster), and ${botches} Warping Point${botches === 1 ? '' : 's'}.`);
    else if (outcome === 'works') out.push(`It works. Penetration, as for Hermetic magic: ${total} − ${charm.level} + Penetration ${pen} = ${Math.floor(total - charm.level + pen)}.`);
    else if (outcome === 'fatigue') out.push(`It works, for a Fatigue level (the total is within 10 of the level). Penetration ${Math.max(0, Math.floor(total - charm.level + pen))}.`);
    else out.push('It fails, and costs a Fatigue level.');
    if (fromText && reading) out.push(`Reading it took ${reading.minutes} minutes.`);
    let avoid: string | undefined;
    const intervention = botches > 0 && interventionFollows(c, botches);
    if (intervention) {
      const ws = warpingScoreFromPoints(c.warpingPoints + botches);
      const iv = interventionAvoid(d, ws, botches, aura);
      const mine = stressDie(1);
      const theirs = stressDie(0, undefined, true);
      const ok = iv.total + mine.value > iv.against + theirs.value;
      avoid = `Intervention: a power of the ${aura.realm === 'None' ? 'Magic' : aura.realm} realm confronts the magician. Avoiding it: ${iv.parts.map((p) => `${p.label} ${p.value}`).join(' + ')} + ${describeStress(mine)} = ${iv.total + mine.value}, against Warping Score ${ws} + ${botches} gained + aura + ${theirs.value} = ${iv.against + theirs.value}: ${ok ? 'avoided.' : `not avoided. Appease it: Communication + stress die against Warping Score + stress die. ${INTERVENTION_BOONS} ${INTERVENTION_PUNISHMENTS}`}`;
    }
    update((x) => {
      if (outcome !== 'works') x.fatigueLost = Math.min(5, x.fatigueLost + 1);
      // Intervention is rolled above, where the points came
      if (botches) gainWarping(x, d, { points: botches, why: `from a botched ${charm.name}`, botch: true, handled: true, ...nowOf(ed.saga) });
    });
    if (avoid) out.push(avoid);
    ent.reset();
    setLines(out);
  };
  return (
    <Card title="Cast a charm" tour="hedge-charm" fold="hedge-charm" summary={charm ? `${charm.name}, ${charm.tf} ${charm.level}` : 'no charm'}>
      <div className="row">
        <Field label="Cast">
          <select value={fromText ? 'text' : 'known'} onChange={(e) => setFromText(e.target.value === 'text')}>
            <option value="known" disabled={!known.length}>a charm known</option>
            <option value="text">from a text (the book’s charms)</option>
          </select>
        </Field>
        {fromText ? (
          <Field label="Charm" hint={textCharm?.text}>
            <select value={bi} onChange={(e) => setBi(Number(e.target.value))} style={{ maxWidth: 360 }}>
              {book.map((x, i) => (
                <option key={x.name} value={i}>{x.name} ({x.tf} {x.level})</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Charm" hint={charm?.text}>
            <select value={ki} onChange={(e) => setKi(Number(e.target.value))} style={{ maxWidth: 360 }}>
              {known.map((x, i) => (
                <option key={x.uid} value={i}>{x.name} ({x.tf} {x.level})</option>
              ))}
            </select>
          </Field>
        )}
        {!fromText && (
          <label className="inline small" title="A simple die out of stress: no botch">
            <input type="checkbox" checked={stress} onChange={(e) => setStress(e.target.checked)} /> stress die
          </label>
        )}
        <Field label="Vis" hint="+2 a pawn, a botch die each, as for Hermetic magic. Take it from the purse by hand.">
          <Stepper value={vis} min={0} max={20} width={32} onChange={setVis} />
        </Field>
      </div>
      {fromText && (
        <div className="row small">
          <Field label="Formularies" hint="Each past the first makes the search harder">
            <Stepper value={formularies} min={1} max={10} width={32} onChange={setFormularies} />
          </Field>
          <span>
            Finding it: Intelligence + Latin {search.total} + die against {search.ease} (ten minutes, ten more for each point short). Reading: {reading?.minutes} minutes
            {reading?.botch ? `, ${reading.botch} more botch dice for Latin ${latin}` : ''}.
          </span>
        </div>
      )}
      {ent.node}
      {charm && (
        <p className="small">
          Casting Score <Total value={score.total} parts={score.parts} label="Casting Score" /> + die{divisor > 1 ? `, ÷ ${divisor}` : ''}, against level <b>{charm.level}</b> (R: {charm.range}, D: {charm.duration}, T:{' '}
          {charm.target}). Within 10 below, it works for a Fatigue level.
        </p>
      )}
      {cannot && <p className="small warn-text">{cannot}</p>}
      <button onClick={cast} disabled={!charm || !!cannot}>
        Cast the charm
      </button>
      <Lines lines={lines} />
    </Card>
  );
}

function HoroscopePick({ value, onChange, d }: { value: Horoscope; onChange: (h: Horoscope) => void; d: NonNullable<CharEditor['d']> }) {
  const daily = horoscopeRoll(d, 'daily');
  return (
    <Field label="Horoscope" hint={`Intelligence + Artes Liberales (astronomy) ${daily.total} + die: 6 for the day (an hour), 9 for the nativity (a day; the birth's place and time known)`}>
      <select value={value} onChange={(e) => onChange(e.target.value as Horoscope)}>
        <option value="none">none</option>
        <option value="daily">daily (+5)</option>
        <option value="nativity">nativity (+10)</option>
      </select>
    </Field>
  );
}

/** Shared design state for a device: its Arts and effect, from the book's examples or a guideline. */
function DeviceDesign({ pairs, value, onChange }: { pairs: LearnedArts[]; value?: LearnedCharm; onChange: (ch: LearnedCharm) => void }) {
  return (
    <>
      <CharmDesigner pairs={pairs} device live label="Use this design" onAdd={onChange} />
      {value ? (
        <p className="small">
          Effect: <b>{value.name}</b>, {value.tf} {value.level} (R: {value.range}, D: {value.duration}, T: {value.target}).
        </p>
      ) : (
        <p className="small muted">Choose a charm from the book, or design one from a guideline and use the design.</p>
      )}
    </>
  );
}

function ChartaCard({ ed, aura, pairs }: { ed: CharEditor; aura: AuraState; pairs: LearnedArts[] }) {
  const { c, d } = ed;
  const [effect, setEffect] = useState<LearnedCharm | undefined>();
  const [horoscope, setHoroscope] = useState<Horoscope>('daily');
  const [other, setOther] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const ent = useEntreaty(ed, aura);
  if (!c || !d) return null;
  const tf = (effect?.tf ?? pairs[0]) as LearnedArts;
  const lt = learnedLabTotal(c, d, tf, aura, { kind: 'charta', horoscope, target: effect?.target, other, offset: ent.offset });
  const write = () => {
    if (!effect) return;
    const out: string[] = [];
    if (horoscope !== 'none') {
      const h = horoscopeRoll(d, horoscope);
      const r = stressDie(1);
      const ok = !(r.zero && r.botches) && h.total + r.value >= h.ease;
      out.push(`The ${horoscope} horoscope: ${h.total} + ${describeStress(r)} against ${h.ease}: ${ok ? 'cast.' : 'it fails; try again (another hour, or another day).'}`);
      if (!ok) return setLines(out);
    }
    const works = chartaWorks(lt.total, effect.level);
    out.push(`Lab Total ${lt.total} ÷ 2 = ${lt.total / 2} against level ${effect.level}: ${works ? `written in ${chartaTime(effect.level, horoscope)}. Its charge is spent the moment it is finished, so its bearer must have it then.` : 'too weak to write.'}`);
    ent.reset();
    setLines(out);
  };
  return (
    <Card title="Write a charta" tour="hedge-charta" fold="hedge-charta" summary="One use, written in hours: half the Lab Total must reach its level">
      <DeviceDesign pairs={pairs} value={effect} onChange={setEffect} />
      <div className="row">
        <HoroscopePick value={horoscope} onChange={setHoroscope} d={d} />
        <Field label="Other bonuses" hint="A similar charm's magnitude, shape and material">
          <Stepper value={other} min={-20} max={30} width={36} onChange={setOther} />
        </Field>
      </div>
      {ent.node}
      <p className="small">
        Lab Total <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Charta Lab Total" />, half of it {lt.total / 2}
        {effect ? ` against level ${effect.level}` : ''}.
      </p>
      {lt.notes.map((n) => (
        <p key={n} className="small warn-text">{n}</p>
      ))}
      <button onClick={write} disabled={!effect || lt.notes.some((n) => /makes no|need/.test(n))}>
        Write the charta
      </button>
      <Lines lines={lines} />
    </Card>
  );
}

const TECHNIQUE_ID: Record<string, string> = { Tu: 'tueor', Su: 'succurro', Vu: 'vulnero' };

function AmuletCard({ ed, aura, pairs }: { ed: CharEditor; aura: AuraState; pairs: LearnedArts[] }) {
  const { c, d } = ed;
  const [effect, setEffect] = useState<LearnedCharm | undefined>();
  const [horoscope, setHoroscope] = useState<Horoscope>('nativity');
  const [other, setOther] = useState(0);
  const [bearer, setBearer] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const ent = useEntreaty(ed, aura);
  const s = useSeasonWork(ed);
  if (!c || !d) return null;
  const tf = (effect?.tf ?? pairs[0]) as LearnedArts;
  const natural = naturalMagicianOffset(c, d, aura, ent.offset);
  const lt = learnedLabTotal(c, d, tf, aura, { kind: 'amulet', horoscope, target: effect?.target, other, offset: ent.offset + natural });
  const charges = effect ? amuletCharges(lt.total, effect.level) : 0;
  const make = () => {
    if (!effect || !charges) return;
    const name = `Amulet: ${effect.name}${bearer.trim() ? ` (for ${bearer.trim()})` : ''}`;
    const text = `${name}: Lab Total ${lt.total} against level ${effect.level}, ${charges} charge${charges === 1 ? '' : 's'}.`;
    const out = s.work(`Learned magic: ${name}`, TECHNIQUE_ID[effect.tf.slice(0, 2)], (x) => {
      x.items.push(amuletItem(name, effect, charges, x.id));
      return { lines: [text, 'The amulet is on the sheet’s items.'], made: 'an amulet' };
    });
    ent.reset();
    setLines(out);
  };
  return (
    <Card title="Make an amulet" tour="hedge-amulet" fold="hedge-amulet" summary="A season: a charge for every 5 points, or part of 5, the Lab Total beats its level">
      <DeviceDesign pairs={pairs} value={effect} onChange={setEffect} />
      <div className="row">
        <HoroscopePick value={horoscope} onChange={setHoroscope} d={d} />
        <Field label="Other bonuses" hint="A similar charm's magnitude, shape and material">
          <Stepper value={other} min={-20} max={30} width={36} onChange={setOther} />
        </Field>
        <Field label="For whom" hint="An amulet works only for the one it was made for">
          <input value={bearer} onChange={(e) => setBearer(e.target.value)} placeholder="its bearer" style={{ width: 140 }} />
        </Field>
      </div>
      {ent.node}
      {natural > 0 && <p className="small">Natural Magician: Philosophiae offsets {natural} more of the aura.</p>}
      <p className="small">
        Lab Total <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Amulet Lab Total" />
        {effect ? `: ${charges ? `${charges} charge${charges === 1 ? '' : 's'}` : `it must beat level ${effect.level}`}.` : '.'}
      </p>
      {lt.notes.map((n) => (
        <p key={n} className="small warn-text">{n}</p>
      ))}
      <button onClick={make} disabled={!effect || !charges || s.busy || lt.notes.some((n) => /makes no|need/.test(n))} title={s.busy ? `${s.season} ${s.year} is already spent` : undefined}>
        Make the amulet (a season)
      </button>
      {s.busy && <span className="small muted"> {s.season} {s.year} is already spent.</span>}
      <Lines lines={lines} />
    </Card>
  );
}

function CharmSeasonCard({ ed, aura, pairs }: { ed: CharEditor; aura: AuraState; pairs: LearnedArts[] }) {
  const { c, d, update } = ed;
  const [mode, setMode] = useState<'invent' | 'teacher'>('invent');
  const [teacherLt, setTeacherLt] = useState(10);
  const [lessons, setLessons] = useState<LearnedCharm[]>([]);
  const [similar, setSimilar] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const s = useSeasonWork(ed);
  if (!c || !d) return null;
  const inv = c.learned?.inventing;
  const tf = (inv?.charm.tf ?? pairs[0]) as LearnedArts;
  const lt = learnedLabTotal(c, d, tf, aura, { kind: 'charm', similar });
  const cap = learnFromTeacher(teacherLt);
  const levels = lessons.reduce((t, x) => t + x.level, 0);
  const work = () =>
    setLines(
      s.work(`Learned magic: inventing ${inv?.charm.name ?? 'a charm'}`, TECHNIQUE_ID[tf.slice(0, 2)], (x) => {
        const msg = inventSeason(x, lt.total);
        return { lines: [msg], made: x.learned?.inventing ? undefined : `the charm ${inv?.charm.name ?? ''}`.trim() };
      }),
    );
  const learn = () => {
    setLines(
      s.work('Learned magic: charms from a teacher', undefined, (x) => {
        x.learned = { ...(x.learned ?? {}), charms: [...(x.learned?.charms ?? []), ...lessons.map((l) => ({ ...l, source: 'play' as const }))] };
        return { lines: [`Learned ${lessons.length} charm${lessons.length === 1 ? '' : 's'}: ${lessons.map((l) => l.name).join(', ')} (${levels} levels of ${cap}).`], made: 'charms learned' };
      }),
    );
    setLessons([]);
  };
  return (
    <Card title="A season of charms" tour="hedge-season" fold="hedge-season" summary={inv ? `Inventing ${inv.charm.name} (${inv.progress}/${inv.charm.level})` : 'Invent a charm, or learn charms from a teacher'}>
      <div className="row">
        <Field label="This season">
          <select value={mode} onChange={(e) => setMode(e.target.value as 'invent' | 'teacher')}>
            <option value="invent">inventing a charm</option>
            <option value="teacher">learning from a teacher</option>
          </select>
        </Field>
      </div>
      {mode === 'invent' ? (
        inv ? (
          <>
            <p className="small">
              Inventing <b>{inv.charm.name}</b> ({inv.charm.tf} {inv.charm.level}): {inv.progress} of {inv.charm.level} after {inv.seasons} season{inv.seasons === 1 ? '' : 's'}. Lab Total{' '}
              <Total value={lt.total} parts={lt.parts} label="Lab Total" /> × 5 − {inv.charm.level} = {inventGain(lt.total, inv.charm.level)} a season.
            </p>
            <div className="row">
              <Field label="A similar charm's magnitude">
                <Stepper value={similar} min={0} max={10} width={32} onChange={setSimilar} />
              </Field>
              <button onClick={work} disabled={s.busy}>
                Invent (a season)
              </button>
              <button className="small danger" onClick={() => update((x) => void (x.learned = { ...(x.learned ?? {}), inventing: undefined }))}>
                Give it up
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="small muted">Design the charm; each season adds the Lab Total × 5 less its level, and it is invented when that reaches its level (from a Laboratory Text, the same).</p>
            <CharmDesigner pairs={pairs} label="Begin inventing" onAdd={(ch) => update((x) => void (x.learned = { ...(x.learned ?? {}), inventing: { charm: ch, progress: 0, seasons: 0 } }))} />
          </>
        )
      ) : (
        <>
          <div className="row">
            <Field label="The teacher's Lab Total in these Arts" hint="A season teaches charms up to five times it in levels">
              <Stepper value={teacherLt} min={0} max={100} width={40} onChange={setTeacherLt} />
            </Field>
            <span className={levels > cap ? 'small warn-text' : 'small'}>
              {levels} of {cap} levels
            </span>
          </div>
          {lessons.map((l) => (
            <div key={l.uid} className="row small">
              {l.name} ({l.tf} {l.level})
              <button className="small ghost" aria-label="Remove" onClick={() => setLessons(lessons.filter((x) => x.uid !== l.uid))}>
                ✕
              </button>
            </div>
          ))}
          <CharmDesigner pairs={pairs} label="Add to the lessons" onAdd={(ch) => setLessons([...lessons, ch])} />
          <button onClick={learn} disabled={!lessons.length || levels > cap || s.busy}>
            Learn them (a season)
          </button>
        </>
      )}
      {s.busy && <p className="small muted">{s.season} {s.year} is already spent.</p>}
      <Lines lines={lines} />
    </Card>
  );
}
