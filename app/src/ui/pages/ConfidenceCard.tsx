// Confidence and Faith at the table (DE p.52, p.419): everyone's points in one place, given at the end
// of a session, and Faith Points back at dawn. They are spent after a roll, under the roll (Dice,
// combat, spellcasting); the Spend buttons here are for dice rolled at the table, off the app. The
// sheet shows where each character stands; the points change here, in play.

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
        .filter(({ c, d }) => c.type !== 'grog' || d.trueFaith > 0 || d.faithPoints > 0),
    [chars, data, saga.houseRules],
  );
  const planners = rows.filter(({ d }) => d.virtues.some((v) => v.cv.defId === 'all-according-to-plan'));
  const newSession = () => {
    for (const { c } of planners) if (c.session?.aatpUsed) updateCharacter(c.id, (x) => void (x.session = { ...(x.session ?? {}), aatpUsed: false }));
  };
  return (
    <Card
      title="Confidence & Faith"
      tour="table-confidence"
      fold="table-confidence"
      summary={`${rows.length} with points to spend.`}
      actions={
        planners.some(({ c }) => c.session?.aatpUsed) ? (
          <button className="small ghost" onClick={newSession} title="All According to Plan is ready again for everyone">
            New session
          </button>
        ) : undefined
      }
    >
      <p className="small muted" style={{ marginTop: 0 }}>
        Spend points after seeing a roll, under the roll itself (Dice, combat, spellcasting): +3 a point, up to the Confidence Score on one roll, never on a botch nor on a
        season&apos;s roll. There is no limit to the points a character holds (DE p.52); the storyguide gives one or two at the end of a session for a contribution. Faith Points
        are spent the same way while acting in God&apos;s will, up to the True Faith Score on a roll (one at a time with no Score), and come back at dawn up to that Score (DE
        p.419); Communion, a pilgrimage or a holy deed can give more. The Spend buttons here are for dice rolled off the app.
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
          {(d.trueFaith > 0 || d.faithPoints > 0) && (
            <span className="row tight">
              {d.trueFaith > 0 ? `True Faith ${d.trueFaith}` : 'No True Faith Score'}: <b>{d.faithPoints}</b> Faith Point{d.faithPoints === 1 ? '' : 's'}
              <button className="small" disabled={d.faithPoints < 1} onClick={() => updateCharacter(c.id, (x) => void (x.faith = { score: d.trueFaith, points: d.faithPoints - 1 }))}>
                Spend 1 (+3)
              </button>
              {d.trueFaith > 0 && (
                <button className="small ghost" disabled={d.faithPoints >= d.trueFaith} title="Each dawn, Faith Points come back up to the True Faith Score" onClick={() => updateCharacter(c.id, (x) => void (x.faith = { score: d.trueFaith, points: Math.max(d.faithPoints, d.trueFaith) }))}>
                  Dawn
                </button>
              )}
              <button className="small ghost" title="From the sacraments, a pilgrimage or another holy endeavor (DE p.419)" onClick={() => updateCharacter(c.id, (x) => void (x.faith = { score: d.trueFaith, points: d.faithPoints + 1 }))}>
                Give 1
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
