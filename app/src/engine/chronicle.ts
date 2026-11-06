// The Chronicle: each season told as a story, for the table to read aloud, with the numbers kept to a
// few (the pawns gathered, the pounds the year made) and the full record folded beneath it. Written as
// the season ends from what it did: the weather and the feast days, what each character spent it on,
// who came up the road, the year's harvest and vis, the years telling on the old, and the news a Redcap
// brought from the Tribunal.

import { ART_NAMES, type Art } from '../data';
import type { Rng } from './dice';
import type { IncomeModification, Season, SeasonActivityKind, TribunalNews } from './types';

export interface ChronicleSection {
  title: string;
  text: string;
}

export interface ChronicleFacts {
  year: number;
  season: Season;
  covenants: {
    name: string;
    realm: string;
    /** a Road Hook: mundane travellers (Minor) or mystical ones (Major) */
    road?: 'minor' | 'major';
    urban?: boolean;
    remote?: boolean;
    /** at the year's end: each source of income's year, the vis gathered, the accounts */
    incomes?: { name: string; mod: IncomeModification }[];
    vis?: { name: string; art: Art; pawns: number }[];
    balance?: number;
    treasury?: number;
    feasts?: boolean;
  }[];
  /** the players' people and what they spent the season on */
  people: { name: string; type: string; did?: SeasonActivityKind; away?: boolean }[];
  /** at the year's end: those the years told on, those in crisis, those the aura changed, the dead */
  aged?: string[];
  crises?: string[];
  warped?: string[];
  died?: string[];
  /** what a Redcap brought: the Tribunal's news this season */
  news: TribunalNews[];
  /** what the players' agents heard */
  reports?: string[];
}

const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length];
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const OPENINGS: Record<Season, string[]> = {
  Spring: [
    'The thaw came late, and for weeks the meltwater ran loud in every ditch and gully before the first green showed on the hills.',
    'Spring came on wet and gentle. The fields were ploughed in a fine rain, and lambs bleated in the lower pastures by the end of the first month.',
    'A hard frost lingered into spring, blackening the first blossom on the orchard trees, but by Eastertide the woods were loud with birdsong.',
    'The roads turned to mire with the thaw, and for a while nothing came or went; then the sun returned, and with it the carters and the cuckoo.',
  ],
  Summer: [
    'Summer settled in hot and still. The hay was cut early and stacked high, and in the long evenings the covenfolk lingered in the courtyard until the stars came out.',
    'It was a thundery summer: heavy afternoons broken by storms that rolled in off the hills and left the air washed clean.',
    'The summer was dry, the streams low and the dust thick on the roads; the wells were watched closely and the gardens watered by hand.',
    'A green, generous summer: the barley stood tall, the bees were busy in the clover, and the days seemed to go on forever.',
  ],
  Autumn: [
    'Autumn came in gold and russet. The harvest was brought in under a hunter’s moon, and the smell of woodsmoke and apples hung over the covenant.',
    'The rains came early that autumn, and the last of the grain was carried in wet; the steward fretted over mildew in the barns.',
    'A long, mild autumn: swallows lingered, the vines hung heavy, and the pigs grew fat on the beech mast in the woods.',
    'The leaves turned and fell in a single blustering week, and the nights drew in fast; geese passed over, crying, towards the south.',
  ],
  Winter: [
    'Winter closed in hard. Snow lay deep on the passes, the well-rope froze stiff each morning, and the hall fire was never let die.',
    'It was a grey, wet winter rather than a cold one: mud in the yard, damp in the stores, and coughs in every corner of the covenant.',
    'A bitter cold came down after the solstice; wolves were heard in the forest at night, and the grogs doubled the watch on the gate.',
    'The winter was kind, as winters go: clear frosty days, bright stars, and enough firewood stacked against the walls to last until spring.',
  ],
};

const FEASTS: Record<Season, string[]> = {
  Spring: [
    'Easter was kept with candles and new bread, and the covenfolk walked the bounds of the fields on the Rogation days, blessing the young crops.',
    'On Lady Day the rents were reckoned, and the covenfolk danced around a may-pole on the first of May, crowned with hawthorn.',
    'At Pentecost the chapel was hung with greenery, and there was a feast in the hall that went on long after dark.',
  ],
  Summer: [
    'On Midsummer’s Eve bonfires burned on the hilltops, and the young folk leapt the flames for luck while the old ones muttered about what walks abroad on such nights.',
    'Lammas brought the first loaf of the new wheat to the altar, and a fair in the nearest village drew half the covenfolk away for a day of games and gossip.',
    'The feast of Saint John was kept with garlands and ale, and a wandering piper played in the courtyard until the candles guttered.',
  ],
  Autumn: [
    'At Michaelmas the accounts were made up and the servants hired anew, and a fat goose was roasted for the hall.',
    'All Hallows and All Souls were kept solemnly: candles for the dead, and doors barred against whatever else the night might bring.',
    'At Martinmas the beasts that could not be wintered were slaughtered and salted, and the covenant ate well for a week.',
  ],
  Winter: [
    'Christmas was kept for the full twelve days: the Yule log, mummers in the hall, and a Lord of Misrule chosen from among the grogs, much to everyone’s regret.',
    'Candlemas brought a procession of lights through the snow, and the covenfolk read the weather for the year ahead in the morning’s sky.',
    'At Twelfth Night the cake was cut and the bean found, and the one who found it ruled the hall for an evening of games and foolishness.',
  ],
};

