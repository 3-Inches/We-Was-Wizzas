// Elementalists (Hedge Magic, Revised Edition, Chapter Two). On Game Table › Dice › Hedge magic:
// Summoning, Controlling and Divining rolled with the Forms chosen (and vis of the element), what the
// total reaches for the type of target, its Fatigue. On the Seasons page: a season's Refining, the
// longevity potion, vis extracted from an aura or moved, a being's Might restored or drained, its vis
// from the purse or the covenant's stores.

import { useState } from 'react';
import { ELEMENTS, ELEMENTAL_TECHNIQUES, type ElementId, type ElementalTechniqueId, type ElementalType } from '../../data/hedgeElemental';
import { describeStress, stressDie } from '../../engine/dice';
import {
  characteristicPotion, controlledEmotion, controlledSoak, elementVisArt, formFor, POTION_CHARACTERISTICS, diviningAid, elementalArts, elementalBotchDice, elementalTotal, elementalVisLimit, longevityPotion, moveVis, potionVisOk, refineMight, refiningExtraction, refiningVisArts, THEURGY_REALMS, type MightRelation, summoningNeeds, summoningReach,
} from '../../engine/elementalMagic';
import { putInto, spendFrom } from '../../engine/vis';
import { refiningTold } from '../../engine/seasonTold';
import { useSeasonWork, useVisSource } from '../seasonWork';
import type { AuraState } from '../../engine/magic';
import { Card, Field, Stepper, Total, signed } from '../kit';
import { ARTS, ART_NAMES, CHAR_NAMES, type Art } from '../../data';
import type { CharEditor } from '../character/useChar';
import { gainWarping, nowOf } from '../../engine/warping';

