// A craftsman's or laborer's livelihood (City & Guild, ch.2 Labor), opt-in when the saga uses City &
// Guild: the Workshop Total and the quality it makes, Labor Points banked season by season, the
// improvements they buy, workshop exertion, selling, and wondrous items.

import { useState } from 'react';
import { CHARACTERISTICS, CHAR_NAMES, type Characteristic } from '../../../data';
import type { Workshop } from '../../../engine/types';
import {
  INNOVATION_COST, INVESTMENTS, RAW_MATERIALS_COST, STORY_AWARDS, WEALTH_MULT, WEALTH_STEP, boomRoll, craftQuality, seasonWorth, sellGoods, smugglingLp, upkeep, wondrousItem, workshopFigures,
  workshopSeason, workshopTotal,
} from '../../../engine/workshop';
import { applySeason, newSeasonEntry } from '../../../engine/longterm';
import { FREQUENCY } from '../../../engine/enchant';
import { uid } from '../../../util/id';
import { Card, Field, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

/** situations that raise the base Craft Level (C&G, Finished Goods Craft Levels) */
const SITUATIONS = [
  { id: 'distant', label: 'Distant war, famine or plague', value: 1 },
  { id: 'active', label: 'Active war, famine or plague', value: 3 },
  { id: 'scarce', label: 'Scarce materials', value: 1 },
  { id: 'interrupted', label: 'Severe or multiple interruptions', value: 2 },
  { id: 'lost', label: 'Losing an employee', value: 1 },
  { id: 'new', label: 'A new employee (first season)', value: 1 },
  { id: 'aura', label: 'An Infernal, Faerie or Magic aura', value: 1 },
];

const newWorkshop = (abilityUid: string | undefined, profession: boolean): Workshop => ({
  abilityUid, primary: profession ? 'Str' : 'Dex', innovation: 0, rawMaterials: 0, laborPoints: 0, assistants: [], manual: 0, craftLevelMod: 0,
  seasonsWorked: 0, reputationXp: 0, shoddyStreak: 0,
});

export function WorkshopCard({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga } = ed;
  const [situations, setSituations] = useState<string[]>([]);
  const [exert, setExert] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [magnitude, setMagnitude] = useState(1);
  const [freq, setFreq] = useState(FREQUENCY[0]?.value ?? '');
  if (!c || !d || !saga) return null;
  const usesCG = saga.enabledBooks.length === 0 || saga.enabledBooks.includes('CG');
  const trades = d.abilities.filter((a) => a.abilityId.startsWith('craft') || a.abilityId.startsWith('profession'));
  if (!usesCG || (!c.workshop && !trades.length)) return null;
  const w = c.workshop;
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 12));
  const set = (fn: (x: Workshop) => void) => update((x) => void (x.workshop && fn(x.workshop)));

  if (!w)
    return (
      <Card title="Livelihood & workshop (City & Guild)">
        <p className="small muted" style={{ marginTop: 0 }}>
          Optional: for a craftsman or laborer who works for a living. Tracks Labor Points, the Workshop Total and the quality of each season&apos;s goods, and what the points buy
          (City &amp; Guild, ch.2).
        </p>
        <button className="small" onClick={() => update((x) => void (x.workshop = newWorkshop(trades[0]?.uid, trades[0]?.abilityId.startsWith('profession') ?? false)))}>
          Track this character&apos;s livelihood
        </button>
      </Card>
    );

  const situation = situations.reduce((t, id) => t + (SITUATIONS.find((x) => x.id === id)?.value ?? 0), 0);
  const f = workshopFigures(c, d, situation)!;
  const trade = f.trade;
  const craft = f.craft;
  const profession = !!trade?.abilityId.startsWith('profession');
  const wealth = f.wealth;
  const primary = d.characteristics[w.primary].value;
  const lpChar = profession ? { key: 'Com' as Characteristic, value: d.characteristics.Com.value } : { key: w.primary, value: primary };
  const { leadership, maxAssistants, missing, lp, baseLevel } = f;
  const wtFor = (assistants: number[]) =>
    workshopTotal({
      characteristic: { label: CHAR_NAMES[w.primary], value: primary }, ability: { label: trade?.name ?? 'Craft', value: craft },
      innovation: w.innovation, rawMaterials: w.rawMaterials, assistants, manual: w.manual,
    });
  const wt = f.total;
  const q = craftQuality(wt.total, baseLevel, craft);
  const keep = upkeep(w.rawMaterials);
  const bargain = d.abilities.find((a) => a.abilityId === 'bargain')?.total ?? 0;
  const year = saga.currentYear ?? 1220;
  const season = saga.currentSeason ?? 'Spring';

  const workSeason = () => {
    let lines: string[] = [];
    update((x) => void (lines = workshopSeason(x, d, year, season, { exert, situation })));
    setExert(false);
    push(`${season} ${year}: ${lines.join(' ')}`);
  };
  const improve = (kind: 'innovation' | 'rawMaterials') => {
    const table = kind === 'innovation' ? INNOVATION_COST : RAW_MATERIALS_COST;
    const cur = w[kind];
    const cost = table[cur + 1] - table[cur];
    set((x) => {
      x.laborPoints -= cost;
      x[kind] = cur + 1;
    });
    push(`${kind === 'innovation' ? 'Innovation' : 'Raw Materials'} +${cur + 1} for ${cost} Labor Points; it takes a season out of the workshop (Practice or Adventure experience instead).`);
  };
  const nextCost = (kind: 'innovation' | 'rawMaterials') => {
    const table = kind === 'innovation' ? INNOVATION_COST : RAW_MATERIALS_COST;
    return w[kind] >= 3 ? null : table[w[kind] + 1] - table[w[kind]];
  };
  const step = WEALTH_STEP[wealth];
  const worth = seasonWorth(c, d);
  const areaLore = d.abilities.filter((a) => a.abilityId === 'area-lore').reduce((m, a) => Math.max(m, a.total), 0);
  const intrigue = d.abilities.find((a) => a.abilityId === 'intrigue')?.total ?? 0;
  const smuggle = smugglingLp(d.characteristics.Int.value, intrigue, wealth);
  const gain = (lp: number, why: string) => {
    set((x) => void (x.laborPoints += lp));
    push(`${why}: ${lp >= 0 ? '+' : ''}${lp} Labor Points.`);
  };
  const invest = (id: string, cost: number) => {
    const inv = INVESTMENTS.find((i) => i.id === id)!;
    set((x) => {
      x.laborPoints -= cost;
      if (id === 'charity') x.charityXp = (x.charityXp ?? 0) + 1;
      if (id === 'introduction') x.pending = [...(x.pending ?? []), { year: year + 2, lp: Math.round(3 * worth), note: 'An introduction pays back' }];
    });
    push(`${inv.label}: −${cost} Labor Points. ${inv.hint}`);
  };
  const smuggleSeason = () => {
    update((x) => {
      if (!x.workshop) return;
      x.workshop.laborPoints += smuggle;
      const e = newSeasonEntry(year, season, 'other', `Smuggling: +${smuggle} Labor Points`, {});
      applySeason(x, e, 1);
      x.seasonLog.push(e);
    });
    push(`${season} ${year}: smuggling, +${smuggle} Labor Points (the season logged).`);
  };
  // a wondrous item takes one helper at most
  const wondrous = wondrousItem(wtFor(w.assistants.slice(0, 1).map((a) => a.craft)).total, magnitude, FREQUENCY.find((f) => f.value === freq)?.mod ?? 0, baseLevel - 6);

  return (
    <Card
      title="Livelihood & workshop (City & Guild)"
      actions={
        <button className="small ghost danger" onClick={() => window.confirm('Stop tracking this livelihood?') && update((x) => void (x.workshop = undefined))}>
          Remove
        </button>
      }
    >
      <div className="row">
        <Field label="Craft or Profession">
          <select value={trade?.uid ?? ''} onChange={(e) => set((x) => void (x.abilityUid = e.target.value))}>
            {trades.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name} {a.total}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Primary Characteristic" hint="Dexterity for most crafts; Strength for smiths and laborers">
          <select value={w.primary} onChange={(e) => set((x) => void (x.primary = e.target.value as Characteristic))}>
            {CHARACTERISTICS.map((k) => (
              <option key={k} value={k}>
                {CHAR_NAMES[k]} {d.characteristics[k].value}
              </option>
            ))}
          </select>
        </Field>
        <div className="stat">
          <span className="v">{wealth === 'poor' ? 'Poor' : wealth === 'wealthy' ? 'Wealthy' : 'Average'}</span>
          <span className="l">Wealth (from Virtues)</span>
        </div>
        <div className="stat">
          <span className="v">{w.laborPoints}</span>
          <span className="l">Labor Points banked</span>
        </div>
      </div>

      <div className="row">
        <div className="stat">
          <span className="v">
            <Total value={wt.total} parts={wt.parts} notes={[]} label="Workshop Total" />
          </span>
          <span className="l">Workshop Total</span>
        </div>
        <div className="stat">
          <span className="v">{baseLevel}</span>
          <span className="l">Craft Level</span>
        </div>
        <div className="stat">
          <span className={`v ${q.quality === 'shoddy' ? 'bad-text' : q.quality === 'standard' ? '' : 'good-text'}`}>{q.quality}</span>
          <span className="l">
            Goods{q.bonus ? ` (+${q.bonus})` : ''}
          </span>
        </div>
        <div className="stat">
          <span className="v" title={`(${CHAR_NAMES[lpChar.key]} ${lpChar.value} + ${trade?.name ?? 'Craft'} ${craft}) × ${wealth === 'poor' ? 2 : wealth === 'wealthy' ? 6 : 3}${missing ? ` − 3 × ${missing} missing workers` : ''}`}>{lp}</span>
          <span className="l">Labor Points a season</span>
        </div>
        <div className="stat">
          <span className="v">{keep}</span>
          <span className="l">Upkeep a year</span>
        </div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Shoddy below {q.levels.standard}, standard {q.levels.standard}, superior {q.levels.superior} (+1 to one feature for one activity), excellent {q.levels.excellent} (+1, and +1
        for every 3 more, up to +{q.bonusLimit}). A season of {baseLevel + 6}+ earns a point of (Craft) Reputation. Average characters work two seasons a year, Poor three, Wealthy one.
      </p>

      <details>
        <summary className="small">Workshop, assistants and this season&apos;s situation</summary>
        <div className="row" style={{ marginTop: 6 }}>
          <Field label="Innovation (0–3)">
            <Stepper value={w.innovation} min={0} max={3} width={30} onChange={(v) => set((x) => void (x.innovation = v))} />
          </Field>
          <Field label="Raw Materials (0–3)" hint="Lost if you leave the workshop; 5 Labor Points a point a year">
            <Stepper value={w.rawMaterials} min={0} max={3} width={30} onChange={(v) => set((x) => void (x.rawMaterials = v))} />
          </Field>
          <Field label="Craft manual" hint="One a season, not your own">
            <Stepper value={w.manual} min={0} max={10} width={30} onChange={(v) => set((x) => void (x.manual = v))} />
          </Field>
          <Field label="Other Craft Level change">
            <Stepper value={w.craftLevelMod} min={-5} max={20} width={30} onChange={(v) => set((x) => void (x.craftLevelMod = v))} />
          </Field>
          <label className="inline small" title="Masters lose 3 Labor Points a season for each worker short of their Leadership">
            <input type="checkbox" checked={!!w.guildMaster} onChange={(e) => set((x) => void (x.guildMaster = e.target.checked))} /> Guild master (Leadership {leadership})
          </label>
        </div>
        <div className="row">
          {SITUATIONS.map((s) => (
            <label key={s.id} className="inline small">
              <input type="checkbox" checked={situations.includes(s.id)} onChange={(e) => setSituations((l) => (e.target.checked ? [...l, s.id] : l.filter((x) => x !== s.id)))} />{' '}
              {s.label} (+{s.value})
            </label>
          ))}
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          Assistants (up to {maxAssistants}, by Leadership; each adds half his Craft, summed and rounded up):
        </div>
        {w.assistants.map((a, i) => (
          <div key={a.uid} className="row tight">
            <input value={a.name} placeholder="Apprentice or journeyman" onChange={(e) => set((x) => void (x.assistants[i].name = e.target.value))} />
            <Stepper value={a.craft} min={0} max={10} width={30} onChange={(v) => set((x) => void (x.assistants[i].craft = v))} />
            {i >= maxAssistants && <span className="small bad-text">beyond your Leadership: not counted</span>}
            <button className="small ghost" onClick={() => set((x) => void x.assistants.splice(i, 1))}>
              ×
            </button>
          </div>
        ))}
        <button className="small ghost" onClick={() => set((x) => void x.assistants.push({ uid: uid(), name: '', craft: 3 }))}>
          + Assistant
        </button>
      </details>

      <div className="row" style={{ marginTop: 8 }}>
        <label className="inline small" title="A simple die on the Workshop Total, a roll on the Workshop Exertion chart, and an aging roll">
          <input type="checkbox" checked={exert} onChange={(e) => setExert(e.target.checked)} /> Exert yourself
        </label>
        <button onClick={workSeason} title={`Logs ${season} ${year} on the season log, with 2 Exposure experience in the craft`}>
          Work a season
        </button>
        {(['innovation', 'rawMaterials'] as const).map((k) => {
          const cost = nextCost(k);
          return cost === null ? null : (
            <button key={k} className="small ghost" disabled={w.laborPoints < cost} onClick={() => improve(k)}>
              {k === 'innovation' ? 'Innovation' : 'Raw Materials'} +{w[k] + 1} ({cost})
            </button>
          );
        })}
        <button className="small ghost" onClick={() => push(sellGoods(d.characteristics.Pre.value, bargain).text)}>
          Haggle a sale
        </button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        The {keep} Labor Points of upkeep are paid when the saga&apos;s year ends (Seasons page). Rising in wealth: {step.cost} Labor Points to become {step.to}, plus a season (and stories for a Greater or Legendary income). A season&apos;s worth of Labor Points here is {worth}.
      </p>
      <Field label="Labor Points (adjust by hand)">
        <Stepper value={w.laborPoints} min={-999} max={99999} width={60} onChange={(v) => set((x) => void (x.laborPoints = v))} />
      </Field>

      <details>
        <summary className="small">Stories and investments (City &amp; Guild ch.2 and ch.7)</summary>
        <div className="small" style={{ marginTop: 6 }}>Labor Points from a story the character took part in:</div>
        <div className="row tight small">
          {STORY_AWARDS.map((a) => (
            <button key={a.seasons} className="small ghost" title={a.label} onClick={() => gain(Math.round(a.seasons * worth), `Story: ${a.label.toLowerCase()}`)}>
              +{a.seasons} season{a.seasons === 1 ? '' : 's'} ({Math.round(a.seasons * worth)})
            </button>
          ))}
        </div>
        <div className="small" style={{ marginTop: 6 }}>Investing surplus Labor Points:</div>
        <div className="row tight small">
          {INVESTMENTS.map((i) => {
            const cost = Math.round(i.seasons * worth);
            return (
              <button key={i.id} className="small ghost" title={i.hint} disabled={w.laborPoints < cost} onClick={() => invest(i.id, cost)}>
                {i.label} (−{cost})
              </button>
            );
          })}
          <button className="small ghost" title="Drawings: a sumptuous item of hand-tool size or smaller for a wealth multiple of Labor Points" disabled={w.laborPoints < WEALTH_MULT[wealth]} onClick={() => gain(-WEALTH_MULT[wealth], 'A sumptuous item (Drawings)')}>
            A fine thing (−{WEALTH_MULT[wealth]})
          </button>
          <button className="small ghost" title="Intelligence + Area Lore + stress die: whether the character sees a boom coming" onClick={() => push(boomRoll(d.characteristics.Int.value, areaLore))}>
            Read the market for a boom
          </button>
          <button className="small ghost" title={`Smuggling as an investment of time: (Intelligence + Intrigue) × ${WEALTH_MULT[wealth]} = ${smuggle} Labor Points for the season`} onClick={smuggleSeason}>
            Smuggle a season (+{smuggle})
          </button>
        </div>
        <div className="row small" style={{ marginTop: 6 }}>
          <Field label="Goods held for a rise in price" hint="A Labor Point a year for every ten, the stake kept (Commodity Speculation)">
            <span className="row tight">
              <Stepper
                value={w.speculation ?? 0}
                min={0}
                step={10}
                width={50}
                onChange={(v) =>
                  set((x) => {
                    const delta = v - (x.speculation ?? 0);
                    if (delta > x.laborPoints) return;
                    x.laborPoints -= delta;
                    x.speculation = v || undefined;
                  })
                }
              />
              <span className="muted">+{Math.floor((w.speculation ?? 0) / 10)} a year</span>
            </span>
          </Field>
          {wealth === 'wealthy' && (
            <Field label="Living as" hint="A miser: an extra season's Labor Points every three years (average) or every year (Poor), and a Reputation for miserliness">
              <select value={w.miserly ?? ''} onChange={(e) => set((x) => void (x.miserly = (e.target.value || undefined) as typeof x.miserly))}>
                <option value="">befits the Wealthy</option>
                <option value="average">an average merchant</option>
                <option value="poor">a Poor one</option>
              </select>
            </Field>
          )}
          {(w.charityXp ?? 0) > 0 && <span className="badge">charity: {w.charityXp} Reputation xp</span>}
          {(w.pending ?? []).map((p, i) => (
            <span key={i} className="badge info">
              {p.note}: +{p.lp} in {p.year}
            </span>
          ))}
        </div>
      </details>

      <details>
        <summary className="small">Wondrous item (Touched by a Realm)</summary>
        <div className="row" style={{ marginTop: 6 }}>
          <Field label="Magnitude of the mirroring Hermetic effect" hint="Personal or Touch, up to Sun, Individual">
            <Stepper value={magnitude} min={1} max={10} width={30} onChange={setMagnitude} />
          </Field>
          <Field label="Uses">
            <select value={freq} onChange={(e) => setFreq(e.target.value)}>
              {FREQUENCY.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} (+{f.mod})
                </option>
              ))}
            </select>
          </Field>
          <div className="stat">
            <span className="v">{wondrous.craftLevel}</span>
            <span className="l">Craft Level</span>
          </div>
          <div className="stat">
            <span className={`v ${wondrous.perSeason > 0 ? '' : 'bad-text'}`}>{wondrous.perSeason > 0 ? wondrous.seasons : '—'}</span>
            <span className="l">Seasons</span>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          One helper only (the first assistant listed); add the aura through the Realms Interaction Table and any Shape and Material bonus, up to your Craft, by hand. Each season
          gathers the Workshop Total less the Craft Level until the points reach the Craft Level. The item works only for the customer it was made for, and is an Arcane Connection to
          them.
        </p>
      </details>

      {log.map((l, i) => (
        <div key={log.length - i} className="small list-row">
          {l}
        </div>
      ))}
    </Card>
  );
}
