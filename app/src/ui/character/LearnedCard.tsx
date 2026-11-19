// A learned magician's training and charms (Hedge Magic, Learned Magicians), kept on the sheet: the
// years under a master (30 experience points each, from the later-life years) and the charms known by
// heart, taken from the book's examples or designed from its guidelines. Casting, chartae and amulets
// are on the Game Table, Dice › Hedge magic.

import { useEffect, useState } from 'react';
import { hasLearnedMagic } from '../../engine/hedgeTraditions';
import { CHARM_PARAMS, DEVICE_PARAMS, learnedArtName, type LearnedArts } from '../../data/hedgeLearned';
import { LEARNED_CHARMS, LEARNED_GUIDELINES } from '../../data/learnedCharms';
import { LEARNED_TRAINING } from '../../engine/character/derive';
import { barredPair, charmXp, learnedArts, learnedLevel } from '../../engine/learnedMagic';
import type { Character, LearnedCharm } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper } from '../kit';
import type { CharEditor } from './useChar';


/** Someone the learned magicians' rules are for: a mathematicus, an Art of the tradition, or charms known. */
export { hasLearnedMagic };

/** The Technique and Form pairs this magician can use: not the one barred by Incompatible Hedge Arts. */
export function artPairs(c: Character, d: NonNullable<CharEditor['d']>): LearnedArts[] {
  const a = learnedArts(c, d);
  return a.techniques.flatMap((t) => a.forms.map((f) => `${t.abbr}${f.abbr}` as LearnedArts)).filter((p) => !barredPair(c, p));
}

/**
 * Design a charm from the book's examples or its guidelines; the result is handed back. With `live`, a
 * charm from the book is handed back as soon as it is chosen; only a design from a guideline, which has
 * several fields to fill first, waits for the button.
 */
