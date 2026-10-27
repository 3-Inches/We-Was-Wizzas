import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StandingEditor } from '../StandingEditor';
import { specAbilities, specChar, specHighest } from '../../../engine/covenantRules';
import { ARTS, ART_NAMES, CHARACTERISTICS, CHAR_NAMES, FORMS, SEASONS, TECHNIQUES, type Art, type Characteristic } from '../../../data';
import { agingRoll, applyAgingPoint, applySeason, computeStudy, crisisRoll, lapseLongevity, magianLinkedGains, newSeasonEntry, visForStudy, type AgingResult, type StudySource } from '../../../engine/longterm';
import { stressDie, describeStress } from '../../../engine/dice';
import { abilityXpForScore } from '../../../engine/xp';
import type { SeasonLogEntry } from '../../../engine/types';
import { ensureAbility } from '../../../engine/character/factory';
import { purseOf, takeVis, visAvailable } from '../../../engine/vis';
import { Card, Field, Stepper, Total, signed } from '../../kit';
import type { CharEditor } from '../useChar';
import { useStore } from '../../../store/store';
import { TwilightCard } from './Twilight';
import { useWorkProject } from './LabProjects';
import { planProject, visShort } from '../../../engine/projects';
import { seasonTaken } from '../../../engine/time';
import { MysteriesCard } from './MysteriesCard';
import { GuildCard } from './GuildCard';
import { WritingCard } from './Writing';
import { WorkshopCard } from './WorkshopCard';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { characterContext } from '../../../engine/context';
import { deriveCharacter } from '../../../engine/character/derive';

type Kind = 'summa' | 'tractatus' | 'teacher' | 'training' | 'practice' | 'exposure' | 'adventure' | 'vis' | 'lab' | 'other';

const KIND_LABEL: Record<Kind, string> = {
  summa: 'Read a summa',
  tractatus: 'Read a tractatus',
  teacher: 'Taught by a teacher',
  training: 'Trained by a master',
  practice: 'Practice',
  exposure: 'Exposure (while working)',
  adventure: 'Adventure experience',
  vis: 'Study raw vis',
  lab: 'Lab work on a project',
  other: 'Other activity (no xp)',
};

const ACTIVITY: Record<Kind, SeasonLogEntry['activity']> = {
  summa: 'study-book', tractatus: 'study-book', teacher: 'taught', training: 'trained', practice: 'practice', exposure: 'exposure', adventure: 'adventure', vis: 'study-vis', lab: 'other', other: 'other',
};

