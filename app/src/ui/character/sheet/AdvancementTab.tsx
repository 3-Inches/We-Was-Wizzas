import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StandingEditor, teamOf } from '../StandingEditor';
import { bestLesson, teachableSubjects } from '../../../engine/teaching';
import { PrioritiesCard } from './PrioritiesCard';
import { specAbilities, specChar, specHighest } from '../../../engine/covenantRules';
import { ARTS, ART_NAMES, CHARACTERISTICS, CHAR_NAMES, FORMS, SEASONS, TECHNIQUES, type Art, type Characteristic } from '../../../data';
import { agingRoll, applyAgingPoint, applySeason, computeStudy, crisisRoll, lapseLongevity, magianLinkedGains, newSeasonEntry, visForStudy, type AgingResult, type StudySource } from '../../../engine/longterm';
import { stressDie, describeStress } from '../../../engine/dice';
import { abilityXpForScore } from '../../../engine/xp';
import type { SeasonLogEntry } from '../../../engine/types';
import { ensureAbility } from '../../../engine/character/factory';
import { purseOf, takeVis, visAvailable } from '../../../engine/vis';
import { Card, Field, HowItWorks, Stepper, Total, signed } from '../../kit';
import type { CharEditor } from '../useChar';
import { useStore } from '../../../store/store';
import { TwilightCard } from './Twilight';
import { HelpersRow, previewHelpers, useWorkProject } from './LabProjects';
import { planProject, visShort } from '../../../engine/projects';
import { extraFree, loggedThisSeason, seasonBusy, seasonTaken } from '../../../engine/time';
import { SeasonPlan } from '../SeasonPlan';
import { seasonsOf, seasonsUsed } from '../../../engine/seasons';
import { MysteriesCard } from './MysteriesCard';
import { GuildCard } from './GuildCard';
import { WritingCard } from './Writing';
import { WorkshopCard } from './WorkshopCard';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { characterContext } from '../../../engine/context';
import { deriveCharacter } from '../../../engine/character/derive';
import { teaches } from '../../../engine/covenfolk';
import { HAZARDS, hazardPenalty } from '../../../engine/disease';

type Kind = 'summa' | 'tractatus' | 'teacher' | 'training' | 'practice' | 'exposure' | 'adventure' | 'vis' | 'worship' | 'lab' | 'other';

const KIND_LABEL: Record<Kind, string> = {
  summa: 'Read a summa',
  tractatus: 'Read a tractatus',
  teacher: 'Taught by a teacher',
  training: 'Trained by a master',
  practice: 'Practice',
  exposure: 'Exposure (while working)',
  adventure: 'Adventure experience',
  vis: 'Study raw vis',
  worship: 'Worship (a church’s Dominion)',
  lab: 'Lab work on a project',
  other: 'Other activity (no xp)',
};

const ACTIVITY: Record<Kind, SeasonLogEntry['activity']> = {
  summa: 'study-book', tractatus: 'study-book', teacher: 'taught', training: 'trained', practice: 'practice', exposure: 'exposure', adventure: 'adventure', vis: 'study-vis', worship: 'worship', lab: 'other', other: 'other',
};

