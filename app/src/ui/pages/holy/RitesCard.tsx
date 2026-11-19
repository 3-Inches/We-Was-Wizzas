// A Dominion rite, a celestial regio, a copy of the Ars Notoria.

import { useState } from 'react';
import { describeStress, stressDie } from '../../../engine/dice';
import type { AuraState } from '../../../engine/magic';
import { Card, Field, Stepper } from '../../kit';
import type { CharEditor } from '../../character/useChar';
import { score, useLines, Lines } from './shared';

export function RitesCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const [regio, setRegio] = useState(3);
  const [minorLevel, setMinorLevel] = useState(5);
  const [minorSM, setMinorSM] = useState(0);
  const [lines, show] = useLines();
  if (!c || !d) return null;
  // a Minor amulet is made in hours, not a season (Mythic Judaism): it is here, the Major ones on the Seasons page
  const ca = score(d, 'craft-amulets');
  const minorTotal = d.characteristics.Dex.value + ca + Math.min(minorSM, ca) + (aura.realm === 'Divine' ? aura.strength : 0);
  const theology = Math.max(score(d, 'dominion-lore'), ...d.abilities.filter((a) => /^theology/.test(a.abilityId)).map((a) => a.total));
  const rite = d.characteristics.Com.value + theology;
  const parma = score(d, 'parma-magica');
  const steady = d.characteristics.Sta.value + Math.max(score(d, 'dominion-lore'), parma);
  const roll = (what: 'rite' | 'regio') => {
    const r = stressDie(1);
    if (what === 'rite') {
      const t = rite + r.value;
      show([
        `Dominion rite: Communication + ${theology === score(d, 'dominion-lore') && theology ? 'Dominion Lore' : 'Theology'} ${rite} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : t} against 6.`,
        r.botches ? 'A botch: Warping, divine displeasure, or Infernal attention.' : t >= 6 ? 'Done. The first rite consecrates the place; a second lets the Dominion in: an aura of 3 at the service’s end, 4 after a year of weekly worship, 5 after a decade for a great church.' : 'The rite fails.',
      ]);
    } else {
      const t = steady + r.value;
      const ok = !r.botches && t >= regio * 3;
      show([
        `Celestial disorientation: Stamina + ${parma > score(d, 'dominion-lore') ? 'Parma Magica' : 'Dominion Lore'} ${steady} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : t} against ${regio * 3}.`,
        ok ? 'Able to act normally.' : `Bewildered and overwhelmed until leaving: −${regio * 3} to every roll.`,
        `After ${d.characteristics.Sta.value + parma + 3} hours, a Fatigue level an hour; unconscious, ${regio} Warping Point${regio > 1 ? 's' : ''} an hour (two or more may bring the Divine Ascent)${d.trueFaith ? '; True Faith makes the hours days' : ''}.`,
      ]);
    }
  };
  return (
    <Card title="Rites and holy places" tour="holy-rites" fold="holy-rites" summary={`a Dominion rite, a celestial regio${ca > 0 ? ', a Minor amulet' : ''}`}>
      {ca > 0 && (
        <div className="row small" data-tour="holy-minor-amulet">
          <b>A Minor amulet</b> (one person, Touch, worn):
          <Field label="Level">
            <Stepper value={minorLevel} min={1} max={50} width={36} onChange={setMinorLevel} />
          </Field>
          <Field label="Shape and material">
            <Stepper value={minorSM} min={0} max={20} width={34} onChange={setMinorSM} />
          </Field>
          <span>
            Dexterity + Craft Amulets + materials{aura.realm === 'Divine' && aura.strength ? ' + Dominion' : ''} = {minorTotal}: {minorTotal >= 2 * minorLevel ? `made in ${Math.max(1, 12 - ca)} hours` : `needs ${2 * minorLevel}`}; it lasts days or weeks.
          </span>
        </div>
      )}
      <div className="row">
        <span>
          Dominion rite: Communication + Theology (or Dominion Lore) <b>{rite}</b> + stress die against 6
        </span>
        <button className="small" onClick={() => roll('rite')}>
          Perform the rite
        </button>
      </div>
      <p className="small muted">The celebrant needs Priest, Rabbi or ’Alim (or the like), Theology or Dominion Lore 2+, a congregation of ten and a consecrated place.</p>
      <div className="row">
        <Field label="Celestial regio level">
          <Stepper value={regio} min={1} max={10} width={34} onChange={setRegio} />
        </Field>
        <span>
          Stamina + Dominion Lore (or Parma) <b>{steady}</b> + stress die against {regio * 3}
        </span>
        <button className="small" onClick={() => roll('regio')}>
          Keep one’s senses
        </button>
        <button className="small ghost" disabled={d.faithPoints < 1} title="A Faith Point spent: the disorientation is ignored altogether" onClick={() => {
          update((x) => void (x.faith = { score: d.trueFaith, points: d.faithPoints - 1 }));
          show('A Faith Point spent: the celestial disorientation is ignored.');
        }}>
          Spend a Faith Point
        </button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}
