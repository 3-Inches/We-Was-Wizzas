// Hermetic Projects on the covenant: its great buildings (each one's height, the quality of its work and
// the damage it has taken, with the stress check an event calls for), and a menagerie's breeding,
// birthing and young. A mason's season of building or repairs is worked on the Seasons page
// (MasonSeasonCard), and changes the record here.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bestArtisan } from '../../engine/books';
import { deriveCharacter } from '../../engine/character/derive';
import { describeStress, stressDie } from '../../engine/dice';
import {
  STRUCTURE_EVENTS, birthingIntervalHours, breedingForBest, breedingModifiers, breedingRoll, buildingCheckModifiers, buildingDamageLevels, buildingLevelsLeft, buildingStressCheck, juvenileMight, type BreedingInput, type BuildQuality,
} from '../../engine/greatProjects';
import type { Covenant, GreatBuilding } from '../../engine/types';
import { useGameData, useSaga, useSagaCharacters } from '../../store/hooks';
import { uid } from '../../util/id';
import { Card, Confirm, Field, Stepper } from '../kit';
import { R } from '../routes';

const QUALITIES: BuildQuality[] = ['shoddy', 'standard', 'superior', 'excellent'];
const MASON = /mason/i;

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

/** The covenant's members, with their derived sheets. */
function useMembers(cov: Covenant) {
  const saga = useSaga(cov.sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(cov.sagaId);
  return useMemo(() => (saga ? chars.filter((m) => cov.memberIds.includes(m.id)).map((m) => ({ c: m, d: deriveCharacter(m, data, saga.houseRules) })) : []), [saga, chars, cov.memberIds, data]);
}

/** A one-line account of a building, for summaries. */
export const buildingLine = (b: GreatBuilding) => `${b.name}: ${b.height} feet, ${buildingLevelsLeft(b)} of ${buildingDamageLevels(b)} damage levels`;

export function GreatBuildingsCard({ cov, update }: { cov: Covenant; update: (fn: (c: Covenant) => void) => void }) {
  const saga = useSaga(cov.sagaId);
  const members = useMembers(cov);
  const [which, setWhich] = useState('');
  const [event, setEvent] = useState(0);
  const [other, setOther] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const buildings = cov.buildings ?? [];
  const mason = bestArtisan(cov, members, MASON);
  const craft = mason?.score ?? 0;
  const b = buildings.find((x) => x.uid === which) ?? buildings[0];
  const set = (id: string, fn: (x: GreatBuilding) => void) => update((c) => void (c.buildings ?? []).filter((x) => x.uid === id).forEach(fn));
  const add = () =>
    update((c) => {
      c.buildings = [...(c.buildings ?? []), { uid: uid(), name: buildings.length ? `Building ${buildings.length + 1}` : 'The great tower', height: 0, weakest: 'standard', latest: 'standard', damage: 0 }];
    });
  const check = () => {
    if (!b) return;
    const r = buildingStressCheck(b, craft, other);
    update((c) => {
      c.buildings = (c.buildings ?? []).map((x) => (x.uid === b.uid ? r.building : x));
      if (r.lost) c.log.push({ uid: uid(), year: saga?.currentYear ?? 1220, season: saga?.currentSeason, text: `${b.name}: ${STRUCTURE_EVENTS[event].toLowerCase()}, ${r.lost} damage level${r.lost > 1 ? 's' : ''} lost.` });
    });
    setLines([`${b.name}, ${STRUCTURE_EVENTS[event].toLowerCase()}: ${r.text}${r.lost ? ' Recorded on the covenant.' : ''}`]);
  };
  const mods = b ? buildingCheckModifiers(b, craft, other) : 0;
  return (
    <Card
      title="Great buildings"
      tour="great-projects"
      fold="great-buildings"
      summary={buildings.length ? buildings.map(buildingLine).join(' · ') : 'None yet: a tower or a hall raised season by season (Hermetic Projects).'}
    >
      <p className="small muted" style={{ marginTop: 0 }}>
        A building the covenant raises over years, from <i>Hermetic Projects</i>. A member with Craft: Mason spends <b>Build (a season)</b> or <b>Repair (a season)</b> on{' '}
        <Link to={R.seasons(cov.sagaId)}>Seasons ›</Link>, which changes the record here. A Creo ritual&apos;s levels are added by hand.
      </p>
      {buildings.map((x) => (
        <div key={x.uid} className="list-row" style={{ flexWrap: 'wrap', gap: 6 }}>
          <Field label="Name">
            <input value={x.name} onChange={(e) => set(x.uid, (y) => void (y.name = e.target.value))} style={{ width: 150 }} />
          </Field>
          <Field label="Height (feet)">
            <Stepper value={x.height} min={0} max={20000} step={20} width={56} onChange={(v) => set(x.uid, (y) => void (y.height = v))} />
          </Field>
          <Field label="Poorest work" hint="Sets its damage levels">
            <select value={x.weakest} onChange={(e) => set(x.uid, (y) => void (y.weakest = e.target.value as BuildQuality))}>
              {QUALITIES.map((q) => (
                <option key={q} value={q}>{q} ({buildingDamageLevels({ weakest: q })})</option>
              ))}
            </select>
          </Field>
          <Field label="Latest work" hint="Sets the stress check's modifier">
            <select value={x.latest} onChange={(e) => set(x.uid, (y) => void (y.latest = e.target.value as BuildQuality))}>
              {QUALITIES.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </Field>
          <Field label="Damage levels lost" hint={`${buildingLevelsLeft(x)} of ${buildingDamageLevels(x)} left`}>
            <Stepper value={x.damage} min={0} max={buildingDamageLevels(x)} width={34} onChange={(v) => set(x.uid, (y) => void (y.damage = v))} />
          </Field>
          <Field label="Enchanted tools" hint="Each +1 to Craft: Mason for the pace of work, up to the score">
            <Stepper value={x.tools ?? 0} min={0} max={30} width={34} onChange={(v) => set(x.uid, (y) => void (y.tools = v))} />
          </Field>
          <label className="small">
            <input type="checkbox" checked={!!x.repaired} onChange={(e) => set(x.uid, (y) => void (y.repaired = e.target.checked))} /> Repaired before
          </label>
          <Confirm className="small ghost" danger message={`Remove ${x.name || 'this building'} from the covenant's records?`} onYes={() => update((c) => void (c.buildings = (c.buildings ?? []).filter((y) => y.uid !== x.uid)))} label="✕" />
        </div>
      ))}
      <button className="small" onClick={add}>
        + Add a building
      </button>
      {b && (
        <>
          <p className="small">
            Master mason: {mason ? `${mason.name}, Craft: Mason ${craft}` : 'none among the members or specialists (Craft: Mason 0)'}. When an event threatens the building, roll a stress die + Craft: Mason + the latest
            work&apos;s quality against 15. A lost damage level is a partial collapse.
          </p>
          <div className="row">
            {buildings.length > 1 && (
              <Field label="Building">
                <select value={b.uid} onChange={(e) => setWhich(e.target.value)}>
                  {buildings.map((x) => (
                    <option key={x.uid} value={x.uid}>{x.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="What threatens it">
              <select value={event} onChange={(e) => setEvent(Number(e.target.value))}>
                {STRUCTURE_EVENTS.map((x, i) => (
                  <option key={x} value={i}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Other modifiers" hint="The event's severity, a flying buttress (+1 each)">
              <Stepper value={other} min={-15} max={15} width={40} onChange={setOther} />
            </Field>
            <button onClick={check}>
              Roll the stress check ({mods >= 0 ? '+' : ''}
              {mods})
            </button>
          </div>
        </>
      )}
      <Lines lines={lines} />
    </Card>
  );
}

export function MenagerieCard({ cov }: { cov: Covenant }) {
  const members = useMembers(cov);
  const score = (i: number, id: string) => members[i]?.d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0) ?? 0;
  // the lead handler: the member with the best Animal Handling until another is chosen
  const best = members.reduce((m, _x, i) => (score(i, 'animal-handling') > score(m, 'animal-handling') ? i : m), 0);
  const [handlerId, setHandlerId] = useState<string | undefined>();
  const [b, setB] = useState<BreedingInput>({ adequateDiet: true });
  const [size, setSize] = useState(0);
  const [adult, setAdult] = useState(20);
  const [years, setYears] = useState(5);
  const [lines, setLines] = useState<string[]>([]);
  const hi = handlerId === '' ? -1 : handlerId ? members.findIndex((m) => m.c.id === handlerId) : members.length ? best : -1;
  const input: BreedingInput = { ...b, animalHandling: hi >= 0 ? score(hi, 'animal-handling') : 0, magicLore: hi >= 0 ? score(hi, 'magic-lore') : 0 };
  const bm = breedingModifiers(input);
  const bTotal = bm.reduce((s, x) => s + x.value, 0);
  const set = (k: keyof BreedingInput, v: boolean | number) => setB((x) => ({ ...x, [k]: v }));
  const box = (k: keyof BreedingInput, label: string) => (
    <label key={k}>
      <input type="checkbox" checked={!!b[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
    </label>
  );
  return (
    <Card title="A menagerie" tour="menagerie" fold="menagerie" summary="Beasts the covenant keeps: the Breeding Roll, breeding for the best, birthing, and Might while young.">
      <p className="small muted" style={{ marginTop: 0 }}>
        The optional breeding rules of <i>Hermetic Projects</i>, for when the troupe would rather roll than leave it to the storyguide. A male and a female in one pen for a season: stress die + modifiers against 9.
      </p>
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
      </div>
      <div className="row">
        <Field label="Lead handler" hint="Adds Animal Handling ÷ 5 and Magic Lore ÷ 5, each rounded up">
          <select value={hi >= 0 ? members[hi].c.id : ''} onChange={(e) => setHandlerId(e.target.value)}>
            <option value="">no handler</option>
            {members.map((m, i) => (
              <option key={m.c.id} value={m.c.id}>
                {m.c.name || 'Unnamed'} (Animal Handling {score(i, 'animal-handling')}, Magic Lore {score(i, 'magic-lore')})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ferocity (aggressive)">
          <Stepper value={b.ferocity ?? 0} min={0} max={6} width={34} onChange={(v) => set('ferocity', v)} />
        </Field>
        <Field label="Magic Might">
          <Stepper value={b.might ?? 0} min={0} max={75} width={40} onChange={(v) => set('might', v)} />
        </Field>
        <Field label="A fitting spell's magnitudes">
          <Stepper value={b.spellMagnitudes ?? 0} min={0} max={20} width={34} onChange={(v) => set('spellMagnitudes', v)} />
        </Field>
      </div>
      <div className="row">
        <button onClick={() => setLines([`Breeding (${bm.map((x) => `${x.label} ${x.value > 0 ? '+' : ''}${x.value}`).join(', ') || 'no modifiers'}): ${breedingRoll(bTotal).text}`])}>
          Roll Breeding ({bTotal >= 0 ? '+' : ''}
          {bTotal})
        </button>
        <button
          onClick={() => {
            const r = stressDie(1);
            setLines([`Breeding for the best: ${describeStress(r)}. ${breedingForBest(r)}`]);
          }}
        >
          Roll breeding for the best
        </button>
      </div>
      <div className="row">
        <Field label="The mother's Size">
          <Stepper value={size} min={-4} max={6} width={34} onChange={setSize} />
        </Field>
        <span className="small">
          Birthing: she is treated as having a Medium Wound, with a Recovery roll every {birthingIntervalHours(size)} hours (a handler adds Animal Handling). Hatchlings: Stamina + Survival + stress die
          against 9.
        </span>
      </div>
      <div className="row">
        <Field label="Adult Might">
          <Stepper value={adult} min={0} max={75} width={40} onChange={setAdult} />
        </Field>
        <Field label="Years to mature">
          <Stepper value={years} min={1} max={20} width={34} onChange={setYears} />
        </Field>
        <span className="small">Might while young: {juvenileMight(adult, years)}.</span>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}
