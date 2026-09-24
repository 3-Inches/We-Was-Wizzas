import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BOOKS, SEASONS, type AbilityType, type VFCategory, type VFKind, type VFSize, type VirtueFlawDef, type WeaponDef } from '../../data';
import type { Mechanics } from '../../data/mechanics';
import { DEFAULT_HOUSE_RULES, type HouseRules, type Saga } from '../../engine/types';
import { useGameData, useSaga } from '../../store/hooks';
import { exportSaga, useStore } from '../../store/store';
import { downloadJson, safeFilename } from '../../util/files';
import { uid } from '../../util/id';
import { Card, Empty, Field, Stepper, Tabs } from '../kit';

type TabId = 'saga' | 'books' | 'rules' | 'custom' | 'mechanics';

const NUMERIC: { key: keyof HouseRules; label: string; group: string }[] = [
  { key: 'characteristicPoints', label: 'Characteristic points', group: 'Characters' },
  { key: 'maxFlawPoints', label: 'Maximum Flaw points', group: 'Characters' },
  { key: 'maxMinorFlaws', label: 'Maximum Minor Flaws', group: 'Characters' },
  { key: 'grogMaxFlawPoints', label: 'Grog maximum Flaw points', group: 'Characters' },
  { key: 'mythicVirtueRatio', label: 'Mythic Companion virtue ratio', group: 'Characters' },
  { key: 'maxStoryFlaws', label: 'Maximum Story Flaws', group: 'Characters' },
  { key: 'maxPersonalityFlaws', label: 'Maximum Personality Flaws', group: 'Characters' },
  { key: 'maxMajorHermeticVirtues', label: 'Maximum Major Hermetic Virtues', group: 'Characters' },
  { key: 'childhoodXp', label: 'Early childhood xp', group: 'Experience' },
  { key: 'nativeLanguageXp', label: 'Native language xp', group: 'Experience' },
  { key: 'laterLifeXpPerYear', label: 'Later life xp per year', group: 'Experience' },
  { key: 'wealthyXpPerYear', label: 'Wealthy xp per year', group: 'Experience' },
  { key: 'poorXpPerYear', label: 'Poor xp per year', group: 'Experience' },
  { key: 'apprenticeshipXp', label: 'Apprenticeship xp', group: 'Magi' },
  { key: 'apprenticeshipSpellLevels', label: 'Apprenticeship spell levels', group: 'Magi' },
  { key: 'apprenticeshipYears', label: 'Apprenticeship years', group: 'Magi' },
  { key: 'postGauntletPointsPerYear', label: 'Post-Gauntlet points per year', group: 'Magi' },
  { key: 'postGauntletLabSeasonCost', label: 'Post-Gauntlet lab season cost', group: 'Magi' },
  { key: 'spellLevelLimitBonus', label: 'Starting spell limit bonus (Te+Fo+Int+MT+x)', group: 'Magi' },
  { key: 'puissantAbilityBonus', label: 'Puissant Ability bonus', group: 'Magi' },
  { key: 'puissantArtBonus', label: 'Puissant Art bonus', group: 'Magi' },
  { key: 'affinityMultiplier', label: 'Affinity multiplier', group: 'Magi' },
  { key: 'startingConfidenceScore', label: 'Starting Confidence score', group: 'Characters' },
  { key: 'startingConfidencePoints', label: 'Starting Confidence points', group: 'Characters' },
];

