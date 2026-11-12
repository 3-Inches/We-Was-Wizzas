// Game Table › Dice › Holy: the Divine at the table (Realms of Power: The Divine). Holy powers worked
// with a Method and a Power, a prayer for a miracle, God's aid, the saints and holy forbears, holy
// influence and tempers, the Divine Ascent, the Rings of Solomon, a Dominion rite and a celestial
// regio. What each costs (Confidence, Faith, Fatigue, wounds, Warping) goes on the sheet.

import { useMemo, useState, type ReactNode } from 'react';
import {
  ARS_NOTORIA_MODS, COMMANDING_AURA_RANKS, FORBEAR_INVOCATION_MODS, HOLY_EXAMPLES, HOLY_GUIDELINES, HOLY_POWERS, HOLY_TRADITIONS,
  MIRACLE_NEED, MIRACLE_TIMELINESS, SAINTS, SAINT_INVOCATION_MODS, SAINT_THREAT_MODS, SAINT_TIERS, SOLOMON_RINGS, TEMPERS, TRAGEDIES,
  type InvocationMod, type Saint,
} from '../../data/divine';
import { CHAR_NAMES } from '../../data';
import {
  ASCENT_FORMS, ascentCheck, ascentDuration, canInvokeGodsAid, divineAidBonus, godsAidTotal, holyEffectLevel, holyEffectTotal, holyMethodsOf,
  holyOutcome, holyPowersOf, influenceTotal, invokeSaintTotal, isHolyCharacter, methodWorksWith, miracleLevel, miracleTotal, ringUntil,
  saintMightLeft, saintPower, schism, temperName, threatEase, threatenSaintTotal, threatResult, threatText, worksHolyEffects, wouldBeRitual,
  holyWorkLabel, holyWorkPlan, holyWorksOpen, workHolySeason,
  type ActiveTemper, type AscentForm, type CeremonyGroup, type CeremonyMember, type HolyWork, type HolyWorkKind,
} from '../../engine/holy';
import { applySeason, newSeasonEntry } from '../../engine/longterm';
import { seasonBusy } from '../../engine/time';
import { auraAtTime, type AuraTime } from '../../engine/aura';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import { DURATIONS, RANGES, TARGETS } from '../../engine/spellDesign';
import type { AuraState, Part, Realm } from '../../engine/magic';
import { ensureAbility } from '../../engine/character/factory';
import type { DerivedCharacter } from '../../engine/character/derive';
import type { Character } from '../../engine/types';
import { Card, Field, HowItWorks, Stepper, Total, signed } from '../kit';
import { uid } from '../../util/id';
import { AfterRoll } from '../AfterRoll';
import type { CharEditor } from '../character/useChar';

const REALMS: Realm[] = ['Divine', 'Magic', 'Faerie', 'Infernal', 'None'];
const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const sum = (ps: Part[]) => ps.reduce((s, p) => s + p.value, 0);

/** The saga's other people, to pray together with (the Ceremony Ability). */
export interface Fellow {
  c: Character;
  d: DerivedCharacter;
}

/** One card's latest result, shown beside its buttons. */
function useLines(): [string[], (s: string | string[]) => void] {
  const [lines, setLines] = useState<string[]>([]);
  return [lines, (s) => setLines(Array.isArray(s) ? s : [s])];
}

