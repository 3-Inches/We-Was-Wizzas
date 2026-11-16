// Game Table › Dice › Hedge magic, for elementalists (Hedge Magic, Revised Edition, Chapter Two):
// Summoning, Controlling and Divining rolled with the Forms chosen (and vis of the element), what the
// total reaches for the type of target, its Fatigue; and a season's Refining: the longevity potion, vis
// extracted from an aura or moved, a being's Might restored or drained.

import { useState } from 'react';
import { ELEMENTS, ELEMENTAL_TECHNIQUES, type ElementId, type ElementalTechniqueId, type ElementalType } from '../../data/hedgeElemental';
import { describeStress, stressDie } from '../../engine/dice';
import {
  controlledEmotion, controlledSoak, diviningAid, elementalArts, elementalTotal, elementalVisLimit, longevityPotion, moveVis, refineMight, refiningExtraction, summoningNeeds, summoningReach,
} from '../../engine/elementalMagic';
import { applySeason, newSeasonEntry } from '../../engine/longterm';
import { seasonBusy } from '../../engine/time';
import type { AuraState } from '../../engine/magic';
import { Card, Field, Stepper, Total } from '../kit';
import type { CharEditor } from '../character/useChar';

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
    const r = stressDie(1 + tot.auraBotch + Math.min(vis, visMax));
    const botch = r.zero && r.botches > 0;
    const total = tot.total + r.value;
    const out = [`${t.name} (${ty}): stress die ${describeStress(r)} + ${tot.total} = ${total}.`];
    out.push(botch ? `BOTCH ×${r.botches}: the power runs wild: the target comes without safeguards, something else answers, or the humors are thrown out of balance (sickness or injury).` : outcome(t.id, ty, total, might, size));
    update((x) => {
      if (t.id === 'summoning') x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + 1);
      if (t.id === 'controlling') x.fatigueLost = Math.min(5, x.fatigueLost + 1);
      if (botch) x.warpingPoints += r.botches;
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
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Vis" hint={`+2 a pawn of the element's vis (Aquam, Auram, Ignem, Terram), up to ${visMax} (the four Forms); a botch die each`}>
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

type RefineWork = 'longevity' | 'extract' | 'move' | 'might' | 'other';

export function RefiningCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update, saga } = ed;
  const arts = c && d ? elementalArts(c, d) : { techniques: [], forms: [] };
  const refining = arts.techniques.find((t) => t.id === 'refining');
  const [type, setType] = useState<ElementalType | ''>('');
  const [els, setEls] = useState<ElementId[]>(arts.forms[0] ? [arts.forms[0].id] : []);
  const [work, setWork] = useState<RefineWork>('longevity');
  const [pawns, setPawns] = useState(5);
  const [same, setSame] = useState(true);
  const [might, setMight] = useState(10);
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d || !refining) return null;
  const ty = (type && refining.types.includes(type) ? type : refining.types[0]) ?? 'Philosophical';
  // the longevity potion takes the lowest Form as a requisite
  const potionEls = work === 'longevity' ? arts.forms.map((f) => f.id) : els;
  const tot = elementalTotal(c, d, 'refining', potionEls, aura, { type: ty });
  const year = saga?.currentYear ?? 1220;
  const season = saga?.currentSeason ?? 'Spring';
  const busy = seasonBusy(c, year, season);
  const potion = longevityPotion(tot.total, c.age);
  const result = (): string => {
    switch (work) {
      case 'longevity':
        return `A longevity potion: +${potion.bonus} to Aging rolls until a crisis, for ${potion.vis} pawns of vis (the age ÷ 5).${ty === 'Medicinal' ? ' A physician can make it for another.' : ''}`;
      case 'extract':
        return `${refiningExtraction(tot.total)} pawns of ${ELEMENTS.find((e) => e.id === els[0])?.hermetic ?? 'the element’s'} vis drawn from the aura.`;
      case 'move': {
        const m = moveVis(tot.total, pawns, same);
        return m.ok ? `${pawns} pawns moved; ${m.arrive} arrive as the element’s vis.` : `Too weak: moving ${pawns} pawns needs ${5 * pawns}.`;
      }
      case 'might': {
        const r = refineMight(tot.total, might);
        return r.points ? `${r.points} Might Points restored (the being’s own element) or drained (the opposed one); ${r.vis} pawns of vis form.` : `The total must beat the being’s Might (${might}).`;
      }
      default:
        return 'Another refining of the type, as the troupe rules.';
    }
  };
  const doSeason = () => {
    const text = `Refining (${ty}): total ${tot.total}. ${result()}`;
    update((x) => {
      // the potion stands as the longevity ritual, unless the one already taken is better
      if (work === 'longevity' && potion.bonus > (x.longevity?.lapsedYear ? 0 : (x.longevity?.bonus ?? 0))) x.longevity = { labTotal: tot.total, bonus: potion.bonus, extraVis: 0, createdYear: year, createdBy: 'an elementalist’s longevity potion' };
      const ab = x.abilities.find((a) => a.abilityId === 'elemental-refining');
      const e = newSeasonEntry(year, season, 'other', `Elemental refining: ${work === 'longevity' ? 'a longevity potion' : work === 'extract' ? 'vis from the aura' : work === 'move' ? 'moving vis' : work === 'might' ? 'a being’s Might' : 'a refining'}`, ab ? { [`ability:${ab.uid}`]: 2 } : {});
      e.notes = text;
      applySeason(x, e, 1);
      x.seasonLog.push(e);
    });
    const kept = !!c.longevity && !c.longevity.lapsedYear && c.longevity.bonus >= potion.bonus;
    setLines([text, `${season} ${year} logged${work === 'longevity' && potion.bonus > 0 ? (kept ? '; the longevity ritual already taken is as good or better, and is kept' : '; the potion is on the sheet as the character’s longevity ritual') : ''}. Take the vis from the stores by hand.`]);
  };
  const works: [RefineWork, string][] = [
    ['longevity', 'a longevity potion'],
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
              <option key={x} value={x}>{x}</option>
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
        {work === 'move' && (
          <>
            <Field label="Pawns">
              <Stepper value={pawns} min={1} max={50} width={32} onChange={setPawns} />
            </Field>
            <label className="inline small">
              <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} /> already the element&apos;s vis
            </label>
          </>
        )}
        {work === 'might' && (
          <Field label="The being's Might">
            <Stepper value={might} min={0} max={100} width={36} onChange={setMight} />
          </Field>
        )}
      </div>
      {work !== 'longevity' && <ElementPicker forms={arts.forms} value={els} onChange={setEls} />}
      <p className="small">
        Refining Total <Total value={tot.total} parts={tot.parts} label="Refining Total" /> (no die){work === 'longevity' ? ', the lowest Form a requisite' : ''}. {result()}
      </p>
      <button onClick={doSeason} disabled={busy || (work !== 'longevity' && !els.length)} title={busy ? `${season} ${year} is already spent` : undefined}>
        Refine (a season)
      </button>
      {busy && <span className="small muted"> {season} {year} is already spent.</span>}
      <Lines lines={lines} />
    </Card>
  );
}
