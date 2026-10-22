// Mysteries & Initiation: the Mystagogue's Initiation Total against the target for a Mystery Virtue,
// the books' Scripts, Ordeals and their later discount, varying a Script, and the Criamon Paths.

import { useMemo, useState } from 'react';
import { deriveCharacter } from '../../../engine/character/derive';
import {
  ORDEALS, SCRIPT_ELEMENTS, applyInitiation, criamonProgress, initiationTarget, initiationTotal, mysteryLores, stationLoreNeeded, varyScript, type OrdealTier,
} from '../../../engine/initiation';
import { optionOn } from '../../../engine/optional';
import { describeStress, stressDie } from '../../../engine/dice';
import type { VFSize } from '../../../data/types';
import { CRIAMON_PATHS, CRIAMON_STATIONS, HOUSE_MYSTERIES, scriptsFor, stationPower } from '../../../data/mysteries';
import { HOUSE_BY_ID } from '../../../data/houses';
import { useSagaCharacters } from '../../../store/hooks';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';

const MYSTERY_HOUSES = ['bjornaer', 'criamon', 'merinita', 'verditius'];

export function MysteriesCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga, update, change } = ed;
  const sagaChars = useSagaCharacters(c?.sagaId);
  const [open, setOpen] = useState(false);
  const [virtueId, setVirtueId] = useState('');
  const [sizePick, setSizePick] = useState<VFSize>('Minor');
  const [station, setStation] = useState('');
  const [scriptIdx, setScriptIdx] = useState(0);
  const [elements, setElements] = useState<string[]>([]);
  const [symbol, setSymbol] = useState(3);
  const [ordealId, setOrdealId] = useState('');
  const [ordealPick, setOrdealPick] = useState('');
  const [mysta, setMysta] = useState('self');
  const [manual, setManual] = useState({ pre: 2, lore: 4, int: 2, knows: true });
  const [loreUid, setLoreUid] = useState('');
  const [earlier, setEarlier] = useState('');
  const [vary, setVary] = useState<{ ok: boolean; text: string; key: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [changeEase, setChangeEase] = useState(6);
  const other = useMemo(() => {
    const t = sagaChars.find((x) => x.id === mysta);
    return t && saga ? deriveCharacter(t, data, saga.houseRules) : undefined;
  }, [sagaChars, mysta, data, saga]);
  if (!c || !d || !saga) return null;

  const history = c.initiations ?? [];
  const myLores = mysteryLores(d, c.house);
  const holdsMystery = d.virtues.some((v) => v.def?.categories.includes('Mystery'));
  if (!optionOn(saga, 'mysteries') && !history.length) return null;
  if (!MYSTERY_HOUSES.includes(c.house ?? '') && !myLores.length && !history.length && !holdsMystery) return null;

  const houseName = (h?: string) => (h ? HOUSE_BY_ID[h]?.name ?? h : '');
  const held = new Set(c.virtues.map((v) => v.defId));
  const st = CRIAMON_STATIONS.find((s) => s.id === station);
  const def = data.vfById.get(st ? st.id : virtueId);
  const size: VFSize = st ? 'Major' : def?.sizes.length === 1 ? def.sizes[0] : sizePick;
  const scripts = def && !st ? scriptsFor(def.id, def.name) : [];
  const script = st ? undefined : scripts[scriptIdx];
  const mysHouse = st ? 'criamon' : HOUSE_MYSTERIES.find((m) => m.id === virtueId)?.house;

  // the Mystagogue: the Initiate (self-Initiation), another character of the saga, or someone the storyguide plays
  const md = mysta === 'self' ? d : other;
  const mLores = md ? mysteryLores(md, mysHouse ?? c.house) : [];
  const mLore = mLores.find((l) => l.uid === loreUid) ?? mLores[0];
  const pre = md ? md.characteristics.Pre.value : manual.pre;
  const lore = md ? mLore?.score ?? 0 : manual.lore;
  const int = md ? md.characteristics.Int.value : manual.int;
  const knows = mysta === 'self' ? false : md ? md.virtues.some((v) => v.cv.defId === (st?.id ?? virtueId)) : manual.knows;
  const mystaName = mysta === 'self' ? `${c.name || 'the Initiate'} (self-Initiation)` : md ? sagaChars.find((x) => x.id === mysta)?.name ?? 'the Mystagogue' : 'the Mystagogue';

  // the Script: the book's, or one built from the common elements; a book Script takes one change at most
  const ordeal = ORDEALS.find((o) => o.id === ordealId);
  const elementBonus = elements.reduce((s, e) => s + (e === 'symbol' ? symbol : SCRIPT_ELEMENTS.find((x) => x.id === e)?.bonus ?? 0), 0);
  const bookBonus = st ? st.bonus : script?.bonus ?? 0;
  const ordealBonus = !st && !script && ordeal ? ordeal.bonus : 0;
  const scriptBonus = bookBonus + elementBonus + ordealBonus;
  const varied = (!!st || !!script) && elements.length > 0;
  const varyKey = `${st?.id ?? virtueId}:${scriptIdx}:${elements.join(',')}`;
  const total = initiationTotal(pre, lore, scriptBonus);
  const [eTier, eNth] = earlier.split(':');
  const tgt = st
    ? { base: st.target ?? 21, reduction: 0, reductionText: 'the book’s target, with the Path’s Ordeals counted', target: st.target ?? 21 }
    : initiationTarget(size, knows, history, eTier ? { tier: eTier as OrdealTier, nth: Number(eNth) } : undefined);
  const enough = total >= tgt.target;
  const varyOk = !varied || (vary?.key === varyKey && vary.ok);
  const myHouseLore = mysteryLores(d, mysHouse)[0]?.score ?? 0;
  const needLore = st ? stationLoreNeeded(st) : mysHouse && c.house !== mysHouse ? 1 : 0;

  const pickOrdealOptions = () => {
    if (!ordeal) return [];
    if (ordeal.flaw) return data.virtuesFlaws.filter((v) => v.kind === 'flaw' && v.sizes.includes(ordeal.flaw!)).map((v) => ({ value: v.id, label: v.name }));
    if (ordeal.lose) return d.virtues.filter((v) => v.def?.kind === 'virtue' && v.cv.size === ordeal.lose).map((v) => ({ value: v.cv.uid, label: v.name }));
    return d.virtues.filter((v) => v.def?.kind === 'flaw' && v.cv.size === 'Minor' && v.def.sizes.includes('Major')).map((v) => ({ value: v.cv.uid, label: v.name }));
  };
  const reset = () => {
    setElements([]);
    setOrdealId('');
    setOrdealPick('');
    setVary(null);
    setScriptIdx(0);
  };
  const choose = (id: string) => {
    reset();
    setStation(id.startsWith('criamon-') && CRIAMON_STATIONS.some((s) => s.id === id) ? id : '');
    setVirtueId(id);
    setOpen(true);
  };
  const doVary = () => {
    const r = varyScript(int, lore, 'extend');
    setVary({ ok: r.ok, text: r.text, key: varyKey });
    setLog((l) => [r.text, ...l].slice(0, 6));
  };
  const initiate = () => {
    if (!def) return;
    const o = ordeal && ordealPick
      ? { tier: ordeal.tier, text: `${ordeal.label}: ${ordeal.flaw ? data.vfById.get(ordealPick)?.name : d.virtues.find((v) => v.cv.uid === ordealPick)?.name}`, ...(ordeal.flaw ? { flawId: ordealPick, flawSize: ordeal.flaw } : ordeal.lose ? { loseUid: ordealPick } : { worsenUid: ordealPick }) }
      : undefined;
    let text = '';
    change((x) => {
      text = applyInitiation(x, data, { virtueId: def.id, size, mystagogue: mystaName, total, target: tgt.target, ordeal: o, station: st?.id, year: saga.currentYear, season: saga.currentSeason });
      return text;
    }, '');
    setLog((l) => [text, ...l].slice(0, 6));
    setVirtueId('');
    setStation('');
    reset();
    setOpen(false);
  };

  // what can be chosen: the House's Mysteries, the other Houses', and other Hermetic or Supernatural Virtues
  const own = HOUSE_MYSTERIES.filter((m) => m.house === c.house && !held.has(m.id));
  const others = HOUSE_MYSTERIES.filter((m) => m.house !== c.house && !held.has(m.id));
  const rest = data.virtuesFlaws.filter((v) => v.kind === 'virtue' && !held.has(v.id) && !HOUSE_MYSTERIES.some((m) => m.id === v.id) && !CRIAMON_STATIONS.some((s) => s.id === v.id) && (v.categories.includes('Mystery') || v.categories.includes('Hermetic') || v.categories.includes('Supernatural')));

  const path = c.criamonPath ?? '';
  const criamon = c.house === 'criamon' || !!path || c.virtues.some((v) => CRIAMON_STATIONS.some((s) => s.id === v.defId));
  const ew = d.abilities.find((a) => a.abilityId === 'enigmatic-wisdom')?.total ?? 0;
  const progress = path ? criamonProgress(c, path) : [];
  const nextStation = progress.find((p) => !p.held)?.station;
  const dormant = CRIAMON_STATIONS.filter((s) => s.path !== path && held.has(s.id));

  return (
    <Card title="Mysteries & Initiation" actions={<button className="small" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Plan an Initiation'}</button>}>
      <RulesNote book="DE" line={16467} endLine={16535}>
        The Mystagogue’s Presence + (House) Lore + the Script’s bonus against 15 for a Minor Virtue or 21 for a Major one (18 and 30 for one the Mystagogue lacks). No die.
      </RulesNote>

      {c.house === 'bjornaer' && (
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
          <div className="row">
            <Field label="Heartbeast">
              <input value={c.heartbeast ?? ''} placeholder="wolf, bear, raven…" onChange={(e) => update((x) => void (x.heartbeast = e.target.value || undefined))} style={{ width: 140 }} />
            </Field>
            <Field label="Change form against magic" hint="Ease Factor about 3 + the magnitude of the magic">
              <div className="row" style={{ gap: 4 }}>
                <Stepper value={changeEase} min={3} max={30} onChange={setChangeEase} />
                <button
                  className="small"
                  onClick={() => {
                    const r = stressDie(1);
                    const sta = d.characteristics.Sta.value;
                    const hb = d.abilities.find((a) => a.abilityId === 'heartbeast')?.total ?? 0;
                    const t = sta + hb + r.value;
                    setLog((l) => [`Change form: Sta ${sta} + Heartbeast ${hb} + ${describeStress(r)} = ${t} vs ${changeEase}: ${r.botches ? 'botch' : t >= changeEase ? 'the change happens, and the other magic ends' : 'no change'}.`, ...l].slice(0, 6));
                  }}
                >
                  Roll
                </button>
              </div>
            </Field>
          </div>
          <div className="small muted">In heartbeast form the magus is the animal: Animal spells affect it, not Corpus or Mentem, and casting without words or gestures costs −15. No familiar.</div>
        </div>
      )}

      {criamon && (
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
          <div className="row">
            <Field label="Criamon Path">
              <select value={path} onChange={(e) => update((x) => void (x.criamonPath = e.target.value || undefined))}>
                <option value="">— the Winding Path —</option>
                {CRIAMON_PATHS.map((p) => (
                  <option key={p} value={p}>
                    The {p}
                  </option>
                ))}
              </select>
            </Field>
            <span className="small muted">
              Enigmatic Wisdom {ew}
              {ew > 0 ? ` · a labyrinth meditation gives +${Math.floor(ew / 2)} to one roll` : ''}
            </span>
          </div>
          {progress.map(({ station: s, held: h }) => (
            <div key={s.id} className="small" style={{ opacity: h || s === nextStation ? 1 : 0.6 }}>
              {h ? '✓' : `${s.order}.`} <b>{s.name}</b> <span className="muted">{stationPower(s)}</span>
              {s === nextStation && (
                <>
                  {' '}
                  <span className={myHouseLore >= stationLoreNeeded(s) ? 'muted' : 'bad-text'}>needs House Criamon Lore {stationLoreNeeded(s)}</span>{' '}
                  <button className="small ghost" onClick={() => choose(s.id)} style={{ padding: '0 6px' }}>
                    Prepare
                  </button>
                </>
              )}
            </div>
          ))}
          {dormant.length > 0 && <div className="small muted">Stations of another Path, unused while on this one: {dormant.map((s) => s.name).join(', ')}.</div>}
        </div>
      )}

      {open && (
        <div className="stack" style={{ marginTop: 6 }}>
          {!st && (
            <div className="row">
              <Field label="Mystery">
                <select value={virtueId} onChange={(e) => choose(e.target.value)}>
                  <option value="">— choose —</option>
                  {own.length > 0 && (
                    <optgroup label={`House ${houseName(c.house)} Mysteries`}>
                      {own.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.size})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Other Houses’ Mysteries">
                    {others.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({houseName(m.house)}, {m.size})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Virtues a cult may Initiate">
                    {rest.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              {def && def.sizes.length > 1 && (
                <Field label="Size">
                  <select value={sizePick} onChange={(e) => setSizePick(e.target.value as VFSize)}>
                    {def.sizes.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          )}
          {st && (
            <div className="small">
              <b>{st.name}</b> ({st.path}) <span className="muted">· {st.avenue}</span>{' '}
              <button className="small ghost" onClick={() => choose('')} style={{ padding: '0 6px' }}>
                Change
              </button>
            </div>
          )}

          {def && (
            <>
              <div className="row">
                <Field label="Mystagogue">
                  <select value={mysta} onChange={(e) => { setMysta(e.target.value); setLoreUid(''); setVary(null); }}>
                    <option value="self">Self-Initiation (no Mystagogue)</option>
                    {sagaChars.filter((x) => x.id !== c.id).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                    <option value="other">Someone else…</option>
                  </select>
                </Field>
                {md && mLores.length > 1 && (
                  <Field label="Lore">
                    <select value={mLore?.uid ?? ''} onChange={(e) => setLoreUid(e.target.value)}>
                      {mLores.map((l) => (
                        <option key={l.uid} value={l.uid}>
                          {l.name} {l.score}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {!md && (
                  <>
                    <Field label="Presence"><Stepper value={manual.pre} min={-5} max={10} onChange={(v) => setManual({ ...manual, pre: v })} /></Field>
                    <Field label="Lore"><Stepper value={manual.lore} min={0} max={20} onChange={(v) => setManual({ ...manual, lore: v })} /></Field>
                    <Field label="Intelligence"><Stepper value={manual.int} min={-5} max={10} onChange={(v) => setManual({ ...manual, int: v })} /></Field>
                    <label className="inline small"><input type="checkbox" checked={manual.knows} onChange={(e) => setManual({ ...manual, knows: e.target.checked })} /> has the Virtue</label>
                  </>
                )}
              </div>
              {md && !mLore && <div className="small bad-text">{mysta === 'self' ? 'The Initiate has' : 'The Mystagogue has'} no (House) Lore, which an Initiation needs.</div>}

              {!st && (
                <Field label="Script">
                  <select value={scriptIdx} onChange={(e) => { setScriptIdx(Number(e.target.value)); setElements([]); setOrdealId(''); setVary(null); }}>
                    {scripts.map((s, i) => (
                      <option key={i} value={i}>
                        {s.cult} (+{s.bonus})
                      </option>
                    ))}
                    <option value={scripts.length}>{scripts.length ? 'Another Script, built from its elements' : 'A Script built from its elements'}</option>
                  </select>
                </Field>
              )}
              {(st || script) && <div className="small muted" style={{ borderLeft: '3px solid var(--line)', paddingLeft: 8 }}>{st ? st.bonusText : script!.details || script!.bonusText}</div>}

              <details>
                <summary className="small">
                  {st || script ? 'Add to the Script (a Vary roll against 9)' : 'The Script’s elements'} · +{elementBonus + ordealBonus}
                </summary>
                <div className="row" style={{ marginTop: 4 }}>
                  {SCRIPT_ELEMENTS.map((e) => (
                    <label key={e.id} className="inline small">
                      <input
                        type="checkbox"
                        checked={elements.includes(e.id)}
                        disabled={(!!st || !!script) && elements.length > 0 && !elements.includes(e.id)}
                        onChange={(ev) => setElements(ev.target.checked ? [...elements, e.id] : elements.filter((x) => x !== e.id))}
                      />
                      {e.label} +{e.id === 'symbol' ? symbol : e.bonus}
                    </label>
                  ))}
                  {elements.includes('symbol') && <Stepper value={symbol} min={3} max={6} onChange={setSymbol} title="a great symbolic Sacrifice: +3 to +6" />}
                </div>
              </details>

              <div className="row">
                <Field label="Ordeal" hint={st || script ? 'what the Script makes the Initiate suffer (its bonus is in the Script’s)' : undefined}>
                  <select value={ordealId} onChange={(e) => { setOrdealId(e.target.value); setOrdealPick(''); }}>
                    <option value="">none</option>
                    {ORDEALS.map((o) => (
                      <option key={o.id} value={o.id}>
                        The Initiate {o.label}{!st && !script ? ` (+${o.bonus})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                {ordeal && (
                  <Field label={ordeal.flaw ? 'Flaw' : ordeal.lose ? 'Virtue lost' : 'Flaw'}>
                    <select value={ordealPick} onChange={(e) => setOrdealPick(e.target.value)}>
                      <option value="">— choose —</option>
                      {pickOrdealOptions().map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>

              {!st && (
                <details>
                  <summary className="small">An earlier Ordeal not recorded here</summary>
                  <select value={earlier} onChange={(e) => setEarlier(e.target.value)} style={{ marginTop: 4 }}>
                    <option value="">none</option>
                    {(['Minor', 'Medium', 'Major'] as const).flatMap((t) =>
                      [1, 2, 3].map((n) => (
                        <option key={`${t}:${n}`} value={`${t}:${n}`}>
                          {['First', 'Second', 'Third'][n - 1]} Initiation after a {t} Ordeal
                        </option>
                      )),
                    )}
                  </select>
                </details>
              )}

              <div className={enough ? 'good-text' : 'bad-text'}>
                <b>
                  Initiation Total {total} vs {tgt.target}
                </b>{' '}
                <span className="small muted">
                  (Presence {pre} + Lore {lore} + Script {scriptBonus}; target {st ? tgt.reductionText : `${tgt.base} for a ${size} Virtue ${knows ? 'the Mystagogue has' : 'new to the Mystagogue'}${tgt.reduction ? `, −${tgt.reduction} for the ${tgt.reductionText}` : ''}${tgt.base - tgt.reduction < 9 ? ', at least 9' : ''}`})
                </span>
                {!enough && <div className="small">Short by {tgt.target - total}: add an element to the Script, or study more Lore.</div>}
              </div>
              {needLore > 0 && myHouseLore < needLore && (
                <div className="small bad-text">
                  The Initiate needs House {houseName(mysHouse)} Lore {needLore} ({myHouseLore} now){st ? ' for this station' : ', not having been apprenticed in the House'}.
                </div>
              )}
              <div className="row">
                {varied && !varyOk && (
                  <button className="small" onClick={doVary}>
                    Roll to vary the Script (Int {int} + Lore {lore} + stress die vs 9)
                  </button>
                )}
                <button className="primary small" disabled={!enough || !varyOk || (!!ordeal && !ordealPick)} onClick={initiate}>
                  Initiate ({saga.currentSeason} {saga.currentYear})
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {log.map((t, i) => (
        <div key={i} className="small">
          {t}
        </div>
      ))}
      {history.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary className="small">Initiations ({history.length})</summary>
          {history.map((h) => (
            <div key={h.uid} className="small">
              {h.season} {h.year}: <b>{h.virtueName}</b> by {h.mystagogue}, {h.total} vs {h.target}
              {h.ordeal ? ` · ${h.ordeal} Ordeal (${h.ordealText})` : ''}
            </div>
          ))}
        </details>
      )}
    </Card>
  );
}
