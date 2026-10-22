// The kinds of character the generator makes: what each is for, the concept themes and guided-build
// answers that steer the build toward it, the Social Status it usually has, its gear, and the
// Personality Traits that suit it. Magi take their roles from the concept themes; Mythic
// Companions from their types.

import type { CharType } from '../../data';
import { ARCHETYPES } from '../recommend';
import { MYTHIC_TYPES } from '../character/factory';

export type Gear = 'melee' | 'missile' | 'knight' | 'light';

export interface Role {
  id: string;
  label: string;
  type: CharType;
  blurb: string;
  /** concept themes (the Concept step's chips) */
  themes: string[];
  /** guided-build answers that steer the build */
  answers?: Record<string, number>;
  /** a Social Status Virtue to take first, when the rules allow it */
  status?: string;
  /** a craftsman: a Craft, and with guilds on, a guild rank */
  craft?: boolean;
  /** a Mythic Companion type (factory.MYTHIC_TYPES) */
  mythic?: string;
  gear?: Gear;
  traits: string[];
  ages: [number, number];
}

const GROGS: Role[] = [
  { id: 'shield-grog', label: 'Shield grog', type: 'grog', blurb: 'Guards the magi with sword and shield.', themes: ['warrior'], answers: { 'h-fight': 10, 'd-fight': 9, 'd-hard-to-hurt': 8 }, gear: 'melee', traits: ['Brave', 'Loyal', 'Gruff', 'Dutiful'], ages: [18, 35] },
  { id: 'archer', label: 'Archer or scout', type: 'grog', blurb: 'Watches, scouts and shoots from cover.', themes: ['explorer', 'warrior'], answers: { 'h-fight': 7, 'h-outdoors': 8, 'h-stealth': 7 }, gear: 'missile', traits: ['Watchful', 'Quiet', 'Patient'], ages: [17, 35] },
  { id: 'sergeant', label: 'Sergeant', type: 'grog', blurb: 'Leads the turb of grogs in a fight.', themes: ['warrior'], answers: { 'h-fight': 9, 'h-social': 6, 'h-lead': 9 }, gear: 'melee', traits: ['Brave', 'Stern', 'Loyal'], ages: [26, 45] },
  { id: 'servant', label: 'Servant', type: 'grog', blurb: 'Keeps the covenant running: cooks, cleans, carries.', themes: ['social'], answers: { 'h-social': 6, 'g-good': 6 }, gear: 'light', traits: ['Diligent', 'Gossipy', 'Humble', 'Cheerful'], ages: [15, 50] },
  { id: 'craftsman', label: 'Craftsman', type: 'grog', blurb: 'Makes and mends what the covenant needs.', themes: ['craftsman'], answers: { 'h-craft': 10 }, craft: true, gear: 'light', traits: ['Diligent', 'Proud of their work', 'Thrifty'], ages: [18, 50] },
  { id: 'chirurgeon', label: 'Chirurgeon', type: 'grog', blurb: 'Binds wounds after a fight.', themes: ['healer'], answers: { 'h-healing': 10 }, gear: 'light', traits: ['Kind', 'Calm'], ages: [20, 50] },
  { id: 'scribe', label: 'Scribe', type: 'grog', blurb: 'Copies the covenant’s books and keeps its records.', themes: ['scholar'], answers: { 'h-scholar': 9 }, gear: 'light', traits: ['Meticulous', 'Curious'], ages: [18, 50] },
  { id: 'huntsman', label: 'Huntsman or guide', type: 'grog', blurb: 'Knows the woods, tracks game and leads the way.', themes: ['explorer', 'beast'], answers: { 'h-outdoors': 10, 'h-fight': 5 }, gear: 'missile', traits: ['Patient', 'Taciturn'], ages: [18, 45] },
  { id: 'groom', label: 'Groom', type: 'grog', blurb: 'Looks after the horses and hounds.', themes: ['beast'], answers: { 'h-outdoors': 7 }, gear: 'light', traits: ['Gentle', 'Stubborn'], ages: [15, 45] },
];

