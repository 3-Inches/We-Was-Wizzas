// City & Guild at the table: a journey's days and cost, cargo, Area Lore, ships in a fight; bribes,
// hired criminals, sabotage and intrigue against the powerful; a house's Reputation; dowries.

import { useState } from 'react';
import type { DerivedCharacter } from '../../engine/character/derive';
import { abilityTotal } from '../../engine/character/derive';
import { simpleDie } from '../../engine/dice';
import { lsd } from '../../engine/economy';
import {
  AREA_LORE_EASE, CARRIERS, CG_BRIBES, INDIRECT_INTRIGUE, LARGESSE_BUILDINGS, SABOTAGE, SKULLDUGGERY, TRAVEL_MODES, captainsRoll, dowry, festivalXp, indirectRoll, journey, proxyRoll,
  sabotageRoll, shipBlow, warehouse,
} from '../../engine/trade';
import type { Character, Covenant, Season } from '../../engine/types';
import { purseOf } from '../../engine/vis';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Field, Stepper } from '../kit';
import { RulesNote } from '../RulesNote';

export function TravelTradeCard({ people, derived, home, year, season }: { people: Character[]; derived: Map<string, DerivedCharacter>; home?: Covenant; year: number; season: Season }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [who, setWho] = useState('');
  const [out, setOut] = useState<string[]>([]);
  // travel
  const [miles, setMiles] = useState(100);
  const [mode, setMode] = useState('cargo');
  const [party, setParty] = useState(8);
  const [magi, setMagi] = useState(0);
  const [capA, setCapA] = useState(5);
  const [capB, setCapB] = useState(5);
  // skullduggery
  const [daily, setDaily] = useState(2);
  const [crime, setCrime] = useState(SKULLDUGGERY[0].id);
  const [sentry, setSentry] = useState(3);
  const [sentries, setSentries] = useState(1);
  const [sab, setSab] = useState(0);
  const [ease, setEase] = useState(9);
  // reputation and dowries
  const [festival, setFestival] = useState(5);
  const [population, setPopulation] = useState(5000);
  const [tons, setTons] = useState(100);
  const [profit, setProfit] = useState(20);
  const [children, setChildren] = useState(3);
  const [above, setAbove] = useState(0);

  const c = people.find((x) => x.id === who) ?? people[0];
  const d = c ? derived.get(c.id) : undefined;
  const ch = (k: 'Int' | 'Com' | 'Dex' | 'Per') => d?.characteristics[k].value ?? 0;
  const ab = (id: string) => (d ? abilityTotal(d, id) : 0);
  const say = (lines: string[]) => setOut(lines);
  const trip = journey(miles, mode, party, magi);
  const crimeDef = SKULLDUGGERY.find((x) => x.id === crime)!;

  /** Pay from the chosen character's purse, or else the covenant's treasury. */
  const pay = (pounds: number, what: string, from: 'purse' | 'treasury') => {
    if (pounds <= 0) return;
    if (from === 'purse' && c)
      updateCharacter(c.id, (x) => {
        const p = purseOf(x);
        p.pounds = Math.round((p.pounds - pounds) * 1000) / 1000;
        (p.log ??= []).push({ year, season, text: what, pounds: -pounds });
      });
    else if (home)
      updateCovenant(home.id, (x) => {
        x.finances.treasury = Math.round((x.finances.treasury - pounds) * 1000) / 1000;
        x.log.push({ uid: uid(), year, season, text: `${what}: ${lsd(pounds)}.`, treasuryDelta: -pounds });
      });
    say([`${what}: ${lsd(pounds)} paid from ${from === 'purse' && c ? `${c.name || 'the'}’s purse` : `${home?.name || 'the covenant'}’s treasury`}.`]);
  };
  const PayButtons = ({ pounds, what }: { pounds: number; what: string }) =>
    pounds > 0 ? (
      <span className="row tight">
        {c && (
          <button className="small ghost" disabled={(c.purse?.pounds ?? 0) < pounds} onClick={() => pay(pounds, what, 'purse')}>
            Pay {lsd(pounds)} from the purse
          </button>
        )}
        {home && (
          <button className="small ghost" onClick={() => pay(pounds, what, 'treasury')}>
            from the treasury
          </button>
        )}
      </span>
    ) : null;

  return (
    <Card title="Travel, trade and intrigue (City & Guild)" tour="table-trade" id="travel-trade">
      <div className="row small">
        <Field label="Who acts">
          <select value={c?.id ?? ''} onChange={(e) => setWho(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || 'Unnamed'}
              </option>
            ))}
          </select>
        </Field>
        {d && (
          <span className="muted">
            Int {ch('Int')}, Com {ch('Com')}; Area Lore {ab('area-lore')}, Intrigue {ab('intrigue')}, Stealth {ab('stealth')}; purse {lsd(c?.purse?.pounds ?? 0)}
          </span>
        )}
      </div>

      <details>
        <summary className="small">A journey: days, cost, cargo, finding things on the way</summary>
        <RulesNote book="CG" line={2225} endLine={2392}>
          Sea is cheapest and fastest over distance; river travel costs twice as much, road eight to twenty times. A couple of magi and half a dozen grogs travel with a merchant for a pound a
          fortnight; known magi pay double, and few captains want them.
        </RulesNote>
        <div className="row small">
          <Field label="Miles">
            <Stepper value={miles} min={1} max={5000} step={10} width={50} onChange={setMiles} />
          </Field>
          <Field label="By">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {TRAVEL_MODES.map((m) => (
                <option key={m.id} value={m.id} title={m.hint}>
                  {m.label} ({m.miles[0] === m.miles[1] ? m.miles[0] : `${m.miles[0]}–${m.miles[1]}`} a day)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Travelers">
            <Stepper value={party} min={1} max={60} width={30} onChange={setParty} />
          </Field>
          <Field label="Known magi among them">
            <Stepper value={magi} min={0} max={party} width={30} onChange={setMagi} />
          </Field>
        </div>
        <div className="small">
          <b>{trip.text}</b> {TRAVEL_MODES.find((m) => m.id === mode)?.hint}
        </div>
        <div className="row tight small" style={{ marginTop: 4 }}>
          <PayButtons pounds={trip.pounds[1]} what={`Passage for ${party} (${miles} miles)`} />
          <span className="muted">Inns about every eight miles near cities; a ship chartered for a season, about 6 £.</span>
        </div>
        <table className="compact small" style={{ marginTop: 6 }}>
          <tbody>
            {CARRIERS.map((k) => (
              <tr key={k.label}>
                <td>{k.label}</td>
                <td>{k.tons} tons</td>
                <td>{k.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="small" style={{ marginTop: 6 }}>
          <b>Finding things (Intelligence + Area Lore):</b>
          {AREA_LORE_EASE.map((a) => (
            <div key={a.ease}>
              <button className="small ghost" onClick={() => {
                const r = simpleDie().value;
                const t = r + ch('Int') + ab('area-lore');
                say([`${c?.name || 'They'}: Intelligence + Area Lore ${ch('Int') + ab('area-lore')} + ${r} = ${t} vs ${a.ease}: ${t >= a.ease ? 'found' : 'not found'} (−3 to the Ease for a townsman in the hinterland or a country dweller in town).`]);
              }}>
                {a.ease}
              </button>{' '}
              {a.what}
            </div>
          ))}
        </div>
        <div className="row tight small" style={{ marginTop: 6 }} title="Each captain: stress die + Intelligence + Profession + up to 3 for an experienced crew">
          Ships: a chase, boarding or ram —
          <Stepper value={capA} min={-5} max={25} width={30} onChange={setCapA} /> against
          <Stepper value={capB} min={-5} max={25} width={30} onChange={setCapB} />
          <button className="small ghost" onClick={() => say([captainsRoll(capA, capB).text])}>
            Captains roll
          </button>
          {(['ballista', 'catapult', 'ram', 'oars'] as const).map((k) => (
            <button key={k} className="small ghost" onClick={() => say([shipBlow(k)])}>
              {k === 'oars' ? 'shear oars' : k}
            </button>
          ))}
        </div>
      </details>

      <details>
        <summary className="small">Bribes, hired criminals and sabotage</summary>
        <RulesNote book="CG" line={3375} endLine={3428}>
          Criminals are hired with Intrigue; for a crime not played out, the hirer&apos;s Communication + Intrigue + stress die stands in for theirs. Bribes run from a week&apos;s wages for an easy
          favor to a year&apos;s for one that could cost the official the job, or 10% of the gain for regular favors.
        </RulesNote>
        <div className="row tight small">
          <Field label="The official's daily pay (pennies)">
            <Stepper value={daily} min={1} max={60} width={30} onChange={setDaily} />
          </Field>
        </div>
        {CG_BRIBES.map((b) => {
          const pounds = Math.round(((b.weeks * 7 * daily) / 240) * 1000) / 1000;
          return (
            <div key={b.label} className="row tight small">
              <span style={{ flex: '1 1 220px' }}>
                {b.label}: {lsd(pounds)} <span className="muted">({b.example})</span>
              </span>
              <PayButtons pounds={pounds} what={`A bribe: ${b.label.toLowerCase()}`} />
            </div>
          );
        })}
        <div className="row tight small" style={{ marginTop: 6 }}>
          <select value={crime} onChange={(e) => setCrime(e.target.value)}>
            {SKULLDUGGERY.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
                {x.pounds ? ` (${x.pounds} £)` : ''}
              </option>
            ))}
          </select>
          <button className="small ghost" onClick={() => say([`${crimeDef.label}: ${proxyRoll(ch('Com'), ab('intrigue')).text}`, crimeDef.hint])}>
            Hire and roll (Com + Intrigue)
          </button>
          <PayButtons pounds={crimeDef.pounds} what={crimeDef.label} />
        </div>
        <div className="row tight small" style={{ marginTop: 6 }} title="The agent's Dexterity + Stealth + stress die beats the best sentry's Perception + Awareness + stress die, +1 for each further sentry, + the sabotage's bonus">
          Sabotage:
          <select value={sab} onChange={(e) => setSab(Number(e.target.value))}>
            {SABOTAGE.map((x, i) => (
              <option key={x.label} value={i} title={x.example}>
                {x.label} (+{x.bonus})
              </option>
            ))}
          </select>
          best sentry Per + Awareness
          <Stepper value={sentry} min={-3} max={15} width={30} onChange={setSentry} />
          sentries
          <Stepper value={sentries} min={1} max={20} width={30} onChange={setSentries} />
          <button className="small ghost" onClick={() => say([sabotageRoll(ch('Dex') + ab('stealth'), sentry, sentries, SABOTAGE[sab].bonus).text])}>
            {c?.name || 'Agent'} tries it (Dex + Stealth)
          </button>
          <button className="small ghost" onClick={() => say([sabotageRoll(ch('Com') + ab('intrigue'), sentry, sentries, SABOTAGE[sab].bonus).text, 'A hired agent: the hirer’s Communication + Intrigue stands in; a pound in advance.'])}>
            A hired agent (Com + Intrigue)
          </button>
        </div>
      </details>

      <details>
        <summary className="small">Intrigue against the powerful</summary>
        <RulesNote book="CG" line={3457} endLine={3489}>
          Intelligence + Intrigue to learn about a noble, or harm them through gossip, forgeries and their enemies. Above Ease 6 it takes three times the Ease Factor in days and at least a third of
          it in pounds. A blameless life is armor against it.
        </RulesNote>
        <div className="row tight small">
          <select value={ease} onChange={(e) => setEase(Number(e.target.value))}>
            {INDIRECT_INTRIGUE.map((x) => (
              <option key={x.ease} value={x.ease}>
                Ease {x.ease}
              </option>
            ))}
          </select>
          <button className="small ghost" onClick={() => say([indirectRoll(ch('Int'), ab('intrigue'), ease).text])}>
            Roll Int + Intrigue
          </button>
          {ease > 6 && <PayButtons pounds={Math.ceil(ease / 3)} what={`Intrigue (Ease ${ease})`} />}
        </div>
        <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {INDIRECT_INTRIGUE.find((x) => x.ease === ease)?.what.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </details>

      <details>
        <summary className="small">A house&apos;s Reputation, largesse and warehouses</summary>
        <RulesNote book="CG" line={3361} endLine={3440}>
          A house&apos;s servants carry its Reputation and add to it. Advocates cost 5% of their usual wage and shift a Reputation by 1 among those they meet (three at most for anyone). A festival
          gives a point of Reputation experience per pound for every thousand people; a marvelous public building acts as an advocate while it stands.
        </RulesNote>
        <div className="row tight small">
          Festival
          <Stepper value={festival} min={0} max={1000} width={40} onChange={setFestival} /> £ in a town of
          <Stepper value={population} min={500} max={100000} step={500} width={60} onChange={setPopulation} />
          <b>{festivalXp(festival, population)} Reputation experience</b>
          <PayButtons pounds={festival} what="A festival (largesse)" />
        </div>
        <div className="small" style={{ marginTop: 4 }}>
          Public buildings: {LARGESSE_BUILDINGS.map((b) => `${b.label.toLowerCase()} ${b.pounds} £`).join(', ')}.
        </div>
        <div className="row tight small" style={{ marginTop: 4 }}>
          A warehouse for
          <Stepper value={tons} min={10} max={5000} step={10} width={50} onChange={setTons} /> tons: {warehouse(tons).pounds} £ to build, {warehouse(tons).guards} guards, day and night shifts.
        </div>
      </details>

      <details>
        <summary className="small">A dowry</summary>
        <div className="row tight small">
          Father&apos;s yearly profit
          <Stepper value={profit} min={0} max={1000} width={44} onChange={setProfit} /> £; children at home
          <Stepper value={children} min={1} max={15} width={30} onChange={setChildren} />; his Social Status above the groom&apos;s
          <Stepper value={above} min={0} max={3} width={30} onChange={setAbove} />
        </div>
        <div className="small">{dowry(profit, children, above).text}</div>
      </details>

      {out.map((l, i) => (
        <div key={i} className="small" style={{ marginTop: 4 }}>
          {l}
        </div>
      ))}
    </Card>
  );
}
