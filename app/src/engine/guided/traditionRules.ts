// The hedge traditions and faerie wizards the guided build and Quick build make: what each requires,
// who is a member, who asks to be one, and which Virtues and Flaws are drawn for them (guided/traditions.ts
// makes them; score.ts gates the rest out of the shortlist). Hedge Magic, Revised Edition (HMRE): Folk
// Witches (line 1570), Gruagachan (line 2786), Learned Magicians (line 4117), Vitkir (line 6144).
// Realms of Power: Faerie, Pagan Traditions (line 7501).

import type { CharType, GameData } from '../../data';
import { HEDGE_DEFENSES, HEDGE_HERMETIC, HEDGE_TRADITION_OWN, HERMETIC_TOO, type BuiltHedgeTradition } from '../../data/hedgeTraditionVirtues';
import { ELEMENTAL_ART_IDS } from '../../data/hedgeElemental';
import type { Character, GuidedState } from '../types';

export type Tradition = 'witch' | 'gruagach' | 'learned' | 'vitki' | 'faerie';

interface TraditionDef {
  id: Tradition;
  /** a member, as the log says it: "a folk witch" */
  member: string;
  /** the tradition's own Social Status (a faerie wizard has none) */
  status?: string;
  gift: 'never' | 'either' | 'always';
  /** the (Organization) Lore of its people, as the chapter names it */
  lore?: string;
  /**
   * Virtues and Flaws of this tradition alone. Outside it they cast nothing ("useless unless the
   * character also possesses a Technique", HMRE line 2853), so the build draws them only for a member.
   */
  own: string[];
  /**
   * the Hermetic Virtues and Flaws the chapter names as suitable (hedgeTraditionVirtues.ts): drawn first
   * for a Gifted member, and others only when none of these fits, or, where the book makes it a limit
   * (the gruagach's), never
   */
  hermetic?: { line: number; limit?: true; ids: string[] };
  /** the Virtues whose powers or Arts a Gifted member's Opening gives free, so they are not drawn for one */
  opens?: string[];
}

// each tradition's own Virtues, from the list the rules check reads too
// and the Magical Defenses of the three traditions that have them: Greater Magical Defenses "is only useful for a
// hedge wizard whose tradition includes Magical Defenses" (HMRE line 698), and the vitkir's has none
const own = (t: BuiltHedgeTradition) => [...HEDGE_TRADITION_OWN[t].ids, ...(t === 'vitki' ? ['known-hedge-wizard-flaw'] : HEDGE_DEFENSES)];

export const TRADITIONS: TraditionDef[] = [
  {
    id: 'witch', member: 'a folk witch', status: 'folk-witch', gift: 'either', lore: 'Folk Witches', own: own('witch'),
    // "seven favored Supernatural Abilities ... you may freely spend experience points on these" (HMRE line 1580)
    opens: ['witch-healing', 'witch-cursing', 'witch-flight', 'animal-ken', 'second-sight', 'dowsing', 'shapeshifter'],
    hermetic: HEDGE_HERMETIC.witch,
  },
  {
    id: 'gruagach', member: 'a gruagach', status: 'gruagach', gift: 'either', lore: 'Gruagachan',
    opens: ['give', 'take', 'blessing', 'curse', 'shape', 'vision'],
    own: own('gruagach'),
    hermetic: HEDGE_HERMETIC.gruagach,
  },
  {
    id: 'learned', member: 'a learned magician', status: 'mathematicus-of-bologna', gift: 'either', lore: 'Mathematici of Bologna',
    // "opens the apprentice's Gift to the powers of the learned magician's tradition — Tueor, Succurro, Vulnero, Fortunam, Magicam, and Salutem — and the Entreat the Powers Virtue" (HMRE line 4123)
    opens: ['tueor', 'succurro', 'vulnero', 'fortunam', 'magicam', 'salutem', 'entreat-the-powers'],
    own: own('learned'),
    hermetic: HEDGE_HERMETIC.learned,
  },
  {
    id: 'vitki', member: 'a vitki', status: 'vitki', gift: 'always',
    own: own('vitki'),
    hermetic: HEDGE_HERMETIC.vitki,
  },
  {
    id: 'faerie', member: 'a faerie wizard', gift: 'never',
    own: ['evocation', 'enchantment', 'empathy', 'beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe', 'summoning', 'bonding', 'captivating', 'dismissing'],
  },
];
export const TRADITION_BY_ID = new Map(TRADITIONS.map((t) => [t.id, t]));
/** The Social Statuses of the traditions, taken only by a member. */
export const TRADITION_STATUSES = new Set(TRADITIONS.flatMap((t) => (t.status ? [t.status] : [])).concat('gruagach-master'));

