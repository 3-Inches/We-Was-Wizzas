// The customs of the saga's Tribunal that the troupe chose to use, as they touch one character: the
// Rhine's ranks, gilds and forest pacts, Theban citizenship, and a Transylvanian privilege.

import { useState } from 'react';
import { addVirtue, ensureAbility } from '../../../engine/character/factory';
import { optionOn } from '../../../engine/optional';
import {
  FOREST_PATHS, HOSPITALITY, MASTER_SPONSORS, PHYLAI, PRIVILEGES, RHINE_GILDS, RHINE_RANKS, SHARD_REASONS, TOKEN_REASONS, communionRoll, forestUnderstanding, thebanStatus, type RhineRank,
} from '../../../engine/tribunal';
import type { Character, ForestPact } from '../../../engine/types';
import type { VFSize } from '../../../data/types';
import { uid } from '../../../util/id';
import { Card, Field } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';

export function TribunalCard({ ed }: { ed: CharEditor }) {
  const { c, d, saga } = ed;
  if (!c || !d || !saga) return null;
  const magus = c.type === 'magus';
  const rhine = magus && (optionOn(saga, 'rhineGilds') || !!c.rhine);
  const forest = optionOn(saga, 'rhineForest') || !!c.forestPacts?.length;
  const theban = magus && (optionOn(saga, 'thebanTokens') || !!c.theban);
  const transylvania = magus && (optionOn(saga, 'transylvaniaPrivileges') || !!c.privilege);
  if (!rhine && !forest && !theban && !transylvania) return null;
  return (
    <Card title={`${saga.tribunal ? `${saga.tribunal} ` : ''}Tribunal customs`}>
      <div className="stack">
        {rhine && <RhineSection ed={ed} />}
        {forest && <ForestSection ed={ed} />}
        {theban && <ThebanSection ed={ed} />}
        {transylvania && <PrivilegeSection ed={ed} />}
      </div>
    </Card>
  );
}

function RhineSection({ ed }: { ed: CharEditor }) {
  const { c, update } = ed;
  if (!c) return null;
  const r = c.rhine ?? { rank: (c.creation.finalized ? 'journeyman' : 'apprentice') as RhineRank };
  const rank = RHINE_RANKS.find((x) => x.id === r.rank)!;
  const gild = RHINE_GILDS.find((g) => g.id === r.gild);
  const set = (fn: (x: NonNullable<Character['rhine']>) => void) => update((x) => { x.rhine = { ...r, ...(x.rhine ?? {}) }; fn(x.rhine); });
  const rep = r.rank === 'master' ? { text: 'Master', score: 2 } : r.rank === 'archmage' ? { text: 'Archmage', score: 4 } : null;
  const hasRep = rep && c.reputations.some((x) => x.text.toLowerCase().includes(rep.text.toLowerCase()) && x.score >= rep.score);
  const sponsors = r.sponsors ?? [];
  return (
    <div>
      <RulesNote book="GotF" line={542} endLine={842}>
        <b>Rank and gild.</b> {rank.sigils ? `${rank.sigils} voting sigil${rank.sigils > 1 ? 's' : ''} at Tribunal.` : 'No vote yet.'}
      </RulesNote>
      <div className="row">
        <Field label="Rank">
          <select value={r.rank} onChange={(e) => set((x) => void (x.rank = e.target.value as RhineRank))}>
            {RHINE_RANKS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label} ({x.latin})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gild">
          <select value={r.gild ?? ''} onChange={(e) => set((x) => void (x.gild = e.target.value || undefined))}>
            <option value="">none</option>
            {RHINE_GILDS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.tree} Gild ({g.name})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Guest at (peregrinator)">
          <input value={r.guestAt ?? ''} placeholder="covenant" onChange={(e) => set((x) => void (x.guestAt = e.target.value || undefined))} style={{ width: 130 }} />
        </Field>
      </div>
      <div className="small muted">{rank.note}</div>
      {gild && <div className="small muted">{gild.tree} Gild, led by {gild.leader}: {gild.agenda} Members owe their gild their vote and may ask its help; no Wizard’s War within it.</div>}
      {!r.gild && r.rank !== 'apprentice' && <div className="small muted">Without a gild a magus has no Hermetic allies if Wizard’s War is declared.</div>}
      {r.guestAt && <div className="small muted">Hospitality at {r.guestAt}: {HOSPITALITY.minYears} to {HOSPITALITY.maxYears} years, a fee of {HOSPITALITY.pawnsPerYear} pawns of vis a year or a season’s work.</div>}
      {r.rank === 'journeyman' && (
        <details>
          <summary className="small">Toward master: {sponsors.filter(Boolean).length} of {MASTER_SPONSORS} masters approve</summary>
          <div className="small muted">Each of another covenant, House and gild than the applicant’s, and of each other’s.</div>
          <div className="row" style={{ marginTop: 4 }}>
            {Array.from({ length: MASTER_SPONSORS }, (_, i) => (
              <input key={i} value={sponsors[i] ?? ''} placeholder={`master ${i + 1}`} style={{ width: 120 }}
                onChange={(e) => set((x) => { const s = [...(x.sponsors ?? [])]; s[i] = e.target.value; x.sponsors = s; })} />
            ))}
          </div>
        </details>
      )}
      {rep && !hasRep && (
        <button className="small" onClick={() => update((x) => void x.reputations.push({ uid: uid(), text: rep.text, scope: 'Hermetic', score: rep.score }))}>
          Add the Hermetic Reputation {rep.text} {rep.score}
        </button>
      )}
    </div>
  );
}

