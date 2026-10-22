// Tribunal customs that a troupe may opt into when its saga is set there: the Rhine's ranks, gilds and
// Paths through the Forest (Guardians of the Forests); Theban citizenship, tokens and shards, and
// covenant patrons (The Sundered Eagle); Normandy's Perthean Compact and Hermetic Tourney (The Lion and
// the Lily); and the privileges of Transylvanian residents (Against the Dark).

import { defaultRng, describeStress, stressDie, type Rng } from './dice';

// ================================================================ the Rhine

export type RhineRank = 'apprentice' | 'journeyman' | 'master' | 'archmage';

/** The Rhine's four ranks: their voting sigils (their own and those of retired magi held by proxy) and Reputation. */
export const RHINE_RANKS: { id: RhineRank; label: string; latin: string; sigils: number; note: string }[] = [
  { id: 'apprentice', label: 'Apprentice', latin: 'discipulus', sigils: 0, note: 'Must spend at least a season at Durenmar, taught by a magus of House Bonisagus.' },
  { id: 'journeyman', label: 'Journeyman', latin: 'tyro', sigils: 1, note: 'Defers to magi of senior rank in a legitimate dispute; customarily joins a gild within seven years of the Gauntlet.' },
  { id: 'master', label: 'Master', latin: 'magister', sigils: 2, note: 'Hermetic Reputation 2; may train apprentices without stigma; holds the sigil of a retired magus by proxy.' },
  { id: 'archmage', label: 'Archmage', latin: 'archimagus', sigils: 3, note: 'Hermetic Reputation 4 and Archmage 4; a second proxy sigil. Wins any Hermetic dispute but against another archmage.' },
];

/** Becoming a master: three masters, of three other covenants, Houses and gilds, must each approve. */
export const MASTER_SPONSORS = 3;

export const RHINE_GILDS: { id: string; name: string; tree: string; leader: string; agenda: string }[] = [
  { id: 'oak', name: 'Eichengilde', tree: 'Oak', leader: 'Murion, Prima of Bonisagus', agenda: 'Restore the Tribunal to its former glory and respect the Founders’ traditions; in practice, the status quo.' },
  { id: 'hawthorn', name: 'Weissdorngilde', tree: 'Hawthorn', leader: 'Urgen of Crintera', agenda: 'Protect the wild places and their creatures from mundanes; avoid contact with mundanes.' },
  { id: 'ash', name: 'Eschengilde', tree: 'Ash', leader: 'Philippus Niger of Durenmar', agenda: 'Magi should rule their lands and deal openly with mundanes; quietly, destroy the Order of Odin.' },
  { id: 'elder', name: 'Holundergilde', tree: 'Elder', leader: 'Iacob of Irencillia', agenda: 'Preserve the fae and friendly contact between magi and faeries.' },
  { id: 'linden', name: 'Lindengilde', tree: 'Linden', leader: 'Occultes of Durenmar', agenda: 'Cooperation and trust between magi; peaceful settlement of conflicts; an end to apathy.' },
  { id: 'apple', name: 'Apfelgilde', tree: 'Apple', leader: 'Henri de Tours, Wilhelm Weiss and Daria la Gris', agenda: 'Peaceful, friendly relations with mundanes, and acceptance in their world.' },
];

/** A peregrinator's guest fee under the Rhine's laws of hospitality: three pawns a year, or a season's work. */
export const HOSPITALITY = { pawnsPerYear: 3, minYears: 3, maxYears: 7 };

/** What Forest Lore lets a character understand, by score (home forest; +3 for a foreign one). */
export const FOREST_LORE: { home: number; text: string }[] = [
  { home: 0, text: 'locates the forest’s most important sites and major dangers after a few hours there' },
  { home: 1, text: 'a basic understanding of the forest, its denizens and places; may enter communion with a genius locus' },
  { home: 2, text: 'senses when a spirit has Manifested nearby, or whether someone holds a Virtue or Flaw from a forest spirit' },
  { home: 3, text: 'can find the forest’s vis with a few days’ search' },
  { home: 4, text: 'its supernatural residents are neutral or friendly; the spirit sometimes warns of interlopers' },
  { home: 5, text: 'can speak directly with the genius locus; respected by most of its denizens' },
  { home: 6, text: 'acknowledged by the forest spirit as an ally' },
];