const COMPANIONS: Role[] = [
  { id: 'knight', label: 'Knight', type: 'companion', blurb: 'A mounted warrior of noble standing.', themes: ['warrior', 'noble'], answers: { 'h-fight': 10, 'g-birth': 8, 'h-lead': 7 }, status: 'knight', gear: 'knight', traits: ['Brave', 'Proud', 'Chivalrous'], ages: [20, 45] },
  { id: 'mercenary', label: 'Mercenary captain', type: 'companion', blurb: 'Sells a company of soldiers to whoever pays.', themes: ['warrior'], answers: { 'h-fight': 10, 'h-lead': 8 }, status: 'mercenary-captain', gear: 'melee', traits: ['Greedy', 'Brave', 'Cynical'], ages: [25, 45] },
  { id: 'scholar', label: 'Scholar', type: 'companion', blurb: 'Learned in the liberal arts, law or theology.', themes: ['scholar'], answers: { 'h-scholar': 10, 'e-study': 7 }, gear: 'light', traits: ['Curious', 'Pedantic'], ages: [22, 50] },
  { id: 'priest', label: 'Priest', type: 'companion', blurb: 'Serves the Church, and perhaps the covenant’s conscience.', themes: ['faith', 'scholar'], answers: { 'g-church': 9, 'f-divine': 7, 'h-scholar': 6 }, status: 'priest', gear: 'light', traits: ['Pious', 'Charitable'], ages: [25, 55] },
  { id: 'merchant', label: 'Merchant', type: 'companion', blurb: 'Buys, sells and knows the price of everything.', themes: ['craftsman', 'noble'], answers: { 'g-wealth': 8, 'h-social': 7 }, status: 'merchant', gear: 'light', traits: ['Shrewd', 'Greedy', 'Generous'], ages: [22, 50] },
  { id: 'master-craftsman', label: 'Master craftsman', type: 'companion', blurb: 'Runs a workshop; perhaps a guild master.', themes: ['craftsman'], answers: { 'h-craft': 10, 'h-lead': 6 }, craft: true, gear: 'light', traits: ['Proud of their work', 'Thrifty'], ages: [30, 55] },
  { id: 'spy', label: 'Spy or thief', type: 'companion', blurb: 'Goes where others cannot, and hears what others miss.', themes: ['rogue'], answers: { 'h-stealth': 10, 'h-social': 6, 'g-secret': 6 }, gear: 'light', traits: ['Sly', 'Cautious'], ages: [18, 40] },
  { id: 'woodsman', label: 'Woodsman', type: 'companion', blurb: 'Hunter, tracker and guide in the wild places.', themes: ['explorer'], answers: { 'h-outdoors': 10, 'f-travel': 6 }, gear: 'missile', traits: ['Self-reliant', 'Taciturn'], ages: [20, 45] },
  { id: 'physician', label: 'Physician', type: 'companion', blurb: 'Trained in medicine; heals the sick.', themes: ['healer', 'scholar'], answers: { 'h-healing': 10, 'h-scholar': 7 }, gear: 'light', traits: ['Kind', 'Curious'], ages: [25, 55] },
  { id: 'courtier', label: 'Courtier or diplomat', type: 'companion', blurb: 'Speaks for the covenant to lords and bishops.', themes: ['social', 'noble'], answers: { 'h-social': 10, 'g-birth': 6 }, gear: 'light', traits: ['Charming', 'Ambitious'], ages: [20, 50] },
  { id: 'cunning-folk', label: 'Cunning folk', type: 'companion', blurb: 'A village healer and charmer with a touch of the uncanny.', themes: ['mystic', 'faerie'], answers: { 'f-faerie': 7, 'h-lore': 8, 'f-senses': 7 }, gear: 'light', traits: ['Wise', 'Secretive'], ages: [25, 60] },
  { id: 'demon-hunter', label: 'Demon hunter', type: 'companion', blurb: 'Hunts the servants of the Infernal.', themes: ['demon-hunter', 'faith'], answers: { 'f-infernal': 8, 'f-infernal-hunt': 9, 'h-fight': 7 }, gear: 'melee', traits: ['Zealous', 'Brave'], ages: [22, 45] },
];

const MAGI: Role[] = ARCHETYPES.filter((a) => !a.forTypes || a.forTypes.includes('magus')).map((a) => ({
  id: `magus-${a.id}`, label: a.label, type: 'magus', blurb: a.description, themes: [a.id], gear: undefined, traits: [], ages: [25, 25],
}));

const MYTHIC: Role[] = Object.entries(MYTHIC_TYPES).map(([id, t]) => ({
  id: `mythic-${id}`, label: t.label, type: 'mythic', blurb: `A Mythic Companion: ${t.label}.`, themes: [], mythic: id, traits: [], ages: [20, 40],
}));

export const ROLES: Role[] = [...GROGS, ...COMPANIONS, ...MAGI, ...MYTHIC];
export const ROLE_BY_ID = new Map(ROLES.map((r) => [r.id, r]));

export function rolesFor(type: CharType): Role[] {
  return ROLES.filter((r) => r.type === type);
}

/** Traits any character may have, for those a role does not name. */
export const COMMON_TRAITS = ['Pious', 'Greedy', 'Kind', 'Proud', 'Cautious', 'Cheerful', 'Gloomy', 'Stubborn', 'Honest', 'Lazy', 'Curious', 'Brave', 'Superstitious', 'Hot-tempered', 'Generous'];
