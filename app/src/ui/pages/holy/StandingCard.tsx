// A holy character's Faith Points (with the dawn and the sacraments), and their standing: tradition,
// a commanding aura, the Ascent's form, True Faith's gifts.

import type { ReactNode } from 'react';
import { COMMANDING_AURA_RANKS, HOLY_TRADITIONS, TRAGEDIES } from '../../../data/divine';
import { ASCENT_FORMS } from '../../../engine/holy';
import { ensureAbility } from '../../../engine/character/factory';
import type { Character } from '../../../engine/types';
import { Card, Field } from '../../kit';
import { uid } from '../../../util/id';
import type { CharEditor } from '../../character/useChar';

/** True Faith and Faith Points, with the dawn and the sacraments. */
export function FaithLine({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d) return null;
  return (
    <div className="small" data-tour="holy-faith">
      <div>
        {d.trueFaith ? <b>True Faith {d.trueFaith}</b> : 'No True Faith Score'}: <b>{d.faithPoints}</b> Faith Point{d.faithPoints === 1 ? '' : 's'}
        {d.relicFaith ? `, a relic of Faith ${d.relicFaith}` : ''}; Confidence {c.confidence.score} ({c.confidence.points})
      </div>
      <div className="row tight">
        {d.trueFaith > 0 && (
          <button className="small ghost" disabled={d.faithPoints >= d.trueFaith} title="Each dawn, Faith Points come back up to the True Faith Score" onClick={() => update((x) => void (x.faith = { score: d.trueFaith, points: Math.max(d.faithPoints, d.trueFaith) }))}>
            Dawn
          </button>
        )}
        <select
          className="small"
          value=""
          aria-label="A Faith Point from a sacrament or pilgrimage"
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!n) return;
            update((x) => {
              x.faith = { score: d.trueFaith, points: d.faithPoints + n };
              // the hajj: Pious +3, never higher from repeating it (Mythic Islam, Hajj)
              if (n === 3) {
                const pious = x.personality.find((t) => t.trait === 'Pious');
                if (pious) pious.score = Math.max(3, pious.score);
                else x.personality.push({ uid: uid(), trait: 'Pious', score: 3 });
              }
            });
          }}
        >
          <option value="">+ Faith Points…</option>
          <option value="1">the Eucharist, confirmation, marriage, ordination or last rites (+1, one from each)</option>
          <option value="3">the hajj (+3, and Pious +3)</option>
          <option value="1">another holy endeavor (+1)</option>
        </select>
      </div>
    </div>
  );
}

/** A holy character's standing: tradition, a commanding aura, the Ascent's form, True Faith's gifts. */
export function StandingCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d) return null;
  const h = c.holy ?? {};
  const set = (k: keyof NonNullable<Character['holy']>, v: unknown) => update((x) => void (x.holy = { ...(x.holy ?? {}), [k]: v || undefined }));
  const tradition = HOLY_TRADITIONS.find((t) => t.id === h.tradition);
  const gifts: ReactNode[] = [];
  if (d.trueFaith >= 2) gifts.push(<span key="2">Devotion: Premonitions, and a Faith Point dispels any illusion or glamour.</span>);
  if (d.trueFaith >= 3) gifts.push(<span key="3">Hope: Faith Points add +6; resistance against Mentem is doubled.</span>);
  if (d.trueFaith >= 5) gifts.push(<span key="5">Charity: an Empyreal aura of {d.trueFaith - 4} to Voice range, a candle’s glow, and the aura may be tempered.</span>);
  const premonitions = d.abilities.some((a) => a.abilityId === 'premonitions');
  return (
    <Card title="Holy standing" tour="holy-standing" fold="holy-standing" summary={[tradition?.name, h.commandingAura && `commanding aura ${h.commandingAura}`, h.ascent && `Divine ${h.ascent}`].filter(Boolean).join(' · ') || 'no tradition, no commanding aura'}>
      <div className="row">
        <Field label="Holy tradition" hint={tradition ? `Favored: ${tradition.favored.join(', ')}. With True Faith they are learned without the Supernatural study penalty.` : 'Its favored Abilities are learned without the study penalty'}>
          <select value={h.tradition ?? ''} onChange={(e) => set('tradition', e.target.value)}>
            <option value="">none</option>
            {HOLY_TRADITIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.societas ? ' (Hermetic societas)' : t.faith ? ` (${t.faith})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Commanding aura" hint="Invested by a religious authority: Magic Resistance (a relic's added), Soak + it ÷ 5, Aura of Rightful Authority at Voice range (Penetration 0)">
          <select value={h.commandingAura ?? 0} onChange={(e) => set('commandingAura', Number(e.target.value))}>
            <option value={0}>none</option>
            {COMMANDING_AURA_RANKS.map((r) => (
              <option key={r.mr} value={r.mr}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {tradition && <p className="small muted">{tradition.text}</p>}
      {h.ascent && <p className="small"><b>Divine Ascent:</b> {ASCENT_FORMS[h.ascent]}{h.ascent === 'unity' && h.unity ? ` (${h.unity.virtue}, raising ${h.unity.trait} by the Warping Score, ${d.warpingScore})` : ''}</p>}
      {h.ascent === 'form' && <p className="small">Commanding aura of the Divine Form: Penetration {d.warpingScore + d.trueFaith * 5}.</p>}
      {gifts.length > 0 && (
        <div className="small">
          <b>Embodying the Light:</b> {gifts.map((g, i) => <span key={i}>{i ? ' ' : ''}{g}</span>)}
          {d.trueFaith >= 2 && !premonitions && (
            <button className="small" style={{ marginLeft: 6 }} onClick={() => update((x) => void ensureAbility(x, 'premonitions'))}>
              Add Premonitions
            </button>
          )}
        </div>
      )}
      {(h.tragedies?.length ?? 0) > 0 && (
        <details className="small">
          <summary>Tragedies of hubris ({h.tragedies!.length})</summary>
          {h.tragedies!.map((t, i) => (
            <div key={i}>
              {t.season} {t.year}: {TRAGEDIES[t.kind].label}. {t.text}
            </div>
          ))}
        </details>
      )}
    </Card>
  );
}
