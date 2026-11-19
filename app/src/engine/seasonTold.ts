// How the Chronicle tells a season of work: one phrase, made from what the season actually did, kept on
// the season log entry as `told`. It follows the character's name in the Chronicle's sentence ("Of the
// magi, Aldith brewed four doses of a Healing potion in the kitchen."), so each phrase starts with a verb
// in the past tense, has no full stop, and names the work's own result: the potion, the curse's target,
// the tattoo, the saint, the building. The Chronicle prefers it to its stock phrases (chronicle.ts).

import type { Character, LabProject } from './types';

const lower = (s: string) => s.replace(/^./, (c) => c.toLowerCase());
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** A count in words up to twelve, as a story says it; figures above. */
const count = (n: number, one: string, many = `${one}s`) => `${NUMBERS[n] ?? n} ${n === 1 ? one : many}`;
/** "A", "an" or nothing before a name, as English wants. */
const an = (s: string) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
/** A list said aloud: "a, b and c". */
const and = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// ------------------------------------------------------------------------------------------------
// The hedge traditions

export type KitchenTold =
  | { work: 'brew'; power: string; doses: number; pawns: number; vis: string }
  | { work: 'fetish'; fetish: string; power: string }
  | { work: 'curse'; curse: string; target: string }
  | { work: 'vis'; pawns: number }
  | { work: 'longevity' }
  | { work: 'familiar'; bound: boolean };

/** A folk witch's season in the kitchen (Hedge Magic, The Folk Witch). */
export function kitchenTold(k: KitchenTold): string {
  switch (k.work) {
    case 'brew':
      return k.doses
        ? `brewed ${count(k.doses, 'dose')} of ${an(k.power)} potion in the kitchen${k.pawns ? `, with ${plural(k.pawns, 'pawn')} of ${k.vis} vis` : ''}`
        : `labored in the kitchen over ${an(k.power)} potion, and brewed nothing that held`;
    case 'fetish':
      return `made ${k.fetish} in the kitchen, a fetish for ${k.power}`;
    case 'curse':
      return `wove a curse of ${lower(k.curse)} against ${k.target || 'an enemy'}, muttering over the kitchen fire`;
    case 'vis':
      return k.pawns ? `drew ${plural(k.pawns, 'pawn')} of Vim vis from the aura over the kitchen fire` : 'tried to draw vis from the aura over the kitchen fire, and drew none';
    case 'longevity':
      return 'made a Longevity Ritual in the kitchen, against the years';
    case 'familiar':
      return k.bound ? 'bound an animal as their familiar' : 'tried to bind an animal as their familiar, and failed';
  }
}

export type RefiningTold =
  | { work: 'longevity'; forOther: boolean }
  | { work: 'characteristic'; characteristic: string }
  | { work: 'extract'; pawns: number; art: string }
  | { work: 'move'; pawns: number; arrive: number; art: string }
  | { work: 'might'; points: number; drain: boolean }
  | { work: 'other' };

/** An elementalist's season of Refining (Hedge Magic, Elementalists). */
export function refiningTold(k: RefiningTold): string {
  switch (k.work) {
    case 'longevity':
      return `refined a longevity potion from the elements${k.forOther ? ', for another to drink' : ''}`;
    case 'characteristic':
      return `refined a potion to strengthen ${k.characteristic || 'the body'}`;
    case 'extract':
      return k.pawns ? `refined ${plural(k.pawns, 'pawn')} of ${k.art} vis from the aura` : `tried to refine ${k.art} vis from the aura, and drew none`;
    case 'move':
      return `refined ${plural(k.pawns, 'pawn')} of vis into ${k.arrive} of ${k.art}`;
    case 'might':
      return k.points ? `${k.drain ? 'drained' : 'restored'} ${plural(k.points, 'point')} of a being’s Might` : 'sought to refine a being’s Might, and could not master it';
    case 'other':
      return 'worked at the refining of the elements';
  }
}

/** A vitki's season: rune scripts invented or learned from a teacher (Hedge Magic, Vitkir). */
export function vitkiTold(mode: 'invent' | 'taught', runes: string[], scripts: string[]): string {
  if (mode === 'taught') return scripts.length ? `learned the rune script${scripts.length === 1 ? '' : 's'} ${and(scripts)} from a teacher` : 'studied the runes under a teacher';
  const with_ = runes.length ? ` with ${and(runes)}` : '';
  return scripts.length ? `carved the new rune script${scripts.length === 1 ? '' : 's'} ${and(scripts)}${with_}` : `worked at the runes${with_}, and finished no script`;
}

