import { useState } from 'react';
import { describeStress, pct, simpleChance, simpleDie, stressChance, stressDie } from '../../engine/dice';
import { abilityTotal, deriveCharacter } from '../../engine/character/derive';
import { DEFAULT_HOUSE_RULES, type Character, type HouseRules } from '../../engine/types';
import { CHARACTERISTICS, CHAR_NAMES, type Characteristic, type GameData } from '../../data';
import { ITEM_CHECK_MODS, ITEM_QUALITY_MOD, LOCK_PICK_EASE, itemDamageLevels, itemStressCheck, repairNeeds, type ItemQuality } from '../../engine/workshop';
import { Card, Field, Stepper, signed } from '../kit';
import { RulesNote } from '../RulesNote';
import { useStore } from '../../store/store';
import { useGameData, useSaga, useSagaCharacters } from '../../store/hooks';
import { BlowCard, OpposedCard, PerilsCard } from './TableRolls';

// Grogs' optional equipment bonuses: the right tool for a task lowers its Ease Factor.
const EQUIPMENT = { none: 0, minor: 1, major: 3 } as const;
type Equipment = keyof typeof EQUIPMENT;
const EQUIPMENT_EXAMPLES: [string, string, 'minor' | 'major'][] = [
  ['Whip or crop', 'Animal Handling (obedience)', 'major'],
  ['Map', 'Area Lore (planning route)', 'major'],
  ['Astronomical tables', 'Artes Liberales (astronomy)', 'minor'],
  ['Rope', 'Athletics (climbing)', 'major'],
  ['Pole (at least 10 foot)', 'Athletics (distance jumping)', 'major'],
  ['Fine wine', 'Folk Ken (getting information)', 'minor'],
  ['Flickering light', 'Concentration (meditation)', 'minor'],
  ['Good clothing', 'Charm (making a good impression)', 'minor'],
  ['Guild badge', 'Guild Lore (gaining favors)', 'minor'],
  ['Makeup', 'Guile (disguise)', 'minor'],
  ['Bird lime', 'Hunt (birds)', 'major'],
  ['Concealed blade', 'Legerdemain (slitting pouches)', 'major'],
  ['Watchglass', 'Medicine (diagnosis)', 'minor'],
  ['Cantled saddle', 'Ride (resisting a charge)', 'major'],
  ['Flawless crystal', 'Second Sight (seeing regio boundaries)', 'minor'],
  ['Lampblack', 'Stealth (hiding)', 'minor'],
];

interface Roll {
  id: number;
  label: string;
  kind: 'simple' | 'stress';
  mod: number;
  ease: number | null;
  equipment: Equipment;
  total: number;
  text: string;
  botch: boolean;
}

let seq = 0;