export function forestUnderstanding(score: number, foreign: boolean): string[] {
  const s = foreign ? score - 3 : score;
  return FOREST_LORE.filter((r) => r.home <= s).map((r) => r.text);
}

/** Communion with the genius locus: Intelligence + Forest Lore + stress die against 9 (12 in a foreign forest), one try a season. */
export function communionRoll(int: number, forestLore: number, foreign: boolean, rng: Rng = defaultRng) {
  const ease = foreign ? 12 : 9;
  const r = stressDie(1, rng);
  const total = int + forestLore + r.value;
  const ok = !r.botches && total >= ease;
  return { ok, total, ease, text: `Communion: Int ${int} + Forest Lore ${forestLore} + ${describeStress(r)} = ${total} vs ${ease}: ${ok ? 'the spirit answers; a pact can be made' : r.botches ? 'botch: the spirit is offended' : 'no communion this season'}.` };
}

/** The paths walked before: each step a Sacrifice (a Flaw), a Quest, and its Fruit (a Virtue). */
export const FOREST_PATHS: { name: string; steps: { sacrifice: string; quest: string; fruit: string; size: 'Minor' | 'Major' }[] }[] = [
  { name: 'Path of Aging', steps: [
    { sacrifice: 'missing-eye-flaw', quest: 'Complete a Longevity Ritual with rare forest ingredients and a blood sacrifice.', fruit: 'minor-magical-focus', size: 'Minor' },
    { sacrifice: 'difficult-longevity-ritual-flaw', quest: 'Drink from the Fountain of Youth.', fruit: 'immortality-of-the-forest', size: 'Major' },
  ] },
  { name: 'Path of Energy', steps: [
    { sacrifice: 'unpredictable-magic-flaw', quest: 'Live in the forest for a year like an animal: no clothes, no cooked food, no tools or magic.', fruit: 'life-boost', size: 'Minor' },
    { sacrifice: 'chaotic-magic-flaw', quest: 'Conquer the Dragon of the Sauerland and eat its heart.', fruit: 'mythic-blood', size: 'Major' },
  ] },
  { name: 'Path of Warping', steps: [
    { sacrifice: 'fragile-constitution-flaw', quest: 'Acquire a Warping Score of 4.', fruit: 'puissant-ability', size: 'Minor' },
    { sacrifice: 'twilight-prone-flaw', quest: 'Trap a magus opposed to the forest in Twilight.', fruit: 'twilight-mastery', size: 'Major' },
  ] },
  { name: 'Arcadian Path', steps: [
    { sacrifice: 'dispassionate-flaw', quest: 'Cause an important faerie to display an unaccustomed emotion.', fruit: 'minor-magical-focus', size: 'Minor' },
    { sacrifice: 'weak-magic-resistance-flaw', quest: 'Enchant four jewels to store the emotions of heart, liver, spleen and brain.', fruit: 'thief-of-emotions', size: 'Major' },
  ] },
];

// ================================================================ Thebes

export const PHYLAI = ['Ionian', 'Aegean', 'Kretan', 'Propontian'];

