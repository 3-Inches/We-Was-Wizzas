import { useMemo, useState } from 'react';
import { STATUS_CULTURES, type VFCategory, type VFSize, type VirtueFlawDef } from '../../../data';
import { addVirtue, removeVirtue } from '../../../engine/character/factory';
import { deriveCharacter, vfDisplayName } from '../../../engine/character/derive';
import { vfAvailability, vfProblems, type VFProblem } from '../../../engine/character/restrictions';
import { BookBadge, Card, Markdown, Meter, SearchInput } from '../../kit';
import ParamInput from '../ParamInput';
import type { CharEditor } from '../useChar';

const CATS: VFCategory[] = ['General', 'Hermetic', 'Supernatural', 'Social Status', 'Personality', 'Story', 'Mythic Companion', 'Heroic', 'Mystery', 'Special'];

export default function VirtuesStep({ ed }: { ed: CharEditor }) {
  const { c, d, data } = ed;
  if (!c || !d) return null;
  const t = d.tally;
  const maxFlaws = c.type === 'grog' ? ed.saga!.houseRules.grogMaxFlawPoints : ed.saga!.houseRules.maxFlawPoints;
  return (
    <>
      <Card title="Point balance" className="accent">
        <div className="grid grid-4">
          <Meter label="Flaw points" value={t.flawPoints} max={maxFlaws} />
          <Meter label={c.type === 'mythic' ? 'Virtue points (2 per Flaw point)' : 'Virtue points'} value={t.virtuePoints} max={t.allowedVirtuePoints} />
          {c.type !== 'grog' && <Meter label="Minor Flaws" value={t.minorFlaws} max={ed.saga!.houseRules.maxMinorFlaws} />}
          <div className="small">
            Story Flaws: <b>{t.storyFlaws}</b> · Personality Flaws: <b>{t.personalityFlaws}</b>
            {c.type === 'magus' && (
              <>
                {' '}
                · Major Hermetic Virtues: <b>{t.majorHermeticVirtues}</b> · Hermetic Flaws: <b>{t.hermeticFlaws}</b>
              </>
            )}
          </div>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          {c.type === 'grog'
            ? 'Grogs: up to 3 Minor Flaws and the same number of Minor Virtues; no Major, Hermetic, or Story choices.'
            : c.type === 'mythic'
              ? 'Mythic Companions: up to 10 points of Flaws, each worth 2 points of Virtues; plus a free Minor Virtue and the free type Virtue.'
              : 'Up to 10 points of Flaws (no more than 5 Minor), balanced by the same number of points of Virtues. Major = 3, Minor = 1.'}{' '}
          Every character needs one Social Status.
        </p>
      </Card>
      <TakenList ed={ed} />
      <VirtueBrowser ed={ed} />
      {data && null}
    </>
  );
}

