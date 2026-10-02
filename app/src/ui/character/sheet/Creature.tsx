// A companion Flaw's own character sheet, and the creature details for that sheet
// (DE Magical Being Companion and Chapter 13: Creature Might, Size; Realms of Power: Magic).

import { Link } from 'react-router-dom';
import { newCharacter } from '../../../engine/character/factory';
import type { Character, CreatureInfo } from '../../../engine/types';
import { useSagaCharacters } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Card, Field, Stepper } from '../../kit';
import type { CharEditor } from '../useChar';

/** Flaws that bring a companion who needs a sheet of its own. */
export const COMPANION_FLAWS = new Set(['magical-being-companion-flaw', 'magic-being-companion-flaw', 'animal-companion-flaw', 'realm-spirit-companion-flaw']);

const DEFAULTS: Record<string, Partial<CreatureInfo>> = {
  'magical-being-companion-flaw': { realm: 'Magic', kind: 'animal' },
  'magic-being-companion-flaw': { realm: 'Magic', kind: 'animal' },
  'realm-spirit-companion-flaw': { realm: 'Magic', kind: 'spirit' },
  'animal-companion-flaw': { realm: 'None', kind: 'animal' },
};

/** The rule a companion's Might follows, if its Flaw sets one. */
export function companionMightRule(ownerFlaw: string | undefined, cr: CreatureInfo): { want: number; text: string } | null {
  if ((ownerFlaw === 'magical-being-companion-flaw' || ownerFlaw === 'magic-being-companion-flaw') && cr.kind === 'animal') {
    return { want: 10 - cr.size, text: 'A magical animal companion has Magic Might 10 − Size (DE Magical Being Companion): the smaller and more innocuous, the more intelligent.' };
  }
  return null;
}

/** On the owner's Flaw: open the companion's sheet, or create it. */
export function CompanionSheetLink({ ed, uid }: { ed: CharEditor; uid: string }) {
  const { c, update } = ed;
  const chars = useSagaCharacters(c?.sagaId);
  const putCharacter = useStore((s) => s.putCharacter);
  if (!c) return null;
  const cv = c.virtues.find((v) => v.uid === uid)!;
  const pet = cv.characterId ? chars.find((x) => x.id === cv.characterId) : undefined;
  if (pet) {
    return (
      <div className="small">
        Its sheet: <Link to={`/saga/${c.sagaId}/character/${pet.id}`}>{pet.name || 'companion'}</Link>
      </div>
    );
  }
  const create = (level: CreatureInfo['intelligence']) => {
    const x: Character = newCharacter(level === 'grog' ? 'grog' : 'companion', c.sagaId);
    const base = DEFAULTS[cv.defId] ?? {};
    const size = base.kind === 'animal' ? -3 : 0;
    x.name = cv.param || 'Companion';
    x.creature = {
      realm: base.realm ?? 'Magic', kind: base.kind ?? 'animal', size, might: base.realm === 'None' ? 0 : 10 - size,
      intelligence: level, ownerId: c.id, ownerVirtueUid: cv.uid,
    };
    x.notes = `Companion of ${c.name || 'its owner'} (${cv.defId.replace(/-flaw$/, '').replace(/-/g, ' ')}). Build it with the creature rules (DE Chapter 13) or Realms of Power: Magic.`;
    putCharacter(x);
    update((y) => void (y.virtues.find((v) => v.uid === uid)!.characterId = x.id));
  };
  return (
    <div className="row small">
      <span>Make its character sheet:</span>
      <button className="small" title="An extension of your will" onClick={() => create('grog')}>
        grog-level
      </button>
      <button className="small" title="Follows instructions but often does what it thinks best" onClick={() => create('companion')}>
        companion-level
      </button>
      <button className="small" title="Condescending or wild, rarely acts except on its own initiative" onClick={() => create('magus')}>
        magus-level
      </button>
    </div>
  );
}

/** The creature details on its own sheet: Might, Size, kind, powers. */
export function CreatureCard({ ed }: { ed: CharEditor }) {
  const { c, update } = ed;
  const chars = useSagaCharacters(c?.sagaId);
  if (!c?.creature) return null;
  const cr = c.creature;
  const set = (fn: (x: CreatureInfo) => void) => update((y) => void fn(y.creature!));
  const owner = cr.ownerId ? chars.find((x) => x.id === cr.ownerId) : undefined;
  const ownerFlaw = owner?.virtues.find((v) => v.uid === cr.ownerVirtueUid)?.defId;
  const rule = companionMightRule(ownerFlaw, cr);
  return (
    <Card title="Creature">
      <div className="row">
        <Field label="Realm">
          <select value={cr.realm} onChange={(e) => set((x) => void (x.realm = e.target.value as CreatureInfo['realm']))}>
            {['Magic', 'Faerie', 'Divine', 'Infernal', 'None'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Kind">
          <select value={cr.kind} onChange={(e) => set((x) => void (x.kind = e.target.value as CreatureInfo['kind']))}>
            <option value="animal">animal</option>
            <option value="human">human-like</option>
            <option value="spirit">spirit</option>
            <option value="thing">animate thing</option>
          </select>
        </Field>
        <Field label="Size" hint="0 is an adult human; −3 a cat or falcon, −4 a crow or raven">
          <Stepper value={cr.size} min={-15} max={10} width={36} onChange={(v) => set((x) => void (x.size = v))} />
        </Field>
        {cr.realm !== 'None' && (
          <Field label={`${cr.realm} Might`}>
            <Stepper value={cr.might} min={0} max={100} width={40} onChange={(v) => set((x) => void (x.might = v))} />
          </Field>
        )}
        <Field label="Independence">
          <select value={cr.intelligence} onChange={(e) => set((x) => void (x.intelligence = e.target.value as CreatureInfo['intelligence']))}>
            <option value="grog">grog-level: an extension of the owner's will</option>
            <option value="companion">companion-level: follows instructions, often does what it thinks best</option>
            <option value="magus">magus-level: condescending or wild, acts on its own</option>
          </select>
        </Field>
      </div>
      {rule && cr.might !== rule.want && (
        <div className="issue warning">
          <span className="badge warn">check</span>
          <div className="msg">
            {rule.text} At Size {cr.size} that is Might {rule.want}.
          </div>
          <button className="small" onClick={() => set((x) => void (x.might = rule.want))}>
            Set Might to {rule.want}
          </button>
        </div>
      )}
      <Field label="Powers" hint="Name, Might cost, Init, Form: description (DE Creature Powers)">
        <textarea rows={3} value={cr.powers ?? ''} onChange={(e) => set((x) => void (x.powers = e.target.value))} />
      </Field>
      <p className="small muted">
        {cr.realm !== 'None' && `Magic Resistance: Might ${cr.might} + aura modifier. A power's Penetration: Might − 5 × its Might cost + Penetration bonus; its level for dispelling equals the Might. The Might Pool refreshes over a day. `}
        Size changes wound ranges and Strength (−2 Strength, +1 Quickness per point smaller) (DE Chapter 13).
        {owner && ` Companion of ${owner.name}.`}
      </p>
    </Card>
  );
}
