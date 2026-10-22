import { useState } from 'react';
import { RECOVERY, SCUFFLE_EFFECTS, allCombatLines, distributeBlows, groupCombat, woundFromDamage, type GroupMember } from '../../../engine/combat';
import { deriveCharacter } from '../../../engine/character/derive';
import { useSagaCharacters } from '../../../store/hooks';
import { describeStress, stressDie } from '../../../engine/dice';
import type { WoundState } from '../../../engine/types';
import { Card, Field, Stepper, signed } from '../../kit';
import EquipmentEditor from '../EquipmentEditor';
import { IllnessCard } from './IllnessCard';
import type { CharEditor } from '../useChar';

const WOUND_KEYS: { key: keyof Omit<WoundState, 'dead'>; label: string; pen: number }[] = [
  { key: 'light', label: 'Light', pen: -1 },
  { key: 'medium', label: 'Medium', pen: -3 },
  { key: 'heavy', label: 'Heavy', pen: -5 },
  { key: 'incapacitating', label: 'Incapacitated', pen: 0 },
];

const FATIGUE_RECOVERY = ['—', '2 minutes', '10 minutes', '30 minutes', '1 hour', '2 hours'];

export default function CombatTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update } = ed;
  const [damage, setDamage] = useState(0);
  const [msg, setMsg] = useState<string[]>([]);
  const [medic, setMedic] = useState(0);
  const [aid, setAid] = useState(0);
  // a familiar's bronze cord adds to healing rolls (DE, The Three Cords)
  const bronze = c?.familiar?.bronze ?? 0;
  const [lineIdx, setLineIdx] = useState(0);
  // DE Combat Options: mounted (+Ride, up to 3, to Attack and Defense), exertion (a Fatigue level for
  // +Combat Ability to one attack or the round's defense), scuffling (−3 to attack with a real weapon, no weapon damage)
  const [mounted, setMounted] = useState(false);
  const [exertOn, setExertOn] = useState<'none' | 'atk' | 'dfn'>('none');
  const [scuffle, setScuffle] = useState(false);
  if (!c || !d) return null;
  const lines = allCombatLines(d, data);
  const baseLine = lines[Math.min(lineIdx, lines.length - 1)];
  const ride = Math.min(3, d.abilities.find((a) => a.abilityId === 'ride')?.total ?? 0);
  const unarmed = baseLine?.ability === 'Brawl' && /fist|kick|dodge|unarmed|sap/i.test(baseLine.name);
  const line = baseLine && {
    ...baseLine,
    atk: baseLine.atk === null ? null : baseLine.atk + (mounted ? ride : 0) + (exertOn === 'atk' ? baseLine.abilityScore : 0) + (scuffle && !unarmed ? -3 : 0),
    dfn: baseLine.dfn + (mounted ? ride : 0) + (exertOn === 'dfn' ? baseLine.abilityScore : 0),
  };
  const push = (s: string) => setMsg((m) => [s, ...m].slice(0, 20));
  const lost = Math.min(5, c.fatigueLost + c.longTermFatigueLost);

  const applyDamage = () => {
    const excess = damage - d.soak;
    const w = woundFromDamage(d, excess);
    if (w === 'none') {
      push(`Damage ${damage} vs Soak ${d.soak}: no wound.`);
      return;
    }
    push(`Damage ${damage} − Soak ${d.soak} = ${excess}: ${w} wound.`);
    update((x) => {
      if (w === 'dead') x.wounds.dead = true;
      else x.wounds[w] += 1;
    });
  };

  const roll = (label: string, bonus: number, botch = 1) => {
    const r = stressDie(botch);
    push(`${label}: ${signed(bonus)} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : bonus + r.value}`);
  };

  // a disease's penalty hinders the healing of wounds (Art & Academe: "and vice versa")
  const sick = d.currentDiseasePenalty;
  const recover = (key: 'light' | 'medium' | 'heavy') => {
    const r = stressDie(1);
    const total = r.botches ? 0 : d.characteristics.Sta.value + medic + aid + bronze + sick + r.value;
    const rec = RECOVERY[key];
    let text: string;
    if (total >= rec.improve) {
      text = 'improves one level';
      update((x) => {
        x.wounds[key] -= 1;
        if (key === 'medium') x.wounds.light += 1;
        if (key === 'heavy') x.wounds.medium += 1;
      });
    } else if (total >= rec.stable) text = 'stable (+3 to future rolls for this wound)';
    else {
      text = 'worsens one level (infection)';
      update((x) => {
        x.wounds[key] -= 1;
        if (key === 'light') x.wounds.medium += 1;
        if (key === 'medium') x.wounds.heavy += 1;
        if (key === 'heavy') x.wounds.incapacitating += 1;
      });
    }
    push(`Recovery (${key}, ${rec.interval}): Sta ${d.characteristics.Sta.value} + medic ${medic} + aid ${aid}${bronze ? ` + bronze cord ${bronze}` : ''}${sick ? ` − disease ${-sick}` : ''} + ${describeStress(r)} = ${total} vs ${rec.stable}/${rec.improve}: ${text}.`);
  };

  const recoverIncap = () => {
    const r = stressDie(1);
    const total = r.botches ? 0 : d.characteristics.Sta.value + medic + aid + bronze + sick + r.value;
    let text: string;
    if (total <= 0) {
      text = 'the character dies';
      update((x) => void (x.wounds.dead = true));
    } else if (total >= 9) {
      text = 'Incapacitating wounds become Heavy';
      update((x) => {
        x.wounds.heavy += x.wounds.incapacitating;
        x.wounds.incapacitating = 0;
      });
    } else text = 'condition worsens: cumulative −1 to later rolls';
    push(`Incapacitation recovery: ${total}: ${text}.`);
  };

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Card title="Wounds" className="accent">
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
                  return (
                    <tr key={w.key}>
                      <td>{w.label}</td>
                      <td>{range.join('–')}</td>
                      <td className="num">{w.pen || '—'}</td>
                      <td>
                        <Stepper value={c.wounds[w.key]} min={0} width={36} onChange={(v) => update((x) => void (x.wounds[w.key] = v))} />
                      </td>
                      <td>
                        {w.key === 'incapacitating' ? (
                          <button className="small" disabled={!c.wounds.incapacitating} onClick={recoverIncap} title="Twice daily; 0 or less dies, 9+ becomes Heavy">
                            Roll
                          </button>
                        ) : (
                          <button className="small" disabled={!c.wounds[w.key]} onClick={() => recover(w.key as 'light' | 'medium' | 'heavy')} title={`${RECOVERY[w.key as 'light'].interval}; stable ${RECOVERY[w.key as 'light'].stable}, improve ${RECOVERY[w.key as 'light'].improve}`}>
                            Roll ({RECOVERY[w.key as 'light'].interval.toLowerCase()})
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td>Dead</td>
                  <td>{d.woundRanges.dead}+</td>
                  <td />
                  <td>
                    <input type="checkbox" checked={!!c.wounds.dead} onChange={(e) => update((x) => void (x.wounds.dead = e.target.checked))} />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="Damage total taken">
              <Stepper value={damage} min={0} width={50} onChange={setDamage} />
            </Field>
            <button onClick={applyDamage}>Apply damage</button>
            <Field label="Medic's Chirurgy / Medicine">
              <Stepper value={medic} min={0} width={36} onChange={setMedic} />
            </Field>
            <Field label="Magical aid">
              <Stepper value={aid} min={0} width={36} onChange={setAid} />
            </Field>
          </div>
          <p className="small muted">Recovery Total = Stamina + medic's Ability + magical aid{bronze ? ` + bronze cord ${bronze}` : ''}{sick ? ` − the Disease Penalty ${-sick}` : ''} + stress die. Wound penalties do not apply (DE p.405).</p>
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
          <p className="small muted">Short-term Fatigue recovers with rest (times above, doubled if active). Long-term Fatigue (Ritual spells, forced march) needs a good night's sleep.</p>
        </Card>
      </div>

      <IllnessCard ed={ed} />

      <Card title="Combat rolls">
        {lines.length > 0 && line && (
          <div className="row">
            <select value={lineIdx} onChange={(e) => setLineIdx(Number(e.target.value))}>
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
        {msg.map((m, i) => (
          <div key={i} className="small list-row">
            {m}
          </div>
        ))}
      </Card>

      <GroupCombat ed={ed} />

      <EquipmentEditor ed={ed} />
    </div>
  );
}

/**
 * Fighting as a group (DE, Groups): up to six fighters with Combat Totals within five points use the
 * vanguard's statistics; a trained group adds the others' Combat Abilities, up to three times the
 * leader's Leadership, to Attack or Defense. This character is the vanguard.
 */
function GroupCombat({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga } = ed;
  const others = useSagaCharacters(c?.sagaId);
  const [ids, setIds] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState('');
  const [trained, setTrained] = useState(true);
  const [onAtk, setOnAtk] = useState(true);
  const [blows, setBlows] = useState(0);
  if (!c || !d || !saga) return null;
  const pool = others.filter((o) => o.id !== c.id && o.type !== 'magus');
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
