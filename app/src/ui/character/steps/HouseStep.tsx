import { useState } from 'react';
import { HEARTBEASTS, HOUSES, HOUSE_BY_ID, EX_MISC_TRADITIONS } from '../../../data/houses';
import { applyExMiscTradition, applyMythicType, mythicAbility, MYTHIC_TYPES, setHouse } from '../../../engine/character/factory';
import { Card, BookBadge } from '../../kit';
import type { CharEditor } from '../useChar';
import { vfDisplayName } from '../../../engine/character/derive';
import { VFText } from '../../VFText';
import ParamInput from '../ParamInput';

export default function HouseStep({ ed }: { ed: CharEditor }) {
  const { c } = ed;
  if (!c) return null;
  return c.type === 'mythic' ? <MythicTypeStep ed={ed} /> : <MagusHouseStep ed={ed} />;
}

function MagusHouseStep({ ed }: { ed: CharEditor }) {
  const { c, update, data } = ed;
  const [jerbitonPick, setJerbitonPick] = useState('');
  const [jerbitonParam, setJerbitonParam] = useState('');
  const [jerbitonAny, setJerbitonAny] = useState(false);
  if (!c) return null;
  const jerbitonSpec = jerbitonPick ? data.vfById.get(jerbitonPick)?.param : undefined;
  const house = c.house ? HOUSE_BY_ID[c.house] : undefined;
  const houseFree = c.virtues.filter((v) => v.freeReason === 'House Virtue' || v.freeReason === 'Ex Miscellanea');
  return (
    <>
      <Card title="Choose a House of Hermes" className="accent">
        <p className="small soft">Membership grants a free Minor Virtue (not counted against your 10 points). Mystery Cult Houses initiate their Outer Mystery.</p>
        <div className="grid grid-auto">
          {HOUSES.map((h) => (
            <div
              key={h.id}
              className={`vf-item clickable ${c.house === h.id ? 'taken' : ''}`}
              // choosing the House again would take back the Virtue or tradition already chosen for it
              onClick={() => c.house !== h.id && update((x) => setHouse(x, data, h.id, 0))}
            >
              <div className="row between">
                <span className="name" style={{ fontFamily: 'var(--font-head)' }}>
                  {h.name}
                </span>
                <span className="badge">{h.type}</span>
              </div>
              <div className="small soft">{h.description}</div>
              <div className="small" style={{ marginTop: 4 }}>
                <b>Benefit:</b> {h.benefitText}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {house && house.benefitOptions.length > 1 && (
        <Card title={`${house.name}: choose your House Virtue`}>
          <div className="row">
            {house.benefitOptions.map((o, i) => (
              <button key={i} className={c.creation.houseBenefit === i ? 'selected' : ''} onClick={() => update((x) => setHouse(x, data, house.id, i))}>
                {o.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {house?.freeChoiceFrom && (
        <Card title="Jerbiton: choose a Minor Virtue relating to scholarship, arts, or mundane interaction">
          <div className="row">
            <select value={jerbitonPick} aria-label="Jerbiton House Virtue" onChange={(e) => { setJerbitonPick(e.target.value); setJerbitonParam(''); }}>
              <option value="">— choose —</option>
              {house.freeChoiceFrom.map((id) => {
                const v = data.vfById.get(id);
                return v && v.sizes.includes('Minor') ? (
                  <option key={id} value={id}>
                    {v.name}
                  </option>
                ) : null;
              })}
            </select>
            {jerbitonSpec && (
              <ParamInput
                // an Ability of scholarship, art or dealing with people, unless the troupe agrees to another
                spec={jerbitonSpec.kind === 'ability' && !jerbitonAny ? { ...jerbitonSpec, options: house.freeChoiceAbilities } : jerbitonSpec}
                value={jerbitonParam}
                data={data}
                onChange={setJerbitonParam}
              />
            )}
            {jerbitonSpec?.kind === 'ability' && (
              <label className="small">
                <input type="checkbox" checked={jerbitonAny} onChange={(e) => setJerbitonAny(e.target.checked)} /> any Ability (with the troupe's agreement)
              </label>
            )}
            <button disabled={!jerbitonPick || (!!jerbitonSpec && !jerbitonParam)} onClick={() => update((x) => setHouse(x, data, 'jerbiton', 0, { defId: jerbitonPick, param: jerbitonParam || undefined }))}>
              Take as House Virtue
            </button>
          </div>
          <p className="small muted">The list is the one in Houses of Hermes: Societates, with others of the core book that fit. Any Minor Virtue fitting the theme is allowed with the troupe's approval (use the Virtues step and mark it free).</p>
        </Card>
      )}

      {house?.exMiscellanea && (
        <Card title="Ex Miscellanea tradition">
          <p className="small soft">
            You receive a free Minor Hermetic Virtue, a free Major non-Hermetic Virtue, and a compulsory Major Hermetic Flaw (which gives no Virtue points). These are in addition to your normal allowance.
          </p>
          <div className="grid grid-2">
            {EX_MISC_TRADITIONS.filter((t) => t.id === 'custom' || (data.isBookEnabled(t.source) && [t.majorNonHermetic, t.minorHermetic, t.majorHermeticFlaw].every((id) => data.vfById.get(id)))).map((t) => (
              <div key={t.id} className={`vf-item clickable ${c.creation.exMiscTradition === t.id ? 'taken' : ''}`} onClick={() => update((x) => applyExMiscTradition(x, data, t.id))}>
                <div className="row between">
                  <span className="name">{t.name}</span>
                  {t.id !== 'custom' && <BookBadge book={t.source} />}
                </div>
                <div className="small soft">{t.notes}</div>
                {t.majorNonHermetic && (
                  <div className="small">
                    {[[t.majorNonHermetic, t.majorParam], [t.minorHermetic, t.minorParam], [t.majorHermeticFlaw, t.majorHermeticFlawParam]].map(([id, param]) => vfDisplayName(data.vfById.get(id!), { uid: '', defId: id!, size: 'Minor', param }, data)).join(' · ')}
                    {(t.required?.length || t.requiredFlaws?.length) ? <span className="muted"> · also {[...(t.required ?? []), ...(t.requiredFlaws ?? [])].map((r) => data.vfById.get(r.id)?.name).join(', ')}</span> : null}
                  </div>
                )}
              </div>
            ))}
          </div>
          {c.creation.exMiscTradition === 'custom' && <ExMiscCustom ed={ed} />}
        </Card>
      )}

      {house && (
        <Card title={`House ${house.name}`}>
          {house.notes?.map((n, i) => (
            <p key={i} className="small">
              • {n}
            </p>
          ))}
          <div className="small">
            <b>Free Virtues granted:</b>{' '}
            {houseFree.length ? houseFree.map((v) => vfDisplayName(data.vfById.get(v.defId), v, data)).join(', ') : <i>none yet</i>}
          </div>
          {house.id === 'bjornaer' && (
            <label className="field" data-tour="heartbeast" style={{ maxWidth: 320 }}>
              <span>Your heartbeast</span>
              <input list="heartbeasts" value={c.heartbeast ?? ''} placeholder="wolf, bear, raven…" onChange={(e) => update((x) => void (x.heartbeast = e.target.value || undefined))} />
              <datalist id="heartbeasts">
                {HEARTBEASTS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <span className="small muted">The one mundane creature the magus is as well as human: usually a noble beast or bird, and a mirror of their nature. It cannot be changed later.</span>
            </label>
          )}
          <p className="small muted">Domus Magna: {house.domusMagna}</p>
          <HouseTemplateInfo houseId={house.id} />
        </Card>
      )}
    </>
  );
}

function ExMiscCustom({ ed }: { ed: CharEditor }) {
  const { data, update } = ed;
  const [major, setMajor] = useState('');
  const [minor, setMinor] = useState('');
  const [flaw, setFlaw] = useState('');
  const majors = data.virtuesFlaws.filter((v) => v.kind === 'virtue' && v.sizes.includes('Major') && !v.categories.includes('Hermetic') && v.categories.includes('Supernatural'));
  const minors = data.virtuesFlaws.filter((v) => v.kind === 'virtue' && v.sizes.includes('Minor') && v.categories.includes('Hermetic'));
  const flaws = data.virtuesFlaws.filter((v) => v.kind === 'flaw' && v.sizes.includes('Major') && v.categories.includes('Hermetic'));
  const sel = (val: string, set: (s: string) => void, list: typeof majors, label: string) => (
    <label className="field">
      <span>{label}</span>
      <select value={val} onChange={(e) => set(e.target.value)}>
        <option value="">—</option>
        {list.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} ({v.source.book})
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="grid grid-3" style={{ marginTop: 10 }}>
      {sel(major, setMajor, majors, 'Major non-Hermetic Virtue')}
      {sel(minor, setMinor, minors, 'Minor Hermetic Virtue')}
      {sel(flaw, setFlaw, flaws, 'Major Hermetic Flaw')}
      <button onClick={() => update((x) => applyExMiscTradition(x, data, 'custom', { major, minor, flaw }))}>Apply tradition</button>
    </div>
  );
}

function HouseTemplateInfo({ houseId }: { houseId: string }) {
  const anchors: Record<string, string> = {
    bjornaer: 'bjornaer', bonisagus: 'bonisagus', criamon: 'criamon', 'ex-miscellanea': 'ex-miscellanea', flambeau: 'flambeau', guernicus: 'guernicus',
    jerbiton: 'jerbiton', mercere: 'mercere', merinita: 'merinita', tremere: 'tremere', tytalus: 'tytalus', verditius: 'verditius',
  };
  return (
    <p className="small">
      Read more: <BookBadge book="DE" anchor={`house-${anchors[houseId]}`} /> House description · magus template in DE Chapter 3 · <BookBadge book="HoH_TL" /> <BookBadge book="HoH_MC" /> <BookBadge book="HoH_S" />
    </p>
  );
}

function MythicTypeStep({ ed }: { ed: CharEditor }) {
  const { c, update, data } = ed;
  if (!c) return null;
  const current = Object.entries(MYTHIC_TYPES).find(([, t]) => c.virtues.some((v) => v.defId === t.virtue && v.freeReason === 'Mythic Companion'));
  const idOf = (x: string | { id: string }) => (typeof x === 'string' ? x : x.id);
  const nameOf = (x: string | { id: string; param?: string }) => {
    const def = data.vfById.get(idOf(x));
    const param = typeof x === 'string' ? undefined : x.param;
    return def ? vfDisplayName(def, { uid: '', defId: def.id, size: def.sizes[0], param }, data) : idOf(x);
  };
  const abilityName = (key: string) => {
    const { id, param } = mythicAbility(key);
    const name = data.abilityById.get(id)?.name ?? id;
    return param ? name.replace(/\([^)]*\)/, param).replace(/^Organization Lore$/, `${param} Lore`) : name;
  };
  return (
    <Card title="Mythic Companion type" className="accent">
      <p className="small soft">
        Mythic Companions take a Free Virtue defining their type and gain a free Minor Virtue. Each point of Flaws buys two points of Virtues (max 10 Flaw points / 20 Virtue points). Agree a minimum set of Abilities worth about 90 xp with the troupe.
      </p>
      <div className="grid grid-2">
        {Object.entries(MYTHIC_TYPES).map(([id, t]) => {
          const def = data.vfById.get(t.virtue);
          return (
            <div key={id} className={`vf-item clickable ${current?.[0] === id ? 'taken' : ''}`} onClick={() => update((x) => applyMythicType(x, data, id))} data-tour={`mythic-${id}`}>
              <div className="row between">
                <span className="name">{t.label}</span>
                {def && <BookBadge book={t.book ?? def.source.book} anchor={t.book ? undefined : def.source.anchor} />}
              </div>
              <div className="small">
                <b>Required:</b> {[...t.requiredVirtues, ...t.requiredFlaws].map(nameOf).join(', ')}
              </div>
              <div className="small">
                <b>Free Minor:</b> {t.freeMinor ? data.vfById.get(t.freeMinor)?.name : 'one of your choice (tick Free on it in the next step)'}
              </div>
              {Object.keys(t.minAbilities).length > 0 && (
                <div className="small muted">
                  Minimum Abilities: {Object.entries(t.minAbilities).map(([a, s]) => `${abilityName(a)} ${s}`).join(', ')}
                </div>
              )}
              {t.note && <div className="small muted">{t.note}</div>}
            </div>
          );
        })}
      </div>
      {current && data.vfById.get(current[1].virtue) && (
        <div style={{ marginTop: 10 }}>
          <VFText def={data.vfById.get(current[1].virtue)!} data={data} />
        </div>
      )}
      <p className="small muted">Other Mythic Companion types (from Realms of Power and other books) can be built by adding their defining Virtue in the next step.</p>
    </Card>
  );
}
