import { useState } from 'react';
import { ARTS, ART_NAMES, type Art } from '../../data';
import { summaCost } from '../../engine/covenant';
import type { LibraryBook } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper } from '../kit';
import type { CovTabProps } from './shared';

const KIND_LABEL: Record<LibraryBook['kind'], string> = {
  summa: 'Summa',
  tractatus: 'Tractatus',
  labText: 'Lab text',
  castingTablet: 'Casting tablet',
  mundane: 'Other / mundane',
};

function newBook(kind: LibraryBook['kind']): LibraryBook {
  return {
    uid: uid(), title: '', kind, subjectType: kind === 'labText' || kind === 'castingTablet' ? 'spell' : 'art', subject: kind === 'labText' || kind === 'castingTablet' ? '' : 'Cr',
    level: kind === 'summa' ? 10 : kind === 'tractatus' ? 0 : 10, quality: kind === 'summa' ? 11 : kind === 'tractatus' ? 10 : 0, language: 'Latin',
  };
}

export default function LibraryTab({ cov, update, dc, data }: CovTabProps) {
  const [filter, setFilter] = useState<'all' | LibraryBook['kind']>('all');
  const setBook = (id: string, fn: (b: LibraryBook) => void) => update((x) => { const b = x.library.find((y) => y.uid === id); if (b) fn(b); });
  const books = cov.library.filter((b) => filter === 'all' || b.kind === filter);
  const libraryBP = dc.bpLines.filter((l) => l.category === 'Library').reduce((s, l) => s + l.cost, 0);
  const visBP = dc.bpLines.filter((l) => l.category === 'Vis').reduce((s, l) => s + l.cost, 0);
  const abilities = data.abilities.slice().sort((a, b) => a.name.localeCompare(b.name));
  const spellNames = data.spells.map((s) => `${s.name} (${s.technique}${s.form} ${s.level ?? 'Gen'})`);
  return (
    <div className="stack">
      <Card
        title={`Library (${libraryBP} BP)`}
        className="accent"
        actions={
          <>
            {(Object.keys(KIND_LABEL) as LibraryBook['kind'][]).map((k) => (
              <button key={k} className="small" onClick={() => update((x) => void x.library.push(newBook(k)))}>
                + {KIND_LABEL[k]}
              </button>
            ))}
          </>
        }
      >
        <div className="row" style={{ marginBottom: 6 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All books ({cov.library.length})</option>
            {(Object.keys(KIND_LABEL) as LibraryBook['kind'][]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]} ({cov.library.filter((b) => b.kind === k).length})
              </option>
            ))}
          </select>
          <span className="small muted">
            Creation limits: Art summa level ≤ 20 and quality ≤ 11 + (20 − level), max 22; Ability summa level ≤ 8, quality ≤ 11 + 3 × (8 − level), max 22; tractatus quality ≤ 11.
          </span>
        </div>
        <datalist id="spell-names">
          {spellNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>Title</th>
                <th>Kind</th>
                <th>Subject</th>
                <th className="num">Level</th>
                <th className="num">Quality</th>
                <th>Language</th>
                <th className="num">BP</th>
                <th>Hidden</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {books.map((b) => {
                const { cost, issue } = summaCost(b);
                const isText = b.kind === 'labText' || b.kind === 'castingTablet';
                return (
                  <tr key={b.uid}>
                    <td>
                      <input value={b.title} placeholder="Title" style={{ width: 170 }} onChange={(e) => setBook(b.uid, (x) => void (x.title = e.target.value))} />
                      {issue && <div className="small bad-text">{issue}</div>}
                      {b.readBy?.length ? <div className="small muted">read by {b.readBy.length}</div> : null}
                    </td>
                    <td>
                      <select value={b.kind} onChange={(e) => setBook(b.uid, (x) => void (x.kind = e.target.value as LibraryBook['kind']))}>
                        {(Object.keys(KIND_LABEL) as LibraryBook['kind'][]).map((k) => (
                          <option key={k} value={k}>
                            {KIND_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {isText ? (
                        <input
                          list="spell-names"
                          value={b.subject}
                          placeholder="Spell or effect"
                          style={{ width: 200 }}
                          onChange={(e) =>
                            setBook(b.uid, (x) => {
                              x.subject = e.target.value;
                              const m = /\((\w\w)(\w\w) (\d+)\)$/.exec(e.target.value);
                              if (m) {
                                x.level = Number(m[3]);
                                x.spell = data.spells.find((s) => `${s.name} (${s.technique}${s.form} ${s.level ?? 'Gen'})` === e.target.value);
                                if (!x.title) x.title = x.spell?.name ?? '';
                              }
                            })
                          }
                        />
                      ) : (
                        <div className="row tight">
                          <select value={b.subjectType} onChange={(e) => setBook(b.uid, (x) => { x.subjectType = e.target.value as LibraryBook['subjectType']; x.subject = x.subjectType === 'art' ? 'Cr' : ''; })}>
                            <option value="art">Art</option>
                            <option value="ability">Ability</option>
                            <option value="other">Other</option>
                          </select>
                          {b.subjectType === 'art' ? (
                            <select value={b.subject} onChange={(e) => setBook(b.uid, (x) => void (x.subject = e.target.value))}>
                              {ARTS.map((a: Art) => (
                                <option key={a} value={a}>
                                  {ART_NAMES[a]}
                                </option>
                              ))}
                            </select>
                          ) : b.subjectType === 'ability' ? (
                            <select value={b.subject} onChange={(e) => setBook(b.uid, (x) => void (x.subject = e.target.value))}>
                              <option value="">choose…</option>
                              {abilities.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input value={b.subject} style={{ width: 120 }} onChange={(e) => setBook(b.uid, (x) => void (x.subject = e.target.value))} />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {b.kind !== 'tractatus' && b.kind !== 'mundane' && (
                        <Stepper value={b.level} min={0} step={isText ? 5 : 1} width={40} onChange={(v) => setBook(b.uid, (x) => void (x.level = v))} />
                      )}
                    </td>
                    <td className="num">
                      {(b.kind === 'summa' || b.kind === 'tractatus' || b.kind === 'mundane') && (
                        <Stepper value={b.quality} min={0} width={36} onChange={(v) => setBook(b.uid, (x) => void (x.quality = v))} />
                      )}
                    </td>
                    <td>
                      <input value={b.language} style={{ width: 70 }} onChange={(e) => setBook(b.uid, (x) => void (x.language = e.target.value))} />
                    </td>
                    <td className="num">{b.hidden ? <s>{cost}</s> : cost}</td>
                    <td>
                      <input type="checkbox" checked={!!b.hidden} title="Part of Hidden Resources (no BP)" onChange={(e) => setBook(b.uid, (x) => void (x.hidden = e.target.checked))} />
                    </td>
                    <td>
                      <button className="small ghost" onClick={() => update((x) => void (x.library = x.library.filter((y) => y.uid !== b.uid)))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {dc.hiddenResourcesBP > 0 && <p className="small muted">Hidden Resources: {dc.hiddenResourcesBP} BP of books and resources marked hidden are not charged to the covenant.</p>}
      </Card>

      <div className="grid grid-2">
        <Card title={`Vis sources & stocks (${visBP} BP)`}>
          {cov.visSources.map((s) => (
            <div key={s.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
              <input value={s.name} style={{ flex: '1 1 140px' }} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.name = e.target.value))} />
              <select value={s.art} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.art = e.target.value as Art))}>
                {ARTS.map((a) => (
                  <option key={a} value={a}>
                    {ART_NAMES[a]}
                  </option>
                ))}
              </select>
              <Stepper value={s.pawnsPerYear} min={0} width={36} title="Pawns per year" onChange={(v) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.pawnsPerYear = v))} />
              <span className="small muted">/yr = {5 * s.pawnsPerYear} BP</span>
              <input value={s.season ?? ''} placeholder="when" style={{ width: 80 }} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.season = e.target.value))} />
              <label className="inline small">
                <input type="checkbox" checked={!!s.contested} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.contested = e.target.checked))} /> contested
              </label>
              <button className="small ghost" onClick={() => update((x) => void (x.visSources = x.visSources.filter((y) => y.uid !== s.uid)))}>
                ✕
              </button>
            </div>
          ))}
          <button className="small" onClick={() => update((x) => void x.visSources.push({ uid: uid(), name: 'New source', art: 'Vi', pawnsPerYear: 1 }))}>
            + Vis source
          </button>
          <h4>Stocks</h4>
          <div className="grid grid-3">
            {ARTS.map((a) => {
              const st = cov.visStocks.find((v) => v.art === a);
              return (
                <Field key={a} label={`${ART_NAMES[a]}${dc.visIncome[a] ? ` (+${dc.visIncome[a]}/yr)` : ''}`}>
                  <Stepper
                    value={st?.pawns ?? 0}
                    min={0}
                    width={40}
                    onChange={(v) =>
                      update((x) => {
                        const s = x.visStocks.find((y) => y.art === a);
                        if (s) s.pawns = v;
                        else x.visStocks.push({ art: a, pawns: v });
                        x.visStocks = x.visStocks.filter((y) => y.pawns > 0);
                      })
                    }
                  />
                </Field>
              );
            })}
          </div>
          <p className="small muted">Vis sources cost 5 BP per pawn per year; stocks 1 BP per 5 pawns.</p>
        </Card>
        <Card title="Library summary">
          <table className="compact">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Best summa</th>
                <th className="num">Tractatus</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows(cov.library, data).map((r) => (
                <tr key={r.subject}>
                  <td>{r.label}</td>
                  <td>{r.summa ? `L${r.summa.level} Q${r.summa.quality}` : '—'}</td>
                  <td className="num">{r.tractatus || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">Lab texts: {cov.library.filter((b) => b.kind === 'labText').reduce((s, b) => s + b.level, 0)} levels. Casting tablets: {cov.library.filter((b) => b.kind === 'castingTablet').length}.</p>
        </Card>
      </div>
    </div>
  );
}

function summaryRows(lib: LibraryBook[], data: CovTabProps['data']) {
  const m = new Map<string, { subject: string; label: string; summa?: LibraryBook; tractatus: number }>();
  for (const b of lib) {
    if (b.kind !== 'summa' && b.kind !== 'tractatus') continue;
    const key = `${b.subjectType}:${b.subject}`;
    const label = b.subjectType === 'art' ? ART_NAMES[b.subject as Art] ?? b.subject : data.abilityById.get(b.subject)?.name ?? b.subject;
    const r = m.get(key) ?? { subject: key, label, tractatus: 0 };
    if (b.kind === 'summa' && (!r.summa || b.level > r.summa.level || (b.level === r.summa.level && b.quality > r.summa.quality))) r.summa = b;
    if (b.kind === 'tractatus') r.tractatus++;
    m.set(key, r);
  }
  return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
}
