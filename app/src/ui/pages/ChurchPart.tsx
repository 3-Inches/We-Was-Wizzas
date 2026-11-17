// The Church at the Game Table (Dice › Faith & miracles): Devotions to the saints and their Devotion
// Points; vigils, fasts, indulgences and the cross; a pilgrimage's Oppositional Elements; a
// contemplative mystic's Spiritual Path; and a monistic mystic's Revelation after Divine Ascent.

import { useState } from 'react';
import { SAINTS } from '../../data/divine';
import {
  DEVOTIONAL_PRACTICES, DEVOTION_GAINS, OPPOSITIONAL_ELEMENTS, PATH_TOTALS, PILGRIMAGE_AIMS, QUEST_COMPONENTS, contemplativeProblems, creationDevotionPoints, devotionScore,
  monisticIntegration, monisticRevelations, pathTarget, piousScore, pilgrimageProgress,
} from '../../engine/church';
import { describeStress, stressDie } from '../../engine/dice';
import type { Character } from '../../engine/types';
import { warpingScoreFromPoints } from '../../engine/xp';
import { uid } from '../../util/id';
import { Card, Field, Stepper } from '../kit';
import type { CharEditor } from '../character/useChar';

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

const CHRISTIAN_SAINTS = SAINTS.filter((s) => s.faith === 'christian');
const saintName = (id: string) => CHRISTIAN_SAINTS.find((s) => s.id === id)?.name ?? id;

