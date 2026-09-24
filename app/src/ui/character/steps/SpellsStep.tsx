import { useMemo, useState } from 'react';
import { ART_NAMES, FORMS, TECHNIQUES, type SpellDef } from '../../../data';
import { creationSpellLimit } from '../../../engine/magic';
import { MASTERY_ABILITIES } from '../../../engine/spellDesign';
import { abilityScoreFromXp } from '../../../engine/xp';
import type { CharSpell, Character } from '../../../engine/types';
import type { DerivedCharacter } from '../../../engine/character/derive';
import { uid } from '../../../util/id';
import { BookBadge, Card, Markdown, Meter, SearchInput, Stepper } from '../../kit';
import type { CharEditor } from '../useChar';

export function makeCharSpell(s: SpellDef, source: CharSpell['source'], flawless: boolean): CharSpell {
  return { uid: uid(), spellId: s.custom ? undefined : s.id, spell: structuredClone(s), masteryXp: flawless ? { free: 5 } : {}, masteryAbilities: [], source };
}

export function masteryScore(cs: CharSpell, d: DerivedCharacter): number {
  let xp = 0;
  for (const [k, v] of Object.entries(cs.masteryXp)) {
    if (!v) continue;
    // Flawless Magic doubles mastery Advancement Totals in play; creation pools are raw xp
    xp += v;
  }
  void d;
  return abilityScoreFromXp(xp);
}

