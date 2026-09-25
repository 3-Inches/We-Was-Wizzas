import { useState } from 'react';
import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type Form, type GameData, type Technique } from '../../data';
import type { DerivedCharacter } from '../../engine/character/derive';
import { FREQUENCY, MATERIAL_BASE, SIZE_MULT, chargedItemCharges, investEffect, modifiedEffectLevel, openingCost, talismanCapacity } from '../../engine/enchant';
import { labTotal, type AuraState, type LabContext } from '../../engine/magic';
import type { EnchantedEffectRecord, EnchantedItem } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Field, Stepper, Total } from '../kit';

export function newItem(kind: EnchantedItem['kind'] = 'invested'): EnchantedItem {
  return { uid: uid(), name: 'New item', kind, material: 'wood', size: 'small', shapeMaterialIds: [], openedPawns: 0, effects: [], attunements: [] };
}

export function newEffect(): EnchantedEffectRecord {
  return {
    uid: uid(), name: 'New effect', technique: 'Cr', form: 'Ig', requisites: [], baseLevel: 10, range: 'Touch', duration: 'Momentary', target: 'Individual',
    usesPerDay: '1', penetration: 0, concentration: false, effectUse: false, environmentalTrigger: false, fastTrigger: false, linkedTrigger: false, expiry: 'none', modifiedLevel: 10,
  };
}

function recalc(e: EnchantedEffectRecord, weakMagic = false): EnchantedEffectRecord {
  return { ...e, modifiedLevel: modifiedEffectLevel({ ...e, weakMagic }).level };
}

/** Highest Technique + highest Form, i.e. the most pawns of Vim vis that can open a talisman (DE p.259). */
export function characterTalismanCapacity(d: DerivedCharacter): number {
  return talismanCapacity(Math.max(...TECHNIQUES.map((t) => d.arts[t].score)), Math.max(...FORMS.map((f) => d.arts[f].score)));
}

interface Props {
  items: EnchantedItem[];
  onChange: (fn: (items: EnchantedItem[]) => void) => void;
  data: GameData;
  /** the enchanter, for Lab Totals and talisman capacity */
  d?: DerivedCharacter;
  aura?: AuraState;
  lab?: LabContext;
  talismanUid?: string;
  onSetTalisman?: (uid: string | undefined) => void;
  title?: string;
}

export default function ItemsEditor(props: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const { items, onChange } = props;
  return (
    <Card
      title={props.title ?? 'Enchanted items'}
      actions={
        <>
          <button className="small" onClick={() => onChange((xs) => void xs.push(newItem('invested')))}>
            + Invested device
          </button>
          <button className="small" onClick={() => onChange((xs) => void xs.push(newItem('lesser')))}>
            + Lesser device
          </button>
          <button className="small" onClick={() => onChange((xs) => void xs.push(newItem('charged')))}>
            + Charged item
          </button>
        </>
      }
    >
      {items.length === 0 && <div className="small muted">No items.</div>}
      {items.map((it) => (
        <ItemRow key={it.uid} {...props} item={it} open={open === it.uid} onToggle={() => setOpen(open === it.uid ? null : it.uid)} />
      ))}
    </Card>
  );
}

