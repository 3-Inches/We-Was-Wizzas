// The Tribunal: the covenants of the saga's Tribunal book, built into the saga as living covenants
// whose people carry on by themselves as the seasons pass. What they have brought to the players'
// covenant (offers, requests, trouble) and other news, the coming gatherings, each covenant with its
// magi and what they did last season, and the Great Library's rules for a visiting magus. A book with
// more (the Rhine's forests, places, timeline and saga ideas) has it on tabs of its own.

import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ARTS, ART_NAMES, type Art } from '../../data';
import { TRIBUNAL_BOOKS, tribunalBook, type BookCovenant, type TribunalBook } from '../../data/livingCovenants';
import { findEnchantment, findLabText, findSumma, libraryCredit, tractatusQuality, LAB_TEXT_EASE, type LibraryRank, type SpellKind } from '../../engine/greatLibrary';
import { approachChance, buyCopyFrom, gatheringSeason, livingCovenantSteps, nextGatherings, tradeWith, type Offer } from '../../engine/living';
import { playersCovenant, rhineCustoms } from '../../engine/tribunalLife';
import { bookVisPrice } from '../../engine/market';
import { visPriceOf } from '../../engine/economy';
import { RHINE_GILDS } from '../../engine/tribunal';
import type { Character, Covenant, Saga, TribunalNews } from '../../engine/types';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { BookBadge, Card, Confirm, Empty, Stepper, Tabs } from '../kit';
import { useTabParam } from '../useTabParam';
import type { LoreTab } from './TribunalLore';
import { HOUSES } from '../../data/houses';
import { MotionsCard, WanderersCard, useTakeIn } from './TribunalVotes';

const houseName = (id?: string) => HOUSES.find((h) => h.id === id)?.name ?? id ?? '';
const gildName = (id?: string) => RHINE_GILDS.find((g) => g.id === id)?.tree;
/** A seed from a text, so that a covenant comes out the same for the same saga. */
const seedOf = (s: string) => [...s].reduce((h, ch) => (h * 33 + ch.charCodeAt(0)) % 1_000_003, 5381);
const ATTITUDE: Record<string, string> = { ally: 'good', friendly: 'good', neutral: '', wary: 'warn', hostile: 'bad', enemy: 'bad' };
const TribunalLore = lazy(() => import('./TribunalLore'));
type TabId = 'covenants' | LoreTab;
const TABS: { id: TabId; label: string }[] = [
  { id: 'covenants', label: 'Covenants & news' },
  { id: 'forest', label: 'Forests & Courts' },
  { id: 'places', label: 'Places & seeds' },
  { id: 'history', label: 'Timeline' },
  { id: 'sagas', label: 'Sagas & founding' },
];

