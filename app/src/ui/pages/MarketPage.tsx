// Spending the saga's money: the price lists of Covenants and City & Guild, vis for silver, Hermetic
// books for vis, people who join or are hired, and gifts between the treasury and members' purses.

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type GameData } from '../../data';
import { deriveCovenant, visLabel } from '../../engine/covenant';
import { bookPrice } from '../../engine/covenantYear';
import { teacherQuality } from '../../engine/covenantRules';
import { covenantOf } from '../../engine/context';
import { lsd, visPriceOf } from '../../engine/economy';
import {
  MARKET, QUALITY, TEACHER_FEE, VIS_PRICE, bookVisPrice, buyBook, buyVis, buyWare, fundsOf, hireFolk, hireTeacher, payerName, sellVis, stocksOf, transfer, type Payer, type Ware,
} from '../../engine/market';
import { inPlay, type SagaState } from '../../engine/time';
import type { Character, Covenant, CovenfolkCounts, LibraryBook, Specialist } from '../../engine/types';
import { visText } from '../../engine/vis';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Empty, Field, Stepper, HowItWorks } from '../kit';
import { SpecAbilities, SpecChars } from '../covenant/FinancesTab';
import { Hint } from '../Hint';

type Run = (fn: (st: SagaState, buyer: Payer, home: Covenant | undefined) => string | undefined, done: string) => boolean;

function payerIn(st: SagaState, key: string): Payer | undefined {
  const [k, id] = key.split(':');
  if (k === 'cov') {
    const cov = st.covenants.find((c) => c.id === id);
    return cov && { kind: 'covenant', cov };
  }
  const c = st.characters.find((x) => x.id === id);
  return c && { kind: 'character', c };
}
const homeOf = (st: SagaState, p: Payer) => (p.kind === 'covenant' ? p.cov : covenantOf(p.c, st.covenants));
const fundsText = (p: Payer) => {
  const vis = stocksOf(p);
  return `${lsd(fundsOf(p))}${vis.length ? ` · vis: ${visText(vis)}` : ' · no vis'}`;
};

export default function MarketPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId);
  const covs = useSagaCovenants(sagaId);
  const putSagaState = useStore((s) => s.putSagaState);
  const updateSaga = useStore((s) => s.updateSaga);
  const setNotice = useStore((s) => s.setNotice);
  const [buyerKey, setBuyerKey] = useState('');
  const [onSundry, setOnSundry] = useState(false);
  const [problem, setProblem] = useState('');
  if (!saga) return <Empty>Saga not found.</Empty>;
  const people = chars.filter(inPlay);
  const key = buyerKey || (covs[0] ? `cov:${covs[0].id}` : people[0] ? `char:${people[0].id}` : '');
  const live: SagaState = { saga, characters: chars, covenants: covs };
  const buyer = key ? payerIn(live, key) : undefined;
  const home = buyer && homeOf(live, buyer);
  const sundry = buyer?.kind === 'covenant' && onSundry;
  const options = [
    ...covs.map((c) => ({ key: `cov:${c.id}`, label: `${c.name || 'Covenant'} (treasury)` })),
    ...people.map((c) => ({ key: `char:${c.id}`, label: `${c.name || 'Unnamed'} (purse)` })),
  ];

  /** Make the change on a copy of the saga; keep it, with an undo, only if it worked. */
  const run: Run = (fn, done) => {
    const before = structuredClone(live);
    const st = structuredClone(live);
    const p = payerIn(st, key);
    if (!p) return false;
    const err = fn(st, p, homeOf(st, p));
    if (err) {
      setProblem(err);
      return false;
    }
    setProblem('');
    putSagaState(st);
    setNotice(done, () => putSagaState(before));
    return true;
  };

  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link to={`/saga/${saga.id}`}>{saga.name}</Link> ›
      </div>
      <div className="topbar">
        <h1>Market &amp; treasury</h1>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        What the covenant&apos;s silver and vis can buy, at the prices of Covenants (ch.5 and 7) and City &amp; Guild. A purchase is paid at once from the buyer&apos;s treasury or purse and noted in
        the covenant&apos;s chronicle or the purse&apos;s record; a covenant can instead put it on this year&apos;s Sundry, paid when the year closes on the{' '}
        <Link to={`/saga/${saga.id}/seasons`}>Seasons</Link> page. It is {saga.currentSeason} {saga.currentYear}.
      </p>

      <Hint id="market-who">Choose who is buying first: the covenant&apos;s treasury or a character&apos;s purse. Everything bought is recorded and can be undone.</Hint>
      <Card title="Who is buying" className="accent" tour="market-who">
        {options.length ? (
          <div className="row">
            <select value={key} onChange={(e) => (setBuyerKey(e.target.value), setProblem(''))} aria-label="Buyer">
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            {buyer && <b>{fundsText(buyer)}</b>}
            {buyer?.kind === 'covenant' && (
              <label className="row tight small" style={{ flexWrap: 'nowrap' }} title="Covenants ch.5: Sundry spending is part of the year's expenditure">
                <input type="checkbox" checked={onSundry} onChange={(e) => setOnSundry(e.target.checked)} /> put it on this year&apos;s Sundry (now {lsd(buyer.cov.finances.sundry)}) instead of paying now
              </label>
            )}
            {buyer?.kind === 'character' && <span className="small muted">{home ? `of ${home.name}` : 'in no covenant'}</span>}
          </div>
        ) : (
          <Empty>Add a covenant or finish a character first.</Empty>
        )}
        {problem && <p className="bad small" style={{ margin: '6px 0 0' }}>{problem}</p>}
      </Card>

      {buyer && (
        <>
          <Purses live={live} options={options} run={run} buyerKey={key} />
          <VisTrade saga={saga} buyer={buyer} run={run} onSundry={sundry} setVisPrice={(n) => updateSaga(saga.id, (s) => void (s.economy = { ...(s.economy ?? {}), visPrice: n }))} />
          <Books buyer={buyer} home={home} run={run} data={data} visPrice={visPriceOf(saga)} onSundry={sundry} />
          {home && <People home={home} chars={chars} data={data} run={run} onSundry={sundry} />}
          <PriceList run={run} home={home} onSundry={sundry} />
          <History buyer={buyer} />
        </>
      )}
    </div>
  );
}

