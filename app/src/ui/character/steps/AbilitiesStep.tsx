import { useMemo, useState } from 'react';
import { LIVING_LANGUAGES, DEAD_LANGUAGES, PARAMETERIZED_ABILITIES, SAMPLE_CHILDHOODS, abilityTypeOf, type GameData } from '../../../data';
import { CREATION_SOURCES, canSpend, sumAlloc, type DerivedCharacter, type XpBudget } from '../../../engine/character/derive';
import { ensureAbility } from '../../../engine/character/factory';
import { abilityXpForScore, withAffinity } from '../../../engine/xp';
import type { Character, XpSource } from '../../../engine/types';
import { Card, Meter, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

/** Raw xp to add to one source so the ability reaches `targetScore`. */
export function rawNeeded(c: Character, d: DerivedCharacter, abUid: string, src: XpSource, targetScore: number): number {
  const ab = c.abilities.find((a) => a.uid === abUid);
  const da = d.abilityByUid.get(abUid);
  if (!ab || !da) return 0;
  const target = abilityXpForScore(targetScore);
  const cur = ab.xp[src] ?? 0;
  // Affinity and Linguist multiply creation and Virtue-pool xp, not free/play/adjust xp
  const multiplied = CREATION_SOURCES.includes(src) || src.startsWith('pool:');
  const mult = multiplied ? da.multiplier : 1;
  const eff = (x: number) => (mult !== 1 ? withAffinity(x, mult) : x);
  const base = da.effectiveXp - eff(cur);
  // minimal raw xp from this source that reaches the target score (works for raising and lowering)
  let raw = 0;
  while (base + eff(raw) < target) raw++;
  return raw;
}

export default function AbilitiesStep({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, saga } = ed;
  const budgets = d?.budgets.filter((b) => b.kind !== 'art+ability' || c?.type !== 'magus' || true) ?? [];
  const [poolId, setPoolId] = useState<XpSource>('childhood');
  const [showAllAbilities, setShowAllAbilities] = useState(false);
  const [newAb, setNewAb] = useState('');
  const [newParam, setNewParam] = useState('');
  if (!c || !d || !saga) return null;
  const pool = budgets.find((b) => b.id === poolId) ?? budgets[0];
  const native = c.abilities.find((a) => a.native);

  return (
    <>
      <Card title="Experience pools" className="accent">
        <p className="small muted" style={{ marginTop: 0 }}>
          Choose a pool, then raise Abilities with the + buttons. Early childhood (age 0–5) gives 75 xp in your native language and 45 xp in childhood Abilities; later life gives xp per year; some Virtues add their own pools.
        </p>
        <div className="grid grid-3">
          {budgets.map((b) => (
            <div key={b.id} className={`vf-item clickable ${pool?.id === b.id ? 'taken' : ''}`} onClick={() => setPoolId(b.id)}>
              <Meter label={b.label} value={b.spent} max={b.total} />
              <div className="small muted">{b.allows}</div>
              {b.spellLevels && (
                <div className="small">
                  Spell levels: {b.spellLevels.spent} / {b.spellLevels.total} (Spells step)
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {!native && (
        <Card title="Native language">
          <div className="row">
            <select onChange={(e) => e.target.value && update((x) => { const a = ensureAbility(x, 'living-language', { native: saga.houseRules.nativeLanguageXp }, e.target.value); a.native = true; })} defaultValue="">
              <option value="">— choose native language —</option>
              {LIVING_LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <span className="small muted">75 xp → score 5.</span>
          </div>
        </Card>
      )}

      {pool?.id === 'childhood' && (
        <Card title="Sample childhoods (DE p.48)">
          <div className="row">
            {SAMPLE_CHILDHOODS.map((sc) => (
              <button
                key={sc.name}
                className="small"
                onClick={() =>
                  update((x) => {
                    for (const ab of x.abilities) delete ab.xp.childhood;
                    for (const [id, score] of Object.entries(sc.abilities)) {
                      const param = id === 'area-lore' ? x.nationality || 'Home' : id === 'living-language' ? 'Second language' : undefined;
                      ensureAbility(x, id, { childhood: abilityXpForScore(score) }, param);
                    }
                    x.creation.childhoodPackage = sc.name;
                  })
                }
              >
                {sc.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {c.type === 'magus' && (pool?.id === 'apprenticeship' || pool?.id === 'postGauntlet') && (
        <Card title="Hermetic essentials">
          <div className="row">
            <button
              className="small"
              onClick={() =>
                update((x) => {
                  const need: [string, number, string?][] = [['dead-language', 4, 'Latin'], ['artes-liberales', 1], ['magic-theory', 3], ['parma-magica', 1]];
                  for (const [id, score, param] of need) {
                    const ab = ensureAbility(x, id, {}, param);
                    const cur = sumAlloc(ab.xp);
                    const want = abilityXpForScore(score);
                    if (cur < want) ab.xp.apprenticeship = (ab.xp.apprenticeship ?? 0) + (want - cur);
                  }
                })
              }
            >
              Add recommended minimum (Latin 4, Artes Liberales 1, Magic Theory 3, Parma Magica 1 — 90 xp)
            </button>
            <span className="small muted">Also consider Code of Hermes, Concentration, Finesse, Order of Hermes Lore, Penetration, Profession: Scribe.</span>
          </div>
        </Card>
      )}

      <Card title={`Abilities — spending from: ${pool?.label ?? ''}`}>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>Ability</th>
                <th>Type</th>
                <th className="num">Score</th>
                <th>This pool</th>
                <th>Specialty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.abilities
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((da) => {
                  const ab = c.abilities.find((x) => x.uid === da.uid)!;
                  const ok = pool ? canSpend(d, data, pool, ab) : { ok: false };
                  const inPool = pool ? ab.xp[pool.id] ?? 0 : 0;
                  const overCap = da.score > da.cap;
                  return (
                    <tr key={da.uid}>
                      <td>
                        <b>{da.name}</b>
                        {ab.native && <span className="badge">native</span>}
                        {da.affinity && <span className="badge info">Affinity</span>}
                        {da.bonus > 0 && <span className="badge good">+{da.bonus}</span>}
                        {da.abilityId in PARAMETERIZED_ABILITIES && !ab.native && (
                          <ParamEdit value={ab.param ?? ''} abilityId={ab.abilityId} onChange={(v) => update((x) => void (x.abilities.find((y) => y.uid === ab.uid)!.param = v))} />
                        )}
                      </td>
                      <td className="small">{da.type}</td>
                      <td className="num">
                        <Total
                          value={`${da.score}${da.remainder ? ` (${da.remainder})` : ''}`}
                          parts={Object.entries(ab.xp).map(([k, v]) => ({ label: poolLabel(k, d.budgets), value: v ?? 0 }))}
                          label={`Experience (effective ${da.effectiveXp})`}
                          className={overCap ? 'bad-text' : ''}
                        />
                        {overCap && <div className="small bad-text">cap {da.cap}</div>}
                      </td>
                      <td>
                        {pool && ok.ok ? (
                          <span className="row tight">
                            <button className="small icon" title="Lower one score level" disabled={inPool === 0} onClick={() => update((x) => setPool(x, ab.uid, pool.id, rawNeeded(x, d, ab.uid, pool.id, da.score - 1)))}>
                              −1
                            </button>
                            <Stepper value={inPool} min={0} step={1} width={46} onChange={(v) => update((x) => setPool(x, ab.uid, pool.id, v))} title="Raw xp from this pool" />
                            <button className="small icon" title="Raise one score level" onClick={() => update((x) => setPool(x, ab.uid, pool.id, rawNeeded(x, d, ab.uid, pool.id, da.score + 1)))}>
                              +1
                            </button>
                          </span>
                        ) : (
                          <span className="small muted">{ok.reason ?? '—'}</span>
                        )}
                      </td>
                      <td>
                        <SpecialtyEdit value={ab.specialty ?? ''} options={da.def?.specialties ?? []} onChange={(v) => update((x) => void (x.abilities.find((y) => y.uid === ab.uid)!.specialty = v))} />
                      </td>
                      <td>
                        {!ab.xp.free && (
                          <button className="small ghost" onClick={() => update((x) => void (x.abilities = x.abilities.filter((y) => y.uid !== ab.uid)))} title="Remove">
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <AddAbility
          data={data}
          d={d}
          pool={pool}
          showAll={showAllAbilities}
          setShowAll={setShowAllAbilities}
          value={newAb}
          setValue={setNewAb}
          param={newParam}
          setParam={setNewParam}
          onAdd={() => {
            if (!newAb) return;
            update((x) => void ensureAbility(x, newAb, {}, PARAMETERIZED_ABILITIES[newAb] ? newParam || undefined : undefined));
            setNewAb('');
            setNewParam('');
          }}
        />
      </Card>
    </>
  );
}

function setPool(x: Character, abUid: string, src: XpSource, v: number) {
  const ab = x.abilities.find((a) => a.uid === abUid);
  if (!ab) return;
  if (v <= 0) delete ab.xp[src];
  else ab.xp[src] = v;
}

function poolLabel(k: string, budgets: XpBudget[]): string {
  const b = budgets.find((x) => x.id === k);
  if (b) return b.label;
  return { free: 'Granted by Virtue', play: 'Gained in play', adjust: 'Adjustment', native: 'Native language' }[k] ?? k;
}

function ParamEdit(props: { value: string; abilityId: string; onChange: (v: string) => void }) {
  const opts = props.abilityId === 'living-language' ? LIVING_LANGUAGES : props.abilityId === 'dead-language' ? DEAD_LANGUAGES : [];
  const id = `p-${props.abilityId}`;
  return (
    <>
      <input value={props.value} placeholder={PARAMETERIZED_ABILITIES[props.abilityId]} onChange={(e) => props.onChange(e.target.value)} list={opts.length ? id : undefined} style={{ width: 120, marginLeft: 6 }} />
      {opts.length > 0 && (
        <datalist id={id}>
          {opts.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </>
  );
}

function SpecialtyEdit(props: { value: string; options: string[]; onChange: (v: string) => void }) {
  const id = useMemo(() => `spec-${Math.random().toString(36).slice(2)}`, []);
  return (
    <>
      <input value={props.value} onChange={(e) => props.onChange(e.target.value)} list={id} placeholder="specialty" style={{ width: 140 }} />
      <datalist id={id}>
        {props.options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

function AddAbility(props: {
  data: GameData; d: DerivedCharacter; pool?: XpBudget; showAll: boolean; setShowAll: (b: boolean) => void;
  value: string; setValue: (s: string) => void; param: string; setParam: (s: string) => void; onAdd: () => void;
}) {
  const { data, d, pool } = props;
  const list = data.abilities
    .filter((a) => data.isBookEnabled(a.source.book))
    .filter((a) => props.showAll || !pool || canSpend(d, data, pool, { abilityId: a.id }).ok || a.id === 'living-language' || a.id === 'dead-language')
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="row" style={{ marginTop: 10 }}>
      <select value={props.value} onChange={(e) => props.setValue(e.target.value)}>
        <option value="">+ Add an Ability…</option>
        {list.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({abilityTypeOf(data, a.id)})
          </option>
        ))}
      </select>
      {props.value && PARAMETERIZED_ABILITIES[props.value] && (
        <input value={props.param} onChange={(e) => props.setParam(e.target.value)} placeholder={PARAMETERIZED_ABILITIES[props.value]} />
      )}
      <button className="primary small" disabled={!props.value} onClick={props.onAdd}>
        Add
      </button>
      <label className="inline small">
        <input type="checkbox" checked={props.showAll} onChange={(e) => props.setShowAll(e.target.checked)} /> show Abilities this pool cannot buy
      </label>
    </div>
  );
}