function Lines({ lines }: { lines: string[] }) {
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
function spendPoint(ed: CharEditor, prefer: 'confidence' | 'faith'): string | undefined {
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
function AuraPicker({ value, onChange, when, setWhen }: { value: AuraState; onChange: (a: AuraState) => void; when: AuraTime; setWhen: (w: AuraTime) => void }) {
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
 * Praying together (the Ceremony Ability): the focus character has it; each who joins adds what the
 * rite asks of them. Led, the leader's Ceremony sets how many count; unled, (total Ceremony −
 * participants) is added too.
 */
function CeremonyPicker({ focus, fellows, adds, value, onChange }: { focus: DerivedCharacter; fellows: Fellow[]; adds: (f: Fellow) => number; value: CeremonyGroup | undefined; onChange: (g: CeremonyGroup | undefined) => void }) {
  const own = score(focus, 'ceremony');
  if (!own) return null;
  const chosen = new Set(value?.members.map((m) => m.name) ?? []);
  const toggle = (f: Fellow, on: boolean) => {
    const members: CeremonyMember[] = on
      ? [...(value?.members ?? []), { name: f.c.name || 'Unnamed', adds: adds(f), ceremony: score(f.d, 'ceremony') }]
      : (value?.members ?? []).filter((m) => m.name !== (f.c.name || 'Unnamed'));
    onChange(members.length ? { members, focusCeremony: own, leaderCeremony: value?.leaderCeremony } : undefined);
  };
  return (
    <details className="small" data-tour="holy-ceremony">
      <summary>Ceremony: pray together (Ceremony {own}){value?.members.length ? `, ${value.members.length} joining` : ''}</summary>
      <div className="row small" style={{ flexWrap: 'wrap' }}>
        {fellows.map((f) => (
          <label key={f.c.id} className="inline">
            <input type="checkbox" checked={chosen.has(f.c.name || 'Unnamed')} onChange={(e) => toggle(f, e.target.checked)} /> {f.c.name || 'Unnamed'} (+{adds(f)})
          </label>
        ))}
      </div>
      <label className="inline small">
        <input type="checkbox" checked={value?.leaderCeremony !== undefined} disabled={!value} onChange={(e) => value && onChange({ ...value, leaderCeremony: e.target.checked ? own : undefined })} /> led by the focus character (only so many count as the leader’s Ceremony; no group modifier)
      </label>
    </details>
  );
}

// ------------------------------------------------------------------------------------------------

/** The holy page: one character's holy side, card by card. */
export default function HolyPart({ ed, fellows }: { ed: CharEditor; fellows: Fellow[] }) {
  const { c, d, ctx } = ed;
  const [auraSet, setAura] = useState<AuraState>(ctx.aura);
  const [when, setWhen] = useState<AuraTime>('day');
  const aura = auraAtTime(auraSet, when);
  // Warping just gained, for the Divine Ascent card
  const [gained, setGained] = useState(0);
  if (!c || !d) return null;
  const others = fellows.filter((f) => f.c.id !== c.id);
  return (
    <div className="stack">
      <Card title="Here and now" className="accent" tour="holy-here">
        <div className="row">
          <AuraPicker value={auraSet} onChange={setAura} when={when} setWhen={setWhen} />
          <FaithLine ed={ed} />
        </div>
      </Card>
      <StandingCard ed={ed} />
      {worksHolyEffects(d) && <HolyPowerCard ed={ed} aura={aura} fellows={others} onWarping={setGained} />}
      {d.faithPoints > 0 && <MiracleCard ed={ed} aura={aura} fellows={others} />}
      <GodsAidCard ed={ed} fellows={others} />
      <SaintsCard ed={ed} aura={aura} />
      <InfluenceCard ed={ed} fellows={fellows} />
      {isHolyCharacter(d) && <AscentCard ed={ed} aura={aura} gained={gained} />}
      {score(d, 'ars-notoria') > 0 && <NotoriaCard ed={ed} />}
      {holyWorksOpen(d).length > 0 && <HolyWorksCard ed={ed} aura={aura} />}
      <RitesCard ed={ed} />
    </div>
  );
}

/** True Faith and Faith Points, with the dawn and the sacraments. */
function FaithLine({ ed }: { ed: CharEditor }) {
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
function StandingCard({ ed }: { ed: CharEditor }) {
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

// ------------------------------------------------------------------------------------------------
// Holy powers

function HolyPowerCard({ ed, aura, fellows, onWarping }: { ed: CharEditor; aura: AuraState; fellows: Fellow[]; onWarping: (n: number) => void }) {
  const { c, d, update, saga } = ed;
  const methods = useMemo(() => (d ? holyMethodsOf(d) : []), [d]);
  const powers = useMemo(() => (d ? holyPowersOf(d) : []), [d]);
  const [mid, setMid] = useState('');
  const [pid, setPid] = useState('');
  const [effect, setEffect] = useState('custom');
  const [base, setBase] = useState(5);
  const [range, setRange] = useState('Personal');
  const [duration, setDuration] = useState('Momentary');
  const [target, setTarget] = useState('Individual');
  const [asRitual, setAsRitual] = useState(false);
  const [extra, setExtra] = useState(0);
  const [mSpec, setMSpec] = useState(false);
  const [pSpec, setPSpec] = useState(false);
  const [textQ, setTextQ] = useState(10);
  const [purityCost, setPurityCost] = useState<'fatigue' | 'wound'>('fatigue');
  const [pay, setPay] = useState<'confidence' | 'faith'>('confidence');
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [other, setOther] = useState(0);
  const [lines, show] = useLines();
  const [last, setLast] = useState<{ total: number; level: number; faces?: number[]; trueFaith: number } | null>(null);
  if (!c || !d) return null;
  const pairs = methods.flatMap((m) => powers.filter((p) => methodWorksWith(m.as, p.id)).map((p) => ({ m, p })));
  const m = methods.find((x) => x.id === mid && pairs.some((y) => y.m.id === x.id)) ?? pairs[0]?.m;
  const okPowers = powers.filter((p) => m && methodWorksWith(m.as, p.id));
  const p = okPowers.find((x) => x.id === pid) ?? okPowers[0];
  if (!m || !p) return null;
  const guides = HOLY_GUIDELINES.map((g, i) => ({ g, i })).filter(({ g }) => g.power === p.id && g.method === m.as);
  const examples = HOLY_EXAMPLES.map((e, i) => ({ e, i })).filter(({ e }) => e.power === p.id && e.method === m.as);
  const guide = effect.startsWith('g:') ? HOLY_GUIDELINES[Number(effect.slice(2))] : undefined;
  const example = effect.startsWith('e:') ? HOLY_EXAMPLES[Number(effect.slice(2))] : undefined;
  const designed = holyEffectLevel({ base, range, duration, target, asRitual, extra });
  const level = example && !example.general ? example.level : designed.level;
  const total = holyEffectTotal(d, {
    method: m.id, power: p.id, aura, methodSpecialty: mSpec, powerSpecialty: pSpec, textQuality: m.id === 'gematria' ? textQ : undefined, ceremony, other,
  });
  const pickEffect = (v: string) => {
    setEffect(v);
    if (v.startsWith('g:')) {
      const g = HOLY_GUIDELINES[Number(v.slice(2))];
      setBase(g.level);
    } else if (v.startsWith('e:')) {
      const e = HOLY_EXAMPLES[Number(v.slice(2))];
      setRange(e.range);
      setDuration(e.duration);
      setTarget(e.target);
      setAsRitual(/as a Ritual/.test(e.design));
      const b = Number(e.design.match(/^Base (\d+)/)?.[1]);
      setBase(Number.isFinite(b) && b > 0 ? b : 1);
      setExtra(0);
    }
  };
  const setT = (t: string) => {
    setTarget(t);
    setAsRitual(wouldBeRitual(t, duration) && !/year|grace/i.test(duration) ? true : asRitual);
  };
  const year = saga?.currentYear ?? 1220;
  const season = saga?.currentSeason ?? 'Spring';

  const call = (stress: boolean) => {
    const out: string[] = [];
    // the Method's activity: Invocation spends a point, Meditation an hour of Stamina rolls, Purity a long-term Fatigue level or a Light Wound
    if (m.as === 'invocation') {
      const spent = spendPoint(ed, pay);
      if (!spent) return show(`${m.name} needs a Confidence (or Faith) Point to bring the effect into being, and none is left.`);
      out.push(`${m.name}: the prayer cried aloud (or written); ${spent} spent.`);
    } else if (m.as === 'meditation' && m.id !== 'gematria' && m.id !== 'dream-interpretation') {
      let lost = 0;
      for (let i = 0; i < 6; i++) {
        const r = stressDie(1);
        if (r.botches) {
          update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + lost)));
          return show([...out, `${m.name}: a Stamina roll botched (${describeStress(r)}): the ritual is disrupted after ${(i + 1) * 10} minutes${lost ? `, ${lost} Fatigue level${lost > 1 ? 's' : ''} lost` : ''}.`]);
        }
        if (r.value + d.characteristics.Sta.value < 6) lost++;
      }
      if (lost) update((x) => void (x.fatigueLost = Math.min(5, x.fatigueLost + lost)));
      const left = 5 - (c.fatigueLost + lost + c.longTermFatigueLost);
      out.push(`${m.name}: an hour, six Stamina rolls against 6${lost ? `, ${lost} failed (${lost} Fatigue level${lost > 1 ? 's' : ''} lost)` : ', none failed'}.`);
      if (left <= 0) return show([...out, 'Unconscious before the ritual is done: no effect.']);
    } else if (m.as === 'purity') {
      if (purityCost === 'fatigue') {
        if (c.fatigueLost + c.longTermFatigueLost >= 5) return show(`${m.name}: no long-term Fatigue level left to give.`);
        update((x) => void (x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + 1)));
        out.push(`${m.name}: deprivation enough to lose a long-term Fatigue level.`);
      } else {
        update((x) => void (x.wounds.light += 1));
        out.push(`${m.name}: deprivation enough to take a Light Wound.`);
      }
    } else out.push(`${m.name}: ${m.activation}`);
    let die: number;
    let faces: number[] | undefined;
    let botches = 0;
    if (stress) {
      const r = stressDie(1 + (total.botchDice ?? 0));
      die = r.value;
      botches = r.botches;
      faces = r.botches ? r.botchFaces : undefined;
      out.push(`Stress die: ${describeStress(r)}.`);
    } else {
      die = simpleDie().value;
      out.push(`Simple die: ${die}.`);
    }
    const t = total.total + die;
    const o = holyOutcome(t, level, d.trueFaith, botches);
    out.push(`${p.name} by ${m.name}: ${total.total} + ${die} = ${t} against level ${level}: ${o.works ? 'the effect happens.' : botches ? `BOTCH (${botches}).` : 'it does not happen.'}`);
    if (o.works && o.warpsTarget) out.push('An effect of level 30 or more: whoever it works on (but its caster) gains a Warping Point.');
    if (o.tragedy) out.push(`${TRAGEDIES[o.tragedy].label}: ${TRAGEDIES[o.tragedy].examples.join('; ')}. ${p.tragedy}${o.faithSaved ? ' (True Faith: Faith × 10 counted for the tragedy.)' : ''}`);
    else if (o.faithSaved) out.push('True Faith: Faith × 10 reaches the level, so no tragedy of hubris.');
    if (botches) {
      update((x) => void (x.warpingPoints += botches));
      out.push(`+${botches} Warping Point${botches > 1 ? 's' : ''} (a zero on each botch die).${botches >= 2 ? ' Two or more at once: check the Divine Ascent below.' : ''}`);
      onWarping(botches);
    }
    if (o.tragedy) update((x) => void (x.holy = { ...(x.holy ?? {}), tragedies: [...(x.holy?.tragedies ?? []), { year, season, kind: o.tragedy!, text: `${p.name} by ${m.name}, level ${level}: a total of ${t}.` }] }));
    setLast({ total: t, level, faces, trueFaith: d.trueFaith });
    show(out);
  };

  return (
    <Card title="Holy powers" className="accent" tour="holy-powers">
      <p className="small muted">
        Simple die + {CHAR_NAMES[m.char]} + Method + Power + aura, against the effect’s level (no Rituals, no vis: what would need a Ritual adds four magnitudes). Below it, a tragedy of hubris; True Faith counts Faith × 10 for the tragedy if higher.
      </p>
      <div className="row">
        <Field label="Method">
          <select value={m.id} onChange={(e) => (setMid(e.target.value), setEffect('custom'))}>
            {methods.filter((x) => pairs.some((y) => y.m.id === x.id)).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} {x.score}
                {x.id !== x.as ? ` (as ${x.as[0].toUpperCase() + x.as.slice(1)})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Power">
          <select value={p.id} onChange={(e) => (setPid(e.target.value), setEffect('custom'))}>
            {okPowers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} {x.score}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effect" hint={guide?.general ? guide.gives?.(base) : example?.text ?? guide?.text}>
          <select value={effect} onChange={(e) => pickEffect(e.target.value)} data-tour="holy-effect">
            <option value="custom">— design one (base level) —</option>
            {guides.length > 0 && (
              <optgroup label="Guidelines">
                {guides.map(({ g, i }) => (
                  <option key={i} value={`g:${i}`}>
                    {g.general ? 'General' : `Level ${g.level}`}: {g.text.length > 80 ? `${g.text.slice(0, 78)}…` : g.text}
                  </option>
                ))}
              </optgroup>
            )}
            {examples.length > 0 && (
              <optgroup label="The book’s effects">
                {examples.map(({ e, i }) => (
                  <option key={i} value={`e:${i}`}>
                    {e.name} ({e.general ? 'General' : `Level ${e.level}`})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
      </div>
      {!(example && !example.general) && (
        <div className="row small" data-tour="holy-design">
          <Field label={guide?.general || example?.general ? 'Base level (sets what it gives)' : 'Base level'}>
            <Stepper value={base} min={1} max={100} width={44} onChange={setBase} />
          </Field>
          {(
            [
              ['Range', RANGES, range, setRange],
              ['Duration', DURATIONS, duration, setDuration],
              ['Target', TARGETS, target, setT],
            ] as const
          ).map(([label, list, v, setV]) => (
            <Field key={label} label={label}>
              <select value={v} onChange={(e) => setV(e.target.value)}>
                {list.filter((o) => !o.requires || o.requires === 'holy-magic').map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name} (+{o.magnitude})
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Field label="More magnitudes" hint="Another sense, a larger target, an intricate effect">
            <Stepper value={extra} min={0} max={10} width={34} onChange={setExtra} />
          </Field>
          <label className="inline" title="A permanent effect, a Boundary Target, a summoning: what would need a Ritual in Hermetic magic adds four magnitudes instead (Powers and Effects). The book's Year examples add none.">
            <input type="checkbox" checked={asRitual} onChange={(e) => setAsRitual(e.target.checked)} /> as a Ritual would be (+4)
          </label>
        </div>
      )}
      <div className="row small">
        <span>
          Level <b>{level}</b>
          {!(example && !example.general) && <span className="muted"> {designed.design}</span>}
          {(guide?.general || example?.general) && <span> — {guide?.gives?.(base) ?? example?.text}</span>}
        </span>
      </div>
      <div className="row small">
        <label className="inline">
          <input type="checkbox" checked={mSpec} onChange={(e) => setMSpec(e.target.checked)} /> {m.name} specialty{m.specialty ? ` (${m.specialty})` : ''} applies
        </label>
        <label className="inline">
          <input type="checkbox" checked={pSpec} onChange={(e) => setPSpec(e.target.checked)} /> {p.name} specialty{p.specialty ? ` (${p.specialty})` : ''} applies
        </label>
        {m.id === 'gematria' && (
          <Field label="The text’s Quality">
            <Stepper value={textQ} min={0} max={30} width={36} onChange={setTextQ} />
          </Field>
        )}
        {m.as === 'invocation' && (
          <Field label="Spend">
            <select value={pay} onChange={(e) => setPay(e.target.value as typeof pay)}>
              <option value="confidence">a Confidence Point</option>
              <option value="faith">a Faith Point</option>
            </select>
          </Field>
        )}
        {m.as === 'purity' && (
          <Field label="The deprivation costs">
            <select value={purityCost} onChange={(e) => setPurityCost(e.target.value as typeof purityCost)}>
              <option value="fatigue">a long-term Fatigue level</option>
              <option value="wound">a Light Wound</option>
            </select>
          </Field>
        )}
        <Field label="Other">
          <Stepper value={other} min={-20} max={20} width={36} onChange={setOther} />
        </Field>
      </div>
      <CeremonyPicker
        focus={d}
        fellows={fellows}
        value={ceremony}
        onChange={setCeremony}
        adds={(f) => {
          const same = holyMethodsOf(f.d).filter((x) => x.as === m.as).reduce((mx, x) => Math.max(mx, x.score), 0);
          return f.d.characteristics[m.char].value + same;
        }}
      />
      <HowItWorks summary={<>Activation: {m.activation.split('.')[0]}.</>}>
        <p className="small">{m.activation}</p>
        <p className="small">{p.text}</p>
      </HowItWorks>
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label={`${p.name} by ${m.name}`} /> + die against {level}
        </span>
        <button onClick={() => call(false)} data-tour="holy-call-effect">
          {m.as === 'invocation' ? 'Entreat (simple die)' : 'Call the effect'}
        </button>
        {m.as === 'invocation' && (
          <button className="ghost" onClick={() => call(true)} title="Commanding rather than entreating: more power, greater offense if unworthy">
            Command (stress die)
          </button>
        )}
      </div>
      <Lines lines={lines} />
      {last && <AfterRoll key={last.total + ':' + last.level + ':' + lines.length} c={c} d={d} total={last.total} ease={last.level} botchFaces={last.faces} what="Effect total" judge={(n) => (n >= last.level ? 'the effect happens.' : `short by ${last.level - n}: ${TRAGEDIES[holyOutcome(n, last.level, last.trueFaith).tragedy ?? 'minor'].label.toLowerCase()}.`)} />}
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// A prayer for a miracle

function MiracleCard({ ed, aura, fellows }: { ed: CharEditor; aura: AuraState; fellows: Fellow[] }) {
  const { c, d, update } = ed;
  const [effLevel, setEffLevel] = useState(15);
  const [time, setTime] = useState<string>('week');
  const [need, setNeed] = useState<string>('beneficial');
  const [method, setMethod] = useState('');
  const [faithExtra, setFaithExtra] = useState(0);
  const [conf, setConf] = useState(0);
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const t = MIRACLE_TIMELINESS.find((x) => x.id === time)!;
  const n = MIRACLE_NEED.find((x) => x.id === need)!;
  const level = miracleLevel(effLevel, t.mod, n.mod);
  const faithCap = Math.max(0, Math.min(d.faithPoints - 1, Math.max(1, d.trueFaith) - 1));
  const confCap = c.type === 'grog' ? 0 : Math.min(c.confidence.score, c.confidence.points);
  const total = miracleTotal(d, { aura, method: method || undefined, faithExtra: Math.min(faithExtra, faithCap), confidence: Math.min(conf, confCap), ceremony });
  const pray = () => {
    const fx = Math.min(faithExtra, faithCap);
    const cx = Math.min(conf, confCap);
    const r = stressDie(1);
    update((x) => {
      x.faith = { score: d.trueFaith, points: Math.max(0, d.faithPoints - 1 - fx) };
      x.confidence.points = Math.max(0, x.confidence.points - cx);
    });
    const tot = total.total + r.value;
    const why = [`the effect ${effLevel}`, ...(t.mod ? [`${signed(t.mod)} ${t.label.split(' (')[0].toLowerCase()}`] : []), ...(n.mod ? [`${signed(n.mod)} ${n.label.split(':')[0].toLowerCase()}`] : [])].join(', ');
    const out = [`A Faith Point spent in prayer${fx ? `, and ${fx} more` : ''}${cx ? `, ${cx} Confidence` : ''}. Stress die ${describeStress(r)}: ${total.total} + ${r.value} = ${tot} against level ${level} (${why}).`];
    if (r.botches) {
      const weeks = r.botches;
      update((x) => {
        x.faith = { score: d.trueFaith, points: 0 };
        x.holy = { ...(x.holy ?? {}), faithLost: { points: Math.max(0, d.faithPoints - 1 - fx), weeks, text: 'a botched prayer' } };
      });
      out.push(`BOTCH (${r.botches}): all Faith Points are lost for ${weeks} week${weeks > 1 ? 's' : ''}; a tragedy of hubris may follow.`);
    } else if (tot >= level) {
      out.push('God answers: the miracle comes, in its time. It cannot be resisted, undone or altered.');
      if (level >= 30) out.push('A miracle of level 30 or more: those who only witness it gain a Warping Point (not those it is for).');
    } else out.push('No miracle, though the storyguide may send some lesser aid the roll allows.');
    show(out);
  };
  return (
    <Card title="Pray for a miracle" tour="holy-miracle" fold="holy-miracle" summary={`True Faith + Concentration + aura + stress die, a Faith Point spent (${d.faithPoints} left)`}>
      <p className="small muted">Optional rules: anyone with a Faith Point may pray. Infinite Penetration; the storyguide has the last word on what is prayed for.</p>
      <div className="row">
        <Field label="The effect’s level" hint="From the holy powers’ guidelines, or the Hermetic ones">
          <div className="row tight">
            <Stepper value={effLevel} min={1} max={100} width={44} onChange={setEffLevel} />
            <select value="" onChange={(e) => e.target.value && setEffLevel(Number(e.target.value))} aria-label="A guideline's level">
              <option value="">a guideline…</option>
              {HOLY_POWERS.map((pw) => (
                <optgroup key={pw.id} label={pw.name}>
                  {HOLY_GUIDELINES.filter((g) => g.power === pw.id && !g.general).map((g, i) => (
                    <option key={i} value={g.level}>
                      {g.level}: {g.text.length > 70 ? `${g.text.slice(0, 68)}…` : g.text}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </Field>
        <Field label="How soon">
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            {MIRACLE_TIMELINESS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label} ({signed(x.mod)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="The need">
          <select value={need} onChange={(e) => setNeed(e.target.value)}>
            {MIRACLE_NEED.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label} ({signed(x.mod)})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="row small">
        {d.trueFaith > 0 && holyMethodsOf(d).length > 0 && (
          <Field label="In place of Concentration">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">Concentration</option>
              {holyMethodsOf(d).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} {x.score}
                </option>
              ))}
            </select>
          </Field>
        )}
        {faithCap > 0 && (
          <Field label={`More Faith Points (+${d.trueFaith >= 3 ? 6 : 3} each)`}>
            <Stepper value={faithExtra} min={0} max={faithCap} width={34} onChange={setFaithExtra} />
          </Field>
        )}
        {confCap > 0 && (
          <Field label="Confidence (+3 each)">
            <Stepper value={conf} min={0} max={confCap} width={34} onChange={setConf} />
          </Field>
        )}
      </div>
      <CeremonyPicker focus={d} fellows={fellows.filter((f) => f.d.faithPoints > 0)} value={ceremony} onChange={setCeremony} adds={(f) => f.d.trueFaith + Math.max(score(f.d, 'concentration'), ...holyMethodsOf(f.d).map((x) => x.score))} />
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label="Prayer" /> + stress die against <b>{level}</b>
        </span>
        <button onClick={pray} disabled={d.faithPoints < 1}>
          Pray
        </button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// God's aid

function GodsAidCard({ ed, fellows }: { ed: CharEditor; fellows: Fellow[] }) {
  const { c, d, update } = ed;
  const [objective, setObjective] = useState('');
  const [group, setGroup] = useState(false);
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const can = canInvokeGodsAid(c, d);
  const total = godsAidTotal(d, group ? ceremony : undefined);
  const aid = c.holy?.aid;
  const invoke = () => {
    const spent = spendPoint(ed, d.trueFaith > 0 && d.faithPoints > 0 && c.confidence.points < 1 ? 'faith' : 'confidence');
    if (!spent) return show(can.why ?? 'Nothing to spend.');
    // a zero is checked with at least three botch dice: divine wrath for presumption
    const r = stressDie(3);
    const tot = total.total + r.value;
    const bonus = r.botches ? 0 : divineAidBonus(tot);
    const what = objective.trim() || 'the venture';
    const out = [`A simple prayer aloud; ${spent} spent. Stress die ${describeStress(r)}: ${total.total} + ${r.value} = ${tot}.`];
    if (r.botches) out.push(`BOTCH (${r.botches}): divine displeasure — struck dumb or blind, clumsy or slow, until penance is done.`);
    else if (bonus) out.push(`God’s aid: +${bonus} to every roll that clearly serves ${what} this scene${group ? ', for the followers too' : ''}, until a roll fails.`);
    else out.push('No aid this time.');
    if (bonus) update((x) => void (x.holy = { ...(x.holy ?? {}), aid: { bonus, objective: what } }));
    show(out);
  };
  return (
    <Card title="Invoke God’s aid" tour="holy-aid" fold="holy-aid" summary={aid ? `+${aid.bonus} for ${aid.objective}` : 'Communication + Dominion Lore + stress die: +1 at 9, +2 at 15, +3 at 24'}>
      {aid && (
        <p className="small ok">
          God’s aid: <b>+{aid.bonus}</b> for {aid.objective} (the Roll on the Dice page adds it).{' '}
          <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), aid: undefined }))}>
            A roll failed, or the scene ended
          </button>
        </p>
      )}
      <div className="row">
        <Field label="For what" hint="In warfare only against the infidel, the heretic, or a non-Divine supernatural menace">
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="the duel with the knight" />
        </Field>
        <label className="inline small" title="With spiritual authority over them: the followers receive the bonus too, and the leader. A trained group adds the highest bonus to its group bonus.">
          <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} /> for a group of followers
        </label>
      </div>
      {group && <CeremonyPicker focus={d} fellows={fellows} value={ceremony} onChange={setCeremony} adds={(f) => f.d.characteristics.Com.value + score(f.d, 'dominion-lore')} />}
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label="God’s aid" /> + stress die
        </span>
        <button onClick={invoke} disabled={!can.ok} title={can.why}>
          Invoke God’s aid
        </button>
        {!can.ok && <span className="small muted">{can.why}</span>}
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// The saints and holy forbears

function ModList({ mods, value, onChange }: { mods: InvocationMod[]; value: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  return (
    <div className="row small" style={{ flexWrap: 'wrap', gap: '2px 12px' }}>
      {mods.map((m) => (
        <label key={m.id} className="inline">
          <input type="checkbox" checked={m.id in value} onChange={(e) => {
            const v = { ...value };
            if (e.target.checked) v[m.id] = m.mod;
            else delete v[m.id];
            onChange(v);
          }} />{' '}
          {m.label} ({m.min !== undefined ? `${signed(m.min)} to ${signed(m.max!)}` : signed(m.mod)})
          {m.id in value && m.min !== undefined && <Stepper value={value[m.id]} min={m.min} max={m.max} width={30} onChange={(n) => onChange({ ...value, [m.id]: n })} />}
        </label>
      ))}
    </div>
  );
}

const modParts = (mods: InvocationMod[], v: Record<string, number>): Part[] => mods.filter((m) => m.id in v).map((m) => ({ label: m.label, value: v[m.id] }));

function SaintsCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const [sid, setSid] = useState('martin');
  const [own, setOwn] = useState({ name: 'a local saint', might: 25 });
  const [mods, setMods] = useState<Record<string, number>>({});
  const [threatMods, setThreatMods] = useState<Record<string, number>>({});
  const [trait, setTrait] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const [lines, show] = useLines();
  const [hidden, setHidden] = useState<number | null>(null);
  if (!c || !d) return null;
  const saint: Saint = sid === 'own' ? { id: 'own', name: own.name, faith: 'christian', might: own.might, where: '', powers: [] } : SAINTS.find((s) => s.id === sid)!;
  const muslim = saint.faith === 'muslim';
  const list = muslim ? FORBEAR_INVOCATION_MODS : SAINT_INVOCATION_MODS;
  const total = invokeSaintTotal(d, saint, { aura, mods: modParts(list, mods), muslimTrait: muslim ? trait : undefined });
  const threat = threatenSaintTotal(d, modParts(SAINT_THREAT_MODS, threatMods));
  const silent = c.holy?.silent?.[saint.id];
  const left = saintMightLeft(saint, used[saint.id] ?? []);
  const invoke = () => {
    const mine = simpleDie().value;
    const theirs = simpleDie().value;
    setHidden(theirs);
    const tot = total.total + mine;
    const ok = !silent && tot >= 15 + theirs;
    setAnswered(ok ? saint.id : null);
    setRefused(ok || muslim ? null : saint.id);
    show([
      `${muslim ? 'Seeking the baraka of' : 'Invoking'} ${saint.name}: ${total.total} + ${mine} = ${tot}, against 15 + the storyguide’s unseen die.`,
      silent ? `${saint.name} will not answer for ${silent}.` : ok ? `${saint.name} answers with a miracle: choose one of its powers below.` : `No answer today.${muslim ? '' : ' Try again tomorrow, or threaten the saint.'}`,
    ]);
  };
  const doThreat = () => {
    const r = stressDie(1);
    const tot = threat.total + r.value;
    const res = threatResult(tot, saint, r.botches > 0);
    show([`Threatening ${saint.name}: ${threat.total} + ${describeStress(r)} = ${tot} against ${threatEase(saint)}.`, threatText(res, saint)]);
    setRefused(null);
    if (res === 'granted') setAnswered(saint.id);
    if (res !== 'granted') update((x) => void (x.holy = { ...(x.holy ?? {}), silent: { ...(x.holy?.silent ?? {}), [saint.id]: res === 'annoyed' ? 'a month' : 'a season' } }));
  };
  const grant = (name: string) => {
    const pw = saintPower(name);
    if (!pw) return;
    if (pw.cost > left) return show(`${name} costs ${pw.cost} Might; ${saint.name} has ${left} left until dawn.`);
    setUsed((u) => ({ ...u, [saint.id]: [...(u[saint.id] ?? []), name] }));
    setAnswered(null);
    show(`${saint.name}: ${name} (${pw.cost} Might, Initiative ${signed(pw.init)}, ${pw.form}). ${pw.text}`);
  };
  return (
    <Card title="The saints and holy forbears" tour="holy-saints" fold="holy-saints" summary="Communication + Charm + modifiers + simple die, against 15 + the storyguide’s unseen die">
      <div className="row">
        <Field label="Whom" hint={saint.where ? `${saint.faith === 'muslim' ? 'Baraka at' : 'Venerated'}: ${saint.where}` : 'A saint of the troupe’s making'}>
          <select value={sid} onChange={(e) => (setSid(e.target.value), setMods({}), setAnswered(null), setRefused(null))}>
            <optgroup label="Christian saints">
              {SAINTS.filter((s) => s.faith === 'christian').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Might {s.might})
                </option>
              ))}
              <option value="own">a saint of your own…</option>
            </optgroup>
            <optgroup label="Muslim holy forbears">
              {SAINTS.filter((s) => s.faith === 'muslim').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Might {s.might})
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        {sid === 'own' && (
          <>
            <Field label="Name">
              <input value={own.name} onChange={(e) => setOwn({ ...own, name: e.target.value })} />
            </Field>
            <Field label="Kind">
              <select value={own.might} onChange={(e) => setOwn({ ...own, might: Number(e.target.value) })}>
                {SAINT_TIERS.map((t) => (
                  <option key={t.might} value={t.might}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {muslim && (
          <Field label="Highest Muslim Personality Trait">
            <Stepper value={trait} min={0} max={6} width={34} onChange={setTrait} />
          </Field>
        )}
      </div>
      <ModList mods={list} value={mods} onChange={setMods} />
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label="Invocation" /> + simple die
        </span>
        <button onClick={invoke} data-tour="holy-invoke-saint">
          {muslim ? 'Seek baraka' : 'Invoke the saint'}
        </button>
        <span className="small muted">Might left today: {left}</span>
        {hidden !== null && (
          <details className="small">
            <summary>the storyguide’s die</summary>
            {hidden}: needed {15 + hidden}
          </details>
        )}
      </div>
      {answered === saint.id && saint.powers.length > 0 && (
        <div className="row small" style={{ flexWrap: 'wrap' }}>
          {saint.powers.map((n) => {
            const pw = saintPower(n);
            return (
              <button key={n} className="small" title={pw?.text} disabled={!pw || pw.cost > left} onClick={() => grant(n)}>
                {n} ({pw?.cost ?? '?'})
              </button>
            );
          })}
        </div>
      )}
      {refused === saint.id && !muslim && (
        <details className="small" data-tour="holy-threaten">
          <summary>Threaten {saint.name} (the humiliation of a saint)</summary>
          <ModList mods={SAINT_THREAT_MODS} value={threatMods} onChange={setThreatMods} />
          <div className="row">
            <span>
              Presence + Leadership <Total value={threat.total} parts={threat.parts} notes={threat.notes} label="Threat" /> + stress die against {threatEase(saint)}
            </span>
            <button className="small warn" onClick={doThreat}>
              Threaten
            </button>
          </div>
        </details>
      )}
      <Lines lines={lines} />
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// Holy influence and tempers

function InfluenceCard({ ed, fellows }: { ed: CharEditor; fellows: Fellow[] }) {
  const { c, d, update, saga } = ed;
  const [mode, setMode] = useState<'influence' | 'temper'>('influence');
  const [how, setHow] = useState<'ceremonial' | 'personal'>('ceremonial');
  const [authority, setAuthority] = useState(false);
  const [trait, setTrait] = useState('Pious');
  const [temper, setTemper] = useState('calm');
  const [place, setPlace] = useState('');
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const total = influenceTotal(d, how === 'ceremonial' ? ceremony : undefined);
  const tempers: (ActiveTemper & { by: string; id: string })[] = fellows.flatMap((f) => (f.c.holy?.temper ? [{ ...f.c.holy.temper, by: f.c.name || 'Unnamed', id: f.c.id }] : []));
  const mine = c.holy?.temper;
  const allTempers = mine && !tempers.some((t) => t.id === c.id) ? [...tempers, { ...mine, by: c.name || 'Unnamed', id: c.id }] : tempers;
  const roll = () => {
    if (!authority) return show('Holy influence needs spiritual authority over those influenced (a priest’s parish, a parent’s child, a host’s guests…) or the Inspirational Virtue.');
    const out: string[] = [];
    if (how === 'ceremonial') {
      const spent = spendPoint(ed, 'confidence');
      if (!spent) return show('A ceremony needs a Confidence (or Faith) Point, and none is left.');
      out.push(`A short ceremony; ${spent} spent (it adds nothing).`);
    } else out.push('A season of good example, in word and deed.');
    const stress = mode === 'temper';
    const r = stress ? stressDie(1) : simpleDie();
    const v = 'botches' in r ? r.value : r.value;
    const tot = total.total + v;
    if (stress && 'botches' in r && r.botches) {
      out.push(`Stress die ${describeStress(r)}: BOTCH — Warping, Fatigue, or a bad reputation among the people.`);
      return show(out);
    }
    const bonus = divineAidBonus(tot);
    out.push(`${stress ? `Stress die ${describeStress(r as ReturnType<typeof stressDie>)}` : `Simple die ${v}`}: ${total.total} + ${v} = ${tot}.`);
    if (!bonus) out.push('No effect.');
    else if (mode === 'influence') out.push(`Those willing to listen gain ${trait} +${bonus}, fading in ${how === 'personal' ? 'about a year' : 'a week or so'} unless their deeds keep it.`);
    else {
      const where = place.trim() || ed.ctx.covenant?.name || 'the aura';
      const t: ActiveTemper = { temper, value: bonus, how, place: where, year: saga?.currentYear ?? 1220, season: saga?.currentSeason ?? 'Spring' };
      update((x) => void (x.holy = { ...(x.holy ?? {}), temper: t }));
      out.push(`${where} is tempered ${temperName(temper)} +${bonus}: added to every roll there that serves it, taken from those that run against it; −1 each ${how === 'ceremonial' ? 'day' : 'season'}.`);
    }
    show(out);
  };
  const tdef = TEMPERS.find((t) => t.id === temper)!;
  return (
    <Card title="Holy influence and tempers" tour="holy-influence" fold="holy-influence" summary={allTempers.length ? allTempers.map((t) => `${t.place}: ${temperName(t.temper)} +${t.value}`).join(' · ') : 'Presence + Leadership: a Personality Trait in the faithful, or a temper in the Dominion'}>
      <div className="row">
        <Field label="What">
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="influence">holy influence: a Personality Trait in followers (simple die)</option>
            <option value="temper">temper the Dominion (stress die)</option>
          </select>
        </Field>
        <Field label="How">
          <select value={how} onChange={(e) => setHow(e.target.value as typeof how)}>
            <option value="ceremonial">ceremonial: a short ceremony, a Confidence Point</option>
            <option value="personal">personal: a season of example</option>
          </select>
        </Field>
        {mode === 'influence' ? (
          <Field label="The trait">
            <input value={trait} onChange={(e) => setTrait(e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label="Temper" hint={`${tdef.text} Against ${tdef.vice}: ${tdef.negative.join(', ')}.`}>
              <select value={temper} onChange={(e) => setTemper(e.target.value)}>
                {TEMPERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (against {t.vice})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Where">
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={ed.ctx.covenant?.name ?? 'the parish church'} />
            </Field>
          </>
        )}
      </div>
      <label className="inline small">
        <input type="checkbox" checked={authority} onChange={(e) => setAuthority(e.target.checked)} /> has spiritual authority here (or Inspirational, for willing listeners)
      </label>
      {how === 'ceremonial' && <CeremonyPicker focus={d} fellows={fellows.filter((f) => f.c.id !== c.id)} value={ceremony} onChange={setCeremony} adds={(f) => f.d.characteristics.Pre.value + score(f.d, 'leadership')} />}
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} label="Presence + Leadership" /> + die: +1 at 9, +2 at 15, +3 at 24
        </span>
        <button onClick={roll}>{mode === 'influence' ? 'Influence' : 'Temper the aura'}</button>
      </div>
      <Lines lines={lines} />
      {allTempers.length > 0 && (
        <div className="small" data-tour="holy-tempers">
          <b>Tempers in the saga:</b>
          {allTempers.map((t) => (
            <div key={t.id} className="row tight">
              {t.place}: {temperName(t.temper)} +{t.value} ({t.how}, by {t.by})
              {t.id === c.id && (
                <>
                  <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), temper: x.holy?.temper && x.holy.temper.value > 1 ? { ...x.holy.temper, value: x.holy.temper.value - 1 } : undefined }))}>
                    a {t.how === 'ceremonial' ? 'day' : 'season'} passes (−1)
                  </button>
                </>
              )}
            </div>
          ))}
          {schism(allTempers).map((s) => (
            <div key={s} className="warn-text">
              {s}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// The Divine Ascent

const VIRTUES = ['Justice', 'Fortitude', 'Temperance', 'Wisdom', 'Faith', 'Hope', 'Charity'];
const HOLY_ABILITY = /^(dominion-lore|adjuration|blessing|cursing|intervention|transcendence|understanding|wonders|invocation|meditation|purity|ceremony|holy-music|holy-magic|sense-holiness-and-unholiness|gematria|kabbalah|merkavah|dream-interpretation|craft-amulets|ars-notoria)$/;

function AscentCard({ ed, aura, gained: fromPower }: { ed: CharEditor; aura: AuraState; gained: number }) {
  const { c, d, update } = ed;
  const [gained, setGained] = useState(Math.max(2, fromPower));
  const [onSheet, setOnSheet] = useState(true);
  const [form, setForm] = useState<AscentForm>('gloom');
  const [virtue, setVirtue] = useState('Temperance');
  const [trait, setTrait] = useState('Temperate');
  const [gloom, setGloom] = useState<{ points: number; to: string; from: string } | null>(null);
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const pts = onSheet ? Math.max(0, d.warpingPoints - gained) : d.warpingPoints;
  const check = ascentCheck({ ...d, warpingPoints: pts }, gained, aura);
  const roll = () => {
    const mine = stressDie(1);
    const theirs = stressDie(0, undefined, true);
    const my = check.resist.total + mine.value;
    const tw = check.against.total + theirs.value;
    const out = [`Presence + ${check.resist.parts[1].label} ${check.resist.total} + ${describeStress(mine)} = ${mine.botches ? 'BOTCH' : my}, against ${check.against.total} + the storyguide’s ${theirs.value} = ${tw}.`];
    if (!mine.botches && my > tw) {
      if (!onSheet) update((x) => void (x.warpingPoints += gained));
      out.push('Too tied to the world: no Ascent.');
      return show(out);
    }
    const margin = Math.max(1, tw - (mine.botches ? 0 : my));
    const before = check.against.parts[0].value;
    const dur = ascentDuration(before, gained + margin, d.trueFaith);
    update((x) => void (x.warpingPoints += margin + (onSheet ? 0 : gained)));
    out.push(`The Divine Ascent: ${margin} more Warping Point${margin > 1 ? 's' : ''}, lifted into the Divine for ${dur.n} ${dur.unit}. The body stays, untouched by any power, illness or want, or vanishes until it returns.`);
    const chosen = c.holy?.ascent;
    if (chosen === 'gloom') setGloom({ points: gained + margin, to: '', from: '' });
    if (!chosen) out.push('Choose the form of the Ascent below: it is the same for the rest of the character’s life.');
    show(out);
  };
  const holyAbilities = d.abilities.filter((a) => HOLY_ABILITY.test(a.abilityId));
  const mundane = d.abilities.filter((a) => !HOLY_ABILITY.test(a.abilityId) && a.effectiveXp > 0 && (a.type === 'General' || a.type === 'Academic' || a.type === 'Martial'));
  const applyGloom = () => {
    if (!gloom || !gloom.to || !gloom.from) return;
    update((x) => {
      const to = x.abilities.find((a) => a.uid === gloom.to);
      const from = x.abilities.find((a) => a.uid === gloom.from);
      if (to) to.xp.laterLife = (to.xp.laterLife ?? 0) + gloom.points;
      if (from) {
        let n = gloom.points;
        for (const k of Object.keys(from.xp) as (keyof typeof from.xp)[]) {
          const take = Math.min(n, from.xp[k] ?? 0);
          from.xp[k] = (from.xp[k] ?? 0) - take;
          n -= take;
        }
      }
    });
    show(`Divine Gloom: ${gloom.points} experience points to ${d.abilities.find((a) => a.uid === gloom.to)?.name}, ${gloom.points} from ${d.abilities.find((a) => a.uid === gloom.from)?.name}.`);
    setGloom(null);
  };
  return (
    <Card title="The Divine Ascent" tour="holy-ascent" fold="holy-ascent" summary={c.holy?.ascent ? `Divine ${c.holy.ascent}` : 'when two or more Warping Points come at once'}>
      <p className="small muted">A holy character gaining two or more Warping Points at once: Presence + Concentration (or Meditation) + stress die, against Warping Score + the points gained + True Faith + aura + a stress die.</p>
      <div className="row">
        <Field label="Warping Points gained">
          <Stepper value={gained} min={2} max={30} width={36} onChange={setGained} />
        </Field>
        <label className="inline small">
          <input type="checkbox" checked={onSheet} onChange={(e) => setOnSheet(e.target.checked)} /> already on the sheet
        </label>
        <span>
          <Total value={check.resist.total} parts={check.resist.parts} label="Resisting" /> + die against <Total value={check.against.total} parts={check.against.parts} notes={check.against.notes} label="The Divine" /> + die
        </span>
        <button onClick={roll}>Roll</button>
      </div>
      <Lines lines={lines} />
      {gloom && (
        <div className="row small">
          Divine Gloom: {gloom.points} experience points
          <select value={gloom.to} onChange={(e) => setGloom({ ...gloom, to: e.target.value })} aria-label="To a holy Ability">
            <option value="">to…</option>
            {holyAbilities.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name} {a.total}
              </option>
            ))}
          </select>
          <select value={gloom.from} onChange={(e) => setGloom({ ...gloom, from: e.target.value })} aria-label="From a mundane Ability">
            <option value="">from…</option>
            {mundane.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name} {a.total}
              </option>
            ))}
          </select>
          <button className="small" disabled={!gloom.to || !gloom.from} onClick={applyGloom}>
            Shift them
          </button>
        </div>
      )}
      {!c.holy?.ascent && (
        <div className="row small">
          <Field label="Its form, for life" hint={ASCENT_FORMS[form]}>
            <select value={form} onChange={(e) => setForm(e.target.value as AscentForm)}>
              <option value="gloom">Divine Gloom</option>
              <option value="form">Divine Form</option>
              <option value="unity">Divine Unity</option>
            </select>
          </Field>
          {form === 'unity' && (
            <>
              <Field label="The virtue">
                <select value={virtue} onChange={(e) => setVirtue(e.target.value)}>
                  {VIRTUES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Its Personality Trait">
                <input value={trait} onChange={(e) => setTrait(e.target.value)} />
              </Field>
            </>
          )}
          <button className="small" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), ascent: form, ...(form === 'unity' ? { unity: { virtue, trait } } : {}) }))}>
            Set it
          </button>
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// The Rings of Solomon

const DIVINE_SUPERNATURAL = /^(adjuration|blessing|cursing|intervention|transcendence|understanding|wonders|invocation|meditation|purity|ceremony|holy-music|holy-magic|sense-holiness-and-unholiness|gematria|kabbalah|merkavah|dream-interpretation|craft-amulets|ars-notoria)$/;

function NotoriaCard({ ed }: { ed: CharEditor }) {
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
  const r = SOLOMON_RINGS.find((x) => x.ring === Math.min(ring, learned + 1))!;
  const first = r.ring > learned;
  const ease = (first ? 6 : 3) + 3 * r.ring + seasons;
  const season = saga?.currentSeason ?? 'Spring';
  const year = saga?.currentYear ?? 1220;
  const wrongSeason = first && r.seasons && !r.seasons.includes(season.toLowerCase() as never);
  // other Supernatural Abilities count against it; Divine ones do not
  const otherSupernatural = d.abilities.filter((a) => a.type === 'Supernatural' && !DIVINE_SUPERNATURAL.test(a.abilityId)).reduce((s, a) => s + a.total, 0);
  const parts: Part[] = [
    { label: 'Intelligence', value: d.characteristics.Int.value },
    { label: 'Ars Notoria', value: score(d, 'ars-notoria') },
    ...modParts(ARS_NOTORIA_MODS, mods),
    ...(otherSupernatural ? [{ label: 'Other Supernatural Abilities', value: -otherSupernatural }] : []),
  ];
  const busy = first && seasonBusy(c, year, season);
  const recite = () => {
    const die = stressDie(1);
    const tot = sum(parts) + die.value;
    const out = [`${r.name} of Solomon${first ? ' (first recitation: the whole season)' : ` (known: ${Math.max(1, 10 - score(d, 'ars-notoria'))} days)`}: ${sum(parts)} + ${describeStress(die)} = ${die.botches ? 'BOTCH' : tot} against ${ease}.`];
    if (die.botches) out.push('Deemed unworthy: the storyguide may take experience in Ars Notoria (as many as the Ease Factor), give a Minor Flaw until atoned, end the benefits, or forbid orations for a while.');
    else if (tot >= ease) {
      // a first recitation takes the season itself: the ring's seasons begin after it
      const until = ringUntil(year, season, seasons + (first ? 1 : 0));
      update((x) => {
        x.holy = { ...(x.holy ?? {}), notoria: { learned: Math.max(learned, r.ring), active: { ring: r.ring, ...until, ...(r.ring === 3 ? { disease } : {}) } } };
        if (r.xp) ensureAbility(x, r.xp.ability);
      });
      out.push(`It works until the end of ${until.untilSeason} ${until.untilYear}: ${r.text}${r.ring === 3 ? ` (the disease: ${disease})` : ''}`);
    } else out.push('It fails; it may be tried again next season.');
    if (first) {
      // the first recitation of a ring is the season's work, its days of rest included
      update((x) => {
        const ab = x.abilities.find((a) => a.abilityId === 'ars-notoria');
        const e = newSeasonEntry(year, season, 'other', `Ars Notoria: ${r.name} of Solomon`, ab ? { [`ability:${ab.uid}`]: 2 } : {});
        e.notes = out.join(' ');
        applySeason(x, e, 1);
        x.seasonLog.push(e);
      });
      out.push(`${season} ${year} logged, +2 xp Exposure in Ars Notoria.`);
    }
    show(out);
  };
  return (
    <Card title="Ars Notoria: the Rings of Solomon" tour="holy-notoria" fold="holy-notoria" summary={active ? `the ${SOLOMON_RINGS[active.ring - 1].name} in effect to ${active.untilSeason} ${active.untilYear}` : `${learned} ring${learned === 1 ? '' : 's'} learned`}>
      <p className="small muted">Intelligence + Ars Notoria + how the season before was lived + stress die. The rings are first learned in order, each in a season; known ones take 10 − Ars Notoria days. Under a ring, a Divine aura warps no more, and Ars Notoria takes 3 a point off the Divine aura’s penalty to other magic.</p>
      {active && (
        <p className="small ok">
          In effect: {SOLOMON_RINGS[active.ring - 1].name}, to the end of {active.untilSeason} {active.untilYear}. {SOLOMON_RINGS[active.ring - 1].text}
          {active.disease ? ` (${active.disease})` : ''}
        </p>
      )}
      <div className="row">
        <Field label="Ring" hint={r.seasons ? `First recited in ${r.seasons.join(' or ')}${wrongSeason ? ` — not ${season}` : ''}` : 'Any season'}>
          <select value={r.ring} onChange={(e) => setRing(Number(e.target.value))}>
            {SOLOMON_RINGS.filter((x) => x.ring <= learned + 1).map((x) => (
              <option key={x.ring} value={x.ring}>
                {x.name}
                {x.ring > learned ? ' (first time)' : ''}
              </option>
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
        <button onClick={recite} disabled={!!wrongSeason || busy} title={busy ? `${season} ${year} is already spent: a first recitation takes the season` : undefined}>
          Recite
        </button>
        {active && (
          <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), notoria: { learned } }))}>
            End the ring
          </button>
        )}
      </div>
      <Lines lines={lines} />
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// A Dominion rite, a celestial regio, a copy of the Ars Notoria

function RitesCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [regio, setRegio] = useState(3);
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const theology = Math.max(score(d, 'dominion-lore'), ...d.abilities.filter((a) => /^theology/.test(a.abilityId)).map((a) => a.total));
  const rite = d.characteristics.Com.value + theology;
  const parma = score(d, 'parma-magica');
  const steady = d.characteristics.Sta.value + Math.max(score(d, 'dominion-lore'), parma);
  const roll = (what: 'rite' | 'regio' | 'notoria') => {
    const r = stressDie(1);
    if (what === 'rite') {
      const t = rite + r.value;
      show([
        `Dominion rite: Communication + ${theology === score(d, 'dominion-lore') && theology ? 'Dominion Lore' : 'Theology'} ${rite} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : t} against 6.`,
        r.botches ? 'A botch: Warping, divine displeasure, or Infernal attention.' : t >= 6 ? 'Done. The first rite consecrates the place; a second lets the Dominion in: an aura of 3 at the service’s end, 4 after a year of weekly worship, 5 after a decade for a great church.' : 'The rite fails.',
      ]);
    } else if (what === 'regio') {
      const t = steady + r.value;
      const ok = !r.botches && t >= regio * 3;
      show([
        `Celestial disorientation: Stamina + ${parma > score(d, 'dominion-lore') ? 'Parma Magica' : 'Dominion Lore'} ${steady} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : t} against ${regio * 3}.`,
        ok ? 'Able to act normally.' : `Bewildered and overwhelmed until leaving: −${regio * 3} to every roll.`,
        `After ${d.characteristics.Sta.value + parma + 3} hours, a Fatigue level an hour; unconscious, ${regio} Warping Point${regio > 1 ? 's' : ''} an hour (two or more may bring the Divine Ascent)${d.trueFaith ? '; True Faith makes the hours days' : ''}.`,
      ]);
    } else {
      const t = d.characteristics.Int.value + score(d, 'dominion-lore') + r.value;
      show([`A season’s search for the Book of Solomon: Intelligence + Dominion Lore ${d.characteristics.Int.value + score(d, 'dominion-lore')} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : t} against 21.`, r.botches ? 'A distant journey and a different book: a heretic’s manuscript, or a demon’s ruse.' : t >= 21 ? 'A copy found: a tractatus of Quality 20 (Divine Lore to the unGifted; the Gifted may learn Ars Notoria from it, with Latin, Greek, Hebrew, Chaldean and Artes Liberales at 4).' : 'Not found this season.']);
    }
  };
  return (
    <Card title="Rites and holy places" tour="holy-rites" fold="holy-rites" summary="a Dominion rite, a celestial regio, the search for the Book of Solomon">
      <div className="row">
        <span>
          Dominion rite: Communication + Theology (or Dominion Lore) <b>{rite}</b> + stress die against 6
        </span>
        <button className="small" onClick={() => roll('rite')}>
          Perform the rite
        </button>
      </div>
      <p className="small muted">The celebrant needs Priest, Rabbi or ’Alim (or the like), Theology or Dominion Lore 2+, a congregation of ten and a consecrated place.</p>
      <div className="row">
        <Field label="Celestial regio level">
          <Stepper value={regio} min={1} max={10} width={34} onChange={setRegio} />
        </Field>
        <span>
          Stamina + Dominion Lore (or Parma) <b>{steady}</b> + stress die against {regio * 3}
        </span>
        <button className="small" onClick={() => roll('regio')}>
          Keep one’s senses
        </button>
        <button className="small ghost" disabled={d.faithPoints < 1} title="A Faith Point spent: the disorientation is ignored altogether" onClick={() => {
          update((x) => void (x.faith = { score: d.trueFaith, points: d.faithPoints - 1 }));
          show('A Faith Point spent: the celestial disorientation is ignored.');
        }}>
          Spend a Faith Point
        </button>
      </div>
      {(d.hasGift || d.isMagus) && (
        <div className="row">
          <span>Searching for a copy of the Ars Notoria: Intelligence + Dominion Lore + stress die against 21 (a season)</span>
          <button className="small" onClick={() => roll('notoria')}>
            Search
          </button>
        </div>
      )}
      <Lines lines={lines} />
    </Card>
  );
}

// ------------------------------------------------------------------------------------------------
// Seasons of holy work: Major amulets, golems, True Names, Shinnui Shem (Mythic Judaism)

const WORK_ABILITY: Record<HolyWorkKind, string> = { amulet: 'craft-amulets', golem: 'kabbalah', empower: 'kabbalah', trueName: 'merkavah', shinnui: 'gematria' };

export function HolyWorksCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update, saga } = ed;
  const [kind, setKind] = useState<HolyWorkKind | ''>('');
  const [name, setName] = useState('');
  const [target, setTarget] = useState(10);
  const [minorLevel, setMinorLevel] = useState(5);
  const [minorSM, setMinorSM] = useState(0);
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const open = holyWorksOpen(d);
  const works = c.holy?.works ?? [];
  const year = saga?.currentYear ?? 1220;
  const season = saga?.currentSeason ?? 'Spring';
  const ca = score(d, 'craft-amulets');
  const divine = aura.realm === 'Divine' ? aura.strength : 0;
  // a season's work is the season: one already logged leaves none for this (as lab work)
  const busy = seasonBusy(c, year, season);
  const minorTotal = d.characteristics.Dex.value + ca + Math.min(minorSM, ca) + divine;
  const start = () => {
    if (!kind) return;
    const w: HolyWork = {
      uid: uid(), kind, progress: 0, seasons: 0,
      name: name.trim() || (kind === 'trueName' ? 'True Name: an angel' : holyWorkLabel(kind)[0].toUpperCase() + holyWorkLabel(kind).slice(1)),
      target: kind === 'golem' ? 0 : kind === 'shinnui' ? 1 : target,
    };
    if (kind === 'amulet') {
      w.method = holyMethodsOf(d)[0]?.id;
      w.power = holyPowersOf(d)[0]?.id;
    }
    if (kind === 'shinnui') w.quality = 10;
    update((x) => void (x.holy = { ...(x.holy ?? {}), works: [...(x.holy?.works ?? []), w] }));
    setKind('');
    setName('');
  };
  const set = (u: string, patch: Partial<HolyWork>) => update((x) => void (x.holy = { ...(x.holy ?? {}), works: (x.holy?.works ?? []).map((w) => (w.uid === u ? { ...w, ...patch } : w)) }));
  const work = (w: HolyWork, finish?: boolean) => {
    let out: string[] = [];
    update((x) => {
      out = workHolySeason(x, d, w.uid, aura, { finish });
      const ab = x.abilities.find((a) => a.abilityId === WORK_ABILITY[w.kind]);
      const e = newSeasonEntry(year, season, 'other', `Holy work: ${w.name}`, ab ? { [`ability:${ab.uid}`]: 2 } : {});
      e.notes = out.join(' ');
      applySeason(x, e, 1);
      x.seasonLog.push(e);
    });
    show([...out, `${season} ${year} logged, +2 xp Exposure.`]);
  };
  return (
    <Card title="Seasons of holy work" tour="holy-works" fold="holy-works" summary={works.filter((w) => !w.done).map((w) => w.name).join(' · ') || 'Major amulets, golems, True Names, Shinnui Shem'}>
      {ca > 0 && (
        <div className="row small" data-tour="holy-minor-amulet">
          <b>A Minor amulet</b> (one person, Touch, worn):
          <Field label="Level">
            <Stepper value={minorLevel} min={1} max={50} width={36} onChange={setMinorLevel} />
          </Field>
          <Field label="Shape and material">
            <Stepper value={minorSM} min={0} max={20} width={34} onChange={setMinorSM} />
          </Field>
          <span>
            Dexterity + Craft Amulets + materials{divine ? ' + Dominion' : ''} = {minorTotal}: {minorTotal >= 2 * minorLevel ? `made in ${Math.max(1, 12 - ca)} hours` : `needs ${2 * minorLevel}`}; it lasts days or weeks.
          </span>
        </div>
      )}
      {works.map((w) => {
        const plan = holyWorkPlan(d, w, aura);
        return (
          <div key={w.uid} className="card-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 6 }}>
            <div className="row small">
              <b>{w.name}</b>
              <span className="muted">
                ({holyWorkLabel(w.kind)}, {w.seasons} season{w.seasons === 1 ? '' : 's'})
              </span>
              {!w.done && (
                <span>
                  total <Total value={plan.total.total} parts={plan.total.parts} notes={plan.total.notes} label={w.name} />
                </span>
              )}
              {w.done ? <span className="ok">{w.result}</span> : <span>{plan.text}</span>}
            </div>
            {!w.done && (
              <div className="row small">
                {(w.kind === 'amulet' || w.kind === 'empower') && (
                  <Field label="Level">
                    <Stepper value={w.target} min={1} max={100} width={40} onChange={(v) => set(w.uid, { target: v })} />
                  </Field>
                )}
                {w.kind === 'trueName' && (
                  <Field label="The being’s Might">
                    <Stepper value={w.target} min={1} max={100} width={40} onChange={(v) => set(w.uid, { target: v })} />
                  </Field>
                )}
                {w.kind === 'amulet' && (
                  <>
                    <select value={w.method ?? ''} onChange={(e) => set(w.uid, { method: e.target.value || undefined })} aria-label="Method">
                      <option value="">no Method</option>
                      {holyMethodsOf(d).map((m) => (
                        <option key={m.id} value={m.id}>{m.name} {m.score}</option>
                      ))}
                    </select>
                    <select value={w.power ?? ''} onChange={(e) => set(w.uid, { power: e.target.value || undefined })} aria-label="Power">
                      <option value="">no Power</option>
                      {holyPowersOf(d).map((p) => (
                        <option key={p.id} value={p.id}>{p.name} {p.score}</option>
                      ))}
                    </select>
                    <Field label="Shape and material">
                      <Stepper value={w.materials ?? 0} min={0} max={30} width={34} onChange={(v) => set(w.uid, { materials: v })} />
                    </Field>
                  </>
                )}
                {w.kind === 'shinnui' && (
                  <Field label="The text’s Quality">
                    <Stepper value={w.quality ?? 0} min={0} max={30} width={34} onChange={(v) => set(w.uid, { quality: v })} />
                  </Field>
                )}
                {w.kind !== 'shinnui' && w.kind !== 'amulet' && (
                  <>
                    <Field label="Others praying with" hint={w.kind === 'trueName' ? 'Each adds Stamina + Merkavah (Ceremony)' : 'Each adds Intelligence + Kabbalah (Ceremony); each adds a botch die'}>
                      <Stepper value={w.helpers ?? 0} min={0} max={20} width={34} onChange={(v) => set(w.uid, { helpers: v })} />
                    </Field>
                    {(w.helpers ?? 0) > 0 && (
                      <Field label="Their bonus">
                        <Stepper value={w.ceremonyBonus ?? 0} min={0} max={100} width={40} onChange={(v) => set(w.uid, { ceremonyBonus: v })} />
                      </Field>
                    )}
                  </>
                )}
                <button className="small" disabled={busy} title={busy ? `${season} ${year} is already spent: the next season, then` : undefined} onClick={() => work(w)}>
                  Work a season
                </button>
                {w.kind === 'golem' && w.bodyFormed && (
                  <button className="small primary" disabled={busy} onClick={() => work(w, true)} title={busy ? `${season} ${year} is already spent` : 'The last season: a stress die is added and the golem awakens'}>
                    Last season: awaken it
                  </button>
                )}
                <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), works: (x.holy?.works ?? []).filter((y) => y.uid !== w.uid) }))} aria-label="Remove the work">
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div className="row small" style={{ marginTop: 8 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as HolyWorkKind | '')} aria-label="A new work">
          <option value="">begin a work…</option>
          {open.map((k) => (
            <option key={k} value={k}>{holyWorkLabel(k)}</option>
          ))}
        </select>
        {kind && (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'trueName' ? 'the being (e.g. Raphael)' : 'its name'} />
            {kind !== 'golem' && kind !== 'shinnui' && (
              <Field label={kind === 'trueName' ? 'Its Might' : 'Level'}>
                <Stepper value={target} min={1} max={100} width={40} onChange={setTarget} />
              </Field>
            )}
            <button className="small" onClick={start}>Begin</button>
          </>
        )}
      </div>
      {busy && works.some((w) => !w.done) && <p className="small muted">{season} {year} is already spent; the works go on next season.</p>}
      {c.holy?.trueNames?.length ? <p className="small">True Names known: {c.holy.trueNames.join(', ')}.</p> : null}
      {c.holy?.shinnui ? <p className="small">Shinnui Shem: −{c.holy.shinnui} to Aging rolls until the next Aging Point.</p> : null}
      <Lines lines={lines} />
    </Card>
  );
}
