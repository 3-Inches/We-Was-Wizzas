import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import { shareLinkToBundle } from '../../util/files';
import { Card, Empty } from '../kit';

export default function ImportPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const sagas = useStore((s) => s.sagas);
  const active = useStore((s) => s.activeSagaId);
  const importBundle = useStore((s) => s.importBundle);
  const packed = new URLSearchParams(loc.search).get('d') ?? '';
  const bundle = useMemo(() => shareLinkToBundle(packed), [packed]);
  const [target, setTarget] = useState(active ?? '__new__');
  if (!bundle) return <Empty>This link does not contain a readable character or saga.</Empty>;
  return (
    <Card title="Import shared data" className="accent">
      <p>
        This link contains {bundle.characters?.length ?? 0} character(s){bundle.covenants?.length ? ` and ${bundle.covenants.length} covenant(s)` : ''}
        {bundle.saga ? ` from the saga "${bundle.saga.name}"` : ''}.
      </p>
      <ul>
        {bundle.characters?.map((c) => (
          <li key={c.id}>
            <b>{c.name || '(unnamed)'}</b> — {c.type}
          </li>
        ))}
      </ul>
      <div className="row">
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {Object.values(sagas).map((s) => (
            <option key={s.id} value={s.id}>
              Into saga: {s.name}
            </option>
          ))}
          <option value="__new__">{bundle.saga ? 'As a new saga' : 'Into a new saga'}</option>
        </select>
        <button
          className="primary"
          onClick={() => {
            const r = importBundle(bundle, { intoSagaId: target === '__new__' ? undefined : target });
            nav(`/saga/${r.sagaId}`);
          }}
        >
          Import
        </button>
      </div>
    </Card>
  );
}
