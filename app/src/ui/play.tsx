// Where the saga is played. The character sheets are built and then keep score; the rolls are made at
// the Game Table. The same cards serve both: inside <AtTable> their roll buttons show, and on a sheet a
// card says in one line where at the table its rolls are made. The table's pickers offer everyone in
// the saga, the Tribunal's people too, grouped by whose they are.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { livingIds } from '../engine/living';
import type { Character, Covenant } from '../engine/types';
import { R, type DiceSub } from './routes';

const Ctx = createContext(false);

/** Cards inside roll their dice: the Game Table's pages. */
export function AtTable({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={true}>{children}</Ctx.Provider>;
}

/** Whether this card is at the Game Table (rolls shown) or on a sheet (score kept). */
export const useAtTable = () => useContext(Ctx);

export const DICE_LABELS: Record<DiceSub, string> = { roll: 'Roll', combat: 'Combat & perils', magic: 'Spellcasting', society: 'Society & the Tribunal' };

type Where = DiceSub | 'recovery' | 'seasons' | 'guild';

const PLACE: Record<Where, string> = {
  roll: 'Dice',
  combat: 'Dice › Combat & perils',
  magic: 'Dice › Spellcasting',
  society: 'Dice › Society & the Tribunal',
  recovery: 'Overview › Health & recovery',
  seasons: 'Seasons',
  guild: 'City & Guild',
};

export function tableLink(sagaId: string, where: Where, who?: string): string {
  if (where === 'recovery') return R.table(sagaId, 'overview', undefined, { who });
  if (where === 'seasons') return R.seasonsFor(sagaId, who);
  if (where === 'guild') return R.guild(sagaId, { who });
  return R.dice(sagaId, where, who);
}

/** On a sheet, in place of a card's rolls: where at the Game Table they are made. Nothing at the table. */
export function RollAtTable({ sagaId, who, where, what }: { sagaId?: string; who?: string; where: Where; what: ReactNode }) {
  const atTable = useAtTable();
  if (atTable || !sagaId) return null;
  return (
    <div className="small muted at-table">
      {what} at the <Link to={tableLink(sagaId, where, who)}>Game Table › {PLACE[where]} ›</Link>
    </div>
  );
}

export interface PeopleGroup {
  label: string;
  people: Character[];
}

/** The saga's people by whose they are: the players', the storyguide's, then each of the Tribunal's covenants and its wanderers. */
export function groupPeople(chars: Character[], covs: Covenant[]): PeopleGroup[] {
  const living = livingIds(covs, chars);
  const byName = (a: Character, b: Character) => (a.name || '').localeCompare(b.name || '');
  const mine = chars.filter((c) => !living.members.has(c.id) && !(c.covenantId && living.covenants.has(c.covenantId)));
  const groups: PeopleGroup[] = [
    { label: 'The players’ characters', people: mine.filter((c) => !c.npc).sort(byName) },
    { label: 'The storyguide’s characters', people: mine.filter((c) => c.npc).sort(byName) },
  ];
  for (const cov of covs.filter((x) => x.living).sort((a, b) => a.name.localeCompare(b.name)))
    groups.push({ label: `${cov.name} (the Tribunal)`, people: chars.filter((c) => c.covenantId === cov.id).sort(byName) });
  const placed = new Set(groups.flatMap((g) => g.people.map((c) => c.id)));
  const rest = chars.filter((c) => !placed.has(c.id));
  if (rest.length) groups.push({ label: 'Wandering the Tribunal', people: rest.sort(byName) });
  return groups.filter((g) => g.people.length);
}

/** The <option>s of a people picker, in groups. */
export function PeopleOptions({ groups, note }: { groups: PeopleGroup[]; note?: (c: Character) => string }) {
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.people.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || 'Unnamed'}
              {note ? note(c) : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

/** Who can act at the table: finished, alive. */
export const canPlay = (c: Character) => c.creation.finalized && !c.wounds.dead;

export function usePeopleGroups(chars: Character[], covs: Covenant[], keep: (c: Character) => boolean = canPlay): PeopleGroup[] {
  return useMemo(() => groupPeople(chars.filter(keep), covs), [chars, covs, keep]);
}

/**
 * A card's results, newest first, where the card shows them. A result that lands while this list is
 * out of sight (a long card on a phone, the button high above) also shows for a moment at the foot
 * of the screen, with a link down to the list.
 */
export function ResultLog({ lines, max = 12 }: { lines: string[]; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string>();
  const first = lines[0];
  const seen = useRef(first);
  useEffect(() => {
    if (!first || first === seen.current) return;
    seen.current = first;
    const r = ref.current?.getBoundingClientRect();
    const visible = r && r.top < window.innerHeight - 40 && r.bottom > 0;
    if (visible) return;
    setToast(first);
    const t = setTimeout(() => setToast(undefined), 9000);
    return () => clearTimeout(t);
  }, [first]);
  if (!lines.length) return null;
  return (
    <>
      <div ref={ref} className="dice-result-lines small" aria-live="polite">
        {lines.slice(0, max).map((l, i) => (
          <div key={i} className={i ? 'muted' : ''}>
            {l}
          </div>
        ))}
      </div>
      {toast && (
        <div className="result-toast small" role="status">
          <span>{toast}</span>
          <button
            className="small ghost"
            onClick={() => {
              ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setToast(undefined);
            }}
          >
            Show ↓
          </button>
          <button className="small ghost" aria-label="Close" onClick={() => setToast(undefined)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
