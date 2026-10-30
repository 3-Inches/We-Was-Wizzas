// Society: the optional social contests a troupe uses, each folded until needed: petitioning the
// Church, a quick trial, an etiquette performance, and a debate against another character.

import { useMemo, useState } from 'react';
import { deriveCharacter } from '../../../engine/character/derive';
import { optionOn } from '../../../engine/optional';
import {
  ARGUMENT_STRENGTH, DEBATE_ATTACK, DEBATE_DEFENSE, DEBATE_NAMES, PETITIONS, PETITION_CLERGY, PETITION_LAY, courtDecision, debateAttack, debateVotes, debaterOf, etiquetteRoll, petitionArgument, petitionTotal,
  type DebateAttack, type DebateDefense, type Debater,
} from '../../../engine/society';
import { defaultRng, stressDie } from '../../../engine/dice';
import { useSagaCharacters } from '../../../store/hooks';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';

export function SocietyCard({ ed }: { ed: CharEditor }) {
  const { c, saga } = ed;
  if (!c || !saga || c.type === 'grog') return null;
  const tools = { petitions: optionOn(saga, 'petitions'), courts: optionOn(saga, 'courts'), etiquette: optionOn(saga, 'etiquette'), debate: optionOn(saga, 'debate') };
  if (!Object.values(tools).some(Boolean)) return null;
  return (
    <Card title="Society" tour="society">
      <div className="stack" style={{ gap: 4 }}>
        {tools.debate && <DebateTool ed={ed} />}
        {tools.petitions && <PetitionTool ed={ed} />}
        {tools.courts && <CourtTool ed={ed} />}
        {tools.etiquette && <EtiquetteTool ed={ed} />}
      </div>
    </Card>
  );
}

function Log({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((t, i) => (
        <div key={i} className="small">{t}</div>
      ))}
    </>
  );
}

