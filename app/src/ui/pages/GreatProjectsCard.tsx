// Hermetic Projects at the Game Table, for whoever's possessions are shown: a great building's progress
// and its stress check, and a menagerie's breeding, birthing and young.

import { useState } from 'react';
import { tradeScore } from '../../engine/books';
import { describeStress, stressDie } from '../../engine/dice';
import {
  STRUCTURE_EVENTS, birthingIntervalHours, breedingForBest, breedingModifiers, breedingRoll, juvenileMight, masonProgress, seasonsToHeight, structureCheckModifiers, type BreedingInput,
} from '../../engine/greatProjects';
import { ITEM_QUALITY_MOD, itemDamageLevels, itemStressCheck, type ItemQuality } from '../../engine/workshop';
import { Card, Field, Stepper } from '../kit';
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

const QUALITIES: ItemQuality[] = ['shoddy', 'standard', 'superior', 'excellent'];

export function GreatProjectsCard({ ed }: { ed: CharEditor }) {
  const { c, d } = ed;
  const [magic, setMagic] = useState(0);
  const [height, setHeight] = useState(200);
  const [quality, setQuality] = useState<ItemQuality>('standard');
  const [repaired, setRepaired] = useState(false);
  const [event, setEvent] = useState(0);
  const [other, setOther] = useState(0);
  const [b, setB] = useState<BreedingInput>({ adequateDiet: true });
  const [handler, setHandler] = useState(true);
  const [size, setSize] = useState(0);
  const [adult, setAdult] = useState(20);
  const [years, setYears] = useState(5);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const score = (id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
  const mason = tradeScore(c, d, /mason/i);
  const p = masonProgress(mason, magic);
  const seasons = seasonsToHeight(height, p.feetPerSeason);
  const mods = structureCheckModifiers(mason, ITEM_QUALITY_MOD[quality], repaired, other);
  const input: BreedingInput = { ...b, animalHandling: handler ? score('animal-handling') : 0, magicLore: handler ? score('magic-lore') : 0 };
  const bm = breedingModifiers(input);
  const bTotal = bm.reduce((s, x) => s + x.value, 0);
  const set = (k: keyof BreedingInput, v: boolean | number) => setB((x) => ({ ...x, [k]: v }));
  const box = (k: keyof BreedingInput, label: string) => (
    <label key={k}>
      <input type="checkbox" checked={!!b[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
    </label>
  );
  return (
    <Card title="Great projects" tour="great-projects" fold="great-projects" summary="Building, stress checks, a menagerie">
      <p className="small muted" style={{ marginTop: 0 }}>
        From <i>Hermetic Projects</i>. The book&apos;s spells are in the spell list, and its enchantments can be added to an item with <b>+ From the books…</b>. Its ships and a great tower can be kept with the
        possessions above, where their damage is tracked.
      </p>
      <h4>Building</h4>
      <div className="row">
        <span className="small">
          {c.name || 'This character'}&apos;s Craft: Mason {mason}
        </span>
        <Field label="Craft magic" hint="Each kind of enchanted tool once; never more than the Craft score">
          <Stepper value={magic} min={0} max={30} width={32} onChange={setMagic} />
        </Field>
        <Field label="Height wanted (feet)">
          <Stepper value={height} min={20} max={10000} step={20} width={56} onChange={setHeight} />
        </Field>
      </div>
      <p className="small">
        {p.levelsPerSeason
          ? `${p.levelsPerSeason} level${p.levelsPerSeason === 1 ? '' : 's'} (${p.feetPerSeason} feet) a season, ${p.feetPerYear} feet a year, with enough assistants: ${seasons} season${seasons === 1 ? '' : 's'} to ${height} feet.`
          : 'A master mason needs Craft: Mason 5 or more (with craft magic) to raise a level of 20 feet a season.'}{' '}
        A Creo ritual builds instead: standard work on a Finesse success, shoddy on a failure.
      </p>
      <div className="row">
        <Field label="Quality of the weakest work">
          <select value={quality} onChange={(e) => setQuality(e.target.value as ItemQuality)}>
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q} ({itemDamageLevels(q, 10)} damage levels at Size 10+)
              </option>
            ))}
          </select>
        </Field>
        <Field label="What threatens it">
          <select value={event} onChange={(e) => setEvent(Number(e.target.value))}>
            {STRUCTURE_EVENTS.map((x, i) => (
              <option key={x} value={i}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Other modifiers" hint="The event's severity, protective enchantments">
          <Stepper value={other} min={-15} max={15} width={32} onChange={setOther} />
        </Field>
        <label className="small">
          <input type="checkbox" checked={repaired} onChange={(e) => setRepaired(e.target.checked)} /> Repaired before (−1)
        </label>
        <button onClick={() => setLines([`${STRUCTURE_EVENTS[event]}: ${itemStressCheck(mods).text} A lost damage level is a partial collapse; a master mason's season repairs one.`])}>
          Stress check ({mods >= 0 ? '+' : ''}{mods})
        </button>
      </div>
      <h4>A menagerie</h4>
      <div className="row small">
        {box('adequateDiet', 'Adequate diet (+1)')}
        {box('inadequateDiet', 'Inadequate diet (−2)')}
        {box('agreeableEnvironment', 'Agreeable environment (+1)')}
        {box('unsatisfactoryEnvironment', 'Unsatisfactory (−2)')}
        {box('herbivore', 'Herbivore (+1)')}
        {box('carnivore', 'Carnivore (−1)')}
        {box('tamed', 'Tamed (+3)')}
        {box('similarNearby', 'Similar animals nearby (+1)')}
        {box('onlyOfItsKind', 'Only one of its kind besides its mate (−3)')}
        <label>
          <input type="checkbox" checked={handler} onChange={(e) => setHandler(e.target.checked)} /> {c.name || 'This character'} leads the handlers (Animal Handling {score('animal-handling')}, Magic Lore {score('magic-lore')})
        </label>
      </div>
      <div className="row">
        <Field label="Ferocity (aggressive)">
          <Stepper value={b.ferocity ?? 0} min={0} max={6} width={28} onChange={(v) => set('ferocity', v)} />
        </Field>
        <Field label="Magic Might">
          <Stepper value={b.might ?? 0} min={0} max={75} width={32} onChange={(v) => set('might', v)} />
        </Field>
        <Field label="A fitting spell's magnitudes">
          <Stepper value={b.spellMagnitudes ?? 0} min={0} max={20} width={28} onChange={(v) => set('spellMagnitudes', v)} />
        </Field>
        <button onClick={() => setLines([`Breeding (${bm.map((x) => `${x.label} ${x.value > 0 ? '+' : ''}${x.value}`).join(', ') || 'no modifiers'}): ${breedingRoll(bTotal).text}`])}>
          Breeding roll ({bTotal >= 0 ? '+' : ''}{bTotal})
        </button>
        <button
          onClick={() => {
            const r = stressDie(1);
            setLines([`Breeding for the best: ${describeStress(r)}. ${breedingForBest(r)}`]);
          }}
        >
          Breeding for the best
        </button>
      </div>
      <div className="row">
        <Field label="The mother's Size">
          <Stepper value={size} min={-4} max={6} width={28} onChange={setSize} />
        </Field>
        <span className="small">
          Birthing: she is treated as having a Medium Wound, with a Recovery roll every {birthingIntervalHours(size)} hours (a handler adds Animal Handling). Hatchlings: Stamina + Survival +
          stress die against 9.
        </span>
      </div>
      <div className="row">
        <Field label="Adult Might">
          <Stepper value={adult} min={0} max={75} width={32} onChange={setAdult} />
        </Field>
        <Field label="Years to mature">
          <Stepper value={years} min={1} max={20} width={28} onChange={setYears} />
        </Field>
        <span className="small">Might while young: {juvenileMight(adult, years)}.</span>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}
