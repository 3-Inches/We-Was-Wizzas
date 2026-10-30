// The Dice page's rolls with two sides or the world in them (engine/rolls.ts): an opposed roll, a blow
// in combat from Attack to wound, and the core book's perils. Each side can be a character of the saga
// last opened (its totals filled in, a wound applied to its sheet) or plain numbers.

import { useState } from 'react';
import { CHARACTERISTICS, CHAR_NAMES, type Characteristic, type GameData } from '../../data';
import { abilityTotal, deriveCharacter, type DerivedCharacter } from '../../engine/character/derive';
import { allCombatLines, woundFromDamage } from '../../engine/combat';
import { COVERAGE, DEPRIVATION, HEAT_SOURCES, IMPACTS, OPPOSED_PRESETS, deprivationEase, exchange, fallingBonus, opposedRoll, perilDamage, staminaCheck, type WoundLevel } from '../../engine/rolls';
import { DEFAULT_HOUSE_RULES, type Character, type HouseRules } from '../../engine/types';
import { useStore } from '../../store/store';
import { Card, Field, Stepper, signed } from '../kit';

interface Ctx {
  chars: Character[];
  data: GameData;
  rules?: HouseRules;
}

const derive = (x: Ctx, id?: string) => {
  const c = x.chars.find((y) => y.id === id);
  return c ? { c, d: deriveCharacter(c, x.data, x.rules ?? DEFAULT_HOUSE_RULES) } : undefined;
};

function CharSelect({ x, value, onChange, label = 'Who' }: { x: Ctx; value?: string; onChange: (id?: string) => void; label?: string }) {
  if (!x.chars.length) return null;
  return (
    <Field label={label}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">— numbers only —</option>
        {x.chars.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name || 'Unnamed'}
          </option>
        ))}
      </select>
    </Field>
  );
}

const woundText = (w: WoundLevel) => (w === 'none' ? 'no wound' : w === 'dead' ? 'death' : `a${w === 'incapacitating' ? 'n' : ''} ${w[0].toUpperCase()}${w.slice(1)} Wound`);

function useApplyWound() {
  const updateCharacter = useStore((s) => s.updateCharacter);
  return (id: string, w: WoundLevel) =>
    updateCharacter(id, (c) => {
      if (w === 'dead') c.wounds.dead = true;
      else if (w !== 'none') c.wounds[w] += 1;
    });
}

// ------------------------------------------------------------------ opposed roll

interface Side {
  charId?: string;
  k: Characteristic;
  ability: string;
  mod: number;
  botch: number;
}

