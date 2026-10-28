// The covenant's aura: what makes it up now, what a Magic aura is aligned with, changes recorded with
// their reasons, a Flickering Aura's missed task, and with aura variation on (Realms of Power: Magic)
// its base score, the stronger auras pressing on it, this year's influences and the modifier the
// year's end will roll.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ARTS, ART_NAMES, type Art } from '../../data';
import { alignmentText, auraOf, changeAura, dominionOutlook, dominionStrength, newAuraTrack, yearlyAuraModifier } from '../../engine/aura';
import { optionOn } from '../../engine/optional';
import type { AuraAlignment, AuraTrack, Character, Covenant, Saga } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';

const REALMS = ['Magic', 'Faerie', 'Divine', 'Infernal'] as const;

export function AuraCard({ cov, update, saga, chars }: { cov: Covenant; update: (fn: (c: Covenant) => void) => void; saga: Saga; chars: Character[] }) {
  const [delta, setDelta] = useState(1);
  const [why, setWhy] = useState('');
  const [note, setNote] = useState({ label: '', value: 1 });
  const [all, setAll] = useState(false);
  const [withBase, setWithBase] = useState(true);
  const a = auraOf(cov);
  const year = saga.currentYear;
  const flickering = cov.hooksBoons.some((h) => h.kind === 'hook' && /^flickering aura$/i.test(h.name));
  const variation = optionOn(saga, 'auraVariation');
  const t = cov.auraTrack;
  const track = (fn: (t: AuraTrack) => void) => update((x) => fn((x.auraTrack ??= newAuraTrack(x))));
  const members = chars.filter((c) => cov.memberIds.includes(c.id));
  const mod = variation && a.realm === 'Magic' ? yearlyAuraModifier(cov, members, year) : undefined;
  const log = [...(cov.auraLog ?? [])].reverse();
  return (
    <Card title="Aura" tour="aura">
      <div className="row">
        <div className="stat">
          <span className="v">
            <Total value={a.strength} parts={a.parts} notes={a.notes} label="The covenant's aura" />
          </span>
          <span className="l">{a.realm} aura now</span>
        </div>
        <span className="small muted" style={{ flex: '1 1 260px' }}>
          It sets the aura of every member&apos;s spells and lab work, the Warping of those who live in it (6 and above), and vis study. Its Boons and Hooks count here: each Minor Aura
          Boon +1, Weak Aura −1, Missing Aura none, Faerie Aura makes it Faerie.
          {t?.spontaneous?.year === year && ` This year spontaneous magic in it is ${t.spontaneous.bonus > 0 ? 'eased (up to +3)' : 'stifled (up to −3)'} by the aura.`}
        </span>
      </div>
      {a.realm === 'Magic' && <Alignment cov={cov} update={update} strength={a.strength} />}
      {a.realm === 'Divine' && <Congregation cov={cov} update={update} year={year} />}
      {flickering && (
        <label className="inline small" style={{ marginTop: 6 }}>
          <input type="checkbox" checked={t?.flickerYear === year} onChange={(e) => track((x) => void (x.flickerYear = e.target.checked ? year : undefined))} /> Flickering Aura: the task was missed in{' '}
          {year}, so the aura is one lower for the rest of the year
        </label>
      )}
      <div className="row small" style={{ marginTop: 8 }}>
        <b>A change to the aura</b>
        <Stepper value={delta} min={-5} max={5} width={34} onChange={setDelta} />
        <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="why: a magical creature settles here, a battle, a church built nearby…" style={{ flex: '1 1 220px' }} aria-label="Why the aura changed" />
        {variation && a.realm === 'Magic' && (
          <label className="inline" title="A new tether (a creature that settles, a monument, a legendary working) moves the base aura too, so the aura does not drift back; a passing event leaves the base as it was">
            <input type="checkbox" checked={withBase} onChange={(e) => setWithBase(e.target.checked)} /> its base too
          </label>
        )}
        <button
          className="small"
          disabled={!delta || !why.trim()}
          onClick={() => {
            update((x) => {
              changeAura(x, delta, why.trim(), year, saga.currentSeason);
              if (variation && withBase && x.auraTrack) x.auraTrack.base = Math.max(0, Math.min(10, (x.auraTrack.base ?? a.strength) + delta));
            });
            setWhy('');
          }}
        >
          Record it
        </button>
      </div>
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Auras grow and fade with what happens in them (DE, Realm Auras): a Magic aura rises where magic is worked for decades (a covenant on a natural 5 seldom passes 7), where a
        creature of Might 30 or more settles, or after legendary magic; Hermetic magic cannot reliably raise one (RoP: Magic). A Dominion grows with a congregation (3, then 4 after a
        year, 5 after a decade) and fades as slowly; sin breeds an Infernal aura; stories and the faeries&apos; fortunes move a Faerie one.
      </p>
      {log.length > 0 && (
        <div className="small" style={{ marginTop: 6 }}>
          {(all ? log : log.slice(0, 5)).map((l) => (
            <div key={l.uid} className="list-row">
              <span className="muted">
                {l.season ? `${l.season} ` : ''}
                {l.year}
              </span>
              {l.delta ? <b>{l.delta > 0 ? `+${l.delta}` : l.delta}</b> : null}
              <span>{l.text}</span>
            </div>
          ))}
          {log.length > 5 && (
            <button className="small ghost" onClick={() => setAll((v) => !v)}>
              {all ? 'Fewer' : `All ${log.length} changes`}
            </button>
          )}
        </div>
      )}
      {a.realm === 'Magic' && !variation && (
        <p className="small muted" style={{ marginBottom: 0 }}>
          A Magic aura can also drift from year to year with the covenant&apos;s magic, its vis and its neighbours: turn on <i>Aura variation</i> in{' '}
          <Link to={`/saga/${saga.id}/rules?tab=optional`}>House rules → Optional rules</Link>.
        </p>
      )}
      {mod && (
        <div className="stack" style={{ marginTop: 8, gap: 6 }}>
          <div className="row small">
            <b>Aura variation</b>
            <Field label="Base aura" hint="What its tethers give; the aura drifts back to it">
              <Stepper value={t?.base ?? a.strength} min={0} max={10} width={34} onChange={(v) => track((x) => void (x.base = v))} />
            </Field>
            <span>Botch dice {t?.botchDice ?? 0}</span>
            {t?.latent ? <span>Latent {t.latent > 0 ? `+${t.latent}` : t.latent}</span> : null}
            <span className="row tight">
              Stronger auras pressing on it:
              {REALMS.map((r) => (
                <label key={r} className="inline">
                  <input type="checkbox" checked={!!t?.impinging.includes(r)} onChange={(e) => track((x) => void (x.impinging = e.target.checked ? [...x.impinging, r] : x.impinging.filter((y) => y !== r)))} /> {r}
                </label>
              ))}
            </span>
          </div>
          <div className="row small">
            <span>This year&apos;s modifier so far:</span>
            <Total value={mod.total} parts={mod.parts} label={`Aura modifier, ${year}`} />
            <span className="muted">
              {Math.abs(mod.total) >= 4 ? `the year's end rolls on the Aura ${mod.total > 0 ? 'Strengthening' : 'Weakening'} Table` : 'between −3 and +3: the aura stays as it is'}. Vis spent three pawns
              at a time, seasons of extraction and wards renewed are counted from the seasons; note anything else here.
            </span>
          </div>
          <div className="row small">
            {(t?.notes ?? [])
              .filter((n) => n.year === year)
              .map((n) => (
                <span key={n.uid} className="badge">
                  {n.label} {n.value > 0 ? `+${n.value}` : n.value}{' '}
                  <button className="small ghost" onClick={() => track((x) => void (x.notes = x.notes.filter((y) => y.uid !== n.uid)))} aria-label="Remove">
                    ✕
                  </button>
                </span>
              ))}
            <select
              value=""
              onChange={(e) => {
                const [label, value] = e.target.value.split('|');
                if (label) track((x) => void x.notes.push({ uid: uid(), year, label, value: Number(value) }));
              }}
              aria-label="Add an influence"
            >
              <option value="">+ this year…</option>
              <option value="A magical botch that fed the aura (2+ Warping Points)|1">a magical botch that fed it (+1)</option>
              <option value="A magical botch that harmed the aura (2+ Warping Points)|-1">a magical botch that harmed it (−1)</option>
              <option value="Vis spent in it, three pawns or more|1">vis spent in it, 3+ pawns, not on the sheets (+1)</option>
              <option value="Vis extracted from it|-1">a season of extraction not on the sheets (−1)</option>
            </select>
            <input value={note.label} onChange={(e) => setNote({ ...note, label: e.target.value })} placeholder="or something else" style={{ width: 150 }} aria-label="Other influence" />
            <Stepper value={note.value} min={-9} max={9} width={30} onChange={(v) => setNote({ ...note, value: v })} />
            <button className="small" disabled={!note.label.trim() || !note.value} onClick={() => (track((x) => void x.notes.push({ uid: uid(), year, label: note.label.trim(), value: note.value })), setNote({ label: '', value: 1 }))}>
              Add
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

const ASPECTS: { kind: AuraAlignment['kind'] | ''; label: string }[] = [
  { kind: '', label: 'not aligned' },
  { kind: 'art', label: 'with an Art' },
  { kind: 'healing', label: 'Healing' },
  { kind: 'luck', label: 'Luck' },
  { kind: 'distracting', label: 'Distracting' },
  { kind: 'emotion', label: 'an emotion' },
  { kind: 'other', label: 'something else' },
];

/** What a Magic aura is aligned with (RoP: Magic, Aligned Auras): one aspect at most, found with an Intellego Vim spell. */
function Alignment({ cov, update, strength }: { cov: Covenant; update: (fn: (c: Covenant) => void) => void; strength: number }) {
  const al = cov.auraAlignment;
  const boon = cov.hooksBoons.find((h) => /^(fine|favorable|troublesome) aura$/i.test(h.name));
  const set = (fn: (x: AuraAlignment) => void) => update((c) => void (c.auraAlignment && fn(c.auraAlignment)));
  return (
    <div className="row small" style={{ marginTop: 6 }}>
      <Field label="Aligned" hint="Most Magic auras are not; an Intellego Vim spell can tell (RoP: Magic)">
        <select
          value={al?.kind ?? ''}
          onChange={(e) => update((c) => void (c.auraAlignment = e.target.value ? { kind: e.target.value as AuraAlignment['kind'], ...(e.target.value === 'art' ? { art: 'Vi' as Art } : {}) } : undefined))}
          aria-label="What the aura is aligned with"
        >
          {ASPECTS.map((x) => (
            <option key={x.kind} value={x.kind}>
              {x.label}
            </option>
          ))}
        </select>
      </Field>
      {al?.kind === 'art' && (
        <select value={al.art ?? ''} onChange={(e) => set((x) => void (x.art = e.target.value as Art))} aria-label="The Art it is aligned with">
          {ARTS.map((art) => (
            <option key={art} value={art}>
              {ART_NAMES[art]}
            </option>
          ))}
        </select>
      )}
      {(al?.kind === 'emotion' || al?.kind === 'other') && (
        <input value={al.text ?? ''} onChange={(e) => set((x) => void (x.text = e.target.value || undefined))} placeholder={al.kind === 'emotion' ? 'Fearful, Aggressive, Carefree, Respectful…' : 'what it is aligned with'} style={{ width: 180 }} aria-label="What it is aligned with" />
      )}
      <span className="muted" style={{ flex: '1 1 240px' }}>
        {al ? alignmentText(al, strength) : boon ? <span className="warn-text">The covenant has the {boon.name} {boon.kind === 'boon' ? 'Boon' : 'Hook'}: say what the aura is aligned with.</span> : null}
      </span>
    </div>
  );
}

/**
 * A Dominion kept by a congregation (RoP: The Divine): 3 from the rite, 4 after a year of regular
 * worship, 5 after a decade for a large congregation in a significant church; it fades as slowly as it
 * grew once worship stops. Set here, the aura follows it at once and at every year's end.
 */
function Congregation({ cov, update, year }: { cov: Covenant; update: (fn: (c: Covenant) => void) => void; year: number }) {
  const w = cov.auraTrack?.dominion;
  const edit = (fn: (x: NonNullable<AuraTrack['dominion']>) => void) =>
    update((c) => {
      const t = (c.auraTrack ??= newAuraTrack(c));
      if (!t.dominion) return;
      fn(t.dominion);
      c.aura = dominionStrength(t.dominion, year);
    });
  return (
    <div className="row small" style={{ marginTop: 6 }}>
      <label className="inline" title="The Dominion follows the congregation's worship: it grows with the years, and fades when worship stops (Realms of Power: The Divine)">
        <input
          type="checkbox"
          checked={!!w}
          onChange={(e) =>
            update((c) => {
              const t = (c.auraTrack ??= newAuraTrack(c));
              t.dominion = e.target.checked ? { since: year } : undefined;
              if (t.dominion) c.aura = dominionStrength(t.dominion, year);
            })
          }
        />{' '}
        A congregation keeps it
      </label>
      {w && (
        <>
          <Field label="Worship since">
            <Stepper value={w.since} min={500} max={year} width={52} onChange={(v) => edit((x) => void (x.since = v))} />
          </Field>
          <label className="inline">
            <input type="checkbox" checked={!!w.significant} onChange={(e) => edit((x) => void (x.significant = e.target.checked || undefined))} /> a large congregation, a significant church
          </label>
          <Field label="Relics" hint="+1 for each Faith Point over five">
            <Stepper value={w.relics ?? 0} min={0} max={5} width={30} onChange={(v) => edit((x) => void (x.relics = v || undefined))} />
          </Field>
          <label className="inline">
            <input type="checkbox" checked={w.until !== undefined} onChange={(e) => edit((x) => void (x.until = e.target.checked ? year : undefined))} /> worship stopped
          </label>
          {w.until !== undefined && (
            <Field label="in">
              <Stepper value={w.until} min={w.since} max={year} width={52} onChange={(v) => edit((x) => void (x.until = v))} />
            </Field>
          )}
          <span className="muted" style={{ flex: '1 1 240px' }}>
            Dominion {dominionStrength(w, year)} now. {dominionOutlook(w, year)}
          </span>
        </>
      )}
    </div>
  );
}
