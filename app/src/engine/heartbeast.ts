// A Bjornaer magus in heartbeast form (Houses of Hermes: Mystery Cults, Statistics of Shapechangers):
// the beast's statistics from the core book's Mundane Beasts, with the magus's own Characteristics
// folded in. Intelligence is kept; for each other Characteristic, both negative takes the lower,
// both positive the higher, and otherwise the two are added. Size is the beast's. The beast's
// attacks and Soak move with the Characteristics that make them (Quickness for Initiative and
// Defense, Dexterity for Attack, Strength for Damage, Stamina for Soak). The magus's own Virtues that
// bear on the body (Tough) still apply, once.

import { MUNDANE_BEASTS, type BeastAttack, type MundaneBeast } from '../data/beasts';
import type { DerivedCharacter } from './character/derive';

const CHARS = ['Per', 'Pre', 'Com', 'Str', 'Sta', 'Dex', 'Qik'] as const;

/**
 * The names a heartbeast may go by for each of the core book's beasts. A Bjornaer's heartbeast is a
 * wild creature (HoH: Mystery Cults, Choosing a Heartbeast), so the wildcat stands on the cat's
 * statistics, the aurochs on the bull's and the wild horse on the courser's.
 */
const BEAST_NAMES: Record<string, string[]> = {
  bear: ['bear'],
  'boar-wild': ['boar', 'wild boar'],
  bull: ['bull', 'wild bull', 'aurochs'],
  cat: ['cat', 'wildcat', 'wild cat'],
  falcon: ['falcon'],
  'horse-courser': ['horse', 'wild horse', 'courser'],
  'horse-destrier': ['destrier'],
  hound: ['hound'],
  lion: ['lion'],
  stag: ['stag', 'deer', 'red deer', 'hart'],
  wolf: ['wolf', 'wolves'],
};
/** words that describe the one animal without making it another ("a great grey wolf") */
const DESCRIBING = /^(a|an|the|great|large|big|small|old|young|grey|gray|black|brown|white|red|golden|silver|mountain|forest|northern)$/;

/**
 * The book's beast a heartbeast name stands for ("wolf", "a grey wolf", "Wild boar"), if the core
 * book gives it. The whole name must be the beast's: a wild goat is no boar, and a sea lion no lion.
 */
export function beastFor(heartbeast: string | undefined): MundaneBeast | undefined {
  const h = (heartbeast ?? '').trim().toLowerCase();
  if (!h) return undefined;
  const exact = MUNDANE_BEASTS.find((b) => b.name.toLowerCase() === h || b.id === h || b.latin.toLowerCase() === h);
  if (exact) return exact;
  const words = h.split(/[^a-z]+/).filter((w) => w && !DESCRIBING.test(w));
  const name = words.join(' ');
  const singular = name.replace(/s$/, '');
  const id = Object.keys(BEAST_NAMES).find((k) => BEAST_NAMES[k].includes(name) || BEAST_NAMES[k].includes(singular));
  return id ? MUNDANE_BEASTS.find((b) => b.id === id) : undefined;
}

/** One Characteristic in heartbeast form: both negative the lower, both positive the higher, else the sum. */
export function blendCharacteristic(human: number, beast: number): number {
  if (human < 0 && beast < 0) return Math.min(human, beast);
  if (human > 0 && beast > 0) return Math.max(human, beast);
  return human + beast;
}

export interface HeartbeastForm {
  beast: MundaneBeast;
  /** Int (the magus's) and the blended others */
  characteristics: Record<string, number>;
  /** how each was reached, for the sheet */
  notes: Record<string, string>;
  size: number;
  soak: number;
  /** what the magus's own Virtues add to the beast's Soak (Tough), named for the sheet */
  soakFrom: string[];
  /** a Size Virtue or Flaw of the magus's makes a notably large or small beast of its kind */
  sizeNote?: string;
  combat: BeastAttack[];
}

/** The magus's statistics in heartbeast form, or undefined when the core book does not give the beast. */
export function heartbeastForm(d: DerivedCharacter, heartbeast?: string): HeartbeastForm | undefined {
  const beast = beastFor(heartbeast ?? d.char.heartbeast);
  if (!beast) return undefined;
  const characteristics: Record<string, number> = { Int: d.characteristics.Int.value };
  const notes: Record<string, string> = { Int: 'the magus’s own (human Intelligence is kept)' };
  for (const k of CHARS) {
    const human = d.characteristics[k].value;
    const animal = beast.characteristics[k] ?? 0;
    const v = blendCharacteristic(human, animal);
    characteristics[k] = v;
    notes[k] =
      human < 0 && animal < 0 ? `lower of ${human} and the beast’s ${animal}` : human > 0 && animal > 0 ? `higher of ${human} and the beast’s ${animal}` : `${human} + the beast’s ${animal}`;
  }
  const delta = (k: (typeof CHARS)[number]) => characteristics[k] - (beast.characteristics[k] ?? 0);
  const combat = beast.combat.map((a) => ({
    ...a,
    init: a.init + delta('Qik'),
    attack: a.attack + delta('Dex'),
    defense: a.defense + delta('Qik'),
    damage: a.damage === null ? null : a.damage + delta('Str'),
  }));
  // "Apply all the Virtues and Flaws of the animal form while shapechanged, as well as all Virtues and
  // Flaws of the human form, if applicable ... If the animal form already has [one], it applies only once."
  const beastHas = (name: string) => new RegExp(`\\b${name}\\b`, 'i').test(beast.virtues);
  let ownSoak = 0;
  const soakFrom: string[] = [];
  for (const e of d.effects) {
    if (e.type !== 'soak' || !e.amount) continue;
    const from = d.virtues.find((v) => v.cv.uid === e.fromUid);
    if (!from || beastHas(from.name)) continue;
    ownSoak += e.amount;
    soakFrom.push(`${from.name} ${e.amount > 0 ? '+' : ''}${e.amount}`);
  }
  // Size: the human's has no effect on the beast's, but within Size -4 to 0 a Size Virtue or Flaw shows
  const ownSize = d.effects.reduce((t, e) => t + (e.type === 'size' ? e.amount : 0), 0);
  const sizeNote = ownSize && beast.size >= -4 && beast.size <= 0 ? `a notably ${ownSize > 0 ? 'large' : 'small'} ${beast.name.toLowerCase().replace(/,.*/, '')} for its kind` : undefined;
  return { beast, characteristics, notes, size: beast.size, soak: beast.soak + delta('Sta') + ownSoak, soakFrom, sizeNote, combat };
}
