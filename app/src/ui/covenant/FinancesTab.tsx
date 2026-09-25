import type { Covenant, CovenfolkCounts, IncomeSource, Specialist } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';
import type { CovTabProps } from './shared';

const FOLK: { key: keyof CovenfolkCounts; label: string }[] = [
  { key: 'grogs', label: 'Grogs (non-player)' },
  { key: 'companions', label: 'Companions (non-player)' },
  { key: 'specialists', label: 'Other specialists' },
  { key: 'craftsmen', label: 'Craftsmen' },
  { key: 'servants', label: 'Servants' },
  { key: 'teamsters', label: 'Teamsters' },
  { key: 'laborers', label: 'Laborers' },
  { key: 'dependents', label: 'Dependents' },
  { key: 'horses', label: 'Horses' },
];

const ROLES: Specialist['role'][] = ['teacher', 'specialist', 'turb-captain', 'steward', 'chamberlain', 'scribe', 'craftsman', 'other'];
const INCOME_LEVELS: IncomeSource['level'][] = ['Lesser', 'Typical', 'Greater', 'Legendary'];

export default function FinancesTab({ cov, update, dc }: CovTabProps) {
  const f = dc.finances;
  const setFin = <K extends keyof Covenant['finances']>(k: K, v: Covenant['finances'][K]) => update((x) => void (x.finances[k] = v));
  const specBP = dc.bpLines.filter((l) => l.category === 'Specialists').reduce((s, l) => s + l.cost, 0);

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

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Card title="Covenfolk" className="accent">
          <div className="grid grid-3">
            {FOLK.map(({ key, label }) => (
              <Field key={key} label={label}>
                <Stepper value={cov.covenfolk[key]} min={0} width={40} onChange={(v) => update((x) => void (x.covenfolk[key] = v))} />
              </Field>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="stat">
              <span className="v">{f.inhabitantPoints}</span>
              <span className="l">Inhabitant points</span>
            </div>
            <div className={`stat`}>
              <span className={`v ${cov.covenfolk.servants < f.servantsRequired ? 'warn-text' : ''}`}>{f.servantsRequired}</span>
              <span className="l">Servants needed</span>
            </div>
            <div className="stat">
              <span className={`v ${cov.covenfolk.teamsters < f.teamstersRequired ? 'warn-text' : ''}`}>{f.teamstersRequired}</span>
              <span className="l">Teamsters needed</span>
            </div>
          </div>
          <p className="small muted">
            Player characters who are members count automatically ({dc.members.length}). Inhabitant points: {cov.season === 'Summer' || cov.season === 'Autumn' ? 'magi 10, companions 5, specialists 3, others 2' : 'magi 5, companions 3, specialists 2, others 1'} (
            {cov.season} covenant). Two servants per 10 points and one teamster per 10 points, rounded up (Covenants supplement).
          </p>
        </Card>
        <Card title={`Specialists & teachers (${specBP} BP)`}>
          {cov.specialists.map((s) => {
            const set = (fn: (x: Specialist) => void) => update((c) => { const y = c.specialists.find((z) => z.uid === s.uid); if (y) fn(y); });
            return (
              <div key={s.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
                <input value={s.name} placeholder="Name" style={{ width: 110 }} onChange={(e) => set((x) => void (x.name = e.target.value))} />
                <select value={s.role} onChange={(e) => set((x) => void (x.role = e.target.value as Specialist['role']))}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <input value={s.ability} placeholder="Ability" style={{ width: 100 }} onChange={(e) => set((x) => void (x.ability = e.target.value))} />
                <Stepper value={s.score} min={0} width={30} title="Highest score" onChange={(v) => set((x) => void (x.score = v))} />
                {s.role === 'teacher' && (
                  <>
                    <span className="small">Com</span>
                    <Stepper value={s.com ?? 0} width={30} onChange={(v) => set((x) => void (x.com = v))} />
                    <span className="small">Teaching</span>
                    <Stepper value={s.teaching ?? 0} min={0} width={30} onChange={(v) => set((x) => void (x.teaching = v))} />
                  </>
                )}
                {(s.role === 'turb-captain' || s.role === 'steward' || s.role === 'chamberlain') && (
                  <>
                    <span className="small">Pre</span>
                    <Stepper value={s.pre ?? 0} width={30} onChange={(v) => set((x) => void (x.pre = v))} />
                  </>
                )}
                <span className="badge">{s.role === 'teacher' ? (s.com ?? 0) + (s.teaching ?? 0) + s.score : s.score} BP</span>
                <button className="small ghost" onClick={() => update((c) => void (c.specialists = c.specialists.filter((y) => y.uid !== s.uid)))}>
                  ✕
                </button>
              </div>
            );
          })}
          <button className="small" onClick={() => update((x) => void x.specialists.push({ uid: uid(), name: '', role: 'specialist', ability: '', score: 5 }))}>
            + Specialist
          </button>
          <p className="small muted">
            Specialists cost Build Points equal to their highest score; teachers cost Com + Teaching + their highest taught score and teach two seasons a year. Teachers can't have The Gift
            (so can't teach Arts).
          </p>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="Income">
          {cov.income.map((i) => {
            const set = (fn: (x: IncomeSource) => void) => update((c) => { const y = c.income.find((z) => z.uid === i.uid); if (y) fn(y); });
            return (
              <div key={i.uid} className="list-row">
                <input value={i.name} style={{ flex: 1 }} onChange={(e) => set((x) => void (x.name = e.target.value))} />
                <input value={i.type} style={{ width: 100 }} onChange={(e) => set((x) => void (x.type = e.target.value))} />
                <select value={i.level} onChange={(e) => set((x) => void (x.level = e.target.value as IncomeSource['level']))}>
                  {INCOME_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <Stepper value={i.pounds} min={0} step={5} width={46} onChange={(v) => set((x) => void (x.pounds = v))} />
                <span className="small">£</span>
                <button className="small ghost" onClick={() => update((c) => void (c.income = c.income.filter((y) => y.uid !== i.uid)))}>
                  ✕
                </button>
              </div>
            );
          })}
          <button className="small" onClick={() => update((x) => void x.income.push({ uid: uid(), name: 'Income source', type: 'Rents', level: 'Typical', pounds: 20 }))}>
            + Income source
          </button>
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
            <Field label="Living conditions modifier" hint="Extra spending on comfort (Covenants supplement)">
              <Stepper value={cov.finances.livingConditions} min={-3} max={3} width={36} onChange={(v) => setFin('livingConditions', v)} />
            </Field>
            <Field label="Weapons & armor points">
              <Stepper value={cov.finances.weaponArmorPoints} min={0} step={32} width={56} onChange={(v) => setFin('weaponArmorPoints', v)} />
            </Field>
            <Field label="Tithes (£)">
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
            <label className="inline small">
              <input type="checkbox" checked={cov.finances.pension} onChange={(e) => setFin('pension', e.target.checked)} /> Pension for old retainers
            </label>
          </div>
          <h4>Craftsman savings</h4>
          {cov.finances.craftSavings.map((cs, i) => (
            <div key={cs.uid} className="row" style={{ marginBottom: 4 }}>
              <input value={cs.craft} style={{ width: 120 }} placeholder="Craft" onChange={(e) => update((x) => void (x.finances.craftSavings[i].craft = e.target.value))} />
              <select value={cs.category} onChange={(e) => update((x) => void (x.finances.craftSavings[i].category = e.target.value))}>
                {['Buildings', 'Consumables', 'Laboratories', 'Provisions', 'Weapons and Armor', 'Writing Materials'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <Stepper value={cs.score} min={0} width={30} onChange={(v) => update((x) => void (x.finances.craftSavings[i].score = v))} />
              <label className="inline small">
                <input type="checkbox" checked={cs.rare} onChange={(e) => update((x) => void (x.finances.craftSavings[i].rare = e.target.checked))} /> rare/expensive
              </label>
              <button className="small ghost" onClick={() => update((x) => void x.finances.craftSavings.splice(i, 1))}>
                ✕
              </button>
            </div>
          ))}
          <button className="small" onClick={() => update((x) => void x.finances.craftSavings.push({ uid: uid(), craft: 'Carpenter', category: 'Buildings', score: 5, rare: false }))}>
            + Craftsman
          </button>
        </Card>

        <Card title="Annual expenditure (Covenants supplement)">
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
                  <b>Income</b>
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
          <p className="small muted">Laboratory upkeep points: {f.labPoints}. Writing materials: 1 £ per magus or scribe ({f.writersCount}).</p>
        </Card>
      </div>

      <Card title="Loyalty (Covenants supplement)">
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
