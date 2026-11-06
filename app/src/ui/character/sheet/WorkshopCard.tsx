// A craftsman's or laborer's livelihood (City & Guild, ch.2 Labor), opt-in when the saga uses City &
// Guild: the Workshop Total and the quality it makes, Labor Points banked season by season, the
// improvements they buy, workshop exertion, selling, and wondrous items.

import { PeopleOptions, ResultLog, canPlay, groupPeople } from '../../play';
import { characterCraftTraits, traitApplies } from '../../../engine/craftTraits';
import { TraitBadges } from '../../covenant/CraftTraits';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { R } from '../../routes';
import { seasonTaken } from '../../../engine/time';
import { CHARACTERISTICS, CHAR_NAMES, type Characteristic } from '../../../data';
import type { Workshop } from '../../../engine/types';
import {
  INNOVATION_COST, INVESTMENTS, LP_WORTH, RAW_MATERIALS_COST, STORY_AWARDS, WEALTH_MULT, WEALTH_STEP, boomRoll, craftQuality, lpForPounds, seasonWorth, sellGoods, sellOpposed, smugglingLp, upkeep, wondrousItem, workshopFigures,
  newWorkshop, workshopSeason, workshopTotal,
} from '../../../engine/workshop';
import { applySeason, newSeasonEntry } from '../../../engine/longterm';
import { purseOf } from '../../../engine/vis';
import { abilityTotal } from '../../../engine/character/derive';
import { MERCHANT_KINDS, STORY_SEEDS, TIME_INVESTMENTS, blockadeRoll, entertain, investmentLp, type MerchantKind } from '../../../engine/trade';

/** A capo's party themes: the Characteristic and Ability it shows off (City & Guild ch.7). */
const THEMES = {
  carouse: { label: 'Carousing', char: 'Sta', ability: 'carouse' },
  hunt: { label: 'Hunting', char: 'Per', ability: 'hunt' },
  athletics: { label: 'Athletics', char: 'Dex', ability: 'athletics' },
  music: { label: 'Music', char: 'Com', ability: 'music' },
} as const;
import { FREQUENCY } from '../../../engine/enchant';
import { uid } from '../../../util/id';
import { Card, Field, Stepper, Total, signed } from '../../kit';
import { pct, simpleChance, stressChance, stressContestChance } from '../../../engine/dice';
import type { CharEditor } from '../useChar';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';

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

/**
 * A character's livelihood. On City & Guild (`where` "guild") what is not a season: the workshop's
 * figures and assistants, Labor Points from stories, money put in, investments, haggling, the guild.
 * On the Seasons page ("seasons") the season's work: a season at the bench, improving the workshop,
 * an investment of time, an entertainment, a wondrous item. Each season so spent is logged, and Unlog
 * takes back the Labor Points with it.
 */
