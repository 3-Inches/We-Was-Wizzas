import { useMemo, useState } from 'react';
import { ARTS, ART_NAMES, type LabCharacteristic, type LabVFDef } from '../../data';
import { deriveLab, newLab } from '../../engine/lab';
import type { Laboratory } from '../../engine/types';
import { useSagaCharacters } from '../../store/hooks';
import { uid } from '../../util/id';
import { BookBadge, Card, Field, Markdown, SearchInput, Stepper } from '../kit';
import type { CovTabProps } from './shared';

const ACTIVITIES = ['Experimentation', 'Familiar', 'Items', 'Longevity Rituals', 'Spells', 'Teaching', 'Texts', 'Vis Extraction'];
const SPEC_KEYS = [...ACTIVITIES, ...ARTS];
const CHAR_KEYS: LabCharacteristic[] = ['Size', 'Refinement', 'General Quality', 'Upkeep', 'Safety', 'Warping', 'Health', 'Aesthetics'];

export default function LabsTab({ cov, update, dc, data }: CovTabProps) {
  const chars = useSagaCharacters(cov.sagaId);
  const magi = chars.filter((c) => cov.memberIds.includes(c.id) && c.type === 'magus');
  const [open, setOpen] = useState<string | null>(cov.labs[0]?.uid ?? null);
  const labBP = dc.bpLines.filter((l) => l.category === 'Laboratories').reduce((s, l) => s + l.cost, 0);
  const withoutLab = magi.filter((m) => !cov.labs.some((l) => l.ownerId === m.id));
  return (
    <div className="stack">
      <Card
        title={`Laboratories (${labBP} BP)`}
        className="accent"
        actions={
          <>
            {withoutLab.length > 0 && (
              <button className="small" onClick={() => update((x) => void withoutLab.forEach((m) => x.labs.push(newLab(`${m.name || 'Magus'}'s laboratory`, m.id))))}>
                + Standard lab for each magus ({withoutLab.length})
              </button>
            )}
            <button className="small" onClick={() => update((x) => void x.labs.push(newLab('New laboratory')))}>
              + Laboratory
            </button>
          </>
        }
      >
        <p className="small muted" style={{ marginTop: 0 }}>
          Each member magus gets a standard Size 0 lab free; bigger labs cost 20 BP per point of Size (smaller labs refund), Minor Virtues 10 BP and Major Virtues 20 BP; spare labs 50 BP;
          magi with no lab refund 50 BP (DE Laboratory chapter).
        </p>
        <div className="row">
          <Field label="Spare labs (50 BP each)">
            <Stepper value={cov.spareLabs} min={0} width={36} onChange={(v) => update((x) => void (x.spareLabs = v))} />
          </Field>
        </div>
        {cov.labs.map((l) => {
          const dl = dc.labs.find((x) => x.lab.uid === l.uid) ?? deriveLab(l, data);
          const owner = chars.find((c) => c.id === l.ownerId);
          return (
            <div key={l.uid} className="list-row">
              <span className="clickable" onClick={() => setOpen(open === l.uid ? null : l.uid)} style={{ flex: 1 }}>
                {open === l.uid ? '▾' : '▸'} <b>{l.name}</b> <span className="small muted">{owner ? `— ${owner.name}` : '— unassigned'}</span>
              </span>
              <span className="small">
                Size {dl.size}, Ref {dl.refinement}, GQ {dl.characteristics['General Quality']}, Safety {dl.characteristics.Safety}, Upkeep {dl.characteristics.Upkeep}
              </span>
              <span className="badge">{dl.buildPoints} BP</span>
              {(dl.issues.length > 0 || dl.specWarnings.length > 0) && <span className="badge warn">check</span>}
            </div>
          );
        })}
      </Card>
      {cov.labs
        .filter((l) => l.uid === open)
        .map((l) => (
          <LabEditor key={l.uid} lab={l} magi={magi.map((m) => ({ id: m.id, name: m.name }))} update={update} data={data} />
        ))}
    </div>
  );
}

