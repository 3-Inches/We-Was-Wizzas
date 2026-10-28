// Cards on the Covenfolk page for what goes beyond the head count: soldiers from the Residents Boons,
// what the covenant spends every year besides upkeep (Redcap visits, feast days, guests), how its
// covenfolk are organized and who counts among its inhabitants, the Guild Hook, and craft magic
// cast in place of craftsmen (Covenants ch.2, ch.4, ch.5; DE; Grogs; City & Guild).

import { useMemo, useState } from 'react';
import { ART_NAMES, type Form, type Technique } from '../../data';
import { abilityTotal, deriveCharacter } from '../../engine/character/derive';
import {
  CRAFT_GUIDELINES, CRAFT_TASKS, FEAST_CYCLE, ORGANIZATIONS, SOLDIER_KINDS, SOLDIER_KIND_BY_ID, SPAN_CASTS, SPAN_LABEL, YEARLY_EVENTS, craftMagicFigures, guildDemands, guildHookOf,
  newSoldierGroup, soldierBoonsWithoutGroups, soldierKindOf, weaponArmorEstimate, yearlyEventPounds,
} from '../../engine/covenfolk';
import { DURATIONS, RANGES, TARGETS, addMagnitudes, findOpt } from '../../engine/spellDesign';
import {
  DISCIPLINE, GROUP_TRAINING, WATCHES, WATCH_SHARES, applyDiscipline, assignWatches, disciplineLoyalty, dutyAt, retire, rollDoubleDuty, rollGroupTraining, rollStayAwake, stayAwakeEase, type Patrol,
} from '../../engine/turb';
import type { Character, CraftMagicUse, SoldierGroup } from '../../engine/types';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Field, HowItWorks, Stepper } from '../kit';
import { RulesNote } from '../RulesNote';
import type { CovTabProps } from './shared';

// ------------------------------------------------------------------------------ Soldiers