export function WorkshopCard({ ed, where = 'guild' }: { ed: CharEditor; where?: 'guild' | 'seasons' }) {
  const { c, d, update, saga, data } = ed;
  const forSeasons = where === 'seasons';
  const [situations, setSituations] = useState<string[]>([]);
  // this season's kind of work, for a Virtue or Flaw that counts only in it (Keen Vision on fine work)
  const [kinds, setKinds] = useState<string[]>([]);
  const [exert, setExert] = useState(false);
  const [money, setMoney] = useState(10);
  const [band, setBand] = useState('Trivial');
  const [buyer, setBuyer] = useState(4);
  const [mkind, setMkind] = useState<MerchantKind>('all');
  const [seedId, setSeedId] = useState('');
  const [timeId, setTimeId] = useState('');
  const [theme, setTheme] = useState<keyof typeof THEMES>('carouse');
  const [partyPounds, setPartyPounds] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [magnitude, setMagnitude] = useState(1);
  const [freq, setFreq] = useState(FREQUENCY[0]?.value ?? '');
  if (!c || !d || !saga) return null;
  const usesCG = saga.enabledBooks.length === 0 || saga.enabledBooks.includes('CG');
  // the Crafts and Professions they could live by, the best first (not Craft Amulets or Crafter's Healing, which are powers)
  const trades = d.abilities.filter((a) => a.abilityId === 'craft-type' || a.abilityId === 'profession-type').sort((a, b) => b.score - a.score);
  if (!usesCG || (!c.workshop && !trades.length)) return null;
  const w = c.workshop;
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 12));
  const set = (fn: (x: Workshop) => void) => update((x) => void (x.workshop && fn(x.workshop)));

  if (!w && forSeasons) return null;
  if (!w)
    return (
      <Card title="Livelihood & workshop (City & Guild)" tour="workshop">
        <p className="small muted" style={{ marginTop: 0 }}>
          Optional: for a craftsman or laborer who works for a living. Tracks Labor Points, the Workshop Total and the quality of each season&apos;s goods, and what the points buy
          (City &amp; Guild, ch.2).
        </p>
        {(() => {
          const t = characterCraftTraits(c, data, trades[0]?.name.replace(/^(Craft|Profession):?\s*/, '') || undefined);
          return t.length ? (
            <div className="row tight small" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
              <span>At their craft:</span>
              <TraitBadges traits={t} />
            </div>
          ) : null;
        })()}
        <button className="small" onClick={() => update((x) => void (x.workshop = newWorkshop(trades[0]?.uid, trades[0]?.abilityId.startsWith('profession') ?? false)))}>
          Track this character&apos;s livelihood
        </button>
      </Card>
    );

  const situation = situations.reduce((t, id) => t + (SITUATIONS.find((x) => x.id === id)?.value ?? 0), 0);
  // what helps and hurts them at this trade (Puissant, Palsied Hands, Keen Vision…), and this season's
  const tradeAb = d.abilityByUid.get(w.abilityUid ?? '') ?? trades[0];
  const tradeName = tradeAb?.name.replace(/^(Craft|Profession):?\s*/, '') || undefined;
  // a merchant's Profession is not worked with the hands: the hands' Flaws do not count there
  const craftTraits = characterCraftTraits(c, data, tradeName).filter((t) => !tradeAb?.abilityId.startsWith('profession') || !t.work || t.work > 0);
  const seasonal = craftTraits.filter((t) => t.when && t.id !== 'independent-craftsman-flaw' && (!tradeName || traitApplies(t, tradeName)));
  const seasonTraits = seasonal.filter((t) => kinds.includes(t.id)).map((t) => ({ label: `${t.name} (${t.when!.work.replace(/ \(.*\)$/, '')})`, value: t.when!.mod }));
  const f = workshopFigures(c, d, situation, seasonTraits)!;
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
    update((x) => void (lines = workshopSeason(x, d, year, season, { exert, situation, traits: seasonTraits })));
    setExert(false);
    push(`${season} ${year}: ${lines.join(' ')}`);
  };
  const improve = (kind: 'innovation' | 'rawMaterials') => {
    const table = kind === 'innovation' ? INNOVATION_COST : RAW_MATERIALS_COST;
    const cur = w[kind];
    const cost = table[cur + 1] - table[cur];
    const what = `${kind === 'innovation' ? 'Innovation' : 'Raw Materials'} +${cur + 1}`;
    // the season goes to it: no workshop work, Practice or Adventure experience instead (City & Guild ch.4)
    update((x) => {
      if (!x.workshop) return;
      x.workshop.laborPoints -= cost;
      x.workshop[kind] = cur + 1;
      const e = newSeasonEntry(year, season, 'other', `Improving the workshop: ${what} (${cost} Labor Points)`);
      e.undo = { laborPoints: -cost, workshop: { [kind]: cur } };
      x.seasonLog.push(e);
    });
    push(`${what} for ${cost} Labor Points: ${season} ${year} goes to it (logged), Practice or Adventure experience instead.`);
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
  const putIn = () => {
    const lp = lpForPounds(money, band);
    if (!lp) return;
    update((x) => {
      if (!x.workshop) return;
      const p = purseOf(x);
      p.pounds = Math.round((p.pounds - money) * 1000) / 1000;
      (p.log ??= []).push({ year, season, text: `Put into the business: +${lp} Labor Points`, pounds: -money });
      x.workshop.laborPoints += lp;
    });
    push(`${money} £ put into the business (${band} income): +${lp} Labor Points.`);
  };
  /** A season spent on an investment of time: logged, and its Labor Points added (and any pounds spent, for Unlog). */
  const timeSeason = (lp: number, what: string, extra = '', spentPounds = 0) => {
    update((x) => {
      if (!x.workshop) return;
      x.workshop.laborPoints += lp;
      const e = newSeasonEntry(year, season, 'other', `${what}: +${lp} Labor Points${extra ? `; ${extra}` : ''}`, {});
      e.undo = { laborPoints: lp, pounds: spentPounds || undefined };
      applySeason(x, e, 1);
      x.seasonLog.push(e);
    });
    push(`${season} ${year}: ${what.toLowerCase()}, +${lp} Labor Points${extra ? `; ${extra}` : ''} (the season logged).`);
  };
  const smuggleSeason = () => timeSeason(smuggle, 'Smuggling');
  const score = (id: string) => abilityTotal(d, id);
  const professionScore = d.abilities.filter((a) => a.abilityId === 'profession-type').reduce((m, a) => Math.max(m, a.total), 0);
  const seeds = STORY_SEEDS.filter((x) => mkind === 'all' || x.kind === mkind || x.kind === 'all');
  const seed = seeds.find((x) => x.id === seedId) ?? seeds[0];
  const times = TIME_INVESTMENTS.filter((x) => mkind === 'all' || x.kind === mkind);
  const time = times.find((x) => x.id === timeId) ?? times[0];
  const spendTime = () => {
    if (!time) return;
    if (time.id === 'blockade') {
      const r = blockadeRoll(d.characteristics.Dex.value, professionScore);
      if (!r.ok) {
        timeSeason(0, 'Running a blockade', r.text);
        return;
      }
      push(r.text);
    }
    const { lp, favors } = investmentLp(time.id, worth, wealth, { Com: d.characteristics.Com.value, intrigue, leadership: score('leadership') });
    timeSeason(lp, time.label, favors ? `${favors} Favor${favors === 1 ? '' : 's'} owed` : '');
  };
  const party = () => {
    const r = entertain(d.characteristics[THEMES[theme].char].value, score(THEMES[theme].ability), partyPounds, intrigue);
    if (partyPounds)
      update((x) => {
        const p = purseOf(x);
        p.pounds = Math.round((p.pounds - partyPounds) * 1000) / 1000;
        (p.log ??= []).push({ year, season, text: `Lavish entertainment: ${r.favors} Favors owed`, pounds: -partyPounds });
      });
    timeSeason(0, `Entertaining (${THEMES[theme].label})`, r.text, partyPounds);
  };
  // a wondrous item takes one helper at most
  const wondrous = wondrousItem(wtFor(w.assistants.slice(0, 1).map((a) => a.craft)).total, magnitude, FREQUENCY.find((f) => f.value === freq)?.mod ?? 0, baseLevel - 6);

  // a season's work needs the season: one already spent (logged) leaves nothing to spend
  const taken = seasonTaken(c, year, season);
  const busy = taken.length > 0;
  const busyWhy = busy ? `${season} ${year} is already spent (${taken.map((e) => e.summary).join('; ')}): Unlog it, or move to the next season` : undefined;
  return (
    <Card
      title={forSeasons ? `Livelihood: ${season} ${year}` : 'Livelihood & workshop (City & Guild)'}
      tour={forSeasons ? 'workshop-season' : 'workshop'}
      actions={
        forSeasons ? undefined : (
          <button className="small ghost danger" onClick={() => window.confirm('Stop tracking this livelihood?') && update((x) => void (x.workshop = undefined))}>
            Remove
          </button>
        )
      }
    >
      <details className="small">
        <summary>How this works, in short</summary>
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          <li>
            <b>Labor Points</b> are the time and effort put into the business, not money. Each season worked earns <b>{lp}</b> here: ({CHAR_NAMES[lpChar.key]} + {trade?.name ?? 'Craft'}) × {wealth === 'poor' ? 2 : wealth === 'wealthy' ? 6 : 3} for {wealth === 'poor' ? 'a Poor' : wealth === 'wealthy' ? 'a Wealthy' : 'an average'} character.
          </li>
          <li>
            Each year the business costs <b>{keep}</b> to keep going, taken at the year&apos;s end. {wealth === 'poor' ? 'Three' : wealth === 'wealthy' ? 'One' : 'Two'} season{wealth === 'wealthy' ? '' : 's'} of work a year
            ({lp * (wealth === 'poor' ? 3 : wealth === 'wealthy' ? 1 : 2)}) {lp * (wealth === 'poor' ? 3 : wealth === 'wealthy' ? 1 : 2) >= keep ? `covers it, with ${lp * (wealth === 'poor' ? 3 : wealth === 'wealthy' ? 1 : 2) - keep} to save` : `falls ${keep - lp * (wealth === 'poor' ? 3 : wealth === 'wealthy' ? 1 : 2)} short: ${lp > 0 ? `${Math.ceil(keep / lp)} seasons of work this year would cover it` : 'nothing is earned'}, or the business slips`}. The working seasons go to the workshop by themselves when the seasons pass.
          </li>
          <li>
            What is saved buys a better workshop (Innovation, Raw Materials: better goods) or more wealth ({step.cost} to become {step.to}), a season each. Stories add points;
            money can be put in, but points never come back out as money.
          </li>
          <li>The Workshop Total against the Craft Level says how good this season&apos;s goods are: superior and excellent goods give their user a bonus.</li>
        </ul>
      </details>
      <div className="row">
        {!forSeasons && <><Field label="Craft or Profession">
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
        </Field></>}
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
        <div className="stat" data-tour="workshop-total">
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
        <div className="stat" data-tour="workshop-lp">
          <span className="v" title={`(${CHAR_NAMES[lpChar.key]} ${lpChar.value} + ${trade?.name ?? 'Craft'} ${craft}) × ${wealth === 'poor' ? 2 : wealth === 'wealthy' ? 6 : 3}${missing ? ` − 3 × ${missing} missing workers` : ''}`}>{lp}</span>
          <span className="l">Labor Points a season</span>
        </div>
        <div className="stat">
          <span className="v">{keep}</span>
          <span className="l">Upkeep a year</span>
        </div>
      </div>
      {craftTraits.length > 0 && (
        <div className="row tight small" style={{ flexWrap: 'wrap', margin: '2px 0 4px' }} data-tour="workshop-traits">
          <span>At their craft:</span>
          <TraitBadges traits={craftTraits} />
          {seasonal.map((t) => (
            <label key={t.id} className="inline" title={`${t.text} (${t.ref})`}>
              <input type="checkbox" checked={kinds.includes(t.id)} onChange={(e) => setKinds((l) => (e.target.checked ? [...l, t.id] : l.filter((x) => x !== t.id)))} /> this season is {t.when!.work.replace(/ \(.*\)$/, '')} (
              {t.when!.mod > 0 ? '+' : '−'}
              {Math.abs(t.when!.mod)})
            </label>
          ))}
          {craftTraits.some((t) => t.id === 'independent-craftsman-flaw') && <span className="muted">Independent Craftsman: Craft and Leadership 3 lower {w.assistants.length ? 'with these assistants (counted)' : 'once assistants help'}.</span>}
        </div>
      )}
      <p className="small muted" style={{ margin: 0 }}>
        Shoddy below {q.levels.standard}, standard {q.levels.standard}, superior {q.levels.superior} (+1 to one feature for one activity), excellent {q.levels.excellent} (+1, and +1
        for every 3 more, up to +{q.bonusLimit}). A season of {baseLevel + 6}+ earns a point of (Craft) Reputation. Average characters work two seasons a year, Poor three, Wealthy one.
      </p>

      <details data-tour="workshop-assistants">
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

      {forSeasons && <div className="row" style={{ marginTop: 8 }} data-tour="workshop-work">
        <label className="inline small" title="A simple die on the Workshop Total, a roll on the Workshop Exertion chart, and an aging roll">
          <input type="checkbox" checked={exert} onChange={(e) => setExert(e.target.checked)} /> Exert yourself
        </label>
        <button onClick={workSeason} disabled={busy} title={busyWhy ?? `Logs ${season} ${year} on the season log, with 2 Exposure experience in the craft`}>
          Work a season
        </button>
        {(['innovation', 'rawMaterials'] as const).map((k) => {
          const cost = nextCost(k);
          return cost === null ? null : (
            <button key={k} className="small ghost" disabled={w.laborPoints < cost || busy} onClick={() => improve(k)} title={busyWhy ?? `A season out of the workshop, and ${cost} Labor Points`}>
              Improve {k === 'innovation' ? 'Innovation' : 'Raw Materials'} to {w[k] + 1} ({cost}, a season)
            </button>
          );
        })}
        {busy && <span className="small warn-text">{busyWhy}.</span>}
      </div>}
      {!forSeasons && <div className="row" style={{ marginTop: 8 }} data-tour="workshop-sell">
        <button className="small ghost" onClick={() => push(sellGoods(d.characteristics.Pre.value, bargain).text)} title="A typical customer: Presence + Bargain + a simple die against 9; 10% over the standard price for each point above 8, up to 50%">
          Haggle a sale: Presence + Bargain {signed(d.characteristics.Pre.value + bargain)} + die vs 9 ({pct(simpleChance(d.characteristics.Pre.value + bargain, 9))} to get more)
        </button>
        <span className="row tight small" title="An important storyguide character or another player: opposed stress dice; they can push the price down too">
          an important customer&apos;s Com + Bargain
          <Stepper value={buyer} min={-3} max={20} width={30} onChange={setBuyer} />
          <button className="small ghost" onClick={() => push(sellOpposed(d.characteristics.Pre.value, bargain, buyer).text)}>
            Sell to them: {signed(d.characteristics.Pre.value + bargain)} + stress die against {signed(buyer)} + stress die ({pct(stressContestChance(d.characteristics.Pre.value + bargain, buyer, 1, 'zero'))} to get more)
          </button>
        </span>
      </div>}
      {!forSeasons && (
        <div className="small muted at-table">
          A season at the bench, improving the workshop, a season&apos;s investment of time, an entertainment or a wondrous item is a season&apos;s work: on the{' '}
          <Link to={R.seasonsFor(c.sagaId, c.id, 'workshop-season')}>Game Table › Seasons ›</Link>
        </div>
      )}
      <p className="small muted" style={{ margin: 0 }}>
        The {keep} Labor Points of upkeep are paid when the saga&apos;s year ends (Seasons page). Rising in wealth: {step.cost} Labor Points to become {step.to}, plus a season (and stories for a Greater or Legendary income). A season&apos;s worth of Labor Points here is {worth}.
      </p>
      {!forSeasons && <Field label="Labor Points (adjust by hand)">
        <Stepper value={w.laborPoints} min={-999} max={99999} width={60} onChange={(v) => set((x) => void (x.laborPoints = v))} />
      </Field>}

      {!forSeasons && <details data-tour="workshop-stories">
        <summary className="small">Stories and investments (City &amp; Guild ch.2 and ch.7)</summary>
        <div className="small" style={{ marginTop: 6 }}>Labor Points from a story the character took part in:</div>
        <div className="row tight small">
          {STORY_AWARDS.map((a) => (
            <button key={a.seasons} className="small ghost" title={a.label} onClick={() => gain(Math.round(a.seasons * worth), `Story: ${a.label.toLowerCase()}`)}>
              +{a.seasons} season{a.seasons === 1 ? '' : 's'} ({Math.round(a.seasons * worth)})
            </button>
          ))}
        </div>
        <div className="row tight small" style={{ marginTop: 6 }}>
          Put money into the business:
          <Stepper value={money} min={0} step={1} width={44} onChange={setMoney} /> £ at
          <select value={band} onChange={(e) => setBand(e.target.value)} title="The business's income band: what 9 Labor Points are worth (City & Guild ch.2)">
            {LP_WORTH.map((b) => (
              <option key={b.band} value={b.band} title={b.who}>
                {b.band} (9 LP = {b.pounds} £)
              </option>
            ))}
          </select>
          <button className="small ghost" disabled={!lpForPounds(money, band) || (c.purse?.pounds ?? 0) < money} onClick={putIn} title="Paid from the purse; Labor Points cannot be turned back into money">
            +{lpForPounds(money, band)} Labor Points
          </button>
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
          <button className="small ghost" title="Intelligence + Area Lore + stress die: 15+ puts everything in as the boom starts, 18+ prepared for it for years; below 7 loses 2 of every 10 invested" onClick={() => push(boomRoll(d.characteristics.Int.value, areaLore))}>
            Read the market for a boom: Int + Area Lore {signed(d.characteristics.Int.value + areaLore)} + stress die ({pct(stressChance(d.characteristics.Int.value + areaLore, 15, 1).chance)} for 15+)
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
        <div className="small" style={{ marginTop: 8 }}>
          <b>Merchants (City &amp; Guild ch.7):</b>{' '}
          <select value={mkind} onChange={(e) => setMkind(e.target.value as MerchantKind)} aria-label="Kind of merchant">
            {(Object.keys(MERCHANT_KINDS) as MerchantKind[]).map((k) => (
              <option key={k} value={k}>
                {MERCHANT_KINDS[k]}
              </option>
            ))}
          </select>
        </div>
        {seed && (
          <div className="row tight small" style={{ marginTop: 4 }}>
            Story seed:
            <select value={seed.id} onChange={(e) => setSeedId(e.target.value)} style={{ maxWidth: 260 }} title={seed.hint}>
              {seeds.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label} ({x.seasons} season{x.seasons === 1 ? '' : 's'})
                </option>
              ))}
            </select>
            <button className="small ghost" onClick={() => gain(Math.round(seed.seasons * worth), `Story: ${seed.label}`)} title={seed.hint || 'Awarded when the story’s central issue is resolved'}>
              Resolved: +{Math.round(seed.seasons * worth)}
            </button>
          </div>
        )}
      </details>}

      {forSeasons && (
        <details data-tour="workshop-time" open>
          <summary className="small">Or another season&apos;s work: smuggling, an investment of time, an entertainment</summary>
          <div className="row tight small" style={{ marginTop: 6 }}>
            <button className="small ghost" disabled={busy} title={busyWhy ?? `Smuggling as an investment of time: (Intelligence + Intrigue) × ${WEALTH_MULT[wealth]} = ${smuggle} Labor Points for the season`} onClick={smuggleSeason}>
              Smuggle a season (+{smuggle})
            </button>
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            <b>Merchants (City &amp; Guild ch.7):</b>{' '}
            <select value={mkind} onChange={(e) => setMkind(e.target.value as MerchantKind)} aria-label="Kind of merchant">
              {(Object.keys(MERCHANT_KINDS) as MerchantKind[]).map((k) => (
                <option key={k} value={k}>
                    {MERCHANT_KINDS[k]}
                </option>
              ))}
            </select>
          </div>
        {time && (
          <div className="row tight small" style={{ marginTop: 4 }}>
            A season&apos;s investment of time:
            <select value={time.id} onChange={(e) => setTimeId(e.target.value)} style={{ maxWidth: 260 }} title={time.hint}>
              {times.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            <button className="small ghost" disabled={busy} onClick={spendTime} title={time.hint}>
              Spend the season (+{investmentLp(time.id, worth, wealth, { Com: d.characteristics.Com.value, intrigue, leadership: score('leadership') }).lp})
            </button>
          </div>
        )}
        {(mkind === 'capo' || mkind === 'all') && (
          <div className="row tight small" style={{ marginTop: 4 }} title="A die + Characteristic + the theme Ability + a point a pound (up to Intrigue): a Favor for every 5, rounded up; the pounds come from the purse">
            A lavish entertainment:
            <select value={theme} onChange={(e) => setTheme(e.target.value as keyof typeof THEMES)}>
              {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((k) => (
                <option key={k} value={k}>
                  {THEMES[k].label}
                </option>
              ))}
            </select>
            <Stepper value={partyPounds} min={0} max={Math.max(0, intrigue)} width={30} onChange={setPartyPounds} /> £
            <button className="small ghost" disabled={busy || (c.purse?.pounds ?? 0) < partyPounds} onClick={party}>
              Throw it (a season)
            </button>
          </div>
        )}
        </details>
      )}

      {forSeasons && <details data-tour="workshop-wonder">
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
        <WonderProject ed={ed} wondrous={wondrous} magnitude={magnitude} freq={freq} />
      </details>}

      <ResultLog lines={log} />
    </Card>
  );
}

