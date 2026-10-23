// Writing a summa or tractatus (DE Writing Books; Covenants, Extended Suggestions on the Quality of
// Books), and adding the finished book to the covenant library.

import { useState } from 'react';
import { ARTS, ART_NAMES, type Art } from '../../../data';
import { planBook } from '../../../engine/books';
import { uid } from '../../../util/id';
import { useStore } from '../../../store/store';
import { Card, Field, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

export function WritingCard({ ed }: { ed: CharEditor }) {
  const { c, d, ctx } = ed;
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState<'summa' | 'tractatus'>('summa');
  const [level, setLevel] = useState<number | null>(null);
  const [langUid, setLangUid] = useState('');
  const [extended, setExtended] = useState(false);
  const [scribe, setScribe] = useState(false);
  const [binder, setBinder] = useState(false);
  const [illuminator, setIlluminator] = useState(false);
  const [resonance, setResonance] = useState(0);
  const [msg, setMsg] = useState('');
  if (!c || !d) return null;
  const arts = ARTS.filter((a) => d.arts[a].score >= 5);
  const abilities = d.abilities.filter((a) => a.score >= 2);
  const languages = d.abilities.filter((a) => a.abilityId === 'living-language' || a.abilityId === 'dead-language');
  const isArt = subject.startsWith('art:');
  const art = isArt ? (subject.slice(4) as Art) : undefined;
  const ability = !isArt && subject ? d.abilityByUid.get(subject.slice(8)) : undefined;
  const score = art ? d.arts[art].score : ability?.score ?? 0;
  const lang = languages.find((l) => l.uid === langUid) ?? languages.slice().sort((a, b) => b.score - a.score)[0];
  const name = art ? ART_NAMES[art] : ability?.name ?? '';
  const res = subject
    ? planBook(d, {
        kind, isArt, score, level: level ?? undefined, com: d.characteristics.Com.value, language: lang?.score ?? 0, labTexts: ctx.lab?.specializations.Texts,
        extended: extended ? { scribe, binder, illuminator, resonance } : undefined,
      })
    : null;
  const addToLibrary = () => {
    if (!res || !ctx.covenant) return;
    updateCovenant(ctx.covenant.id, (k) =>
      void k.library.push({
        uid: uid(), title: `${name} ${kind === 'summa' ? `summa (L${res.level})` : 'tractatus'} by ${c.name || 'the author'}`, author: c.name,
        kind, subjectType: isArt ? 'art' : 'ability', subject: art ?? ability?.abilityId ?? '', level: kind === 'summa' ? res.level : 0, quality: res.quality,
        language: lang?.name ?? 'Latin',
      }),
    );
    setMsg(`Added to the library of ${ctx.covenant.name}.`);
  };
  return (
    <Card title="Write a book">
      <div className="row">
        <Field label="Subject" hint="an Art of 5+ or an Ability of 2+">
          <select value={subject} onChange={(e) => (setSubject(e.target.value), setLevel(null), setMsg(''))}>
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
          <select value={kind} onChange={(e) => setKind(e.target.value as 'summa' | 'tractatus')}>
            <option value="summa">summa</option>
            <option value="tractatus">tractatus</option>
          </select>
        </Field>
        {kind === 'summa' && res && (
          <Field label="Level" hint={`at most half the score: ${res.maxLevel}; each Level lower adds ${isArt ? 1 : 3} Quality`}>
            <Stepper value={res.level} min={1} max={Math.max(1, res.maxLevel)} width={36} onChange={setLevel} />
          </Field>
        )}
        <Field label="Language" hint="5 or more">
          <select value={lang?.uid ?? ''} onChange={(e) => setLangUid(e.target.value)}>
            {languages.map((l) => (
              <option key={l.uid} value={l.uid}>
                {l.name} {l.score}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="inline small">
        <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} /> Covenants&apos; extended rules for book Quality (artisans and resonant materials)
      </label>
      {extended && (
        <div className="row small">
          <label className="inline">
            <input type="checkbox" checked={scribe} onChange={(e) => setScribe(e.target.checked)} /> skilled scribe (Profession 6+)
          </label>
          <label className="inline">
            <input type="checkbox" checked={binder} onChange={(e) => setBinder(e.target.checked)} /> skilled binder
          </label>
          <label className="inline">
            <input type="checkbox" checked={illuminator} onChange={(e) => setIlluminator(e.target.checked)} /> skilled illuminator
          </label>
          <Field label="Resonant materials" hint="+1 bought, +2 from a story, +1 clarified (Arts and Arcane Abilities)">
            <Stepper value={resonance} min={0} max={3} width={30} onChange={setResonance} />
          </Field>
        </div>
      )}
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
          {ctx.covenant && (
            <button className="small" disabled={res.problems.length > 0} onClick={addToLibrary}>
              Add to the covenant library
            </button>
          )}
        </div>
      )}
      {res?.problems.map((p, i) => (
        <div key={i} className="small bad-text">
          {p}
        </div>
      ))}
      {res?.notes.map((n, i) => (
        <div key={i} className="small muted">
          {n}
        </div>
      ))}
      {msg && <div className="small">{msg}</div>}
      <p className="small muted">
        Quality: Communication + 6 + Virtues (Good Teacher +3). A lab's Texts Specialization adds 1 to the language for every 3 points when the book is written there. Readers add their own bonuses
        (Book Learner).
      </p>
    </Card>
  );
}
