import { useState } from 'react';
import { optimalCraftsmen, optimalLaborers, type CraftLine } from '../../engine/covenant';
import {
  CATEGORY_LIMIT, CRAFTS, INCOME_LEVELS, INCOME_LEVEL_POUNDS, INCOME_MODIFICATIONS, INCOME_TYPES, abilityCapAtAge, countOf, craftOf, craftsmanSaving,
  mechanicOf, miracleMultiplierOf, specialistCost, type CostCategory,
} from '../../engine/covenantRules';
import type { Covenant, CovenfolkCounts, IncomeModification, IncomeSource, Specialist } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';
import type { CovTabProps } from './shared';

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

const ROLES: { id: Specialist['role']; label: string; ability: string }[] = [
  { id: 'teacher', label: 'Teacher', ability: '' },
  { id: 'craftsman', label: 'Craftsman', ability: '' },
  { id: 'turb-captain', label: 'Turb captain', ability: 'Leadership' },
  { id: 'steward', label: 'Steward', ability: 'Profession: Steward' },
  { id: 'chamberlain', label: 'Chamberlain', ability: 'Profession: Chamberlain' },
  { id: 'scribe', label: 'Scribe', ability: 'Profession: Scribe' },
  { id: 'specialist', label: 'Other specialist', ability: '' },
  { id: 'other', label: 'Other', ability: '' },
];
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
  const [newScore, setNewScore] = useState(6);
  const [newBought, setNewBought] = useState(true);

  const advanceYear = () => {
    if (!window.confirm(`Close the year: add ${f.balance} £ to the treasury and this year's vis income to the stocks?`)) return;
    update((x) => {
      x.finances.treasury = Math.round((x.finances.treasury + f.balance) * 10) / 10;
      for (const [art, n] of Object.entries(dc.visIncome)) {
        const s = x.visStocks.find((v) => v.art === art);
        if (s) s.pawns += n;
        else x.visStocks.push({ art: art as never, pawns: n });
      }
      x.loyalty.yearsFounded = (x.loyalty.yearsFounded ?? 0) + 1;
      x.log.push({ uid: uid(), year: x.foundedYear + (x.loyalty.yearsFounded ?? 0), text: `Year closed: ${f.balance >= 0 ? 'surplus' : 'deficit'} of ${Math.abs(f.balance)} £; vis collected.`, treasuryDelta: f.balance });
    });
  };

  const optimalLab = () => optimalLaborers(cov, dc.members, dc.labs);
  /** every cost-saving craft the covenant lacks, at the number that saves most */
  const addEveryCraft = () =>
    update((x) => {
      for (const craft of CRAFTS) {
        if (!craft.categories.length || x.specialists.some((s) => craftOf(s)?.id === craft.id)) continue;
        const s: Specialist = { uid: uid(), name: craft.name, role: 'craftsman', ability: `Craft (${craft.name})`, craft: craft.id, score: newScore, count: 1, rare: craft.rare, free: !newBought, age: ageFor(newScore) };
        x.specialists.push(s);
        s.count = optimalCraftsmen(x, dc.members, dc.labs, s.uid);
      }
      x.specialists = x.specialists.filter((s) => !(s.role === 'craftsman' && s.count === 0));
    });

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
                    <button className="small" title="The number that keeps yearly spending lowest" onClick={() => { const n = optimalLab(); update((x) => void (x.covenfolk.laborers = n)); }}>
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
          <p className="small muted">
            Player characters who are members count automatically ({dc.members.length}). Inhabitant points: {cov.season === 'Summer' || cov.season === 'Autumn' ? 'magi 10, companions 5, specialists and craftsmen 3, others 2' : 'magi 5, companions 3, specialists and craftsmen 2, others 1'} (
            {cov.season} covenant). Two servants per 10 points, then one teamster per 10 points less twice the laborers, rounded up (Covenants ch.5). Each laborer saves a pound of
            Provisions (up to half of them) but also costs about a pound as an inhabitant; "optimal" finds the number that keeps spending lowest.
          </p>
        </Card>
        <QuickAdd update={update} data={data} />
      </div>

      <Card title={`Specialists & teachers (${people.reduce((s, x) => s + specialistCost(x), 0)} BP)`}>
        {people.length === 0 && <div className="small muted">None listed. Use Quick add above.</div>}
        {people.map((s) => (
          <PersonRow key={s.uid} s={s} update={update} />
        ))}
        <p className="small muted">
          Bought with Build Points (DE p.180): teachers cost Communication + Teaching + their highest taught score and teach two seasons a year; other specialists cost their highest score.
          Scores start limited by age (DE p.48: 5 under 30, up to 9 at 46+). Teachers can't have The Gift, so can't teach Arts. Tick "no BP" for people from the base covenant or recruited in
          play. Specialists cost {specBP} BP in all.
        </p>
      </Card>

      <Card
        title={`Craftsmen (${craftsmen.reduce((s, x) => s + specialistCost(x), 0)} BP)`}
        actions={
          <span className="row tight small">
            Score for new ones <Stepper value={newScore} min={0} max={9} width={30} onChange={setNewScore} />
            <label className="inline">
              <input type="checkbox" checked={newBought} onChange={(e) => setNewBought(e.target.checked)} /> bought with BP
            </label>
            <button className="small" onClick={addEveryCraft} title="Adds each cost-saving craft the covenant lacks, at the number that saves most">
              + Every cost-saving craft (optimal numbers)
            </button>
          </span>
        }
      >
        {craftsmen.length === 0 && <div className="small muted">None listed.</div>}
        {craftsmen.map((s) => (
          <CraftRow key={s.uid} s={s} update={update} line={f.crafts.find((c) => c.craft.id === craftOf(s)?.id)} optimal={() => optimalCraftsmen(cov, dc.members, dc.labs, s.uid)} />
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
        <p className="small muted">
          A common craftsman saves 1 + half his Craft score (rounded down) a year, a rare one his Craft score. Each craft saves at most its share of a category (Covenants ch.5); more of the same
          craft past that saves nothing, so "optimal" finds the number worth employing. A carpenter works for both Buildings and Consumables: his savings fill the Buildings limit first and the
          rest goes to Consumables. Bookbinders and illuminators save nothing but let the covenant make fine books (they and scribes add 1 £ of Writing Materials each).
        </p>
      </Card>

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
            <button onClick={advanceYear}>Close the year</button>
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
              <Stepper value={cov.finances.weaponArmorPoints} min={0} step={32} width={56} onChange={(v) => setFin('weaponArmorPoints', v)} />
            </Field>
            <Field label="Other tithes & taxes (£)" hint="Church tithes on income are set per source">
              <Stepper value={cov.finances.tithes} min={0} width={40} onChange={(v) => setFin('tithes', v)} />
            </Field>
            <Field label="Inflation (£)">
              <Stepper value={cov.finances.inflation} min={0} width={40} onChange={(v) => setFin('inflation', v)} />
            </Field>
            <Field label="Sundry (£)">
              <Stepper value={cov.finances.sundry} min={0} width={40} onChange={(v) => setFin('sundry', v)} />
            </Field>
            <Field label="Magical savings (£)" hint="Items or rituals that replace expenses">
              <Stepper value={cov.finances.magicSavings} min={0} width={40} onChange={(v) => setFin('magicSavings', v)} />
            </Field>
            <Field label="Paid soldiers (pennies a day)" hint="1 £ a year each">
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
        </div>
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

/** The youngest age bracket that allows a score. */
function ageFor(score: number): number {
  return AGES.find((a) => abilityCapAtAge(a) >= score) ?? 46;
}

function useSet(update: CovTabProps['update'], uidOf: string) {
  return (fn: (x: Specialist) => void) => update((c) => { const y = c.specialists.find((z) => z.uid === uidOf); if (y) fn(y); });
}

function AgeSelect({ s, set }: { s: Specialist; set: (fn: (x: Specialist) => void) => void }) {
  return (
    <select value={s.age ?? ''} title="Age: sets the highest starting score" onChange={(e) => set((x) => void (x.age = e.target.value ? Number(e.target.value) : undefined))}>
      <option value="">age?</option>
      {AGES.map((a) => (
        <option key={a} value={a}>
          {ageLabel(a)} (max {abilityCapAtAge(a)})
        </option>
      ))}
    </select>
  );
}

function PersonRow({ s, update }: { s: Specialist; update: CovTabProps['update'] }) {
  const set = useSet(update, s.uid);
  return (
    <div className="list-row" style={{ flexWrap: 'wrap' }}>
      <input value={s.name} placeholder="Name" style={{ width: 110 }} onChange={(e) => set((x) => void (x.name = e.target.value))} />
      <select value={s.role} onChange={(e) => set((x) => void (x.role = e.target.value as Specialist['role']))}>
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <input value={s.ability} placeholder="Ability" style={{ width: 120 }} onChange={(e) => set((x) => void (x.ability = e.target.value))} />
      <Stepper value={s.score} min={0} width={40} title="Highest score" onChange={(v) => set((x) => void (x.score = v))} />
      <AgeSelect s={s} set={set} />
      {s.role === 'teacher' && (
        <>
          <span className="small">Com</span>
          <Stepper value={s.com ?? 0} min={-3} max={5} width={30} onChange={(v) => set((x) => void (x.com = v))} />
          <span className="small">Teaching</span>
          <Stepper value={s.teaching ?? 0} min={0} width={40} onChange={(v) => set((x) => void (x.teaching = v))} />
        </>
      )}
      {(s.role === 'turb-captain' || s.role === 'steward' || s.role === 'chamberlain') && (
        <>
          <span className="small">Pre</span>
          <Stepper value={s.pre ?? 0} min={-3} max={5} width={30} onChange={(v) => set((x) => void (x.pre = v))} />
        </>
      )}
      <span className="small">×</span>
      <Stepper value={countOf(s)} min={0} width={40} title="How many" onChange={(v) => set((x) => void (x.count = v))} />
      <label className="inline small" title="Part of the base covenant or recruited in play: no Build Points">
        <input type="checkbox" checked={!!s.free} onChange={(e) => set((x) => void (x.free = e.target.checked))} /> no BP
      </label>
      <span className="badge">{specialistCost(s)} BP</span>
      <button className="small ghost" onClick={() => update((c) => void (c.specialists = c.specialists.filter((y) => y.uid !== s.uid)))}>
        ✕
      </button>
    </div>
  );
}

function CraftRow({ s, update, line: l, optimal }: { s: Specialist; update: CovTabProps['update']; line?: CraftLine; optimal: () => number }) {
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
            {CRAFTS.filter((c) => c.categories[0] === cat).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.categories.length > 1 ? ` (${c.categories.join(' + ')})` : ''}
                {c.rare ? ' — rare' : ''}
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
      <label className="inline small" title="Rare craftsmen save their full Craft score">
        <input type="checkbox" checked={rare} onChange={(e) => set((x) => void (x.rare = e.target.checked))} /> rare
      </label>
      <span className="small">×</span>
      <Stepper value={countOf(s)} min={0} width={40} title="How many" onChange={(v) => set((x) => void (x.count = v))} />
      <button className="small" title="The number of this craftsman that keeps yearly spending lowest" onClick={() => { const n = optimal(); set((x) => void (x.count = n)); }}>
        optimal
      </button>
      <label className="inline small" title="Part of the base covenant or recruited in play: no Build Points">
        <input type="checkbox" checked={!!s.free} onChange={(e) => set((x) => void (x.free = e.target.checked))} /> no BP
      </label>
      <span className="badge">{specialistCost(s)} BP</span>
      <button className="small ghost" onClick={() => update((c) => void (c.specialists = c.specialists.filter((y) => y.uid !== s.uid)))}>
        ✕
      </button>
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

/** Make a specialist, teacher or craftsman within the starting limits. */
function QuickAdd({ update, data }: { update: CovTabProps['update']; data: CovTabProps['data'] }) {
  const [role, setRole] = useState<Specialist['role']>('craftsman');
  const [age, setAge] = useState(36);
  const [craft, setCraft] = useState('carpenter');
  const [ability, setAbility] = useState('');
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
  const ab = role === 'craftsman' ? `Craft (${CRAFTS.find((c) => c.id === craft)?.name})` : ability || def.ability;
  const teachable = data.abilities.filter((a) => !a.parameterized && a.type !== 'Supernatural').sort((a, b) => a.name.localeCompare(b.name));
  const cost = bought ? (role === 'teacher' ? com + te + sc : sc) * count : 0;
  const add = () =>
    update((x) => {
      const c = CRAFTS.find((k) => k.id === craft);
      x.specialists.push({
        uid: uid(), name: name || (role === 'craftsman' ? c?.name ?? 'Craftsman' : def.label), role, ability: ab, score: sc, age, count, free: !bought,
        ...(role === 'craftsman' ? { craft, rare: c?.rare } : {}),
        ...(role === 'teacher' ? { com, teaching: te } : {}),
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
              {CRAFTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.categories.length ? c.categories.join(' + ') : 'books'}
                  {c.rare ? ' (rare)' : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={role === 'teacher' ? 'Ability taught' : 'Ability'}>
            <input list="quick-abilities" value={ability} placeholder={def.ability || 'Ability'} onChange={(e) => setAbility(e.target.value)} />
            <datalist id="quick-abilities">
              {teachable.map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
          </Field>
        )}
        <Field label={`Score (max ${cap})`}>
          <Stepper value={sc} min={0} max={cap} width={30} onChange={setScore} />
        </Field>
        {role === 'teacher' && (
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
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={add}>
          Add {count > 1 ? `${count} ` : ''}
          {role === 'craftsman' ? CRAFTS.find((c) => c.id === craft)?.name : def.label}
        </button>
        <span className="small muted">{bought ? `${cost} BP` : 'no Build Points'}</span>
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
              <Field label="This year">
                <select value={i.modification ?? 'Status Quo'} onChange={(e) => set((x) => void (x.modification = e.target.value as IncomeModification))}>
                  {INCOME_MODIFICATIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} (×{m.mult})
                    </option>
                  ))}
                </select>
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
      <p className="small muted">
        Sources and their levels follow the Boons and Hooks (Covenants ch.5): one Typical source (100 £) to start; Secondary Income adds a Typical source; Wealth raises a Typical source to Greater
        (250 £, Minor) or Legendary (1000 £, Major); Poverty leaves one Lesser source (40 £, Minor) or none (Major). Right protects a source but adds nothing. A * marks a Boon or Hook placed on a
        source for you. What the covenant receives is rounded up.
      </p>
    </Card>
  );
}
