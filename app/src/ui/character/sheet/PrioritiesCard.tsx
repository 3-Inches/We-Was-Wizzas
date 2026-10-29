// A character's season priority list, on the Advancement tab: what they do with a season nobody
// planned when their standing activity is to follow it. Each entry is a season a year; the first
// that can be done is taken. The living covenants' magi come with one; any character can have one.

import { useMemo } from 'react';
import { ARTS, ART_NAMES, type Art, type GameData } from '../../../data';
import type { DerivedCharacter } from '../../../engine/character/derive';
import type { CharacterContext } from '../../../engine/context';
import { seeded } from '../../../engine/generate/random';
import { PRIORITY_BY_ID, PRIORITY_KINDS, choosePriority, defaultPriorities, focusArts } from '../../../engine/priorities';
import type { Character, PriorityKind, Saga, SeasonPriority } from '../../../engine/types';
import { Card } from '../../kit';

const ARTS_KINDS: PriorityKind[] = ['read', 'vis', 'invent', 'enchant'];

export function PrioritiesCard({ c, d, ctx, saga, data, chars, update }: { c: Character; d: DerivedCharacter; ctx: CharacterContext; saga: Saga; data: GameData; chars: Character[]; update: (fn: (x: Character) => void) => void }) {
  const list = c.priorities ?? [];
  const following = c.standing?.kind === 'priorities';
  // what this season would go to, worked out on a copy (the choice may make a project or a book)
  const preview = useMemo(() => {
    if (!list.length) return undefined;
    const copy = structuredClone(c);
    const cov = ctx.covenant ? structuredClone(ctx.covenant) : undefined;
    return choosePriority(copy, d, { ...ctx, covenant: cov }, cov, data, saga.currentYear, saga.currentSeason, seeded(1), chars);
  }, [c, d, ctx, data, saga.currentYear, saga.currentSeason, chars, list.length]);
  const set = (fn: (l: SeasonPriority[]) => void) =>
    update((x) => {
      const l = [...(x.priorities ?? [])];
      fn(l);
      x.priorities = l;
    });
  const move = (i: number, by: number) => set((l) => void ([l[i], l[i + by]] = [l[i + by], l[i]]));
  return (
    <Card title="Season priorities" tour="priorities">
      {!list.length ? (
        <>
          <p className="small" style={{ marginTop: 0 }}>
            A priority list says what {c.name || 'the character'} does with a season nobody planned, in order of preference: each entry is a season a year, and the first that can be done is
            taken. The Tribunal’s living covenants run on these.
          </p>
          <button
            onClick={() =>
              update((x) => {
                x.priorities = defaultPriorities(x, {});
                x.standing = { kind: 'priorities' };
              })
            }
          >
            Make a priority list and follow it
          </button>
        </>
      ) : (
        <>
          {!following && (
            <div className="small warn-text" style={{ marginBottom: 6 }}>
              The standing activity is not set to follow this list.{' '}
              <button className="small" onClick={() => update((x) => void (x.standing = { kind: 'priorities' }))}>
                Follow it
              </button>
            </div>
          )}
          {preview && (
            <div className="small" style={{ marginBottom: 6 }}>
              <b>This season:</b> {preview.choice ? `${PRIORITY_BY_ID.get(preview.choice.kind)?.label}: ${preview.choice.what}` : 'nothing on the list can be done, so lab work or practice'}.
              {preview.tried.length > 0 && (
                <details>
                  <summary className="small muted">Why not the entries before it ({preview.tried.length})</summary>
                  {preview.tried.map((t, i) => (
                    <div key={i} className="small muted">
                      {PRIORITY_BY_ID.get(t.kind)?.label}: {t.why}
                    </div>
                  ))}
                </details>
              )}
            </div>
          )}
          {list.map((p, i) => {
            const meta = PRIORITY_BY_ID.get(p.kind);
            return (
              <div key={i} className="list-row" style={{ flexWrap: 'wrap', opacity: p.off ? 0.55 : 1 }}>
                <span className="badge">{i + 1}</span>
                <b title={meta?.text}>{meta?.label ?? p.kind}</b>
                {ARTS_KINDS.includes(p.kind) && d.isMagus && (
                  <ArtsPick value={p.arts} fallback={focusArts(d)} onChange={(arts) => set((l) => void (l[i] = { ...l[i], arts }))} />
                )}
                <span className="row tight" style={{ marginLeft: 'auto' }}>
                  <label className="inline small" title="Switch off without removing">
                    <input type="checkbox" checked={!p.off} onChange={(e) => set((l) => void (l[i] = { ...l[i], off: !e.target.checked || undefined }))} /> on
                  </label>
                  <button className="small ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button className="small ghost" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                    ↓
                  </button>
                  <button className="small ghost" onClick={() => set((l) => void l.splice(i, 1))} aria-label="Remove">
                    ✕
                  </button>
                </span>
              </div>
            );
          })}
          <div className="row tight" style={{ marginTop: 6, flexWrap: 'wrap' }}>
            <select value="" onChange={(e) => e.target.value && set((l) => void l.push({ kind: e.target.value as PriorityKind }))} aria-label="Add a priority">
              <option value="">+ add a season…</option>
              {PRIORITY_KINDS.filter((k) => d.isMagus || !['longevity', 'vis', 'invent', 'lab'].includes(k.id)).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <button className="small ghost" onClick={() => update((x) => void (x.priorities = defaultPriorities(x, {})))}>
              Reset to a standard list
            </button>
          </div>
          <details style={{ marginTop: 6 }}>
            <summary className="small">What each entry does</summary>
            {PRIORITY_KINDS.map((k) => (
              <div key={k.id} className="small">
                <b>{k.label}</b>
                {k.yearly ? '' : ' (not counted as a season a year)'}: {k.text}
              </div>
            ))}
          </details>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Each entry is a season a year (list one twice for two seasons). A Longevity Ritual is made whenever it is needed, and lab work or practice fills a season the list leaves.
          </p>
        </>
      )}
    </Card>
  );
}

function ArtsPick({ value, fallback, onChange }: { value?: Art[]; fallback: Art[]; onChange: (a?: Art[]) => void }) {
  const cur = value ?? [];
  const pick = (i: number, a: string) => {
    const next = [...cur];
    if (a) next[i] = a as Art;
    else next.splice(i, 1);
    const clean = [...new Set(next.filter(Boolean))];
    onChange(clean.length ? clean : undefined);
  };
  return (
    <span className="row tight small" title="The Arts this entry favors; the character's best two if none are chosen">
      {[0, 1].map((i) => (
        <select key={i} value={cur[i] ?? ''} onChange={(e) => pick(i, e.target.value)} aria-label={`Favored Art ${i + 1}`} style={{ maxWidth: 110 }}>
          <option value="">{i === 0 && !cur.length ? `best (${fallback.map((a) => a).join(', ')})` : '—'}</option>
          {ARTS.map((a) => (
            <option key={a} value={a}>
              {ART_NAMES[a]}
            </option>
          ))}
        </select>
      ))}
    </span>
  );
}