function SideFields({ x, side, set, title }: { x: Ctx; side: Side; set: (s: Side) => void; title: string }) {
  const got = derive(x, side.charId);
  const total = got ? got.d.characteristics[side.k].value + (side.ability ? abilityTotal(got.d, side.ability) : 0) + side.mod : side.mod;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <b className="small">{title}</b>
      <div className="row small">
        <CharSelect x={x} value={side.charId} onChange={(id) => set({ ...side, charId: id })} />
        {got && (
          <>
            <Field label="Characteristic">
              <select value={side.k} onChange={(e) => set({ ...side, k: e.target.value as Characteristic })}>
                {CHARACTERISTICS.map((k) => (
                  <option key={k} value={k}>
                    {CHAR_NAMES[k]} ({signed(got.d.characteristics[k].value)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ability">
              <select value={side.ability} onChange={(e) => set({ ...side, ability: e.target.value })}>
                <option value="">— none —</option>
                {[...new Map(got.d.abilities.map((a) => [a.abilityId, a])).values()].map((a) => (
                  <option key={a.abilityId} value={a.abilityId}>
                    {a.name} ({abilityTotal(got.d, a.abilityId)})
                  </option>
                ))}
                {side.ability && !got.d.abilities.some((a) => a.abilityId === side.ability) && <option value={side.ability}>{side.ability.replace(/-/g, ' ')} (0)</option>}
              </select>
            </Field>
          </>
        )}
        <Field label={got ? 'Other modifiers' : 'Total before the die'}>
          <Stepper value={side.mod} width={40} onChange={(v) => set({ ...side, mod: v })} />
        </Field>
        <Field label="Botch dice">
          <Stepper value={side.botch} min={0} max={10} width={34} onChange={(v) => set({ ...side, botch: v })} />
        </Field>
      </div>
      {got && <span className="small muted">Total {total} + a stress die.</span>}
    </div>
  );
}

export function OpposedCard({ x }: { x: Ctx }) {
  const [preset, setPreset] = useState(OPPOSED_PRESETS[0].id);
  const p = OPPOSED_PRESETS.find((y) => y.id === preset)!;
  const [a, setA] = useState<Side>({ k: p.a[0], ability: p.a[1], mod: 0, botch: 1 });
  const [b, setB] = useState<Side>({ k: p.b[0], ability: p.b[1], mod: 0, botch: 1 });
  const [out, setOut] = useState<string[]>([]);
  const totalOf = (s: Side) => {
    const got = derive(x, s.charId);
    return got ? got.d.characteristics[s.k].value + (s.ability ? abilityTotal(got.d, s.ability) : 0) + s.mod : s.mod;
  };
  const nameOf = (s: Side, n: string) => x.chars.find((c) => c.id === s.charId)?.name || n;
  return (
    <Card title="Opposed roll">
      <p className="small muted" style={{ marginTop: 0 }}>
        Both sides roll a stress die; the higher total wins. On a tie the one resisting holds and nothing changes. A botch loses.
      </p>
      <Field label="The contest (usual pairings)">
        <select
          value={preset}
          onChange={(e) => {
            const q = OPPOSED_PRESETS.find((y) => y.id === e.target.value)!;
            setPreset(q.id);
            setA({ ...a, k: q.a[0], ability: q.a[1] });
            setB({ ...b, k: q.b[0], ability: q.b[1] });
          }}
        >
          {OPPOSED_PRESETS.map((q) => (
            <option key={q.id} value={q.id}>
              {q.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-2" style={{ marginTop: 6 }}>
        <SideFields x={x} side={a} set={setA} title="Who acts" />
        <SideFields x={x} side={b} set={setB} title="Who resists" />
      </div>
      <button className="primary" style={{ marginTop: 6 }} onClick={() => setOut([`${nameOf(a, 'The first')} against ${nameOf(b, 'the second')}: ${opposedRoll({ mod: totalOf(a), botch: a.botch }, { mod: totalOf(b), botch: b.botch }).text}`, ...out].slice(0, 8))}>
        Roll both
      </button>
      {out.map((t, i) => (
        <div key={i} className={`small ${i ? 'muted' : ''}`}>
          {t}
        </div>
      ))}
    </Card>
  );
}

// ------------------------------------------------------------------ a blow in combat

function lineOptions(x: Ctx, d: DerivedCharacter) {
  return allCombatLines(d, x.data);
}

export function BlowCard({ x }: { x: Ctx }) {
  const apply = useApplyWound();
  const [atkId, setAtkId] = useState<string>();
  const [dfnId, setDfnId] = useState<string>();
  const [atkLine, setAtkLine] = useState(0);
  const [dfnLine, setDfnLine] = useState(0);
  const [m, setM] = useState({ atk: 6, dam: 5, dfn: 6, soak: 3, size: 0 });
  const [res, setRes] = useState<{ text: string; wound: WoundLevel; to?: string }>();
  const A = derive(x, atkId);
  const D = derive(x, dfnId);
  const al = A ? lineOptions(x, A.d).filter((l) => l.atk !== null) : [];
  const dl = D ? lineOptions(x, D.d) : [];
  const atk = A ? (al[atkLine]?.atk ?? 0) : m.atk;
  const dam = A ? (al[atkLine]?.dam ?? 0) : m.dam;
  const dfn = D ? (dl[dfnLine]?.dfn ?? 0) : m.dfn;
  const soak = D ? D.d.soak : m.soak;
  return (
    <Card title="A blow in combat">
      <p className="small muted" style={{ marginTop: 0 }}>
        Attack against Defense, each with a stress die. If it lands, the Attack Advantage plus the weapon’s Damage, less Soak, gives the wound.
      </p>
      <div className="grid grid-2">
        <div className="row small">
          <CharSelect x={x} value={atkId} onChange={(id) => (setAtkId(id), setAtkLine(0))} label="Attacker" />
          {A ? (
            <Field label="With">
              <select value={atkLine} onChange={(e) => setAtkLine(Number(e.target.value))}>
                {al.map((l, i) => (
                  <option key={i} value={i}>
                    {l.name} (Atk {signed(l.atk ?? 0)}, Dam {signed(l.dam ?? 0)})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Attack">
                <Stepper value={m.atk} width={40} onChange={(v) => setM({ ...m, atk: v })} />
              </Field>
              <Field label="Damage">
                <Stepper value={m.dam} width={40} onChange={(v) => setM({ ...m, dam: v })} />
              </Field>
            </>
          )}
        </div>
        <div className="row small">
          <CharSelect x={x} value={dfnId} onChange={(id) => (setDfnId(id), setDfnLine(0))} label="Defender" />
          {D ? (
            <Field label="Defending with">
              <select value={dfnLine} onChange={(e) => setDfnLine(Number(e.target.value))}>
                {dl.map((l, i) => (
                  <option key={i} value={i}>
                    {l.name} (Dfn {signed(l.dfn)})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Defense">
                <Stepper value={m.dfn} width={40} onChange={(v) => setM({ ...m, dfn: v })} />
              </Field>
              <Field label="Soak">
                <Stepper value={m.soak} width={40} onChange={(v) => setM({ ...m, soak: v })} />
              </Field>
              <Field label="Size">
                <Stepper value={m.size} min={-4} max={10} width={34} onChange={(v) => setM({ ...m, size: v })} />
              </Field>
            </>
          )}
        </div>
      </div>
      <button
        className="primary"
        style={{ marginTop: 6 }}
        onClick={() => {
          const r = exchange({ atk, dam, dfn, soak, size: m.size, wound: D ? (e) => woundFromDamage(D.d, e) : undefined });
          setRes({ text: `${A?.c.name ?? 'The attacker'} strikes at ${D?.c.name ?? 'the defender'}. ${r.text}`, wound: r.wound, to: D?.c.id });
        }}
      >
        Strike
      </button>
      {res && (
        <div className="row small" style={{ marginTop: 6 }}>
          <span style={{ flex: 1 }}>{res.text}</span>
          {res.to && res.wound !== 'none' && (
            <button className="small danger" onClick={() => (apply(res.to!, res.wound), setRes({ ...res, to: undefined }))}>
              Give {D?.c.name} {woundText(res.wound)}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ perils

type Peril = 'fall' | 'heat' | 'impact' | 'poison' | 'deprivation';

export function PerilsCard({ x }: { x: Ctx }) {
  const apply = useApplyWound();
  const updateCharacter = useStore((s) => s.updateCharacter);
  const [who, setWho] = useState<string>();
  const [peril, setPeril] = useState<Peril>('fall');
  const [feet, setFeet] = useState(10);
  const [surface, setSurface] = useState<'normal' | 'hard' | 'soft'>('normal');
  const [heat, setHeat] = useState(0);
  const [cover, setCover] = useState(1);
  const [impact, setImpact] = useState(0);
  const [ease, setEase] = useState(9);
  const [agentWound, setAgentWound] = useState<WoundLevel>('medium');
  const [dep, setDep] = useState(0);
  const [periods, setPeriods] = useState(1);
  const [manualSoak, setManualSoak] = useState(2);
  const [manualSta, setManualSta] = useState(0);
  const [res, setRes] = useState<{ text: string; wound?: WoundLevel; fatigue?: 'short' | 'long' }>();
  const W = derive(x, who);
  const soak = W ? W.d.soak : manualSoak;
  const sta = W ? W.d.characteristics.Sta.value : manualSta;
  const wfn = W ? (e: number) => woundFromDamage(W.d, e) : undefined;
  const roll = () => {
    if (peril === 'fall') {
      const r = perilDamage(fallingBonus(feet, surface), soak, wfn);
      return setRes({ text: `A fall of ${feet} feet${surface === 'normal' ? '' : ` onto ${surface === 'hard' ? 'a hard' : 'a soft'} surface`}: ${r.text}`, wound: r.wound });
    }
    if (peril === 'heat') {
      const b = HEAT_SOURCES[heat].bonus * COVERAGE[cover].mult;
      const r = perilDamage(b, soak, wfn);
      return setRes({ text: `${HEAT_SOURCES[heat].label} on ${COVERAGE[cover].label} (+${b}, every six seconds it lasts): ${r.text}`, wound: r.wound });
    }
    if (peril === 'impact') {
      const r = perilDamage(IMPACTS[impact].bonus, soak, wfn);
      return setRes({ text: `${IMPACTS[impact].label}: ${r.text}`, wound: r.wound });
    }
    if (peril === 'poison') {
      const r = staminaCheck(sta, ease);
      return setRes({ text: `Poison or disease (Ease ${ease}): ${r.text}${r.ok ? ' Only minor discomfort.' : ` ${woundText(agentWound)}, treated with Medicine.`}`, wound: r.ok ? undefined : agentWound });
    }
    const d = DEPRIVATION[dep];
    const e = deprivationEase(periods);
    const r = staminaCheck(sta, e);
    setRes({ text: `Without ${d.label.toLowerCase()} (check ${periods}, each ${d.period}; Ease ${e}): ${r.text}${r.ok ? '' : ` A ${d.longTerm ? 'Long-Term' : 'Short-Term'} Fatigue level is lost (once unconscious, a Light Wound instead).`}`, fatigue: r.ok ? undefined : d.longTerm ? 'long' : 'short' });
  };
  return (
    <Card title="Perils: falls, fire, poison, going without">
      <div className="row small">
        <CharSelect x={x} value={who} onChange={setWho} />
        {!W && (
          <>
            <Field label="Soak">
              <Stepper value={manualSoak} width={36} onChange={setManualSoak} />
            </Field>
            <Field label="Stamina">
              <Stepper value={manualSta} min={-5} max={5} width={34} onChange={setManualSta} />
            </Field>
          </>
        )}
        <Field label="What">
          <select value={peril} onChange={(e) => (setPeril(e.target.value as Peril), setRes(undefined))}>
            <option value="fall">A fall</option>
            <option value="heat">Fire, heat or corrosion</option>
            <option value="impact">Something falls on them</option>
            <option value="poison">Poison or disease</option>
            <option value="deprivation">Without air, water or food</option>
          </select>
        </Field>
      </div>
      <div className="row small" style={{ marginTop: 4 }}>
        {peril === 'fall' && (
          <>
            <Field label="Feet">
              <Stepper value={feet} min={1} width={40} onChange={setFeet} />
            </Field>
            <Field label="Onto">
              <select value={surface} onChange={(e) => setSurface(e.target.value as typeof surface)}>
                <option value="normal">the ground</option>
                <option value="hard">stone or rock (doubled)</option>
                <option value="soft">water, hay, snow (halved)</option>
              </select>
            </Field>
          </>
        )}
        {peril === 'heat' && (
          <>
            <Field label="Source">
              <select value={heat} onChange={(e) => setHeat(Number(e.target.value))}>
                {HEAT_SOURCES.map((h, i) => (
                  <option key={h.label} value={i}>
                    {h.label} (+{h.bonus})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="On">
              <select value={cover} onChange={(e) => setCover(Number(e.target.value))}>
                {COVERAGE.map((c, i) => (
                  <option key={c.label} value={i}>
                    {c.label} (×{c.mult})
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {peril === 'impact' && (
          <Field label="What falls">
            <select value={impact} onChange={(e) => setImpact(Number(e.target.value))}>
              {IMPACTS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label} (+{p.bonus})
                </option>
              ))}
            </select>
          </Field>
        )}
        {peril === 'poison' && (
          <>
            <Field label="Ease Factor" hint="Adder 6, asp 9, monkshood 9, arsenic 9; a disease 6 strikes half the people, 12 almost all">
              <Stepper value={ease} min={3} max={15} width={36} onChange={setEase} />
            </Field>
            <Field label="Its wound">
              <select value={agentWound} onChange={(e) => setAgentWound(e.target.value as WoundLevel)}>
                {(['light', 'medium', 'heavy', 'incapacitating'] as WoundLevel[]).map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {peril === 'deprivation' && (
          <>
            <Field label="Without">
              <select value={dep} onChange={(e) => setDep(Number(e.target.value))}>
                {DEPRIVATION.map((d, i) => (
                  <option key={d.id} value={i}>
                    {d.label} (a check every {d.period})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Check">
              <Stepper value={periods} min={1} max={30} width={36} onChange={setPeriods} />
            </Field>
          </>
        )}
        <button className="primary" onClick={roll}>
          Roll
        </button>
      </div>
      {res && (
        <div className="row small" style={{ marginTop: 6 }}>
          <span style={{ flex: 1 }}>{res.text}</span>
          {W && res.wound && res.wound !== 'none' && (
            <button className="small danger" onClick={() => (apply(W.c.id, res.wound!), setRes({ ...res, wound: undefined }))}>
              Give {W.c.name} {woundText(res.wound)}
            </button>
          )}
          {W && res.fatigue && (
            <button
              className="small danger"
              onClick={() => (updateCharacter(W.c.id, (c) => void (res.fatigue === 'long' ? (c.longTermFatigueLost = Math.min(5, c.longTermFatigueLost + 1)) : (c.fatigueLost = Math.min(5, c.fatigueLost + 1)))), setRes({ ...res, fatigue: undefined }))}
            >
              {W.c.name} loses a Fatigue level
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