function TakenList({ ed }: { ed: CharEditor }) {
  const { c, d, data, update } = ed;
  const [open, setOpen] = useState<string | null>(null);
  if (!c || !d) return null;
  const requiredBy = (uid?: string) => (uid ? d.virtues.find((x) => x.cv.uid === uid)?.name : undefined);
  const virtues = d.virtues.filter((v) => v.def?.kind !== 'flaw');
  const flaws = d.virtues.filter((v) => v.def?.kind === 'flaw');
  const row = (v: (typeof d.virtues)[number]) => {
    const def = v.def;
    return (
      <div key={v.cv.uid} className={`vf-item taken ${def?.kind === 'flaw' ? 'flaw' : ''}`} style={{ marginBottom: 6 }}>
        <div className="row">
          <span className="name clickable" onClick={() => setOpen(open === v.cv.uid ? null : v.cv.uid)}>
            {v.name}
          </span>
          {def && def.sizes.length > 1 && !v.cv.free ? (
            <select value={v.cv.size} onChange={(e) => update((x) => void (x.virtues.find((y) => y.uid === v.cv.uid)!.size = e.target.value as VFSize))}>
              {def.sizes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className="badge">{v.cv.size}</span>
          )}
          {def?.categories.map((cat) => (
            <span key={cat} className="badge">
              {cat}
            </span>
          ))}
          {v.cv.free && <span className="badge good" title={v.cv.freeReason}>free · {v.cv.freeReason}</span>}
          {v.cv.noPoints && <span className="badge warn">no points</span>}
          {requiredBy(v.cv.requiredBy) && <span className="badge info">required by {requiredBy(v.cv.requiredBy)}</span>}
          {def && <BookBadge book={def.source.book} anchor={def.source.anchor} line={def.source.line} />}
          <span className="spacer" />
          <span className="small muted">{v.points > 0 ? `costs ${v.points}` : v.points < 0 ? `gives ${-v.points}` : ''}</span>
          <button className="small ghost" onClick={() => update((x) => removeVirtue(x, data, v.cv.uid))} title="Remove">
            ✕
          </button>
        </div>
        {def &&
          vfProblems(d, data, def, v.cv)
            .filter((p) => p.severity !== 'info' && !c.acknowledgedIssues.includes(p.id))
            .map((p) => (
              <div key={p.id} className={`small ${p.severity === 'error' ? 'bad-text' : 'warn-text'}`} style={{ marginTop: 4 }}>
                {p.severity === 'error' ? '✕' : '!'} {p.message}{' '}
                <button className="small ghost" onClick={() => ed.acknowledge(p.id)} title="Record a troupe ruling that allows this">
                  Allow
                </button>
              </div>
            ))}
        {def?.param && (
          <div className="row small" style={{ marginTop: 4 }}>
            <span>{def.param.label}:</span>
            <ParamInput spec={def.param} value={v.cv.param} data={data} onChange={(val) => update((x) => void (x.virtues.find((y) => y.uid === v.cv.uid)!.param = val || undefined))} />
          </div>
        )}
        {open === v.cv.uid && def && (
          <div style={{ marginTop: 6 }}>
            <Markdown text={def.text} />
            <div className="row small">
              <label className="inline">
                <input type="checkbox" checked={!!v.cv.free} onChange={(e) => update((x) => { const y = x.virtues.find((z) => z.uid === v.cv.uid)!; y.free = e.target.checked; y.freeReason = e.target.checked ? y.freeReason ?? 'Troupe ruling' : undefined; })} /> Free (does not cost/give points)
              </label>
              {def.kind === 'flaw' && (
                <label className="inline">
                  <input type="checkbox" checked={!!v.cv.noPoints} onChange={(e) => update((x) => void (x.virtues.find((z) => z.uid === v.cv.uid)!.noPoints = e.target.checked))} /> Gives no Virtue points
                </label>
              )}
              <input placeholder="note" value={v.cv.note ?? ''} onChange={(e) => update((x) => void (x.virtues.find((z) => z.uid === v.cv.uid)!.note = e.target.value))} />
            </div>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="grid grid-2">
      <Card title={`Virtues (${virtues.length})`}>{virtues.length ? virtues.map(row) : <div className="muted small">None yet — browse below.</div>}</Card>
      <Card title={`Flaws (${flaws.length})`}>{flaws.length ? flaws.map(row) : <div className="muted small">None yet — Flaws pay for Virtues.</div>}</Card>
    </div>
  );
}

/** Why this Virtue/Flaw can't (error) or shouldn't (warning) be taken now; null if it can. */
export function availability(ed: CharEditor, v: VirtueFlawDef): VFProblem | null {
  const { d, data } = ed;
  if (!d) return null;
  return vfAvailability(d, data, v);
}

function VirtueBrowser({ ed }: { ed: CharEditor }) {
  const { c, data, update } = ed;
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'virtue' | 'flaw'>('all');
  const [cats, setCats] = useState<VFCategory[]>([]);
  const [size, setSize] = useState<'all' | VFSize>('all');
  const [source, setSource] = useState<'enabled' | 'DE' | 'all'>('enabled');
  const [hideUnavailable, setHideUnavailable] = useState(true);
  const [showCreature, setShowCreature] = useState(false);
  const [limit, setLimit] = useState(60);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    if (!c) return [];
    const qq = q.trim().toLowerCase();
    return data.virtuesFlaws
      .filter((v) => (kind === 'all' ? true : v.kind === kind))
      .filter((v) => (cats.length ? v.categories.some((x) => cats.includes(x)) : true))
      .filter((v) => (size === 'all' ? true : v.sizes.includes(size)))
      .filter((v) => (source === 'DE' ? v.source.book === 'DE' : source === 'enabled' ? data.isBookEnabled(v.source.book) : true))
      .filter((v) => showCreature || !v.creatureOnly)
      .filter((v) => !qq || v.name.toLowerCase().includes(qq) || v.text.toLowerCase().includes(qq))
      .filter((v) => !hideUnavailable || availability(ed, v)?.severity !== 'error')
      .filter((v) => {
        if (!v.categories.includes('Social Status')) return true;
        const cult = STATUS_CULTURES[v.name];
        return !cult || cult.includes('All Cultures') || cult.includes(c.society) || !hideUnavailable;
      })
      .sort((a, b) => {
        const an = a.name.toLowerCase().startsWith(qq) ? 0 : 1;
        const bn = b.name.toLowerCase().startsWith(qq) ? 0 : 1;
        if (an !== bn) return an - bn;
        if ((a.source.book === 'DE') !== (b.source.book === 'DE')) return a.source.book === 'DE' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [data, q, kind, cats, size, source, hideUnavailable, showCreature, c, ed]);

  if (!c) return null;
  return (
    <Card title="Browse Virtues & Flaws">
      <div className="row" style={{ marginBottom: 8 }}>
        <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(60); }} placeholder="Search names and text (e.g. 'Puissant', 'Lab Total', 'faerie')" />
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="all">Virtues & Flaws</option>
          <option value="virtue">Virtues</option>
          <option value="flaw">Flaws</option>
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value as typeof size)}>
          <option value="all">Any size</option>
          <option>Major</option>
          <option>Minor</option>
          <option>Free</option>
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
          <option value="enabled">Saga's books</option>
          <option value="DE">Definitive Edition only</option>
          <option value="all">All 5e books</option>
        </select>
      </div>
      <div className="chip-row" style={{ marginBottom: 8 }}>
        {CATS.map((cat) => (
          <span key={cat} className={`chip ${cats.includes(cat) ? 'on' : ''}`} onClick={() => setCats((cs) => (cs.includes(cat) ? cs.filter((x) => x !== cat) : [...cs, cat]))}>
            {cat}
          </span>
        ))}
        <label className="inline small">
          <input type="checkbox" checked={hideUnavailable} onChange={(e) => setHideUnavailable(e.target.checked)} /> Only what this character can take
        </label>
        <label className="inline small">
          <input type="checkbox" checked={showCreature} onChange={(e) => setShowCreature(e.target.checked)} /> Include creature-only
        </label>
      </div>
      <div className="small muted" style={{ marginBottom: 6 }}>
        {list.length} results
      </div>
      <div className="stack">
        {list.slice(0, limit).map((v) => {
          const why = availability(ed, v);
          const blocked = why?.severity === 'error';
          const take = (s: VFSize, allow = false) =>
            update((x) => {
              const cv = addVirtue(x, data, v.id, s);
              if (!allow || !ed.saga) return;
              // record the troupe ruling for whatever the rules check now flags on this Virtue
              const dd = deriveCharacter(x, data, ed.saga.houseRules);
              for (const p of vfProblems(dd, data, v, cv)) if (p.severity === 'error' && !x.acknowledgedIssues.includes(p.id)) x.acknowledgedIssues.push(p.id);
            });
          return (
            <div key={v.id} className={`vf-item ${v.kind}`}>
              <div className="row">
                <span className="name clickable" onClick={() => setOpen(open === v.id ? null : v.id)}>
                  {v.name}
                </span>
                <span className={`badge ${v.kind === 'flaw' ? 'bad' : 'good'}`}>{v.kind}</span>
                <span className="badge">{v.sizes.join('/')}</span>
                {v.categories.map((cat) => (
                  <span key={cat} className="badge">
                    {cat}
                  </span>
                ))}
                {v.tainted && <span className="badge bad">Tainted</span>}
                {v.beings && <span className="badge warn" title={`For ${v.beings}`}>non-human</span>}
                {v.tradition && <span className="badge" title="Hedge tradition">{v.tradition.replace(/ \(.*\)$/, '')}</span>}
                {v.region && <span className="badge" title="Only exists in this region">{v.region}</span>}
                {v.effects?.some((e) => e.type !== 'note') && <span className="badge info" title="Mechanical effects are applied automatically">auto</span>}
                <BookBadge book={v.source.book} anchor={v.source.anchor} line={v.source.line} />
                <span className="spacer" />
                {why && (
                  <span className={`small ${blocked ? 'bad-text' : 'warn-text'}`} title={why.message}>
                    {why.short}
                  </span>
                )}
                {v.sizes.map((s) => (
                  <button key={s} className="small" disabled={blocked} onClick={() => take(s)} title={why?.message ?? `Take as ${s}`}>
                    + {s}
                  </button>
                ))}
                {blocked && why.id !== `taken-${v.id}` && (
                  <button className="small ghost" onClick={() => take(v.sizes[0], true)} title={`${why.message} Take it anyway as a troupe ruling.`}>
                    allow anyway
                  </button>
                )}
              </div>
              <div className={`vf-text ${open === v.id ? 'open' : ''}`} onClick={() => setOpen(open === v.id ? null : v.id)}>
                {open === v.id ? <Markdown text={v.text} /> : v.text.slice(0, 260)}
              </div>
            </div>
          );
        })}
      </div>
      {list.length > limit && (
        <button style={{ marginTop: 8 }} onClick={() => setLimit((l) => l + 100)}>
          Show more ({list.length - limit} remaining)
        </button>
      )}
    </Card>
  );
}

export { vfDisplayName };
