// Travel, trade and intrigue from City & Guild: journeys by road, river and sea (ch.5), the merchants'
// stories and investments of time (ch.7), skullduggery and indirect intrigue against the powerful, a
// house's Reputation and largesse, and dowries.

import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';
import { WEALTH_MULT, type Wealth } from './workshop';

// ------------------------------------------------------------------------------ Travel (ch.5)

/** Miles a day by means of transport: the lower figure for ordinary going, the higher for good roads and weather. */
export const TRAVEL_MODES: { id: string; label: string; miles: [number, number]; cost: 'sea' | 'river' | 'road'; hint: string }[] = [
  { id: 'cargo', label: 'Road cargo (carts, pack animals)', miles: [15, 25], cost: 'road', hint: 'Most road cargoes.' },
  { id: 'packhorse', label: 'Mounted, light loads on packhorses', miles: [24, 24], cost: 'road', hint: 'A mounted merchant with light loads.' },
  { id: 'coach', label: 'Coach (passengers)', miles: [18, 24], cost: 'road', hint: 'Less comfortable the faster it goes.' },
  { id: 'courier', label: 'Courier (a single rider)', miles: [30, 30], cost: 'road', hint: 'A skilled rider on one horse.' },
  { id: 'relay', label: 'Courier with remounts, breaking horses', miles: [90, 90], cost: 'road', hint: 'With a steady supply of remounts.' },
  { id: 'barge', label: 'River barge', miles: [8, 10], cost: 'river', hint: 'Faster downriver than up.' },
  { id: 'ship', label: 'Sailing ship', miles: [60, 80], cost: 'sea', hint: 'Very dependent on weather: ventures can stall for weeks; very large ships are slower.' },
  { id: 'galley', label: 'Galley', miles: [60, 80], cost: 'sea', hint: 'Almost as fast as sail whatever the wind; must restock every week.' },
];

/** Travel cost relative to the sea: river twice, road 8 to 20 times (by distance, risk and side cargoes). */
export const COST_FACTOR: Record<'sea' | 'river' | 'road', [number, number]> = { sea: [1, 1], river: [2, 2], road: [8, 20] };

