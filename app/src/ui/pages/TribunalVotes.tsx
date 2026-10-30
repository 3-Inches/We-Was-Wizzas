// The Tribunal page's business between gatherings: the motions the next gathering will vote on (with
// each gild's and covenant's stand, how the sigils would fall as things stand, and the players' magi's
// votes, set here), the votes so far, and the magi who belong to no covenant, whom the players'
// covenant may take in.

import { Link } from 'react-router-dom';
import type { BookMotion, TribunalBook } from '../../data/livingCovenants';
import { seeded } from '../../engine/generate/random';
import { gatheringSeason, nextGatherings } from '../../engine/living';
import { RHINE_GILDS } from '../../engine/tribunal';
import { gatheringVoters, playersCovenant, rhineCustoms, voteOn, welcomeWanderer, type Stand } from '../../engine/tribunalLife';
import type { Character, Covenant, Saga } from '../../engine/types';
import { useStore } from '../../store/store';
import { BookBadge, Card } from '../kit';

const STAND_BADGE: Record<string, string> = { for: 'good', against: 'bad', split: '' };
const gildTree = (id: string) => RHINE_GILDS.find((g) => g.id === id)?.tree ?? id;

/** The players' covenant takes a wanderer in: the records it touches, changed on copies and saved together. */
export function useTakeIn(covs: Covenant[]) {
  const putRecords = useStore((s) => s.putRecords);
  const setNotice = useStore((s) => s.setNotice);
  return (c: Character, ours: Covenant, saga: Saga, then?: () => void) => {
    const who = structuredClone(c);
    const all = covs.map((x) => (x.id === ours.id || x.id === c.covenantId ? structuredClone(x) : x));
    const text = welcomeWanderer(who, all.find((x) => x.id === ours.id)!, all, saga.currentYear, saga.currentSeason);
    putRecords({ characters: [who], covenants: all.filter((x) => x.id === ours.id || x.id === c.covenantId) }, `taking in ${c.name}`);
    then?.();
    setNotice(text);
  };
}

/** The motions before the next gathering, and the votes so far. */
export function MotionsCard({ book, saga, chars, covs }: { book: TribunalBook; saga: Saga; chars: Character[]; covs: Covenant[] }) {
  const updateSaga = useStore((s) => s.updateSaga);
  const motions = book.motions ?? [];
  if (!motions.length) return null;
  const S = `/saga/${saga.id}`;
  const votes = saga.tribunalVotes ?? [];
  const customs = rhineCustoms(saga);
  const next = nextGatherings(saga, saga.currentYear)[0]?.year ?? saga.currentYear;
  const voters = gatheringVoters(book, chars, covs, votes, customs);
  const ours = voters.filter((v) => v.players);
  const passed = new Set(votes.filter((v) => v.passed).map((v) => v.motionId));
  const voted = new Set(votes.map((v) => v.motionId));
  // the motions due at the next gathering, and those that may come up again there
  const coming = motions.filter((m) => !passed.has(m.id) && (m.year === next || (m.year < next && (m.again ?? 0) > 0)));
  const set = (m: BookMotion, id: string, s: Stand) =>
    updateSaga(saga.id, (x) => {
      x.playerVotes = { ...(x.playerVotes ?? {}), [m.id]: { ...(x.playerVotes?.[m.id] ?? {}), [id]: s } };
    });
  // how the sigils would fall as things stand: the mean of a few draws (some magi go their own way)
  const outlook = (m: BookMotion) => {
    const runs = Array.from({ length: 12 }, (_, i) => voteOn(m, voters, saga, next, seeded(i + 1), customs));
    const mean = (k: 'for' | 'against' | 'abstain') => Math.round(runs.reduce((t, r) => t + r[k], 0) / runs.length);
    return { for: mean('for'), against: mean('against'), abstain: mean('abstain'), carries: runs.filter((r) => r.passed).length / runs.length };
  };
  const covName = (id: string) => (id === 'wanderers' ? 'Wanderers' : covs.find((c) => c.id === id)?.name ?? id);
  return (
    <Card title={`Motions and votes · ${gatheringSeason(book)} ${next}`} tour="tribunal-votes">
      <p className="small muted" style={{ marginTop: 0 }}>
        The motions the book has coming before the Tribunal. Every magus of a living covenant votes their covenant’s way where the book gives one, else their gild’s{customs ? '' : ' (with the Rhine’s customs off, there are no gild stands: one sigil each, cast their own way)'};
        {customs ? ' a master holds a retired magus’s sigil by proxy, an archmage two, and House Tremere’s exarchs cast the sigils of the rest of the House.' : ''} Your magi vote as you set them here
        (unset, they abstain).
      </p>
      {!coming.length && <div className="small muted">Nothing of the book’s comes before the gathering of {next}.</div>}
      {coming.map((m) => {
        const o = outlook(m);
        return (
          <details key={m.id} className="list-row" style={{ display: 'block' }}>
            <summary>
              <b>{m.title}</b>{' '}
              <span className="small muted">
                {m.year === next ? `at the gathering of ${next}` : `${voted.has(m.id) ? 'defeated before' : `due in ${m.year}, before the saga`}; ${m.again}% a gathering that it comes up again`}
              </span>{' '}
              <span className={`badge ${o.carries >= 0.5 ? 'good' : 'bad'}`}>
                as things stand: {o.for} for, {o.against} against
              </span>
            </summary>
            <p className="small" style={{ margin: '4px 0' }}>
              {m.text} <BookBadge book={book.book} line={m.line} />
            </p>
            <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {customs &&
                Object.entries(m.gilds).map(([g, s]) => (
                  <span key={g} className={`badge ${STAND_BADGE[s!]}`}>
                    {gildTree(g)}: {s}
                  </span>
                ))}
              {Object.entries(m.covenants ?? {}).map(([k, s]) => (
                <span key={k} className={`badge ${STAND_BADGE[s!]}`}>
                  {book.covenants.find((c) => c.id === k)?.name ?? k}: {s}
                </span>
              ))}
            </div>
            <div className="small" style={{ marginTop: 4 }}>
              If it carries: {m.passed} If not: {m.failed}
            </div>
            {ours.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {ours.map((v) => (
                  <label key={v.c.id} className="inline small" style={{ marginRight: 10 }}>
                    <Link to={`${S}/character/${v.c.id}`}>{v.c.name}</Link> ({v.sigils} sigil{v.sigils === 1 ? '' : 's'}){' '}
                    <select value={saga.playerVotes?.[m.id]?.[v.c.id] ?? 'abstain'} onChange={(e) => set(m, v.c.id, e.target.value as Stand)} aria-label={`${v.c.name}'s vote on ${m.title}`}>
                      <option value="for">for</option>
                      <option value="against">against</option>
                      <option value="abstain">abstains</option>
                    </select>
                  </label>
                ))}
              </div>
            )}
          </details>
        );
      })}
      {votes.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary className="small">The votes so far ({votes.length})</summary>
          {votes.map((v) => (
            <details key={v.uid} className="small" style={{ marginLeft: 8 }}>
              <summary>
                {v.year}: <b>{v.title}</b> <span className={`badge ${v.passed ? 'good' : 'bad'}`}>{v.passed ? 'carried' : 'defeated'}</span> {v.for} for, {v.against} against
                {v.abstain ? `, ${v.abstain} not cast` : ''}
              </summary>
              {Object.entries(v.byCovenant).map(([id, t]) => (
                <div key={id} style={{ marginLeft: 12 }}>
                  {covName(id)}: {t.for} for, {t.against} against
                </div>
              ))}
            </details>
          ))}
        </details>
      )}
    </Card>
  );
}

