// Game Table › Dice › Holy: the Divine at the table (Realms of Power: The Divine). Holy powers worked
// with a Method and a Power, a prayer for a miracle, God's aid, the saints and holy forbears, holy
// influence and tempers, the Divine Ascent, the Rings of Solomon, a Dominion rite, a celestial regio and
// a Minor amulet. What each costs (Confidence, Faith, Fatigue, wounds, Warping) goes on the sheet. The
// seasons of holy work (Major amulets, golems, True Names, Shinnui Shem) are on the Seasons page.
// Each card is in its own file in holy/.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { R } from '../routes';
import { isHolyCharacter, worksHolyEffects, holyWorksOpen } from '../../engine/holy';
import { auraAtTime, type AuraTime } from '../../engine/aura';
import type { AuraState } from '../../engine/magic';
import { Card } from '../kit';
import type { CharEditor } from '../character/useChar';
import { ChurchCards } from './ChurchPart';
import { churchCardsOpen } from '../../engine/church';
import { devotionSeasonWorks } from './DevotionSeasonsCard';
import { score, type Fellow, AuraPicker } from './holy/shared';
import { FaithLine, StandingCard } from './holy/StandingCard';
import { HolyPowerCard } from './holy/HolyPowerCard';
import { MiracleCard } from './holy/MiracleCard';
import { GodsAidCard } from './holy/GodsAidCard';
import { SaintsCard } from './holy/SaintsCard';
import { InfluenceCard } from './holy/InfluenceCard';
import { AscentCard } from './holy/AscentCard';
import { NotoriaCard } from './holy/NotoriaCard';
import { RitesCard } from './holy/RitesCard';

/** The holy page: one character's holy side, card by card. */
export default function HolyPart({ ed, fellows }: { ed: CharEditor; fellows: Fellow[] }) {
  const { c, d, ctx } = ed;
  const [auraSet, setAura] = useState<AuraState>(ctx.aura);
  const [when, setWhen] = useState<AuraTime>('day');
  const aura = auraAtTime(auraSet, when);
  // Warping just gained, for the Divine Ascent card
  const [gained, setGained] = useState(0);
  if (!c || !d) return null;
  const others = fellows.filter((f) => f.c.id !== c.id);
  // God's aid costs a Confidence Point (or a Faith Point): a grog, or one with Low Self-Esteem, has none to spend
  const aidBarred = !(d.trueFaith > 0 && d.faithPoints > 0) && (c.type === 'grog' || c.virtues.some((v) => v.defId === 'low-self-esteem-flaw'));
  const church = churchCardsOpen(c);
  // the cards that cannot apply, and why: one line at the foot of the page
  const hidden: [string, string][] = [
    ...(worksHolyEffects(d) ? [] : ([['holy powers', 'no Holy Method and Power that work together']] as [string, string][])),
    ...(d.faithPoints > 0 ? [] : ([['a prayer for a miracle', 'no Faith Points']] as [string, string][])),
    ...(aidBarred ? ([['God’s aid', c.type === 'grog' ? 'a grog has no Confidence to spend' : 'Low Self-Esteem: no Confidence to spend']] as [string, string][]) : []),
    ...(church.devotions ? [] : ([['Devotions', 'no Pious trait']] as [string, string][])),
    ...(church.mystic ? [] : ([['the mystic’s path', 'no Pious trait']] as [string, string][])),
    ...(isHolyCharacter(d) ? [] : ([['the Divine Ascent', 'no Holy Method, Power or Ars Notoria']] as [string, string][])),
    ...(score(d, 'ars-notoria') > 0 ? [] : ([['the Rings of Solomon', 'no Ars Notoria']] as [string, string][])),
  ];
  const seasonWorks = [...(holyWorksOpen(d).length ? ['holy work: Major amulets, golems, True Names, Shinnui Shem'] : []), ...devotionSeasonWorks(c, d)];
  return (
    <div className="stack">
      <Card title="Here and now" className="accent" tour="holy-here">
        <div className="row">
          <AuraPicker value={auraSet} onChange={setAura} when={when} setWhen={setWhen} />
          <FaithLine ed={ed} />
        </div>
      </Card>
      {seasonWorks.length > 0 && ed.saga && (
        <p className="small">
          A season&apos;s work ({seasonWorks.join(', ')}) is planned on{' '}
          <Link to={R.seasonsFor(ed.saga.id, c.id, 'table-plan')}>Game Table › Seasons, in {c.name ? `${c.name}’s` : 'their'} season in full ›</Link>
        </p>
      )}
      <StandingCard ed={ed} />
      {worksHolyEffects(d) && <HolyPowerCard ed={ed} aura={aura} fellows={others} onWarping={setGained} />}
      {d.faithPoints > 0 && <MiracleCard ed={ed} aura={aura} fellows={others} />}
      {!aidBarred && <GodsAidCard ed={ed} fellows={others} />}
      <SaintsCard ed={ed} aura={aura} />
      <ChurchCards ed={ed} />
      <InfluenceCard ed={ed} fellows={fellows} />
      {isHolyCharacter(d) && <AscentCard ed={ed} aura={aura} gained={gained} />}
      {score(d, 'ars-notoria') > 0 && <NotoriaCard ed={ed} />}
      <RitesCard ed={ed} aura={aura} />
      {hidden.length > 0 && (
        <p className="small muted" data-tour="holy-hidden">
          Not open to {c.name || 'this character'}, so not shown: {hidden.map(([what, why]) => `${what} (${why})`).join(', ')}.
        </p>
      )}
    </div>
  );
}