/** A journey: days (fewest to most) and what passage costs a party, at a pound a fortnight for eight people by sea (magi pay double if known). */
export function journey(miles: number, mode: string, people: number, knownMagi = 0): { days: [number, number]; pounds: [number, number]; text: string } {
  const m = TRAVEL_MODES.find((x) => x.id === mode) ?? TRAVEL_MODES[0];
  const days: [number, number] = [Math.ceil(miles / m.miles[1]), Math.ceil(miles / m.miles[0])];
  // a pound buys a fortnight's passage for eight; a known magus is charged double
  const perDay = (Math.max(0, people) + Math.max(0, knownMagi)) / (8 * 14);
  const f = COST_FACTOR[m.cost];
  const pounds: [number, number] = [round2(perDay * days[0] * f[0]), round2(perDay * days[1] * f[1])];
  const span = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
  return { days, pounds, text: `${miles} miles: ${span(days[0], days[1])} days; passage about ${span(pounds[0], pounds[1])} £ for ${people} ${people === 1 ? 'person' : 'people'}${knownMagi ? ` (${knownMagi} known magus paying double)` : ''}.` };
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Carrying cargo by land and sea (ch.5, Vessels): load in tons, and price. */
export const CARRIERS: { label: string; tons: string; price: string }[] = [
  { label: 'A horse', tons: '0.15 (400 pounds)', price: '½ £' },
  { label: 'A two-wheeled cart (2 or 3 horses)', tons: '½ to ¾', price: '20 d' },
  { label: 'A four-wheeled cart (6 horses; good roads and bridges)', tons: '1¼', price: '40 d' },
  { label: 'A great cart on smooth, wide paved roads (6 horses)', tons: '1¾', price: '1 £' },
  { label: 'A river barge', tons: '1 to 20 (by the river’s depth)', price: '—' },
  { label: 'A buss (coastal)', tons: '20, 8 crew or fewer', price: '4 £ per 10 tons' },
  { label: 'A cog or nef', tons: '20 to 100+ (a dozen or 18 crew at 100)', price: '4 £ per 10 tons' },
  { label: 'A galley', tons: '20 to 30, about 160 crew', price: '25 £ per ton' },
];

/** Finding people, places and things with Intelligence + Area Lore (ch.5): −3 to find in the hinterland for a townsman, or in the city for a country dweller. */
export const AREA_LORE_EASE: { ease: number; what: string }[] = [
  { ease: 6, what: 'a shop for common goods; free fishing or hunting spots; any major road, ferry, ford, pass or bridge and its hazards; any major inn; how to behave at festivals' },
  { ease: 9, what: 'a shop for a section of society (farrier, cooper, weaponsmith); most hedge magicians; smaller roads; hazards off the main routes; the largest inn near each village; people with Reputations of 6+; customs it is illegal to ignore' },
  { ease: 12, what: 'a shop for a narrow group (books, cosmetics, luxury cloth); the road to any mundane place in the region; the hazardous parts of a town and how to pass them; small inns and good campsites; people with Reputations of 3+' },
  { ease: 15, what: 'illegal, repressed services (burglars, kidnappers, poisoners); minor tracks and deserted places; places of ill repute; the best room in any season; anyone publicly part of a community on the route; who really holds power' },
  { ease: 18, what: 'heinous services (murderers for hire); roads under supernatural influence; hazards that come and go (bailiffs’ circuits, customs men’s ways); how to reach smugglers or bandits' },
];

/** A chase, a boarding or a ram at sea: each captain rolls stress die + Intelligence + Profession + up to 3 for an experienced crew (ch.5, Ship Combat). */
export function captainsRoll(a: number, b: number, rng: Rng = defaultRng): { winner: 'first' | 'second' | 'tie'; text: string } {
  const ra = stressDie(1, rng);
  const rb = stressDie(1, rng);
  const ta = ra.botches ? -Infinity : ra.value + a;
  const tb = rb.botches ? -Infinity : rb.value + b;
  const show = (r: ReturnType<typeof stressDie>, t: number, base: number) => (r.botches ? `${describeStress(r)} (botch)` : `${base} + ${describeStress(r)} = ${t}`);
  const winner = ta > tb ? 'first' : tb > ta ? 'second' : 'tie';
  return { winner, text: `${show(ra, ta, a)} against ${show(rb, tb, b)}: ${winner === 'tie' ? 'neither gains the advantage' : `the ${winner === 'first' ? 'first' : 'second'} captain boards, rams or slips away`}.` };
}

/** What artillery and rams do (ch.5): a ballista kills a crewman a hit, a light catapult incapacitates a simple die ÷ 2; a ram founders a ship in 5 × simple die minutes; sheared oars disable 2 × simple die rowers. */
export function shipBlow(kind: 'ballista' | 'catapult' | 'ram' | 'oars', rng: Rng = defaultRng): string {
  const d = simpleDie(rng).value;
  if (kind === 'ballista') return 'A ballista hit kills one of the enemy crew (range 600 yards, ten rounds to reload).';
  if (kind === 'catapult') return `Splinters incapacitate ${Math.max(1, Math.floor(d / 2))} of the enemy (range 200 yards, ten rounds to reload).`;
  if (kind === 'ram') return `Rammed soundly: the ship founders in ${5 * d} minutes.`;
  return `Oars sheared: ${2 * d} rowers incapacitated, and the galley cannot make way until new oars are shipped.`;
}

// ------------------------------------------------------------------------------ Merchants' stories and investments (ch.7)

export type MerchantKind = 'all' | 'carrier' | 'adventurer' | 'factor' | 'capo';
export const MERCHANT_KINDS: Record<MerchantKind, string> = { all: 'Any merchant', carrier: 'Local carrier', adventurer: 'Merchant adventurer', factor: 'Factor', capo: 'Capo' };

/** Story seeds and their Labor Points, in seasons' worth (ch.7). */
export const STORY_SEEDS: { id: string; label: string; seasons: number; kind: MerchantKind; hint: string }[] = [
  { id: 'archeological', label: 'An archeological find', seasons: 1, kind: 'all', hint: 'Something old and valuable turns up in the merchant’s dealings.' },
  { id: 'hard-time', label: 'Hard time: rehabilitating a ruined friend', seasons: 1, kind: 'all', hint: 'A servant, friend or sponsor imprisoned for debt is brought back to wealth.' },
  { id: 'abduction', label: 'Abduction or elopement', seasons: 1, kind: 'carrier', hint: 'A potentate’s daughter and a young merchant on the road.' },
  { id: 'ship-rock', label: 'Accident: refloating a ship on a rock', seasons: 1, kind: 'carrier', hint: '' },
  { id: 'wagon', label: 'Accident: an overturned wagon, a hurt employee', seasons: 0.5, kind: 'carrier', hint: 'Get him to safety and keep the cargo from being pilfered.' },
  { id: 'holed', label: 'Accident: a ship fatally holed, castaways', seasons: 1, kind: 'carrier', hint: '' },
  { id: 'wreck', label: 'Accident: salvaging a wreck', seasons: 1, kind: 'carrier', hint: 'Beware whatever caused it.' },
  { id: 'brigands', label: 'Brigands on the route', seasons: 1.5, kind: 'carrier', hint: 'Nobles, convoys, mercenaries — or magi.' },
  { id: 'oasis', label: 'An oasis: a new resource found', seasons: 1.5, kind: 'carrier', hint: 'An ore body, a spring, a pass; the wrong partners may wrest it away.' },
  { id: 'smugglers-den', label: 'Setting up a smugglers’ den', seasons: 1.5, kind: 'carrier', hint: 'A base, crews, a community that keeps quiet.' },
  { id: 'stowaway', label: 'A stowaway', seasons: 0.5, kind: 'carrier', hint: 'A monster, or a refugee of the magi’s doings.' },
  { id: 'dead', label: 'Transporting the dead', seasons: 1, kind: 'carrier', hint: 'A nobleman’s body, without the crew knowing.' },
  { id: 'vanished', label: 'A vanished village', seasons: 1.5, kind: 'carrier', hint: 'Pirates or faeries; prompt action saves the survivors.' },
  { id: 'reprisal', label: 'A writ of reprisal', seasons: 1, kind: 'carrier', hint: 'Against the Order, it brings a Quaesitor.' },
  { id: 'raid', label: 'Amphibious assault: loot and burn', seasons: 1, kind: 'adventurer', hint: '' },
  { id: 'raid-selective', label: 'Amphibious assault: selective destruction', seasons: 1.5, kind: 'adventurer', hint: 'Naval infrastructure only.' },
  { id: 'beachhead', label: 'Amphibious assault: a beachhead', seasons: 2, kind: 'adventurer', hint: 'Restrain the forces, recruit collaborators.' },
  { id: 'sailing-instructions', label: 'Antique sailing instructions (treasure)', seasons: 1, kind: 'adventurer', hint: 'Half to one and a half seasons’ worth, as it plays out.' },
  { id: 'pirate-lair', label: 'Pirate hunting: finding the lair', seasons: 1, kind: 'adventurer', hint: '1½ if the nest is burned out; a fleet’s leader 1½, participants 1.' },
  { id: 'remittance', label: 'A remittance shipment', seasons: 1, kind: 'adventurer', hint: '1½ if attacked.' },
  { id: 'foreign-rivals', label: 'Foreign rivals held off', seasons: 2, kind: 'factor', hint: '1½ for making them junior partners, 1 for selling out comfortably.' },
  { id: 'wrecks', label: 'Recovering wrecks', seasons: 1, kind: 'factor', hint: '' },
  { id: 'nobles', label: 'Resisting a noble', seasons: 1, kind: 'factor', hint: 'Turning aside a powerful noble’s will.' },
  { id: 'withdrawal', label: 'Withdrawal from a region', seasons: 1.5, kind: 'factor', hint: 'Ruthless, or finding a way to make it pay.' },
  { id: 'unskilled-factor', label: 'An unskilled factor dealt with in time', seasons: 1.5, kind: 'capo', hint: 'Cleaning up after one: 1 season.' },
  { id: 'branch', label: 'Founding a branch', seasons: 0.5, kind: 'capo', hint: 'Stake capital, a house, a warehouse, guards, spies.' },
];

/** Investments of time (ch.7): Labor Points a season from scores × the wealth multiplier, or a fixed share of a season's worth. */
export const TIME_INVESTMENTS: { id: string; label: string; kind: MerchantKind; worth?: number; scores?: [string, string]; hint: string }[] = [
  { id: 'convoy', label: 'Leading a convoy or caravan', kind: 'adventurer', worth: 0.5, hint: 'Half a season’s worth a season (a season’s worth played as a story); success builds a Reputation.' },
  { id: 'investors', label: 'Hunting for a sponsor', kind: 'adventurer', worth: 0.5, hint: 'Half a season’s worth (a season’s worth as a story); needed for each voyage until Reputation 3.' },
  { id: 'blockade', label: 'Running a blockade', kind: 'adventurer', worth: 1, hint: 'A season’s worth (1½ as a story), on a Dexterity + Profession roll against 15; failure means battle with the blockaders.' },
  { id: 'seeking', label: 'Seeking things for the house', kind: 'adventurer', worth: 0.5, hint: 'Lost books, rare goods, choirboys for Rome.' },
  { id: 'customs', label: 'Holding a customs office', kind: 'adventurer', worth: 0.5, hint: 'Half a season’s worth a season; a mission played out is a season’s worth.' },
  { id: 'government', label: 'A change of government', kind: 'factor', scores: ['Com', 'intrigue'], hint: '(Communication + Intrigue) × wealth, and the Favor of a minor political figure (a season’s worth as a story).' },
  { id: 'talent', label: 'Recruiting young talent', kind: 'factor', scores: ['Com', 'leadership'], hint: '(Communication + Leadership) × wealth, and a Favor for every 10 points, rounded up (a season’s worth and a Favor as a story).' },
  { id: 'repossession-guild', label: 'Repossession from a powerful guildsman', kind: 'factor', worth: 0.5, hint: 'A season’s worth as a story; from a merchant or craftsman, half a season’s worth as a story and nothing as an investment.' },
  { id: 'repossession-noble', label: 'Repossession from a priest or nobleman', kind: 'factor', worth: 1, hint: '1½ as a story.' },
];

/** Labor Points an investment of time earns this season. */
export function investmentLp(id: string, worth: number, wealth: Wealth, scores: Record<string, number>): { lp: number; favors: number } {
  const inv = TIME_INVESTMENTS.find((x) => x.id === id);
  if (!inv) return { lp: 0, favors: 0 };
  if (inv.scores) {
    const lp = Math.max(0, (scores[inv.scores[0]] ?? 0) + (scores[inv.scores[1]] ?? 0)) * WEALTH_MULT[wealth];
    return { lp, favors: id === 'talent' ? Math.ceil(lp / 10) : 1 };
  }
  return { lp: Math.round((inv.worth ?? 0) * worth), favors: 0 };
}

/** Running a blockade: Dexterity + Profession + stress die against 15. */
export function blockadeRoll(dex: number, profession: number, rng: Rng = defaultRng): { ok: boolean; text: string } {
  const r = stressDie(1, rng);
  const t = r.botches ? 0 : r.value + dex + profession;
  const ok = !r.botches && t >= 15;
  return { ok, text: `Dexterity + Profession ${dex + profession} + ${describeStress(r)} = ${r.botches ? 'botch' : t} vs 15: ${ok ? 'through the blockade' : 'identified: battle with the blockading ships'}.` };
}

/** A capo’s lavish entertainment (ch.7): a die + Characteristic + the theme Ability + a pound a point (up to Intrigue); a Favor for every 5, rounded up. */
export function entertain(characteristic: number, ability: number, pounds: number, intrigue: number, rng: Rng = defaultRng): { favors: number; text: string } {
  const d = simpleDie(rng).value;
  const spent = Math.min(Math.max(0, pounds), Math.max(0, intrigue));
  const t = d + characteristic + ability + spent;
  const favors = Math.max(0, Math.ceil(t / 5));
  return { favors, text: `${d} + ${characteristic} + ${ability} + ${spent} (pounds, up to Intrigue ${intrigue}) = ${t}: ${favors} Favor${favors === 1 ? '' : 's'} owed.` };
}

// ------------------------------------------------------------------------------ Skullduggery and intrigue (ch.7)

/** What hiring criminals costs (ch.7, Skullduggery). */
export const SKULLDUGGERY: { id: string; label: string; pounds: number; hint: string }[] = [
  { id: 'mugging', label: 'Assassination dressed as a mugging', pounds: 2, hint: 'Usually fails against factors with minders.' },
  { id: 'exotic', label: 'Assassination by poison or a bolt through a window', pounds: 5, hint: 'Per attempt, in advance.' },
  { id: 'beating', label: 'A beating or humiliation', pounds: 1, hint: 'Half an assassination if the victim is rich; poor people can be attacked for free, at the price of a Reputation for ruthlessness.' },
  { id: 'kidnap', label: 'A kidnapping', pounds: 4, hint: 'Twice an assassination.' },
  { id: 'sabotage', label: 'Sabotage', pounds: 1, hint: 'Per attempt, in advance, whatever the outcome.' },
  { id: 'theft', label: 'Large-scale theft', pounds: 0, hint: 'The thieves want at least half the cargo’s value in coin; the goods must be stored, fenced or shipped.' },
];

/** Bribing an official (ch.7): a week's wages for an easy favor, a month's for a risky one, a year's or more for one that could cost the job; 10% of the gain for regular favors. */
export const CG_BRIBES: { label: string; weeks: number; example: string }[] = [
  { label: 'An easily granted favor', weeks: 1, example: 'A harbormaster bumps a ship up the list for the dock crane.' },
  { label: 'Serious trouble if discovered', weeks: 4, example: 'A gate guard lets a merchant in before a market day opens.' },
  { label: 'The official’s job if discovered', weeks: 52, example: 'A priest breaks the seal of the confessional.' },
];

/** The sabotage table: what is added to the sentry's Awareness roll. */
export const SABOTAGE: { label: string; bonus: number; example: string }[] = [
  { label: 'Defacement', bonus: 0, example: 'A bladder of ink at a monument.' },
  { label: 'Rendezvous', bonus: 3, example: 'Meeting a spy inside, or seducing a relative in their own house.' },
  { label: 'Arson', bonus: 6, example: 'A large fire in a warehouse or house.' },
  { label: 'Burglary', bonus: 9, example: 'Documents searched for and taken.' },
  { label: 'Spoilage', bonus: 12, example: 'Fish oil in every barrel of an export of wine.' },
];

/** Sabotage (ch.7): the agent's Dexterity + Stealth + stress die beats the best sentry's Perception + Awareness + stress die + 1 a further sentry + the table's bonus. Unplayed, the hirer's Communication + Intrigue stands in for the agent. */
export function sabotageRoll(agent: number, sentry: number, sentries: number, bonus: number, rng: Rng = defaultRng): { ok: boolean; text: string } {
  const a = stressDie(1, rng);
  const s = stressDie(1, rng);
  const ta = a.botches ? -Infinity : a.value + agent;
  const ts = (s.botches ? 0 : s.value) + sentry + Math.max(0, sentries - 1) + bonus;
  const ok = ta > ts;
  return { ok, text: `Agent ${a.botches ? `${describeStress(a)}: botch` : `${agent} + ${describeStress(a)} = ${ta}`} against the sentries’ ${ts}: ${ok ? 'done unseen' : 'discovered: the saboteur must disengage and hide'}.` };
}

/** The Communication + Intrigue + stress die a hirer rolls in place of the criminals’ own, for crimes not played out. */
export function proxyRoll(com: number, intrigue: number, rng: Rng = defaultRng): { total: number; text: string } {
  const r = stressDie(1, rng);
  const total = r.botches ? 0 : r.value + com + intrigue;
  return { total, text: `Communication + Intrigue ${com + intrigue} + ${describeStress(r)} = ${r.botches ? 'botch: the hirelings bungle it, or betray the hirer' : total}.` };
}

/** Intrigue and the art of indirect action (ch.7): Intelligence + Intrigue against these, to learn about or harm a powerful target. Above 6 it takes 3 × the Ease Factor in days and at least Ease ÷ 3 pounds. */
export const INDIRECT_INTRIGUE: { ease: number; what: string[] }[] = [
  { ease: 3, what: ['The stated reason for a public enmity with other nobles.', 'One of the target’s well-known vices (Reputation 3+).'] },
  { ease: 6, what: ['The reason behind public friction with other nobles.', 'A lesser vice (Reputation 1+).', 'A rumor that lowers one of the target’s Reputations by 1, the source unhidden.'] },
  { ease: 9, what: ['The reason behind a private hostility.', 'Small private vices known only to servants.', 'A lesser vice of a relative or friend (not chosen).', 'A rumor that creates a negative Reputation of 1 (traced by a higher Intelligence + Intrigue).'] },
  { ease: 12, what: ['The reason behind private friction.', 'What would push a private hostility into public enmity.', 'A Story Flaw known to several.', 'A friend’s small private vices.', 'Forged tawdry evidence: a negative Reputation of 2 (found out, the forger gains a poor one).'] },
  { ease: 15, what: ['An old, forgotten grudge or enemy.', 'What would push a rival from friction into enmity.', 'A Story Flaw known to a few, some disloyal.', 'What would make a friend or relative feel wronged.', 'Forged evidence of a crime (found out: legal reprisal).'] },
  { ease: 18, what: ['The crimes of the target’s ancestors.', 'What would rouse a defeated enemy.', 'A Story Flaw known only to the loyal.', 'What would turn a friend to conspiracy.', 'A forged Dark Secret (tied to the forger only at 21+).'] },
];

export function indirectRoll(int: number, intrigue: number, ease: number, rng: Rng = defaultRng): { ok: boolean; text: string } {
  const r = stressDie(1, rng);
  const t = r.botches ? 0 : r.value + int + intrigue;
  const ok = !r.botches && t >= ease;
  const time = ease > 6 ? ` It takes ${3 * ease} days and at least ${Math.ceil(ease / 3)} £.` : '';
  return { ok, text: `Intelligence + Intrigue ${int + intrigue} + ${describeStress(r)} = ${r.botches ? 'botch: the meddling is noticed' : t} vs ${ease}: ${ok ? 'it works' : 'nothing useful'}.${time}` };
}

// ------------------------------------------------------------------------------ A house's Reputation and largesse (ch.7)

/** Largesse that endures: what a marvelous public building costs (ch.7). */
export const LARGESSE_BUILDINGS: { label: string; pounds: number }[] = [
  { label: 'A monument', pounds: 1 },
  { label: 'A road', pounds: 2.5 },
  { label: 'A house', pounds: 5 },
  { label: 'A well', pounds: 7.5 },
  { label: 'A bridge', pounds: 10 },
  { label: 'A mill', pounds: 25 },
  { label: 'A chapel', pounds: 40 },
  { label: 'A church', pounds: 250 },
];

/** Largesse that dissipates (a festival): a point of Reputation experience for every pound per thousand people in the city. */
export const festivalXp = (pounds: number, population: number) => Math.floor(Math.max(0, pounds) / Math.max(1, population / 1000));

/** Warehouses: 10 pounds per 100 tons of storage; usually a guard per 10 tons, day and night (ch.7, Company Neighborhood). */
export const warehouse = (tons: number) => ({ pounds: Math.ceil(tons / 100) * 10, guards: Math.ceil(tons / 10) });

// ------------------------------------------------------------------------------ Dowries (ch.7)

/**
 * A merchant's daughter's dowry (ch.7): a father two Social Statuses above the groom raises him to Poor in the status just
 * below his own (the groom's surplus Labor Points are lost); otherwise ten years' profit shared among the children still at
 * home (married daughters not counted), paid in coin and goods.
 */
export function dowry(fatherProfit: number, children: number, statusAboveGroom: number): { pounds: number; text: string } {
  if (statusAboveGroom >= 2) return { pounds: 0, text: 'The bride’s father raises the groom to Poor in the Social Status just below his own; the groom’s surplus Labor Points are lost.' };
  const pounds = Math.round((10 * Math.max(0, fatherProfit)) / Math.max(1, children));
  return { pounds, text: `About ${pounds} £ in coin and goods (ten years’ profit of ${fatherProfit} £ among ${Math.max(1, children)} child${children === 1 ? '' : 'ren'}). Larger if she marries up, is one of many brides, is not much younger than him, gets nothing later, has few or mostly male siblings, or it comes in installments or assets; smaller otherwise.` };
}
