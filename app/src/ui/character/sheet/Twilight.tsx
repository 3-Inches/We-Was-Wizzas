// Warping and Wizard's Twilight (DE Warping, Wizard's Twilight): avoiding it, comprehending it, its
// time and its effects, with Twilight Prone, Twilight Mastery and Enigmatic Wisdom.

import { useState } from 'react';
import { ARTS, ART_NAMES, type Art } from '../../../data';
import { addVirtue } from '../../../engine/character/factory';
import { twilightAvoidance, twilightComprehension, twilightEffects, twilightTriggered, warpingScoreWith, type TwilightEffect } from '../../../engine/longterm';
import { Card, Field, Stepper } from '../../kit';
import type { CharEditor } from '../useChar';

/** Adds (or takes away) play experience, never below none at all. */
function shiftXp(alloc: Partial<Record<string, number>>, xp: number) {
  const other = Object.entries(alloc).reduce((t, [k, v]) => (k === 'play' ? t : t + (v ?? 0)), 0);
  alloc.play = Math.max(-other, (alloc.play ?? 0) + xp);
}

type Stage = { kind: 'idle' } | { kind: 'entered'; gained: number } | { kind: 'outcome'; gained: number; comprehended: boolean; extra: number; duration: string };

export function TwilightCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, ctx } = ed;
  const [gain, setGain] = useState(2);
  const [added, setAdded] = useState(false);
  const [text, setText] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [effect, setEffect] = useState<TwilightEffect | ''>('');
  const [target, setTarget] = useState('art:Vi');
  const [vfId, setVfId] = useState('');
  const [scar, setScar] = useState('');
  if (!c || !d) return null;
  const aura = ctx.aura.realm === 'Magic' ? ctx.aura.strength : 0;
  const log = (s: string) => setText((t) => [s, ...t].slice(0, 20));
  const ew = d.abilities.find((a) => a.abilityId === 'enigmatic-wisdom');
  const score = warpingScoreWith(d, gain, added);

  const avoid = () => {
    const r = twilightAvoidance(d, gain, aura, undefined, added);
    log(`Avoid Twilight: ${r.my} vs ${r.tw}: ${r.success ? 'avoided; two minutes to bring the magic under control' : r.botch ? 'BOTCH: enters Twilight and cannot comprehend it' : 'enters Twilight'}. ${r.detail}`);
    if (!r.success) setStage({ kind: 'entered', gained: gain });
    if (r.botch) setStage({ kind: 'outcome', gained: gain, comprehended: false, extra: 0, duration: '' });
  };
  const comprehend = (gained: number) => {
    const r = twilightComprehension(d, gained, undefined, added);
    log(`Comprehend Twilight: ${r.my} vs ${r.tw}: ${r.success ? 'comprehended (good effects)' : r.botch ? 'BOTCH: longer, and bad effects' : 'not comprehended (bad effects)'}. Time in the world: ${r.duration}. ${r.detail}`);
    setStage({ kind: 'outcome', gained, comprehended: r.success, extra: r.extraWarping, duration: r.duration });
    setEffect('');
  };
  const apply = () => {
    if (stage.kind !== 'outcome') return;
    const total = stage.gained + stage.extra;
    const [kind, id] = target.split(':');
    update((x) => {
      x.warpingPoints += (added ? 0 : stage.gained) + stage.extra;
      const xp = effect === 'knowledge' ? 2 * total : effect === 'lost-knowledge' ? -2 * total : 0;
      if (xp && kind === 'art') shiftXp((x.arts[id as Art] ??= {}), xp);
      else if (xp && kind === 'ability') {
        const ab = x.abilities.find((y) => y.abilityId === id);
        if (ab) shiftXp(ab.xp, xp);
      }
      if ((effect === 'virtue' || effect === 'flaw') && vfId) {
        const size = effect === 'virtue' ? (total > 10 ? 'Major' : 'Minor') : total >= 10 ? 'Major' : 'Minor';
        addVirtue(x, data, vfId, size, undefined, { free: true, freeReason: 'Twilight' });
      }
      if (scar.trim()) x.twilightScars = [...x.twilightScars.filter(Boolean), scar.trim()];
    });
    log(`Twilight over: +${(added ? 0 : stage.gained) + stage.extra} Warping Points (${stage.extra} from the simple die). ${effect ? `Effect: ${twilightEffects(stage.comprehended, total).find((e) => e.id === effect)?.label}.` : ''}`);
    setStage({ kind: 'idle' });
    setScar('');
    setVfId('');
  };

  const total = stage.kind === 'outcome' ? stage.gained + stage.extra : 0;
  const choices = stage.kind === 'outcome' ? twilightEffects(stage.comprehended, total).filter((e) => e.ok) : [];
  const vfList = data.virtuesFlaws.filter((v) => v.kind === (effect === 'flaw' ? 'flaw' : 'virtue') && (v.categories.includes('Hermetic') || v.categories.includes('Supernatural')));

  return (
    <Card title="Warping & Twilight">
      <div className="row">
        <div className="stat">
          <span className="v">
            {d.warpingScore} ({d.warpingPoints})
          </span>
          <span className="l">Warping</span>
        </div>
        <Field label="Warping points">
          <Stepper value={c.warpingPoints} min={0} width={46} onChange={(v) => update((x) => void (x.warpingPoints = v))} />
        </Field>
        {d.twilightProne && <span className="badge bad">Twilight Prone: checks on a single Warping Point</span>}
        {d.twilightMastery && <span className="badge good">Twilight Mastery: you choose the effects</span>}
      </div>
      {(d.isMagus || d.hasGift) && (
        <>
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Warping Points from this event">
              <Stepper value={gain} min={0} width={36} onChange={setGain} />
            </Field>
            <label className="inline small" title="The casting roller adds the points from a botch for you">
              <input type="checkbox" checked={added} onChange={(e) => setAdded(e.target.checked)} /> already added to the total
            </label>
            <span className="small muted">
              Warping Score for the rolls: {score}.{' '}
              {twilightTriggered(d, gain) ? 'This calls for a Twilight check.' : d.twilightProne ? 'No check needed.' : 'No check needed (two or more points at once).'}
            </span>
          </div>
          <div className="row">
            <button className="small" onClick={avoid}>
              Try to avoid Twilight
            </button>
            <button className="small" onClick={() => setStage({ kind: 'entered', gained: gain })} title="Choosing not to resist: no roll, straight into Twilight">
              Enter willingly
            </button>
            {stage.kind === 'entered' && (
              <button className="small primary" onClick={() => comprehend(stage.gained)}>
                Roll to comprehend
              </button>
            )}
          </div>
          {stage.kind === 'outcome' && (
            <div className="stack" style={{ marginTop: 6 }}>
              <div className="small">
                {stage.comprehended ? 'Comprehended: a good effect and a beneficial Twilight Scar.' : 'Not comprehended: a bad effect and an annoying Twilight Scar.'} The simple die adds {stage.extra}{' '}
                Warping Points: {total} gained in all. {d.twilightMastery ? 'Twilight Mastery: you choose the effect.' : 'The storyguide chooses the effect.'}
              </div>
              <div className="row">
                <Field label="Effect">
                  <select value={effect} onChange={(e) => setEffect(e.target.value as TwilightEffect)}>
                    <option value="">— choose —</option>
                    {choices.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {(effect === 'knowledge' || effect === 'lost-knowledge') && (
                  <Field label="In">
                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                      {ARTS.map((a) => (
                        <option key={a} value={`art:${a}`}>
                          {ART_NAMES[a]}
                        </option>
                      ))}
                      <option value="ability:magic-theory">Magic Theory</option>
                      {ew && <option value="ability:enigmatic-wisdom">Enigmatic Wisdom</option>}
                    </select>
                  </Field>
                )}
                {(effect === 'virtue' || effect === 'flaw') && (
                  <Field label={effect === 'virtue' ? 'Virtue gained' : 'Flaw gained'}>
                    <select value={vfId} onChange={(e) => setVfId(e.target.value)}>
                      <option value="">— choose —</option>
                      {vfList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.sizes.join('/')})
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
              <Field label="Twilight Scar">
                <input value={scar} placeholder={stage.comprehended ? 'e.g. a faint smell of roses follows her' : 'e.g. her footprints crack stone'} onChange={(e) => setScar(e.target.value)} />
              </Field>
              <div className="row">
                <button className="small primary" onClick={apply}>
                  Apply the Twilight
                </button>
                <span className="small muted">Adds the Warping Points, the chosen effect and the scar. Spells gained or lost: add or remove them on the Spells list.</span>
              </div>
            </div>
          )}
          <p className="small muted">
            Avoiding: Stamina + Concentration + Vim/5 + stress die vs Warping Score + points gained + Enigmatic Wisdom + aura + stress die. Comprehending: Intelligence + Enigmatic Wisdom +
            stress die vs Warping Score + stress die, with 1 + points gained botch dice (DE Wizard&apos;s Twilight).
            {d.twilightMastery ? ' Twilight Mastery: once a day your touch gives a being 2 Warping Points (Penetration +5); a magus touched must check for Twilight.' : ''}
          </p>
        </>
      )}
      {text.map((t, i) => (
        <div key={i} className="small list-row">
          {t}
        </div>
      ))}
      <Field label="Twilight scars & effects">
        <textarea rows={3} value={c.twilightScars.join('\n')} onChange={(e) => update((x) => void (x.twilightScars = e.target.value.split('\n')))} />
      </Field>
    </Card>
  );
}