function DevotionsCard({ ed }: { ed: CharEditor }) {
  const { c, update } = ed;
  const [pick, setPick] = useState(CHRISTIAN_SAINTS[0]?.id ?? 'mary');
  const [other, setOther] = useState('');
  const [gain, setGain] = useState(0);
  const [amount, setAmount] = useState(DEVOTION_GAINS[0].min);
  const [to, setTo] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  if (!c) return null;
  const devs = c.devotions ?? [];
  const pious = piousScore(c);
  const start = creationDevotionPoints(c);
  const g = DEVOTION_GAINS[gain];
  const target = devs.find((x) => x.uid === to) ?? devs[0];
  const set = (fn: (x: Character) => void) => update(fn);
  const add = () => {
    const saint = pick === 'other' ? other.trim() : pick;
    if (!saint || devs.some((x) => x.saint === saint)) return;
    set((x) => void (x.devotions = [...(x.devotions ?? []), { uid: uid(), saint, points: 0 }]));
  };
  const award = () => {
    if (!target) return;
    set((x) => void (x.devotions = (x.devotions ?? []).map((y) => (y.uid === target.uid ? { ...y, points: Math.max(0, y.points + amount) } : y))));
    setLines([`${saintName(target.saint)}: ${amount > 0 ? '+' : ''}${amount} Devotion Points (${g.label.toLowerCase()}), now ${Math.max(0, target.points + amount)}: Devotion ${devotionScore(Math.max(0, target.points + amount))}.`]);
  };
  return (
    <Card title="Devotion to the saints" tour="church-devotion" fold="church-devotion" summary={devs.length ? devs.map((x) => `${saintName(x.saint)} ${devotionScore(x.points)}`).join(', ') : 'No Devotions'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        From <i>The Church</i>. A Devotion rises like an Ability, on Devotion Points, never experience. Its score adds to invoking that saint (above), and a devoted character may invoke any saint
        they have a Devotion to. At creation a pious Christian has Devotion Points equal to Pious ({pious ? `${pious} here` : 'none here'}, the Minor Pious Flaw counting 3 and the Major 6), shared among
        as many saints at Devotion 0. The saint’s day must be kept each year, or at least 3 points are lost.
      </p>
      {devs.map((x) => (
        <div key={x.uid} className="row small" style={{ borderTop: '1px solid var(--line)', paddingTop: 4 }}>
          <b>{saintName(x.saint)}</b>
          <span>Devotion {devotionScore(x.points)}</span>
          <Field label="Devotion Points">
            <Stepper value={x.points} min={0} max={999} width={40} onChange={(v) => set((y) => void (y.devotions = (y.devotions ?? []).map((z) => (z.uid === x.uid ? { ...z, points: v } : z))))} />
          </Field>
          <button className="small ghost" aria-label="Remove the Devotion" onClick={() => set((y) => void (y.devotions = (y.devotions ?? []).filter((z) => z.uid !== x.uid)))}>
            ✕
          </button>
        </div>
      ))}
      {!c.creation.finalized && start > 0 && <p className="small">At creation: {start} saints and {start} Devotion Points to share ({devs.reduce((t, x) => t + x.points, 0)} given).</p>}
      <div className="row">
        <Field label="A Devotion to">
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            {CHRISTIAN_SAINTS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="other">another saint…</option>
          </select>
        </Field>
        {pick === 'other' && (
          <Field label="Saint">
            <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="a local saint" style={{ width: 150 }} />
          </Field>
        )}
        <button className="small" onClick={add}>Add</button>
      </div>
      {devs.length > 0 && (
        <div className="row">
          <Field label="Devotion Points for" hint={g.text}>
            <select value={gain} onChange={(e) => ((setGain(Number(e.target.value))), setAmount(DEVOTION_GAINS[Number(e.target.value)].min))} style={{ maxWidth: 300 }}>
              {DEVOTION_GAINS.map((x, i) => (
                <option key={x.id} value={i}>{x.label} ({x.min === x.max ? x.min : `${x.min} to ${x.max}`})</option>
              ))}
            </select>
          </Field>
          <Field label="Points">
            <Stepper value={amount} min={g.min} max={g.max} width={32} onChange={setAmount} />
          </Field>
          <Field label="To">
            <select value={target?.uid ?? ''} onChange={(e) => setTo(e.target.value)}>
              {devs.map((x) => (
                <option key={x.uid} value={x.uid}>{saintName(x.saint)}</option>
              ))}
            </select>
          </Field>
          <button className="small" onClick={award}>Record</button>
        </div>
      )}
      <details className="small">
        <summary>Vigils, fasts, indulgences and the cross</summary>
        {DEVOTIONAL_PRACTICES.map((p) => (
          <p key={p.id} style={{ margin: '2px 0' }}>
            <b>{p.label}:</b> {p.text}
          </p>
        ))}
      </details>
      <Lines lines={lines} />
    </Card>
  );
}

function PilgrimageCard({ ed }: { ed: CharEditor }) {
  const { c, update } = ed;
  const [aim, setAim] = useState(0);
  const [el, setEl] = useState(0);
  if (!c) return null;
  const p = c.pilgrimage;
  const set = (fn: (x: Character) => void) => update(fn);
  const prog = p ? pilgrimageProgress(p.overcome, p.target) : undefined;
  return (
    <Card title="A pilgrimage" tour="church-pilgrimage" fold="church-pilgrimage" summary={p && prog ? `${p.aim}: ${prog.total} of ${p.target}` : 'None under way'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A minor pilgrimage (Target Level 18) is a season and a story; a major one (30), several. The pilgrim must personally overcome Oppositional Elements worth at least the Target Level, avoid mortal sin,
        and confess on arrival. A Divine Supernatural Ability gained comes at 1, without the Gift’s penalty.
      </p>
      {!p ? (
        <div className="row">
          <Field label="Its aim">
            <select value={aim} onChange={(e) => setAim(Number(e.target.value))} style={{ maxWidth: 320 }}>
              {PILGRIMAGE_AIMS.map((a, i) => (
                <option key={a.label} value={i}>{a.label} ({a.target})</option>
              ))}
            </select>
          </Field>
          <button className="small" onClick={() => set((x) => void (x.pilgrimage = { aim: PILGRIMAGE_AIMS[aim].label, target: PILGRIMAGE_AIMS[aim].target, overcome: [] }))}>Set out</button>
        </div>
      ) : (
        <>
          <p className="small">
            <b>{p.aim}</b>: {prog!.total} of {p.target}
            {prog!.done ? ' — enough overcome: the aim is granted when the destination is reached.' : `, ${prog!.left} more to overcome.`}
          </p>
          {p.overcome.map((o, i) => (
            <div key={i} className="row small">
              <span>
                +{o.value} {o.label}
                {o.once ? ' (travel abroad counts once, the higher)' : ''}
              </span>
              <button className="small ghost" aria-label="Remove" onClick={() => set((x) => void (x.pilgrimage = { ...x.pilgrimage!, overcome: x.pilgrimage!.overcome.filter((_, j) => j !== i) }))}>
                ✕
              </button>
            </div>
          ))}
          <div className="row">
            <Field label="Overcome">
              <select value={el} onChange={(e) => setEl(Number(e.target.value))} style={{ maxWidth: 320 }}>
                {OPPOSITIONAL_ELEMENTS.map((x, i) => (
                  <option key={i} value={i}>+{x.value} {x.label}</option>
                ))}
              </select>
            </Field>
            <button className="small" onClick={() => set((x) => void (x.pilgrimage = { ...x.pilgrimage!, overcome: [...x.pilgrimage!.overcome, OPPOSITIONAL_ELEMENTS[el]] }))}>Add</button>
            <button className={prog!.done ? 'small' : 'small danger'} onClick={() => set((x) => void (x.pilgrimage = undefined))}>
              {prog!.done ? 'Done' : 'Abandon'}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

function MysticCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [rev, setRev] = useState(0);
  const [name, setName] = useState('');
  const [qc, setQc] = useState(0);
  const [gained, setGained] = useState(1);
  const [first, setFirst] = useState(true);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const sp = c.spiritualPath;
  const pious = piousScore(c);
  const problems = contemplativeProblems(c, d);
  const set = (fn: (x: Character) => void) => update(fn);
  const done = sp ? sp.components.reduce((t, x) => t + x.value, 0) : 0;
  const targetPts = sp ? pathTarget(sp.total, pious) : 0;
  const integrate = () => {
    const ws = warpingScoreFromPoints(c.warpingPoints);
    const mine = stressDie(1);
    const theirs = stressDie(0, undefined, true);
    const total = monisticIntegration(d) + mine.value;
    const ok = !mine.botches && total >= ws + theirs.value;
    setLines([
      `Integrating the Revelation: Intelligence + Concentration ${monisticIntegration(d)} + ${describeStress(mine)} = ${total} against Warping Score ${ws} + ${theirs.value}.`,
      ok
        ? (() => {
            const r = monisticRevelations(gained, first);
            return r.length > 1 ? `Integrated. Choose one: ${r.join(' / ')}` : `Integrated: ${r[0]}`;
          })()
        : 'Not integrated: Divine Gloom as usual, so each Warping Point also moves an experience point from a mundane Ability to Dominion Lore or a Holy Ability.',
    ]);
  };
  return (
    <Card title="The mystic’s path" tour="church-mystic" fold="church-mystic" summary={sp ? `${sp.revelation}: ${done} of ${targetPts}` : 'Contemplative and monistic mysticism'}>
      <h4 style={{ marginTop: 0 }}>Contemplative: a Spiritual Path</h4>
      <p className="small muted">
        Quest Components worth the Path Target (the Path Total less Pious {pious}) reveal the path to a Revelation.{' '}
        {problems.length ? <span className="warn-text">Needs {problems.join(' and ')}, and no sinful Personality Traits.</span> : 'Needs no sinful Personality Traits.'} Warping brings Divine Form.
      </p>
      {!sp ? (
        <div className="row">
          <Field label="The Revelation">
            <select value={rev} onChange={(e) => setRev(Number(e.target.value))}>
              {PATH_TOTALS.map((p, i) => (
                <option key={p.total} value={i}>{p.label} ({p.total})</option>
              ))}
            </select>
          </Field>
          <Field label="Which">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sense Holy and Unholy" style={{ width: 170 }} />
          </Field>
          <button className="small" onClick={() => set((x) => void (x.spiritualPath = { revelation: name.trim() || PATH_TOTALS[rev].label, total: PATH_TOTALS[rev].total, components: [] }))}>Begin the path</button>
        </div>
      ) : (
        <>
          <p className="small">
            <b>{sp.revelation}</b>: {done} of {targetPts} (Path Total {sp.total} − Pious {pious}){done >= targetPts ? ' — the Revelation is gained (a Divine Ability at 1, without the Gift’s penalty).' : '.'}
          </p>
          {sp.components.map((x, i) => (
            <div key={i} className="row small">
              <span>+{x.value} {x.label}</span>
              <button className="small ghost" aria-label="Remove" onClick={() => set((y) => void (y.spiritualPath = { ...y.spiritualPath!, components: y.spiritualPath!.components.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          <div className="row">
            <Field label="Quest Component">
              <select value={qc} onChange={(e) => setQc(Number(e.target.value))} style={{ maxWidth: 320 }}>
                {QUEST_COMPONENTS.map((x, i) => (
                  <option key={i} value={i}>+{x.value} {x.label}</option>
                ))}
              </select>
            </Field>
            <button className="small" onClick={() => set((y) => void (y.spiritualPath = { ...y.spiritualPath!, components: [...y.spiritualPath!.components, QUEST_COMPONENTS[qc]] }))}>Add</button>
            <button className={done >= targetPts ? 'small' : 'small danger'} onClick={() => set((y) => void (y.spiritualPath = undefined))}>{done >= targetPts ? 'Done' : 'Abandon'}</button>
          </div>
        </>
      )}
      <h4>Monistic: a Revelation after Divine Ascent</h4>
      <p className="small muted">
        <b>Divine Ascent</b> is a Divine character&apos;s Warping experience, as Twilight is a magus&apos;s; for a monistic mystic it brings <b>Divine Gloom</b>, which trades mundane
        knowledge for holy. Needs Visions or True Faith and a positive Pious. A single Warping Point brings Divine Ascent (as Twilight Prone), and practicing a Holy Ability gives experience equal to Concentration, not 4.
      </p>
      <div className="row">
        <Field label="Warping Points gained">
          <Stepper value={gained} min={1} max={20} width={30} onChange={setGained} />
        </Field>
        <label className="small">
          <input type="checkbox" checked={first} onChange={(e) => setFirst(e.target.checked)} /> The first Revelation
        </label>
        <button onClick={integrate}>Integrate it</button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

export function ChurchCards({ ed }: { ed: CharEditor }) {
  return (
    <>
      <DevotionsCard ed={ed} />
      <PilgrimageCard ed={ed} />
      <MysticCard ed={ed} />
    </>
  );
}
