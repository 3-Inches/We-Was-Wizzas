// A mason's season on a great building (Hermetic Projects, the Great Tower), on the Seasons page, in a
// character's season in full: Build (a season) raises one of the covenant's buildings at the mason's pace,
// in work whose quality the Workshop Total sets; Repair (a season) mends a damage level or brings shoddy
// work up to standard. The building's record is on the covenant (GreatBuildingsCard); Unlog puts it back.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tradeScore } from '../../engine/books';
import { buildSeason, buildingDamageLevels, buildingLevelsLeft, buildingWorkQuality, masonProgress, repairSeason } from '../../engine/greatProjects';
import type { GreatBuilding } from '../../engine/types';
import { workshopTotal } from '../../engine/workshop';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';
import { R } from '../routes';
import type { CharEditor } from '../character/useChar';
import { useSeasonWork } from '../seasonWork';

const MASON = /mason/i;
const NEW = '+new';

export function MasonSeasonCard({ ed }: { ed: CharEditor }) {
  const { c, d } = ed;
  const sw = useSeasonWork(ed);
  const [kind, setKind] = useState<'build' | 'repair'>('build');
  const [which, setWhich] = useState('');
  const [name, setName] = useState('The great tower');
  const [tools, setTools] = useState<number | undefined>();
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d || !sw.cov) return null;
  const mason = tradeScore(c, d, MASON);
  if (mason <= 0) return null;
  const cov = sw.cov;
  const buildings = cov.buildings ?? [];
  const chosen = which === NEW ? undefined : (buildings.find((x) => x.uid === which) ?? buildings[0]);
  const b: GreatBuilding = { ...(chosen ?? { uid: '', name: name || 'A building', height: 0, weakest: 'standard', latest: 'standard', damage: 0 }), tools: tools ?? chosen?.tools ?? 0 };
  const ab = c.abilities.filter((a) => a.abilityId === 'craft-type' && MASON.test(a.param ?? '')).sort((x, y) => (d.abilityByUid.get(y.uid)?.total ?? 0) - (d.abilityByUid.get(x.uid)?.total ?? 0))[0];
  // the Workshop Total: Intelligence + Craft: Mason + the workshop's Innovation and Raw Materials, if it is a mason's
  const ws = c.workshop && c.workshop.abilityUid === ab?.uid ? c.workshop : undefined;
  const wt = workshopTotal({ characteristic: { label: 'Intelligence', value: d.characteristics.Int.value }, ability: { label: 'Craft: Mason', value: mason }, innovation: ws?.innovation ?? 0, rawMaterials: ws?.rawMaterials ?? 0, assistants: [] });
  const quality = buildingWorkQuality(wt.total, mason);
  const p = masonProgress(mason, b.tools ?? 0);
  const result = kind === 'build' ? buildSeason(b, mason, quality) : chosen ? repairSeason(chosen) : { text: 'Choose a building to repair.' };
  const why = sw.busy ? `${sw.season} ${sw.year} is already spent.` : !result.building ? result.text : undefined;
  const doSeason = () =>
    setLines(
      sw.work(`${kind === 'build' ? 'Building' : 'Repairs'}: ${b.name}`, undefined, (_x, k) => {
        if (!k || !result.building) return { lines: [], refused: result.text };
        const id = chosen?.uid ?? uid();
        const after = { ...result.building, uid: id };
        k.buildings = chosen ? (k.buildings ?? []).map((y) => (y.uid === id ? after : y)) : [...(k.buildings ?? []), after];
        return {
          lines: [result.text, `Recorded on ${cov.name || 'the covenant'}.`],
          gains: ab ? { [`ability:${ab.uid}`]: 2 } : {},
          gainText: ab ? '+2 experience in Craft: Mason' : undefined,
          undo: { building: { covenantId: k.id, uid: id, before: chosen ? structuredClone(chosen) : undefined } },
        };
      }),
    );
  return (
    <Card
      title="A mason's season"
      tour="mason-season"
      fold="mason-season"
      summary={buildings.length ? `Build or repair: ${buildings.map((x) => x.name).join(', ')}.` : 'Begin a great building for the covenant.'}
    >
      <div className="row">
        <Field label="Work">
          <select value={kind} onChange={(e) => (setKind(e.target.value as 'build' | 'repair'), which === NEW && setWhich(''))}>
            <option value="build">Build</option>
            <option value="repair" disabled={!buildings.length}>Repair</option>
          </select>
        </Field>
        <Field label="Building">
          <select value={chosen?.uid ?? NEW} onChange={(e) => (setWhich(e.target.value), setTools(undefined))}>
            {buildings.map((x) => (
              <option key={x.uid} value={x.uid}>{x.name} ({x.height} feet)</option>
            ))}
            {kind === 'build' && <option value={NEW}>a new building</option>}
          </select>
        </Field>
        {!chosen && kind === 'build' && (
          <Field label="Its name">
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: 150 }} />
          </Field>
        )}
        {kind === 'build' && (
          <Field label="Enchanted tools" hint="Each +1 to Craft: Mason for the pace of work, up to the score">
            <Stepper value={b.tools ?? 0} min={0} max={mason} width={34} onChange={setTools} />
          </Field>
        )}
      </div>
      <p className="small">
        {kind === 'build' ? (
          <>
            Craft: Mason {mason}
            {b.tools ? ` + ${Math.min(b.tools, mason)} from tools` : ''}: {p.levelsPerSeason} level{p.levelsPerSeason === 1 ? '' : 's'} of 20 feet a season. Workshop Total <Total value={wt.total} parts={wt.parts} label="Workshop Total" />{' '}
            makes {quality} work (shoddy 3, standard 6, superior 12, excellent 15).{' '}
          </>
        ) : chosen ? (
          <>
            {chosen.name}: {buildingLevelsLeft(chosen)} of {buildingDamageLevels(chosen)} damage levels, poorest work {chosen.weakest}. No other building goes on that season.{' '}
          </>
        ) : null}
        {!why && result.text} The mason needs enough assistants and materials, as the book assumes. Its record is on{' '}
        <Link to={R.covenant(cov.sagaId, cov.id)}>{cov.name || 'the covenant'} ›</Link>
      </p>
      <button onClick={doSeason} disabled={!!why}>
        {kind === 'build' ? 'Build' : 'Repair'} (a season)
      </button>
      {why && <span className="small muted"> {why}</span>}
      {lines.length > 0 && (
        <div className="log small" aria-live="polite">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </Card>
  );
}
