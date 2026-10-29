import { useState } from 'react';
import { addCostSavingCraftsmen, fitCovenfolk, optimalCraftsmen, optimalLaborers, type CraftLine } from '../../engine/covenant';
import {
  CATEGORY_LIMIT, CRAFTS, INCOME_LEVELS, INCOME_LEVEL_POUNDS, INCOME_MODIFICATIONS, INCOME_TYPES, abilityCapAtAge, countOf, craftOf, craftsmanSaving,
  mechanicOf, miracleMultiplierOf, specAbilities, specChar, specHighest, specialistCost, teacherQuality, type CostCategory,
} from '../../engine/covenantRules';
import { CHARACTERISTICS, type Characteristic } from '../../data';
import { abilityDisplayName } from '../../engine/character/derive';
import { craftQuality } from '../../engine/workshop';
import type { Covenant, CovenfolkCounts, IncomeModification, IncomeSource, Specialist } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total, HowItWorks } from '../kit';
import type { CovTabProps } from './shared';
import { LaterNote } from '../LaterNote';
import { CraftMagicCard, GearHelper, OrganizationCard, SoldiersCard, TurbCard, YearlyCard } from './CovenfolkCards';
import {
  CRAFT_GUILD_ORDER, CRAFT_GUILD_RANKS, ROLE_BY_ID, ROLE_DEFS, craftsmanUpkeep, craftsmanWorkshopTotal, nextImprovementCost, guildRanksApply, guildShortfalls, laborPointsPerSeason,
  suggestedGuildRank, workSeasons,
} from '../../engine/covenfolk';
import { optionOn } from '../../engine/optional';
import { DEFAULT_YEAR_END, LOYALTY_EVENTS, SUNDRY_PRESETS, labOutfitCost, loyaltyAttitude, loyaltyEventPoints, planYearEnd, rollIncomeModification } from '../../engine/covenantYear';
import { NO_ALLOWANCE, allowanceRecipients } from '../../engine/economy';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/store';

const FOLK: { key: keyof CovenfolkCounts; label: string; hint?: string }[] = [
  { key: 'grogs', label: 'Grogs (non-player)' },
  { key: 'companions', label: 'Companions (non-player)' },
  { key: 'specialists', label: 'Other specialists', hint: 'not listed below' },
  { key: 'craftsmen', label: 'Other craftsmen', hint: 'not listed below; they save nothing' },
  { key: 'servants', label: 'Servants' },
  { key: 'teamsters', label: 'Teamsters' },
  { key: 'laborers', label: 'Laborers' },
  { key: 'dependents', label: 'Dependents' },
  { key: 'horses', label: 'Horses' },
];

const ROLES = ROLE_DEFS.map((r) => ({ id: r.id, label: r.label, ability: r.ability?.name ?? '' }));
const CATEGORIES = Object.keys(CATEGORY_LIMIT) as CostCategory[];
const AGES = [20, 30, 36, 41, 46];
const ageLabel = (a: number) => (a < 30 ? 'under 30' : a <= 35 ? '30–35' : a <= 40 ? '36–40' : a <= 45 ? '41–45' : '46+');

