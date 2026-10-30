// Writing and copying (DE Writing Books, Copying Books, Laboratory Texts; Covenants ch.7): books,
// copies, lab texts, florilegia, annotations, glosses and clarification. A project is begun here and
// worked season by season, from this card or as the character's standing activity when time moves on;
// the finished work goes to the covenant's library.

import { useMemo, useState } from 'react';
import { ARTS, ART_NAMES, type Art } from '../../../data';
import { abilityTotal, deriveCharacter } from '../../../engine/character/derive';
import {
  BOOK_FORMATS, SCRIBE, SKILLED, annotateGain, clarifyProblems, clarifyYears, copyNeeded, copyOfBook, copyProblems, copyRate, covenantArtisans, finishWriting, florilegiumBonus, glossProblems,
  labTextRate, languageScore, planBook, refreshQuality, resonantSubject, startClarifying, tradeScore, tractatusBy, workWriting,
} from '../../../engine/books';
import { optionOn } from '../../../engine/optional';
import type { BookFormat, BookMake, Character, Covenant, LibraryBook, WritingProject } from '../../../engine/types';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { uid } from '../../../util/id';
import { Card, Field, HowItWorks, Stepper, Total } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';

type Mode = 'write' | 'copy' | 'labTexts' | 'copyLabTexts' | 'florilegium' | 'annotate' | 'gloss' | 'clarify';
const MODES: { id: Mode; label: string }[] = [
  { id: 'write', label: 'Write a summa, tractatus or commentary' },
  { id: 'copy', label: 'Copy a book' },
  { id: 'labTexts', label: 'Write up lab texts for others' },
  { id: 'copyLabTexts', label: 'Copy lab texts' },
  { id: 'florilegium', label: 'Edit a florilegium' },
  { id: 'annotate', label: 'Annotate one’s own summa' },
  { id: 'gloss', label: 'Gloss a book read this season' },
  { id: 'clarify', label: 'Clarify a book (enchant it)' },
];

type Begin = (p: Omit<WritingProject, 'uid' | 'points' | 'started'>, now: boolean) => void;
type Run = (fn: (x: Character, k: Covenant | undefined) => string[]) => void;
type Ed = CharEditor & { c: Character; d: NonNullable<CharEditor['d']>; saga: NonNullable<CharEditor['saga']> };

