// Hard times (Covenants ch.5, Emergency Savings): what the covenant can do when its money runs out,
// and what it owes. Folded to a line while the accounts are sound.

import { useMemo, useState } from 'react';
import { ARTS, ART_NAMES, type Art } from '../../data';
import { NEGLECT, VIS_PRICE, borrow, hardTimesOptions, owed, repay, sellVis } from '../../engine/hardship';
import { useSagaCharacters } from '../../store/hooks';
import { useStore } from '../../store/store';
import { Card, Field, Stepper, signed } from '../kit';
import { uid } from '../../util/id';
import type { CovTabProps } from './shared';

export function HardTimesCard({ cov, update, dc, data }: CovTabProps) {
  const chars = useSagaCharacters(cov.sagaId);
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const year = saga?.currentYear ?? cov.foundedYear;
  const f = dc.finances;
  const yearEnd = Math.round((cov.finances.treasury + f.balance) * 10) / 10;
  const debt = owed(cov);
  const neglect = cov.finances.neglect ?? [];
  const trouble = yearEnd < 0 || debt > 0 || neglect.length > 0;
  const [open, setOpen] = useState(false);
  const options = useMemo(() => (trouble || open ? hardTimesOptions(cov, data, chars) : []), [trouble, open, cov, data, chars]);
  const [loan, setLoan] = useState(Math.max(10, Math.ceil(-yearEnd / 10) * 10));
  const [lender, setLender] = useState('a merchant of the town');
  const stocks = cov.visStocks.filter((v) => !v.pair && v.pawns > 0);
  const [art, setArt] = useState<Art>((stocks[0]?.art as Art) ?? 'Vi');
  const [pawns, setPawns] = useState(5);
  const [price, setPrice] = useState(VIS_PRICE);
  const have = stocks.filter((v) => v.art === art).reduce((t, v) => t + v.pawns, 0);

  if (!trouble && !open)
    return (
      <Card title="Hard times">
        <div className="row small">
          <span className="muted">The accounts hold: the year should end with {yearEnd} £. If money runs short, the ways to spend less, borrow or sell vis are here.</span>
          <button className="small ghost" onClick={() => setOpen(true)}>
            Show them
          </button>
        </div>
      </Card>
    );

  return (
    <Card title="Hard times (Covenants ch.5, Emergency Savings)" className={yearEnd < 0 ? 'accent' : undefined}>
      <p className="small" style={{ marginTop: 0 }}>
        {yearEnd < 0 ? (
          <span className="warn-text">
            At this rate the year ends {-yearEnd} £ short. What is not found by then is left owed as unpaid bills, at a tenth a year, and the wages come late (−3 loyalty points).
          </span>
        ) : (
          <span className="muted">The year should end with {yearEnd} £.</span>
        )}
        {debt > 0 && <span> The covenant owes {debt} £ ({Math.round(debt) / 10} £ a year in interest).</span>}
      </p>

      {options.length > 0 && (
        <>
          <h4>Spend less</h4>
          {options.map((o) => (
            <div key={o.id} className="list-row small" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span style={{ flex: 1, minWidth: 200 }}>
                <b>{o.label}</b>: saves {o.saving} £ a year{o.loyalty ? <span className="warn-text"> ({signed(o.loyalty)} loyalty points)</span> : ''}. <span className="muted">{o.note}</span>
              </span>
              <button className="small" onClick={() => update((x) => (o.apply(x), x.log.push({ uid: uid(), year, season: saga?.currentSeason, text: `Hard times: ${o.label.toLowerCase()} (saves ${o.saving} £ a year).` })))}>
                Do it
              </button>
            </div>
          ))}
        </>
      )}

      {neglect.length > 0 && (
        <>
          <h4>Left unpaid</h4>
          {neglect.map((n) => (
            <div key={n} className="list-row small">
              <span style={{ flex: 1 }}>
                <b>{n}</b>: <span className="muted">{NEGLECT.find((g) => g.id === n)?.effect}</span>
              </span>
              <button className="small" onClick={() => update((x) => void (x.finances.neglect = (x.finances.neglect ?? []).filter((y) => y !== n)))}>
                Pay for it again
              </button>
            </div>
          ))}
        </>
      )}

      <h4>Find money</h4>
      <div className="row small">
        <Field label="Borrow (£)" hint="A tenth a year in interest until repaid">
          <Stepper value={loan} min={10} step={10} width={50} onChange={setLoan} />
        </Field>
        <Field label="From">
          <input value={lender} onChange={(e) => setLender(e.target.value)} style={{ width: 170 }} />
        </Field>
        <button className="small" onClick={() => update((x) => (borrow(x, loan, lender || 'a lender', year), x.log.push({ uid: uid(), year, text: `Borrowed ${loan} £ from ${lender || 'a lender'}.` })))}>
          Borrow
        </button>
      </div>
      {stocks.length > 0 && (
        <div className="row small" style={{ marginTop: 6 }}>
          <Field label="Sell vis">
            <select value={art} onChange={(e) => setArt(e.target.value as Art)}>
              {ARTS.filter((a) => stocks.some((v) => v.art === a)).map((a) => (
                <option key={a} value={a}>
                  {ART_NAMES[a]} ({stocks.filter((v) => v.art === a).reduce((t, v) => t + v.pawns, 0)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pawns">
            <Stepper value={Math.min(pawns, have)} min={1} max={Math.max(1, have)} width={40} onChange={setPawns} />
          </Field>
          <Field label="£ a pawn" hint="About 10 in a typical saga; from a couple to a hundred">
            <Stepper value={price} min={1} width={40} onChange={setPrice} />
          </Field>
          <button
            className="small"
            disabled={!have}
            onClick={() =>
              update((x) => {
                const r = sellVis(x, [art], Math.min(pawns, have), price);
                if (r) x.log.push({ uid: uid(), year, season: saga?.currentSeason, text: `Sold ${r}.` });
              })
            }
          >
            Sell
          </button>
        </div>
      )}
      {debt > 0 && (
        <>
          <h4>Owed</h4>
          {(cov.finances.loans ?? []).map((l) => (
            <div key={l.uid} className="list-row small">
              <span style={{ flex: 1 }}>
                {l.pounds} £ to {l.from} (since {l.year})
              </span>
            </div>
          ))}
          <button className="small" disabled={cov.finances.treasury <= 0} onClick={() => update((x) => void x.log.push({ uid: uid(), year, season: saga?.currentSeason, text: `Repaid ${repay(x, debt)} £ of what is owed.` }))}>
            Repay what the treasury allows ({Math.min(debt, Math.max(0, cov.finances.treasury))} £)
          </button>
        </>
      )}
      <p className="small muted">Or a magical solution: an enchantment or ritual that improves an income source (the Income card), at the cost of seasons and vis.</p>
    </Card>
  );
}
