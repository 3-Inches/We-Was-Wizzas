// Turning the optional rules of the supplements on and off for a saga, each with its summary and the
// book's text a click away, on the Saga Overview's Optional rules tab.

import { Link } from 'react-router-dom';
import { OPTIONAL_RULES, OPTION_GROUPS, bookOn, optionOn, tribunalMatches, tribunalOptions, type OptionalRule } from '../engine/optional';
import type { Saga } from '../engine/types';
import { useStore } from '../store/store';
import { BOOK_BY_ID } from '../data';
import { RulesNote } from './RulesNote';
import { R } from './routes';

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

/** Every optional rule, by group, the Tribunal's own first (Saga Overview → Optional rules). */
export function OptionalRulesPanel({ saga }: { saga: Saga }) {
  return (
    <div className="stack">
      {/* the Tribunal's own rules first: they matter as soon as the Tribunal is chosen */}
      {[...OPTION_GROUPS.filter((g) => g === 'Tribunal'), ...OPTION_GROUPS.filter((g) => g !== 'Tribunal')].map((g) => {
        const rules = OPTIONAL_RULES.filter((r) => r.group === g && (g !== 'Tribunal' || tribunalMatches(saga, r)));
        if (!rules.length) return null;
        const body = rules.map((r) => <RuleRow key={r.id} saga={saga} rule={r} />);
        return g === 'Tribunal' ? (
          <div key={g} data-tour="optional-tribunal">
            <h3 style={{ margin: '8px 0 4px' }}>The {saga.tribunal} Tribunal</h3>
            {body}
          </div>
        ) : (
          <div key={g}>
            <h3 style={{ margin: '8px 0 4px' }}>{g}</h3>
            {body}
          </div>
        );
      })}
      {!tribunalOptions(saga).length && saga.tribunal && <p className="small muted">The {saga.tribunal} Tribunal has no rules of its own here yet.</p>}
    </div>
  );
}

/** The Saga Overview's line on its optional rules: how many are in use, the Tribunal's own among them, and where to choose them. */
export function SagaOptionsCard({ saga }: { saga: Saga }) {
  const trib = tribunalOptions(saga);
  const on = OPTIONAL_RULES.filter((r) => (!r.tribunal || tribunalMatches(saga, r)) && optionOn(saga, r.id)).length;
  return (
    <div className="small" data-tour="saga-options">
      {on} optional rules in use
      {trib.length ? `; the ${saga.tribunal} Tribunal has ${trib.length} of its own (${trib.filter((r) => optionOn(saga, r.id)).length} on)` : ''}.{' '}
      <Link to={R.saga(saga.id, 'optional')}>Choose them on the Optional rules tab ›</Link>
    </div>
  );
}
