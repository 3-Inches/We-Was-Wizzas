// The Game Table's Health & recovery: everyone wounded, tired or ill, the soonest recovery first, how
// near the edge each one is, who tends them, and time passed for them all at once, every roll made
// and put on their sheets (engine/recovery.ts). The sheets keep the score: wounds, Fatigue, illness.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { GameData } from '../../data';
import { deriveCharacter, type DerivedCharacter } from '../../engine/character/derive';
import { characterContext } from '../../engine/context';
import { currentSeverity, prognosisTotal } from '../../engine/disease';
import { DAY, HOUR, MONTH, SEASON, WEEK, ailmentsOf, condition, medicCapacity, medicsOf, nextRecovery, passTime, spanText, type Care } from '../../engine/recovery';
import { livingConditions } from '../../engine/time';
import type { Character, Covenant, Saga } from '../../engine/types';
import { useStore } from '../../store/store';
import { Card, Empty, Field, Stepper } from '../kit';
import { AtTable, PeopleOptions, groupPeople } from '../play';
import { R } from '../routes';
import { useCharEditor } from '../character/useChar';
import { HealthCards } from '../character/sheet/CombatTab';
import { EffectsCard } from '../character/sheet/EffectsCard';

const SPANS: { id: string; label: string; min: number }[] = [
  { id: 'hour', label: 'an hour', min: HOUR },
  { id: 'night', label: 'a night (12 hours)', min: 12 * HOUR },
  { id: 'day', label: 'a day', min: DAY },
  { id: 'week', label: 'a week', min: WEEK },
  { id: 'month', label: 'a month', min: MONTH },
  { id: 'season', label: 'a season', min: SEASON },
];

