// The Game Table's City & Guild page: everything from City & Guild (and Grogs' trips to market) in
// one place. A character's livelihood and guild, the covenant's craftsmen at work, sending someone to
// market, items that break, and travel, trade and intrigue.

import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { deriveCharacter, type DerivedCharacter } from '../../engine/character/derive';
import { CRAFTS, craftOf, countOf } from '../../engine/covenantRules';
import { characterCraftTraits, specialistCraftTraits } from '../../engine/craftTraits';
import { candidateWorth, findCraftsmen, hireCraftsman, hireOptions, letGo, overcomeTrait, savingOf } from '../../engine/hiring';
import type { GameData } from '../../data';
import { deriveCovenant, memberCraft } from '../../engine/covenant';
import { guildRanksApply } from '../../engine/covenfolk';
import { optionOn } from '../../engine/optional';
import { inPlay } from '../../engine/time';
import type { Character, Covenant, Season, Specialist } from '../../engine/types';
import { useGameData, usePlayerCharacters, usePlayerCovenants, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { useCharEditor } from '../character/useChar';
import { WorkshopCard } from '../character/sheet/WorkshopCard';
import { GuildCard } from '../character/sheet/GuildCard';
import { GuildLine, LaborLine } from '../covenant/FinancesTab';
import { Card, Empty, Field } from '../kit';
import { R } from '../routes';
import { MarketHaggle } from './MarketPage';
import { ItemCheck } from './DamagedGoods';
import { ResultLog, groupPeople } from '../play';
import { TraitBadges, worksAt } from '../covenant/CraftTraits';
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
  const allCovs = useSagaCovenants(sagaId);
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
            <CraftsmenAtWork cov={cov} guildsOn={optionOn(saga, 'guilds')} members={allChars.filter((m) => (cov.finances.craftWork ?? []).includes(m.id))} data={data} when={{ year: saga.currentYear, season: saga.currentSeason }} />
          </>
        )}
      </Card>

      {cov && <HiringCard cov={cov} chars={allChars} data={data} year={saga.currentYear} season={saga.currentSeason} tribunal={saga.tribunal} />}

      <MarketHaggle sagaId={saga.id} />

      <ItemCheck x={{ chars: allChars.filter((x) => !x.wounds.dead && x.creation.finalized), data, rules: saga.houseRules, groups: groupPeople(allChars.filter((x) => !x.wounds.dead && x.creation.finalized), allCovs) }} />

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
 * year's after the upkeep, those banked) and what they buy, under the guild rules their rank, and the
 * Virtues and Flaws that matter at their work. They are hired in the next card, and counted for the
 * savings on the covenant's People tab.
 */
function CraftsmenAtWork({ cov, guildsOn, members, data, when }: { cov: Covenant; guildsOn: boolean; members: Character[]; data: GameData; when: { year: number; season: Season } }) {
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
        banked when the year closes (Seasons, ending Winter), and spent here on Innovation and Raw Materials, which make better goods. A Virtue or Flaw that matters at the work
        is marked green or red, and the score they work at counts (✕ when a Flaw is got over in play). Hiring and letting go is the next card; what each saves the covenant is on
        its <Link to={R.covenant(cov.sagaId, cov.id, 'folk', 'people')}>People</Link> tab.
      </p>
      {craftsmen.length === 0 && members.length === 0 && <Empty>No craftsmen at {cov.name || 'the covenant'} yet: hire them in the next card, Hiring and letting go.</Empty>}
      {members.map((m) => {
        const best = memberCraft(m);
        return (
          <div key={m.id} className="list-row small" style={{ flexWrap: 'wrap' }}>
            <b style={{ minWidth: 130 }}>{m.name || 'Unnamed'}</b>
            <span>
              {best?.name} {best?.score}, a {m.type} making the covenant&apos;s wares (counted for the savings; set on the covenant&apos;s People tab, How the covenfolk live).
            </span>
            <TraitBadges traits={characterCraftTraits(m, data, best?.name)} />
            <Link to={R.guild(cov.sagaId, { who: m.id })}>Their workshop ›</Link>
          </div>
        );
      })}
      {craftsmen.map((s) => {
        const traits = specialistCraftTraits(s, data, craftOf(s)?.name);
        return (
          <div key={s.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
            <b style={{ minWidth: 130 }}>
              {s.name || craftOf(s)?.name || 'Craftsman'}
              {countOf(s) > 1 ? ` ×${countOf(s)}` : ''}
            </b>
            <span className="small muted">
              {s.name !== craftOf(s)?.name && craftOf(s) ? `${craftOf(s)!.name}, ` : ''}Craft {s.score}
              {worksAt(traits, s.score) ? `, ${worksAt(traits, s.score)}` : ''}
              {s.age ? `, aged ${s.age}` : ''}
            </span>
            <TraitBadges
              traits={traits.filter((t) => t.id !== 'wealthy' && t.id !== 'poor-flaw')}
              onRemove={(id) =>
                setter(s.uid)((x) => {
                  const t = traits.find((y) => y.id === id);
                  overcomeTrait(x, id, when.year, when.season, `${t?.name ?? id} no longer counts at the work`);
                })
              }
            />
            {guild && <GuildLine s={s} set={setter(s.uid)} enforced={guild === 'enforced'} />}
            <LaborLine s={s} set={setter(s.uid)} />
          </div>
        );
      })}
    </>
  );
}