function ForestSection({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, change } = ed;
  const [foreign, setForeign] = useState(false);
  const [preset, setPreset] = useState('');
  const [draft, setDraft] = useState<{ spirit: string; size: VFSize; sacrifice: string; quest: string; fruit: string }>({ spirit: '', size: 'Minor', sacrifice: '', quest: '', fruit: '' });
  const [log, setLog] = useState<string[]>([]);
  if (!c || !d) return null;
  const fl = d.abilities.find((a) => a.abilityId === 'forest-lore');
  const score = fl?.total ?? 0;
  const pacts = c.forestPacts ?? [];
  const vfName = (id: string) => data.vfById.get(id)?.name ?? id;
  const flaws = data.virtuesFlaws.filter((v) => v.kind === 'flaw' && v.sizes.includes(draft.size));
  const virtues = data.virtuesFlaws.filter((v) => v.kind === 'virtue' && v.sizes.includes(draft.size) && (v.categories.includes('Supernatural') || v.categories.includes('Hermetic')));
  const usePreset = (key: string) => {
    setPreset(key);
    const [p, i] = key.split(':');
    const step = FOREST_PATHS.find((x) => x.name === p)?.steps[Number(i)];
    if (step) setDraft({ spirit: draft.spirit, size: step.size, sacrifice: step.sacrifice, quest: step.quest, fruit: step.fruit });
  };
  const makePact = () => {
    change((x) => {
      const flaw = addVirtue(x, data, draft.sacrifice, draft.size, undefined, { free: true, freeReason: `Sacrifice to ${draft.spirit || 'a forest spirit'}` });
      const pact: ForestPact = { uid: uid(), path: preset.split(':')[0] || 'a path of its own', spirit: draft.spirit, size: draft.size, quest: draft.quest, sacrificeUid: flaw.uid, fruit: draft.fruit || undefined, done: false };
      x.forestPacts = [...(x.forestPacts ?? []), pact];
      return `Pact with ${draft.spirit || 'the forest spirit'}: ${vfName(draft.sacrifice)} taken as the Sacrifice.`;
    });
    setDraft({ spirit: '', size: 'Minor', sacrifice: '', quest: '', fruit: '' });
    setPreset('');
  };
  const finish = (p: ForestPact) =>
    change((x) => {
      const q = x.forestPacts?.find((y) => y.uid === p.uid);
      if (!q || !q.fruit) return;
      q.done = true;
      addVirtue(x, data, q.fruit, q.size, undefined, { free: true, freeReason: `Fruit of ${q.spirit || q.path}` });
      return `Quest done: ${vfName(q.fruit)} gained from ${q.spirit || 'the forest spirit'}.`;
    });
  return (
    <div>
      <RulesNote book="GotF" line={1032} endLine={1224}>
        <b>Paths through the Forest.</b> Forest Lore {score}{foreign ? ' (a foreign forest: 3 less)' : ''}: {forestUnderstanding(score, foreign).slice(-1)[0] ?? 'not enough to understand the forest yet'}.
      </RulesNote>
      <div className="row">
        {!fl && (
          <button className="small" onClick={() => update((x) => void ensureAbility(x, 'forest-lore'))}>
            + Forest Lore
          </button>
        )}
        <label className="inline small">
          <input type="checkbox" checked={foreign} onChange={(e) => setForeign(e.target.checked)} /> a foreign forest
        </label>
        <button className="small" disabled={score < (foreign ? 4 : 1)} title={score < 1 ? 'Needs Forest Lore 1 (4 in a foreign forest)' : undefined}
          onClick={() => setLog((l) => [communionRoll(d.characteristics.Int.value, score, foreign).text, ...l].slice(0, 5))}>
          Seek communion (Int + Forest Lore vs {foreign ? 12 : 9})
        </button>
      </div>
      {log.map((t, i) => (
        <div key={i} className="small">{t}</div>
      ))}
      {pacts.map((p) => (
        <div key={p.uid} className="small list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div>
            <b>{p.spirit || p.path}</b> ({p.size}) · Sacrifice: {vfName(c.virtues.find((v) => v.uid === p.sacrificeUid)?.defId ?? '') || '—'} · {p.done ? `Fruit: ${vfName(p.fruit ?? '')} ✓` : `Quest: ${p.quest}`}
          </div>
          {!p.done && (
            <div>
              <button className="small" disabled={!p.fruit} onClick={() => finish(p)}>
                Quest done: gain {p.fruit ? vfName(p.fruit) : 'the Fruit'}
              </button>
            </div>
          )}
        </div>
      ))}
      <details>
        <summary className="small">Make a pact</summary>
        <div className="stack" style={{ marginTop: 4 }}>
          <div className="row">
            <Field label="A path walked before">
              <select value={preset} onChange={(e) => usePreset(e.target.value)}>
                <option value="">— its own —</option>
                {FOREST_PATHS.map((p) =>
                  p.steps.map((s, i) => (
                    <option key={`${p.name}:${i}`} value={`${p.name}:${i}`}>
                      {p.name}, {i ? 'second' : 'first'} step: {vfName(s.fruit)}
                    </option>
                  )),
                )}
              </select>
            </Field>
            <Field label="Spirit">
              <input value={draft.spirit} placeholder="genius locus" onChange={(e) => setDraft({ ...draft, spirit: e.target.value })} style={{ width: 130 }} />
            </Field>
            <Field label="Size">
              <select value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value as VFSize, sacrifice: '', fruit: '' })}>
                <option>Minor</option>
                <option>Major</option>
              </select>
            </Field>
          </div>
          <div className="row">
            <Field label="Sacrifice (Flaw)">
              <select value={draft.sacrifice} onChange={(e) => setDraft({ ...draft, sacrifice: e.target.value })}>
                <option value="">— choose —</option>
                {flaws.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Fruit (Virtue)">
              <select value={draft.fruit} onChange={(e) => setDraft({ ...draft, fruit: e.target.value })}>
                <option value="">— choose —</option>
                {virtues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <input value={draft.quest} placeholder="The Quest" onChange={(e) => setDraft({ ...draft, quest: e.target.value })} />
          <div>
            <button className="small primary" disabled={!draft.sacrifice} onClick={makePact}>
              Make the pact and take the Sacrifice
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

function ThebanSection({ ed }: { ed: CharEditor }) {
  const { c, update, saga } = ed;
  const [token, setToken] = useState(0);
  const [shard, setShard] = useState(0);
  if (!c || !saga) return null;
  const t = c.theban ?? { citizen: true, tokens: 0, shards: 0, log: [] };
  const set = (fn: (x: NonNullable<Character['theban']>) => void, text?: string) =>
    update((x) => {
      x.theban = { ...t, ...(x.theban ?? {}), log: [...(x.theban?.log ?? t.log)] };
      fn(x.theban);
      if (text) x.theban.log = [{ year: saga.currentYear, text }, ...x.theban.log].slice(0, 30);
    });
  const longevity = !!c.longevity;
  return (
    <div>
      <RulesNote book="SE" line={1210} endLine={1360}>
        <b>Theban citizenship.</b> {t.citizen ? `${t.tokens} token${t.tokens === 1 ? '' : 's'}, ${t.shards} shard${t.shards === 1 ? '' : 's'}.` : 'A metoikos.'}
      </RulesNote>
      <div className="row">
        <Field label="Status">
          <select value={t.citizen ? 'polites' : 'metoikos'} onChange={(e) => set((x) => void (x.citizen = e.target.value === 'polites'))}>
            <option value="polites">Polites (citizen)</option>
            <option value="metoikos">Metoikos (resident foreigner)</option>
          </select>
        </Field>
        {t.citizen && (
          <Field label="Phyle">
            <select value={t.phyle ?? ''} onChange={(e) => set((x) => void (x.phyle = e.target.value || undefined))}>
              <option value="">—</option>
              {PHYLAI.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {t.citizen && (
        <>
          <div className="row">
            <select value={token} onChange={(e) => setToken(Number(e.target.value))} aria-label="Token for">
              {TOKEN_REASONS.map((r, i) => (
                <option key={i} value={i}>{r.label} (+{r.n})</option>
              ))}
            </select>
            <button className="small" onClick={() => set((x) => void (x.tokens += TOKEN_REASONS[token].n), `+${TOKEN_REASONS[token].n} token: ${TOKEN_REASONS[token].label}`)}>+ Token</button>
          </div>
          <div className="row">
            <select value={shard} onChange={(e) => setShard(Number(e.target.value))} aria-label="Shard for">
              {SHARD_REASONS.map((r, i) => (
                <option key={i} value={i}>{r.label} (+{r.n})</option>
              ))}
            </select>
            <button className="small" onClick={() => set((x) => void (x.shards += SHARD_REASONS[shard].n), `+${SHARD_REASONS[shard].n} shard: ${SHARD_REASONS[shard].label}`)}>+ Shard</button>
          </div>
          <div className="row">
            <button className="small" disabled={!t.shards} title="Another magus spends a token; this magus owes a season of service, before a Redcap"
              onClick={() => set((x) => void (x.shards -= 1), 'a shard neutralized: a season of service to the token’s holder')}>
              Neutralize a shard (a season’s service)
            </button>
            <button className="small" disabled={!t.tokens} onClick={() => set((x) => void (x.tokens -= 1), 'a token spent or given')}>
              Spend a token
            </button>
          </div>
        </>
      )}
      {thebanStatus(t, longevity).map((s, i) => (
        <div key={i} className="small muted">{s}</div>
      ))}
      {t.log.length > 0 && (
        <details>
          <summary className="small">Record ({t.log.length})</summary>
          {t.log.map((l, i) => (
            <div key={i} className="small">{l.year}: {l.text}</div>
          ))}
        </details>
      )}
    </div>
  );
}

function PrivilegeSection({ ed }: { ed: CharEditor }) {
  const { c, update } = ed;
  if (!c) return null;
  const p = PRIVILEGES.find((x) => x.id === c.privilege);
  return (
    <div>
      <RulesNote book="AtD" line={938} endLine={1143}>
        <b>Privilege.</b> Each resident magus’s written agreement with the Praeco.
      </RulesNote>
      <Field label="Privilege">
        <select value={c.privilege ?? ''} onChange={(e) => update((x) => void (x.privilege = e.target.value || undefined))}>
          <option value="">—</option>
          {PRIVILEGES.map((x) => (
            <option key={x.id} value={x.id}>{x.label}, of {x.covenant}</option>
          ))}
        </select>
      </Field>
      {p && (
        <div className="small">
          <span className="muted">For {p.who}.</span> <b>May:</b> {p.may.join('; ')}. <b>Must:</b> {p.must.join('; ')}.
        </div>
      )}
    </div>
  );
}
