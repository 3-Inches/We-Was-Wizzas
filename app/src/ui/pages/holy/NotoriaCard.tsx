// The Rings of Solomon.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { R } from '../../routes';
import { ARS_NOTORIA_MODS, SOLOMON_RINGS } from '../../../data/divine';
import { recitationParts, ringUntil } from '../../../engine/holy';
import { describeStress, stressDie } from '../../../engine/dice';
import { ensureAbility } from '../../../engine/character/factory';
import { Card, Field, Stepper, Total } from '../../kit';
import type { CharEditor } from '../../character/useChar';
import { ModList, modParts } from '../holyMods';
import { score, sum, useLines, Lines } from './shared';

/** The Rings of Solomon recited in play: a known ring, in 10 − Ars Notoria days. A ring's first recitation takes a season, on the Seasons page. */
export function NotoriaCard({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga } = ed;
  const [ring, setRing] = useState(1);
  const [seasons, setSeasons] = useState(1);
  const [mods, setMods] = useState<Record<string, number>>({});
  const [disease, setDisease] = useState('plague');
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const n = c.holy?.notoria;
  const learned = n?.learned ?? 0;
  const active = n?.active;
  const r = SOLOMON_RINGS.find((x) => x.ring === Math.max(1, Math.min(ring, learned)))!;
  const ease = 3 + 3 * r.ring + seasons;
  const season = saga?.currentSeason ?? 'Spring';
  const year = saga?.currentYear ?? 1220;
  const parts = recitationParts(d, modParts(ARS_NOTORIA_MODS, mods));
  const recite = () => {
    const die = stressDie(1);
    const tot = sum(parts) + die.value;
    const out = [`${r.name} of Solomon (known: ${Math.max(1, 10 - score(d, 'ars-notoria'))} days): ${sum(parts)} + ${describeStress(die)} = ${die.botches ? 'BOTCH' : tot} against ${ease}.`];
    if (die.botches) out.push('Deemed unworthy: the storyguide may take experience in Ars Notoria (as many as the Ease Factor), give a Minor Flaw until atoned, end the benefits, or forbid orations for a while.');
    else if (tot >= ease) {
      const until = ringUntil(year, season, seasons);
      update((x) => {
        x.holy = { ...(x.holy ?? {}), notoria: { learned, active: { ring: r.ring, ...until, ...(r.ring === 3 ? { disease } : {}) } } };
        if (r.xp) ensureAbility(x, r.xp.ability);
      });
      out.push(`It works until the end of ${until.untilSeason} ${until.untilYear}: ${r.text}${r.ring === 3 ? ` (the disease: ${disease})` : ''}`);
    } else out.push('It fails; it may be tried again next season.');
    show(out);
  };
  const seasonsLink = saga && learned < SOLOMON_RINGS.length && (
    <>
      {' '}A ring&apos;s first recitation takes a season:{' '}
      <Link to={R.seasonsFor(saga.id, c.id, 'holy-seasons')}>Game Table › Seasons, Seasons of devotion ›</Link>
    </>
  );
  return (
    <Card title="Ars Notoria: the Rings of Solomon" tour="holy-notoria" fold="holy-notoria" summary={active ? `the ${SOLOMON_RINGS[active.ring - 1].name} in effect to ${active.untilSeason} ${active.untilYear}` : `${learned} ring${learned === 1 ? '' : 's'} learned`}>
      <p className="small muted">
        Intelligence + Ars Notoria + how the season before was lived + stress die. A ring learned is recited again in 10 − Ars Notoria days. Under a ring, a Divine aura warps no more, and Ars Notoria takes 3 a point
        off the Divine aura’s penalty to other magic.{seasonsLink}
      </p>
      {active && (
        <p className="small ok">
          In effect: {SOLOMON_RINGS[active.ring - 1].name}, to the end of {active.untilSeason} {active.untilYear}. {SOLOMON_RINGS[active.ring - 1].text}
          {active.disease ? ` (${active.disease})` : ''}
        </p>
      )}
      {learned === 0 ? (
        <p className="small">No ring learned yet.</p>
      ) : (
        <>
          <div className="row">
            <Field label="Ring">
              <select value={r.ring} onChange={(e) => setRing(Number(e.target.value))}>
                {SOLOMON_RINGS.filter((x) => x.ring <= learned).map((x) => (
                  <option key={x.ring} value={x.ring}>{x.name}</option>
                ))}
              </select>
            </Field>
            <Field label="For seasons" hint="+1 to the Ease Factor a season">
              <Stepper value={seasons} min={1} max={8} width={34} onChange={setSeasons} />
            </Field>
            {r.ring === 3 && (
              <Field label="The disease">
                <input value={disease} onChange={(e) => setDisease(e.target.value)} />
              </Field>
            )}
          </div>
          <ModList mods={ARS_NOTORIA_MODS} value={mods} onChange={setMods} />
          <div className="row">
            <span>
              Recitation score <Total value={sum(parts)} parts={parts} label="Recitation" /> + stress die against <b>{ease}</b>
            </span>
            <button onClick={recite}>Recite</button>
            {active && (
              <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), notoria: { learned } }))}>
                End the ring
              </button>
            )}
          </div>
        </>
      )}
      <Lines lines={lines} />
    </Card>
  );
}