export function CharmDesigner({ pairs, device, onAdd, label = 'Add the charm', live }: { pairs: LearnedArts[]; device?: boolean; onAdd: (ch: LearnedCharm) => void; label?: string; live?: boolean }) {
  const [from, setFrom] = useState<'book' | 'design'>('book');
  const [bi, setBi] = useState(0);
  const [tf, setTf] = useState<LearnedArts>(pairs[0] ?? 'TuFa');
  const [gi, setGi] = useState(0);
  const [base, setBase] = useState(1);
  const [range, setRange] = useState(device ? 'Touch' : 'Personal');
  const [duration, setDuration] = useState('Momentary');
  const [target, setTarget] = useState('Individual');
  const [extra, setExtra] = useState(0);
  const [name, setName] = useState('');
  const params = device ? DEVICE_PARAMS : CHARM_PARAMS;
  // a device takes only its own parameters: always Touch, and no Diameter
  const fits = (x: { range: string; duration: string; target: string }) => params.ranges.some((p) => p.name === x.range) && params.durations.some((p) => p.name === x.duration) && params.targets.some((p) => p.name === x.target);
  const book = LEARNED_CHARMS.filter((x) => pairs.includes(x.tf as LearnedArts) && !x.general && fits(x));
  const guides = LEARNED_GUIDELINES.filter((x) => x.tf === (pairs.includes(tf) ? tf : pairs[0]));
  const guide = guides[Math.min(gi, guides.length - 1)];
  const lv = learnedLevel(guide?.general ? base : (guide?.level ?? 1), { range, duration, target, extra }, !!device);
  const pick = book[Math.min(bi, book.length - 1)];
  const fromBook = () => pick && onAdd({ uid: uid(), name: pick.name, tf: pick.tf, level: pick.level, range: pick.range, duration: pick.duration, target: pick.target, text: pick.text, source: 'play' });
  const liveBook = !!live && from === 'book' && !!pick;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void (liveBook && fromBook()), [liveBook, pick?.name]);
  if (!pairs.length) return <p className="small warn-text">A Technique and a Form of the tradition are needed first.</p>;
  const add = () => {
    if (from === 'book' && pick) {
      fromBook();
      return;
    }
    const pair = pairs.includes(tf) ? tf : pairs[0];
    onAdd({ uid: uid(), name: name.trim() || `${learnedArtName(pair)} ${lv.level}`, tf: pair, level: lv.level, range, duration, target, text: guide ? `${guide.text} ${lv.design}` : lv.design, source: 'play' });
    setName('');
  };
  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <Field label="From">
        <select value={from} onChange={(e) => setFrom(e.target.value as 'book' | 'design')}>
          <option value="book" disabled={!book.length}>the book’s charms</option>
          <option value="design">a guideline</option>
        </select>
      </Field>
      {from === 'book' && book.length > 0 ? (
        <Field label="Charm" hint={pick?.text}>
          <select value={bi} onChange={(e) => setBi(Number(e.target.value))} style={{ maxWidth: 360 }}>
            {book.map((x, i) => (
              <option key={x.name} value={i}>
                {x.name} ({x.tf} {x.level})
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Arts">
            <select value={tf} onChange={(e) => ((setTf(e.target.value as LearnedArts)), setGi(0))}>
              {pairs.map((p) => (
                <option key={p} value={p}>{learnedArtName(p)}</option>
              ))}
            </select>
          </Field>
          <Field label="Guideline" hint={guide?.text}>
            <select value={gi} onChange={(e) => setGi(Number(e.target.value))} style={{ maxWidth: 380 }}>
              {guides.map((x, i) => (
                <option key={i} value={i}>
                  {x.general ? 'General' : `Level ${x.level}`}: {x.text.slice(0, 80)}
                  {x.text.length > 80 ? '…' : ''}
                </option>
              ))}
            </select>
          </Field>
          {guide?.general && (
            <Field label="Base level">
              <Stepper value={base} min={1} max={100} width={36} onChange={setBase} />
            </Field>
          )}
          {(
            [
              ['Range', range, setRange, params.ranges],
              ['Duration', duration, setDuration, params.durations],
              ['Target', target, setTarget, params.targets],
            ] as const
          ).map(([l, val, set, list]) => (
            <Field key={l} label={l}>
              <select value={val} onChange={(e) => set(e.target.value)}>
                {list.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name}{o.magnitude ? ` (+${o.magnitude})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Field label="More magnitudes" hint="Size, more senses, an intricate effect">
            <Stepper value={extra} min={0} max={10} width={32} onChange={setExtra} />
          </Field>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`level ${lv.level}`} style={{ width: 160 }} />
          </Field>
        </>
      )}
      {!liveBook && (
        <button className="small" onClick={add}>
          {label}
          {from === 'design' ? ` (level ${lv.level})` : ''}
        </button>
      )}
    </div>
  );
}

/** The learned magician's card, on the sheet only: the years under a master and the charms known. Dice › Hedge magic names the charms in one line, with a link here. */
export function LearnedCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d || !hasLearnedMagic(c) || c.type === 'magus') return null;
  const charms = c.learned?.charms ?? [];
  const budget = d.budgets.find((b) => b.id === LEARNED_TRAINING);
  const pairs = artPairs(c, d);
  const set = (fn: (x: Character) => void) => update(fn);
  const trainingLevels = charms.filter((x) => x.source === 'training').reduce((t, x) => t + x.level, 0);
  return (
    <Card title="Learned magic" tour="learned-card" fold="learned-card" summary={`${charms.length} charm${charms.length === 1 ? '' : 's'}${c.learned?.trainingYears ? ` · ${c.learned.trainingYears} years with a master` : ''}`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A learned magician (Hedge Magic) casts verbal charms from memory or reads them from a formulary, and writes chartae and amulets. Each year under a master gives 30 experience points,
        taken from the later-life years, for Academic and Arcane Abilities, the hedge Arts and charms (5 levels a point). Charms are cast and devices made on the Game Table, Dice › Hedge magic.
        A charm learned in a story is added here.
      </p>
      <div className="row">
        <Field label="Years under a master" hint="30 experience points a year; Skilled Master adds 50, Poorly Trained takes 50">
          <Stepper value={c.learned?.trainingYears ?? 0} min={0} max={Math.max(0, c.age - 5)} width={36} onChange={(v) => set((x) => void (x.learned = { ...(x.learned ?? {}), trainingYears: v }))} />
        </Field>
        {budget && (
          <span className="small">
            Training: {budget.spent} of {budget.total} experience spent{trainingLevels ? ` (charms ${trainingLevels} levels = ${charmXp(trainingLevels)})` : ''}.
          </span>
        )}
      </div>
      {charms.map((ch) => (
        <div key={ch.uid} className="row small" style={{ borderTop: '1px solid var(--line)', paddingTop: 4 }}>
          <b>{ch.name}</b>
          <span>
            {ch.tf} {ch.level} · R: {ch.range}, D: {ch.duration}, T: {ch.target}
          </span>
          <select
            value={ch.source}
            aria-label="Where it was learned"
            onChange={(e) => set((x) => void (x.learned = { ...(x.learned ?? {}), charms: (x.learned?.charms ?? []).map((y) => (y.uid === ch.uid ? { ...y, source: e.target.value as LearnedCharm['source'] } : y)) }))}
          >
            <option value="training">in training ({charmXp(ch.level)} xp)</option>
            <option value="play">in play</option>
          </select>
          <button className="small ghost" aria-label="Remove the charm" onClick={() => set((x) => void (x.learned = { ...(x.learned ?? {}), charms: (x.learned?.charms ?? []).filter((y) => y.uid !== ch.uid) }))}>
            ✕
          </button>
          {ch.text && <div className="soft" style={{ flexBasis: '100%' }}>{ch.text}</div>}
        </div>
      ))}
      <CharmDesigner
        pairs={pairs}
        label={c.creation.finalized ? 'Add one learned in play' : 'Add a charm known'}
        onAdd={(ch) => set((x) => void (x.learned = { ...(x.learned ?? {}), charms: [...(x.learned?.charms ?? []), { ...ch, source: x.creation.finalized ? 'play' : 'training' }] }))}
      />
    </Card>
  );
}