export function RecoveryCard({ saga, data, chars, covs }: { saga: Saga; data: GameData; chars: Character[]; covs: Covenant[] }) {
  const putRecords = useStore((s) => s.putRecords);
  const derive = useMemo(() => {
    const cache = new Map<Character, DerivedCharacter>();
    return (c: Character) => cache.get(c) ?? (cache.set(c, deriveCharacter(c, data, saga.houseRules)), cache.get(c)!);
  }, [data, saga.houseRules]);
  const playing = chars.filter((c) => c.creation.finalized && !c.wounds.dead);
  const patients = playing
    .map((c) => ({ c, ail: ailmentsOf(c) }))
    .filter((p) => p.ail.length)
    .sort((a, b) => a.ail[0].next - b.ail[0].next);
  const medics = medicsOf(covs, playing, derive);
  const [medicKey, setMedicKey] = useState('');
  const medic = medicKey === 'none' ? undefined : (medics.find((m) => m.key === medicKey) ?? medics[0]);
  const [season, setSeason] = useState(false);
  const [untended, setUntended] = useState<string[]>([]);
  const [aid, setAid] = useState<Record<string, number>>({});
  const [atHome, setAtHome] = useState(true);
  const [span, setSpan] = useState('next');
  const [log, setLog] = useState<string[]>([]);
  // a sheet's link names who (?who=): their wounds, Fatigue and illness open here
  const [params] = useSearchParams();
  const asked = params.get('who') ?? '';
  const [who, setWho] = useState(asked);
  useEffect(() => {
    if (asked) setWho(asked);
  }, [asked]);
  const aa = saga.enabledBooks.length === 0 || saga.enabledBooks.includes('AA');
  // a chirurgeon tends as many as their Chirurgy without giving up the season, five times that by giving it (Art & Academe)
  const capacity = medic ? medicCapacity(Math.max(medic.chirurgy, medic.medicine), season) : 0;
  const tended = patients.filter((p) => !untended.includes(p.c.id) && p.c.id !== medic?.charId).slice(0, capacity).map((p) => p.c.id);
  const next = nextRecovery(patients.map((p) => p.c));
  const minutes = span === 'next' ? next ?? 0 : SPANS.find((s) => s.id === span)!.min;

  const careOf = (c: Character): Care => {
    const ctx = characterContext(c, covs, data);
    const t = tended.includes(c.id) && medic;
    return {
      chirurgy: t ? medic.chirurgy : 0,
      aid: aid[c.id] ?? 0,
      bronze: c.familiar?.bronze ?? 0,
      labHealth: ctx.lab?.characteristics.Health ?? 0,
      aura: atHome ? ctx.aura : undefined,
    };
  };

  const pass = () => {
    if (!minutes) return;
    const changed: Character[] = [];
    const lines: string[] = [];
    for (const p of patients) {
      const c = structuredClone(p.c);
      const ctx = characterContext(c, covs, data);
      const t = tended.includes(c.id) && medic;
      // the physician's Medicine helps a disease when their Prognosis beats its Severity (Art & Academe)
      const medicineFor = (ill: NonNullable<Character['illnesses']>[number]) => {
        if (!t || !medic.medicine) return 0;
        const prog = prognosisTotal({ int: medic.int, medicine: medic.medicine, living: livingConditions(derive(c), ctx), apothecary: 0, chirurgy: medic.chirurgy });
        return prog > currentSeverity(ill) ? medic.medicine : 0;
      };
      const out = passTime(c, (x) => deriveCharacter(x, data, saga.houseRules), minutes, careOf(c), medicineFor);
      changed.push(c);
      if (out.length) lines.push(`${c.name || 'Unnamed'}: ${out.join(' ')}`);
    }
    if (!changed.length) return;
    putRecords({ characters: changed, covenants: [] }, `${spanText(minutes)} of recovery`);
    setLog([`${spanText(minutes)} passed${medic && tended.length ? `, ${medic.name} tending ${tended.length}` : ''}.`, ...(lines.length ? lines : ['Nobody’s recovery came due.'])]);
  };

  const ill = playing.find((c) => c.id === who);
  return (
    <Card title={`Health & recovery${patients.length ? ` (${patients.length})` : ''}`} tour="table-recovery" fold="table-recovery" summary={patients.length ? `${patients.length} wounded, tired or ill; the next recovery in ${spanText(next ?? 0)}.` : 'Everyone is well.'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Each wound rolls at its interval (a week for Light, a month for Medium, a season for Heavy): Stamina + the medic&apos;s Chirurgy + magical aid + a stress die, against the
        Stable and Improvement Ease Factors; a stable wound keeps +3 for its later rolls. An Incapacitated character rolls at sunrise and sunset. Fatigue comes back with quiet
        rest, Long-Term Fatigue a level a night. Wound Penalties do not count against these rolls (DE, Recovering From Wounds).
      </p>
      {patients.length === 0 ? (
        <Empty>Nobody is wounded, tired or ill.</Empty>
      ) : (
        <>
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>What ails them, the soonest first</th>
                  <th>Penalty</th>
                  <th>Tended</th>
                  <th>Magical aid</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(({ c, ail }) => {
                  const d = derive(c);
                  const st = condition(c, d);
                  const isMedic = c.id === medic?.charId;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={R.character(saga.id, c, 'combat')}>{c.name || 'Unnamed'}</Link>
                      </td>
                      <td>
                        {ail.map((a) => (
                          <div key={a.kind + (a.illUid ?? '')}>
                            {a.label} <span className="muted">· next in {spanText(a.next)}</span>
                          </div>
                        ))}
                        <div className="muted">
                          {st.fatigue}
                          {st.danger && (
                            <>
                              {' · '}
                              <span className="bad-text">{st.danger}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="num">{st.penalty || '—'}</td>
                      <td>
                        {medic && !isMedic ? (
                          <input
                            type="checkbox"
                            aria-label={`${c.name || 'Unnamed'} tended`}
                            checked={tended.includes(c.id)}
                            disabled={!tended.includes(c.id) && tended.length >= capacity}
                            onChange={(e) => setUntended((u) => (e.target.checked ? u.filter((x) => x !== c.id) : [...u, c.id]))}
                          />
                        ) : (
                          <span className="muted">{isMedic ? 'the medic' : '—'}</span>
                        )}
                      </td>
                      <td>
                        <Stepper value={aid[c.id] ?? 0} min={0} max={30} width={34} onChange={(v) => setAid({ ...aid, [c.id]: v })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="row small" style={{ marginTop: 8 }}>
            <Field label="Who tends them" hint={medic ? `Chirurgy ${medic.chirurgy}${medic.medicine ? `, Medicine ${medic.medicine}` : ''}: up to ${capacity} patient${capacity === 1 ? '' : 's'}` : 'Nobody here has Chirurgy or Medicine'}>
              <select value={medic?.key ?? 'none'} onChange={(e) => setMedicKey(e.target.value)} disabled={!medics.length}>
                <option value="none">nobody</option>
                {medics.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name} (Chirurgy {m.chirurgy}, Medicine {m.medicine})
                  </option>
                ))}
              </select>
            </Field>
            {medic && (
              <label className="inline" title="Art & Academe: as many patients as their Chirurgy (or Medicine) without giving up their season; five times that if the season goes to it">
                <input type="checkbox" checked={season} onChange={(e) => setSeason(e.target.checked)} /> gives their season to it (×5 patients)
              </label>
            )}
            <label className="inline" title="A Healing aura helps, an Infernal one makes wounds fester; a magus's lab Health counts at home">
              <input type="checkbox" checked={atHome} onChange={(e) => setAtHome(e.target.checked)} /> recovering at the covenant
            </label>
          </div>
          {medic && tended.length < patients.filter((p) => p.c.id !== medic.charId).length && (
            <div className="small warn-text">
              {medic.name} can tend {capacity}: {patients.length - tended.length - (patients.some((p) => p.c.id === medic.charId) ? 1 : 0)} go{' '}
              without{season ? '' : ' (tick “gives their season to it” for up to five times as many)'}.
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Pass">
              <select value={span} onChange={(e) => setSpan(e.target.value)}>
                <option value="next">to the next recovery ({spanText(next ?? 0)})</option>
                {SPANS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <button className="primary" onClick={pass} data-tour="recovery-pass">
              Pass {spanText(minutes)} and roll for everyone
            </button>
          </div>
          {log.length > 0 && (
            <div className="stack small" style={{ gap: 2, marginTop: 6 }} aria-live="polite">
              {log.map((l, i) => (
                <div key={i} className={i ? '' : 'good-text'}>
                  {l}
                </div>
              ))}
            </div>
          )}
          {!aa && <p className="small muted">How many a medic can tend follows Art &amp; Academe, which this saga does not use; the core book sets no limit.</p>}
        </>
      )}
      <div style={{ marginTop: 10 }} data-tour="health-who">
        <Field label="Someone is hurt, tired, ill or under a spell" hint="Their wounds, Fatigue and illness: apply damage, take or recover a level, catch or cure a disease; spells and powers working on them">
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">— choose who —</option>
            <PeopleOptions groups={groupPeople(playing, covs)} />
          </select>
        </Field>
        {ill && <HealthAtTable key={ill.id} sagaId={saga.id} charId={ill.id} />}
      </div>
    </Card>
  );
}

/** One character's wounds, Fatigue, illness and the magic on them, changed at the table (the same cards their sheet shows). */
function HealthAtTable({ sagaId, charId }: { sagaId: string; charId: string }) {
  const ed = useCharEditor({ sagaId, charId });
  if (!ed.c || !ed.d) return null;
  return (
    <AtTable>
      <div className="stack" style={{ marginTop: 8 }}>
        <HealthCards ed={ed} />
        <EffectsCard ed={ed} />
      </div>
    </AtTable>
  );
}