/** The treasury and every purse, and gifts between them. */
function Purses({ live, options, run, buyerKey }: { live: SagaState; options: { key: string; label: string }[]; run: Run; buyerKey: string }) {
  const [from, setFrom] = useState(buyerKey);
  const [to, setTo] = useState('');
  const [pounds, setPounds] = useState(0);
  const [art, setArt] = useState<Art | ''>('');
  const [pair, setPair] = useState<Art | ''>('');
  const [pawns, setPawns] = useState(1);
  const [why, setWhy] = useState('');
  const src = payerIn(live, from) ?? payerIn(live, buyerKey);
  const fromKey = src ? from || buyerKey : '';
  const toKey = to && to !== fromKey ? to : options.find((o) => o.key !== fromKey)?.key ?? '';
  const held = src ? stocksOf(src) : [];
  const move = () => {
    const ok = run((st) => {
      const a = payerIn(st, fromKey);
      const b = payerIn(st, toKey);
      if (!a || !b) return 'Choose who gives and who receives.';
      return transfer(a, b, pounds, art ? { art, pawns, ...(pair ? { pair } : {}) } : undefined, why, { year: st.saga.currentYear, season: st.saga.currentSeason });
    }, 'Given.');
    if (ok) (setPounds(0), setWhy(''), setArt(''));
  };
  return (
    <Card title="Treasury and purses">
      <table className="compact small">
        <thead>
          <tr>
            <th>Who</th>
            <th>Pounds</th>
            <th>Vis</th>
          </tr>
        </thead>
        <tbody>
          {live.covenants.map((c) => (
            <tr key={c.id}>
              <td>
                <b>{c.name || 'Covenant'}</b> <span className="muted">treasury</span>
              </td>
              <td>{lsd(c.finances.treasury)}</td>
              <td>{visText(c.visStocks) || '—'}</td>
            </tr>
          ))}
          {live.characters.filter(inPlay).map((c) => (
            <tr key={c.id}>
              <td>{c.name || 'Unnamed'}</td>
              <td>{lsd(c.purse?.pounds ?? 0)}</td>
              <td>{visText(c.purse?.vis ?? []) || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row small" style={{ marginTop: 8 }}>
        <b>Give</b>
        <select value={fromKey} onChange={(e) => (setFrom(e.target.value), setArt(''))} aria-label="From">
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              from {o.label}
            </option>
          ))}
        </select>
        <select value={toKey} onChange={(e) => setTo(e.target.value)} aria-label="To">
          {options
            .filter((o) => o.key !== fromKey)
            .map((o) => (
              <option key={o.key} value={o.key}>
                to {o.label}
              </option>
            ))}
        </select>
        <input type="number" min={0} step={0.5} value={pounds} onChange={(e) => setPounds(Math.max(0, Number(e.target.value) || 0))} style={{ width: 70 }} aria-label="Pounds" /> £
        <span>and</span>
        <select
          value={art ? `${art}|${pair}` : ''}
          onChange={(e) => {
            const [a, p] = e.target.value.split('|');
            setArt((a as Art) || '');
            setPair((p as Art) || '');
          }}
          aria-label="Vis"
        >
          <option value="">no vis</option>
          {held.map((v) => (
            <option key={`${v.art}|${v.pair ?? ''}`} value={`${v.art}|${v.pair ?? ''}`}>
              {visLabel(v)} ({v.pawns})
            </option>
          ))}
        </select>
        {art && <Stepper value={pawns} min={1} max={held.find((v) => v.art === art && (v.pair ?? '') === pair)?.pawns ?? 1} width={34} onChange={setPawns} />}
        <input value={why} placeholder="why (optional)" style={{ width: 140 }} onChange={(e) => setWhy(e.target.value)} />
        <button className="small" onClick={move} disabled={!toKey}>
          Give
        </button>
      </div>
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        The covenant&apos;s yearly allowance to its members is set on its Finances tab and paid at the year&apos;s end. A member&apos;s purse is theirs to spend here or on their lab projects.
      </p>
    </Card>
  );
}

/** Vis for silver at the saga's price, with why it varies. */
function VisTrade({ saga, buyer, run, onSundry, setVisPrice }: { saga: SagaState['saga']; buyer: Payer; run: Run; onSundry: boolean; setVisPrice: (n: number) => void }) {
  const price = visPriceOf(saga);
  const [art, setArt] = useState<Art>('Vi');
  const [pair, setPair] = useState<Art | ''>('');
  const [pawns, setPawns] = useState(1);
  const [each, setEach] = useState<number | undefined>(undefined);
  const isTech = (TECHNIQUES as readonly string[]).includes(art);
  const unit = each ?? Math.round(price * (pair ? 1.5 : 1) * 100) / 100;
  const total = unit * pawns;
  const held = stocksOf(buyer).find((v) => v.art === art && (v.pair ?? '') === pair)?.pawns ?? 0;
  const label = `${pawns} ${visLabel({ art, pair: pair || undefined })}`;
  return (
    <Card title="Vis for silver">
      <div className="row small">
        <Field label="The saga's price of a pawn" hint="A house rule for the whole saga">
          <span className="row tight">
            <Stepper value={price} min={1} max={500} width={44} onChange={setVisPrice} /> £
          </span>
        </Field>
        <span className="muted">
          Covenants ch.5: about {VIS_PRICE.typical} £ a pawn as a rule of thumb, from {VIS_PRICE.low} £ where vis is plentiful to {VIS_PRICE.high} £ or more from a wealthy seller.
        </span>
      </div>
      <HowItWorks label="What moves the price">
        <ul style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
          {VIS_PRICE.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li>{VIS_PRICE.dedicated}</li>
        </ul>
      </HowItWorks>
      <div className="row small">
        <Stepper value={pawns} min={1} max={99} width={36} onChange={setPawns} />
        <select value={art} onChange={(e) => (setArt(e.target.value as Art), setPair(''), setEach(undefined))} aria-label="Art">
          {ARTS.map((a) => (
            <option key={a} value={a}>
              {ART_NAMES[a]}
            </option>
          ))}
        </select>
        <select value={pair} onChange={(e) => (setPair(e.target.value as Art | ''), setEach(undefined))} title="Dedicated vis: the other Art of its Technique + Form" aria-label="Dedicated">
          <option value="">plain vis</option>
          {(isTech ? FORMS : TECHNIQUES).map((a) => (
            <option key={a} value={a}>
              dedicated with {ART_NAMES[a]}
            </option>
          ))}
        </select>
        at
        <input type="number" min={0} step={0.5} value={unit} onChange={(e) => setEach(Math.max(0, Number(e.target.value) || 0))} style={{ width: 64 }} aria-label="Price a pawn" /> £ a pawn
        <button className="small" onClick={() => run((st, p) => buyVis(p, art, pawns, unit, { year: st.saga.currentYear, season: st.saga.currentSeason }, pair || undefined, onSundry), `${payerName(buyer)} bought ${label} vis.`)}>
          Buy for {lsd(total)}
        </button>
        <button className="small" disabled={held < pawns} title={`${payerName(buyer)} holds ${held}`} onClick={() => run((st, p) => sellVis(p, art, pawns, unit, { year: st.saga.currentYear, season: st.saga.currentSeason }, pair || undefined), `${payerName(buyer)} sold ${label} vis.`)}>
          Sell for {lsd(total)}
        </button>
      </div>
    </Card>
  );
}

type BookKind = 'summa' | 'tractatus' | 'labText';

/** Hermetic books, priced in vis (Covenants ch.7, Prices for Books). */
function Books({ buyer, home, run, data, visPrice, onSundry }: { buyer: Payer; home: Covenant | undefined; run: Run; data: GameData; visPrice: number; onSundry: boolean }) {
  const [kind, setKind] = useState<BookKind>('summa');
  const [subjectType, setSubjectType] = useState<'art' | 'ability'>('art');
  const [subject, setSubject] = useState<string>('Vi');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState(10);
  const [quality, setQuality] = useState(10);
  const [spell, setSpell] = useState('');
  const [tier, setTier] = useState<'damaged' | 'vain' | 'sound'>('sound');
  const [now, setNow] = useState(true);
  const [agreed, setAgreed] = useState<number | undefined>(undefined);
  const [payWithChoice, setPayWith] = useState<string>('');
  const book = kind === 'labText' ? undefined : kind;
  const listPrice = book ? bookVisPrice(book, level, tier, now) : 0;
  const pawns = agreed ?? listPrice;
  const stocks = stocksOf(buyer).filter((v) => !v.pair);
  // unless chosen, pay in the one Art held most plentifully, rather than a little of everything
  const most = [...stocks].sort((a, b) => b.pawns - a.pawns)[0];
  const payWith = payWithChoice || (most && most.pawns >= pawns ? most.art : 'any');
  const subjName = subjectType === 'art' ? ART_NAMES[subject as Art] ?? subject : data.abilityById.get(subject)?.name ?? subject;
  const name = title || (kind === 'labText' ? `Lab text: ${spell || 'a spell'}` : `${kind === 'summa' ? `Summa of ${subjName}` : `Tractatus on ${subjName}`}`);
  const buy = () =>
    run((st, p, lib) => {
      if (!lib) return 'A book needs a covenant library to go to.';
      const b: LibraryBook = {
        uid: uid(), title: name, kind, subjectType: kind === 'labText' ? 'spell' : subjectType, subject: kind === 'labText' ? spell : subject, level: kind === 'tractatus' ? 0 : level,
        quality: kind === 'labText' ? 0 : quality, language: 'Latin',
        notes: `Bought ${st.saga.currentSeason} ${st.saga.currentYear}${tier !== 'sound' && book ? `, ${tier}` : ''}${book && !now ? '; ordered: the copy takes a season' : ''}.`,
      };
      const w = { year: st.saga.currentYear, season: st.saga.currentSeason };
      return buyBook(p, lib, b, payWith === 'silver' ? { pounds: pawns * visPrice, onSundry } : { vis: pawns, arts: payWith === 'any' ? [...ARTS] : [payWith as Art] }, w);
    }, `${payerName(buyer)} bought ${name}.`) && (setTitle(''), setAgreed(undefined));
  return (
    <Card title="Hermetic books">
      <div className="row small">
        <select value={kind} onChange={(e) => (setKind(e.target.value as BookKind), setAgreed(undefined))} aria-label="Kind of book">
          <option value="summa">Summa</option>
          <option value="tractatus">Tractatus</option>
          <option value="labText">Lab text</option>
        </select>
        {kind !== 'labText' ? (
          <>
            <select value={subjectType} onChange={(e) => (setSubjectType(e.target.value as 'art' | 'ability'), setSubject(e.target.value === 'art' ? 'Vi' : data.abilities[0]?.id ?? ''))} aria-label="Subject type">
              <option value="art">an Art</option>
              <option value="ability">an Ability</option>
            </select>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" style={{ maxWidth: 180 }}>
              {subjectType === 'art'
                ? ARTS.map((a) => (
                    <option key={a} value={a}>
                      {ART_NAMES[a]}
                    </option>
                  ))
                : data.abilities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
            </select>
          </>
        ) : (
          <input value={spell} placeholder="the spell" style={{ width: 180 }} onChange={(e) => setSpell(e.target.value)} />
        )}
        {kind !== 'tractatus' && (
          <span className="row tight">
            level <Stepper value={level} min={1} max={kind === 'labText' ? 100 : 40} width={36} onChange={(v) => (setLevel(v), setAgreed(undefined))} />
          </span>
        )}
        {kind !== 'labText' && (
          <span className="row tight">
            Quality <Stepper value={quality} min={1} max={30} width={36} onChange={setQuality} />
          </span>
        )}
        <input value={title} placeholder={name} style={{ width: 200 }} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
      </div>
      {book && (
        <div className="row small" style={{ marginTop: 6 }}>
          <select value={tier} onChange={(e) => (setTier(e.target.value as typeof tier), setAgreed(undefined))} aria-label="Worth">
            <option value="sound">sound (most Hermetic books)</option>
            <option value="vain">vain (bought from its author)</option>
            {kind === 'summa' && <option value="damaged">damaged surplus</option>}
          </select>
          {tier === 'sound' && (
            <label className="row tight" style={{ flexWrap: 'nowrap' }}>
              <input type="checkbox" checked={now} onChange={(e) => (setNow(e.target.checked), setAgreed(undefined))} /> a spare copy now (not ordered and copied over a season)
            </label>
          )}
          <span className="muted">{bookPrice(book, level, tier)}</span>
        </div>
      )}
      <div className="row small" style={{ marginTop: 6 }}>
        <span className="row tight">
          Price <Stepper value={pawns} min={0} max={200} width={40} onChange={setAgreed} /> pawns
        </span>
        {agreed !== undefined && agreed !== listPrice && (
          <span className="clickable muted" onClick={() => setAgreed(undefined)}>
            (agreed; the book price is {listPrice})
          </span>
        )}
        <select value={payWith} onChange={(e) => setPayWith(e.target.value)} aria-label="Pay with">
          <option value="any">paid in a mix of plain vis (the most plentiful first)</option>
          {stocks.map((v) => (
            <option key={v.art} value={v.art}>
              paid in {ART_NAMES[v.art]} vis ({v.pawns})
            </option>
          ))}
          <option value="silver">paid in silver at {visPrice} £ a pawn ({lsd(pawns * visPrice)})</option>
        </select>
        <button className="small" onClick={buy} disabled={!home}>
          Buy into {home?.name ?? 'the library'}
        </button>
      </div>
      <HowItWorks label="How books are traded">
        Hermetic books are traded for vis, under the Cow and Calf Oath: the buyer may not copy it to sell. A vain book bought from anyone but its author usually costs as much as a sound one; the
        best books are rarely sold, but given for service. Lab texts have no book price: agree one with the seller (they are often traded one for one).
        {buyer.kind === 'character' && ' A member’s own copy goes in the covenant library under their name.'}
      </HowItWorks>
    </Card>
  );
}

const JOIN: { key: keyof CovenfolkCounts; label: string; one: string }[] = [
  { key: 'grogs', label: 'grogs', one: 'grog' },
  { key: 'servants', label: 'servants', one: 'servant' },
  { key: 'laborers', label: 'laborers', one: 'laborer' },
  { key: 'teamsters', label: 'teamsters', one: 'teamster' },
  { key: 'craftsmen', label: 'craftsmen (unnamed)', one: 'craftsman' },
  { key: 'specialists', label: 'specialists (unnamed)', one: 'specialist' },
  { key: 'companions', label: 'companions (non-player)', one: 'companion' },
  { key: 'dependents', label: 'dependents', one: 'dependent' },
  { key: 'horses', label: 'horses', one: 'horse' },
];

/** People who join the covenant (and cost it every year), and teachers hired from outside. */
function People({ home, chars, data, run, onSundry }: { home: Covenant; chars: Character[]; data: GameData; run: Run; onSundry: boolean }) {
  const [key, setKey] = useState<keyof CovenfolkCounts>('grogs');
  const [n, setN] = useState(1);
  const dc = useMemo(() => deriveCovenant(home, data, chars), [home, data, chars]);
  const after = useMemo(() => {
    const c = structuredClone(home);
    c.covenfolk[key] = Math.max(0, c.covenfolk[key] + n);
    return deriveCovenant(c, data, chars).finances.totalExpenditure;
  }, [home, data, chars, key, n]);
  const delta = Math.round((after - dc.finances.totalExpenditure) * 10) / 10;
  const folk = JOIN.find((x) => x.key === key)!;
  const label = Math.abs(n) === 1 ? folk.one : folk.label.replace(/ \(.*\)$/, '');
  return (
    <Card title={`People for ${home.name || 'the covenant'}`}>
      <div className="row small">
        <b>Join for good:</b>
        <Stepper value={n} min={-home.covenfolk[key]} max={50} width={36} onChange={setN} />
        <select value={key} onChange={(e) => setKey(e.target.value as keyof CovenfolkCounts)} aria-label="Who joins">
          {JOIN.map((j) => (
            <option key={j.key} value={j.key}>
              {j.label} (now {home.covenfolk[j.key]})
            </option>
          ))}
        </select>
        <span>
          {delta >= 0 ? '+' : ''}
          {delta} £ a year to the covenant&apos;s expenditure
        </span>
        <button className="small" disabled={!n} onClick={() => run((st) => (hireFolk(st.covenants.find((c) => c.id === home.id)!, key, n, label, { year: st.saga.currentYear, season: st.saga.currentSeason }), undefined), `${n > 0 ? n : -n} ${label} ${n > 0 ? 'joined' : 'left'} ${home.name}.`)}>
          {n >= 0 ? 'They join' : 'They leave'}
        </button>
      </div>
      <p className="small muted" style={{ margin: '4px 0 8px' }}>
        Covenfolk cost no price to recruit: they cost inhabitant points, so buildings, provisions and wages, every year (Covenants ch.5). Named specialists and craftsmen are added on the covenant&apos;s{' '}
        <Link to={`/saga/${home.sagaId}/covenant/${home.id}?tab=folk`}>Covenfolk</Link> tab, marked recruited in play so they cost no Build Points.
      </p>
      <HireTeacher home={home} data={data} run={run} onSundry={onSundry} />
    </Card>
  );
}

function HireTeacher({ home, data, run, onSundry }: { home: Covenant; data: GameData; run: Run; onSundry: boolean }) {
  const blank = (): Specialist => ({ uid: uid(), name: '', role: 'teacher', ability: '', score: 5, teaching: 3, chars: { Com: 1 }, abilities: [{ id: '', score: 5 }] });
  const [t, setT] = useState<Specialist>(blank);
  const [wage, setWage] = useState<keyof typeof TEACHER_FEE>('skilled');
  const [years, setYears] = useState(1);
  const fee = TEACHER_FEE[wage];
  const set = (fn: (x: Specialist) => void) =>
    setT((cur) => {
      const x = structuredClone(cur);
      fn(x);
      return x;
    });
  const ready = (t.abilities ?? []).some((a) => a.id);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <b className="small">Hire a teacher from outside</b>
      <div className="row small">
        <input value={t.name} placeholder="name" style={{ width: 140 }} onChange={(e) => set((x) => void (x.name = e.target.value))} aria-label="Teacher's name" />
        <select value={wage} onChange={(e) => setWage(e.target.value as keyof typeof TEACHER_FEE)} aria-label="Wage">
          <option value="skilled">skilled ({TEACHER_FEE.skilled} £ a year)</option>
          <option value="master">a master ({TEACHER_FEE.master} £ a year)</option>
        </select>
        <span className="row tight">
          for <Stepper value={years} min={1} max={10} width={30} onChange={setYears} /> year{years > 1 ? 's' : ''}
        </span>
        <span className="row tight">
          Teaching <Stepper value={t.teaching ?? 0} min={0} max={10} width={30} onChange={(v) => set((x) => void (x.teaching = v))} />
        </span>
        <SpecChars s={t} set={set} show={['Com']} />
        <label className="row tight" style={{ flexWrap: 'nowrap' }}>
          <input type="checkbox" checked={!!t.goodTeacher} onChange={(e) => set((x) => void (x.goodTeacher = e.target.checked))} /> Good Teacher
        </label>
      </div>
      <SpecAbilities s={t} set={set} data={data} />
      <div className="row small">
        <span className="badge">teaches at Quality {teacherQuality(t)}</span>
        <button
          className="small"
          disabled={!ready}
          title={ready ? undefined : 'Choose what they teach'}
          onClick={() =>
            run((st, p) => hireTeacher(p, st.covenants.find((c) => c.id === home.id)!, t, fee, years, { year: st.saga.currentYear, season: st.saga.currentSeason }, onSundry), `${t.name || 'A teacher'} is hired to teach at ${home.name}.`) && setT(blank())
          }
        >
          Hire for {lsd(fee * years)}
        </button>
      </div>
      <HowItWorks label="About hiring teachers">
        Covenants ch.5: an outsider costs half as much to recruit for teaching as to employ for work. A teacher teaches two seasons a year, never the Arts (DE p.180): choose them as a
        student&apos;s standing activity (&quot;Taught by a covenant teacher&quot;) or on the student&apos;s Seasons &amp; Aging tab. They are not inhabitants, and leave at the end of the last year paid for.
      </HowItWorks>
    </div>
  );
}

/** Everything else with a price in pounds. */
function PriceList({ run, home, onSundry }: { run: Run; home: Covenant | undefined; onSundry: boolean }) {
  const [group, setGroup] = useState(MARKET[0].id);
  const g = MARKET.find((x) => x.id === group) ?? MARKET[0];
  return (
    <Card title="Price list">
      <div className="row small">
        <select value={g.id} onChange={(e) => setGroup(e.target.value)} aria-label="Kind of goods">
          {MARKET.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        {g.note && <span className="muted">{g.note}</span>}
      </div>
      <div className="small" style={{ marginTop: 6 }}>
        {g.wares.map((w) => (
          <WareRow key={w.id} w={w} run={run} home={home} onSundry={onSundry} />
        ))}
      </div>
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Quality and size: shoddy or small ×½, superior or large ×2, excellent or huge ×5, flawless or stupendous ×10 (Covenants ch.5). A pound is 20 shillings or 240 pennies. A lab Virtue taken
        on the covenant&apos;s Laboratories tab is paid for here; one installed as a lab project (a character&apos;s Lab tab) pays its own Upkeep.
      </p>
    </Card>
  );
}

function WareRow({ w, run, home, onSundry }: { w: Ware; run: Run; home: Covenant | undefined; onSundry: boolean }) {
  const [mult, setMult] = useState(1);
  const [qty, setQty] = useState(1);
  const pounds = w.pounds * (w.scales ? mult : 1) * qty;
  return (
    <div className="ware">
      <div className="ware-name">
        {w.name}
        {w.per && <span className="muted"> ({w.per})</span>}
        <b className="ware-price">
          {' '}
          {lsd(w.pounds)}
          {w.yearly ? ' a year' : ''}
        </b>
        {(w.note || w.source) && (
          <div className="muted" style={{ fontSize: '0.9em' }}>
            {w.note ? `${w.note} ` : ''}
            {w.source}
          </div>
        )}
      </div>
      <div className="row tight ware-buy">
        {w.scales && (
          <select value={mult} onChange={(e) => setMult(Number(e.target.value))} aria-label="Quality">
            {QUALITY.map((q) => (
              <option key={q.id} value={q.mult}>
                {q.label} ×{q.mult}
              </option>
            ))}
          </select>
        )}
        <Stepper value={qty} min={1} max={99} width={30} onChange={setQty} />
        <button className="small" disabled={w.id === 'lab-outfit' && !home} onClick={() => run((st, p, h) => buyWare(p, h, w, mult, qty, { year: st.saga.currentYear, season: st.saga.currentSeason }, onSundry), `Bought ${w.name}${qty > 1 ? ` ×${qty}` : ''}.`)}>
          Buy {lsd(pounds)}
        </button>
      </div>
    </div>
  );
}

/** What the buyer has spent and received lately. */
function History({ buyer }: { buyer: Payer }) {
  const rows =
    buyer.kind === 'covenant'
      ? buyer.cov.log.filter((l) => l.treasuryDelta || l.visDelta || /Sundry|Bought|Sold|Gave|Received|hired|joined|left/i.test(l.text)).slice(-10).reverse().map((l) => ({ when: `${l.season ?? ''} ${l.year}`, text: l.text }))
      : (buyer.c.purse?.log ?? []).slice(-10).reverse().map((l) => ({ when: `${l.season} ${l.year}`, text: l.text }));
  if (!rows.length) return null;
  return (
    <Card title={`Lately, ${payerName(buyer)}`}>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
        {rows.map((r, i) => (
          <li key={i}>
            <span className="muted">{r.when}:</span> {r.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}
