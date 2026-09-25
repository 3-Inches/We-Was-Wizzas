import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type Form, type SpellDef, type Technique } from '../../data';
import { deriveCharacter } from '../../engine/character/derive';
import { castingScore, labTotal } from '../../engine/magic';
import { DURATIONS, RANGES, TARGETS, designSpell, inventionSeasons, type RDTOption } from '../../engine/spellDesign';
import { useCharacterContext, useGameData, useSaga, useSagaCharacters } from '../../store/hooks';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { BookBadge, Card, Empty, Field, Markdown, SearchInput, Stepper, Tabs, Total } from '../kit';
import { FragmentRow, makeCharSpell } from '../character/steps/SpellsStep';

type TabId = 'browse' | 'design' | 'guidelines';

export default function SpellsPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId).filter((c) => c.type === 'magus' || c.virtues.some((v) => /gift/.test(v.defId)));
  const [tab, setTab] = useState<TabId>('browse');
  const [charId, setCharId] = useState<string>(chars[0]?.id ?? '');
  const [msg, setMsg] = useState('');
  if (!saga) return <Empty>Saga not found.</Empty>;
  const target = chars.find((c) => c.id === charId);
  return (
    <div>
      <div className="topbar">
        <h1>Spells & spell design</h1>
        <div className="row">
          <Field label="For magus">
            <select value={charId} onChange={(e) => setCharId(e.target.value)}>
              <option value="">— none —</option>
              {chars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || '(unnamed)'}
                </option>
              ))}
            </select>
          </Field>
          {target && <Link to={`/saga/${saga.id}/character/${target.id}?tab=magic`}>Open sheet →</Link>}
        </div>
      </div>
      {msg && (
        <div className="issue info">
          <div className="msg">{msg}</div>
          <button className="small ghost" onClick={() => setMsg('')}>
            ✕
          </button>
        </div>
      )}
      <Tabs
        tabs={[
          { id: 'browse', label: `Browse spells (${data.spells.filter((s) => data.isBookEnabled(s.source.book)).length})` },
          { id: 'design', label: 'Design a spell' },
          { id: 'guidelines', label: 'Guidelines' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'browse' && <Browse charId={charId} onMsg={setMsg} />}
      {tab === 'design' && <Designer charId={charId} onMsg={setMsg} />}
      {tab === 'guidelines' && <Guidelines />}
    </div>
  );
}

function useSpellTarget(charId: string) {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const c = useStore((s) => (charId ? s.characters[charId] : undefined));
  const ctx = useCharacterContext(c, data);
  const d = useMemo(() => (c && saga ? deriveCharacter(c, data, saga.houseRules) : undefined), [c, saga, data]);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const learn = (s: SpellDef) => {
    if (!c || !d) return false;
    updateCharacter(c.id, (x) => void x.spells.push(makeCharSpell(s, c.creation.finalized ? 'play' : 'apprenticeship', d.flawless)));
    return true;
  };
  return { saga, data, c, d, ctx, learn };
}

