// The saints and holy forbears.

import { useState } from 'react';
import { FORBEAR_INVOCATION_MODS, SAINTS, SAINT_INVOCATION_MODS, SAINT_THREAT_MODS, SAINT_TIERS, type Saint } from '../../../data/divine';
import { invokeSaintTotal, saintMightLeft, saintPower, threatEase, threatenSaintTotal, threatResult, threatText } from '../../../engine/holy';
import { describeStress, simpleDie, stressDie } from '../../../engine/dice';
import type { AuraState, Part } from '../../../engine/magic';
import { Card, Field, Stepper, Total, signed } from '../../kit';
import type { CharEditor } from '../../character/useChar';
import { ModList, modParts } from '../holyMods';
import { devotionScore, relicDevotionBonus } from '../../../engine/church';
import { useLines, Lines } from './shared';

export function SaintsCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const [sid, setSid] = useState('martin');
  const [own, setOwn] = useState({ name: 'a local saint', might: 25 });
  const [mods, setMods] = useState<Record<string, number>>({});
  const [threatMods, setThreatMods] = useState<Record<string, number>>({});
  const [trait, setTrait] = useState(0);
  const [relic, setRelic] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const [lines, show] = useLines();
  const [hidden, setHidden] = useState<number | null>(null);
  if (!c || !d) return null;
  const saint: Saint = sid === 'own' ? { id: 'own', name: own.name, faith: 'christian', might: own.might, where: '', powers: [] } : SAINTS.find((s) => s.id === sid)!;
  const muslim = saint.faith === 'muslim';
  const list = muslim ? FORBEAR_INVOCATION_MODS : SAINT_INVOCATION_MODS;
  // Devotion to this saint, and a relic of the saint (The Church)
  const dev = (c.devotions ?? []).find((x) => x.saint === saint.id || x.saint.toLowerCase() === saint.name.toLowerCase());
  const devParts: Part[] = [
    ...(dev ? [{ label: `Devotion to ${saint.name} (${dev.points} Devotion Points)`, value: devotionScore(dev.points) }] : []),
    ...(!muslim && relic ? [{ label: `A relic of the saint (${relic} Faith Points × 2, once a day)`, value: relicDevotionBonus(relic) }] : []),
  ];
  const total = invokeSaintTotal(d, saint, { aura, mods: [...modParts(list, mods), ...devParts], muslimTrait: muslim ? trait : undefined });
  const threat = threatenSaintTotal(d, modParts(SAINT_THREAT_MODS, threatMods));
  const silent = c.holy?.silent?.[saint.id];
  const left = saintMightLeft(saint, used[saint.id] ?? []);
  const invoke = () => {
    const mine = simpleDie().value;
    const theirs = simpleDie().value;
    setHidden(theirs);
    const tot = total.total + mine;
    const ok = !silent && tot >= 15 + theirs;
    setAnswered(ok ? saint.id : null);
    setRefused(ok || muslim ? null : saint.id);
    show([
      `${muslim ? 'Seeking the baraka of' : 'Invoking'} ${saint.name}: ${total.total} + ${mine} = ${tot}, against 15 + the storyguide’s unseen die.`,
      silent ? `${saint.name} will not answer for ${silent}.` : ok ? `${saint.name} answers with a miracle: choose one of its powers below.` : `No answer today.${muslim ? '' : ' Try again tomorrow, or threaten the saint.'}`,
    ]);
  };
  const doThreat = () => {
    const r = stressDie(1);
    const tot = threat.total + r.value;
    const res = threatResult(tot, saint, r.botches > 0);
    show([`Threatening ${saint.name}: ${threat.total} + ${describeStress(r)} = ${tot} against ${threatEase(saint)}.`, threatText(res, saint)]);
    setRefused(null);
    if (res === 'granted') setAnswered(saint.id);
    if (res !== 'granted') update((x) => void (x.holy = { ...(x.holy ?? {}), silent: { ...(x.holy?.silent ?? {}), [saint.id]: res === 'annoyed' ? 'a month' : 'a season' } }));
  };
  const grant = (name: string) => {
    const pw = saintPower(name);
    if (!pw) return;
    if (pw.cost > left) return show(`${name} costs ${pw.cost} Might; ${saint.name} has ${left} left until dawn.`);
    setUsed((u) => ({ ...u, [saint.id]: [...(u[saint.id] ?? []), name] }));
    setAnswered(null);
    show(`${saint.name}: ${name} (${pw.cost} Might, Initiative ${signed(pw.init)}, ${pw.form}). ${pw.text}`);
  };
  return (
    <Card title="The saints and holy forbears" tour="holy-saints" fold="holy-saints" summary="Communication + Charm + modifiers + simple die, against 15 + the storyguide’s unseen die">
      <div className="row">
        <Field label="Whom" hint={saint.where ? `${saint.faith === 'muslim' ? 'Baraka at' : 'Venerated'}: ${saint.where}` : 'A saint of the troupe’s making'}>
          <select value={sid} onChange={(e) => (setSid(e.target.value), setMods({}), setAnswered(null), setRefused(null))}>
            <optgroup label="Christian saints">
              {SAINTS.filter((s) => s.faith === 'christian').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Might {s.might})
                </option>
              ))}
              <option value="own">a saint of your own…</option>
            </optgroup>
            <optgroup label="Muslim holy forbears">
              {SAINTS.filter((s) => s.faith === 'muslim').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Might {s.might})
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        {sid === 'own' && (
          <>
            <Field label="Name">
              <input value={own.name} onChange={(e) => setOwn({ ...own, name: e.target.value })} />
            </Field>
            <Field label="Kind">
              <select value={own.might} onChange={(e) => setOwn({ ...own, might: Number(e.target.value) })}>
                {SAINT_TIERS.map((t) => (
                  <option key={t.might} value={t.might}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {!muslim && (
          <Field label="A relic of the saint (Faith Points)" hint="+2 a Faith Point to the Devotion Total, once a day; no −15 for an unfamiliar saint">
            <Stepper value={relic} min={0} max={10} width={30} onChange={setRelic} />
          </Field>
        )}
        {muslim && (
          <Field label="Highest Muslim Personality Trait">
            <Stepper value={trait} min={0} max={6} width={34} onChange={setTrait} />
          </Field>
        )}
      </div>
      <ModList mods={list} value={mods} onChange={setMods} />
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label="Invocation" /> + simple die
        </span>
        <button onClick={invoke} data-tour="holy-invoke-saint">
          {muslim ? 'Seek baraka' : 'Invoke the saint'}
        </button>
        <span className="small muted">Might left today: {left}</span>
        {hidden !== null && (
          <details className="small">
            <summary>the storyguide’s die</summary>
            {hidden}: needed {15 + hidden}
          </details>
        )}
      </div>
      {answered === saint.id && saint.powers.length > 0 && (
        <div className="row small" style={{ flexWrap: 'wrap' }}>
          {saint.powers.map((n) => {
            const pw = saintPower(n);
            return (
              <button key={n} className="small" title={pw?.text} disabled={!pw || pw.cost > left} onClick={() => grant(n)}>
                {n} ({pw?.cost ?? '?'})
              </button>
            );
          })}
        </div>
      )}
      {refused === saint.id && !muslim && (
        <details className="small" data-tour="holy-threaten">
          <summary>Threaten {saint.name} (the humiliation of a saint)</summary>
          <ModList mods={SAINT_THREAT_MODS} value={threatMods} onChange={setThreatMods} />
          <div className="row">
            <span>
              Presence + Leadership <Total value={threat.total} parts={threat.parts} notes={threat.notes} label="Threat" /> + stress die against {threatEase(saint)}
            </span>
            <button className="small warn" onClick={doThreat}>
              Threaten
            </button>
          </div>
        </details>
      )}
      <Lines lines={lines} />
    </Card>
  );
}