/**
 * A wondrous item made a season at a time (City & Guild, Wondrous Items): it needs the Touched by
 * (Realm) Virtue, one effect, Personal or Touch, up to Sun, Individual, and is made for one customer.
 * Each season of work (no other workshop work that season) gathers the Workshop Total less the Craft
 * Level; once the points reach the Craft Level it is the customer's, on their Items tab.
 */
function WonderProject({ ed, wondrous, magnitude, freq }: { ed: CharEditor; wondrous: { craftLevel: number; perSeason: number; seasons: number }; magnitude: number; freq: string }) {
  const { c, update, saga } = ed;
  const people = useSagaCharacters(c?.sagaId).filter(canPlay);
  const covs = useSagaCovenants(c?.sagaId);
  const groups = groupPeople(people, covs);
  const putRecords = useStore((s) => s.putRecords);
  const [draft, setDraft] = useState({ name: '', power: '', forId: '' });
  const [said, setSaid] = useState('');
  if (!c?.workshop || !saga) return null;
  const w = c.workshop.wonder;
  const year = saga.currentYear;
  const season = saga.currentSeason;
  const who = (id?: string) => people.find((x) => x.id === id);
  if (!w)
    return (
      <div className="stack" style={{ gap: 4, marginTop: 6 }}>
        <b className="small">Make one</b>
        <div className="row small">
          <Field label="What it is">
            <input value={draft.name} placeholder="horseshoes, a cloak…" onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ width: 140 }} />
          </Field>
          <Field label="Its power" hint="As the Hermetic effect it mirrors">
            <input value={draft.power} placeholder="the horse never tires…" onChange={(e) => setDraft({ ...draft, power: e.target.value })} style={{ width: 200 }} />
          </Field>
          <Field label="Made for" hint="It works only for them, and is an Arcane Connection to them">
            <select value={draft.forId} onChange={(e) => setDraft({ ...draft, forId: e.target.value })}>
              <option value="">a customer outside the saga</option>
              <PeopleOptions groups={groups} />
            </select>
          </Field>
          <button
            className="small"
            disabled={!draft.name || wondrous.perSeason <= 0}
            title={wondrous.perSeason <= 0 ? 'The Workshop Total must be above the Craft Level' : 'Needs the Touched by (Realm) Virtue (City & Guild)'}
            onClick={() => update((x) => void (x.workshop!.wonder = { name: draft.name, power: draft.power, forId: draft.forId || undefined, magnitude, freq, craftLevel: wondrous.craftLevel, points: 0 }))}
          >
            Begin it (Craft Level {wondrous.craftLevel})
          </button>
        </div>
        <span className="small muted">Only a craftsman Touched by a Realm can (the Major Supernatural Virtue, City &amp; Guild); its power stays within that Virtue&apos;s two Forms.</span>
      </div>
    );
  const gain = Math.max(0, wondrous.perSeason);
  const taken = seasonTaken(c, year, season);
  const work = () => {
    const points = Math.min(w.craftLevel, w.points + gain);
    const done = points >= w.craftLevel;
    const maker = structuredClone(c);
    const entry = newSeasonEntry(year, season, 'other', `Making a wondrous item, ${w.name}: +${gain} points (${points} of ${w.craftLevel})${done ? '; finished' : ''}`, {});
    entry.undo = done ? { final: `This season finished ${w.name}: it is in its owner’s possessions, so the season stays logged.` } : { workshop: { wonder: structuredClone(w) } };
    applySeason(maker, entry, 1);
    maker.seasonLog.push(entry);
    if (!done) {
      maker.workshop!.wonder = { ...w, points };
      putRecords({ characters: [maker], covenants: [] }, `${w.name}: a season's work`);
      setSaid(`${season} ${year}: ${gain} points toward ${w.name}, ${points} of ${w.craftLevel}.`);
      return;
    }
    delete maker.workshop!.wonder;
    const item = { uid: uid(), name: w.name, kind: 'tool', quality: 'supernatural' as const, wonder: `${w.power}${w.power ? ' ' : ''}(made by ${c.name || 'a craftsman'} for ${who(w.forId)?.name || 'a customer'}; an Arcane Connection to them)`, from: `made by ${c.name || 'a craftsman'}, ${season} ${year}` };
    const owner = w.forId && w.forId !== c.id ? structuredClone(who(w.forId)!) : maker;
    owner.possessions = [...(owner.possessions ?? []), item];
    putRecords({ characters: owner === maker ? [maker] : [maker, owner], covenants: [] }, `${w.name} finished`);
    setSaid(`${w.name} is finished: it is on ${owner === maker ? `${c.name ? `${c.name}’s` : 'their'} own` : `${owner.name || 'the customer'}’s`} Items tab, a wondrous item (+5 to its stress checks; it stops working once damaged).${w.forId ? '' : ' Its customer is outside the saga: sell it or give it from the Items tab.'}`);
  };
  return (
    <div className="stack" style={{ gap: 4, marginTop: 6 }}>
      <div className="row small">
        <b>
          {w.name}
          {w.forId ? `, for ${who(w.forId)?.name || 'someone gone'}` : ''}
        </b>
        <span>
          {w.points} of {w.craftLevel} points{w.power ? `: ${w.power}` : ''}
        </span>
        <button className="small primary" disabled={gain <= 0 || taken.length > 0} onClick={work} title={taken.length ? `${season} ${year} is already spent: ${taken.map((e) => e.summary).join('; ')}` : "A season's workshop work, nothing else in the workshop that season"}>
          Work {season} {year} on it (+{gain})
        </button>
        <button className="small ghost" onClick={() => update((x) => void delete x.workshop!.wonder)}>
          Give it up
        </button>
      </div>
      {said && <div className="dice-result-lines small">{said}</div>}
    </div>
  );
}