export function WritingCard({ ed }: { ed: CharEditor }) {
  const { c, d, ctx, saga, data } = ed;
  const chars = useSagaCharacters(c?.sagaId);
  const covs = useSagaCovenants(c?.sagaId);
  const putSagaState = useStore((s) => s.putSagaState);
  const setNotice = useStore((s) => s.setNotice);
  const [mode, setMode] = useState<Mode>('write');
  const [msg, setMsg] = useState<string[]>([]);
  const cov = ctx.covenant;
  const members = useMemo(
    () => (cov && saga ? chars.filter((m) => cov.memberIds.includes(m.id)).map((m) => ({ c: m, d: deriveCharacter(m, data, saga.houseRules) })) : []),
    [cov, chars, data, saga],
  );
  const artisans = useMemo(() => (cov ? covenantArtisans(cov, members) : { scribe: undefined, binder: undefined, illuminator: undefined }), [cov, members]);
  if (!c || !d || !saga) return null;
  const year = saga.currentYear;
  const season = saga.currentSeason;
  const logged = c.seasonLog.some((e) => e.year === year && e.season === season && !e.extra);

  /** Change the character and the covenant together, with Undo. */
  const run: Run = (fn) => {
    const before = { saga, characters: chars, covenants: covs };
    const st = structuredClone(before);
    const x = st.characters.find((y) => y.id === c.id);
    if (!x) return;
    const k = cov ? st.covenants.find((y) => y.id === cov.id) : undefined;
    const lines = fn(x, k);
    putSagaState(st);
    setNotice(lines[0] ?? 'Done.', () => putSagaState(before));
    setMsg(lines);
  };
  const begin: Begin = (p, now) =>
    run((x, k) => {
      const proj: WritingProject = { ...p, uid: uid(), points: 0, started: { year, season } };
      (x.writing ??= []).push(proj);
      if (!now) return [`Begun: ${proj.title}. Work it here each season, or make it the standing activity.`];
      return workWriting(x, d, k, proj, year, season, data);
    });
  const open = (c.writing ?? []).filter((p) => !p.done);
  const waiting = (c.writing ?? []).filter((p) => p.done && !p.inLibrary);
  const exposureName = (key?: string) => {
    const [k, id] = (key ?? '').split(':');
    return k === 'art' ? ART_NAMES[id as Art] : d.abilityByUid.get(id)?.name ?? 'nothing chosen';
  };
  const e = { ...ed, c, d, saga } as Ed;
  return (
    <Card title="Writing and copying" tour="writing">
      <RulesNote
        book="DE"
        line={16232}
        endLine={16290}
        detail={
          <>
            An author needs 5 in an Art or 2 in an Ability, and 5 in the language. A summa gains Communication + Language points a season toward its Level (five times the Level for an
            Ability); a tractatus takes one season. Careful copying gains 6 + Profession: Scribe a season (a tractatus a season); quick copying is three times as fast and 1 Quality lower.
            A summa, copy or lab text finished with points to spare leaves the rest of the season for the next one begun here (the rules leave this open; the toolkit carries what is left over at the next book&apos;s own rate). The season gives 2 xp of Exposure, in the subject or the language, once however many books it finishes; it is not practice.
          </>
        }
      >
        Write a summa or tractatus, or copy a book, as a season&apos;s work: 2 xp of Exposure for the writer.
      </RulesNote>
      {open.map((p) => (
        <div key={p.uid} className="list-row" style={{ flexWrap: 'wrap' }}>
          <b>{p.title}</b>
          <span className="badge">
            {p.points} / {p.needed}
          </span>
          {p.quality !== undefined && <span className="badge info">Quality {p.quality}</span>}
          <span className="small muted">
            {p.rate} a season{p.notary ? ` (dictated to ${p.notary})` : ''}, {p.rate > p.needed - p.points && ['summa', 'copy', 'labTexts', 'copyLabTexts'].includes(p.kind) ? `finished this season${open.some((o) => o.uid !== p.uid && ['summa', 'copy', 'labTexts', 'copyLabTexts'].includes(o.kind)) ? ', the rest of it going on to the next' : ' (begin another to use the rest of it)'}` : `about ${Math.max(1, Math.ceil((p.needed - p.points) / Math.max(1, p.rate)))} more`}; Exposure +2 xp in {exposureName(p.exposure)} a season
          </span>
          {p.corrupt && <span className="badge bad" title={`Lacking ${p.corrupt}`}>will be corrupt</span>}
          <button className="small" disabled={logged} title={logged ? `A season is logged for ${season} ${year} already` : undefined} onClick={() => run((x, k) => workWriting(x, d, k, x.writing!.find((y) => y.uid === p.uid)!, year, season, data))}>
            Work {season} {year}
          </button>
          {!(c.standing?.kind === 'write' && (c.standing.projectUid ?? open[0]?.uid) === p.uid) && (
            <button className="small ghost" onClick={() => ed.update((x) => void (x.standing = { kind: 'write', projectUid: p.uid }))} title="The seasons nobody plans go to this, when time moves on">
              In free seasons
            </button>
          )}
          <button className="small ghost" onClick={() => ed.update((x) => void (x.writing = (x.writing ?? []).filter((y) => y.uid !== p.uid)))} title="Abandon it (the points are lost)">
            ✕
          </button>
        </div>
      ))}
      {cov &&
        waiting.map((p) => (
          <div key={p.uid} className="list-row">
            <span>{p.title} is finished.</span>
            <button className="small" onClick={() => run((x, k) => (k ? finishWriting(x, k, x.writing!.find((y) => y.uid === p.uid)!, year, data) : []))}>
              Put it in the library of {cov.name || 'the covenant'}
            </button>
          </div>
        ))}
      <div className="row small" style={{ marginTop: open.length ? 8 : 0 }}>
        <select value={mode} onChange={(ev) => (setMode(ev.target.value as Mode), setMsg([]))} aria-label="What to write">
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {mode === 'write' && <WriteForm e={e} begin={begin} logged={logged} artisans={artisans} />}
      {mode === 'copy' && <CopyForm e={e} begin={begin} logged={logged} artisans={artisans} />}
      {(mode === 'labTexts' || mode === 'copyLabTexts') && <LabTextForm e={e} begin={begin} logged={logged} copy={mode === 'copyLabTexts'} />}
      {mode === 'florilegium' && <FlorilegiumForm e={e} begin={begin} logged={logged} />}
      {mode === 'annotate' && <AnnotateForm e={e} begin={begin} logged={logged} />}
      {mode === 'gloss' && <GlossForm e={e} run={run} />}
      {mode === 'clarify' && <ClarifyForm e={e} run={run} logged={logged} />}
      {msg.map((l, i) => (
        <div key={i} className="small" style={{ marginTop: 4 }}>
          {l}
        </div>
      ))}
    </Card>
  );
}

// ------------------------------------------------------------------------------ Shared bits

type Artisans = ReturnType<typeof covenantArtisans>;