/** A learned magician's amulet (Hedge Magic, Learned Magicians). */
export function amuletTold(effect: string, bearer?: string): string {
  return `made an amulet of ${effect}${bearer ? ` for ${bearer}` : ''}`;
}

/** A learned magician's season of charms: inventing one, or learning from a teacher. */
export function charmTold(k: { work: 'invent'; charm: string; done: boolean } | { work: 'teacher'; charms: string[] }): string {
  if (k.work === 'teacher') return `learned the charm${k.charms.length === 1 ? '' : 's'} ${and(k.charms)} from a teacher`;
  return k.done ? `finished inventing the charm ${k.charm}` : `worked at inventing the charm ${k.charm}`;
}

/** A gruagach's season: a tattoo, a spell invented, or vis from the aura (Hedge Magic, Gruagachan). */
export function gruagachTold(k: { work: 'tattoo'; effect: string } | { work: 'invent'; spell: string; done: boolean } | { work: 'vis'; pawns: number }): string {
  switch (k.work) {
    case 'tattoo':
      return `pricked a tattoo of ${k.effect} into the skin, line by inked line`;
    case 'invent':
      return k.done ? `finished inventing the spell ${k.spell}` : `worked at inventing the spell ${k.spell}`;
    case 'vis':
      return k.pawns ? `drew ${plural(k.pawns, 'pawn')} of Vim vis from the aura` : 'tried to draw vis from the aura, and drew none';
  }
}

// ------------------------------------------------------------------------------------------------
// The mason, devotion and holy work

/** A master mason's season on a great building (Hermetic Projects). */
export function masonTold(k: { work: 'build'; building: string; feet: number; height: number; started: boolean } | { work: 'repair'; building: string }): string {
  // "The great tower", the card's own name for a new building, reads "the great tower" mid-sentence
  const b = k.building.replace(/^The /, 'the ');
  if (k.work === 'repair') return `repaired the stonework of ${b}`;
  return k.started ? `laid the footings of ${b} and raised it ${k.feet} feet` : `raised ${b} another ${k.feet} feet, to ${k.height} feet high`;
}

export type DevotionTold =
  | { work: 'shrine'; saint?: string }
  | { work: 'hagiography'; saint?: string }
  | { work: 'path'; quest: string }
  | { work: 'ring'; ring: string }
  | { work: 'search' };

/** A saint as a story names them: "Saint Peter, Apostle" is Saint Peter. */
const saint = (name: string) => name.replace(/,.*/, '');

/** A season of devotion (The Church, Devotion and Spiritual Paths; RoP: The Divine, Ars Notoria). */
export function devotionTold(k: DevotionTold): string {
  switch (k.work) {
    case 'shrine':
      return `kept vigil at ${k.saint ? `${saint(k.saint)}’s` : 'a saint’s'} shrine`;
    case 'hagiography':
      return `read the life of ${k.saint ? saint(k.saint) : 'a saint'}, and prayed over it`;
    case 'path': {
      // "A season serving the poor or the Church", "A season of personal devotion (…)": the Quest Component's label
      const what = k.quest.replace(/^A season\s*/i, '').replace(/\s*\(.*\)\s*$/, '').replace(/\.$/, '');
      return /^of\b/.test(what) ? `walked the mystic’s path in ${what.slice(3)}` : `walked the mystic’s path, ${lower(what)}`;
    }
    case 'ring':
      return `recited ${lower(k.ring)} of Solomon all season, in the hope it would answer`;
    case 'search':
      return 'searched old libraries and older rumors for the Book of Solomon';
  }
}

/**
 * A season of holy work (RoP: The Divine, Mythic Judaism): its kind, its name if the player gave one, and
 * whether it finished. A True Name's name is the being's ("True Name: an angel").
 */
export function holyWorkTold(kind: 'amulet' | 'golem' | 'empower' | 'trueName' | 'shinnui', name: string | undefined, done: boolean): string {
  const called = name ? `, ${name}` : '';
  switch (kind) {
    case 'amulet':
      return done ? `finished writing a holy amulet${called}` : `wrote holy names onto an amulet${called}`;
    case 'golem':
      return done ? `breathed life into a golem${called}` : `shaped clay and holy letters toward a golem${called}`;
    case 'empower':
      return done ? `gave a golem a new power${called}` : `worked to give a golem a new power${called}`;
    case 'trueName':
      return `${done ? 'learned' : 'sought'} the True Name of ${name?.replace(/^True Name:\s*/i, '') || 'an angel'} through the Merkavah`;
    case 'shinnui':
      return 'sought a change of name before Heaven, by Shinnui Shem';
  }
}

