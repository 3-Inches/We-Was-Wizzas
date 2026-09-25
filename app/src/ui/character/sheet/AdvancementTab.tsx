import { useState } from 'react';
import { ARTS, ART_NAMES, CHARACTERISTICS, CHAR_NAMES, SEASONS, type Art, type Characteristic } from '../../../data';
import { agingRoll, applyAgingPoint, applySeason, computeStudy, crisisRoll, newSeasonEntry, twilightAvoidance, twilightComprehension, visForStudy, type AgingResult, type StudySource } from '../../../engine/longterm';
import { stressDie, describeStress } from '../../../engine/dice';
import { abilityXpForScore } from '../../../engine/xp';
import type { SeasonLogEntry } from '../../../engine/types';
import { Card, Field, Stepper, Total, signed } from '../../kit';
import type { CharEditor } from '../useChar';
import { useStore } from '../../../store/store';

type Kind = 'summa' | 'tractatus' | 'teacher' | 'training' | 'practice' | 'exposure' | 'adventure' | 'vis' | 'other';

const KIND_LABEL: Record<Kind, string> = {
  summa: 'Read a summa',
  tractatus: 'Read a tractatus',
  teacher: 'Taught by a teacher',
  training: 'Trained by a master',
  practice: 'Practice',
  exposure: 'Exposure (while working)',
  adventure: 'Adventure experience',
  vis: 'Study raw vis',
  other: 'Other activity (no xp)',
};

const ACTIVITY: Record<Kind, SeasonLogEntry['activity']> = {
  summa: 'study-book', tractatus: 'study-book', teacher: 'taught', training: 'trained', practice: 'practice', exposure: 'exposure', adventure: 'adventure', vis: 'study-vis', other: 'other',
};

