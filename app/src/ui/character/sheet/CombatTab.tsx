import { useState } from 'react';
import { RECOVERY, SCUFFLE_EFFECTS, allCombatLines, distributeBlows, groupCombat, woundFromDamage, type GroupMember } from '../../../engine/combat';
import { deriveCharacter } from '../../../engine/character/derive';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { describeStress, stressDie } from '../../../engine/dice';
import { ailmentsOf, condition, spanText } from '../../../engine/recovery';
import type { WoundState } from '../../../engine/types';
import { Card, Field, Stepper, signed } from '../../kit';
import EquipmentEditor from '../EquipmentEditor';
import { IllnessCard } from './IllnessCard';
import { immunities, immunityFlaw, immunityFlawState } from '../../../engine/covenantBoons';
import type { CharEditor } from '../useChar';
import { RollAtTable, groupPeople, useAtTable } from '../../play';
import { AfterRoll } from '../../AfterRoll';

const WOUND_KEYS: { key: keyof Omit<WoundState, 'dead'>; label: string; pen: number }[] = [
  { key: 'light', label: 'Light', pen: -1 },
  { key: 'medium', label: 'Medium', pen: -3 },
  { key: 'heavy', label: 'Heavy', pen: -5 },
  { key: 'incapacitating', label: 'Incapacitated', pen: 0 },
];

const FATIGUE_RECOVERY = ['—', '2 minutes', '10 minutes', '30 minutes', '1 hour', '2 hours'];

/**
 * The sheet's Combat & Health tab keeps the score: wounds and their penalties, Fatigue, illness, the
 * combat totals and the gear. The rolls are made at the Game Table: recovery for everyone on its
 * Overview, a fight on Dice › Combat & perils.
 */
export default function CombatTab({ ed }: { ed: CharEditor }) {
  return (
    <div className="stack">
      <HealthCards ed={ed} />
      <CombatRolls ed={ed} />
      <EquipmentEditor ed={ed} />
    </div>
  );
}

/**
 * Wounds, Fatigue and illness. On the sheet they show where the character stands; at the Game Table
 * (Overview › Health & recovery) damage is applied, wounds and Fatigue taken and recovered, and a
 * disease caught or cured. One card for both, so the mechanics live in one place.
 */
