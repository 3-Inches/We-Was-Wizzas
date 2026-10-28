// The mechanics reference: every game mechanic in the reviewed 5th Edition books, by area and
// topic, from the rules everyone uses to the ones a Virtue, House, initiation or tradition opens.
// Each entry has a short summary, the key rules quoted from the book, and the book's own text
// on demand (loaded from the book file by its heading).

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { BOOK_BY_ID } from '../../data';
import {
  MECHANICS_FILTERS,
  type MechanicsVersion,
  type MechanicsArea,
  type MechanicsAreaSummary,
  type MechanicsAudience,
  type MechanicsEntry,
  type MechanicsGroup,
  type MechanicsGroupSummary,
  type MechanicsIndex,
} from '../../data/mechanicsTypes';
import { BookBadge, Card, Empty, Markdown, SearchInput } from '../kit';
import { useBookSection } from '../bookText';
import { APP_PLACES, type AppPlace } from '../../data/appPlaces';
import { OPTIONAL_RULES, optionOn, tribunalMatches, tribunalName } from '../../engine/optional';
import { useStore } from '../../store/store';
import { Hint } from '../Hint';

// The index comes first; an area's mechanics load when it is opened, and all of them for a search.
const areaFiles = import.meta.glob<{ default: unknown }>(['../../data/generated/mechanics/*.json', '!../../data/generated/mechanics/index.json']);
let indexCache: MechanicsIndex | null = null;
const areaCache = new Map<string, MechanicsArea>();

function loadArea(id: string): Promise<MechanicsArea> {
  const hit = areaCache.get(id);
  if (hit) return Promise.resolve(hit);
  const load = areaFiles[`../../data/generated/mechanics/${id}.json`];
  if (!load) return Promise.reject(new Error(`no area ${id}`));
  return load().then((m) => {
    const a = m.default as MechanicsArea;
    areaCache.set(id, a);
    return a;
  });
}

function useMechanicsIndex(): MechanicsIndex | null {
  const [data, setData] = useState<MechanicsIndex | null>(indexCache);
  useEffect(() => {
    if (indexCache) return;
    void import('../../data/generated/mechanics/index.json').then((m) => {
      indexCache = m.default as unknown as MechanicsIndex;
      setData(indexCache);
    });
  }, []);
  return data;
}

/** The mechanics of the given areas, loaded when `enabled`. */
function useAreas(ids: string[], enabled: boolean): MechanicsArea[] | null {
  const key = ids.join(',');
  const cached = () => (ids.every((id) => areaCache.has(id)) ? ids.map((id) => areaCache.get(id)!) : null);
  const [areas, setAreas] = useState<MechanicsArea[] | null>(cached);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void Promise.all(key.split(',').filter(Boolean).map(loadArea)).then((as) => live && setAreas(as));
    return () => {
      live = false;
    };
  }, [key, enabled]);
  return enabled ? areas : null;
}

const AUDIENCE_LABEL: Record<MechanicsAudience, string> = {
  all: 'everyone', magi: 'magi', companions: 'companions', grogs: 'grogs', storyguide: 'storyguide', covenant: 'covenant',
};
const FILTERS: { id: string; label: string }[] = [
  { id: '', label: 'Everything' },
  { id: 'magi', label: 'Magi' },
  { id: 'companions', label: 'Companions' },
  { id: 'grogs', label: 'Grogs' },
  { id: 'storyguide', label: 'Storyguide' },
];
const PREVALENCE: Record<number, { label: string; title: string }> = {
  1: { label: 'core', title: 'Used constantly by most characters' },
  2: { label: 'common', title: 'A regular part of play' },
  3: { label: 'situational', title: 'Used now and then, when the situation calls for it' },
  4: { label: 'gated', title: 'Needs a specific Virtue, House, initiation, tradition or kind of being' },
};

/** Does an entry concern the audience chosen in the filter? */
function forAudience(e: MechanicsEntry, who: string): boolean {
  if (!who) return true;
  if (who === 'storyguide') return e.audience.includes('storyguide');
  return e.audience.includes(who as MechanicsAudience) || e.audience.includes('all') || (who === 'magi' && e.audience.includes('covenant'));
}

const countOf = (g: MechanicsGroupSummary, who: string) => g.counts[Math.max(0, MECHANICS_FILTERS.indexOf(who as (typeof MECHANICS_FILTERS)[number]))] ?? 0;

function count(groups: MechanicsGroupSummary[], who: string): number {
  return groups.reduce((s, g) => s + countOf(g, who), 0);
}

function AudienceFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="chip-row" role="group" aria-label="Show mechanics for" data-tour="mechanics-filter">
      {FILTERS.map((f) => (
        <button key={f.id} type="button" className={`chip ${value === f.id ? 'on' : ''}`} onClick={() => onChange(f.id)}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

/** The audience filter lives in the address (?for=magi), so links and the back button keep it. */
function useAudience(): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const who = params.get('for') ?? '';
  return [who, (v) => setParams(v ? { for: v } : {}, { replace: true })];
}

const qs = (who: string) => (who ? `?for=${who}` : '');
/** A mechanics path ("/mechanics/area/group#entry") with the audience filter kept. */
const withAudience = (to: string, who: string) => (who ? to.replace(/(#|$)/, `${qs(who)}$1`) : to);

export default function MechanicsPage() {
  const { areaId, groupId } = useParams();
  const data = useMechanicsIndex();
  if (!data) return <div className="muted">Loading the mechanics…</div>;
  const area = areaId ? data.areas.find((a) => a.id === areaId) : undefined;
  if (areaId && !area) return <Empty>No such area. <Link to="/mechanics">All mechanics</Link></Empty>;
  if (area && groupId) {
    const gated = area.gated.some((g) => g.id === groupId);
    const group = [...area.groups, ...area.gated].find((g) => g.id === groupId);
    if (!group) return <Empty>No such topic. <Link to={`/mechanics/${area.id}`}>{area.title}</Link></Empty>;
    return <GroupView area={area} summary={group} gated={gated} />;
  }
  if (area) return <AreaView area={area} />;
  return <IndexView data={data} />;
}

function IndexView({ data }: { data: MechanicsIndex }) {
  const [who, setWho] = useAudience();
  const [q, setQ] = useState('');
  const searching = q.trim().length >= 2;
  const loaded = useAreas(
    data.areas.map((a) => a.id),
    searching,
  );
  const results = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (qq.length < 2 || !loaded) return [];
    const out: { area: MechanicsAreaSummary; group: MechanicsGroup; entry: MechanicsEntry; score: number }[] = [];
    for (const [i, full] of loaded.entries()) {
      const area = data.areas[i];
      for (const group of [...full.groups, ...full.gated]) {
        for (const entry of group.entries) {
          if (!forAudience(entry, who)) continue;
          const title = entry.title.toLowerCase();
          const others = (entry.versions ?? []).map((v) => `${v.title} ${v.summary}`).join(' ');
          const hay = `${title} ${group.title} ${entry.summary} ${entry.requires ?? ''} ${others}`.toLowerCase();
          if (!hay.includes(qq)) continue;
          out.push({ area, group, entry, score: (title.includes(qq) ? 0 : 1) + entry.prevalence / 10 });
        }
      }
    }
    // an entry listed under creation and its own area appears once
    const seen = new Set<string>();
    return out.sort((a, b) => a.score - b.score).filter((r) => (seen.has(r.entry.id) ? false : (seen.add(r.entry.id), true))).slice(0, 80);
  }, [q, data, who, loaded]);
  const total = data.total;
  return (
    <div className="stack">
      <div>
        <h1 style={{ marginBottom: 4 }}>Game mechanics</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          The {total.toLocaleString()} rules players and storyguides actually use, gathered from the core rules and every reviewed 5th Edition supplement, from the
          rules everyone uses to the ones a Virtue, House, initiation or tradition opens. Each has a short summary, the key rules quoted from the book, and the book&apos;s own
          text a click away. The summaries are a guide; the book text is the rule.
        </p>
        <p className="small muted" style={{ marginTop: 0 }}>
          A rule several books print is listed once, under the Definitive Edition if it has it, otherwise under the newest book; the other books are named with it. Where another
          book says it differently, its version sits under the entry: the Definitive Edition rules, then the newer book, unless your troupe prefers the older one.
        </p>
          <Hint id="mechanics-how">Start with <b>The basics</b>. Each rule has a summary, the key text, and the book&apos;s own words a click away; <b>In the app</b> says where the toolkit does it.</Hint>
      </div>
      <div className="row">
        <SearchInput value={q} onChange={setQ} placeholder="Search every mechanic: certamen, longevity, familiar, mass combat…" />
        <AudienceFilter value={who} onChange={setWho} />
      </div>
      {searching && !loaded ? (
        <div className="muted">Loading every mechanic…</div>
      ) : searching ? (
        <Card title={`${results.length}${results.length === 80 ? '+' : ''} matches`}>
          {results.map((r) => (
            <div key={`${r.area.id}-${r.entry.id}`} className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="row">
                <Link to={`/mechanics/${r.area.id}/${r.group.id}${qs(who)}#${r.entry.id}`}>
                  <b>{r.entry.title}</b>
                </Link>
                <span className="small muted">
                  {r.area.title} › {r.group.title}
                </span>
                <BookBadge book={r.entry.book} line={r.entry.line} />
              </div>
              <div className="small">{r.entry.summary}</div>
            </div>
          ))}
          {!results.length && <Empty>Nothing matches.</Empty>}
        </Card>
      ) : (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {data.areas.map((a) => {
            const open = count(a.groups, who);
            const gated = count(a.gated, who);
            if (!open && !gated) return null;
            return (
              <Link key={a.id} to={`/mechanics/${a.id}${qs(who)}`} className="card clickable" style={{ textDecoration: 'none', color: 'inherit', margin: 0 }}>
                <h3 style={{ margin: '0 0 4px' }}>
                  <span aria-hidden>{a.icon}</span> {a.title}
                </h3>
                <div className="small muted">{a.intro}</div>
                <div className="small" style={{ marginTop: 6 }}>
                  {open} mechanics{gated ? ` · ${gated} that need a Virtue, House or initiation` : ''}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Breadcrumb({ area, group, who }: { area?: MechanicsAreaSummary; group?: { title: string }; who: string }) {
  return (
    <div className="small muted">
      <Link to={`/mechanics${qs(who)}`}>Game mechanics</Link>
      {area && (
        <>
          {' › '}
          {group ? <Link to={`/mechanics/${area.id}${qs(who)}`}>{area.title}</Link> : area.title}
        </>
      )}
      {group && ` › ${group.title}`}
    </div>
  );
}

function AreaView({ area }: { area: MechanicsAreaSummary }) {
  const [who, setWho] = useAudience();
  const groupRow = (g: MechanicsGroupSummary) => {
    const n = countOf(g, who);
    if (!n) return null;
    const reqs = g.requires;
    return (
      <div key={g.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <div className="row">
          <Link to={`/mechanics/${area.id}/${g.id}${qs(who)}`}>
            <b>{g.title}</b>
          </Link>
          <span className="small muted">{n === 1 ? '1 mechanic' : `${n} mechanics`}</span>
          {g.books.map((b) => (
            <span key={b} className="badge">
              {BOOK_BY_ID[b]?.abbr ?? b}
            </span>
          ))}
        </div>
        <div className="small muted">{g.intro ?? g.sample.join(' · ')}</div>
        {reqs.length > 0 && <div className="small">Needs: {reqs.join('; ')}{n > reqs.length ? '…' : ''}</div>}
      </div>
    );
  };
  // every topic in the area's own order, however few mechanics it has
  const groupList = (gs: MechanicsGroupSummary[]) => <>{gs.map(groupRow)}</>;
  return (
    <div className="stack">
      <Breadcrumb area={area} who={who} />
      <div>
        <h1 style={{ marginBottom: 4 }}>
          <span aria-hidden>{area.icon}</span> {area.title}
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>
          {area.intro}
        </p>
      </div>
      <AudienceFilter value={who} onChange={setWho} />
      {count(area.groups, who) > 0 && <Card title="Mechanics, from the most used to the most specialised">{groupList(area.groups)}</Card>}
      {count(area.gated, who) > 0 && <Card title="Needs a Virtue, House, initiation, tradition or kind of being">{groupList(area.gated)}</Card>}
      {!count(area.groups, who) && !count(area.gated, who) && <Empty>Nothing in this area for that choice.</Empty>}
    </div>
  );
}

function GroupView({ area, summary, gated }: { area: MechanicsAreaSummary; summary: MechanicsGroupSummary; gated: boolean }) {
  const [who, setWho] = useAudience();
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.replace(/^#/, ''));
  const full = useAreas([area.id], true)?.[0];
  const group = full && [...full.groups, ...full.gated].find((g) => g.id === summary.id);
  const shown = (group?.entries ?? []).filter((e) => forAudience(e, who));
  // a big group is split by topic, with a list of its topics at the top
  const sections: { title: string; entries: MechanicsEntry[] }[] = [];
  for (const e of shown) {
    const t = e.section ?? '';
    if (sections.at(-1)?.title !== t) sections.push({ title: t, entries: [] });
    sections.at(-1)!.entries.push(e);
  }
  const split = sections.length > 1;
  const sectionId = (t: string) => `topic-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="stack">
      <Breadcrumb area={area} group={summary} who={who} />
      <div>
        <h1 style={{ marginBottom: 4 }}>{summary.title}</h1>
        {summary.intro && <p className="muted" style={{ marginTop: 0 }}>{summary.intro}</p>}
        {gated && <p className="small muted">These mechanics need a specific Virtue, House, initiation, tradition or kind of being.</p>}
        <InTheApp topic={summary.id} />
        <OptionalIn topic={summary.id} />
      </div>
      <AudienceFilter value={who} onChange={setWho} />
      {split && (
        <nav className="small" aria-label="Topics">
          {sections.map((sec, i) => (
            <span key={sec.title}>
              {i > 0 && ' · '}
              <a
                href={`#${sectionId(sec.title)}`}
                onClick={(ev) => {
                  ev.preventDefault();
                  document.getElementById(sectionId(sec.title))?.scrollIntoView({ block: 'start' });
                }}
              >
                {sec.title || 'Other'}
              </a>{' '}
              <span className="muted">({sec.entries.length})</span>
            </span>
          ))}
        </nav>
      )}
      {sections.map((sec) => (
        <div key={sec.title} className="stack" id={split ? sectionId(sec.title) : undefined}>
          {split && <h2 style={{ margin: '8px 0 0' }}>{sec.title || 'Other'}</h2>}
          {sec.entries.map((e) => (
            <EntryCard key={e.id} entry={e} focused={target === e.id} who={who} />
          ))}
        </div>
      ))}
      {!full && <div className="muted">Loading…</div>}
      {full && !shown.length && <Empty>Nothing here for that choice.</Empty>}
    </div>
  );
}

function EntryCard({ entry, focused, who }: { entry: MechanicsEntry; focused: boolean; who: string }) {
  const [open, setOpen] = useState(focused);
  const sec = useBookSection(entry.book, entry.line, entry.endLine, open);
  const book = BOOK_BY_ID[entry.book];
  // a link to this mechanic (from search or a "see also") opens it and brings it into view
  useEffect(() => {
    if (!focused) return;
    setOpen(true);
    document.getElementById(entry.id)?.scrollIntoView({ block: 'start' });
  }, [focused, entry.id]);
  const p = PREVALENCE[entry.prevalence];
  return (
    <section className="card" id={entry.id} style={{ margin: 0 }}>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{entry.title}</h3>
        <BookBadge book={entry.book} line={entry.line} />
        <span className={`badge ${entry.prevalence === 4 ? 'warn' : entry.prevalence === 1 ? 'good' : ''}`} title={p.title}>
          {p.label}
        </span>
        {entry.creation && <span className="badge">character creation</span>}
        <span className="small muted">for {entry.audience.map((a) => AUDIENCE_LABEL[a]).join(', ')}</span>
      </div>
      {entry.requires && (
        <div className="small" style={{ marginTop: 4 }}>
          <b>Needs:</b> {entry.requires}
        </div>
      )}
      <p style={{ margin: '6px 0' }}>{entry.summary}</p>
      {entry.quotes && entry.quotes.length > 0 && (
        <ul className="small" style={{ margin: '4px 0', paddingLeft: 18 }}>
          {entry.quotes.map((q) => (
            <li key={q}>
              <q>{q}</q>
            </li>
          ))}
        </ul>
      )}
      {entry.alsoIn && entry.alsoIn.length > 0 && (
        <div className="small muted row tight">
          Also printed in:
          {entry.alsoIn.map((a) => (
            <BookBadge key={`${a.book}-${a.line}`} book={a.book} line={a.line} />
          ))}
        </div>
      )}
      {entry.versions && entry.versions.length > 0 && (
        <details className="small" style={{ margin: '4px 0' }}>
          <summary style={{ cursor: 'pointer' }}>
            {entry.versions.length === 1 ? 'Another book’s version' : `Other books’ versions (${entry.versions.length})`}: {entry.versions.map((v) => BOOK_BY_ID[v.book]?.abbr ?? v.book).join(', ')}
          </summary>
          {entry.versions.map((v) => (
            <VersionCard key={v.id} version={v} />
          ))}
        </details>
      )}
      {entry.related && entry.related.length > 0 && (
        <div className="small muted">
          See also:{' '}
          {entry.related.map((r, i) => (
            <span key={r.text}>
              {i > 0 && '; '}
              {r.to ? <Link to={withAudience(r.to, who)}>{r.text}</Link> : r.text}
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 6 }}>
        <button className="small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Hide the rules' : 'Read the rules'}
        </button>
        <a className="small" href={`#/reference/book/${encodeURIComponent(entry.book)}?line=${entry.line}`}>
          Open in {book?.title ?? entry.book}
        </a>
      </div>
      {open && (
        <div style={{ borderLeft: '3px solid var(--line)', paddingLeft: 10, marginTop: 8 }}>
          {sec.loading && <div className="small muted">Loading the book…</div>}
          {sec.error && <div className="small bad-text">{sec.error}</div>}
          {sec.text && <Markdown text={sec.text} />}
        </div>
      )}
    </section>
  );
}

/** Another book's version of a rule, under the entry that comes first. */
function VersionCard({ version: v }: { version: MechanicsVersion }) {
  const [open, setOpen] = useState(false);
  const sec = useBookSection(v.book, v.line, v.endLine, open);
  return (
    <div style={{ borderLeft: '3px solid var(--line)', paddingLeft: 10, margin: '6px 0' }}>
      <div className="row tight" style={{ alignItems: 'baseline' }}>
        <b>{v.title}</b>
        <BookBadge book={v.book} line={v.line} />
        {v.prevalence === 4 && <span className="badge warn">gated</span>}
      </div>
      {v.requires && (
        <div>
          <b>Needs:</b> {v.requires}
        </div>
      )}
      <div>{v.summary}</div>
      {v.quotes && v.quotes.length > 0 && (
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          {v.quotes.map((q) => (
            <li key={q}>
              <q>{q}</q>
            </li>
          ))}
        </ul>
      )}
      <button className="small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Hide the rules' : 'Read the rules'}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {sec.loading && <div className="muted">Loading the book…</div>}
          {sec.error && <div className="bad-text">{sec.error}</div>}
          {sec.text && <Markdown text={sec.text} />}
        </div>
      )}
    </div>
  );
}

/** Where the app does this topic's rules: pages are linked for the saga last opened. */
function InTheApp({ topic }: { topic: string }) {
  const sagaId = useStore((s) => s.activeSagaId);
  const places = APP_PLACES[topic];
  if (!places?.length) return null;
  const href = (p: AppPlace) =>
    p.page === 'dice' ? '/dice' : p.page && sagaId ? `/saga/${sagaId}${p.page === 'saga' ? '' : `/${p.page}`}${p.tab ? `?tab=${p.tab}` : ''}` : undefined;
  return (
    <p className="small" style={{ margin: '4px 0 0' }}>
      <b>In the app:</b>{' '}
      {places.map((p, i) => {
        const to = href(p);
        return (
          <span key={i}>
            {i > 0 && ' · '}
            {to ? <Link to={to}>{p.text}</Link> : p.text}
          </span>
        );
      })}
    </p>
  );
}

/** The optional rules that switch this topic's rules on in the app, and whether the saga last opened uses them. */
function OptionalIn({ topic }: { topic: string }) {
  const saga = useStore((s) => (s.activeSagaId ? s.sagas[s.activeSagaId] : undefined));
  const rules = OPTIONAL_RULES.filter((r) => r.topics.includes(topic) && (!r.tribunal || !saga || tribunalMatches(saga, r)));
  if (!rules.length) return null;
  return (
    <p className="small" style={{ margin: '4px 0 0' }}>
      <b>Optional rule{rules.length > 1 ? 's' : ''}:</b>{' '}
      {rules.map((r, i) => (
        <span key={r.id}>
          {i > 0 && ' · '}
          {r.label}
          {r.tribunal ? ` (the ${tribunalName(r)} Tribunal)` : ''}
          {saga ? (
            <span className={optionOn(saga, r.id) ? 'good-text' : 'muted'}>: {optionOn(saga, r.id) ? `on in ${saga.name}` : `off in ${saga.name}`}</span>
          ) : (
            <span className="muted">: {r.defaultOn ? 'on unless a saga turns it off' : 'off until a saga turns it on'}</span>
          )}
        </span>
      ))}
      {saga ? (
        <>
          {' · '}
          <Link to={`/saga/${saga.id}/rules?tab=optional`}>Optional rules ›</Link>
        </>
      ) : (
        <span className="muted"> (House rules → Optional rules)</span>
      )}
    </p>
  );
}
