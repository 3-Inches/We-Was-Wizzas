// A covenant's own enchanted devices, bought with Build Points (Covenants ch.2): the lesser devices
// that do its covenfolk's work (Covenants ch.4, Lesser Enchanted Devices), each magnitude saving a
// servant or a pound a year (Covenants ch.5, Cost Saving); items for its laboratories that give them
// a Virtue or better Characteristics, installed without taking space (Covenants ch.3, Magic Items for
// Laboratories); and a weapon for its turb. Within the power level's highest effect level, as the DE
// base packages spend them: a good share on lesser devices of level 20 or lower. Seeded.

import type { Rng } from '../dice';
import type { Art, Form, Technique } from '../../data';
import type { Character, Covenant, EnchantedEffectRecord, EnchantedItem, LabVirtueEntry } from '../types';
import { uid } from '../../util/id';
import { pick } from './random';

interface Template {
  id: string;
  name: string;
  material: string;
  size: EnchantedItem['size'];
  role: 'folk' | 'lab' | 'turb';
  effect: { technique: Technique; form: Form; requisites?: Art[]; level: number; range: string; duration: string; target: string; uses: string; penetration?: number; concentration?: boolean; environmental?: boolean; text: string };
  /** it does the covenfolk's work: a servant, or a pound a year, a magnitude */
  serves?: 'servants' | 'pounds';
  /** the Virtue (or free-form gains) it gives the lab it is installed in */
  lab?: Omit<LabVirtueEntry, 'uid' | 'fromItem'>;
  /** more than one may be useful (several ploughs for a large estate) */
  many?: boolean;
  ref: string;
}

const CH4 = 'Covenants ch.4, Lesser Enchanted Devices';
const CH3 = 'Covenants ch.3, Magic Items for Laboratories';

