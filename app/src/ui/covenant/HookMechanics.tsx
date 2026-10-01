import { ARTS, ART_NAMES } from '../../data';
import { POOL_SIZE, TARGETS_INCOME, mechanicOf, miracleMultiplierOf } from '../../engine/covenantRules';
import type { Covenant, CovenantHookBoon } from '../../engine/types';
import { uid } from '../../util/id';
import { Field, Meter, Stepper } from '../kit';
import type { CovTabProps } from './shared';

/** Removes the resources with these uids from the covenant. */
export function removeResources(c: Covenant, uids: Set<string>) {
  c.library = c.library.filter((x) => !uids.has(x.uid));
  c.visSources = c.visSources.filter((x) => !uids.has(x.uid));
  c.items = c.items.filter((x) => !uids.has(x.uid));
  c.specialists = c.specialists.filter((x) => !uids.has(x.uid));
  c.labs = c.labs.filter((x) => !uids.has(x.uid));
  for (const h of c.hooksBoons) if (h.resources) h.resources = h.resources.filter((u) => !uids.has(u));
}

/** The controls a chosen Boon or Hook needs to take effect on the sheet. */
export function HookMechanics({ hb, cov, update, dc }: Omit<CovTabProps, 'data'> & { hb: CovenantHookBoon }) {
  const m = mechanicOf(hb);
  if (!m) return null;
  const edit = (fn: (h: CovenantHookBoon) => void) => update((x) => void fn(x.hooksBoons.find((y) => y.uid === hb.uid)!));

  if (TARGETS_INCOME.includes(m)) {
    const current = dc.finances.incomeLines.find((l) => l.applied.some((a) => a.hb.uid === hb.uid));
    const auto = current?.applied.find((a) => a.hb.uid === hb.uid)?.auto;
    const effect: Record<string, string> = {
      wealth: hb.size === 'Major' ? 'raises a Typical source to Legendary (1000 £)' : 'raises a Typical source to Greater (250 £)',
      'secondary-income': 'is an extra Typical source (100 £)',
      poverty: hb.size === 'Major' ? 'leaves the covenant no income at all' : 'leaves one Lesser source (40 £)',
      'natural-disaster': hb.size === 'Major' ? 'ends the principal source once it strikes' : 'halves the principal source (Slump) once it strikes',
      right: 'protects a source; it adds no income',
      'contested-resource': 'makes a source (or a vis source) need a story every five years',
    };
    return (
      <div className="row small">
        <span className="muted">This {hb.kind} {effect[m]}.</span>
        {!(m === 'poverty' && hb.size === 'Major') && (
          <Field label="Income source">
            <select value={hb.target ?? ''} onChange={(e) => edit((h) => void (h.target = e.target.value || undefined))}>
              <option value="">{current ? `${current.source.name} (chosen for you)` : '— none —'}</option>
              {cov.income.map((i) => (
                <option key={i.uid} value={i.uid}>
                  {i.name} ({i.type})
                </option>
              ))}
            </select>
          </Field>
        )}
        {auto && <span className="badge info">chosen for you</span>}
        {m === 'natural-disaster' && (
          <label className="inline">
            <input type="checkbox" checked={!!hb.active} onChange={(e) => edit((h) => void (h.active = e.target.checked))} /> it has struck (within the first five years)
          </label>
        )}
      </div>
    );
  }

  if (m === 'indebted') {
    const owed = hb.active !== false;
    return (
      <div className="row small">
        <label className="inline">
          <input type="checkbox" checked={owed} onChange={(e) => edit((h) => void (h.active = e.target.checked))} /> still owed
        </label>
        <span className="muted">
          Interest: {hb.size === 'Major' ? 'three quarters' : 'a quarter'} of the income{owed ? ` (${dc.finances.debt} £ a year with any other debts)` : ''}, charged under Covenfolk & finances.
        </span>
      </div>
    );
  }

  if (m === 'tithing-miracles') {
    return (
      <div className="stack small">
        <Field label="Miracle multiplier" hint="1.8: the tithed tenth is made good and the rest doubled. The book allows more in some places; up to 3.">
          <Stepper value={miracleMultiplierOf(cov)} min={1} max={3} step={0.1} width={46} onChange={(v) => update((x) => void (x.finances.miracleMultiplier = Math.round(v * 10) / 10))} />
        </Field>
        <span className="muted">
          Tick Tithed and Miracle on each income source (Covenfolk & finances) and vis source (Library & vis) that the miracle touches. What the covenant receives is rounded up: one tithed
          pawn becomes two.
        </span>
      </div>
    );
  }

  if (m === 'exceptional-book') {
    const book = cov.library.find((b) => b.boonUid === hb.uid);
    const summae = cov.library.filter((b) => b.kind === 'summa' && b.subjectType === 'art' && !b.boonUid);
    if (book) {
      const setBook = (fn: (b: Covenant['library'][number]) => void) => update((x) => void fn(x.library.find((b) => b.uid === book.uid)!));
      return (
        <div className="row small">
          <span className="muted">In the library at no Build Point cost:</span>
          <select value={book.subject} onChange={(e) => setBook((b) => void (b.subject = e.target.value))}>
            {ARTS.map((a) => (
              <option key={a} value={a}>
                {ART_NAMES[a]}
              </option>
            ))}
          </select>
          <Field label="Level (quality = 35 − level)">
            <Stepper value={book.level} min={10} max={20} width={32} onChange={(v) => setBook((b) => void ((b.level = v), (b.quality = 35 - v)))} />
          </Field>
          <span>Quality {book.quality}</span>
          <button className="small ghost" onClick={() => setBook((b) => void delete b.boonUid)}>
            Unlink
          </button>
        </div>
      );
    }
    return (
      <div className="row small">
        <span className="muted">The finest summa on one Art, free: level + quality = 35 (quality ≤ 25, level ≤ 20).</span>
        <button
          className="small"
          onClick={() => update((x) => void x.library.push({ uid: uid(), title: 'Exceptional summa', kind: 'summa', subjectType: 'art', subject: 'Cr', level: 20, quality: 15, language: 'Latin', boonUid: hb.uid }))}
        >
          Add the book to the library
        </button>
        {summae.length > 0 && (
          <select value="" onChange={(e) => e.target.value && update((x) => void (x.library.find((b) => b.uid === e.target.value)!.boonUid = hb.uid))}>
            <option value="">or use a summa already listed…</option>
            {summae.map((b) => (
              <option key={b.uid} value={b.uid}>
                {b.title} ({b.subject} L{b.level} Q{b.quality})
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  // Hidden, Flawed and Illusory Resources
  const pool = dc.pools.find((p) => p.hb.uid === hb.uid);
  const mine = new Set(pool?.resources.map((r) => r.uid));
  const choices = dc.bpLines.filter((l) => l.ref && (l.fullCost ?? l.cost) > 0 && (!l.paidBy || l.paidBy === hb.uid));
  const toggle = (ref: string, on: boolean) => edit((h) => void (h.resources = on ? [...(h.resources ?? []), ref] : (h.resources ?? []).filter((u) => u !== ref)));
  const what: Record<string, string> = {
    'hidden-resources': 'These are real but not at hand at first (lost in the covenant, or kept for senior magi).',
    'flawed-resource': 'These will likely be lost in a story. Success saves up to half; a botch doubles the losses.',
    'illusory-resources': 'These do not really exist: they give no vis, and their people are not there.',
  };
  const kept = pool ? pool.resources.filter((r) => !pool.lost.includes(r)).reduce((t, r) => t + r.cost, 0) : 0;
  return (
    <div className="stack small">
      <span className="muted">
        {POOL_SIZE} Build Points of the covenant's resources, paid from this {hb.kind} rather than the covenant's own Build Points. {what[m]}
      </span>
      <Meter value={pool?.spent ?? 0} max={POOL_SIZE} label="Build Points used" />
      <details>
        <summary>Choose the resources ({mine.size})</summary>
        <div className="scroll-y" style={{ maxHeight: 240 }}>
          {choices.map((l) => (
            <label key={l.ref} className="inline" style={{ display: 'flex' }}>
              <input type="checkbox" checked={mine.has(l.ref!)} onChange={(e) => toggle(l.ref!, e.target.checked)} /> {l.category}: {l.label} ({l.fullCost ?? l.cost} BP)
            </label>
          ))}
          {choices.length === 0 && <div className="muted">Buy books, vis sources, items, specialists or labs first.</div>}
        </div>
      </details>
      {m === 'flawed-resource' && (
        <div className="row">
          <Field label="Its story">
            <select value={hb.outcome ?? 'pending'} onChange={(e) => edit((h) => void (h.outcome = e.target.value as CovenantHookBoon['outcome']))}>
              <option value="pending">not yet come up</option>
              <option value="saved">succeeded: up to half saved</option>
              <option value="lost">failed: all lost</option>
              <option value="botched">botched: losses doubled</option>
            </select>
          </Field>
          {hb.outcome === 'saved' && pool && (
            <span>
              Kept {kept} of at most {Math.floor(pool.spent / 2)} BP:
              {pool.resources.map((r) => (
                <label key={r.uid} className="inline">
                  <input
                    type="checkbox"
                    checked={(hb.kept ?? []).includes(r.uid)}
                    onChange={(e) => edit((h) => void (h.kept = e.target.checked ? [...(h.kept ?? []), r.uid] : (h.kept ?? []).filter((u) => u !== r.uid)))}
                  />{' '}
                  {r.label}
                </label>
              ))}
            </span>
          )}
          {pool && pool.lost.length > 0 && (
            <button
              className="small danger"
              onClick={() => window.confirm(`Remove ${pool.lost.length} lost resource(s) from the covenant?`) && update((x) => removeResources(x, new Set(pool.lost.map((r) => r.uid))))}
            >
              Remove the lost resources
            </button>
          )}
          {hb.outcome === 'botched' && <span className="warn-text">The losses are doubled: the storyguide takes about {pool?.spent ?? POOL_SIZE} more Build Points of other resources.</span>}
        </div>
      )}
    </div>
  );
}