/** The Tribunal's magi who belong to no covenant: where each is now, and taking one in. */
export function WanderersCard({ book, saga, chars, covs }: { book: TribunalBook; saga: Saga; chars: Character[]; covs: Covenant[] }) {
  const takeIn = useTakeIn(covs);
  const S = `/saga/${saga.id}`;
  // the book's wanderers first, then the peregrinatores by where they stay
  const fromBook = new Set((book.wanderers ?? []).map((w) => w.name));
  const where = (c: Character) => covs.find((x) => x.id === c.covenantId)?.name ?? '~';
  const wanderers = chars
    .filter((c) => c.wanderer && !c.wounds.dead)
    .sort((a, b) => Number(fromBook.has(b.name)) - Number(fromBook.has(a.name)) || where(a).localeCompare(where(b)) || a.name.localeCompare(b.name));
  const missing = (book.wanderers ?? []).filter((w) => !chars.some((c) => c.name === w.name));
  const ours = playersCovenant(covs, chars);
  if (!wanderers.length && !missing.length) return null;
  const customs = rhineCustoms(saga);
  return (
    <Card title="Wanderers" tour="tribunal-wanderers">
      <p className="small muted" style={{ marginTop: 0 }}>
        Magi who belong to no covenant. A peregrinator stays a few years at each covenant as its guest and moves on; a seasonal wanderer winters at one and spends the summer on the
        road. Each keeps a laboratory of their own wherever they stay{customs ? ', and pays the host three pawns of vis a year or a season’s service, under the Rhine’s guest-laws. Around a sixth of the Rhine’s magi live so: each covenant added brings its guests, and more come from other Tribunals while fewer do' : ''}.
      </p>
      {wanderers.map((c) => {
        const w = c.wanderer!;
        const host = covs.find((x) => x.id === c.covenantId);
        return (
          <div key={c.id} className="list-row" style={{ flexWrap: 'wrap' }}>
            <Link to={`${S}/character/${c.id}`}>
              <b>{c.name}</b>
            </Link>
            <span className="small">
              {w.wanders === 'peregrinator' ? `peregrinator (stays about ${w.stay ?? 3} years${w.favors === 'young' ? ', favoring young covenants' : ''})` : `winters at ${covs.find((x) => x.living?.key === w.winters)?.name ?? book.covenants.find((x) => x.id === w.winters)?.name ?? 'a covenant'}, summers on the road`}
            </span>
            <span className="small muted">
              {host ? `at ${host.name}${host.living ? '' : ' (yours)'} since ${w.since}` : 'on the road'}
              {w.welcome && w.welcome !== c.covenantId ? `; welcome at ${covs.find((x) => x.id === w.welcome)?.name} for the winter` : ''}
            </span>
            {ours && c.covenantId !== ours.id && w.welcome !== ours.id && (
              <button className="small" style={{ marginLeft: 'auto' }} onClick={() => takeIn(c, ours, saga)} title={w.wanders === 'peregrinator' ? 'They come now, as a guest' : 'They come for the winter'}>
                Take in at {ours.name}
              </button>
            )}
          </div>
        );
      })}
      {missing.map((w) => (
        <div key={w.name} className="list-row small muted">
          <b>{w.name}</b> comes with {book.covenants.find((x) => x.id === w.startsAt)?.name ?? 'their covenant'} when it is added. <BookBadge book={book.book} line={w.line} />
        </div>
      ))}
    </Card>
  );
}