function Lines({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="log small" aria-live="polite">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

function ElementPicker({ forms, value, onChange }: { forms: { id: ElementId; name: string; score: number }[]; value: ElementId[]; onChange: (v: ElementId[]) => void }) {
  return (
    <div className="row small" role="group" aria-label="Elements">
      <span>Elements:</span>
      {forms.map((f) => (
        <label key={f.id} className="inline">
          <input type="checkbox" checked={value.includes(f.id)} onChange={(e) => onChange(e.target.checked ? [...value, f.id] : value.filter((x) => x !== f.id))} /> {f.name.replace('Elementalist ', '')} {f.score}
        </label>
      ))}
    </div>
  );
}

/** What a rolled total does for a Technique and a type of target. */
function outcome(technique: ElementalTechniqueId, type: ElementalType, total: number, might: number, size: number): string {
  const reach = summoningReach(total);
  if (technique === 'summoning') {
    const need = summoningNeeds(might, size);
    return `${total >= need ? 'It comes' : `Too weak: it needs ${need}`} (the total reaches Might ${reach.might} and Size ${reach.size >= 0 ? '+' : ''}${reach.size}, ${reach.note}). ${type === 'Theurgical' ? 'An elemental is brought into being from the material at hand; it is wild unless held in a prepared container.' : type === 'Philosophical' ? 'The element, or animals of its temperament, come to the elementalist’s reach.' : 'The humors are drawn in or out: a disease cured, a crisis resolved, or a disease caused.'}`;
  }
  if (technique === 'controlling') {
    if (type === 'Medicinal') return `An emotion of the element as a Personality Trait of ±${controlledEmotion(total)}; or a command to a spirit within a body, if the total beats its Might (${might}).`;
    if (type === 'Philosophical') return `+${controlledSoak(total)} Soak against the material while concentrating; an animal of the temperament obeys if the total beats its Might and Size (${summoningNeeds(might, size)}).`;
    return total >= might ? `The being (Might ${might}) carries out one command, or is banished. It must penetrate, unless held in its container (the effect then counts as level 0).` : `Too weak against Might ${might}.`;
  }
  if (technique === 'divining') {
    const sense = `It senses targets up to Size ${reach.size >= 0 ? '+' : ''}${reach.size} within a hundred paces, and vis of the element.`;
    if (type === 'Medicinal') return `${sense} Ministering through a recovery: +${diviningAid(total)} magical aid.`;
    return sense;
  }
  return '';
}

export function ElementalCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const arts = c && d ? elementalArts(c, d) : { techniques: [], forms: [] };
  const rollable = arts.techniques.filter((t) => t.id !== 'refining');
  const [tech, setTech] = useState<ElementalTechniqueId>(rollable[0]?.id ?? 'summoning');
  const [type, setType] = useState<ElementalType | ''>('');
  const [els, setEls] = useState<ElementId[]>(arts.forms[0] ? [arts.forms[0].id] : []);
  const [vis, setVis] = useState(0);
  const [might, setMight] = useState(10);
  const [size, setSize] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d || !rollable.length) return null;
  const t = rollable.find((x) => x.id === tech) ?? rollable[0];
  const ty = (type && t.types.includes(type) ? type : t.types[0]) ?? 'Philosophical';
  const def = ELEMENTAL_TECHNIQUES.find((x) => x.id === t.id)!;
  const visMax = elementalVisLimit(d);
  const tot = elementalTotal(c, d, t.id, els, aura, { vis: Math.min(vis, visMax) });
  const roll = () => {
    const r = stressDie(elementalBotchDice(tot, vis, visMax));
    const botch = r.zero && r.botches > 0;
    const total = tot.total + r.value;
    const out = [`${t.name} (${ty}): stress die ${describeStress(r)} + ${tot.total} = ${total}.`];
    out.push(botch ? `BOTCH ×${r.botches}: the power runs wild: the target comes without safeguards, something else answers, or the humors are thrown out of balance (sickness or injury).` : outcome(t.id, ty, total, might, size));
    update((x) => {
      if (t.id === 'summoning') x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + 1);
      if (t.id === 'controlling') x.fatigueLost = Math.min(5, x.fatigueLost + 1);
      if (botch) gainWarping(x, d, { points: r.botches, why: `from a botched ${t.name}`, botch: true, ...nowOf(ed.saga) });
    });
    if (def.cost !== 'no Fatigue') out.push(`Cost: ${def.cost}.`);
    setLines(out);
  };
  return (
    <Card title="Elemental magic" tour="hedge-elemental" fold="hedge-elemental" summary={`${t.name} (${ty}), ${els.length ? els.join(' + ') : 'no element'}`}>
      <div className="row">
        <Field label="Technique" hint={def.text}>
          <select value={t.id} onChange={(e) => ((setTech(e.target.value as ElementalTechniqueId)), setType(''))}>
            {rollable.map((x) => (
              <option key={x.id} value={x.id}>{x.name} {x.score}</option>
            ))}
          </select>
        </Field>
        <Field label="Type of target">
          <select value={ty} onChange={(e) => setType(e.target.value as ElementalType)}>
            {(t.types.length ? t.types : ['Philosophical' as const]).map((x) => (
              <option key={x} value={x}>{x}: {TYPE_GLOSS[x]}</option>
            ))}
          </select>
        </Field>
        <Field label="Vis" hint={`+2 a pawn of the element's vis (Aquam, Auram, Ignem, Terram), up to ${visMax} (the four Forms); a botch die each. Take it from the purse by hand.`}>
          <Stepper value={Math.min(vis, visMax)} min={0} max={visMax} width={32} onChange={setVis} />
        </Field>
      </div>
      <ElementPicker forms={arts.forms} value={els} onChange={setEls} />
      {t.id !== 'divining' && (
        <div className="row">
          <Field label="The target's Might" hint="0 for a thing without Might">
            <Stepper value={might} min={0} max={100} width={36} onChange={setMight} />
          </Field>
          {(t.id === 'summoning' || ty === 'Philosophical') && (
            <Field label="Its Size">
              <Stepper value={size} min={-21} max={21} width={36} onChange={setSize} />
            </Field>
          )}
        </div>
      )}
      <p className="small">
        Total <Total value={tot.total} parts={tot.parts} label={`${t.name} total`} /> + stress die. Cost: {def.cost}.
        {t.id === 'summoning' ? ` Needs ${summoningNeeds(might, size)} for Might ${might} and Size ${size}.` : ''}
      </p>
      <button onClick={roll} disabled={!els.length}>
        Roll {t.name}
      </button>
      <Lines lines={lines} />
    </Card>
  );
}

/** What each type of elemental magic works on (HMRE, Elementalists). */
const TYPE_GLOSS: Record<ElementalType, string> = { Medicinal: 'bodies and their humors', Philosophical: 'natural things and animals', Theurgical: 'elemental spirits' };

type RefineWork = 'longevity' | 'characteristic' | 'extract' | 'move' | 'might' | 'other';