const DID: Partial<Record<SeasonActivityKind, string[]>> = {
  'study-book': ['read late into the nights, the candle guttering over a book', 'kept to the library with a borrowed text', 'pored over a book, making notes in the margins'],
  'study-vis': ['studied raw vis, the pawns glowing faintly as their power was drawn into understanding', 'meditated over pawns of vis until they were spent'],
  taught: ['sat at the feet of a teacher', 'took lessons, and came away with aching head and new understanding'],
  trained: ['trained hard in the yard', 'drilled under a master’s eye'],
  practice: ['practised, over and over, until it came without thought', 'spent the season in patient practice'],
  exposure: ['went about the season’s ordinary work', 'saw to the daily round of duties', 'was kept busy with the business of the covenant'],
  adventure: ['was out on the road, and came back with a tale', 'rode out on the covenant’s business'],
  teach: ['gave lessons', 'taught, patiently and at length'],
  'invent-spell': ['labored in the laboratory to shape a new spell', 'was shut in the laboratory, coaxing a new spell into being'],
  'learn-spell-text': ['learned a spell from a laboratory text'],
  'learn-spell-teacher': ['learned a spell from another’s instruction'],
  'enchant-item': ['bent over an enchantment, binding power into matter', 'worked at an enchanted device, the laboratory humming with power'],
  'longevity-ritual': ['worked on a Longevity Ritual, against the years'],
  'bind-familiar': ['sought to bind a familiar'],
  'vis-extraction': ['drew vis from the aura into a vessel'],
  'write-book': ['wrote, the scratching of the quill the only sound in the room', 'wrote, filling quire after quire'],
  'copy-book': ['copied a book, line by careful line'],
  'lab-improvement': ['saw to the laboratory: new benches, new vessels, new wards'],
  work: ['worked at the bench from dawn till dusk', 'worked at the trade, and the orders kept coming'],
  worship: ['kept the hours of prayer'],
};

const MINOR_ROAD = [
  'A merchant train stopped a night on its way to market, and its master paid for lodging with bolts of cloth and news of rising prices in the towns.',
  'Pilgrims bound for a distant shrine begged a meal at the gate, and stayed to tell of miracles along the way.',
  'A wandering friar preached in the courtyard; some of the covenfolk listened, and one or two went to confession for the first time in years.',
  'A knight and a small retinue claimed hospitality, as was their right, and ate a great deal before riding on.',
  'A tinker passed through, mending pots and selling ribbons, and left behind rumors of trouble on the borders.',
  'A troupe of players performed in the hall for their supper, and the grogs talked of nothing else for a week.',
];

const MAJOR_ROAD = [
  'At dusk, a procession of pale riders was seen passing along the old road, making no sound; by morning there was no trace of them but hoofprints in the frost.',
  'A fox that spoke in the voice of an old woman came to the gate and asked, very politely, for a cup of milk.',
  'A pilgrim who cast no shadow rested a night by the hall fire, and was gone before the cocks crowed.',
  'Strange lights moved along the hidden way after midnight, and the dogs howled until dawn.',
  'A lost spirit wandered the corridors for three nights, asking for a name no one remembered, before the magi saw it on its way.',
];

const URBAN = [
  'The town was loud with markets and quarrels; a guild procession filled the streets, and the covenant’s servants came back from errands with gossip by the basketful.',
  'There was a fire in the lower town, and a riot over the price of bread; the covenant kept its gates shut and its head down.',
  'A great lord visited the town, household and all, and for a week the streets were thick with liveried retainers and opportunity.',
];

const REMOTE = ['No one came. The covenant kept its own company, and the silence of the wilds pressed close around the walls.', 'The season passed without a single traveller at the gate.'];

const INCOME: Record<IncomeModification, string> = {
  Boom: 'had a year beyond all hope',
  Expansion: 'prospered',
  Growth: 'did a little better than the year before',
  'Status Quo': 'kept to its usual',
  Stagnation: 'faltered',
  Contraction: 'had a hard year',
  Slump: 'all but failed',
};

const OPENER: Record<string, string> = {
  death: 'Grim news came: ',
  gathering: 'Word went round the Tribunal: ',
  vote: 'From the Tribunal’s gathering: ',
  certamen: 'It was said: ',
  member: 'A Redcap brought word: ',
  apprentice: 'It was told: ',
  approach: 'A message came: ',
  event: 'A Redcap brought word: ',
};