function Browse({ charId, onMsg }: { charId: string; onMsg: (s: string) => void }) {
  const { data, c, d, ctx, learn } = useSpellTarget(charId);
  const [q, setQ] = useState('');
  const [te, setTe] = useState('');
  const [fo, setFo] = useState('');
  const [minL, setMinL] = useState(0);
  const [maxL, setMaxL] = useState(100);
  const [ritual, setRitual] = useState<'any' | 'yes' | 'no'>('any');
  const [book, setBook] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const books = useMemo(() => [...new Set(data.spells.map((s) => s.source.book))].sort(), [data]);
  const results = useMemo(() => {
    const qq = q.toLowerCase();
    return data.spells
      .filter((s) => data.isBookEnabled(s.source.book))
      .filter((s) => (!te || s.technique === te) && (!fo || s.form === fo || s.requisites.includes(fo as Art)))
      .filter((s) => s.general || ((s.level ?? 0) >= minL && (s.level ?? 0) <= maxL))
      .filter((s) => ritual === 'any' || (ritual === 'yes') === s.ritual)
      .filter((s) => !book || s.source.book === book)
      .filter((s) => !qq || s.name.toLowerCase().includes(qq) || s.text.toLowerCase().includes(qq))
      .sort((a, b) => (a.technique + a.form).localeCompare(b.technique + b.form) || (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));
  }, [data, q, te, fo, minL, maxL, ritual, book]);
  return (
    <Card>
      <div className="row" style={{ marginBottom: 8 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search names and descriptions" />
        <select value={te} onChange={(e) => setTe(e.target.value)}>
          <option value="">Any Technique</option>
          {TECHNIQUES.map((t) => (
            <option key={t} value={t}>
              {ART_NAMES[t]}
            </option>
          ))}
        </select>
        <select value={fo} onChange={(e) => setFo(e.target.value)}>
          <option value="">Any Form</option>
          {FORMS.map((f) => (
            <option key={f} value={f}>
              {ART_NAMES[f]}
            </option>
          ))}
        </select>
        <span className="small">Level</span>
        <Stepper value={minL} min={0} step={5} width={36} onChange={setMinL} />
        <span className="small">to</span>
        <Stepper value={maxL} min={0} step={5} width={40} onChange={setMaxL} />
        <select value={ritual} onChange={(e) => setRitual(e.target.value as typeof ritual)}>
          <option value="any">Formulaic & Ritual</option>
          <option value="no">Formulaic only</option>
          <option value="yes">Ritual only</option>
        </select>
        <select value={book} onChange={(e) => setBook(e.target.value)}>
          <option value="">All books</option>
          {books.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="small muted">{results.length} spells{c ? ` — casting scores for ${c.name || 'the magus'} in ${ctx.aura.realm} aura ${ctx.aura.strength}` : ''}.</div>
      <div className="table-wrap">
        <table className="compact">
          <thead>
            <tr>
              <th>Spell</th>
              <th>Arts</th>
              <th className="num">Level</th>
              <th>R / D / T</th>
              <th>Source</th>
              <th>{c ? 'Cast / Lab' : ''}</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, limit).map((s) => {
              const known = c?.spells.some((x) => x.spell.name === s.name && x.spell.technique === s.technique);
              const cs = d ? castingScore(d, { technique: s.technique, form: s.form, requisites: s.requisites }, { kind: s.ritual ? 'ritual' : 'formulaic', aura: ctx.aura }).total : null;
              const lt = d
                ? labTotal(d, { technique: s.technique, form: s.form, requisites: s.requisites }, { activity: 'spells', aura: ctx.aura, lab: ctx.lab ? { generalQuality: ctx.lab.characteristics['General Quality'], specializations: ctx.lab.specializations } : undefined, fromText: false }).total
                : null;
              return (
                <FragmentRow key={s.id} s={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)}>
                  {c && (
                    <span className="row tight nowrap">
                      <span className="small" title="Casting Score / Lab Total">
                        {cs}/{lt}
                      </span>
                      <button
                        className="small"
                        disabled={known}
                        onClick={() => {
                          if (learn(s)) onMsg(`${s.name} added to ${c.name || 'the magus'}. ${lt !== null && s.level ? `Inventing it: ${inventionSeasons(lt, s.level).possible ? `${inventionSeasons(lt, s.level).seasons} season(s)` : 'not possible yet (Lab Total must exceed the level)'}; from a lab text: ${lt >= s.level ? 'one season' : 'not possible yet'}.` : ''}`);
                        }}
                      >
                        {known ? 'known' : '+ Learn'}
                      </button>
                    </span>
                  )}
                </FragmentRow>
              );
            })}
          </tbody>
        </table>
      </div>
      {results.length > limit && <button onClick={() => setLimit(limit + 200)}>Show more</button>}
    </Card>
  );
}

function rdtLabel(o: RDTOption) {
  return `${o.name} (${o.magnitude >= 0 ? '+' : ''}${o.magnitude})${o.ritual ? ' — Ritual' : ''}${o.note ? ` — ${o.note}` : ''}`;
}

