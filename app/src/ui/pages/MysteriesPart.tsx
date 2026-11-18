// Game Table › Dice › Mysteries: the rolls of The Mysteries (Revised Edition) made in play. Hermetic
// Astrology's favorable hour and Astrological Durations, Hermetic Divination and Dream
// Interpretation, the Great Elixir's test, an invoked daimon's casting, Hermetic Empowerment, a
// numerologist's rotes and intuiting a spirit's synthemata. Lab horoscopes, alchemy and the Lesser
// Elixir are worked on the character's Lab projects.

import { useState } from 'react';
import { ART_NAMES, FORMS, TECHNIQUES, type Form, type Technique } from '../../data';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import {
  ASTRO_UNITS, AUGURY_METHODS, NUMEROLOGY_BOOKS, astroDurationEase, divinationPenetration, divinationScore, divines, dreamReading, empowerment, grantMight,
  greatElixirTest, hasTableMystery, holds, invokedSpirit, liberalArt, nameHiding, pactPoints, roteTotals, scoreFor,
} from '../../engine/hermeticMysteries';
import { auraModifier } from '../../engine/magic';
import type { DerivedCharacter } from '../../engine/character/derive';
import type { Character } from '../../engine/types';
import { Card, Field, Stepper, signed } from '../kit';
import type { CharEditor } from '../character/useChar';

export { hasTableMystery };

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

const lores = (d: DerivedCharacter) =>
  ['magic-lore', 'faerie-lore', 'infernal-lore', 'dominion-lore'].map((id) => ({ id, name: id.replace('-lore', '').replace(/^./, (x) => x.toUpperCase()) + ' Lore', score: scoreFor(d, id) }));

export default function MysteriesPart({ ed }: { ed: CharEditor }) {
  const { c, d, ctx } = ed;
  if (!c || !d) return null;
  const aura = auraModifier('Magic', ctx.aura).mod;
  if (!hasTableMystery(c))
    return (
      <p className="small muted">
        {c.name || 'This character'} has none of the Mysteries rolled here: Celestial Magic, Divination & Augury, Hermetic Dream Interpreter, the Great Elixir, Hermetic Theurgy, Hermetic
        Empowerment, Hermetic Numerology or Hermetic Synthemata. Laboratory Horoscopes, alchemy and the Lesser Elixir are set on Lab projects.
      </p>
    );
  return (
    <>
      {holds(c, 'celestial-magic') && <CelestialCard d={d} />}
      {divines(c) && <DivinationCard c={c} d={d} aura={aura} />}
      {holds(c, 'hermetic-dream-interpreter') && <DreamCard d={d} aura={aura} />}
      {holds(c, 'the-great-elixir') && <GreatElixirCard ed={ed} />}
      {holds(c, 'hermetic-theurgy') && <TheurgyCard aura={aura} />}
      {holds(c, 'hermetic-empowerment') && <EmpowermentCard />}
      {holds(c, 'hermetic-numerology') && <NumerologyCard d={d} aura={aura} />}
      {holds(c, 'hermetic-synthemata') && <SynthemataCard d={d} aura={aura} />}
    </>
  );
}