/** What earns a token, and what a shard (The Sundered Eagle, Tokens and Shards). */
export const TOKEN_REASONS: { label: string; n: number }[] = [
  { label: 'a term as arche', n: 2 },
  { label: 'a term as archon', n: 3 },
  { label: 'a term as polemarch', n: 5 },
  { label: 'gathering vis from a Tribunal source', n: 1 },
  { label: 'joining a Wizard’s March at the polemarch’s request', n: 1 },
  { label: 'a prosecution ending in a Wizard’s March', n: 3 },
  { label: 'a prosecution ending in conviction', n: 1 },
  { label: 'a service the Tribunal asked for', n: 1 },
  { label: 'a Longevity Ritual for another, at the treasurer’s behest', n: 1 },
  { label: 'a Longevity Ritual of 10th magnitude or more, at the treasurer’s behest', n: 2 },
  { label: 'delivering a Gifted child to the Council', n: 1 },
  { label: 'seven years of an apprentice’s training, without abuse', n: 1 },
  { label: 'an apprentice trained to the Gauntlet, without abuse', n: 1 },
  { label: 'a gift from a grateful magus', n: 1 },
];
export const SHARD_REASONS: { label: string; n: number }[] = [
  { label: 'guilty of a High Crime', n: 3 },
  { label: 'guilty of a Low Crime', n: 1 },
  { label: 'a prosecution ending in acquittal', n: 1 },
  { label: 'a successful decree of defamation against you, or losing your own', n: 1 },
  { label: 'declining election to the Council when eligible', n: 1 },
  { label: 'neglect of an arche’s duties, or of a duty promised to one', n: 1 },
  { label: 'refusing to surrender a Gifted child', n: 2 },
  { label: 'abuse of an apprentice', n: 1 },
];

export interface ThebanState {
  citizen: boolean;
  phyle?: string;
  tokens: number;
  shards: number;
  log: { year: number; text: string }[];
}

export function thebanStatus(t: ThebanState, hasLongevity: boolean): string[] {
  const out: string[] = [];
  if (!t.citizen) return ['A metoikos: no tokens or shards; may seek a decree of citizenship at Tribunal (a contribution to the polity, residence at an established covenant, and an arche as sponsor).'];
  if (t.shards > 0) out.push(`Liable to the vote of ostracism at the next Tribunal (${t.shards} shard${t.shards > 1 ? 's' : ''}); neutralize or seek a decree of contrition.`);
  if (t.shards === 0 && !hasLongevity) out.push(`May apply to the treasurer by spring for the Tribunal’s yearly Longevity Ritual: the applicant with the most tokens wins and surrenders them (winners usually hold three or four).`);
  return out;
}

/**
 * The Ceremony of Propitiation: a patron gains 25 experience points, less its Might, which each pawn of
 * vis offered reduces by two.
 */
export function propitiationXp(might: number, pawns: number): number {
  return Math.max(0, 25 - Math.max(0, might - 2 * pawns));
}

// ================================================================ Normandy

export type PertheanStatus = 'seisin' | 'legacy' | 'tropaeum' | 'luctatio' | 'interim' | 'undeclared';

export const PERTHEAN: Record<PertheanStatus, { label: string; note: string; lease?: number }> = {
  seisin: { label: 'Seisin', note: 'within a day’s return march of the council chamber: the covenant’s own, while unchallenged' },
  legacy: { label: 'Legacy', note: 'a seven-year lease; its renewal needs a vote at Tribunal, or it becomes a tropaeum', lease: 7 },
  tropaeum: { label: 'Tropaeum', note: 'won at the Tourney; held until the next one', lease: 7 },
  luctatio: { label: 'Luctatio', note: 'contested: free to any who can take it' },
  interim: { label: 'Interim lease', note: 'reported to a Quaesitor; not exclusive until declared at Tribunal' },
  undeclared: { label: 'Undeclared', note: 'harvesting it is plundering, a Low Crime (fines above three times the vis)' },
};

/** A cursor's day: 10 + 2 × Athletics miles cross-country, 5 fewer through wilderness, 5 more on good roads. Out and back in a day. */
export function cursorMiles(athletics: number, terrain: 'country' | 'wild' | 'roads'): { day: number; reach: number } {
  const day = 10 + 2 * athletics + (terrain === 'wild' ? -5 : terrain === 'roads' ? 5 : 0);
  return { day, reach: day / 2 };
}

/** The Tourney's events: points by place, and a point for taking part. */
export const TOURNEY_EVENTS: { id: string; label: string; places: number[]; participation: number }[] = [
  { id: 'hastiludium', label: 'Hastiludium', places: [20, 10, 5, 5], participation: 1 },
  { id: 'certamen', label: 'Certamen tournament', places: [25, 15, 8, 8], participation: 1 },
  { id: 'dimicatio', label: 'Dimicatio', places: [23, 12, 6, 6], participation: 1 },
  { id: 'melee', label: 'Melee', places: [6, 2, 2, 2, 1], participation: 0 },
  { id: 'host', label: 'Host’s choice', places: [12, 8, 3, 3], participation: 1 },
  { id: 'joust', label: 'Joust', places: [20, 8, 3, 3], participation: 1 },
];

