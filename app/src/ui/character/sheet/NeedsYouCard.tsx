// What needs this character now, at the top of their sheet: wounds and Fatigue to recover from,
// illness, rules problems, a season with nothing planned, a Longevity Ritual wanted, a level of Spell
// Mastery with no ability chosen, and a Story or Personality Flaw that has not come up in play for a
// long while. Each links to where it is dealt with, mostly the Game Table. Nothing shows when all is well.

import { Link } from 'react-router-dom';
import { validateCharacter } from '../../../engine/character/validate';
import { loggedThisSeason, resolveStanding } from '../../../engine/time';
import { Card } from '../../kit';
import { tableLink } from '../../play';
import { R } from '../../routes';
import type { CharEditor } from '../useChar';
import { masteryToChoose } from './SpellMastery';

export function NeedsYouCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga } = ed;
  if (!c || !d || !saga || !c.creation.finalized || c.wounds.dead) return null;
  const items: { text: string; to: string; go: string }[] = [];
  const health = tableLink(saga.id, 'recovery', c.id);
  const w = c.wounds;
  const hurt = [w.light && `${w.light} Light`, w.medium && `${w.medium} Medium`, w.heavy && `${w.heavy} Heavy`, w.incapacitating && `${w.incapacitating} Incapacitating`].filter(Boolean);
  if (hurt.length) items.push({ text: `Wounds to recover from: ${hurt.join(', ')}.`, to: health, go: 'Health & recovery' });
  if (c.longTermFatigueLost > 0) items.push({ text: `${c.longTermFatigueLost} Long-Term Fatigue level${c.longTermFatigueLost > 1 ? 's' : ''} lost.`, to: health, go: 'Health & recovery' });
  if (c.illnesses?.length) items.push({ text: 'Ill: recovery rolls are due.', to: health, go: 'Health & recovery' });
  const errs = validateCharacter(d, data, saga.houseRules).filter((i) => i.severity === 'error').length;
  if (errs) items.push({ text: `${errs} rules problem${errs > 1 ? 's' : ''} on the sheet.`, to: R.character(saga.id, c, 'rules'), go: 'Rules check' });
  if (!loggedThisSeason(c, saga.currentYear, saga.currentSeason).length && resolveStanding(c, d, saga.currentYear).kind === 'none')
    items.push({ text: `Nothing planned for ${saga.currentSeason} ${saga.currentYear}.`, to: R.seasonsFor(saga.id, c.id, 'table-plan'), go: 'Plan the season' });
  if (d.isMagus && !c.longevity && c.age >= 35) items.push({ text: `${c.age} and no Longevity Ritual: each year's aging roll is unguarded.`, to: R.seasonsFor(saga.id, c.id, 'longevity'), go: 'Longevity' });
  const mastery = masteryToChoose(c.spells, d);
  if (mastery.length)
    items.push({ text: `Spell Mastery: choose the special ability for a new level of ${mastery.map((s) => s.spell.name).join(', ')}.`, to: R.seasonsFor(saga.id, c.id, 'spell-mastery'), go: 'Spell Mastery' });
  // a Story or Personality Flaw not seen in play for three years or more
  const quiet = c.virtues
    .map((v) => ({ v, def: data.vfById.get(v.defId) }))
    .filter((x) => x.def?.kind === 'flaw' && x.def.categories.some((k) => k === 'Story' || k === 'Personality'))
    .filter((x) => saga.currentYear - (c.storiesTold?.[x.v.uid] ?? -Infinity) >= 3);
  if (quiet.length) items.push({ text: `Stories waiting: ${quiet.map((x) => x.def!.name).join(', ')} ${quiet.length > 1 ? 'have' : 'has'} not come up in play for a while.`, to: '', go: '' });
  if (!items.length) return null;
  return (
    <Card title="What needs you" className="accent">
      {items.map((i, n) => (
        <div key={n} className="list-row small">
          <span style={{ flex: '1 1 200px' }}>{i.text}</span>
          {i.go && <Link to={i.to}>{i.go} →</Link>}
        </div>
      ))}
      {quiet.length > 0 && <div className="small muted">Mark a story told under Stories waiting, on the Game Table’s Overview, when it comes up.</div>}
    </Card>
  );
}
