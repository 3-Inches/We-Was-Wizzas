// A companion Flaw's own character sheet, and the creature details for that sheet: the core
// rules' guidelines (DE Chapter 13, Magical Being Companion) or the full Magic Character Creation
// rules of Realms of Power: Magic (Season, Might by power level, Qualities and Inferiorities).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ART_NAMES, CHARACTERISTICS, CHAR_NAMES, FORMS, type Art, type Characteristic } from '../../../data';
import { addQualities, addVirtue, newCharacter, removeQualities, removeQualityUid, removeVirtue, syncQualityAbilities } from '../../../engine/character/factory';
import {
  COMPANION_FLAWS, MAGIC_QUALITIES, MAGIC_QUALITY_BY_ID, MIGHT_BY_POWER, POINTS, QUALITY_RULES, SEASON_XP, groupQualities, newMagicCharacter, trueFormName, trueFormTrait,
  type MagicCharacterDerived, type MagicQualityDef,
} from '../../../engine/character/magicCharacter';
import { powerSpending } from '../../../engine/character/powers';
import type { Character, CreatureInfo, MagicCharacterInfo, MagicSeason, PowerLevel } from '../../../engine/types';
import { useGoto } from '../CharIssues';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Card, Field, Markdown, Meter, Stepper, Total, signed } from '../../kit';
import type { CharEditor } from '../useChar';
import { uid } from '../../../util/id';

export { COMPANION_FLAWS };

