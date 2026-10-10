// A companion Flaw's own character sheet, and the creature details for that sheet: the core
// rules' guidelines (DE Chapter 13, Magical Being Companion) or the full Magic Character Creation
// rules of Realms of Power: Magic (Season, Might by power level, Qualities and Inferiorities).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ART_NAMES, CHARACTERISTICS, CHAR_NAMES, FORMS, type Art } from '../../../data';
import { addVirtue, newCharacter, removeVirtue } from '../../../engine/character/factory';
import {
  COMPANION_FLAWS, MAGIC_QUALITIES, MAGIC_QUALITY_BY_ID, MIGHT_BY_POWER, POINTS, QUALITY_RULES, SEASON_XP, newMagicCharacter, type MagicQualityDef,
} from '../../../engine/character/magicCharacter';
import type { Character, CreatureInfo, CreatureQuality, MagicCharacterInfo, MagicSeason, PowerLevel } from '../../../engine/types';
import { uid } from '../../../util/id';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Card, Field, Markdown, Meter, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

export { COMPANION_FLAWS };

const DEFAULTS: Record<string, Partial<CreatureInfo>> = {
  'magical-being-companion-flaw': { realm: 'Magic', kind: 'animal' },
  'magic-being-companion-flaw': { realm: 'Magic', kind: 'animal' },
  'realm-spirit-companion-flaw': { realm: 'Magic', kind: 'spirit' },
  'realm-spirit-companion': { realm: 'Magic', kind: 'spirit' },
  'animal-companion-flaw': { realm: 'None', kind: 'animal' },
};

/** The rule a companion's Might follows under the core rules, if its Flaw sets one. */
export function companionMightRule(ownerFlaw: string | undefined, cr: CreatureInfo): { want: number; text: string } | null {
  if (cr.magicCharacter) return null;
  if ((ownerFlaw === 'magical-being-companion-flaw' || ownerFlaw === 'magic-being-companion-flaw') && cr.kind === 'animal') {
    return { want: 10 - cr.size, text: 'A magical animal companion has Magic Might 10 − Size (DE Magical Being Companion): the smaller and more innocuous, the more intelligent.' };
  }
  return null;
}