/** The season told as a story, in sections. */
export function writeChronicle(f: ChronicleFacts, rng: Rng): ChronicleSection[] {
  const out: ChronicleSection[] = [];
  const yearEnd = f.season === 'Winter';
  // the land and the feast days
  out.push({ title: `${f.season} ${f.year}`, text: `${pick(rng, OPENINGS[f.season])} ${pick(rng, FEASTS[f.season])}` });

  // the people: the magi, then the companions, then the grogs
  const home = f.people.filter((p) => !p.away);
  if (home.length) {
    const told = (type: string) =>
      home
        .filter((p) => p.type === type && p.did)
        .map((p) => `${p.name} ${pick(rng, DID[p.did!] ?? DID.exposure!)}`);
    const magi = told('magus');
    const comps = [...told('companion'), ...told('mythic')];
    const grogs = home.filter((p) => p.type === 'grog');
    const parts: string[] = [];
    if (magi.length) parts.push(`Of the magi, ${list(magi)}.`);
    if (comps.length) parts.push(`${magi.length ? 'Among the companions, ' : ''}${list(comps)}.`.replace(/^./, (c) => c.toUpperCase()));
    if (grogs.length) parts.push(grogs.length === 1 ? `${grogs[0].name} stood the watches and kept the gate.` : `The grogs — ${list(grogs.map((g) => g.name))} — drilled in the yard and stood their watches.`);
    if (parts.length) out.push({ title: 'At the covenant', text: parts.join(' ') });
  }

  // who came up the road
  for (const c of f.covenants) {
    const visits: string[] = [];
    if (c.urban) visits.push(pick(rng, URBAN));
    if (c.road === 'major' && rng() < 0.7) visits.push(pick(rng, MAJOR_ROAD));
    if (c.road === 'minor' || (c.road === 'major' && rng() < 0.3)) visits.push(pick(rng, MINOR_ROAD));
    if (!visits.length && c.remote) visits.push(pick(rng, REMOTE));
    if (!visits.length && rng() < 0.35) visits.push(pick(rng, MINOR_ROAD));
    if (visits.length) out.push({ title: f.covenants.length > 1 ? `Visitors at ${c.name}` : 'Visitors', text: visits.join(' ') });
  }

  if (yearEnd) {
    for (const c of f.covenants) {
      const lines: string[] = [];
      const inc = c.incomes ?? [];
      if (inc.length) {
        const moved = inc.filter((i) => i.mod !== 'Status Quo');
        lines.push(moved.length ? `${list(moved.map((i) => `${i.name} ${INCOME[i.mod]}`))}${inc.length > moved.length ? `; the rest kept to their usual` : ''}.` : 'Every source of the covenant’s income kept to its usual: no great windfalls, and no disasters.');
      }
      if (c.balance !== undefined && c.treasury !== undefined)
        lines.push(
          c.balance >= 0
            ? `When the steward closed the books, the year had made ${Math.round(c.balance)} pounds more than it spent, and the treasury held ${Math.round(c.treasury)}.`
            : `When the steward closed the books, the year had cost ${Math.round(-c.balance)} pounds more than it brought in; the treasury held ${Math.round(c.treasury)}, and faces were long at the high table.`,
        );
      if (c.feasts) lines.push('The feast days were kept faithfully, and the covenfolk were the warmer toward the magi for it.');
      if (lines.length) out.push({ title: f.covenants.length > 1 ? `${c.name}: the year’s harvest` : 'The year’s harvest', text: lines.join(' ') });
      const vis = c.vis ?? [];
      if (vis.length) {
        const total = vis.reduce((t, v) => t + v.pawns, 0);
        out.push({
          title: 'The vis harvest',
          text: `As the year turned the magi went out to gather the covenant’s vis: ${list(vis.map((v) => `${v.pawns} pawn${v.pawns > 1 ? 's' : ''} of ${ART_NAMES[v.art]} from ${v.name}`))} — ${total} pawns in all, carried home and locked in the stores.`,
        });
      }
    }
    const age: string[] = [];
    if (f.aged?.length) age.push(`The years told on ${list(f.aged)}: stiffer joints on cold mornings, and a little less fire in the blood.`);
    if (f.crises?.length) age.push(`${list(f.crises)} fell gravely ill as the year turned, and for days the covenant held its breath.`);
    if (f.died?.length) age.push(`${list(f.died)} did not see the new year. The bell was rung, and the covenant mourned.`);
    if (f.warped?.length) age.push(`The magic of the place left its mark on ${list(f.warped)}: something in them is not quite as it was.`);
    if (age.length) out.push({ title: 'The passing year', text: age.join(' ') });
  }

  if (f.reports?.length) out.push({ title: 'What the agents heard', text: f.reports.join(' ') });

  // the Tribunal's news, as a Redcap would bring it
  const order = ['death', 'vote', 'gathering', 'certamen', 'member', 'apprentice', 'approach', 'event'];
  const news = f.news.filter((n) => n.kind !== 'report').sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).slice(0, 4);
  if (news.length) out.push({ title: 'News from the Tribunal', text: news.map((n) => `${OPENER[n.kind] ?? ''}${n.text.replace(/^./, (c) => c.toUpperCase())}`).join(' ') });
  return out;
}
