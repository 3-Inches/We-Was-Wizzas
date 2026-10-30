// What needs this character now, at the top of their sheet: wounds and Fatigue to recover from,
// illness, rules problems, a season with nothing planned, a Longevity Ritual wanted, and a Story
// or Personality Flaw that has not come up in play for a long while. Nothing shows when all is well.

import { Link } from 'react-router-dom';
import { validateCharacter } from '../../../engine/character/validate';
import { loggedThisSeason, resolveStanding } from '../../../engine/time';
import { Card } from '../../kit';
import type { CharEditor } from '../useChar';

export function NeedsYouCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga } = ed;
  if (!c || !d || !saga || !c.creation.finalized || c.wounds.dead) return null;
  const S = `/saga/${saga.id}/character/${c.id}`;
  const items: { text: string; tab: string; go: string }[] = [];
  const w = c.wounds;
  const hurt = [w.light && `${w.light} Light`, w.medium && `${w.medium} Medium`, w.heavy && `${w.heavy} Heavy`, w.incapacitating && `${w.incapacitating} Incapacitating`].filter(Boolean);
  if (hurt.length) items.push({ text: `Wounds to recover from: ${hurt.join(', ')}.`, tab: 'combat', go: 'Recovery' });
  if (c.longTermFatigueLost > 0) items.push({ text: `${c.longTermFatigueLost} Long-Term Fatigue level${c.longTermFatigueLost > 1 ? 's' : ''} lost.`, tab: 'combat', go: 'Fatigue' });
  if (c.illnesses?.length) items.push({ text: 'Ill: recovery rolls are due.', tab: 'combat', go: 'Illness' });
  const errs = validateCharacter(d, data, saga.houseRules).filter((i) => i.severity === 'error').length;
  if (errs) items.push({ text: `${errs} rules problem${errs > 1 ? 's' : ''} on the sheet.`, tab: 'rules', go: 'Rules check' });
  if (!loggedThisSeason(c, saga.currentYear, saga.currentSeason).length && resolveStanding(c, d, saga.currentYear).kind === 'none')
    items.push({ text: `Nothing planned for ${saga.currentSeason} ${saga.currentYear}.`, tab: 'advancement', go: 'Plan the season' });
  if (d.isMagus && !c.longevity && c.age >= 35) items.push({ text: `${c.age} and no Longevity Ritual: each year's aging roll is unguarded.`, tab: 'lab', go: 'Longevity' });
  // a Story or Personality Flaw not seen in play for three years or more
  const quiet = c.virtues
    .map((v) => ({ v, def: data.vfById.get(v.defId) }))
    .filter((x) => x.def?.kind === 'flaw' && x.def.categories.some((k) => k === 'Story' || k === 'Personality'))
    .filter((x) => saga.currentYear - (c.storiesTold?.[x.v.uid] ?? -Infinity) >= 3);
  if (quiet.length) items.push({ text: `Stories waiting: ${quiet.map((x) => x.def!.name).join(', ')} ${quiet.length > 1 ? 'have' : 'has'} not come up in play for a while.`, tab: 'overview', go: '' });
  if (!items.length) return null;
  return (
    <Card title="What needs you" className="accent">
      {items.map((i, n) => (
        <div key={n} className="list-row small">
          <span style={{ flex: '1 1 200px' }}>{i.text}</span>
          {i.go && <Link to={`${S}?tab=${i.tab}`}>{i.go} →</Link>}
        </div>
      ))}
      {quiet.length > 0 && <div className="small muted">Mark a story told on the Game table’s Stories waiting when it comes up.</div>}
    </Card>
  );
}
