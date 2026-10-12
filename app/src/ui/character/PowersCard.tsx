import { useMemo, useState } from 'react';
import { ART_NAMES, type PowerKind, type SpellDef } from '../../data';
import { POWER_KINDS, POWER_KIND_ORDER, masteryPools, powerCost, powerSpending, powerStats } from '../../engine/character/powers';
import type { CharPower } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Markdown, Meter, SearchInput, Stepper, signed } from '../kit';
import type { CharEditor } from './useChar';

/**
 * The powers bought with Greater/Lesser/Personal/Ritual Power and Heroes' Birthright: each kind
 * has a pool of levels, spent on powers designed like Hermetic spells (or copied from one). A magic
 * character (RoP: Magic) pays Might for them, takes its Penetration from Might, and can spend
 * mastery points on them.
 */
export default function PowersCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [shown, setShown] = useState<string | null>(null);
  if (!c || !d) return null;
  // a character with Might pays for its powers in Might points, not Fatigue (RoP: Magic, Magic Powers)
  const mightBased = !!d.magicChar;
  const spent = powerSpending(c.powers, mightBased);
  const kinds = POWER_KIND_ORDER.filter((k) => (d.powerBudgets[k] ?? 0) > 0 || (spent[k] ?? 0) > 0);
  if (!kinds.length) return null;
  const qik = d.characteristics.Qik.value;
  const might = d.magicChar?.might ?? 0;
  const penetrationScore = d.abilities.find((a) => a.abilityId === 'penetration')?.total ?? 0;
  const masteryXp = c.creature?.magicCharacter?.masteryXp ?? 0;
  const mp = d.magicChar ? masteryPools(c.powers, d.powerBudgets, d.magicChar.mastery, masteryXp) : null;
  const edit = (uidOf: string, fn: (p: CharPower) => void) => update((x) => void fn((x.powers ?? []).find((p) => p.uid === uidOf)!));
  const setMastery = (uidOf: string, key: 'cost' | 'init' | 'level', v: number) =>
    edit(uidOf, (x) => {
      x.mastery = { ...x.mastery, [key]: v || undefined };
      if (!x.mastery.cost && !x.mastery.init && !x.mastery.level) delete x.mastery;
    });
  return (
    <Card title="Supernatural powers" className="accent">
      <p className="small muted" style={{ marginTop: 0 }}>
        Each power is designed like a Hermetic spell.{' '}
        {mightBased
          ? "Its Penetration is Might − 5 × its Might cost + Penetration (RoP: Magic). Effects of level 50 or more must be Ritual Powers."
          : "Levels may also buy Penetration one for one (not for Heroes' Birthright)."}{' '}
        Pick a spell from the list to copy its level, or add a power and describe it yourself.
      </p>
      {mp && (mp.available !== 0 || mp.spent !== 0) && (
        <div style={{ marginBottom: 10 }}>
          <Meter
            label={`Mastery points: ${mp.spent} of ${mp.available} (${[
              mp.general ? `Improved Powers and Reduced Power ${mp.general}` : '',
              ...Object.entries(mp.leftover).map(([k, n]) => `unused ${POWER_KINDS[k as PowerKind].label} levels ${n}`),
            ]
              .filter(Boolean)
              .join(', ')})`}
            value={mp.spent}
            max={Math.max(0, mp.available)}
          />
          <div className="row small">
            <span className="muted">
              Each point takes 1 off a power&apos;s Might cost (Personal, Lesser and Greater down to 0; Ritual to half its magnitude; never a Focus Power&apos;s), adds 1 to its
              Initiative, or adds 5 to a Focus Power&apos;s highest level. Unused levels count only for powers of their own kind (Greater also for Lesser).
            </span>
            <label className="inline" title="Mastery points taken as experience, 5 each, in Concentration, Finesse or Penetration">
              as experience
              <Stepper
                value={masteryXp}
                min={0}
                max={99}
                width={34}
                onChange={(v) => update((x) => void (x.creature!.magicCharacter!.masteryXp = v || undefined))}
              />
              <span className="muted">= {5 * masteryXp} xp in Concentration, Finesse or Penetration</span>
            </label>
          </div>
        </div>
      )}
      {kinds.map((kind) => {
        const info = POWER_KINDS[kind];
        const budget = d.powerBudgets[kind] ?? 0;
        const used = spent[kind] ?? 0;
        const powers = (c.powers ?? []).filter((p) => p.kind === kind);
        const usesMastery = mightBased && kind !== 'holy' && kind !== 'birthright';
        return (
          <div key={kind} style={{ marginBottom: 14 }}>
            <div className="row">
              <h4 style={{ margin: 0 }}>{info.label}</h4>
              <span className="small muted">{info.rule}</span>
            </div>
            <Meter label={`${used} of ${budget} levels`} value={used} max={budget} />
            {powers.length > 0 && (
              <table className="compact">
                <thead>
                  <tr>
                    <th>Power</th>
                    <th className="num">Level</th>
                    {info.penetration && <th className="num">Penetration</th>}
                    <th className="num">Mag.</th>
                    {kind !== 'birthright' && <th className="num">Init</th>}
                    {kind !== 'birthright' && <th className="num">{mightBased || kind === 'holy' ? 'Might' : 'Fatigue'}</th>}
                    {kind === 'ritual' && (
                      <th className="num" title={mightBased ? 'Each use lowers the Might Score by its Might cost, or spends that many Confidence Points (RoP: Magic, Ritual Power)' : '1 Confidence Point per magnitude'}>
                        {mightBased ? 'Might Score or Conf.' : 'Confidence'}
                      </th>
                    )}
                    {usesMastery && <th title="Mastery points: Might cost taken off, Initiative added (and a Focus Power's level beyond Might, 5 each)">Mastery</th>}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {powers.map((p) => {
                    const st = powerStats(p, qik, mightBased);
                    const spell = p.spellId ? ed.data.spellById.get(p.spellId) : undefined;
                    const tooHigh = info.maxLevel !== undefined && p.level > info.maxLevel;
                    const pen = might - 5 * (st.mightCost ?? 0) + penetrationScore;
                    return (
                      <tr key={p.uid}>
                        <td>
                          <input value={p.name} placeholder="Name the power" aria-label="Power name" onChange={(e) => edit(p.uid, (x) => void (x.name = e.target.value))} />
                          {spell && (
                            <div className="small muted">
                              as{' '}
                              <span className="clickable" title="Show what the spell does" onClick={() => setShown(shown === p.uid ? null : p.uid)}>
                                {shown === p.uid ? '▾' : '▸'} {spell.name}
                              </span>{' '}
                              ({ART_NAMES[spell.technique]} {ART_NAMES[spell.form]} {spell.level}; {spell.range}/{spell.duration}/{spell.target})
                            </div>
                          )}
                          {spell && shown === p.uid && <SpellText spell={spell} />}
                          <input className="small" value={p.notes ?? ''} placeholder="effect, limits, realm…" aria-label="Power notes" onChange={(e) => edit(p.uid, (x) => void (x.notes = e.target.value || undefined))} />
                        </td>
                        <td className={`num ${tooHigh ? 'bad-text' : ''}`}>
                          <Stepper value={p.level} min={1} max={info.maxLevel ?? 200} onChange={(v) => edit(p.uid, (x) => void (x.level = v))} title={tooHigh ? `No more than level ${info.maxLevel}` : 'Level'} />
                        </td>
                        {info.penetration && (
                          <td className="num">
                            {mightBased ? (
                              <span title={`Might ${might} − 5 × ${st.mightCost ?? 0} + Penetration ${penetrationScore}`}>{signed(pen)}</span>
                            ) : (
                              <Stepper value={p.penetration} min={0} onChange={(v) => edit(p.uid, (x) => void (x.penetration = v))} title="Penetration (costs levels one for one)" />
                            )}
                          </td>
                        )}
                        <td className="num">{st.magnitude}</td>
                        {kind !== 'birthright' && <td className="num">{signed(st.init)}</td>}
                        {kind !== 'birthright' && <td className="num">{st.mightCost ?? st.fatigue}</td>}
                        {kind === 'ritual' && <td className="num">{mightBased ? st.mightCost : st.confidence}</td>}
                        {usesMastery && (
                          <td className="small">
                            {kind !== 'focus' && (
                              <label className="inline" title="Might cost taken off (a negative number raises it, for Reduced Power)">
                                cost −
                                <Stepper value={p.mastery?.cost ?? 0} min={-20} max={20} width={30} onChange={(v) => setMastery(p.uid, 'cost', v)} />
                              </label>
                            )}
                            <label className="inline" title="Initiative added (negative for Reduced Power)">
                              Init +
                              <Stepper value={p.mastery?.init ?? 0} min={-20} max={40} width={30} onChange={(v) => setMastery(p.uid, 'init', v)} />
                            </label>
                            {kind === 'focus' && (
                              <label className="inline" title="Each point lets the Focus Power reach 5 levels beyond the Might Score">
                                +5 lv ×
                                <Stepper value={p.mastery?.level ?? 0} min={0} max={40} width={30} onChange={(v) => setMastery(p.uid, 'level', v)} />
                              </label>
                            )}
                          </td>
                        )}
                        <td>
                          <span className="small muted">{powerCost(p, mightBased)} lv</span>{' '}
                          <button className="small ghost" title="Remove" onClick={() => update((x) => void (x.powers = (x.powers ?? []).filter((y) => y.uid !== p.uid)))}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <AddPower ed={ed} kind={kind} left={budget - used} />
          </div>
        );
      })}
    </Card>
  );
}

/** What a spell does, as the book gives it, with its design line. */
function SpellText({ spell }: { spell: SpellDef }) {
  return (
    <div className="small" style={{ borderLeft: '2px solid var(--line)', paddingLeft: 8, margin: '4px 0' }}>
      <Markdown text={spell.text || '_No description in the book._'} />
      {spell.design && <div className="muted">({spell.design})</div>}
    </div>
  );
}

function AddPower({ ed, kind, left }: { ed: CharEditor; kind: PowerKind; left: number }) {
  const { data, update } = ed;
  const info = POWER_KINDS[kind];
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [anyRange, setAnyRange] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const cap = Math.min(left, info.maxLevel ?? Infinity);
  const spells = useMemo(() => {
    if (!open) return [];
    const qq = q.trim().toLowerCase();
    return data.spells
      .filter((s): s is SpellDef & { level: number } => s.level !== null && !s.general && s.level <= cap)
      .filter((s) => kind !== 'personal' || anyRange || /personal/i.test(s.range) || /constant|sun|moon|year|ring/i.test(s.duration))
      .filter((s) => kind === 'ritual' || !s.ritual || anyRange)
      .filter((s) => !qq || `${s.name} ${s.technique}${s.form} ${ART_NAMES[s.technique]} ${ART_NAMES[s.form]} ${s.text}`.toLowerCase().includes(qq))
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
      .slice(0, 40);
  }, [open, q, data.spells, cap, kind, anyRange]);
  const add = (p: Partial<CharPower>) =>
    update((x) => void (x.powers ??= []).push({ uid: uid(), name: '', kind, level: Math.max(1, Math.min(cap, 5)), penetration: 0, ...p }));
  return (
    <div style={{ marginTop: 6 }}>
      <div className="row">
        <button className="small" disabled={cap < 1} onClick={() => add({})}>
          + Power
        </button>
        <button className="small" disabled={cap < 1} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close spell list' : 'From a spell…'}
        </button>
        <span className="small muted">{cap >= 1 ? `up to level ${cap}` : 'no levels left'}</span>
      </div>
      {open && (
        <div className="stack" style={{ marginTop: 6 }}>
          <div className="row">
            <SearchInput value={q} onChange={setQ} placeholder={`Spells of level ${cap} or less: names, Arts or what they do`} />
            <label className="inline small">
              <input type="checkbox" checked={anyRange} onChange={(e) => setAnyRange(e.target.checked)} /> {kind === 'personal' ? 'any Range and Duration' : 'include Rituals'}
            </label>
          </div>
          <div className="small muted">Click a spell&apos;s name to read what it does.</div>
          {spells.map((s) => (
            <div key={s.id}>
              <div className="row small">
                <button className="small" onClick={() => { add({ name: s.name, level: s.level, spellId: s.id }); setOpen(false); setQ(''); setShown(null); }}>
                  + {s.level}
                </button>
                <span className="clickable" onClick={() => setShown(shown === s.id ? null : s.id)} title="Show what the spell does">
                  {shown === s.id ? '▾' : '▸'} <b>{s.name}</b>
                </span>
                <span className="muted">
                  ({s.technique}{s.form}; {s.range}/{s.duration}/{s.target})
                </span>
              </div>
              {shown === s.id && <SpellText spell={s} />}
            </div>
          ))}
          {!spells.length && <div className="small muted">No spells match.</div>}
        </div>
      )}
    </div>
  );
}