export function HealthCards({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const atTable = useAtTable();
  const [damage, setDamage] = useState(0);
  const [msg, setMsg] = useState('');
  if (!c || !d) return null;
  const lost = Math.min(5, c.fatigueLost + c.longTermFatigueLost);
  const next = new Map(ailmentsOf(c).map((a) => [a.kind, a.next]));
  const st = condition(c, d);

  const applyDamage = () => {
    const excess = damage - d.soak;
    const w = woundFromDamage(d, excess);
    if (w === 'none') return setMsg(`Damage ${damage} vs Soak ${d.soak}: no wound.`);
    setMsg(`Damage ${damage} − Soak ${d.soak} = ${excess}: ${w} wound.`);
    update((x) => {
      if (w === 'dead') x.wounds.dead = true;
      else x.wounds[w] += 1;
    });
  };

  return (
    <>
      <div className="grid grid-2">
        <Card title="Wounds" className="accent" tour="health-wounds">
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="stat">
              <span className="v">{signed(d.soak)}</span>
              <span className="l">Soak</span>
            </div>
            <div className="stat">
              <span className="v">{d.currentWoundPenalty}</span>
              <span className="l">Wound penalty</span>
            </div>
            <div className="stat">
              <span className="v">{d.currentFatiguePenalty}</span>
              <span className="l">Fatigue penalty</span>
            </div>
            {d.currentDiseasePenalty !== 0 && (
              <div className="stat">
                <span className="v">{d.currentDiseasePenalty}</span>
                <span className="l">Disease penalty</span>
              </div>
            )}
            {(c.illnesses ?? []).some((i) => i.stage === 'Critical') && <span className="badge bad" title="A Critical disease: no action until the crisis passes">disease crisis</span>}
            {c.wounds.dead && <span className="badge bad">DEAD</span>}
          </div>
          {st.danger && !c.wounds.dead && <div className="small bad-text">{st.danger}</div>}
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>Wound</th>
                  <th>Range (damage − soak)</th>
                  <th className="num">Penalty</th>
                  <th>Count</th>
                  <th>Recovery</th>
                </tr>
              </thead>
              <tbody>
                {WOUND_KEYS.map((w) => {
                  const range = w.key === 'incapacitating' ? d.woundRanges.incap : d.woundRanges[w.key];
                  const rec = w.key === 'incapacitating' ? undefined : RECOVERY[w.key];
                  const bonus = w.key === 'incapacitating' ? [] : (c.recovery?.stable?.[w.key] ?? []).filter(Boolean);
                  return (
                    <tr key={w.key}>
                      <td>{w.label}</td>
                      <td>{range.join('–')}</td>
                      <td className="num">{w.pen || '—'}</td>
                      <td>{atTable ? <Stepper value={c.wounds[w.key]} min={0} width={36} onChange={(v) => update((x) => void (x.wounds[w.key] = v))} /> : <b>{c.wounds[w.key] || '—'}</b>}</td>
                      <td className="small">
                        {rec ? `${rec.interval}; stable ${rec.stable}, improve ${rec.improve}` : 'Twice a day: 0 or less dies, 9+ becomes Heavy'}
                        {c.wounds[w.key] > 0 && next.has(w.key) && <span className="muted"> · next roll in {spanText(next.get(w.key)!)}</span>}
                        {bonus.length > 0 && <span className="muted"> · stable {bonus.map((b) => `+${b}`).join(', ')}</span>}
                        {w.key === 'incapacitating' && c.recovery?.incapacitated ? <span className="muted"> · now {c.recovery.incapacitated}</span> : null}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td>Dead</td>
                  <td>{d.woundRanges.dead}+</td>
                  <td />
                  <td>{atTable ? <input type="checkbox" checked={!!c.wounds.dead} onChange={(e) => update((x) => void (x.wounds.dead = e.target.checked))} aria-label="Dead" /> : c.wounds.dead ? <b className="bad-text">dead</b> : '—'}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          {atTable && (
            <div className="row" style={{ marginTop: 10 }}>
              <Field label="Damage total taken">
                <Stepper value={damage} min={0} width={50} onChange={setDamage} />
              </Field>
              <button onClick={applyDamage}>Apply damage</button>
              {msg && <span className="small">{msg}</span>}
            </div>
          )}
          <RollAtTable sagaId={c.sagaId} who={c.id} where="recovery" what="Damage is applied, wounds taken and recovered (with a medic, magical aid and the lab’s Health)" />
        </Card>

        <Card title="Fatigue">
          <table className="compact">
            <tbody>
              {d.fatigueLevels.map((f, i) => (
                <tr key={f.name} className={i === lost ? 'selected' : ''}>
                  <td>{i === lost ? '▶' : ''}</td>
                  <td>{f.name}</td>
                  <td className="num">{f.penalty === null ? '—' : f.penalty}</td>
                  <td className="small muted">{FATIGUE_RECOVERY[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {atTable ? (
            <div className="row" style={{ marginTop: 8 }}>
              <Field label="Short-term levels lost">
                <Stepper value={c.fatigueLost} min={0} max={5} width={36} onChange={(v) => update((x) => void (x.fatigueLost = v))} />
              </Field>
              <Field label="Long-term levels lost">
                <Stepper value={c.longTermFatigueLost} min={0} max={5} width={36} onChange={(v) => update((x) => void (x.longTermFatigueLost = v))} />
              </Field>
              <button className="small" onClick={() => update((x) => void (x.fatigueLost = Math.max(0, x.fatigueLost - 1)))}>
                Recover one
              </button>
              <button className="small" onClick={() => update((x) => { x.fatigueLost = 0; x.longTermFatigueLost = 0; })} title="A good night's sleep restores long-term Fatigue">
                Night's sleep
              </button>
            </div>
          ) : (
            <p className="small" style={{ margin: '8px 0 0' }}>
              Short-term levels lost: <b>{c.fatigueLost}</b>; long-term: <b>{c.longTermFatigueLost}</b>.
            </p>
          )}
          <p className="small muted">{st.fatigue}. Short-term Fatigue recovers with rest (times above, doubled if active). Long-term Fatigue (Ritual spells, forced march) needs a good night's sleep.</p>
          <RollAtTable sagaId={c.sagaId} who={c.id} where="recovery" what="Fatigue is lost and recovered" />
        </Card>
      </div>

      <CovenantImmunity ed={ed} />
      <IllnessCard ed={ed} />
    </>
  );
}

/**
 * A character's combat totals, for each weapon (DE p.394), with the Combat Options: mounted, exertion,
 * scuffling. At the Game Table each total is rolled; on the sheet they are listed.
 */
export function CombatRolls({ ed }: { ed: CharEditor }) {
  const { c, d, data, update } = ed;
  const atTable = useAtTable();
  const [msg, setMsg] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  // DE Combat Options: mounted (+Ride, up to 3, to Attack and Defense), exertion (a Fatigue level for
  // +Combat Ability to one attack or the round's defense), scuffling (−3 to attack with a real weapon, no weapon damage)
  const [mounted, setMounted] = useState(false);
  const [exertOn, setExertOn] = useState<'none' | 'atk' | 'dfn'>('none');
  const [scuffle, setScuffle] = useState(false);
  // the last roll, for Confidence, Faith and All According to Plan after it
  const [lastRoll, setLastRoll] = useState<{ id: number; label: string; total: number; faces?: number[] } | null>(null);
  if (!c || !d) return null;
  const lines = allCombatLines(d, data);
  const pen = d.currentWoundPenalty + d.currentFatiguePenalty + d.currentDiseasePenalty;
  if (!atTable)
    return (
      <Card title="Combat totals">
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>With</th>
                <th className="num">Init</th>
                <th className="num">Attack</th>
                <th className="num">Defense</th>
                <th className="num">Damage</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.name}</td>
                  <td className="num">{signed(l.init)}</td>
                  <td className="num">{l.atk === null ? '—' : signed(l.atk)}</td>
                  <td className="num">{signed(l.dfn)}</td>
                  <td className="num">{l.dam === null ? '—' : signed(l.dam)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Soak {signed(d.soak)}.{pen ? ` The totals include the penalties for wounds, Fatigue and disease (${pen}).` : ''} Damage on a hit: Attack Advantage + the Damage above.
        </p>
        <RollAtTable sagaId={c.sagaId} who={c.id} where="combat" what="Initiative, Attack and Defense are rolled, mounted or exerted, alone or as a group," />
      </Card>
    );
  const baseLine = lines[Math.min(lineIdx, lines.length - 1)];
  const ride = Math.min(3, d.abilities.find((a) => a.abilityId === 'ride')?.total ?? 0);
  const unarmed = baseLine?.ability === 'Brawl' && /fist|kick|dodge|unarmed|sap/i.test(baseLine.name);
  const line = baseLine && {
    ...baseLine,
    atk: baseLine.atk === null ? null : baseLine.atk + (mounted ? ride : 0) + (exertOn === 'atk' ? baseLine.abilityScore : 0) + (scuffle && !unarmed ? -3 : 0),
    dfn: baseLine.dfn + (mounted ? ride : 0) + (exertOn === 'dfn' ? baseLine.abilityScore : 0),
  };
  const push = (s: string) => setMsg((m) => [s, ...m].slice(0, 20));
  const roll = (label: string, bonus: number, botch = 1) => {
    const r = stressDie(botch);
    push(`${label}: ${signed(bonus)} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : bonus + r.value}`);
    setLastRoll(botch ? { id: Date.now(), label, total: bonus + r.value, faces: r.botches ? r.botchFaces : undefined } : null);
  };
  return (
    <Card title={`${c.name || 'Their'} combat rolls`} tour="combat-rolls">
      {pen !== 0 && <p className="small muted" style={{ marginTop: 0 }}>The totals include {c.name ? `${c.name}’s` : 'their'} penalties for wounds, Fatigue and disease: {pen}.</p>}
      {lines.length > 0 && line && (
        <div className="row">
          <select value={lineIdx} onChange={(e) => setLineIdx(Number(e.target.value))} aria-label="Weapon">
            {lines.map((l, i) => (
              <option key={i} value={i}>
                {l.name}
              </option>
            ))}
          </select>
          <button onClick={() => roll(`${line.name} Initiative`, line.init)}>Initiative {signed(line.init)}</button>
          {line.atk !== null && <button onClick={() => roll(`${line.name} Attack`, line.atk!)}>Attack {signed(line.atk)}</button>}
          <button onClick={() => roll(`${line.name} Defense`, line.dfn)}>Defense {signed(line.dfn)}</button>
          <button onClick={() => roll('Soak (fixed)', d.soak, 0)} title="Soak is not rolled; this just logs it">
            Soak {signed(d.soak)}
          </button>
          {line.dam !== null && <span className="small">Damage on a hit: Attack Advantage + {signed(scuffle ? d.characteristics.Str.value : line.dam)}</span>}
        </div>
      )}
      {lastRoll && <AfterRoll key={lastRoll.id} c={c} d={d} total={lastRoll.total} botchFaces={lastRoll.faces} what={lastRoll.label.replace(/^.* (Initiative|Attack|Defense)$/, '$1')} onChange={(x) => push(x.text)} />}
      {msg.length > 0 && (
        <div className="stack small" style={{ gap: 2, marginTop: 6 }} aria-live="polite">
          {msg.map((m, i) => (
            <div key={i} className={`list-row ${i ? 'muted' : ''}`}>
              {m}
            </div>
          ))}
        </div>
      )}
      {line && (
        <div className="row small" style={{ marginTop: 6 }}>
          <label className="inline" title={`Ride ${ride} (at most +3) to Attack and Defense`}>
            <input type="checkbox" checked={mounted} onChange={(e) => setMounted(e.target.checked)} /> Mounted (+{ride})
          </label>
          <label className="inline" title="Spend a Fatigue level: + your Combat Ability to one attack, or to every defense until your next turn">
            Exert:
            <select value={exertOn} onChange={(e) => setExertOn(e.target.value as 'none' | 'atk' | 'dfn')}>
              <option value="none">no</option>
              <option value="atk">attack (+{line.abilityScore})</option>
              <option value="dfn">defense (+{line.abilityScore})</option>
            </select>
          </label>
          {exertOn !== 'none' && (
            <button className="small ghost" onClick={() => update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + 1)))}>
              Spend the Fatigue level
            </button>
          )}
          <label className="inline" title="Scuffling: −3 to Attack with a real weapon, no weapon Damage; wounds become Fatigue">
            <input type="checkbox" checked={scuffle} onChange={(e) => setScuffle(e.target.checked)} /> Scuffle
          </label>
          {scuffle && (
            <span className="muted">
              A scuffling blow: {Object.entries(SCUFFLE_EFFECTS).map(([k, v]) => `${k} → ${v}`).join('; ')}.
            </span>
          )}
        </div>
      )}
      <p className="small muted">Attack Advantage = Attack Total − Defense Total. Damage Total = Attack Advantage + weapon damage + Strength; subtract target Soak and look up the wound.</p>
    </Card>
  );
}

/**
 * Fighting as a group (DE, Groups): up to six fighters with Combat Totals within five points use the
 * vanguard's statistics; a trained group adds the others' Combat Abilities, up to three times the
 * leader's Leadership, to Attack or Defense. This character is the vanguard.
 */
export function GroupCombat({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga } = ed;
  const others = useSagaCharacters(c?.sagaId);
  const covs = useSagaCovenants(c?.sagaId);
  const [ids, setIds] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState('');
  const [trained, setTrained] = useState(true);
  const [onAtk, setOnAtk] = useState(true);
  const [blows, setBlows] = useState(0);
  if (!c || !d || !saga) return null;
  // those who fight beside the vanguard: their own side, the players' people or the vanguard's own covenant of the Tribunal
  const groups = groupPeople(others.filter((o) => o.creation.finalized && !o.wounds.dead), covs);
  const mine = groups.findIndex((g) => g.people.some((o) => o.id === c.id));
  const side = mine <= 1 ? groups.slice(0, 2).filter((g) => !g.label.includes('Tribunal')) : [groups[mine]];
  const pool = side.flatMap((g) => g.people).filter((o) => o.id !== c.id && o.type !== 'magus');
  const lead = (x: typeof d) => x.abilities.find((a) => a.abilityId === 'leadership')?.total ?? 0;
  const derived = ids.map((id) => pool.find((o) => o.id === id)).filter((o): o is NonNullable<typeof o> => !!o).map((o) => ({ c: o, d: deriveCharacter(o, data, saga.houseRules) }));
  const all = [{ c, d }, ...derived];
  const members: GroupMember[] = all.map((m) => ({ name: m.c.name || 'Unnamed', line: allCombatLines(m.d, data)[0], leadership: lead(m.d) })).filter((m) => !!m.line);
  if (!pool.length) return null;
  // the leader defaults to whoever has the best Leadership
  const picked = all.findIndex((m) => m.c.id === leaderId);
  const leaderIdx = picked >= 0 ? picked : members.reduce((best, m, i) => (m.leadership > (members[best]?.leadership ?? -1) ? i : best), 0);
  const g = members.length > 1 ? groupCombat(members, 0, leaderIdx, trained) : null;
  const v = members[0]?.line;
  const split = distributeBlows(blows, members.length);
  return (
    <Card title="Fighting as a group">
      <p className="small muted" style={{ marginTop: 0 }}>
        Optional (DE, Groups): {c.name || 'this character'} is the vanguard, whose statistics the group uses. Each member strikes once, so a hit lands as many blows as the group has
        members.
      </p>
      <div className="row">
        {pool.map((o) => (
          <label key={o.id} className="inline small">
            <input type="checkbox" checked={ids.includes(o.id)} disabled={!ids.includes(o.id) && ids.length >= 5} onChange={(e) => setIds((l) => (e.target.checked ? [...l, o.id] : l.filter((x) => x !== o.id)))} />{' '}
            {o.name || 'Unnamed'}
          </label>
        ))}
      </div>
      {g && v && (
        <>
          <div className="row" style={{ marginTop: 6 }}>
            <label className="inline small" title="They spent a season improving combat skills together">
              <input type="checkbox" checked={trained} onChange={(e) => setTrained(e.target.checked)} /> Trained together
            </label>
            <Field label="Leader">
              <select value={all[leaderIdx].c.id} onChange={(e) => setLeaderId(e.target.value)}>
                {all.map((m, i) => (
                  <option key={m.c.id} value={m.c.id}>
                    {m.c.name || 'Unnamed'} (Leadership {members[i]?.leadership ?? 0})
                  </option>
                ))}
              </select>
            </Field>
            <label className="inline small">
              <input type="radio" checked={onAtk} onChange={() => setOnAtk(true)} /> bonus to Attack
            </label>
            <label className="inline small">
              <input type="radio" checked={!onAtk} onChange={() => setOnAtk(false)} /> to Defense
            </label>
          </div>
          <div className="row">
            <div className="stat">
              <span className="v">{signed(v.init)}</span>
              <span className="l">Initiative</span>
            </div>
            <div className="stat">
              <span className="v">{v.atk === null ? '—' : signed(v.atk + (onAtk ? g.bonus : 0))}</span>
              <span className="l">Attack</span>
            </div>
            <div className="stat">
              <span className="v">{signed(v.dfn + (onAtk ? 0 : g.bonus))}</span>
              <span className="l">Defense</span>
            </div>
            <div className="stat">
              <span className="v">{signed(d.soak)}</span>
              <span className="l">Soak (vanguard)</span>
            </div>
            <div className="stat">
              <span className="v">{g.trained ? `+${g.bonus}` : '—'}</span>
              <span className="l">Group bonus</span>
            </div>
          </div>
          {[...g.notes, ...(g.outOfRange.length ? [`Totals more than five apart (${g.outOfRange.join(', ')}): they cannot form one group.`] : [])].map((n) => (
            <div key={n} className="small warn-text">
              {n}
            </div>
          ))}
          <div className="row small" style={{ marginTop: 6 }}>
            <Field label="Blows taken by the group">
              <Stepper value={blows} min={0} max={30} width={36} onChange={setBlows} />
            </Field>
            {blows > 0 && <span>{all.map((m, i) => `${m.c.name || 'Unnamed'} ${split[i]}`).join(', ')} (vanguard first; work out each wound against that member&apos;s Soak).</span>}
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Wounds on the vanguard lower the group&apos;s totals; others give their full bonus until incapacitated. If the vanguard or leader falls, the group splits. Group exertion: everyone
            spends a Fatigue level for + the vanguard&apos;s Combat Ability ({v.abilityScore}).
          </p>
        </>
      )}
    </Card>
  );
}

/**
 * What the covenant's Immunity covers for those who live there, and the Flaws it holds off: a Flaw
 * paired with it keeps its Virtue points and does nothing in the aura, and is back away from the
 * covenant (Covenants ch.2).
 */
function CovenantImmunity({ ed }: { ed: CharEditor }) {
  const { c, data, ctx, update } = ed;
  const list = immunities(ctx.covenant);
  if (!c) return null;
  const st = immunityFlawState(ctx.covenant, c);
  if (!list.length && !st.stale.length) return null;
  const im = immunityFlaw(ctx.covenant);
  const name = (id: string) => data.vfById.get(id)?.name ?? id;
  const who = c.name || 'this character';
  const what = (i: (typeof list)[number]) => (i.kind === 'flaw' ? `the ${name(i.value)} Flaw` : i.kind === 'disease' ? (i.value === 'all' ? 'all disease' : i.value) : i.value);
  const away = !!c.awayFromCovenant || c.auraTime === 'away';
  return (
    <div className="stack small" style={{ gap: 4 }}>
      {!!list.length && (
        <p style={{ margin: 0 }}>
          <b>Within {ctx.covenant?.name || 'the covenant'}&apos;s aura</b>, the Immunity Boon makes everyone immune to {list.map(what).join(', ')}. It is held off, not cured: it returns
          when they leave.
        </p>
      )}
      {st.paired.map((v) => (
        <div key={v.uid} className="row">
          <span>
            {who}&apos;s {name(v.defId)} is paired with the Immunity: {away ? <b>back while they are away</b> : 'held off here'}; its Virtue points stay theirs.
          </span>
          <label className="row" style={{ gap: 4 }}>
            <input type="checkbox" checked={!!c.awayFromCovenant} disabled={c.auraTime === 'away'} onChange={(e) => update((x) => void (x.awayFromCovenant = e.target.checked || undefined))} />
            away from the covenant now{c.auraTime === 'away' ? ' (lives away, on the Seasons tab)' : ''}
          </label>
        </div>
      ))}
      {im &&
        st.unpaired.map((v) => (
          <div key={v.uid} className="row">
            <span>
              {who} has {name(v.defId)}, the Flaw the Immunity holds off, but not paired with it.
            </span>
            <button className="small" onClick={() => update((x) => void (x.virtues.find((y) => y.uid === v.uid)!.heldBy = im.hb.uid))}>
              Pair it with the Immunity
            </button>
          </div>
        ))}
      {st.stale.map((v) => (
        <div key={v.uid} className="row">
          <span className="warn-text">
            {name(v.defId)} was paired with an Immunity {ctx.covenant ? `${ctx.covenant.name || 'the covenant'} no longer has` : 'of a covenant they no longer belong to'}: it is held off still.
          </span>
          <button className="small" onClick={() => update((x) => void delete x.virtues.find((y) => y.uid === v.uid)!.heldBy)}>
            Unpair it
          </button>
        </div>
      ))}
    </div>
  );
}

