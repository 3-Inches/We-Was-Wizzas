import { useMemo } from 'react';
import { recommend, type Suggestion } from '../../engine/recommend';
import { addVirtue, ensureAbility } from '../../engine/character/factory';
import { Card } from '../kit';
import type { CharEditor } from './useChar';
import { makeCharSpell } from './steps/SpellsStep';

const STEP_KINDS: Record<string, Suggestion['kind'][]> = {
  basics: ['tip'],
  house: ['virtue', 'tip'],
  virtues: ['virtue', 'flaw', 'tip'],
  characteristics: ['characteristic'],
  abilities: ['ability', 'tip'],
  arts: ['art', 'tip'],
  spells: ['spell'],
  personality: ['tip'],
  review: ['virtue', 'flaw', 'characteristic', 'ability', 'art', 'spell', 'tip'],
};

export default function RecommendationsPanel({ ed, step }: { ed: CharEditor; step: string }) {
  const { c, d, data, update } = ed;
  const all = useMemo(() => (c && d ? recommend(d, data, c.creation.archetypes ?? []) : []), [c, d, data]);
  if (!c || !d) return null;
  const kinds = STEP_KINDS[step] ?? ['tip'];
  const recs = all.filter((r) => kinds.includes(r.kind)).slice(0, 14);
  const act = (r: Suggestion) => {
    if ((r.kind === 'virtue' || r.kind === 'flaw') && r.id) {
      const def = data.vfById.get(r.id);
      update((x) => void addVirtue(x, data, r.id!, def?.sizes.includes('Minor') ? 'Minor' : def?.sizes[0], r.param));
    } else if (r.kind === 'ability' && r.id) {
      update((x) => void ensureAbility(x, r.id!, {}, r.param));
    } else if (r.kind === 'spell' && r.id) {
      const s = data.spellById.get(r.id);
      if (s) update((x) => void x.spells.push(makeCharSpell(s, c.creation.finalized ? 'play' : 'apprenticeship', d.flawless)));
    }
  };
  return (
    <Card title="Recommendations">
      {(c.creation.archetypes ?? []).length === 0 && step !== 'basics' && (
        <p className="small muted">Pick concept themes on the Concept step for more tailored suggestions.</p>
      )}
      {recs.length === 0 && <div className="small muted">Nothing to suggest here.</div>}
      {recs.map((r, i) => (
        <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div>
              <b>{r.title}</b> <span className="badge">{r.group}</span>
            </div>
            <div className="small soft">{r.reason}</div>
          </div>
          {(r.kind === 'virtue' || r.kind === 'flaw' || r.kind === 'ability' || r.kind === 'spell') && r.id && (
            <button className="small" onClick={() => act(r)}>
              + Add
            </button>
          )}
        </div>
      ))}
    </Card>
  );
}
