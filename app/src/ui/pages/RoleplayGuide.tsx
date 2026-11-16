// The Guide's pages on playing the game itself: for players, and for storyguides. The text is data
// (src/data/roleplay.ts); each card folds to its one-line summary, names the book sections it draws
// on (each opens the reader there), and lists any outside reading.

import { useMemo, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BOOK_BY_ID } from '../../data';
import type { RpBlock, RpGuide, RpSection } from '../../data/roleplay';
import { Card } from '../kit';

/** Inline markdown (bold, italic) as sanitized HTML. */
function Md({ text }: { text: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parseInline(text, { async: false }) as string), [text]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function Block({ b }: { b: RpBlock }) {
  if ('p' in b) {
    return (
      <p>
        <Md text={b.p} />
      </p>
    );
  }
  if ('heading' in b) return <h4 style={{ margin: '14px 0 4px' }}>{b.heading}</h4>;
  if ('points' in b) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        {b.points.map(([lead, text]) => (
          <p key={lead} style={{ margin: 0 }}>
            <b>
              <Md text={lead} />
            </b>{' '}
            <Md text={text} />
          </p>
        ))}
      </div>
    );
  }
  if ('list' in b) {
    const items = b.list.map((x, i) => (
      <li key={i}>
        <Md text={x} />
      </li>
    ));
    return (
      <div>
        {b.title && <h4 style={{ margin: '14px 0 4px' }}>{b.title}</h4>}
        {b.ordered ? <ol style={{ margin: '4px 0', paddingLeft: 22 }}>{items}</ol> : <ul style={{ margin: '4px 0', paddingLeft: 22 }}>{items}</ul>}
      </div>
    );
  }
  if ('table' in b) {
    return (
      <div>
        {b.title && <h4 style={{ margin: '14px 0 4px' }}>{b.title}</h4>}
        <div className="table-wrap">
          <table className={`rp-table${b.table.head.length <= 2 ? ' two' : ''}`}>
            <thead>
              <tr>
                {b.table.head.map((h, i) => (
                  <th key={i} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) =>
                    j === 0 ? (
                      <th key={j} scope="row">
                        <Md text={cell} />
                      </th>
                    ) : (
                      <td key={j} data-label={b.table.head[j]}>
                        <Md text={cell} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if ('tryThis' in b) return <Aside label="Try this">{b.tryThis}</Aside>;
  return <Aside label="In the toolkit">{b.inApp}</Aside>;
}

function Aside({ label, children }: { label: string; children: string }) {
  return (
    <p className="rp-aside">
      <b>{label}:</b> <Md text={children} />
    </p>
  );
}

/** Where a section comes from: the book sections (each opens in the reader) and outside reading. */
function Sources({ s }: { s: RpSection }) {
  if (!s.sources?.length && !s.links?.length) return null;
  return (
    <div className="small muted rp-sources">
      {!!s.sources?.length && (
        <div>
          From the books:{' '}
          {s.sources.map((x, i) => (
            <span key={`${x.book}-${x.line}`}>
              {i > 0 && ' · '}
              <a href={`#/reference/book/${encodeURIComponent(x.book)}?line=${x.line}`} title={`Open ${BOOK_BY_ID[x.book]?.title ?? x.book} at “${x.label}”`}>
                {x.label}
              </a>
              {x.book !== 'DE' && <span> ({BOOK_BY_ID[x.book]?.title ?? x.book})</span>}
            </span>
          ))}
        </div>
      )}
      {s.links?.map((l) => (
        <div key={l.url}>
          Elsewhere:{' '}
          <a href={l.url} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
          {l.note && <span>, {l.note}</span>}
        </div>
      ))}
    </div>
  );
}

export function RoleplayGuide({ guide, intro }: { guide: RpGuide; intro?: ReactNode }) {
  return (
    <div className="stack rp-guide">
      <div>
        <p style={{ marginTop: 0 }}>
          <Md text={guide.lead} />
        </p>
        {intro}
        <nav className="small" aria-label="On this page">
          {guide.sections.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ' · '}
              <a
                href={`#${guide.id}-${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`${guide.id}-${s.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }}
              >
                {s.title}
              </a>
            </span>
          ))}
        </nav>
      </div>
      {guide.sections.map((s) => (
        <Card key={s.id} title={s.title} id={`${guide.id}-${s.id}`} fold={`rp-${guide.id}-${s.id}`} summary={s.summary}>
          {s.blocks.map((b, i) => (
            <Block key={i} b={b} />
          ))}
          <Sources s={s} />
        </Card>
      ))}
    </div>
  );
}
