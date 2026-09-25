// Small UI kit: buttons, cards, tabs, steppers, modals, markdown, breakdowns.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Issue } from '../engine/character/validate';
import type { Part } from '../engine/magic';
import { BOOK_BY_ID } from '../data';

export function Card(props: { title?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`card ${props.className ?? ''}`} id={props.id}>
      {(props.title || props.actions) && (
        <div className="card-head">
          {typeof props.title === 'string' ? <h3>{props.title}</h3> : props.title}
          {props.actions && <div className="row tight">{props.actions}</div>}
        </div>
      )}
      {props.children}
    </section>
  );
}

export function Tabs<T extends string>(props: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {props.tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={props.value === t.id} className={props.value === t.id ? 'active' : ''} onClick={() => props.onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper(props: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; width?: number; title?: string }) {
  const { value, onChange, min = -Infinity, max = Infinity, step = 1 } = props;
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <span className="stepper" title={props.title}>
      <button type="button" aria-label="decrease" onClick={() => onChange(clamp(value - step))} disabled={value - step < min}>
        −
      </button>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        style={props.width ? { width: props.width } : undefined}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(clamp(v));
        }}
      />
      <button type="button" aria-label="increase" onClick={() => onChange(clamp(value + step))} disabled={value + step > max}>
        +
      </button>
    </span>
  );
}

export function Field(props: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={`field ${props.className ?? ''}`}>
      <span>{props.label}</span>
      {props.children}
      {props.hint && <small className="muted">{props.hint}</small>}
    </label>
  );
}

export function Modal(props: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; actions?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [props]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={`modal ${props.wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          {typeof props.title === 'string' ? <h2>{props.title}</h2> : props.title}
          {props.actions}
          <button className="ghost" onClick={props.onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

export function Markdown(props: { text: string; className?: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(props.text ?? '', { async: false, gfm: true, breaks: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [props.text]);
  return <div className={`markdown ${props.className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function BookBadge(props: { book: string; anchor?: string; line?: number }) {
  const b = BOOK_BY_ID[props.book];
  const href = `#/reference/book/${encodeURIComponent(props.book)}${props.line ? `?line=${props.line}` : props.anchor ? `?anchor=${encodeURIComponent(props.anchor)}` : ''}`;
  return (
    <a className="badge book" href={href} title={b ? `${b.title} — open in the rules reader` : props.book} onClick={(e) => e.stopPropagation()}>
      {b?.abbr ?? props.book}
    </a>
  );
}

export function IssueList(props: { issues: Issue[]; onAcknowledge?: (id: string) => void; compact?: boolean; empty?: ReactNode }) {
  if (!props.issues.length) return <div className="muted small">{props.empty ?? 'No problems found.'}</div>;
  return (
    <div>
      {props.issues.map((i) => (
        <div key={i.id} className={`issue ${i.severity}`}>
          <span className={`badge ${i.severity === 'error' ? 'bad' : i.severity === 'warning' ? 'warn' : 'info'}`}>{i.severity}</span>
          <div className="msg">
            {i.message}
            {i.fix && <div className="small soft">Suggestion: {i.fix}</div>}
            {i.ref && <div className="ref">{i.ref}</div>}
          </div>
          {props.onAcknowledge && i.severity !== 'info' && (
            <button className="small ghost" title="Acknowledge as a troupe ruling / house rule; hides this issue for this character" onClick={() => props.onAcknowledge!(i.id)}>
              Allow
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** A number that shows how it was computed when clicked. */
export function Total(props: { value: number | string; parts?: Part[]; notes?: string[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  if (!props.parts?.length) return <span className={props.className}>{props.value}</span>;
  return (
    <span className="tooltip-host" ref={ref}>
      <button type="button" className={`value-btn ${props.className ?? ''}`} onClick={() => setOpen((o) => !o)} title="Show calculation">
        {props.value}
      </button>
      {open && (
        <div className="pop">
          {props.label && <div className="small"><b>{props.label}</b></div>}
          <table className="breakdown">
            <tbody>
              {props.parts.map((p, i) => (
                <tr key={i}>
                  <td>{p.label}</td>
                  <td className="num">{p.value > 0 ? `+${p.value}` : p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {props.notes?.map((n, i) => (
            <div key={i} className="small warn-text">
              {n}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

export function Meter(props: { value: number; max: number; label?: ReactNode }) {
  const pct = props.max > 0 ? Math.min(100, (props.value / props.max) * 100) : 0;
  const over = props.value > props.max;
  return (
    <div>
      {props.label && (
        <div className="row between small">
          <span>{props.label}</span>
          <span className={over ? 'bad-text' : props.value === props.max ? 'good-text' : 'muted'}>
            {props.value} / {props.max}
          </span>
        </div>
      )}
      <div className={`meter ${over ? 'over' : ''}`}>
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Empty(props: { children: ReactNode }) {
  return <div className="muted" style={{ padding: '18px 4px', textAlign: 'center' }}>{props.children}</div>;
}

export function Confirm(props: { message: string; onYes: () => void; label?: string; className?: string; danger?: boolean }) {
  return (
    <button
      className={`${props.className ?? ''} ${props.danger ? 'danger' : ''}`}
      onClick={() => {
        if (window.confirm(props.message)) props.onYes();
      }}
    >
      {props.label ?? 'Delete'}
    </button>
  );
}

export function SearchInput(props: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <input
      type="search"
      value={props.value}
      autoFocus={props.autoFocus}
      placeholder={props.placeholder ?? 'Search…'}
      onChange={(e) => props.onChange(e.target.value)}
      style={{ minWidth: 200, flex: '1 1 200px' }}
    />
  );
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
