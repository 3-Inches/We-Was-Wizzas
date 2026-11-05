// This season, for everyone: what each character will do (what is logged on their sheet, or else their
// standing activity, changed here), an extra season for one who needs no sleep, and links to their
// sheet for a particular book, teacher or project. On the Game Table's Seasons page.

import { Link } from 'react-router-dom';
import { deriveCharacter, type DerivedCharacter } from '../../engine/character/derive';
import { covenantOf } from '../../engine/context';
import { teaches } from '../../engine/covenfolk';
import { extraSeasonHere, seasonsOf, seasonsUsed } from '../../engine/seasons';
import { describeStanding, inPlay, loggedThisSeason, resolveStanding } from '../../engine/time';
import type { Character, Covenant, Saga } from '../../engine/types';
import type { GameData } from '../../data';
import { useStore } from '../../store/store';
import { StandingEditor, teamOf } from '../character/StandingEditor';
import { Card, Empty } from '../kit';
import { R } from '../routes';

export function SeasonPlanner({ saga, data, chars, covs, derived, fill = true }: { saga: Saga; data: GameData; chars: Character[]; covs: Covenant[]; derived: Map<string, DerivedCharacter>; fill?: boolean }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const { currentYear: year, currentSeason: season } = saga;
  const playing = chars.filter(inPlay);
  const drafts = chars.filter((c) => !c.creation.finalized);
  return (
    <Card title={`This season: ${season} ${year}`} tour="table-season" fold="table-season" summary={`${playing.length} characters in play.`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        What each character does this season: what is logged on their sheet, or else their standing activity, which you can change here. A particular book, teacher or lab
        project is planned on their sheet (Seasons &amp; Aging).
      </p>
      {playing.length === 0 && <Empty>No finished characters yet.</Empty>}
      {playing.map((c) => {
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
        return (
          <div key={c.id} className="list-row" style={{ flexWrap: 'wrap' }}>
            <Link to={R.character(saga.id, c)} style={{ minWidth: 120 }}>
              <b>{c.name || 'Unnamed'}</b>
            </Link>
            <span className="badge">{c.type}</span>
            {plan.work > 0 && <span className="small muted">{used.free + used.worship} of {plan.free} free seasons used</span>}
            {logged.some((e) => !e.extra) ? (
              <span className="small">
                <span className="badge good">logged</span> {logged.filter((e) => !e.extra).map((e) => e.summary).join('; ')}
              </span>
            ) : (
              <StandingEditor c={c} d={d} year={year} teachers={teachers} library={cov?.library} team={team} onChange={(s) => updateCharacter(c.id, (x) => void (x.standing = s))} />
            )}
            <span className="row tight small" style={{ marginLeft: 'auto' }}>
              <Link to={R.character(saga.id, c, 'advancement')}>Plan on the sheet</Link>
            </span>
            {!logged.length && (
              <div className="small muted" style={{ flexBasis: '100%' }}>
                {fill ? `→ ${describeStanding(c, d, resolveStanding(c, d, year))}` : '→ nothing (unplanned seasons are left empty)'}
              </div>
            )}
            {logged
              .filter((e) => e.extra)
              .map((e) => (
                <div key={e.uid} className="small" style={{ flexBasis: '100%' }}>
                  <span className="badge">extra season</span> {e.summary}
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
      })}
      {drafts.length > 0 && <p className="small muted">Still in creation, so time does not move them: {drafts.map((c) => c.name || 'Unnamed').join(', ')}.</p>}
    </Card>
  );
}
