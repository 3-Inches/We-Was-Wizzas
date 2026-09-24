import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCharEditor } from './useChar';
import { Card, Empty, IssueList, Tabs } from '../kit';
import { HOUSE_BY_ID } from '../../data/houses';
import { exportCharacter, useStore } from '../../store/store';
import { bundleToShareLink, downloadJson, safeFilename } from '../../util/files';
import OverviewTab from './sheet/OverviewTab';
import AbilitiesTab from './sheet/AbilitiesTab';
import MagicTab from './sheet/MagicTab';
import CombatTab from './sheet/CombatTab';
import AdvancementTab from './sheet/AdvancementTab';
import LabItemsTab from './sheet/LabItemsTab';
import SheetSummary from './SheetSummary';
import { summarize } from '../../engine/character/validate';

type TabId = 'overview' | 'abilities' | 'magic' | 'combat' | 'advancement' | 'lab' | 'summary' | 'rules';

export default function CharacterSheet() {
  const ed = useCharEditor();
  const nav = useNavigate();
  const [tab, setTab] = useState<TabId>('overview');
  const [share, setShare] = useState('');
  const deleteCharacter = useStore((s) => s.deleteCharacter);
  const { c, d, saga, issues } = ed;
  if (!c || !d || !saga) return <Empty>Character not found.</Empty>;
  const s = summarize(issues);
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'abilities', label: 'Abilities' },
    ...(d.hasGift || c.type === 'magus' ? [{ id: 'magic' as TabId, label: 'Magic' }] : []),
    { id: 'combat', label: 'Combat & Health' },
    { id: 'advancement', label: 'Seasons & Aging' },
    ...(c.type === 'magus' ? [{ id: 'lab' as TabId, label: 'Lab, Items & Familiar' }] : [{ id: 'lab' as TabId, label: 'Items' }]),
    { id: 'summary', label: 'Stat block' },
    { id: 'rules', label: `Rules check${s.errors + s.warnings ? ` (${s.errors + s.warnings})` : ''}` },
  ];
  return (
    <div>
      <div className="breadcrumbs no-print">
        <Link to="/">Sagas</Link> › <Link to={`/saga/${saga.id}`}>{saga.name}</Link> ›
      </div>
      <div className="topbar">
        <h1>
          {c.name || 'Unnamed'}
          {c.house && <span className="soft"> of {HOUSE_BY_ID[c.house]?.name}</span>}{' '}
          <span className="badge">{c.type === 'mythic' ? 'Mythic Companion' : c.type}</span>
          {!c.creation.finalized && <span className="badge warn">in creation</span>}
        </h1>
        <div className="row no-print">
          <button onClick={() => nav(`/saga/${saga.id}/character/${c.id}/create`)}>{c.creation.finalized ? 'Edit creation' : 'Continue creation'}</button>
          <button onClick={() => downloadJson(`${safeFilename(c.name)}.arm5char.json`, exportCharacter(c.id))}>Export</button>
          <button onClick={() => setShare(bundleToShareLink(exportCharacter(c.id)))}>Share link</button>
          <button onClick={() => window.print()}>Print</button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm(`Delete ${c.name || 'this character'}?`)) {
                deleteCharacter(c.id);
                nav(`/saga/${saga.id}`);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {share && (
        <Card title="Share this character" actions={<button className="small ghost" onClick={() => setShare('')}>✕</button>}>
          <p className="small">Send this link (e.g. on Discord). Opening it imports a copy of the character into the recipient's browser.</p>
          <div className="row">
            <input readOnly value={share} style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
            <button onClick={() => navigator.clipboard?.writeText(share)}>Copy</button>
          </div>
          <p className="small muted">{share.length.toLocaleString()} characters. Very long links may be cut off by some chat apps — use Export instead.</p>
        </Card>
      )}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' && <OverviewTab ed={ed} />}
      {tab === 'abilities' && <AbilitiesTab ed={ed} />}
      {tab === 'magic' && <MagicTab ed={ed} />}
      {tab === 'combat' && <CombatTab ed={ed} />}
      {tab === 'advancement' && <AdvancementTab ed={ed} />}
      {tab === 'lab' && <LabItemsTab ed={ed} />}
      {tab === 'summary' && <SheetSummary ed={ed} />}
      {tab === 'rules' && (
        <Card title="Rules check">
          <IssueList issues={issues} onAcknowledge={ed.acknowledge} />
          {c.acknowledgedIssues.length > 0 && (
            <div className="row small" style={{ marginTop: 8 }}>
              {c.acknowledgedIssues.length} issue(s) allowed as troupe rulings.
              <button className="small" onClick={() => ed.update((x) => void (x.acknowledgedIssues = []))}>
                Show them again
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
