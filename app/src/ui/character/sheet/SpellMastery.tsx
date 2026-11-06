// Spell Mastery (DE, Spell Mastery): each spell's Mastery score, the experience toward the next, and
// the special ability each point of Mastery brings, chosen by the player. Experience comes from a
// season's practice or study of the spell (Plan a season, above), adventure experience put on it, or a
// Virtue's points at creation. At the Game Table (Seasons, a season in full) the points are put in and
// each new level's ability chosen; a finished sheet shows the Mastery as it stands.

import { useState } from 'react';
import { MASTERY_ABILITIES } from '../../../engine/spellDesign';
import { abilityXpForScore } from '../../../engine/xp';
import type { CharSpell } from '../../../engine/types';
import type { DerivedCharacter } from '../../../engine/character/derive';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import { masteryScore } from '../steps/SpellsStep';
import type { CharEditor } from '../useChar';

/** Special abilities a spell may take more than once (DE): Precise and Quick Casting at will, Quiet Casting twice. */
const REPEATS: Record<string, number> = { 'Precise Casting': 99, 'Quick Casting': 99, 'Quiet Casting': 2 };
/** Not for a Ritual (DE). */
const NOT_RITUAL = ['Ceremonial Casting', 'Fast Casting', 'Quick Casting'];

const xpOf = (sp: CharSpell) => Object.values(sp.masteryXp).reduce<number>((t, v) => t + (v ?? 0), 0);

/** The special abilities this spell may still take. */
export function masteryChoices(sp: CharSpell): typeof MASTERY_ABILITIES {
  return MASTERY_ABILITIES.filter((m) => sp.masteryAbilities.filter((x) => x === m.name).length < (REPEATS[m.name] ?? 1) && !(sp.spell.ritual && NOT_RITUAL.includes(m.name)));
}

/** Spells with a point of Mastery whose special ability is not yet chosen. */
export function masteryToChoose(spells: CharSpell[], d: DerivedCharacter): CharSpell[] {
  return spells.filter((sp) => sp.masteryAbilities.length < masteryScore(sp, d) && masteryChoices(sp).length > 0);
}