export default function HouseRulesPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const updateSaga = useStore((s) => s.updateSaga);
  const [tab, setTab] = useState<TabId>('saga');
  if (!saga) return <Empty>Saga not found.</Empty>;
  const update = (fn: (s: Saga) => void) => updateSaga(saga.id, fn);
  return (
    <div>
      <div className="topbar">
        <h1>{saga.name}: settings & house rules</h1>
        <button onClick={() => downloadJson(`${safeFilename(saga.name)}.arm5saga.json`, exportSaga(saga.id))}>Export whole saga</button>
      </div>
      <Tabs
        tabs={[
          { id: 'saga', label: 'Saga' },
          { id: 'books', label: `Books (${saga.enabledBooks.length ? saga.enabledBooks.length : 'all'})` },
          { id: 'rules', label: 'Creation rules & rulings' },
          { id: 'custom', label: 'Custom content' },
          { id: 'mechanics', label: 'Virtue/Flaw mechanics' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'saga' && <SagaTab saga={saga} update={update} />}
      {tab === 'books' && <BooksTab saga={saga} update={update} />}
      {tab === 'rules' && <RulesTab saga={saga} update={update} />}
      {tab === 'custom' && <CustomTab saga={saga} update={update} />}
      {tab === 'mechanics' && <MechanicsTab saga={saga} update={update} />}
    </div>
  );
}

type P = { saga: Saga; update: (fn: (s: Saga) => void) => void };

function SagaTab({ saga, update }: P) {
  return (
    <Card className="accent">
      <div className="grid grid-2">
        <Field label="Saga name">
          <input value={saga.name} onChange={(e) => update((s) => void (s.name = e.target.value))} />
        </Field>
        <Field label="Tribunal">
          <input value={saga.tribunal} onChange={(e) => update((s) => void (s.tribunal = e.target.value))} />
        </Field>
        <Field label="Current year">
          <Stepper value={saga.currentYear} width={60} onChange={(v) => update((s) => void (s.currentYear = v))} />
        </Field>
        <Field label="Current season">
          <select value={saga.currentSeason} onChange={(e) => update((s) => void (s.currentSeason = e.target.value as Saga['currentSeason']))}>
            {SEASONS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea rows={5} value={saga.description} onChange={(e) => update((s) => void (s.description = e.target.value))} />
      </Field>
    </Card>
  );
}

function BooksTab({ saga, update }: P) {
  const all = saga.enabledBooks.length === 0;
  const enabled = new Set(all ? BOOKS.map((b) => b.id) : saga.enabledBooks);
  const toggle = (id: string, on: boolean) =>
    update((s) => {
      const set = new Set(s.enabledBooks.length ? s.enabledBooks : BOOKS.map((b) => b.id));
      if (on) set.add(id);
      else set.delete(id);
      set.add('DE');
      s.enabledBooks = set.size === BOOKS.length ? [] : [...set];
    });
  const cats = [...new Set(BOOKS.map((b) => b.category))];
  return (
    <Card>
      <p className="small muted" style={{ marginTop: 0 }}>
        Only content from enabled books appears in pickers (Virtues & Flaws, spells, Hooks & Boons, lab Virtues…). The Definitive Edition is always on. Existing characters keep what they
        already have; the rules check flags content from disabled books.
      </p>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="small" onClick={() => update((s) => void (s.enabledBooks = []))}>
          Enable all
        </button>
        <button className="small" onClick={() => update((s) => void (s.enabledBooks = ['DE']))}>
          Core only
        </button>
      </div>
      <div className="grid grid-3">
        {cats.map((c) => (
          <div key={c}>
            <h4>{c[0].toUpperCase() + c.slice(1)}</h4>
            {BOOKS.filter((b) => b.category === c).map((b) => (
              <label key={b.id} className="inline small" style={{ display: 'flex' }}>
                <input type="checkbox" disabled={b.id === 'DE'} checked={enabled.has(b.id)} onChange={(e) => toggle(b.id, e.target.checked)} /> {b.title}
                {b.status === 'wip' && <span className="badge warn">WIP</span>}
              </label>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

function RulesTab({ saga, update }: P) {
  const hr = saga.houseRules;
  const groups = [...new Set(NUMERIC.map((n) => n.group))];
  return (
    <div className="stack">
      <Card title="Creation numbers" className="accent" actions={<button className="small" onClick={() => update((s) => void (s.houseRules = { ...DEFAULT_HOUSE_RULES, rulings: s.houseRules.rulings }))}>Reset to DE defaults</button>}>
        <div className="grid grid-3">
          {groups.map((g) => (
            <div key={g}>
              <h4>{g}</h4>
              {NUMERIC.filter((n) => n.group === g).map((n) => {
                const v = hr[n.key] as number;
                const def = DEFAULT_HOUSE_RULES[n.key] as number;
                return (
                  <div key={n.key} className="row between" style={{ marginBottom: 4 }}>
                    <span className={`small ${v !== def ? 'warn-text' : ''}`} title={`Default ${def}`}>
                      {n.label}
                    </span>
                    <Stepper value={v} step={n.key === 'affinityMultiplier' ? 0.5 : 1} width={46} onChange={(x) => update((s) => void ((s.houseRules[n.key] as number) = x))} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <label className="inline small">
          <input type="checkbox" checked={hr.enforceAbilityAgeCap} onChange={(e) => update((s) => void (s.houseRules.enforceAbilityAgeCap = e.target.checked))} /> Enforce the age cap on starting
          Ability scores
        </label>
        <p className="small muted">Changed values are highlighted. Every character in this saga is re-checked against these numbers.</p>
      </Card>
      <Card title="Troupe rulings" actions={<button className="small" onClick={() => update((s) => void s.houseRules.rulings.push({ id: uid(), title: 'New ruling', text: '' }))}>+ Ruling</button>}>
        {hr.rulings.length === 0 && <div className="small muted">Record the troupe's interpretations of ambiguous rules here so everyone can see them.</div>}
        {hr.rulings.map((r, i) => (
          <div key={r.id} className="stack" style={{ marginBottom: 10 }}>
            <div className="row">
              <input value={r.title} style={{ flex: 1 }} onChange={(e) => update((s) => void (s.houseRules.rulings[i].title = e.target.value))} />
              <button className="small ghost" onClick={() => update((s) => void s.houseRules.rulings.splice(i, 1))}>
                ✕
              </button>
            </div>
            <textarea rows={3} value={r.text} onChange={(e) => update((s) => void (s.houseRules.rulings[i].text = e.target.value))} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function CustomTab({ saga, update }: P) {
  const [vf, setVf] = useState({ name: '', kind: 'virtue' as VFKind, size: 'Minor' as VFSize, category: 'General' as VFCategory, text: '' });
  const [ab, setAb] = useState({ name: '', type: 'General' as AbilityType, text: '' });
  const [wp, setWp] = useState<WeaponDef>({ id: '', name: '', kind: 'melee', ability: 'Single Weapon', init: 0, atk: 0, dfn: 0, dam: 0, str: null, load: 1, cost: 'Std', custom: true });
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <div className="grid grid-2">
      <Card title={`Custom Virtues & Flaws (${saga.custom.virtuesFlaws.length})`} className="accent">
        <div className="grid grid-2">
          <Field label="Name">
            <input value={vf.name} onChange={(e) => setVf({ ...vf, name: e.target.value })} />
          </Field>
          <Field label="Kind / size">
            <div className="row tight">
              <select value={vf.kind} onChange={(e) => setVf({ ...vf, kind: e.target.value as VFKind })}>
                <option value="virtue">Virtue</option>
                <option value="flaw">Flaw</option>
              </select>
              <select value={vf.size} onChange={(e) => setVf({ ...vf, size: e.target.value as VFSize })}>
                <option>Major</option>
                <option>Minor</option>
                <option>Free</option>
              </select>
            </div>
          </Field>
          <Field label="Category">
            <select value={vf.category} onChange={(e) => setVf({ ...vf, category: e.target.value as VFCategory })}>
              {['General', 'Hermetic', 'Supernatural', 'Social Status', 'Personality', 'Story', 'Mythic Companion', 'Heroic', 'Mystery', 'Special'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Rules text (Markdown)">
          <textarea rows={4} value={vf.text} onChange={(e) => setVf({ ...vf, text: e.target.value })} />
        </Field>
        <button
          disabled={!vf.name}
          onClick={() => {
            const def: VirtueFlawDef = {
              id: `custom-${slug(vf.name)}${vf.kind === 'flaw' ? '-flaw' : ''}`, name: vf.name, kind: vf.kind, sizes: [vf.size], categories: [vf.category], tainted: false,
              text: vf.text, source: { book: 'custom' }, custom: true,
            };
            update((s) => void s.custom.virtuesFlaws.push(def));
            setVf({ ...vf, name: '', text: '' });
          }}
        >
          Add
        </button>
        {saga.custom.virtuesFlaws.map((v, i) => (
          <div key={v.id} className="list-row">
            <b>{v.name}</b> <span className="badge">{v.sizes[0]} {v.kind}</span> <span className="badge">{v.categories[0]}</span>
            <span style={{ flex: 1 }} />
            <button className="small ghost" onClick={() => update((s) => void s.custom.virtuesFlaws.splice(i, 1))}>
              ✕
            </button>
          </div>
        ))}
        <p className="small muted">Give it mechanics on the "Virtue/Flaw mechanics" tab.</p>
      </Card>
      <div className="stack">
        <Card title={`Custom Abilities (${saga.custom.abilities.length})`}>
          <div className="row">
            <input value={ab.name} placeholder="Name" onChange={(e) => setAb({ ...ab, name: e.target.value })} />
            <select value={ab.type} onChange={(e) => setAb({ ...ab, type: e.target.value as AbilityType })}>
              {['General', 'Academic', 'Arcane', 'Martial', 'Supernatural', 'Mystery', 'Heroic', 'Social'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              disabled={!ab.name}
              onClick={() => {
                update((s) => void s.custom.abilities.push({ id: `custom-${slug(ab.name)}`, name: ab.name, type: ab.type, restricted: ab.type !== 'General', specialties: [], text: ab.text, source: { book: 'custom' }, custom: true }));
                setAb({ ...ab, name: '', text: '' });
              }}
            >
              Add
            </button>
          </div>
          <textarea rows={2} placeholder="Description" value={ab.text} onChange={(e) => setAb({ ...ab, text: e.target.value })} style={{ marginTop: 6 }} />
          {saga.custom.abilities.map((a, i) => (
            <div key={a.id} className="list-row">
              <b>{a.name}</b> <span className="badge">{a.type}</span>
              <span style={{ flex: 1 }} />
              <button className="small ghost" onClick={() => update((s) => void s.custom.abilities.splice(i, 1))}>
                ✕
              </button>
            </div>
          ))}
        </Card>
        <Card title={`Custom weapons (${saga.custom.weapons.length})`}>
          <div className="row">
            <input value={wp.name} placeholder="Name" onChange={(e) => setWp({ ...wp, name: e.target.value })} style={{ width: 120 }} />
            <select value={wp.ability} onChange={(e) => setWp({ ...wp, ability: e.target.value })}>
              {['Brawl', 'Single Weapon', 'Great Weapon', 'Bows', 'Thrown Weapon'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            {(['init', 'atk', 'dfn', 'dam', 'load'] as const).map((k) => (
              <label key={k} className="small">
                {k} <Stepper value={wp[k] ?? 0} width={30} onChange={(v) => setWp({ ...wp, [k]: v })} />
              </label>
            ))}
            <button disabled={!wp.name} onClick={() => update((s) => void s.custom.weapons.push({ ...wp, id: `custom-${slug(wp.name)}` }))}>
              Add
            </button>
          </div>
          {saga.custom.weapons.map((w, i) => (
            <div key={w.id} className="list-row">
              <b>{w.name}</b>
              <span className="small">
                Init {w.init} Atk {w.atk} Dfn {w.dfn} Dam {w.dam}
              </span>
              <span style={{ flex: 1 }} />
              <button className="small ghost" onClick={() => update((s) => void s.custom.weapons.splice(i, 1))}>
                ✕
              </button>
            </div>
          ))}
        </Card>
        <Card title={`Custom spells (${saga.custom.spells.length})`}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Design spells under Spells & design → Design a spell, and save them to the saga.
          </p>
          {saga.custom.spells.map((sp, i) => (
            <div key={sp.id} className="list-row">
              <b>{sp.name}</b>{' '}
              <span className="badge">
                {sp.technique}
                {sp.form} {sp.level}
              </span>
              <span style={{ flex: 1 }} />
              <button className="small ghost" onClick={() => update((s) => void s.custom.spells.splice(i, 1))}>
                ✕
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function MechanicsTab({ saga, update }: P) {
  const data = useGameData(saga);
  const [id, setId] = useState('');
  const [json, setJson] = useState('');
  const [err, setErr] = useState('');
  const def = id ? data.vfById.get(id) : undefined;
  const load = (vid: string) => {
    setId(vid);
    setErr('');
    const d = data.vfById.get(vid);
    const cur: Partial<Mechanics> = saga.mechanicsOverrides[vid] ?? { effects: d?.effects, param: d?.param, requiresGift: d?.requiresGift, forTypes: d?.forTypes };
    setJson(JSON.stringify(cur, null, 2));
  };
  return (
    <div className="grid grid-2">
      <Card title="Override a Virtue or Flaw's mechanics" className="accent">
        <p className="small muted" style={{ marginTop: 0 }}>
          Advanced: every Virtue and Flaw has machine-readable effects (xp pools, bonuses, Lab Total modifiers…). Change them here to implement a house rule or a different reading
          of an ambiguous rule. Effects use the same format as the built-in data.
        </p>
        <input list="vf-ids" placeholder="Type a Virtue or Flaw…" onChange={(e) => { const v = data.virtuesFlaws.find((x) => x.name === e.target.value || x.id === e.target.value); if (v) load(v.id); }} style={{ width: '100%' }} />
        <datalist id="vf-ids">
          {data.virtuesFlaws.map((v) => (
            <option key={v.id} value={v.name}>
              {v.kind} {v.source.book}
            </option>
          ))}
        </datalist>
        {def && (
          <>
            <h4>
              {def.name} <span className="badge">{def.kind}</span>
            </h4>
            <textarea rows={16} value={json} onChange={(e) => setJson(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }} />
            {err && <div className="small bad-text">{err}</div>}
            <div className="row" style={{ marginTop: 6 }}>
              <button
                className="primary"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(json) as Partial<Mechanics>;
                    update((s) => void (s.mechanicsOverrides = { ...s.mechanicsOverrides, [def.id]: parsed }));
                    setErr('');
                  } catch (e) {
                    setErr(`Invalid JSON: ${(e as Error).message}`);
                  }
                }}
              >
                Save override
              </button>
              {saga.mechanicsOverrides[def.id] && (
                <button
                  onClick={() => {
                    update((s) => {
                      const o = { ...s.mechanicsOverrides };
                      delete o[def.id];
                      s.mechanicsOverrides = o;
                    });
                    load(def.id);
                  }}
                >
                  Remove override
                </button>
              )}
            </div>
          </>
        )}
      </Card>
      <Card title="Current overrides">
        {Object.keys(saga.mechanicsOverrides).length === 0 && <div className="small muted">None — all Virtues and Flaws use the built-in mechanics.</div>}
        {Object.keys(saga.mechanicsOverrides).map((k) => (
          <div key={k} className="list-row clickable" onClick={() => load(k)}>
            {data.vfById.get(k)?.name ?? k}
          </div>
        ))}
        <h4>Effect types</h4>
        <p className="small muted">
          charPoints, charBonus, greatChar, abilityAccess, xpPool, laterLifeXpPerYear, abilityBonus, artBonus, abilityAffinity, artAffinity, grantAbility, deficientArt, magicalFocus, labTotal,
          labTotalMultiplier, castingTotal, castingScore, botchDice, soak, woundPenalty, fatiguePenalty, confidence, reputation, warpingPoints, apprenticeXp, apprenticeSpellLevels, gift, size,
          sourceQuality, advancementMultiplier, livingConditions, agingRoll, magicResistance, implies, note. Use "$param" to refer to the choice made when the Virtue is taken.
        </p>
      </Card>
    </div>
  );
}
