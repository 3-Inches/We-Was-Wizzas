// This season, for everyone: what each character will do (what is logged on their sheet, or else their
// standing activity, changed here), an extra season for one who needs no sleep, and links to their
// sheet for a particular book, teacher or project. On the Game Table's Seasons page.

import { Link } from 'react-router-dom';
import { deriveCharacter, type DerivedCharacter } from '../../engine/character/derive';
import { covenantOf } from '../../engine/context';
import { teaches } from '../../engine/covenfolk';
import { extraSeasonHere, seasonsOf, seasonsUsed } from '../../engine/seasons';
import { describeStanding, inPlay, loggedThisSeason, resolveStanding } from '../../engine/time';
import { orderOfPlay } from '../../engine/seasonPlan';
import { PlayerOrder } from './SeasonResolve';
import type { Character, Covenant, Saga } from '../../engine/types';
import type { GameData } from '../../data';
import { useStore } from '../../store/store';
import { StandingEditor, teamOf } from '../character/StandingEditor';
import { Unlog } from '../character/Unlog';
import { Card, Empty } from '../kit';
import { R } from '../routes';

export function SeasonPlanner({ saga, data, chars, covs, derived, fill = true, onPlan }: { saga: Saga; data: GameData; chars: Character[]; covs: Covenant[]; derived: Map<string, DerivedCharacter>; fill?: boolean; /** open the full planner for one character */ onPlan?: (id: string) => void }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const { currentYear: year, currentSeason: season } = saga;
  const playing = chars.filter(inPlay);
  const drafts = chars.filter((c) => !c.creation.finalized);
  const turns = orderOfPlay(saga, playing);
  return (
    <Card title={`Each character's ${season} ${year}`} tour="table-season" fold="table-season" summary={`${playing.length} characters in play, player by player.`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Player by player, magi first, then companions; the grogs last. What each one does this season: what is logged, or else their standing activity, changed here. A
        particular book, teacher, lab project, writing or Initiation: <b>Plan in full</b>, below.
      </p>
      <PlayerOrder saga={saga} chars={playing} />
      {playing.length === 0 && <Empty>No finished characters yet.</Empty>}
      {turns.map((t) => (
        <div key={t.label} className="stack" style={{ gap: 0 }}>
          <div className="small turn-head">{t.label}</div>
          {t.people.map((c) => row(c))}
        </div>
      ))}
      {drafts.length > 0 && <p className="small muted">Still in creation, so time does not move them: {drafts.map((c) => c.name || 'Unnamed').join(', ')}.</p>}
    </Card>
  );

  function row(c: Character) {
    const d = derived.get(c.id);
    if (!d) return null;
    const logged = loggedThisSeason(c, year, season);
    const cov = covenantOf(c, covs);
    const team = teamOf(c, chars, covs, data, (x) => derived.get(x.id) ?? deriveCharacter(x, data, saga.houseRules));
    const teachers = cov?.specialists.filter((s) => teaches(s)) ?? [];
    // a character who needs no sleep has an extra season of study in Spring and Autumn
    const plan = seasonsOf(c, d);
    const used = seasonsUsed(c, year);
    const extraHere = plan.extra > 0 && extraSeasonHere(plan, season) && !logged.some((e) => e.extra);
    // a teacher who named this character among their students, and whose own season is free for it
    const lessonFrom = playing.find((t) => t.id !== c.id && t.standing?.kind === 'teach' && !!t.standing.students?.includes(c.id) && !loggedThisSeason(t, year, season).some((e) => !e.extra));
    return (
      <div key={c.id} className="list-row" style={{ flexWrap: 'wrap' }}>
        <Link to={R.character(saga.id, c)} style={{ minWidth: 120 }}>
          <b>{c.name || 'Unnamed'}</b>
        </Link>
        <span className="badge">{c.type}</span>
        {plan.work > 0 && <span className="small muted">{used.free + used.worship} of {plan.free} free seasons used</span>}
        {logged.some((e) => !e.extra) ? (
          <span className="small row tight" style={{ flexWrap: 'wrap' }}>
            <span className="badge good">logged</span>
            {logged
              .filter((e) => !e.extra)
              .map((e) => (
                <span key={e.uid} className="row tight">
                  {e.summary}
                  <Unlog c={c} uid={e.uid} />
                </span>
              ))}
          </span>
        ) : lessonFrom ? (
          // named as a teacher's student: the lesson is their season (DE: a student spends the season being taught)
          <span className="small row tight" style={{ flexWrap: 'wrap' }}>
            <span className="badge">taught</span> by <b>{lessonFrom.name || 'a covenant-mate'}</b> this season (set on {lessonFrom.name ? `${lessonFrom.name}’s` : 'their'} row)
            <button className="small ghost" title="Take them out of the lesson, so their own activity is done instead" onClick={() => updateCharacter(lessonFrom.id, (x) => void (x.standing && x.standing.kind === 'teach' && (x.standing.students = x.standing.students?.filter((id) => id !== c.id))))}>
              Leave the lesson
            </button>
          </span>
        ) : (
          <StandingEditor c={c} d={d} year={year} teachers={teachers} library={cov?.library} team={team} onChange={(s) => updateCharacter(c.id, (x) => void (x.standing = s))} />
        )}
        <span className="row tight small" style={{ marginLeft: 'auto' }}>
          {onPlan ? (
            <button className="small ghost" onClick={() => onPlan(c.id)} title="A particular book, teacher, lab project, writing or Initiation">
              Plan in full ↓
            </button>
          ) : (
            <Link to={R.seasonsFor(saga.id, c.id)}>Plan in full</Link>
          )}
        </span>
        {!logged.length && !lessonFrom && (
          <div className="small muted" style={{ flexBasis: '100%' }}>
            {fill ? `→ ${describeStanding(c, d, resolveStanding(c, d, year))}` : '→ nothing (unplanned seasons are left empty)'}
          </div>
        )}
        {logged
          .filter((e) => e.extra)
          .map((e) => (
            <div key={e.uid} className="small row tight" style={{ flexBasis: '100%' }}>
              <span className="badge">extra season</span> {e.summary}
              <Unlog c={c} uid={e.uid} />
            </div>
          ))}
        {extraHere && (
          <div className="row tight small" style={{ flexBasis: '100%' }}>
            <span className="badge">extra season</span>
            <StandingEditor
              c={c}
              d={d}
              year={year}
              teachers={teachers}
              library={cov?.library}
              team={team}
              extra
              value={c.seasons?.extra ?? { kind: 'auto' }}
              onChange={(st) => updateCharacter(c.id, (x) => void (x.seasons = { ...(x.seasons ?? {}), extra: st.kind === 'auto' && !st.target ? undefined : st }))}
            />
          </div>
        )}
      </div>
    );
  }
}
