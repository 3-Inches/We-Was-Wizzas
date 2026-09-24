import { useMemo, useState } from 'react';
import { SITUATIONS } from '../../engine/covenant';
import type { HookBoonDef } from '../../data';
import { uid } from '../../util/id';
import { BookBadge, Card, Markdown, SearchInput } from '../kit';
import type { CovTabProps } from './shared';

export default function HooksTab({ cov, update, dc, data }: CovTabProps) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'hook' | 'boon'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [custom, setCustom] = useState({ name: '', kind: 'hook' as 'hook' | 'boon', size: 'Minor' as 'Major' | 'Minor' });

  const list = useMemo(() => {
    const qq = q.toLowerCase();
    return data.hooksBoons
      .filter((h) => data.isBookEnabled(h.source.book))
      .filter((h) => kind === 'all' || h.kind === kind)
      .filter((h) => !qq || h.name.toLowerCase().includes(qq) || h.text.toLowerCase().includes(qq) || (h.category ?? '').toLowerCase().includes(qq));
  }, [data, q, kind]);
  const groups = useMemo(() => {
    const m = new Map<string, HookBoonDef[]>();
    for (const h of list) {
      const k = `${h.kind === 'hook' ? 'Hooks' : 'Boons'} — ${h.category ?? 'General'}`;
      m.set(k, [...(m.get(k) ?? []), h]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  const add = (h: HookBoonDef) => update((x) => void x.hooksBoons.push({ uid: uid(), defId: h.id, name: h.name, kind: h.kind, size: h.size }));

  const applySituation = (name: string) => {
    const sit = SITUATIONS[name];
    update((x) => {
      for (const [list, kind] of [
        [sit.hooks, 'hook'],
        [sit.boons, 'boon'],
      ] as const) {
        for (const [n, size, times] of list) {
          const def = data.hooksBoons.find((h) => h.kind === kind && h.size === size && h.name.toLowerCase() === n.toLowerCase()) ?? data.hooksBoons.find((h) => h.kind === kind && h.name.toLowerCase() === n.toLowerCase());
          for (let i = 0; i < (times ?? 1); i++) x.hooksBoons.push({ uid: uid(), defId: def?.id, name: n, kind, size });
        }
      }
    });
  };

  return (
    <div className="grid grid-2">
      <div className="stack">
        <Card title="Chosen Hooks & Boons" className="accent">
          <p className="small muted" style={{ marginTop: 0 }}>
            Boons are paid for with Hooks: Major = 3 points, Minor = 1 (DE p.181–184). Hook points {dc.hookPoints}, Boon points {dc.boonPoints}. Current aura {dc.aura}.
          </p>
          {(['hook', 'boon'] as const).map((k) => (
            <div key={k}>
              <h4>{k === 'hook' ? 'Hooks' : 'Boons'}</h4>
              {cov.hooksBoons.filter((h) => h.kind === k).length === 0 && <div className="small muted">None.</div>}
              {cov.hooksBoons
                .filter((h) => h.kind === k)
                .map((h) => {
                  const def = h.defId ? data.hookBoonById.get(h.defId) : undefined;
                  return (
                    <div key={h.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div className="row">
                        <span className="clickable" onClick={() => setOpen(open === h.uid ? null : h.uid)}>
                          <b>{h.name}</b>
                        </span>
                        <span className="badge">{h.size}</span>
                        {h.unknown && <span className="badge warn">Unknown (counts as Major)</span>}
                        {def && <BookBadge book={def.source.book} line={def.source.line} />}
                        <span style={{ flex: 1 }} />
                        {k === 'hook' && h.size === 'Minor' && (
                          <label className="inline small" title="An unknown Minor Hook counts as Major for Boon points (DE p.181–184)">
                            <input type="checkbox" checked={!!h.unknown} onChange={(e) => update((x) => void (x.hooksBoons.find((y) => y.uid === h.uid)!.unknown = e.target.checked))} /> unknown
                          </label>
                        )}
                        <button className="small ghost" onClick={() => update((x) => void (x.hooksBoons = x.hooksBoons.filter((y) => y.uid !== h.uid)))}>
                          ✕
                        </button>
                      </div>
                      <input
                        className="small"
                        placeholder="Detail (what it is in your saga)"
                        value={h.note ?? ''}
                        onChange={(e) => update((x) => void (x.hooksBoons.find((y) => y.uid === h.uid)!.note = e.target.value))}
                      />
                      {open === h.uid && def && <Markdown text={def.deText ?? def.text} />}
                    </div>
                  );
                })}
            </div>
          ))}
        </Card>
        <Card title="Covenant situations (DE p.177)">
          <p className="small muted" style={{ marginTop: 0 }}>
            Packages of Hooks and Boons that fit a covenant concept. Applying one adds them to your list.
          </p>
          <div className="row">
            {Object.keys(SITUATIONS).map((s) => (
              <button key={s} className="small" onClick={() => applySituation(s)}>
                {s}
              </button>
            ))}
          </div>
        </Card>
        <Card title="Custom Hook or Boon">
          <div className="row">
            <input value={custom.name} placeholder="Name" onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <select value={custom.kind} onChange={(e) => setCustom({ ...custom, kind: e.target.value as 'hook' | 'boon' })}>
              <option value="hook">Hook</option>
              <option value="boon">Boon</option>
            </select>
            <select value={custom.size} onChange={(e) => setCustom({ ...custom, size: e.target.value as 'Major' | 'Minor' })}>
              <option>Minor</option>
              <option>Major</option>
            </select>
            <button disabled={!custom.name} onClick={() => update((x) => void x.hooksBoons.push({ uid: uid(), name: custom.name, kind: custom.kind, size: custom.size }))}>
              Add
            </button>
          </div>
        </Card>
      </div>
      <Card title="Browse">
        <div className="row" style={{ marginBottom: 8 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search Hooks & Boons" />
          <select value={kind} onChange={(e) => setKind(e.target.value as 'all' | 'hook' | 'boon')}>
            <option value="all">Hooks & Boons</option>
            <option value="hook">Hooks</option>
            <option value="boon">Boons</option>
          </select>
        </div>
        <div className="scroll-y" style={{ maxHeight: 900 }}>
          {groups.map(([g, hs]) => (
            <div key={g}>
              <h4>{g}</h4>
              {hs.map((h) => (
                <div key={h.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="row">
                    <span className="clickable" onClick={() => setOpen(open === h.id ? null : h.id)}>
                      <b>{h.name}</b>
                    </span>
                    <span className="badge">{h.size}</span>
                    {h.requires && <span className="badge info">requires {h.requires}</span>}
                    <BookBadge book={h.source.book} line={h.source.line} />
                    <span style={{ flex: 1 }} />
                    <button className="small" onClick={() => add(h)}>
                      + Add
                    </button>
                  </div>
                  {open === h.id && <Markdown text={h.deText ?? h.text} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
