import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Issue, Step } from '../../engine/character/validate';
import { autoFix, fixesFor, resolveAll, type Fix, type ResolveResult } from '../../engine/character/fixes';
import ParamInput from './ParamInput';
import { stepIndex } from './wizardSteps';
import type { CharEditor } from './useChar';

/** Jump to a wizard step, or to a tab of the sheet. */
export function useGoto(ed: CharEditor) {
  const nav = useNavigate();
  return (step: Step, tab?: string) => {
    const { c, saga } = ed;
    if (!c || !saga) return;
    const base = `/saga/${saga.id}/character/${c.id}`;
    if (step === 'sheet') return nav(`${base}?tab=${tab ?? 'overview'}`);
    ed.update((x) => void (x.creation.step = stepIndex(x.type, step)));
    nav(`${base}/create`);
  };
}

/**
 * The rules check for a character. Clicking an issue applies its first fix (or opens the step
 * where the choice is made); other fixes are offered underneath.
 */
export function CharIssueList(props: { ed: CharEditor; issues: Issue[]; empty?: ReactNode; resolveAll?: boolean; compact?: boolean }) {
  const { ed, issues } = props;
  return (
    <div>
      {props.resolveAll && <ResolveAllBar ed={ed} />}
      {issues.length === 0 && !props.compact && <div className="muted small">{props.empty ?? 'No problems found.'}</div>}
      {issues.map((i) => (
        <IssueBox key={i.id} ed={ed} issue={i} compact={props.compact} />
      ))}
    </div>
  );
}

function IssueBox({ ed, issue, compact }: { ed: CharEditor; issue: Issue; compact?: boolean }) {
  const { d, data, saga } = ed;
  const goto = useGoto(ed);
  const fixes = useMemo(() => (d && saga ? fixesFor(issue, d, data, saga.houseRules) : []), [issue, d, data, saga]);
  const primary = fixes[0];
  const run = (f: Fix, value?: string) => {
    if (f.kind === 'goto') return goto(f.step, f.tab);
    if (f.kind === 'param') return ed.update((x) => void f.apply(x, value ?? ''));
    ed.applyFix(f, value);
  };
  const clickable = primary && (primary.kind === 'apply' || primary.kind === 'goto');
  const hint = primary ? (primary.kind === 'apply' ? 'Click to fix: ' : primary.kind === 'goto' ? 'Click to open: ' : '') + primary.label : undefined;
  return (
    <div
      className={`issue ${issue.severity} ${clickable ? 'clickable' : ''} ${compact ? 'compact' : ''}`}
      onClick={clickable ? () => run(primary) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), run(primary)) : undefined}
      title={hint}
    >
      {!compact && <span className={`badge ${issue.severity === 'error' ? 'bad' : issue.severity === 'warning' ? 'warn' : 'info'}`}>{issue.severity}</span>}
      <div className="msg">
        {compact && <span className={issue.severity === 'error' ? 'bad-text' : 'warn-text'}>{issue.severity === 'error' ? '✕ ' : '! '}</span>}
        {issue.message}
        {!compact && issue.ref && <div className="ref">{issue.ref}</div>}
        {fixes.length > 0 && (
          <div className="fix-row" onClick={(e) => e.stopPropagation()}>
            {fixes.map((f, k) => (
              <FixControl key={k} fix={f} primary={k === 0} ed={ed} run={run} />
            ))}
          </div>
        )}
        {fixes.length === 0 && issue.fix && <div className="small soft">Suggestion: {issue.fix}</div>}
      </div>
      {issue.severity !== 'info' && (
        <button
          className="small ghost"
          title="Allow it as a troupe ruling: hides this issue for this character"
          onClick={(e) => {
            e.stopPropagation();
            ed.acknowledge(issue.id);
          }}
        >
          Allow
        </button>
      )}
    </div>
  );
}

function FixControl({ fix, primary, ed, run }: { fix: Fix; primary: boolean; ed: CharEditor; run: (f: Fix, v?: string) => void }) {
  if (fix.kind === 'choose') {
    return (
      <select value="" onChange={(e) => e.target.value && run(fix, e.target.value)} aria-label={fix.label}>
        <option value="">{fix.label}…</option>
        {fix.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (fix.kind === 'param') {
    return (
      <span className="row small">
        {fix.label}: <ParamInput spec={fix.spec} data={ed.data} onChange={(v) => run(fix, v)} />
      </span>
    );
  }
  return (
    <button className={`small ${primary ? 'fix-primary' : 'ghost'}`} onClick={() => run(fix)}>
      {fix.kind === 'goto' ? `→ ${fix.label}` : fix.label}
    </button>
  );
}

/** "Resolve all": preview what the automatic fixes will do, then apply them in one step (with Undo). */
function ResolveAllBar({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga, issues } = ed;
  const [plan, setPlan] = useState<ResolveResult | null>(null);
  const fixable = useMemo(
    () => (d && saga ? issues.filter((i) => i.severity === 'error' && autoFix(i, d, data, saga.houseRules)).length : 0),
    [issues, d, data, saga],
  );
  if (!c || !saga) return null;
  if (!fixable && !plan) return null;
  if (!plan) {
    return (
      <div className="resolve-bar">
        <button
          className="primary small"
          onClick={() => setPlan(resolveAll(structuredClone(c), data, saga.houseRules))}
          title="Preview the automatic fixes before applying them"
        >
          Resolve all… ({fixable} error{fixable === 1 ? '' : 's'} can be fixed automatically)
        </button>
      </div>
    );
  }
  return (
    <div className="resolve-bar open">
      <b className="small">Resolve all will:</b>
      <ul className="small">
        {plan.applied.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
      {plan.remaining.length > 0 && (
        <p className="small muted" style={{ margin: '4px 0' }}>
          {plan.remaining.length} error{plan.remaining.length === 1 ? '' : 's'} will still need your choice.
        </p>
      )}
      <div className="row">
        <button
          className="primary small"
          onClick={() => {
            ed.resolveAll();
            setPlan(null);
          }}
        >
          Apply
        </button>
        <button className="small ghost" onClick={() => setPlan(null)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