function useLanguages(e: Ed) {
  return e.c.abilities
    .filter((a) => a.abilityId === 'living-language' || a.abilityId === 'dead-language')
    .map((a) => ({ uid: a.uid, name: a.param || e.d.abilityByUid.get(a.uid)?.name || 'a language', score: e.d.abilityByUid.get(a.uid)?.total ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

const Problems = ({ list }: { list: string[] }) => (
  <>
    {list.map((p, i) => (
      <div key={i} className="small bad-text">
        {p}
      </div>
    ))}
  </>
);

function BeginButtons({ ok, logged, onBegin }: { ok: boolean; logged: boolean; onBegin: (now: boolean) => void }) {
  return (
    <span className="row tight">
      <button className="small" disabled={!ok} onClick={() => onBegin(false)}>
        Begin
      </button>
      <button className="small" disabled={!ok || logged} onClick={() => onBegin(true)} title={logged ? 'A season is logged this season already' : undefined}>
        Begin and work this season
      </button>
    </span>
  );
}

/** How a book is made: skilled artisans the covenant has, resonant materials, format. */
function MakeEditor({ make, set, artisans, resonant, scribeLabel }: { make: BookMake; set: (m: BookMake) => void; artisans: Artisans; resonant: boolean; scribeLabel?: string }) {
  const tick = (k: 'scribe' | 'binder' | 'illuminator', label: string) => {
    const a = artisans[k];
    const skilled = !!a && a.score >= SKILLED;
    return (
      <label className="inline" title={a ? `${a.name}: ${a.score}${skilled ? '' : ` (skilled from ${SKILLED})`}` : `The covenant has no ${k}; tick if one is hired for the book`}>
        <input type="checkbox" checked={!!make[k]} onChange={(ev) => set({ ...make, [k]: ev.target.checked || undefined })} /> {k === 'scribe' && scribeLabel ? scribeLabel : `skilled ${label}`}
        {a && <span className={skilled ? 'good-text' : 'muted'}> ({a.name} {a.score})</span>}
      </label>
    );
  };
  const f = BOOK_FORMATS.find((x) => x.id === (make.format ?? 'codex'))!;
  return (
    <div className="row small">
      {tick('scribe', 'scribe')}
      {tick('binder', 'binder')}
      {tick('illuminator', 'illuminator')}
      <Field label="Resonant materials" hint={resonant ? 'Arts and Arcane Abilities only; a bought pound of materials goes on the year’s Sundry' : 'Only books on the Arts and Arcane Abilities gain from them'}>
        <select value={make.resonance ?? 0} onChange={(ev) => set({ ...make, resonance: Number(ev.target.value) || undefined })} disabled={!resonant}>
          <option value={0}>none</option>
          <option value={1}>bought (+1, a pound)</option>
          <option value={2}>won in a story (+2)</option>
        </select>
      </Field>
      <Field label="Format" hint={f.hint}>
        <select value={make.format ?? 'codex'} onChange={(ev) => set({ ...make, format: ev.target.value === 'codex' ? undefined : (ev.target.value as BookFormat) })}>
          {BOOK_FORMATS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
              {x.mod ? ` (${x.mod})` : ''}
            </option>
          ))}
        </select>
      </Field>
      {make.format === 'deluxe' && (
        <Field label="Quality given for splendor" hint="Up to (Scribe + Binder + Illuminator) / 2">
          <Stepper value={make.deluxe ?? 0} min={0} max={15} width={30} onChange={(v) => set({ ...make, deluxe: v || undefined })} />
        </Field>
      )}
    </div>
  );
}

const defaultMake = (a: Artisans): BookMake => ({
  scribe: (a.scribe?.score ?? 0) >= SKILLED || undefined,
  binder: (a.binder?.score ?? 0) >= SKILLED || undefined,
  illuminator: (a.illuminator?.score ?? 0) >= SKILLED || undefined,
});
const madeBy = (m: BookMake, a: Artisans): BookMake => ({
  ...m,
  by: { scribe: m.scribe ? a.scribe?.name : undefined, binder: m.binder ? a.binder?.name : undefined, illuminator: m.illuminator ? a.illuminator?.name : undefined },
});

// ------------------------------------------------------------------------------ Writing a book

function WriteForm({ e, begin, logged, artisans }: { e: Ed; begin: Begin; logged: boolean; artisans: Artisans }) {
  const { c, d, ctx, saga, data } = e;
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState<'summa' | 'tractatus' | 'commentary'>('summa');
  const [level, setLevel] = useState<number | null>(null);
  const [langUid, setLangUid] = useState('');
  const [title, setTitle] = useState('');
  const [extended, setExtended] = useState(optionOn(saga, 'extendedBooks'));
  const [make, setMake] = useState<BookMake>(() => defaultMake(artisans));
  const [dictate, setDictate] = useState(false);
  const [notary, setNotary] = useState(8);
  const [commentaryOf, setCommentaryOf] = useState('');
  const languages = useLanguages(e);
  const arts = ARTS.filter((a) => d.arts[a].score >= 5);
  const abilities = d.abilities.filter((a) => a.score >= 2);
  const isArt = subject.startsWith('art:');
  const art = isArt ? (subject.slice(4) as Art) : undefined;
  const ability = !isArt && subject ? d.abilityByUid.get(subject.slice(8)) : undefined;
  const charAbility = ability ? c.abilities.find((a) => a.uid === ability.uid) : undefined;
  const score = art ? d.arts[art].score : ability?.score ?? 0;
  const lang = languages.find((l) => l.uid === langUid) ?? languages[0];
  const name = art ? ART_NAMES[art] : ability?.name ?? '';
  const subjectId = art ?? ability?.abilityId ?? '';
  const subjectType = isArt ? ('art' as const) : ('ability' as const);
  const library = ctx.covenant?.library ?? [];
  const resonant = !!subject && resonantSubject({ subjectType, subject: subjectId }, data);
  const summae = library.filter((b) => b.kind === 'summa' && b.subject === subjectId && !b.corrupt);
  const res = subject
    ? planBook(d, {
        kind, isArt, score, level: level ?? undefined, com: d.characteristics.Com.value, language: lang?.score ?? 0, labTexts: ctx.lab?.specializations.Texts,
        extended: extended ? make : undefined, resonant, notary: dictate ? notary : undefined, written: tractatusBy(library, c.id, subjectId),
      })
    : null;
  const problems = [...(res?.problems ?? []), ...(kind === 'commentary' && !commentaryOf ? ['Choose the summa it comments on.'] : [])];
  const auto = `${name} ${kind === 'summa' && res ? `summa (L${res.level})` : kind === 'commentary' ? 'commentary' : 'tractatus'} by ${c.name || 'the author'}`;
  const onBegin = (now: boolean) =>
    res &&
    begin(
      {
        kind, title: title.trim() || auto, subjectType, subject: subjectId, param: charAbility?.param, exposure: art ? `art:${art}` : `ability:${ability!.uid}`, language: lang?.name ?? 'Latin',
        level: kind === 'summa' ? res.level : 0, quality: res.quality, textQuality: res.textQuality, make: extended ? madeBy(make, artisans) : undefined, needed: res.needed, rate: res.perSeason,
        notary: dictate ? `a notary (${notary})` : undefined, covenantId: ctx.covenant?.id, commentaryOf: kind === 'commentary' ? commentaryOf : undefined, authorScore: score,
      },
      now,
    );
  return (
    <>
      <div className="row small" style={{ marginTop: 6 }}>
        <Field label="Subject" hint="an Art of 5+ or an Ability of 2+">
          <select value={subject} onChange={(ev) => (setSubject(ev.target.value), setLevel(null), setCommentaryOf(''))}>
            <option value="">— choose —</option>
            <optgroup label="Arts">
              {arts.map((a) => (
                <option key={a} value={`art:${a}`}>
                  {ART_NAMES[a]} {d.arts[a].score}
                </option>
              ))}
            </optgroup>
            <optgroup label="Abilities">
              {abilities.map((a) => (
                <option key={a.uid} value={`ability:${a.uid}`}>
                  {a.name} {a.score}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="Book">
          <select value={kind} onChange={(ev) => setKind(ev.target.value as typeof kind)}>
            <option value="summa">summa</option>
            <option value="tractatus">tractatus</option>
            <option value="commentary">commentary</option>
          </select>
        </Field>
        {kind === 'summa' && res && (
          <Field label="Level" hint={`at most half the score: ${res.maxLevel}; each Level lower adds ${isArt ? 1 : 3} Quality`}>
            <Stepper value={res.level} min={1} max={Math.max(1, res.maxLevel)} width={36} onChange={setLevel} />
          </Field>
        )}
        {kind === 'commentary' && (
          <Field label="On the summa">
            <select value={commentaryOf} onChange={(ev) => setCommentaryOf(ev.target.value)}>
              <option value="">— choose —</option>
              {summae.map((b) => (
                <option key={b.uid} value={b.uid}>
                  {b.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Language" hint="5 or more">
          <select value={lang?.uid ?? ''} onChange={(ev) => setLangUid(ev.target.value)}>
            {languages.map((l) => (
              <option key={l.uid} value={l.uid}>
                {l.name} {l.score}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input value={title} placeholder={subject ? auto : 'from the subject'} onChange={(ev) => setTitle(ev.target.value)} style={{ width: 200 }} />
        </Field>
      </div>
      <div className="row small">
        <label className="inline" title="Covenants ch.7: Communication + 3, +1 for each skilled scribe, binder and illuminator, + resonant materials, in place of + 6">
          <input type="checkbox" checked={extended} onChange={(ev) => setExtended(ev.target.checked)} /> extended rules for Quality (Covenants)
        </label>
        <label className="inline" title="Covenants ch.7: the lower of the author’s and the notary’s Communication + Language sets the pace">
          <input type="checkbox" checked={dictate} onChange={(ev) => setDictate(ev.target.checked)} /> dictated to a notary
        </label>
        {dictate && (
          <Field label="Notary’s Com + Language">
            <Stepper value={notary} min={0} max={15} width={30} onChange={setNotary} />
          </Field>
        )}
      </div>
      {extended && <MakeEditor make={make} set={setMake} artisans={artisans} resonant={resonant} scribeLabel={make.format === 'holograph' ? `the author is a skilled scribe (${tradeScore(c, d, SCRIBE)})` : undefined} />}
      {res && (
        <div className="row" style={{ marginTop: 6 }}>
          <div className="stat">
            <span className="v">
              <Total value={res.quality} parts={res.parts} label="Book Quality" />
            </span>
            <span className="l">Quality</span>
          </div>
          {kind === 'summa' && (
            <div className="stat">
              <span className="v">{res.level}</span>
              <span className="l">Level</span>
            </div>
          )}
          <div className="stat">
            <span className="v">{Number.isFinite(res.seasons) ? res.seasons : '∞'}</span>
            <span className="l">season{res.seasons === 1 ? '' : 's'}</span>
          </div>
          <BeginButtons ok={problems.length === 0} logged={logged} onBegin={onBegin} />
        </div>
      )}
      <Problems list={problems} />
      {res?.notes.map((n, i) => (
        <div key={i} className="small muted">
          {n}
        </div>
      ))}
      <HowItWorks label="How a book's Quality is worked out">
        Core rules: Communication + 6 + Virtues (Good Teacher +3), and for a summa written below half the score +1 a Level for an Art, +3 for an Ability, never more than doubling it. Covenants&apos;
        extended rules: Communication + 3, +1 each for a skilled scribe, binder and illuminator (Profession or Craft 6+, the covenant&apos;s own or hired), +1 for bought resonant materials or +2 for
        ones won in a story (Arts and Arcane Abilities only), +1 more once clarified; the Level bonus is then capped at Communication + Virtues + artisans + 3. A lab&apos;s Texts Specialization adds 1 to
        the language for every 3 points (DE). The artisans work alongside the author, so they add no time. The extended rules can be the saga&apos;s default under House Rules.
      </HowItWorks>
    </>
  );
}

// ------------------------------------------------------------------------------ Copying a book

function CopyForm({ e, begin, logged, artisans }: { e: Ed; begin: Begin; logged: boolean; artisans: Artisans }) {
  const { c, d, ctx, data } = e;
  const library = (ctx.covenant?.library ?? []).filter((b) => (b.kind === 'summa' || b.kind === 'tractatus' || b.kind === 'mundane') && !b.corrupt);
  const [picked, setPicked] = useState<string[]>([]);
  const [quick, setQuick] = useState(false);
  const scribe = tradeScore(c, d, SCRIBE);
  const [make, setMake] = useState<BookMake>(() => ({ ...defaultMake(artisans), scribe: scribe >= SKILLED || undefined }));
  if (!ctx.covenant) return <div className="small muted">Copying works from a covenant&apos;s library: join one first.</div>;
  if (!library.length) return <div className="small muted">The library has no books to copy.</div>;
  const first = library.find((b) => b.uid === picked[0]);
  const summa = first?.kind === 'summa';
  const juvenile = make.format === 'juvenilia';
  const most = summa ? 1 : quick ? 3 : 1;
  const sources = picked.map((u) => library.find((b) => b.uid === u)).filter((b): b is LibraryBook => !!b).slice(0, most);
  const problems = sources.flatMap((b) => copyProblems(c, d, b, data));
  const texts = ctx.lab?.specializations.Texts ?? 0;
  const rate = summa ? (juvenile ? 15 : copyRate(scribe, texts, quick)) : 1;
  const needed = summa && first ? copyNeeded(first) : 1;
  const extended = sources.some((b) => b.textQuality !== undefined);
  const scribeAb = c.abilities.find((a) => (a.abilityId === 'profession-type' || a.abilityId === 'craft-type') && SCRIBE.test(a.param ?? ''));
  const langAb = first ? c.abilities.find((a) => (a.abilityId === 'living-language' || a.abilityId === 'dead-language') && (a.param ?? '').toLowerCase() === first.language.toLowerCase()) : undefined;
  const toggle = (u: string, on: boolean) => {
    const b = library.find((x) => x.uid === u);
    if (b?.kind === 'summa') return setPicked(on ? [u] : []);
    setPicked((xs) => (on ? [...xs.filter((x) => library.find((y) => y.uid === x)?.kind !== 'summa'), u] : xs.filter((x) => x !== u)));
  };
  const onBegin = (now: boolean) =>
    first &&
    begin(
      {
        kind: 'copy', title: sources.length > 1 ? `Copies of ${sources.length} tractatus` : `A copy of ${first.title}`, subjectType: first.subjectType, subject: first.subject, language: first.language,
        exposure: scribeAb ? `ability:${scribeAb.uid}` : langAb ? `ability:${langAb.uid}` : undefined, level: first.level, needed, rate, quick: quick || undefined, sourceUid: first.uid,
        sources: sources.map((b) => b.uid), make: extended ? madeBy(make, artisans) : undefined, corrupt: problems.length ? [...new Set(problems)].join(', ') : undefined, covenantId: ctx.covenant?.id,
        quality: copyOfBook(first, { quick, make: extended ? make : undefined, data }).quality,
      },
      now,
    );
  return (
    <>
      <div className="small" style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>
        {library.map((b) => (
          <label key={b.uid} className="inline" style={{ display: 'flex' }}>
            <input type="checkbox" checked={picked.includes(b.uid)} onChange={(ev) => toggle(b.uid, ev.target.checked)} /> {b.title}{' '}
            <span className="muted">
              ({b.kind}
              {b.kind === 'summa' ? ` L${b.level}` : ''} Q{b.quality}, {b.language})
            </span>
          </label>
        ))}
      </div>
      <div className="row small">
        <label className="inline" title="Three times as fast; the copy is 1 Quality lower">
          <input type="checkbox" checked={quick} onChange={(ev) => setQuick(ev.target.checked)} /> quickly (three tractatus a season, or three times the points)
        </label>
        <span className="muted">Profession: Scribe {scribe}</span>
      </div>
      {extended && <MakeEditor make={make} set={setMake} artisans={{ ...artisans, scribe: { name: c.name || 'the copyist', score: scribe, from: 'member' } }} resonant={!!first && resonantSubject(first, data)} />}
      {first && (
        <div className="row small" style={{ marginTop: 4 }}>
          <span className="badge info">
            Copy Quality {problems.length ? 'useless (corrupt)' : copyOfBook(first, { quick, make: extended ? make : undefined, data }).quality}
          </span>
          <span>
            {summa ? `${rate} points a season of ${needed}: ${Math.ceil(needed / Math.max(1, rate))} season${Math.ceil(needed / Math.max(1, rate)) === 1 ? '' : 's'}` : `One season for ${sources.length} tractatus`}
            {texts >= 3 ? ` (with the lab's Texts +${Math.floor(texts / 3)})` : ''}
          </span>
          <BeginButtons ok={sources.length > 0} logged={logged} onBegin={onBegin} />
        </div>
      )}
      {problems.length > 0 && <div className="small bad-text">The copy would be corrupt and useless: {c.name || 'the copyist'} lacks {[...new Set(problems)].join(', ')} (DE, Corrupted Copies).</div>}
      {!extended && first && <div className="small muted">A copy keeps the original&apos;s Quality (1 lower if quick). Books written here under the extended rules let each copy take its own artisans and materials.</div>}
    </>
  );
}

// ------------------------------------------------------------------------------ Lab texts

function LabTextForm({ e, begin, logged, copy }: { e: Ed; begin: Begin; logged: boolean; copy: boolean }) {
  const { c, d, ctx, data } = e;
  const [picked, setPicked] = useState<string[]>([]);
  const texts = ctx.lab?.specializations.Texts ?? 0;
  const latin = languageScore(c, d, 'Latin');
  const scribe = tradeScore(c, d, SCRIBE);
  const theory = c.abilities.find((a) => a.abilityId === 'magic-theory');
  const library = (ctx.covenant?.library ?? []).filter((b) => (b.kind === 'labText' || b.kind === 'castingTablet') && !b.corrupt);
  const spells = c.spells.filter((s) => (s.spell.level ?? 0) > 0);
  const items = copy ? library.map((b) => ({ id: b.uid, label: b.title, level: b.level })) : spells.map((s) => ({ id: s.uid, label: s.spell.name, level: s.spell.level ?? 0 }));
  const levels = items.filter((i) => picked.includes(i.id)).reduce((t, i) => t + i.level, 0);
  const rate = labTextRate(copy ? 'copy' : 'write', copy ? scribe : latin, texts);
  const problems = copy
    ? [...(scribe < 1 ? ['Profession: Scribe (copying goes at Scribe × 60 levels a season)'] : []), ...new Set(library.filter((b) => picked.includes(b.uid)).flatMap((b) => copyProblems(c, d, b, data)))]
    : [...(latin < 1 ? ['Latin'] : []), ...(abilityTotal(d, 'magic-theory') < 1 ? ['Magic Theory 1 or more'] : [])];
  if (!ctx.covenant) return <div className="small muted">Lab texts go to a covenant&apos;s library: join one first.</div>;
  const onBegin = (now: boolean) =>
    begin(
      {
        kind: copy ? 'copyLabTexts' : 'labTexts', title: copy ? `Copies of ${picked.length} lab text${picked.length === 1 ? '' : 's'}` : `Lab texts of ${picked.length} spell${picked.length === 1 ? '' : 's'}`,
        subjectType: 'spell', subject: '', language: 'Latin', level: levels, needed: Math.max(1, levels), rate, spells: copy ? undefined : picked, sources: copy ? picked : undefined,
        exposure: theory ? `ability:${theory.uid}` : undefined, corrupt: problems.length ? problems.join(', ') : undefined, covenantId: ctx.covenant?.id,
      },
      now,
    );
  return (
    <>
      <RulesNote
        book="DE"
        line={10763}
        endLine={10770}
        detail={
          <>
            One&apos;s own lab texts are full of private shorthand: a season rewrites Latin × 20 levels of them for others to use. Copying lab texts already written plainly goes at Profession: Scribe × 60 levels a
            season. A lab&apos;s Texts Specialization adds 1 to Latin or Scribe for every 3 points.
          </>
        }
      >
        Rewrite your own lab texts so others can use them, or copy texts already written plainly.
      </RulesNote>
      {items.length === 0 && <div className="small muted">{copy ? 'The library has no lab texts.' : 'No spells to write up.'}</div>}
      <div className="small" style={{ maxHeight: 160, overflowY: 'auto' }}>
        {items.map((i) => (
          <label key={i.id} className="inline" style={{ display: 'flex' }}>
            <input type="checkbox" checked={picked.includes(i.id)} onChange={(ev) => setPicked((xs) => (ev.target.checked ? [...xs, i.id] : xs.filter((x) => x !== i.id)))} /> {i.label} <span className="muted">(level {i.level})</span>
          </label>
        ))}
      </div>
      <div className="row small">
        <span>
          {rate} levels a season ({copy ? `Scribe ${scribe}` : `Latin ${latin}`} × {copy ? 60 : 20}
          {texts >= 3 ? `, with the lab's Texts +${Math.floor(texts / 3)}` : ''})
          {levels > 0 && rate > 0 ? `: ${levels} levels in ${Math.ceil(levels / rate)} season${Math.ceil(levels / rate) === 1 ? '' : 's'}` : ''}
        </span>
        <BeginButtons ok={picked.length > 0 && rate > 0} logged={logged} onBegin={onBegin} />
      </div>
      {problems.length > 0 && <div className="small bad-text">{copy && scribe < 1 ? 'Needs' : 'They would be corrupt: lacking'} {problems.join(', ')}.</div>}
    </>
  );
}

// ------------------------------------------------------------------------------ Florilegia, annotation, glosses, clarification

function FlorilegiumForm({ e, begin, logged }: { e: Ed; begin: Begin; logged: boolean }) {
  const { d, ctx, data } = e;
  const library = (ctx.covenant?.library ?? []).filter((b) => b.kind === 'tractatus' && !b.corrupt && !b.florilegium && !b.glossed);
  const subjects = [...new Set(library.map((b) => `${b.subjectType}:${b.subject}`))];
  const [subject, setSubject] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState('');
  const key = subject || subjects[0] || '';
  const [type, id] = key.split(':');
  const isArt = type === 'art';
  const pool = library.filter((b) => `${b.subjectType}:${b.subject}` === key);
  const allOnSubject = (ctx.covenant?.library ?? []).filter((b) => b.kind === 'tractatus' && `${b.subjectType}:${b.subject}` === key && !b.corrupt).length;
  const editor = isArt ? d.arts[id as Art]?.score ?? 0 : abilityTotal(d, id);
  const fb = florilegiumBonus(editor, isArt, allOnSubject, picked.length);
  const label = isArt ? ART_NAMES[id as Art] : data.abilityById.get(id)?.name ?? id;
  if (!subjects.length) return <div className="small muted">The library has no tractatus to bind together.</div>;
  return (
    <>
      <RulesNote
        book="Cov"
        line={4858}
        endLine={4862}
        detail={
          <>
            A season binding tractatus on one subject into an anthology: each gains +1 Quality (+2 from an authority, 10 in the Ability or 35 in the Art, with a peerless collection). The editor needs 6 in
            the Ability or 20 in the Art, may collect as many as they could write, and needs a library with twice as many. Florilegia take no resonant materials or clarification.
          </>
        }
      >
        Bind tractatus on one subject into an anthology: each gains Quality.
      </RulesNote>
      <div className="row small">
        <select value={key} onChange={(ev) => (setSubject(ev.target.value), setPicked([]))}>
          {subjects.map((s) => {
            const [t, i] = s.split(':');
            return (
              <option key={s} value={s}>
                {t === 'art' ? ART_NAMES[i as Art] : data.abilityById.get(i)?.name ?? i}
              </option>
            );
          })}
        </select>
        <input placeholder={`Florilegium of ${label}`} value={name} onChange={(ev) => setName(ev.target.value)} style={{ width: 180 }} />
        <span className="muted">
          {label} {editor}
        </span>
      </div>
      <div className="small">
        {pool.map((b) => (
          <label key={b.uid} className="inline" style={{ display: 'flex' }}>
            <input type="checkbox" checked={picked.includes(b.uid)} onChange={(ev) => setPicked((xs) => (ev.target.checked ? [...xs, b.uid] : xs.filter((x) => x !== b.uid)))} /> {b.title} <span className="muted">(Q{b.quality})</span>
          </label>
        ))}
      </div>
      <Problems list={fb.problems} />
      {!fb.problems.length && <div className="small good-text">+{fb.bonus} Quality to each.</div>}
      <BeginButtons
        ok={!fb.problems.length}
        logged={logged}
        onBegin={(now) =>
          begin({ kind: 'florilegium', title: name.trim() || `Florilegium of ${label}`, subjectType: isArt ? 'art' : 'ability', subject: id, language: pool[0]?.language ?? 'Latin', level: 0, needed: 1, rate: 1, sources: picked, bonus: fb.bonus, covenantId: ctx.covenant?.id }, now)
        }
      />
    </>
  );
}

function AnnotateForm({ e, begin, logged }: { e: Ed; begin: Begin; logged: boolean }) {
  const { c, d, ctx } = e;
  const mine = (ctx.covenant?.library ?? []).filter((b) => b.kind === 'summa' && b.authorId === c.id && b.authorScore !== undefined);
  const [pick, setPick] = useState('');
  const b = mine.find((x) => x.uid === pick) ?? mine[0];
  const now = b ? (b.subjectType === 'art' ? d.arts[b.subject as Art]?.score ?? 0 : abilityTotal(d, b.subject)) : 0;
  const gain = b ? annotateGain(b, now) : 0;
  if (!mine.length) return <div className="small muted">None of {c.name || 'the character'}&apos;s summae written here are in the library.</div>;
  return (
    <>
      <RulesNote book="Cov" line={4870} endLine={4872}>
        An inspeximus: the author rereads and glosses their own summa for a season, raising its Level by a third of the score gained since writing it.
      </RulesNote>
      <div className="row small">
        <select value={b?.uid} onChange={(ev) => setPick(ev.target.value)}>
          {mine.map((x) => (
            <option key={x.uid} value={x.uid}>
              {x.title} (L{x.level}, written at {x.authorScore})
            </option>
          ))}
        </select>
        <span>
          Now {now}: +{gain} Level{gain === 1 ? '' : 's'}
        </span>
        <BeginButtons
          ok={!!b && gain > 0}
          logged={logged}
          onBegin={(n) => b && begin({ kind: 'annotate', title: `Annotating ${b.title}`, subjectType: b.subjectType, subject: b.subject, language: b.language, level: b.level, needed: 1, rate: 1, sourceUid: b.uid, authorScore: now, covenantId: ctx.covenant?.id }, n)}
        />
      </div>
    </>
  );
}

function GlossForm({ e, run }: { e: Ed; run: Run }) {
  const { c, d, ctx, saga, data } = e;
  const read = new Set(c.seasonLog.filter((x) => x.year === saga.currentYear && x.season === saga.currentSeason && x.bookId).map((x) => x.bookId!));
  const books = (ctx.covenant?.library ?? []).filter((b) => read.has(b.uid));
  const [pick, setPick] = useState('');
  const b = books.find((x) => x.uid === pick) ?? books[0];
  if (!b) return <div className="small muted">Glossing is done while reading: log a season studying one of the library&apos;s books this season ({saga.currentSeason} {saga.currentYear}) first.</div>;
  const readerScore = b.subjectType === 'art' ? d.arts[b.subject as Art]?.score ?? 0 : abilityTotal(d, b.subject);
  const problems = glossProblems(readerScore, d.characteristics.Com.value, b, data);
  return (
    <>
      <RulesNote
        book="Cov"
        line={4864}
        endLine={4866}
        detail={
          <>
            A reader at least half as skilled as the book&apos;s Level, with a higher Communication than its author, glosses it during their season of reading: +1 Quality, once. Glosses cannot be combined with
            resonant materials or clarification.
          </>
        }
      >
        Annotate a book while reading it: +1 Quality, once.
      </RulesNote>
      <div className="row small">
        <select value={b.uid} onChange={(ev) => setPick(ev.target.value)}>
          {books.map((x) => (
            <option key={x.uid} value={x.uid}>
              {x.title}
            </option>
          ))}
        </select>
        <button
          className="small"
          disabled={problems.length > 0}
          onClick={() =>
            run((_x, k) => {
              const t = k?.library.find((y) => y.uid === b.uid);
              if (!t) return [];
              const before = { make: t.make, glossed: t.glossed, florilegium: t.florilegium };
              t.glossed = { by: c.name || 'a reader', year: saga.currentYear };
              refreshQuality(t, data, before);
              return [`${t.title} glossed by ${c.name || 'the reader'}: Quality ${t.quality}.`];
            })
          }
        >
          Gloss it (+1 Quality)
        </button>
      </div>
      {b.authorCom === undefined && <div className="small muted">The author&apos;s Communication is not recorded: check it is lower than {c.name || 'the reader'}&apos;s {d.characteristics.Com.value}.</div>}
      <Problems list={problems} />
    </>
  );
}

function ClarifyForm({ e, run, logged }: { e: Ed; run: Run; logged: boolean }) {
  const { d, ctx, saga, data } = e;
  const books = (ctx.covenant?.library ?? []).filter((b) => resonantSubject(b, data) && (b.make?.resonance ?? 0) > 0);
  const [pick, setPick] = useState('');
  const b = books.find((x) => x.uid === pick) ?? books[0];
  if (!b) return <div className="small muted">Only a book on an Art or Arcane Ability made with resonant materials can be clarified.</div>;
  const problems = clarifyProblems(d, b, ctx.aura, data);
  return (
    <>
      <RulesNote
        book="Cov"
        line={4776}
        endLine={4778}
        detail={
          <>
            A magus with 15 in the book&apos;s Art opens it to enchantment as an invested device (a season and 8 pawns of Vim: material 2 × size 4). Left in a Magic aura for 12 / aura years, it sheds its mundane
            matter for purer stuff from the aura: +1 Quality. It crumbles to dust if taken out of a Magic aura.
          </>
        }
      >
        Enchant a book so that it slowly improves in a Magic aura.
      </RulesNote>
      <div className="row small">
        <select value={b.uid} onChange={(ev) => setPick(ev.target.value)}>
          {books.map((x) => (
            <option key={x.uid} value={x.uid}>
              {x.title}
              {x.clarifying ? ` (clarifying since ${x.clarifying.since})` : x.make?.clarified ? ' (clarified)' : ''}
            </option>
          ))}
        </select>
        {ctx.aura.realm === 'Magic' && <span className="muted">{clarifyYears(ctx.aura.strength)} years in this aura of {ctx.aura.strength}</span>}
        <button
          className="small"
          disabled={problems.length > 0 || logged}
          title={logged ? 'A season is logged this season already' : undefined}
          onClick={() =>
            run((x, k) => {
              const t = k?.library.find((y) => y.uid === b.uid);
              if (!t || !k) return [];
              const err = startClarifying(x, k, t, saga.currentYear, saga.currentSeason, ctx.aura.strength);
              return [err ?? `${t.title} opened for enchantment: clarified after ${clarifyYears(ctx.aura.strength)} years in the aura.`];
            })
          }
        >
          Open it this season
        </button>
      </div>
      <Problems list={problems} />
    </>
  );
}
