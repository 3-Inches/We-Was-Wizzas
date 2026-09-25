import { SOCIETIES, type CharType } from '../../../data';
import { recomputeAge } from '../../../engine/character/factory';
import { ARCHETYPES } from '../../../engine/recommend';
import { Card, Field, Stepper } from '../../kit';
import type { CharEditor } from '../useChar';

export default function BasicsStep({ ed }: { ed: CharEditor }) {
  const { c, update, saga, d } = ed;
  if (!c || !saga || !d) return null;
  const year = saga.currentYear;
  const arche = c.creation.archetypes ?? [];
  return (
    <>
      <Card title="Who is this character?" className="accent">
        <div className="grid grid-2">
          <Field label="Name">
            <input value={c.name} onChange={(e) => update((x) => void (x.name = e.target.value))} placeholder={c.type === 'magus' ? 'e.g. Darius of Flambeau' : 'e.g. Brother Anselm'} />
          </Field>
          <Field label="Player">
            <input value={c.player} onChange={(e) => update((x) => void (x.player = e.target.value))} />
          </Field>
          <Field label="Character type" hint="Grogs are minor characters; companions and magi are central; Mythic Companions are magus-level non-magi.">
            <select value={c.type} onChange={(e) => update((x) => void (x.type = e.target.value as CharType))}>
              <option value="magus">Magus</option>
              <option value="companion">Companion</option>
              <option value="mythic">Mythic Companion</option>
              <option value="grog">Grog</option>
            </select>
          </Field>
          <Field label="Gender (as perceived by society)" hint="Only matters for some Social Statuses (DE p.62).">
            <input value={c.gender} onChange={(e) => update((x) => void (x.gender = e.target.value))} placeholder="e.g. male, female, …" />
          </Field>
          <Field label="Society / culture" hint="Filters Social Status Virtues (DE p.65).">
            <select value={c.society} onChange={(e) => update((x) => void (x.society = e.target.value))}>
              {SOCIETIES.filter((s) => s !== 'All Cultures').map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Nationality / homeland">
            <input value={c.nationality} onChange={(e) => update((x) => void (x.nationality = e.target.value))} placeholder="e.g. Bavarian" />
          </Field>
        </div>
      </Card>

      <Card title="Age">
        {c.type === 'magus' ? (
          <div className="row">
            <Field label="Age when apprenticeship began" hint="Usually 7–10. Years before this give later-life experience (15/yr).">
              <Stepper value={c.creation.apprenticeshipStartAge} min={5} max={30} onChange={(v) => update((x) => { x.creation.apprenticeshipStartAge = v; recomputeAge(x, year); })} />
            </Field>
            <Field label="Years since Gauntlet" hint="0 for a newly Gauntleted magus. Each year gives 30 points (DE p.50).">
              <Stepper value={c.creation.yearsPostGauntlet} min={0} max={200} onChange={(v) => update((x) => { x.creation.yearsPostGauntlet = v; recomputeAge(x, year); })} />
            </Field>
            <div className="stat">
              <span className="v">{c.age}</span>
              <span className="l">age</span>
            </div>
            <div className="small muted">
              Born {year - c.age}. Apprenticeship lasts {saga.houseRules.apprenticeshipYears} years. Ability cap at creation: {d.ageCap}.
            </div>
          </div>
        ) : (
          <div className="row">
            <Field label="Age" hint="Characters over 35 make aging rolls before play.">
              <Stepper value={c.age} min={5} max={120} onChange={(v) => update((x) => { x.age = v; recomputeAge(x, year); })} />
            </Field>
            <div className="small muted">
              Born {year - c.age}. {Math.max(0, c.age - 5)} years of later life after early childhood. Ability cap at creation: {d.ageCap}.
              {c.age < 14 && ' Child characters take Characteristic and Size penalties.'}
            </div>
          </div>
        )}
        {c.type === 'magus' && (
          <Field label="Seasons of lab work taken during post-Gauntlet years" hint="Each costs 10 of that year's 30 points (talisman, longevity ritual, items, familiar…).">
            <Stepper value={c.creation.postGauntletLabSeasons} min={0} max={c.creation.yearsPostGauntlet * 4} onChange={(v) => update((x) => void (x.creation.postGauntletLabSeasons = v))} />
          </Field>
        )}
      </Card>

      <Card title="Concept">
        <Field label="Concept in a sentence" hint="The first step in creating a character (DE p.43).">
          <input value={c.creation.concept ?? ''} onChange={(e) => update((x) => void (x.creation.concept = e.target.value))} placeholder="A scary-looking magus who hunts the enemies of the Order…" />
        </Field>
        <div className="small" style={{ margin: '8px 0 4px' }}>
          Pick one to three themes — recommendations will follow them:
        </div>
        <div className="chip-row">
          {ARCHETYPES.filter((a) => !a.forTypes || a.forTypes.includes(c.type)).map((a) => (
            <span
              key={a.id}
              className={`chip ${arche.includes(a.id) ? 'on' : ''}`}
              title={a.description}
              onClick={() =>
                update((x) => {
                  const cur = x.creation.archetypes ?? [];
                  x.creation.archetypes = cur.includes(a.id) ? cur.filter((y) => y !== a.id) : [...cur, a.id];
                })
              }
            >
              {a.label}
            </span>
          ))}
        </div>
        <Field label="Description, background, appearance">
          <textarea value={c.description} onChange={(e) => update((x) => void (x.description = e.target.value))} rows={5} />
        </Field>
      </Card>
    </>
  );
}
