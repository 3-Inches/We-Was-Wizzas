// One character's season in full, on Game Table › Seasons: the cards that apply to them, in the order
// seasonCards gives (their own work, the plan, the record, the Mysteries and writing), and a folded line
// for each card left out, saying why.

import { Fragment, type ReactNode } from 'react';
import type { Character } from '../../engine/types';
import type { CharEditor } from '../character/useChar';
import { AtTable } from '../play';
import { seasonCards, type SeasonCard } from './seasonCards';
import { HedgeSeasonCards } from './HedgePart';
import { HolyWorksCard } from './holy/HolyWorksCard';
import { DevotionSeasonsCard } from './DevotionSeasonsCard';
import { MasonSeasonCard } from './MasonSeasonCard';
import { WorkshopCard } from '../character/sheet/WorkshopCard';
import { LabProjects } from '../character/sheet/LabProjects';
import { OriginalResearch } from '../character/sheet/OriginalResearch';
import { LongevityCard } from '../character/sheet/LabItemsTab';
import { ApprenticeCard } from '../character/sheet/ApprenticeCard';
import { PlanSeasonCard } from '../character/sheet/PlanSeasonCard';
import { StandingCard } from '../character/sheet/StandingCard';
import { PrioritiesCard } from '../character/sheet/PrioritiesCard';
import { SpellMasteryCard } from '../character/sheet/SpellMastery';
import { InsightCard } from '../character/sheet/InsightCard';
import { SeasonLogCard } from '../character/sheet/SeasonLogCard';
import { AgingCard } from '../character/sheet/AgingCard';
import { MysteriesCard } from '../character/sheet/MysteriesCard';
import { WritingCard } from '../character/sheet/Writing';

export function SeasonInFull({ ed, chars }: { ed: CharEditor; chars: Character[] }) {
  if (!ed.c || !ed.d || !ed.saga) return null;
  const { c, d } = ed;
  const mt = d.abilities.find((a) => a.abilityId === d.theoryAbility)?.total ?? 0;
  // the cards that apply to this character, in the owner's order: their own work, the plan, the record, the rest
  const { shown, hidden } = seasonCards(c, d, ed.saga, ed.ctx.covenant);
  const draw: Record<SeasonCard, () => ReactNode> = {
    hedge: () => <HedgeSeasonCards ed={ed} aura={ed.ctx.aura} />,
    holy: () => <HolyWorksCard ed={ed} aura={ed.ctx.aura} />,
    devotion: () => <DevotionSeasonsCard ed={ed} />,
    mason: () => <MasonSeasonCard ed={ed} />,
    workshop: () => <WorkshopCard ed={ed} where="seasons" />,
    lab: () => <LabProjects ed={ed} />,
    research: () => <OriginalResearch ed={ed} magicTheory={mt} />,
    longevity: () => <LongevityCard ed={ed} />,
    apprentice: () => <ApprenticeCard ed={ed} />,
    plan: () => <PlanSeasonCard ed={ed} />,
    standing: () => <StandingCard ed={ed} />,
    priorities: () => <PrioritiesCard c={c} d={d} ctx={ed.ctx} saga={ed.saga!} data={ed.data} chars={chars} update={ed.update} />,
    mastery: () => <SpellMasteryCard ed={ed} />,
    insight: () => <InsightCard ed={ed} />,
    log: () => <SeasonLogCard ed={ed} />,
    aging: () => <AgingCard ed={ed} />,
    mysteries: () => <MysteriesCard ed={ed} />,
    writing: () => <WritingCard ed={ed} />,
  };
  return (
    <AtTable>
      <div className="stack">
        {shown.map(({ card }) => (
          <Fragment key={card}>{draw[card]()}</Fragment>
        ))}
        {hidden.length > 0 && (
          <details className="small muted" data-tour="season-hidden">
            <summary>
              Not open to {c.name || 'this character'}, so not shown ({hidden.length})
            </summary>
            <ul style={{ margin: '4px 0 0' }}>
              {hidden.map((h) => (
                <li key={h.what}>
                  {h.what}: {h.why}.
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </AtTable>
  );
}