/** Prize pawns by final rank (24 teams, about 200 pawns of prizes). The 21st keeps 6 and gives 6 away. */
export const TOURNEY_PRIZES = [31, 24, 18, 15, 13, 11, 17, 8, 7, 6, 6, 5, 0, 11, 3, 5, 4, 3, 5, 1, 12];
export const SIEGES: Record<number, string> = { 1: 'Siege of Normandy', 2: 'Siege of Valor', 7: 'Siege of Notatus', 13: 'Siege of Shame', 21: 'Siege of Alms' };

/** A team's tally: its covenant's magi (one for a visiting team), plus its events. place: 0 not entered, −1 took part, n placed nth. */
export function tourneyTally(members: number, results: Record<string, number>): { total: number; parts: { label: string; value: number }[] } {
  const parts = [{ label: 'Covenant members', value: Math.max(1, members) }];
  for (const e of TOURNEY_EVENTS) {
    const place = results[e.id] ?? 0;
    if (!place) continue;
    const pts = (place > 0 ? e.places[place - 1] ?? 0 : 0) + e.participation;
    parts.push({ label: e.label, value: pts });
  }
  return { total: parts.reduce((s, p) => s + p.value, 0), parts };
}

export function tourneyPrize(rank: number): { pawns: number; siege?: string; reputation: boolean } {
  const pawns = TOURNEY_PRIZES[rank - 1] ?? 0;
  const siege = SIEGES[rank];
  return { pawns, siege, reputation: !!siege };
}

// ================================================================ Transylvania

export const PRIVILEGES: { id: string; label: string; covenant: string; who: string; may: string[]; must: string[] }[] = [
  { id: 'cives', label: 'Cives (citizen)', covenant: 'Coeris', who: 'Tremere, and magi the Tribunal esteems',
    may: ['use House Tremere’s methods of assistance', 'stand for any office, Praeco included', 'raise apprentices', 'move between oppida (if not Tremere)', 'dress in black or grey at Tribunal'],
    must: ['live as Tremere admire: cooperate with the House, do useful work, muster for war, pay taxes', 'wear no Decorations not earned'] },
  { id: 'socii', label: 'Socius (ally)', covenant: 'Domostron', who: 'Quaesitores, Redcaps and dedicated hoplites',
    may: ['dedicated resources, and extraordinary taxes in a crisis', 'military protection and aid', 'stand for any office but Praeco', 'raise an apprentice'],
    must: ['fulfil their duties', 'seek permission before founding oppida', 'serve as aedile when no one else can', 'wear their badges of office at Tribunal'] },
  { id: 'coloniae', label: 'Colonus (settler)', covenant: 'Asclepius', who: 'young magi from other Tribunals settling new land',
    may: ['aid in war or disaster', 'free use of the resources in their privilege', 'a share of new resources found'],
    must: ['not choose their aedile, act scandalously, or seek office but aedile', 'not take apprentices without permission, or invite other magi in', 'not call themselves archmagus'] },
  { id: 'hospites', label: 'Hospes (guest)', covenant: 'Diodorus', who: 'magi hired for their skills',
    may: ['fair payment as negotiated', 'the resources allotted to their tasks', 'protection in Wizard’s War', 'freedom from many taxes and from Wizard’s Marches'],
    must: ['seek permission before office, a new apprentice, familiar or talisman, founding or changing oppidum'] },
  { id: 'foederati', label: 'Foederatus (confederate)', covenant: 'Pannonia', who: 'covenants that joined from neighbouring Tribunals',
    may: ['military protection and aid', 'keep the resources they brought, and their customs', 'train apprentices', 'change oppidum (with notice), seek any office'],
    must: ['seek permission to drop their written duties, found oppida, invite outsiders, or trade vis or items with outsiders'] },
];