export default function FinancesTab({ cov, update, dc, data }: CovTabProps) {
  const f = dc.finances;
  const setFin = <K extends keyof Covenant['finances']>(k: K, v: Covenant['finances'][K]) => update((x) => void (x.finances[k] = v));
  const specBP = cov.specialists.reduce((s, x) => s + specialistCost(x), 0);
  const people = cov.specialists.filter((s) => s.role !== 'craftsman');
  const craftsmen = cov.specialists.filter((s) => s.role === 'craftsman');
  const hasMiracles = cov.hooksBoons.some((h) => mechanicOf(h) === 'tithing-miracles');
  const [newScore, setNewScore] = useState<number | 'best'>('best');
  const [newBought, setNewBought] = useState(true);
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const guildCtx = guildRanksApply(cov, !!saga && optionOn(saga, 'guilds'));
  const labs = dc.labs.map((l) => ({ uid: l.lab.uid, name: l.lab.name || 'a lab', teaching: Math.min(3, l.specializations.Teaching ?? 0) }));

  const optimalLab = () => optimalLaborers(cov, dc.members, dc.labs);
  /** craftsmen where they save most, while they save money and (when bought) the Build Points last */
  const addEveryCraft = () => update((x) => void addCostSavingCraftsmen(x, dc.members, dc.labs, newScore, newBought ? Math.max(0, cov.buildPoints - dc.bpSpent) : Infinity));

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Card title="Covenfolk" className="accent">
          <div className="grid grid-3">
            {FOLK.map(({ key, label, hint }) => (
              <Field key={key} label={label} hint={hint}>
                <div className="row tight">
                  <Stepper value={cov.covenfolk[key]} min={0} width={52} onChange={(v) => update((x) => void (x.covenfolk[key] = v))} />
                  {key === 'servants' && (
                    <button className="small" title="Set to the number needed" onClick={() => update((x) => void (x.covenfolk.servants = f.servantsRequired))}>
                      = {f.servantsRequired}
                    </button>
                  )}
                  {key === 'teamsters' && (
                    <button className="small" title="Set to the number needed" onClick={() => update((x) => void (x.covenfolk.teamsters = f.teamstersRequired))}>
                      = {f.teamstersRequired}
                    </button>
                  )}
                  {key === 'laborers' && (
                    <button
                      className="small"
                      title="The number that keeps yearly spending lowest; servants and teamsters are set to what it needs"
                      onClick={() => {
                        const n = optimalLab();
                        update((x) => void ((x.covenfolk.laborers = n), fitCovenfolk(x, dc.members, dc.labs)));
                      }}
                    >
                      optimal
                    </button>
                  )}
                </div>
              </Field>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="stat">
              <span className="v">{f.inhabitantPoints}</span>
              <span className="l">Inhabitant points</span>
            </div>
            <div className="stat">
              <span className={`v ${cov.covenfolk.servants < f.servantsRequired ? 'warn-text' : ''}`}>{f.servantsRequired}</span>
              <span className="l">Servants needed</span>
            </div>
            <div className="stat">
              <span className={`v ${cov.covenfolk.teamsters < f.teamstersRequired ? 'warn-text' : ''}`}>{f.teamstersRequired}</span>
              <span className="l">Teamsters needed</span>
            </div>
            <div className="stat">
              <span className="v">{cov.specialists.reduce((t, s) => t + (s.characterId ? 0 : countOf(s)), 0)}</span>
              <span className="l">Listed specialists & craftsmen</span>
            </div>
          </div>
          <HowItWorks label="How the numbers are worked out">
            Player characters who are members count automatically ({dc.members.length}). Inhabitant points: {cov.season === 'Summer' || cov.season === 'Autumn' ? 'magi 10, companions 5, specialists and craftsmen 3, others 2' : 'magi 5, companions 3, specialists and craftsmen 2, others 1'} (
            {cov.season} covenant). Two servants per 10 points, then one teamster per 10 points less twice the laborers, rounded up (Covenants ch.5). Each laborer saves a pound of
            Provisions (up to half of them) but also costs about a pound as an inhabitant; "optimal" finds the number that keeps spending lowest.
          </HowItWorks>
        </Card>
        <QuickAdd update={update} data={data} examplesOnly={cov.finances.exampleCraftsOnly} />
      </div>

      <div className="grid grid-2">
        <OrganizationCard cov={cov} update={update} dc={dc} />
        <SoldiersCard cov={cov} update={update} dc={dc} />
      </div>

      <TurbCard cov={cov} update={update} dc={dc} data={data} />

      <Card
        title={`Specialists & teachers (${people.reduce((s, x) => s + specialistCost(x), 0)} BP)`}
        actions={
          <label className="inline small" title="Each year: Exposure in their job in the seasons they work (Teaching for a teacher's seasons of teaching), Practice in their free seasons, bringing a lesser Ability up to their best; craftsmen also earn Labor Points. What they were bought for stays.">
            <input type="checkbox" checked={cov.folkAdvance !== false} onChange={(e) => update((x) => void (x.folkAdvance = e.target.checked ? undefined : false))} /> they improve each year
          </label>
        }
      >
        <LaterNote topic="covenfolk" />
        {people.length === 0 && <div className="small muted">None listed. Use Quick add above.</div>}
        {people.map((s) => (
          <PersonRow key={s.uid} s={s} update={update} data={data} labs={labs} />
        ))}
        <HowItWorks summary={`Specialists cost ${specBP} BP in all.`} label="What they cost">
          Bought with Build Points (DE p.180): teachers (and the drill sergeant) cost Communication + Teaching + their highest taught score and teach two seasons a year (the drill sergeant one, to the
          whole turb); other specialists cost their highest score, so several Abilities at that score cost no more than one. Personal servants are servants (no Build Points) but live like
          specialists; agents live away and are not inhabitants (Grogs). Scores start limited by age (DE p.48: 5 under 30, up to 9 at 46+). Teachers can&apos;t have The Gift, so can&apos;t teach Arts.
          Tick &quot;no BP&quot; for people from the base covenant or recruited in play. Their upkeep is the same per point whatever their skill: a specialist counts {cov.season === 'Summer' || cov.season === 'Autumn' ? 3 : 2} points of
          inhabitants, wages included (Covenants ch.5). Wealthy or Poor changes how many seasons they have free, not the covenant&apos;s accounts.
        </HowItWorks>
      </Card>

      <Card
        title={`Craftsmen (${craftsmen.reduce((s, x) => s + specialistCost(x), 0)} BP)`}
        tour="craftsmen"
        actions={
          <span className="row tight small">
            Score for new ones
            <select value={String(newScore)} onChange={(e) => setNewScore(e.target.value === 'best' ? 'best' : Number(e.target.value))}>
              <option value="best">best for the savings</option>
              {[3, 4, 5, 6, 7, 8, 9].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <label className="inline">
              <input type="checkbox" checked={newBought} onChange={(e) => setNewBought(e.target.checked)} /> bought with BP
            </label>
            <label className="inline" title="Covenants' table lists example crafts only; the others (marked *) come from City & Guild, Grogs and Transforming Mythic Europe">
              <input type="checkbox" checked={!!cov.finances.exampleCraftsOnly} onChange={(e) => update((x) => void (x.finances.exampleCraftsOnly = e.target.checked || undefined))} /> only the book&apos;s examples
            </label>
            <button className="small" onClick={addEveryCraft} title="Carpenters first (Buildings and Consumables), then each craft where it saves most, then swaps while that saves more, while the Build Points last (Covenants ch.5)">
              + Cost-saving craftsmen
            </button>
          </span>
        }
      >
        {craftsmen.length === 0 && <div className="small muted">None listed.</div>}
        {craftsmen.map((s) => (
          <CraftRow key={s.uid} s={s} update={update} line={f.crafts.find((c) => c.craft.id === craftOf(s)?.id)} optimal={() => optimalCraftsmen(cov, dc.members, dc.labs, s.uid)} fit={(x) => fitCovenfolk(x, dc.members, dc.labs)} guild={guildCtx} examplesOnly={cov.finances.exampleCraftsOnly} />
        ))}
        <table className="compact" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Category</th>
              <th className="num">Costs</th>
              <th className="num">Most one craft saves</th>
              <th className="num">Saved</th>
            </tr>
          </thead>
          <tbody>
            {f.categories.map((c) => (
              <tr key={c.category}>
                <td>{c.category}</td>
                <td className="num">{c.total}</td>
                <td className="num">
                  {c.perCraft} ({CATEGORY_LIMIT[c.category] * 100}%)
                </td>
                <td className="num good-text">{c.saved ? `−${c.saved}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <HowItWorks label="How craftsmen save money">
          A common craftsman saves 1 + half the Craft score (rounded down) a year, a rare one the full Craft score. Each craft saves at most its share of a category (Covenants ch.5); more of the same
          craft past that saves nothing, so "optimal" finds the number worth employing. A carpenter works for both Buildings and Consumables: the savings fill the Buildings limit first and the
          rest goes to Consumables, so they are usually the first worth hiring. Rare crafts cost the same Build Points and points of inhabitants but save their whole Craft score, up to their
          category&apos;s limit (a fifth of what the labs cost, which is often small). Bookbinders and illuminators save nothing but let the covenant make fine books (they and scribes add 1 £ of
          Writing Materials each; at Profession or Craft 6 each is skilled, +1 Quality). A higher score saves more for the same mouths to feed. Craftsmen work three seasons a year (City &amp;
          Guild); under the guild rules each holds a rank and earns Labor Points for the workshop.
          <br />
          Covenants lists example crafts for each category, not every one. Crafts marked * are ones the other books name: tailors, tanners, dyers, saddlers, farriers and cartwrights
          (Consumables), roofers and glaziers (Buildings), potters and pewterers (Laboratories), bakers, butchers and millers (Provisions), shield makers. Food crafts can save Provisions past the
          half that laborers can, so laborers and food crafts work side by side; Transforming Mythic Europe reckons a baker saves at least four pounds a year, as a common craftsman with Craft 6 does. Tick &quot;only the book&apos;s examples&quot;
          to keep to Covenants&apos; own list.
        </HowItWorks>
      </Card>

      <CloseYear cov={cov} update={update} dc={dc} />

      <div className="grid grid-2">
        <YearlyCard cov={cov} update={update} dc={dc} />
        <CraftMagicCard cov={cov} update={update} dc={dc} data={data} />
      </div>

      <div className="grid grid-2">
        <IncomeCard cov={cov} update={update} dc={dc} hasMiracles={hasMiracles} />

        <Card title="Annual expenditure (Covenants ch.5)">
          <table className="compact">
            <tbody>
              {f.expenditures.map((e) => (
                <tr key={e.label}>
                  <td>{e.label}</td>
                  <td className="num">{e.pounds}</td>
                </tr>
              ))}
              {f.savings.map((s) => (
                <tr key={s.label} className="good-text">
                  <td>Savings: {s.label}</td>
                  <td className="num">{s.pounds}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <b>Total expenditure</b>
                </td>
                <td className="num">
                  <b>{f.totalExpenditure}</b>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Income received</b>
                </td>
                <td className="num">
                  <b>{f.income}</b>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Balance</b>
                </td>
                <td className={`num ${f.balance < 0 ? 'bad-text' : 'good-text'}`}>
                  <b>{f.balance}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="Treasury (£)">
              <Stepper value={cov.finances.treasury} width={60} onChange={(v) => setFin('treasury', v)} />
            </Field>
            <label className="inline small" title="A pound of spending nobody can account for, every year (Covenants ch.5)">
              <input type="checkbox" checked={!!cov.finances.enumerus} onChange={(e) => setFin('enumerus', e.target.checked)} /> the Pound of Enumerus
            </label>
          </div>
          <p className="small muted">Laboratory upkeep points: {f.labPoints}. Writing materials: 1 £ per magus, scribe, bookbinder and illuminator ({f.writersCount}).</p>
          <h4>Spending choices</h4>
          <div className="grid grid-2">
            <Field label="Wages">
              <select value={cov.finances.wages} onChange={(e) => setFin('wages', e.target.value as Covenant['finances']['wages'])}>
                {['none', 'miserly', 'standard', 'generous', 'lavish'].map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </Field>
            <Field label="Equipment">
              <select value={cov.finances.equipment} onChange={(e) => setFin('equipment', e.target.value as Covenant['finances']['equipment'])}>
                <option value="inexpensive">inexpensive only</option>
                <option value="standard">standard</option>
                <option value="standard+expensive">standard + some expensive</option>
                <option value="any">any</option>
              </select>
            </Field>
            <Field label="Living conditions modifier" hint="Extra spending on comfort">
              <Stepper value={cov.finances.livingConditions} min={-3} max={3} width={36} onChange={(v) => setFin('livingConditions', v)} />
            </Field>
            <Field label="Weapons & armor points">
              <GearHelper cov={cov} update={update} dc={dc} data={data} />
            </Field>
            <Field label="Other tithes & taxes (£)" hint="Church tithes on income are set per source">
              <Stepper value={cov.finances.tithes} min={0} width={40} onChange={(v) => setFin('tithes', v)} />
            </Field>
            <Field label="Inflation (£)">
              <Stepper value={cov.finances.inflation} min={0} width={40} onChange={(v) => setFin('inflation', v)} />
            </Field>
            <OneOffSpending cov={cov} update={update} dc={dc} />
            <Field label="Sundry (£)">
              <Stepper value={cov.finances.sundry} min={0} width={40} onChange={(v) => setFin('sundry', v)} />
            </Field>
            <Field label="Magical savings (£)" hint="Items or rituals that replace expenses">
              <Stepper value={cov.finances.magicSavings} min={0} width={40} onChange={(v) => setFin('magicSavings', v)} />
            </Field>
            <Field label="Other paid soldiers (pennies a day)" hint="1 £ a year each; soldiers from Boons are on the Soldiers card">
              <Stepper value={cov.finances.paidSoldierPennies} min={0} width={40} onChange={(v) => setFin('paidSoldierPennies', v)} />
            </Field>
            <Field label="Starting reserve (£)" hint="Bought with Build Points: 1 BP per 10 £">
              <Stepper value={cov.finances.startingReserve ?? 0} min={0} step={10} width={50} onChange={(v) => setFin('startingReserve', v)} />
            </Field>
            <label className="inline small">
              <input type="checkbox" checked={cov.finances.pension} onChange={(e) => setFin('pension', e.target.checked)} /> Pension for old retainers
            </label>
          </div>
        </Card>
      </div>

      <Card title="Loyalty (Covenants ch.4)">
        <div className="row">
          <div className="stat">
            <span className="v">
              <Total value={dc.loyalty.score} parts={dc.loyalty.parts} label={`${dc.loyalty.points} Loyalty points`} />
            </span>
            <span className="l">Loyalty score</span>
          </div>
          <div className="stat">
            <span className="v">{dc.loyalty.points}</span>
            <span className="l">Loyalty points</span>
          </div>
          <Field label="Points from events & actions">
            <Stepper value={cov.loyalty.actionPoints} step={5} width={46} onChange={(v) => update((x) => void (x.loyalty.actionPoints = v))} />
          </Field>
          <Field label="Years since founding">
            <Stepper value={cov.loyalty.yearsFounded ?? 0} min={0} width={36} onChange={(v) => update((x) => void (x.loyalty.yearsFounded = v))} />
          </Field>
          <Field label="UnGifted council members" hint="Votes equal to the magi's: each adds 0 to the Base average">
            <Stepper value={cov.loyalty.unGiftedCouncil ?? 0} min={0} width={36} onChange={(v) => update((x) => void (x.loyalty.unGiftedCouncil = v || undefined))} />
          </Field>
        </div>
        <p className="small" style={{ margin: '6px 0' }}>
          <b>Prevailing Loyalty {dc.loyalty.score}:</b> {loyaltyAttitude(dc.loyalty.score)}
          {dc.loyalty.score <= -3 && ' A Prevailing Loyalty of −3 or less brings periodic crises of faithfulness, like a Hook.'}
        </p>
        <LoyaltyEvent cov={cov} update={update} />
        <table className="compact" style={{ marginTop: 8 }}>
          <tbody>
            {dc.loyalty.parts.map((p) => (
              <tr key={p.label}>
                <td>{p.label}</td>
                <td className="num">{p.value > 0 ? `+${p.value}` : p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">
          The Gift of the magi sets the base (Gentle 0, normal −30, Blatant −105, averaged). Points convert to a score like experience for an Ability (negative points give a negative
          score). Covenfolk roll Loyalty + Personality when tested.
        </p>
      </Card>
    </div>
  );
}

function useSet(update: CovTabProps['update'], uidOf: string) {
  return (fn: (x: Specialist) => void) => update((c) => { const y = c.specialists.find((z) => z.uid === uidOf); if (y) fn(y); });
}

function AgeSelect({ s, set }: { s: Specialist; set: (fn: (x: Specialist) => void) => void }) {
  // ages grow a year at a time in play: the age itself, beside the brackets
  const ages = s.age !== undefined && !AGES.includes(s.age) ? [...AGES, s.age].sort((a, b) => a - b) : AGES;
  return (
    <select value={s.age ?? ''} title="Age: sets the highest starting score" onChange={(e) => set((x) => void (x.age = e.target.value ? Number(e.target.value) : undefined))}>
      <option value="">age?</option>
      {ages.map((a) => (
        <option key={a} value={a}>
          {AGES.includes(a) ? `${ageLabel(a)} (max ${abilityCapAtAge(a)})` : `${a} years old`}
        </option>
      ))}
    </select>
  );
}

/** The Wealthy Virtue or Poor Flaw: free time, not pay (City & Guild ch.2). */
function WealthSelect({ s, set }: { s: Specialist; set: (fn: (x: Specialist) => void) => void }) {
  const w = workSeasons(s);
  return (
    <select value={s.wealth ?? ''} title={`Works ${w.work} seasons a year, ${w.free} free (DE p.163). Wealth and poverty change free time, not what the covenant pays or saves.`} onChange={(e) => set((x) => void (x.wealth = (e.target.value || undefined) as Specialist['wealth']))}>
      <option value="">average</option>
      <option value="poor">Poor</option>
      <option value="wealthy">Wealthy</option>
    </select>
  );
}

/** Keep an older file's `ability` and `score` in step with the highest of the Abilities. */
function syncAbilities(x: Specialist, data: CovTabProps['data']) {
  const list = x.abilities ?? [];
  const top = [...list].sort((a, b) => b.score - a.score)[0];
  if (top) {
    x.score = top.score;
    x.ability = abilityDisplayName({ abilityId: top.id, param: top.param }, data);
  }
}

/** A specialist's Abilities, each picked from the Ability list (the highest sets the cost). */
export function SpecAbilities({ s, set, data }: { s: Specialist; set: (fn: (x: Specialist) => void) => void; data: CovTabProps['data'] }) {
  const list = specAbilities(s);
  const top = specHighest(s);
  const toList = (x: Specialist) => {
    if (!x.abilities?.length) x.abilities = x.ability || x.score ? [{ id: data.abilities.find((a) => a.name.toLowerCase() === (x.ability ?? '').toLowerCase())?.id ?? '', param: undefined, score: x.score }] : [];
    return x.abilities;
  };
  const byType = new Map<string, typeof data.abilities>();
  for (const a of data.abilities) byType.set(a.type, [...(byType.get(a.type) ?? []), a]);
  return (
    <div className="row small" style={{ flexBasis: '100%' }}>
      <span className="muted">Abilities:</span>
      {list.map((a, i) => {
        const def = data.abilityById.get(a.id);
        return (
          <span key={i} className="row tight" title={a.score === top ? 'The highest: it sets the cost' : undefined}>
            <select
              value={a.id}
              onChange={(e) => set((x) => void ((toList(x)[i].id = e.target.value), syncAbilities(x, data)))}
              style={{ maxWidth: 170 }}
            >
              <option value="">{a.label && !a.id ? a.label : '— Ability —'}</option>
              {[...byType.entries()].map(([t, abs]) => (
                <optgroup key={t} label={t}>
                  {abs.map((ab) => (
                    <option key={ab.id} value={ab.id}>
                      {ab.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {(def?.parameterized || /\(/.test(def?.name ?? '')) && (
              <input value={a.param ?? ''} placeholder="which" style={{ width: 80 }} onChange={(e) => set((x) => void ((toList(x)[i].param = e.target.value || undefined), syncAbilities(x, data)))} />
            )}
            <Stepper value={a.score} min={0} max={20} width={30} onChange={(v) => set((x) => void ((toList(x)[i].score = v), syncAbilities(x, data)))} />
            {a.score === top && list.length > 1 && <span className="badge">top</span>}
            <span className="clickable muted" title="Remove" onClick={() => set((x) => void (toList(x).splice(i, 1), syncAbilities(x, data)))}>
              ✕
            </span>
          </span>
        );
      })}
      <button className="small ghost" onClick={() => set((x) => void toList(x).push({ id: '', score: Math.max(1, specHighest(x)) }))} title="Teachers often know several Abilities: only the highest counts toward the cost">
        + Ability
      </button>
    </div>
  );
}

/** The Characteristics a specialist's job uses (and what magic has raised). */
export function SpecChars({ s, set, show }: { s: Specialist; set: (fn: (x: Specialist) => void) => void; show: Characteristic[] }) {
  const [all, setAll] = useState(false);
  const chars = all ? CHARACTERISTICS : show;
  return (
    <span className="row tight small">
      {chars.map((ch) => (
        <span key={ch} className="row tight" title={s.magicGain?.[ch] ? `${s.magicGain[ch]} of it from magic (not paid for)` : undefined}>
          {ch}
          <Stepper value={specChar(s, ch)} min={-5} max={5} width={28} onChange={(v) => set((x) => void (x.chars = { Com: x.com, Pre: x.pre, ...(x.chars ?? {}), [ch]: v }))} />
          {s.magicGain?.[ch] ? <span className="badge good">+{s.magicGain[ch]} magic</span> : null}
        </span>
      ))}
      <span className="clickable muted" onClick={() => setAll((v) => !v)}>
        {all ? 'fewer' : 'all…'}
      </span>
    </span>
  );
}

function PersonRow({ s, update, data, labs }: { s: Specialist; update: CovTabProps['update']; data: CovTabProps['data']; labs: { uid: string; name: string; teaching: number }[] }) {
  const set = useSet(update, s.uid);
  const leader = s.role === 'turb-captain' || s.role === 'steward' || s.role === 'chamberlain' || s.role === 'autocrat' || s.role === 'sergeant';
  const teacher = s.role === 'teacher' || s.role === 'drill-sergeant';
  const labTeaching = labs.find((l) => l.uid === s.teachIn)?.teaching ?? 0;
  return (
    <div className="list-row" style={{ flexWrap: 'wrap' }}>
      <input value={s.name} placeholder="Name" style={{ width: 110 }} onChange={(e) => set((x) => void (x.name = e.target.value))} />
      <select value={s.role} title={ROLE_BY_ID.get(s.role)?.hint} onChange={(e) => set((x) => void (x.role = e.target.value as Specialist['role']))}>
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <AgeSelect s={s} set={set} />
      <WealthSelect s={s} set={set} />
      {teacher && (
        <>
          <span className="small">Teaching</span>
          <Stepper value={s.teaching ?? 0} min={0} width={40} onChange={(v) => set((x) => void (x.teaching = v))} />
          <label className="inline small" title="Good Teacher: +5 to the Source Quality of their teaching">
            <input type="checkbox" checked={!!s.goodTeacher} onChange={(e) => set((x) => void (x.goodTeacher = e.target.checked || undefined))} /> Good Teacher
          </label>
          {labs.some((l) => l.teaching > 0) && (
            <select value={s.teachIn ?? ''} title="A lab's Teaching Specialization adds to teaching done there, at most +3 (Covenants ch.9)" onChange={(e) => set((x) => void (x.teachIn = e.target.value || undefined))}>
              <option value="">teaches anywhere</option>
              {labs
                .filter((l) => l.teaching > 0)
                .map((l) => (
                  <option key={l.uid} value={l.uid}>
                    in {l.name} (Teaching +{l.teaching})
                  </option>
                ))}
            </select>
          )}
        </>
      )}
      <SpecChars s={s} set={set} show={teacher ? ['Com'] : leader ? ['Pre'] : ['Com', 'Pre']} />
      <span className="small">×</span>
      <Stepper value={countOf(s)} min={0} width={40} title="How many" onChange={(v) => set((x) => void (x.count = v))} />
      <label className="inline small" title="Part of the base covenant or recruited in play: no Build Points">
        <input type="checkbox" checked={!!s.free} onChange={(e) => set((x) => void (x.free = e.target.checked))} /> no BP
      </label>
      <span className="badge">{specialistCost(s)} BP</span>
      {s.role === 'teacher' && <span className="badge" title="Communication + Teaching + 3, +6 for one student, +5 Good Teacher, + the lab's Teaching up to 3 (DE p.164)">teaches at Quality {teacherQuality(s, 1, labTeaching)}</span>}
      {s.role === 'drill-sergeant' && <span className="badge" title="The whole turb together, one season a year: no one-student bonus (Grogs)">drills the turb at Quality {teacherQuality(s, 3, labTeaching)}</span>}
      {s.boughtFor !== undefined && !s.free && <span className="badge" title="Their scores have risen in play; the Build Points stay what they were bought for">bought for {s.boughtFor * countOf(s)} BP</span>}
      {(s.warpingPoints ?? 0) > 0 && <span className="badge warn">{s.warpingPoints} Warping</span>}
      {s.hired && <span className="badge" title={`Hired from outside for ${s.hired.fee} £ a year: not an inhabitant`}>hired to the end of {s.hired.until}</span>}
      <button className="small ghost" onClick={() => update((c) => void (c.specialists = c.specialists.filter((y) => y.uid !== s.uid)))}>
        ✕
      </button>
      <SpecAbilities s={s} set={set} data={data} />
      {(s.history ?? []).length > 0 && <div className="small muted" style={{ flexBasis: '100%' }}>{s.history!.map((h) => `${h.season} ${h.year}: ${h.text}`).join(' · ')}</div>}
    </div>
  );
}

function CraftRow({ s, update, line: l, optimal, fit, guild, examplesOnly }: { s: Specialist; update: CovTabProps['update']; line?: CraftLine; optimal: () => number; fit: (c: Covenant) => void; guild?: 'enforced' | 'shown'; examplesOnly?: boolean }) {
  const set = useSet(update, s.uid);
  const craft = craftOf(s);
  const rare = s.rare ?? craft?.rare ?? false;
  const each = craftsmanSaving(s.score, rare);
  return (
    <div className="list-row" style={{ flexWrap: 'wrap' }}>
      <input value={s.name} placeholder="Name" style={{ width: 110 }} onChange={(e) => set((x) => void (x.name = e.target.value))} />
      <select
        value={craft?.id ?? ''}
        onChange={(e) => {
          const c = CRAFTS.find((x) => x.id === e.target.value);
          set((x) => void ((x.craft = e.target.value || undefined), c && ((x.ability = `Craft (${c.name})`), (x.rare = c.rare), (!x.name || CRAFTS.some((k) => k.name === x.name)) && (x.name = c.name))));
        }}
      >
        <option value="">— craft —</option>
        {CATEGORIES.map((cat) => (
          <optgroup key={cat} label={cat}>
            {CRAFTS.filter((c) => c.categories[0] === cat && (!examplesOnly || c.example || c.id === craft?.id)).map((c) => (
              <option key={c.id} value={c.id} title={c.source}>
                {c.name}
                {c.categories.length > 1 ? ` (${c.categories.join(' + ')})` : ''}
                {c.rare ? ' — rare' : ''}
                {c.example ? '' : ' *'}
              </option>
            ))}
          </optgroup>
        ))}
        <optgroup label="Books (no savings)">
          {CRAFTS.filter((c) => !c.categories.length).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </select>
      <span className="small">Craft</span>
      <Stepper value={s.score} min={0} width={40} onChange={(v) => set((x) => void (x.score = v))} />
      <AgeSelect s={s} set={set} />
      <WealthSelect s={s} set={set} />
      <label className="inline small" title="Rare craftsmen save their full Craft score">
        <input type="checkbox" checked={rare} onChange={(e) => set((x) => void (x.rare = e.target.checked))} /> rare
      </label>
      <span className="small">×</span>
      <Stepper value={countOf(s)} min={0} width={40} title="How many" onChange={(v) => set((x) => void (x.count = v))} />
      <button
        className="small"
        title="The number of this craftsman that keeps yearly spending lowest; servants and teamsters are set to what it needs"
        onClick={() => {
          const n = optimal();
          update((c) => {
            const y = c.specialists.find((z) => z.uid === s.uid);
            if (y) y.count = n;
            fit(c);
          });
        }}
      >
        optimal
      </button>
      <label className="inline small" title="Part of the base covenant or recruited in play: no Build Points">
        <input type="checkbox" checked={!!s.free} onChange={(e) => set((x) => void (x.free = e.target.checked))} /> no BP
      </label>
      <span className="badge">{specialistCost(s)} BP</span>
      <SpecChars s={s} set={set} show={['Dex']} />
      {(() => {
        // City & Guild: Dexterity + Craft (+ the workshop's Innovation and Raw Materials) makes the Workshop Total; the quality of what they make for a magus moves the enchanting Lab Total
        const wt = craftsmanWorkshopTotal(s);
        const q = craftQuality(wt, 6, s.score);
        const lab = q.quality === 'shoddy' ? -3 : q.quality === 'standard' ? -1 : q.quality === 'superior' ? 0 : q.bonus;
        return (
          <span className="badge" title={`City & Guild: Workshop Total Dexterity + Craft = ${wt} against Craft Level 6. Items they make for enchanting: ${lab >= 0 ? '+' : ''}${lab} to the Lab Total.`}>
            makes {q.quality}
            {q.bonus ? ` (+${q.bonus})` : ''} goods
          </span>
        );
      })()}
      <button className="small ghost" onClick={() => update((c) => void (c.specialists = c.specialists.filter((y) => y.uid !== s.uid)))}>
        ✕
      </button>
      {guild && <GuildLine s={s} set={set} enforced={guild === 'enforced'} />}
      <span className="small soft" style={{ flexBasis: '100%' }}>
        {!craft
          ? 'Pick a craft to count its savings.'
          : !craft.categories.length
            ? 'Saves nothing; lets the covenant make fine books.'
            : `Saves ${each} £ each (${rare ? 'rare: the Craft score' : 'common: 1 + Craft/2'}).` +
              (l ? ` This craft: ${l.saved} £ saved of ${l.potential} possible — ${l.applied.map((a) => `${a.category} ${a.pounds} of ${a.limit}`).join(', ')}.` : '')}
      </span>
    </div>
  );
}

/** A craftsman's guild rank, what it needs, and the Labor Points their workshop earns (City & Guild ch.2-4). */
function GuildLine({ s, set, enforced }: { s: Specialist; set: (fn: (x: Specialist) => void) => void; enforced: boolean }) {
  const short = guildShortfalls(s);
  const lp = laborPointsPerSeason(s);
  const w = workSeasons(s);
  const ws = s.workshop ?? { innovation: 0, rawMaterials: 0, laborPoints: 0 };
  const nextInnov = nextImprovementCost('innovation', ws.innovation);
  const nextRaw = nextImprovementCost('rawMaterials', ws.rawMaterials);
  const keep = craftsmanUpkeep(s);
  const spend = (k: 'innovation' | 'rawMaterials', cost: number) =>
    set((x) => {
      const y = (x.workshop ??= { innovation: 0, rawMaterials: 0, laborPoints: 0 });
      y.laborPoints -= cost;
      y[k] += 1;
    });
  return (
    <div className="row small" style={{ flexBasis: '100%' }}>
      <span>Guild rank</span>
      <select value={s.guildRank ?? ''} onChange={(e) => set((x) => void (x.guildRank = (e.target.value || undefined) as Specialist['guildRank']))}>
        <option value="">{enforced ? '— choose —' : 'not a guild member'}</option>
        {CRAFT_GUILD_ORDER.map((r) => (
          <option key={r} value={r}>
            {CRAFT_GUILD_RANKS[r].label}
          </option>
        ))}
      </select>
      {!s.guildRank && (
        <button className="small ghost" onClick={() => set((x) => void (x.guildRank = suggestedGuildRank(x.age, x.score)))}>
          {CRAFT_GUILD_RANKS[suggestedGuildRank(s.age, s.score)].label} by age and Craft
        </button>
      )}
      {s.guildRank && <span className="muted" title={CRAFT_GUILD_RANKS[s.guildRank].note}>{CRAFT_GUILD_RANKS[s.guildRank].note}</span>}
      {short.length > 0 && <span className={enforced ? 'bad-text' : 'warn-text'}>needs {short.join(', ')}</span>}
      <span title={`(Dexterity + Craft) × ${s.wealth === 'poor' ? 2 : s.wealth === 'wealthy' ? 6 : 3} a season worked; ${keep} a year keeps the workshop as it is (36, and 5 for each point of Raw Materials)`}>
        Labor Points: {lp} a season × {w.work} = {lp * w.work} a year ({lp * w.work - keep >= 0 ? '+' : ''}
        {lp * w.work - keep} after upkeep); {ws.laborPoints} banked
      </span>
      {nextInnov !== undefined && (
        <button className="small" disabled={ws.laborPoints < nextInnov} title="A season to install; Innovation stays with the workshop" onClick={() => spend('innovation', nextInnov)}>
          Innovation +{ws.innovation + 1} ({nextInnov} LP)
        </button>
      )}
      {nextRaw !== undefined && (
        <button className="small" disabled={ws.laborPoints < nextRaw} title="A season to arrange; lost if the craftsman leaves; 5 LP a year a point to keep" onClick={() => spend('rawMaterials', nextRaw)}>
          Raw Materials +{ws.rawMaterials + 1} ({nextRaw} LP)
        </button>
      )}
    </div>
  );
}

/** Make a specialist, teacher or craftsman within the starting limits. */
function QuickAdd({ update, data, examplesOnly }: { update: CovTabProps['update']; data: CovTabProps['data']; examplesOnly?: boolean }) {
  const [role, setRole] = useState<Specialist['role']>('craftsman');
  const [age, setAge] = useState(36);
  const [craft, setCraft] = useState('carpenter');
  const [ability, setAbility] = useState('');
  const [param, setParam] = useState('');
  const cap = abilityCapAtAge(age);
  const [score, setScore] = useState(cap);
  const [com, setCom] = useState(2);
  const [teaching, setTeaching] = useState(cap);
  const [count, setCount] = useState(1);
  const [bought, setBought] = useState(true);
  const [name, setName] = useState('');
  const sc = Math.min(score, cap);
  const te = Math.min(teaching, cap);
  const def = ROLES.find((r) => r.id === role)!;
  const abDef = data.abilityById.get(ability);
  const ab = role === 'craftsman' ? `Craft (${CRAFTS.find((c) => c.id === craft)?.name})` : abDef ? abilityDisplayName({ abilityId: abDef.id, param: param || undefined }, data) : def.ability;
  const byType = new Map<string, typeof data.abilities>();
  for (const a of data.abilities) if (a.type !== 'Supernatural' || (role !== 'teacher' && role !== 'drill-sergeant')) byType.set(a.type, [...(byType.get(a.type) ?? []), a]);
  const teacher = role === 'teacher' || role === 'drill-sergeant';
  const rd = ROLE_BY_ID.get(role);
  const cost = bought && rd?.bp !== 'none' ? (teacher ? com + te + sc : sc) * count : 0;
  const add = () =>
    update((x) => {
      const c = CRAFTS.find((k) => k.id === craft);
      // the role's own Ability when none is picked (Leadership for a captain, Profession: Steward for a steward…)
      const own = !abDef && rd?.ability ? { abilities: [{ id: rd.ability.id, param: rd.ability.param, score: sc }] } : {};
      x.specialists.push({
        uid: uid(), name: name || (role === 'craftsman' ? c?.name ?? 'Craftsman' : def.label), role, ability: ab, score: sc, age, count, free: !bought,
        ...(role === 'craftsman' ? { craft, rare: c?.rare, abilities: [{ id: 'craft-type', param: c?.name, score: sc }], chars: { Dex: 0 } } : {}),
        ...(role !== 'craftsman' && abDef ? { abilities: [{ id: abDef.id, param: param || undefined, score: sc }] } : role !== 'craftsman' ? own : {}),
        ...(teacher ? { chars: { Com: com }, teaching: te } : {}),
      });
    });
  return (
    <Card title="Quick add (within the starting limits)">
      <div className="grid grid-2">
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as Specialist['role'])}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name (optional)">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Age" hint="Sets the highest starting score (DE p.48)">
          <select value={age} onChange={(e) => { const a = Number(e.target.value); setAge(a); setScore(abilityCapAtAge(a)); setTeaching(abilityCapAtAge(a)); }}>
            {AGES.map((a) => (
              <option key={a} value={a}>
                {ageLabel(a)} (max {abilityCapAtAge(a)})
              </option>
            ))}
          </select>
        </Field>
        {role === 'craftsman' ? (
          <Field label="Craft">
            <select value={craft} onChange={(e) => setCraft(e.target.value)}>
              {CRAFTS.filter((c) => !examplesOnly || c.example || !c.categories.length || c.id === craft).map((c) => (
                <option key={c.id} value={c.id} title={c.source}>
                  {c.name} — {c.categories.length ? c.categories.join(' + ') : 'books'}
                  {c.rare ? ' (rare)' : ''}
                  {c.example || !c.categories.length ? '' : ' *'}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={teacher ? 'Ability taught (add more on the row: only the highest counts toward the cost)' : 'Ability'}>
            <span className="row tight">
              <select value={ability} onChange={(e) => setAbility(e.target.value)}>
                <option value="">{def.ability || '— Ability —'}</option>
                {[...byType.entries()].map(([t, abs]) => (
                  <optgroup key={t} label={t}>
                    {abs.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {(abDef?.parameterized || /\(/.test(abDef?.name ?? '')) && <input value={param} placeholder="which" style={{ width: 90 }} onChange={(e) => setParam(e.target.value)} />}
            </span>
          </Field>
        )}
        <Field label={`Score (max ${cap})`}>
          <Stepper value={sc} min={0} max={cap} width={30} onChange={setScore} />
        </Field>
        {teacher && (
          <>
            <Field label="Communication" hint="−3 to +3 (higher needs Great Communication)">
              <Stepper value={com} min={-3} max={3} width={30} onChange={setCom} />
            </Field>
            <Field label={`Teaching (max ${cap})`}>
              <Stepper value={te} min={0} max={cap} width={30} onChange={setTeaching} />
            </Field>
          </>
        )}
        <Field label="How many">
          <Stepper value={count} min={1} width={30} onChange={setCount} />
        </Field>
        <label className="inline small">
          <input type="checkbox" checked={bought} onChange={(e) => setBought(e.target.checked)} /> bought with Build Points
        </label>
      </div>
      {rd && role !== 'craftsman' && <p className="small muted" style={{ margin: '6px 0 0' }}>{rd.hint}</p>}
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={add}>
          Add {count > 1 ? `${count} ` : ''}
          {role === 'craftsman' ? CRAFTS.find((c) => c.id === craft)?.name : def.label}
        </button>
        <span className="small muted">{bought && rd?.bp !== 'none' ? `${cost} BP` : 'no Build Points'}</span>
        {role === 'craftsman' && (
          <span className="small muted">
            saves {craftsmanSaving(sc, CRAFTS.find((c) => c.id === craft)?.rare ?? false)} £ a year each (up to the craft's limit)
          </span>
        )}
      </div>
    </Card>
  );
}

function IncomeCard({ cov, update, dc, hasMiracles }: Omit<CovTabProps, 'data'> & { hasMiracles: boolean }) {
  const f = dc.finances;
  const incomeHBs = cov.hooksBoons.filter((h) => ['wealth', 'secondary-income', 'poverty', 'natural-disaster', 'right', 'contested-resource'].includes(mechanicOf(h) ?? ''));
  return (
    <Card title={`Income (${f.income} £ received)`}>
      {f.incomeLines.map((l) => {
        const i = l.source;
        const set = (fn: (x: IncomeSource) => void) => update((c) => { const y = c.income.find((z) => z.uid === i.uid); if (y) fn(y); });
        const type = INCOME_TYPES.find((t) => t.id === i.type);
        return (
          <div key={i.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="row">
              <input value={i.name} style={{ flex: 1, minWidth: 100 }} onChange={(e) => set((x) => void (x.name = e.target.value))} />
              <select value={i.type} title={type?.blurb} onChange={(e) => set((x) => void (x.type = e.target.value))}>
                {!type && <option value={i.type}>{i.type || '— type —'} (own)</option>}
                {INCOME_TYPES.map((t) => (
                  <option key={t.id} value={t.id} title={t.blurb}>
                    {t.id}
                  </option>
                ))}
              </select>
              {i.inPlay ? (
                <select value={i.level} onChange={(e) => set((x) => void (x.level = e.target.value as IncomeSource['level']))}>
                  {INCOME_LEVELS.map((lv) => (
                    <option key={lv}>{lv}</option>
                  ))}
                </select>
              ) : (
                <span className="badge" title="Set by the covenant's Boons and Hooks">
                  {l.level}
                </span>
              )}
              <button className="small ghost" onClick={() => update((c) => void (c.income = c.income.filter((y) => y.uid !== i.uid)))}>
                ✕
              </button>
            </div>
            {type && <div className="small muted">{type.blurb}</div>}
            <div className="row small">
              <span>
                {l.origin === 'base' ? 'Base covenant source' : l.origin === 'secondary' ? 'From Secondary Income' : 'Gained in play'}
                {l.applied.filter((a) => a.mechanic !== 'secondary-income').map((a) => (
                  <span key={a.hb.uid} className="badge info" title={a.auto ? 'Chosen for you: set it on the Boon or Hook' : undefined}>
                    {a.hb.name} ({a.hb.size}){a.auto ? '*' : ''}
                  </span>
                ))}
              </span>
              {incomeHBs.length > 0 && (
                <select value="" onChange={(e) => e.target.value && update((c) => void (c.hooksBoons.find((h) => h.uid === e.target.value)!.target = i.uid))}>
                  <option value="">+ apply a Boon or Hook…</option>
                  {incomeHBs.map((h) => (
                    <option key={h.uid} value={h.uid}>
                      {h.name} ({h.size} {h.kind}){h.note ? ` — ${h.note}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <label className="inline" title="Its level is no longer set by Boons and Hooks">
                <input type="checkbox" checked={!!i.inPlay} onChange={(e) => set((x) => void (x.inPlay = e.target.checked))} /> gained or changed in play
              </label>
            </div>
            <div className="row small">
              <Field label="This year" hint="The storyguide's choice; usually lasting">
                <div className="row tight">
                  <select value={i.modification ?? 'Status Quo'} onChange={(e) => set((x) => void (x.modification = e.target.value as IncomeModification))}>
                    {INCOME_MODIFICATIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} (×{m.mult})
                      </option>
                    ))}
                  </select>
                  <button className="small ghost" title="Roll the Income Modification table: a stress die, botch Slump … 20+ Boom (Covenants ch.5)" onClick={() => set((x) => void (x.modification = rollIncomeModification().id))}>
                    🎲
                  </button>
                </div>
              </Field>
              <label className="inline" title={`Enter the pounds by hand instead of the book's ${INCOME_LEVEL_POUNDS[l.level]} £`}>
                <input type="checkbox" checked={!!i.customPounds} onChange={(e) => set((x) => void ((x.customPounds = e.target.checked), e.target.checked && (x.pounds = l.base)))} /> own figure
              </label>
              {i.customPounds && <Stepper value={i.pounds} min={0} step={5} width={50} onChange={(v) => set((x) => void (x.pounds = v))} />}
              <label className="inline" title="A tenth goes to the Church">
                <input type="checkbox" checked={!!i.tithed} onChange={(e) => set((x) => void ((x.tithed = e.target.checked), !e.target.checked && (x.miracle = false)))} /> tithed
              </label>
              {hasMiracles && (
                <label className="inline" title={`Tithing Miracles: ×${miracleMultiplierOf(cov)}`}>
                  <input type="checkbox" checked={!!i.miracle} onChange={(e) => set((x) => void ((x.miracle = e.target.checked), e.target.checked && (x.tithed = true)))} /> Tithing Miracle
                </label>
              )}
              <span style={{ flex: 1 }} />
              <Total
                value={`${l.received} £`}
                label="Income received"
                parts={[
                  { label: i.customPounds ? 'Own figure' : `${l.level} source`, value: l.base },
                  ...(l.gross !== l.base ? [{ label: 'This year / Natural Disaster', value: Math.round((l.gross - l.base) * 10) / 10 }] : []),
                  ...(l.tithe ? [{ label: 'Tithe (a tenth)', value: -Math.round(l.tithe * 10) / 10 }] : []),
                  ...(l.miracle ? [{ label: 'Tithing Miracle', value: Math.round(l.miracle * 10) / 10 }] : []),
                  ...(l.received !== Math.round((l.gross - l.tithe + l.miracle) * 10) / 10 ? [{ label: 'Rounded up', value: Math.round((l.received - (l.gross - l.tithe + l.miracle)) * 10) / 10 }] : []),
                ]}
                notes={l.notes}
              />
            </div>
            {l.notes.length > 0 && <div className="small muted">{l.notes.join('; ')}</div>}
          </div>
        );
      })}
      <div className="row" style={{ marginTop: 6 }}>
        <button className="small" onClick={() => update((x) => void x.income.push({ uid: uid(), name: 'Income source', type: 'Agriculture', level: 'Typical', pounds: 100, customPounds: false, inPlay: true }))}>
          + Income source gained in play
        </button>
        <label className="inline small" title="Covenants ch.5: the 100 £ guideline assumes about six magi">
          <input type="checkbox" checked={!!cov.finances.magiIncomeAdjust} onChange={(e) => update((x) => void (x.finances.magiIncomeAdjust = e.target.checked))} /> adjust the principal source by
          15 £ per magus above or below six
        </label>
      </div>
      {hasMiracles && (
        <Field label="Tithing Miracles multiplier" hint="1.8 by default (the tithed tenth made good and the rest doubled); up to 3">
          <Stepper value={miracleMultiplierOf(cov)} min={1} max={3} step={0.1} width={46} onChange={(v) => update((x) => void (x.finances.miracleMultiplier = Math.round(v * 10) / 10))} />
        </Field>
      )}
      {f.incomeIssues.map((iss, k) => (
        <div key={k} className="issue warning">
          <span className="badge warn">check</span>
          <div className="msg">{iss.message}</div>
          {iss.fix && (
            <button className="small" onClick={() => update((x) => iss.fix!(x))}>
              {iss.fixLabel ?? 'Fix'}
            </button>
          )}
        </div>
      ))}
      <HowItWorks label="How the sources follow the Boons and Hooks">
        Sources and their levels follow the Boons and Hooks (Covenants ch.5): one Typical source (100 £) to start; Secondary Income adds a Typical source; Wealth raises a Typical source to Greater
        (250 £, Minor) or Legendary (1000 £, Major); Poverty leaves one Lesser source (40 £, Minor) or none (Major). Right protects a source but adds nothing. A * marks a Boon or Hook placed on a
        source for you. What the covenant receives is rounded up.
      </HowItWorks>
    </Card>
  );
}

