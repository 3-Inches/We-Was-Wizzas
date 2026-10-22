// The Tribunal customs that touch a covenant, when the troupe uses them: a Theban covenant's patron and
// its propitiation, Normandy's Hermetic Tourney, and the Perthean Compact's hold on each vis source.

import { useState } from 'react';
import { optionOn } from '../../engine/optional';
import { PERTHEAN, SIEGES, TOURNEY_EVENTS, cursorMiles, propitiationXp, tourneyPrize, tourneyTally, type PertheanStatus } from '../../engine/tribunal';
import type { Covenant, Saga, VisSource } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper } from '../kit';
import { RulesNote } from '../RulesNote';

type Update = (fn: (c: Covenant) => void) => void;

export function CovenantTribunalCard({ cov, update, saga }: { cov: Covenant; update: Update; saga?: Saga }) {
  const patron = optionOn(saga, 'thebanPatrons') || !!cov.patron;
  const tourney = optionOn(saga, 'normandyTourney') || !!cov.tourney;
  if (!patron && !tourney) return null;
  return (
    <Card title={`${saga?.tribunal ? `${saga.tribunal} ` : ''}Tribunal customs`}>
      <div className="stack">
        {patron && <PatronSection cov={cov} update={update} saga={saga} />}
        {tourney && <TourneySection cov={cov} update={update} saga={saga} />}
      </div>
    </Card>
  );
}

function PatronSection({ cov, update, saga }: { cov: Covenant; update: Update; saga?: Saga }) {
  const [pawns, setPawns] = useState(0);
  const p = cov.patron ?? { name: '', might: 20, xp: 0, offerings: [] };
  const set = (fn: (x: NonNullable<Covenant['patron']>) => void) => update((c) => { c.patron = { ...p, ...(c.patron ?? {}) }; fn(c.patron); });
  const xp = propitiationXp(p.might, pawns);
  const stock = cov.visStocks.filter((v) => (v.art === 'Cr' || v.art === 'Vi') && !v.pair).reduce((s, v) => s + v.pawns, 0);
  return (
    <div>
      <RulesNote book="SE" line={1391} endLine={1430}>
        <b>Patron.</b> Its protection is the covenant’s Powerful or Local Ally Boon; a covenant without one is deemed to have expired.
      </RulesNote>
      <div className="row">
        <Field label="Patron">
          <input value={p.name} placeholder="nymph, giant, grove spirit…" onChange={(e) => set((x) => void (x.name = e.target.value))} style={{ width: 160 }} />
        </Field>
        <Field label="Might">
          <Stepper value={p.might} min={0} max={100} onChange={(v) => set((x) => void (x.might = v))} />
        </Field>
        <Field label="Experience banked" hint="to spend on its advancement (RoP: Magic)">
          <Stepper value={p.xp} min={0} onChange={(v) => set((x) => void (x.xp = v))} />
        </Field>
      </div>
      <div className="row">
        <Field label="Vis offered at Delos" hint="each pawn lowers its Might’s penalty by 2">
          <Stepper value={pawns} min={0} max={50} onChange={setPawns} />
        </Field>
        <span className="small">
          The Ceremony of Propitiation gives it <b>{xp}</b> experience points (25 − Might {p.might}{pawns ? ` + 2 × ${pawns}` : ''}).
        </span>
        <button
          className="small"
          title={pawns > stock ? `The covenant holds ${stock} pawns of any Art; offered from its stocks, Vim first` : 'Offered from the covenant’s stocks, Vim first'}
          onClick={() =>
            update((c) => {
              c.patron = { ...p, ...(c.patron ?? {}) };
              c.patron.xp += xp;
              c.patron.offerings = [...c.patron.offerings, { year: saga?.currentYear ?? cov.foundedYear, pawns, xp }];
              let left = pawns;
              for (const st of [...c.visStocks].sort((a, b) => (a.art === 'Vi' ? -1 : b.art === 'Vi' ? 1 : 0))) {
                if (!left || st.pair) continue;
                const take = Math.min(st.pawns, left);
                st.pawns -= take;
                left -= take;
              }
              c.log.push({ uid: uid(), year: saga?.currentYear ?? cov.foundedYear, text: `Ceremony of Propitiation: ${pawns} pawns offered to ${p.name || 'the patron'}, +${xp} experience.` });
            })
          }
        >
          Hold the ceremony
        </button>
      </div>
      {p.offerings.length > 0 && <div className="small muted">Past ceremonies: {p.offerings.map((o) => `${o.year} (${o.pawns} pawns, +${o.xp})`).join(', ')}.</div>}
    </div>
  );
}

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th'];

