// What the holy cards share: the aura and the hour, praying together (Ceremony), spending a
// Confidence or Faith Point, and the line each card shows its latest result on.

import { useState } from 'react';
import type { CeremonyGroup, CeremonyMember } from '../../../engine/holy';
import type { AuraTime } from '../../../engine/aura';
import type { AuraState, Part, Realm } from '../../../engine/magic';
import type { DerivedCharacter } from '../../../engine/character/derive';
import type { Character } from '../../../engine/types';
import { Field, Stepper } from '../../kit';
import type { CharEditor } from '../../character/useChar';

export const REALMS: Realm[] = ['Divine', 'Magic', 'Faerie', 'Infernal', 'None'];
export const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
export const sum = (ps: Part[]) => ps.reduce((s, p) => s + p.value, 0);

/** The saga's other people, to pray together with (the Ceremony Ability). */
export interface Fellow {
  c: Character;
  d: DerivedCharacter;
}

/** One card's latest result, shown beside its buttons. */
export function useLines(): [string[], (s: string | string[]) => void] {
  const [lines, setLines] = useState<string[]>([]);
  return [lines, (s) => setLines(Array.isArray(s) ? s : [s])];
}

export function Lines({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="log small" aria-live="polite">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

/** Spend a Confidence Point, or a Faith Point (with True Faith, or when no Confidence is left): what was spent, or why not. */
export function spendPoint(ed: CharEditor, prefer: 'confidence' | 'faith'): string | undefined {
  const { c, d } = ed;
  if (!c || !d) return 'nobody';
  const faithOk = d.faithPoints > 0;
  const confOk = c.type !== 'grog' && c.confidence.points > 0 && !d.virtues.some((v) => v.cv.defId === 'low-self-esteem-flaw');
  const use = prefer === 'faith' && faithOk ? 'faith' : confOk ? 'confidence' : faithOk ? 'faith' : undefined;
  if (!use) return undefined;
  ed.update((x) => {
    if (use === 'faith') x.faith = { score: d.trueFaith, points: Math.max(0, d.faithPoints - 1) };
    else x.confidence.points = Math.max(0, x.confidence.points - 1);
  });
  return use === 'faith' ? 'a Faith Point' : 'a Confidence Point';
}

/** The aura the holy cards share: the place's realm and strength, and the hour (the Dominion is weaker at night, stronger on holy days). */
export function AuraPicker({ value, onChange, when, setWhen }: { value: AuraState; onChange: (a: AuraState) => void; when: AuraTime; setWhen: (w: AuraTime) => void }) {
  return (
    <Field label="Aura here" hint="Holy powers and prayers add a Divine aura; others take away">
      <div className="row tight">
        <select value={value.realm} onChange={(e) => onChange({ ...value, realm: e.target.value as Realm })} aria-label="Aura realm">
          {REALMS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <Stepper value={value.strength} min={0} max={10} width={40} onChange={(v) => onChange({ ...value, strength: v })} />
        {value.realm === 'Divine' && (
          <select value={when} onChange={(e) => setWhen(e.target.value as AuraTime)} aria-label="When">
            <option value="day">by day</option>
            <option value="night">at night (−1)</option>
            <option value="holy">a Sunday or holy day (+1)</option>
          </select>
        )}
      </div>
    </Field>
  );
}

/**
 * Praying together (the Ceremony Ability): each who joins adds what the rite asks of them. Anyone
 * with Ceremony may lead, and the leader's score sets how many others count; unled, (total Ceremony −
 * participants) is added too. Someone praying must have the Ability; the faithful who are not on a
 * sheet can be counted in by number.
 */
export function CeremonyPicker({ focus, fellows, adds, value, onChange }: { focus: DerivedCharacter; fellows: Fellow[]; adds: (f: Fellow) => number; value: CeremonyGroup | undefined; onChange: (g: CeremonyGroup | undefined) => void }) {
  const own = score(focus, 'ceremony');
  const [crowd, setCrowd] = useState({ n: 0, each: 0 });
  if (!own && !fellows.some((f) => score(f.d, 'ceremony') > 0)) return null;
  const nameOf = (f: Fellow) => f.c.name || 'Unnamed';
  const CROWD = /^The faithful \(\d+\)$/;
  const chosen = new Set(value?.members.map((m) => m.name) ?? []);
  const set = (members: CeremonyMember[], lead: Pick<CeremonyGroup, 'leaderCeremony' | 'leaderName'> = { leaderCeremony: value?.leaderCeremony, leaderName: value?.leaderName }) => {
    // a leader who left the prayer leads it no longer
    const gone = lead.leaderName && !members.some((m) => m.name === lead.leaderName);
    onChange(members.length ? { members, focusCeremony: own, ...(gone ? {} : lead) } : undefined);
  };
  const toggle = (f: Fellow, on: boolean) =>
    set(on ? [...(value?.members ?? []), { name: nameOf(f), adds: adds(f), ceremony: score(f.d, 'ceremony') }] : (value?.members ?? []).filter((m) => m.name !== nameOf(f)));
  // the faithful who join without a sheet: each adds a Characteristic (0 for most), none has Ceremony
  const setFaithful = (n: number, each: number) => {
    setCrowd({ n, each });
    const rest = (value?.members ?? []).filter((m) => !CROWD.test(m.name));
    set(n > 0 ? [...rest, { name: `The faithful (${n})`, adds: n * each, ceremony: 0 }] : rest);
  };
  const leaders = [...(own ? [{ id: '', label: `the one calling the effect (Ceremony ${own})`, score: own }] : []), ...fellows.filter((f) => chosen.has(nameOf(f)) && score(f.d, 'ceremony') > 0).map((f) => ({ id: nameOf(f), label: `${nameOf(f)} (Ceremony ${score(f.d, 'ceremony')})`, score: score(f.d, 'ceremony') }))];
  const led = value?.leaderCeremony !== undefined;
  const anyCeremony = own > 0 || (value?.members ?? []).some((m) => m.ceremony > 0);
  return (
    <details className="small" data-tour="holy-ceremony">
      <summary>Ceremony: pray together{own ? ` (Ceremony ${own})` : ''}{value?.members.length ? `, ${value.members.length} joining` : ''}</summary>
      <p className="small muted" style={{ margin: '4px 0' }}>
        Each who joins adds their Characteristic + the same Method (the Characteristic alone without it). Someone praying must have the Ceremony Ability.
      </p>
      <div className="row small" style={{ flexWrap: 'wrap' }}>
        {fellows.map((f) => (
          <label key={f.c.id} className="inline">
            <input type="checkbox" checked={chosen.has(nameOf(f))} onChange={(e) => toggle(f, e.target.checked)} /> {nameOf(f)} (+{adds(f)}
            {score(f.d, 'ceremony') > 0 ? `, Ceremony ${score(f.d, 'ceremony')}` : ''})
          </label>
        ))}
      </div>
      <div className="row small">
        <Field label="Others of the faithful" hint="A congregation, monks, pilgrims: those with no sheet in the saga">
          <Stepper value={crowd.n} min={0} max={200} width={40} onChange={(n) => setFaithful(n, crowd.each)} />
        </Field>
        <Field label="each adds" hint="Their Characteristic (and the Method, if they have it)">
          <Stepper value={crowd.each} min={-3} max={10} width={34} onChange={(e) => setFaithful(crowd.n, e)} />
        </Field>
        <Field label="Led by" hint="The leader’s Ceremony is how many others count; with no leader everyone counts, and (total Ceremony − those praying) is added">
          <select
            value={led ? (value?.leaderName ?? '') : '__none'}
            disabled={!value}
            onChange={(e) => {
              if (!value) return;
              const l = leaders.find((x) => x.id === e.target.value);
              set(value.members, e.target.value === '__none' || !l ? { leaderCeremony: undefined, leaderName: undefined } : { leaderCeremony: l.score, leaderName: l.id || undefined });
            }}
          >
            <option value="__none">no leader</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {value && !anyCeremony && <div className="small warn-text">Nobody praying has the Ceremony Ability: their prayers do not join the effect.</div>}
    </details>
  );
}
