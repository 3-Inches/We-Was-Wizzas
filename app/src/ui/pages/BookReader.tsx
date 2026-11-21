import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BOOK_BY_ID, BOOK_SHELVES, readOnlyMark } from '../../data';
import { Card, Empty, SearchInput } from '../kit';
import { bookCache, findAnchor, loadBookLines, parseBook } from '../bookText';
import { dropEmptyHeads, tableRowAt, tidyTables } from '../tables';

// Where a block starts: an unindented heading or list item, in a sidebar or not. An indented item
// is inside its parent's, and a marker put before it would break the list.
const BLOCK_START = /^( {0,3}#|([-*+]|\d+[.)])\s)/;
const quoteless = (l: string) => l.replace(/^>\s?/, '');
// a line on its own, or a sidebar's line with only its ">"
const blank = (l: string) => /^>?\s*$/.test(l);

export default function BookReader() {
  const { bookId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const book = BOOK_BY_ID[bookId ?? ''];
  const [lines, setLines] = useState<string[] | null>(book ? bookCache.get(book.file) ?? null : null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tocFilter, setTocFilter] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const lineParam = params.get('line');
  const anchorParam = params.get('anchor');
  const secParam = params.get('s');

  useEffect(() => {
    if (!book) return;
    const hit = bookCache.get(book.file);
    if (hit) {
      setLines(hit);
      return;
    }
    setLines(null);
    setError('');
    loadBookLines(book.file)
      .then(setLines)
      .catch((e) => setError(`Could not load ${book.file} (${e.message}). Run "npm run build" (or "node scripts/copy-books.mjs") so the books are copied into public/books.`));
  }, [book]);

  const parsed = useMemo(() => (lines ? parseBook(lines) : null), [lines]);

  // Resolve target: line (1-based from extractors) or anchor → section index + target line
  const target = useMemo(() => {
    if (!parsed || !lines) return null;
    let line: number | null = null;
    if (lineParam) line = Math.max(0, Number(lineParam) - 1);
    else if (anchorParam) {
      const h = findAnchor(parsed.headings, anchorParam);
      if (h) line = h.line;
    }
    let idx = secParam ? Number(secParam) : 0;
    if (line !== null) idx = Math.max(0, parsed.sections.findIndex((s) => line! >= s.start && line! < s.end));
    return { idx: Math.min(idx, parsed.sections.length - 1), line };
  }, [parsed, lines, lineParam, anchorParam, secParam]);

  const drawn = useMemo((): { html: string; row: number | null } => {
    if (!parsed || !lines || !target) return { html: '', row: null };
    const sec = parsed.sections[target.idx];
    const slice = lines.slice(sec.start, sec.end);
    let row: number | null = null;
    if (target.line !== null && target.line >= sec.start && target.line < sec.end) {
      // Insert a marker before the block that holds the target line: its table (and the row is
      // marked once drawn), or its paragraph, list item or heading.
      let at = target.line - sec.start;
      const inTable = tableRowAt(slice, at);
      if (inTable) {
        at = inTable.start;
        row = inTable.row;
      } else
        while (at > 0) {
          const here = quoteless(slice[at]);
          if (BLOCK_START.test(here) || (!/^\s/.test(here) && blank(slice[at - 1]))) break;
          at--;
        }
      // in a sidebar the marker keeps its ">", so the sidebar stays one box
      const quote = slice[at].startsWith('>') ? '> ' : '';
      slice.splice(at, 0, `${quote}<div id="reader-target" class="reader-target"></div>`, quote.trim());
    }
    const raw = marked.parse(tidyTables(slice.join('\n')), { async: false, gfm: true }) as string;
    return { html: DOMPurify.sanitize(dropEmptyHeads(raw), { ADD_ATTR: ['id'] }), row };
  }, [parsed, lines, target]);

  // Give headings ids and scroll to the target.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !parsed || !target) return;
    const sec = parsed.sections[target.idx];
    const hs = parsed.headings.filter((h) => h.line >= sec.start && h.line < sec.end);
    el.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((node, i) => {
      if (hs[i]) node.id = `h-${hs[i].slug}`;
    });
    const t = el.querySelector('#reader-target');
    // a line in a table: its row, not the whole table
    const table = drawn.row === null ? null : t?.nextElementSibling?.matches('table') ? t.nextElementSibling : t?.nextElementSibling?.querySelector('table');
    const tr = table?.querySelectorAll('tbody tr')[drawn.row ?? -1];
    if (tr) {
      tr.classList.add('reader-row');
      tr.scrollIntoView({ block: 'center' });
    } else if (t) t.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
    const list = document.querySelector<HTMLElement>('.toc-list');
    const act = list?.querySelector<HTMLElement>('.toc-item.active');
    if (list && act) list.scrollTop = act.offsetTop - list.clientHeight / 2;
  }, [drawn, parsed, target]);

  const results = useMemo(() => {
    if (!lines || q.trim().length < 3) return [];
    const qq = q.toLowerCase();
    const out: { line: number; text: string }[] = [];
    for (let i = 0; i < lines.length && out.length < 200; i++) if (lines[i].toLowerCase().includes(qq)) out.push({ line: i, text: lines[i] });
    return out;
  }, [lines, q]);

  if (!book) {
    return (
      <Card title="Books">
        {BOOK_SHELVES.flatMap((s) => s.books).map((b) => (
          <div key={b.id}>
            <Link to={`/reference/book/${b.id}`}>{b.title}</Link>
          </div>
        ))}
      </Card>
    );
  }

  const go = (p: Record<string, string>) => nav(`/reference/book/${book.id}?${new URLSearchParams(p).toString()}`);
  const onBodyClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('#') && !href.startsWith('#/')) {
      e.preventDefault();
      // a few of the books' own links name no heading: stay here rather than open the front matter
      const h = parsed && findAnchor(parsed.headings, decodeURIComponent(href.slice(1)));
      if (h) go({ line: String(h.line + 1) });
      else a.title = 'The book has no heading for this link';
    }
  };

  return (
    <div className="reader">
      <div className="topbar">
        <h1>
          {book.title} {readOnlyMark(book) && <span className="badge">{readOnlyMark(book)}</span>} {book.status === 'wip' && <span className="badge warn">transcription in progress</span>}
        </h1>
        <div className="row">
          <select value={book.id} onChange={(e) => nav(`/reference/book/${e.target.value}`)}>
            {BOOK_SHELVES.map((s) => (
              <optgroup key={s.label} label={s.label}>
                {s.books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      {error && <Empty>{error}</Empty>}
      {!lines && !error && <Empty>Loading {book.title}…</Empty>}
      {parsed && target && (
        <div className="reader-layout">
          <aside className="reader-toc no-print">
            {/* in a row of its own: in the column it would take its 200px as height on a phone */}
            <div className="row">
              <SearchInput value={q} onChange={setQ} placeholder="Search this book" />
            </div>
            {results.length > 0 && (
              <div className="reader-results">
                {results.map((r) => (
                  <div key={r.line} className="clickable small list-row" onClick={() => go({ line: String(r.line + 1) })}>
                    {highlight(r.text, q)}
                  </div>
                ))}
              </div>
            )}
            {q.trim().length >= 3 && results.length === 0 && <div className="small muted">No matches.</div>}
            <input className="small" placeholder="Filter contents" value={tocFilter} onChange={(e) => setTocFilter(e.target.value)} style={{ marginTop: 8, width: '100%' }} />
            <div className="toc-list">
              {parsed.sections.map((s, i) =>
                !tocFilter || s.heading.text.toLowerCase().includes(tocFilter.toLowerCase()) ? (
                  <div key={i} className={`toc-item lvl-${s.heading.level} ${i === target.idx ? 'active' : ''}`} onClick={() => go({ s: String(i) })}>
                    {s.heading.text}
                  </div>
                ) : null,
              )}
            </div>
          </aside>
          <div>
            <div className="row between no-print" style={{ marginBottom: 8 }}>
              <button disabled={target.idx === 0} onClick={() => go({ s: String(target.idx - 1) })}>
                ← {parsed.sections[target.idx - 1]?.heading.text ?? ''}
              </button>
              <button disabled={target.idx >= parsed.sections.length - 1} onClick={() => go({ s: String(target.idx + 1) })}>
                {parsed.sections[target.idx + 1]?.heading.text ?? ''} →
              </button>
            </div>
            <div ref={bodyRef} className="markdown book-body card" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: drawn.html }} />
          </div>
        </div>
      )}
    </div>
  );
}

function highlight(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, i - 50);
  const pre = text.slice(start, i);
  const hit = text.slice(i, i + q.length);
  const post = text.slice(i + q.length, i + q.length + 80);
  return (
    <span>
      {start > 0 ? '…' : ''}
      {pre}
      <mark>{hit}</mark>
      {post}…
    </span>
  );
}
