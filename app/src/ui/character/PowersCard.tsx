import { useMemo, useState } from 'react';
import { ART_NAMES, FORMS, type PowerKind, type SpellDef } from '../../data';
import { COMMON_MAGIC_POWERS, ELEMENTAL_FORMS, type CommonPower } from '../../data/commonPowers';
import { DETERIORATING_KINDS, POWER_KINDS, POWER_KIND_ORDER, VARIABLE_KINDS, masteryPools, powerCost, powerSpending, powerStats, varianceLabel, variedLevel, type VarianceInputs } from '../../engine/character/powers';
import type { CharPower, VarianceBy } from '../../engine/types';
import { MASTERY_XP_ABILITIES, setMasteryXp } from '../../engine/character/factory';
import { uid } from '../../util/id';
import { BookBadge, Card, Markdown, Meter, SearchInput, Stepper, signed, HowItWorks } from '../kit';
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
  // Variable and Deteriorating Power: which power each applies to, and what it changes with (RoP: Magic)
  const variance: VarianceInputs = {
    age: c.age, might: d.might?.score ?? 0, mightSpent: c.creature?.poolSpent ?? 0, warping: d.warpingScore,
    ability: (id) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.score), 0),
  };
  const variables = c.virtues.filter((v) => v.defId === 'variable-power');
  const deteriorating = c.virtues.filter((v) => v.defId === 'deteriorating-power-flaw');
  const unassigned = [
    ...variables.filter((v) => !(c.powers ?? []).some((p) => p.variable?.virtueUid === v.uid)).map(() => 'Variable Power'),
    ...deteriorating.filter((v) => !(c.powers ?? []).some((p) => p.deteriorating?.virtueUid === v.uid)).map(() => 'Deteriorating Power'),
  ];
  // only Reduced Power makes a power cost more or act slower
  const reduced = !!c.creature?.magicCharacter?.qualities.some((q) => q.id === 'reduced-power-inferiority');
  // a creature whose Might is of the Form the covenant's aura is aligned with spends a point less on a Power there (RoP: Magic)
  const al = ed.ctx.aura.realm === 'Magic' ? ed.ctx.aura.aligned : undefined;
  const alignedHere = !!al && !!d.might?.form && (d.might.form === al || d.might.form === ART_NAMES[al]);
  const edit = (uidOf: string, fn: (p: CharPower) => void) => update((x) => void fn((x.powers ?? []).find((p) => p.uid === uidOf)!));
  const setMastery = (uidOf: string, key: 'cost' | 'init' | 'level', v: number) =>
    edit(uidOf, (x) => {
      x.mastery = { ...x.mastery, [key]: v || undefined };
      if (!x.mastery.cost && !x.mastery.init && !x.mastery.level) delete x.mastery;
    });
  const xpPoints = (id: string) => (c.abilities.find((a) => a.abilityId === id && !a.param)?.xp['pool:mastery'] ?? 0) / 5;
  return (
    <Card title="Supernatural powers" className="accent" tour="powers">
      <p className="small muted" style={{ marginTop: 0 }}>
        Each power is designed like a Hermetic spell.{' '}
        {mightBased
          ? 'Its Penetration is Might − 5 × its Might cost + Penetration (RoP: Magic). Effects of level 50 or more must be Ritual Powers.'
          : "Levels may also buy Penetration one for one (not for Heroes' Birthright)."}{' '}
        Pick a spell from the list to copy its level, or add a power and describe it yourself.
      </p>
      {unassigned.length > 0 && (
        <div className="small warn-text" style={{ marginBottom: 6 }}>
          {unassigned.length === 1 ? `${unassigned[0]} is` : `${unassigned.join(' and ')} are`} not yet given a power: choose it on the power below.
        </div>
      )}
      {mp && (mp.available !== 0 || mp.spent !== 0) && (
        <div style={{ marginBottom: 10 }}>
          <Meter
            label={`Mastery points: ${mp.spent} of ${mp.available} (${[
              mp.general ? `Improved Powers${reduced ? ' and Reduced Power' : ''} ${mp.general}` : '',
              ...Object.entries(mp.leftover).map(([k, n]) => `unused ${POWER_KINDS[k as PowerKind].label} levels ${n}`),
            ]
              .filter(Boolean)
              .join(', ')})`}
            value={mp.spent}
            max={Math.max(0, mp.available)}
          />
          <HowItWorks summary="Mastery points lower a power’s Might cost, raise its Initiative, or become experience.">
            Each point lowers one power&apos;s Might cost by 1 (Personal, Lesser and Greater down to 0; Ritual to half its magnitude; never a Focus Power&apos;s), and so raises its
            Penetration by 5; or adds 1 to its Initiative; or lets a Focus Power reach 5 levels beyond Might. Points can also become 5 experience points each in Penetration,
            which helps every power. Unused levels count only for powers of their own kind (Greater also for Lesser).
          </HowItWorks>
          <div className="row small">
            <span>As experience (5 xp a point):</span>
            {MASTERY_XP_ABILITIES.map((id) => (
              <label key={id} className="inline">
                {id[0].toUpperCase() + id.slice(1)}
                <Stepper value={xpPoints(id)} min={0} max={99} width={36} onChange={(v) => update((x) => setMasteryXp(x, id, v))} />
              </label>
            ))}
            <span className="muted">Penetration score {penetrationScore}</span>
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
              <span className="small muted">
                {/* a magic character's powers of level 50 or more must be Ritual Powers (RoP: Magic), so the core book's 51–100 band does not apply */}
                {mightBased && (kind === 'greater' || kind === 'personal') ? info.rule.replace('1 Fatigue up to level 50, 2 up to 100.', '1 Fatigue; under level 50 (a magic character’s power of 50 or more must be a Ritual Power).') : info.rule}
              </span>
            </div>
            <Meter label={`${used} of ${budget} levels`} value={used} max={budget} />
            {powers.map((p) => {
              const st = powerStats(p, qik, mightBased);
              const base = mightBased ? powerStats({ ...p, mastery: undefined }, qik, true) : st;
              const spell = p.spellId ? ed.data.spellById.get(p.spellId) : undefined;
              const tooHigh = info.maxLevel !== undefined && p.level > info.maxLevel;
              const pen = might - 5 * (st.mightCost ?? 0) + penetrationScore;
              const stat = (label: string, value: string | number, title?: string) => (
                <span className="small" title={title} style={{ whiteSpace: 'nowrap' }}>
                  <span className="muted">{label}</span> <b>{value}</b>
                </span>
              );
              return (
                <div key={p.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <div className="row">
                    <input style={{ flex: '1 1 160px', minWidth: 120 }} value={p.name} placeholder="Name the power" aria-label="Power name" onChange={(e) => edit(p.uid, (x) => void (x.name = e.target.value))} />
                    <label className={`inline small ${tooHigh ? 'bad-text' : ''}`} title={tooHigh ? `No more than level ${info.maxLevel}` : undefined}>
                      Level
                      <Stepper value={p.level} min={1} max={info.maxLevel ?? 200} width={48} onChange={(v) => edit(p.uid, (x) => void (x.level = v))} />
                    </label>
                    {info.penetration &&
                      (mightBased ? (
                        stat('Pen.', signed(pen), `Might ${might} − 5 × ${st.mightCost ?? 0} + Penetration ${penetrationScore}`)
                      ) : (
                        <label className="inline small" title="Penetration (costs levels one for one)">
                          Pen.
                          <Stepper value={p.penetration} min={0} width={36} onChange={(v) => edit(p.uid, (x) => void (x.penetration = v))} />
                        </label>
                      ))}
                    {stat('Mag.', st.magnitude)}
                    {kind !== 'birthright' && stat('Init', signed(st.init))}
                    {kind !== 'birthright' &&
                      stat(
                        mightBased || kind === 'holy' ? 'Might' : 'Fatigue',
                        alignedHere && (st.mightCost ?? 0) > 0 ? `${st.mightCost} (${st.mightCost! - 1} at the covenant)` : (st.mightCost ?? st.fatigue),
                        alignedHere && (st.mightCost ?? 0) > 0 ? `The covenant's aura is aligned with ${ART_NAMES[al!]}: a point of Might less there` : undefined,
                      )}
                    {kind === 'ritual' &&
                      stat(
                        mightBased ? 'Might Score or Conf.' : 'Conf.',
                        mightBased ? st.mightCost ?? 0 : st.confidence,
                        mightBased ? 'Each use lowers the Might Score by its Might cost, or spends that many Confidence Points (RoP: Magic, Ritual Power)' : '1 Confidence Point per magnitude',
                      )}
                    <span className="small muted">{powerCost(p, mightBased)} lv</span>
                    <button className="small ghost" title="Remove" onClick={() => update((x) => void (x.powers = (x.powers ?? []).filter((y) => y.uid !== p.uid)))}>
                      ✕
                    </button>
                  </div>
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
                  {(variables.length > 0 && VARIABLE_KINDS.includes(kind)) || (deteriorating.length > 0 && DETERIORATING_KINDS.includes(kind)) ? (
                    <VarianceRow ed={ed} p={p} x={variance} variables={variables.map((v) => v.uid)} deteriorating={deteriorating.map((v) => v.uid)} />
                  ) : null}
                  {usesMastery && (
                    <div className="row small">
                      <span className="muted">Mastery:</span>
                      {kind !== 'focus' && (
                        <label className="inline" title={reduced ? 'Might cost taken off (below 0 raises it, for Reduced Power)' : 'Might cost taken off'}>
                          Might cost −
                          <Stepper value={p.mastery?.cost ?? 0} min={reduced ? -20 : 0} max={Math.max(0, (base.mightCost ?? 0) - (kind === 'ritual' ? Math.ceil(base.magnitude / 2) : 0))} width={36} onChange={(v) => setMastery(p.uid, 'cost', v)} />
                          <span className="muted">
                            ({base.mightCost} → {st.mightCost})
                          </span>
                        </label>
                      )}
                      <label className="inline" title={reduced ? 'Initiative added (below 0 lowers it, for Reduced Power)' : 'Initiative added'}>
                        Init +
                        <Stepper value={p.mastery?.init ?? 0} min={reduced ? -20 : 0} max={40} width={36} onChange={(v) => setMastery(p.uid, 'init', v)} />
                      </label>
                      {kind === 'focus' && (
                        <label className="inline" title="Each point lets the Focus Power reach 5 levels beyond the Might Score">
                          5 levels beyond Might ×
                          <Stepper value={p.mastery?.level ?? 0} min={0} max={40} width={36} onChange={(v) => setMastery(p.uid, 'level', v)} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
  // the book's common magic powers of this kind that fit what is left, matched by name or text too
  const common = useMemo(() => {
    if (!open) return [];
    const qq = q.trim().toLowerCase();
    return COMMON_MAGIC_POWERS.filter((p) => p.kind === kind && p.level <= cap && (!qq || `${p.name} ${p.text} ${p.design}`.toLowerCase().includes(qq)));
  }, [open, q, kind, cap]);
  const takeCommon = (p: CommonPower, choice: string) => {
    add({
      name: choice ? p.name.replace(/\([^)]*\)/, choice) : p.name,
      level: p.level,
      // the mastery the book spends comes from a magic character's spare levels
      mastery: ed.d?.magicChar && p.mastery ? { ...p.mastery } : undefined,
      notes: `${p.stats}; ${p.rdt}. ${p.text} (${p.design}; RoP: Magic, Common Magic Powers)`,
    });
    setOpen(false);
    setQ('');
    setShown(null);
  };
  return (
    <div style={{ marginTop: 6 }}>
      <div className="row">
        <button className="small" disabled={cap < 1} onClick={() => add({})}>
          + Power
        </button>
        <button className="small" disabled={cap < 1} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close the list' : 'From the books…'}
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
          {common.length > 0 && (
            <>
              <div className="small">
                <b>Common magic powers</b> <BookBadge book="RoP_M" line={1728} /> <span className="muted">as the book builds them, with its mastery</span>
              </div>
              {common.map((p) => (
                <CommonPowerRow key={p.name} p={p} open={shown === p.name} onToggle={() => setShown(shown === p.name ? null : p.name)} onTake={(choice) => takeCommon(p, choice)} />
              ))}
              <div className="small" style={{ marginTop: 4 }}>
                <b>Hermetic spells</b>
              </div>
            </>
          )}
          <div className="small muted">Click a name to read what it does.</div>
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

/** One of the book's common magic powers: its cost and design, and the Form (or Ability, Virtue, Flaw) it is taken for. */
function CommonPowerRow({ p, open, onToggle, onTake }: { p: CommonPower; open: boolean; onToggle: () => void; onTake: (choice: string) => void }) {
  const options = p.choose === 'Form' ? FORMS.map((f) => ART_NAMES[f]) : p.choose === 'Elemental Form' ? ELEMENTAL_FORMS : undefined;
  const [choice, setChoice] = useState(options?.[0] ?? '');
  return (
    <div>
      <div className="row small" style={{ flexWrap: 'wrap' }}>
        <button className="small" onClick={() => onTake(choice.trim())}>
          + {p.level}
        </button>
        <span className="clickable" onClick={onToggle} title="Show what the power does">
          {open ? '▾' : '▸'} <b>{choice.trim() && p.choose ? p.name.replace(/\([^)]*\)/, choice.trim()) : p.name}</b>
        </span>
        {options ? (
          <select value={choice} onChange={(e) => setChoice(e.target.value)} aria-label={`${p.choose} for ${p.name}`}>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          p.choose && <input value={choice} onChange={(e) => setChoice(e.target.value)} placeholder={`the ${p.choose}`} aria-label={`${p.choose} for ${p.name}`} style={{ width: 140 }} />
        )}
        <span className="muted">({p.stats})</span>
      </div>
      {open && (
        <div className="small" style={{ borderLeft: '2px solid var(--line)', paddingLeft: 8, margin: '4px 0' }}>
          {p.rdt}. {p.text}
          <div className="muted">
            {p.design} <BookBadge book="RoP_M" line={p.line} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Variable Power and Deteriorating Power on one power: whether it applies here, what it changes with, and the effect level that gives. */
function VarianceRow({ ed, p, x, variables, deteriorating }: { ed: CharEditor; p: CharPower; x: VarianceInputs; variables: string[]; deteriorating: string[] }) {
  const { c, data, update } = ed;
  if (!c) return null;
  const others = (c.powers ?? []).filter((o) => o.uid !== p.uid);
  const free = (uids: string[], key: 'variable' | 'deteriorating') => uids.find((u) => !others.some((o) => o[key]?.virtueUid === u));
  const abilities = [...new Set(c.abilities.map((a) => a.abilityId))].map((id) => ({ id, name: data.abilityById.get(id)?.name ?? id })).sort((a, b) => a.name.localeCompare(b.name));
  const set = (key: 'variable' | 'deteriorating', by: string, uids: string[]) =>
    update((y) => {
      const q = (y.powers ?? []).find((o) => o.uid === p.uid);
      if (!q) return;
      if (!by) q[key] = undefined;
      else q[key] = { virtueUid: q[key] && uids.includes(q[key]!.virtueUid) ? q[key]!.virtueUid : free(uids, key)!, by: by as VarianceBy };
    });
  // a Virtue or Flaw since removed no longer counts
  const v = variedLevel({ ...p, variable: p.variable && variables.includes(p.variable.virtueUid) ? p.variable : undefined, deteriorating: p.deteriorating && deteriorating.includes(p.deteriorating.virtueUid) ? p.deteriorating : undefined }, x);
  const picker = (key: 'variable' | 'deteriorating', label: string, uids: string[], kinds: PowerKind[]) => {
    if (!uids.length || !kinds.includes(p.kind)) return null;
    const mine = p[key] && uids.includes(p[key]!.virtueUid) ? p[key] : undefined;
    if (!mine && !free(uids, key)) return null;
    const det = key === 'deteriorating';
    return (
      <label className="inline small">
        {label}{' '}
        <select value={mine?.by ?? ''} onChange={(e) => set(key, e.target.value, uids)} aria-label={`${label} on ${p.name || 'this power'}`}>
          <option value="">not on this power</option>
          <option value="age">{varianceLabel('age', det)}</option>
          <option value="might">{varianceLabel('might', det)}</option>
          <option value="warping">{varianceLabel('warping', det)}</option>
          {!det &&
            abilities.map((a) => (
              <option key={a.id} value={`ability:${a.id}`}>
                {a.name}
              </option>
            ))}
        </select>
      </label>
    );
  };
  return (
    <div className="row small" style={{ flexWrap: 'wrap' }}>
      {picker('variable', 'Variable Power:', variables, VARIABLE_KINDS)}
      {picker('deteriorating', 'Deteriorating Power:', deteriorating, DETERIORATING_KINDS)}
      {(v.up > 0 || v.down > 0) && (
        <span>
          effect level <b>{v.level}</b>{' '}
          <span className="muted">
            ({p.level}
            {v.up ? ` + 5 × ${v.up}` : ''}
            {v.down ? ` − 5 × ${v.down}` : ''}
            {v.up ? `; or ${v.up} more similar effect${v.up === 1 ? '' : 's'} of level ${p.level}` : ''})
          </span>
        </span>
      )}
      {(p.variable?.by === 'age' || p.variable?.by === 'warping' || p.deteriorating?.by === 'age' || p.deteriorating?.by === 'warping') && (
        <span className="muted">Not age or Warping for a being immune to them.</span>
      )}
    </div>
  );
}
