// The Game Table: where the saga is played. Its pages: the Overview (what needs attention, the
// covenants, after a story), Seasons (what everyone does, and moving time on), Dice (every roll at the
// table), the Market & Treasury, and City & Guild.

import { lazy, Suspense, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSaga } from '../../store/hooks';
import { useStore } from '../../store/store';
import { Empty, Tabs } from '../kit';
import { TABLE_TABS, type TableTab } from '../routes';

const DashboardPage = lazy(() => import('./DashboardPage'));
const SeasonsPage = lazy(() => import('./SeasonsPage'));
const DicePage = lazy(() => import('./DicePage'));
const MarketPage = lazy(() => import('./MarketPage'));
const CityGuildPage = lazy(() => import('./CityGuildPage'));

const LABELS: Record<TableTab, string> = { overview: 'Overview', seasons: 'Seasons', dice: 'Dice', market: 'Market & Treasury', guild: 'City & Guild' };

export default function GameTablePage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const setActive = useStore((s) => s.setActiveSaga);
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TableTab = (TABLE_TABS as readonly string[]).includes(raw ?? '') ? (raw as TableTab) : 'overview';
  useEffect(() => {
    if (sagaId) setActive(sagaId);
  }, [sagaId, setActive]);
  if (!saga) return <Empty>Saga not found.</Empty>;
  return (
    <div className="stack">
      <div className="topbar">
        <h1>
          Game Table · {saga.currentSeason} {saga.currentYear}
        </h1>
      </div>
      <div data-tour="table-tabs">
        <Tabs
          tabs={TABLE_TABS.map((t) => ({ id: t, label: LABELS[t] }))}
          value={tab}
          onChange={(t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })}
        />
      </div>
      <Suspense fallback={<div className="muted">Loading…</div>}>
        {tab === 'overview' && <DashboardPage />}
        {tab === 'seasons' && <SeasonsPage />}
        {tab === 'dice' && <DicePage />}
        {tab === 'market' && <MarketPage />}
        {tab === 'guild' && <CityGuildPage />}
      </Suspense>
    </div>
  );
}
