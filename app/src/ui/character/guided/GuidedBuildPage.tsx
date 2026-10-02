import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HOUSES } from '../../../data/houses';
import { ART_NAMES, BOOK_BY_ID, type Art, type GameData } from '../../../data';
import { addVirtue, removeVirtue } from '../../../engine/character/factory';
import { deriveCharacter } from '../../../engine/character/derive';
import { autoBuild, type BuildResult } from '../../../engine/guided/autobuild';
import { CARDS } from '../../../engine/guided/cards';
import { SECTIONS, type Question } from '../../../engine/guided/questions';
import {
  evaluate, groupByQuestion, questionHint, recommendHouses, shortlist, statusShortlist, tieBreaker, traceOf, visibleQuestions,
  type Evaluation, type GuidedContext, type GuidedState, type Scored, type VisibleQuestion,
} from '../../../engine/guided/score';
import { FAMILY_LABEL, TAGS, tagLabel, type TagFamily } from '../../../engine/guided/tags';
import { RANKED_TOTALS } from '../../../engine/guided/magnitudes';
import type { Character } from '../../../engine/types';
import { visibleSteps } from '../wizardSteps';
import { BookBadge, Card, Empty, Modal, Tabs } from '../../kit';
import { useCharEditor } from '../useChar';

type Tab = 'questions' | 'results' | 'browse';

const EMPTY: GuidedState = { answers: {}, declined: [] };

