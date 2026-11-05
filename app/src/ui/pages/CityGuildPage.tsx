// The Game Table's City & Guild page: everything from City & Guild (and Grogs' trips to market) in
// one place. A character's livelihood and guild, the covenant's craftsmen at work, sending someone to
// market, items that break, and travel, trade and intrigue.

import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { deriveCharacter, type DerivedCharacter } from '../../engine/character/derive';
import { craftOf, countOf } from '../../engine/covenantRules';
import { guildRanksApply } from '../../engine/covenfolk';
import { optionOn } from '../../engine/optional';
import { inPlay } from '../../engine/time';
import type { Character, Covenant, Specialist } from '../../engine/types';
import { useGameData, usePlayerCharacters, usePlayerCovenants, useSaga, useSagaCharacters } from '../../store/hooks';
import { useStore } from '../../store/store';
import { useCharEditor } from '../character/useChar';
import { WorkshopCard } from '../character/sheet/WorkshopCard';
import { GuildCard } from '../character/sheet/GuildCard';
import { GuildLine, LaborLine } from '../covenant/FinancesTab';
import { Card, Empty, Field } from '../kit';
import { R } from '../routes';
import { MarketHaggle } from './MarketPage';
import { ItemCheck } from './DicePage';
import { TravelTradeCard } from './TravelTradeCard';

/** A character who lives by a trade: a Craft or Profession, or a livelihood already tracked. */
const hasTrade = (c: Character) => !!c.workshop || c.abilities.some((a) => a.abilityId === 'craft-type' || a.abilityId === 'profession-type');

