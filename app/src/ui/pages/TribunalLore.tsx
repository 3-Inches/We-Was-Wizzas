// The rest of a Tribunal book on the Tribunal page (Guardians of the Forests for the Rhine): its
// forests (the fates and powers of forest spirits, the Courts of the Seasons month by month, the rival
// courts by the Rhine Gorge, the trees of Germany), its places with their story seeds, its timeline
// and coming years, and its saga ideas with the players' bid for the recognition of a new covenant.
// Loaded only when one of these tabs is opened: the book's text is large.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameData } from '../../data';
import type { TribunalBook } from '../../data/livingCovenants';
import { RHINE_PLACES, RHINE_SAGAS, RHINE_SEEDS, RHINE_TIMELINE, type RhineEvent, type RhinePlace, type RhineSeed } from '../../data/livingCovenants/rhineLore';
import {
  FOREST_FATES, FOREST_GENERAL_POWERS, FOREST_SPECIFIC_POWERS, GERMAN_TREES, GORGE_COURTS, MONTHS, SEASON_COURTS, SEASON_MONTHS, courtInMonth, type ForestPower,
} from '../../data/livingCovenants/rhineForest';
import { OUTLOOK_TEXT, enmityGilds, foundingCovenants, foundingProgress, sponsorCandidates, sponsorOf, sponsorOutlook, type SponsorOutlook } from '../../engine/founding';
import { nextGatherings } from '../../engine/living';
import { RHINE_GILDS } from '../../engine/tribunal';
import type { Character, Covenant, FoundingSponsor, Saga } from '../../engine/types';
import { useStore } from '../../store/store';
import { BookBadge, Card, Confirm, Empty } from '../kit';

export type LoreTab = 'forest' | 'places' | 'history' | 'sagas';

export default function TribunalLore(props: { tab: LoreTab; saga: Saga; book: TribunalBook; data: GameData; covs: Covenant[]; chars: Character[]; players: Covenant[] }) {
  const { tab, saga, book } = props;
  if (tab === 'forest') return <Forest saga={saga} data={props.data} book={book.book} />;
  if (tab === 'places') return <Places book={book.book} />;
  if (tab === 'history') return <History saga={saga} book={book.book} />;
  return (
    <div className="stack">
      <Founding {...props} />
      <SagaIdeas book={book.book} />
    </div>
  );
}

const found = (q: string, ...texts: string[]) => !q || texts.some((t) => t.toLowerCase().includes(q));

// ================================================================ forests