/** A season of Refining, on the Seasons page: its vis from the purse or the covenant's stores, vis drawn or moved put there. */
export function RefiningCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d } = ed;
  const arts = c && d ? elementalArts(c, d) : { techniques: [], forms: [] };
  const refining = arts.techniques.find((t) => t.id === 'refining');
  const [type, setType] = useState<ElementalType | ''>('');
  const [els, setEls] = useState<ElementId[]>(arts.forms[0] ? [arts.forms[0].id] : []);
  const [work, setWork] = useState<RefineWork>('longevity');
  const [pawns, setPawns] = useState(5);
  const [might, setMight] = useState(10);
  const [pool, setPool] = useState(10);
  const [relation, setRelation] = useState<MightRelation>('own');
  const [drainOther, setDrainOther] = useState(false);
  const [realmLore, setRealmLore] = useState<string>('magic-lore');
  const [forOther, setForOther] = useState(false);
  const [otherAge, setOtherAge] = useState(30);
  const [charac, setCharac] = useState<string>('');
  const [current, setCurrent] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const sw = useSeasonWork(ed);
  const ty = (refining && type && refining.types.includes(type) ? type : refining?.types[0]) ?? 'Philosophical';
  const elArt = elementVisArt(els[0] ?? 'air');
  // a potion takes the Forms of the elementalist's elements; moved vis may be of any Art
  const visArts: Art[] = work === 'move' ? [elArt, ...ARTS.filter((a) => a !== elArt)] : refiningVisArts(arts.forms.map((f) => f.id), ty);
  const src = useVisSource(c, sw.cov, visArts);
  const dest = useVisSource(c, sw.cov, [elArt]);
  if (!c || !d || !refining) return null;
  // the longevity potion takes the lowest Form as a requisite
  const potionEls = work === 'longevity' ? arts.forms.map((f) => f.id) : els;
  // a theurgist adds the Lore of the target's realm
  const tot = elementalTotal(c, d, 'refining', potionEls, aura, { type: ty, realmLore: ty === 'Theurgical' && work !== 'longevity' ? realmLore : undefined });
  const el = ELEMENTS.find((e) => e.id === els[0]);
  const opposed = el && ELEMENTS.find((e) => e.id === el.opposes);
  const others = el && ELEMENTS.filter((e) => e.id !== el.id && e.id !== el.opposes);
  const { year, busy } = sw;
  // the vis moved is of one Art, chosen: the element's own arrives whole, another's at half
  const moving = work === 'move' && src.arts.length === 1 ? src.arts[0] : undefined;
  const same = moving === elArt;
  // a physician makes the potions for another too: the vis follows the drinker's age
  const other = ty === 'Medicinal' && (forOther || work === 'characteristic');
  const age = other ? otherAge : c.age;
  const potion = longevityPotion(tot.total, age);
  const chars = el ? POTION_CHARACTERISTICS[el.id] : [];
  const ch = (chars as string[]).includes(charac) ? charac : chars[0];
  const cp = characteristicPotion(tot.total, formFor(c, d, els).value, current, age);
  const visLimit = elementalVisLimit(d);
  const potionShort = (work === 'longevity' || work === 'characteristic') && !potionVisOk(d, potion.vis);
  const result = (): string => {
    switch (work) {
      case 'longevity':
        return `A longevity potion${other ? ' for another' : ''}: +${potion.bonus} to Aging rolls until a crisis, for ${potion.vis} pawns of vis (the drinker's age ${age} ÷ 5).`;
      case 'characteristic':
        return `A potion for a year: ${ch ? CHAR_NAMES[ch as keyof typeof CHAR_NAMES] : 'a Characteristic'} ${signed(current)} → ${signed(cp.result)} (+${cp.bonus}, the total ÷ 5, but no higher than ${signed(cp.cap)}, half the Form). ${cp.vis} pawns of vis (the drinker's age ${age} ÷ 5).`;
      case 'extract':
        if (aura?.realm !== 'Magic') return 'No vis: it is drawn only from a magical aura, and this one is not.';
        return refiningExtraction(tot.total)
          ? `${refiningExtraction(tot.total)} pawn${refiningExtraction(tot.total) === 1 ? '' : 's'} of ${ELEMENTS.find((e) => e.id === els[0])?.hermetic ?? 'the element’s'} vis drawn from the aura (the Refining Total ÷ 10).`
          : `No vis from the aura: a pawn for each full 10 of the Refining Total, and it is ${tot.total}.`;
      case 'move': {
        const m = moveVis(tot.total, pawns, same);
        return m.ok ? `${pawns} pawns${moving ? ` of ${ART_NAMES[moving]}` : ''} moved; ${m.arrive} arrive as ${ART_NAMES[elArt]} vis${same ? '' : ', half the rest lost'}.` : `Too weak: moving ${pawns} pawns needs ${5 * pawns}.`;
      }
      case 'might': {
        const r = refineMight(tot.total, might, relation, { drain: drainOther, pool });
        if (!r.points) return `The total must beat the being’s Might (${might})${relation === 'other' ? ' by 2 or more' : ''}.`;
        return `${r.changed} Might Points ${r.drain ? 'drained' : 'restored'}${relation === 'other' ? ' (half the excess: another element)' : ''}${r.points > r.changed ? `; ${r.points - r.changed} more ${r.drain ? 'than it had' : 'than its pool holds'}` : ''}. ${r.vis ? `${r.vis} pawn${r.vis === 1 ? '' : 's'} of ${el?.hermetic ?? 'the element’s'} vis form${r.vis === 1 ? 's' : ''} in the material it animates.` : 'No vis forms.'}`;
      }
      default:
        return 'Another refining of the type, as the troupe rules.';
    }
  };
  const potionVis = work === 'longevity' ? potion.vis : work === 'characteristic' ? cp.vis : 0;
  const need = potionVis || (work === 'move' ? pawns : 0);
  // vis is extracted "from a magical aura" only (Hedge Magic, line 1324)
  const drawn = work === 'extract' && aura?.realm === 'Magic' ? refiningExtraction(tot.total) : 0;
  const moved = work === 'move' ? moveVis(tot.total, pawns, same) : undefined;
  // why the season cannot be refined as set, said beside the button
  const why =
    busy ? `${sw.season} ${year} is already spent.`
    : work !== 'longevity' && !els.length ? 'Choose the element.'
    : work === 'extract' && !drawn ? (aura?.realm !== 'Magic' ? 'It would draw no vis: the aura is not magical.' : 'It would draw no vis: the Refining Total must be 10 or more.')
    : potionShort ? `The potion needs ${potion.vis} pawns, but an elementalist can spend only ${visLimit} (the Elementalist Forms added together).`
    : work === 'move' && !moving ? 'Choose the vis to move (Of).'
    : work === 'move' && !moved?.ok ? `Moving ${pawns} pawns needs a Refining Total of ${5 * pawns}.`
    : need ? src.short(need) : undefined;
  const doSeason = () =>
    setLines(
      sw.work(`Elemental refining: ${work === 'longevity' ? 'a longevity potion' : work === 'characteristic' ? 'a potion of vigor' : work === 'extract' ? 'vis from the aura' : work === 'move' ? 'moving vis' : work === 'might' ? 'a being’s Might' : 'a refining'}`, 'elemental-refining', (x, cov) => {
        const out = [`Refining (${ty}): total ${tot.total}. ${result()}`];
        if (need) {
          const r = spendFrom(x, cov, src.place, src.arts, need);
          if (!r.ok) return { lines: [], refused: r.text };
          out.push(r.text);
        }
        if (drawn) out.push(putInto(x, cov, dest.place, elArt, drawn));
        if (moved?.ok) out.push(putInto(x, cov, src.place, elArt, moved.arrive));
        // the potion stands as the longevity ritual, unless the one already taken is better
        const kept = !!x.longevity && !x.longevity.lapsedYear && x.longevity.bonus >= potion.bonus;
        if (work === 'longevity' && !other && !kept && potion.bonus > 0) x.longevity = { labTotal: tot.total, bonus: potion.bonus, extraVis: 0, createdYear: year, createdBy: 'an elementalist’s longevity potion' };
        if (work === 'longevity' && other) out.push('Give the potion to its drinker and note it on their sheet.');
        if (work === 'characteristic') out.push('Note the potion on the drinker’s sheet.');
        if (work === 'longevity' && !other && potion.bonus > 0) out.push(kept ? 'The longevity ritual already taken is as good or better, and is kept.' : 'The potion is on the sheet as the character’s longevity ritual.');
        const mightDone = work === 'might' ? refineMight(tot.total, might, relation, { drain: drainOther, pool }) : undefined;
        const told = refiningTold(
          work === 'longevity' ? { work, forOther: other }
          : work === 'characteristic' ? { work, characteristic: ch ? CHAR_NAMES[ch as keyof typeof CHAR_NAMES] : '' }
          : work === 'extract' ? { work, pawns: drawn, art: el?.hermetic ?? 'the element’s' }
          : work === 'move' ? { work, pawns, arrive: moved?.arrive ?? 0, art: ART_NAMES[elArt] }
          : work === 'might' ? { work, points: mightDone?.changed ?? 0, drain: !!mightDone?.drain }
          : { work: 'other' },
        );
        return { lines: out, told, made: work === 'longevity' ? 'a longevity potion' : work === 'characteristic' ? 'a potion of vigor' : undefined };
      }),
    );
  const works: [RefineWork, string][] = [
    ['longevity', 'a longevity potion'],
    ...(ty === 'Medicinal' ? ([['characteristic', 'a potion that raises a Characteristic']] as [RefineWork, string][]) : []),
    ...(ty === 'Philosophical' ? ([['extract', 'vis from the aura'], ['move', 'moving vis']] as [RefineWork, string][]) : []),
    ...(ty === 'Theurgical' || ty === 'Philosophical' ? ([['might', 'a being’s Might']] as [RefineWork, string][]) : []),
    ['other', 'another refining'],
  ];
  return (
    <Card title="A season of Refining" tour="hedge-refining" fold="hedge-refining" summary={`Refining ${refining.score} (${ty})`}>
      <div className="row">
        <Field label="Type">
          <select value={ty} onChange={(e) => setType(e.target.value as ElementalType)}>
            {(refining.types.length ? refining.types : ['Philosophical' as const]).map((x) => (
              <option key={x} value={x}>{x}: {TYPE_GLOSS[x]}</option>
            ))}
          </select>
        </Field>
        <Field label="Work">
          <select value={work} onChange={(e) => setWork(e.target.value as RefineWork)}>
            {works.map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        {work === 'longevity' && ty === 'Medicinal' && (
          <label className="inline small">
            <input type="checkbox" checked={forOther} onChange={(e) => setForOther(e.target.checked)} /> for someone else
          </label>
        )}
        {other && (
          <Field label="The drinker's age" hint="Sets the vis: the age ÷ 5">
            <Stepper value={otherAge} min={1} max={150} width={36} onChange={setOtherAge} />
          </Field>
        )}
        {work === 'characteristic' && (
          <>
            <Field label="Characteristic" hint="Those the element's temperament governs">
              <select value={ch} onChange={(e) => setCharac(e.target.value)}>
                {chars.map((x) => (
                  <option key={x} value={x}>{CHAR_NAMES[x]}</option>
                ))}
              </select>
            </Field>
            <Field label="The drinker's score now">
              <Stepper value={current} min={-5} max={5} width={32} onChange={setCurrent} />
            </Field>
          </>
        )}
        {work === 'move' && (
          <Field label="Pawns">
            <Stepper value={pawns} min={1} max={50} width={32} onChange={setPawns} />
          </Field>
        )}
        {work === 'might' && (
          <>
            <Field label="The being's Might">
              <Stepper value={might} min={0} max={100} width={36} onChange={(v) => ((setMight(v)), setPool(Math.min(pool, v)))} />
            </Field>
            <Field label="Might Points it has now" hint="Its Might Pool, at most its Might Score">
              <Stepper value={Math.min(pool, might)} min={0} max={might} width={36} onChange={setPool} />
            </Field>
          </>
        )}
        {ty === 'Theurgical' && (work === 'might' || work === 'other') && (
          <Field label="The target's realm" hint="Its realm's Lore is added to the Refining Total">
            <select value={realmLore} onChange={(e) => setRealmLore(e.target.value)}>
              {THEURGY_REALMS.map((r) => (
                <option key={r.lore} value={r.lore}>{r.realm}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {work === 'might' && el && (
        <div className="row">
          <Field label={`The being's element, against ${el.name}`}>
            <select value={relation} onChange={(e) => setRelation(e.target.value as MightRelation)}>
              <option value="own">the same ({el.name.replace('Elementalist ', '')}): restores Might</option>
              <option value="opposed">the opposed one ({opposed?.name.replace('Elementalist ', '')}): drains Might</option>
              <option value="other">another ({others?.map((e) => e.name.replace('Elementalist ', '')).join(' or ')}): half, either way</option>
            </select>
          </Field>
          {relation === 'other' && (
            <label className="inline small">
              <input type="checkbox" checked={drainOther} onChange={(e) => setDrainOther(e.target.checked)} /> drain it (otherwise restore)
            </label>
          )}
        </div>
      )}
      {work !== 'longevity' && <ElementPicker forms={arts.forms} value={els} onChange={setEls} />}
      {(need > 0 || work === 'move') && <div className="row">{src.node()}</div>}
      {work === 'extract' && <div className="row">{dest.node(true)}</div>}
      <p className="small">
        Refining Total <Total value={tot.total} parts={tot.parts} label="Refining Total" /> (no die){work === 'longevity' ? ', the lowest Form a requisite' : ''}. {result()} {src.line(need)}
      </p>
      <button onClick={doSeason} disabled={!!why}>
        Refine (a season)
      </button>
      {why && <span className="small muted"> {why}</span>}
      <Lines lines={lines} />
    </Card>
  );
}
