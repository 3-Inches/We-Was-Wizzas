import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { describeStress, pct, simpleChance, simpleDie, stressChance, stressDie } from '../../engine/dice';
import { abilityTotal, deriveCharacter } from '../../engine/character/derive';
import { actionPenalties, penaltyText } from '../../engine/rolls';
import { DEFAULT_HOUSE_RULES, type Character, type HouseRules } from '../../engine/types';
import { CHARACTERISTICS, CHAR_NAMES, type Characteristic, type GameData } from '../../data';
import { Card, Empty, Field, Stepper, Tabs, signed } from '../kit';
import { RulesNote } from '../RulesNote';
import { useStore } from '../../store/store';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { BlowCard, OpposedCard, PerilsCard } from './TableRolls';
import { AfterRoll, type AfterRollChange } from '../AfterRoll';
import { AtTable, DICE_LABELS, PeopleOptions, canPlay, castsSpells, groupPeople, type PeopleGroup } from '../play';
import { DICE_SUBS, R, type DiceSub } from '../routes';
import { useCharEditor, type CharEditor } from '../character/useChar';
import { CombatRolls, GroupCombat } from '../character/sheet/CombatTab';
import MagicTab from '../character/sheet/MagicTab';
import { TwilightCard } from '../character/sheet/Twilight';
import { HeartbeastChange } from '../character/sheet/MysteriesCard';
import { SilverRescue } from '../character/sheet/LabItemsTab';

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
  /** who rolled, and the botch dice when it botched: Confidence, Faith and All According to Plan after it */
  who?: string;
  faces?: number[];
  /** what the roll comes to after Confidence or Faith, when they were spent on it */
  after?: number;
}

let seq = 0;

/**
 * The Game Table's Dice page, in four parts: any roll (for anyone, their wounds, Fatigue and disease
 * counted), combat and perils, and spellcasting and certamen (society and the Tribunal have a page of their own). Each
 * part picks its character from the saga's people, the Tribunal's too, and what it rolls goes on their
 * sheet. On its own (with a heading) when no saga is open, only the first part.
 */
export default function DicePage({ standalone }: { standalone?: boolean } = {}) {
  // the saga last opened: its characters take part in the rolls
  const sagaId = useStore((s) => s.activeSagaId);
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const all = useSagaCharacters(sagaId);
  const covs = useSagaCovenants(sagaId);
  const chars = useMemo(() => all.filter(canPlay), [all]);
  const groups = useMemo(() => groupPeople(chars, covs), [chars, covs]);
  const x = { chars: groups.flatMap((g) => g.people), data, rules: saga?.houseRules, groups };
  const [params, setParams] = useSearchParams();
  const raw = params.get('sub');
  const sub: DiceSub = saga && (DICE_SUBS as readonly string[]).includes(raw ?? '') ? (raw as DiceSub) : 'roll';
  const who = params.get('who') ?? '';
  const set = (k: 'sub' | 'who', v?: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v && !(k === 'sub' && v === 'roll')) n.set(k, v);
        else n.delete(k);
        return n;
      },
      { replace: true },
    );
  return (
    <div className="stack">
      {standalone && <h1>Dice</h1>}
      {saga && <Tabs tabs={DICE_SUBS.map((id) => ({ id, label: DICE_LABELS[id] }))} value={sub} onChange={(t) => set('sub', t)} />}
      {sub === 'roll' && <RollPart x={x} who={who} />}
      {saga && sub === 'combat' && <CombatPart sagaId={saga.id} x={x} who={who} setWho={(id) => set('who', id)} />}
      {saga && sub === 'magic' && <MagicPart sagaId={saga.id} x={x} who={who} setWho={(id) => set('who', id)} />}
      {!saga && <p className="small muted">Open a saga first and its characters can take part in these rolls, their wounds going on their sheets.</p>}
    </div>
  );
}

interface X {
  chars: Character[];
  data: GameData;
  rules?: HouseRules;
  groups: PeopleGroup[];
}

/** Who acts in a part: one of the saga's people, the players' first, the Tribunal's after. */
function WhoPicker({ x, value, onChange, keep, label, none }: { x: X; value?: string; onChange: (id: string) => void; keep?: (c: Character) => boolean; label: string; none: string }) {
  const groups = keep ? x.groups.map((g) => ({ ...g, people: g.people.filter(keep) })).filter((g) => g.people.length) : x.groups;
  if (!groups.length) return <Empty>{none}</Empty>;
  return (
    <Field label={label}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <PeopleOptions groups={groups} />
      </select>
    </Field>
  );
}

