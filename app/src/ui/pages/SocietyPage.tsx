// Society & the Tribunal, a Game Table page of its own: the news and politics (the Tribunal's covenants
// coming to the players, their news, what the players' agents heard, the gathering to come and the
// motions to vote on), the agents themselves (won over, strengthened, asked), and society's rules for
// one character (a debate, a petition, a court, etiquette, the Tribunal's customs).

import { useMemo, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { tribunalBook } from '../../data/livingCovenants';
import { maxAgents } from '../../engine/agency';
import { deriveCharacter } from '../../engine/character/derive';
import { gatheringSeason, nextGatherings } from '../../engine/living';
import { optionOn } from '../../engine/optional';
import type { Character } from '../../engine/types';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { AgencyCard } from '../character/sheet/AgencyCard';
import { SocietyCard } from '../character/sheet/SocietyCard';
import { TribunalCard } from '../character/sheet/TribunalCard';
import { useCharEditor, type CharEditor } from '../character/useChar';
import { Card, Empty, Field, Tabs } from '../kit';
import { AtTable, PeopleOptions, canPlay, groupPeople, useLandOn } from '../play';
import { R } from '../routes';
import { NewsCard } from './TribunalPage';
import { MotionsCard } from './TribunalVotes';

export const SOCIETY_SUBS = ['news', 'agents', 'society'] as const;
export type SocietySub = (typeof SOCIETY_SUBS)[number];
const LABELS: Record<SocietySub, string> = { news: 'News & politics', agents: 'Agents', society: 'Debates, petitions & customs' };

const social = (c: Character) => c.type !== 'grog';

/** A character's own cards, at the table. */
function CharAtTable({ sagaId, charId, children }: { sagaId: string; charId: string; children: (ed: CharEditor) => ReactNode }) {
  const ed = useCharEditor({ sagaId, charId });
  if (!ed.c || !ed.d) return null;
  return <AtTable>{children(ed)}</AtTable>;
}

export default function SocietyPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId);
  const covs = useSagaCovenants(sagaId);
  useLandOn();
  const [params, setParams] = useSearchParams();
  const raw = params.get('sub');
  const sub: SocietySub = (SOCIETY_SUBS as readonly string[]).includes(raw ?? '') ? (raw as SocietySub) : 'news';
  const groups = useMemo(() => groupPeople(chars.filter((c) => canPlay(c) && social(c)), covs), [chars, covs]);
  const people = groups.flatMap((g) => g.people);
  const whoId = params.get('who') ?? '';
  const who = people.find((c) => c.id === whoId) ?? people.find((c) => !c.npc && covs.some((cov) => !cov.living && cov.memberIds.includes(c.id))) ?? people[0];
  const set = (k: 'sub' | 'who', v?: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v && !(k === 'sub' && v === 'news')) n.set(k, v);
        else n.delete(k);
        return n;
      },
      { replace: true },
    );
  if (!saga) return <Empty>Saga not found.</Empty>;
  const book = tribunalBook(saga.tribunal);
  const living = covs.some((c) => c.living);
  const reports = (saga.tribunalNews ?? []).filter((n) => n.kind === 'report');
  // the players' people with agents, for the agencies at a glance
  const principals = chars.filter((c) => canPlay(c) && (c.agents?.length ?? 0) > 0 && covs.some((cov) => !cov.living && cov.memberIds.includes(c.id)));
  const picker = (label: string) =>
    people.length ? (
      <Field label={label}>
        <select value={who?.id ?? ''} onChange={(e) => set('who', e.target.value)}>
          <PeopleOptions groups={groups} />
        </select>
      </Field>
    ) : (
      <Empty>Nobody in this saga but grogs.</Empty>
    );

  return (
    <div className="stack">
      <Tabs tabs={SOCIETY_SUBS.map((id) => ({ id, label: LABELS[id] }))} value={sub} onChange={(t) => set('sub', t)} />

      {sub === 'news' && (
        <>
          <NewsCard saga={saga} covs={covs} chars={chars} />
          <Card title={`What the agents heard${reports.length ? ` (${reports.length})` : ''}`} tour="agent-reports" fold="agent-reports" summary={reports[0]?.text ?? 'Nothing yet.'}>
            {reports.length === 0 ? (
              <div className="small muted">
                Nothing yet. Each season, an agent bound to one of the players&apos; characters may send word of what they heard: the Tribunal&apos;s covenants&apos; own business, or
                what their walk of life hears. <button className="small ghost" onClick={() => set('sub', 'agents')}>The agents ›</button>
              </div>
            ) : (
              reports.slice(0, 16).map((n) => (
                <div key={n.uid} className="list-row small">
                  <span className="muted" style={{ minWidth: 96 }}>
                    {n.season} {n.year}
                  </span>
                  <span style={{ flex: '1 1 260px' }}>{n.text}</span>
                </div>
              ))
            )}
          </Card>
          {book && (
            <Card title="The gatherings to come" tour="society-gatherings">
              {nextGatherings(saga, saga.currentYear)
                .slice(0, 3)
                .map((g) => (
                  <div key={`${g.name}${g.year}`} className="list-row small">
                    <b>{g.name}</b>
                    <span>
                      {g.house ? 'Summer' : gatheringSeason(book)} {g.year} at {g.at}
                    </span>
                    {g.year === saga.currentYear && <span className="badge warn">this year</span>}
                  </div>
                ))}
              <p className="small muted" style={{ marginBottom: 0 }}>
                The motions below come before the Tribunal&apos;s next gathering; the players&apos; magi set their votes ahead of it. The covenants, their magi and the book&apos;s lore are on
                the <Link to={R.tribunal(saga.id)}>Tribunal page</Link>.
              </p>
            </Card>
          )}
          {book && living && <MotionsCard book={book} saga={saga} chars={chars} covs={covs} />}
          {!book && !living && (
            <p className="small muted">
              This saga has no Tribunal book with living covenants: news and motions come from them. Add them on the <Link to={R.tribunal(saga.id)}>Tribunal page</Link>.
            </p>
          )}
        </>
      )}

      {sub === 'agents' && (
        <>
          {!optionOn(saga, 'agents') && (
            <p className="small muted">
              Agents are an optional rule (Houses of Hermes: Societates), off in this saga: <Link to={R.saga(saga.id, 'optional')}>Saga Overview › Optional rules</Link>.
            </p>
          )}
          {principals.length > 0 && (
            <Card title="The agencies" tour="agencies">
              {principals.map((c) => {
                const bound = (c.agents ?? []).filter((a) => a.resistance <= 0 && a.bond >= 0);
                const winning = (c.agents ?? []).filter((a) => a.resistance > 0);
                return (
                  <div key={c.id} className="list-row small">
                    <button className={`small ${who?.id === c.id ? 'primary' : 'ghost'}`} onClick={() => set('who', c.id)}>
                      {c.name || 'Unnamed'}
                    </button>
                    <span>
                      {bound.length} of {maxAgents(deriveCharacter(c, data, saga.houseRules))} agents{bound.length ? `: ${bound.map((a) => `${a.name || 'unnamed'} (${a.bondTrait} ${a.bond >= 0 ? '+' : ''}${a.bond})`).join(', ')}` : ''}
                      {winning.length ? `; winning over ${winning.map((a) => a.name || 'someone').join(', ')}` : ''}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
          <div className="row">{picker('Whose agents')}</div>
          {who && optionOn(saga, 'agents') && (
            <CharAtTable key={who.id} sagaId={saga.id} charId={who.id}>
              {(ed) => <AgencyCard ed={ed} />}
            </CharAtTable>
          )}
        </>
      )}

      {sub === 'society' && (
        <>
          <div className="row">
            {picker('Who')}
            {who && (
              <Link to={R.character(saga.id, who, 'overview')} className="small">
                {who.name || 'Their'} sheet ›
              </Link>
            )}
          </div>
          {!['debate', 'petitions', 'courts', 'etiquette'].some((id) => optionOn(saga, id)) && !saga.tribunal && (
            <p className="small muted">
              None of the society rules is on in this saga: debates, petitions, courts and etiquette are optional rules (<Link to={R.saga(saga.id, 'optional')}>Saga Overview › Optional rules</Link>).
            </p>
          )}
          {who && (
            <CharAtTable key={who.id} sagaId={saga.id} charId={who.id}>
              {(ed) => (
                <>
                  <SocietyCard ed={ed} />
                  <TribunalCard ed={ed} />
                </>
              )}
            </CharAtTable>
          )}
        </>
      )}
    </div>
  );
}
