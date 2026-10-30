// A one-line summary of a rule, with more a click away (the pattern of the mechanics reference):
// enough to use the tool at a glance; the toolkit's fuller account of the numbers under More; the
// book's own text under Read the rules.

import { useState, type ReactNode } from 'react';
import { BOOK_BY_ID } from '../data';
import { useBookSection } from './bookText';
import { Markdown } from './kit';

export function RulesNote({ book, line, endLine, children, detail }: { book: string; line: number; endLine?: number; children?: ReactNode; detail?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const sec = useBookSection(book, line, endLine, open);
  return (
    <div className="small" style={{ margin: '0 0 6px' }}>
      <span className="muted">{children} </span>
      {detail && (
        <button className="small ghost" onClick={() => setMore((o) => !o)} aria-expanded={more} style={{ padding: '0 6px' }}>
          {more ? 'Less' : 'More'}
        </button>
      )}
      <button className="small ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ padding: '0 6px' }}>
        {open ? 'Hide the rules' : 'Read the rules'}
      </button>
      {more && <div className="muted" style={{ marginTop: 4 }}>{detail}</div>}
      {open && (
        <div style={{ borderLeft: '3px solid var(--line)', paddingLeft: 10, marginTop: 6, maxHeight: 420, overflowY: 'auto' }}>
          {sec.loading && <div className="muted">Loading the book…</div>}
          {sec.error && <div className="bad-text">{sec.error}</div>}
          {sec.text && <Markdown text={sec.text} />}
          <a href={`#/reference/book/${encodeURIComponent(book)}?line=${line}`}>Open in {BOOK_BY_ID[book]?.title ?? book}</a>
        </div>
      )}
    </div>
  );
}
