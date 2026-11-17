// The Game Table's Possessions: what each character owns, changed as it changes in play. Things
// gained in a story or bought, given away or thrown out once broken; armor and weapons; enchanted
// items and the talisman; a familiar; a Redcap's devices from the Mercer House. Work on an item or a
// familiar in the lab is planned here and worked as a season's activity on the Seasons page. The
// character's sheet lists all of it, for reference.

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { Empty, Field } from '../kit';
import { AtTable, PeopleOptions, canPlay, groupPeople } from '../play';
import { R } from '../routes';
import { useCharEditor } from '../character/useChar';
import { PossessionsCard } from '../character/sheet/PossessionsCard';
import EquipmentEditor from '../character/EquipmentEditor';
import { CharItems, FamiliarCard, RedcapCard } from '../character/sheet/LabItemsTab';
import { CharmCard } from '../character/sheet/CharmCard';

export default function PossessionsPage() {
  const sagaId = useStore((s) => s.activeSagaId);
  const saga = useSaga(sagaId);
  const all = useSagaCharacters(sagaId);
  const covs = useSagaCovenants(sagaId);
  const groups = useMemo(() => groupPeople(all.filter(canPlay), covs), [all, covs]);
  const people = groups.flatMap((g) => g.people);
  const [params, setParams] = useSearchParams();
  const c = people.find((x) => x.id === params.get('who')) ?? people[0];
  if (!saga) return <Empty>Saga not found.</Empty>;
  if (!c) return <Empty>No character in play yet: finish one on the People page and what they own is kept here.</Empty>;
  return (
    <div className="stack">
      <div className="row" data-tour="items-who">
        <Field label="Whose possessions">
          <select
            value={c.id}
            onChange={(e) =>
              setParams(
                (p) => {
                  const n = new URLSearchParams(p);
                  n.set('who', e.target.value);
                  return n;
                },
                { replace: true },
              )
            }
          >
            <PeopleOptions groups={groups} note={(x) => ` (${x.type})`} />
          </select>
        </Field>
        <Link to={R.character(saga.id, c, 'lab')} className="small">
          {c.name || 'Their'} sheet ›
        </Link>
      </div>
      <Owned key={c.id} sagaId={saga.id} charId={c.id} />
    </div>
  );
}

function Owned({ sagaId, charId }: { sagaId: string; charId: string }) {
  const ed = useCharEditor({ sagaId, charId });
  if (!ed.c || !ed.d) return null;
  return (
    <AtTable>
      <PossessionsCard ed={ed} />
      <EquipmentEditor ed={ed} />
      <CharItems ed={ed} />
      {ed.d.isMagus ? <FamiliarCard ed={ed} /> : <RedcapCard ed={ed} />}
      <CharmCard ed={ed} />
    </AtTable>
  );
}
