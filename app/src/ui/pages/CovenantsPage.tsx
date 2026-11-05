// Covenants: the players' covenants, founded here and opened from here. The Tribunal's living covenants
// are on the Tribunal page.

import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { newCovenant } from '../../engine/covenant';
import { lsd } from '../../engine/economy';
import { usePlayerCharacters, usePlayerCovenants, useSaga, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { Card, Confirm, Empty } from '../kit';
import { R } from '../routes';

export default function CovenantsPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const chars = usePlayerCharacters(sagaId);
  const covs = usePlayerCovenants(sagaId);
  const allCovs = useSagaCovenants(sagaId);
  const putCovenant = useStore((s) => s.putCovenant);
  const deleteCovenant = useStore((s) => s.deleteCovenant);
  const setActive = useStore((s) => s.setActiveSaga);
  const nav = useNavigate();
  useEffect(() => {
    if (sagaId) setActive(sagaId);
  }, [sagaId, setActive]);
  if (!saga) return <Empty>Saga not found.</Empty>;
  const living = allCovs.filter((c) => c.living);
  const found = () => {
    const c = newCovenant(saga.id, saga.currentYear);
    c.name = 'New Covenant';
    c.tribunal = saga.tribunal;
    c.memberIds = chars.map((x) => x.id);
    putCovenant(c);
    nav(R.covenant(saga.id, c.id));
  };
  return (
    <div className="stack">
      <div className="topbar">
        <h1>Covenants</h1>
        <button className="primary" data-tour="found-covenant" onClick={found}>
          Found a covenant
        </button>
      </div>
      <Card title={`The players' covenants (${covs.length})`}>
        {covs.length === 0 && <Empty>No covenant yet. Found one, then set its Build Points, Boons and Hooks on its page.</Empty>}
        {covs.map((c) => (
          <div key={c.id} className="list-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to={R.covenant(saga.id, c.id)}>
                <b>{c.name || '(unnamed)'}</b>
              </Link>
              <div className="small muted">
                {[c.tribunal && `${c.tribunal} Tribunal`, `${c.season} covenant`, `${c.memberIds.length} members`, `treasury ${lsd(c.finances.treasury)}`].filter(Boolean).join(' · ')}
              </div>
            </div>
            <Confirm className="small ghost" message={`Delete ${c.name || 'this covenant'}? Its members stay in the saga.`} onYes={() => deleteCovenant(c.id)} label="✕" />
          </div>
        ))}
      </Card>
      <Card title="The Tribunal's other covenants">
        <p className="small" style={{ margin: 0 }}>
          {living.length
            ? `The ${saga.tribunal} Tribunal: ${living.length} living covenant${living.length > 1 ? 's' : ''} (${living.reduce((t, c) => t + c.memberIds.length, 0)} people), kept apart from the players’.`
            : `The other covenants of the ${saga.tribunal || 'saga’s'} Tribunal can be brought into the saga as living covenants.`}{' '}
          <Link to={R.tribunal(saga.id)}>The Tribunal ›</Link>
        </p>
      </Card>
    </div>
  );
}
