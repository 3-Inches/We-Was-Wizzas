import { useState } from 'react';
import { ART_NAMES, FORMS, TECHNIQUES, type Art } from '../../../data';
import { artXpForScore, withAffinity } from '../../../engine/xp';
import type { Character, XpSource } from '../../../engine/types';
import type { DerivedCharacter } from '../../../engine/character/derive';
import { labTotal } from '../../../engine/magic';
import { Card, Meter, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

function rawNeededArt(c: Character, d: DerivedCharacter, art: Art, src: XpSource, targetScore: number, mult: number): number {
  const da = d.arts[art];
  const cur = c.arts[art]?.[src] ?? 0;
  const eff = (x: number) => (da.affinity ? withAffinity(x, mult) : x);
  const base = da.effectiveXp - eff(cur);
  const target = artXpForScore(Math.max(0, targetScore));
  let raw = 0;
  while (base + eff(raw) < target) raw++;
  return raw;
}

export default function ArtsStep({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga } = ed;
  const [poolId, setPoolId] = useState<XpSource>('apprenticeship');
  if (!c || !d || !saga) return null;
  const pools = d.budgets.filter((b) => b.id === 'apprenticeship' || b.id === 'postGauntlet');
  const pool = pools.find((p) => p.id === poolId) ?? pools[0];
  const mult = saga.houseRules.affinityMultiplier;
  const setArt = (art: Art, v: number) =>
    update((x) => {
      const alloc = x.arts[art] ?? (x.arts[art] = {});
      if (v <= 0) delete alloc[pool!.id];
      else alloc[pool!.id] = v;
    });
  const limitBonus = saga.houseRules.spellLevelLimitBonus;
  return (
    <>
      <Card title="Hermetic Arts" className="accent">
        <div className="grid grid-2">
          {pools.map((b) => (
            <div key={b.id} className={`vf-item clickable ${pool?.id === b.id ? 'taken' : ''}`} onClick={() => setPoolId(b.id)}>
              <Meter label={b.label} value={b.spent} max={b.total} />
              <div className="small muted">{b.allows}</div>
            </div>
          ))}
        </div>
        <p className="small muted">
          Art scores cost 1+2+…+n xp (score 5 = 15, 10 = 55). Casting and Lab Totals add a Technique <i>and</i> a Form, so splitting xp gives better totals than
          putting everything into one Art. A sensible apprenticeship split is ~120 xp to Arts and ~120 to Abilities.
        </p>
        <div className="grid grid-2">
          {[TECHNIQUES, FORMS].map((list, gi) => (
            <table key={gi} className="compact">
              <thead>
                <tr>
                  <th>{gi === 0 ? 'Technique' : 'Form'}</th>
                  <th className="num">Score</th>
                  <th>{pool?.label.split(' (')[0]}</th>
                </tr>
              </thead>
              <tbody>
                {(list as Art[]).map((a) => {
                  const da = d.arts[a];
                  const inPool = pool ? c.arts[a]?.[pool.id] ?? 0 : 0;
                  return (
                    <tr key={a}>
                      <td>
                        <b>{ART_NAMES[a]}</b>{' '}
                        {da.affinity && <span className="badge info">Affinity</span>}
                        {da.puissant > 0 && <span className="badge good">+{da.puissant}</span>}
                        {da.deficient !== 'none' && <span className="badge bad">Deficient</span>}
                        {da.elementalBonus > 0 && <span className="badge">+{da.elementalBonus} elemental xp</span>}
                      </td>
                      <td className="num">
                        <Total
                          value={`${da.score}${da.remainder ? ` (${da.remainder})` : ''}${da.puissant ? ` +${da.puissant}` : ''}`}
                          parts={Object.entries(c.arts[a] ?? {}).map(([k, v]) => ({ label: k, value: v ?? 0 }))}
                          label={`Effective xp ${da.effectiveXp}`}
                        />
                      </td>
                      <td>
                        {pool && (
                          <span className="row tight">
                            <button className="small icon" disabled={!inPool} onClick={() => setArt(a, rawNeededArt(c, d, a, pool.id, da.score - 1, mult))}>
                              −1
                            </button>
                            <Stepper value={inPool} min={0} width={46} onChange={(v) => setArt(a, v)} />
                            <button className="small icon" onClick={() => setArt(a, rawNeededArt(c, d, a, pool.id, da.score + 1, mult))}>
                              +1
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
        </div>
      </Card>

      <Card title="Highest spell level you may learn at creation">
        <p className="small muted" style={{ marginTop: 0 }}>
          Technique + Form + Intelligence + Magic Theory + {limitBonus}, with Virtues and Flaws applied as for Lab Totals (DE p.49). Requisites lower this for specific spells.
        </p>
        <div className="art-grid">
          <div className="h" />
          {FORMS.map((f) => (
            <div key={f} className="h">
              {f}
            </div>
          ))}
          {TECHNIQUES.map((t) => (
            <Row key={t} t={t} d={d} bonus={limitBonus} />
          ))}
        </div>
      </Card>
    </>
  );
}

function Row({ t, d, bonus }: { t: Art; d: DerivedCharacter; bonus: number }) {
  const vals = FORMS.map((f) => labTotal(d, { technique: t as never, form: f }, { activity: 'spells', aura: { realm: 'Magic', strength: bonus } }).total);
  const max = Math.max(...vals);
  return (
    <>
      <div className="h">{t}</div>
      {vals.map((v, i) => (
        <div key={i} className={v === max && v > 0 ? 'hot' : ''}>
          {v}
        </div>
      ))}
    </>
  );
}