function Forest({ saga, data, book }: { saga: Saga; data: GameData; book: string }) {
  const months = SEASON_MONTHS[saga.currentSeason];
  const strongest = (m: number) => Math.max(...SEASON_COURTS.map((c) => courtInMonth(c, m).pool));
  const seed = RHINE_SEEDS.find((s) => s.title === 'The Courts of the Seasons');
  return (
    <div className="stack">
      <Card title={<h3>The Courts of the Seasons <BookBadge book={book} line={998} /></h3>} tour="tribunal-courts">
        <p className="small" style={{ marginTop: 0 }}>
          One forest spirit splintered into four, each part allied with or possessing a faerie of a season, in a ring of forests about a covenant. Each court’s Might Score stays 30; its Might
          Pool is 35 at its solstice or equinox and ebbs to 15 six months on, the two rivals’ pools always adding up to 50; its forest’s Faerie aura is 3 at its height and gone at its ebb.
          The open war is between Summer and Winter; Spring and Autumn wage theirs by plots. For the Rhine Gorge the book places Holly in the Westerwald, the Alder in the Odenwald, Oak in the
          Palatinate Forest and the Willow in the Hunsrück.
        </p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>{saga.currentSeason} {saga.currentYear}</th>
                {months.map((m) => (
                  <th key={m} className="num">{MONTHS[m - 1]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEASON_COURTS.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.ruler}</b> <span className="small muted">{c.season}, {c.direction}</span>
                  </td>
                  {months.map((m) => {
                    const x = courtInMonth(c, m);
                    return (
                      <td key={m} className="num" style={x.pool === strongest(m) ? { fontWeight: 700 } : undefined}>
                        Pool {x.pool} · aura {x.aura}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: 6 }}>
          <summary className="small">The whole year, month by month</summary>
          <div className="table-wrap">
            <table className="compact small">
              <thead>
                <tr>
                  <th>Might Pool</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="num">{m.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEASON_COURTS.map((c) => (
                  <tr key={c.id}>
                    <td>{c.ruler}</td>
                    {MONTHS.map((_, i) => (
                      <td key={i} className="num" style={courtInMonth(c, i + 1).pool === 35 ? { fontWeight: 700 } : undefined}>
                        {courtInMonth(c, i + 1).pool}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            The pools are the book’s, month by month; its auras are given at the solstices and equinoxes (3 at a court’s height, 1 three months away, none six months away) and read from the pool
            in between.
          </p>
        </details>
        {SEASON_COURTS.map((c) => (
          <div key={c.id} className="list-row" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
            <b>{c.ruler}</b>
            <span className="badge">{c.season}</span>
            <span className="small muted">
              the {c.direction}; {c.traits}; {c.powers}; by the Rhine Gorge, {c.gorge}
            </span>
            <div className="small" style={{ flexBasis: '100%' }}>
              {c.text}
            </div>
          </div>
        ))}
        {seed && <SeedRow s={seed} book={book} />}
      </Card>

      <div className="grid grid-2">
        <Card title={<h3>Bright Winter and Dark Summer <BookBadge book={book} line={GORGE_COURTS.line} /></h3>}>
          <p className="small" style={{ marginTop: 0 }}>
            By the Rhine Gorge, the Unseelie Court of Dark Summer holds dominion from Walpurgis Night to All Hallows’ Eve, the Seelie Court of Bright Winter the rest of the year.
          </p>
          <div className="list-row">
            <b>{saga.currentSeason} {saga.currentYear}</b>
            <span>{GORGE_COURTS.bySeason[saga.currentSeason]}</span>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            {GORGE_COURTS.text}
          </p>
        </Card>
        <Card title={<h3>The fates of the forest spirits <BookBadge book={book} line={864} /></h3>}>
          <p className="small" style={{ marginTop: 0 }}>
            Each great forest of Germany had its genius locus, a spirit of Magic Might 30 or more. Christianity and the axe have pressed them hard, and each has met one of four fates:
          </p>
          {FOREST_FATES.map((f) => (
            <div key={f.name} className="list-row" style={{ alignItems: 'baseline' }}>
              <b>{f.name}</b>
              <span className="small">{f.text}</span>
            </div>
          ))}
          <p className="small muted" style={{ marginBottom: 0 }}>
            A character may seek communion and a pact with a forest’s spirit by the Paths through the Forest (an optional rule on the House rules page; then on a character’s Overview).
          </p>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title={<h3>What every forest spirit can do <BookBadge book={book} line={900} /></h3>}>
          {FOREST_GENERAL_POWERS.map((p) => (
            <PowerRow key={p.name} p={p} />
          ))}
          <p className="small muted" style={{ marginBottom: 0 }}>
            Its Might resists any magic used to harm the forest or its denizens.
          </p>
        </Card>
        <Card title={<h3>What some forest spirits can do <BookBadge book={book} line={912} /></h3>}>
          {FOREST_SPECIFIC_POWERS.map((p) => (
            <PowerRow key={p.name} p={p} />
          ))}
          <p className="small muted" style={{ marginBottom: 0 }}>
            The storyguide is encouraged to invent more. Applied to people, these powers cause Warping.
          </p>
        </Card>
      </div>

      <Card title={<h3>The trees of Germany <BookBadge book={book} line={942} /></h3>}>
        <p className="small" style={{ marginTop: 0 }}>
          “By Oak, Ash, and Thorn”: each tree held a meaning for the ancient tribes, and each wood has Shape and Material bonuses, tripled for a whole living tree enchanted as a magic item.
        </p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>Tree</th>
                <th>Shape and Material</th>
                <th>Its meaning</th>
              </tr>
            </thead>
            <tbody>
              {GERMAN_TREES.map((t) => {
                const sm = data.shapeMaterial.find((s) => s.name === t.material);
                return (
                  <tr key={t.tree}>
                    <td>
                      <b>{t.tree}</b>
                    </td>
                    <td className="small">{sm ? sm.bonuses.map((b) => `+${b.bonus} ${b.effect}`).join('; ') : '—'}</td>
                    <td className="small">{t.lore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PowerRow({ p }: { p: ForestPower }) {
  return (
    <div className="list-row" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
      <b>{p.name}</b>
      <span className="badge">{p.cost}</span>
      {(p.init || p.form) && (
        <span className="small muted">
          {p.init ? `Init ${p.init}` : ''}
          {p.init && p.form ? ', ' : ''}
          {p.form}
        </span>
      )}
      <div className="small" style={{ flexBasis: '100%' }}>
        {p.text}
      </div>
    </div>
  );
}

// ================================================================ places and story seeds

function Places({ book }: { book: string }) {
  const [q, setQ] = useState('');
  const [chapter, setChapter] = useState('');
  const chapters = useMemo(() => [...new Set(RHINE_PLACES.map((p) => p.chapter))], []);
  const needle = q.trim().toLowerCase();
  const places = RHINE_PLACES.filter(
    (p) => (!chapter || p.chapter === chapter) && found(needle, p.name, p.region, p.text, ...p.boxes.flatMap((b) => [b.title, b.text]), ...p.vis),
  );
  const seeds = RHINE_SEEDS.filter((s) => found(needle, s.title, s.place, s.region, s.text));
  const withVis = places.filter((p) => p.vis.length).length;
  return (
    <div className="stack">
      <div className="row tight" style={{ flexWrap: 'wrap' }}>
        <input type="search" placeholder="Search the places and seeds (a name, “vis”, “regio”…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 220px' }} aria-label="Search" />
        <select value={chapter} onChange={(e) => setChapter(e.target.value)} aria-label="Chapter">
          <option value="">All the lands</option>
          {chapters.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Card title={`Places (${places.length}${places.length < RHINE_PLACES.length ? ` of ${RHINE_PLACES.length}` : ''})`} tour="tribunal-places">
        <p className="small muted" style={{ marginTop: 0 }}>
          The regions and places of chapters 5 to 10 and the Rhine Gorge, with the auras the book names and what it says of vis ({withVis} of these) and its asides. The text is the book’s, cut short;
          the badge opens the book at the place.
        </p>
        {places.length ? places.map((p) => <PlaceRow key={p.line} p={p} book={book} />) : <Empty>No place matches.</Empty>}
      </Card>
      <Card title={`Story seeds (${seeds.length})`}>
        {seeds.length ? seeds.map((s) => <SeedRow key={s.line} s={s} book={book} />) : <Empty>No story seed matches.</Empty>}
      </Card>
    </div>
  );
}

function PlaceRow({ p, book }: { p: RhinePlace; book: string }) {
  return (
    <details className="list-row" style={{ display: 'block' }}>
      <summary style={{ cursor: 'pointer' }}>
        <b>{p.name}</b> <span className="small muted">{p.kind === 'region' ? p.chapter : p.region}</span>{' '}
        {p.facts.map((f) => (
          <span key={f} className="badge">
            {f}
          </span>
        ))}{' '}
        {p.vis.length > 0 && (
          <span className="badge good" title="The book says something of vis here">
            vis
          </span>
        )}
      </summary>
      <div className="small" style={{ marginTop: 4 }}>
        {p.text} <BookBadge book={book} line={p.line} />
      </div>
      {p.vis.length > 0 && (
        <div className="small" style={{ marginTop: 4 }}>
          <b>Vis.</b> {p.vis.join(' ')}
        </div>
      )}
      {p.boxes.map((b) => (
        <div key={b.line} className="small" style={{ marginTop: 4, paddingLeft: 10, borderLeft: '3px solid var(--line-strong)' }}>
          <b>{b.title}.</b> {b.text} <BookBadge book={book} line={b.line} />
        </div>
      ))}
    </details>
  );
}

function SeedRow({ s, book }: { s: RhineSeed; book: string }) {
  return (
    <details className="list-row" style={{ display: 'block' }}>
      <summary style={{ cursor: 'pointer' }}>
        <b>{s.title}</b> <span className="small muted">{s.place || s.region}</span>
      </summary>
      <div className="small" style={{ marginTop: 4 }}>
        {s.text} <BookBadge book={book} line={s.line} />
      </div>
    </details>
  );
}

// ================================================================ the timeline

function History({ saga, book }: { saga: Saga; book: string }) {
  const [q, setQ] = useState('');
  const y = saga.currentYear;
  const coming = RHINE_TIMELINE.filter((e) => (e.to ?? e.year) >= y);
  const since = RHINE_TIMELINE.filter((e) => e.future && (e.to ?? e.year) < y);
  const needle = q.trim().toLowerCase();
  const past = RHINE_TIMELINE.filter((e) => !e.future && (e.to ?? e.year) < y && found(needle, String(e.year), e.text));
  return (
    <div className="stack">
      <Card title={`The coming years, from ${y}`} tour="tribunal-timeline">
        <p className="small muted" style={{ marginTop: 0 }}>
          What the book’s timeline holds from the saga’s year on: history in the making, for the storyguide to bring about, change or prevent. The toolkit does not make these happen.
        </p>
        {coming.length ? coming.map((e) => <EventRow key={e.line} e={e} y={y} book={book} />) : <Empty>The book’s timeline ends before {y}.</Empty>}
      </Card>
      {since.length > 0 && (
        <Card title={`Since the book (${since.length})`}>
          <p className="small muted" style={{ marginTop: 0 }}>
            The book’s coming events the saga has passed: whether they happened is the troupe’s to say.
          </p>
          {since.map((e) => (
            <EventRow key={e.line} e={e} y={y} book={book} />
          ))}
        </Card>
      )}
      <Card title="The history of the Rhine">
        <input type="search" placeholder="Search the history (a year, a name…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} aria-label="Search the history" />
        <details open={!!needle} style={{ marginTop: 6 }}>
          <summary className="small">{past.length} entries, from the Romans on</summary>
          {past.map((e) => (
            <EventRow key={e.line} e={e} y={y} book={book} />
          ))}
        </details>
      </Card>
    </div>
  );
}

function EventRow({ e, y, book }: { e: RhineEvent; y: number; book: string }) {
  const now = e.year <= y && y <= (e.to ?? e.year);
  return (
    <div className="list-row" style={{ alignItems: 'baseline' }}>
      <b style={{ minWidth: 88, flex: 'none' }}>
        {e.year}
        {e.to ? `–${e.to}` : ''}
      </b>
      <span className="small">
        {e.text} {now && <span className="badge warn">this year</span>} <BookBadge book={book} line={e.line} />
      </span>
    </div>
  );
}

// ================================================================ sagas and founding a covenant

function SagaIdeas({ book }: { book: string }) {
  const chapters = [...new Set(RHINE_SAGAS.map((s) => s.chapter))];
  return (
    <Card title="Saga ideas" tour="tribunal-sagas">
      {chapters.map((ch) => (
        <div key={ch}>
          <h3 style={{ marginBottom: 4 }}>{ch}</h3>
          {RHINE_SAGAS.filter((s) => s.chapter === ch).map((s) => (
            <details key={s.line} className="list-row" style={{ display: 'block' }}>
              <summary style={{ cursor: 'pointer' }}>
                <b>{s.name}</b>
              </summary>
              <div className="small" style={{ marginTop: 4 }}>
                {s.text} <BookBadge book={book} line={s.line} />
              </div>
            </details>
          ))}
        </div>
      ))}
    </Card>
  );
}

const STATUS: Record<FoundingSponsor['status'], string> = { unasked: 'not asked yet', sought: 'asked', promised: 'promises a sponsor', refused: 'refuses' };
const OUTLOOK_CLASS: Record<SponsorOutlook, string> = { easy: 'good', modest: '', steep: 'warn', unlikely: 'bad' };
const OUTLOOK_SHORT: Record<SponsorOutlook, string> = { easy: 'readily', modest: 'modest terms', steep: 'steep terms', unlikely: 'unlikely' };

function Founding({ saga, book, covs, chars, players }: { saga: Saga; book: TribunalBook; covs: Covenant[]; chars: Character[]; players: Covenant[] }) {
  const updateSaga = useStore((s) => s.updateSaga);
  const f = saga.founding;
  const ours = players.find((c) => c.id === f?.covenantId) ?? players[0];
  const title = <h3>Founding a covenant <BookBadge book={book.book} line={439} /></h3>;
  if (!ours)
    return (
      <Card title={title}>
        <Empty>The saga has no covenant of the players’ yet.</Empty>
      </Card>
    );
  const founders = chars.filter((c) => ours.memberIds.includes(c.id) && c.type === 'magus');
  const defs = foundingCovenants(book, saga);
  const p = foundingProgress(book, saga);
  const byKey = new Map(covs.filter((c) => c.living).map((c) => [c.living!.key, c]));
  const barred = enmityGilds(founders).map((id) => RHINE_GILDS.find((g) => g.id === id)!.tree);
  const next = nextGatherings(saga, saga.currentYear)[0];
  const S = `/saga/${saga.id}`;
  const set = (defId: string, fn: (s: FoundingSponsor) => void) =>
    updateSaga(saga.id, (x) => {
      const ff = (x.founding ??= { covenantId: ours.id, sponsors: {} });
      ff.covenantId ??= ours.id;
      fn((ff.sponsors[defId] ??= { status: 'unasked' }));
    });
  return (
    <Card title={title} tour="tribunal-founding">
      <p className="small" style={{ marginTop: 0 }}>
        The Rhine recognizes no covenant without a sponsor from each and every other covenant, who proclaims its petition worthy at a gathering. One magus suffices, though their fellows disagree,
        and never one of the founders. Failing to give a sponsor reflects badly on a covenant, so most agree to fairly modest terms unless they see a threat; the parens of a magus trained in
        the Rhine will likely sponsor from their covenant <BookBadge book={book.book} line={4071} />. The days before a gathering are the time for it.
      </p>
      <div className="row tight" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
        {players.length > 1 ? (
          <select value={ours.id} onChange={(e) => updateSaga(saga.id, (x) => void ((x.founding ??= { sponsors: {} }).covenantId = e.target.value))} aria-label="The players’ covenant">
            {players.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || 'Unnamed covenant'}
              </option>
            ))}
          </select>
        ) : (
          <b>{ours.name || 'The players’ covenant'}</b>
        )}
        <span className={`badge ${p.ready ? 'good' : p.refused.length ? 'warn' : ''}`}>
          {p.promised.length} of {p.of} sponsors promised
        </span>
        {f?.recognizedYear ? <span className="badge good">recognized at the gathering of {f.recognizedYear}</span> : null}
        {f && (
          <Confirm className="small" label="Start over" message="Clear the sponsors, terms and gifts of this bid?" onYes={() => updateSaga(saga.id, (x) => void delete x.founding)} />
        )}
      </div>
      {barred.length > 0 && (
        <p className="small warn-text" style={{ marginTop: 0 }}>
          (Gild) Enmity: magi of the {barred.join(' and ')} Gild{barred.length > 1 ? 's' : ''} will not sponsor this covenant.
        </p>
      )}
      {defs.map((def) => {
        const cov = byKey.get(def.id);
        const s = sponsorOf(f, def.id);
        const o = sponsorOutlook(cov);
        const who = sponsorCandidates(cov, chars, founders);
        return (
          <div key={def.id} className="list-row" style={{ flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {cov ? (
              <Link to={`${S}/covenant/${cov.id}`}>
                <b>{def.name}</b>
              </Link>
            ) : (
              <b>{def.name}</b>
            )}
            <span className={`badge ${OUTLOOK_CLASS[o]}`} title={OUTLOOK_TEXT[o]}>
              {cov ? `${cov.living?.attitude ?? 'neutral'}: ${OUTLOOK_SHORT[o]}` : 'not in the saga'}
            </span>
            <select value={s.status} onChange={(e) => set(def.id, (x) => void (x.status = e.target.value as FoundingSponsor['status']))} aria-label={`${def.name}: sponsor`}>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {who.length ? (
              <select value={s.magusId ?? ''} onChange={(e) => set(def.id, (x) => void (x.magusId = e.target.value || undefined))} aria-label={`${def.name}: the sponsoring magus`}>
                <option value="">a magus…</option>
                {who.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input key={`n${def.id}`} placeholder="the sponsor" defaultValue={s.name ?? ''} onBlur={(e) => set(def.id, (x) => void (x.name = e.target.value || undefined))} style={{ width: 130 }} aria-label={`${def.name}: the sponsor`} />
            )}
            <div className="row tight" style={{ flexBasis: '100%', flexWrap: 'wrap' }}>
              <input key={`t${def.id}`} placeholder="what was promised in return" defaultValue={s.terms ?? ''} onBlur={(e) => set(def.id, (x) => void (x.terms = e.target.value || undefined))} style={{ flex: '2 1 200px' }} aria-label={`${def.name}: terms`} />
              <input key={`g${def.id}`} placeholder="the sponsor’s gift" defaultValue={s.gift ?? ''} onBlur={(e) => set(def.id, (x) => void (x.gift = e.target.value || undefined))} style={{ flex: '1 1 140px' }} aria-label={`${def.name}: gift`} />
              <label className="inline small">
                <input type="checkbox" checked={!!s.delivered} onChange={(e) => set(def.id, (x) => void (x.delivered = e.target.checked))} /> given
              </label>
            </div>
            {!cov && <div className="small muted" style={{ flexBasis: '100%' }}>Add {def.name} on the Covenants tab to choose its sponsor among its magi, or write a name.</div>}
          </div>
        );
      })}
      {p.ready && !f?.recognizedYear && (
        <div className="row tight" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <span className="small">
            Every covenant has promised a sponsor: the Tribunal recognizes {ours.name || 'the covenant'} at its next gathering
            {next ? ` (${next.year})` : ''} when the seasons pass to it.
          </span>
          <button className="small" onClick={() => updateSaga(saga.id, (x) => void (x.founding!.recognizedYear = x.currentYear))}>
            Recognized now
          </button>
        </div>
      )}
      <p className="small muted" style={{ marginBottom: 0 }}>
        Each sponsor presents a gift: its worth reflects the sponsor covenant’s greatness and its feeling for the new one, the grudging giving little; some come at once, others in later seasons{' '}
        <BookBadge book={book.book} line={4079} />. A sponsor’s strange gift, or a lavish one that turns mundane when its Imaginem spells end, can start a story <BookBadge book={book.book} line={4064} />.
        A covenant the book has not yet admitted (Heorot) needs no sponsor until its admission carries.
      </p>
    </Card>
  );
}
