// The sheet's Advancement tab: the record of a character's seasons and aging. A season is planned, and
// aging rolled out of turn, at the Game Table (Seasons, a season in full).

import { R } from '../../routes';
import { Link } from 'react-router-dom';
import { Card } from '../../kit';
import type { CharEditor } from '../useChar';
import { isTrade } from '../../../engine/workshop';
import { TwilightCard } from './Twilight';
import { loggedThisSeason } from '../../../engine/time';
import { MysteriesCard } from './MysteriesCard';
import { RollAtTable } from '../../play';
import { SeasonLogCard } from './SeasonLogCard';
import { AgingCard } from './AgingCard';

export default function AdvancementTab({ ed }: { ed: CharEditor }) {
  const { c, d, saga } = ed;
  if (!c || !d || !saga) return null;
  const year = saga.currentYear;
  const season = saga.currentSeason;
  return (
    <div className="stack">
      <Card title={`${season} ${year}`} tour="season-at-table">
        <p className="small" style={{ margin: 0 }}>
          {loggedThisSeason(c, year, season).length ? `This season: ${loggedThisSeason(c, year, season).map((e) => e.summary).join('; ')}.` : 'Nothing is logged for this season yet; their standing activity is done when it ends.'}
        </p>
        <RollAtTable sagaId={saga.id} who={c.id} where="seasons" what="The season is planned (study, teaching, lab work, writing, an Initiation, what to do when nothing is planned), and aging rolled out of turn," />
      </Card>
      <SeasonLogCard ed={ed} />
      <div className="grid grid-2">
        <AgingCard ed={ed} />
        <TwilightCard ed={ed} />
        <MysteriesCard ed={ed} />
        <LivelihoodLine ed={ed} />
      </div>
    </div>
  );
}

/** A working character's livelihood, kept on the Game Table's City & Guild page: here, where it stands. */
function LivelihoodLine({ ed }: { ed: CharEditor }) {
  const { c, saga } = ed;
  if (!c || !saga) return null;
  const trade = c.abilities.some((a) => isTrade(a.abilityId));
  if (!c.workshop && !trade && !c.guild) return null;
  return (
    <Card title="Livelihood & guild (City & Guild)">
      <p className="small" style={{ margin: 0 }}>
        {c.workshop ? `${c.workshop.laborPoints} Labor Points banked; Innovation ${c.workshop.innovation}, Raw Materials ${c.workshop.rawMaterials}. ` : 'Their livelihood is not tracked yet. '}
        {c.guild ? `${c.guild.rank ? `${c.guild.rank[0].toUpperCase()}${c.guild.rank.slice(1)} of the` : 'Member of the'} ${c.guild.name}. ` : ''}
        Working a season, assistants, stories and investments, and the guild are on the Game Table&apos;s{' '}
        <Link to={R.guild(saga.id, { who: c.id })}>City &amp; Guild</Link> page.
      </p>
    </Card>
  );
}