export default function SpellsStep({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga, data } = ed;
  const [q, setQ] = useState('');
  const [te, setTe] = useState('');
  const [fo, setFo] = useState('');
  const [withinLimit, setWithinLimit] = useState(true);
  const [source, setSource] = useState<CharSpell['source']>('apprenticeship');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);
  const bonus = saga?.houseRules.spellLevelLimitBonus ?? 3;

  const limits = useMemo(() => {
    const m = new Map<string, number>();
    if (!d) return m;
    for (const t of TECHNIQUES) for (const f of FORMS) m.set(t + f, creationSpellLimit(d, { technique: t, form: f }, bonus).total);
    return m;
  }, [d, bonus]);

  const results = useMemo(() => {
    if (!d) return [];
    const qq = q.toLowerCase();
    return data.spells
      .filter((s) => data.isBookEnabled(s.source.book))
      .filter((s) => (!te || s.technique === te) && (!fo || s.form === fo))
      .filter((s) => !qq || s.name.toLowerCase().includes(qq) || s.text.toLowerCase().includes(qq))
      .filter((s) => !withinLimit || (s.level ?? 0) <= creationSpellLimit(d, { technique: s.technique, form: s.form, requisites: s.requisites }, bonus).total)
      .sort((a, b) => (a.technique + a.form).localeCompare(b.technique + b.form) || (a.level ?? 0) - (b.level ?? 0));
  }, [data, q, te, fo, withinLimit, d, bonus]);

  if (!c || !d || !saga) return null;
  const app = d.budgets.find((b) => b.id === 'apprenticeship');
  const pg = d.budgets.find((b) => b.id === 'postGauntlet');

  return (
    <>
      <Card title="Spells known" className="accent">
        <div className="grid grid-3">
          {app?.spellLevels && <Meter label="Apprenticeship spell levels" value={app.spellLevels.spent} max={app.spellLevels.total} />}
          {pg && <Meter label="Post-Gauntlet points (xp + spell levels)" value={pg.spent} max={pg.total} />}
          {d.masteryPools.map((mp) => (
            <Meter key={mp.uid} label={`${mp.label} (mastery xp)`} value={c.spells.reduce((s, sp) => s + (sp.masteryXp[`pool:${mp.uid}`] ?? 0), 0)} max={mp.total} />
          ))}
        </div>
        {d.flawless && <p className="small good-text">Flawless Magic: every spell starts with Mastery 1; choose one special ability for each.</p>}
        <KnownSpells c={c} d={d} update={update} bonus={bonus} />
      </Card>

      <Card title="Add spells">
        <div className="row" style={{ marginBottom: 8 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search spells" />
          <select value={te} onChange={(e) => setTe(e.target.value)}>
            <option value="">Any Technique</option>
            {TECHNIQUES.map((t) => (
              <option key={t} value={t}>
                {ART_NAMES[t]}
              </option>
            ))}
          </select>
          <select value={fo} onChange={(e) => setFo(e.target.value)}>
            <option value="">Any Form</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
          <label className="inline small">
            <input type="checkbox" checked={withinLimit} onChange={(e) => setWithinLimit(e.target.checked)} /> only spells I can learn
          </label>
          <select value={source} onChange={(e) => setSource(e.target.value as CharSpell['source'])}>
            <option value="apprenticeship">learned in apprenticeship</option>
            {pg && <option value="postGauntlet">learned after Gauntlet</option>}
            <option value="play">learned in play</option>
          </select>
        </div>
        <div className="small muted">{results.length} spells. Your best limits: {bestLimits(limits)}</div>
        <div className="table-wrap scroll-y" style={{ maxHeight: 600 }}>
          <table className="compact">
            <thead>
              <tr>
                <th>Spell</th>
                <th>Arts</th>
                <th className="num">Level</th>
                <th>R / D / T</th>
                <th>Source</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {results.slice(0, limit).map((s) => {
                const known = c.spells.some((x) => x.spell.name === s.name && x.spell.technique === s.technique && x.spell.form === s.form);
                return (
                  <FragmentRow key={s.id} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} s={s}>
                    <button className="small" disabled={known} onClick={() => update((x) => void x.spells.push(makeCharSpell(s, source, d.flawless)))}>
                      {known ? 'known' : '+ Learn'}
                    </button>
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
        {results.length > limit && <button onClick={() => setLimit((l) => l + 100)}>Show more</button>}
        <p className="small muted">Need a spell that isn't listed? Design it in the Spells & design tool and add it to this character from there.</p>
      </Card>
    </>
  );
}

function bestLimits(m: Map<string, number>): string {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(', ');
}

export function FragmentRow(props: { s: SpellDef; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  const s = props.s;
  return (
    <>
      <tr>
        <td className="clickable" onClick={props.onToggle}>
          <b>{s.name}</b>
          {s.ritual && <span className="badge accent">Ritual</span>}
        </td>
        <td className="nowrap">
          {s.technique}
          {s.form}
          {s.requisites.length > 0 && <span className="small muted"> ({s.requisites.join(', ')})</span>}
        </td>
        <td className="num">{s.level ?? 'Gen'}</td>
        <td className="small">
          {s.range} / {s.duration} / {s.target}
        </td>
        <td>
          <BookBadge book={s.source.book} anchor={s.source.anchor} line={s.source.line} />
        </td>
        <td>{props.children}</td>
      </tr>
      {props.open && (
        <tr>
          <td colSpan={6}>
            <Markdown text={s.text} />
            {s.design && <div className="small muted">({s.design})</div>}
          </td>
        </tr>
      )}
    </>
  );
}

function KnownSpells({ c, d, update, bonus }: { c: Character; d: DerivedCharacter; update: (fn: (c: Character) => void) => void; bonus: number }) {
  if (!c.spells.length) return <div className="muted small">No spells yet.</div>;
  return (
    <div className="table-wrap">
      <table className="compact">
        <thead>
          <tr>
            <th>Spell</th>
            <th>Arts</th>
            <th className="num">Lvl</th>
            <th>Learned</th>
            <th className="num">Limit</th>
            <th>Mastery</th>
            <th>Focus</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {c.spells.map((sp) => {
            const lim = creationSpellLimit(d, { technique: sp.spell.technique, form: sp.spell.form, requisites: sp.spell.requisites }, bonus, !!sp.notes?.includes('[focus]')).total;
            const over = (sp.spell.level ?? 0) > lim && sp.source !== 'play';
            const ms = masteryScore(sp, d);
            return (
              <tr key={sp.uid}>
                <td>
                  <b>{sp.spell.name}</b>
                  {sp.spell.ritual && <span className="badge accent">Ritual</span>}
                </td>
                <td>
                  {sp.spell.technique}
                  {sp.spell.form}
                  {sp.spell.requisites.length ? ` (${sp.spell.requisites.join(',')})` : ''}
                </td>
                <td className="num">
                  {sp.spell.general ? (
                    <Stepper value={sp.spell.level ?? 5} min={1} step={5} width={40} onChange={(v) => update((x) => void (x.spells.find((y) => y.uid === sp.uid)!.spell.level = v))} />
                  ) : (
                    sp.spell.level
                  )}
                </td>
                <td>
                  <select value={sp.source} onChange={(e) => update((x) => void (x.spells.find((y) => y.uid === sp.uid)!.source = e.target.value as CharSpell['source']))}>
                    <option value="apprenticeship">apprenticeship</option>
                    <option value="postGauntlet">after Gauntlet</option>
                    <option value="play">in play</option>
                    <option value="free">free / other</option>
                  </select>
                </td>
                <td className={`num ${over ? 'bad-text' : ''}`}>{lim}</td>
                <td>
                  <div className="row tight">
                    <span className="badge">{ms}</span>
                    {d.masteryPools.map((mp) => (
                      <span key={mp.uid} title={`xp from ${mp.label}`} className="small">
                        <Stepper value={sp.masteryXp[`pool:${mp.uid}`] ?? 0} min={0} step={5} width={38} onChange={(v) => update((x) => { const y = x.spells.find((z) => z.uid === sp.uid)!; if (v) y.masteryXp[`pool:${mp.uid}`] = v; else delete y.masteryXp[`pool:${mp.uid}`]; })} />
                      </span>
                    ))}
                    {ms > 0 && (
                      <select
                        value=""
                        onChange={(e) => e.target.value && update((x) => void x.spells.find((y) => y.uid === sp.uid)!.masteryAbilities.push(e.target.value))}
                        title="Add a mastery special ability"
                      >
                        <option value="">+ ability ({sp.masteryAbilities.length}/{ms})</option>
                        {MASTERY_ABILITIES.map((m) => (
                          <option key={m.name} value={m.name} title={m.text}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {sp.masteryAbilities.map((m, i) => (
                      <span key={i} className="badge clickable" title="click to remove" onClick={() => update((x) => void x.spells.find((y) => y.uid === sp.uid)!.masteryAbilities.splice(i, 1))}>
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  {d.magicalFocus !== 'none' && (
                    <input
                      type="checkbox"
                      title="Within the Magical Focus"
                      checked={!!sp.notes?.includes('[focus]')}
                      onChange={(e) => update((x) => { const y = x.spells.find((z) => z.uid === sp.uid)!; y.notes = e.target.checked ? `${y.notes ?? ''}[focus]` : (y.notes ?? '').replace('[focus]', ''); })}
                    />
                  )}
                </td>
                <td>
                  <button className="small ghost" onClick={() => update((x) => void (x.spells = x.spells.filter((y) => y.uid !== sp.uid)))}>
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
