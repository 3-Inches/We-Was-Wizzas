import { ARTS, CHARACTERISTICS, type Art } from '../../data';
import { HOUSE_BY_ID } from '../../data/houses';
import { allCombatLines } from '../../engine/combat';
import { castingScore } from '../../engine/magic';
import { Card, signed } from '../kit';
import type { CharEditor } from './useChar';
import { masteryScore } from './steps/SpellsStep';

/** A stat block in the style of the Definitive Edition character examples. */
export default function SheetSummary({ ed }: { ed: CharEditor }) {
  const { c, d, data } = ed;
  if (!c || !d) return null;
  const vfOrder = (cat: string) => d.virtues.filter((v) => v.def?.categories[0] === cat);
  void vfOrder;
  const virtues = d.virtues.filter((v) => v.def?.kind !== 'flaw').map((v) => v.name + (v.cv.free && v.cv.freeReason === 'House Virtue' ? ' (free)' : ''));
  const flaws = d.virtues.filter((v) => v.def?.kind === 'flaw').map((v) => v.name);
  const abil = d.abilities
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => `${a.name} ${a.score}${a.bonus ? `+${a.bonus}` : ''}${a.remainder ? ` (${a.remainder})` : ''}${a.specialty ? ` (${a.specialty})` : ''}`);
  const arts = ARTS.map((a: Art) => `${a} ${d.arts[a].score}${d.arts[a].puissant ? `+${d.arts[a].puissant}` : ''}${d.arts[a].remainder ? ` (${d.arts[a].remainder})` : ''}`);
  const lines = allCombatLines(d, data);
  return (
    <Card title={`${c.name || 'Unnamed'}${c.house ? ` of ${HOUSE_BY_ID[c.house]?.name}` : ''}`}>
      <div className="small">
        <p>
          <b>Characteristics:</b> {CHARACTERISTICS.map((k) => `${k} ${signed(d.characteristics[k].value)}`).join(', ')}
        </p>
        <p>
          <b>Size:</b> {signed(d.size)} · <b>Age:</b> {c.age}
          {c.apparentAge ? ` (${c.apparentAge})` : ''} · <b>Decrepitude:</b> {d.decrepitude} ({c.decrepitudePoints}) · <b>Warping Score:</b> {d.warpingScore} ({d.warpingPoints})
          {c.type !== 'grog' && (
            <>
              {' '}
              · <b>Confidence:</b> {d.confidence.score} ({d.confidence.points})
            </>
          )}
        </p>
        <p>
          <b>Virtues and Flaws:</b> {[...virtues, ...flaws].join(', ') || '—'}
        </p>
        <p>
          <b>Personality Traits:</b> {c.personality.map((p) => `${p.trait} ${signed(p.score)}`).join(', ') || '—'}
        </p>
        {d.reputations.length > 0 && (
          <p>
            <b>Reputations:</b> {d.reputations.map((r) => `${r.text} ${r.score} (${r.scope})`).join(', ')}
          </p>
        )}
        <p>
          <b>Combat:</b> {lines.map((l) => `${l.name}: Init ${signed(l.init)}, Atk ${l.atk === null ? 'n/a' : signed(l.atk)}, Def ${signed(l.dfn)}, Dam ${l.dam === null ? 'n/a' : signed(l.dam)}`).join('; ')}
        </p>
        <p>
          <b>Soak:</b> {signed(d.soak)} · <b>Fatigue Levels:</b> {d.fatigueLevels.map((f) => (f.penalty === null ? f.name : f.penalty === 0 ? (f.name === 'Fresh' ? 'OK' : '0') : f.penalty)).join(', ')}
        </p>
        <p>
          <b>Wound Penalties:</b> –1 ({d.woundRanges.light.join('–')}), –3 ({d.woundRanges.medium.join('–')}), –5 ({d.woundRanges.heavy.join('–')}), Incapacitated (
          {d.woundRanges.incap.join('–')}), Dead ({d.woundRanges.dead}+)
        </p>
        <p>
          <b>Abilities:</b> {abil.join(', ') || '—'}
        </p>
        {d.isMagus && (
          <p>
            <b>Arts:</b> {arts.slice(0, 5).join(', ')}; {arts.slice(5).join(', ')}
          </p>
        )}
        {c.twilightScars.length > 0 && (
          <p>
            <b>Twilight Scars:</b> {c.twilightScars.join('; ')}
          </p>
        )}
        {c.equipment.other && (
          <p>
            <b>Equipment:</b> {c.equipment.other}
          </p>
        )}
        <p>
          <b>Encumbrance:</b> {d.encumbrance} ({d.burden})
        </p>
        {c.spells.length > 0 && (
          <div>
            <b>Spells Known:</b>
            <ul style={{ margin: '4px 0 8px', paddingLeft: 20 }}>
              {c.spells
                .slice()
                .sort((a, b) => (a.spell.form + a.spell.technique).localeCompare(b.spell.form + b.spell.technique) || (a.spell.level ?? 0) - (b.spell.level ?? 0))
                .map((sp) => {
                  const ms = masteryScore(sp, d);
                  const cs = castingScore(d, { technique: sp.spell.technique, form: sp.spell.form, requisites: sp.spell.requisites }, { kind: sp.spell.ritual ? 'ritual' : 'formulaic', inFocus: !!sp.notes?.includes('[focus]'), extra: ms ? [{ label: 'Mastery', value: ms }] : [] });
                  return (
                    <li key={sp.uid}>
                      {sp.spell.name} ({sp.spell.technique}
                      {sp.spell.form}
                      {sp.spell.requisites.length ? `(${sp.spell.requisites.join(',')})` : ''} {sp.spell.level}/{signed(cs.total)}){ms ? `, Mastery ${ms}${sp.masteryAbilities.length ? ` (${sp.masteryAbilities.join(', ')})` : ''}` : ''}
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
        {c.description && (
          <p style={{ whiteSpace: 'pre-wrap' }}>
            <b>Appearance & background:</b> {c.description}
          </p>
        )}
      </div>
    </Card>
  );
}
