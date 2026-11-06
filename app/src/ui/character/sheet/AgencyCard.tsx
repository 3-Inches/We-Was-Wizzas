// A character's agency (Houses of Hermes: Societates, Appendix: Agencies), in three steps a reader can
// follow: a would-be agent is first impressed (a roll), then won over (experience from stories wears
// their Resistance down, a point at a time), and once bound their Bond grows the same way, or with
// gifts, up to +3; a bound agent with a Bond of +1 or more can be asked for things (a persuasion roll
// against the task's Ease). Each season they may also bring their principal what they heard (the
// Society & the Tribunal page's news). At the Game Table the rolls are made and the experience spent;
// a character being built sets up the agency a Virtue gives; a finished sheet shows it as it stands.

import { useState } from 'react';
import { AGENCY_POINTS, AGENCY_VIRTUES, AGENT_RISKS, AGENT_TASKS, AGENT_TIMEFRAMES, RESISTANCE_MODIFIERS, STATUS_RESISTANCE, addAgencyXp, agencyCost, giftToAgent, impressRoll, maxAgents, persuasionRoll } from '../../../engine/agency';
import type { DerivedCharacter } from '../../../engine/character/derive';
import { optionOn } from '../../../engine/optional';
import type { Agent, Character, Season } from '../../../engine/types';
import { purseOf } from '../../../engine/vis';
import { uid } from '../../../util/id';
import { AfterRoll } from '../../AfterRoll';
import { Card, Field, Stepper, signed } from '../../kit';
import { ResultLog, RollAtTable, useAtTable, useEditable } from '../../play';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';

/** What binds an agent (a Personality Trait of theirs): the usual ones. */
export const BOND_TRAITS = ['Loyal', 'Grateful', 'Indebted', 'Devoted', 'Ambitious', 'Fearful', 'Blackmailed', 'In love', 'Bribed', 'Kinship'];
/** What an agent might do: suggestions for the role field. */
const ROLES = ['Merchant', 'Priest', 'Monk or nun', 'Knight', 'Steward', 'Castellan', 'Innkeeper', 'Guild master', 'Clerk', 'Soldier', 'Thief', 'Beggar', 'Physician', 'Scholar', 'Courtier', 'Redcap', 'Village headman', 'Servant in a great house'];

/** Points toward the next step: Resistance wears down by its own value; a Bond rises by the next score's. */
function progress(a: Agent): { need: number; have: number; next: string } {
  if (a.resistance > 0) return { need: a.resistance, have: a.xp ?? 0, next: `Resistance ${a.resistance - 1}` };
  return { need: a.bond + 1, have: a.xp ?? 0, next: `Bond ${signed(a.bond + 1)}` };
}