/**
 * Traditions the build does not make (the elementalists and nightwalkers of Hedge Magic): their own
 * Virtues are drawn only when the player names one.
 */
const UNBUILT_OWN = [...ELEMENTAL_ART_IDS, ...HEDGE_TRADITION_OWN.elementalist.ids, ...HEDGE_TRADITION_OWN.nightwalker.ids];

/** A faerie wizard's Methods and Powers: rites need one of each (RoP: Faerie line 7505). */
export const FAERIE_METHOD_IDS: readonly string[] = ['evocation', 'enchantment', 'empathy'];
export const FAERIE_POWER_IDS: readonly string[] = ['beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe'];
/** The Virtues of faerie bargaining, "usually Summoning" (RoP: Faerie line 7505). */
const FAERIE_BARGAIN_IDS = ['summoning', 'bonding', 'captivating', 'dismissing'];

/** The chips of the guided build's `f-tradition`, in the order the build takes them if several are picked. */
export const TRADITION_CHIPS: Record<Tradition, string> = { witch: 'f-trad-witch', gruagach: 'f-trad-gruagach', learned: 'f-trad-learned', vitki: 'f-trad-vitki', faerie: 'f-trad-faerie' };
const TRADITION_TYPES: CharType[] = ['companion'];

/** A member's tradition, from the Social Status they hold (a faerie wizard by a Method, a Power or Summoning). */
export function traditionOf(c: Pick<Character, 'virtues'>): Tradition | undefined {
  const has = (id: string) => c.virtues.some((v) => v.defId === id);
  const t = TRADITIONS.find((x) => x.status && has(x.status));
  if (t) return t.id;
  return TRADITION_BY_ID.get('faerie')!.own.some(has) ? 'faerie' : undefined;
}

/**
 * The tradition the answers ask for: a choice under `f-tradition`, the first in the book's order if
 * several are picked, or the tradition's Social Status asked for by name. Only a companion is made
 * one (the book's Gifted and unGifted companions; the grogs and Mythic Companions it allows are left
 * for later).
 */
export function wantedTradition(st: GuidedState, c: Pick<Character, 'type'>, data: GameData): Tradition | undefined {
  if (!TRADITION_TYPES.includes(c.type)) return undefined;
  // a choice counts while its question is rated high enough to show it
  const asked = (st.answers['f-tradition'] ?? 5) >= 7;
  for (const t of TRADITIONS) {
    if (!traditionOpen(t.id, st, data)) continue;
    if (asked && (st.answers[TRADITION_CHIPS[t.id]] ?? 0) >= 7) return t.id;
    if (t.status && (st.answers[`vf:${t.status}`] ?? 0) >= 7) return t.id;
  }
  return undefined;
}

/**
 * Whether the saga's books and the player's answers leave the tradition open: its Social Status (a
 * faerie wizard's Methods, Powers and Sympathy) in the saga's books, and not declined, as a plain
 * build declines every book beyond the core. A faerie wizard needs a Method or a Virtue of bargaining,
 * and a Sympathy Trait "either from a Virtue or a Flaw" (RoP: Faerie line 7505).
 */
export function traditionOpen(t: Tradition, st: GuidedState, data: GameData): boolean {
  const open = (id: string) => {
    const def = data.vfById.get(id);
    return !!def && data.inBooks(def) && !st.declined.includes(id);
  };
  const def = TRADITION_BY_ID.get(t)!;
  if (def.status) return open(def.status);
  return [...FAERIE_METHOD_IDS, ...FAERIE_BARGAIN_IDS].some(open) && ['faerie-sympathy', 'faerie-antipathy-flaw'].some(open);
}

/**
 * The Virtues and Flaws a member of the tradition may be made with: its Social Status, its own, the
 * Hermetic ones the chapter allows a Gifted member, and a faerie wizard's Sympathy or Antipathy. A
 * role picked by hand brings them even to a plain build.
 */
export function traditionVirtues(t: Tradition): string[] {
  const def = TRADITION_BY_ID.get(t)!;
  return [...(def.status ? [def.status] : []), ...def.own, ...(def.hermetic?.ids ?? []), ...(t === 'faerie' ? ['faerie-sympathy', 'faerie-antipathy-flaw'] : [])];
}