export default function AdvancementTab({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga, ctx } = ed;
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [kind, setKind] = useState<Kind>('summa');
  const [target, setTarget] = useState<string>('art:Cr');
  const [quality, setQuality] = useState(10);
  const [level, setLevel] = useState(10);
  const [com, setCom] = useState(1);
  const [teaching, setTeaching] = useState(3);
  const [teacherScore, setTeacherScore] = useState(10);
  const [students, setStudents] = useState(1);
  const [goodTeacher, setGoodTeacher] = useState(false);
  const [visDie, setVisDie] = useState<number | null>(null);
  const [visBotch, setVisBotch] = useState(0);
  const [summary, setSummary] = useState('');
  const [bookUid, setBookUid] = useState('');
  const [year, setYear] = useState(saga?.currentYear ?? 1220);
  const [season, setSeason] = useState<SeasonLogEntry['season']>(saga?.currentSeason ?? 'Spring');
  const [aging, setAging] = useState<AgingResult | null>(null);
  const [lcOverride, setLcOverride] = useState<number | null>(null);
  const [agingText, setAgingText] = useState<string[]>([]);
  const [anyChar, setAnyChar] = useState<Characteristic>('Sta');
  const [twGain, setTwGain] = useState(2);
  const [twText, setTwText] = useState<string[]>([]);
  if (!c || !d || !saga) return null;

  const isArt = target.startsWith('art:');
  const art = isArt ? (target.slice(4) as Art) : undefined;
  const abilityUid = target.startsWith('ability:') ? target.slice(8) : undefined;
  const masterySpell = target.startsWith('mastery:') ? c.spells.find((s) => s.uid === target.slice(8)) : undefined;
  const subject = art ? ART_NAMES[art] : masterySpell ? `Mastery of ${masterySpell.spell.name}` : d.abilityByUid.get(abilityUid ?? '')?.name ?? '';
  const library = ctx.covenant?.library ?? [];

  let src: StudySource | null = null;
  switch (kind) {
    case 'summa': src = { kind, quality, level, isArt, subject }; break;
    case 'tractatus': src = { kind, quality, isArt, subject }; break;
    case 'teacher': src = { kind, com, teaching, teacherScore, students, goodTeacher, isArt, subject }; break;
    case 'training': src = { kind, masterScore: teacherScore, subject }; break;
    case 'practice': src = { kind, quality, subject }; break;
    case 'exposure': src = { kind, subject }; break;
    case 'adventure': src = { kind, quality: Math.min(quality, 5), subject }; break;
    case 'vis': src = visDie === null ? null : { kind, art: art ?? 'Vi', dieRoll: visDie, aura: ctx.aura.realm === 'Magic' ? ctx.aura.strength : 0 }; break;
    default: src = null;
  }
  const cov = ctx.covenant;
  const res = src ? computeStudy(d, src, { art, abilityUid }) : null;
  const trainingNotAllowed = kind === 'training' && isArt;
  const visPawns = art ? visForStudy(d.arts[art].score) : 0;
  const tractatusRead = kind === 'tractatus' && bookUid && library.find((b) => b.uid === bookUid)?.readBy?.includes(c.id);

  const logSeason = () => {
    const gains: Record<string, number> = {};
    if (res && res.xp > 0) gains[target] = res.xp;
    const text = summary || (kind === 'other' ? 'Other activity' : `${KIND_LABEL[kind]}: ${subject}${res ? ` (+${res.xp} xp)` : ''}`);
    const entry = newSeasonEntry(year, season, ACTIVITY[kind], text, gains);
    if (res) entry.sourceQuality = res.advancementTotal;
    if (kind === 'vis' && art) entry.visUsed = [{ art, pawns: visPawns }];
    if (kind === 'vis' && visBotch) entry.warpingPoints = visBotch;
    if (bookUid) entry.bookId = bookUid;
    update((x) => {
      applySeason(x, entry, 1);
      x.seasonLog.push(entry);
    });
    if (kind === 'tractatus' && bookUid && cov) updateCovenant(cov.id, (x) => { const b = x.library.find((y) => y.uid === bookUid); if (b && !b.readBy?.includes(c.id)) b.readBy = [...(b.readBy ?? []), c.id]; });
    setSummary('');
    setVisDie(null);
    setVisBotch(0);
    const idx = SEASONS.indexOf(season);
    if (idx === 3) {
      setSeason('Spring');
      setYear(year + 1);
    } else setSeason(SEASONS[idx + 1]);
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
    const r = agingRoll(c.age, lc, lr, d.agingRollMod, undefined, !!c.longevity && c.age < 35);
    setAging(r);
    setAgingText([]);
  };

  const applyAging = () => {
    if (!aging) return;
    const out: string[] = [];
    update((x) => {
      if (aging.apparentAging) x.apparentAge = (x.apparentAge ?? x.age) + 1;
      for (const p of aging.agingPoints) out.push(applyAgingPoint(x, p.char as Characteristic, p.points));
      if (aging.anyChar) out.push(applyAgingPoint(x, anyChar, aging.anyChar));
      if (aging.crisis) {
        const nextLevel = abilityXpForScore(d.decrepitude + 1);
        const need = Math.max(1, nextLevel - x.decrepitudePoints);
        for (let i = 0; i < need; i++) out.push(applyAgingPoint(x, anyChar, 1));
        if (x.longevity) {
          out.push('Longevity Ritual spent by the crisis — it must be renewed.');
          x.longevity = undefined;
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
      <Card title="Plan a season" className="accent">
        <div className="row">
          <Field label="Season">
            <div className="row tight">
              <select value={season} onChange={(e) => setSeason(e.target.value as SeasonLogEntry['season'])}>
                {SEASONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <Stepper value={year} width={56} onChange={setYear} />
            </div>
          </Field>
          <Field label="Activity">
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          {kind !== 'other' && (
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
          </div>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <input style={{ flex: 1 }} value={summary} placeholder="Summary for the log (optional)" onChange={(e) => setSummary(e.target.value)} />
          <button className="primary" onClick={logSeason} disabled={trainingNotAllowed || (kind === 'vis' && visDie === null)}>
            Log season{res?.xp ? ` & add ${res.xp} xp` : ''}
          </button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Summae raise a score only up to their level; teachers only up to their own score. Tractatus quality is Com + 6; a character can read each tractatus once. Books, vis and
          teachers can be linked from your covenant (Covenant → Library).
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
              {d.agingRollMod ? (
                <>
                  <br />
                  Virtues: {signed(d.agingRollMod)}
                </>
              ) : null}
            </div>
            <button onClick={rollAging} disabled={c.age < 35 && !c.longevity}>
              Roll aging
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

        <Card title="Warping & Twilight">
          <div className="row">
            <div className="stat">
              <span className="v">
                {d.warpingScore} ({d.warpingPoints})
              </span>
              <span className="l">Warping</span>
            </div>
            <Field label="Warping points">
              <Stepper value={c.warpingPoints} min={0} width={46} onChange={(v) => update((x) => void (x.warpingPoints = v))} />
            </Field>
          </div>
          {(d.isMagus || d.hasGift) && (
            <>
              <div className="row" style={{ marginTop: 8 }}>
                <Field label="Warping points just gained">
                  <Stepper value={twGain} min={0} width={36} onChange={setTwGain} />
                </Field>
                <button
                  className="small"
                  onClick={() => {
                    const r = twilightAvoidance(d, twGain, ctx.aura.realm === 'Magic' ? ctx.aura.strength : 0);
                    setTwText((t) => [`Avoid Twilight: ${r.my} vs ${r.tw} — ${r.success ? 'avoided (still gain the Warping points)' : r.botch ? 'BOTCH: enter Twilight' : 'enter Twilight'}. ${r.detail}`, ...t]);
                  }}
                >
                  Try to avoid Twilight
                </button>
                <button
                  className="small"
                  onClick={() => {
                    const r = twilightComprehension(d, twGain);
                    setTwText((t) => [`Comprehend Twilight: ${r.my} vs ${r.tw} — ${r.success ? 'understood (beneficial scar/insight)' : r.botch ? 'BOTCH (harmful)' : 'not understood (harmful scar likely)'}. Duration: ${r.duration}.`, ...t]);
                  }}
                >
                  Roll comprehension
                </button>
              </div>
              <p className="small muted">
                A Twilight episode is risked when gaining 2+ Warping points at once. Avoidance: Sta + Concentration + Vim/5 + stress die vs Warping Score + points gained + Enigmatic Wisdom + aura
                + stress die (DE p.228–230).
              </p>
            </>
          )}
          {twText.map((t, i) => (
            <div key={i} className="small list-row">
              {t}
            </div>
          ))}
          <Field label="Twilight scars & effects">
            <textarea
              rows={3}
              value={c.twilightScars.join('\n')}
              onChange={(e) => update((x) => void (x.twilightScars = e.target.value.split('\n')))}
            />
          </Field>
        </Card>
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
