// The Game table's calendar and its stories waiting to be told (engine/calendar.ts): the toolkit keeps
// the dates and the troupe plays the story.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { upcoming, storySeeds, type CalEvent } from '../../engine/calendar';
import { SEASONS } from '../../engine/effects';
import type { Character, Covenant, Saga, Season } from '../../engine/types';
import type { GameData } from '../../data';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Field, Stepper } from '../kit';

const KIND_BADGE: Record<CalEvent['kind'], string> = { tribunal: 'Tribunal', hook: 'Hook', covenant: 'Covenant', character: 'Character', trouble: 'Trouble', troupe: 'Yours', year: 'Year' };

function linkOf(S: string, e: { link?: CalEvent['link'] }): string | undefined {
  const l = e.link;
  if (!l) return undefined;
  if (l.page) return `${S}/${l.page}`;
  if (l.covenantId) return `${S}/covenant/${l.covenantId}${l.tab ? `?tab=${l.tab}` : ''}`;
  if (l.characterId) return `${S}/character/${l.characterId}${l.tab ? `?tab=${l.tab}` : ''}`;
  return undefined;
}

export function ComingUpCard({ saga, characters, covenants }: { saga: Saga; characters: Character[]; covenants: Covenant[] }) {
  const updateSaga = useStore((s) => s.updateSaga);
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [when, setWhen] = useState<{ year: number; season: Season }>({ year: saga.currentYear, season: saga.currentSeason });
  const [every, setEvery] = useState(0);
  const S = `/saga/${saga.id}`;
  const events = upcoming({ saga, characters, covenants }, 3);
  const shown = all ? events : events.slice(0, 6);
  let lastYear = 0;
  return (
    <Card title="Coming up" tour="table-calendar" fold="table-calendar" summary={events[0] ? `Next, ${events[0].season} ${events[0].year}: ${events[0].text}${events.length > 1 ? ` (and ${events.length - 1} more in three years)` : ''}` : 'Nothing in the next three years.'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        The dates the toolkit keeps, so the table can stay on the story. Add your own: a fair, a wedding, a faerie court that meets every Midsummer.
      </p>
      {shown.map((e, i) => {
        const head = e.year !== lastYear;
        lastYear = e.year;
        const to = linkOf(S, e);
        return (
          <div key={i}>
            {head && <div className="small" style={{ fontWeight: 600, marginTop: i ? 6 : 0 }}>{e.year}</div>}
            <div className="list-row small" style={{ alignItems: 'baseline' }}>
              <span className="muted" style={{ minWidth: 52 }}>{e.season}</span>
              <span className="badge">{KIND_BADGE[e.kind]}</span>
              <span style={{ flex: '1 1 200px' }}>{e.text}</span>
              {to && <Link to={to}>→</Link>}
              {e.uid && (
                <button className="small ghost" title="Take it off the calendar" onClick={() => updateSaga(saga.id, (s) => void (s.calendar = (s.calendar ?? []).filter((x) => x.uid !== e.uid)))}>
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
      {events.length === 0 && <div className="small muted">Nothing on the calendar for the next three years.</div>}
      <div className="row small" style={{ marginTop: 6 }}>
        {events.length > 6 && (
          <button className="small ghost" onClick={() => setAll(!all)}>
            {all ? 'Fewer' : `All ${events.length} in the next three years`}
          </button>
        )}
        {!adding && (
          <button className="small" onClick={() => setAdding(true)}>
            Add a date
          </button>
        )}
      </div>
      {adding && (
        <div className="row small" style={{ marginTop: 6 }}>
          <Field label="What">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="The Duke’s tourney at Cologne" style={{ width: 220 }} />
          </Field>
          <Field label="When">
            <span className="row tight">
              <select value={when.season} onChange={(e) => setWhen({ ...when, season: e.target.value as Season })} aria-label="Season">
                {SEASONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <Stepper value={when.year} width={52} onChange={(y) => setWhen({ ...when, year: y })} />
            </span>
          </Field>
          <Field label="Every (years)" hint="0: once">
            <Stepper value={every} min={0} max={50} width={36} onChange={setEvery} />
          </Field>
          <button
            className="small primary"
            disabled={!text.trim()}
            onClick={() => {
              updateSaga(saga.id, (s) => void (s.calendar = [...(s.calendar ?? []), { uid: uid(), year: when.year, season: when.season, text: text.trim(), every: every || undefined }]));
              setText('');
              setAdding(false);
            }}
          >
            Add
          </button>
          <button className="small ghost" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      )}
    </Card>
  );
}

export function StoriesCard({ saga, characters, covenants, data }: { saga: Saga; characters: Character[]; covenants: Covenant[]; data: GameData }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [all, setAll] = useState(false);
  const S = `/saga/${saga.id}`;
  const seeds = storySeeds({ saga, characters, covenants }, data);
  const shown = all ? seeds : seeds.slice(0, 5);
  const told = (key: string) => {
    const [kind, owner, id] = key.split(':');
    if (kind === 'vf') updateCharacter(owner, (c) => void (c.storiesTold = { ...(c.storiesTold ?? {}), [id]: saga.currentYear }));
    else updateCovenant(owner, (c) => void (c.hookStories = { ...(c.hookStories ?? {}), [id]: saga.currentYear }));
  };
  return (
    <Card title="Stories waiting" tour="table-stories" fold="table-stories" summary={seeds[0] ? `${seeds.length} waiting; the longest untold: ${seeds[0].who}’s ${seeds[0].title}.` : 'None yet.'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        What the characters’ Story and Personality Flaws and the covenant’s Hooks promise, the longest untold first. Mark one told when it has come up in play.
      </p>
      {shown.map((s) => (
        <div key={s.key} className="list-row small" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 220px' }}>
            <b>{s.who}</b>: {s.title}
            <span className="muted"> {s.last ? `(last in ${s.last})` : '(not yet told)'}</span>
            {s.prompt && <div className="muted">{s.prompt}</div>}
          </span>
          <Link to={linkOf(S, s)!}>→</Link>
          <button className="small" onClick={() => told(s.key)}>
            Told
          </button>
        </div>
      ))}
      {seeds.length === 0 && <div className="small muted">No Story or Personality Flaws or Hooks yet.</div>}
      {seeds.length > 5 && (
        <button className="small ghost" onClick={() => setAll(!all)}>
          {all ? 'Fewer' : `All ${seeds.length}`}
        </button>
      )}
    </Card>
  );
}
