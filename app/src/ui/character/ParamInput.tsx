import { ARTS, ART_NAMES, CHARACTERISTICS, CHAR_NAMES, FORMS, TECHNIQUES, type GameData, type ParamSpec } from '../../data';

export default function ParamInput(props: { spec: ParamSpec; value?: string; onChange: (v: string) => void; data: GameData }) {
  const { spec, value, onChange, data } = props;
  if (spec.kind === 'ability') {
    const list = data.abilities.filter((a) => !spec.abilityTypes || spec.abilityTypes.includes(a.type)).sort((a, b) => a.name.localeCompare(b.name));
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={spec.label}>
        <option value="">— {spec.label} —</option>
        {list.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    );
  }
  if (spec.kind === 'art' || spec.kind === 'technique' || spec.kind === 'form') {
    const list = spec.kind === 'art' ? ARTS : spec.kind === 'technique' ? TECHNIQUES : FORMS;
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={spec.label}>
        <option value="">— {spec.label} —</option>
        {list.map((a) => (
          <option key={a} value={a}>
            {ART_NAMES[a]}
          </option>
        ))}
      </select>
    );
  }
  if (spec.kind === 'characteristic') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={spec.label}>
        <option value="">— {spec.label} —</option>
        {CHARACTERISTICS.map((c) => (
          <option key={c} value={c}>
            {CHAR_NAMES[c]}
          </option>
        ))}
      </select>
    );
  }
  const listId = `opts-${spec.label.replace(/\W/g, '')}`;
  return (
    <>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={spec.label} list={spec.options ? listId : undefined} aria-label={spec.label} />
      {spec.options && (
        <datalist id={listId}>
          {spec.options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </>
  );
}