function CelestialCard({ d }: { d: DerivedCharacter }) {
  const base = d.characteristics.Int.value + liberalArt(d, 'astronomy');
  const [want, setWant] = useState(3);
  const [unit, setUnit] = useState<(typeof ASTRO_UNITS)[number]['id']>('hours');
  const [n, setN] = useState(2);
  const [knows, setKnows] = useState(false);
  const [careful, setCareful] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const hour = () => {
    const r = stressDie(want);
    const t = base + r.value;
    const ok = !r.botches && t >= 3 * want;
    setLines([
      `Spellcasting Horoscope for +${want}: stress die ${describeStress(r)} + ${base} = ${t} against ${3 * want}. ${r.botches ? `BOTCH: the wrong factors, ${signed(-want)} to spells cast in the hour.` : ok ? `${signed(want)} to the Casting Score of spells cast in the favorable hour.` : 'The calculation was wrong: no benefit (the maga learns this when the hour begins).'}`,
    ]);
  };
  const ease = astroDurationEase(n, knows);
  const duration = () => {
    const r = careful ? simpleDie() : stressDie(1);
    const t = base + r.value;
    const botched = r.kind === 'stress' && r.botches > 0;
    const label = ASTRO_UNITS.find((u) => u.id === unit)!.label;
    setLines([
      `${n} ${label}: ${careful ? `simple die ${r.value}` : `stress die ${describeStress(r as ReturnType<typeof stressDie>)}`} + ${base} = ${t} against ${ease}. ${botched ? 'BOTCH: the spell botches.' : t >= ease ? 'Calculated right: the spell lasts exactly that.' : `Miscalculated: it ends up to ${ease - t} unit${ease - t === 1 ? '' : 's'} early or late (the storyguide decides; the magus learns when it ends).`}`,
    ]);
  };
  return (
    <Card title="Celestial Magic" tour="mystery-celestial" fold="mystery-celestial" summary={`Intelligence + Artes Liberales (astronomy) ${base}`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Laboratory Horoscopes are chosen on each Lab project. Here: a favorable hour for spellcasting (one hour a day), and spells that last a set astrological time.
      </p>
      <div className="row">
        <Field label="Favorable hour: bonus wanted" hint={`Stress die + ${base} against ${3 * want}; ${want} botch dice on a zero`}>
          <Stepper value={want} min={1} max={5} width={32} onChange={setWant} />
        </Field>
        <button onClick={hour}>Cast the horoscope</button>
      </div>
      <div className="row">
        <Field label="Astrological Duration">
          <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>
            {ASTRO_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How many" hint="A year at most">
          <Stepper value={n} min={1} max={ASTRO_UNITS.find((u) => u.id === unit)!.max} width={40} onChange={setN} />
        </Field>
        <label className="inline small" title="Sense the Hour (InVi 10) cast first: 3 off the Ease Factor">
          <input type="checkbox" checked={knows} onChange={(e) => setKnows(e.target.checked)} /> the hour measured
        </label>
        <label className="inline small" title="Extra time and measurements: a simple die instead of a stress die">
          <input type="checkbox" checked={careful} onChange={(e) => setCareful(e.target.checked)} /> taking time over it
        </label>
        <button onClick={duration}>Calculate (Ease Factor {ease})</button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

function DivinationCard({ c, d, aura }: { c: Character; d: DerivedCharacter; aura: number }) {
  const dreamsOnly = !holds(c, 'divination-and-augury');
  const score = divinationScore(d, dreamsOnly);
  const [kind, setKind] = useState<'casual' | 'ceremonial'>('ceremonial');
  const [ease, setEase] = useState(15);
  const [method, setMethod] = useState(dreamsOnly ? 'Dream Interpretation' : 'Scrying');
  const [ceremonial, setCeremonial] = useState(dreamsOnly ? 5 : 0);
  const [omen, setOmen] = useState(0);
  const [sympathy, setSympathy] = useState(0);
  const [device, setDevice] = useState(0);
  const [pen, setPen] = useState(scoreFor(d, 'penetration'));
  const [a, setA] = useState(aura);
  const [lines, setLines] = useState<string[]>([]);
  const ch = kind === 'casual' ? d.characteristics.Per.value : d.characteristics.Int.value;
  const bonus = kind === 'casual' ? omen : ceremonial + sympathy + device;
  const base = ch + score + a + bonus;
  const roll = () => {
    const r = stressDie(1);
    const t = base + r.value;
    const ok = !r.botches && t >= ease;
    const minutes = Math.ceil(ease / 5) * 15;
    setLines([
      `${kind === 'casual' ? 'Casual divination (a round)' : `Ceremonial divination (${minutes} minutes)`}: stress die ${describeStress(r)} + ${base} = ${t} against ${ease}. ${r.botches ? 'BOTCH: a false answer, believed.' : ok ? 'The divination answers truly.' : 'No clear answer.'}`,
      ...(ok ? [`Penetration, if it must reach a target: ${divinationPenetration(t, ease, pen)}.`] : []),
    ]);
  };
  const m = AUGURY_METHODS.find((x) => x.name === method);
  return (
    <Card title="Hermetic Divination" tour="mystery-divination" fold="mystery-divination" summary={`Divination ${score}; a question as a Momentary Intellego spell of its level`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        The Ease Factor is the level of the Intellego spell (any Form, Momentary, not a Ritual) that would answer the question. A held Arcane Connection counts as Touch; a Boundary target needs no Ritual.
      </p>
      <div className="row">
        <Field label="Kind">
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="casual">Casual: omens about you, a round (Perception)</option>
            <option value="ceremonial">Ceremonial: 15 minutes a magnitude (Intelligence)</option>
          </select>
        </Field>
        <Field label="Ease Factor">
          <Stepper value={ease} min={1} max={100} width={40} onChange={setEase} />
        </Field>
        <Field label="Aura">
          <Stepper value={a} min={-20} max={20} width={36} onChange={setA} />
        </Field>
      </div>
      {kind === 'casual' ? (
        <div className="row">
          <Field label="Fitting omens" hint="0 to 3 (rarely 4 or 5) when the signs suit the question, as clouds for the weather">
            <Stepper value={omen} min={0} max={5} width={32} onChange={setOmen} />
          </Field>
        </div>
      ) : (
        <div className="row">
          <Field label="Method" hint={m ? `${m.seen}: ${m.uses}` : undefined}>
            <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={dreamsOnly}>
              {AUGURY_METHODS.map((x) => (
                <option key={x.name} value={x.name}>
                  {x.name} ({x.seen})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ceremonial bonus" hint="1 to 5, as the method suits the question">
            <Stepper value={ceremonial} min={0} max={10} width={32} onChange={setCeremonial} />
          </Field>
          <Field label="Sympathetic bonus" hint="The Arcane Connection’s and sympathetic connections’ multipliers, added">
            <Stepper value={sympathy} min={0} max={20} width={32} onChange={setSympathy} />
          </Field>
          <Field label="Scrying device" hint="Its effect level / 10, rounded up">
            <Stepper value={device} min={0} max={20} width={32} onChange={setDevice} />
          </Field>
        </div>
      )}
      <div className="row">
        <Field label="Penetration bonus" hint="Penetration, as for a spell">
          <Stepper value={pen} min={0} max={50} width={36} onChange={setPen} />
        </Field>
        <span>
          {kind === 'casual' ? 'Perception' : 'Intelligence'} {ch} + Divination {score} + aura {a} + bonuses {bonus} = <b>{base}</b> + stress die
        </span>
        <button onClick={roll}>Divine</button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

function DreamCard({ d, aura }: { d: DerivedCharacter; aura: number }) {
  const score = divinationScore(d, true);
  const [lines, setLines] = useState<string[]>([]);
  const symbolic = () => {
    const r = stressDie(1);
    const t = d.characteristics.Int.value + score + r.value;
    setLines([`Symbolic interpretation: stress die ${describeStress(r)} + Intelligence + Divination ${d.characteristics.Int.value + score} = ${t}. ${r.botches ? 'BOTCH: a reading that misleads.' : dreamReading(t)} Talk it through with the storyguide as a symbolic tale.`]);
  };
  const calling = () => {
    const r = stressDie(1);
    const base = d.characteristics.Pre.value + score + aura;
    const t = base + r.value;
    setLines([`Dream Calling: stress die ${describeStress(r)} + Presence + Divination + aura ${base} = ${t} against 6. ${r.botches ? 'BOTCH.' : t >= 6 ? 'The sleeper will dream of the subject (Penetration as normal, if it is needed).' : 'The dream goes its own way.'}`]);
  };
  return (
    <Card title="Dream interpretation" tour="mystery-dreams" fold="mystery-dreams" summary="Symbolic reading, and calling a dream">
      <p className="small muted" style={{ marginTop: 0 }}>
        Divination by dream uses the Hermetic Divination card (ceremonial bonus +5): half an hour’s preparation, then sleep until waking; or an hour’s talk about another’s dream.
      </p>
      <div className="row">
        <button onClick={symbolic}>Read a dream’s symbols</button>
        <button onClick={calling}>Call a dream (touching the sleeper)</button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

function GreatElixirCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [level, setLevel] = useState(50);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const g = c.greatElixir ?? {};
  const elixir = c.longevity?.elixir ?? c.longevityLapsed?.elixir;
  const immortal = g.might !== undefined;
  const test = () => {
    const r = greatElixirTest(c, d);
    const out = [r.line];
    if (r.ok) {
      const might = grantMight(level);
      if (immortal && might <= (g.might ?? 0)) out.push(`The new Grant Might (${might}) is no stronger than the old (${g.might}): no change.`);
      else out.push(immortal ? `The magus’s Magic Might rises to ${might}.` : `The magus ceases to be human: an immortal being of Magic, Magic Might ${might}. It no longer ages (the toolkit stops its aging rolls) and Warping no longer touches it (strike off any the toolkit adds); experience fades unless bound into the talisman (Binding the Immortal Memory, 10 levels per experience point).`);
      update((x) => void (x.greatElixir = { attempts: 0, transformedAge: g.transformedAge ?? x.age, might: Math.max(might, g.might ?? 0) }));
    } else {
      out.push('Another dose of the Lesser Elixir and a new potion are needed; each attempt adds +1 to the next test (to Magic Theory).');
      update((x) => void (x.greatElixir = { ...(x.greatElixir ?? {}), attempts: (x.greatElixir?.attempts ?? 0) + 1 }));
    }
    setLines(out);
  };
  return (
    <Card title="The Great Elixir" tour="mystery-elixir" fold="mystery-elixir" summary={immortal ? `Immortal, Magic Might ${g.might}` : !elixir ? 'Not yet: it needs a Lesser Elixir' : `${g.attempts ?? 0} earlier attempt${g.attempts === 1 ? '' : 's'}`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Make the potion first as an invested device: the Lesser Elixir (taking spaces of the Longevity Ritual’s level / 10), Become a Being of Magic (MuCo(Vi) 50) and Grant Might. Then drink it and test.
        {immortal && ' A new potion can raise the Might; the Ease Factor stays at the age when the magus changed.'}
      </p>
      {/* the test is offered once there is an Elixir to drink; until then, one line says what comes first */}
      {elixir ? (
        <div className="row">
          <Field label="Grant Might level" hint={`Might = half (level − 20): ${grantMight(level)}`}>
            <Stepper value={level} min={25} max={200} step={5} width={40} onChange={setLevel} />
          </Field>
          <button onClick={test}>Drink and test the Elixir</button>
        </div>
      ) : (
        <p className="small">Not yet: it needs a Lesser Elixir. Devise one in the laboratory first, as a Lab project on the Seasons page.</p>
      )}
      <Lines lines={lines} />
    </Card>
  );
}

function TheurgyCard({ aura }: { aura: number }) {
  const [might, setMight] = useState(20);
  const [a, setA] = useState(aura);
  const [level, setLevel] = useState(25);
  const [added, setAdded] = useState(0);
  const [ofForm, setOfForm] = useState(false);
  const r = invokedSpirit(might, a, level, { addedLevels: added, ofForm });
  return (
    <Card title="Invoked daimons" tour="mystery-theurgy" fold="mystery-theurgy" summary="A daimon’s casting total, no die">
      <div className="row">
        <Field label="Daimon’s Might">
          <Stepper value={might} min={1} max={100} width={36} onChange={setMight} />
        </Field>
        <Field label="Aura where it casts">
          <Stepper value={a} min={-20} max={20} width={36} onChange={setA} />
        </Field>
        <Field label="Its spell-like power’s level">
          <Stepper value={level} min={1} max={100} width={36} onChange={setLevel} />
        </Field>
        {!ofForm && (
          <Field label="Levels added to the Invoke spell" hint="Each adds 2 to Penetration">
            <Stepper value={added} min={0} max={50} width={36} onChange={setAdded} />
          </Field>
        )}
        <label className="inline small" title="Invoke the Spirit of (Form): the casting total is half of Might + aura">
          <input type="checkbox" checked={ofForm} onChange={(e) => setOfForm(e.target.checked)} /> Spirit of (Form)
        </label>
      </div>
      <p className="small">
        Casting total <b>{r.total}</b>: {r.casts ? 'the power works' : `it fails (it needs ${level - 10})`}; Penetration {signed(r.penetration)}. Invoke the Pact: {pactPoints(level, might)} summoning point{pactPoints(level, might) === 1 ? '' : 's'} a casting of a level-{level} spell, until they reach its Might {might}.
      </p>
    </Card>
  );
}

function EmpowermentCard() {
  const [might, setMight] = useState(15);
  const [level, setLevel] = useState(30);
  const r = empowerment(might, level);
  return (
    <Card title="Hermetic Empowerment" tour="mystery-empowerment" fold="mystery-empowerment" summary="A bound spirit powers a Ritual effect">
      <div className="row">
        <Field label="The bound spirit’s Might">
          <Stepper value={might} min={1} max={100} width={36} onChange={setMight} />
        </Field>
        <Field label="Ritual effect level">
          <Stepper value={level} min={1} max={200} width={40} onChange={setLevel} />
        </Field>
      </div>
      <p className="small">{r.ok ? `It can power it, with no vis: the spirit loses ${r.drained} Might.` : `Its Might is too low: twice it (${might * 2}) must reach the level.`}</p>
    </Card>
  );
}

function NumerologyCard({ d, aura }: { d: DerivedCharacter; aura: number }) {
  const [tech, setTech] = useState<Technique>('In');
  const [form, setForm] = useState<Form>('Vi');
  const [book, setBook] = useState<(typeof NUMEROLOGY_BOOKS)[number]['id']>('lesser');
  const [level, setLevel] = useState(15);
  const b = NUMEROLOGY_BOOKS.find((x) => x.id === book)!.bonus;
  const r = roteTotals(d, d.arts[tech].score, d.arts[form].score, b, aura);
  return (
    <Card title="Numerologist’s rotes" tour="mystery-numerology" fold="mystery-numerology" summary={`Arithmetic ${r.arith}`}>
      <div className="row">
        <Field label="Technique">
          <select value={tech} onChange={(e) => setTech(e.target.value as Technique)}>
            {TECHNIQUES.map((t) => (
              <option key={t} value={t}>
                {ART_NAMES[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Form">
          <select value={form} onChange={(e) => setForm(e.target.value as Form)}>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Book">
          <select value={book} onChange={(e) => setBook(e.target.value as typeof book)}>
            {NUMEROLOGY_BOOKS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rote level">
          <Stepper value={level} min={1} max={100} width={36} onChange={setLevel} />
        </Field>
      </div>
      <p className="small">
        Casting score {r.casting} (Stamina + Arts + Arithmetic + book + aura {aura}); casting total <b>{r.total}</b>, no die: {r.total >= level ? 'cast' : `short of ${level}`}. Rotes up to level {r.maxLevel} can be devised (rote Lab Total {r.labTotal} / 5, rounded up{r.labArith < r.arith ? `; Arithmetic adds only ${r.labArith} to it, held to Magic Theory` : ''}).
      </p>
    </Card>
  );
}

function SynthemataCard({ d, aura }: { d: DerivedCharacter; aura: number }) {
  const ls = lores(d);
  const [lore, setLore] = useState(ls.sort((x, y) => y.score - x.score)[0].id);
  const [might, setMight] = useState(20);
  const [theirs, setTheirs] = useState(0);
  const [hiding, setHiding] = useState<number | undefined>();
  const [lines, setLines] = useState<string[]>([]);
  const hide = hiding ?? nameHiding(might);
  const ease = might + theirs + hide;
  const lv = ls.find((x) => x.id === lore)!;
  const base = d.characteristics.Per.value + lv.score + aura;
  const roll = () => {
    const r = stressDie(1);
    const t = base + r.value;
    setLines([`Intuit Synthemata: stress die ${describeStress(r)} + Perception + ${lv.name} + aura ${base} = ${t} against ${ease}. ${r.botches ? 'BOTCH.' : t >= ease ? 'The spirit’s synthemata are known.' : 'Not this time.'}`]);
  };
  return (
    <Card title="Synthemata" tour="mystery-synthemata" fold="mystery-synthemata" summary="Intuit a named spirit’s synthemata">
      <div className="row">
        <Field label="Lore">
          <select value={lore} onChange={(e) => setLore(e.target.value)}>
            {ls.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} {x.score}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Spirit’s Might">
          <Stepper value={might} min={1} max={100} width={36} onChange={setMight} />
        </Field>
        <Field label="Its aura">
          <Stepper value={theirs} min={0} max={20} width={32} onChange={setTheirs} />
        </Field>
        <Field label="Name Hiding" hint="Usually half its Might">
          <Stepper value={hide} min={0} max={100} width={36} onChange={setHiding} />
        </Field>
        <button onClick={roll}>Intuit (Ease Factor {ease})</button>
      </div>
      <p className="small muted">Researching them in the lab instead: Muto + Vim + Intelligence + {lv.name} + aura, the points each season the total − the spell level − Name Hiding.</p>
      <Lines lines={lines} />
    </Card>
  );
}