export function SoldiersCard({ cov, update, dc }: Omit<CovTabProps, 'data'>) {
  const [kind, setKind] = useState('veteran');
  const groups = cov.finances.soldiers ?? [];
  const missing = soldierBoonsWithoutGroups(cov);
  const t = dc.finances.soldiers;
  const setG = (u: string, fn: (g: SoldierGroup) => void) => update((x) => void fn((x.finances.soldiers ?? []).find((g) => g.uid === u)!));
  return (
    <Card title={`Soldiers (${t.people})`} tour="soldiers">
      <RulesNote book="Cov" line={640} endLine={728}>
        Soldiers from the Residents Boons and Free Choices: paid soldiers cost a pound a year for each penny a day (Covenants ch.5); those who live at the covenant count as grogs among the
        inhabitants, their horses a point each. List them here rather than under Grogs.
      </RulesNote>
      {groups.length === 0 && missing.length === 0 && <div className="small muted">None. A soldier Boon (Veteran Fighters, Crossbowmen, Cavalry…) or a Free Choice brings them.</div>}
      {groups.map((g) => {
        const k = SOLDIER_KIND_BY_ID.get(g.kind);
        const hb = cov.hooksBoons.find((h) => h.uid === g.hbUid);
        return (
          <div key={g.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
            <select value={g.kind} onChange={(e) => setG(g.uid, (x) => void (x.kind = e.target.value))} title={k?.hint}>
              {SOLDIER_KINDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {hb && <span className="badge info">{hb.name} ({hb.size})</span>}
            <Field label="How many">
              <Stepper value={g.count} min={0} width={40} onChange={(v) => setG(g.uid, (x) => void (x.count = v))} />
            </Field>
            <Field label="Pennies a day each">
              <Stepper value={g.pennies} min={0} width={30} onChange={(v) => setG(g.uid, (x) => void (x.pennies = v))} />
            </Field>
            <Field label="Horses each">
              <Stepper value={g.horses} min={0} max={4} width={30} onChange={(v) => setG(g.uid, (x) => void (x.horses = v))} />
            </Field>
            <Field label="Kit (weapons & armor points each)">
              <Stepper value={g.gear} min={0} step={4} width={40} onChange={(v) => setG(g.uid, (x) => void (x.gear = v))} />
            </Field>
            <label className="inline small" title="Tenants who serve as part of their rent live at home and are not inhabitants">
              <input type="checkbox" checked={g.inhabitants} onChange={(e) => setG(g.uid, (x) => void (x.inhabitants = e.target.checked))} /> live at the covenant
            </label>
            <span className="badge">{g.count * g.pennies} £ a year</span>
            <button className="small ghost" onClick={() => update((x) => void (x.finances.soldiers = (x.finances.soldiers ?? []).filter((y) => y.uid !== g.uid)))}>
              ✕
            </button>
            {k && <div className="small muted" style={{ flexBasis: '100%' }}>{k.hint}</div>}
          </div>
        );
      })}
      <div className="row small" style={{ marginTop: 6 }}>
        {missing.map((h) => (
          <button key={h.uid} className="small" onClick={() => update((x) => void (x.finances.soldiers ??= []).push(newSoldierGroup(soldierKindOf(h.name)!.id, h.size === 'Major' ? 20 : 10, h.uid)))}>
            + {h.size === 'Major' ? 20 : 10} {soldierKindOf(h.name)!.label.toLowerCase()} for {h.name}
          </button>
        ))}
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {SOLDIER_KINDS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="small" onClick={() => update((x) => void (x.finances.soldiers ??= []).push(newSoldierGroup(kind, 6)))}>
          + Add soldiers
        </button>
      </div>
      {t.people > 0 && (
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          {t.inhabitants} live at the covenant, with {t.horses} horses; {t.pennies} £ a year in pay (under Wages); {t.gear} points of weapons and armor.
        </p>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------------------ Weapons and armor

export function GearHelper({ cov, update, dc, data }: CovTabProps) {
  const est = weaponArmorEstimate(cov, dc.members, data);
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="row tight">
        <Stepper value={cov.finances.weaponArmorPoints} min={0} step={32} width={56} onChange={(v) => update((x) => void (x.finances.weaponArmorPoints = v))} />
        {est.total !== cov.finances.weaponArmorPoints && (
          <button className="small" title={est.lines.map((l) => `${l.label}: ${l.points}`).join('\n')} onClick={() => update((x) => void (x.finances.weaponArmorPoints = est.total))}>
            = {est.total} worked out
          </button>
        )}
      </span>
      <HowItWorks label="How it is worked out">
        A pound a year for every 320 points (Covenants ch.5). Weapon or shield 1 / 4 / 16, partial armor 2 / 8 / 32, full armor 4 / 16 / 64 (inexpensive / standard / expensive); a ballista
        16, a trebuchet 32. Worked out: {est.lines.map((l) => `${l.label} = ${l.points}`).join('; ') || 'nobody armed yet'}.
        <span className="row tight" style={{ marginTop: 4 }}>
          Stores and siege engines
          <Stepper value={cov.finances.arsenalPoints ?? 0} min={0} step={16} width={46} onChange={(v) => update((x) => void (x.finances.arsenalPoints = v || undefined))} />
        </span>
      </HowItWorks>
    </div>
  );
}

// ------------------------------------------------------------------------------ Each year

export function YearlyCard({ cov, update, dc }: Omit<CovTabProps, 'data'>) {
  const list = cov.finances.yearly ?? [];
  const count = (id: string) => list.find((e) => e.id === id)?.count ?? 0;
  const setCount = (id: string, n: number) =>
    update((x) => {
      const y = (x.finances.yearly ??= []);
      const e = y.find((v) => v.id === id);
      if (e) e.count = n;
      else y.push({ id, count: n });
      x.finances.yearly = y.filter((v) => v.count > 0);
    });
  const total = dc.finances.yearly.reduce((t, e) => t + e.pounds, 0);
  return (
    <Card title={`Each year (${Math.round(total * 10) / 10} £)`} tour="yearly">
      <RulesNote book="Cov" line={3926} endLine={4060}>
        What the covenant spends every year besides its upkeep, from the price list (Covenants ch.5). Unlike Sundry, these stay from year to year. A regular cycle of four or more feast days earns a
        Loyalty point every year (Covenants ch.4). The covenant feeds about {dc.finances.people} people.
      </RulesNote>
      <div className="grid grid-2">
        {YEARLY_EVENTS.map((e) => (
          <Field key={e.id} label={e.label} hint={e.hint}>
            <span className="row tight">
              <Stepper value={count(e.id)} min={0} width={36} onChange={(v) => setCount(e.id, v)} />
              <span className="small muted">
                {yearlyEventPounds({ id: e.id, count: count(e.id) }, dc.finances.people)} £{e.id === 'feasts' && count(e.id) >= FEAST_CYCLE ? ' · +1 Loyalty a year' : ''}
              </span>
            </span>
          </Field>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------------------ Organization, who counts, and the Guild Hook

export function OrganizationCard({ cov, update, dc }: Omit<CovTabProps, 'data'>) {
  const org = ORGANIZATIONS.find((x) => x.id === cov.organization);
  const guild = guildHookOf(cov);
  const demands = guildDemands(cov);
  const own = new Set(cov.finances.ownUpkeep ?? []);
  return (
    <Card title="How the covenfolk live" tour="covenfolk-organization">
      <div className="row">
        <Field label="Organization" hint="DE, The Organization of Covenfolk">
          <select value={cov.organization ?? ''} onChange={(e) => update((x) => void (x.organization = (e.target.value || undefined) as typeof x.organization))}>
            <option value="">— not decided —</option>
            {ORGANIZATIONS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Magi live" hint="Covenants ch.5: a poorer life costs fewer points, and earns the Redcaps’ gossip">
          <select value={cov.finances.magiLiving ?? ''} onChange={(e) => update((x) => void (x.finances.magiLiving = (e.target.value || undefined) as typeof x.finances.magiLiving))}>
            <option value="">as magi (full points)</option>
            <option value="impoverished">impoverished (a companion’s points)</option>
            <option value="pauper">as covenfolk (a specialist’s points; companions too)</option>
          </select>
        </Field>
      </div>
      {org && (
        <RulesNote book="DE" line={org.line}>
          {org.text}
        </RulesNote>
      )}
      {dc.members.length > 0 && (
        <details>
          <summary className="small">Members who pay their own upkeep ({own.size})</summary>
          <div className="row small">
            {dc.members.map((m) => (
              <label key={m.id} className="inline" title="Characters of independent means, or who work for one of the covenant's income sources, are not counted (Covenants ch.5)">
                <input
                  type="checkbox"
                  checked={own.has(m.id)}
                  onChange={(e) => update((x) => void (x.finances.ownUpkeep = e.target.checked ? [...(x.finances.ownUpkeep ?? []), m.id] : (x.finances.ownUpkeep ?? []).filter((u) => u !== m.id)))}
                />{' '}
                {m.name || 'Unnamed'}
              </label>
            ))}
          </div>
        </details>
      )}
      {guild && (
        <div className="stack small" style={{ marginTop: 6 }}>
          <b>The covenfolk’s guild (Guild Hook)</b>
          <span className="muted">
            It can call the covenfolk out together, agitates for better wages, shorter hours and safer work, and keeps funds for the sick, the old, widows and funerals. Its craftsmen hold guild
            ranks (City &amp; Guild ch.3), checked on the craftsmen below.
          </span>
          {demands.length ? <span className="warn-text">It wants: {demands.join('; ')}.</span> : <span className="good-text">Its demands are met.</span>}
          <label className="inline">
            <input type="checkbox" checked={!!guild.active} onChange={(e) => update((x) => void (x.hooksBoons.find((h) => h.uid === guild.uid)!.active = e.target.checked))} /> on strike: laborers
            and craftsmen save nothing until it ends
          </label>
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------------------ Craft magic

const SPANS: CraftMagicUse['span'][] = ['day', 'month', 'season', 'year'];

export function CraftMagicCard({ cov, update, dc, data }: CovTabProps) {
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const magi = dc.members.filter((m) => m.type === 'magus');
  const [guide, setGuide] = useState(CRAFT_GUIDELINES[7].id);
  const [range, setRange] = useState('Touch');
  const [duration, setDuration] = useState('Momentary');
  const [target, setTarget] = useState('Group');
  const [extra, setExtra] = useState(0);
  const g = CRAFT_GUIDELINES.find((x) => x.id === guide)!;
  const mags = (findOpt(RANGES, range)?.magnitude ?? 0) + (findOpt(DURATIONS, duration)?.magnitude ?? 0) + (findOpt(TARGETS, target)?.magnitude ?? 0) + extra;
  const level = addMagnitudes(g.base, mags);
  const known = magi.flatMap((m) =>
    m.spells
      .map((s) => ({ m, def: s.spellId ? data.spellById.get(s.spellId) : undefined, s }))
      .filter((x) => x.def && (x.def.technique === 'Re' || x.def.technique === 'Cr') && ['An', 'He', 'Te', 'Aq', 'Ig'].includes(x.def.form) && x.def.level !== null),
  );
  const uses = cov.craftMagic ?? [];
  const add = (u: Omit<CraftMagicUse, 'uid'>) => update((x) => void (x.craftMagic ??= []).push({ uid: uid(), ...u }));
  const setU = (u: string, fn: (x: CraftMagicUse) => void) => update((x) => void fn((x.craftMagic ?? []).find((y) => y.uid === u)!));
  const casterTotals = (id?: string) => {
    const m = magi.find((x) => x.id === id);
    if (!m || !saga) return undefined;
    const d = deriveCharacter(m, data, saga.houseRules);
    const fin = d.abilities.filter((a) => a.abilityId === 'finesse').reduce((t, a) => Math.max(t, a.total), 0);
    return { d, perFinesse: d.characteristics.Per.value + fin, cast: (t: Technique, f: Form) => d.arts[t].score + d.arts[f].score + d.characteristics.Sta.value + dc.aura };
  };
  return (
    <Card title={`Craft magic${uses.length ? ` (${uses.length})` : ''}`} tour="craft-magic">
      <RulesNote book="Cov" line={2697} endLine={2860}>
        Rego can do any craftsman’s work from materials at hand, with a Perception + Finesse roll at least 3 above the craft’s Ease Factor: +3 for a month’s work in one casting, +6 a season’s,
        +9 a year’s. Failure makes a mess; a botch hides a flaw. Creo needs no Finesse roll. At the storyguide’s discretion, a spell cast over and over saves a pound a year per magnitude, like a
        device; each casting of a Ritual about five pounds per magnitude (Covenants ch.5).
      </RulesNote>
      <div className="row small">
        <Field label="Guideline">
          <select value={guide} onChange={(e) => setGuide(e.target.value)} style={{ maxWidth: 260 }}>
            {CRAFT_GUIDELINES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.technique}
                {x.form} {x.base}: {x.label}
              </option>
            ))}
          </select>
        </Field>
        {(
          [
            ['Range', RANGES, range, setRange],
            ['Duration', DURATIONS, duration, setDuration],
            ['Target', TARGETS, target, setTarget],
          ] as const
        ).map(([label, list, v, setV]) => (
          <Field key={label} label={label}>
            <select value={v} onChange={(e) => setV(e.target.value)}>
              {list
                .filter((o) => !o.requires)
                .map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name} (+{o.magnitude})
                  </option>
                ))}
            </select>
          </Field>
        ))}
        <Field label="Material and complexity" hint="+1 stone or glass, +2 metal or gems; +1 or +2 for complex work">
          <Stepper value={extra} min={0} max={6} width={30} onChange={setExtra} />
        </Field>
        <span className="badge">
          {g.technique}
          {g.form} {level}
        </span>
        <button
          className="small"
          onClick={() =>
            add({ name: g.label, technique: g.technique, form: g.form, level, taskEase: 6, span: 'day', castsPerYear: SPAN_CASTS.day, noFinesse: g.technique === 'Cr', active: false, casterId: magi[0]?.id })
          }
        >
          + Use it
        </button>
        {known.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const k = known[Number(e.target.value)];
              if (k?.def) add({ name: k.def.name, technique: k.def.technique, form: k.def.form as Form, level: k.def.level!, taskEase: 6, span: 'day', castsPerYear: SPAN_CASTS.day, noFinesse: k.def.technique === 'Cr', ritual: !!k.def.ritual, active: false, casterId: k.m.id });
            }}
          >
            <option value="">or a spell a magus knows…</option>
            {known.map((k, i) => (
              <option key={i} value={i}>
                {k.m.name}: {k.def!.name} ({k.def!.technique}
                {k.def!.form} {k.def!.level})
              </option>
            ))}
          </select>
        )}
      </div>
      {uses.map((u) => {
        const c = casterTotals(u.casterId);
        const f = craftMagicFigures(u, c?.perFinesse ?? 0);
        const cast = c?.cast(u.technique, u.form);
        return (
          <div key={u.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
            <input value={u.name} style={{ width: 170 }} onChange={(e) => setU(u.uid, (x) => void (x.name = e.target.value))} />
            <span className="badge">
              {u.technique}
              {u.form} {u.level}
            </span>
            <select value={u.casterId ?? ''} onChange={(e) => setU(u.uid, (x) => void (x.casterId = e.target.value || undefined))}>
              <option value="">— caster —</option>
              {magi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {!u.noFinesse && (
              <select value={u.taskEase} title="The mundane craft task" onChange={(e) => setU(u.uid, (x) => void (x.taskEase = Number(e.target.value)))}>
                {CRAFT_TASKS.map((t) => (
                  <option key={t.label} value={t.ease}>
                    {t.label} ({t.ease})
                  </option>
                ))}
              </select>
            )}
            <select value={u.span} onChange={(e) => setU(u.uid, (x) => void ((x.span = e.target.value as CraftMagicUse['span']), (x.castsPerYear = SPAN_CASTS[x.span])))}>
              {SPANS.map((s) => (
                <option key={s} value={s}>
                  {SPAN_LABEL[s]} a casting
                </option>
              ))}
            </select>
            <Field label="Castings a year" hint="A craftsman’s three working seasons: about 180 days, 9 months, 3 seasons or 1 year">
              <Stepper value={u.castsPerYear} min={0} width={44} onChange={(v) => setU(u.uid, (x) => void (x.castsPerYear = v))} />
            </Field>
            <label className="inline small">
              <input type="checkbox" checked={!!u.ritual} onChange={(e) => setU(u.uid, (x) => void (x.ritual = e.target.checked || undefined))} /> Ritual
            </label>
            <label className="inline small" title="Creo draws on the realm of Forms: always at least roughly right">
              <input type="checkbox" checked={!!u.noFinesse} onChange={(e) => setU(u.uid, (x) => void (x.noFinesse = e.target.checked || undefined))} /> no Finesse roll
            </label>
            <label className="inline small" title="Count what it saves in this year's expenditure">
              <input type="checkbox" checked={u.active} onChange={(e) => setU(u.uid, (x) => void (x.active = e.target.checked))} /> in use (saves {u.ritual ? 5 * f.magnitude * u.castsPerYear : f.magnitude} £)
            </label>
            <button className="small ghost" onClick={() => update((x) => void (x.craftMagic = (x.craftMagic ?? []).filter((y) => y.uid !== u.uid)))}>
              ✕
            </button>
            <div className="small" style={{ flexBasis: '100%' }}>
              {u.noFinesse
                ? 'No Finesse roll. '
                : `Perception + Finesse ${f.finesse} + stress die vs ${f.ease}: ${Math.round(f.success * 100)}% success, ${Math.round(f.botch * 1000) / 10}% botch; ${f.rolls} rolls a year — about ${f.failures} spoiled and ${f.botches} hidden flaws. `}
              {cast !== undefined && `Casting Score ${cast} (with aura ${dc.aura}) vs level ${u.level}: ${cast >= u.level ? 'cast without Fatigue' : cast + 10 >= u.level ? 'a Fatigue level unless the die helps' : 'needs a good roll'}. `}
              {ART_NAMES[u.technique]} {ART_NAMES[u.form]}.
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// ------------------------------------------------------------------------------ The turb's day

export function TurbCard({ cov, update, dc, data }: CovTabProps) {
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const folk = dc.members.filter((m) => m.type !== 'magus' && !m.creature);
  const active = folk.filter((m) => !m.retired);
  const grogs = active.filter((m) => m.type === 'grog');
  const [at, setAt] = useState(0);
  const [msg, setMsg] = useState<string[]>([]);
  const [who, setWho] = useState('');
  const [what, setWhat] = useState(DISCIPLINE[0].id);
  const [byMagus, setByMagus] = useState(false);
  const [unjust, setUnjust] = useState(false);
  const [note, setNote] = useState('');
  const [leader, setLeader] = useState('');
  const [time, setTime] = useState(GROUP_TRAINING[0].ease);
  const turb = cov.turb ?? { watches: {} };
  const double = !!turb.double;
  const year = saga?.currentYear ?? 1220;
  const scores = useMemo(
    () =>
      new Map(
        folk.map((m) => {
          const d = deriveCharacter(m, data, saga?.houseRules ?? {});
          return [m.id, { sta: d.characteristics.Sta.value, com: d.characteristics.Com.value, conc: abilityTotal(d, 'concentration'), lead: abilityTotal(d, 'leadership') }];
        }),
      ),
    [dc.members, data, saga?.houseRules],
  );
  const score = (m: Character) => scores.get(m.id) ?? { sta: 0, com: 0, conc: 0, lead: 0 };
  const setTurb = (fn: (t: NonNullable<typeof cov.turb>) => void) => update((x) => void fn((x.turb ??= { watches: {} })));
  const watchOf = (id: string) => turb.watches[id];
  const soldiers = dc.finances.soldiers.people + cov.covenfolk.grogs;
  const shares = WATCH_SHARES[double ? 'double' : 'single'];
  const w = WATCHES[at];
  const target = folk.find((m) => m.id === who) ?? folk[0];
  const disc = DISCIPLINE.find((x) => x.id === what)!;
  const lead = active.find((m) => m.id === leader) ?? [...active].sort((a, b) => score(b).lead - score(a).lead)[0];
  const ls = lead && score(lead);
  const say = (lines: string[]) => setMsg(lines);
  const awake = (m: Character) => {
    const s = score(m);
    say([`${m.name}: ${rollStayAwake(s.sta, s.conc, double, w.night).text}`]);
  };
  const dusk = () => {
    const n = turb.doubleDuties ?? 0;
    const out = grogs.map((m) => {
      const r = rollDoubleDuty(score(m).sta, n);
      if (!r.ok) updateCharacter(m.id, (c) => void (c.longTermFatigueLost += 1));
      return `${m.name}: ${r.text}`;
    });
    setTurb((t) => void (t.doubleDuties = n + 2));
    say(out.length ? out : ['No grog characters to roll for.']);
  };
  const apply = () => {
    if (!target) return;
    let text = '';
    updateCharacter(target.id, (c) => void (text = applyDiscipline(c, what, year, note.trim() || undefined)));
    const lp = disciplineLoyalty(what, byMagus, unjust, dc.loyalty.score);
    if (lp) update((x) => void ((x.loyalty.actionPoints += lp), x.log.push({ uid: uid(), year, text: `${target.name}: ${disc.label}, ordered by a magus${unjust ? ' (unjustly)' : ''}: ${lp} Loyalty Points.` })));
    say([`${target.name}: ${text || disc.label}${lp ? ` ${lp} Loyalty Points (Covenants ch.4).` : ''}`]);
    setNote('');
  };
  return (
    <Card title="The turb's day" tour="turb">
      <RulesNote book="Grogs" line={1020} endLine={1230}>
        The day is eight watches of three hours. Each patrol (day and night) has four watches; on single duty a quarter of the soldiers are ready and three-eighths can turn out quickly, on double
        duty (when trouble is expected) half are ready. Staying awake on sentry is Stamina + Concentration + a simple die against 3, or 6 on double duty, +3 at night; double duty also costs a
        Fatigue roll at dusk. Rewards and punishments come from the turb captain, steward or chamberlain; one a magus orders costs Loyalty Points (Covenants ch.4).
      </RulesNote>
      <b className="small">Watches</b>
      <div className="row small">
        <Field label="Time of day">
          <select value={at} onChange={(e) => setAt(Number(e.target.value))}>
            {WATCHES.map((x, i) => (
              <option key={x.id} value={i}>
                {x.label} ({x.starts})
              </option>
            ))}
          </select>
        </Field>
        <label className="inline">
          <input type="checkbox" checked={double} onChange={(e) => setTurb((t) => void ((t.double = e.target.checked || undefined), (t.doubleDuties = e.target.checked ? t.doubleDuties ?? 0 : undefined)))} /> double duty
        </label>
        {grogs.length > 0 && (
          <button className="small" onClick={() => setTurb((t) => void (t.watches = assignWatches(grogs.map((g) => g.id))))} title="Shares the grog characters evenly between the day and night patrols and their four watches">
            Share out the watches
          </button>
        )}
        {double && (
          <>
            <Field label="Double-duty watches since a normal one">
              <Stepper value={turb.doubleDuties ?? 0} min={0} width={34} onChange={(v) => setTurb((t) => void (t.doubleDuties = v))} />
            </Field>
            <button className="small" onClick={dusk} title="Stamina + a simple die against 3 + the double-duty watches stood; a failure costs a Long-Term Fatigue level, marked on the sheet">
              Dusk Fatigue rolls
            </button>
          </>
        )}
      </div>
      {soldiers > 0 && (
        <p className="small muted" style={{ margin: '4px 0' }}>
          Of about {soldiers} soldiers: {Math.round(soldiers * shares.ready)} on duty, {Math.round(soldiers * shares.mobile)} who can turn out quickly, {Math.round(soldiers * shares.asleep)} asleep.
        </p>
      )}
      {grogs.length === 0 && <div className="small muted">No grog characters are members. Their watches show here once they are.</div>}
      {grogs.map((m) => {
        const wt = watchOf(m.id);
        const duty = wt && dutyAt(wt.patrol, wt.watch, at, double);
        return (
          <div key={m.id} className="list-row" style={{ flexWrap: 'wrap' }}>
            <span style={{ minWidth: 110 }}>{m.name}</span>
            <select value={wt?.patrol ?? ''} onChange={(e) => setTurb((t) => void (e.target.value ? (t.watches[m.id] = { patrol: e.target.value as Patrol, watch: wt?.watch ?? 1 }) : delete t.watches[m.id]))}>
              <option value="">no watch</option>
              <option value="day">day patrol</option>
              <option value="night">night patrol</option>
            </select>
            {wt && (
              <select value={wt.watch} onChange={(e) => setTurb((t) => void (t.watches[m.id] = { ...wt, watch: Number(e.target.value) }))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    watch {n}
                  </option>
                ))}
              </select>
            )}
            {duty && <span className={`badge ${duty === 'duty' ? 'good' : duty === 'free' ? '' : 'info'}`}>{duty === 'duty' ? 'on duty' : duty === 'off' ? 'off duty' : 'asleep'}</span>}
            {(!wt || duty === 'duty') && (
              <button className="small ghost" onClick={() => awake(m)} title={`Stamina + Concentration + a simple die against ${stayAwakeEase(double, w.night)}`}>
                Awake?
              </button>
            )}
          </div>
        );
      })}
      <b className="small" style={{ marginTop: 8 }}>
        Drill
      </b>
      <div className="row small">
        <Field label="Leader">
          <select value={lead?.id ?? ''} onChange={(e) => setLeader(e.target.value)}>
            {active.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Training time">
          <select value={time} onChange={(e) => setTime(Number(e.target.value))}>
            {GROUP_TRAINING.map((g) => (
              <option key={g.ease} value={g.ease}>
                {g.label} (Ease {g.ease})
              </option>
            ))}
          </select>
        </Field>
        {ls && (
          <button className="small" onClick={() => say([`${lead.name}: ${rollGroupTraining(ls.com, ls.lead, time).text}`])} title="A season together makes any group a trained group; a good leader can shorten it (Lords of Men ch.9)">
            Roll to shorten the training
          </button>
        )}
        {ls && <span className="muted">{ls.lead > 0 ? `Leads a trained group of up to ${ls.lead} (Leadership).` : 'Without Leadership, they can lead no trained group.'}</span>}
      </div>
      <b className="small" style={{ marginTop: 8 }}>
        Rewards and punishments
      </b>
      {folk.length === 0 ? (
        <div className="small muted">No grog or companion characters are members.</div>
      ) : (
        <>
          <div className="row small">
            <select value={target?.id ?? ''} onChange={(e) => setWho(e.target.value)}>
              {folk.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.retired ? ` (${m.retired.how})` : ''}
                </option>
              ))}
            </select>
            <select value={what} onChange={(e) => setWhat(e.target.value)} style={{ maxWidth: 260 }}>
              {(['reward', 'punishment'] as const).map((k) => (
                <optgroup key={k} label={k === 'reward' ? 'Rewards' : 'Punishments'}>
                  {DISCIPLINE.filter((x) => x.kind === k).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input placeholder="For what (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: 160 }} />
            {disc.kind === 'punishment' && (
              <>
                <label className="inline" title="Punishment by the turb captain, steward or chamberlain costs no Loyalty if fair">
                  <input type="checkbox" checked={byMagus} onChange={(e) => setByMagus(e.target.checked)} /> ordered by a magus
                </label>
                {byMagus && (
                  <label className="inline" title="While Prevailing Loyalty is positive, only unjust punishment costs Loyalty Points">
                    <input type="checkbox" checked={unjust} onChange={(e) => setUnjust(e.target.checked)} /> unjust
                  </label>
                )}
              </>
            )}
            <button className="small" onClick={apply}>
              Apply
            </button>
          </div>
          <div className="small muted">{disc.hint}</div>
          <div className="row small" style={{ marginTop: 4 }}>
            {target && !target.retired && (
              <button className="small ghost" onClick={() => updateCharacter(target.id, (c) => retire(c, year))} title="Still a member for the covenant's finances; lighter duties or none">
                Retire {target.name}
              </button>
            )}
            {target?.retired && (
              <button className="small ghost" onClick={() => updateCharacter(target.id, (c) => void delete c.retired)}>
                Back into service
              </button>
            )}
            <span className="muted">
              {cov.finances.pension ? 'The covenant pays a pension: usually half to three-quarters of former pay, passed on to a widow.' : 'No pension: retired covenfolk get food and a bed, and may pay rent.'}
            </span>
          </div>
        </>
      )}
      {msg.map((l, i) => (
        <div key={i} className="small" style={{ marginTop: 4 }}>
          {l}
        </div>
      ))}
    </Card>
  );
}