export default function AdvancementTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, saga, ctx } = ed;
  const updateCovenant = useStore((s) => s.updateCovenant);
  const workSeason = useWorkProject(ed);
  const [projectUid, setProjectUid] = useState('');
  const [labLines, setLabLines] = useState<string[]>([]);
  const [helperIds, setHelperIds] = useState<string[]>([]);
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
  // a covenant-mate teaching: log their season too (Exposure in Teaching)
  const [logTeacher, setLogTeacher] = useState(true);
  const updateCharacter = useStore((s) => s.updateCharacter);
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
  // Worship teaches Church Lore, Concentration or Music (The Church): one the character knows, or Church Lore begun
  const worshipAbilities = d.abilities.filter((a) => (a.abilityId === 'organization-lore' && /church/i.test(a.name)) || a.abilityId === 'concentration' || a.abilityId === 'music');
  const newChurchLore = !worshipAbilities.some((a) => a.abilityId === 'organization-lore');
  const target =
    kind === 'worship'
      ? worshipAbilities.some((a) => `ability:${a.uid}` === target0) || (newChurchLore && target0 === 'new:church-lore')
        ? target0
        : worshipAbilities[0]
          ? `ability:${worshipAbilities[0].uid}`
          : 'new:church-lore'
      : target0.startsWith('art:') && !canStudyArts && firstAbility
        ? `ability:${firstAbility.uid}`
        : target0;
  // another character of the saga teaching: only what they can teach this character (DE, Teaching)
  const mate = kind === 'teacher' && teacherId && !teacherId.startsWith('spec:') ? sagaChars.find((x) => x.id === teacherId) : undefined;
  const mateD = mate ? deriveCharacter(mate, data, saga.houseRules) : undefined;
  const lessons = mate && mateD ? teachableSubjects({ c: mate, d: mateD }, { c, d }, data) : undefined;
  const lessonKey = (x: { key: string; studentKey?: string }) => x.studentKey ?? `new:${x.key}`;
  const lesson = lessons?.subjects.find((x) => lessonKey(x) === target);
  const isArt = target.startsWith('art:');
  const art = isArt ? (target.slice(4) as Art) : undefined;
  const abilityUid = target.startsWith('ability:') ? target.slice(8) : undefined;
  const masterySpell = target.startsWith('mastery:') ? c.spells.find((s) => s.uid === target.slice(8)) : undefined;
  const subject = lesson?.newAbility ? lesson.label : art ? ART_NAMES[art] : masterySpell ? `Mastery of ${masterySpell.spell.name}` : target === 'new:church-lore' ? 'Church Lore' : (d.abilityByUid.get(abilityUid ?? '')?.name ?? '');
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
    // the subject: one this teacher can teach, the one chosen if it is
    const td0 = deriveCharacter(t, data, saga.houseRules);
    const can = teachableSubjects({ c: t, d: td0 }, { c, d }, data).subjects;
    // the subject chosen if they can teach it, else the one that teaches the most
    const keep = can.find((x) => lessonKey(x) === target) ?? bestLesson({ c: t, d: td0 }, [{ c, d }], data).plan?.students[0].sub ?? can[0];
    if (keep) {
      setTarget(lessonKey(keep));
      setTeacherScore(keep.teacherScore);
    }
    const tLab = characterContext(t, sagaCovs, data).lab;
    if (tLab?.specializations.Teaching) setTeacherLab({ name: tLab.lab.name, teaching: Math.min(3, tLab.specializations.Teaching) });
    const td = deriveCharacter(t, data, saga.houseRules);
    setCom(td.characteristics.Com.value);
    setTeaching(td.abilities.find((a) => a.abilityId === 'teaching')?.score ?? 0);
    setGoodTeacher(td.virtues.some((v) => v.cv.defId === 'good-teacher'));
    const mine = abilityUid ? c.abilities.find((a) => a.uid === abilityUid) : undefined;
    const theirs = mine ? t.abilities.find((a) => a.abilityId === mine.abilityId && (a.param ?? '') === (mine.param ?? '')) : undefined;
    const score = art ? td.arts[art].score : theirs ? td.abilityByUid.get(theirs.uid)?.score ?? 0 : 0;
    if (!keep) setTeacherScore(score);
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
    case 'worship': src = { kind, quality, subject }; break;
    case 'vis': src = visDie === null ? null : { kind, art: art ?? 'Vi', dieRoll: visDie, aura: ctx.aura.realm === 'Magic' ? ctx.aura.strength : 0 }; break;
    default: src = null;
  }
  const cov = ctx.covenant;
  // a magic character's Might comes off its Advancement Totals; vis it eats lessens that (RoP: Magic)
  const might = d.magicChar && d.magicChar.might > 0 ? d.magicChar.might : 0;
  const eaten = might ? Math.min(eat, Math.ceil(might / 2)) : 0;
  const purseVis = visAvailable(c.purse?.vis ?? [], [...ARTS]);
  const masteryXp = masterySpell ? Object.values(masterySpell.masteryXp).reduce<number>((t, v) => t + (v ?? 0), 0) : undefined;
  const res = src ? computeStudy(d, src, { art, abilityUid, monthsLost, visEaten: eaten, currentXp: masteryXp }) : null;
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
  // the season a covenant-mate teaching gives: their own if free, else an extra one (needs no sleep)
  const teacherSlot = mate && mateD ? (!seasonBusy(mate, year, season) ? 'main' : extraFree(mate, mateD, year, season) ? 'extra' : undefined) : undefined;
  // a season holds one activity, an adventure aside (DE); one who needs no sleep has extra seasons for study, not lab work
  const taken = seasonTaken(c, year, season);
  const plan = seasonsOf(c, d);
  const used = seasonsUsed(c, year);
  const asExtra = taken.length > 0 && kind !== 'adventure' && kind !== 'lab' && plan.extra > used.extra && !loggedThisSeason(c, year, season).some((e) => e.extra);
  const doubled = taken.length > 0 && kind !== 'adventure' && !asExtra;
  // a working character's free seasons, once spent, leave only work (Exposure) and Worship for the year
  const freeKind = !['exposure', 'worship', 'other'].includes(kind);
  const overFree = !taken.length && freeKind && used.free >= plan.free - plan.worship;
  const plan0 = kind === 'lab' && project ? planProject(project, c, d, ctx, { subject: sagaChars.find((x) => x.id === project.subjectId), data, helpers: previewHelpers(helperIds, sagaChars, c, data, saga.houseRules) }) : undefined;
  const short = plan0 && project ? visShort(project, c, ctx, plan0) : undefined;
  const projectPlan = plan0 && short ? { ...plan0, problems: [...plan0.problems, short] } : plan0;
  // covenant-mates, for teaching and help in the lab
  const team = teamOf(c, sagaChars.filter((x) => !x.wanderer), sagaCovs, data, (x) => deriveCharacter(x, data, saga.houseRules));
  const logSeason = () => {
    if (kind === 'lab') {
      if (project) setLabLines(workSeason(project, helperIds));
      setHelperIds([]);
      return;
    }
    const gains: Record<string, number> = {};
    if (res && res.xp > 0) gains[target] = res.xp;
    const linkedText = linked.filter((l) => l.xp > 0).map((l) => `${l.name} +${l.xp}`).join(', ');
    const insightText = insight && insightPicked.length ? `; Secondary Insight: +1 ${insightPicked.join(', ')}` : '';
    const text = summary || (kind === 'other' ? 'Other activity' : `${KIND_LABEL[kind]}: ${subject}${res ? ` (+${res.xp} xp)` : ''}${linkedText ? `; Magian Lineage: ${linkedText}` : ''}${insightText}`);
    const entry = newSeasonEntry(year, season, ACTIVITY[kind], asExtra ? `Extra season (needs no sleep): ${text}` : text, gains);
    if (asExtra) entry.extra = true;
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
      // Worship begun in Church Lore: the Ability is added
      if (entry.gains['new:church-lore'] !== undefined) {
        entry.gains[`ability:${ensureAbility(x, 'organization-lore', {}, 'Church').uid}`] = entry.gains['new:church-lore'];
        delete entry.gains['new:church-lore'];
      }
      // an Ability new to the character, taught by a covenant-mate: added to the sheet
      if (lesson?.newAbility && entry.gains[target] !== undefined) {
        entry.gains[`ability:${ensureAbility(x, lesson.newAbility.abilityId, {}, lesson.newAbility.param).uid}`] = entry.gains[target];
        delete entry.gains[target];
      }
      if (insight) for (const a of insightPicked) entry.gains[`art:${a}`] = (entry.gains[`art:${a}`] ?? 0) + 1;
      applySeason(x, entry, 1);
      x.seasonLog.push(entry);
    });
    // the teacher's season: Exposure in Teaching, in their own season or an extra one
    if (mate && mateD && logTeacher && teacherSlot) {
      updateCharacter(mate.id, (t) => {
        const tch = ensureAbility(t, 'teaching', {});
        const ex = computeStudy(mateD, { kind: 'exposure', subject: 'Teaching' }, { abilityUid: tch.uid });
        const e = newSeasonEntry(year, season, 'teach', `${teacherSlot === 'extra' ? 'Extra season (needs no sleep): ' : ''}Taught ${subject} to ${c.name || 'a student'} (Exposure: Teaching +${ex.xp} xp)`, ex.xp ? { [`ability:${tch.uid}`]: ex.xp } : {});
        if (teacherSlot === 'extra') e.extra = true;
        applySeason(t, e, 1);
        t.seasonLog.push(e);
      });
    }
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
  const autoLc = baseLc + (cov?.finances.livingConditions ?? 0) + d.livingConditionsMod + labHealth - hazardPenalty(c);
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
          <Field label="Season" hint={<Link to={`/saga/${saga.id}/seasons`}>the saga&apos;s current season; time moves on, for everyone, on the Seasons page</Link>}>
            <b>
              {season} {year}
            </b>
          </Field>
          <Field label="Months lost" hint="Each full month of the season spent away from study takes a third off what is gained (DE, Distractions)">
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
                if (k === 'worship') setQuality(4);
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
              {lessons ? (
                <select
                  value={lesson ? target : ''}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    const x = lessons.subjects.find((y) => lessonKey(y) === e.target.value);
                    if (x) setTeacherScore(x.teacherScore);
                  }}
                >
                  {!lesson && <option value="">— {lessons.subjects.length ? 'choose' : 'nothing they can teach'} —</option>}
                  {lessons.subjects.map((x) => (
                    <option key={x.key} value={lessonKey(x)}>
                      {x.label} ({x.studentScore} → up to {x.teacherScore}){x.newAbility ? ', new' : ''}
                    </option>
                  ))}
                </select>
              ) : (
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {kind === 'worship' ? (
                  <>
                    {worshipAbilities.map((a) => (
                      <option key={a.uid} value={`ability:${a.uid}`}>
                        {a.name} ({a.score})
                      </option>
                    ))}
                    {newChurchLore && <option value="new:church-lore">Church Lore (new)</option>}
                  </>
                ) : null}
                {kind !== 'worship' && (d.isMagus || d.hasGift) && (
                  <optgroup label="Arts">
                    {ARTS.map((a) => (
                      <option key={a} value={`art:${a}`}>
                        {ART_NAMES[a]} ({d.arts[a].score})
                      </option>
                    ))}
                  </optgroup>
                )}
                {kind !== 'worship' && (
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
                )}
                {kind !== 'worship' && c.spells.length > 0 && (
                  <optgroup label="Spell Mastery">
                    {c.spells.map((sp) => (
                      <option key={sp.uid} value={`mastery:${sp.uid}`}>
                        {sp.spell.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              )}
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
          {(kind === 'summa' || kind === 'tractatus' || kind === 'practice' || kind === 'adventure' || kind === 'worship') && (
            <Field label={kind === 'practice' ? 'Practice quality (4; language immersion 8; spell mastery 5)' : kind === 'adventure' ? 'Adventure xp for this subject (≤5)' : kind === 'worship' ? 'The church’s Divine aura (a small church 4, a cathedral 5)' : 'Quality'}>
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
                  {(ctx.covenant?.specialists ?? []).filter((x) => !x.characterId && (kind === 'training' || teaches(x))).length > 0 && (
                    <optgroup label={`${ctx.covenant!.name}'s ${kind === 'training' ? 'specialists' : 'teachers'}`}>
                      {ctx.covenant!.specialists
                        .filter((x) => !x.characterId && (kind === 'training' || teaches(x)))
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
              {mate && (
                <div className="small muted" style={{ flexBasis: '100%' }}>
                  {lessons?.why ??
                    (lessons?.subjects.length
                      ? `What ${mate.name || 'they'} can teach ${c.name || 'this character'}: a score of 2 in an Ability or 5 in an Art, higher than the student’s${lessons.language ? `, in ${lessons.language}` : ''}.`
                      : `${mate.name || 'They'} know nothing more that could be taught.`)}
                  {lessons && lessons.blocked.length > 0 && ` Not ${c.name || 'this character'}’s to learn: ${lessons.blocked.map((b) => `${b.label} (${b.why})`).join('; ')}.`}{' '}
                  {teacherSlot ? (
                    <label className="inline">
                      <input type="checkbox" checked={logTeacher} onChange={(e) => setLogTeacher(e.target.checked)} /> log {mate.name || 'the teacher'}’s {teacherSlot === 'extra' ? 'extra ' : ''}season too (Exposure in Teaching)
                    </label>
                  ) : (
                    `${mate.name || 'The teacher'} has no season free this ${season} to teach in.`
                  )}{' '}
                  To have it happen when time moves on, set {c.name || 'this character'} to be taught by {mate.name || 'them'} on the Game table, or {mate.name || 'them'} to teach.
                </div>
              )}
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
        {asExtra && (
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            {season} {year} already holds {taken.map((e) => e.summary).join('; ')}: this is one of {c.name || 'the character'}&apos;s {plan.extra} extra seasons this year (needs no sleep), {used.extra} used.
          </p>
        )}
        {overFree && (
          <p className="small warn-text" style={{ margin: '8px 0 0' }}>
            {c.name || 'The character'} has used all {plan.free - plan.worship} free season{plan.free - plan.worship === 1 ? '' : 's'} of {year}; the rest of the year is {plan.worship && used.worship < plan.worship ? 'Worship and ' : ''}work (Exposure). Log it anyway only if the storyguide allows.
          </p>
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
        {kind === 'lab' && project && !doubled && <HelpersRow c={c} d={d} chars={sagaChars} ed={ed} helperIds={helperIds} setHelperIds={setHelperIds} />}
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
        <HowItWorks summary="Choose what to study; the toolkit works out the experience it gives.">
          Summae raise a score only up to their level; teachers only up to their own score. Tractatus quality is Com + 6; a character can read each tractatus once. Books, vis and
          teachers can be linked from your covenant (Covenant → Library).
        </HowItWorks>
      </Card>

      <Card title="When nothing is planned" tour="standing">
        <div className="row small">
          <span>Standing activity:</span>
          <StandingEditor
            c={c}
            d={d}
            year={year}
            teachers={ctx.covenant?.specialists.filter((x) => teaches(x)) ?? []}
            library={ctx.covenant?.library}
            team={team}
            onChange={(st) => update((x) => void (x.standing = st))}
          />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          What this character does with a free season when nobody planned one. Once the year&apos;s free seasons are used up, the rest go to work (Exposure) or Worship.
        </p>
        <SeasonPlan c={c} d={d} year={year} update={update} teachers={ctx.covenant?.specialists.filter((x) => teaches(x)) ?? []} team={team} />
      </Card>

      {saga && <PrioritiesCard c={c} d={d} ctx={ctx} saga={saga} data={data} chars={sagaChars} update={update} />}

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
            <div className="small stack" style={{ gap: 2 }}>
              {HAZARDS.map((h) => (
                <label key={h.id} className="inline" title="−1 to Living Conditions on the aging roll (City & Guild)">
                  <input
                    type="checkbox"
                    checked={!!c.hazards?.includes(h.id)}
                    onChange={(e) => update((x) => void (x.hazards = e.target.checked ? [...(x.hazards ?? []), h.id] : (x.hazards ?? []).filter((y) => y !== h.id)))}
                  />{' '}
                  {h.label}
                </label>
              ))}
            </div>
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
