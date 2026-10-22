import { useState } from 'react';
import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art } from '../../data';
import { summaCost, visLabel, visSourceCost, type BPLine, type DerivedCovenant } from '../../engine/covenant';
import { VIS_YIELDS, bookPrice, type BookTier } from '../../engine/covenantYear';
import { mechanicOf, miracleMultiplierOf, receivedAfterTithe } from '../../engine/covenantRules';
import type { LibraryBook } from '../../engine/types';
import { uid } from '../../util/id';
import { addVis } from '../../engine/vis';
import { useStore } from '../../store/store';
import { Card, Field, Stepper } from '../kit';
import type { CovTabProps } from './shared';
import { LaterNote } from '../LaterNote';
import { RulesNote } from '../RulesNote';
import { CursorNote, PertheanFields } from './CovenantTribunal';
import { optionOn } from '../../engine/optional';
import { useSaga } from '../../store/hooks';
import { describeStress, stressDie } from '../../engine/dice';

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
  const saga = useSaga(cov.sagaId);
  const [filter, setFilter] = useState<'all' | LibraryBook['kind']>('all');
  const setBook = (id: string, fn: (b: LibraryBook) => void) => update((x) => { const b = x.library.find((y) => y.uid === id); if (b) fn(b); });
  const books = cov.library.filter((b) => filter === 'all' || b.kind === filter);
  const libraryBP = dc.bpLines.filter((l) => l.category === 'Library').reduce((s, l) => s + l.cost, 0);
  const visBP = dc.bpLines.filter((l) => l.category === 'Vis').reduce((s, l) => s + l.cost, 0);
  const abilities = data.abilities.slice().sort((a, b) => a.name.localeCompare(b.name));
  const miracles = cov.hooksBoons.some((h) => mechanicOf(h) === 'tithing-miracles');
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
        <LaterNote topic="library" />
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
                    <td className="num">
                      <PaidBy cost={cost} line={dc.bpLines.find((l) => l.ref === b.uid)} dc={dc} />
                    </td>
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
        <p className="small muted">
          The hidden box puts a book in the covenant's Hidden Resources. To pay for resources from Hidden, Flawed or Illusory Resources, pick them on that Boon or Hook (Hooks & Boons tab).
          {dc.hiddenResourcesBP > 0 && ` Hidden Resources hold ${dc.hiddenResourcesBP} BP of resources.`}
        </p>
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
              <span className="small muted">/yr = {visSourceCost(s)} BP</span>
              <label className="inline small" title="Dedicated vis (RoP: Magic): each pawn holds a Technique and a Form and works as two pawns for that combination; 7.5 Build Points a pawn a year">
                <input type="checkbox" checked={!!s.dedicated} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.dedicated = e.target.checked || undefined))} /> dedicated
              </label>
              {s.dedicated && (
                <select
                  value={s.pair ?? ''}
                  title="The other Art of the dedicated vis's Technique + Form"
                  onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.pair = (e.target.value || undefined) as Art | undefined))}
                >
                  <option value="">+ {(TECHNIQUES as readonly string[]).includes(s.art) ? 'Form' : 'Technique'}…</option>
                  {((TECHNIQUES as readonly string[]).includes(s.art) ? FORMS : TECHNIQUES).map((a) => (
                    <option key={a} value={a}>
                      {ART_NAMES[a]}
                    </option>
                  ))}
                </select>
              )}
              <input value={s.season ?? ''} placeholder="when" style={{ width: 80 }} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.season = e.target.value))} />
              <label className="inline small" title="Found, won or granted in play: no Build Points">
                <input type="checkbox" checked={!!s.inPlay} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.inPlay = e.target.checked || undefined))} /> in play
              </label>
              <label className="inline small">
                <input type="checkbox" checked={!!s.contested} onChange={(e) => update((x) => void (x.visSources.find((y) => y.uid === s.uid)!.contested = e.target.checked))} /> contested
              </label>
              <label className="inline small" title="A tenth goes to the Church">
                <input type="checkbox" checked={!!s.tithed} onChange={(e) => update((x) => { const y = x.visSources.find((z) => z.uid === s.uid)!; y.tithed = e.target.checked; if (!e.target.checked) y.miracle = false; })} /> tithed
              </label>
              {miracles && (
                <label className="inline small" title={`Tithing Miracles: ×${miracleMultiplierOf(cov)}, rounded up (vis is given The Increase)`}>
                  <input type="checkbox" checked={!!s.miracle} onChange={(e) => update((x) => { const y = x.visSources.find((z) => z.uid === s.uid)!; y.miracle = e.target.checked; if (e.target.checked) y.tithed = true; })} /> Tithing Miracle
                </label>
              )}
              {(s.tithed || dc.unreal.has(s.uid)) && (
                <span className="badge">
                  {dc.unreal.has(s.uid) ? 'not real: gives nothing' : `receives ${receivedAfterTithe(s.pawnsPerYear, true, !!s.miracle && miracles, miracleMultiplierOf(cov)).received}/yr`}
                </span>
              )}
              <PertheanFields s={s} saga={saga} onChange={(fn) => update((x) => void fn(x.visSources.find((y) => y.uid === s.uid)!))} />
              <PaidBy cost={visSourceCost(s)} line={dc.bpLines.find((l) => l.ref === s.uid)} dc={dc} onlyPool />
              <button className="small ghost" onClick={() => update((x) => void (x.visSources = x.visSources.filter((y) => y.uid !== s.uid)))}>
                ✕
              </button>
            </div>
          ))}
          <div className="row tight">
            <button className="small" onClick={() => update((x) => void x.visSources.push({ uid: uid(), name: 'New source', art: 'Vi', pawnsPerYear: 1 }))}>
              + Vis source
            </button>
            <button className="small" title="A source found, won or granted in play: no Build Points" onClick={() => update((x) => void x.visSources.push({ uid: uid(), name: 'New source (found in play)', art: 'Vi', pawnsPerYear: 1, inPlay: true }))}>
              + Source found in play
            </button>
          </div>
          <CursorNote saga={saga} />
          <VisYieldGuide />
          <h4>Stocks</h4>
          <div className="grid grid-3">
            {ARTS.map((a) => {
              const st = cov.visStocks.find((v) => v.art === a && !v.pair);
              return (
                <Field key={a} label={`${ART_NAMES[a]}${dc.visIncome[a] ? ` (+${dc.visIncome[a]}/yr)` : ''}`}>
                  <Stepper
                    value={st?.pawns ?? 0}
                    min={0}
                    width={40}
                    onChange={(v) =>
                      update((x) => {
                        const s = x.visStocks.find((y) => y.art === a && !y.pair);
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
          <VisFound cov={cov} update={update} />
          {cov.visStocks.some((v) => v.pair) && (
            <div className="row small">
              Dedicated stocks:
              {cov.visStocks
                .filter((v) => v.pair)
                .map((v) => (
                  <span key={v.art + v.pair} className="row tight">
                    {visLabel(v)}
                    <Stepper
                      value={v.pawns}
                      min={0}
                      width={36}
                      onChange={(n) => update((x) => { const y = x.visStocks.find((z) => z.art === v.art && z.pair === v.pair); if (y) y.pawns = n; x.visStocks = x.visStocks.filter((z) => z.pawns > 0); })}
                    />
                  </span>
                ))}
            </div>
          )}
          <p className="small muted">
            Vis sources cost 5 BP per pawn per year, 7.5 for dedicated vis (each pawn works as two pawns, but only for its own Technique + Form). Stocks cost 1 BP per 5
            pawns, dedicated pawns weighing half again as much.
          </p>
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
          <BookTrade />
        </Card>
        {optionOn(saga, 'libraryResearch') && <LibraryResearch />}
      </div>
    </div>
  );
}

// Covenants, Research: Intelligence + Ability + the library's bonus for the subject + a stress die.
const COLLECTION_BONUS: [number, string][] = [
  [0, 'No books on the subject'],
  [1, 'Only a few books on it'],
  [2, 'An average Summer covenant’s, with no interest in it'],
  [3, 'A powerful Autumn covenant’s, with no interest in it'],
  [4, 'Specialized in the subject, but not unique'],
  [5, 'A peerless collection on the subject'],
];

/** Looking up a fact in the library (Covenants, Hermetic libraries: Research). */
function LibraryResearch() {
  const [skill, setSkill] = useState(3);
  const [collection, setCollection] = useState(2);
  const [extra, setExtra] = useState(0);
  const [ease, setEase] = useState(9);
  const [result, setResult] = useState<string | null>(null);
  const roll = () => {
    const r = stressDie(1);
    const total = r.botches ? 0 : r.value + skill + collection + extra;
    setResult(r.botches ? `Botch (${describeStress(r)}): the research goes badly wrong.` : `${total} (${describeStress(r)} + ${skill + collection + extra}) against ${ease}: ${total >= ease ? 'found it' : 'not found'}.`);
  };
  return (
    <Card title="Research in the library">
      <RulesNote book="Cov" line={5252} endLine={5263}>
        Intelligence + a fitting Ability + the library&apos;s bonus + a stress die, against the storyguide&apos;s Ease Factor.
      </RulesNote>
      <div className="row">
        <Field label="Intelligence + Ability">
          <Stepper value={skill} min={-10} max={30} width={40} onChange={setSkill} />
        </Field>
        <Field label="The library on this subject">
          <select value={collection} onChange={(e) => setCollection(Number(e.target.value))}>
            {COLLECTION_BONUS.map(([n, t]) => (
              <option key={n} value={n}>
                +{n} {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Other bonus" hint="A significant magic item in the library (up to +3), realia (+1), pictorial works">
          <Stepper value={extra} min={0} max={10} width={36} onChange={setExtra} />
        </Field>
        <Field label="Ease Factor">
          <Stepper value={ease} min={0} max={30} width={36} onChange={setEase} />
        </Field>
        <button className="primary" onClick={roll}>
          Roll
        </button>
      </div>
      {result && <div className="small" style={{ marginTop: 6 }}>{result}</div>}
    </Card>
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

/** A resource's Build Point cost, or the Boon or Hook that pays for it. */
export function PaidBy({ cost, line, dc, onlyPool }: { cost: number; line?: BPLine; dc: DerivedCovenant; onlyPool?: boolean }) {
  const hb = line?.paidBy ? dc.cov.hooksBoons.find((h) => h.uid === line.paidBy) : undefined;
  if (!hb) return onlyPool ? null : line && line.cost === 0 && line.label.includes('Exceptional Book') ? <span className="badge good">free (Exceptional Book)</span> : <>{cost}</>;
  const lost = dc.unreal.has(line!.ref!);
  return (
    <span className={`badge ${lost ? 'bad' : 'info'}`} title={`${cost} BP paid from ${hb.name}`}>
      <s>{cost}</s> {hb.name}
      {lost ? (/illusory/i.test(hb.name) ? ': not real' : ': lost') : ''}
    </span>
  );
}

/** Vis Source Yields (Covenants ch.6): how big a source should be, by the saga's vis level. */
function VisYieldGuide() {
  const [level, setLevel] = useState<keyof typeof VIS_YIELDS>('Moderate');
  const y = VIS_YIELDS[level];
  return (
    <div className="small muted" style={{ marginTop: 6 }}>
      Yield guide: in a{' '}
      <select value={level} onChange={(e) => setLevel(e.target.value as keyof typeof VIS_YIELDS)}>
        {Object.keys(VIS_YIELDS).map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>{' '}
      vis saga a low-, moderate- or high-yield source gives {y.low}, {y.moderate} or {y.high} pawns a year; a high-yield source gives about what one magus receives in a year
      (Covenants ch.6). Vis trades at roughly 10 £ a pawn when it must be priced in silver.
    </div>
  );
}

/** Buying books and researching in the library (Covenants ch.7). */
function BookTrade() {
  const [kind, setKind] = useState<'summa' | 'tractatus'>('summa');
  const [level, setLevel] = useState(10);
  const [tier, setTier] = useState<BookTier>('sound');
  return (
    <div className="small" style={{ marginTop: 8 }}>
      <h4 style={{ margin: '6px 0' }}>Buying books</h4>
      <div className="row tight">
        <select value={tier} onChange={(e) => setTier(e.target.value as BookTier)}>
          <option value="damaged">damaged</option>
          <option value="vain">vain</option>
          <option value="sound">sound</option>
          <option value="excellent">excellent</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as 'summa' | 'tractatus')}>
          <option value="summa">summa</option>
          <option value="tractatus">tractatus</option>
        </select>
        {kind === 'summa' && (
          <>
            level <Stepper value={level} min={1} width={36} onChange={setLevel} />
          </>
        )}
        <span>
          costs <b>{bookPrice(kind, level, tier)}</b>
        </span>
      </div>
      <p className="muted" style={{ margin: '4px 0 0' }}>
        Hermetic books trade for vis, usually under the Cow and Calf Oath (no copies without the seller&apos;s leave). Researching a fact: Intelligence + Ability + stress die, +1 for a
        few books on the subject up to +5 for a peerless collection (Covenants ch.7).
      </p>
    </div>
  );
}

/** Vis found, won, bought or given in play: added to the stocks without Build Points, and noted in the chronicle. */
function VisFound({ cov, update }: Pick<CovTabProps, 'cov' | 'update'>) {
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const [art, setArt] = useState<Art>('Vi');
  const [pair, setPair] = useState<Art | ''>('');
  const [pawns, setPawns] = useState(1);
  const [note, setNote] = useState('');
  const isTech = (TECHNIQUES as readonly string[]).includes(art);
  const add = () =>
    update((x) => {
      if (!x.startingVisStocks) x.startingVisStocks = structuredClone(x.visStocks);
      addVis(x.visStocks, art, pawns, pair || undefined);
      x.log.push({ uid: uid(), year: saga?.currentYear ?? x.foundedYear, season: saga?.currentSeason, text: `Vis found in play: ${pawns} ${visLabel({ art, pair: pair || undefined })}${note ? ` (${note})` : ''}.`, visDelta: [{ art, pawns, ...(pair ? { pair } : {}) }] });
      setNote('');
    });
  return (
    <div className="row small" style={{ marginTop: 6 }}>
      <b>Vis found in play:</b>
      <Stepper value={pawns} min={1} max={99} width={36} onChange={setPawns} />
      <select value={art} onChange={(e) => (setArt(e.target.value as Art), setPair(''))}>
        {ARTS.map((a) => (
          <option key={a} value={a}>
            {ART_NAMES[a]}
          </option>
        ))}
      </select>
      <select value={pair} onChange={(e) => setPair(e.target.value as Art | '')} title="Dedicated vis: the other Art of its Technique + Form">
        <option value="">plain vis</option>
        {(isTech ? FORMS : TECHNIQUES).map((a) => (
          <option key={a} value={a}>
            dedicated with {ART_NAMES[a]}
          </option>
        ))}
      </select>
      <input value={note} placeholder="where from (optional)" style={{ width: 160 }} onChange={(e) => setNote(e.target.value)} />
      <button className="small" onClick={add}>
        Add to the stocks
      </button>
    </div>
  );
}