function ItemRow(props: Props & { item: EnchantedItem; open: boolean; onToggle: () => void }) {
  const { item: it, onChange, data, d } = props;
  const isTalisman = props.talismanUid === it.uid;
  const set = (fn: (x: EnchantedItem) => void) => onChange((xs) => { const x = xs.find((y) => y.uid === it.uid); if (x) fn(x); });
  const maxPawns = isTalisman && d ? characterTalismanCapacity(d) : openingCost(it.material, it.size);
  const used = it.effects.reduce((s, e) => s + e.modifiedLevel, 0);
  const capacity = it.openedPawns * 10;
  const smBonuses = it.shapeMaterialIds.flatMap((id) => data.shapeMaterial.find((s) => s.id === id)?.bonuses.map((b) => ({ ...b, from: data.shapeMaterial.find((s) => s.id === id)!.name })) ?? []);
  const weakMagic = !!d?.effects.some((e) => e.type === 'penetrationMultiplier');
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="row">
        <span className="clickable" onClick={props.onToggle}>
          {props.open ? '▾' : '▸'} <b>{it.name}</b>
        </span>
        <span className="badge">{isTalisman ? 'talisman' : it.kind}</span>
        <span className="small muted">
          {it.material}, {it.size}
          {it.kind === 'invested' || isTalisman ? ` — ${used}/${capacity} levels, ${it.openedPawns}/${maxPawns} pawns opened` : ''}
          {it.kind === 'charged' ? ` — ${it.charges ?? 0} charges` : ''}
        </span>
        {used > capacity && (it.kind === 'invested' || isTalisman) && <span className="badge bad">over capacity</span>}
        <span style={{ flex: 1 }} />
        {props.onSetTalisman && it.kind === 'invested' && (
          <button className="small ghost" onClick={() => props.onSetTalisman!(isTalisman ? undefined : it.uid)}>
            {isTalisman ? 'Unset talisman' : 'Make talisman'}
          </button>
        )}
        <button className="small ghost" onClick={() => onChange((xs) => void xs.splice(xs.findIndex((y) => y.uid === it.uid), 1))}>
          ✕
        </button>
      </div>
      {props.open && (
        <div className="stack" style={{ padding: '6px 0 6px 16px' }}>
          <div className="row">
            <Field label="Name">
              <input value={it.name} onChange={(e) => set((x) => void (x.name = e.target.value))} />
            </Field>
            <Field label="Kind">
              <select value={it.kind} onChange={(e) => set((x) => void (x.kind = e.target.value as EnchantedItem['kind']))}>
                <option value="invested">Invested device</option>
                <option value="lesser">Lesser enchanted device</option>
                <option value="charged">Charged item</option>
                <option value="talisman">Talisman</option>
              </select>
            </Field>
            <Field label="Material">
              <select value={it.material} onChange={(e) => set((x) => void (x.material = e.target.value))}>
                {Object.entries(MATERIAL_BASE).map(([m, v]) => (
                  <option key={m} value={m}>
                    {m} ({v})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Size">
              <select value={it.size} onChange={(e) => set((x) => void (x.size = e.target.value as EnchantedItem['size']))}>
                {Object.entries(SIZE_MULT).map(([k, v]) => (
                  <option key={k} value={k} title={v.example}>
                    {k} (×{v.mult})
                  </option>
                ))}
              </select>
            </Field>
            {(it.kind === 'invested' || it.kind === 'talisman' || isTalisman) && (
              <Field label={`Pawns opened (max ${maxPawns})`} hint={isTalisman ? 'Talisman: highest Te + highest Fo' : 'Material base × size'}>
                <Stepper value={it.openedPawns} min={0} max={Math.max(maxPawns, it.openedPawns)} width={40} onChange={(v) => set((x) => void (x.openedPawns = v))} />
              </Field>
            )}
            {it.kind === 'charged' && (
              <Field label="Charges remaining">
                <Stepper value={it.charges ?? 0} min={0} width={40} onChange={(v) => set((x) => void (x.charges = v))} />
              </Field>
            )}
          </div>
          <Field label="Shape & Material bonuses">
            <div className="row">
              <select
                value=""
                onChange={(e) => e.target.value && set((x) => void x.shapeMaterialIds.push(e.target.value))}
                style={{ maxWidth: 360 }}
              >
                <option value="">+ add shape or material…</option>
                {data.shapeMaterial.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}: {s.bonuses.map((b) => `+${b.bonus} ${b.effect}`).join('; ').slice(0, 90)}
                  </option>
                ))}
              </select>
              {it.shapeMaterialIds.map((id, i) => (
                <span key={i} className="badge clickable" title="click to remove" onClick={() => set((x) => void x.shapeMaterialIds.splice(i, 1))}>
                  {data.shapeMaterial.find((s) => s.id === id)?.name ?? id} ✕
                </span>
              ))}
            </div>
          </Field>
          {smBonuses.length > 0 && (
            <div className="small soft">
              {smBonuses.map((b, i) => (
                <div key={i}>
                  {b.from}: +{b.bonus} {b.effect}
                </div>
              ))}
            </div>
          )}
          {isTalisman && (
            <Field label="Talisman attunements (Casting Score bonus when touching it; only the highest applies)">
              <div className="stack">
                {it.attunements.map((a, i) => (
                  <div key={i} className="row">
                    <input value={a.label} onChange={(e) => set((x) => void (x.attunements[i].label = e.target.value))} style={{ flex: 1 }} />
                    <Stepper value={a.bonus} min={0} width={36} onChange={(v) => set((x) => void (x.attunements[i].bonus = v))} />
                    <button className="small ghost" onClick={() => set((x) => void x.attunements.splice(i, 1))}>
                      ✕
                    </button>
                  </div>
                ))}
                <div className="row">
                  <select value="" onChange={(e) => { const b = smBonuses[Number(e.target.value)]; if (b) set((x) => void x.attunements.push({ label: `${b.from}: ${b.effect}`, bonus: b.bonus })); }}>
                    <option value="">+ attune from this item's Shape & Material…</option>
                    {smBonuses.map((b, i) => (
                      <option key={i} value={i}>
                        +{b.bonus} {b.effect}
                      </option>
                    ))}
                  </select>
                  <button className="small" onClick={() => set((x) => void x.attunements.push({ label: 'Attunement', bonus: 1 }))}>
                    + custom
                  </button>
                </div>
              </div>
            </Field>
          )}
          <h4>Effects</h4>
          {it.effects.map((e) => (
            <EffectEditor key={e.uid} item={it} effect={e} set={set} d={d} aura={props.aura} lab={props.lab} talisman={isTalisman} weakMagic={weakMagic} smBonuses={smBonuses} />
          ))}
          {(it.kind !== 'lesser' || it.effects.length === 0) && (
            <button className="small" onClick={() => set((x) => void x.effects.push(newEffect()))}>
              + Effect
            </button>
          )}
          <Field label="Notes">
            <textarea rows={2} value={it.notes ?? ''} onChange={(e) => set((x) => void (x.notes = e.target.value))} />
          </Field>
        </div>
      )}
    </div>
  );
}