/** The tradition a role's answers ask for, whatever the books: the first chip picked. */
export function traditionOfAnswers(answers: Record<string, number>): Tradition | undefined {
  if ((answers['f-tradition'] ?? 0) < 7) return undefined;
  return TRADITIONS.find((t) => (answers[TRADITION_CHIPS[t.id]] ?? 0) >= 7)?.id;
}

/** Whether the member is Gifted: a vitki always (HMRE line 6146), a faerie wizard never; else as the answers say. */
export function wantsGift(t: Tradition, st: GuidedState, c: Pick<Character, 'virtues'>): boolean {
  const def = TRADITION_BY_ID.get(t)!;
  if (def.gift !== 'either') return def.gift === 'always';
  return c.virtues.some((v) => v.defId === 'the-gift') || (st.answers['f-trad-gift'] ?? 0) >= 7 || (st.answers['vf:the-gift'] ?? 0) >= 7;
}

/**
 * Whether the build may draw this Virtue or Flaw for the character: another tradition's own Virtues
 * only when named (a lone gruagach Form casts nothing), and for a Gifted gruagach only the Hermetic
 * Virtues and Flaws the chapter allows.
 */
export function fitsTradition(defId: string, c: Pick<Character, 'virtues'>, data: GameData, st: GuidedState, t: Tradition | undefined): boolean {
  return !traditionGate(defId, c, data, st, t);
}

// Every Virtue and Flaw a tradition gates. The scorer asks of each one each time it ranks the
// shortlist, so the rest are let through at once.
const GATED = new Set([...TRADITIONS.flatMap((t) => [...t.own, ...(t.opens ?? [])]), ...UNBUILT_OWN, ...FAERIE_METHOD_IDS, ...FAERIE_POWER_IDS]);

/** Why the build and its shortlist leave this Virtue or Flaw out for the character's tradition, or none. */
export function traditionGate(defId: string, c: Pick<Character, 'virtues'>, data: GameData, st: GuidedState, t: Tradition | undefined): string | null {
  const mine = t ? TRADITION_BY_ID.get(t)! : undefined;
  if (!GATED.has(defId) && !mine?.hermetic?.limit) return null;
  if ((st.answers[`vf:${defId}`] ?? 0) >= 7) return null;
  const gifted = c.virtues.some((v) => v.defId === 'the-gift');
  if (gifted && mine?.opens?.includes(defId)) return `The Gift opens it for ${mine.member}`;
  // a faerie wizard's rites need a Method and a Power together (RoP: Faerie line 7505), so one who
  // bargains with faeries instead (a Borrower's Summoning) is not drawn either alone
  if (t === 'faerie' && traditionOf(c) === 'faerie') {
    const holds = (ids: readonly string[]) => c.virtues.some((v) => ids.includes(v.defId));
    if (FAERIE_POWER_IDS.includes(defId) && !holds(FAERIE_METHOD_IDS)) return 'A Faerie Power works rites only with a Faerie Method, which this character lacks';
    if (FAERIE_METHOD_IDS.includes(defId) && !holds(FAERIE_POWER_IDS)) return 'A Faerie Method works rites only with a Faerie Power, which this character lacks';
  }
  if (mine?.own.includes(defId)) return null;
  const other = TRADITIONS.find((x) => x.own.includes(defId));
  if (other) return `Of ${other.member}’s tradition, which this character does not follow`;
  // a magus may take these as Hermetic Flaws (HMRE line 1068)
  if (UNBUILT_OWN.includes(defId) && !(HERMETIC_TOO.has(defId) && c.virtues.some((v) => v.defId === 'hermetic-magus'))) return 'Of a hedge tradition this character does not follow';
  // "Gruagach may only take Hermetic Virtues or Flaws on the above list, unless the troupe decides otherwise" (HMRE line 2953)
  if (mine?.hermetic?.limit && offSuitableList(defId, c, data, t)) return `Not among the Hermetic Virtues and Flaws ${mine.member} may take`;
  return null;
}

/**
 * Whether this is a Hermetic Virtue or Flaw off the list the chapter names as suitable for a Gifted
 * member of the tradition: Quick build draws it only when nothing on the list fits (score.ts).
 */
export function offSuitableList(defId: string, c: Pick<Character, 'virtues'>, data: GameData, t: Tradition | undefined): boolean {
  const list = t ? TRADITION_BY_ID.get(t)!.hermetic : undefined;
  if (!list || defId === 'the-gift' || !c.virtues.some((v) => v.defId === 'the-gift')) return false;
  return !!data.vfById.get(defId)?.categories.includes('Hermetic') && !list.ids.includes(defId);
}