export const COVENANT_ITEMS: Template[] = [
  { id: 'oven', name: 'Magical Oven', material: 'iron and fire-brick', size: 'medium', role: 'folk', serves: 'pounds', ref: CH4,
    effect: { technique: 'Cr', form: 'Ig', level: 20, range: 'Personal', duration: 'Concentration', target: 'Individual', uses: '24', concentration: true, text: 'On command the hollow box grows red-hot until sunset or the command to stop: no fuel and no fire to tend.' } },
  { id: 'chef', name: 'The Enchanted Chef', material: 'iron pot', size: 'medium', role: 'folk', serves: 'servants', ref: CH4,
    effect: { technique: 'Re', form: 'He', requisites: ['An', 'Aq', 'Ig'], level: 45, range: 'Touch', duration: 'Momentary', target: 'Group', uses: '24', text: 'Food placed inside is prepared as a cook would to the recipe described: a Communication + Finesse roll in place of Craft: Cook.' } },
  { id: 'knife', name: 'Stone-Cutting Knife', material: 'iron chisel', size: 'small', role: 'folk', serves: 'pounds', many: true, ref: CH4,
    effect: { technique: 'Re', form: 'Te', level: 15, range: 'Touch', duration: 'Momentary', target: 'Part', uses: 'unlimited', text: 'Shapes stone as a well-equipped mason would: Dexterity + Finesse in place of the Craft roll, +3.' } },
  { id: 'porter', name: 'The Enchanted Porter', material: 'leather glove', size: 'small', role: 'folk', serves: 'servants', many: true, ref: CH4,
    effect: { technique: 'Re', form: 'Te', level: 15, range: 'Touch', duration: 'Concentration', target: 'Individual', uses: '24', concentration: true, text: 'Lifts and pushes an inanimate object as the wearer holds on and moves (after The Unseen Porter).' } },
  { id: 'plow', name: 'The Motivated Plow', material: 'wood and iron', size: 'large', role: 'folk', serves: 'pounds', many: true, ref: CH4,
    effect: { technique: 'Re', form: 'Te', level: 15, range: 'Touch', duration: 'Concentration', target: 'Part', uses: '24', concentration: true, text: 'Pushed by one grog with no beasts, it turns hard earth to well-plowed soil fifteen paces across (after The Forgiving Earth): about three laborers’ work.' } },
  { id: 'vitalizer', name: 'The Vitalizer of Provisions', material: 'oak chest', size: 'large', role: 'folk', serves: 'pounds', ref: CH4,
    effect: { technique: 'Cr', form: 'An', requisites: ['He'], level: 19, range: 'Touch', duration: 'Concentration', target: 'Group', uses: '2', environmental: true, text: 'Food kept inside does not decay while the door stays closed.' } },
  { id: 'vermin', name: 'The Death of Vermin', material: 'wooden box', size: 'small', role: 'folk', serves: 'pounds', ref: CH4,
    effect: { technique: 'Re', form: 'An', level: 20, range: 'Voice', duration: 'Sun', target: 'Group', uses: '1', text: 'Draws the vermin of a place into the box until sunset or sunrise, to be dealt with by a grog.' } },
  { id: 'abluere', name: 'Abluere Magica', material: 'hinged boards', size: 'medium', role: 'folk', serves: 'servants', ref: CH4,
    effect: { technique: 'Re', form: 'He', requisites: ['An'], level: 15, range: 'Touch', duration: 'Momentary', target: 'Individual', uses: 'unlimited', text: 'A soiled garment laid between the boards comes out clean and fresh, as from a washerwoman.' } },
  { id: 'waiter', name: 'The Dumb Waiter', material: 'oak cabinet', size: 'large', role: 'folk', serves: 'servants', ref: CH4,
    effect: { technique: 'Re', form: 'Te', level: 35, range: 'Touch', duration: 'Momentary', target: 'Group', uses: '24', text: 'Sends food and drink from the kitchen to places within fifty paces marked by a small arcane connection, hot and unspilled.' } },
  { id: 'incendior', name: 'Incendior Homines', material: 'wand', size: 'small', role: 'turb', many: true, ref: CH4,
    effect: { technique: 'Cr', form: 'Ig', level: 30, range: 'Voice', duration: 'Momentary', target: 'Individual', uses: '50', penetration: 8, text: 'Envelops a target in flame for +15 damage, Penetration +8, even in an unskilled grog’s hand.' } },
  // laboratory items (Covenants ch.3): installed, they take no space
  { id: 'bookstand', name: 'The Bookstand of Hespera', material: 'wooden lectern', size: 'medium', role: 'lab', ref: CH3, lab: { defId: 'magic-item', choice: { Texts: 2 } },
    effect: { technique: 'Re', form: 'He', level: 20, range: 'Touch', duration: 'Concentration', target: 'Individual', uses: 'unlimited', concentration: true, text: 'Follows the magus about the laboratory with the Lab Text, inkhorn and quills: Texts +2.' } },
  { id: 'plantpot', name: 'The Prodigious Plant Pot', material: 'clay pot', size: 'medium', role: 'lab', ref: CH3, lab: { defId: 'magic-item', choice: { Experimentation: 1, He: 2 } },
    effect: { technique: 'Cr', form: 'He', level: 30, range: 'Touch', duration: 'Sun', target: 'Individual', uses: '1', text: 'A seed planted in it grows to a mature plant in a day: Experimentation +1, Herbam +2.' } },
  { id: 'servant', name: 'The Tireless Servant', material: 'bone', size: 'large', role: 'lab', ref: CH3, lab: { defId: 'magic-item', inputs: { 'General Quality': 1, Safety: 1 } },
    effect: { technique: 'Re', form: 'Co', level: 40, range: 'Touch', duration: 'Concentration', target: 'Individual', uses: 'unlimited', concentration: true, text: 'An animated skeleton that holds, fetches, lifts and stirs on simple commands: General Quality +1, Safety +1.' } },
  { id: 'lamps', name: 'Lamps without flame', material: 'glass and brass', size: 'small', role: 'lab', ref: CH3, lab: { defId: 'magical-lighting', alt: 'superior' },
    effect: { technique: 'Cr', form: 'Ig', level: 10, range: 'Touch', duration: 'Sun', target: 'Individual', uses: '2', environmental: true, text: 'Steady light without candles or smoke, lit at dawn and dusk: the Magical Lighting Virtue.' } },
  { id: 'hearth', name: 'A warming hearthstone', material: 'stone', size: 'medium', role: 'lab', ref: CH3, lab: { defId: 'magical-heating', alt: 'superior' },
    effect: { technique: 'Cr', form: 'Ig', level: 15, range: 'Touch', duration: 'Sun', target: 'Room', uses: '2', environmental: true, text: 'Even warmth without fireplace or fuel: the Magical Heating Virtue.' } },
];

function record(t: Template): EnchantedEffectRecord {
  const e = t.effect;
  return {
    uid: uid(), name: t.name, technique: e.technique, form: e.form, requisites: e.requisites ?? [], baseLevel: e.level, range: e.range, duration: e.duration, target: e.target,
    usesPerDay: e.uses, penetration: e.penetration ?? 0, concentration: !!e.concentration, effectUse: false, environmentalTrigger: !!e.environmental, fastTrigger: false, linkedTrigger: false,
    expiry: 'none', modifiedLevel: e.level, description: e.text, investedPawns: Math.ceil(e.level / 10),
  };
}

