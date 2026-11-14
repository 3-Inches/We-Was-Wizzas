// What a link or a chosen file holds, shown before anything is brought in: a storyguide's saga
// settings, a player's character, a covenant with its people, or a whole saga. The reader chooses
// the saga it goes into, the covenant a character joins, and whether a character already here is
// replaced by the one sent again or kept beside it.

import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore, type ExportBundle } from '../../store/store';
import { gameDataFor } from '../../store/hooks';
import { migrateCharacter } from '../../store/migrate';
import { HOUSE_BY_ID } from '../../data/houses';
import { deriveCharacter } from '../../engine/character/derive';
import { validateCharacter } from '../../engine/character/validate';
import { DEFAULT_HOUSE_RULES, type Character, type Saga } from '../../engine/types';
import { isBundle, pendingImport, pickJsonFile, setPendingImport, shareLinkToBundle } from '../../util/files';
import { Card } from '../kit';

const TYPE_LABEL: Record<string, string> = { magus: 'magus', companion: 'companion', grog: 'grog', mythic: 'Mythic Companion' };

/** How a character stands against the rules of the saga it is going into: finished or not, and what the rules check says. */
function check(c: Character, saga: Saga | undefined): { errors: number; warnings: number; books: string[] } | undefined {
  try {
    const data = gameDataFor(saga);
    const rules = saga?.houseRules ?? DEFAULT_HOUSE_RULES;
    const d = deriveCharacter(migrateCharacter(structuredClone(c)), data, rules);
    const issues = validateCharacter(d, data, rules);
    const books = [...new Set(d.virtues.map((v) => v.def?.source.book).filter((b): b is string => !!b && !data.isBookEnabled(b)))];
    return { errors: issues.filter((i) => i.severity === 'error').length, warnings: issues.filter((i) => i.severity === 'warning').length, books };
  } catch {
    return undefined;
  }
}