type QualityGroup = ReturnType<typeof groupQualities>[number];

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
      // its true form, an Essential Trait typically +3 (RoP: Magic, Finishing Touches)
      const form = trueFormName(cv.param);
      if (form) x.personality.unshift({ uid: uid(), trait: `${form}*`, score: 3 });
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
          <Stepper value={cr.size} min={-21} max={10} width={46} onChange={(v) => set((x) => void (x.size = v))} />
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
  const [addParam, setAddParam] = useState('');
  const [addCount, setAddCount] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  if (!c?.creature || !d?.magicChar) return null;
  const cr = c.creature;
  const mc = d.magicChar;
  const setMc = (fn: (x: MagicCharacterInfo) => void) => update((y) => void fn(y.creature!.magicCharacter!));
  const suggested = MIGHT_BY_POWER[mcInfo.powerLevel][cr.intelligence];
  const grog = cr.intelligence === 'grog';
  const pickable = MAGIC_QUALITIES.filter((q) => (!grog || q.size === 'Minor') && (QUALITY_RULES[q.id]?.repeatable || !mcInfo.qualities.some((x) => x.id === q.id)));
  const addDef = adding ? MAGIC_QUALITY_BY_ID.get(adding) : undefined;
  const addRule = adding ? QUALITY_RULES[adding] ?? {} : {};
  const groups = groupQualities(mcInfo.qualities);
  // the realm's own Virtues and Flaws (RoP: Magic), taken through a Virtue or Flaw Quality in one step
  const realmVf = data.virtuesFlaws
    .filter((v) => (v.source.book === 'RoP_M' || v.alsoIn?.some((a) => a.book === 'RoP_M')) && !MAGIC_QUALITY_BY_ID.has(v.id) && (v.categories.includes('General') || v.categories.includes('Supernatural')))
    .filter((v) => (v.sizes.includes('Minor') || (!grog && v.sizes.includes('Major'))) && (v.repeatable || !mcInfo.qualities.some((q) => q.param === v.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const add = () => {
    if (adding.startsWith('vf:')) {
      const v = data.vfById.get(adding.slice(3))!;
      const size = v.sizes.includes('Minor') ? 'Minor' : 'Major';
      const qid = `${size.toLowerCase()}-${v.kind === 'virtue' ? 'virtue' : 'flaw-inferiority'}`;
      update((y) => {
        addQualities(y, data, qid, 1);
        const qq = [...y.creature!.magicCharacter!.qualities].reverse().find((x) => x.id === qid && !x.virtueUid)!;
        qq.param = v.id;
        const extra = v.kind === 'virtue' ? { free: true, freeReason: MAGIC_QUALITY_BY_ID.get(qid)?.name } : { noPoints: true, freeReason: MAGIC_QUALITY_BY_ID.get(qid)?.name };
        qq.virtueUid = addVirtue(y, data, v.id, size, undefined, extra).uid;
      });
      setAdding('');
      return;
    }
    update((y) => void addQualities(y, data, adding, addRule.repeatable ? addCount : 1, addParam || undefined));
    setAdding('');
    setAddParam('');
    setAddCount(1);
  };
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <MagicSteps ed={ed} />
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
        Experience: {mc.xpParts.map((p) => `${p.label} ${p.value}`).join(', ')} = {mc.xp} xp (in the Season pool). Size {mc.size} changes Strength by {mc.str >= 0 ? '+' : ''}
        {mc.str} and Quickness by {mc.qik >= 0 ? '+' : ''}
        {mc.qik}. It does not age, eat or sleep, and its Might is subtracted from every Advancement Total.
      </div>
      {mc.inherent.length > 0 && (
        <div className="small">
          <b>Inherent:</b> {mc.inherent.map((i) => (i.id === 'monstrous-appearance-inferiority' && !mc.monstrous ? 'Monstrous Appearance (hidden by Natural Appearance)' : i.label)).join('; ')}
        </div>
      )}
      <div>
        {groups.map((g) => (
          <QualityRow key={g.key} ed={ed} g={g} def={MAGIC_QUALITY_BY_ID.get(g.id)} open={open === g.key} toggle={() => setOpen(open === g.key ? null : g.key)} />
        ))}
      </div>
      <div className="row small">
        <select value={adding} onChange={(e) => (setAdding(e.target.value), setAddParam(''))} aria-label="Quality or Inferiority">
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
          {(['virtue', 'flaw'] as const).map((k) => (
            <optgroup key={k} label={k === 'virtue' ? 'The realm’s Virtues (as a Virtue Quality)' : 'The realm’s Flaws (as a Flaw Inferiority)'}>
              {realmVf
                .filter((v) => v.kind === k)
                .map((v) => {
                  const size = v.sizes.includes('Minor') ? 'Minor' : 'Major';
                  return (
                    <option key={v.id} value={`vf:${v.id}`}>
                      {v.name} ({size} {k === 'virtue' ? 'Virtue' : 'Flaw'}, {POINTS[size]})
                    </option>
                  );
                })}
            </optgroup>
          ))}
        </select>
        {addRule.param === 'characteristic' && (
          <select value={addParam} onChange={(e) => setAddParam(e.target.value)} aria-label="Characteristic">
            <option value="">— Characteristic —</option>
            {CHARACTERISTICS.map((ch) => {
              const why = charBlock(adding, ch, mc);
              return (
                <option key={ch} value={ch} disabled={!!why}>
                  {CHAR_NAMES[ch]} {signed(mc.preSize?.[ch] ?? 0)}
                  {why ? ` — ${why}` : ''}
                </option>
              );
            })}
          </select>
        )}
        {addRule.param === 'form' && (
          <select value={addParam} onChange={(e) => setAddParam(e.target.value)} aria-label="Form">
            <option value="">— Form —</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
        )}
        {addRule.repeatable && (
          <label className="inline">
            ×
            <Stepper value={addCount} min={1} max={99} width={44} onChange={setAddCount} title="How many to add" />
          </label>
        )}
        <button className="small" disabled={!adding || (addRule.param === 'characteristic' && !addParam)} onClick={add}>
          + Add{addRule.repeatable && addCount > 1 ? ` ${addCount}` : ''}
        </button>
        {addDef && (
          <span className="muted">
            {addDef.kind === 'quality' ? 'costs' : 'gives'} {POINTS[addDef.size] * (addRule.repeatable ? addCount : 1)} point{POINTS[addDef.size] * (addRule.repeatable ? addCount : 1) === 1 ? '' : 's'}
            {addRule.note ? `; ${addRule.note}` : ''}
          </span>
        )}
        {grog && <span className="muted">A grog-level character takes only Minor Qualities and Inferiorities.</span>}
      </div>
    </div>
  );
}

/** Why Improved or Reduced (Characteristic) cannot be taken for a Characteristic, if it cannot. */
function charBlock(id: string, ch: Characteristic, mc: MagicCharacterDerived): string | null {
  const v = mc.preSize?.[ch];
  if (v === undefined) return null;
  if (id === 'improved-characteristic' && v < 5) return 'needs +5 or more first';
  if (id === 'reduced-characteristic-inferiority') {
    if (!mc.poor.includes(ch)) return 'needs Poor (Characteristic)';
    if (v > -5) return 'needs −5 or less first';
  }
  return null;
}

/** The order of Magic Character Creation (RoP: Magic), with where each part is done and how far it has got. */
function MagicSteps({ ed }: { ed: CharEditor }) {
  const { c, d } = ed;
  const goto = useGoto(ed);
  if (!c || !d?.magicChar) return null;
  const mc = d.magicChar;
  const t = d.tally;
  const season = d.budgets.find((b) => b.id === 'laterLife');
  const used = Object.values(powerSpending(c.powers)).reduce((s, n) => s + (n ?? 0), 0);
  const levels = Object.values(d.powerBudgets).reduce((s, n) => s + (n ?? 0), 0);
  const status = (done: boolean, text: string) => (
    <span className={done ? 'good-text' : 'muted'}>
      {done ? '✓ ' : ''}
      {text}
    </span>
  );
  return (
    <details className="small" open={!c.creation.finalized}>
      <summary>
        <b>Building a magic character</b> (Realms of Power: Magic): this card holds its Size, Season, Might and Qualities; the rest is made as for any character.
      </summary>
      <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
        <li>
          <b>Concept:</b> the true form below stands for the Special Virtue (Magic Animal, Human, Spirit or Thing). Characteristics take 7 points, none above +3 or below −3,
          before Size; then Virtues and Flaws as usual, with a magical Social Status.{' '}
          {status(d.charPointsSpent === d.charPointsBudget, `Characteristics ${d.charPointsSpent} of ${d.charPointsBudget}`)} ·{' '}
          {status(t.virtuePoints === t.allowedVirtuePoints && t.flawPoints > 0, `Virtues ${t.virtuePoints} of ${t.allowedVirtuePoints}`)}{' '}
          <button className="small ghost" onClick={() => goto('characteristics')}>
            Characteristics
          </button>
          <button className="small ghost" onClick={() => goto('virtues')}>
            Virtues &amp; Flaws
          </button>
        </li>
        <li>
          <b>Season and Abilities:</b> the Season&apos;s experience (and Improved Abilities) buys Abilities the Virtues allow. There is no free native language: any
          language it knows is bought from this experience (the book&apos;s talking horse Aeolus took Living Language 4). A magic animal also needs Gift of Speech to talk.{' '}
          {season && status(season.spent === season.total, `${season.spent} of ${season.total} xp`)}{' '}
          <button className="small ghost" onClick={() => goto('abilities')}>
            Abilities
          </button>
        </li>
        <li>
          <b>Might and Qualities</b> (here): Quality points equal the starting Might; Inferiorities give more. {status(mc.points.spent === mc.points.budget, `${mc.points.spent} of ${mc.points.budget} points`)}
        </li>
        <li>
          <b>Powers:</b> design them with the levels the power Qualities give, under Supernatural powers (Virtues step, or the Abilities tab). Improved Powers gives mastery
          points to spend there. {levels > 0 && status(used === levels, `${used} of ${levels} levels`)}
        </li>
        <li>
          <b>Finishing touches:</b> Confidence (1 and 3 points if not a grog, plus Improved Confidence), Personality Traits with an Essential Trait for its true form (such as
          &ldquo;Cat* +3&rdquo;), equipment and inherent vis. {status(!!trueFormTrait(c), trueFormTrait(c) ? `${trueFormTrait(c)!.trait} ${trueFormTrait(c)!.score >= 0 ? '+' : ''}${trueFormTrait(c)!.score}` : 'no true form yet')}{' '}
          <button className="small ghost" onClick={() => goto('personality')}>
            Personality
          </button>
        </li>
      </ol>
    </details>
  );
}

function QualityRow({ ed, g, def, open, toggle }: { ed: CharEditor; g: QualityGroup; def?: MagicQualityDef; open: boolean; toggle: () => void }) {
  const { c, d, data, update } = ed;
  const r = QUALITY_RULES[g.id] ?? {};
  if (!c || !def || !d?.magicChar) return null;
  const n = g.items.length;
  const q = g.items[0];
  const problem = d.magicChar.issues.find((i) => i.remove && i.remove.id === g.id && (i.remove.param ?? '') === (g.param ?? ''));
  const setParam = (value: string) =>
    update((y) => {
      for (const it of y.creature!.magicCharacter!.qualities) if (g.items.some((x) => x.uid === it.uid)) it.param = value || undefined;
      syncQualityAbilities(y, data);
    });
  const setCount = (want: number) =>
    update((y) => {
      if (want > n) addQualities(y, data, g.id, want - n, g.param);
      else removeQualities(y, data, g.id, g.param, n - want);
    });
  const vfOptions = r.vf
    ? data.virtuesFlaws.filter((v) => v.kind === r.vf!.kind && v.sizes.includes(r.vf!.size) && (v.categories.includes('General') || v.categories.includes('Supernatural')))
    : [];
  const chooseVf = (id: string) =>
    update((y) => {
      const qq = y.creature!.magicCharacter!.qualities.find((x) => x.uid === q.uid)!;
      // let go of the old choice first, so removing it does not take the Quality with it
      const old = qq.virtueUid;
      qq.virtueUid = undefined;
      if (old) removeVirtue(y, data, old);
      qq.param = id || undefined;
      if (id) {
        const extra = r.vf!.kind === 'virtue' ? { free: true, freeReason: def.name } : { noPoints: true, freeReason: def.name };
        qq.virtueUid = addVirtue(y, data, id, r.vf!.size, undefined, extra).uid;
      }
    });
  const pts = POINTS[def.size] * n;
  // copies the rules do not allow give no points (they still cost, for a Quality)
  const counted = def.kind === 'inferiority' ? POINTS[def.size] * (n - (problem?.remove?.count ?? 0)) : pts;
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="row">
        <span className="clickable" onClick={toggle}>
          {open ? '▾' : '▸'} <b>{def.name}</b>
        </span>
        {r.repeatable && !r.vf ? (
          <label className="inline small" title="How many times it is taken">
            ×
            <Stepper value={n} min={0} max={99} width={44} onChange={setCount} />
          </label>
        ) : null}
        <span className={`badge ${def.kind === 'quality' ? 'good' : 'bad'}`}>
          {def.size} {def.kind} ({def.kind === 'quality' ? '−' : '+'}
          {counted}
          {counted !== pts ? ` of ${pts}` : ''})
        </span>
        {r.param === 'characteristic' && (
          <select value={g.param ?? ''} onChange={(e) => setParam(e.target.value)}>
            <option value="">— Characteristic —</option>
            {CHARACTERISTICS.map((ch) => {
              const why = charBlock(g.id, ch, d.magicChar!);
              return (
                <option key={ch} value={ch} disabled={!!why && ch !== g.param}>
                  {CHAR_NAMES[ch]} {signed(d.magicChar!.preSize?.[ch] ?? 0)}
                  {why ? ` — ${why}` : ''}
                </option>
              );
            })}
          </select>
        )}
        {r.param === 'form' && (
          <select value={g.param ?? ''} onChange={(e) => setParam(e.target.value)}>
            <option value="">— Form —</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {ART_NAMES[f]}
              </option>
            ))}
          </select>
        )}
        {r.param === 'text' && <input value={g.param ?? ''} placeholder="natural weapon" onChange={(e) => setParam(e.target.value)} />}
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
        <button className="small ghost" title={n > 1 ? `Remove all ${n}` : 'Remove'} onClick={() => update((y) => void (r.vf ? removeQualityUid(y, data, q.uid) : removeQualities(y, data, g.id, g.param, n)))}>
          ✕
        </button>
      </div>
      {problem?.remove && (
        <div className="row small">
          <span className={problem.severity === 'error' ? 'bad-text' : 'warn-text'}>{problem.text}</span>
          <button className="small" onClick={() => update((y) => void removeQualities(y, data, g.id, g.param, problem.remove!.count))}>
            Remove {problem.remove.count === n ? (n === 1 ? 'it' : `all ${n}`) : problem.remove.count}
          </button>
        </div>
      )}
      {open && <Markdown text={def.text} className="small" />}
    </div>
  );
}