export default function GuidedBuildPage() {
  const ed = useCharEditor();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('questions');
  const [draft, setDraft] = useState<{ c: Character; res: BuildResult; fresh: boolean } | null>(null);
  const [fresh, setFresh] = useState(true);
  const { c, d, data, saga } = ed;
  const st: GuidedState = c?.guided ?? EMPTY;
  const ctx: GuidedContext | null = c && d && saga ? { c, d, data, rules: saga.houseRules, saga, covenant: ed.ctx.covenant, archetypes: c.creation.archetypes ?? [] } : null;
  const ev = useMemo(() => (ctx ? evaluate(st, ctx) : null), [ctx?.c, ctx?.d, st, data]);
  const vis = useMemo(() => (ctx && ev ? visibleQuestions(st, ctx, { ev }) : []), [ev]);
  if (!c || !d || !saga || !ctx || !ev) return <Empty>Character not found.</Empty>;

  const setState = (fn: (s: GuidedState) => void) =>
    ed.update((x) => {
      const s = structuredClone(x.guided ?? EMPTY);
      fn(s);
      x.guided = s;
    });
  const setAnswer = (id: string, v: number | undefined) =>
    setState((s) => {
      if (v === undefined) delete s.answers[id];
      else s.answers[id] = v;
    });
  const answered = Object.keys(st.answers).length;
  const tb = tieBreaker(st, ev, ctx);

  const preview = () => {
    const x = structuredClone(c);
    if (fresh) resetChoices(x);
    const res = autoBuild(x, st, { data, rules: saga.houseRules, saga, covenant: ed.ctx.covenant, archetypes: c.creation.archetypes ?? [] });
    setDraft({ c: x, res, fresh });
  };
  const apply = () => {
    if (!draft) return;
    const built = structuredClone(draft.c);
    built.creation.step = visibleSteps(built.type).findIndex((s) => s.id === 'review');
    built.updatedAt = new Date().toISOString();
    ed.replace(built, `Built a draft from ${answered} answers. Every choice says why; change anything you like.`);
    setDraft(null);
    nav(`/saga/${saga.id}/character/${c.id}/create`);
  };

  return (
    <div>
      <div className="breadcrumbs">
        <Link to="/">Sagas</Link> › <Link to={`/saga/${saga.id}`}>{saga.name}</Link> › <Link to={`/saga/${saga.id}/character/${c.id}/create`}>{c.name || 'New character'}</Link> ›
      </div>
      <div className="topbar">
        <h1>
          Guided build <span className="badge">{c.type === 'mythic' ? 'Mythic Companion' : c.type}</span>
        </h1>
        <span className="small muted">{answered} answered · skipped questions count as 5</span>
        <button className="ghost" disabled={!answered} onClick={() => setState((s) => void ((s.answers = {}), (s.declined = []), delete s.house))}>
          Clear answers
        </button>
        <button className="primary" onClick={preview}>
          Build the draft…
        </button>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Rate each statement from 0 to 10. Follow-up questions appear when an answer is 7 or more (or 3 or less). The shortlist on the right updates as you go; the
        normal creation steps stay available the whole time, and nothing is changed until you build the draft or take an option.
      </p>
      {tb && <TieBreakerCard tb={tb} st={st} setAnswer={setAnswer} />}
      <Tabs
        tabs={[
          { id: 'questions', label: 'Questions' },
          { id: 'results', label: `Recommendations (${shortlist(ev).filter((s) => s.fit > 0).length})` },
          { id: 'browse', label: 'Browse by tag' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="grid" style={{ gridTemplateColumns: tab === 'browse' ? '1fr' : 'minmax(0, 1fr) 340px', marginTop: 10 }}>
        <div className="stack">
          {tab === 'questions' && <QuestionList vis={vis} ev={ev} st={st} ctx={ctx} setAnswer={setAnswer} setHouse={(h) => setState((s) => void (h ? (s.house = h) : delete s.house))} />}
          {tab === 'results' && <Results ev={ev} st={st} ctx={ctx} ed={ed} setState={setState} setAnswer={setAnswer} />}
          {tab === 'browse' && <BrowseByTag ev={ev} ctx={ctx} />}
        </div>
        {tab !== 'browse' && (
          <div className="stack">
            <TakenCard d={d} remove={(uid) => ed.change((x) => removeVirtue(x, data, uid), 'Removed.')} />
            <Shortlist ev={ev} ctx={ctx} st={st} />
          </div>
        )}
      </div>
      {draft && (
        <Modal
          title="Your draft"
          wide
          onClose={() => setDraft(null)}
          actions={
            <button className="primary" onClick={apply}>
              Use this draft
            </button>
          }
        >
          <label className="inline small">
            <input
              type="checkbox"
              checked={fresh}
              onChange={(e) => {
                setFresh(e.target.checked);
                setDraft(null);
              }}
            />{' '}
            Replace my current choices (keeps name, type, concept, age and covenant)
          </label>
          <DraftPreview res={draft.res} c={draft.c} ctx={ctx} />
        </Modal>
      )}
    </div>
  );
}

/** Clear the choices the draft makes, keeping who the character is. */
function resetChoices(c: Character) {
  c.virtues = c.virtues.filter((v) => ['the-gift', 'hermetic-magus'].includes(v.defId) || (c.type === 'grog' && v.defId === 'covenfolk'));
  if (c.type === 'magus') c.house = undefined;
  c.abilities = c.abilities.filter((a) => a.native);
  for (const k of Object.keys(c.arts)) c.arts[k as keyof Character['arts']] = {};
  c.spells = [];
  for (const k of Object.keys(c.characteristics)) c.characteristics[k as keyof Character['characteristics']] = 0;
  c.personality = c.personality.filter((p) => c.type === 'grog' && p.trait === 'Loyal');
  c.creation.childhoodPackage = undefined;
  c.creation.guidedWhy = {};
}

// ------------------------------------------------------------------ bubbles

export function Bubbles(props: { value: number; source: string; onChange: (v: number | undefined) => void; low?: string; high?: string; disabled?: boolean; label: string }) {
  const { value, source } = props;
  return (
    <div className="bubble-row" role="radiogroup" aria-label={props.label}>
      {props.low && <span className="small muted end">{props.low}</span>}
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          role="radio"
          aria-checked={value === i && source !== 'default'}
          disabled={props.disabled}
          className={`bubble ${value === i ? (source === 'player' ? 'on' : source === 'default' ? 'neutral' : 'preset') : ''}`}
          onClick={() => props.onChange(source === 'player' && value === i ? undefined : i)}
          title={i === 5 ? '5: no preference' : String(i)}
        >
          {i}
        </button>
      ))}
      {props.high && <span className="small muted end">{props.high}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ questions

function QuestionList(props: { vis: VisibleQuestion[]; ev: Evaluation; st: GuidedState; ctx: GuidedContext; setAnswer: (id: string, v: number | undefined) => void; setHouse: (h?: string) => void }) {
  const { vis, st, ctx, setAnswer, ev } = props;
  const [open, setOpen] = useState<string | null>(null);
  const hints = useMemo(() => new Map(vis.map((v) => [v.q.id, questionHint(v.q, ev)])), [vis, ev]);
  // pick-any choices are shown together under their question
  const chipsOf = (id: string) => vis.filter((v) => v.q.chip && v.q.parent === id);
  const bySection = SECTIONS.map((s) => ({ s, qs: vis.filter((v) => v.q.section === s.id && !v.q.chip) })).filter((x) => x.qs.length);
  return (
    <>
      {bySection.map(({ s, qs }) => (
        <Card key={s.id} title={`${s.id}. ${s.title}`}>
          <p className="small muted" style={{ marginTop: 0 }}>
            {s.intro}
          </p>
          {qs.map((v) => (
            <div key={v.q.id} className={`q-row depth-${Math.min(v.depth, 3)}`}>
              <div className="row">
                <span className="q-text">
                  {v.q.text}
                  {hints.get(v.q.id) && <span className="q-hint"> — {hints.get(v.q.id)}</span>}
                </span>
                {v.q.explainer && (
                  <button className="small ghost" onClick={() => setOpen(open === v.q.id ? null : v.q.id)} title="What this means">
                    ?
                  </button>
                )}
                {v.source === 'theme' && <span className="badge info">from your theme</span>}
                {v.source === 'covenant' && <span className="badge good">from your covenant</span>}
              </div>
              {open === v.q.id && <p className="small explainer">{v.q.explainer}</p>}
              <Bubbles label={v.q.text} value={v.answer} source={v.source} low={v.q.low} high={v.q.high} disabled={v.source === 'covenant'} onChange={(a) => setAnswer(v.q.id, a)} />
              {chipsOf(v.q.id).length > 0 && (
                <div className="stack" style={{ marginTop: 6, gap: 4 }}>
                  {chipsOf(v.q.id).map((c) => (
                    <label key={c.q.id} className="small" style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <input type="checkbox" style={{ flexShrink: 0 }} checked={c.answer >= 7} onChange={(e) => setAnswer(c.q.id, e.target.checked ? 10 : undefined)} />
                      <span>
                        {c.q.text}
                        {hints.get(c.q.id) && <span className="q-hint"> — {hints.get(c.q.id)}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {v.q.id === 'a-house' && v.answer >= 7 && (
                <div className="row small" style={{ marginTop: 4 }}>
                  <span>House:</span>
                  <select value={st.house ?? ''} onChange={(e) => props.setHouse(e.target.value || undefined)}>
                    <option value="">— recommend one from my answers —</option>
                    {HOUSES.filter((h) => !h.exMiscellanea || h.id === 'ex-miscellanea').map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {v.stopped && <p className="small muted">Only a few options are left here: see the shortlist instead of more questions.</p>}
            </div>
          ))}
        </Card>
      ))}
      {ctx.covenant && <p className="small muted">Your covenant ({ctx.covenant.name}) answers the questions about vis, money, the library and the aura.</p>}
    </>
  );
}

function TieBreakerCard(props: { tb: NonNullable<ReturnType<typeof tieBreaker>>; st: GuidedState; setAnswer: (id: string, v: number | undefined) => void }) {
  const { tb, st } = props;
  return (
    <Card title="Tie-breaker" className="accent">
      <p className="small" style={{ marginTop: 0 }}>
        {tb.reason} Rate these against each other, with what each would bring in front of you. It is fine to end with mostly 10s and 0s: the 0s point to Flaws that cost you
        little.
      </p>
      {tb.tags.map((t) => (
        <div key={t.tag} className="q-row">
          <div className="row">
            <b>{tagLabel(t.tag)}</b>
            <span className="small muted">{t.preview.map((p) => p.def.name).join(', ') || 'no options yet'}</span>
          </div>
          <Bubbles label={tagLabel(t.tag)} value={st.answers[`tb:${t.tag}`] ?? 5} source={`tb:${t.tag}` in st.answers ? 'player' : 'default'} onChange={(a) => props.setAnswer(`tb:${t.tag}`, a)} />
        </div>
      ))}
    </Card>
  );
}

// ------------------------------------------------------------------ shortlist

/** The sub-choice as a reader would say it: "Perdo", "Penetration". */
function paramLabel(s: Scored, data: GameData): string {
  if (!s.param) return '';
  if (s.rec.paramKind === 'art') return ART_NAMES[s.param as Art] ?? s.param;
  if (s.rec.paramKind === 'ability') return data.abilityById.get(s.param)?.name ?? s.param;
  return s.param;
}

/** Where an option stands among those that move the Total the player cares most about. */
function rankText(s: Scored, w: Record<string, number>): string | undefined {
  if (!s.ranks?.length) return undefined;
  const weightOf = (tag: string) => w[tag === 'xp' ? 'progression' : tag] ?? 0;
  const r = [...s.ranks].sort((a, b) => weightOf(b.tag) - weightOf(a.tag) || a.rank / a.of - b.rank / b.of)[0];
  return `${r.label}: #${r.rank} of ${r.of}`;
}

/** What the character has taken so far, without leaving the guided build. */
function TakenCard(props: { d: NonNullable<ReturnType<typeof deriveCharacter>>; remove: (uid: string) => void }) {
  const { d } = props;
  const taken = d.virtues.filter((v) => v.def);
  const t = d.tally;
  return (
    <Card title={`Taken so far (${taken.length})`}>
      <div className="small muted" style={{ marginBottom: 4 }}>
        Virtue points {t.virtuePoints} · Flaw points {t.flawPoints}
      </div>
      {taken.length === 0 && <div className="small muted">Nothing yet.</div>}
      {taken.map((v) => (
        <div key={v.cv.uid} className="short-row">
          <span className={v.def!.kind === 'flaw' ? 'bad-text' : 'good-text'}>{v.def!.kind === 'flaw' ? '–' : '+'}</span>
          <span>
            {v.name}
            {v.cv.param ? ` (${v.cv.param})` : ''}
          </span>
          <span className="spacer" />
          <span className="badge">{v.cv.free ? 'free' : v.cv.size}</span>
          {!v.cv.free && (
            <button className="small ghost" title="Remove" onClick={() => props.remove(v.cv.uid)}>
              ✕
            </button>
          )}
        </div>
      ))}
    </Card>
  );
}

function strengthText(s: Scored): string {
  if (s.strength.lane === 'numeric') return `${(s.strength.seasons ?? 0) > 0 ? '+' : ''}${s.strength.seasons} seasons`;
  return s.strength.lane === 'story' ? 'story' : 'variable';
}

function Shortlist(props: { ev: Evaluation; ctx: GuidedContext; st: GuidedState }) {
  const { ev, ctx } = props;
  const virtues = shortlist(ev, 'virtue').slice(0, 10);
  const flaws = shortlist(ev, 'flaw').slice(0, 6);
  const houses = ctx.c.type === 'magus' && !ctx.c.house ? recommendHouses(ev, ctx).slice(0, 3) : [];
  const statuses = ctx.c.type !== 'magus' ? statusShortlist(ev).filter((s) => s.fit > 0).slice(0, 3) : [];
  const neutral = !shortlist(ev).some((s) => s.fit > 0);
  const row = (s: Scored) => (
    <div key={s.def.id + (s.param ?? '')} className="short-row" title={s.strength.text}>
      <span>
        {s.def.name}
        {s.param ? ` (${paramLabel(s, ctx.data)})` : ''}
      </span>
      <span className="spacer" />
      {!neutral && <span className="badge accent" title="How well it matches your answers">fit {Math.round(s.fit)}</span>}
      {rankText(s, ev.weights) && (
        <span className="badge info" title={s.ranks!.map((r) => `${r.label}: #${r.rank} of ${r.of} (${r.note})`).join('\n')}>
          {rankText(s, ev.weights)}
        </span>
      )}
      <span className="badge" title="What it is worth in play here">
        {strengthText(s)}
      </span>
    </div>
  );
  return (
    <div className="stack sticky-side">
      <Card title="Shortlist">
        {neutral && <p className="small muted">Nothing rated yet: these are broadly useful for this character.</p>}
        {props.st.house && !ctx.c.house && (
          <>
            <h4>House</h4>
            <div className="short-row">
              <span>{HOUSES.find((h) => h.id === props.st.house)?.name}</span>
              <span className="spacer" />
              <span className="small muted">your choice</span>
            </div>
          </>
        )}
        {houses.length > 0 && !props.st.house && (
          <>
            <h4>House</h4>
            {houses.map((h) => (
              <div key={h.id} className="short-row" title={h.reasons.join('; ')}>
                <span>{h.name}</span>
                <span className="spacer" />
                <span className="small muted">{h.reasons[0] ?? ''}</span>
              </div>
            ))}
          </>
        )}
        {statuses.length > 0 && (
          <>
            <h4>Social Status</h4>
            {statuses.map(row)}
          </>
        )}
        <h4>Virtues</h4>
        {virtues.map(row)}
        {flaws.length > 0 && <h4>Flaws</h4>}
        {flaws.map(row)}
        <p className="small muted" style={{ marginBottom: 0 }}>
          Fit: how well it matches your answers. Strength: what it is worth in play in this saga, in seasons of study or lab work over the first years.
        </p>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ recommendations

const DISCLAIMERS = {
  otherBook: (book: string) => `This uses rules from ${book}. Your storyguide will need that book at the table.`,
  spellLike: 'You design the actual effects in a later step (the powers editor on the Virtues step helps).',
  complexity: 'This adds a subsystem of its own to learn.',
};

function Results(props: { ev: Evaluation; st: GuidedState; ctx: GuidedContext; ed: ReturnType<typeof useCharEditor>; setState: (fn: (s: GuidedState) => void) => void; setAnswer: (id: string, v: number | undefined) => void }) {
  const { ev, st, ctx, ed } = props;
  const [kind, setKind] = useState<'virtue' | 'flaw'>('virtue');
  const list = shortlist(ev, kind).slice(0, kind === 'virtue' ? 40 : 25);
  const groups = groupByQuestion(list, st, ctx);
  const take = (s: Scored, size: 'Major' | 'Minor' | 'Free') =>
    ed.change((x) => {
      const cv = addVirtue(x, ctx.data, s.def.id, size, s.param);
      cv.why = traceOf(s, st, ctx);
    }, `Took ${s.def.name}${s.param ? ` (${paramLabel(s, ctx.data)})` : ''}.`);
  return (
    <>
      <div className="row">
        <Tabs
          tabs={[
            { id: 'virtue', label: 'Virtues' },
            { id: 'flaw', label: 'Flaws' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <span className="small muted">
          {kind === 'flaw'
            ? 'Mechanical Flaws are suggested for what you rated low; Story and Personality Flaws for what you rated high. A Flaw that hurts something you rated high is never suggested.'
            : 'Grouped by the question each option counts towards most.'}
        </span>
      </div>
      {groups.map((g) => (
        <Card key={g.label} title={g.question ? `“${g.question.text}”` : g.label}>
          {g.items.map((s) => (
            <OptionCard key={s.def.id + (s.param ?? '')} s={s} st={st} ctx={ctx} onTake={take} onDecline={() => props.setState((x) => void (x.declined = [...x.declined, s.def.id]))} setAnswer={props.setAnswer} taken={ctx.c.virtues.some((v) => v.defId === s.def.id)} />
          ))}
        </Card>
      ))}
      {!groups.length && <Empty>Nothing matches yet. Answer a few questions first.</Empty>}
      {st.declined.length > 0 && (
        <p className="small muted">
          Turned down: {st.declined.map((id) => ctx.data.vfById.get(id)?.name ?? id).join(', ')}.{' '}
          <button className="small ghost" onClick={() => props.setState((x) => void (x.declined = []))}>
            Show them again
          </button>
        </p>
      )}
    </>
  );
}

function OptionCard(props: { s: Scored; st: GuidedState; ctx: GuidedContext; taken: boolean; onTake: (s: Scored, size: 'Major' | 'Minor' | 'Free') => void; onDecline: () => void; setAnswer: (id: string, v: number | undefined) => void }) {
  const { s, st, ctx } = props;
  const [open, setOpen] = useState(false);
  const card = CARDS[s.def.id];
  const needsExplainer = s.rec.flags.complexity || s.rec.flags.otherBook || s.rec.flags.spellLike || !!card;
  const book = BOOK_BY_ID[s.def.source.book]?.title ?? s.def.source.book;
  const weak = s.fit >= 10 && s.strength.lane === 'numeric' && (s.strength.seasons ?? 0) < 1;
  const interest = st.answers[`vf:${s.def.id}`];
  return (
    <div className={`vf-item ${s.def.kind}`}>
      <div className="row">
        <span className="name clickable" onClick={() => setOpen(!open)}>
          {s.def.name}
          {s.param ? ` (${paramLabel(s, ctx.data)})` : ''}
        </span>
        <span className="badge">{s.def.sizes.join('/')}</span>
        <span className="badge accent" title="How well it matches your answers">
          fit {Math.round(s.fit)}
        </span>
        {s.ranks?.length ? (
          <span className="badge info" title={s.ranks.map((r) => `${r.label}: #${r.rank} of ${r.of} (${r.note})`).join('\n')}>
            {s.ranks[0].note}
          </span>
        ) : null}
        <span className="badge" title={s.strength.text}>
          {strengthText(s)}
        </span>
        <BookBadge book={s.def.source.book} anchor={s.def.source.anchor} line={s.def.source.line} />
        <span className="spacer" />
        {props.taken ? (
          <span className="badge good">taken</span>
        ) : (
          s.def.sizes.map((z) => (
            <button key={z} className="small" onClick={() => props.onTake(s, z)}>
              + {z}
            </button>
          ))
        )}
        <button className="small ghost" onClick={props.onDecline} title="Not for me: stop suggesting it">
          ✕
        </button>
      </div>
      <div className="tag-row">
        {s.matches
          .filter((m) => m.contribution > 0)
          .slice(0, 5)
          .map((m) => (
            <span key={m.tag} className="badge tag good" title={m.why}>
              {tagLabel(m.tag)}
            </span>
          ))}
        {s.matches
          .filter((m) => m.contribution < 0)
          .slice(0, 3)
          .map((m) => (
            <span key={m.tag} className="badge tag bad" title={m.why}>
              {tagLabel(m.tag)}
            </span>
          ))}
      </div>
      <div className="small">{s.rec.summary}</div>
      <div className="small muted">
        {traceOf(s, st, ctx)}
        {weak ? ' · fits you well, but worth little in play here' : ''}
      </div>
      {s.strength.lane === 'numeric' && open && <div className="small muted">Strength: {s.strength.text}</div>}
      {open && s.ranks?.map((r) => (
        <div key={r.tag} className="small muted">
          {r.label}: #{r.rank} of the {r.of} options that raise it ({r.note})
        </div>
      ))}
      {needsExplainer && (
        <details open={open} className="explainer">
          <summary className="small">What taking it means{interest !== undefined ? ` · your interest: ${interest}` : ''}</summary>
          {card ? (
            <dl className="card-dl small">
              <dt>Access</dt>
              <dd>{card.access}</dd>
              <dt>Costs</dt>
              <dd>{card.costs}</dd>
              <dt>Engine</dt>
              <dd>{card.engine}</dd>
              <dt>Output</dt>
              <dd>{card.output}</dd>
              <dt>Grows with</dt>
              <dd>{card.growsWith}</dd>
              <dt>Nearest core route</dt>
              <dd>{card.nearestCore}</dd>
              <dt>Verdict</dt>
              <dd>{card.verdict}</dd>
            </dl>
          ) : (
            <p className="small">{s.rec.summary} {s.rec.value}</p>
          )}
          <ul className="small">
            {s.rec.flags.otherBook && <li>{DISCLAIMERS.otherBook(book)}</li>}
            {s.rec.flags.spellLike && <li>{DISCLAIMERS.spellLike}</li>}
            {s.rec.flags.complexity && <li>{DISCLAIMERS.complexity}</li>}
          </ul>
          <div className="small">Still interested?</div>
          <Bubbles label={`Still interested in ${s.def.name}?`} value={interest ?? 5} source={interest === undefined ? 'default' : 'player'} onChange={(a) => props.setAnswer(`vf:${s.def.id}`, a)} />
        </details>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ browse by tag

function BrowseByTag(props: { ev: Evaluation; ctx: GuidedContext }) {
  const { ev } = props;
  const [tag, setTag] = useState('casting');
  const families = Object.keys(FAMILY_LABEL) as TagFamily[];
  const items = ev.scored
    .map((s) => ({ s, link: s.rec.links.find((l) => l.tag === tag || (l.tag === '$param' && s.param && `art:${s.param}` === tag)) }))
    .filter((x) => x.link)
    .map((x) => ({ ...x, size: x.link!.dir * (x.s.strength.lane === 'numeric' ? Math.max(0.1, Math.abs(x.s.strength.seasons ?? 0)) : 0) * x.link!.strength }));
  // a Total ranks its options by the size of their edge on it, whatever else they are worth
  const rankedTotal = RANKED_TOTALS.some((r) => r.tag === tag);
  const bySize = (a: (typeof items)[number], b: (typeof items)[number]) => b.link!.dir * b.link!.strength - a.link!.dir * a.link!.strength;
  const variable = rankedTotal ? [] : items.filter((x) => x.s.strength.lane !== 'numeric').sort((a, b) => b.link!.strength - a.link!.strength);
  const numeric = rankedTotal ? [...items].sort(bySize) : items.filter((x) => x.s.strength.lane === 'numeric').sort((a, b) => b.size - a.size);
  const row = (x: (typeof items)[number]) => (
    <div key={x.s.def.id} className="short-row">
      <span className={x.link!.dir > 0 ? 'good-text' : 'bad-text'}>{x.link!.dir > 0 ? '+' : '–'}</span>
      <span>
        {x.s.def.name} <span className="small muted">({x.s.def.kind}, {x.s.def.sizes.join('/')})</span>
      </span>
      <span className="small muted">{x.link!.why}</span>
      <span className="spacer" />
      <span className="badge" title={x.s.strength.text}>
        {strengthText(x.s)}
      </span>
      <BookBadge book={x.s.def.source.book} anchor={x.s.def.source.anchor} line={x.s.def.source.line} />
    </div>
  );
  return (
    <>
      <Card title="Browse by tag">
        <p className="small muted" style={{ marginTop: 0 }}>
          Pick what you want more (or less) of and see every option this character can take that touches it, from the biggest bonus to the biggest penalty. Options whose
          worth depends on how they are used come first, in their own lane.
        </p>
        {families.map((f) => (
          <div key={f} className="chip-row" style={{ marginBottom: 4 }}>
            <span className="small muted" style={{ minWidth: 110 }}>
              {FAMILY_LABEL[f]}
            </span>
            {TAGS.filter((t) => t.family === f).map((t) => (
              <span key={t.id} className={`chip ${tag === t.id ? 'on' : ''}`} onClick={() => setTag(t.id)}>
                {t.label}
              </span>
            ))}
          </div>
        ))}
      </Card>
      <Card title={`${tagLabel(tag)}: ${items.length} options`}>
        {variable.length > 0 && (
          <>
            <h4>Depends on how it is used</h4>
            {variable.map(row)}
          </>
        )}
        {numeric.length > 0 && <h4>By size</h4>}
        {numeric.map(row)}
        {!items.length && <Empty>No option this character can take touches this.</Empty>}
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ draft preview

function DraftPreview(props: { res: BuildResult; c: Character; ctx: GuidedContext }) {
  const { res, c, ctx } = props;
  const dd = deriveCharacter(c, ctx.data, ctx.rules);
  const vfs = dd.virtues.filter((v) => !['the-gift', 'hermetic-magus'].includes(v.cv.defId));
  return (
    <div className="stack">
      {res.remaining.length === 0 ? (
        <p className="good-text small">The draft passes the rules check{c.name ? '' : ' (it still needs a name)'}.</p>
      ) : (
        <div className="small bad-text">Still to sort out: {res.remaining.map((i) => i.message).join(' · ')}</div>
      )}
      {res.toDecide.length > 0 && <div className="small warn-text">For you to decide: {res.toDecide.join('; ')}.</div>}
      <div className="grid grid-2">
        <div>
          <h4>Virtues and Flaws</h4>
          {vfs.map((v) => (
            <div key={v.cv.uid} className="small">
              <b>{v.name}</b> <span className="badge">{v.cv.size}</span> <span className="muted">{v.cv.why}</span>
            </div>
          ))}
          {c.house && <p className="small">House: {HOUSES.find((h) => h.id === c.house)?.name}</p>}
        </div>
        <div>
          <h4>What was done</h4>
          <ul className="small">
            {res.log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export type { Question };