/** On the owner's Flaw: open the companion's sheet, or create it. */
export function CompanionSheetLink({ ed, uid: cvUid }: { ed: CharEditor; uid: string }) {
  const { c, update, data } = ed;
  const chars = useSagaCharacters(c?.sagaId);
  const covenants = useSagaCovenants(c?.sagaId);
  const putCharacter = useStore((s) => s.putCharacter);
  if (!c) return null;
  const cv = c.virtues.find((v) => v.uid === cvUid)!;
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
    const cr: CreatureInfo = { realm: base.realm ?? 'Magic', kind: base.kind ?? 'animal', size, might: 0, intelligence: level, ownerId: c.id, ownerVirtueUid: cv.uid };
    if (cr.realm !== 'None') {
      // a magical companion is a magic character (RoP: Magic): the core Flaw's animal has Might 10 − Size,
      // the Realms of Power version takes the Might for the saga's power level and the companion's role
      const pl = (covenants.find((k) => k.memberIds.includes(c.id))?.powerLevel ?? 'Medium') as PowerLevel;
      cr.magicCharacter = newMagicCharacter(cr, pl, cv.defId === 'magical-being-companion-flaw' ? 10 : undefined);
      x.virtues = x.virtues.filter((v) => !data.vfById.get(v.defId)?.categories.includes('Social Status'));
      addVirtue(x, data, 'magical-friend-flaw', 'Minor');
    }
    x.creature = cr;
    x.notes = `Companion of ${c.name || 'its owner'} (${data.vfById.get(cv.defId)?.name ?? cv.defId}). ${cr.magicCharacter ? 'Built with the Magic Character Creation rules of Realms of Power: Magic.' : 'Build it with the creature rules (DE Chapter 13).'}`;
    putCharacter(x);
    update((y) => void (y.virtues.find((v) => v.uid === cvUid)!.characterId = x.id));
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

/** The creature details on its own sheet: Might, Size, kind, powers, and the RoP: Magic rules. */
export function CreatureCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const chars = useSagaCharacters(c?.sagaId);
  if (!c?.creature || !d) return null;
  const cr = c.creature;
  const set = (fn: (x: CreatureInfo) => void) => update((y) => void fn(y.creature!));
  const owner = cr.ownerId ? chars.find((x) => x.id === cr.ownerId) : undefined;
  const ownerFlaw = owner?.virtues.find((v) => v.uid === cr.ownerVirtueUid)?.defId;
  const rule = companionMightRule(ownerFlaw, cr);
  const mc = d.magicChar;
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
        <Field label="True form">
          <select value={cr.kind} onChange={(e) => set((x) => void (x.kind = e.target.value as CreatureInfo['kind']))}>
            <option value="animal">magic animal</option>
            <option value="human">magic human</option>
            <option value="spirit">magic spirit</option>
            <option value="thing">magic thing</option>
          </select>
        </Field>
        <Field label="Size" hint="of its true form: 0 is an adult human; −3 a cat or falcon, −4 a crow or raven">
          <Stepper value={cr.size} min={-21} max={10} width={36} onChange={(v) => set((x) => void (x.size = v))} />
        </Field>
        <Field label="Role">
          <select value={cr.intelligence} onChange={(e) => set((x) => void (x.intelligence = e.target.value as CreatureInfo['intelligence']))}>
            <option value="grog">grog-level: an extension of the owner's will</option>
            <option value="companion">companion-level: follows instructions, often does what it thinks best</option>
            <option value="magus">magus-level: condescending or wild, acts on its own</option>
          </select>
        </Field>
        {!cr.magicCharacter && cr.realm !== 'None' && (
          <Field label={`${cr.realm} Might`}>
            <Stepper value={cr.might} min={0} max={100} width={40} onChange={(v) => set((x) => void (x.might = v))} />
          </Field>
        )}
      </div>
      {cr.realm !== 'None' && (
        <label className="inline small">
          <input
            type="checkbox"
            checked={!!cr.magicCharacter}
            onChange={(e) =>
              update((y) => {
                const x = y.creature!;
                if (!e.target.checked) return void delete x.magicCharacter;
                x.magicCharacter = newMagicCharacter(x, 'Medium', ownerFlaw === 'magical-being-companion-flaw' && x.kind === 'animal' ? 10 : undefined);
                // Season gives one pool of experience: what was spent as native language and childhood moves into it
                for (const ab of y.abilities) {
                  const moved = (ab.xp.native ?? 0) + (ab.xp.childhood ?? 0);
                  if (!moved) continue;
                  ab.xp.laterLife = (ab.xp.laterLife ?? 0) + moved;
                  delete ab.xp.native;
                  delete ab.xp.childhood;
                }
              })
            }
          />{' '}
          Build with the Magic Character Creation rules of Realms of Power: Magic (Season instead of age, Might from the saga&apos;s power level, Qualities)
        </label>
      )}
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
      {cr.magicCharacter && mc && <MagicCharacterSection ed={ed} mcInfo={cr.magicCharacter} />}
      <Field label="Powers (notes)" hint="Name, Might cost, Init, Form: description. Powers from Qualities are designed under Supernatural powers.">
        <textarea rows={2} value={cr.powers ?? ''} onChange={(e) => set((x) => void (x.powers = e.target.value))} />
      </Field>
      <p className="small muted">
        {cr.realm !== 'None' && `Magic Resistance: Might + aura modifier. A power's Penetration: Might − 5 × its Might cost + Penetration. The Might Pool refreshes over a day. `}
        {owner && ` Companion of ${owner.name}.`}
      </p>
    </Card>
  );
}

