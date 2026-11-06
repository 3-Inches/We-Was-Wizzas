// After a story, on the Game Table: first how many characters took part, then which ones and what each
// gained: Adventure experience, logged in the season the story took place (it shares the season with
// other work), and a craftsman's or merchant's Labor Points from it.

import { useState } from 'react';
import { ARTS, ART_NAMES, type Art } from '../../data';
import type { DerivedCharacter } from '../../engine/character/derive';
import { applySeason, computeStudy, newSeasonEntry } from '../../engine/longterm';
import type { Character, Season } from '../../engine/types';
import { STORY_AWARDS, seasonWorth } from '../../engine/workshop';
import { useStore } from '../../store/store';
import { Card, Field, Stepper } from '../kit';

export function AfterStoryCard({ people, derived, year, season }: { people: Character[]; derived: Map<string, DerivedCharacter>; year: number; season: Season }) {
  const [msg, setMsg] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [ids, setIds] = useState<string[]>([]);
  const chosen = Array.from({ length: count }, (_, i) => ids[i] ?? '');
  const setAt = (i: number, id: string) =>
    setIds((l) => {
      const n = [...l];
      n[i] = id;
      return n;
    });
  return (
    <Card title="After a story" tour="table-story" id="after-story">
      <p className="small muted" style={{ marginTop: 0 }}>
        Adventure experience (at most 5 in any one Art or Ability, usually 5 to 10 in all) is logged in {season} {year} and shares the season with whatever else the character does. Craftsmen and
        merchants also earn Labor Points from a story that touched their business.
      </p>
      <div className="row">
        <Field label="How many characters took part?">
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} data-tour="story-count">
            <option value={0}>— choose —</option>
            {people.map((_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
                {i + 1 === people.length ? ' (everyone)' : ''}
              </option>
            ))}
          </select>
        </Field>
        {count > 0 && chosen.some((x) => !x) && (
          <button
            className="small ghost"
            onClick={() => {
              const free = people.filter((p) => !chosen.includes(p.id));
              let k = 0;
              setIds(chosen.map((x) => x || free[k++]?.id || ''));
            }}
          >
            Fill in the rest in order
          </button>
        )}
      </div>
      {chosen.map((id, i) => {
        const taken = new Set(chosen.filter((x, j) => j !== i && x));
        const c = people.find((p) => p.id === id);
        const d = c ? derived.get(c.id) : undefined;
        return (
          <div key={i} className="list-row" style={{ flexWrap: 'wrap' }}>
            <select value={id} onChange={(e) => setAt(i, e.target.value)} aria-label={`Who took part (${i + 1} of ${count})`} style={{ minWidth: 130 }}>
              <option value="">— who? —</option>
              {people
                .filter((p) => !taken.has(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'Unnamed'}
                  </option>
                ))}
            </select>
            {c && d ? <StoryRow key={c.id} c={c} d={d} year={year} season={season} say={(t) => setMsg((m) => [t, ...m].slice(0, 8))} /> : <span className="small muted">Choose who took part, then what they gained.</span>}
          </div>
        );
      })}
      {msg.length > 0 && (
        <div className="dice-result-lines small" aria-live="polite">
          {msg.map((l, i) => (
            <div key={i} className={i ? 'muted' : ''}>
              {l}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StoryRow({ c, d, year, season, say }: { c: Character; d: DerivedCharacter; year: number; season: Season; say: (t: string) => void }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const [target, setTarget] = useState('');
  const [xp, setXp] = useState(3);
  const logged = c.seasonLog.filter((e) => e.year === year && e.season === season && e.activity === 'adventure');
  const total = logged.reduce((t, e) => t + Object.values(e.gains).reduce((a, b) => a + b, 0), 0);
  const label = (t: string) => {
    const [k, id] = t.split(':');
    return k === 'art' ? ART_NAMES[id as Art] : d.abilityByUid.get(id)?.name ?? 'an Ability';
  };
  const key = target || (d.isMagus ? 'art:Cr' : d.abilities[0] ? `ability:${d.abilities[0].uid}` : '');
  const award = () => {
    if (!key) return;
    const [k, id] = key.split(':');
    const r = computeStudy(d, { kind: 'adventure', quality: Math.min(5, xp), subject: label(key) }, k === 'art' ? { art: id as Art } : { abilityUid: id });
    updateCharacter(c.id, (x) => {
      const e = newSeasonEntry(year, season, 'adventure', `Adventure: ${label(key)} (+${r.xp} xp)`, r.xp ? { [key]: r.xp } : {});
      applySeason(x, e, 1);
      x.seasonLog.push(e);
    });
    say(`${c.name || 'Unnamed'}: +${r.xp} xp Adventure in ${label(key)}.`);
  };
  const worth = c.workshop ? seasonWorth(c, d) : 0;
  const story = (seasons: number, what: string) => {
    const lp = Math.round(seasons * worth);
    updateCharacter(c.id, (x) => void (x.workshop && (x.workshop.laborPoints += lp)));
    say(`${c.name || 'Unnamed'}: +${lp} Labor Points (${what.toLowerCase()}).`);
  };
  return (
    <>
      <select value={key} onChange={(e) => setTarget(e.target.value)} aria-label="Where the experience goes" style={{ maxWidth: 200 }}>
        {d.isMagus && (
          <optgroup label="Arts">
            {ARTS.map((a) => (
              <option key={a} value={`art:${a}`}>
                {ART_NAMES[a]} {d.arts[a].score}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Abilities">
          {d.abilities.map((a) => (
            <option key={a.uid} value={`ability:${a.uid}`}>
              {a.name} {a.total}
            </option>
          ))}
        </optgroup>
      </select>
      <Stepper value={xp} min={1} max={5} width={28} onChange={setXp} />
      <button className="small" onClick={award} disabled={!key}>
        + xp
      </button>
      {total > 0 && <span className="badge info">{total} xp from adventure this season</span>}
      {c.workshop && (
        <span className="row tight small" title="City & Guild ch.2: Labor Points from a story, by the part the character played">
          Labor Points:
          {STORY_AWARDS.map((a) => (
            <button key={a.seasons} className="small ghost" title={a.label} onClick={() => story(a.seasons, a.label)}>
              +{Math.round(a.seasons * worth)}
            </button>
          ))}
        </span>
      )}
    </>
  );
}
