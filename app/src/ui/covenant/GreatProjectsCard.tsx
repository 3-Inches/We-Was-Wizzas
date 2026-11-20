// Hermetic Projects on the covenant: the record of its great buildings (each one's height, the quality of
// its work and the damage it has taken), and where its menagerie's rolls are made. Their rolls are made
// at Game Table › Dice › Great projects (owner point 1), which writes a lost damage level here; a mason's
// season of building or repairs is worked on the Seasons page (MasonSeasonCard).

import { Link } from 'react-router-dom';
import { buildingDamageLevels, buildingLevelsLeft, type BuildQuality } from '../../engine/greatProjects';
import type { Covenant, GreatBuilding } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Confirm, Field, Stepper } from '../kit';
import { R } from '../routes';

const QUALITIES: BuildQuality[] = ['shoddy', 'standard', 'superior', 'excellent'];

/** A one-line account of a building, for summaries. */
export const buildingLine = (b: GreatBuilding) => `${b.name}: ${b.height} feet, ${buildingLevelsLeft(b)} of ${buildingDamageLevels(b)} damage levels`;

/** The covenant's great projects: its buildings' record, and links to their rolls and the menagerie's at the Game Table. */
export function GreatProjectsCard({ cov, update }: { cov: Covenant; update: (fn: (c: Covenant) => void) => void }) {
  const buildings = cov.buildings ?? [];
  const set = (id: string, fn: (x: GreatBuilding) => void) => update((c) => void (c.buildings ?? []).filter((x) => x.uid === id).forEach(fn));
  const add = () =>
    update((c) => {
      c.buildings = [...(c.buildings ?? []), { uid: uid(), name: buildings.length ? `Building ${buildings.length + 1}` : 'The great tower', height: 0, weakest: 'standard', latest: 'standard', damage: 0 }];
    });
  const rolls = R.dice(cov.sagaId, 'projects', undefined, cov.id);
  return (
    <Card
      title="Great projects"
      tour="great-projects"
      fold="great-projects"
      summary={buildings.length ? buildings.map(buildingLine).join(' · ') : 'None yet: a tower or a hall raised season by season, and a menagerie (Hermetic Projects).'}
    >
      <p className="small muted" style={{ marginTop: 0 }}>
        A building the covenant raises over years, from <i>Hermetic Projects</i>. A member with Craft: Mason spends <b>Build (a season)</b> or <b>Repair (a season)</b> on{' '}
        <Link to={R.seasons(cov.sagaId)}>Seasons ›</Link>, which changes the record here. A Creo ritual&apos;s levels are added by hand. When an event threatens a building, roll its stress check at{' '}
        <Link to={rolls}>Game Table › Dice › Great projects ›</Link>, which records the damage here.
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
      <p className="small" style={{ marginBottom: 0 }}>
        <b>A menagerie</b>: the beasts the covenant keeps, bred with its lead handler. Its Breeding Roll, breeding for the best, birthing and Might while young are at{' '}
        <Link to={rolls}>Game Table › Dice › Great projects ›</Link>.
      </p>
    </Card>
  );
}