export default function AdvancementTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, saga, ctx } = ed;
  const updateCovenant = useStore((s) => s.updateCovenant);
  const workSeason = useWorkProject(ed);
  const [projectUid, setProjectUid] = useState('');
  const [labLines, setLabLines] = useState<string[]>([]);
  const [kind, setKind] = useState<Kind>('summa');
  const [target0, setTarget] = useState<string>('art:Cr');
  const [quality, setQuality] = useState(10);
  const [level, setLevel] = useState(10);
  const [com, setCom] = useState(1);
  const [teaching, setTeaching] = useState(3);
  const [teacherScore, setTeacherScore] = useState(10);
  const [students, setStudents] = useState(1);
  const [goodTeacher, setGoodTeacher] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [labTeaching, setLabTeaching] = useState(0);
  const sagaChars = useSagaCharacters(c?.sagaId);
  const sagaCovs = useSagaCovenants(c?.sagaId);
  // the teacher's own lab, for its Teaching Specialization (Covenants: teaching done in the lab)
  const [teacherLab, setTeacherLab] = useState<{ name: string; teaching: number } | null>(null);
  const [visDie, setVisDie] = useState<number | null>(null);
  const [visBotch, setVisBotch] = useState(0);
  const [summary, setSummary] = useState('');
  const [monthsLost, setMonthsLost] = useState(0);
  const [eat, setEat] = useState(0);
  const [bookUid, setBookUid] = useState('');
  // a season is always the saga's current one: time moves for everyone on the Seasons page
  const year = saga?.currentYear ?? 1220;
  const season: SeasonLogEntry['season'] = saga?.currentSeason ?? 'Spring';
  const [aging, setAging] = useState<AgingResult | null>(null);
  const [lcOverride, setLcOverride] = useState<number | null>(null);
  const [agingText, setAgingText] = useState<string[]>([]);
  const [anyChar, setAnyChar] = useState<Characteristic>('Sta');
  const [insightArts, setInsightArts] = useState<string[]>([]);
  if (!c || !d || !saga) return null;

  // raw vis teaches a Hermetic Art, and only to those who can learn Arts (DE, Studying from Vis)
  const canStudyArts = d.isMagus || d.hasGift;
  // without Arts, the subject is an Ability: the first in the list, until one is chosen
  const firstAbility = d.abilities.slice().sort((a, b) => a.name.localeCompare(b.name))[0];
  const target = target0.startsWith('art:') && !canStudyArts && firstAbility ? `ability:${firstAbility.uid}` : target0;
  const isArt = target.startsWith('art:');
  const art = isArt ? (target.slice(4) as Art) : undefined;
  const abilityUid = target.startsWith('ability:') ? target.slice(8) : undefined;
  const masterySpell = target.startsWith('mastery:') ? c.spells.find((s) => s.uid === target.slice(8)) : undefined;
  const subject = art ? ART_NAMES[art] : masterySpell ? `Mastery of ${masterySpell.spell.name}` : d.abilityByUid.get(abilityUid ?? '')?.name ?? '';
  const library = ctx.covenant?.library ?? [];
  // another character of the saga as teacher or master: their Communication, Teaching, Good Teacher and score in the subject
  const pickTeacher = (id: string) => {
    setTeacherId(id);
    // one of the covenant's teachers or specialists (DE p.180): their Communication, Teaching, Good Teacher and score in the subject
    if (id.startsWith('spec:')) {
      const sp = ctx.covenant?.specialists.find((x) => x.uid === id.slice(5));
      if (!sp) return;
      setCom(specChar(sp, 'Com'));
      setTeaching(sp.teaching ?? 0);
      setGoodTeacher(!!sp.goodTeacher);
      const mine = abilityUid ? c.abilities.find((a) => a.uid === abilityUid) : undefined;
      const theirs = mine ? specAbilities(sp).find((a) => a.id === mine.abilityId && (a.param ?? '') === (mine.param ?? '')) : undefined;
      setTeacherScore(theirs?.score ?? (mine ? 0 : specHighest(sp)));
      return;
    }
    const t = sagaChars.find((x) => x.id === id);
    setTeacherLab(null);
    if (!t) return;
    const tLab = characterContext(t, sagaCovs, data).lab;
    if (tLab?.specializations.Teaching) setTeacherLab({ name: tLab.lab.name, teaching: Math.min(3, tLab.specializations.Teaching) });
    const td = deriveCharacter(t, data, saga.houseRules);
    setCom(td.characteristics.Com.value);
    setTeaching(td.abilities.find((a) => a.abilityId === 'teaching')?.score ?? 0);
    setGoodTeacher(td.virtues.some((v) => v.cv.defId === 'good-teacher'));
    const mine = abilityUid ? c.abilities.find((a) => a.uid === abilityUid) : undefined;
    const theirs = mine ? t.abilities.find((a) => a.abilityId === mine.abilityId && (a.param ?? '') === (mine.param ?? '')) : undefined;
    const score = art ? td.arts[art].score : theirs ? td.abilityByUid.get(theirs.uid)?.score ?? 0 : 0;
    setTeacherScore(score);
  };
  const myLabTeaching = ctx.lab?.specializations.Teaching ?? 0;

  let src: StudySource | null = null;
  switch (kind) {
    case 'summa': src = { kind, quality, level, isArt, subject }; break;
    case 'tractatus': src = { kind, quality, isArt, subject }; break;
    case 'teacher': src = { kind, com, teaching, teacherScore, students, goodTeacher, isArt, subject, labTeaching }; break;
    case 'training': src = { kind, masterScore: teacherScore, subject, labTeaching }; break;
    case 'practice': src = { kind, quality, subject }; break;
    case 'exposure': src = { kind, subject }; break;
    case 'adventure': src = { kind, quality: Math.min(quality, 5), subject }; break;
    case 'vis': src = visDie === null ? null : { kind, art: art ?? 'Vi', dieRoll: visDie, aura: ctx.aura.realm === 'Magic' ? ctx.aura.strength : 0 }; break;
    default: src = null;
  }
  const cov = ctx.covenant;
  // a magic character's Might comes off its Advancement Totals; vis it eats lessens that (RoP: Magic)
  const might = d.magicChar && d.magicChar.might > 0 ? d.magicChar.might : 0;
  const eaten = might ? Math.min(eat, Math.ceil(might / 2)) : 0;
  const purseVis = visAvailable(c.purse?.vis ?? [], [...ARTS]);
  const res = src ? computeStudy(d, src, { art, abilityUid, monthsLost, visEaten: eaten }) : null;
  const linked = src && res && res.xp > 0 ? magianLinkedGains(d, data, src, abilityUid, res.advancementTotal) : [];
  // Secondary Insight: a season studying a Technique (book, teacher or vis) gives 1 xp in up to four Forms;
  // a Form gives 1 xp in up to two Techniques (DE Secondary Insight)
  const insight = !!art && d.virtues.some((v) => v.cv.defId === 'secondary-insight') && ['summa', 'tractatus', 'teacher', 'vis'].includes(kind) && !!res && res.xp > 0;
  const insightMax = art && (TECHNIQUES as readonly string[]).includes(art) ? 4 : 2;
  const insightPool: string[] = art ? ((TECHNIQUES as readonly string[]).includes(art) ? [...FORMS] : [...TECHNIQUES]).filter((a) => a !== art) : [];
  const insightPicked = insightArts.filter((a) => insightPool.includes(a)).slice(0, insightMax);
  const trainingNotAllowed = kind === 'training' && isArt;
  const visNotAllowed = kind === 'vis' && !isArt;
  const visPawns = art ? visForStudy(d.arts[art].score) : 0;
  const tractatusRead = kind === 'tractatus' && bookUid && library.find((b) => b.uid === bookUid)?.readBy?.includes(c.id);

  const openProjects = (c.projects ?? []).filter((p) => !p.done);
  const project = openProjects.find((p) => p.uid === projectUid) ?? openProjects[0];
  // a season holds one activity, an adventure aside (DE)
  const taken = seasonTaken(c, year, season);
  const doubled = taken.length > 0 && kind !== 'adventure';
  const plan0 = kind === 'lab' && project ? planProject(project, c, d, ctx, { subject: sagaChars.find((x) => x.id === project.subjectId), data }) : undefined;
  const short = plan0 && project ? visShort(project, c, ctx, plan0) : undefined;
  const projectPlan = plan0 && short ? { ...plan0, problems: [...plan0.problems, short] } : plan0;
  const logSeason = () => {
    if (kind === 'lab') {
      if (project) setLabLines(workSeason(project));
      return;
    }
    const gains: Record<string, number> = {};
    if (res && res.xp > 0) gains[target] = res.xp;
    const linkedText = linked.filter((l) => l.xp > 0).map((l) => `${l.name} +${l.xp}`).join(', ');
    const insightText = insight && insightPicked.length ? `; Secondary Insight: +1 ${insightPicked.join(', ')}` : '';
    const text = summary || (kind === 'other' ? 'Other activity' : `${KIND_LABEL[kind]}: ${subject}${res ? ` (+${res.xp} xp)` : ''}${linkedText ? `; Magian Lineage: ${linkedText}` : ''}${insightText}`);
    const entry = newSeasonEntry(year, season, ACTIVITY[kind], text, gains);
    if (res) entry.sourceQuality = res.advancementTotal;
    if (kind === 'vis' && art) entry.visUsed = [{ art, pawns: visPawns }];
    // the vis eaten: from the purse if it is there, else from the covenant's stocks
    let ate: { art: Art; pawns: number }[] = [];
    if (eaten && purseVis >= eaten) ate = takeVis(purseOf(structuredClone(c)).vis, [...ARTS], eaten).taken;
    else if (eaten && cov && visAvailable(cov.visStocks, [...ARTS]) >= eaten) {
      ate = takeVis(structuredClone(cov.visStocks), [...ARTS], eaten).taken;
      updateCovenant(cov.id, (x) => void takeVis(x.visStocks, [...ARTS], eaten));
    }
    if (eaten) {
      entry.visUsed = [...(entry.visUsed ?? []), ...(ate.length ? ate : [{ art: 'Vi' as Art, pawns: eaten }])];
      entry.summary += `; ate ${eaten} pawn${eaten > 1 ? 's' : ''} of vis${ate.length ? '' : ' (from elsewhere)'}`;
    }
    const fromPurse = eaten > 0 && purseVis >= eaten;
    if (kind === 'vis' && visBotch) entry.warpingPoints = visBotch;
    if (bookUid) entry.bookId = bookUid;
    update((x) => {
      if (fromPurse) takeVis(purseOf(x).vis, [...ARTS], eaten);
      // Magian Lineage: the connected Abilities gain too (added to the character if new)
      for (const l of linked) if (l.xp > 0) entry.gains[`ability:${l.uid ?? ensureAbility(x, l.abilityId).uid}`] = l.xp;
      if (insight) for (const a of insightPicked) entry.gains[`art:${a}`] = (entry.gains[`art:${a}`] ?? 0) + 1;
      applySeason(x, entry, 1);
      x.seasonLog.push(entry);
    });
    if (kind === 'tractatus' && bookUid && cov) updateCovenant(cov.id, (x) => { const b = x.library.find((y) => y.uid === bookUid); if (b && !b.readBy?.includes(c.id)) b.readBy = [...(b.readBy ?? []), c.id]; });
    setSummary('');
    setEat(0);
    setVisDie(null);
    setVisBotch(0);
  };

  const pickBook = (uid: string) => {
    setBookUid(uid);
    const b = library.find((x) => x.uid === uid);
    if (!b) return;
    if (b.kind === 'summa') setKind('summa');
    if (b.kind === 'tractatus') setKind('tractatus');
    setQuality(b.quality);
    setLevel(b.level);
    if (b.subjectType === 'art') setTarget(`art:${b.subject}`);
    else if (b.subjectType === 'ability') {
      const ab = c.abilities.find((a) => a.abilityId === b.subject);
      if (ab) setTarget(`ability:${ab.uid}`);
    }
  };

  // Living conditions: DE p.391 table (covenant magus +1/+2, mundane +1/0) + covenant finances + Virtues + half lab Health.
  const baseLc = cov ? (cov.season === 'Summer' || cov.season === 'Autumn' ? (d.isMagus ? 2 : 1) : d.isMagus ? 1 : 0) : 0;
  const labHealth = ctx.lab ? Math.floor(ctx.lab.characteristics.Health / 2) : 0;
  const autoLc = baseLc + (cov?.finances.livingConditions ?? 0) + d.livingConditionsMod + labHealth;
  const lc = lcOverride ?? autoLc;
  const lr = c.longevity?.bonus ?? 0;

  const rollAging = () => {
    const r = agingRoll(c.age, lc, lr, d.agingRollParts, undefined, !!c.longevity && c.age < 35);
    setAging(r);
    setAgingText([]);
  };
  const agedThisYear = c.lastAgedYear === year;

  const applyAging = () => {
    if (!aging) return;
    const out: string[] = [];
    update((x) => {
      x.lastAgedYear = year;
      if (aging.apparentAging) x.apparentAge = (x.apparentAge ?? x.age) + 1;
      for (const p of aging.agingPoints) out.push(applyAgingPoint(x, p.char as Characteristic, p.points));
      if (aging.anyChar) out.push(applyAgingPoint(x, anyChar, aging.anyChar));
      if (aging.crisis) {
        const nextLevel = abilityXpForScore(d.decrepitude + 1);
        const need = Math.max(1, nextLevel - x.decrepitudePoints);
        for (let i = 0; i < need; i++) out.push(applyAgingPoint(x, anyChar, 1));
        if (x.longevity) {
          out.push('The crisis ends the Longevity Ritual; it can be performed again from its Laboratory Text (Lab & items).');
          lapseLongevity(x, year);
        }
      }
    });
    setAgingText(out);
    setAging(null);
  };

  const rollCrisis = () => {
    const r = crisisRoll(c.age, d.decrepitude);
    setAgingText((t) => [...t, `Crisis roll ${r.roll}: ${r.text}`]);
  };

  return (
    <div className="stack">
      <Card title="Plan a season" className="accent" tour="plan-season">
        <div className="row">
          <Field label="Season" hint={<Link to={`/saga/${saga.id}/seasons`}>the saga&apos;s; move time on the Seasons page</Link>}>
            <b>
              {season} {year}
            </b>
          </Field>
          <Field label="Months lost" hint="DE Distractions: each full month away takes a third of the total">
            <Stepper value={monthsLost} min={0} max={3} width={30} onChange={setMonthsLost} />
          </Field>
          {might > 0 && (
            <Field
              label="Vis eaten"
              hint={`RoP: Magic: its Might ${might} comes off the Advancement Total; each pawn of vis, of any Art, takes 2 off that. ${purseVis} in the purse${cov ? `, ${visAvailable(cov.visStocks, [...ARTS])} in the covenant's stocks` : ''}`}
            >
              <Stepper value={eaten} min={0} max={Math.ceil(might / 2)} width={30} onChange={setEat} />
            </Field>
          )}
          <Field label="Activity">
            <select
              value={kind}
              onChange={(e) => {
                const k = e.target.value as Kind;
                setKind(k);
                // practice starts from its usual Quality, adventure from no more than 5
                if (k === 'practice') setQuality(4);
                if (k === 'adventure') setQuality((q) => Math.min(q, 5));
              }}
            >
              {(Object.keys(KIND_LABEL) as Kind[]).filter((k) => (k !== 'vis' || canStudyArts || kind === 'vis') && (k !== 'lab' || d.isMagus)).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          {kind === 'lab' && (
            <Field label="Project" hint="Plan projects on the Lab, Items & Familiar tab">
              <select value={project?.uid ?? ''} onChange={(e) => setProjectUid(e.target.value)}>
                {openProjects.length === 0 && <option value="">— no project planned yet —</option>}
                {openProjects.map((p) => (
                  <option key={p.uid} value={p.uid}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {kind !== 'other' && kind !== 'lab' && (
            <Field label="Subject">
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {(d.isMagus || d.hasGift) && (
                  <optgroup label="Arts">
                    {ARTS.map((a) => (
                      <option key={a} value={`art:${a}`}>
                        {ART_NAMES[a]} ({d.arts[a].score})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Abilities">
                  {d.abilities
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((a) => (
                      <option key={a.uid} value={`ability:${a.uid}`}>
                        {a.name} ({a.score})
                      </option>
                    ))}
                </optgroup>
                {c.spells.length > 0 && (
                  <optgroup label="Spell Mastery">
                    {c.spells.map((sp) => (
                      <option key={sp.uid} value={`mastery:${sp.uid}`}>
                        {sp.spell.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Field>
          )}
          {(kind === 'summa' || kind === 'tractatus') && library.length > 0 && (
            <Field label="From the covenant library">
              <select value={bookUid} onChange={(e) => pickBook(e.target.value)}>
                <option value="">— enter manually —</option>
                {library
                  .filter((b) => b.kind === 'summa' || b.kind === 'tractatus')
                  .map((b) => (
                    <option key={b.uid} value={b.uid}>
                      {b.title} ({b.kind} {b.subject} {b.kind === 'summa' ? `L${b.level} ` : ''}Q{b.quality})
                    </option>
                  ))}
              </select>
            </Field>
          )}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          {(kind === 'summa' || kind === 'tractatus' || kind === 'practice' || kind === 'adventure') && (
            <Field label={kind === 'practice' ? 'Practice quality (4; language immersion 8; spell mastery 5)' : kind === 'adventure' ? 'Adventure xp for this subject (≤5)' : 'Quality'}>
              <Stepper value={quality} min={0} width={40} onChange={setQuality} />
            </Field>
          )}
          {kind === 'summa' && (
            <Field label="Level">
              <Stepper value={level} min={1} width={40} onChange={setLevel} />
            </Field>
          )}
          {(kind === 'teacher' || kind === 'training') && (
            <>
              <Field label={kind === 'teacher' ? 'Teacher' : 'Master'} hint="fills in their Communication, Teaching, Good Teacher and score">
                <select value={teacherId} onChange={(e) => pickTeacher(e.target.value)}>
                  <option value="">— someone else —</option>
                  {sagaChars
                    .filter((x) => x.id !== c.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name || 'unnamed'}
                      </option>
                    ))}
                  {(ctx.covenant?.specialists ?? []).filter((x) => !x.characterId && (kind === 'training' || x.role === 'teacher')).length > 0 && (
                    <optgroup label={`${ctx.covenant!.name}'s ${kind === 'training' ? 'specialists' : 'teachers'}`}>
                      {ctx.covenant!.specialists
                        .filter((x) => !x.characterId && (kind === 'training' || x.role === 'teacher'))
                        .map((x) => (
                          <option key={x.uid} value={`spec:${x.uid}`}>
                            {x.name || x.role} ({specAbilities(x).map((a) => `${a.id ? data.abilityById.get(a.id)?.name ?? a.label : a.label}${a.param ? ` ${a.param}` : ''} ${a.score}`).join(', ')})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </Field>
              <Field label="Lab Teaching Specialization" hint="when the lessons are given in a lab with a Teaching Specialization (at most +3)">
                <Stepper value={labTeaching} min={0} max={3} width={32} onChange={setLabTeaching} />
              </Field>
              {myLabTeaching > 0 && labTeaching !== Math.min(3, myLabTeaching) && (
                <button className="small" onClick={() => setLabTeaching(Math.min(3, myLabTeaching))}>
                  In my lab (+{Math.min(3, myLabTeaching)})
                </button>
              )}
              {teacherLab && labTeaching !== teacherLab.teaching && (
                <button className="small" onClick={() => setLabTeaching(teacherLab.teaching)}>
                  In {teacherLab.name} (+{teacherLab.teaching})
                </button>
              )}
            </>
          )}
          {kind === 'teacher' && (
            <>
              <Field label="Teacher Com">
                <Stepper value={com} width={36} onChange={setCom} />
              </Field>
              <Field label="Teaching">
                <Stepper value={teaching} min={0} width={36} onChange={setTeaching} />
              </Field>
              <Field label="Teacher's score">
                <Stepper value={teacherScore} min={0} width={40} onChange={setTeacherScore} />
              </Field>
              <Field label="Students">
                <Stepper value={students} min={1} width={36} onChange={setStudents} />
              </Field>
              <label className="inline small">
                <input type="checkbox" checked={goodTeacher} onChange={(e) => setGoodTeacher(e.target.checked)} /> Good Teacher
              </label>
            </>
          )}
          {kind === 'training' && (
            <Field label="Master's score">
              <Stepper value={teacherScore} min={0} width={40} onChange={setTeacherScore} />
            </Field>
          )}
          {kind === 'vis' && (
            <>
              <span className="small">
                Needs {visPawns} pawn{visPawns > 1 ? 's' : ''} of {art ? ART_NAMES[art] : '—'} vis (1 per 5 points of the Art).
              </span>
              <button
                onClick={() => {
                  const r = stressDie(1);
                  setVisDie(r.botches ? 0 : r.value);
                  setVisBotch(r.botches ? r.botches : 0);
                  setSummary(`Studied ${art ? ART_NAMES[art] : ''} vis: ${describeStress(r)}`);
                }}
              >
                Roll stress die
              </button>
              <Field label="or enter die">
                <Stepper value={visDie ?? 0} min={0} width={40} onChange={setVisDie} />
              </Field>
              {visBotch > 0 && <span className="badge bad">Botch: {visBotch} Warping point(s), no xp</span>}
            </>
          )}
        </div>
        {trainingNotAllowed && <p className="small bad-text">Arts cannot be learned by training (DE p.377); use teaching instead.</p>}
        {visNotAllowed && <p className="small bad-text">Raw vis teaches a Hermetic Art; choose an Art as the subject.</p>}
        {tractatusRead && <p className="small warn-text">This character has already read this tractatus; a tractatus gives experience only once.</p>}
        {res && (
          <div className="row" style={{ marginTop: 8 }}>
            <div className="stat">
              <span className="v">
                <Total value={res.advancementTotal} parts={res.parts} notes={res.notes} label="Source Quality" />
              </span>
              <span className="l">Source Quality</span>
            </div>
            <div className="stat">
              <span className="v">+{res.xp}</span>
              <span className="l">xp gained{res.capped ? ' (capped)' : ''}</span>
            </div>
            {res.notes.map((n, i) => (
              <span key={i} className="small warn-text">
                {n}
              </span>
            ))}
            {insight && (
              <span className="small">
                Secondary Insight: +1 xp each in up to {insightMax} {insightMax === 4 ? 'Forms' : 'Techniques'} ({insightPicked.length} picked):{' '}
                {insightPool.map((a) => (
                  <label key={a} className="inline">
                    <input
                      type="checkbox"
                      checked={insightPicked.includes(a)}
                      disabled={!insightPicked.includes(a) && insightPicked.length >= insightMax}
                      onChange={(e) => setInsightArts(e.target.checked ? [...insightArts, a] : insightArts.filter((x) => x !== a))}
                    />{' '}
                    {a}
                  </label>
                ))}
              </span>
            )}
            {linked.length > 0 && (
              <span className="small" title="Major Magian Lineage: half the Source Quality (rounded up) in each other connected Ability (DE, Magian Lineage)">
                Magian Lineage:{' '}
                {linked.map((l) => (l.xp > 0 ? `${l.name} +${l.xp} xp` : `${l.name}: nothing (${l.blocked})`)).join(' · ')}
              </span>
            )}
          </div>
        )}
        {doubled && (
          <p className="small warn-text" style={{ margin: '8px 0 0' }}>
            {season} {year} already holds {taken.map((e) => e.summary).join('; ')}. A season holds one activity, besides an adventure{kind === 'lab' ? ': lab work waits for the next season' : '; log another only to split a season the storyguide allows'}.
          </p>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <input style={{ flex: 1 }} value={summary} placeholder="Summary for the log (optional)" onChange={(e) => setSummary(e.target.value)} />
          <button className="primary" onClick={logSeason} disabled={trainingNotAllowed || visNotAllowed || (kind === 'vis' && visDie === null) || (kind === 'lab' && (!project || !!projectPlan?.problems.length || doubled))}>
            Log season{res?.xp ? ` & add ${res.xp} xp` : ''}
          </button>
        </div>
        {kind === 'lab' && projectPlan && (
          <div className="small" style={{ marginTop: 4 }}>
            <span className="muted">{projectPlan.summary}</span>{' '}
            {projectPlan.problems.map((x) => (
              <span key={x} className={/cannot be used for/.test(x) ? 'bad-text' : 'warn-text'}>
                {x}{' '}
              </span>
            ))}
          </div>
        )}
        {kind === 'lab' && labLines.length > 0 && (
          <div className="small list-row" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
            {labLines.join('\n')}
          </div>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>
          Summae raise a score only up to their level; teachers only up to their own score. Tractatus quality is Com + 6; a character can read each tractatus once. Books, vis and
          teachers can be linked from your covenant (Covenant → Library).
        </p>
      </Card>

      <Card title="When nothing is planned" tour="standing">
        <div className="row small">
          <span>Standing activity:</span>
          <StandingEditor
            c={c}
            d={d}
            season={season}
            teachers={ctx.covenant?.specialists.filter((x) => x.role === 'teacher' && !x.characterId) ?? []}
            onChange={(st) => update((x) => void (x.standing = st))}
          />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Followed in any season this character has nothing logged when the saga moves on (and while years are passed at once on the Seasons page).
        </p>
      </Card>

      <Card title="Season log">
        {c.seasonLog.length === 0 && <div className="small muted">No seasons logged yet.</div>}
        {c.seasonLog
          .slice()
          .sort((a, b) => b.year - a.year || SEASONS.indexOf(b.season) - SEASONS.indexOf(a.season))
          .map((e) => (
            <div key={e.uid} className="list-row">
              <span className="badge">
                {e.season} {e.year}
              </span>
              <span style={{ flex: 1 }}>
                {e.summary}
                {Object.keys(e.gains).length > 0 && <span className="small muted"> — {Object.entries(e.gains).map(([k, v]) => `${labelFor(k, c, d)} +${v}`).join(', ')}</span>}
                {e.warpingPoints ? <span className="small warn-text"> — {e.warpingPoints} Warping</span> : null}
                {!e.applied && <span className="badge warn">not applied</span>}
              </span>
              <button
                className="small ghost"
                title={e.applied ? 'Remove this entry and subtract its experience' : 'Delete'}
                onClick={() =>
                  update((x) => {
                    const ent = x.seasonLog.find((y) => y.uid === e.uid);
                    if (ent?.applied) applySeason(x, ent, -1);
                    x.seasonLog = x.seasonLog.filter((y) => y.uid !== e.uid);
                  })
                }
              >
                ✕ undo
              </button>
            </div>
          ))}
      </Card>

      <div className="grid grid-2">
        <Card title="Aging">
          <div className="row">
            <div className="stat">
              <span className="v">{c.age}</span>
              <span className="l">Age</span>
            </div>
            <div className="stat">
              <span className="v">{c.apparentAge ?? c.age}</span>
              <span className="l">Apparent</span>
            </div>
            <div className="stat">
              <span className="v">
                {d.decrepitude} ({c.decrepitudePoints})
              </span>
              <span className="l">Decrepitude</span>
            </div>
            <button className="small" onClick={() => update((x) => void (x.age += 1))}>
              Age +1 year
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <Field label={`Living Conditions (auto ${signed(autoLc)})`}>
              <div className="row tight">
                <Stepper value={lc} width={36} onChange={(v) => setLcOverride(v)} />
                {lcOverride !== null && (
                  <button className="small ghost" onClick={() => setLcOverride(null)}>
                    auto
                  </button>
                )}
              </div>
            </Field>
            <div className="small">
              Longevity Ritual: <b>{lr ? `−${lr}` : 'none'}</b>
              {d.agingRollParts.map((m) => (
                <span key={m.label}>
                  <br />
                  {m.label}: {signed(m.value)}
                </span>
              ))}
            </div>
            {d.magicChar && <p className="small muted">A magic character does not age (RoP: Magic), so it makes no aging rolls.</p>}
            <button onClick={rollAging} disabled={!!d.magicChar || (c.age < 35 && !c.longevity) || agedThisYear} title="Aging is rolled for everyone when the saga's year ends (Seasons page); roll here only out of turn">
              {agedThisYear ? `Aged for ${year}` : 'Roll aging now'}
            </button>
          </div>
          {c.age < 35 && !c.longevity && <p className="small muted">Aging rolls start at age 35 (or earlier with a Longevity Ritual).</p>}
          {aging && (
            <div className="issue info" style={{ marginTop: 8 }}>
              <div className="msg">
                Aging roll <b>{aging.roll}</b> (die {aging.die} {aging.mods.map((m) => `${signed(m.value)} ${m.label}`).join(' ')}): {aging.text}
                {(aging.anyChar > 0 || aging.crisis) && (
                  <div className="row tight">
                    Aging Points go to:
                    <select value={anyChar} onChange={(e) => setAnyChar(e.target.value as Characteristic)}>
                      {CHARACTERISTICS.map((k) => (
                        <option key={k} value={k}>
                          {CHAR_NAMES[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button className="small" onClick={applyAging}>
                Apply
              </button>
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="small" onClick={rollCrisis}>
              Roll on Crisis table
            </button>
            <span className="small muted">Simple die + age/10 + Decrepitude</span>
          </div>
          {agingText.map((t, i) => (
            <div key={i} className="small">
              {t}
            </div>
          ))}
        </Card>

        <TwilightCard ed={ed} />
        <MysteriesCard ed={ed} />
        <WritingCard ed={ed} />
        <WorkshopCard ed={ed} />
        <GuildCard ed={ed} />
      </div>
    </div>
  );
}

function labelFor(key: string, c: NonNullable<CharEditor['c']>, d: NonNullable<CharEditor['d']>): string {
  const [k, id] = key.split(':');
  if (k === 'art') return ART_NAMES[id as Art] ?? id;
  if (k === 'ability') return d.abilityByUid.get(id)?.name ?? 'ability';
  if (k === 'mastery') return `Mastery: ${c.spells.find((s) => s.uid === id)?.spell.name ?? 'spell'}`;
  return key;
}