export default function TribunalPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId);
  const covs = useSagaCovenants(sagaId);
  const putRecords = useStore((s) => s.putRecords);
  const updateSaga = useStore((s) => s.updateSaga);
  const setNotice = useStore((s) => s.setNotice);
  const [busy, setBusy] = useState<{ name: string; step: string; done: number; of: number } | null>(null);
  const [others, setOthers] = useState(true);
  const [tab, setTab] = useTabParam<TabId>('covenants');
  if (!saga) return <Empty>Saga not found.</Empty>;
  const S = `/saga/${saga.id}`;
  const book = tribunalBook(saga.tribunal);
  const living = covs.filter((c) => c.living);
  const byKey = new Map(living.map((c) => [c.living!.key, c]));

  const add = async (defs: BookCovenant[]) => {
    if (!book || busy || !defs.length) return;
    let names = chars.map((c) => c.name);
    let people = 0;
    for (const [i, def] of defs.entries()) {
      const steps = livingCovenantSteps(book, def, { data, saga, rules: saga.houseRules }, { seed: seedOf(saga.id + def.id), others, avoidNames: names });
      let r = steps.next();
      while (!r.done) {
        setBusy({ name: def.name, step: r.value, done: i, of: defs.length });
        // let the page show the step before the next one runs
        await new Promise((res) => setTimeout(res, 0));
        r = steps.next();
      }
      putRecords({ characters: r.value.chars, covenants: [r.value.cov] }, `adding ${def.name}`);
      names = [...names, ...r.value.chars.map((c) => c.name)];
      people += r.value.chars.length;
    }
    setBusy(null);
    setNotice(`${defs.length === 1 ? defs[0].name : `${defs.length} covenants`} of the ${book.tribunal} Tribunal added: ${people} people. Undo is at the top of the menu.`);
  };

  if (!book)
    return (
      <div className="stack">
        <div className="breadcrumbs">
          <Link to={S}>{saga.name}</Link> › <Link to={`${S}/table`}>Game table</Link> ›
        </div>
        <h1>The Tribunal</h1>
        <Card title="No Tribunal book for this saga yet" className="accent">
          <p>
            This saga is set in the {saga.tribunal || 'unnamed'} Tribunal. The toolkit can build the covenants of these Tribunals into a saga, from their books, as living covenants whose
            people carry on by themselves as the seasons pass:
          </p>
          {TRIBUNAL_BOOKS.map((b) => (
            <div key={b.tribunal} className="list-row">
              <b>{b.tribunal}</b> <span className="small">{b.title}</span> <BookBadge book={b.book} />
              <button className="small" style={{ marginLeft: 'auto' }} onClick={() => updateSaga(saga.id, (x) => void (x.tribunal = b.tribunal))}>
                Set the saga’s Tribunal to {b.tribunal}
              </button>
            </div>
          ))}
          <p className="small muted" style={{ marginBottom: 0 }}>
            The other Tribunals will follow. The saga’s Tribunal is also set on the saga page.
          </p>
        </Card>
      </div>
    );

  const missing = book.covenants.filter((d) => !byKey.has(d.id));
  // the players' covenants, the one with the most magi first (as on the Game table)
  const weight = (c: Covenant) => chars.filter((x) => c.memberIds.includes(x.id)).reduce((t, x) => t + (x.type === 'magus' ? 100 : 1), 0);
  const players = covs.filter((c) => !c.living).sort((a, b) => weight(b) - weight(a));
  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link to={S}>{saga.name}</Link> › <Link to={`${S}/table`}>Game table</Link> ›
      </div>
      <div className="topbar">
        <h1>
          The {book.tribunal} Tribunal · {saga.currentSeason} {saga.currentYear}
        </h1>
        <BookBadge book={book.book} />
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        The covenants of {book.title}, as living covenants: their magi are full characters who follow a season priority list when the seasons pass, their covenants close their books each
        year, and now and then one comes to your covenant with an offer, a request or trouble. They are kept out of the players’ lists; they live here and on their covenant pages.
      </p>

      {book.lore && <Tabs tabs={TABS} value={tab} onChange={setTab} />}
      {book.lore && tab !== 'covenants' ? (
        <Suspense fallback={<Empty>Opening the book…</Empty>}>
          <TribunalLore tab={tab} saga={saga} book={book} data={data} covs={covs} chars={chars} players={players} />
        </Suspense>
      ) : (
        <>
          <NewsCard saga={saga} covs={covs} chars={chars} />

          <div className="grid grid-2">
            <Card title="The covenants" tour="tribunal-covenants">
              {busy && (
                <div className="small" style={{ marginBottom: 6 }} role="status">
                  Building {busy.name}: {busy.step}… {busy.of > 1 && `(${busy.done + 1} of ${busy.of})`}
                </div>
              )}
              {book.covenants.map((def) => {
                const cov = byKey.get(def.id);
                const named = def.magi.length;
                const more = (def.others ?? []).reduce((t, o) => t + o.count, 0);
                return (
                  <div key={def.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                    {cov ? <Link to={`${S}/covenant/${cov.id}`}>
                      <b>{def.name}</b>
                    </Link> : <b>{def.name}</b>}
                    <span className="badge">{def.season}{def.seasonGuess ? '?' : ''}</span>
                    <span className="small muted">
                      {def.place}; founded {def.founded}; {def.realm} aura {def.aura}; {named} named{more ? `, ${more} more` : ''}
                    </span>
                    <span style={{ marginLeft: 'auto' }}>
                      {cov ? <span className="badge good">{cov.living?.paused ? 'paused' : 'living'}</span> : (
                        <button className="small" disabled={!!busy} onClick={() => add([def])}>
                          Add
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
              <div className="row tight" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <button className="primary" disabled={!!busy || !missing.length} onClick={() => add(missing)}>
                  {missing.length ? `Add all ${missing.length}${missing.length < book.covenants.length ? ' still missing' : ''}` : 'All are in the saga'}
                </button>
                <label className="inline small" title="Generate the magi the book counts without naming (Durenmar's other Bonisagi, Fengheld's journeymen…)">
                  <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} /> Also the magi the book counts without naming
                </label>
              </div>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Building takes a few seconds a covenant (the whole Tribunal, some twenty). Ages are the book’s for {book.present}, moved on to {saga.currentYear}.
              </p>
            </Card>
            <Card title="Gatherings" tour="tribunal-gatherings">
              {nextGatherings(saga, saga.currentYear).map((g) => (
                <div key={g.name} className="list-row">
                  <b>{g.name}</b>
                  <span>
                    {g.house ? 'Summer' : gatheringSeason(book)} {g.year} at {g.at}
                    {g.house ? ` (House ${houseName(g.house)})` : ''}
                  </span>
                  {g.year === saga.currentYear && <span className="badge warn">this year</span>}
                </div>
              ))}
              <p className="small muted" style={{ marginBottom: 0 }}>
                The {book.tribunal} Tribunal meets every {book.gathering.every} years <BookBadge book={book.book} line={book.gathering.line} />
                {book.gathering.season ? `, its proceedings opening on the eve of the 1st of May (Walpurgis Night): the ${book.gathering.season} season` : ' (the book gives no season: the toolkit takes Summer)'}. Every living
                covenant’s magi spend the season there (Exposure in Intrigue), and the players’ magi are expected too. New masters and archmagi are made, the motions below are voted on, and magi of
                covenants at odds may settle a quarrel by certamen. A House’s gathering is shown in Summer: the toolkit does not take a season for it.
              </p>
            </Card>
          </div>

          {living.length > 0 && (
            <div className="grid grid-2">
              <MotionsCard book={book} saga={saga} chars={chars} covs={covs} />
              <WanderersCard book={book} saga={saga} chars={chars} covs={covs} />
            </div>
          )}

          {living.map((cov) => (
            <LivingCovenantCard key={cov.id} cov={cov} book={book} chars={chars} saga={saga} players={players} />
          ))}

          {book.covenants.some((c) => c.id === 'durenmar') && <GreatLibraryCard book={book} />}
        </>
      )}
    </div>
  );
}

const PAGE_LINK: Record<string, { label: string; to: (S: string, covId?: string) => string }> = {
  market: { label: 'Market & treasury', to: (S) => `${S}/market` },
  covenant: { label: 'The covenant', to: (S, id) => (id ? `${S}/covenant/${id}` : S) },
  seasons: { label: 'Seasons', to: (S) => `${S}/seasons` },
  tribunal: { label: 'The Great Library', to: (S) => `${S}/tribunal` },
  dice: { label: 'Dice', to: () => '/dice' },
};

/** What the Tribunal has brought: approaches waiting for an answer, then the other news. */
export function NewsCard({ saga, covs, chars, compact }: { saga: Saga; covs: Covenant[]; chars: Character[]; compact?: boolean }) {
  const updateSaga = useStore((s) => s.updateSaga);
  const S = `/saga/${saga.id}`;
  const news = saga.tribunalNews ?? [];
  const open = news.filter((n) => n.kind === 'approach' && !n.done);
  const rest = news.filter((n) => !(n.kind === 'approach' && !n.done));
  const covName = (id?: string) => covs.find((c) => c.id === id)?.name ?? '';
  const done = (uid: string) => updateSaga(saga.id, (x) => void (x.tribunalNews = (x.tribunalNews ?? []).map((n) => (n.uid === uid ? { ...n, done: true } : n))));
  const players = covs.filter((c) => !c.living);
  const home = playersCovenant(covs, chars);
  const takeIn = useTakeIn(covs);
  const row = (n: TribunalNews) => {
    const who = n.characterId ? chars.find((c) => c.id === n.characterId) : undefined;
    const guest = n.kind === 'approach' && !n.done && who?.wanderer && home && who.covenantId !== home.id ? who : undefined;
    const page = n.page ? PAGE_LINK[n.page] : undefined;
    return (
      <div key={n.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
        <span className="small muted">
          {n.season} {n.year}
        </span>
        {n.covenantId && (
          <Link to={`${S}/covenant/${n.covenantId}`} className="small">
            {covName(n.covenantId)}
          </Link>
        )}
        {n.approachKind && <span className="badge">{n.approachKind}</span>}
        <span className="small" style={{ flex: '1 1 260px' }}>
          {n.text}
          {who && (
            <>
              {' '}
              <Link to={`${S}/character/${who.id}`}>{who.name}’s sheet</Link>
            </>
          )}
        </span>
        {page && n.kind === 'approach' && !n.done && (
          <Link className="btn small" to={page.to(S, n.page === 'covenant' ? home?.id : undefined)}>
            {page.label}
          </Link>
        )}
        {guest && (
          <button className="small" onClick={() => takeIn(guest, home!, saga, () => done(n.uid))} title={`${guest.name} comes to ${home!.name} as a guest`}>
            Take them in
          </button>
        )}
        {n.kind === 'approach' && !n.done && (
          <button className="small" onClick={() => done(n.uid)} title="Mark it dealt with (played, answered, or set aside)">
            Dealt with
          </button>
        )}
      </div>
    );
  };
  return (
    <Card title={`From the Tribunal${open.length ? ` (${open.length} to answer)` : ''}`} className={open.length ? 'accent' : undefined} tour="tribunal-news" id="tribunal-news">
      {!open.length && <div className="small muted">{covs.some((c) => c.living) ? 'Nothing waiting for an answer.' : 'No living covenants yet: add them on the Tribunal page.'}</div>}
      {open.map(row)}
      {!players.length && covs.some((c) => c.living) && <div className="small muted">The Tribunal’s covenants come to the players only once the saga has a covenant of its own.</div>}
      {rest.length > 0 && (
        <details style={{ marginTop: 6 }} open={!compact && !open.length}>
          <summary className="small">News: votes, certamen, apprentices, deaths, new members, gatherings, answered approaches ({rest.length})</summary>
          {rest.slice(0, 40).map(row)}
        </details>
      )}
      {compact && (
        <div className="small" style={{ marginTop: 6 }}>
          <Link to={`${S}/tribunal`}>The Tribunal page</Link>: its covenants, their magi, the gatherings and the Great Library.
        </div>
      )}
    </Card>
  );
}

function LivingCovenantCard({ cov, book, chars, saga, players }: { cov: Covenant; book: TribunalBook; chars: Character[]; saga: Saga; players: Covenant[] }) {
  const updateCovenant = useStore((s) => s.updateCovenant);
  const remove = useStore((s) => s.deleteCovenantWithMembers);
  const S = `/saga/${saga.id}`;
  const def = book.covenants.find((d) => d.id === cov.living?.key);
  // in the covenant's own order: the book's magi first
  const people = cov.memberIds.map((id) => chars.find((c) => c.id === id)).filter((c): c is Character => !!c);
  const alive = people.filter((c) => !c.wounds.dead);
  const guests = chars.filter((c) => c.wanderer && c.covenantId === cov.id && !c.wounds.dead);
  const customs = rhineCustoms(saga);
  const vis = cov.visStocks.reduce((t, v) => t + v.pawns, 0);
  const last = (c: Character) => [...c.seasonLog].sort((a, b) => b.year - a.year || 'Spring Summer Autumn Winter'.indexOf(b.season) - 'Spring Summer Autumn Winter'.indexOf(a.season))[0];
  return (
    <Card tour="tribunal-living">
      <details>
        <summary>
          <b>{cov.name}</b> · {cov.season} · {alive.filter((c) => c.type === 'magus').length} magi · {Math.round(cov.finances.treasury)} £ · {vis} pawns of vis · {cov.library.length} books
          {cov.living?.paused && <span className="badge warn"> paused</span>}
        </summary>
        <p className="small" style={{ marginTop: 6 }}>
          {cov.description} {def && <BookBadge book={book.book} line={def.line} />}
        </p>
        <div className="small muted">{def?.folk.text}</div>
        <div className="table-wrap">
        <table className="table small" style={{ marginTop: 6 }}>
          <thead>
            <tr>
              <th>Magus</th>
              <th>House</th>
              {customs && <th>Rank</th>}
              <th>Age</th>
              <th>Last season</th>
            </tr>
          </thead>
          <tbody>
            {people.map((c) => {
              const e = last(c);
              return (
                <tr key={c.id} style={{ opacity: c.wounds.dead ? 0.5 : 1 }}>
                  <td>
                    <Link to={`${S}/character/${c.id}`}>{c.name}</Link>
                    {c.fromBook?.title && <div className="muted">{c.fromBook.title}</div>}
                    {c.apprentice && !c.wounds.dead && <div className="muted">apprentice: {c.apprentice.name}, {c.apprentice.age + saga.currentYear - c.apprentice.since}</div>}
                  </td>
                  <td>{houseName(c.house)}</td>
                  {customs && (
                    <td>
                      {c.rhine?.rank ?? ''}
                      {c.rhine?.gild ? ` · ${gildName(c.rhine.gild)}` : ''}
                    </td>
                  )}
                  <td>{c.age}</td>
                  <td>{c.wounds.dead ? 'died' : c.standing?.kind === 'none' ? 'does nothing' : e ? `${e.season} ${e.year}: ${e.summary}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {guests.length > 0 && (
          <div className="small" style={{ marginTop: 4 }}>
            <b>Guests</b>:{' '}
            {guests.map((c, i) => (
              <span key={c.id}>
                {i ? ', ' : ''}
                <Link to={`${S}/character/${c.id}`}>{c.name}</Link> (since {c.wanderer!.since})
              </span>
            ))}
          </div>
        )}
        {def && def.relations.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <b className="small">Neighbors</b>
            {def.relations.map((r) => (
              <div key={r.with} className="small">
                <span className={`badge ${ATTITUDE[r.attitude]}`}>{r.attitude}</span> {book.covenants.find((x) => x.id === r.with)?.name}: {r.note}
              </div>
            ))}
          </div>
        )}
        <div className="row tight small" style={{ marginTop: 6, flexWrap: 'wrap' }}>
          <b>Its attitude to your covenant</b>
          <select
            value={cov.living?.attitude ?? 'neutral'}
            onChange={(e) => updateCovenant(cov.id, (x) => void (x.living = { ...x.living!, attitude: e.target.value === 'neutral' ? undefined : (e.target.value as NonNullable<Covenant['living']>['attitude']) }))}
            aria-label="Attitude"
          >
            {['ally', 'friendly', 'neutral', 'wary', 'hostile', 'enemy'].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <span className="muted">as play has made it: troubles come more often from those who dislike you, offers and invitations from those who like you</span>
        </div>
        {def && (
          <div style={{ marginTop: 6 }}>
            <b className="small">How it may come to the players</b>
            {def.approaches.map((a) => (
              <div key={a.id} className="small">
                <span className="badge">{a.kind}</span> {a.text} <span className="muted">({Math.round(approachChance(a.chance, a.kind, cov.living?.attitude))}% a year{cov.living?.approached?.[a.id] ? `; last in ${cov.living.approached[a.id]}` : ''})</span>
              </div>
            ))}
          </div>
        )}
        {def?.services && (
          <div style={{ marginTop: 6 }}>
            <b className="small">For visitors</b>
            {def.services.map((s) => (
              <div key={s.id} className="small">
                <b>{s.label}</b>
                {s.pawns ? ` (${s.pawns} pawns a season)` : ''}: {s.text} <BookBadge book={book.book} line={s.line} />
              </div>
            ))}
          </div>
        )}
        {players.length > 0 && <DealWith cov={cov} players={players} saga={saga} />}
        <div className="row tight" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <Link className="btn small" to={`${S}/covenant/${cov.id}`}>
            Covenant page
          </Link>
          <button className="small" onClick={() => updateCovenant(cov.id, (x) => void (x.living = { ...x.living!, paused: !x.living?.paused || undefined }))} title="A paused covenant still ages and closes its books, but makes no approaches and takes in no new magi">
            {cov.living?.paused ? 'Resume' : 'Pause'}
          </button>
          <Confirm label="Remove from the saga" message={`Remove ${cov.name} and its ${people.length} people from the saga? (Undo is at the top of the menu.)`} onYes={() => remove(cov.id)} danger className="small" />
        </div>
      </details>
    </Card>
  );
}

/** Trading with a living covenant, as the storyguide agrees it: vis or silver either way, or a copy of one of its books. */
function DealWith({ cov, players, saga }: { cov: Covenant; players: Covenant[]; saga: Saga }) {
  const putRecords = useStore((s) => s.putRecords);
  const [oursId, setOursId] = useState(players[0].id);
  const [give, setGive] = useState<Offer>({ kind: 'vis', art: 'Vi', pawns: 2 });
  const [get, setGet] = useState<Offer>({ kind: 'vis', art: 'Cr', pawns: 2 });
  const [bookUid, setBookUid] = useState('');
  const [payIn, setPayIn] = useState<'vis' | 'silver'>('vis');
  const [msg, setMsg] = useState('');
  const ours = players.find((c) => c.id === oursId) ?? players[0];
  const when = { year: saga.currentYear, season: saga.currentSeason };
  const books = cov.library.filter((b) => b.kind !== 'mundane' && !b.corrupt);
  const book = books.find((b) => b.uid === bookUid);
  // Covenants' book prices in pawns (a sound book to order), a lab text a pawn for every five levels; silver at the saga's vis price
  const pawns = book ? (book.kind === 'summa' || book.kind === 'tractatus' ? bookVisPrice(book.kind, book.level, 'sound', false) : Math.max(1, Math.ceil(book.level / 5))) : 0;
  const pounds = pawns * visPriceOf(saga);
  const run = (label: string, fn: (a: Covenant, b: Covenant) => string | undefined, done: string) => {
    const a = structuredClone(ours);
    const b = structuredClone(cov);
    const err = fn(a, b);
    if (err) return setMsg(err);
    putRecords({ characters: [], covenants: [a, b] }, label);
    setMsg(done);
  };
  const offerText = (o: Offer) => (o.kind === 'vis' ? `${o.pawns} pawn${o.pawns > 1 ? 's' : ''} of ${ART_NAMES[o.art]} vis` : `${o.pounds} £`);
  return (
    <details style={{ marginTop: 6 }} data-tour="tribunal-deal">
      <summary className="small">
        <b>Deal with {cov.name}</b>: vis and silver, copies of its books
      </summary>
      {players.length > 1 && (
        <label className="inline small">
          Your covenant{' '}
          <select value={ours.id} onChange={(e) => setOursId(e.target.value)}>
            {players.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <span className="small">{ours.name} gives</span>
        <OfferPick value={give} onChange={setGive} />
        <span className="small">for</span>
        <OfferPick value={get} onChange={setGet} />
        <button className="small" onClick={() => run(`a trade with ${cov.name}`, (a, b) => tradeWith(a, b, give, get, when), `Traded ${offerText(give)} for ${offerText(get)}.`)}>
          Trade
        </button>
      </div>
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <span className="small">A copy of</span>
        <select value={bookUid} onChange={(e) => setBookUid(e.target.value)} aria-label="Book" style={{ maxWidth: 260 }}>
          <option value="">— one of its {books.length} books —</option>
          {books.map((b) => (
            <option key={b.uid} value={b.uid}>
              {b.title} ({b.kind === 'summa' ? `summa L${b.level} Q${b.quality}` : b.kind === 'tractatus' ? `tractatus Q${b.quality}` : `lab text, level ${b.level}`})
            </option>
          ))}
        </select>
        {book && (
          <>
            <select value={payIn} onChange={(e) => setPayIn(e.target.value as 'vis' | 'silver')} aria-label="Paid in">
              <option value="vis">for {pawns} pawns of vis</option>
              <option value="silver">for {pounds} £</option>
            </select>
            <button
              className="small"
              onClick={() => run(`a book from ${cov.name}`, (a, b) => buyCopyFrom(a, b, book.uid, payIn === 'vis' ? { kind: 'any-vis', pawns } : { kind: 'silver', pounds }, when), `A copy of ${book.title} is in ${ours.name}'s library.`)}
            >
              Buy the copy
            </button>
          </>
        )}
      </div>
      {msg && <div className="small">{msg}</div>}
      <p className="small muted" style={{ margin: 0 }}>
        The storyguide decides whether they agree, and on what terms; both covenants’ stores and chronicles change. Prices: Covenants ch.7, at the saga’s {visPriceOf(saga)} £ a pawn.
      </p>
    </details>
  );
}

function OfferPick({ value, onChange }: { value: Offer; onChange: (o: Offer) => void }) {
  return (
    <span className="row tight small">
      <select value={value.kind} onChange={(e) => onChange(e.target.value === 'silver' ? { kind: 'silver', pounds: 10 } : { kind: 'vis', art: 'Vi', pawns: 2 })} aria-label="Vis or silver">
        <option value="vis">vis</option>
        <option value="silver">silver</option>
      </select>
      {value.kind === 'vis' ? (
        <>
          <Stepper value={value.pawns} min={1} max={60} width={32} onChange={(n) => onChange({ ...value, pawns: n })} />
          <select value={value.art} onChange={(e) => onChange({ ...value, art: e.target.value as Art })} aria-label="Art">
            {ARTS.map((a) => (
              <option key={a} value={a}>
                {ART_NAMES[a]}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <Stepper value={value.pounds} min={1} max={2000} width={44} onChange={(n) => onChange({ ...value, pounds: n })} />
          <span>£</span>
        </>
      )}
    </span>
  );
}

/** Rolls for what the Great Library holds, for a magus who comes to study (Guardians of the Forests, ch.6). */
function GreatLibraryCard({ book }: { book: TribunalBook }) {
  const [rank, setRank] = useState<LibraryRank>('journeyman');
  const [member, setMember] = useState(false);
  const [lore, setLore] = useState(0);
  const [used, setUsed] = useState(0);
  const [art, setArt] = useState<Art | ''>('Cr');
  const [level, setLevel] = useState(12);
  const [kind, setKind] = useState<SpellKind>('standard');
  const [ease, setEase] = useState(12);
  const [enchEase, setEnchEase] = useState(12);
  const [gifts, setGifts] = useState(1);
  const [copying, setCopying] = useState(0);
  const [out, setOut] = useState<string[]>([]);
  const say = (t: string) => setOut((o) => [t, ...o].slice(0, 6));
  const durenmar = book.covenants.find((c) => c.id === 'durenmar');
  return (
    <Card title="The Great Library of Durenmar" tour="tribunal-library" id="great-library">
      <p className="small" style={{ marginTop: 0 }}>
        Those who study from it must contribute to it: each new book or Lab Text earns two seasons of study, a season of copying one, and a quiet gift of vis is accepted instead. No book
        leaves the tower without the librarian’s leave. {durenmar?.services?.[0] && <BookBadge book={book.book} line={durenmar.services[0].line} />}
      </p>
      <div className="row tight small" style={{ flexWrap: 'wrap' }}>
        <label className="inline">
          Rank{' '}
          <select value={rank} onChange={(e) => setRank(e.target.value as LibraryRank)}>
            <option value="journeyman">journeyman</option>
            <option value="master">master</option>
            <option value="archmage">archmage</option>
          </select>
        </label>
        <label className="inline">
          <input type="checkbox" checked={member} onChange={(e) => setMember(e.target.checked)} /> a follower of Bonisagus, or of Durenmar
        </label>
        <span>Durenmar Lore</span>
        <Stepper value={lore} min={0} max={9} width={28} onChange={setLore} />
        <span title="Each earlier use of Durenmar Lore in the same subject takes a point off">earlier uses</span>
        <Stepper value={used} min={0} max={9} width={28} onChange={setUsed} />
      </div>
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <b>A summa</b>
        <select value={art} onChange={(e) => setArt(e.target.value as Art | '')} aria-label="Subject">
          {ARTS.map((a) => (
            <option key={a} value={a}>
              {ART_NAMES[a]}
            </option>
          ))}
          <option value="">an Arcane Ability</option>
        </select>
        <span className="small">of Level</span>
        <Stepper value={level} min={1} max={30} width={32} onChange={setLevel} />
        <button className="small" onClick={() => say(`Summa${art ? ` of ${ART_NAMES[art]}` : ' on an Arcane Ability'}, Level ${level}: ${findSumma({ level, art: !!art, rank, bonisagusOrMember: member, lore, loreUsed: used }).text}`)}>
          Look for it
        </button>
      </div>
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <b>A tractatus</b>
        <button className="small" onClick={() => say(tractatusQuality({ lore, loreUsed: used }).text)}>
          Its Quality
        </button>
      </div>
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <b>A spell’s Lab Text</b>
        <select value={kind} onChange={(e) => setKind(e.target.value as SpellKind)} aria-label="Spell">
          <option value="standard">a standard spell (Ease 3)</option>
          <option value="version">a version of a general standard spell, to level 40 (Ease 6)</option>
          <option value="other">another spell (Ease 6 to 21)</option>
        </select>
        {kind === 'other' && <Stepper value={ease} min={6} max={21} width={32} onChange={setEase} />}
        <button className="small" onClick={() => say(`Lab Text: ${findLabText(kind, kind === 'other' ? ease : LAB_TEXT_EASE[kind]).text}`)}>
          Look for it
        </button>
      </div>
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <b>An enchantment’s Lab Text</b>
        <span className="small">Ease</span>
        <Stepper value={enchEase} min={6} max={21} width={32} onChange={setEnchEase} />
        <button className="small" onClick={() => say(`Enchantment: ${findEnchantment(enchEase).text}`)}>
          Look for it
        </button>
      </div>
      <div className="list-row" style={{ flexWrap: 'wrap' }}>
        <b>Credit</b>
        <Stepper value={gifts} min={0} max={20} width={28} onChange={setGifts} />
        <span className="small">contributions,</span>
        <Stepper value={copying} min={0} max={20} width={28} onChange={setCopying} />
        <span className="small">seasons copying: {libraryCredit(gifts, copying)} seasons of study.</span>
      </div>
      {out.map((l, i) => (
        <div key={i} className={`small ${i === 0 ? '' : 'muted'}`}>
          {l}
        </div>
      ))}
      <p className="small muted" style={{ marginBottom: 0 }}>
        Log a season of study there on the character’s Advancement tab as a summa or tractatus of the Level and Quality found.
      </p>
    </Card>
  );
}
