// A Bjornaer magus in heartbeast form (Houses of Hermes: Mystery Cults, Statistics of Shapechangers):
// the beast's statistics from the core book's Mundane Beasts, with the magus's own Characteristics
// folded in. Intelligence is kept; for each other Characteristic, both negative takes the lower,
// both positive the higher, and otherwise the two are added. Size is the beast's. The beast's
// attacks and Soak move with the Characteristics that make them (Quickness for Initiative and
// Defense, Dexterity for Attack, Strength for Damage, Stamina for Soak).

import { MUNDANE_BEASTS, type BeastAttack, type MundaneBeast } from '../data/beasts';
import type { DerivedCharacter } from './character/derive';

const CHARS = ['Per', 'Pre', 'Com', 'Str', 'Sta', 'Dex', 'Qik'] as const;

/** The book's beast a heartbeast name stands for ("wolf", "a grey wolf", "Horse"), if the core book gives it. */
export function beastFor(heartbeast: string | undefined): MundaneBeast | undefined {
  const h = (heartbeast ?? '').trim().toLowerCase();
  if (!h) return undefined;
  const exact = MUNDANE_BEASTS.find((b) => b.name.toLowerCase() === h || b.id === h || b.latin.toLowerCase() === h);
  if (exact) return exact;
  // a word of the name: "boar" for "Boar, Wild", "destrier" or "horse" for the horses (the courser first)
  const words = h.split(/[^a-z]+/).filter(Boolean);
  return MUNDANE_BEASTS.find((b) => b.name.toLowerCase().split(/[^a-z]+/).some((w) => words.includes(w) || words.includes(`${w}s`)));
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
  return { beast, characteristics, notes, size: beast.size, soak: beast.soak + delta('Sta'), combat };
}