/** Record something that changes the covenfolk's loyalty, from the book's table (DE; Covenants ch.4). */
function LoyaltyEvent({ cov, update }: { cov: Covenant; update: CovTabProps['update'] }) {
  const [id, setId] = useState('attitude');
  const [level, setLevel] = useState(0);
  const [magic, setMagic] = useState(false);
  const [what, setWhat] = useState('');
  const e = LOYALTY_EVENTS.find((x) => x.id === id)!;
  const pts = loyaltyEventPoints(id, level, magic && (id === 'wound' || id === 'altruism'));
  const record = () =>
    update((x) => {
      x.loyalty.actionPoints += pts;
      x.log.push({ uid: uid(), year: x.foundedYear + (x.loyalty.yearsFounded ?? 0), text: `Loyalty ${pts > 0 ? '+' : ''}${pts}: ${e.label}${e.levels ? ` (${e.levels[level]}${magic ? ', by magic' : ''})` : ''}${what ? ` — ${what}` : ''}.` });
    });
  return (
    <div className="row small" style={{ alignItems: 'flex-end' }}>
      <Field label="Record an event" hint={e.hint}>
        <select value={id} onChange={(ev) => (setId(ev.target.value), setLevel(0))}>
          <optgroup label="Costs loyalty">
            {LOYALTY_EVENTS.filter((x) => x.kind === 'penalty').map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Earns loyalty">
            {LOYALTY_EVENTS.filter((x) => x.kind === 'gain').map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>
      {e.levels && (
        <select value={level} onChange={(ev) => setLevel(Number(ev.target.value))}>
          {e.levels.map((l, k) => (
            <option key={l} value={k}>
              {l}
            </option>
          ))}
        </select>
      )}
      {(id === 'wound' || id === 'altruism') && (
        <label className="inline">
          <input type="checkbox" checked={magic} onChange={(ev) => setMagic(ev.target.checked)} /> by {id === 'wound' ? 'magic' : 'conspicuous magic'}
        </label>
      )}
      <input value={what} placeholder="who, what (optional)" style={{ flex: '1 1 140px' }} onChange={(ev) => setWhat(ev.target.value)} />
      <button className="small" onClick={record}>
        {pts > 0 ? '+' : ''}
        {pts} points
      </button>
      <span className="muted">Reputations known to the covenfolk: ±5 points per point of Reputation ({cov.loyalty.actionPoints} recorded so far).</span>
    </div>
  );
}

/** Close the year (Covenants ch.5): what it does, then do it, with Undo. */
function CloseYear({ cov, update, dc }: Omit<CovTabProps, 'data'>) {
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const plan = planYearEnd(cov, dc, { ...DEFAULT_YEAR_END, skipVis: cov.yearEnd?.skipVis ?? [] });
  const a = cov.allowance ?? NO_ALLOWANCE;
  const who = allowanceRecipients(cov, dc.members);
  const each = a.mode === 'flat' ? a.amount : a.mode === 'percent' && plan.balance > 0 ? Math.floor(((plan.balance * a.amount) / 100 / Math.max(1, who.length)) * 10) / 10 : 0;
  const setA = (fn: (x: NonNullable<typeof cov.allowance>) => void) => update((x) => void fn((x.allowance ??= { ...NO_ALLOWANCE })));
  return (
    <Card title={`The year ${saga?.currentYear ?? ''}`}>
      <div className="row small">
        <span className={`badge ${dc.finances.balance < 0 ? 'bad' : 'good'}`}>
          {dc.finances.balance >= 0 ? '+' : ''}
          {dc.finances.balance} £ this year
        </span>
        <span>Treasury {cov.finances.treasury} £ → {plan.treasuryAfter} £ at the year&apos;s end</span>
        <Link to={`/saga/${cov.sagaId}/seasons`}>The year ends on the Seasons page ›</Link>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <Field label="Allowance to members each year" hint="Paid from the treasury at the year's end, into each one's purse">
          <span className="row tight">
            <select value={a.mode} onChange={(e) => setA((x) => void (x.mode = e.target.value as typeof a.mode))}>
              <option value="none">none</option>
              <option value="flat">a flat sum each (£)</option>
              <option value="percent">a share of the surplus (%)</option>
            </select>
            {a.mode !== 'none' && <Stepper value={a.amount} min={0} max={a.mode === 'percent' ? 100 : 9999} width={48} onChange={(v) => setA((x) => void (x.amount = v))} />}
          </span>
        </Field>
        <Field label="To">
          <select value={a.to} onChange={(e) => setA((x) => void (x.to = e.target.value as typeof a.to))}>
            <option value="magi">the magi</option>
            <option value="members">every member with a sheet</option>
          </select>
        </Field>
        <Field label="Share of the vis gathered (%)" hint="split evenly among them, Art by Art">
          <Stepper value={a.visShare} min={0} max={100} step={5} width={40} onChange={(v) => setA((x) => void (x.visShare = v))} />
        </Field>
        {(a.mode !== 'none' || a.visShare > 0) && (
          <span className="small">
            {who.length} receive{who.length === 1 ? 's' : ''}
            {a.mode !== 'none' ? `: about ${each} £ each this year` : ''}.
          </span>
        )}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        A covenant&apos;s charter decides what it shares with its members (Covenants ch.3). What they receive goes to their purse, to spend on the Market page or their own projects.
      </p>
    </Card>
  );
}

/** Add a one-off expense to this year's sundry spending, at the book's figure (Covenants ch.5). */
function OneOffSpending({ cov, update, dc }: Omit<CovTabProps, 'data'>) {
  const [id, setId] = useState('redcap');
  const [count, setCount] = useState(1);
  const labs = dc.labs.map((l) => ({ id: `lab:${l.lab.uid}`, label: `Outfitting ${l.lab.name || 'a laboratory'} from bare walls`, pounds: labOutfitCost(l.upkeepPoints), hint: '1 £ per 2 points of laboratory (Upkeep 0: 5 £); raising Upkeep costs 1 £ per 2 points gained.' }));
  const options = [...SUNDRY_PRESETS, ...labs];
  const o = options.find((x) => x.id === id) ?? options[0];
  const pounds = Math.round(o.pounds * count * 1000) / 1000;
  const add = () =>
    update((x) => {
      x.finances.sundry = Math.round((x.finances.sundry + pounds) * 1000) / 1000;
      x.log.push({ uid: uid(), year: x.foundedYear + (x.loyalty.yearsFounded ?? 0), text: `Sundry: ${o.label}${count > 1 ? ` ×${count}` : ''}, ${pounds} £.` });
    });
  return (
    <Field label="Add one-off spending to Sundry" hint={o.hint}>
      <div className="row tight">
        <select value={o.id} onChange={(e) => setId(e.target.value)} style={{ maxWidth: 260 }}>
          {options.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label} ({x.pounds} £)
            </option>
          ))}
        </select>
        <Stepper value={count} min={1} width={34} onChange={setCount} />
        <button className="small" onClick={add} title={`Adds ${pounds} £ to Sundry; closing the year clears it`}>
          +{pounds} £
        </button>
      </div>
      <span className="small muted">{cov.finances.sundry} £ so far this year</span>
    </Field>
  );
}

