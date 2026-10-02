// A Virtue or Flaw's text, with the rules it points to quoted in place: the other Virtues and
// Flaws it names and the sections of the books it cites (tools/extract/extract_vf_refs.py).

import { BOOK_BY_ID, type GameData, type VFRef, type VirtueFlawDef } from '../data';
import { BookBadge, Markdown } from './kit';

function Notes({ def }: { def: VirtueFlawDef }) {
  return (
    <>
      {def.effects
        ?.filter((e) => e.type === 'note')
        .map((e, i) => (
          <div key={i} className="small soft">
            Toolkit note: {(e as { text: string }).text}
          </div>
        ))}
    </>
  );
}

function RefItem({ r, data }: { r: VFRef; data: GameData }) {
  const cites = /\bp(?:age|p?\.)/i.test(r.q);
  if (r.vf) {
    const d = data.vfById.get(r.vf);
    if (!d) return null;
    return (
      <details className="vf-ref">
        <summary>
          <b>{d.name}</b>{' '}
          <span className="small muted">
            {d.sizes.join('/')} {d.categories.join(', ')} {d.kind}
            {cites && ` · “${r.q}”`}
          </span>
        </summary>
        <Markdown text={d.text} />
        <Notes def={d} />
        <BookBadge book={d.source.book} line={d.source.line} />
      </details>
    );
  }
  if (r.s) {
    const s = data.ruleSections[r.s];
    if (!s) return null;
    return (
      <details className="vf-ref">
        <summary>
          <b>{s.title}</b> <span className="small muted">{BOOK_BY_ID[s.book]?.abbr ?? s.book} · “{r.q}”</span>
        </summary>
        <Markdown text={s.text} />
        <BookBadge book={s.book} anchor={s.anchor} />
      </details>
    );
  }
  const [book, page] = (r.p ?? '').split(':');
  return (
    <div className="vf-ref small">
      “{r.q}”: {BOOK_BY_ID[book]?.title ?? book}, page {page} <BookBadge book={book} />
    </div>
  );
}

/** The text of a Virtue or Flaw, its toolkit notes, and the rules it refers to. */
export function VFText({ def, data, notes = true }: { def: VirtueFlawDef; data: GameData; notes?: boolean }) {
  const refs = def.refs ?? [];
  return (
    <>
      <Markdown text={def.text} />
      {notes && <Notes def={def} />}
      {refs.length > 0 && (
        <div className="vf-refs">
          <div className="l">Rules it refers to</div>
          {refs.map((r, i) => (
            <RefItem key={i} r={r} data={data} />
          ))}
        </div>
      )}
    </>
  );
}