function EffectEditor(props: {
  item: EnchantedItem;
  effect: EnchantedEffectRecord;
  set: (fn: (x: EnchantedItem) => void) => void;
  d?: DerivedCharacter;
  aura?: AuraState;
  lab?: LabContext;
  talisman: boolean;
  weakMagic: boolean;
  smBonuses: { bonus: number; effect: string; from: string }[];
}) {
  const { effect: e, item, d } = props;
  const [sm, setSm] = useState(0);
  const upd = (fn: (x: EnchantedEffectRecord) => void) =>
    props.set((it) => {
      const i = it.effects.findIndex((y) => y.uid === e.uid);
      if (i < 0) return;
      const copy = { ...it.effects[i] };
      fn(copy);
      it.effects[i] = recalc(copy, props.weakMagic);
    });
  const mod = modifiedEffectLevel({ ...e, weakMagic: props.weakMagic });
  const lt = d
    ? labTotal(d, { technique: e.technique, form: e.form, requisites: e.requisites }, {
        activity: 'items', aura: props.aura, lab: props.lab, shapeMaterialBonus: sm, talisman: props.talisman,
      })
    : null;
  const kind = item.kind === 'lesser' ? 'lesser' : props.talisman ? 'talisman' : 'invested';
  const inv = lt ? investEffect(lt.total, mod.level, kind, e.expiry) : null;
  return (
    <div className="card inset" style={{ padding: 8 }}>
      <div className="row">
        <input value={e.name} onChange={(ev) => upd((x) => void (x.name = ev.target.value))} style={{ flex: '1 1 160px' }} />
        <select value={e.technique} onChange={(ev) => upd((x) => void (x.technique = ev.target.value as Technique))}>
          {TECHNIQUES.map((t) => (
            <option key={t} value={t}>
              {ART_NAMES[t]}
            </option>
          ))}
        </select>
        <select value={e.form} onChange={(ev) => upd((x) => void (x.form = ev.target.value as Form))}>
          {FORMS.map((f) => (
            <option key={f} value={f}>
              {ART_NAMES[f]}
            </option>
          ))}
        </select>
        <select value="" onChange={(ev) => ev.target.value && upd((x) => void (x.requisites = [...x.requisites, ev.target.value as Art]))} title="Add requisite">
          <option value="">+ req.</option>
          {ARTS.map((a) => (
            <option key={a} value={a}>
              {ART_NAMES[a]}
            </option>
          ))}
        </select>
        {e.requisites.map((r, i) => (
          <span key={i} className="badge clickable" onClick={() => upd((x) => void (x.requisites = x.requisites.filter((_, j) => j !== i)))}>
            {r} ✕
          </span>
        ))}
        <button className="small ghost" onClick={() => props.set((it) => void (it.effects = it.effects.filter((y) => y.uid !== e.uid)))}>
          ✕
        </button>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <Field label="Effect level" hint="as designed like a spell">
          <Stepper value={e.baseLevel} min={1} width={40} onChange={(v) => upd((x) => void (x.baseLevel = v))} />
        </Field>
        <Field label="R / D / T">
          <div className="row tight">
            <input value={e.range} style={{ width: 80 }} onChange={(ev) => upd((x) => void (x.range = ev.target.value))} />
            <input value={e.duration} style={{ width: 90 }} onChange={(ev) => upd((x) => void (x.duration = ev.target.value))} />
            <input value={e.target} style={{ width: 80 }} onChange={(ev) => upd((x) => void (x.target = ev.target.value))} />
          </div>
        </Field>
        {item.kind !== 'charged' && (
          <Field label="Uses per day">
            <select value={e.usesPerDay} onChange={(ev) => upd((x) => void (x.usesPerDay = ev.target.value))}>
              {FREQUENCY.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} (+{f.mod})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Penetration">
          <Stepper value={e.penetration} min={0} step={2} width={40} onChange={(v) => upd((x) => void (x.penetration = v))} />
        </Field>
        {item.kind !== 'lesser' && item.kind !== 'charged' && (
          <Field label="Expiry">
            <select value={e.expiry} onChange={(ev) => upd((x) => void (x.expiry = ev.target.value as EnchantedEffectRecord['expiry']))}>
              <option value="none">permanent</option>
              <option value="70">70 years (×2)</option>
              <option value="7">7 years (×5)</option>
              <option value="1">1 year (×10)</option>
            </select>
          </Field>
        )}
      </div>
      <div className="row small" style={{ marginTop: 6 }}>
        {(
          [
            ['concentration', 'Maintains concentration (+5)'],
            ['effectUse', 'Restricted use (+3)'],
            ['environmentalTrigger', 'Environmental trigger (+3)'],
            ['fastTrigger', 'Fast trigger (+5)'],
            ['linkedTrigger', 'Linked trigger (+3)'],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="inline">
            <input type="checkbox" checked={e[k]} onChange={(ev) => upd((x) => void (x[k] = ev.target.checked))} /> {l}
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <div className="stat">
          <span className="v">
            <Total value={mod.level} parts={mod.parts} label="Modified effect level" />
          </span>
          <span className="l">Modified level</span>
        </div>
        <div className="stat">
          <span className="v">{Math.ceil(mod.level / 10)}</span>
          <span className="l">Vis to instill</span>
        </div>
        {lt && (
          <>
            {props.smBonuses.length > 0 && (
              <Field label="S&M bonus applied">
                <select value={sm} onChange={(ev) => setSm(Number(ev.target.value))}>
                  <option value={0}>none</option>
                  {props.smBonuses.map((b, i) => (
                    <option key={i} value={b.bonus}>
                      +{b.bonus} {b.effect.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="stat">
              <span className="v">
                <Total value={lt.total} parts={lt.parts} notes={lt.notes} label={`Lab Total ${e.technique}${e.form}`} />
              </span>
              <span className="l">Lab Total</span>
            </div>
            {item.kind === 'charged' ? (
              <div className="stat">
                <span className="v">{chargedItemCharges(lt.total, mod.level)}</span>
                <span className="l">Charges per season</span>
              </div>
            ) : (
              <div className="stat">
                <span className={`v ${inv?.possible ? '' : 'bad-text'}`}>{inv?.possible ? inv.seasons : '✗'}</span>
                <span className="l">{inv?.possible ? `Season${inv.seasons > 1 ? 's' : ''} (${inv.pointsPerSeason}/season)` : inv?.reason}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