export function AgencyCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, saga } = ed;
  const atTable = useAtTable();
  const edit = useEditable(c);
  const [log, setLog] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  if (!c || !d) return null;
  if (!optionOn(saga, 'agents') && !(c.agents ?? []).length) return null;
  if (!edit) return <AgentsReference c={c} max={maxAgents(d)} />;
  const agents = c.agents ?? [];
  const bound = agents.filter((a) => a.resistance <= 0 && a.bond >= 0);
  const max = maxAgents(d);
  const note = (t: string) => setLog((l) => [t, ...l].slice(0, 10));
  const set = (u: string, fn: (a: Agent) => void) => update((x) => void ((x.agents ?? []).forEach((a) => a.uid === u && fn(a))));
  // the agency a Virtue or Flaw brings at creation: twelve agency points, each agent its Bond + Resistance Strength
  const agencyVirtue = c.virtues.find((v) => AGENCY_VIRTUES.includes(v.defId));
  const spent = agents.filter((a) => a.fromCreation).reduce((t, a) => t + agencyCost(a), 0);

  return (
    <Card title={`${c.name ? `${c.name}’s agents` : 'Agents'} (${bound.length} of ${max})`} tour="agents">
      <RulesNote book="HoH_S" line={5647} endLine={5836}>
        People bound to help by loyalty, fear, gratitude or blackmail. {c.name || 'This character'} can manage {max} at once (twice Presence + Intrigue or Leadership, less the
        Gift&apos;s penalty).{bound.length > max ? ' More than that: expect stories, and let some go.' : ''}
      </RulesNote>
      <ol className="small agent-steps">
        <li>
          <b>Make an impression</b>: a roll of Presence + Leadership against 6 before someone can be won over.
        </li>
        <li>
          <b>Win them over</b>: each story spent on them gives <i>agency experience</i> equal to the story&apos;s Adventure experience. Their Resistance falls by one each time
          the experience reaches it; at nothing, they are an agent.
        </li>
        <li>
          <b>Strengthen the Bond</b> the same way (the next Bond in experience), or with gifts (5 experience a pound, up to +3). With a Bond of +1 or more, <b>ask</b> them for
          information or a task. Each season they may send word of what they heard.
        </li>
      </ol>
      {agencyVirtue && (
        <div className="row small" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
          <span className={spent > AGENCY_POINTS ? 'bad-text' : ''}>
            Starting agency ({data.vfById.get(agencyVirtue.defId)?.name}): {spent} of {AGENCY_POINTS} agency points spent, each agent its Bond + Resistance Strength (at least 1).
          </span>
          <button className="small" onClick={() => update((x) => void (x.agents = [...(x.agents ?? []), { uid: uid(), name: '', status: '', resources: '', bondTrait: 'Loyal', bond: 1, resistance: 0, fromCreation: true, strength: 0, impressed: true }]))}>
            + Agent from the agency
          </button>
        </div>
      )}
      {agents.length === 0 && <div className="small muted">No agents yet.</div>}
      {agents.map((a) => (
        <AgentRow key={a.uid} c={c} d={d} a={a} now={{ year: saga?.currentYear ?? 0, season: saga?.currentSeason ?? 'Spring' }} set={(fn) => set(a.uid, fn)} remove={() => update((x) => void (x.agents = (x.agents ?? []).filter((y) => y.uid !== a.uid)))} note={note} atTable={atTable} update={update} />
      ))}
      {adding ? (
        <Recruit
          onCancel={() => setAdding(false)}
          onAdd={(a) => {
            update((x) => void (x.agents = [...(x.agents ?? []), a]));
            setAdding(false);
            note(a.resistance > 0 ? `${a.name || 'Someone'}: recruiting begins, Resistance ${a.resistance}.` : `${a.name || 'An agent'} joins the agency, Bond +1.`);
          }}
        />
      ) : (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="small" onClick={() => setAdding(true)}>
            + Recruit someone…
          </button>
        </div>
      )}
      <ResultLog lines={log} />
      {!atTable && agents.length > 0 && <RollAtTable sagaId={c.sagaId} who={c.id} where="agents" what="Impressing a would-be agent, winning them over and asking an agent for something" />}
    </Card>
  );
}