function Designer({ charId, onMsg }: { charId: string; onMsg: (s: string) => void }) {
  const { saga, data, c, d, ctx, learn } = useSpellTarget(charId);
  const updateSaga = useStore((s) => s.updateSaga);
  const [te, setTe] = useState<Technique>('Cr');
  const [fo, setFo] = useState<Form>('Ig');
  const [base, setBase] = useState(3);
  const [range, setRange] = useState('Voice');
  const [duration, setDuration] = useState('Momentary');
  const [target, setTarget] = useState('Individual');
  const [size, setSize] = useState(0);
  const [other, setOther] = useState(0);
  const [reqs, setReqs] = useState<{ art: Art; magnitudes: number }[]>([]);
  const [forceRitual, setForceRitual] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const hasVirtue = (id?: string) => !id || !c || c.virtues.some((v) => v.defId === id) || showAll;
  const res = designSpell({ technique: te, form: fo, requisites: reqs, baseLevel: base, range, duration, target, sizeMagnitudes: size, otherMagnitudes: other, forceRitual });
  const guides = data.guidelines.filter((g) => g.technique === te && g.form === fo);
  const note = data.guidelineNotes[te + fo];
  const lab = ctx.lab ? { generalQuality: ctx.lab.characteristics['General Quality'], specializations: ctx.lab.specializations } : undefined;
  const arts = { technique: te, form: fo, requisites: reqs.map((r) => r.art) };
  const lt = d ? labTotal(d, arts, { activity: 'spells', aura: ctx.aura, lab }) : null;
  const inv = lt ? inventionSeasons(lt.total, res.level) : null;
  const cs = d ? castingScore(d, arts, { kind: res.ritual ? 'ritual' : 'formulaic', aura: ctx.aura }) : null;
  const cname = c?.name || 'this magus';
  const known = c?.spells.filter((s) => s.spell.technique === te && s.spell.form === fo && (s.spell.level ?? 0) >= res.level - 5 && (s.spell.level ?? 0) < res.level) ?? [];

  const makeSpell = (): SpellDef => ({
    id: `custom-${uid()}`, name: name || 'Unnamed spell', technique: te, form: fo, level: res.level, general: false, range, duration, target, ritual: res.ritual,
    requisites: reqs.map((r) => r.art), text: text || '(custom spell)', design: res.designText, base, source: { book: 'custom' }, custom: true,
  });

  return (
    <div className="grid grid-2">
      <div className="stack">
        <Card title="Design" className="accent">
          <div className="row">
            <Field label="Technique">
              <select value={te} onChange={(e) => setTe(e.target.value as Technique)}>
                {TECHNIQUES.map((t) => (
                  <option key={t} value={t}>
                    {ART_NAMES[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Form">
              <select value={fo} onChange={(e) => setFo(e.target.value as Form)}>
                {FORMS.map((f) => (
                  <option key={f} value={f}>
                    {ART_NAMES[f]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Base (guideline) level">
              <Stepper value={base} min={1} width={40} onChange={setBase} />
            </Field>
          </div>
          <div className="grid grid-3" style={{ marginTop: 8 }}>
            <Field label="Range">
              <select value={range} onChange={(e) => setRange(e.target.value)}>
                {RANGES.filter((o) => hasVirtue(o.requires)).map((o) => (
                  <option key={o.name} value={o.name}>
                    {rdtLabel(o)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration">
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                {DURATIONS.filter((o) => hasVirtue(o.requires)).map((o) => (
                  <option key={o.name} value={o.name}>
                    {rdtLabel(o)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target">
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {TARGETS.filter((o) => hasVirtue(o.requires)).map((o) => (
                  <option key={o.name} value={o.name}>
                    {rdtLabel(o)} {o.kind ? `[${o.kind}]` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {c && (
            <label className="inline small">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> show Ranges/Durations/Targets from Mysteries and House Virtues {cname} doesn't have
            </label>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Size magnitudes" hint="+1 per ×10 size of the Target">
              <Stepper value={size} min={0} width={36} onChange={setSize} />
            </Field>
            <Field label="Other magnitudes" hint="complexity, extra effects, flexibility">
              <Stepper value={other} min={-5} width={36} onChange={setOther} />
            </Field>
            <label className="inline small">
              <input type="checkbox" checked={forceRitual} onChange={(e) => setForceRitual(e.target.checked)} /> must be a Ritual (guideline or troupe)
            </label>
          </div>
          <Field label="Requisites">
            <div className="row">
              {reqs.map((r, i) => (
                <span key={i} className="row tight">
                  <span className="badge">{ART_NAMES[r.art]}</span>
                  <Stepper value={r.magnitudes} min={0} width={30} title="Extra magnitudes for the requisite" onChange={(v) => setReqs(reqs.map((x, j) => (j === i ? { ...x, magnitudes: v } : x)))} />
                  <button className="small ghost" onClick={() => setReqs(reqs.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </span>
              ))}
              <select value="" onChange={(e) => e.target.value && setReqs([...reqs, { art: e.target.value as Art, magnitudes: 0 }])}>
                <option value="">+ requisite</option>
                {ARTS.map((a) => (
                  <option key={a} value={a}>
                    {ART_NAMES[a]}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </Card>
        <Card title="Result">
          <div className="row">
            <div className="stat">
              <span className="v">
                {te}
                {fo} {res.level}
              </span>
              <span className="l">{res.ritual ? 'Ritual' : 'Formulaic'} · magnitude {res.magnitude}</span>
            </div>
            <div className="small">{res.designText}</div>
          </div>
          {res.ritualReasons.map((r, i) => (
            <div key={i} className="small info-text">
              Ritual: {r}
            </div>
          ))}
          {res.warnings.map((w, i) => (
            <div key={i} className="small warn-text">
              {w}
            </div>
          ))}
          {c && d && lt && inv && cs && (
            <div className="row" style={{ marginTop: 8 }}>
              <div className="stat">
                <span className="v">
                  <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Lab Total (inventing)" />
                </span>
                <span className="l">Lab Total</span>
              </div>
              <div className="stat">
                <span className={`v ${inv.possible ? '' : 'bad-text'}`}>{inv.possible ? inv.seasons : '✗'}</span>
                <span className="l">{inv.possible ? `season(s), ${inv.perSeason}/season` : 'Lab Total must exceed the level'}</span>
              </div>
              <div className="stat">
                <span className="v">
                  <Total value={cs.total} parts={cs.parts} notes={cs.notes} label="Casting Score" />
                </span>
                <span className="l">Casting Score</span>
              </div>
              {known.length > 0 && <span className="small">Similar spells known: {known.map((k) => k.spell.name).join(', ')} (troupe may allow a bonus).</span>}
            </div>
          )}
          <div className="grid grid-2" style={{ marginTop: 8 }}>
            <Field label="Spell name">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              onClick={() => {
                if (!saga) return;
                updateSaga(saga.id, (s) => void s.custom.spells.push(makeSpell()));
                onMsg(`${name || 'Spell'} saved to this saga's custom spells (it now appears in the spell browser).`);
              }}
            >
              Save to saga spell list
            </button>
            {c && (
              <button
                className="primary"
                onClick={() => {
                  if (learn(makeSpell())) onMsg(`${name || 'Spell'} added to ${cname}.`);
                }}
              >
                Add to {cname}
              </button>
            )}
          </div>
          <p className="small muted">
            Every Range, Duration and Target step adds one magnitude (+5 levels; +1 level below level 5). Year Duration, Boundary Target, levels above 50 and some guidelines require
            Rituals, which are at least level 20. Invention: accumulate (Lab Total − level) points per season until they reach the level.
          </p>
        </Card>
      </div>
      <Card title={`${ART_NAMES[te]} ${ART_NAMES[fo]} guidelines`}>
        {note && <Markdown text={note.text} className="small" />}
        <table className="compact">
          <tbody>
            {guides.map((g, i) => (
              <tr key={i} className="clickable" onClick={() => g.level && setBase(g.level)} title="Click to use as base level">
                <td className="num nowrap">{g.general ? 'Gen' : g.level}</td>
                <td>{g.text}</td>
                <td>
                  <BookBadge book={g.source.book} line={g.source.line} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {guides.length === 0 && <div className="small muted">No guidelines extracted for this combination.</div>}
      </Card>
    </div>
  );
}

function Guidelines() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const [q, setQ] = useState('');
  const [te, setTe] = useState('');
  const [fo, setFo] = useState('');
  const list = data.guidelines
    .filter((g) => (!te || g.technique === te) && (!fo || g.form === fo))
    .filter((g) => !q || g.text.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <div className="row" style={{ marginBottom: 8 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search guidelines, e.g. 'wound'" />
        <select value={te} onChange={(e) => setTe(e.target.value)}>
          <option value="">Any Technique</option>
          {TECHNIQUES.map((t) => (
            <option key={t} value={t}>
              {ART_NAMES[t]}
            </option>
          ))}
        </select>
        <select value={fo} onChange={(e) => setFo(e.target.value)}>
          <option value="">Any Form</option>
          {FORMS.map((f) => (
            <option key={f} value={f}>
              {ART_NAMES[f]}
            </option>
          ))}
        </select>
      </div>
      <table className="compact">
        <tbody>
          {list.slice(0, 400).map((g, i) => (
            <tr key={i}>
              <td className="nowrap">
                {g.technique}
                {g.form}
              </td>
              <td className="num">{g.general ? 'Gen' : g.level}</td>
              <td>{g.text}</td>
              <td>
                <BookBadge book={g.source.book} line={g.source.line} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