function PetitionTool({ ed }: { ed: CharEditor }) {
  const { d } = ed;
  const [audience, setAudience] = useState(false);
  const [ease, setEase] = useState(9);
  const [clergy, setClergy] = useState(0);
  const [lay, setLay] = useState(0);
  const [extra, setExtra] = useState({ testimony: false, vision: false, miracle: false, donation: 0, reputation: 0, magic: 0 });
  const [argAbility, setArgAbility] = useState('civil-and-canon-law');
  const [argBonus, setArgBonus] = useState(2);
  const [argument, setArgument] = useState<{ value: number; text: string } | null>(null);
  if (!d) return null;
  const support = PETITION_CLERGY[clergy].value + PETITION_LAY[lay].value + (extra.testimony ? 1 : 0) + (extra.vision ? 3 : 0) + (extra.miracle ? 6 : 0) + extra.donation + extra.reputation + extra.magic + (argument?.value ?? 0);
  const p = petitionTotal(d, audience, support);
  const ok = p.total >= ease;
  const abilityScore = (id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
  return (
    <details>
      <summary>
        <b>Petition the Church</b> <span className="small muted">· Petition Total {p.total} vs {ease}: {ok ? 'granted' : 'refused'}</span>
      </summary>
      <RulesNote book="Church" line={1987} endLine={2106}>
        {audience ? 'Pre' : 'Com'} {audience ? d.characteristics.Pre.value : d.characteristics.Com.value} + Church Lore {p.lore}{p.gift ? ` ${p.gift} (the Gift)` : ''} + support {support}. No die; one petition a season. A bishop decides up to 15, a priest up to 6.
      </RulesNote>
      <div className="row">
        <Field label="How">
          <select value={audience ? 'a' : 'w'} onChange={(e) => setAudience(e.target.value === 'a')}>
            <option value="w">In writing (Com)</option>
            <option value="a">In audience (Pre)</option>
          </select>
        </Field>
        <Field label="Request">
          <select value={ease} onChange={(e) => setEase(Number(e.target.value))} style={{ maxWidth: 260 }}>
            {PETITIONS.map((x) => (
              <option key={x.ease} value={x.ease}>{x.ease}: {x.text}</option>
            ))}
          </select>
        </Field>
        <Field label="Clergy supporting">
          <select value={clergy} onChange={(e) => setClergy(Number(e.target.value))}>
            {PETITION_CLERGY.map((x, i) => (
              <option key={i} value={i}>{x.label}{x.value ? ` (+${x.value})` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="Lay supporter">
          <select value={lay} onChange={(e) => setLay(Number(e.target.value))}>
            {PETITION_LAY.map((x, i) => (
              <option key={i} value={i}>{x.label}{x.value ? ` (+${x.value})` : ''}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="row">
        <label className="inline small"><input type="checkbox" checked={extra.testimony} onChange={(e) => setExtra({ ...extra, testimony: e.target.checked })} /> many witnesses or magical evidence (+1)</label>
        <label className="inline small"><input type="checkbox" checked={extra.vision} onChange={(e) => setExtra({ ...extra, vision: e.target.checked })} /> a holy vision (+3)</label>
        <label className="inline small"><input type="checkbox" checked={extra.miracle} onChange={(e) => setExtra({ ...extra, miracle: e.target.checked })} /> miracles (+6)</label>
        <Field label="Donation"><Stepper value={extra.donation} min={0} max={3} onChange={(v) => setExtra({ ...extra, donation: v })} /></Field>
        <Field label="Church Reputation"><Stepper value={extra.reputation} min={-10} max={10} onChange={(v) => setExtra({ ...extra, reputation: v })} /></Field>
        <Field label="Spells on the clergy"><Stepper value={extra.magic} min={0} max={10} onChange={(v) => setExtra({ ...extra, magic: v })} /></Field>
      </div>
      <div className="row">
        <Field label="An argument">
          <select value={argAbility} onChange={(e) => { setArgAbility(e.target.value); setArgument(null); }}>
            <option value="civil-and-canon-law">from law</option>
            <option value="artes-liberales">from logic</option>
            <option value="intrigue">from intrigue</option>
          </select>
        </Field>
        <Field label="Worth"><Stepper value={argBonus} min={1} max={3} onChange={(v) => { setArgBonus(v); setArgument(null); }} title="Its bonus, +1 to +3" /></Field>
        <button className="small" onClick={() => setArgument(petitionArgument(d.characteristics.Int.value, abilityScore(argAbility), argBonus))}>
          Make the argument (Int + {abilityScore(argAbility)} vs 9)
        </button>
        {argument && <span className="small">{argument.text}</span>}
      </div>
    </details>
  );
}

function CourtTool({ ed }: { ed: CharEditor }) {
  const { d } = ed;
  const [o, setO] = useState({ innocent: false, badReputation: false, witnessesAgainst: false });
  const [log, setLog] = useState<string[]>([]);
  if (!d) return null;
  const law = Math.max(...['civil-and-canon-law', 'common-law'].map((id) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0)));
  return (
    <details>
      <summary><b>A quick trial</b></summary>
      <RulesNote book="CG" line={903} endLine={920}>
        For the defendant or a proxy: Com + Civil and Canon Law (Common Law in England) + stress die against 6; the Gift’s penalty applies.
      </RulesNote>
      <div className="row">
        <label className="inline small"><input type="checkbox" checked={o.innocent} onChange={(e) => setO({ ...o, innocent: e.target.checked })} /> truly innocent (−3)</label>
        <label className="inline small"><input type="checkbox" checked={o.badReputation} onChange={(e) => setO({ ...o, badReputation: e.target.checked })} /> bad reputation in the court (+3)</label>
        <label className="inline small"><input type="checkbox" checked={o.witnessesAgainst} onChange={(e) => setO({ ...o, witnessesAgainst: e.target.checked })} /> most credible witnesses against (+3)</label>
        <button className="small" onClick={() => setLog((l) => [courtDecision(d, { ...o, ability: law }).text, ...l].slice(0, 4))}>Roll the verdict</button>
      </div>
      <Log lines={log} />
    </details>
  );
}

function EtiquetteTool({ ed }: { ed: CharEditor }) {
  const { d } = ed;
  const [ease, setEase] = useState(9);
  const [bonus, setBonus] = useState(0);
  const [mine, setMine] = useState(0);
  const [theirs, setTheirs] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  if (!d) return null;
  const et = d.abilities.find((a) => a.abilityId === 'etiquette')?.total ?? 0;
  return (
    <details>
      <summary><b>Etiquette</b> <span className="small muted">· Com + Etiquette {d.characteristics.Com.value + et}</span></summary>
      <RulesNote book="HoH_S" line={2137} endLine={2187}>
        The host sets the Ease Factor (6 to 21). In a duel each side chooses a penalty up to their Etiquette, and both rolls lose the sum.
      </RulesNote>
      <div className="row">
        <Field label="Ease Factor"><Stepper value={ease} min={6} max={21} onChange={setEase} /></Field>
        <Field label="Gifts or money" hint={`up to Etiquette ${et}`}><Stepper value={bonus} min={0} max={10} onChange={setBonus} /></Field>
        <Field label="Duel: my rudeness"><Stepper value={mine} min={0} max={Math.max(0, et)} onChange={setMine} /></Field>
        <Field label="their rudeness"><Stepper value={theirs} min={0} max={10} onChange={setTheirs} /></Field>
        <button className="small" onClick={() => setLog((l) => [etiquetteRoll(d, ease, bonus, mine + theirs).text, ...l].slice(0, 4))}>Perform</button>
      </div>
      <Log lines={log} />
    </details>
  );
}

const MANUAL: Debater = { name: 'The opponent', per: 1, com: 1, int: 1, pre: 1, abilities: { 'folk-ken': 3, intrigue: 3, 'artes-liberales': 3, charm: 3, guile: 3, leadership: 3 }, resistance: 3, clearThinker: false, giftPenalty: 0, lost: 0 };

function DebateTool({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga } = ed;
  const others = useSagaCharacters(c?.sagaId);
  const [oppId, setOppId] = useState('');
  const [mundane, setMundane] = useState(false);
  const [lost, setLost] = useState<[number, number]>([0, 0]);
  const [round, setRound] = useState(0);
  const [mine, setMine] = useState<{ a: DebateAttack; d: DebateDefense }>({ a: 'artes-liberales', d: 'charm' });
  const [theirs, setTheirs] = useState<{ a: DebateAttack; d: DebateDefense }>({ a: 'folk-ken', d: 'leadership' });
  const [testimony, setTestimony] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [votes, setVotes] = useState({ allies: 10, neutral: 20, hostile: 10, penalty: 0 });
  const opp = useMemo(() => {
    const t = others.find((x) => x.id === oppId);
    return t && saga ? debaterOf(deriveCharacter(t, data, saga.houseRules), t.name || 'Opponent') : { ...MANUAL };
  }, [others, oppId, data, saga]);
  if (!c || !d) return null;
  const me = { ...debaterOf(d, c.name || 'This character', mundane), lost: lost[0] };
  const them = { ...opp, lost: lost[1] };
  const over = lost[0] >= 5 || lost[1] >= 5;
  const fight = () => {
    const ri = stressDie(0, defaultRng, true).value + me.per;
    const ti = stressDie(0, defaultRng, true).value + them.per;
    const order: ('me' | 'them')[] = ri >= ti ? ['me', 'them'] : ['them', 'me'];
    const l: [number, number] = [...lost];
    const lines: string[] = [`Round ${round + 1}: initiative ${me.name} ${ri}, ${them.name} ${ti}.`];
    for (const who of order) {
      if (l[0] >= 5 || l[1] >= 5) break;
      const x = who === 'me' ? debateAttack({ ...me, lost: l[0] }, { ...them, lost: l[1] }, mine.a, theirs.d, testimony) : debateAttack({ ...them, lost: l[1] }, { ...me, lost: l[0] }, theirs.a, mine.d);
      if (who === 'me') l[1] += x.lost;
      else l[0] += x.lost;
      lines.push(x.text);
    }
    setLost(l);
    setRound(round + 1);
    setTestimony(0);
    setLog((g) => [...lines, ...g].slice(0, 12));
  };
  const strength = Math.abs(lost[0] - lost[1]);
  const winner = lost[0] < lost[1] ? me.name : lost[1] < lost[0] ? them.name : '';
  const v = debateVotes(Math.max(0, strength - votes.penalty), votes.allies, votes.neutral, votes.hostile);
  const pick = (val: string, set: (x: string) => void, list: readonly string[], label: string) => (
    <Field label={label}>
      <select value={val} onChange={(e) => set(e.target.value)}>
        {list.map((x) => (
          <option key={x} value={x}>{DEBATE_NAMES[x]}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <details>
      <summary>
        <b>Debate</b> <span className="small muted">{round ? `· round ${round}: ${me.name} −${lost[0]}, ${them.name} −${lost[1]}` : '· argue a case like certamen'}</span>
      </summary>
      <RulesNote
        book="HoH_S"
        line={3711}
        endLine={3850}
        detail={
          <>
            Attack: Com + Folk Ken, Intrigue or Artes Liberales; defense: Int + Charm, Guile or Leadership. Beating the defense by the Advantage, Presence + Advantage against Reputation + Confidence costs debate Fatigue; five levels ends it.
          </>
        }
      >
        A debate is fought like certamen, with words instead of magic.
      </RulesNote>
      <div className="row">
        <Field label="Against">
          <select value={oppId} onChange={(e) => { setOppId(e.target.value); setLost([0, 0]); setRound(0); setLog([]); }}>
            <option value="">an opponent played by the storyguide (3s)</option>
            {others.filter((x) => x.id !== c.id).map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </Field>
        <label className="inline small" title="The Gift's penalty applies to a magus's Defense before mundane witnesses">
          <input type="checkbox" checked={mundane} onChange={(e) => setMundane(e.target.checked)} /> before mundanes
        </label>
      </div>
      <div className="row">
        <b className="small" style={{ alignSelf: 'center' }}>{me.name}</b>
        {pick(mine.a, (x) => setMine({ ...mine, a: x as DebateAttack }), DEBATE_ATTACK, 'Attack')}
        {pick(mine.d, (x) => setMine({ ...mine, d: x as DebateDefense }), DEBATE_DEFENSE, 'Defense')}
        <Field label="Testimony"><Stepper value={testimony} min={0} max={6} onChange={setTestimony} title="written or mundane +1, inferior +2, a peer +3, Quaesitor-ratified +3 more; once each" /></Field>
      </div>
      <div className="row">
        <b className="small" style={{ alignSelf: 'center' }}>{them.name}</b>
        {pick(theirs.a, (x) => setTheirs({ ...theirs, a: x as DebateAttack }), DEBATE_ATTACK, 'Attack')}
        {pick(theirs.d, (x) => setTheirs({ ...theirs, d: x as DebateDefense }), DEBATE_DEFENSE, 'Defense')}
        <button className="small primary" disabled={over} onClick={fight}>Debate a round</button>
        <button className="small ghost" onClick={() => { setLost([0, 0]); setRound(0); setLog([]); }}>Start over</button>
      </div>
      <Log lines={log} />
      {round > 0 && (
        <div className="stack" style={{ gap: 2, marginTop: 4 }}>
          <div className="small">
            <b>{winner ? `${winner} wins` : 'Even so far'}</b>: Argument Strength {strength} ({ARGUMENT_STRENGTH[Math.min(7, strength)].label}).
          </div>
          <div className="row">
            <Field label="Winner’s allies"><Stepper value={votes.allies} min={0} onChange={(x) => setVotes({ ...votes, allies: x })} /></Field>
            <Field label="Neutral votes"><Stepper value={votes.neutral} min={0} onChange={(x) => setVotes({ ...votes, neutral: x })} /></Field>
            <Field label="Loser’s allies"><Stepper value={votes.hostile} min={0} onChange={(x) => setVotes({ ...votes, hostile: x })} /></Field>
            <Field label="Proposal" hint="clarification 0, addition −1, alteration −3; −1 more at Grand Tribunal">
              <Stepper value={votes.penalty} min={0} max={4} onChange={(x) => setVotes({ ...votes, penalty: x })} />
            </Field>
          </div>
          {winner && <div className="small">The vote: {v.winner} for {winner}, {v.loser} against, {v.abstain} abstain.</div>}
        </div>
      )}
    </details>
  );
}