function TourneySection({ cov, update, saga }: { cov: Covenant; update: Update; saga?: Saga }) {
  const t = cov.tourney ?? { year: saga?.currentYear ?? cov.foundedYear, results: {} };
  const set = (fn: (x: NonNullable<Covenant['tourney']>) => void) => update((c) => { c.tourney = { ...t, ...(c.tourney ?? {}), results: { ...(c.tourney?.results ?? t.results) } }; fn(c.tourney); });
  const tally = tourneyTally(cov.memberIds.length, t.results);
  const prize = t.rank ? tourneyPrize(t.rank) : undefined;
  return (
    <div>
      <RulesNote book="LaL" line={1103} endLine={1215}>
        <b>Hermetic Tourney</b>, after each Tribunal meeting: points decide the rank, the rank buys prizes held for seven years.
      </RulesNote>
      <div className="row">
        {TOURNEY_EVENTS.map((e) => {
          const v = t.results[e.id] ?? 0;
          return (
            <Field key={e.id} label={e.label}>
              <select value={v} onChange={(ev) => set((x) => void (x.results[e.id] = Number(ev.target.value)))}>
                <option value={0}>did not enter</option>
                <option value={-1}>took part</option>
                {e.places.map((pts, i) => (
                  <option key={i} value={i + 1}>
                    {ORDINAL[i]} ({pts + e.participation})
                  </option>
                ))}
              </select>
            </Field>
          );
        })}
      </div>
      <div className="small">
        Tally <b>{tally.total}</b> <span className="muted">({tally.parts.map((p) => `${p.label} ${p.value}`).join(' + ')})</span>
      </div>
      <div className="row">
        <Field label="Final rank" hint="from the hosts’ tally of every team">
          <Stepper value={t.rank ?? 0} min={0} max={30} onChange={(v) => set((x) => void (x.rank = v || undefined))} />
        </Field>
        {prize && (
          <span className="small">
            {prize.pawns} prize pawns{prize.siege ? ` · the ${prize.siege}${t.rank === 13 ? ': no prize' : ''}, a Hermetic Reputation 2 for seven years` : ''}
            {t.rank === 21 ? ' · keeps 6, gives 6 to lower teams' : ''}.{' '}
            <span className="muted">Spend them on a tropaeum (a pawn a year each), books or items (a pawn per 5 Build Points), or vis now (5 Form or 3 Technique pawns each).</span>
          </span>
        )}
      </div>
      {prize && prize.pawns > 0 && (
        <button
          className="small"
          onClick={() =>
            update((c) =>
              void c.visSources.push({ uid: uid(), name: `Tropaeum won at the Tourney of ${t.year}`, art: 'Vi', pawnsPerYear: 1, inPlay: true, perthean: 'tropaeum', leaseYear: t.year }),
            )
          }
        >
          + Tropaeum won (Library & Vis)
        </button>
      )}
      <div className="small muted">Named ranks: {Object.entries(SIEGES).map(([r, n]) => `${r} ${n}`).join(', ')}.</div>
    </div>
  );
}

/** The Perthean Compact on one vis source: how the covenant holds it, and when its lease must be renewed. */
export function PertheanFields({ s, saga, onChange }: { s: VisSource; saga?: Saga; onChange: (fn: (v: VisSource) => void) => void }) {
  if (!optionOn(saga, 'normandyCompact') && !s.perthean) return null;
  const st = PERTHEAN[s.perthean ?? 'seisin'];
  const due = st.lease && s.leaseYear ? s.leaseYear + st.lease : undefined;
  return (
    <>
      <select value={s.perthean ?? ''} title={s.perthean ? st.note : 'Its standing under the Perthean Compact'} onChange={(e) => onChange((v) => void (v.perthean = (e.target.value || undefined) as PertheanStatus | undefined))}>
        <option value="">compact: —</option>
        {(Object.keys(PERTHEAN) as PertheanStatus[]).map((k) => (
          <option key={k} value={k}>
            {PERTHEAN[k].label}
          </option>
        ))}
      </select>
      {st.lease && s.perthean && (
        <>
          <Stepper value={s.leaseYear ?? saga?.currentYear ?? 1220} width={54} title="Year the lease began" onChange={(y) => onChange((v) => void (v.leaseYear = y))} />
          {due && <span className={`badge${saga && saga.currentYear >= due ? ' warn' : ''}`}>renew {due}</span>}
        </>
      )}
    </>
  );
}

/** A cursor's day's march, to test a seisin. */
export function CursorNote({ saga }: { saga?: Saga }) {
  const [ath, setAth] = useState(3);
  if (!optionOn(saga, 'normandyCompact')) return null;
  const c = cursorMiles(ath, 'country');
  return (
    <div className="small muted">
      A cursor with Athletics{' '}
      <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <Stepper value={ath} min={0} max={10} width={30} onChange={setAth} />
      </span>{' '}
      runs {c.day} miles a day cross-country ({cursorMiles(ath, 'roads').day} on roads,{' '}
      {cursorMiles(ath, 'wild').day} in wilderness): a seisin lies within about {c.reach} miles of the council chamber.
    </div>
  );
}