// ------------------------------------------------------------------------------------------------
// The laboratory and the workshop

const itemName = (c: Character, uid?: string) => c.items.find((i) => i.uid === uid)?.name;

/** A season's lab project (DE, The Laboratory): its kind and what it worked on, and whether it finished. */
export function labTold(p: LabProject, c: Character): string {
  const spell = p.spell?.name;
  const item = itemName(c, p.itemUid);
  const done = !!p.done && !p.failed;
  switch (p.kind) {
    case 'invent':
      if (p.fromText) return `learned ${spell ?? 'a spell'} from a Laboratory Text`;
      return done ? `finished inventing ${spell ?? 'a new spell'} in the laboratory` : `labored in the laboratory to invent ${spell ?? 'a new spell'}`;
    case 'open':
      return `opened ${item ?? 'an item'} for enchantment`;
    case 'attune':
      return `attuned ${item ?? 'a talisman'} to its maker`;
    case 'instill':
      return done ? `instilled ${spell ? `${spell} into ` : 'a power into '}${item ?? 'an enchanted device'}` : `worked at instilling ${spell ? `${spell} into ` : 'a power into '}${item ?? 'an enchanted device'}`;
    case 'extract':
      return 'distilled vis from the aura of the laboratory';
    case 'tame':
      return done ? 'tamed a creature in the laboratory' : 'worked to tame a creature, season on season';
    case 'longevity':
      return 'worked on a Longevity Ritual, against the years';
    case 'bind':
      return done ? 'bound a familiar' : 'sought to bind a familiar';
    case 'strengthen':
      return 'strengthened the bond with their familiar';
    case 'empower':
      return 'invested a power in the bond with their familiar';
    case 'refine':
      return 'refined the laboratory: new benches, new vessels, new wards';
    case 'install':
      return 'built something new into the laboratory';
    case 'repair':
      return 'put right a fault in the laboratory';
    case 'castingTool':
      return `enchanted a casting tool${item ? `, ${item}` : ''}`;
    case 'fixConnection':
      return `fixed an Arcane Connection${p.connectionTo ? ` to ${p.connectionTo}` : ''}, so it would never fade`;
    case 'elixir':
      return `worked at the Lesser Elixir${p.ingredient?.name ? `, adding ${p.ingredient.name}` : ''}`;
    case 'other':
      return `worked in the laboratory on ${p.name ? lower(p.name) : 'a project of their own'}`;
  }
}

/** A season helping another in the laboratory (DE, Help in the Laboratory). */
export const helperTold = (magus: string) => `helped ${magus} in the laboratory`;

/** A season of original research: a Discovery stabilized, or not (DE, Original Research); its name, if the player gave one. */
export const researchTold = (discovery: string | undefined, stable: boolean) =>
  stable ? `stabilized a new Discovery in the laboratory${discovery ? `: ${discovery}` : ''}` : `experimented in the laboratory, trying to stabilize ${discovery ? `a Discovery: ${discovery}` : 'a Discovery'}`;

/** A season with the apprentice (DE, Apprentices): the first opens their Arts. */
export const apprenticeTold = (who: string, opened: boolean) => (opened ? `opened the Arts of their apprentice, ${who}` : `taught their apprentice, ${who}`);

/** An Initiation into a Mystery (The Mysteries). */
export const initiationTold = (virtue: string, mystagogue: string) => `was initiated into ${virtue}${mystagogue ? ` by ${mystagogue}` : ''}`;

/** A book opened for enchantment, to be clarified (Covenants, Clarifying Books). */
export const clarifyTold = (title: string) => `opened ${title} for enchantment, to clarify it`;

/** A season spent on the workshop itself (City & Guild): Innovation or Raw Materials. */
export const workshopImproveTold = (what: 'Innovation' | 'Raw Materials') => (what === 'Innovation' ? 'tried new ways of working in the workshop' : 'laid in better raw materials for the workshop');

/** A merchant's season of time invested (City & Guild): "Leading a convoy", "A lawsuit". */
export const merchantTold = (label: string) => (/^\w+ing\b/.test(label) ? `spent the season ${lower(label)}` : `spent the season on ${lower(label)}`);

/** A season toward a wondrous item (City & Guild, Wondrous Items). */
export const wondrousTold = (name: string, done: boolean) => (done ? `finished making ${name}, a wondrous thing` : `worked at ${name}, a wondrous thing still unfinished`);

/** A season at a gathering of the Tribunal or the House (Guardians of the Forests; DE, Tribunals). */
export const gatheringTold = (name: string, at: string) => `rode to ${name.replace(/^The /, 'the ')} at ${at}, and sat through its debates`;
