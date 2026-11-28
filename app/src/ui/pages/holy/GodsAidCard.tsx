// God's aid.

import { useState } from 'react';
import { canInvokeGodsAid, divineAidBonus, godsAidTotal, type CeremonyGroup } from '../../../engine/holy';
import { botchDiceOf, describeStress, stressDie } from '../../../engine/dice';
import { Card, Field, Total } from '../../kit';
import type { CharEditor } from '../../character/useChar';
import { score, type Fellow, useLines, Lines, spendPoint, CeremonyPicker } from './shared';

export function GodsAidCard({ ed, fellows }: { ed: CharEditor; fellows: Fellow[] }) {
  const { c, d, update } = ed;
  const [objective, setObjective] = useState('');
  const [group, setGroup] = useState(false);
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const can = canInvokeGodsAid(c, d);
  const total = godsAidTotal(d, group ? ceremony : undefined);
  const aid = c.holy?.aid;
  const invoke = () => {
    const spent = spendPoint(ed, d.trueFaith > 0 && d.faithPoints > 0 && c.confidence.points < 1 ? 'faith' : 'confidence');
    if (!spent) return show(can.why ?? 'Nothing to spend.');
    // a zero is checked with at least three botch dice: divine wrath for presumption
    const r = stressDie(botchDiceOf(total));
    const tot = total.total + r.value;
    const bonus = r.botches ? 0 : divineAidBonus(tot);
    const what = objective.trim() || 'the venture';
    const out = [`A simple prayer aloud; ${spent} spent. Stress die ${describeStress(r)}: ${total.total} + ${r.value} = ${tot}.`];
    if (r.botches) out.push(`BOTCH (${r.botches}): divine displeasure — struck dumb or blind, clumsy or slow, until penance is done.`);
    else if (bonus) out.push(`God’s aid: +${bonus} to every roll that clearly serves ${what} this scene${group ? ', for the followers too' : ''}, until a roll fails.`);
    else out.push('No aid this time.');
    if (bonus) update((x) => void (x.holy = { ...(x.holy ?? {}), aid: { bonus, objective: what } }));
    show(out);
  };
  return (
    <Card title="Invoke God’s aid" tour="holy-aid" fold="holy-aid" summary={aid ? `+${aid.bonus} for ${aid.objective}` : 'Communication + Dominion Lore + stress die: +1 at 9, +2 at 15, +3 at 24'}>
      {aid && (
        <p className="small ok">
          God’s aid: <b>+{aid.bonus}</b> for {aid.objective} (the Roll on the Dice page adds it).{' '}
          <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), aid: undefined }))}>
            A roll failed, or the scene ended
          </button>
        </p>
      )}
      <div className="row">
        <Field label="For what" hint="In warfare only against the infidel, the heretic, or a non-Divine supernatural menace">
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="the duel with the knight" />
        </Field>
        <label className="inline small" title="With spiritual authority over them: the followers receive the bonus too, and the leader. A trained group adds the highest bonus to its group bonus.">
          <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} /> for a group of followers
        </label>
      </div>
      {group && <CeremonyPicker focus={d} fellows={fellows} value={ceremony} onChange={setCeremony} adds={(f) => f.d.characteristics.Com.value + score(f.d, 'dominion-lore')} />}
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label="God’s aid" /> + stress die
        </span>
        <button onClick={invoke} disabled={!can.ok} title={can.why}>
          Invoke God’s aid
        </button>
        {!can.ok && <span className="small muted">{can.why}</span>}
      </div>
      <Lines lines={lines} />
    </Card>
  );
}
