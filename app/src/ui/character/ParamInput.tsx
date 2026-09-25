import { Fragment, useState } from 'react';
import { ARTS, ART_NAMES, CHARACTERISTICS, CHAR_NAMES, FORMS, TECHNIQUES, type GameData, type ParamSpec } from '../../data';
import { paramValues } from '../../engine/character/derive';

/** The choice a Virtue or Flaw asks for: an Ability, Art, Characteristic, Realm or a listed option. */
export default function ParamInput(props: { spec: ParamSpec; value?: string; onChange: (v: string) => void; data: GameData }) {
  const { spec, value, onChange, data } = props;
  const choices = listChoices(spec, data);
  if (choices && spec.multiple) return <MultiChoice spec={spec} choices={choices} value={value} onChange={onChange} />;
  if (choices) {
    const options = choices.flatMap((g) => g.options.map((o) => o.value));
    const other = spec.kind === 'text' || spec.kind === 'realm';
    return <SingleChoice spec={spec} choices={choices} options={options} allowOther={other} value={value} onChange={onChange} />;
  }
  return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={spec.label} aria-label={spec.label} />;
}

type Choice = { value: string; label: string };
type Group = { label?: string; options: Choice[] };

function listChoices(spec: ParamSpec, data: GameData): Group[] | null {
  const plain = (xs: string[]): Choice[] => xs.map((x) => ({ value: x, label: x }));
  if (spec.kind === 'ability') {
    const list = data.abilities
      .filter((a) => (!spec.abilityTypes || spec.abilityTypes.includes(a.type)) && (!spec.options || spec.options.includes(a.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [{ options: list.map((a) => ({ value: a.id, label: a.name })) }];
  }
  if (spec.kind === 'art' || spec.kind === 'technique' || spec.kind === 'form') {
    const all = spec.kind === 'art' ? ARTS : spec.kind === 'technique' ? TECHNIQUES : FORMS;
    const list = spec.options ? all.filter((a) => spec.options!.includes(a)) : all;
    return [{ options: list.map((a) => ({ value: a, label: ART_NAMES[a] })) }];
  }
  if (spec.kind === 'characteristic') return [{ options: CHARACTERISTICS.map((c) => ({ value: c, label: CHAR_NAMES[c] })) }];
  if (spec.groups) return spec.groups.map((g) => ({ label: g.label, options: plain(g.options) }));
  if (spec.options) return [{ options: plain(spec.options) }];
  return null;
}

function SingleChoice(props: { spec: ParamSpec; choices: Group[]; options: string[]; allowOther: boolean; value?: string; onChange: (v: string) => void }) {
  const { spec, choices, options, allowOther, value, onChange } = props;
  const isOther = !!value && !options.includes(value);
  const [otherOpen, setOtherOpen] = useState(isOther);
  const showOther = allowOther && (otherOpen || isOther);
  const renderOpts = (g: Group) =>
    g.options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
  return (
    <>
      <select
        value={showOther ? '__other' : value ?? ''}
        aria-label={spec.label}
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
        <option value="">— {spec.label} —</option>
        {choices.map((g, i) =>
          g.label ? (
            <optgroup key={g.label} label={g.label}>
              {renderOpts(g)}
            </optgroup>
          ) : (
            <Fragment key={i}>{renderOpts(g)}</Fragment>
          ),
        )}
        {allowOther && <option value="__other">Other (describe)…</option>}
      </select>
      {showOther && <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={`Describe the ${spec.label.toLowerCase()}`} aria-label={`${spec.label} (other)`} />}
    </>
  );
}

function MultiChoice(props: { spec: ParamSpec; choices: Group[]; value?: string; onChange: (v: string) => void }) {
  const { spec, choices, value, onChange } = props;
  const chosen = paramValues(value);
  const all = choices.flatMap((g) => g.options);
  const toggle = (v: string) => onChange((chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v]).join(','));
  if (all.length > 20) {
    // long lists (Abilities): chips for what is chosen plus a dropdown to add more
    return (
      <span className="chip-row" aria-label={spec.label}>
        {chosen.map((v) => (
          <span key={v} className="chip on" onClick={() => toggle(v)} title="Remove">
            {all.find((o) => o.value === v)?.label ?? v} ✕
          </span>
        ))}
        <select value="" onChange={(e) => e.target.value && toggle(e.target.value)} aria-label={`Add ${spec.label}`}>
          <option value="">+ add…</option>
          {all
            .filter((o) => !chosen.includes(o.value))
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      </span>
    );
  }
  return (
    <span className="chip-row" aria-label={spec.label}>
      {all.map((o) => (
        <span key={o.value} className={`chip ${chosen.includes(o.value) ? 'on' : ''}`} onClick={() => toggle(o.value)}>
          {o.label}
        </span>
      ))}
    </span>
  );
}