export default function CityGuildPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = usePlayerCharacters(sagaId);
  const allChars = useSagaCharacters(sagaId);
  const covs = usePlayerCovenants(sagaId);
  const tour = useStore((s) => s.ui.tour);
  // opened for a character or a covenant (from a sheet or a covenant's page)
  const [params] = useSearchParams();
  const [who, setWho] = useState(params.get('who') ?? '');
  const [covId, setCovId] = useState(params.get('cov') ?? '');
  const derived = useMemo(() => (saga ? new Map(chars.map((c) => [c.id, deriveCharacter(c, data, saga.houseRules)])) : new Map<string, DerivedCharacter>()), [chars, data, saga]);
  if (!saga) return <Empty>Saga not found.</Empty>;
  const playing = chars.filter(inPlay);
  const workers = playing.filter(hasTrade);
  // the character and covenant a tutorial is working on come first
  const c = workers.find((x) => x.id === who) ?? workers.find((x) => x.id === tour?.charId) ?? workers[0];
  const cov = covs.find((x) => x.id === covId) ?? covs.find((x) => x.id === tour?.covId) ?? covs[0];
  const home = cov ?? covs[0];
  const usesCG = saga.enabledBooks.length === 0 || saga.enabledBooks.includes('CG');
  return (
    <div className="stack">
      <p className="small muted" style={{ marginTop: 0 }}>
        City &amp; Guild is for characters who work for a living. A craftsman or merchant earns Labor Points in the seasons they work, pays a yearly upkeep, and saves the rest to make
        the business better; the covenant&apos;s own craftsmen do the same, more simply. Below: a character&apos;s livelihood and guild, the covenant&apos;s craftsmen at work, sending
        someone to market, items that break, and travel, trade and intrigue.
        {!usesCG && ' City & Guild is not among this saga’s books (Saga Overview → Books), so the toolkit keeps to what other books give.'}
      </p>

      <Card title="A character’s livelihood" tour="cg-livelihood" fold="cg-livelihood" summary={c ? `${c.name || 'Unnamed'}'s workshop and guild.` : 'No character with a trade yet.'}>
        {workers.length === 0 ? (
          <Empty>No character in play has a Craft or Profession. Give one a trade on their sheet (Abilities), or make a craftsman with Quick build.</Empty>
        ) : (
          <>
            <div className="row small">
              <Field label="Whose workshop" hint="Characters in play with a Craft or Profession">
                <select value={c?.id ?? ''} onChange={(e) => setWho(e.target.value)}>
                  {workers.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name || 'Unnamed'} ({x.type}){x.workshop ? ` · ${x.workshop.laborPoints} Labor Points` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              {c && <Link to={R.character(saga.id, c)}>Their sheet ›</Link>}
            </div>
            {c && <Livelihood key={c.id} sagaId={saga.id} charId={c.id} />}
          </>
        )}
      </Card>

      <Card title="The covenant’s craftsmen at work" tour="craftsmen-work" fold="cg-craftsmen" summary={cov ? `${cov.specialists.filter((s) => s.role === 'craftsman').reduce((t, s) => t + countOf(s), 0)} craftsmen at ${cov.name || 'the covenant'}.` : 'No covenant yet.'}>
        {!cov ? (
          <Empty>No covenant yet.</Empty>
        ) : (
          <>
            {covs.length > 1 && (
              <Field label="Covenant">
                <select value={cov.id} onChange={(e) => setCovId(e.target.value)}>
                  {covs.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name || 'Covenant'}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <CraftsmenAtWork cov={cov} guildsOn={optionOn(saga, 'guilds')} />
          </>
        )}
      </Card>

      <MarketHaggle sagaId={saga.id} />

      <ItemCheck x={{ chars: allChars.filter((x) => !x.wounds.dead && x.creation.finalized), data, rules: saga.houseRules }} />

      {playing.length > 0 && <TravelTradeCard people={playing} derived={derived} home={home} year={saga.currentYear} season={saga.currentSeason} />}
    </div>
  );
}

/** A character's workshop and guild, as on their sheet. */
function Livelihood({ sagaId, charId }: { sagaId: string; charId: string }) {
  const ed = useCharEditor({ sagaId, charId });
  if (!ed.c || !ed.d) return null;
  return (
    <div className="stack">
      <WorkshopCard ed={ed} />
      <GuildCard ed={ed} />
    </div>
  );
}

/**
 * The covenant's craftsmen at their work (City & Guild): each one's Labor Points (a season's, the
 * year's after the upkeep, those banked) and what they buy, and under the guild rules their rank. The
 * craftsmen themselves are hired and counted for the savings on the covenant's People tab.
 */
function CraftsmenAtWork({ cov, guildsOn }: { cov: Covenant; guildsOn: boolean }) {
  const updateCovenant = useStore((s) => s.updateCovenant);
  const craftsmen = cov.specialists.filter((s) => s.role === 'craftsman');
  const guild = guildRanksApply(cov, guildsOn);
  const setter = (uid: string) => (fn: (x: Specialist) => void) =>
    updateCovenant(cov.id, (c) => {
      const y = c.specialists.find((z) => z.uid === uid);
      if (y) fn(y);
    });
  return (
    <>
      <p className="small muted" style={{ margin: '0 0 6px' }}>
        Each craftsman earns Labor Points in the seasons they work: (Dexterity + Craft) × 3 a season over two seasons a year if average, × 2 over three if Poor, × 6 over one if
        Wealthy. A year&apos;s upkeep is 36 (and 5 for each point of Raw Materials), so an average craftsman needs Dexterity + Craft of 7 or more to save anything. What is left is
        banked when the year closes (Seasons, ending Winter), and spent here on Innovation and Raw Materials, which make better goods. Hiring them, and what they save the
        covenant, is on the covenant&apos;s <Link to={R.covenant(cov.sagaId, cov.id, 'folk', 'people')}>People</Link> tab.
      </p>
      {craftsmen.length === 0 && <Empty>No craftsmen at {cov.name || 'the covenant'} yet: hire them on its People tab.</Empty>}
      {craftsmen.map((s) => (
        <div key={s.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
          <b style={{ minWidth: 130 }}>
            {s.name || craftOf(s)?.name || 'Craftsman'}
            {countOf(s) > 1 ? ` ×${countOf(s)}` : ''}
          </b>
          <span className="small muted">
            Craft {s.score}
            {s.wealth ? `, ${s.wealth}` : ''}
          </span>
          {guild && <GuildLine s={s} set={setter(s.uid)} enforced={guild === 'enforced'} />}
          <LaborLine s={s} set={setter(s.uid)} />
        </div>
      ))}
    </>
  );
}