/** One agent, or would-be agent: who they are, where they stand, and what can be done now. */
function AgentRow({ c, d, a, now, set, remove, note, atTable, update }: { c: Character; d: DerivedCharacter; a: Agent; now: { year: number; season: Season }; set: (fn: (a: Agent) => void) => void; remove: () => void; note: (t: string) => void; atTable: boolean; update: CharEditor['update'] }) {
  const [xp, setXp] = useState(5);
  const [pounds, setPounds] = useState(1);
  const [ask, setAsk] = useState(false);
  const [q, setQ] = useState({ task: 0, timeframe: 0, risk: 0 });
  const [roll, setRoll] = useState<{ id: number; base: number; ease: number; faces?: number[]; what: string } | null>(null);
  const recruiting = a.resistance > 0;
  const left = !recruiting && a.bond < 0;
  const p = progress(a);
  const name = a.name || (recruiting ? 'The would-be agent' : 'The agent');
  const purse = c.purse?.pounds ?? 0;
  const spend = () => {
    let t = '';
    set((x) => void (t = addAgencyXp(x, xp)));
    note(`${t} (${xp} agency experience from a story)`);
  };
  return (
    <div className="agent" data-tour="agent-row">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <input value={a.name} placeholder="Name" onChange={(e) => set((x) => void (x.name = e.target.value))} style={{ flex: '1 1 130px' }} aria-label="The agent's name" />
        <select value={STATUS_RESISTANCE.find((s) => s.label === a.status) ? a.status : ''} onChange={(e) => set((x) => void (x.status = e.target.value))} aria-label="Their Social Status" style={{ flex: '1 1 160px' }}>
          <option value="">{a.status && !STATUS_RESISTANCE.find((s) => s.label === a.status) ? a.status : '— their Social Status —'}</option>
          {STATUS_RESISTANCE.map((s) => (
            <option key={s.label} value={s.label}>
              {s.label}
            </option>
          ))}
        </select>
        <input value={a.role ?? ''} placeholder="What they do" list="agent-roles" onChange={(e) => set((x) => void (x.role = e.target.value || undefined))} style={{ flex: '1 1 120px' }} aria-label="What they do" />
        <datalist id="agent-roles">
          {ROLES.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <button className="small ghost" title="Let them go, or strike them from the list" onClick={() => window.confirm(`Strike ${name} from the agency?`) && remove()}>
          ✕
        </button>
      </div>

      {recruiting ? (
        <div className="small agent-state">
          <span className="badge warn">being won over</span> Resistance <b>{a.resistance}</b>: {p.have} of {p.need} agency experience toward {p.next}.
          {!a.impressed && !a.fromCreation && <span className="muted"> First, a favorable impression.</span>}
        </div>
      ) : left ? (
        <div className="small agent-state">
          <span className="badge bad">has left the agency</span> A Bond below zero: they no longer work for {c.name || 'their principal'}.
        </div>
      ) : (
        <div className="small agent-state row tight" style={{ flexWrap: 'wrap' }}>
          <span className="badge good">agent</span> Bound by
          <select value={BOND_TRAITS.includes(a.bondTrait) ? a.bondTrait : ''} onChange={(e) => e.target.value && set((x) => void (x.bondTrait = e.target.value))} aria-label="What binds them">
            {!BOND_TRAITS.includes(a.bondTrait) && <option value="">{a.bondTrait || '—'}</option>}
            {BOND_TRAITS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <b>{signed(a.bond)}</b>
          <span className="muted">
            ({p.have} of {p.need} experience toward {p.next}){a.bond < 1 ? ': a Bond of +1 is needed before they can be asked anything' : ''}
          </span>
        </div>
      )}

      {a.fromCreation && (
        <div className="row tight small">
          From the starting agency: Resistance Strength from the table
          <Stepper value={a.strength ?? 0} min={-9} max={20} width={32} onChange={(v) => set((x) => void (x.strength = v))} />
          <span className="muted">
            costs {agencyCost(a)} point{agencyCost(a) === 1 ? '' : 's'}; Bond <Stepper value={a.bond} min={1} max={6} width={30} onChange={(v) => set((x) => void (x.bond = v))} />
          </span>
        </div>
      )}

      {atTable && !left && (
        <div className="row tight small" style={{ flexWrap: 'wrap', marginTop: 4 }}>
          {recruiting && !a.impressed && (
            <button
              className="small primary"
              title="Presence + Leadership − the Gift + a stress die, against 6"
              onClick={() => {
                const r = impressRoll(d);
                note(`${name}: a first impression: ${r.text}`);
                if (r.ok) set((x) => void (x.impressed = true));
                setRoll({ id: Date.now(), base: r.base, ease: r.ease, faces: r.faces, what: 'Impression' });
              }}
            >
              Make an impression
            </button>
          )}
          {(!recruiting || a.impressed) && (
            <>
              <span>Story experience to spend:</span>
              <Stepper value={xp} min={1} max={30} width={34} onChange={setXp} />
              <button className="small" onClick={spend} title={recruiting ? 'It wears down their Resistance' : 'It strengthens their Bond'}>
                {recruiting ? 'Win them over' : 'Strengthen the Bond'}
              </button>
            </>
          )}
          {!recruiting && a.bond < 3 && (
            <>
              <span style={{ marginLeft: 8 }}>Gift:</span>
              <Stepper value={pounds} min={1} max={20} width={30} onChange={setPounds} />
              <button
                className="small ghost"
                disabled={purse < pounds}
                title={purse < pounds ? `The purse holds ${purse} £` : 'Five agency experience a pound, never past Bond +3'}
                onClick={() => {
                  let t = '';
                  update((x) => {
                    const ag = x.agents?.find((y) => y.uid === a.uid);
                    if (!ag) return;
                    t = giftToAgent(ag, pounds);
                    purseOf(x).pounds -= pounds;
                  });
                  note(`${t} (${pounds} £ from the purse)`);
                }}
              >
                Give {pounds} £
              </button>
            </>
          )}
          {!recruiting && (
            <button className={`small ${ask ? '' : 'primary'}`} disabled={a.bond < 1} onClick={() => setAsk(!ask)} title={a.bond < 1 ? 'A Bond of +1 is needed first' : 'Information, or a task'}>
              {ask ? 'Close' : 'Ask for something…'}
            </button>
          )}
        </div>
      )}

      {atTable && ask && !recruiting && a.bond >= 1 && (
        <div className="row small agent-ask" style={{ flexWrap: 'wrap' }}>
          <Field label="Ask for">
            <select value={q.task} onChange={(e) => setQ({ ...q, task: Number(e.target.value) })}>
              {AGENT_TASKS.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="By when">
            <select value={q.timeframe} onChange={(e) => setQ({ ...q, timeframe: Number(e.target.value) })}>
              {AGENT_TIMEFRAMES.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Risk to them">
            <select value={q.risk} onChange={(e) => setQ({ ...q, risk: Number(e.target.value) })}>
              {AGENT_RISKS.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <span className="muted">
            Ease {AGENT_TASKS[q.task].ease + AGENT_TIMEFRAMES[q.timeframe].mod + AGENT_RISKS[q.risk].mod}: Communication + Charm, Intrigue or Leadership + Bond, and a {AGENT_RISKS[q.risk].botch === null ? 'simple die' : 'stress die'}.
          </span>
          <button
            className="small primary"
            onClick={() => {
              const r = persuasionRoll(d, a, q.task, q.timeframe, q.risk);
              const substantial = q.task === 1 || q.task === 2;
              const again = substantial && a.askedFor && a.askedFor.year === now.year && a.askedFor.season === now.season;
              note(`${name}: ${r.text}${again ? ' Asked for substantial information twice in a season: they think their principal a burden, and look for a way to loosen the hold.' : ''}`);
              if (substantial) set((x) => void (x.askedFor = now));
              setRoll({ id: Date.now(), base: r.base, ease: r.ease, faces: r.faces, what: 'Persuasion' });
            }}
          >
            Roll the request
          </button>
        </div>
      )}
      {atTable && roll && <AfterRoll key={roll.id} c={c} d={d} total={roll.base} ease={roll.ease} botchFaces={roll.faces} what={roll.what} onChange={(x) => note(`${name}: ${x.text}`)} />}
      <input value={a.resources} placeholder="What they can do or give: skills, wealth, influence, underlings…" onChange={(e) => set((x) => void (x.resources = e.target.value))} aria-label="What they can do or give" />
    </div>
  );
}

/** Begin recruiting someone: who they are, what changes their Resistance; or add one won in play. */
function Recruit({ onAdd, onCancel }: { onAdd: (a: Agent) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState(STATUS_RESISTANCE[2].label);
  const [mods, setMods] = useState<string[]>([]);
  const base = STATUS_RESISTANCE.find((s) => s.label === status)?.value ?? 0;
  const resistance = Math.max(1, base + RESISTANCE_MODIFIERS.filter((m) => mods.includes(m.label)).reduce((t, m) => t + m.value, 0));
  const agent = (bound: boolean): Agent => ({ uid: uid(), name, status, resources: '', bondTrait: 'Loyal', bond: bound ? 1 : 0, resistance: bound ? 0 : resistance, ...(bound ? { impressed: true } : {}), ...(mods.length ? { modifiers: mods } : {}) });
  return (
    <div className="agent agent-new" data-tour="agent-recruit">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Who" />
        </Field>
        <Field label="Their Social Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_RESISTANCE.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label} ({signed(s.value)})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <details className="small">
        <summary>What else makes them harder or easier to win ({mods.length} chosen)</summary>
        {RESISTANCE_MODIFIERS.map((m) => (
          <label key={m.label} className="inline" style={{ display: 'flex' }}>
            <input type="checkbox" checked={mods.includes(m.label)} onChange={(e) => setMods(e.target.checked ? [...mods, m.label] : mods.filter((x) => x !== m.label))} /> {signed(m.value)} {m.label}
          </label>
        ))}
      </details>
      <div className="row small" style={{ marginTop: 4, flexWrap: 'wrap' }}>
        <span>
          Resistance <b>{resistance}</b>: it takes {resistance} agency experience to bring it to {resistance - 1}, and so on down to nothing ({(resistance * (resistance + 1)) / 2} in all).
        </span>
        <button className="small primary" onClick={() => onAdd(agent(false))}>
          Begin recruiting
        </button>
        <button className="small" title="One a story bound to the character already: a rescue, a debt, a favor" onClick={() => onAdd(agent(true))}>
          Already bound by a story (Bond +1)
        </button>
        <button className="small ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** A finished sheet's agents, as they stand: who, what binds them, what they can do. Changed at the Game Table. */
function AgentsReference({ c, max }: { c: Character; max: number }) {
  const agents = c.agents ?? [];
  const recruited = agents.filter((a) => a.resistance <= 0 && a.bond >= 0);
  return (
    <Card title={`Agents (${recruited.length} of ${max})`} tour="agents">
      {agents.length === 0 && <div className="small muted">No agents.</div>}
      {agents.map((a) => (
        <div key={a.uid} className="small list-row" style={{ flexWrap: 'wrap' }}>
          <b>{a.name || 'Unnamed'}</b>
          {(a.role || a.status) && <span className="muted">{[a.role, a.status.split(' (')[0]].filter(Boolean).join(', ')}</span>}
          <span>{a.bond < 0 ? 'has left the agency' : a.resistance > 0 ? `being won over (Resistance ${a.resistance})` : `${a.bondTrait} ${signed(a.bond)}`}</span>
          {a.resources && <span className="soft" style={{ flexBasis: '100%' }}>{a.resources}</span>}
        </div>
      ))}
      <RollAtTable sagaId={c.sagaId} who={c.id} where="agents" what="Agents are won over, asked for something, given experience and let go" />
    </Card>
  );
}
