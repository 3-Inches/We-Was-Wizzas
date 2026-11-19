// The Gruagachan (Hedge Magic, Revised Edition, Chapter Four) on the sheet and at the Game Table: the
// apprenticeship and spells known; a Formulaic spell cast (varied within its magnitudes) or a
// spontaneous one, and transformation, on Dice › Hedge magic; a season enchanting a tattoo, inventing a
// spell or drawing vis, on the Seasons page, its vis from the purse or the covenant's stores.

import { useEffect, useState } from 'react';
import { hasGruagach } from '../../engine/hedgeTraditions';
import { GRUAGACH_PARAMS, GRUAGACH_SHAPES, POETIC_JUSTICE, TATTOO_SIZES, gruagachArtName, type GruagachArts, type Prohibition } from '../../data/hedgeGruagach';
import { GRUAGACH_GUIDELINES } from '../../data/gruagachSpells';
import { GRUAGACH_APPRENTICESHIP } from '../../engine/character/derive';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import {
  GRUAGACH_SEASON_SET, TRANSFORMATION_BAD, TRANSFORMATION_GOOD, durationProblem, firstGruagachWork, gruagachArtCap, gruagachArts, gruagachBookSpells, gruagachCastingScore, gruagachExtraction, gruagachFlex,
  gruagachLevel, gruagachPairs, gruagachSeason, gruagachVisLimit, pictish, spontaneousTotal, tattooVisArts, transformationAvoid, transformationFollows, botchWarpingPoints, gruagachInventSeason,
  understandingTransformation, type GruagachWork,
} from '../../engine/gruagach';
import { charmOutcome } from '../../engine/learnedMagic';
import { putInto, spendFrom, visInPlaces } from '../../engine/vis';
import { FREQUENCY } from '../../engine/enchant';
import { addMagnitudes } from '../../engine/spellDesign';
import type { AuraState } from '../../engine/magic';
import type { Character, LearnedCharm } from '../../engine/types';
import { warpingScoreFromPoints } from '../../engine/xp';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total, signed } from '../kit';
import type { CharEditor } from '../character/useChar';
import { gruagachTold } from '../../engine/seasonTold';
import { useSeasonWork, useVisSource } from '../seasonWork';
import { gainWarping, nowOf } from '../../engine/warping';

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

export { hasGruagach };

export { gruagachPairs };

/**
 * Design a spell from the book's spells or a guideline, with the Geas and Limit Durations. With `live`, a book spell is handed back as soon as it is chosen.
 * It opens on the book's spell named `initial`, if one is.
 */
