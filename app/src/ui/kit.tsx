// Small UI kit: buttons, cards, tabs, steppers, modals, markdown, breakdowns.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Part } from '../engine/magic';
import { BOOK_BY_ID } from '../data';
import { dropEmptyHeads, tidyTables } from './tables';
import { useStore } from '../store/store';

/** Which foldable cards a viewer has opened or closed, by key (kept in this browser). */
const FOLDS_KEY = 'arm.folds';
function readFolds(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(FOLDS_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}
const narrowScreen = () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 700px)').matches;

/**
 * A card. With `fold` (a key) it can be folded to its title and a one-line `summary`: folded at
 * first on a phone, open on a wider screen, and remembered either way. It opens while a tutorial runs.
 */
export function Card(props: { title?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; id?: string; tour?: string; fold?: string; summary?: ReactNode }) {
  const touring = useStore((s) => !!s.ui.tour);
  const [open, setOpenState] = useState(() => (props.fold ? (readFolds()[props.fold] ?? !narrowScreen()) : true));
  const setOpen = (v: boolean) => {
    setOpenState(v);
    if (!props.fold) return;
    try {
      localStorage.setItem(FOLDS_KEY, JSON.stringify({ ...readFolds(), [props.fold]: v }));
    } catch {
      // private window or blocked storage: it still folds, just not remembered
    }
  };
  const folded = !!props.fold && !open && !touring;
  return (
    <section className={`card ${props.className ?? ''}${folded ? ' folded' : ''}`} id={props.id} data-tour={props.tour}>
      {(props.title || props.actions || props.fold) && (
        <div className="card-head">
          {typeof props.title === 'string' ? <h3>{props.title}</h3> : props.title}
          {props.actions && !folded && <div className="row tight">{props.actions}</div>}
          {props.fold && !touring && (
            <button className="small ghost fold-toggle" aria-expanded={!folded} onClick={() => setOpen(folded)} title={folded ? 'Show this card' : 'Fold it to a line'}>
              {folded ? '▸ Show' : '▾ Fold'}
            </button>
          )}
        </div>
      )}
      {folded ? props.summary && <div className="small muted card-summary">{props.summary}</div> : props.children}
    </section>
  );
}

export function Tabs<T extends string>(props: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {props.tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={props.value === t.id} className={props.value === t.id ? 'active' : ''} onClick={() => props.onChange(t.id)} data-tour={`tab-${t.id}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A line of explanation with the rest a click away: how the app works something out. (RulesNote
 * does the same for the book's own text.)
 */
export function HowItWorks(props: { summary?: ReactNode; children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="small muted" style={{ margin: '6px 0' }}>
      {props.summary}
      {props.summary ? ' ' : ''}
      <button className="small ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ padding: '0 6px' }}>
        {open ? 'Hide' : props.label ?? 'How it works'}
      </button>
      {open && <div style={{ marginTop: 4 }}>{props.children}</div>}
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
    const raw = marked.parse(tidyTables(props.text ?? ''), { async: false, gfm: true, breaks: false }) as string;
    return DOMPurify.sanitize(dropEmptyHeads(raw));
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

/**
 * A dropdown of suggested values with "Other (type your own)…", which shows a text box. A value
 * not in the list counts as typed-in, so saved free text is never lost.
 */
export function SelectOrType(props: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  groups?: { label: string; options: string[] }[];
  placeholder?: string;
  otherLabel?: string;
  ariaLabel?: string;
}) {
  const { value, onChange } = props;
  const all = [...(props.options ?? []), ...(props.groups ?? []).flatMap((g) => g.options)];
  const isOther = !!value && !all.includes(value);
  const [otherOpen, setOtherOpen] = useState(isOther);
  const showOther = otherOpen || isOther;
  return (
    <span className="select-or-type">
      <select
        value={showOther ? '__other' : value}
        aria-label={props.ariaLabel ?? props.placeholder}
        onChange={(e) => {
          if (e.target.value === '__other') {
            setOtherOpen(true);
            if (!isOther) onChange('');
          } else {
            setOtherOpen(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{props.placeholder ?? '— choose —'}</option>
        {(props.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {(props.groups ?? []).map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </optgroup>
        ))}
        <option value="__other">{props.otherLabel ?? 'Other (type your own)…'}</option>
      </select>
      {showOther && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type your own" aria-label={`${props.ariaLabel ?? props.placeholder ?? 'Value'} (your own)`} autoFocus={otherOpen && !isOther} />
      )}
    </span>
  );
}
