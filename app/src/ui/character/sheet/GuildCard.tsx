// Guild membership (City & Guild, ch.3): the rank, the Guild Lore it needs, the apprentice piece, a
// journeyman's contract (its Labor Points go to the workshop), the road to master, dues and the dean's stipend.

import { useState } from 'react';
import { addVirtue, removeVirtue } from '../../../engine/character/factory';
import { optionOn } from '../../../engine/optional';
import { GUILD_RANKS, apprenticePiece, guildLore, guildRank, journeymanContract, type GuildRank } from '../../../engine/society';
import { purseOf } from '../../../engine/vis';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';

const ORDER: GuildRank[] = ['apprentice', 'journeyman', 'master', 'senior', 'dean'];

export function GuildCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga, update, change } = ed;
  const [log, setLog] = useState<string[]>([]);
  const [relationship, setRelationship] = useState<-1 | 0 | 1>(0);
  const [stipend, setStipend] = useState(30);
  if (!c || !d || !saga) return null;
  const rank = guildRank(c);
  const hasCraft = d.abilities.some((a) => a.abilityId.startsWith('craft') || a.abilityId.startsWith('profession'));
  if (!optionOn(saga, 'guilds') && !c.guild) return null;
  if (!rank && !c.guild && !c.workshop && !hasCraft) return null;

  const g = c.guild ?? { name: '' };
  const r = rank ? GUILD_RANKS[rank] : undefined;
  const lore = guildLore(d, g.name);
  const age = saga.currentYear - c.birthYear;
  const trades = d.abilities.filter((a) => a.abilityId.startsWith('craft') || a.abilityId.startsWith('profession'));
  const trade = d.abilityByUid.get(c.workshop?.abilityUid ?? '') ?? trades[0];
  const craft = trade?.total ?? 0;
  const primary = d.characteristics[c.workshop?.primary ?? 'Dex'].value;
  const al = d.abilities.find((a) => a.abilityId === 'artes-liberales')?.total ?? 0;
  const note = (t: string) => setLog((l) => [t, ...l].slice(0, 6));
  const set = (fn: (x: NonNullable<typeof g>) => void) => update((x) => { x.guild = { ...g, ...(x.guild ?? {}) }; fn(x.guild); });
  // promotion in play: the new rank's Social Status Virtue takes the old one's place
  const promote = (to: GuildRank) =>
    change((x) => {
      const from = guildRank(x);
      const oldV = from ? x.virtues.find((v) => v.defId === GUILD_RANKS[from].virtue) : undefined;
      const newVirtue = GUILD_RANKS[to].virtue;
      if (oldV && oldV.defId !== newVirtue) removeVirtue(x, data, oldV.uid);
      if (!x.virtues.some((v) => v.defId === newVirtue)) addVirtue(x, data, newVirtue, undefined, undefined, { free: true, freeReason: 'Earned in play' });
      x.guild = { ...(x.guild ?? { name: '' }), rank: to, masterVote: false };
      if (x.workshop) x.workshop.guildMaster = to !== 'apprentice' && to !== 'journeyman';
      return `Now a ${GUILD_RANKS[to].label.toLowerCase()} of the ${x.guild.name || 'guild'}.`;
    });
  const next = rank ? ORDER[ORDER.indexOf(rank) + 1] : undefined;

  return (
    <Card title={`Guild${g.name ? `: ${g.name}` : ''}${r ? ` (${r.label})` : ''}`}>
      <RulesNote book="CG" line={1147} endLine={1503}>
        {r ? r.note : 'Not a guild member: a craftsman may join through stories, starting as an apprentice or, with a passed apprentice piece, a journeyman.'}
      </RulesNote>
      <div className="row">
        <Field label="Guild">
          <input value={g.name} placeholder="Carpenters, Weavers…" onChange={(e) => set((x) => void (x.name = e.target.value))} style={{ width: 150 }} />
        </Field>
        {rank && (rank === 'journeyman' || rank === 'master' || rank === 'senior') && (
          <Field label="Yearly dues (£)">
            <Stepper value={g.dues ?? 1} min={0} max={50} onChange={(v) => set((x) => void (x.dues = v))} />
          </Field>
        )}
        {!rank && (
          <>
            <button className="small" onClick={() => promote('apprentice')}>Join as apprentice</button>
            <button className="small" onClick={() => promote('journeyman')}>Join as journeyman</button>
          </>
        )}
      </div>
      {r && lore < r.lore && <div className="small bad-text">A {r.label.toLowerCase()} needs Guild Lore {r.lore} (an Organization Lore for the guild); {lore} now.</div>}
      {(rank === 'master' || rank === 'senior' || rank === 'dean') && al < 1 && <div className="small warn-text">Masters keep written contracts and inventories: they need Artes Liberales.</div>}

      {rank === 'apprentice' && (
        <div className="row">
          <button className="small" onClick={() => {
            const res = apprenticePiece(craft, primary);
            note(res.text);
            if (res.ok) promote('journeyman');
            else if (age >= 20) note('Failed at 20 or older: dismissed as incompetent (a bad Reputation, Incompetent 3, in the town).');
          }}>
            Make the apprentice piece ({trade?.name ?? 'Craft'} {craft} + {primary} + stress die vs 9)
          </button>
        </div>
      )}

      {rank === 'journeyman' && (
        <>
          <div className="row">
            <Field label="Relationship with the master">
              <select value={relationship} onChange={(e) => setRelationship(Number(e.target.value) as -1 | 0 | 1)}>
                <option value={0}>not apprenticed under the master</option>
                <option value={1}>apprenticed under the master, good terms (+1)</option>
                <option value={-1}>apprenticed under the master, poor terms (−1)</option>
              </select>
            </Field>
            <label className="inline small">
              <input type="checkbox" checked={!!g.fined} onChange={(e) => set((x) => void (x.fined = e.target.checked || undefined))} /> fined by the guild (−2)
            </label>
            <button className="small" onClick={() => {
              const res = journeymanContract({ com: d.characteristics.Com.value, bargain: d.abilities.find((a) => a.abilityId === 'bargain')?.total ?? 0, age, craft, relationship, fined: !!g.fined });
              note(res.text);
              if (res.lp !== null) update((x) => void (x.workshop && (x.workshop.contractLp = res.lp!)));
            }}>
              Bargain for a contract
            </button>
          </div>
          {c.workshop?.contractLp !== undefined && <div className="small muted">The contract gives {c.workshop.contractLp >= 0 ? '+' : ''}{c.workshop.contractLp} Labor Points a season in the workshop.</div>}
          {!c.workshop && <div className="small muted">Set up the Workshop card to put the contract’s Labor Points to work.</div>}
          <details>
            <summary className="small">Toward master</summary>
            <div className="small muted">A fee of about a year’s income, a master to put the case, and a majority of the senior masters’ votes. Masters must also be 25 or older with Craft 5.</div>
            <label className="inline small">
              <input type="checkbox" checked={!!g.masterVote} onChange={(e) => set((x) => void (x.masterVote = e.target.checked))} /> fee paid and the senior masters voted yes
            </label>{' '}
            <button className="small" disabled={!g.masterVote} onClick={() => promote('master')}>Become a master</button>
          </details>
        </>
      )}

      {rank === 'master' && (
        <div className="row">
          <span className="small muted">After ten years a master, with Craft 7 and Guild Lore 3, a senior master.</span>
          <button className="small" onClick={() => promote('senior')}>Become a senior master</button>
        </div>
      )}
      {rank === 'senior' && next === 'dean' && (
        <div className="row">
          <span className="small muted">The dean is chosen by the senior masters or the town’s lord.</span>
          <button className="small" onClick={() => promote('dean')}>Chosen as dean</button>
        </div>
      )}

      <div className="row">
        {(rank === 'journeyman' || rank === 'master' || rank === 'senior') && (
          <button className="small" disabled={g.paidYear === saga.currentYear} onClick={() => update((x) => {
            const p = purseOf(x);
            const due = x.guild?.dues ?? 1;
            p.pounds -= due;
            p.log = [...(p.log ?? []), { year: saga.currentYear, season: saga.currentSeason, text: `Guild dues (${x.guild?.name || 'guild'})`, pounds: -due }];
            x.guild = { ...(x.guild ?? { name: '' }), paidYear: saga.currentYear };
          })}>
            {g.paidYear === saga.currentYear ? `Dues paid for ${saga.currentYear}` : `Pay ${saga.currentYear}’s dues (${g.dues ?? 1} £, from the purse)`}
          </button>
        )}
        {rank === 'dean' && (
          <>
            <Stepper value={stipend} min={20} max={40} onChange={setStipend} title="The dean's stipend: 20 to 40 pounds" />
            <button className="small" onClick={() => update((x) => {
              const p = purseOf(x);
              p.pounds += stipend;
              p.log = [...(p.log ?? []), { year: saga.currentYear, season: saga.currentSeason, text: 'The dean’s stipend', pounds: stipend }];
            })}>
              Receive the year’s stipend
            </button>
          </>
        )}
        {rank && rank !== 'apprentice' && <span className="small muted">A craftsman’s stamp on the goods is an Arcane Connection to the maker.</span>}
      </div>
      {log.map((t, i) => (
        <div key={i} className="small">{t}</div>
      ))}
    </Card>
  );
}

