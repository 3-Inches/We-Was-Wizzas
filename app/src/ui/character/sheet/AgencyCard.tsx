// A character's agency (Houses of Hermes: Societates, Appendix: Agencies): agents, their Bond and
// Resistance, recruiting with agency experience, gifts, and asking one to do something.

import { useState } from 'react';
import { AGENT_RISKS, AGENT_TASKS, AGENT_TIMEFRAMES, STATUS_RESISTANCE, addAgencyXp, giftToAgent, maxAgents, persuasionRoll } from '../../../engine/agency';
import type { Agent } from '../../../engine/types';
import { purseOf } from '../../../engine/vis';
import { uid } from '../../../util/id';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';
import { optionOn } from '../../../engine/optional';

export function AgencyCard({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga } = ed;
  const [log, setLog] = useState<string[]>([]);
  const [task, setTask] = useState(0);
  const [timeframe, setTimeframe] = useState(0);
  const [risk, setRisk] = useState(0);
  const [xp, setXp] = useState(3);
  const [pounds, setPounds] = useState(1);
  if (!c || !d) return null;
  if (!optionOn(saga, 'agents') && !(c.agents ?? []).length) return null;
  const agents = c.agents ?? [];
  const recruited = agents.filter((a) => a.resistance <= 0);
  const max = maxAgents(d);
  const note = (t: string) => setLog((l) => [t, ...l].slice(0, 8));
  const set = (u: string, fn: (a: Agent) => void) => update((x) => { const a = x.agents?.find((y) => y.uid === u); if (a) fn(a); });
  const add = (resistance: number) =>
    update((x) => void (x.agents = [...(x.agents ?? []), { uid: uid(), name: '', status: '', resources: '', bondTrait: 'Loyal', bond: resistance > 0 ? 0 : 1, resistance: Math.max(0, resistance) }]));

  return (
    <Card title={`Agents (${recruited.length} of ${max})`} tour="agents">
      <RulesNote book="HoH_S" line={5647} endLine={5836}>
        People bound to help by loyalty, fear, gratitude or blackmail.{recruited.length > max ? ' More than this character can manage: expect stories.' : ''}
      </RulesNote>
      {agents.map((a) => (
        <div key={a.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row">
            <input value={a.name} placeholder="Name" onChange={(e) => set(a.uid, (x) => void (x.name = e.target.value))} style={{ flex: '1 1 120px' }} />
            <input value={a.status} placeholder="Social Status" onChange={(e) => set(a.uid, (x) => void (x.status = e.target.value))} style={{ flex: '1 1 120px' }} />
            {a.resistance > 0 ? (
              <span className="badge warn">recruiting: Resistance {a.resistance}</span>
            ) : (
              <span className="row tight small">
                Bond:
                <input value={a.bondTrait} onChange={(e) => set(a.uid, (x) => void (x.bondTrait = e.target.value))} style={{ width: 110 }} />
                <Stepper value={a.bond} min={-3} max={6} width={32} onChange={(v) => set(a.uid, (x) => void (x.bond = v))} />
              </span>
            )}
            <button className="small primary" disabled={a.resistance > 0 || a.bond < 1} onClick={() => note(`${a.name || 'Agent'}: ${persuasionRoll(d, a, task, timeframe, risk).text}`)}>
              Ask
            </button>
            <button className="small" onClick={() => { let t = ''; set(a.uid, (x) => void (t = addAgencyXp(x, xp))); note(t); }} title="Agency experience from a story spent on this agent">
              +{xp} agency xp
            </button>
            <button
              className="small ghost"
              disabled={a.resistance > 0 || a.bond >= 3 || purseOf(structuredClone(c)).pounds < pounds}
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
              title="Gifts worth this many pounds, from the purse"
            >
              Gift {pounds} £
            </button>
            <button className="small ghost" onClick={() => update((x) => void (x.agents = (x.agents ?? []).filter((y) => y.uid !== a.uid)))}>
              ✕
            </button>
          </div>
          <input value={a.resources} placeholder="What they can do or give: Abilities, wealth, influence, underlings…" onChange={(e) => set(a.uid, (x) => void (x.resources = e.target.value))} />
        </div>
      ))}
      <div className="row" style={{ marginTop: 8 }}>
        <Field label="A would-be agent's Social Status" hint="Their Resistance; resources and inconvenient Flaws change it (at least 1)">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value !== '') add(Math.max(1, Number(e.target.value)));
            }}
          >
            <option value="">+ Recruit someone…</option>
            {STATUS_RESISTANCE.map((s) => (
              <option key={s.label} value={s.value}>
                {s.label}: Resistance {Math.max(1, s.value)}
              </option>
            ))}
          </select>
        </Field>
        <button className="small ghost" onClick={() => add(0)} title="An agent from a Virtue or Flaw at creation, or a story reward">
          + Agent already bound
        </button>
      </div>
      {recruited.length > 0 && (
        <div className="row" style={{ marginTop: 8 }}>
          <Field label="Ask for">
            <select value={task} onChange={(e) => setTask(Number(e.target.value))}>
              {AGENT_TASKS.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label} ({t.ease})
                </option>
              ))}
            </select>
          </Field>
          <Field label="When">
            <select value={timeframe} onChange={(e) => setTimeframe(Number(e.target.value))}>
              {AGENT_TIMEFRAMES.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label} (+{t.mod})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Risk to the agent">
            <select value={risk} onChange={(e) => setRisk(Number(e.target.value))}>
              {AGENT_RISKS.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label} (+{t.mod})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agency xp to give">
            <Stepper value={xp} min={1} max={30} width={36} onChange={setXp} />
          </Field>
          <Field label="Gift (£)">
            <Stepper value={pounds} min={1} max={20} width={36} onChange={setPounds} />
          </Field>
        </div>
      )}
      {log.map((l, i) => (
        <div key={i} className="small list-row">
          {l}
        </div>
      ))}
    </Card>
  );
}
