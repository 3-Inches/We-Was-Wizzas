// When nothing is planned: the standing activity a free season goes to, and the year's seasons, at the
// Game Table (Seasons, a season in full).

import { useMemo } from 'react';
import { StandingEditor, teamOf } from '../StandingEditor';
import { teaches } from '../../../engine/covenfolk';
import { describeStanding } from '../../../engine/time';
import { deriveCharacter } from '../../../engine/character/derive';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { SeasonPlan } from '../SeasonPlan';
import { Card } from '../../kit';
import type { CharEditor } from '../useChar';

export function StandingCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, saga, ctx } = ed;
  const sagaChars = useSagaCharacters(c?.sagaId);
  const sagaCovs = useSagaCovenants(c?.sagaId);
  // covenant-mates, for teaching and help in the lab
  const rules = saga?.houseRules;
  const team = useMemo(() => (c && rules ? teamOf(c, sagaChars.filter((x) => !x.wanderer), sagaCovs, data, (x) => deriveCharacter(x, data, rules)) : undefined), [c, sagaChars, sagaCovs, data, rules]);
  if (!c || !d || !saga) return null;
  const year = saga.currentYear;
  return (
    <Card title="When nothing is planned" tour="standing" fold="standing" summary={`Standing activity: ${describeStanding(c, d, c.standing ?? { kind: 'auto' })}.`}>
      <div className="row small">
        <span>Standing activity:</span>
        <StandingEditor
          c={c}
          d={d}
          year={year}
          teachers={ctx.covenant?.specialists.filter((x) => teaches(x)) ?? []}
          library={ctx.covenant?.library}
          team={team}
          onChange={(st) => update((x) => void (x.standing = st))}
        />
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        What this character does with a free season when nobody planned one. Once the year&apos;s free seasons are used up, the rest go to work (Exposure) or Worship.
      </p>
      <SeasonPlan c={c} d={d} year={year} update={update} teachers={ctx.covenant?.specialists.filter((x) => teaches(x)) ?? []} team={team} />
    </Card>
  );
}