function MagicCharacterSection({ ed, mcInfo }: { ed: CharEditor; mcInfo: MagicCharacterInfo }) {
  const { c, d, data, update } = ed;
  const [adding, setAdding] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  if (!c?.creature || !d?.magicChar) return null;
  const cr = c.creature;
  const mc = d.magicChar;
  const setMc = (fn: (x: MagicCharacterInfo) => void) => update((y) => void fn(y.creature!.magicCharacter!));
  const suggested = MIGHT_BY_POWER[mcInfo.powerLevel][cr.intelligence];
  const grog = cr.intelligence === 'grog';
  const pickable = MAGIC_QUALITIES.filter((q) => (!grog || q.size === 'Minor') && (QUALITY_RULES[q.id]?.repeatable || !mcInfo.qualities.some((x) => x.id === q.id)));
  const addQuality = (id: string) =>
    update((y) => {
      const m = y.creature!.magicCharacter!;
      m.qualities.push({ uid: uid(), id });
    });
  const removeQuality = (q: CreatureQuality) =>
    update((y) => {
      const m = y.creature!.magicCharacter!;
      if (q.virtueUid) removeVirtue(y, data, q.virtueUid);
      m.qualities = m.qualities.filter((x) => x.uid !== q.uid);
    });
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <div className="row">
        <Field label="Season" hint="replaces age for a magic character's experience">
          <select value={mcInfo.season} onChange={(e) => setMc((x) => void (x.season = e.target.value as MagicSeason))}>
            {(Object.keys(SEASON_XP) as MagicSeason[]).map((s) => (
              <option key={s} value={s}>
                {s} ({SEASON_XP[s]} xp)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Saga power level">
          <select value={mcInfo.powerLevel} onChange={(e) => setMc((x) => void (x.powerLevel = e.target.value as PowerLevel))}>
            {(Object.keys(MIGHT_BY_POWER) as PowerLevel[]).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Starting Might" hint={`the table suggests ${suggested} for a ${cr.intelligence}-level character in a ${mcInfo.powerLevel} saga; this is also its Quality points`}>
          <Stepper value={mcInfo.baseMight} min={0} max={100} width={40} onChange={(v) => setMc((x) => void (x.baseMight = v))} />
        </Field>
        {mcInfo.baseMight !== suggested && (
          <button className="small" onClick={() => setMc((x) => void (x.baseMight = suggested))}>
            Use {suggested}
          </button>
        )}
        <Field label="Might Form">
          <select value={mcInfo.form ?? ''} onChange={(e) => setMc((x) => void (x.form = (e.target.value || undefined) as Art | undefined))}>
            <option value="">—</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
        </Field>
        <div className="stat">
          <span className="v">
            <Total value={mc.might} parts={mc.mightParts} label="Magic Might" />
          </span>
          <span className="l">{cr.realm} Might</span>
        </div>
        <div className="stat">
          <span className="v">{mc.vis}</span>
          <span className="l">pawns of vis</span>
        </div>
      </div>
      <Meter label={`Quality points: ${mc.points.spent} of ${mc.points.budget} (Might ${mcInfo.baseMight}${mc.points.fromInferiorities ? ` + Inferiorities ${mc.points.fromInferiorities}` : ''})`} value={mc.points.spent} max={mc.points.budget} />
      <div className="small muted">
        Experience: {mc.xpParts.map((p) => `${p.label} ${p.value}`).join(', ')} = {mc.xp} xp (in the Later Life pool). Size {mc.size} changes Strength by {mc.str >= 0 ? '+' : ''}
        {mc.str} and Quickness by {mc.qik >= 0 ? '+' : ''}
        {mc.qik}. It does not age, eat or sleep, and its Might is subtracted from every Advancement Total.
      </div>
      {mc.inherent.length > 0 && (
        <div className="small">
          <b>Inherent:</b> {mc.inherent.map((i) => (i.id === 'monstrous-appearance-inferiority' && !mc.monstrous ? 'Monstrous Appearance (hidden by Natural Appearance)' : i.label)).join('; ')}
        </div>
      )}
      <div>
        {mcInfo.qualities.map((q) => (
          <QualityRow key={q.uid} ed={ed} q={q} def={MAGIC_QUALITY_BY_ID.get(q.id)} open={open === q.uid} toggle={() => setOpen(open === q.uid ? null : q.uid)} remove={() => removeQuality(q)} />
        ))}
      </div>
      <div className="row small">
        <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Quality or Inferiority">
          <option value="">— add a Quality or Inferiority —</option>
          {(['quality', 'inferiority'] as const).map((k) => (
            <optgroup key={k} label={k === 'quality' ? 'Qualities (cost points)' : 'Inferiorities (give points)'}>
              {pickable
                .filter((q) => q.kind === k)
                .map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} ({q.size}, {POINTS[q.size]})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button className="small" disabled={!adding} onClick={() => (addQuality(adding), setAdding(''))}>
          + Add
        </button>
        {grog && <span className="muted">A grog-level character takes only Minor Qualities and Inferiorities.</span>}
      </div>
    </div>
  );
}

function QualityRow({ ed, q, def, open, toggle, remove }: { ed: CharEditor; q: CreatureQuality; def?: MagicQualityDef; open: boolean; toggle: () => void; remove: () => void }) {
  const { c, data, update } = ed;
  const r = QUALITY_RULES[q.id] ?? {};
  if (!c || !def) return null;
  const setQ = (fn: (x: CreatureQuality) => void) => update((y) => void fn(y.creature!.magicCharacter!.qualities.find((x) => x.uid === q.uid)!));
  const vfOptions = r.vf
    ? data.virtuesFlaws.filter((v) => v.kind === r.vf!.kind && v.sizes.includes(r.vf!.size) && (v.categories.includes('General') || v.categories.includes('Supernatural')))
    : [];
  const chooseVf = (id: string) =>
    update((y) => {
      const qq = y.creature!.magicCharacter!.qualities.find((x) => x.uid === q.uid)!;
      if (qq.virtueUid) removeVirtue(y, data, qq.virtueUid);
      qq.virtueUid = undefined;
      qq.param = id || undefined;
      if (id) {
        const extra = r.vf!.kind === 'virtue' ? { free: true, freeReason: def.name } : { noPoints: true, freeReason: def.name };
        qq.virtueUid = addVirtue(y, data, id, r.vf!.size, undefined, extra).uid;
      }
    });
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="row">
        <span className="clickable" onClick={toggle}>
          {open ? '▾' : '▸'} <b>{def.name}</b>
        </span>
        <span className={`badge ${def.kind === 'quality' ? 'good' : 'bad'}`}>
          {def.size} {def.kind} ({def.kind === 'quality' ? '−' : '+'}
          {POINTS[def.size]})
        </span>
        {r.param === 'characteristic' && (
          <select value={q.param ?? ''} onChange={(e) => setQ((x) => void (x.param = e.target.value || undefined))}>
            <option value="">— Characteristic —</option>
            {CHARACTERISTICS.map((ch) => (
              <option key={ch} value={ch}>
                {CHAR_NAMES[ch]}
              </option>
            ))}
          </select>
        )}
        {r.param === 'form' && (
          <select value={q.param ?? ''} onChange={(e) => setQ((x) => void (x.param = e.target.value || undefined))}>
            <option value="">— Form —</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
        )}
        {r.param === 'text' && <input value={q.param ?? ''} placeholder="natural weapon" onChange={(e) => setQ((x) => void (x.param = e.target.value || undefined))} />}
        {r.vf && (
          <select value={q.param ?? ''} onChange={(e) => chooseVf(e.target.value)} aria-label={`${def.name}: choice`}>
            <option value="">— {r.vf.size} {r.vf.kind} —</option>
            {vfOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        <span style={{ flex: 1 }} />
        {r.note && <span className="small muted">{r.note}</span>}
        <button className="small ghost" title="Remove" onClick={remove}>
          ✕
        </button>
      </div>
      {open && <Markdown text={def.text} className="small" />}
    </div>
  );
}