/**
 * Hiring and letting go (City & Guild; Covenants ch.5): where another craftsman would save the
 * covenant most, a few people of that craft who would come, met at random with what helps and
 * hurts them at the work, and what each would save. Hired in play they cost no Build Points, only a
 * place among the inhabitants. Any craftsman can be let go from the fold at the card's foot.
 */
function HiringCard({ cov, chars, data, year, season, tribunal }: { cov: Covenant; chars: Character[]; data: GameData; year: number; season: Season; tribunal?: string }) {
  const updateCovenant = useStore((s) => s.updateCovenant);
  const members = useMemo(() => chars.filter((c) => cov.memberIds.includes(c.id)), [chars, cov.memberIds]);
  const labs = useMemo(() => deriveCovenant(cov, data, chars).labs, [cov, data, chars]);
  const options = useMemo(() => hireOptions(cov, members, labs), [cov, members, labs]);
  const [craftId, setCraftId] = useState('');
  const [found, setFound] = useState<Specialist[]>([]);
  const [said, setSaid] = useState<string[]>([]);
  const chosen = craftId || options[0]?.craft.id || 'carpenter';
  const craftsmen = cov.specialists.filter((s) => s.role === 'craftsman' && !s.hired);
  const look = () => setFound(findCraftsmen(cov, chosen, Math.random, { tribunal, taken: chars.map((c) => c.name) }));
  return (
    <Card title="Hiring and letting go" tour="cg-hiring" fold="cg-hiring" summary={options.length ? `Another ${options[0].craft.name.toLowerCase()} would save about ${options[0].saving} £ a year.` : 'No craft would save more money just now.'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Craftsmen are people met at random: some are lucky in their hands and eyes, some are not. Hired in play they cost no Build Points (only what any inhabitant costs: a place at
        table, and the Wages line), so a covenant can take on more as it grows, replace one who grows old, or one a Flaw holds back. What helps and hurts each at the work is marked
        green and red; the score they work at sets what they save and earn. The Tribunal&apos;s covenants do the same at the end of each year.
      </p>
      <div className="row small">
        <Field label="Look for" hint="Crafts where one more would save money come first">
          <select value={chosen} onChange={(e) => (setCraftId(e.target.value), setFound([]))}>
            {options.length > 0 && (
              <optgroup label="Would save money">
                {options.map((o) => (
                  <option key={o.craft.id} value={o.craft.id}>
                    {o.craft.name}: about {o.saving} £ a year
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Any craft">
              {CRAFTS.filter((c) => !options.some((o) => o.craft.id === c.id)).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.categories.length ? '' : ' (no savings)'}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <button className="small primary" onClick={look} data-tour="cg-hire-look">
          {found.length ? 'Look again' : 'Look for a craftsman'}
        </button>
      </div>
      {found.map((s) => {
        const traits = specialistCraftTraits(s, data, craftOf(s)?.name);
        const w = candidateWorth(s);
        const saving = savingOf(cov, members, labs, s);
        return (
          <div key={s.uid} className="list-row small" style={{ flexWrap: 'wrap' }}>
            <b style={{ minWidth: 110 }}>{s.name}</b>
            <span>
              aged {s.age}, Craft {s.score}, Dexterity {s.chars?.Dex ?? 0}
              {w.works !== s.score ? `; works at ${w.works}` : ''}; {w.labor} Labor Points a season; saves {saving > 0 ? `about ${saving} £ a year` : 'nothing more just now'}
            </span>
            <TraitBadges traits={traits} />
            <button
              className="small"
              onClick={() => {
                let line = '';
                updateCovenant(cov.id, (x) => void (line = hireCraftsman(x, s, year, season)));
                setFound((xs) => xs.filter((y) => y.uid !== s.uid));
                setSaid((l) => [`${line} Undo takes it back.`, ...l]);
              }}
            >
              Hire
            </button>
          </div>
        );
      })}
      {craftsmen.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary className="small">Let one go ({craftsmen.reduce((t, s) => t + countOf(s), 0)} craftsmen)</summary>
          {craftsmen.map((s) => {
            const traits = specialistCraftTraits(s, data, craftOf(s)?.name);
            return (
              <div key={s.uid} className="list-row small" style={{ flexWrap: 'wrap' }}>
                <b style={{ minWidth: 110 }}>
                  {s.name || craftOf(s)?.name}
                  {countOf(s) > 1 ? ` ×${countOf(s)}` : ''}
                </b>
                <span>
                  {craftOf(s)?.name}, Craft {s.score}
                  {worksAt(traits, s.score) ? `, ${worksAt(traits, s.score)}` : ''}
                  {s.age ? `, aged ${s.age}` : ''}
                </span>
                <TraitBadges traits={traits} />
                <button
                  className="small ghost"
                  title="They leave the covenant. Build Points spent on them are not returned."
                  onClick={() => {
                    let line: string | undefined;
                    updateCovenant(cov.id, (x) => void (line = letGo(x, s.uid)));
                    if (line) setSaid((l) => [`${line} Undo takes it back.`, ...l]);
                  }}
                >
                  Let go
                </button>
              </div>
            );
          })}
        </details>
      )}
      <ResultLog lines={said} />
    </Card>
  );
}