function LabEditor({ lab, magi, update, data }: { lab: Laboratory; magi: { id: string; name: string }[]; update: CovTabProps['update']; data: CovTabProps['data'] }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<'all' | LabVFDef['group']>('all');
  const [kind, setKind] = useState<'all' | 'virtue' | 'flaw'>('all');
  const [openVf, setOpenVf] = useState<string | null>(null);
  const set = (fn: (l: Laboratory) => void) => update((x) => { const l = x.labs.find((y) => y.uid === lab.uid); if (l) fn(l); });
  const dl = deriveLab(lab, data);
  const list = useMemo(() => {
    const qq = q.toLowerCase();
    return data.labVirtuesFlaws
      .filter((v) => data.isBookEnabled(v.source.book))
      .filter((v) => (group === 'all' || v.group === group) && (kind === 'all' || v.kind === kind))
      .filter((v) => !qq || v.name.toLowerCase().includes(qq) || v.modText.toLowerCase().includes(qq))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, q, group, kind]);
  return (
    <div className="grid grid-2">
      <div className="stack">
        <Card
          title={lab.name}
          actions={
            <button className="small ghost danger" onClick={() => window.confirm('Delete this lab?') && update((x) => void (x.labs = x.labs.filter((y) => y.uid !== lab.uid)))}>
              Delete lab
            </button>
          }
        >
          <div className="grid grid-2">
            <Field label="Name">
              <input value={lab.name} onChange={(e) => set((l) => void (l.name = e.target.value))} />
            </Field>
            <Field label="Owner">
              <select value={lab.ownerId ?? ''} onChange={(e) => set((l) => void (l.ownerId = e.target.value || undefined))}>
                <option value="">— spare / unassigned —</option>
                {magi.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Size (bought)" hint="20 BP per point">
              <Stepper value={lab.size} min={-3} max={10} width={36} onChange={(v) => set((l) => void (l.size = v))} />
            </Field>
            <Field label="Refinement" hint="gained by improving the lab in play">
              <Stepper value={lab.refinement} min={0} width={36} onChange={(v) => set((l) => void (l.refinement = v))} />
            </Field>
            <Field label="Use">
              <select value={lab.use} onChange={(e) => set((l) => void (l.use = e.target.value as Laboratory['use']))}>
                <option value="light">light (half upkeep)</option>
                <option value="typical">typical</option>
                <option value="heavy">heavy (×1.5 upkeep)</option>
              </select>
            </Field>
          </div>
          <h4>Characteristics</h4>
          <div className="row">
            {CHAR_KEYS.map((k) => (
              <div key={k} className="stat">
                <span className="v">{dl.characteristics[k] >= 0 && k !== 'Size' ? `+${dl.characteristics[k]}` : dl.characteristics[k]}</span>
                <span className="l">{k}</span>
              </div>
            ))}
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            Virtue points {dl.virtuePoints} − Flaw points {dl.flawPoints} = {dl.virtuePoints - dl.flawPoints}; capacity Size + Refinement = {dl.size + dl.refinement}; free space {dl.freeSpace}.
            Upkeep costs {dl.upkeepPoints} points ({dl.yearlyCost} £/year at {lab.use} use). Build cost {dl.buildPoints} BP.
          </div>
          <h4>Specializations</h4>
          <div className="row">
            {Object.entries(dl.specializations).map(([k, v]) => (
              <span key={k} className="badge">
                {ART_NAMES[k as keyof typeof ART_NAMES] ?? k} {v > 0 ? `+${v}` : v}
                <span className="clickable" title="Drop this specialization (DE: max 2 activities, 4 Arts)" onClick={() => set((l) => void l.droppedSpecs.push(k))}>
                  ✕
                </span>
              </span>
            ))}
            {lab.droppedSpecs.map((k) => (
              <span key={k} className="badge clickable muted" title="Restore" onClick={() => set((l) => void (l.droppedSpecs = l.droppedSpecs.filter((x) => x !== k)))}>
                <s>{k}</s> ↺
              </span>
            ))}
          </div>
          {[...dl.issues, ...dl.specWarnings].map((i, k) => (
            <div key={k} className="issue warning">
              <span className="badge warn">check</span>
              <div className="msg">{i}</div>
            </div>
          ))}
          <h4>Virtues & Flaws</h4>
          {lab.virtues.length === 0 && <div className="small muted">None — a standard lab.</div>}
          {lab.virtues.map((v, idx) => {
            const def = data.labVFById.get(v.defId);
            const used = Object.values(v.choice ?? {}).reduce((s, n) => s + n, 0);
            return (
              <div key={v.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="row">
                  <b>{def?.name ?? v.defId}</b>
                  <span className={`badge ${def?.kind === 'flaw' ? 'bad' : 'good'}`}>
                    {def?.size} {def?.kind}
                  </span>
                  <span className="small soft" style={{ flex: 1 }}>
                    {def?.modText}
                  </span>
                  <button className="small ghost" onClick={() => set((l) => void l.virtues.splice(idx, 1))}>
                    ✕
                  </button>
                </div>
                {def?.mods.choicePoints ? (
                  <div className="row small">
                    Assign {def.mods.choicePoints} point(s) ({def.mods.choice}): {used}/{def.mods.choicePoints}
                    {Object.entries(v.choice ?? {}).map(([k, n]) => (
                      <span key={k} className="badge">
                        {k} +{n}
                        <span className="clickable" onClick={() => set((l) => { const c = { ...(l.virtues[idx].choice ?? {}) }; delete c[k]; l.virtues[idx].choice = c; })}>
                          ✕
                        </span>
                      </span>
                    ))}
                    {used < def.mods.choicePoints && (
                      <select
                        value=""
                        onChange={(e) => e.target.value && set((l) => { const c = { ...(l.virtues[idx].choice ?? {}) }; c[e.target.value] = (c[e.target.value] ?? 0) + 1; l.virtues[idx].choice = c; })}
                      >
                        <option value="">+1 to…</option>
                        {SPEC_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {ART_NAMES[k as keyof typeof ART_NAMES] ?? k}
                          </option>
                        ))}
                      </select>
                    )}
                    {/feature/i.test(def.name) && (
                      <select value="" onChange={(e) => e.target.value && set((l) => void (l.virtues[idx].note = e.target.value))} title="Pick a feature">
                        <option value="">{v.note ?? 'choose feature…'}</option>
                        {data.labFeatures.map((f) => (
                          <option key={f.id} value={f.name} title={f.text}>
                            {f.name} ({f.specializations.join(', ')})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          <h4>Custom adjustments (house rulings)</h4>
          <div className="row">
            {CHAR_KEYS.filter((k) => k !== 'Size' && k !== 'Refinement').map((k) => (
              <Field key={k} label={k}>
                <Stepper value={lab.customMods[k] ?? 0} width={32} onChange={(v) => set((l) => { if (v) l.customMods[k] = v; else delete l.customMods[k]; })} />
              </Field>
            ))}
          </div>
          <Field label="Lab personality traits (Warping > 0)">
            <div className="row">
              {lab.personalityTraits.map((p, i) => (
                <span key={i} className="row tight">
                  <input value={p.trait} style={{ width: 100 }} onChange={(e) => set((l) => void (l.personalityTraits[i].trait = e.target.value))} />
                  <Stepper value={p.score} width={30} onChange={(v) => set((l) => void (l.personalityTraits[i].score = v))} />
                  <button className="small ghost" onClick={() => set((l) => void l.personalityTraits.splice(i, 1))}>
                    ✕
                  </button>
                </span>
              ))}
              <button className="small" onClick={() => set((l) => void l.personalityTraits.push({ trait: 'Trait', score: 1 }))}>
                + trait
              </button>
            </div>
          </Field>
          <Field label="Notes">
            <textarea rows={2} value={lab.notes ?? ''} onChange={(e) => set((l) => void (l.notes = e.target.value))} />
          </Field>
        </Card>
      </div>
      <Card title="Add Laboratory Virtues & Flaws">
        <div className="row" style={{ marginBottom: 8 }}>
          <SearchInput value={q} onChange={setQ} />
          <select value={group} onChange={(e) => setGroup(e.target.value as typeof group)}>
            <option value="all">All groups</option>
            <option>Structure</option>
            <option>Outfittings</option>
            <option>Supernatural</option>
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="all">Virtues & Flaws</option>
            <option value="virtue">Virtues</option>
            <option value="flaw">Flaws</option>
          </select>
        </div>
        <div className="scroll-y" style={{ maxHeight: 900 }}>
          {list.map((v) => {
            const has = lab.virtues.some((x) => x.defId === v.id);
            return (
              <div key={v.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="row">
                  <span className="clickable" onClick={() => setOpenVf(openVf === v.id ? null : v.id)}>
                    <b>{v.name}</b>
                  </span>
                  <span className={`badge ${v.kind === 'flaw' ? 'bad' : 'good'}`}>
                    {v.size} {v.kind}
                  </span>
                  <span className="badge">{v.group}</span>
                  <BookBadge book={v.source.book} line={v.source.line} />
                  <span style={{ flex: 1 }} />
                  <button className="small" disabled={has && !v.repeatable} onClick={() => set((l) => void l.virtues.push({ uid: uid(), defId: v.id }))}>
                    {has && !v.repeatable ? 'taken' : '+ Add'}
                  </button>
                </div>
                <div className="small soft">{v.modText}</div>
                {openVf === v.id && <Markdown text={v.text} />}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
