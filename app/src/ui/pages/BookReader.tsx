import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BOOKS, BOOK_BY_ID } from '../../data';
import { Card, Empty, SearchInput } from '../kit';

interface Heading {
  line: number; // 0-based
  level: number;
  text: string;
  slug: string;
}

interface Section {
  start: number;
  end: number; // exclusive
  heading: Heading;
}

const cache = new Map<string, string[]>();

/** GitHub-style heading slug (what the books' internal links use), with -1, -2 for duplicates. */
function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function looseSlug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parse(lines: string[]): { headings: Heading[]; sections: Section[] } {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let inCode = false;
  lines.forEach((l, i) => {
    if (l.startsWith('```')) inCode = !inCode;
    if (inCode) return;
    const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    if (!m) return;
    const base = githubSlug(m[2]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    headings.push({ line: i, level: m[1].length, text: m[2].replace(/[*_]/g, ''), slug: n ? `${base}-${n}` : base });
  });
  const tops = headings.filter((h) => h.level <= 3);
  const sections: Section[] = [];
  if (!tops.length || tops[0].line > 0) sections.push({ start: 0, end: tops[0]?.line ?? lines.length, heading: { line: 0, level: 1, text: 'Front matter', slug: 'front' } });
  tops.forEach((h, i) => sections.push({ start: h.line, end: tops[i + 1]?.line ?? lines.length, heading: h }));
  return { headings, sections };
}

export default function BookReader() {
  const { bookId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const book = BOOK_BY_ID[bookId ?? ''];
  const [lines, setLines] = useState<string[] | null>(book ? cache.get(book.file) ?? null : null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tocFilter, setTocFilter] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const lineParam = params.get('line');
  const anchorParam = params.get('anchor');
  const secParam = params.get('s');

  useEffect(() => {
    if (!book) return;
    const hit = cache.get(book.file);
    if (hit) {
      setLines(hit);
      return;
    }
    setLines(null);
    setError('');
    fetch(`books/${encodeURIComponent(book.file)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((t) => {
        const ls = t.split(/\r?\n/);
        cache.set(book.file, ls);
        setLines(ls);
      })
      .catch((e) => setError(`Could not load ${book.file} (${e.message}). Run "npm run build" (or "node scripts/copy-books.mjs") so the books are copied into public/books.`));
  }, [book]);

  const parsed = useMemo(() => (lines ? parse(lines) : null), [lines]);

  // Resolve target: line (1-based from extractors) or anchor → section index + target line
  const target = useMemo(() => {
    if (!parsed || !lines) return null;
    let line: number | null = null;
    if (lineParam) line = Math.max(0, Number(lineParam) - 1);
    else if (anchorParam) {
      const a = anchorParam.replace(/^#/, '');
      const h = parsed.headings.find((x) => x.slug === a) ?? parsed.headings.find((x) => looseSlug(x.text) === looseSlug(a)) ?? parsed.headings.find((x) => looseSlug(x.slug) === looseSlug(a.replace(/-\d+$/, '')));
      if (h) line = h.line;
    }
    let idx = secParam ? Number(secParam) : 0;
    if (line !== null) idx = Math.max(0, parsed.sections.findIndex((s) => line! >= s.start && line! < s.end));
    return { idx: Math.min(idx, parsed.sections.length - 1), line };
  }, [parsed, lines, lineParam, anchorParam, secParam]);

  const html = useMemo(() => {
    if (!parsed || !lines || !target) return '';
    const sec = parsed.sections[target.idx];
    const slice = lines.slice(sec.start, sec.end);
    if (target.line !== null && target.line >= sec.start && target.line < sec.end) {
      // Insert a marker at the start of the paragraph/table containing the target line.
      let at = target.line - sec.start;
      while (at > 0 && slice[at - 1].trim() !== '' && !/^#/.test(slice[at])) at--;
      slice.splice(at, 0, '<div id="reader-target" class="reader-target"></div>', '');
    }
    const raw = marked.parse(slice.join('\n'), { async: false, gfm: true }) as string;
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['id'] });
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
    if (t) t.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
    const list = document.querySelector<HTMLElement>('.toc-list');
    const act = list?.querySelector<HTMLElement>('.toc-item.active');
    if (list && act) list.scrollTop = act.offsetTop - list.clientHeight / 2;
  }, [html, parsed, target]);

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
        {BOOKS.map((b) => (
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
      go({ anchor: href.slice(1) });
    }
  };

  return (
    <div className="reader">
      <div className="topbar">
        <h1>
          {book.title} {book.status === 'wip' && <span className="badge warn">transcription in progress</span>}
        </h1>
        <div className="row">
          <select value={book.id} onChange={(e) => nav(`/reference/book/${e.target.value}`)}>
            {BOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <Empty>{error}</Empty>}
      {!lines && !error && <Empty>Loading {book.title}…</Empty>}
      {parsed && target && (
        <div className="reader-layout">
          <aside className="reader-toc no-print">
            <SearchInput value={q} onChange={setQ} placeholder="Search this book" />
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
            <div ref={bodyRef} className="markdown book-body card" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: html }} />
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
