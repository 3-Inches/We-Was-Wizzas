// Damaged goods (City & Guild ch.4), on the City & Guild page: an item's damage levels and the stress
// check when a botch or an unnatural use puts it at risk. The item is one a character owns (their sword,
// armor, an enchanted device, a cart), whose damage is kept on it, on their sheet's Items tab, or a kind
// of thing for the moment, which can then be given to someone to keep.

import { useState } from 'react';
import type { GameData } from '../../data';
import { abilityTotal, deriveCharacter } from '../../engine/character/derive';
import { pct, stressChance } from '../../engine/dice';
import { ITEM_KINDS, discardItem, kindOf, ownedItems, setCondition, type OwnedItem } from '../../engine/possessions';
import { DEFAULT_HOUSE_RULES, type Character, type HouseRules, type ItemCondition } from '../../engine/types';
import { ITEM_CHECK_MODS, ITEM_QUALITY_MOD, LOCK_PICK_EASE, itemDamageLevels, itemStressCheck, repairNeeds, type ItemQuality } from '../../engine/workshop';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Field, Stepper, signed } from '../kit';
import { PeopleOptions, type PeopleGroup } from '../play';
import { RulesNote } from '../RulesNote';
import { R } from '../routes';
import { Link } from 'react-router-dom';

export function ItemCheck({ x }: { x: { chars: Character[]; data: GameData; rules?: HouseRules; groups?: PeopleGroup[] } }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const [owner, setOwner] = useState('');
  const [pickKey, setPickKey] = useState('kind:weapon');
  // the Ability used: the item's own (''), another of the owner's, or none
  const [abilityPick, setAbilityPick] = useState('');
  const [mods, setMods] = useState<string[]>([]);
  // a kind of thing, for the moment: its own numbers, not kept on any sheet
  const [loose, setLoose] = useState({ name: '', quality: 'standard' as ItemQuality, size: -1, lock: false, ability: 0, magnitudes: 0, cond: { lost: 0 } as ItemCondition });
  const [history, setHistory] = useState<{ key: string; lines: string[] }>({ key: '', lines: [] });
  const c = x.chars.find((y) => y.id === owner);
  const d = c ? deriveCharacter(c, x.data, x.rules ?? DEFAULT_HOUSE_RULES) : undefined;
  const owned = c ? ownedItems(c, x.data) : [];
  const mine: OwnedItem | undefined = owned.find((o) => o.key === pickKey);
  const k = mine ? kindOf(mine.kind) : (ITEM_KINDS.find((y) => `kind:${y.id}` === pickKey) ?? ITEM_KINDS[0]);
  const quality = mine?.quality ?? loose.quality;
  const size = mine?.size ?? loose.size;
  const lock = mine?.lock ?? loose.lock;
  const levels = mine?.levels ?? itemDamageLevels(loose.quality, loose.size, loose.lock);
  const cond = mine?.condition ?? loose.cond;
  const lost = Math.min(levels, cond.lost);
  const left = levels - lost;
  const magnitudes = mine ? mine.magnitudes : loose.magnitudes;
  // the owner's Ability: the item's own unless another is chosen
  const abilityId = abilityPick === 'none' ? undefined : abilityPick || mine?.ability || k.ability;
  const ability = d ? (abilityId ? abilityTotal(d, abilityId) : 0) : loose.ability;
  const abName = abilityId ? (x.data.abilityById.get(abilityId)?.name ?? abilityId) : '';
  const situation = ITEM_CHECK_MODS.filter((m) => mods.includes(m.id) || (m.id === 'repaired' && cond.repaired));
  const total = ability + ITEM_QUALITY_MOD[quality] + magnitudes + situation.reduce((t, m) => t + m.value, 0);
  const odds = stressChance(total, 15, 1);
  const label = mine?.name ?? (loose.name || k.label.replace(/^A /, 'the ').replace(/ \(.*\)$/, ''));
  const lines = history.key === pickKey + owner ? history.lines : [];
  const say = (t: string) => setHistory((h) => ({ key: pickKey + owner, lines: [t, ...(h.key === pickKey + owner ? h.lines : [])].slice(0, 8) }));
  const keep = (next: ItemCondition) => {
    if (c && mine) updateCharacter(c.id, (y) => setCondition(y, mine.key, next));
    else setLoose((l) => ({ ...l, cond: next }));
  };
  const choose = (key: string) => {
    setPickKey(key);
    setAbilityPick('');
    const kk = ITEM_KINDS.find((y) => `kind:${y.id}` === key);
    if (kk) setLoose((l) => ({ ...l, size: kk.size, lock: !!kk.lock, cond: { lost: 0 } }));
  };

  const roll = () => {
    const r = itemStressCheck(total);
    const after = Math.min(levels, lost + r.lost);
    keep({ ...cond, lost: after });
    say(`${r.text}${r.lost ? ` ${after >= levels ? 'It is broken.' : `${levels - after} of ${levels} damage levels left.`}` : ''}`);
  };
  const repair = () => {
    keep({ lost: 0, repaired: true });
    say(`Repaired by a craftsman who can make it: a season, and ${lost} Labor Point${lost === 1 ? '' : 's'}${repairNeeds(quality).craft ? `, with Craft ${repairNeeds(quality).craft} or more` : ''}. It counts as previously repaired from now on (−1).`);
  };
  const parts = [
    ability ? `${c?.name ? `${c.name}’s ` : ''}${abName || 'Ability'} ${signed(ability)}` : '',
    ITEM_QUALITY_MOD[quality] ? `${quality === 'supernatural' ? 'wondrous' : quality} ${signed(ITEM_QUALITY_MOD[quality])}` : '',
    magnitudes ? `enchantment ${signed(magnitudes)}` : '',
    ...situation.map((m) => `${m.label.toLowerCase()} ${signed(m.value)}`),
  ].filter(Boolean);

  return (
    <Card title="Damaged goods: will it survive? (City & Guild)" tour="item-check" fold="cg-damaged" summary="An item at risk: its damage levels, the check against 15, repair.">
      <RulesNote
        book="CG"
        line={2140}
        endLine={2225}
        detail={
          <>
            When a botch or an unnatural use (chopping wood with a sword, hanging from a balcony by an enchanted cloak) puts a valued item at risk: a stress die + modifiers against 15. A failure
            costs a damage level, a botch one more per botch; it works as normal until the last is gone, and is then broken. Superior and excellent items keep their bonuses while damaged; a
            craftsman&apos;s wondrous item stops working at the first damage. Track only the items that matter: a character&apos;s sword, armor, cart or wand.
          </>
        }
      >
        When a botch puts a character&apos;s sword, armor or other valued item at risk. The damage stays on the item, on its owner&apos;s Items tab.
      </RulesNote>
      <div className="row small">
        {x.chars.length > 0 && (
          <Field label="Whose is it">
            <select
              value={owner}
              onChange={(e) => {
                const who = x.chars.find((y) => y.id === e.target.value);
                setOwner(e.target.value);
                // their own first thing (their weapon), else a weapon of no one's in particular
                choose((who ? ownedItems(who, x.data)[0]?.key : undefined) ?? 'kind:weapon');
              }}
            >
              <option value="">— no one in particular —</option>
              {x.groups ? <PeopleOptions groups={x.groups} /> : x.chars.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name || 'Unnamed'}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="The item">
          <select value={pickKey} onChange={(e) => choose(e.target.value)}>
            {owned.length > 0 && (
              <optgroup label={`${c?.name || 'Their'} things`}>
                {owned.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.name}
                    {o.condition.lost ? (o.condition.lost >= o.levels ? ' (broken)' : ` (${o.levels - o.condition.lost} of ${o.levels} left)`) : ''}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="A kind of item (not kept)">
              {ITEM_KINDS.map((y) => (
                <option key={y.id} value={`kind:${y.id}`}>
                  {y.label}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        {!mine && (
          <Field label="What it is called">
            <input value={loose.name} placeholder={k.label.replace(/ \(.*\)$/, '')} style={{ width: 150 }} onChange={(e) => setLoose({ ...loose, name: e.target.value })} />
          </Field>
        )}
        {c && mine && <Link to={R.character(c.sagaId, c, 'lab')}>On {c.name ? `${c.name}’s` : 'their'} Items tab ›</Link>}
      </div>
      <div className="row small" style={{ marginTop: 4 }}>
        {mine ? (
          <span>
            {mine.quality === 'supernatural' ? 'Wondrous' : `${mine.quality[0].toUpperCase()}${mine.quality.slice(1)} quality`} ({signed(ITEM_QUALITY_MOD[mine.quality])}), Size {signed(size)}
            {mine.magnitudes ? `, enchanted (+${mine.magnitudes})` : ''}
          </span>
        ) : (
          <>
            <Field label="Quality">
              <select value={loose.quality} onChange={(e) => setLoose({ ...loose, quality: e.target.value as ItemQuality, cond: { lost: 0 } })}>
                {(Object.keys(ITEM_QUALITY_MOD) as ItemQuality[]).map((q) => (
                  <option key={q} value={q}>
                    {q === 'supernatural' ? 'wondrous or magical' : q} ({signed(ITEM_QUALITY_MOD[q])})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Size" hint="Most items −1, great weapons 0, a house +5, a ship up to +8, a castle +10">
              <Stepper value={loose.size} min={-5} max={12} width={34} onChange={(v) => setLoose({ ...loose, size: v, cond: { lost: 0 } })} />
            </Field>
            <label className="inline" title="Locks have twice the damage levels of other items their Size">
              <input type="checkbox" checked={loose.lock} onChange={(e) => setLoose({ ...loose, lock: e.target.checked, cond: { lost: 0 } })} /> a lock
            </label>
            <Field label="Enchantment magnitudes" hint="A Hermetic item: + the magnitudes of its instilled effects">
              <Stepper value={loose.magnitudes} min={0} max={30} width={30} onChange={(v) => setLoose({ ...loose, magnitudes: v })} />
            </Field>
          </>
        )}
        {d ? (
          <Field label="Ability of the one using it" hint="Trained to use it: + the Ability score">
            <select value={abilityPick} onChange={(e) => setAbilityPick(e.target.value)}>
              <option value="">{mine?.ability || k.ability ? `its own: ${x.data.abilityById.get((mine?.ability || k.ability)!)?.name ?? mine?.ability ?? k.ability} (${abilityTotal(d, (mine?.ability || k.ability)!)})` : 'none of its own (0)'}</option>
              {[...new Map(d.abilities.map((a) => [a.abilityId, a])).values()]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((a) => (
                  <option key={a.abilityId} value={a.abilityId}>
                    {a.name} ({abilityTotal(d, a.abilityId)})
                  </option>
                ))}
              <option value="none">no Ability (0)</option>
            </select>
          </Field>
        ) : (
          <Field label="Ability of the one using it" hint="Trained to use it: + the Ability score">
            <Stepper value={loose.ability} min={0} max={15} width={30} onChange={(v) => setLoose({ ...loose, ability: v })} />
          </Field>
        )}
      </div>
      <div className="row small" style={{ marginTop: 4 }}>
        {ITEM_CHECK_MODS.filter((m) => m.id !== 'repaired').map((m) => (
          <label key={m.id} className="inline">
            <input type="checkbox" checked={mods.includes(m.id)} onChange={(e) => setMods((xs) => (e.target.checked ? [...xs, m.id] : xs.filter((y) => y !== m.id)))} /> {m.label} ({signed(m.value)})
          </label>
        ))}
        <label className="inline" title="The book gives one −1 for an item mended before; more repairs do not add to it">
          <input type="checkbox" checked={!!cond.repaired} onChange={(e) => keep({ ...cond, repaired: e.target.checked || undefined })} /> previously repaired (−1, once)
        </label>
      </div>
      <p className="small" style={{ margin: '6px 0 0' }}>
        <b>{label.replace(/^./, (y) => y.toUpperCase())}</b>: {levels} damage levels ({itemDamageLevels(quality, -1, false)} for its quality
        {itemDamageLevels(quality, size, false) > itemDamageLevels(quality, -1, false) ? ` × ${itemDamageLevels(quality, size, false) / itemDamageLevels(quality, -1, false)} for its Size` : ''}
        {lock ? ' × 2 for a lock' : ''}).{' '}
        <span className={`badge ${left === 0 ? 'bad' : left < levels ? 'warn' : ''}`}>{left === 0 ? 'broken' : `${left} of ${levels} left`}</span>
        {cond.repaired ? <span className="badge">repaired before</span> : null}
        {quality === 'supernatural' && lost > 0 && left > 0 ? <span className="badge warn">a wondrous item stops working once damaged</span> : null}
      </p>
      <p className="small" style={{ margin: '2px 0 0' }}>
        The check: a stress die {signed(total)}
        {parts.length ? ` (${parts.join(', ')})` : ''} against 15: {pct(odds.chance)} it comes through unharmed, {pct(odds.botch)} a botch (a damage level more for each).
      </p>
      <div className="row small" style={{ marginTop: 6 }}>
        <button className="small primary" disabled={left === 0} onClick={roll}>
          Roll the check
        </button>
        {lost > 0 && left > 0 && (
          <button className="small" title={repairNeeds(quality).text} onClick={repair}>
            Repair it ({lost} Labor Point{lost === 1 ? '' : 's'})
          </button>
        )}
        {left === 0 && c && mine && (
          <button
            className="small"
            onClick={() => {
              updateCharacter(c.id, (y) => void discardItem(y, mine.key));
              say(`${mine.name} is thrown away (Undo puts it back).`);
              choose(owned.find((o) => o.key !== mine.key)?.key ?? 'kind:weapon');
            }}
          >
            Discard it
          </button>
        )}
        {left === 0 && !mine && (
          <button className="small ghost" onClick={() => setLoose({ ...loose, cond: { lost: 0 } })}>
            Another like it
          </button>
        )}
        {c && !mine && (
          <button
            className="small ghost"
            title="Put it on their sheet's Items tab, with its damage, to be checked again later"
            onClick={() => {
              const kind = ITEM_KINDS.find((y) => `kind:${y.id}` === pickKey)?.id ?? 'tool';
              const id = uid();
              updateCharacter(c.id, (y) => void (y.possessions = [...(y.possessions ?? []), { uid: id, name: loose.name || k.label.replace(/^A /, '').replace(/ \(.*\)$/, ''), kind, quality: loose.quality, condition: loose.cond.lost || loose.cond.repaired ? loose.cond : undefined }]));
              setPickKey(`p:${id}`);
              say(`Given to ${c.name || 'them'} to keep: it is on their Items tab.`);
            }}
          >
            {c.name || 'They'} keep it
          </button>
        )}
      </div>
      {lines.length > 0 && (
        <div className="dice-result-lines small" aria-live="polite">
          {lines.map((t, i) => (
            <div key={i} className={i ? 'muted' : ''}>
              {t}
            </div>
          ))}
        </div>
      )}
      {left === 0 && <p className="small bad-text" style={{ margin: '4px 0 0' }}>It is broken. A broken item cannot be repaired and must be discarded (City &amp; Guild).</p>}
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Repair: {repairNeeds(quality).text}
        {lock && LOCK_PICK_EASE[quality] !== undefined ? ` Picking it: Dexterity + Legerdemain + a stress die against ${LOCK_PICK_EASE[quality]}, with tools.` : ''}
      </p>
    </Card>
  );
}