/** The Game Table's Dice page; on its own (with a heading) when no saga is open. */
export default function DicePage({ standalone }: { standalone?: boolean } = {}) {
  // the saga last opened: its characters can take part in the rolls below
  const sagaId = useStore((s) => s.activeSagaId);
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId).filter((c) => !c.wounds.dead && c.creation.finalized);
  const x = { chars: [...chars.filter((c) => !c.npc), ...chars.filter((c) => c.npc)], data, rules: saga?.houseRules };
  const [label, setLabel] = useState('');
  const [mod, setMod] = useState(0);
  const [botchDice, setBotchDice] = useState(1);
  const [ease, setEase] = useState(6);
  const [useEase, setUseEase] = useState(true);
  const [equipment, setEquipment] = useState<Equipment>('none');
  const target = Math.max(0, ease - EQUIPMENT[equipment]);
  const [log, setLog] = useState<Roll[]>([]);
  const last = log[0];
  // a character of the saga rolling: their Characteristic + Ability fill in the modifier and the label
  const [rollerId, setRollerId] = useState('');
  const [rollChar, setRollChar] = useState<Characteristic>('Per');
  const [rollAbility, setRollAbility] = useState('awareness');
  const rollerOf = (id: string) => {
    const c = x.chars.find((y) => y.id === id);
    return c && data ? { c, d: deriveCharacter(c, data, saga?.houseRules ?? DEFAULT_HOUSE_RULES) } : undefined;
  };
  const roller = rollerOf(rollerId);
  const setRoller = (id: string, k: Characteristic, ab: string) => {
    setRollerId(id);
    setRollChar(k);
    setRollAbility(ab);
    const r = rollerOf(id);
    if (!r) return;
    const abName = ab ? r.d.abilities.find((a) => a.abilityId === ab)?.name ?? data?.abilityById.get(ab)?.name ?? ab : '';
    setMod(r.d.characteristics[k].value + (ab ? abilityTotal(r.d, ab) : 0));
    setLabel(`${r.c.name || 'They'}: ${CHAR_NAMES[k]}${abName ? ` + ${abName}` : ''}`);
  };

  const roll = (kind: 'simple' | 'stress') => {
    let total: number;
    let text: string;
    let botch = false;
    if (kind === 'simple') {
      const r = simpleDie();
      total = r.value + mod;
      text = `${r.value}`;
    } else {
      const r = stressDie(botchDice);
      botch = r.botches > 0;
      total = r.zero ? mod : r.value + mod;
      text = describeStress(r);
    }
    setLog((l) => [{ id: ++seq, label: label || (kind === 'simple' ? 'Simple die' : 'Stress die'), kind, mod, ease: useEase ? target : null, equipment, total, text, botch }, ...l].slice(0, 50));
  };

  const outcome = (r: Roll) => (r.botch ? 'BOTCH' : r.ease === null ? '' : r.total >= r.ease ? 'success' : 'failure');

  return (
    <div className="stack">
      {standalone && <h1>Dice</h1>}
      <div className="grid grid-2">
        <Card title="Roll" className="accent">
          <Field label="What is this roll for?">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Per + Awareness, Casting Pilum of Fire" />
          </Field>
          {x.chars.length > 0 && (
            <div className="row small" style={{ marginTop: 8 }}>
              <Field label="Who rolls (optional)" hint="Fills in the modifier from their sheet">
                <select value={rollerId} onChange={(e) => setRoller(e.target.value, rollChar, rollAbility)}>
                  <option value="">— numbers only —</option>
                  {x.chars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </Field>
              {roller && (
                <>
                  <Field label="Characteristic">
                    <select value={rollChar} onChange={(e) => setRoller(rollerId, e.target.value as Characteristic, rollAbility)}>
                      {CHARACTERISTICS.map((k) => (
                        <option key={k} value={k}>
                          {CHAR_NAMES[k]} ({signed(roller.d.characteristics[k].value)})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ability">
                    <select value={rollAbility} onChange={(e) => setRoller(rollerId, rollChar, e.target.value)}>
                      <option value="">— none —</option>
                      {[...new Map(roller.d.abilities.map((a) => [a.abilityId, a])).values()].map((a) => (
                        <option key={a.abilityId} value={a.abilityId}>
                          {a.name} ({abilityTotal(roller.d, a.abilityId)})
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Modifier (Characteristic + Ability …)">
              <Stepper value={mod} width={46} onChange={setMod} />
            </Field>
            <Field label="Botch dice">
              <Stepper value={botchDice} min={0} max={20} width={36} onChange={setBotchDice} />
            </Field>
            <Field label={<label className="inline"><input type="checkbox" checked={useEase} onChange={(e) => setUseEase(e.target.checked)} /> Ease Factor</label>}>
              <Stepper value={ease} min={0} width={36} onChange={setEase} />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Equipment that helps (optional rule)">
              <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
                <option value="none">None</option>
                <option value="minor">Minor bonus: Ease Factor −1</option>
                <option value="major">Major bonus: Ease Factor −3</option>
              </select>
            </Field>
            {useEase && equipment !== 'none' && <span className="small muted">Ease Factor {ease} → {target}</span>}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary big" onClick={() => roll('stress')}>
              Stress die
            </button>
            <button className="big" onClick={() => roll('simple')}>
              Simple die
            </button>
            {useEase && (
              <span className="small muted">
                {signed(mod)} against {target}: stress die {pct(stressChance(mod, target, botchDice).chance)} ({pct(stressChance(mod, target, botchDice).botch)} to botch), simple die {pct(simpleChance(mod, target))}
              </span>
            )}
          </div>
          {last && (
            <div className={`dice-result ${last.botch ? 'bad' : outcome(last) === 'success' ? 'good' : outcome(last) === 'failure' ? 'warn' : ''}`}>
              <div className="dice-total">{last.botch ? 'BOTCH' : last.total}</div>
              <div className="small">
                {last.label}: {last.text} {signed(last.mod)}
                {last.ease !== null && ` vs ${last.ease}${last.equipment !== 'none' ? ` (${last.equipment} equipment)` : ''} — ${outcome(last)}`}
              </div>
            </div>
          )}
          <p className="small muted">
            Stress die: a 1 means roll again and double (repeatedly); a 0 counts as zero and you roll the botch dice — any 0 on them is a botch. Simple die: 1–10, a 0 counts as 10 (DE
            p.7).
          </p>
        </Card>
        <Card title="History" actions={<button className="small ghost" onClick={() => setLog([])}>Clear</button>}>
          {log.length === 0 && <div className="small muted">No rolls yet.</div>}
          {log.map((r) => (
            <div key={r.id} className="list-row small">
              <b style={{ minWidth: 40 }}>{r.botch ? '✖' : r.total}</b>
              <span style={{ flex: 1 }}>
                {r.label} ({r.kind}: {r.text} {signed(r.mod)})
              </span>
              {outcome(r) && <span className={`badge ${r.botch ? 'bad' : outcome(r) === 'success' ? 'good' : 'warn'}`}>{outcome(r)}</span>}
            </div>
          ))}
        </Card>
      </div>
      <div className="grid grid-2">
        <OpposedCard x={x} />
        <BlowCard x={x} />
      </div>
      <PerilsCard x={x} />
      {!saga && <p className="small muted">Open a saga first and its characters can take part in these rolls, their wounds going on their sheets.</p>}

      <Card title="Equipment bonuses">
        <RulesNote book="Grogs" line={1722} endLine={1731}>
          Equipment that suits the task lowers its Ease Factor: by 1 for a minor bonus, by 3 for a major one. Some examples:
        </RulesNote>
        <table className="compact">
          <tbody>
            {EQUIPMENT_EXAMPLES.map(([item, use, size]) => (
              <tr key={item}>
                <td>{item}</td>
                <td>{use}</td>
                <td>{size === 'major' ? 'Major (−3)' : 'Minor (−1)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Ease Factors (DE)">
        <table className="compact">
          <tbody>
            {[
              [0, 'Trivial'],
              [3, 'Simple'],
              [6, 'Easy'],
              [9, 'Average'],
              [12, 'Hard'],
              [15, 'Very Hard'],
              [18, 'Impressive'],
              [21, 'Remarkable'],
              [24, 'Almost Impossible'],
            ].map(([n, t]) => (
              <tr key={n}>
                <td className="num">{n}+</td>
                <td>{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/** Kinds of thing whose damage is worth tracking (City & Guild, Damaged Goods: most items Size −1, great weapons 0, a house +5, a ship up to +8, a castle +10). */
const ITEM_KINDS: { id: string; label: string; size: number; lock?: boolean; ability?: string }[] = [
  { id: 'weapon', label: 'A sword, axe or other single weapon', size: -1, ability: 'single-weapon' },
  { id: 'great', label: 'A great weapon (two-handed)', size: 0, ability: 'great-weapon' },
  { id: 'bow', label: 'A bow or crossbow', size: -1, ability: 'bows' },
  { id: 'shield', label: 'A shield', size: -1, ability: 'single-weapon' },
  { id: 'armor', label: 'A suit of armor', size: -1 },
  { id: 'tool', label: 'A tool, instrument or other small thing', size: -1 },
  { id: 'lock', label: 'A lock (twice the damage levels)', size: -1, lock: true },
  { id: 'cart', label: 'A cart or wagon', size: 2 },
  { id: 'house', label: 'A house', size: 5 },
  { id: 'ship', label: 'A ship', size: 8 },
  { id: 'castle', label: 'A castle', size: 10 },
];
const qualityOf = (q?: number): ItemQuality => (q === undefined || q === 0 ? 'standard' : q < 0 ? 'shoddy' : q >= 3 ? 'excellent' : 'superior');

interface ItemPick {
  key: string;
  name: string;
  kind: string;
  quality: ItemQuality;
  ability?: string;
  magnitudes?: number;
}

/**
 * Damaged goods (City & Guild ch.4): an item's damage levels and the stress check when a botch or an
 * unnatural use puts it at risk. The item is one a character carries (a weapon, their armor, an
 * enchanted device) or a kind of thing; its levels, the modifiers and the chance are shown, a damaged
 * item can be repaired, and a broken one put aside for another.
 */
export function ItemCheck({ x }: { x: { chars: Character[]; data: GameData; rules?: HouseRules } }) {
  const [owner, setOwner] = useState('');
  const [pickKey, setPickKey] = useState('kind:weapon');
  const [name, setName] = useState('');
  const [quality, setQuality] = useState<ItemQuality>('standard');
  const [size, setSize] = useState(-1);
  const [lock, setLock] = useState(false);
  const [ability, setAbility] = useState(0);
  const [magnitudes, setMagnitudes] = useState(0);
  const [mods, setMods] = useState<string[]>([]);
  const [left, setLeft] = useState<number | undefined>();
  const [repaired, setRepaired] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const c = x.chars.find((y) => y.id === owner);
  // what the owner carries: weapons, shields, armor and enchanted devices
  const ownedOf = (c?: Character): ItemPick[] => !c
    ? []
    : [
        ...c.equipment.weapons.flatMap((w) => {
          const def = x.data.weaponById.get(w.weaponId);
          const out: ItemPick[] = def ? [{ key: `w:${w.uid}`, name: w.name || def.name, kind: def.ability === 'great-weapon' ? 'great' : def.kind === 'missile' ? 'bow' : 'weapon', quality: qualityOf(w.quality), ability: def.ability }] : [];
          const sh = w.shieldId ? x.data.weaponById.get(w.shieldId) : undefined;
          if (sh) out.push({ key: `s:${w.uid}`, name: sh.name, kind: 'shield', quality: 'standard', ability: def?.ability });
          return out;
        }),
        ...(c.equipment.armorId && c.equipment.armorCoverage !== 'none' ? [{ key: 'armor', name: `${x.data.armorById.get(c.equipment.armorId)?.name ?? 'Armor'} (${c.equipment.armorCoverage})`, kind: 'armor', quality: 'standard' as ItemQuality }] : []),
        ...c.items.map((it) => ({ key: `i:${it.uid}`, name: it.name || 'Enchanted device', kind: 'tool', quality: 'standard' as ItemQuality, magnitudes: it.effects.reduce((t, e) => t + Math.ceil((e.modifiedLevel ?? 0) / 5), 0) })),
      ];
  const owned = ownedOf(c);
  const choose = (key: string, who = c) => {
    setPickKey(key);
    setLeft(undefined);
    setRepaired(false);
    setHistory([]);
    const mine = ownedOf(who).find((o) => o.key === key);
    const k = ITEM_KINDS.find((y) => y.id === (mine?.kind ?? key.replace(/^kind:/, ''))) ?? ITEM_KINDS[0];
    setName(mine?.name ?? '');
    setQuality(mine?.quality ?? 'standard');
    setSize(k.size);
    setLock(!!k.lock);
    setMagnitudes(mine?.magnitudes ?? 0);
    const ab = mine?.ability ?? k.ability;
    setAbility(who && ab ? abilityTotal(deriveCharacter(who, x.data, x.rules ?? DEFAULT_HOUSE_RULES), ab) : 0);
  };
  const kindOf = owned.find((o) => o.key === pickKey)?.kind ?? pickKey.replace(/^kind:/, '');
  const k = ITEM_KINDS.find((y) => y.id === kindOf) ?? ITEM_KINDS[0];
  const abilityId = owned.find((o) => o.key === pickKey)?.ability ?? k.ability;
  const levels = itemDamageLevels(quality, size, lock);
  const base = itemDamageLevels(quality, -1, false);
  const sizeMult = itemDamageLevels(quality, size, false) / base;
  const situation = ITEM_CHECK_MODS.filter((m) => mods.includes(m.id) || (m.id === 'repaired' && repaired));
  const total = ability + ITEM_QUALITY_MOD[quality] + magnitudes + situation.reduce((t, m) => t + m.value, 0);
  const now = Math.min(left ?? levels, levels);
  const odds = stressChance(total, 15, 1);
  const label = name || k.label.replace(/^A /, 'the ').replace(/ \(.*\)$/, '');
  const roll = () => {
    const r = itemStressCheck(total);
    const after = Math.max(0, now - r.lost);
    setLeft(after);
    setHistory((h) => [`${r.text}${r.lost ? ` ${after ? `${after} of ${levels} damage levels left.` : 'It is broken.'}` : ''}`, ...h].slice(0, 8));
  };
  const parts = [
    ability ? `${c?.name ? `${c.name}’s ` : ''}${abilityId ? x.data.abilityById.get(abilityId)?.name ?? 'Ability' : 'Ability'} ${signed(ability)}` : '',
    ITEM_QUALITY_MOD[quality] ? `${quality} quality ${signed(ITEM_QUALITY_MOD[quality])}` : '',
    magnitudes ? `enchantment ${signed(magnitudes)}` : '',
    ...situation.map((m) => `${m.label.toLowerCase()} ${signed(m.value)}`),
  ].filter(Boolean);
  return (
    <Card title="Damaged goods: will it survive? (City & Guild)" tour="item-check">
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
        When a botch puts a character&apos;s sword, armor or other valued item at risk.
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
                choose(ownedOf(who)[0]?.key ?? 'kind:weapon', who);
              }}
            >
              <option value="">— no one in particular —</option>
              {x.chars.map((y) => (
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
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="A kind of item">
              {ITEM_KINDS.map((y) => (
                <option key={y.id} value={`kind:${y.id}`}>
                  {y.label}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="What it is called">
          <input value={name} placeholder={k.label.replace(/ \(.*\)$/, '')} style={{ width: 150 }} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      <div className="row small" style={{ marginTop: 4 }}>
        <Field label="Quality">
          <select value={quality} onChange={(e) => (setQuality(e.target.value as ItemQuality), setLeft(undefined))}>
            {(Object.keys(ITEM_QUALITY_MOD) as ItemQuality[]).map((q) => (
              <option key={q} value={q}>
                {q === 'supernatural' ? 'wondrous or magical' : q} ({signed(ITEM_QUALITY_MOD[q])})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Size" hint="Most items −1, great weapons 0, a house +5, a ship up to +8, a castle +10">
          <Stepper value={size} min={-5} max={12} width={34} onChange={(v) => (setSize(v), setLeft(undefined))} />
        </Field>
        <label className="inline" title="Locks have twice the damage levels of other items their Size">
          <input type="checkbox" checked={lock} onChange={(e) => (setLock(e.target.checked), setLeft(undefined))} /> a lock
        </label>
        <Field label={abilityId && c ? `${x.data.abilityById.get(abilityId)?.name ?? 'Ability'} (from the sheet)` : 'Ability of the one using it'} hint="Trained to use it: + the Ability score">
          <Stepper value={ability} min={0} max={15} width={30} onChange={setAbility} />
        </Field>
        <Field label="Enchantment magnitudes" hint="A Hermetic item: + the magnitudes of its instilled effects">
          <Stepper value={magnitudes} min={0} max={30} width={30} onChange={setMagnitudes} />
        </Field>
      </div>
      <div className="row small" style={{ marginTop: 4 }}>
        {ITEM_CHECK_MODS.filter((m) => m.id !== 'repaired').map((m) => (
          <label key={m.id} className="inline">
            <input type="checkbox" checked={mods.includes(m.id)} onChange={(e) => setMods((xs) => (e.target.checked ? [...xs, m.id] : xs.filter((y) => y !== m.id)))} /> {m.label} ({signed(m.value)})
          </label>
        ))}
        <label className="inline">
          <input type="checkbox" checked={repaired} onChange={(e) => setRepaired(e.target.checked)} /> previously repaired (−1)
        </label>
      </div>
      <p className="small" style={{ margin: '6px 0 0' }}>
        <b>{label.replace(/^./, (y) => y.toUpperCase())}</b>: {quality === 'supernatural' ? 'wondrous' : quality}, Size {signed(size)}: {levels} damage levels ({base} for its quality
        {sizeMult > 1 ? ` × ${sizeMult} for its Size` : ''}
        {lock ? ' × 2 for a lock' : ''}).{' '}
        <span className={`badge ${now === 0 ? 'bad' : now < levels ? 'warn' : ''}`}>{now === 0 ? 'broken' : `${now} of ${levels} left`}</span>
      </p>
      <p className="small" style={{ margin: '2px 0 0' }}>
        The check: a stress die {signed(total)}
        {parts.length ? ` (${parts.join(', ')})` : ''} against 15: {pct(odds.chance)} it comes through unharmed, {pct(odds.botch)} a botch (a damage level more for each).
      </p>
      <div className="row small" style={{ marginTop: 6 }}>
        <button className="small primary" disabled={now === 0} onClick={roll}>
          Roll the check
        </button>
        {now > 0 && now < levels && (
          <button className="small" title={repairNeeds(quality).text} onClick={() => (setLeft(undefined), setRepaired(true), setHistory((h) => [`Repaired: ${repairNeeds(quality).text.replace('A broken item cannot be repaired.', '').trim()} It counts as previously repaired from now on (−1).`, ...h]))}>
            Repair it ({levels - now} Labor Point{levels - now === 1 ? '' : 's'})
          </button>
        )}
        {(now === 0 || history.length > 0) && (
          <button className="small ghost" onClick={() => choose(pickKey)}>
            {now === 0 ? 'Put it aside: check another item' : 'Start again'}
          </button>
        )}
      </div>
      {now === 0 && <p className="small bad-text" style={{ margin: '4px 0 0' }}>It is broken. A broken item cannot be repaired and must be discarded (City &amp; Guild); choose another item above, or start again.</p>}
      {history.length > 0 && (
        <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {history.map((t, i) => (
            <li key={i} className={i ? 'muted' : ''}>
              {t}
            </li>
          ))}
        </ul>
      )}
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Repair: {repairNeeds(quality).text}
        {lock && LOCK_PICK_EASE[quality] !== undefined ? ` Picking it: Dexterity + Legerdemain + a stress die against ${LOCK_PICK_EASE[quality]}, with tools.` : ''}
      </p>
    </Card>
  );
}
