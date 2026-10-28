// Turning the optional rules of the supplements on and off for a saga, each with its summary and the
// book's text a click away. The Saga page shows the Tribunal's own rules; House rules lists them all.

import { Link } from 'react-router-dom';
import { OPTIONAL_RULES, OPTION_GROUPS, bookOn, optionOn, tribunalMatches, tribunalOptions, type OptionalRule } from '../engine/optional';
import type { Saga } from '../engine/types';
import { useStore } from '../store/store';
import { BOOK_BY_ID } from '../data';
import { RulesNote } from './RulesNote';

function RuleRow({ saga, rule }: { saga: Saga; rule: OptionalRule }) {
  const updateSaga = useStore((s) => s.updateSaga);
  const on = optionOn(saga, rule.id);
  const missing = !bookOn(saga, rule.book);
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
      <label className="inline" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
        <input type="checkbox" checked={on} onChange={(e) => updateSaga(saga.id, (s) => void (s.options = { ...(s.options ?? {}), [rule.id]: e.target.checked }))} />
        <b>{rule.label}</b>
        <span className="small muted">
          {BOOK_BY_ID[rule.book]?.abbr ?? rule.book} · {rule.where}
          {missing ? ' · its book is not in this saga' : ''}
        </span>
      </label>
      <RulesNote book={rule.book} line={rule.line} endLine={rule.endLine}>
        {rule.summary}
      </RulesNote>
    </div>
  );
}

/** Every optional rule, by group (House rules → Optional rules). */
export function OptionalRulesPanel({ saga }: { saga: Saga }) {
  return (
    <div className="stack">
      {OPTION_GROUPS.map((g) => {
        const rules = OPTIONAL_RULES.filter((r) => r.group === g && (g !== 'Tribunal' || tribunalMatches(saga, r)));
        if (!rules.length) return null;
        return (
          <div key={g}>
            <h3 style={{ margin: '8px 0 4px' }}>{g === 'Tribunal' ? `The ${saga.tribunal} Tribunal` : g}</h3>
            {rules.map((r) => (
              <RuleRow key={r.id} saga={saga} rule={r} />
            ))}
          </div>
        );
      })}
      {!tribunalOptions(saga).length && saga.tribunal && <p className="small muted">The {saga.tribunal} Tribunal has no rules of its own here yet.</p>}
    </div>
  );
}

/** The Saga page: the Tribunal's own rules to choose, and how many optional rules are in use. */
export function SagaOptionsCard({ saga }: { saga: Saga }) {
  const trib = tribunalOptions(saga);
  const on = OPTIONAL_RULES.filter((r) => (!r.tribunal || tribunalMatches(saga, r)) && optionOn(saga, r.id)).length;
  return (
    <div className="stack" data-tour="saga-options">
      {trib.length > 0 && (
        <div>
          <div className="small">
            <b>Rules of the {saga.tribunal} Tribunal.</b> <span className="muted">Use any of them?</span>
          </div>
          {trib.map((r) => (
            <RuleRow key={r.id} saga={saga} rule={r} />
          ))}
        </div>
      )}
      <div className="small">
        {on} optional rules in use. <Link to={`/saga/${saga.id}/rules?tab=optional`}>Choose optional rules ›</Link>
      </div>
    </div>
  );
}
