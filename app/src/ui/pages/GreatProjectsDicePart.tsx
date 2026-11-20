// Game Table › Dice › Great projects (Hermetic Projects): the rolls of a covenant's great buildings and
// menagerie, made at the table (owner point 1). A building's stress check when an event threatens it,
// with its master mason; a menagerie's Breeding Roll and breeding for the best, with its lead handler.
// The buildings' record (height, quality, damage) is kept on the covenant's Overview (GreatProjectsCard),
// and a stress check that costs a damage level is written there.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bestArtisan } from '../../engine/books';
import { deriveCharacter } from '../../engine/character/derive';
import { describeStress, stressDie } from '../../engine/dice';
import {
  STRUCTURE_EVENTS, birthingIntervalHours, breedingForBest, breedingModifiers, breedingRoll, buildingCheckModifiers, buildingStressCheck, juvenileMight, type BreedingInput,
} from '../../engine/greatProjects';
import type { Covenant } from '../../engine/types';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Empty, Field, Stepper } from '../kit';
import { R } from '../routes';

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

/** Dice › Great projects: which covenant, then its buildings' stress check and its menagerie's rolls. */
export function GreatProjectsDicePart({ sagaId }: { sagaId: string }) {
  const covs = useSagaCovenants(sagaId);
  // the troupe's own covenants first, then the Tribunal's; a covenant with a building before one without
  const order = useMemo(() => [...covs].sort((a, b) => Number(!!a.living) - Number(!!b.living) || Number(!(b.buildings ?? []).length) - Number(!(a.buildings ?? []).length)), [covs]);
  const [covId, setCovId] = useState('');
  const cov = order.find((c) => c.id === covId) ?? order[0];
  if (!cov) return <Empty>No covenant in this saga yet: its great buildings and menagerie are kept on a covenant.</Empty>;
  return (
    <>
      <div className="row">
        <Field label="Covenant">
          <select value={cov.id} onChange={(e) => setCovId(e.target.value)}>
            {order.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || 'Unnamed'}
                {c.living ? ' (the Tribunal)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Link to={R.covenant(cov.sagaId, cov.id)} className="small">
          {cov.name || 'The covenant'}’s record ›
        </Link>
      </div>
      <BuildingCheckCard key={`b-${cov.id}`} cov={cov} />
      <MenagerieRollsCard key={`m-${cov.id}`} cov={cov} />
    </>
  );
}

/** A building's stress check, when an event threatens it: stress die + Craft: Mason + the latest work's quality against 15 (Hermetic Projects). */
function BuildingCheckCard({ cov }: { cov: Covenant }) {
  const saga = useSaga(cov.sagaId);
  const members = useMembers(cov);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [which, setWhich] = useState('');
  const [event, setEvent] = useState(0);
  const [other, setOther] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const buildings = cov.buildings ?? [];
  const mason = bestArtisan(cov, members, MASON);
  const craft = mason?.score ?? 0;
  const b = buildings.find((x) => x.uid === which) ?? buildings[0];
  const mods = b ? buildingCheckModifiers(b, craft, other) : 0;
  const check = () => {
    if (!b) return;
    const r = buildingStressCheck(b, craft, other);
    updateCovenant(cov.id, (c) => {
      c.buildings = (c.buildings ?? []).map((x) => (x.uid === b.uid ? r.building : x));
      if (r.lost) c.log.push({ uid: uid(), year: saga?.currentYear ?? 1220, season: saga?.currentSeason, text: `${b.name}: ${STRUCTURE_EVENTS[event].toLowerCase()}, ${r.lost} damage level${r.lost > 1 ? 's' : ''} lost.` });
    });
    setLines([`${b.name}, ${STRUCTURE_EVENTS[event].toLowerCase()}: ${r.text}${r.lost ? ` Recorded on ${cov.name || 'the covenant'}.` : ''}`]);
  };
  return (
    <Card title="A building's stress check" tour="building-check" fold="building-check" summary={b ? `${b.name}: stress die ${mods >= 0 ? '+' : ''}${mods} against 15.` : 'No great building yet.'}>
      {!b ? (
        <p className="small muted" style={{ margin: 0 }}>
          {cov.name || 'This covenant'} has no great building yet. Add one on <Link to={R.covenant(cov.sagaId, cov.id)}>the covenant’s Overview ›</Link>, under Great projects.
        </p>
      ) : (
        <>
          <p className="small" style={{ marginTop: 0 }}>
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

/** A menagerie's rolls (Hermetic Projects' optional breeding rules), with the covenant's lead handler. */
function MenagerieRollsCard({ cov }: { cov: Covenant }) {
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
    <Card title="A menagerie" tour="menagerie" fold="menagerie" summary={`The Breeding Roll (${bTotal >= 0 ? '+' : ''}${bTotal} against 9), breeding for the best, birthing, and Might while young.`}>
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