function SpellDesigner({ pairs, onAdd, label, live, initial }: { pairs: GruagachArts[]; onAdd: (s: LearnedCharm) => void; label: string; live?: boolean; initial?: string }) {
  const [from, setFrom] = useState<'book' | 'design'>('book');
  const [bi, setBi] = useState(() => Math.max(0, gruagachBookSpells(pairs).findIndex((x) => x.name === initial)));
  const [tf, setTf] = useState<GruagachArts>(pairs[0] ?? 'GvBl');
  const [gi, setGi] = useState(0);
  const [base, setBase] = useState(5);
  const [range, setRange] = useState('Conversation');
  const [duration, setDuration] = useState('Limit');
  const [target, setTarget] = useState('Individual');
  const [geas, setGeas] = useState<Prohibition>('general');
  const [limit, setLimit] = useState<Prohibition>('general');
  const [name, setName] = useState('');
  const book = gruagachBookSpells(pairs);
  const pair = pairs.includes(tf) ? tf : pairs[0];
  const guides = GRUAGACH_GUIDELINES.filter((x) => x.tf === pair);
  const guide = guides[Math.min(gi, guides.length - 1)];
  const lv = gruagachLevel(pair, guide?.general ? base : (guide?.level ?? 1), { range, duration, target, geas, limit });
  const problem = durationProblem(pair, duration);
  const pick = book[Math.min(bi, book.length - 1)];
  const fromBook = () => pick && onAdd({ uid: uid(), name: pick.name, tf: pick.tf, level: pick.level, range: pick.range, duration: pick.duration, target: pick.target, text: pick.text, source: 'play' });
  const liveBook = !!live && from === 'book' && !!pick;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void (liveBook && fromBook()), [liveBook, pick?.name]);
  if (!pairs.length) return <p className="small warn-text">A Technique and a Form of the tradition are needed first.</p>;
  const add = () => {
    if (from === 'book' && pick) fromBook();
    else onAdd({ uid: uid(), name: name.trim() || `${gruagachArtName(pair)} ${lv.level}`, tf: pair, level: lv.level, range, duration: duration === 'Geas' ? `Geas (${geas}) / Limit (${limit})` : duration === 'Limit' ? `Limit (${limit})` : duration, target, text: guide ? `${guide.text} ${lv.design}` : lv.design, source: 'play' });
    setName('');
  };
  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <Field label="From">
        <select value={from} onChange={(e) => setFrom(e.target.value as 'book' | 'design')}>
          <option value="book" disabled={!book.length}>the book’s spells</option>
          <option value="design">a guideline</option>
        </select>
      </Field>
      {from === 'book' && book.length > 0 ? (
        <Field label="Spell" hint={pick?.text}>
          <select value={bi} onChange={(e) => setBi(Number(e.target.value))} style={{ maxWidth: 360 }}>
            {book.map((x, i) => (
              <option key={x.name} value={i}>{x.name} ({x.tf} {x.level})</option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Arts">
            <select value={pair} onChange={(e) => ((setTf(e.target.value as GruagachArts)), setGi(0))}>
              {pairs.map((p) => (
                <option key={p} value={p}>{gruagachArtName(p)}</option>
              ))}
            </select>
          </Field>
          <Field label="Guideline" hint={guide?.text}>
            <select value={gi} onChange={(e) => setGi(Number(e.target.value))} style={{ maxWidth: 380 }}>
              {guides.map((x, i) => (
                <option key={i} value={i}>{x.general ? 'General' : `Level ${x.level}`}: {x.text.slice(0, 80)}{x.text.length > 80 ? '…' : ''}</option>
              ))}
            </select>
          </Field>
          {guide?.general && (
            <Field label="Base level">
              <Stepper value={base} min={1} max={100} width={36} onChange={setBase} />
            </Field>
          )}
          <Field label="Range">
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              {GRUAGACH_PARAMS.ranges.map((o) => (
                <option key={o.name} value={o.name}>{o.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Duration">
            <select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {GRUAGACH_PARAMS.durations.map((o) => (
                <option key={o.name} value={o.name}>{o.name}</option>
              ))}
            </select>
          </Field>
          {duration === 'Geas' && (
            <Field label="Geas prohibition" hint="Sweeping +4, general +2, specific +1">
              <select value={geas} onChange={(e) => setGeas(e.target.value as Prohibition)}>
                {(['sweeping', 'general', 'specific'] as const).map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
          )}
          {(duration === 'Geas' || duration === 'Limit') && (
            <Field label="Limit (what lifts it)" hint="Sweeping (easily lifted) +1, general +2, specific +4">
              <select value={limit} onChange={(e) => setLimit(e.target.value as Prohibition)}>
                {(['sweeping', 'general', 'specific'] as const).map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Target">
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {GRUAGACH_PARAMS.targets.map((o) => (
                <option key={o.name} value={o.name}>{o.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`level ${lv.level}`} style={{ width: 150 }} />
          </Field>
        </>
      )}
      {!liveBook && (
        <button className="small" onClick={add} disabled={from === 'design' && !!problem}>
          {label}
          {from === 'design' ? ` (level ${lv.level})` : ''}
        </button>
      )}
      {from === 'design' && problem && <span className="small warn-text">{problem}</span>}
    </div>
  );
}

/** On the sheet: the apprenticeship and the spells known. */
/** The gruagach's card, on the sheet only. Dice › Hedge magic names the spells in one line, with a link here. */
export function GruagachSheetCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d || !hasGruagach(c) || c.type === 'magus') return null;
  const budget = d.budgets.find((b) => b.id === GRUAGACH_APPRENTICESHIP);
  const spells = c.gruagach?.spells ?? [];
  const pi = pictish(c, d);
  const cap = gruagachArtCap(pi);
  const over = gruagachArts(c, d).techniques.concat(gruagachArts(c, d).forms).filter((a) => a.score > cap);
  const set = (fn: (x: Character) => void) => update(fn);
  return (
    <Card title="Gruagach" tour="gruagach-card" fold="gruagach-card" summary={`${spells.length} spell${spells.length === 1 ? '' : 's'} · Pictish ${pi}`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A gruagach&apos;s apprenticeship gives 160 experience points and 80 levels of spells to the Gifted (about ten years), or 16 points and 8 levels a year to the unGifted (three to five),
        in place of those later-life years. Pictish stands for Magic Theory and caps the Arts at {cap === Infinity ? 'nothing (Pictish 4)' : cap}. Spells are cast on the Game Table, Dice ›
        Hedge magic, and tattoos made in a season. A spell learned in a story is added here.
      </p>
      <div className="row">
        <Field label="Years of apprenticeship">
          <Stepper value={c.gruagach?.apprenticeYears ?? (d.hasGift ? 10 : 4)} min={0} max={Math.max(0, c.age - 5)} width={36} onChange={(v) => set((x) => void (x.gruagach = { ...(x.gruagach ?? {}), apprenticeYears: v }))} />
        </Field>
        {budget && (
          <span className="small">
            {budget.spent} of {budget.total} experience; {budget.spellLevels?.spent ?? 0} of {budget.spellLevels?.total ?? 0} levels of spells.
          </span>
        )}
      </div>
      {over.length > 0 && <p className="small warn-text">Above Pictish {pi}&apos;s cap of {cap}: {over.map((a) => `${a.name} ${a.score}`).join(', ')}.</p>}
      {spells.map((s) => (
        <div key={s.uid} className="row small" style={{ borderTop: '1px solid var(--line)', paddingTop: 4 }}>
          <b>{s.name}</b>
          <span>
            {s.tf} {s.level} · R: {s.range}, D: {s.duration}, T: {s.target}
          </span>
          <select value={s.source} aria-label="Where it was learned" onChange={(e) => set((x) => void (x.gruagach = { ...(x.gruagach ?? {}), spells: (x.gruagach?.spells ?? []).map((y) => (y.uid === s.uid ? { ...y, source: e.target.value as LearnedCharm['source'] } : y)) }))}>
            <option value="training">in apprenticeship</option>
            <option value="play">in play</option>
          </select>
          <button className="small ghost" aria-label="Remove the spell" onClick={() => set((x) => void (x.gruagach = { ...(x.gruagach ?? {}), spells: (x.gruagach?.spells ?? []).filter((y) => y.uid !== s.uid) }))}>
            ✕
          </button>
          {s.text && <div className="soft" style={{ flexBasis: '100%' }}>{s.text}</div>}
        </div>
      ))}
      {gruagachPairs(c, d).length === 0 ? (
        <p className="small warn-text">No Technique and Form of the gruagachan yet: take Give or Take, and a Form, on the sheet to design spells.</p>
      ) : (
      <SpellDesigner pairs={gruagachPairs(c, d)} label={c.creation.finalized ? 'Add one learned in play' : 'Add a spell known'} onAdd={(s) => set((x) => void (x.gruagach = { ...(x.gruagach ?? {}), spells: [...(x.gruagach?.spells ?? []), { ...s, source: x.creation.finalized ? 'play' : 'training' }] }))} />
      )}
    </Card>
  );
}

export function GruagachCastCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const known = c?.gruagach?.spells ?? [];
  const [mode, setMode] = useState<'formulaic' | 'spontaneous'>(known.length ? 'formulaic' : 'spontaneous');
  const [ki, setKi] = useState(0);
  const [shift, setShift] = useState(0);
  const [tf, setTf] = useState<GruagachArts>('GvBl');
  const [level, setLevel] = useState(10);
  const [vis, setVis] = useState(0);
  const [stressOn, setStressOn] = useState(true);
  const [justice, setJustice] = useState(2);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const pairs = gruagachPairs(c, d);
  if (!pairs.length) return null;
  const spell = known[Math.min(ki, known.length - 1)];
  const flex = gruagachFlex(c);
  const pair = (mode === 'formulaic' && spell ? spell.tf : pairs.includes(tf) ? tf : pairs[0]) as GruagachArts;
  const score = gruagachCastingScore(c, d, pair, aura, { spontaneous: mode === 'spontaneous' });
  // a varied parameter moves the level a magnitude at a time
  const varied = spell ? addMagnitudes(spell.level, shift) : 0;
  const targetLevel = mode === 'formulaic' ? varied : level;
  const pen = d.abilities.filter((x) => x.abilityId === 'penetration').reduce((m, x) => Math.max(m, x.total), 0);
  // a geas or a curse: how well its terms fit the story moves the victim's Stamina roll against it (HMRE, Poetic Justice)
  const binds = pair.endsWith('Cu') || (mode === 'formulaic' && !!spell && /geas/i.test(spell.duration));
  const pj = POETIC_JUSTICE[justice];
  const cast = () => {
    const stress = mode === 'spontaneous' || stressOn || vis > 0;
    const r = stress ? stressDie(1 + score.auraBotch + vis) : simpleDie();
    const botches = r.kind === 'stress' && r.zero ? r.botches : 0;
    const raw = score.total + r.value + 2 * vis;
    const total = mode === 'spontaneous' ? spontaneousTotal(score.total + 2 * vis, r.value) : raw;
    const out = [`${mode === 'formulaic' ? spell?.name : gruagachArtName(pair)} (${pair} ${targetLevel}): ${r.kind === 'stress' ? `stress die ${describeStress(r)}` : `simple die ${r.value}`} + ${score.total}${vis ? ` + ${2 * vis} vis` : ''}${mode === 'spontaneous' ? ` ÷ 2 = ${total}` : ` = ${total}`}.`];
    let fatigue = mode === 'spontaneous' ? 1 : 0;
    const points = botchWarpingPoints(pair, botches);
    if (botches) out.push(`BOTCH ×${botches}: a Blessing or Curse may turn on the wrong target or the wrong act, a Shape take the wrong form, a Vision foretell falsely; ${points} Warping Point${points === 1 ? '' : 's'}${points > botches ? ' (doubled for a Vision spell)' : ''}.`);
    else if (mode === 'spontaneous') out.push(total >= targetLevel ? `It works (a Fatigue level, as every spontaneous spell). Penetration ${Math.floor(total - targetLevel + pen)}.` : `Too weak for level ${targetLevel} (a Fatigue level spent).`);
    else {
      const o = charmOutcome(total, targetLevel);
      if (o !== 'works') fatigue = 1;
      out.push(o === 'works' ? `It works. Penetration ${total - targetLevel + pen}.` : o === 'fatigue' ? `It works, for a Fatigue level. Penetration ${Math.max(0, total - targetLevel + pen)}.` : 'It fails, for a Fatigue level.');
    }
    let avoid: string | undefined;
    if (botches && transformationFollows(c, points)) {
      const ws = warpingScoreFromPoints(c.warpingPoints + points);
      const t = transformationAvoid(d, ws, points, aura);
      const mine = stressDie(1);
      const theirs = stressDie(0, undefined, true);
      if (t.total + mine.value > t.against + theirs.value) avoid = `Transformation avoided (${t.total + mine.value} against ${t.against + theirs.value}).`;
      else {
        const u = stressDie(1);
        const u2 = stressDie(0, undefined, true);
        const good = understandingTransformation(d) + u.value >= ws + u2.value;
        avoid = `The Curse of Gruagach: the gruagach is transformed (${t.total + mine.value} against ${t.against + theirs.value}). Understanding it: ${understandingTransformation(d) + u.value} against ${ws + u2.value}. ${good ? TRANSFORMATION_GOOD : TRANSFORMATION_BAD}${ws >= 10 ? ' At Warping Score 10 the gruagach becomes a troll.' : ''}`;
      }
    }
    update((x) => {
      if (fatigue) x.fatigueLost = Math.min(5, x.fatigueLost + fatigue);
      // the Curse of Gruagach is rolled above, where the points came
      if (points) gainWarping(x, d, { points, why: 'from a gruagach spell', botch: botches > 0, handled: true, ...nowOf(ed.saga) });
    });
    if (avoid) out.push(avoid);
    if (binds && !botches) out.push(`The victim's Stamina roll to resist takes ${signed(pj.modifier)} (poetic justice: ${pj.text.toLowerCase()}).`);
    setLines(out);
  };
  return (
    <Card title="Cast a gruagach spell" tour="gruagach-cast" fold="gruagach-cast" summary={mode === 'formulaic' && spell ? `${spell.name}, ${spell.tf} ${spell.level}` : 'Spontaneous'}>
      <div className="row">
        <Field label="Cast">
          <select value={mode} onChange={(e) => setMode(e.target.value as 'formulaic' | 'spontaneous')}>
            <option value="formulaic" disabled={!known.length}>a spell known</option>
            <option value="spontaneous">spontaneously</option>
          </select>
        </Field>
        {mode === 'formulaic' && spell ? (
          <>
            <Field label="Spell" hint={spell.text}>
              <select value={ki} onChange={(e) => ((setKi(Number(e.target.value))), setShift(0))} style={{ maxWidth: 340 }}>
                {known.map((x, i) => (
                  <option key={x.uid} value={i}>{x.name} ({x.tf} {x.level})</option>
                ))}
              </select>
            </Field>
            <Field label="Varied by" hint={`One Range, Duration, Target or size, up to ${flex} magnitudes either way`}>
              <Stepper value={shift} min={-flex} max={flex} width={32} onChange={setShift} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Arts">
              <select value={pair} onChange={(e) => setTf(e.target.value as GruagachArts)}>
                {pairs.map((p) => (
                  <option key={p} value={p}>{gruagachArtName(p)}</option>
                ))}
              </select>
            </Field>
            <Field label="Level">
              <Stepper value={level} min={1} max={100} width={36} onChange={setLevel} />
            </Field>
          </>
        )}
        {mode === 'formulaic' && (
          <label className="inline small" title="A simple die out of stress: no botch">
            <input type="checkbox" checked={stressOn || vis > 0} disabled={vis > 0} onChange={(e) => setStressOn(e.target.checked)} /> stress die{vis > 0 ? ' (vis is spent)' : ''}
          </label>
        )}
        <Field label="Vis" hint="+2 a pawn, a botch die each, as for Hermetic magic. Take it from the purse by hand.">
          <Stepper value={vis} min={0} max={20} width={32} onChange={setVis} />
        </Field>
      </div>
      <p className="small">
        Casting Score <Total value={score.total} parts={score.parts} notes={score.notes} label="Casting Score" /> + {mode === 'spontaneous' ? 'stress die, ÷ 2,' : 'die'} against level {targetLevel}.
        {mode === 'formulaic' ? ' Within 10 below, it works for a Fatigue level.' : ' Spontaneous spells always cost a Fatigue level.'}
      </p>
      {binds && (
        <Field label="Poetic justice" hint="How well the geas or curse fits what the victim did: the troupe decides. It changes the victim's Stamina roll to resist.">
          <select value={justice} onChange={(e) => setJustice(Number(e.target.value))}>
            {POETIC_JUSTICE.map((x, i) => (
              <option key={x.modifier} value={i}>{signed(x.modifier)}: {x.text}</option>
            ))}
          </select>
        </Field>
      )}
      {score.notes.map((n) => (
        <p key={n} className="small warn-text">{n}</p>
      ))}
      <button onClick={cast} disabled={mode === 'formulaic' && !spell}>Cast</button>
      <Lines lines={lines} />
    </Card>
  );
}


/** A gruagach's season, on the Seasons page: a tattoo's vis from the purse or the covenant's stores, vis drawn put there. */
export function GruagachSeasonCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const sw = useSeasonWork(ed);
  // it opens on the first work they can do with the vis to hand: a tattoo within the Lab Total, a spell they progress on, vis (the card checklist)
  const [first] = useState(() => (c && d ? firstGruagachWork(c, d, aura, (arts) => Math.max(...Object.values(visInPlaces(c, sw.cov, arts)))) : undefined));
  const [work, setWork] = useState<GruagachWork>(first?.work ?? 'tattoo');
  const [effect, setEffect] = useState<LearnedCharm | undefined>();
  const [shape, setShape] = useState(GRUAGACH_SEASON_SET.shape);
  const [size, setSize] = useState(GRUAGACH_SEASON_SET.size);
  const [similar, setSimilar] = useState(GRUAGACH_SEASON_SET.similar);
  const [uses, setUses] = useState(GRUAGACH_SEASON_SET.uses);
  const [another, setAnother] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const src = useVisSource(c, sw.cov, effect ? tattooVisArts(effect.tf as GruagachArts) : []);
  const dest = useVisSource(c, sw.cov, ['Vi']);
  if (!c || !d) return null;
  const pairs = gruagachPairs(c, d);
  if (!pairs.length) return null;
  const inventing = c.gruagach?.inventing;
  // a spell under way is the one continued unless the player asks to invent another
  const continuing = work === 'invent' && !!inventing && !another;
  const chosen = continuing ? inventing!.spell : effect;
  const { year, season, busy } = sw;
  const pi = pictish(c, d);
  const gs = gruagachSeason(c, d, aura, work, work === 'tattoo' ? effect : chosen, { shape, size, uses, similar, have: src.have }, pairs);
  const { tf, lt, usesMod, tat, need, drawn } = gs;
  const under = inventing && chosen && inventing.spell.name === chosen.name && inventing.spell.level === chosen.level ? inventing : undefined;
  const plan = (): string => {
    if (work === 'vis') return `${gruagachExtraction(lt.total)} pawns of Vim vis from the aura (the Take Vision Lab Total ÷ 10); a season uses up to ${gruagachVisLimit(pi)} pawns (twice Pictish).`;
    if (work === 'tattoo') {
      if (!effect || !tat) return 'Design the effect first.';
      if (lt.total < 2 * tat.level) return `The Lab Total must be twice the level (${2 * tat.level}${usesMod ? `: ${effect.level} + ${usesMod} for ${uses} uses a day` : ''}); it allows up to level ${tat.maxLevel}.`;
      return `A tattoo of ${effect.name}, level ${tat.level}${usesMod ? ` (${effect.level} + ${usesMod} for ${uses} uses a day)` : ''}, up to ${tat.maxLevel}: a season and ${tat.vis} pawn${tat.vis === 1 ? '' : 's'} of vis. The tattoo, ${TATTOO_SIZES[size].name}, holds ${tat.capacity}.${tat.problems.length ? ` ${tat.problems.join(' ')}` : ''}`;
    }
    if (!chosen) return 'Design the effect first.';
    const gain = gs.gain;
    if (!gain) return `The Lab Total must beat the level (${chosen.level}).`;
    const have = under?.progress ?? 0;
    return `Inventing ${chosen.name}: +${gain} a season toward ${chosen.level}, as for a Hermetic spell${have ? ` (${have} so far, after ${under!.seasons} season${under!.seasons === 1 ? '' : 's'})` : ''}${have + gain >= chosen.level ? ': done this season' : ''}.`;
  };
  // why the season cannot be worked as set, said beside the button
  const why =
    busy ? `${season} ${year} is already spent.`
    : gs.blocked === 'design' ? 'Design the effect first.'
    : gs.blocked === 'tattoo' ? 'The tattoo cannot be made as designed (above).'
    : gs.blocked === 'no-gain' ? `The Lab Total must beat the level (${chosen?.level}).`
    : need ? src.short(need) : undefined;
  const doSeason = () =>
    setLines(
      sw.work(`Gruagach: ${work === 'tattoo' ? `a tattoo of ${effect?.name}` : work === 'invent' ? `inventing ${chosen?.name}` : 'vis from the aura'}`, tf.startsWith('Gv') ? 'gruagach-give' : 'gruagach-take', (x, cov) => {
        const out = [`${plan()} Lab Total ${lt.total}.`];
        if (need) {
          const r = spendFrom(x, cov, src.place, src.arts, need);
          if (!r.ok) return { lines: [], refused: r.text };
          out.push(r.text);
        }
        if (drawn) out.push(putInto(x, cov, dest.place, 'Vi', drawn));
        let made: string | undefined;
        if (work === 'tattoo' && effect && tat?.ok) {
          x.items.push({
            uid: uid(), name: `Tattoo: ${effect.name}`, kind: 'lesser', material: `dyes (${GRUAGACH_SHAPES[shape]?.shape ?? 'a design'})`, size: 'tiny', shapeMaterialIds: [], openedPawns: 0, attunements: [], creatorId: x.id,
            notes: `A gruagach tattoo (${gruagachArtName(effect.tf as GruagachArts)}), ${TATTOO_SIZES[size].name}: it is part of its bearer, Personal and Individual.`,
            effects: [{ uid: uid(), name: effect.name, technique: effect.tf.startsWith('Gv') ? 'Cr' : 'Pe', form: effect.tf.endsWith('Sh') ? 'An' : effect.tf.endsWith('Vs') ? 'Im' : 'Co', requisites: [], baseLevel: effect.level, range: 'Personal', duration: effect.duration, target: 'Individual', usesPerDay: uses, penetration: 0, concentration: false, effectUse: false, environmentalTrigger: false, fastTrigger: false, linkedTrigger: false, expiry: 'none', modifiedLevel: tat.level, description: effect.text }],
          });
          made = `a tattoo of ${effect.name}`;
        }
        if (work === 'invent' && chosen) {
          out[0] = `${gruagachInventSeason(x, lt.total, chosen)} Lab Total ${lt.total}.`;
          if (!x.gruagach?.inventing) made = `the spell ${chosen.name}`;
        }
        const told = gruagachTold(
          work === 'tattoo' ? { work, effect: effect?.name ?? 'power' }
          : work === 'invent' ? { work, spell: chosen?.name ?? 'a spell', done: !x.gruagach?.inventing }
          : { work: 'vis', pawns: drawn },
        );
        return { lines: out, made, told };
      }),
    );
  return (
    <Card title="A gruagach's season" tour="gruagach-season" fold="gruagach-season" summary="Tattoos, spells invented, vis drawn">
      <div className="row">
        <Field label="Work">
          <select value={work} onChange={(e) => setWork(e.target.value as GruagachWork)}>
            {!c.virtues.some((v) => v.defId === 'no-tattoo-magic-flaw') && <option value="tattoo">enchant a tattoo</option>}
            <option value="invent">invent a spell</option>
            {pairs.includes('TaVs') && <option value="vis">draw vis from the aura</option>}
          </select>
        </Field>
        {work === 'tattoo' && (
          <>
            <Field label="Shape" hint={GRUAGACH_SHAPES[shape]?.bonuses}>
              <select value={shape} onChange={(e) => setShape(Number(e.target.value))}>
                {GRUAGACH_SHAPES.map((s, i) => (
                  <option key={s.shape} value={i}>{s.shape}</option>
                ))}
              </select>
            </Field>
            <Field label="Size" hint="It holds 2 pawns of vis for each step of size">
              <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {TATTOO_SIZES.map((s, i) => (
                  <option key={s.name} value={i}>{s.name} (holds {2 * s.mult})</option>
                ))}
              </select>
            </Field>
            <Field label="Uses a day" hint="More uses add to the level, as for a lesser enchantment">
              <select value={uses} onChange={(e) => setUses(e.target.value)}>
                {FREQUENCY.filter((f) => f.value !== 'unlimited').map((f) => (
                  <option key={f.value} value={f.value}>{f.value} (+{f.mod})</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {work !== 'vis' && (
          <Field label="A similar spell's magnitude">
            <Stepper value={similar} min={0} max={10} width={32} onChange={setSimilar} />
          </Field>
        )}
      </div>
      {work !== 'vis' && !continuing && <SpellDesigner pairs={pairs} live label="Use this design" onAdd={setEffect} initial={first?.spell} />}
      {chosen && work !== 'vis' && <p className="small">Effect: <b>{chosen.name}</b>, {chosen.tf} {chosen.level}.</p>}
      {work === 'invent' && inventing && (
        <p className="small muted">
          Under way: <b>{inventing.spell.name}</b>, {inventing.progress} of {inventing.spell.level} after {inventing.seasons} season{inventing.seasons === 1 ? '' : 's'}.{' '}
          {continuing ? (
            <button className="small" onClick={() => setAnother(true)}>Invent another</button>
          ) : (
            <button className="small" onClick={() => setAnother(false)}>Continue it</button>
          )}{' '}
          <button className="small danger" onClick={() => update((x) => void (x.gruagach = { ...(x.gruagach ?? {}), inventing: undefined }))}>Abandon it</button>
        </p>
      )}
      {(work === 'tattoo' && effect) || work === 'vis' ? <div className="row">{work === 'vis' ? dest.node(true) : src.node()}</div> : null}
      <p className="small">
        Lab Total <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Lab Total" />. {plan()} {src.line(need)}
      </p>
      <button onClick={doSeason} disabled={!!why}>
        {work === 'tattoo' ? 'Enchant the tattoo' : work === 'invent' ? 'Invent' : 'Draw vis'} (a season)
      </button>
      {why && <span className="small muted"> {why}</span>}
      <Lines lines={lines} />
    </Card>
  );
}
