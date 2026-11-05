// City & Guild at the table: a journey's days and cost, cargo, Area Lore, ships in a fight; bribes,
// hired criminals, sabotage and intrigue against the powerful; a house's Reputation; dowries.

import { useState } from 'react';
import type { DerivedCharacter } from '../../engine/character/derive';
import { abilityTotal } from '../../engine/character/derive';
import { pct, simpleChance, simpleDie, stressChance, stressContestChance } from '../../engine/dice';
import { lsd } from '../../engine/economy';
import {
  AREA_LORE_EASE, CARRIERS, CG_BRIBES, INDIRECT_INTRIGUE, LARGESSE_BUILDINGS, SABOTAGE, SKULLDUGGERY, TRAVEL_MODES, captainsRoll, dowry, festivalXp, indirectRoll, journey, proxyRoll,
  sabotageRoll, shipBlow, warehouse,
} from '../../engine/trade';
import type { Character, Covenant, Season } from '../../engine/types';
import { purseOf } from '../../engine/vis';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Field, Stepper, signed } from '../kit';
import { RulesNote } from '../RulesNote';

export function TravelTradeCard({ people, derived, home, year, season }: { people: Character[]; derived: Map<string, DerivedCharacter>; home?: Covenant; year: number; season: Season }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [who, setWho] = useState('');
  // each section's last result, shown in that section (not at the foot of the card)
  const [out, setOut] = useState<{ at: string; lines: string[] }>({ at: '', lines: [] });
  const [away, setAway] = useState(false);
  const [crew, setCrew] = useState(0);
  const [profession, setProfession] = useState('');
  // travel
  const [miles, setMiles] = useState(100);
  const [mode, setMode] = useState('cargo');
  const [party, setParty] = useState(8);
  const [magi, setMagi] = useState(0);
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

  // the one chosen, else the character a tutorial is working on, else the first
  const tourChar = useStore((s) => s.ui.tour?.charId);
  const c = people.find((x) => x.id === who) ?? people.find((x) => x.id === tourChar) ?? people[0];
  const d = c ? derived.get(c.id) : undefined;
  const ch = (k: 'Int' | 'Com' | 'Dex' | 'Per') => d?.characteristics[k].value ?? 0;
  const ab = (id: string) => (d ? abilityTotal(d, id) : 0);
  const name = c?.name || 'They';
  const say = (at: string, lines: string[]) => setOut({ at, lines });
  const Result = ({ at }: { at: string }) =>
    out.at === at && out.lines.length ? (
      <div className="small" style={{ marginTop: 4 }} role="status">
        {out.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    ) : null;
  // a captain's Profession: the one chosen, else Sailor or Navigator if they have it, else their best
  const profs = d ? d.abilities.filter((a) => a.abilityId === 'profession-type') : [];
  const prof = profs.find((a) => a.uid === profession) ?? profs.find((a) => /sailor|navigator|captain/i.test(a.name)) ?? [...profs].sort((a, b) => b.score - a.score)[0];
  const lore = ch('Int') + ab('area-lore') - (away ? 3 : 0);
  const captain = ch('Int') + (prof?.total ?? prof?.score ?? 0) + crew;
  const agent = ch('Dex') + ab('stealth');
  const hirer = ch('Com') + ab('intrigue');
  const schemer = ch('Int') + ab('intrigue');
  const funds = c?.purse?.pounds ?? 0;
  const trip = journey(miles, mode, party, magi);
  const crimeDef = SKULLDUGGERY.find((x) => x.id === crime)!;

  /** Pay from the chosen character's purse, or else the covenant's treasury. */
  const pay = (pounds: number, what: string, from: 'purse' | 'treasury', at: string) => {
    if (pounds <= 0) return;
    const have = from === 'purse' ? funds : home?.finances.treasury ?? 0;
    if (have + 1e-9 < pounds) return say(at, [`${from === 'purse' ? `${name}’s purse` : `${home?.name || 'The covenant'}’s treasury`} has ${lsd(have)}, not ${lsd(pounds)}: give it money on the Market page first.`]);
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
    say(at, [`${what}: ${lsd(pounds)} paid from ${from === 'purse' && c ? `${name}’s purse` : `${home?.name || 'the covenant'}’s treasury`}.`]);
  };
  const PayButtons = ({ pounds, what, at }: { pounds: number; what: string; at: string }) =>
    pounds > 0 ? (
      <span className="row tight">
        {c && (
          <button className="small ghost" title={`${name}’s purse has ${lsd(funds)}`} onClick={() => pay(pounds, what, 'purse', at)}>
            Pay {lsd(pounds)} from {name}’s purse ({lsd(funds)})
          </button>
        )}
        {home && (
          <button className="small ghost" title={`${home.name || 'The covenant'}’s treasury has ${lsd(home.finances.treasury)}`} onClick={() => pay(pounds, what, 'treasury', at)}>
            from the treasury ({lsd(home.finances.treasury)})
          </button>
        )}
      </span>
    ) : null;

  return (
    <Card title="Travel, trade and intrigue (City & Guild)" tour="table-trade" id="travel-trade">
      <div className="row small">
        <Field label="Who acts">
          <select value={c?.id ?? ''} onChange={(e) => (setWho(e.target.value), setProfession(''), setOut({ at: '', lines: [] }))}>
            {people.map((p) => {
              const y = derived.get(p.id);
              const t = (k: 'Int' | 'Com' | 'Dex', a: string) => (y ? y.characteristics[k].value + abilityTotal(y, a) : 0);
              return (
                <option key={p.id} value={p.id}>
                  {p.name || 'Unnamed'} ({p.type}) — Area Lore {signed(t('Int', 'area-lore'))}, Intrigue {signed(t('Com', 'intrigue'))}, Stealth {signed(t('Dex', 'stealth'))}
                </option>
              );
            })}
          </select>
        </Field>
      </div>
      {d && (
        <p className="small" style={{ margin: '2px 0 4px' }}>
          {name}: Intelligence {signed(ch('Int'))}, Perception {signed(ch('Per'))}, Communication {signed(ch('Com'))}, Dexterity {signed(ch('Dex'))}; Area Lore {ab('area-lore')}, Intrigue{' '}
          {ab('intrigue')}, Stealth {ab('stealth')}
          {prof ? `, ${prof.name} ${prof.total ?? prof.score}` : ''}; purse {lsd(funds)}. The rolls below add these and say the chance; open a part to use it.
        </p>
      )}

      <details>
        <summary className="small">A journey: days, cost, cargo, finding things on the way</summary>
        <RulesNote
          book="CG"
          line={2225}
          endLine={2392}
          detail={
            <>
              Sea is cheapest and fastest over distance; river travel costs twice as much, road eight to twenty times. A couple of magi and half a dozen grogs travel with a merchant for a pound a
              fortnight; known magi pay double, and few captains want them.
            </>
          }
        >
          What a journey costs by sea, river or road.
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
          <PayButtons pounds={trip.pounds[1]} what={`Passage for ${party} (${miles} miles)`} at="travel" />
          <span className="muted">Inns about every eight miles near cities; a ship chartered for a season, about 6 £.</span>
        </div>
        <table className="compact small" style={{ marginTop: 6 }}>
          <tbody>
            {CARRIERS.map((k) => (
              <tr key={k.label}>
                <td>{k.label}</td>
                <td>{k.tons}</td>
                <td>{k.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="small" style={{ marginTop: 6 }}>
          <b>Finding things on the way: {name}&apos;s Intelligence + Area Lore {signed(lore)} + a simple die</b>
          <label className="inline" style={{ marginLeft: 8 }} title="City & Guild: a townsman looking in the hinterland, or a country dweller in the city, subtracts 3">
            <input type="checkbox" checked={away} onChange={(e) => setAway(e.target.checked)} /> out of their element (−3)
          </label>
          {AREA_LORE_EASE.map((a) => (
            <div key={a.ease} className="row tight" style={{ alignItems: 'baseline', flexWrap: 'nowrap' }}>
              <button
                className="small ghost"
                style={{ flex: '0 0 auto' }}
                onClick={() => {
                  const r = simpleDie().value;
                  const t = r + lore;
                  say('travel', [`${name}: Intelligence + Area Lore ${signed(lore)} + ${r} = ${t} vs ${a.ease}: ${t >= a.ease ? 'they know where to find it, or whom to ask' : 'they do not know of one'}. Getting it cheaply or getting help still takes Charm, Bargain and the like.`]);
                }}
              >
                Ease {a.ease} ({pct(simpleChance(lore, a.ease))})
              </button>
              <span>{a.what}</span>
            </div>
          ))}
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          <b>Ships in a chase, boarding or ram:</b> each captain rolls a stress die + Intelligence + Profession, + up to 3 for an experienced crew; the winner boards, rams or slips away.
        </div>
        <div className="row tight small" style={{ marginTop: 2 }}>
          {profs.length > 1 && (
            <select value={prof?.uid ?? ''} onChange={(e) => setProfession(e.target.value)} aria-label="Profession">
              {profs.map((a) => (
                <option key={a.uid} value={a.uid}>
                  {a.name} {a.total ?? a.score}
                </option>
              ))}
            </select>
          )}
          crew
          <Stepper value={crew} min={0} max={3} width={30} onChange={setCrew} />
          <span>
            {name} as captain: {signed(captain)} ({prof ? prof.name : 'no Profession'}); the other captain&apos;s
          </span>
          <Stepper value={capB} min={-5} max={25} width={30} onChange={setCapB} />
          <button className="small" onClick={() => say('travel', [`${name}’s ship against the other: ${captainsRoll(captain, capB).text.replace('the first captain', `${name}`).replace('the second captain', 'the other captain')}`])}>
            Captains roll ({pct(stressContestChance(captain, capB))} {name} wins)
          </button>
        </div>
        <div className="row tight small" style={{ marginTop: 2 }}>
          What the winner&apos;s weapons do:
          {(['ballista', 'catapult', 'ram', 'oars'] as const).map((k) => (
            <button key={k} className="small ghost" onClick={() => say('travel', [shipBlow(k)])}>
              {k === 'oars' ? 'shear oars' : k}
            </button>
          ))}
        </div>
        <Result at="travel" />
      </details>

      <details>
        <summary className="small">Bribes, hired criminals and sabotage</summary>
        <RulesNote
          book="CG"
          line={3375}
          endLine={3428}
          detail={
            <>
              Criminals are hired with Intrigue; for a crime not played out, the hirer&apos;s Communication + Intrigue + stress die stands in for theirs. Bribes run from a week&apos;s wages for an easy
              favor to a year&apos;s for one that could cost the official the job, or 10% of the gain for regular favors.
            </>
          }
        >
          Hiring criminals, and paying bribes.
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
              <PayButtons pounds={pounds} what={`A bribe: ${b.label.toLowerCase()}`} at="crime" />
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
          <button className="small" onClick={() => say('crime', [`${crimeDef.label}: ${name}’s ${proxyRoll(ch('Com'), ab('intrigue')).text}`, `The total is the criminals’ roll for whatever the storyguide sets against it. ${crimeDef.hint}`])}>
            Hire them: {name}&apos;s Communication + Intrigue {signed(hirer)} + a stress die
          </button>
          <PayButtons pounds={crimeDef.pounds} what={crimeDef.label} at="crime" />
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
        </div>
        <div className="row tight small" style={{ marginTop: 2 }}>
          <button className="small" onClick={() => say('crime', [`${name}: ${sabotageRoll(agent, sentry, sentries, SABOTAGE[sab].bonus).text}`])}>
            {name} does it: Dexterity + Stealth {signed(agent)} ({pct(stressContestChance(agent, sentry + Math.max(0, sentries - 1) + SABOTAGE[sab].bonus, 1, 'zero'))})
          </button>
          <button className="small ghost" onClick={() => say('crime', [sabotageRoll(hirer, sentry, sentries, SABOTAGE[sab].bonus).text, `A hired agent: ${name}’s Communication + Intrigue stands in; a pound in advance.`])}>
            Hire an agent: Communication + Intrigue {signed(hirer)} ({pct(stressContestChance(hirer, sentry + Math.max(0, sentries - 1) + SABOTAGE[sab].bonus, 1, 'zero'))})
          </button>
        </div>
        <p className="small muted" style={{ margin: '2px 0 0' }}>
          Against the best sentry&apos;s Perception + Awareness + a stress die, +1 for each other sentry, + {SABOTAGE[sab].bonus} for {SABOTAGE[sab].label.toLowerCase()} ({SABOTAGE[sab].example.toLowerCase()}).
        </p>
        <Result at="crime" />
      </details>

      <details>
        <summary className="small">Intrigue against the powerful</summary>
        <RulesNote
          book="CG"
          line={3457}
          endLine={3489}
          detail={
            <>
              Intelligence + Intrigue to learn about a noble, or harm them through gossip, forgeries and their enemies. Above Ease 6 it takes three times the Ease Factor in days and at least a third of
              it in pounds. A blameless life is armor against it.
            </>
          }
        >
          Learning about a noble, or harming them, by intrigue.
        </RulesNote>
        <div className="row tight small">
          <select value={ease} onChange={(e) => setEase(Number(e.target.value))} aria-label="What they are after">
            {INDIRECT_INTRIGUE.map((x) => (
              <option key={x.ease} value={x.ease}>
                Ease {x.ease}: {x.what[0].replace(/\.$/, '').toLowerCase()}…
              </option>
            ))}
          </select>
          <button className="small" onClick={() => say('intrigue', [`${name}: ${indirectRoll(ch('Int'), ab('intrigue'), ease).text}`])}>
            {name}: Intelligence + Intrigue {signed(schemer)} + a stress die vs {ease} ({pct(stressChance(schemer, ease, 1).chance)})
          </button>
          {ease > 6 && <PayButtons pounds={Math.ceil(ease / 3)} what={`Intrigue (Ease ${ease})`} at="intrigue" />}
        </div>
        <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {INDIRECT_INTRIGUE.find((x) => x.ease === ease)?.what.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <Result at="intrigue" />
      </details>

      <details>
        <summary className="small">A house&apos;s Reputation, largesse and warehouses</summary>
        <RulesNote
          book="CG"
          line={3361}
          endLine={3440}
          detail={
            <>
              A house&apos;s servants carry its Reputation and add to it. Advocates cost 5% of their usual wage and shift a Reputation by 1 among those they meet (three at most for anyone). A festival
              gives a point of Reputation experience per pound for every thousand people; a marvelous public building acts as an advocate while it stands.
            </>
          }
        >
          Raising a house’s Reputation: servants, advocates, festivals.
        </RulesNote>
        <div className="row tight small">
          Festival
          <Stepper value={festival} min={0} max={1000} width={40} onChange={setFestival} /> £ in a town of
          <Stepper value={population} min={500} max={100000} step={500} width={60} onChange={setPopulation} />
          <b>{festivalXp(festival, population)} Reputation experience</b>
          <PayButtons pounds={festival} what="A festival (largesse)" at="house" />
        </div>
        <div className="small" style={{ marginTop: 4 }}>
          Public buildings: {LARGESSE_BUILDINGS.map((b) => `${b.label.toLowerCase()} ${b.pounds} £`).join(', ')}.
        </div>
        <div className="row tight small" style={{ marginTop: 4 }}>
          A warehouse for
          <Stepper value={tons} min={10} max={5000} step={10} width={50} onChange={setTons} /> tons: {warehouse(tons).pounds} £ to build, {warehouse(tons).guards} guards, day and night shifts.
        </div>
        <Result at="house" />
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

    </Card>
  );
}