/** What a device costs in Build Points: two for every five levels of its effects (Covenants ch.2). */
export const itemBP = (levels: number) => Math.ceil(levels / 5) * 2;

export interface CovenantItemsResult {
  items: EnchantedItem[];
  /** the lab Virtues the lab items give, by lab uid */
  installs: { labUid: string; entry: LabVirtueEntry }[];
  levels: number;
  log: string[];
}

/**
 * Devices for a covenant to about `bp` Build Points, no effect above `maxLevel`: lesser devices doing
 * the covenfolk's work first (the most saving for the cost), a lab item for each of the labs of its
 * senior magi, and a weapon for its turb where it has grogs. Which ones, and how many, varies with the seed.
 */
export function covenantItems(cov: Covenant, members: Character[], bp: number, maxLevel: number, rng: Rng): CovenantItemsResult {
  const out: CovenantItemsResult = { items: [], installs: [], levels: 0, log: [] };
  let left = bp;
  const fits = (t: Template) => t.effect.level <= maxLevel && itemBP(t.effect.level) <= left;
  const makers = members.filter((m) => m.type === 'magus');
  const maker = () => (makers.length ? pick(rng, makers) : undefined);
  const add = (t: Template, note?: string) => {
    const who = maker();
    const it: EnchantedItem = {
      uid: uid(), name: t.name, kind: t.effect.level > 20 ? 'invested' : 'lesser', material: t.material, size: t.size, shapeMaterialIds: [], openedPawns: 0,
      effects: [record(t)], attunements: [], creatorId: who?.id, serves: t.serves,
      notes: `${t.effect.text} (${t.ref}).${note ? ` ${note}` : ''}`,
    };
    out.items.push(it);
    out.levels += t.effect.level;
    left -= itemBP(t.effect.level);
    return it;
  };
  const shuffled = <T,>(xs: T[]) => xs.map((x) => ({ x, k: rng() })).sort((a, b) => a.k - b.k).map((y) => y.x);

  // a share for the labs and the turb, the rest (most) for the covenfolk's work
  const labShare = bp * (0.2 + rng() * 0.2);
  const turbShare = cov.covenfolk.grogs > 0 || (cov.finances.soldiers ?? []).length ? bp * (0.05 + rng() * 0.1) : 0;
  let folkBudget = bp - labShare - turbShare;

  // the covenfolk's work: one of each that fits, in a random order, then more of those that serve in numbers
  for (const t of shuffled(COVENANT_ITEMS.filter((x) => x.role === 'folk'))) {
    if (!fits(t) || itemBP(t.effect.level) > folkBudget) continue;
    add(t);
    folkBudget -= itemBP(t.effect.level);
  }
  for (let guard = 0; guard < 20; guard++) {
    const more = shuffled(COVENANT_ITEMS.filter((x) => x.role === 'folk' && x.many && fits(x) && itemBP(x.effect.level) <= folkBudget))[0];
    if (!more) break;
    add(more);
    folkBudget -= itemBP(more.effect.level);
  }

  // the labs of the senior magi first: a different lab item in each, none twice in one lab
  const labs = [...cov.labs].sort((a, b) => b.refinement - a.refinement);
  let labBudget = labShare + Math.max(0, folkBudget);
  for (const lab of labs) {
    const have = new Set(out.installs.filter((i) => i.labUid === lab.uid).map((i) => i.entry.note));
    const t = shuffled(COVENANT_ITEMS.filter((x) => x.role === 'lab' && fits(x) && itemBP(x.effect.level) <= labBudget && !have.has(x.name)))[0];
    if (!t) continue;
    const it = add(t, `Installed in ${lab.name}.`);
    labBudget -= itemBP(t.effect.level);
    out.installs.push({ labUid: lab.uid, entry: { uid: uid(), ...t.lab!, note: t.name, fromItem: it.uid } });
  }

  // a weapon or two for the turb
  let turbBudget = turbShare + Math.max(0, labBudget);
  const weapon = COVENANT_ITEMS.find((x) => x.id === 'incendior')!;
  for (let n = 0; n < 3 && fits(weapon) && itemBP(weapon.effect.level) <= turbBudget; n++) {
    add(weapon, 'Kept for the turb.');
    turbBudget -= itemBP(weapon.effect.level);
  }

  const counts = new Map<string, number>();
  for (const it of out.items) counts.set(it.name, (counts.get(it.name) ?? 0) + 1);
  if (out.items.length)
    out.log.push(
      `Enchanted devices (${out.levels} levels, ${out.items.reduce((t, it) => t + itemBP(it.effects[0].modifiedLevel), 0)} BP): ${[...counts].map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)).join(', ')}.`,
    );
  return out;
}
