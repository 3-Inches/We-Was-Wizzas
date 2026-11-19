// Holy influence and tempers.

import { useState } from 'react';
import { TEMPERS } from '../../../data/divine';
import { divineAidBonus, influenceTotal, schism, temperName, type ActiveTemper, type CeremonyGroup } from '../../../engine/holy';
import { describeStress, simpleDie, stressDie } from '../../../engine/dice';
import { Card, Field, Total } from '../../kit';
import type { CharEditor } from '../../character/useChar';
import { score, type Fellow, useLines, Lines, spendPoint, CeremonyPicker } from './shared';

export function InfluenceCard({ ed, fellows }: { ed: CharEditor; fellows: Fellow[] }) {
  const { c, d, update, saga } = ed;
  const [mode, setMode] = useState<'influence' | 'temper'>('influence');
  const [how, setHow] = useState<'ceremonial' | 'personal'>('ceremonial');
  const [authority, setAuthority] = useState(false);
  const [trait, setTrait] = useState('Pious');
  const [temper, setTemper] = useState('calm');
  const [place, setPlace] = useState('');
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const total = influenceTotal(d, how === 'ceremonial' ? ceremony : undefined);
  const tempers: (ActiveTemper & { by: string; id: string })[] = fellows.flatMap((f) => (f.c.holy?.temper ? [{ ...f.c.holy.temper, by: f.c.name || 'Unnamed', id: f.c.id }] : []));
  const mine = c.holy?.temper;
  const allTempers = mine && !tempers.some((t) => t.id === c.id) ? [...tempers, { ...mine, by: c.name || 'Unnamed', id: c.id }] : tempers;
  const roll = () => {
    if (!authority) return show('Holy influence needs spiritual authority over those influenced (a priest’s parish, a parent’s child, a host’s guests…) or the Inspirational Virtue.');
    const out: string[] = [];
    if (how === 'ceremonial') {
      const spent = spendPoint(ed, 'confidence');
      if (!spent) return show('A ceremony needs a Confidence (or Faith) Point, and none is left.');
      out.push(`A short ceremony; ${spent} spent (it adds nothing).`);
    } else out.push('A season of good example, in word and deed.');
    const stress = mode === 'temper';
    const r = stress ? stressDie(1) : simpleDie();
    const v = 'botches' in r ? r.value : r.value;
    const tot = total.total + v;
    if (stress && 'botches' in r && r.botches) {
      out.push(`Stress die ${describeStress(r)}: BOTCH — Warping, Fatigue, or a bad reputation among the people.`);
      return show(out);
    }
    const bonus = divineAidBonus(tot);
    out.push(`${stress ? `Stress die ${describeStress(r as ReturnType<typeof stressDie>)}` : `Simple die ${v}`}: ${total.total} + ${v} = ${tot}.`);
    if (!bonus) out.push('No effect.');
    else if (mode === 'influence') out.push(`Those willing to listen gain ${trait} +${bonus}, fading in ${how === 'personal' ? 'about a year' : 'a week or so'} unless their deeds keep it.`);
    else {
      const where = place.trim() || ed.ctx.covenant?.name || 'the aura';
      const t: ActiveTemper = { temper, value: bonus, how, place: where, year: saga?.currentYear ?? 1220, season: saga?.currentSeason ?? 'Spring' };
      update((x) => void (x.holy = { ...(x.holy ?? {}), temper: t }));
      out.push(`${where} is tempered ${temperName(temper)} +${bonus}: added to every roll there that serves it, taken from those that run against it; −1 each ${how === 'ceremonial' ? 'day' : 'season'}.`);
    }
    show(out);
  };
  const tdef = TEMPERS.find((t) => t.id === temper)!;
  return (
    <Card title="Holy influence and tempers" tour="holy-influence" fold="holy-influence" summary={allTempers.length ? allTempers.map((t) => `${t.place}: ${temperName(t.temper)} +${t.value}`).join(' · ') : 'Presence + Leadership: a Personality Trait in the faithful, or a temper in the Dominion'}>
      <div className="row">
        <Field label="What">
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="influence">holy influence: a Personality Trait in followers (simple die)</option>
            <option value="temper">temper the Dominion (stress die)</option>
          </select>
        </Field>
        <Field label="How">
          <select value={how} onChange={(e) => setHow(e.target.value as typeof how)}>
            <option value="ceremonial">ceremonial: a short ceremony, a Confidence Point</option>
            <option value="personal">personal: a season of example</option>
          </select>
        </Field>
        {mode === 'influence' ? (
          <Field label="The trait">
            <input value={trait} onChange={(e) => setTrait(e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label="Temper" hint={`${tdef.text} Against ${tdef.vice}: ${tdef.negative.join(', ')}.`}>
              <select value={temper} onChange={(e) => setTemper(e.target.value)}>
                {TEMPERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (against {t.vice})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Where">
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={ed.ctx.covenant?.name ?? 'the parish church'} />
            </Field>
          </>
        )}
      </div>
      <label className="inline small">
        <input type="checkbox" checked={authority} onChange={(e) => setAuthority(e.target.checked)} /> has spiritual authority here (or Inspirational, for willing listeners)
      </label>
      {how === 'ceremonial' && <CeremonyPicker focus={d} fellows={fellows.filter((f) => f.c.id !== c.id)} value={ceremony} onChange={setCeremony} adds={(f) => f.d.characteristics.Pre.value + score(f.d, 'leadership')} />}
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} label="Presence + Leadership" /> + die: +1 at 9, +2 at 15, +3 at 24
        </span>
        <button onClick={roll}>{mode === 'influence' ? 'Influence' : 'Temper the aura'}</button>
      </div>
      <Lines lines={lines} />
      {allTempers.length > 0 && (
        <div className="small" data-tour="holy-tempers">
          <b>Tempers in the saga:</b>
          {allTempers.map((t) => (
            <div key={t.id} className="row tight">
              {t.place}: {temperName(t.temper)} +{t.value} ({t.how}, by {t.by})
              {t.id === c.id && (
                <>
                  <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), temper: x.holy?.temper && x.holy.temper.value > 1 ? { ...x.holy.temper, value: x.holy.temper.value - 1 } : undefined }))}>
                    a {t.how === 'ceremonial' ? 'day' : 'season'} passes (−1)
                  </button>
                </>
              )}
            </div>
          ))}
          {schism(allTempers).map((s) => (
            <div key={s} className="warn-text">
              {s}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