export function SpellMasteryCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [pick, setPick] = useState<Record<string, string>>({});
  const [put, setPut] = useState<{ spell: string; from: string; xp: number }>({ spell: '', from: 'play', xp: 5 });
  if (!c || !d || !c.spells.length) return null;
  const setSpell = (u: string, fn: (s: CharSpell) => void) => update((x) => { const s = x.spells.find((y) => y.uid === u); if (s) fn(s); });
  // a Virtue's mastery points (Flawless Magic and the like), what is left of them
  const pools = d.masteryPools.map((mp) => ({ ...mp, left: mp.total - c.spells.reduce((t, sp) => t + (sp.masteryXp[`pool:${mp.uid}`] ?? 0), 0) }));
  const waiting = masteryToChoose(c.spells, d).length;
  const mastered = c.spells.filter((sp) => xpOf(sp) > 0).sort((a, b) => masteryScore(b, d) - masteryScore(a, d) || a.spell.name.localeCompare(b.spell.name));
  const byName = [...c.spells].sort((a, b) => a.spell.name.localeCompare(b.spell.name));
  const spellId = put.spell || byName[0].uid;
  const pool = pools.find((p) => `pool:${p.uid}` === put.from);
  const most = pool ? Math.max(0, pool.left) : 50;
  const add = () => {
    const xp = Math.min(put.xp, most);
    if (xp <= 0) return;
    setSpell(spellId, (s) => void (s.masteryXp[put.from as keyof typeof s.masteryXp] = (s.masteryXp[put.from as keyof typeof s.masteryXp] ?? 0) + xp));
  };
  return (
    <Card
      title="Spell Mastery"
      tour="spell-mastery"
      fold="spell-mastery"
      summary={waiting ? `${waiting} spell${waiting > 1 ? 's' : ''} with a level of Mastery to choose an ability for.` : `${mastered.length} spell${mastered.length === 1 ? '' : 's'} mastered.`}
    >
      <RulesNote book="DE" line={9583} endLine={9662}>
        Mastery is an Ability for one spell: its score adds to the Casting Total and takes a botch die off, and each point brings a special ability of the player&apos;s choosing. Raise it by
        practicing the spell for a season (Plan a season above: Practice, the spell&apos;s Mastery), from a teacher or a book, or with adventure experience put on it here.
      </RulesNote>
      {waiting > 0 && <p className="small warn-text">A level of Mastery is waiting for its special ability: choose it below.</p>}
      {mastered.length === 0 && <div className="small muted">No spell mastered yet.</div>}
      {mastered.map((sp) => {
        const ms = masteryScore(sp, d);
        const xp = xpOf(sp);
        const choices = masteryChoices(sp);
        return (
          <div key={sp.uid} className="list-row small" style={{ flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 180px' }}>
              <b>{sp.spell.name}</b>{' '}
              <span className="muted">
                {sp.spell.technique}
                {sp.spell.form} {sp.spell.level}
              </span>
            </span>
            <span>
              Mastery <b>{ms}</b> <span className="muted">({xp} xp, {abilityXpForScore(ms + 1) - xp} to {ms + 1})</span>
            </span>
            {sp.masteryAbilities.map((m, i) => (
              <span key={i} className="badge" title={MASTERY_ABILITIES.find((x) => x.name === m)?.text}>
                {m}
                <button className="small ghost" style={{ padding: '0 4px' }} aria-label={`Take ${m} off`} title="Chosen by mistake: take it off" onClick={() => setSpell(sp.uid, (s) => void s.masteryAbilities.splice(i, 1))}>
                  ✕
                </button>
              </span>
            ))}
            {ms > sp.masteryAbilities.length && choices.length > 0 && (
              <span className="row tight">
                <select value={pick[sp.uid] ?? ''} onChange={(e) => setPick({ ...pick, [sp.uid]: e.target.value })} aria-label={`An ability for Mastery ${sp.masteryAbilities.length + 1} of ${sp.spell.name}`}>
                  <option value="">— the ability for level {sp.masteryAbilities.length + 1} —</option>
                  {choices.map((m) => (
                    <option key={m.name} value={m.name} title={m.text}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  className="small primary"
                  disabled={!pick[sp.uid]}
                  onClick={() => {
                    setSpell(sp.uid, (s) => void s.masteryAbilities.push(pick[sp.uid]));
                    setPick({ ...pick, [sp.uid]: '' });
                  }}
                >
                  Choose
                </button>
              </span>
            )}
            {pick[sp.uid] && <span className="soft" style={{ flexBasis: '100%' }}>{MASTERY_ABILITIES.find((m) => m.name === pick[sp.uid])?.text}</span>}
          </div>
        );
      })}
      <div className="row small" style={{ marginTop: 8, flexWrap: 'wrap' }} data-tour="mastery-add">
        <Field label="Put Mastery experience on">
          <select value={spellId} onChange={(e) => setPut({ ...put, spell: e.target.value })}>
            {byName.map((sp) => (
              <option key={sp.uid} value={sp.uid}>
                {sp.spell.name} ({sp.spell.technique}
                {sp.spell.form} {sp.spell.level}){xpOf(sp) ? `, Mastery ${masteryScore(sp, d)}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <select value={put.from} onChange={(e) => setPut({ ...put, from: e.target.value })}>
            <option value="play">adventure experience, or a correction</option>
            {pools.map((p) => (
              <option key={p.uid} value={`pool:${p.uid}`} disabled={p.left <= 0}>
                {p.label} ({p.left} left)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Experience points">
          <Stepper value={Math.min(put.xp, most)} min={1} max={Math.max(1, most)} width={40} onChange={(v) => setPut({ ...put, xp: v })} />
        </Field>
        <button className="small" disabled={most <= 0} onClick={add}>
          Add
        </button>
      </div>
      {pools.some((p) => p.left > 0) && (
        <p className="small" style={{ marginBottom: 0 }}>
          {pools.filter((p) => p.left > 0).map((p) => `${p.label}: ${p.left} experience points of Spell Mastery still to put on spells.`).join(' ')}
        </p>
      )}
      <p className="small muted" style={{ marginBottom: 0 }}>A season of practice or study logged on a spell&apos;s Mastery is added by itself. Undo (at the top) takes back an amount put on the wrong spell.</p>
    </Card>
  );
}