export default function ImportPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const sagas = useStore((s) => s.sagas);
  const characters = useStore((s) => s.characters);
  const covenants = useStore((s) => s.covenants);
  const active = useStore((s) => s.activeSagaId);
  const importBundle = useStore((s) => s.importBundle);
  const params = new URLSearchParams(loc.search);
  const packed = params.get('d') ?? '';
  const into = params.get('into') ?? '';
  const [picked, setPicked] = useState(0);
  const [pickError, setPickError] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a file chosen here is read from where it waits
  const bundle = useMemo<ExportBundle | null>(() => (packed ? shareLinkToBundle(packed) : (pendingImport() ?? null)), [packed, picked]);
  const rulesOnly = !!bundle?.rulesOnly && !!bundle.saga;
  const wholeSaga = !!bundle?.saga && !rulesOnly;
  const first = into && sagas[into] ? into : wholeSaga ? '__new__' : active && sagas[active] ? active : (Object.keys(sagas)[0] ?? '__new__');
  const [target, setTarget] = useState(first);
  const [copy, setCopy] = useState(false);
  const targetSaga = target === '__new__' ? undefined : sagas[target];
  const covs = useMemo(() => Object.values(covenants).filter((c) => c.sagaId === target && !c.living), [covenants, target]);
  const [covChoice, setCovChoice] = useState<string | undefined>(undefined);
  // a saga with one covenant: a character sent in is nearly always for it
  const cov = covChoice ?? (covs.length === 1 ? covs[0].id : '');
  const incoming = bundle?.characters ?? [];
  const checks = useMemo(() => incoming.map((c) => check(c, targetSaga ?? bundle?.saga)), [incoming, targetSaga, bundle]);

  if (!bundle) {
    const choose = async () => {
      try {
        const b = await pickJsonFile();
        if (!isBundle(b)) throw new Error('that file is not one the toolkit exported (a saga, its rules for players, a character or a covenant)');
        setPendingImport(b);
        setPickError('');
        setPicked((n) => n + 1);
      } catch (e) {
        setPickError(`Import failed: ${(e as Error).message}`);
      }
    };
    return (
      <Card title="Import" className="accent">
        <p>
          {packed
            ? 'This link does not hold a character, covenant or saga the toolkit can read. A link cut short by a chat app does this: ask for the file instead.'
            : 'A saga, a storyguide’s rules for players, a character or a covenant, from a file the toolkit saved. You see what it holds before anything is brought in.'}
        </p>
        <div className="row">
          <button className="primary" onClick={choose}>
            Choose a file…
          </button>
          <Link to="/">Back to your sagas</Link>
        </div>
        {pickError && <p className="small warn-text">{pickError}</p>}
      </Card>
    );
  }

  const done = (sagaId: string | undefined, ids: string[]) => {
    setPendingImport(undefined);
    nav(sagaId && ids.length === 1 ? `/saga/${sagaId}/character/${ids[0]}` : sagaId ? `/saga/${sagaId}` : '/');
  };

  if (rulesOnly) {
    const s = bundle.saga!;
    const here = sagas[s.id];
    return (
      <Card title={`The saga “${s.name}”: its rules, for building a character`} className="accent" tour="import-card">
        <p>
          Your storyguide’s settings for the saga: {s.enabledBooks?.length ? `${s.enabledBooks.length} books` : 'every book'}, the troupe’s creation rules and rulings, the optional rules in use
          {(s.custom?.virtuesFlaws?.length ?? 0) + (s.custom?.abilities?.length ?? 0) + (s.custom?.spells?.length ?? 0) > 0 ? ', and the saga’s own Virtues, Abilities and spells' : ''}. None of the
          saga’s characters, covenants or notes come with it.
        </p>
        <p className="small soft">
          {here
            ? `You already have this saga here. It will take the storyguide’s settings as they are now; your ${Object.values(characters).filter((c) => c.sagaId === here.id).length} character(s) in it stay as they are.`
            : 'It is added to this browser as a saga of your own. Create your character in it (People), then send it back from the character sheet with Share.'}
        </p>
        <div className="row">
          <button
            className="primary"
            data-tour="import-go"
            onClick={() => {
              const r = importBundle(bundle);
              setPendingImport(undefined);
              nav(r.sagaId ? `/saga/${r.sagaId}/people` : '/');
            }}
          >
            {here ? 'Update the saga’s rules' : 'Add the saga'}
          </button>
          <button onClick={() => done(undefined, [])}>Cancel</button>
        </div>
      </Card>
    );
  }

  const replacing = !copy && targetSaga ? incoming.filter((c) => characters[c.id]?.sagaId === targetSaga.id) : [];
  const what = [
    wholeSaga ? `the saga “${bundle.saga!.name}”` : '',
    bundle.covenants?.length ? `${bundle.covenants.length} covenant${bundle.covenants.length > 1 ? 's' : ''}` : '',
    incoming.length ? `${incoming.length} character${incoming.length > 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  return (
    <Card title={`Import ${what.join(', ') || 'nothing'}`} className="accent" tour="import-card">
      {bundle.covenants?.map((c) => (
        <div key={c.id} className="list-row">
          <div style={{ flex: 1 }}>
            <b>{c.name || 'Unnamed covenant'}</b> <span className="badge">covenant</span>
            <div className="small muted">{c.memberIds?.length ?? 0} members listed</div>
          </div>
        </div>
      ))}
      {incoming.slice(0, 40).map((c, i) => {
        const k = checks[i];
        const old = !copy && targetSaga && characters[c.id]?.sagaId === targetSaga.id ? characters[c.id] : undefined;
        return (
          <div key={c.id ?? i} className="list-row" data-tour="import-row">
            <div style={{ flex: 1 }}>
              <b>{c.name || 'Unnamed'}</b>
              {c.house && HOUSE_BY_ID[c.house] ? <span className="soft"> of {HOUSE_BY_ID[c.house].name}</span> : null} <span className="badge">{TYPE_LABEL[c.type] ?? c.type}</span>
              {c.creation?.finalized ? null : <> <span className="badge warn">still in creation</span></>}
              <div className="small muted">
                {[c.player ? `played by ${c.player}` : '', c.age ? `age ${c.age}` : '', c.creation?.concept ?? ''].filter(Boolean).join(' · ')}
              </div>
              {k && !wholeSaga && (
                <div className={`small ${k.errors ? 'warn-text' : 'soft'}`}>
                  Rules check {targetSaga ? `under ${targetSaga.name}` : ''}: {k.errors ? `${k.errors} to fix` : 'nothing to fix'}
                  {k.warnings ? `, ${k.warnings} to look at` : ''}
                  {k.books.length ? `; uses ${k.books.join(', ')}, not among this saga’s books` : ''}.
                </div>
              )}
              {old && (
                <div className="small warn-text">
                  Replaces {old.name || 'the character'} already in this saga{old.updatedAt ? ` (last changed here ${new Date(old.updatedAt).toLocaleDateString()})` : ''}: what was changed here since it was sent is lost.
                </div>
              )}
            </div>
          </div>
        );
      })}
      {incoming.length > 40 && <p className="small muted">…and {incoming.length - 40} more.</p>}
      <div className="row" style={{ marginTop: 10 }}>
        <label>
          Into{' '}
          <select value={target} onChange={(e) => { setTarget(e.target.value); setCovChoice(undefined); }} aria-label="Saga to import into">
            {Object.values(sagas).map((s) => (
              <option key={s.id} value={s.id}>
                the saga {s.name}
              </option>
            ))}
            <option value="__new__">{wholeSaga ? 'a new saga of its own' : 'a new saga'}</option>
          </select>
        </label>
        {targetSaga && incoming.length > 0 && !bundle.covenants?.length && covs.length > 0 && (
          <label>
            Joining{' '}
            <select value={cov} onChange={(e) => setCovChoice(e.target.value)} aria-label="Covenant to join">
              <option value="">no covenant yet</option>
              {covs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || 'Unnamed covenant'}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {wholeSaga && targetSaga && <p className="small soft">Into a saga already here, only the file’s characters and covenants come: that saga keeps its own rules and calendar.</p>}
      {(replacing.length > 0 || copy) && (
        <label className="small" style={{ display: 'block', marginTop: 6 }}>
          <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} /> Keep what is here and import beside it, as a copy
        </label>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <button
          className="primary"
          data-tour="import-go"
          onClick={() => {
            const r = importBundle(targetSaga ? { ...bundle, saga: undefined } : bundle, { intoSagaId: targetSaga?.id, copy, covenantId: cov || undefined });
            done(r.sagaId, r.characterIds);
          }}
        >
          {replacing.length ? `Import and replace ${replacing.length === 1 ? replacing[0].name || 'the character' : `${replacing.length} characters`}` : 'Import'}
        </button>
        <button onClick={() => done(undefined, [])}>Cancel</button>
      </div>
    </Card>
  );
}
