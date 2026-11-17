// The Vitkir (Hedge Magic, Revised Edition, Chapter Seven) on the sheet and at the Game Table: the
// apprenticeship and the rune scripts known; casting a script with the inscription variations and
// Nátt-thel, the loss of The Gift, on Dice › Hedge magic; a season inventing scripts or learning them
// from a teacher, on the Seasons page.

import { useState } from 'react';
import { RUNES, RUNE_METHODS, VITKAR_FOCI, type Inscription } from '../../data/hedgeVitkir';
import { RUNE_GUIDELINES, RUNE_SCRIPTS, RUNE_TEXTS } from '../../data/vitkirRunes';
import { VITKI_APPRENTICESHIP } from '../../engine/character/derive';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import type { AuraState } from '../../engine/magic';
import type { Character, RuneScript } from '../../engine/types';
import {
  inventedLevels, nattThelAvoid, nattThelDuration, nattThelFollows, runeCast, runePenetration, runeWarps, vitkiBotchDice, vitkiCastingTotal, hideRunesTotal, HIDE_RUNES_EASE, vitkiLabTotal, vitkirRunes, type RuneScore,
} from '../../engine/vitkir';
import { warpingScoreFromPoints } from '../../engine/xp';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';
import type { CharEditor } from '../character/useChar';
import { useSeasonWork } from '../seasonWork';
import { settle } from '../../engine/seasonPlan';
import { gainWarping, nowOf, owedReaction } from '../../engine/warping';