/** The character a part works on: the one asked for, else the first who fits. */
const pick = (x: X, who: string, keep: (c: Character) => boolean = () => true) => x.chars.find((c) => c.id === who && keep(c)) ?? x.chars.find(keep);

/** A character's own cards, at the table: their rolls shown, what they cost put on their sheet. */
function CharAtTable({ sagaId, charId, children }: { sagaId: string; charId: string; children: (ed: CharEditor) => ReactNode }) {
  const ed = useCharEditor({ sagaId, charId });
  if (!ed.c || !ed.d) return null;
  return <AtTable>{children(ed)}</AtTable>;
}

function CharLink({ sagaId, c, tab }: { sagaId: string; c: Character; tab?: string }) {
  return (
    <Link to={R.character(sagaId, c, tab)} className="small">
      {c.name || 'Their'} sheet ›
    </Link>
  );
}

/** Any roll, for anyone: their Characteristic + Ability, less what wounds, Fatigue and disease take off. */
function RollPart({ x, who }: { x: X; who: string }) {
  const [label, setLabel] = useState('');
  const [mod, setMod] = useState(0);
  const [botchDice, setBotchDice] = useState(1);
  const [ease, setEase] = useState(6);
  const [useEase, setUseEase] = useState(true);
  const [equipment, setEquipment] = useState<Equipment>('none');
  const target = Math.max(0, ease - EQUIPMENT[equipment]);
  const [log, setLog] = useState<Roll[]>([]);
  const last = log[0];
  // a character of the saga rolling: their Characteristic + Ability and penalties make the total
  const [rollerId, setRollerId] = useState(who && x.chars.some((c) => c.id === who) ? who : '');
  const [rollChar, setRollChar] = useState<Characteristic>('Per');
  const [rollAbility, setRollAbility] = useState('awareness');
  const [withPenalties, setWithPenalties] = useState(true);
  const [physical, setPhysical] = useState(false);
  const roller = useMemo(() => {
    const c = x.chars.find((y) => y.id === rollerId);
    return c ? { c, d: deriveCharacter(c, x.data, x.rules ?? DEFAULT_HOUSE_RULES) } : undefined;
  }, [x.chars, x.data, x.rules, rollerId]);
  const pen = roller ? actionPenalties(roller.d) : undefined;
  const base = roller ? roller.d.characteristics[rollChar].value + (rollAbility ? abilityTotal(roller.d, rollAbility) : 0) : 0;
  const penTotal = pen && withPenalties ? pen.total - (physical ? pen.encumbrance : 0) : 0;
  const total = base + penTotal + mod;
  const abName = roller && rollAbility ? (roller.d.abilities.find((a) => a.abilityId === rollAbility)?.name ?? x.data.abilityById.get(rollAbility)?.name ?? rollAbility) : '';
  const autoLabel = roller ? `${roller.c.name || 'They'}: ${CHAR_NAMES[rollChar]}${abName ? ` + ${abName}` : ''}` : '';
  const breakdown = roller
    ? [
        `${CHAR_NAMES[rollChar]} ${signed(roller.d.characteristics[rollChar].value)}`,
        ...(rollAbility ? [`${abName} ${abilityTotal(roller.d, rollAbility)}`] : []),
        ...(withPenalties ? pen!.parts.map((p) => `${p.label} ${p.value}`) : []),
        ...(withPenalties && physical && pen!.encumbrance ? [`Encumbrance −${pen!.encumbrance}`] : []),
        ...(mod ? [`other ${signed(mod)}`] : []),
      ].join(', ')
    : '';

  const roll = (kind: 'simple' | 'stress') => {
    let t: number;
    let text: string;
    let botch = false;
    let faces: number[] | undefined;
    if (kind === 'simple') {
      const r = simpleDie();
      t = r.value + total;
      text = `${r.value}`;
    } else {
      const r = stressDie(botchDice);
      botch = r.botches > 0;
      if (botch) faces = r.botchFaces;
      t = r.zero ? total : r.value + total;
      text = describeStress(r);
    }
    setLog((l) => [{ id: ++seq, label: label || autoLabel || (kind === 'simple' ? 'Simple die' : 'Stress die'), kind, mod: total, ease: useEase ? target : null, equipment, total: t, text, botch, who: roller?.c.id, faces }, ...l].slice(0, 50));
  };
  const outcome = (r: Roll) => (r.botch ? 'BOTCH' : r.ease === null ? '' : (r.after ?? r.total) >= r.ease ? 'success' : 'failure');
  const lastBy = last?.who ? x.chars.find((c) => c.id === last.who) : undefined;
  const lastD = useMemo(() => (lastBy ? deriveCharacter(lastBy, x.data, x.rules ?? DEFAULT_HOUSE_RULES) : undefined), [lastBy, x.data, x.rules]);
  const afterLast = (ch: AfterRollChange) =>
    setLog((l) => l.map((r) => (r.id === last!.id ? { ...r, botch: ch.botch, after: ch.bonus ? r.total + ch.bonus : undefined, text: ch.faces && !ch.botch ? `0, no botch after All According to Plan (${ch.faces.join(',')})` : r.text } : r)));

  return (
    <>
      <div className="grid grid-2">
        <Card title="Roll" className="accent" tour="dice-roll">
          {x.chars.length > 0 && (
            <div className="row small">
              <Field label="Who rolls (optional)" hint="Their sheet gives the total, and their wounds, Fatigue and disease count">
                <select value={rollerId} onChange={(e) => setRollerId(e.target.value)}>
                  <option value="">— numbers only —</option>
                  <PeopleOptions groups={x.groups} />
                </select>
              </Field>
              {roller && (
                <>
                  <Field label="Characteristic">
                    <select value={rollChar} onChange={(e) => setRollChar(e.target.value as Characteristic)}>
                      {CHARACTERISTICS.map((k) => (
                        <option key={k} value={k}>
                          {CHAR_NAMES[k]} ({signed(roller.d.characteristics[k].value)})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ability">
                    <select value={rollAbility} onChange={(e) => setRollAbility(e.target.value)}>
                      <option value="">— none —</option>
                      {[...new Map(roller.d.abilities.map((a) => [a.abilityId, a])).values()].map((a) => (
                        <option key={a.abilityId} value={a.abilityId}>
                          {a.name} ({abilityTotal(roller.d, a.abilityId)})
                        </option>
                      ))}
                      {rollAbility && !roller.d.abilities.some((a) => a.abilityId === rollAbility) && <option value={rollAbility}>{abName} (0)</option>}
                    </select>
                  </Field>
                </>
              )}
            </div>
          )}
          {roller && pen && (
            <div className="small" style={{ marginTop: 4 }}>
              {pen.cannot && <div className="bad-text">{roller.c.name || 'They'}: {pen.cannot}.</div>}
              {pen.parts.length > 0 || pen.encumbrance > 0 ? (
                <div className="row tight">
                  <label className="inline">
                    <input type="checkbox" checked={withPenalties} onChange={(e) => setWithPenalties(e.target.checked)} /> their penalties ({penaltyText(pen) || 'none'})
                  </label>
                  {pen.encumbrance > 0 && (
                    <label className="inline" title="Encumbrance counts against physical tasks: climbing, swimming, sneaking, running (Initiative already has it)">
                      <input type="checkbox" checked={physical} onChange={(e) => setPhysical(e.target.checked)} /> a physical task (Encumbrance −{pen.encumbrance})
                    </label>
                  )}
                </div>
              ) : (
                <div className="muted">No wound, Fatigue or disease penalty.</div>
              )}
            </div>
          )}
          <Field label="What is this roll for?">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={autoLabel || 'e.g. Per + Awareness, Casting Pilum of Fire'} />
          </Field>
          <div className="row" style={{ marginTop: 8 }}>
            <Field label={roller ? 'Other modifiers' : 'Modifier (Characteristic + Ability …)'}>
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
          {roller && <div className="small" style={{ marginTop: 6 }}>Total {signed(total)}: {breakdown || 'nothing to add'}.</div>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary big" onClick={() => roll('stress')}>
              Stress die
            </button>
            <button className="big" onClick={() => roll('simple')}>
              Simple die
            </button>
            {useEase && (
              <span className="small muted">
                {signed(total)} against {target}: stress die {pct(stressChance(total, target, botchDice).chance)} ({pct(stressChance(total, target, botchDice).botch)} to botch), simple die {pct(simpleChance(total, target))}
              </span>
            )}
          </div>
          {last && (
            <div className={`dice-result ${last.botch ? 'bad' : outcome(last) === 'success' ? 'good' : outcome(last) === 'failure' ? 'warn' : ''}`} aria-live="polite">
              <div className="dice-total">{last.botch ? 'BOTCH' : (last.after ?? last.total)}</div>
              <div className="small">
                {last.label}: {last.text} {signed(last.mod)}
                {last.after !== undefined && ` ${signed(last.after - last.total)} Confidence or Faith`}
                {last.ease !== null && ` vs ${last.ease}${last.equipment !== 'none' ? ` (${last.equipment} equipment)` : ''} — ${outcome(last)}`}
              </div>
            </div>
          )}
          {last && lastBy && lastD && <AfterRoll key={last.id} c={lastBy} d={lastD} total={last.total} ease={last.ease} botchFaces={last.faces} onChange={afterLast} />}
          <p className="small muted">
            Stress die: a 1 means roll again and double (repeatedly); a 0 counts as zero and you roll the botch dice — any 0 on them is a botch. Simple die: 1–10, a 0 counts as 10 (DE
            p.7). Wound, Fatigue and disease penalties count against every roll and total but Soak (DE, Fatigue and Wounds).
          </p>
        </Card>
        <Card title="History" actions={<button className="small ghost" onClick={() => setLog([])}>Clear</button>}>
          {log.length === 0 && <div className="small muted">No rolls yet.</div>}
          {log.map((r) => (
            <div key={r.id} className="list-row small">
              <b style={{ minWidth: 40 }}>{r.botch ? '✖' : (r.after ?? r.total)}</b>
              <span style={{ flex: 1 }}>
                {r.label} ({r.kind}: {r.text} {signed(r.mod)})
              </span>
              {outcome(r) && <span className={`badge ${r.botch ? 'bad' : outcome(r) === 'success' ? 'good' : 'warn'}`}>{outcome(r)}</span>}
            </div>
          ))}
        </Card>
      </div>
      <OpposedCard x={x} />

      <Card title="Equipment bonuses" fold="dice-equipment" summary="The right tool lowers a task's Ease Factor: −1 for a minor bonus, −3 for a major one.">
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
      <Card title="Ease Factors (DE)" fold="dice-ease" summary="Trivial 0, Simple 3, Easy 6, Average 9, Hard 12, Very Hard 15 and up.">
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
    </>
  );
}

/** A fight: one character's combat rolls and their group, a blow from Attack to wound, and the perils. */
function CombatPart({ sagaId, x, who, setWho }: { sagaId: string; x: X; who: string; setWho: (id: string) => void }) {
  const c = pick(x, who);
  return (
    <>
      <div className="row">
        <WhoPicker x={x} value={c?.id} onChange={setWho} label="Who fights" none="Nobody in this saga can fight yet." />
        {c && <CharLink sagaId={sagaId} c={c} tab="combat" />}
      </div>
      {c && (
        <CharAtTable key={c.id} sagaId={sagaId} charId={c.id}>
          {(ed) => (
            <>
              <CombatRolls ed={ed} />
              <GroupCombat ed={ed} />
            </>
          )}
        </CharAtTable>
      )}
      <BlowCard x={x} />
      <PerilsCard x={x} />
    </>
  );
}

// a magus, the Gifted, or one who knows a spell: everyone else has no spellcasting to show
const casts = castsSpells;

/** Magic at the table: a caster's spells and spontaneous magic, certamen, Wizard's Twilight, a heartbeast's change, a familiar's help. */
function MagicPart({ sagaId, x, who, setWho }: { sagaId: string; x: X; who: string; setWho: (id: string) => void }) {
  const c = pick(x, who, casts);
  return (
    <>
      <div className="row">
        <WhoPicker x={x} value={c?.id} onChange={setWho} keep={casts} label="Who casts" none="Nobody in this saga casts spells." />
        {c && <CharLink sagaId={sagaId} c={c} tab="magic" />}
      </div>
      {c && (
        <CharAtTable key={c.id} sagaId={sagaId} charId={c.id}>
          {(ed) => (
            <>
              <MagicTab ed={ed} />
              <TwilightCard ed={ed} />
              <HeartbeastChange ed={ed} />
              {ed.c?.familiar && ed.c.familiar.silver > 0 && (
                <Card title={`${ed.c.familiar.name || 'The familiar'} (the silver cord)`}>
                  <SilverRescue silver={ed.c.familiar.silver} name={ed.c.familiar.name || 'The familiar'} />
                </Card>
              )}
            </>
          )}
        </CharAtTable>
      )}
    </>
  );
}

