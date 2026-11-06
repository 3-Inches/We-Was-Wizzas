// Confidence and Faith at the table (DE p.52, p.419): everyone's points in one place, given after a
// story or by the storyguide, spent for +3 on a roll, and Faith Points back at dawn. The sheet shows
// where each character stands; the points change here, in play.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { GameData } from '../../data';
import { deriveCharacter } from '../../engine/character/derive';
import type { Character, Saga } from '../../engine/types';
import { useStore } from '../../store/store';
import { Card, Empty } from '../kit';
import { R } from '../routes';

export function ConfidenceCard({ saga, data, chars }: { saga: Saga; data: GameData; chars: Character[] }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  // grogs have no Confidence (DE p.52); anyone with True Faith has Faith Points
  const rows = useMemo(
    () =>
      chars
        .filter((c) => c.creation.finalized && !c.wounds.dead)
        .map((c) => ({ c, d: deriveCharacter(c, data, saga.houseRules) }))
        .filter(({ c, d }) => c.type !== 'grog' || d.trueFaith > 0),
    [chars, data, saga.houseRules],
  );
  return (
    <Card title="Confidence & Faith" tour="table-confidence" fold="table-confidence" summary={`${rows.length} with points to spend.`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A Confidence Point spent adds +3 to a roll, up to the Confidence Score in points on one roll (DE p.52); the storyguide gives points back for a story, a great deed or
        good roleplaying. Faith Points are spent the same way when acting in accordance with God&apos;s will, and come back at dawn up to True Faith (DE p.419).
      </p>
      {rows.length === 0 && <Empty>Nobody in play has Confidence or Faith Points (grogs have none).</Empty>}
      {rows.map(({ c, d }) => (
        <div key={c.id} className="list-row small" style={{ flexWrap: 'wrap' }}>
          <Link to={R.character(saga.id, c)} style={{ minWidth: 120 }}>
            <b>{c.name || 'Unnamed'}</b>
          </Link>
          {c.type !== 'grog' && (
            <span className="row tight">
              Confidence {c.confidence.score}: <b>{c.confidence.points}</b> point{c.confidence.points === 1 ? '' : 's'}
              <button className="small" disabled={c.confidence.points < 1} title="+3 to one roll" onClick={() => updateCharacter(c.id, (x) => void (x.confidence.points -= 1))}>
                Spend 1 (+3)
              </button>
              <button className="small ghost" title="Given by the storyguide: after a story, a great deed, good roleplaying" onClick={() => updateCharacter(c.id, (x) => void (x.confidence.points += 1))}>
                Give 1
              </button>
            </span>
          )}
          {d.trueFaith > 0 && (
            <span className="row tight">
              True Faith {d.trueFaith}: <b>{d.faithPoints}</b> Faith Point{d.faithPoints === 1 ? '' : 's'}
              <button className="small" disabled={d.faithPoints < 1} onClick={() => updateCharacter(c.id, (x) => void (x.faith = { score: d.trueFaith, points: d.faithPoints - 1 }))}>
                Spend 1 (+3)
              </button>
              <button className="small ghost" disabled={d.faithPoints >= d.trueFaith} title="Each dawn, Faith Points come back up to the True Faith Score" onClick={() => updateCharacter(c.id, (x) => void (x.faith = { score: d.trueFaith, points: Math.max(d.faithPoints, d.trueFaith) }))}>
                Dawn
              </button>
            </span>
          )}
          {d.virtues.some((v) => v.cv.defId === 'all-according-to-plan') && (
            <span className="row tight">
              All According to Plan: {c.session?.aatpUsed ? 'used this session' : 'ready (reroll one botch die)'}
              <button className="small ghost" onClick={() => updateCharacter(c.id, (x) => void (x.session = { ...(x.session ?? {}), aatpUsed: !c.session?.aatpUsed }))}>
                {c.session?.aatpUsed ? 'New session' : 'Mark used'}
              </button>
            </span>
          )}
        </div>
      ))}
    </Card>
  );
}