function Lines({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="log small" aria-live="polite">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

const IDS = ['vitki', ...RUNES.map((r) => r.id)];
export const hasVitki = (c: Character) => c.virtues.some((v) => IDS.includes(v.defId)) || c.abilities.some((a) => IDS.includes(a.abilityId));

/** The book writes the vitki's name as “(the runemaster)”. */
export const withName = (text: string, name: string) => text.replace(/\(the runemaster\)/gi, name || 'the runemaster');
const short = (s: RuneScript | { runes: string[]; level: number; method: string }) => `${s.runes.join(' + ')} ${s.level || 'General'}, Method ${s.method}`;

/** Choose a script from the book's samples, or design one from a rune's guideline. */
/** A rune list: the runes raised above 0 first, highest first, then those still at 0. */
function RuneOptions({ runes }: { runes: RuneScore[] }) {
  const raised = [...runes].filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  const zero = runes.filter((r) => r.score <= 0);
  const opt = (r: RuneScore) => (
    <option key={r.name} value={r.name}>
      {r.letter} {r.name} ({r.score})
    </option>
  );
  if (!raised.length || !zero.length) return <>{(raised.length ? raised : zero).map(opt)}</>;
  return (
    <>
      <optgroup label="Raised">{raised.map(opt)}</optgroup>
      <optgroup label="At 0, not yet raised">{zero.map(opt)}</optgroup>
    </>
  );
}

function ScriptDesigner({ runes, who, onAdd, label, maxLevel, capText }: { runes: RuneScore[]; who: string; onAdd: (s: RuneScript) => void; label: string; maxLevel?: number; capText?: string }) {
  const open = runes.map((r) => r.name);
  const book = RUNE_SCRIPTS.filter((s) => s.runes.every((n) => open.includes(n)));
  const [from, setFrom] = useState<'book' | 'design'>(book.length ? 'book' : 'design');
  const [bi, setBi] = useState(0);
  const [effect, setEffect] = useState('');
  const [target, setTarget] = useState('');
  const [method, setMethod] = useState<'I' | 'II' | 'III'>('I');
  const [gi, setGi] = useState(0);
  const [level, setLevel] = useState(10);
  const [name, setName] = useState('');
  if (!runes.length) return <p className="small warn-text">The runes must be opened first.</p>;
  const pick = book[Math.min(bi, book.length - 1)];
  const eff = open.includes(effect) ? effect : runes.reduce((m, r) => (r.score > m.score ? r : m), runes[0]).name;
  const guides = RUNE_GUIDELINES.filter((g) => g.rune === eff);
  const guide = guides[Math.min(gi, guides.length - 1)];
  // a General guideline takes any level, its magnitude the bonus; the others set it
  const lvl = from === 'book' ? (pick?.level || level) : guide?.general ? level : (guide?.level ?? level);
  const generalPick = from === 'book' ? pick?.level === 0 : !!guide?.general;
  const over = maxLevel !== undefined && lvl > maxLevel;
  const add = () => {
    if (from === 'book' && pick) onAdd({ uid: uid(), name: withName(pick.name, who), runes: pick.runes, level: lvl, method: pick.method, text: pick.text, source: 'play' });
    else {
      const rs = [eff, ...(method !== 'I' && target && target !== eff ? [target] : [])];
      const fallback = method === 'I' ? `I, ${who}, carve the runes of ${eff}` : method === 'II' ? `${who} carves the runes of ${eff}${target ? ` upon ${target}` : ''}` : `${who} carves the runes upon this`;
      onAdd({ uid: uid(), name: name.trim() || fallback, runes: rs, level: lvl, method, text: method === 'III' ? 'A substitute Arcane Connection to the target, for later Method II scripts.' : guide?.text, source: 'play' });
    }
    setName('');
  };
  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <Field label="From">
        <select value={from} onChange={(e) => setFrom(e.target.value as 'book' | 'design')}>
          <option value="book" disabled={!book.length}>the book’s scripts</option>
          <option value="design">a rune’s guideline</option>
        </select>
      </Field>
      {from === 'book' && pick ? (
        <Field label="Script" hint={pick.text}>
          <select value={bi} onChange={(e) => setBi(Number(e.target.value))} style={{ maxWidth: 360 }}>
            {book.map((s, i) => (
              <option key={s.name} value={i}>{withName(s.name, who)} ({short(s)})</option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Method" hint={RUNE_METHODS.find((m) => m.method === method)?.text}>
            <select value={method} onChange={(e) => setMethod(e.target.value as 'I' | 'II' | 'III')}>
              {RUNE_METHODS.map((m) => (
                <option key={m.method} value={m.method}>{m.method}: {m.form}</option>
              ))}
            </select>
          </Field>
          <Field label="Effect rune" hint={RUNES.find((r) => r.name === eff)?.effects}>
            <select value={eff} onChange={(e) => ((setEffect(e.target.value)), setGi(0))}>
              <RuneOptions runes={runes} />
            </select>
          </Field>
          {method !== 'I' && (
            <Field label="Target rune" hint="The rune that names the target; the lowest score counts">
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">the same rune</option>
                <RuneOptions runes={runes.filter((r) => r.name !== eff)} />
              </select>
            </Field>
          )}
          {method !== 'III' && (
            <Field label="Guideline" hint={guide?.text}>
              <select value={gi} onChange={(e) => setGi(Number(e.target.value))} style={{ maxWidth: 380 }}>
                {guides.map((g, i) => (
                  <option key={i} value={i}>{g.general ? 'General' : `Level ${g.level}`}: {g.text.slice(0, 80)}{g.text.length > 80 ? '…' : ''}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={method === 'I' ? `I, ${who}, …` : `${who} …`} style={{ width: 180 }} />
          </Field>
        </>
      )}
      {(generalPick || method === 'III') && (
        <Field label="Level" hint={generalPick ? `General: its magnitude (${Math.ceil(level / 5)}) is the bonus or penalty` : 'Against Magic Resistance it must exceed it'}>
          <Stepper value={level} min={1} max={75} width={36} onChange={setLevel} />
        </Field>
      )}
      <button className="small" onClick={add} disabled={over}>
        {label} (level {lvl})
      </button>
      {over && <span className="small warn-text">Above {capText ?? 'the Lab Total for these runes'} ({maxLevel}).</span>}
    </div>
  );
}

/** On the sheet: the apprenticeship, the runes by aett and the scripts known. */
/** The vitki's card: on the sheet with the apprenticeship; at the table (`atTable`) only the runes and scripts known, and one added as learned in play. */
export function VitkiSheetCard({ ed, atTable }: { ed: CharEditor; atTable?: boolean }) {
  const { c, d, update } = ed;
  if (!c || !d || !hasVitki(c) || c.type === 'magus') return null;
  const budget = d.budgets.find((b) => b.id === VITKI_APPRENTICESHIP);
  const scripts = c.vitki?.scripts ?? [];
  const runes = vitkirRunes(c, d);
  const set = (fn: (x: Character) => void) => update(fn);
  const setScripts = (fn: (s: RuneScript[]) => RuneScript[]) => set((x) => void (x.vitki = { ...(x.vitki ?? {}), scripts: fn(x.vitki?.scripts ?? []) }));
  return (
    <Card title={atTable ? 'Runes and scripts known' : 'Vitki'} tour="vitki-card" fold="vitki-card" summary={`${scripts.length} script${scripts.length === 1 ? '' : 's'} · ${runes.length} runes`}>
      {atTable ? (
        <p className="small muted" style={{ marginTop: 0 }}>The runes and scripts this vitki knows. The apprenticeship is on the sheet.</p>
      ) : (
        <p className="small muted" style={{ marginTop: 0 }}>
          A vitki&apos;s apprenticeship (about fifteen years) gives 240 experience points, at least half on the runes, and 120 levels of rune scripts, in place of those later-life years. The
          runes are raised as Arts. Scripts are cast and invented on the Game Table, Dice › Hedge magic.
        </p>
      )}
      {!atTable && (
        <div className="row">
          <Field label="Years of apprenticeship">
            <Stepper value={c.vitki?.apprenticeYears ?? 15} min={0} max={Math.max(0, c.age - 5)} width={36} onChange={(v) => set((x) => void (x.vitki = { ...(x.vitki ?? {}), apprenticeYears: v }))} />
          </Field>
          {budget && (
            <span className="small">
              {budget.spent} of {budget.total} experience; {budget.spellLevels?.spent ?? 0} of {budget.spellLevels?.total ?? 0} levels of scripts.
            </span>
          )}
        </div>
      )}
      {(['Freya', 'Heimdall', 'Tyr'] as const).map((aett) => (
        <p key={aett} className="small" style={{ margin: '2px 0' }}>
          <b>{aett}&apos;s aett:</b> {runes.filter((r) => r.aett === aett).map((r) => `${r.letter} ${r.score}`).join(', ') || 'none open'}
        </p>
      ))}
      {scripts.map((s) => (
        <div key={s.uid} className="row small" style={{ borderTop: '1px solid var(--line)', paddingTop: 4 }}>
          <b>{s.name}</b>
          <span>{short(s)}</span>
          {!atTable && (
            <select value={s.source} aria-label="Where it was learned" onChange={(e) => setScripts((l) => l.map((y) => (y.uid === s.uid ? { ...y, source: e.target.value as RuneScript['source'] } : y)))}>
              <option value="training">in apprenticeship</option>
              <option value="play">in play</option>
            </select>
          )}
          <button className="small ghost" aria-label="Remove the script" onClick={() => setScripts((l) => l.filter((y) => y.uid !== s.uid))}>
            ✕
          </button>
          {s.text && <div className="soft" style={{ flexBasis: '100%' }}>{s.text}</div>}
        </div>
      ))}
      <ScriptDesigner runes={runes} who={c.name} label={atTable ? 'Add one learned in play' : 'Add a script known'} onAdd={(s) => setScripts((l) => [...l, { ...s, source: atTable || c.creation.finalized ? 'play' : 'training' }])} />
    </Card>
  );
}

const INSCRIPTION: { v: Inscription; label: string }[] = [
  { v: 'written', label: 'written' },
  { v: 'hidden', label: 'hidden' },
  { v: 'none', label: 'left off' },
];

export function VitkiCastCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const known = c?.vitki?.scripts ?? [];
  const [ki, setKi] = useState(0);
  const [name, setName] = useState<Inscription>('written');
  const [desc, setDesc] = useState<Inscription>('written');
  const [effort, setEffort] = useState(false);
  const [emphasis, setEmphasis] = useState(false);
  const [focus, setFocus] = useState(false);
  const [vis, setVis] = useState(0);
  const [onSelf, setOnSelf] = useState(true);
  const [care, setCare] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const runes = vitkirRunes(c, d);
  if (!runes.length) return null;
  const script = known[Math.min(ki, known.length - 1)];
  const focusVirtue = c.virtues.some((v) => v.defId === 'major-rune-focus' || v.defId === 'minor-rune-focus');
  const t = script ? vitkiCastingTotal(c, d, script.runes, aura, { name, description: desc, extraEffort: effort, emphasis, vis, focus }) : undefined;
  const pen = d.abilities.filter((x) => x.abilityId === 'penetration').reduce((m, x) => Math.max(m, x.total), 0);
  const hiding = name === 'hidden' || desc === 'hidden';
  const hideTotal = hideRunesTotal(c, d);
  const cast = () => {
    if (!script || !t) return;
    // hidden with care: twice as long, and Dexterity + Craft: Runes + a simple die of 6 waives the penalty
    const hide = hiding && care ? simpleDie().value + hideTotal : undefined;
    const hidden = hide !== undefined && hide >= HIDE_RUNES_EASE;
    const tt = hidden ? vitkiCastingTotal(c, d, script.runes, aura, { name, description: desc, extraEffort: effort, emphasis, vis, focus, hiddenWithCare: true }) : t;
    const pawns = Math.min(vis, tt.lowest);
    const r = stressDie(vitkiBotchDice(c, script.runes, pawns, tt.auraBotch));
    const botches = r.zero ? r.botches : 0;
    const res = runeCast(tt, r.value, script.level);
    const out = [
      ...(hide !== undefined
        ? [`Hiding the runes with care (twice as long): Dexterity + Craft: Runes ${hideTotal} + simple die = ${hide} against ${HIDE_RUNES_EASE}: ${hidden ? `hidden at no penalty; another vitki's Intelligence + Rune Magic must beat ${hide} to read them` : 'not well enough, so the usual hiding penalty applies'}.`]
        : []),
      `${script.name} (${short(script)}): stress die ${describeStress(r)} + ${tt.total}${tt.halved ? ', halved,' : ''} = ${res.total} against ${script.level}.`,
    ];
    let fatigue = 0;
    if (botches) {
      fatigue = 1;
      out.push(`BOTCH ×${botches}: the runes miscarry (the storyguide says how); ${botches} Warping Point${botches === 1 ? '' : 's'}.`);
    } else {
      if (res.outcome !== 'works') fatigue = 1;
      const p = Math.max(0, runePenetration(res.total, script.level, pen));
      out.push(res.outcome === 'works' ? `It is cast. Penetration ${p} against Magic Resistance.` : res.outcome === 'fatigue' ? `It is cast, for a Fatigue level. Penetration ${p}.` : 'It is not cast, and costs a Fatigue level.');
      if (res.outcome !== 'fails') {
        out.push('The effect is real and natural while the runes last; the inscription becomes an Arcane Connection to the vitki, both ways.');
        if (runeWarps(script.level, onSelf)) out.push('Level 30 or more on another: the target gains a Warping Point each season it lasts.');
      }
    }
    const ws = warpingScoreFromPoints(c.warpingPoints + botches);
    if (botches && nattThelFollows(c, botches, true)) {
      const a = nattThelAvoid(d, ws);
      const roll = stressDie(1);
      if (a.total + roll.value >= a.ease) out.push(`Nátt-thel avoided: Stamina + Concentration ${a.total} + ${describeStress(roll)} against ${a.ease}.`);
      else {
        const dur = nattThelDuration(simpleDie().value + ws, botches);
        out.push(`NÁTT-THEL (${a.total + roll.value} against ${a.ease}): every rune effect ends, and the vitki loses The Gift and the vitkar Virtues and Flaws for ${dur.text}. Each effect kept alive costs a Warping Point more (and may lengthen it).`);
      }
    }
    update((x) => {
      if (fatigue) x.fatigueLost = Math.min(5, x.fatigueLost + fatigue);
      // Nátt-thel is rolled above, where the points came
      if (botches) gainWarping(x, d, { points: botches, why: 'from a botched rune script', botch: true, handled: true, ...nowOf(ed.saga) });
    });
    setLines(out);
  };
  return (
    <Card title="Cast a rune script" tour="vitki-cast" fold="vitki-cast" summary={script ? `${script.name}` : 'No scripts known'}>
      {!script ? (
        <p className="small muted">Vitkir cannot cast spontaneously: add the scripts known on the sheet&apos;s Vitki card, or invent them in a season below.</p>
      ) : (
        <>
          <div className="row">
            <Field label="Script" hint={script.text}>
              <select value={ki} onChange={(e) => setKi(Number(e.target.value))} style={{ maxWidth: 340 }}>
                {known.map((x, i) => (
                  <option key={x.uid} value={i}>{x.name} ({short(x)})</option>
                ))}
              </select>
            </Field>
            <Field label="Name" hint="Hidden −2, left off −5 (and faster)">
              <select value={name} onChange={(e) => setName(e.target.value as Inscription)}>
                {INSCRIPTION.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Description" hint="Hidden −5, left off −10 (single runes: a round's casting)">
              <select value={desc} onChange={(e) => setDesc(e.target.value as Inscription)}>
                {INSCRIPTION.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Vis" hint="+2 a pawn of fitting vis, no more than the rune's score; a botch die each. Take it from the purse by hand.">
              <Stepper value={vis} min={0} max={20} width={32} onChange={setVis} />
            </Field>
          </div>
          <div className="row small">
            <label><input type="checkbox" checked={effort} onChange={(e) => setEffort(e.target.checked)} /> Extra effort (+1, twice as long)</label>
            <label><input type="checkbox" checked={emphasis} onChange={(e) => setEmphasis(e.target.checked)} /> Emphasis (+1)</label>
            {focusVirtue && <label><input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} /> Cut into the focus&apos;s material for its purpose</label>}
            <label><input type="checkbox" checked={onSelf} onChange={(e) => setOnSelf(e.target.checked)} /> On the vitki (the caster)</label>
            {hiding && (
              <label>
                <input type="checkbox" checked={care} onChange={(e) => setCare(e.target.checked)} /> Hide them with care: twice as long, and no hiding penalty if Dexterity + Craft: Runes ({hideTotal}) + a simple die reaches {HIDE_RUNES_EASE}
              </label>
            )}
          </div>
          {t && (
            <p className="small">
              Casting Total <Total value={t.total} parts={t.parts} notes={t.notes} label="Casting Total" /> + stress die{t.halved ? ', halved,' : ''} against level {script.level}. Within 10 below, it is cast for a
              Fatigue level; further below, it fails for one.
            </p>
          )}
          {t?.notes.map((n) => (
            <p key={n} className="small warn-text">{n}</p>
          ))}
          <button onClick={cast} disabled={!!t?.unusable.length}>Cast</button>
        </>
      )}
      <Lines lines={lines} />
    </Card>
  );
}

export function VitkiSeasonCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d } = ed;
  const [mode, setMode] = useState<'invent' | 'taught'>('invent');
  const [effect, setEffect] = useState('');
  const [target, setTarget] = useState('');
  const [months, setMonths] = useState(3);
  const [teacher, setTeacher] = useState(20);
  const [pending, setPending] = useState<RuneScript[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const sw = useSeasonWork(ed);
  if (!c || !d) return null;
  const runes = vitkirRunes(c, d);
  if (!runes.length) return null;
  const { year, season, busy } = sw;
  const best = runes.reduce((m, r) => (r.score > m.score ? r : m), runes[0]);
  const eff = runes.some((r) => r.name === effect) ? effect : best.name;
  const set = [eff, ...(target && target !== eff ? [target] : [])];
  const lt = vitkiLabTotal(c, d, set, aura);
  const levels = mode === 'invent' ? inventedLevels(lt.total, months) : Math.max(0, teacher);
  const used = pending.reduce((s, x) => s + x.level, 0);
  const allowed = (s: RuneScript) => s.runes.every((n) => set.includes(n));
  const doSeason = () => {
    const text = `${mode === 'invent' ? `Inventing rune scripts with ${set.join(' and ')} (Lab Total ${lt.total}${months < 3 ? `, ${months} month${months === 1 ? '' : 's'}` : ''})` : `Taught rune scripts (the teacher's Lab Total ${teacher})`}: ${pending.map((p) => `${p.name} (${p.level})`).join(', ') || 'none finished'}; ${used} of ${levels} levels.`;
    setLines(
      sw.work(`Vitki: ${mode === 'invent' ? 'inventing rune scripts' : 'learning rune scripts'}`, mode === 'invent' ? RUNES.find((r) => r.name === eff)?.id : undefined, (x) => {
        x.vitki = { ...(x.vitki ?? {}), scripts: [...(x.vitki?.scripts ?? []), ...pending.map((p) => ({ ...p, source: 'play' as const }))] };
        return { lines: [text], made: pending.length ? 'rune scripts' : undefined };
      }),
    );
    setPending([]);
  };
  return (
    <Card title="A vitki's season" tour="vitki-season" fold="vitki-season" summary="Rune scripts invented or taught">
      <p className="small muted" style={{ marginTop: 0 }}>
        No laboratory is needed. Inventing gives levels equal to the Lab Total for the runes, spent on any scripts with them; a teacher gives levels equal to the teacher&apos;s own Lab Total, no script above
        the student&apos;s.
      </p>
      <div className="row">
        <Field label="Work">
          <select value={mode} onChange={(e) => ((setMode(e.target.value as 'invent' | 'taught')), setPending([]))}>
            <option value="invent">invent scripts</option>
            <option value="taught">learn from a teacher</option>
          </select>
        </Field>
        <Field label="Rune">
          <select value={eff} onChange={(e) => ((setEffect(e.target.value)), setPending([]))}>
            <RuneOptions runes={runes} />
          </select>
        </Field>
        <Field label="Second rune">
          <select value={target} onChange={(e) => ((setTarget(e.target.value)), setPending([]))}>
            <option value="">none</option>
            <RuneOptions runes={runes.filter((r) => r.name !== eff)} />
          </select>
        </Field>
        {mode === 'invent' ? (
          <Field label="Months" hint="Interrupted: a third of the Lab Total a month">
            <Stepper value={months} min={1} max={3} width={28} onChange={setMonths} />
          </Field>
        ) : (
          <Field label="Teacher's Lab Total" hint="For the highest-level script taught">
            <Stepper value={teacher} min={0} max={100} width={36} onChange={setTeacher} />
          </Field>
        )}
      </div>
      <p className="small">
        Lab Total <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Lab Total" />: {levels} levels this season, {used} chosen.
      </p>
      <ScriptDesigner
        runes={runes.filter((r) => set.includes(r.name))}
        who={c.name}
        label="Add to this season"
        maxLevel={mode === 'taught' ? lt.total : Math.max(0, levels - used)}
        capText={mode === 'taught' ? 'your own Lab Total for these runes' : 'the levels left this season'}
        onAdd={(s) => (allowed(s) ? setPending((p) => [...p, s]) : setLines(['That script uses runes outside this season’s.']))}
      />
      {pending.map((p) => (
        <div key={p.uid} className="row small">
          <b>{p.name}</b> <span>{short(p)}</span>
          <button className="small ghost" aria-label="Take it off" onClick={() => setPending((l) => l.filter((y) => y.uid !== p.uid))}>✕</button>
        </div>
      ))}
      {used > levels && <p className="small warn-text">{used} levels chosen, but the season gives {levels}.</p>}
      <button onClick={doSeason} disabled={busy || used > levels}>
        {mode === 'invent' ? 'Invent scripts' : 'Learn scripts'} (a season)
      </button>
      {busy && <span className="small muted"> {season} {year} is already spent.</span>}
      <Lines lines={lines} />
    </Card>
  );
}

/** Nátt-thel from any source of two or more Warping Points at once; and the runes' foci for reference. */
export function NattThelCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [picked, setGained] = useState(2);
  const [kept, setKept] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d || !vitkirRunes(c, d).length) return null;
  // owed on the Resolve list when the toolkit added the points: they are on the sheet already
  const owed = owedReaction(c, 'natt-thel');
  const gained = owed?.points ?? picked;
  const before = c.warpingPoints - (owed ? gained : 0);
  const roll = () => {
    const ws = warpingScoreFromPoints(before + gained);
    const a = nattThelAvoid(d, ws);
    const r = stressDie(1);
    const follows = !!owed || nattThelFollows(c, gained);
    const lost = follows && a.total + r.value < a.ease;
    const out = [`${gained} Warping Point${gained === 1 ? '' : 's'} (Warping Score ${ws}): Stamina + Concentration ${a.total} + ${describeStress(r)} = ${a.total + r.value} against ${a.ease}.`];
    if (!follows) out.push('Fewer than two points at once: no Nátt-thel (unless Nátt-thel Prone and from a botch).');
    else if (!lost) out.push('The vitki keeps control of the magic.');
    else {
      // each effect kept alive adds a point, counted in the Warping Score and the multiplier (HMRE line 6372)
      const pts = gained + kept;
      const wsKept = warpingScoreFromPoints(before + pts);
      const die = simpleDie().value;
      const dur = nattThelDuration(die + wsKept, pts);
      out.push(`Nátt-thel: the vitki loses The Gift (not its social penalties) and the vitkar Virtues and Flaws for ${dur.text} (simple die ${die} + Warping Score ${wsKept}).${kept ? ` ${kept} effect${kept === 1 ? '' : 's'} kept alive, a Warping Point each.` : ' Every rune effect ends.'}`);
    }
    const add = (owed ? 0 : gained) + (lost ? kept : 0);
    update((x) => {
      x.warpingPoints += add;
      const t = owedReaction(x, 'natt-thel');
      if (t) settle(x, t.uid);
    });
    if (add) out.push(`${add} Warping Point${add === 1 ? '' : 's'} added to the sheet.`);
    setLines(out);
  };
  return (
    <Card title="Nátt-thel" tour="vitki-natt-thel" fold="vitki-natt-thel" startOpen={!!owed} summary={owed ? `${gained} Warping Points: roll to avoid it` : 'Losing The Gift'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        In place of Twilight: two or more Warping Points from one event (a single botch for the Nátt-thel Prone) call for Stamina + Concentration + stress die against Warping Score × 3.
        Interruptions add the Concentration table&apos;s Ease Factors.
      </p>
      {owed && <p className="small">{owed.text} They are on the sheet already.</p>}
      <div className="row">
        {!owed && (
          <Field label="Warping Points gained" hint="Points the toolkit adds bring Nátt-thel here by themselves">
            <Stepper value={gained} min={1} max={20} width={32} onChange={setGained} />
          </Field>
        )}
        <Field label="Effects kept alive" hint="A Warping Point each, if control is lost">
          <Stepper value={kept} min={0} max={10} width={32} onChange={setKept} />
        </Field>
        <button onClick={roll}>Roll</button>
      </div>
      <details className="small">
        <summary>The vitkar magic foci</summary>
        {VITKAR_FOCI.map((f) => (
          <p key={f.name} style={{ margin: '2px 0' }}>
            <b>{f.name}</b> ({f.norse}): {f.text} Cut into {f.material}; a Minor focus with {f.runes.join(', ')}.
          </p>
        ))}
      </details>
      <details className="small">
        <summary>The runes</summary>
        {RUNES.map((r) => (
          <p key={r.name} style={{ margin: '2px 0' }} title={RUNE_TEXTS[r.name]?.text}>
            <b>{r.letter} {r.name}</b>, “{r.meaning}” ({r.aett}): {r.effects}.
          </p>
        ))}
      </details>
      <Lines lines={lines} />
    </Card>
  );
}
