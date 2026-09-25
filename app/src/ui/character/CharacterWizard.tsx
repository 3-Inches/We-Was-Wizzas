import { Link, useNavigate } from 'react-router-dom';
import { useCharEditor } from './useChar';
import { Card, Empty, IssueList } from '../kit';
import type { Step } from '../../engine/character/validate';
import BasicsStep from './steps/BasicsStep';
import HouseStep from './steps/HouseStep';
import VirtuesStep from './steps/VirtuesStep';
import CharacteristicsStep from './steps/CharacteristicsStep';
import AbilitiesStep from './steps/AbilitiesStep';
import ArtsStep from './steps/ArtsStep';
import SpellsStep from './steps/SpellsStep';
import DetailsStep from './steps/DetailsStep';
import ReviewStep from './steps/ReviewStep';
import RecommendationsPanel from './RecommendationsPanel';
import { useState } from 'react';

interface StepDef {
  id: Step | 'review';
  label: string;
  show: (t: string) => boolean;
}

const STEPS: StepDef[] = [
  { id: 'basics', label: '1 · Concept', show: () => true },
  { id: 'house', label: '2 · House', show: (t) => t === 'magus' || t === 'mythic' },
  { id: 'virtues', label: 'Virtues & Flaws', show: () => true },
  { id: 'characteristics', label: 'Characteristics', show: () => true },
  { id: 'abilities', label: 'Abilities', show: () => true },
  { id: 'arts', label: 'Arts', show: (t) => t === 'magus' },
  { id: 'spells', label: 'Spells', show: (t) => t === 'magus' },
  { id: 'personality', label: 'Personality & Gear', show: () => true },
  { id: 'review', label: 'Review', show: () => true },
];

export default function CharacterWizard() {
  const ed = useCharEditor();
  const nav = useNavigate();
  const [showRecs, setShowRecs] = useState(true);
  const { c, saga, issues } = ed;
  if (!c || !saga || !ed.d) return <Empty>Character not found.</Empty>;
  const steps = STEPS.filter((s) => s.show(c.type)).map((s, i) => ({ ...s, label: s.id === 'house' && c.type === 'mythic' ? `${i + 1} · Mythic type` : s.label.replace(/^\d+ · /, `${i + 1} · `) }));
  const idx = Math.min(c.creation.step, steps.length - 1);
  const step = steps[idx];
  const go = (i: number) => ed.update((x) => void (x.creation.step = Math.max(0, Math.min(steps.length - 1, i))));
  const stepIssues = issues.filter((i) => (step.id === 'review' ? true : i.step === step.id || (step.id === 'personality' && i.step === 'equipment')));
  const dotFor = (id: string) => {
    const ii = issues.filter((i) => i.step === id);
    return ii.some((i) => i.severity === 'error') ? 'error' : ii.some((i) => i.severity === 'warning') ? 'warning' : 'ok';
  };

  return (
    <div>
      <div className="breadcrumbs">
        <Link to="/">Sagas</Link> › <Link to={`/saga/${saga.id}`}>{saga.name}</Link> ›
      </div>
      <div className="topbar">
        <h1>
          {c.name || 'New character'} <span className="badge">{c.type === 'mythic' ? 'Mythic Companion' : c.type}</span>
        </h1>
        <label className="inline small">
          <input type="checkbox" checked={showRecs} onChange={(e) => setShowRecs(e.target.checked)} /> Recommendations
        </label>
        <button onClick={() => nav(`/saga/${saga.id}/character/${c.id}`)}>Open sheet</button>
      </div>
      <div className="wizard-steps">
        {steps.map((s, i) => (
          <button key={s.id} className={i === idx ? 'current' : ''} onClick={() => go(i)}>
            {s.id !== 'review' && <span className={`dot ${dotFor(s.id)}`} />} {s.label}
          </button>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: showRecs ? 'minmax(0, 1fr) 320px' : '1fr' }}>
        <div className="stack">
          {step.id === 'basics' && <BasicsStep ed={ed} />}
          {step.id === 'house' && <HouseStep ed={ed} />}
          {step.id === 'virtues' && <VirtuesStep ed={ed} />}
          {step.id === 'characteristics' && <CharacteristicsStep ed={ed} />}
          {step.id === 'abilities' && <AbilitiesStep ed={ed} />}
          {step.id === 'arts' && <ArtsStep ed={ed} />}
          {step.id === 'spells' && <SpellsStep ed={ed} />}
          {step.id === 'personality' && <DetailsStep ed={ed} />}
          {step.id === 'review' && <ReviewStep ed={ed} />}
          <div className="row between no-print">
            <button onClick={() => go(idx - 1)} disabled={idx === 0}>
              ‹ Back
            </button>
            {idx < steps.length - 1 ? (
              <button className="primary" onClick={() => go(idx + 1)}>
                Next: {steps[idx + 1].label.replace(/^\d+ · /, '')} ›
              </button>
            ) : null}
          </div>
        </div>
        {showRecs && (
          <div className="stack">
            <Card title="Rules check" className="accent">
              <IssueList issues={stepIssues} onAcknowledge={ed.acknowledge} empty="Everything on this step follows the rules." />
            </Card>
            <RecommendationsPanel ed={ed} step={step.id} />
          </div>
        )}
      </div>
    </div>
  );
}
