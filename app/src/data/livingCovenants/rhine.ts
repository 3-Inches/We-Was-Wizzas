// The covenants of the Rhine Tribunal as Guardians of the Forests describes them (chapters 5 to 10),
// for the living-covenant generator. Line numbers are those of the book in the reference library.
// Where the book leaves something out (an age, a season, the aura), a likely value is marked as a
// guess so the storyguide knows to change it if they wish.

import type { BookCovenant, TribunalBook } from './types';

const DURENMAR: BookCovenant = {
  id: 'durenmar', name: 'Durenmar', season: 'Autumn', founded: 767, place: 'the northern Black Forest, Swabia', aura: 7, realm: 'Magic', line: 1477,
  summary: 'The domus magna of House Bonisagus and the oldest covenant of the Order: home of the Great Library, the meeting place of the Rhine Tribunal and of Grand Tribunals. A perennial Autumn covenant on the verge of Winter, short of vis and of breakthroughs.',
  domusMagna: 'bonisagus', wealth: 'comfortable', library: 'great', vis: 'some', gild: 'oak',
  folk: { grogs: 12, servants: 40, craftsmen: 8, laborers: 12, text: 'Peculiar, quiet covenfolk, most born in the strong aura: every one has a Minor Flaw from Warping, those over thirty two. A band of expert huntsmen hunts the forest for vis and game.' },
  magi: [
    { name: 'Murion', house: 'bonisagus', gender: 'Female', age: 98, rank: 'archmage', role: 'politician', arts: ['Re', 'Im'], title: 'Prima of House Bonisagus, Praeco of the Tribunal', gild: 'oak', traits: [['Loyal to Personal Agenda', 3], ['Judgmental', 2], ['Loyal to House Bonisagus', 2]], note: 'Haughty and overbearing; wants Durenmar and the Rhine restored to dominance. Brilliant with Rego and Imaginem; wears a cloak of white feathers enchanted with illusions. Leads the Oak Gild.', familiar: 'Kolkrabus, a raven she sends to spy', line: 1624 },
    { name: 'Andrus', house: 'bonisagus', gender: 'Male', age: 61, rank: 'master', role: 'scholar', arts: ['In', 'Vi'], title: 'Librarian of the Great Library', gild: 'oak', traits: [['Busy', 3], ['Modest', 1], ['Strong-Willed', -1]], note: 'Murion’s first filius, a Colens Arcanorum; his duties as librarian keep him always at the covenant and away from his research. He controls access to the Great Library.', priorities: ['longevity', 'service', 'read', 'vis', 'invent', 'write'], line: 1631 },
    { name: 'Tandaline', house: 'bonisagus', gender: 'Female', age: 78, rank: 'master', role: 'lab', arts: ['Mu', 'Au'], gild: 'oak', traits: [['Opaque', 3], ['Blasé', 1], ['Sympathetic', 1]], note: 'A master of Muto and Auram who turns herself to vapor to study her Form; Murion’s closest confidante and a Tenens Occultorum of the lineage of Trianoma.', line: 1638 },
    { name: 'Caecilius', house: 'bonisagus', gender: 'Male', age: 160, rank: 'archmage', role: 'scholar', arts: ['In', 'Me'], title: 'Senior Quaesitor of the Tribunal', traits: [['Diligent', 3], ['Touchy', 2], ['Indolent', 1]], note: 'The greatest living exponent of Intellego; a reluctant Quaesitor and a brilliant investigator, troubled by frequent Twilights.', familiar: 'a silver-coated wolf', line: 1645 },
    { name: 'Occultes', house: 'bonisagus', gender: 'Male', age: 72, rank: 'master', role: 'enchanter', arts: ['In', 'Te'], gild: 'linden', title: 'Leader of the Linden Gild', traits: [['Friendly', 3], ['Inquisitive', 2], ['Showy', 1]], note: 'Researches manuscripts and items of every kind: a small golem, enchanted texts and quills. Figurehead of the outward-looking Bonisagi who would have him Primus; quietly lends the library’s restricted texts to allies.', line: 1652 },
    { name: 'Ricardus Caespuus', house: 'bonisagus', gender: 'Male', age: 56, rank: 'master', role: 'lab', arts: ['He', 'Cr'], traits: [['Reclusive', 3], ['Artistic', 2], ['Intense', 1]], note: 'Lives apart in a sanctum walled with glass, a laboratory specialized in Herbam, where he cultivates several kinds of vis from exotic plants. Tolerated for the vis he brings the covenant.', priorities: ['longevity', 'service', 'service', 'read', 'invent'], line: 1659 },
    { name: 'Petrus Virilis', house: 'bonisagus', gender: 'Male', age: 32, rank: 'journeyman', role: 'lab', arts: ['Cr', 'Co'], traits: [['Shy', 3], ['Rebellious', 1], ['Trusting', -2]], note: 'A mediocre magus whose seed is Vim vis; on Murion’s orders he has fathered five Gifted children. Secretly plans to invent a Longevity Ritual, which would likely leave him infertile.', priorities: ['longevity', 'read', 'invent', 'vis', 'invent'], line: 1666 },
    { name: 'Winfrida', house: 'guernicus', gender: 'Female', age: 27, rank: 'journeyman', role: 'politician', arts: ['In', 'Me'], traits: [['Yearning for a Better Life', 2], ['Self-Confident', -1], ['Forceful', -2]], note: 'A young, timid Quaesitor who would rather live the research life of a Bonisagus; Murion is grooming her.', line: 1678 },
    {
      name: 'Philippus Niger', house: 'flambeau', gender: 'Male', age: 125, rank: 'archmage', role: 'battle-mage', arts: ['Pe', 'Vi'], title: 'Protector of Durenmar, leader of the Ash Gild', gild: 'ash', traits: [['Alarmist', 3], ['Condescending', 3], ['Obsessive', 2], ['Cool-Tempered', -1], ['Cheerful', -3]], note: 'Has devoted his life to defending the Order against non-Hermetic wizards; the eldest of the direct line from Apromor, master of destructive magic. Lives in the Watchtower so his basilisk familiar harms no one.', familiar: 'Sordus, a basilisk',
      statArts: { Cr: 10, In: 15, Mu: 10, Pe: 35, Re: 12, An: 7, Aq: 7, Au: 7, Co: 15, He: 7, Ig: 8, Im: 5, Me: 15, Te: 7, Vi: 20 }, statChars: { Int: 5, Per: -2, Pre: -1, Com: 1, Str: -1, Sta: 2, Dex: -2, Qik: -1 }, statVirtues: ['mythic-blood', 'affinity-with-art:Pe', 'puissant-art:Pe'], line: 1685,
    },
    { name: 'Gudrun Tigurina', house: 'verditius', gender: 'Female', age: 70, ageGuess: true, rank: 'master', role: 'enchanter', arts: ['Re', 'Te'], title: 'Artificer of Durenmar', traits: [['Inventive', 2], ['Proud', 1]], note: 'Holds the title of Artificer, whose duty is to craft items for the covenant’s greatness; known as the inventor of the Crystal Custodian.', line: 1848 },
    { name: 'Xavier', house: 'mercere', gender: 'Male', age: 60, ageGuess: true, rank: 'master', role: 'scholar', arts: ['Re', 'Co'], title: 'Archivist of the Tribunal', traits: [['Meticulous', 2], ['Discreet', 1]], note: 'The Tribunal’s only Gifted member of House Mercere and its archivist; oversees Durenmar’s Mercer House.', line: 1848 },
  ],
  others: [
    { count: 3, houses: ['bonisagus'], rank: 'mixed', note: 'three other Bonisagus magi resident at Durenmar' },
    { count: 1, houses: ['jerbiton'], rank: 'master', note: 'a third master of another House' },
  ],
  relations: [
    { with: 'dankmar', attitude: 'enemy', note: 'Dankmar was founded to oppose Durenmar at every turn.' },
    { with: 'fengheld', attitude: 'wary', note: 'Durenmar refused Fengheld a permanent house on the Tribunal Field, fearing it would be sidelined.' },
    { with: 'crintera', attitude: 'wary', note: 'Murion’s raven spies on Crintera.' },
    { with: 'oculus-septentrionalis', attitude: 'friendly', note: 'The Ash and Oak Gilds engineered its founding.' },
  ],
  approaches: [
    { id: 'great-library', kind: 'offer', text: 'Durenmar reminds the Tribunal that the Great Library is open to any magus who contributes to it: a book or Lab Text earns two seasons of study, a season of copying one, and a quiet “donation” of vis is accepted instead.', page: 'tribunal', chance: 10, line: 1567 },
    { id: 'apprentices', kind: 'request', text: 'Every Rhine apprentice must spend a season at Durenmar taught by a magus of House Bonisagus: Durenmar asks for any apprentice of the covenant to be sent this year.', chance: 12, line: 1848 },
    { id: 'raven', kind: 'trouble', text: 'A raven watches the covenant for days on end: Kolkrabus, Murion’s familiar, sent to spy.', chance: 6, line: 1626 },
    { id: 'petrus', kind: 'offer', text: 'Talk of Petrus Virilis, whose children are all born Gifted, reaches the covenant: a maga who wants a Gifted child may seek him out.', chance: 3, line: 1672 },
  ],
  services: [
    { id: 'great-library', label: 'Study in the Great Library', text: 'Each contribution (a good book, a new spell’s Lab Text) earns two seasons of study; a season of copying earns one; vis is accepted instead. A tractatus studied there is of Quality simple die + 2; a summa of the Art asked for is there if a simple die + 10 reaches its level (each Art has summae to level 17), of Quality simple die + 5; a standard spell’s Lab Text is there unless a stress die fails (in use) or botches.', line: 1567 },
    { id: 'master-lab', label: 'A laboratory in the Tower of Notatus', text: 'One of two excellent laboratories, for a master or archmage, when not in use.', pawns: 5, line: 1533 },
    { id: 'guest-lab', label: 'A guest laboratory', text: 'One of two small standard laboratories among the guest quarters, when no peregrinator holds it.', pawns: 2, line: 1533 },
    { id: 'portal', label: 'The Mercere Portals', text: 'Masters, archmagi and Redcaps use the Portals in the Forum freely; anyone else pays two pawns each.', pawns: 2, line: 760 },
    { id: 'records', label: 'The Tribunal records', text: 'A season perusing the records of every Tribunal since the Founding extracts all the entries on one narrow subject, covenant or magus.', line: 1594 },
  ],
};

const DANKMAR: BookCovenant = {
  id: 'dankmar', name: 'Dankmar', season: 'Winter', founded: 1052, place: 'the darkest, dampest Black Forest, 40 miles southwest of Durenmar', aura: 5, realm: 'Faerie', line: 1867,
  summary: 'A small covenant founded by an exile from Durenmar to oppose it at every turn. Ancient Schadrit squats at its center with brooding malice; it keeps close, careful contacts with the dark fae, and its grogs are bewitched.',
  wealth: 'modest', library: 'modest', vis: 'some',
  folk: { grogs: 12, servants: 4, craftsmen: 1, laborers: 2, text: 'Every grog and the few servants are bewitched by Jiphella: slack-witted, with no thought of their own.' },
  magi: [
    { name: 'Schadrit', house: 'ex-miscellanea', gender: 'Female', age: 160, rank: 'master', role: 'lab', arts: ['Cr', 'Co'], traits: [['Malicious', 5], ['Vengeful', 4], ['Callous', 3]], note: 'Trained at Durenmar and cast out with her mistress a year before her Gauntlet; nearly two centuries old, kept alive by a longevity potion that is failing.', priorities: ['longevity', 'read', 'vis', 'invent', 'read'], line: 1885 },
    { name: 'Orphedra', house: 'merinita', gender: 'Female', age: 139, rank: 'master', role: 'faerie', arts: ['Im', 'Me'], traits: [['Cruel', 3], ['Frightening', 3], ['Optimistic', -2]], note: 'The covenant’s link to the dark fae; apprenticed at Irencillia but found it stifling. Her Shrouded Glen cloaks the covenant for a mile around.', line: 1892 },
    { name: 'Jiphella', house: 'ex-miscellanea', gender: 'Female', age: 73, rank: 'master', role: 'social', arts: ['Re', 'Me'], traits: [['Crude', 3], ['Domineering', 3], ['Moody', 2]], note: 'An immense maga and a master of Mentem magic: most of the covenfolk are under her spell and obey her instantly.', line: 1899 },
    { name: 'Larinda', house: 'ex-miscellanea', gender: 'Female', age: 20, rank: 'journeyman', role: 'explorer', arts: ['An', 'He'], traits: [['Passionate', 2]], note: 'Just out of apprenticeship; her magic lies in the natural world (Animal, Herbam, Aquam and Auram), and she is becoming an expert brewer of potions.', line: 1906 },
  ],
  relations: [
    { with: 'durenmar', attitude: 'enemy', note: 'Founded to oppose Durenmar at every turn.' },
    { with: 'irencillia', attitude: 'wary', note: 'Orphedra left Irencillia for the dark of the primeval forest.' },
  ],
  approaches: [
    { id: 'against-durenmar', kind: 'offer', text: 'A maga of Dankmar comes with gifts and an offer of help, in exchange for the covenant’s votes against Durenmar at the next Tribunal.', chance: 6, line: 1869 },
    { id: 'dark-fae', kind: 'trouble', text: 'The dark fae of the Black Forest, Dankmar’s allies, trouble the covenant’s woods and people.', chance: 5, line: 1881 },
    { id: 'bewitched', kind: 'trouble', text: 'A slack-witted man is found wandering, starving, unable to think for himself: a grog of Dankmar under Jiphella’s spell.', chance: 3, line: 1920 },
  ],
};

const WADDENZEE: BookCovenant = {
  id: 'waddenzee', name: 'Waddenzee', season: 'Spring', founded: 1165, place: 'the Friesian island of Terschelling', aura: 3, realm: 'Magic', line: 1998,
  summary: 'A covenant of pirates who prowl the North Sea, skirting the Code (no witnesses) and breaking mundane law daily. Rich in vis, most of it not its own; its library is poor.',
  wealth: 'rich', library: 'poor', vis: 'rich', gild: 'ash',
  folk: { grogs: 80, servants: 30, craftsmen: 10, laborers: 40, text: 'Nearly two hundred pirates and their followers from every nation of Europe, with three powerful ships.' },
  magi: [
    { name: 'Hygwald Veritas', house: 'tremere', gender: 'Male', age: 48, rank: 'journeyman', role: 'politician', arts: ['Re', 'Me'], traits: [['Arrogant', 3], ['Honest to Quaesitors', 3], ['Respect for Authority', -3]], note: 'A devious co-founder who dresses to show his great wealth; a specialist in Rego Mentem who makes heavy use of Aura of Rightful Authority.', line: 2020 },
    { name: 'Eric Ribecus', house: 'tytalus', gender: 'Male', age: 52, rank: 'journeyman', role: 'elemental', arts: ['Aq', 'Au'], traits: [['Reckless', 6], ['Wry Humor', 4], ['Passive', -4]], note: 'The other founder; a generalist who favors Aquam and Auram. Bitter enemy of his cousin Estrid of Oculus Septentrionalis.', line: 2027 },
    { name: 'Lucas von Beck', house: 'flambeau', gender: 'Male', age: 45, rank: 'journeyman', role: 'battle-mage', arts: ['Pe', 'Co'], traits: [['Aggressive', 3], ['Morbid', 2], ['Blunt', 1]], note: 'Son of a German altgraf who will not give up his noble life; harvests vis and bodies from the Pirates’ Graveyards for his necromancy.', line: 2034 },
    { name: 'Hachim al’Khalejj', house: 'criamon', gender: 'Male', age: 36, rank: 'journeyman', role: 'mystic', arts: ['In', 'Vi'], traits: [['Secretive', 3], ['Devout Muslim', 2], ['Introverted', 2]], note: 'A quiet, naïve Muslim magus, filius of Hassan of Fengheld; his astrology plans the raids.', line: 2041 },
  ],
  relations: [
    { with: 'oculus-septentrionalis', attitude: 'enemy', note: 'The animosity has worsened into outright enmity.' },
    { with: 'roznov', attitude: 'friendly', note: 'Severicus of Roznov holds Hygwald’s sigil.' },
  ],
  approaches: [
    { id: 'pirates', kind: 'trouble', text: 'A ship carrying goods the covenant cares about is taken in the North Sea, with no witnesses left: Waddenzee’s pirates.', page: 'covenant', chance: 6, line: 2014 },
    { id: 'plunder', kind: 'trade', text: 'A Waddenzee go-between offers vis and books taken from ships, cheaply and with no questions asked.', page: 'market', chance: 8, line: 2010 },
    { id: 'hygwald', kind: 'request', text: 'Hygwald Veritas asks the covenant to stand with Waddenzee against Oculus Septentrionalis at the next Tribunal.', chance: 4, line: 2128 },
  ],
};

const OCULUS: BookCovenant = {
  id: 'oculus-septentrionalis', name: 'Oculus Septentrionalis', season: 'Summer', founded: 1144, place: 'the city of Lübeck', aura: 3, realm: 'Divine', line: 2093,
  summary: 'A Summer covenant of Gentle-Gifted magi, mostly Jerbiton, woven into the life of Lübeck: little Hermetic power but great mundane wealth and influence. Three secret magestones let its magi work two seasons a year in a Magic aura. Short of vis, it trades a shipment of silver and luxuries to Fengheld for a rook of vis a year.',
  wealth: 'very rich', library: 'modest', vis: 'scarce', gild: 'apple',
  folk: { grogs: 0, servants: 20, craftsmen: 6, laborers: 4, text: 'No turb: the city defends itself. Numerous servants and two scribes; Henri’s unGifted daughter Matilda is autocrat.' },
  magi: [
    { name: 'Henri de Tours', house: 'jerbiton', gender: 'Male', age: 66, rank: 'master', role: 'social', arts: ['Cr', 'Me'], title: 'Disceptator; co-leader of the Apple Gild', gild: 'apple', traits: [['Ambitious', 3], ['Diplomatic', 3], ['Scheming', 2]], note: 'Probably the wealthiest merchant in Lübeck; apprenticed in Normandy, the oldest member, and the covenant’s disceptator. Invented My New Best Friend.', statVirtues: ['gentle-gift'], line: 2134 },
    { name: 'Gunhilda Henrasdottir', house: 'jerbiton', gender: 'Female', age: 31, rank: 'journeyman', role: 'craftsman', arts: ['Re', 'He'], gild: 'apple', traits: [['Loyal to Family', 3], ['Compassionate', 1], ['Independent', -2]], note: 'Henri’s daughter and filia, a specialist in housecraft; sheltered by her parents and married to Estrid.', statVirtues: ['gentle-gift'], line: 2152 },
    { name: 'Estrid Danesson', house: 'ex-miscellanea', gender: 'Male', age: 36, rank: 'journeyman', role: 'explorer', arts: ['Au', 'Aq'], gild: 'apple', traits: [['Extroverted', 2], ['Energetic', 1], ['Conciliatory', -3]], note: 'A Danish hedge wizard of sailing and weather magic, later of the Order; keeps his laboratory on his ship and gathers the covenant’s vis around the Baltic. Bitter enemy of his cousin Eric of Waddenzee.', statVirtues: ['gentle-gift'], priorities: ['longevity', 'service', 'travel', 'vis', 'invent'], line: 2159 },
    { name: 'Marcus Navicularius', house: 'verditius', gender: 'Male', age: 58, rank: 'master', role: 'enchanter', arts: ['Re', 'He'], gild: 'apple', traits: [['Proud of his Abilities', 3], ['Skillful', 1], ['Friendly', -2]], note: 'The foremost shipwright of Lübeck; his shipyard is his laboratory, and he sells magical vessels to other covenants for vis.', statVirtues: ['gentle-gift'], line: 2166 },
    {
      name: 'Imanitos Mendax', house: 'jerbiton', gender: 'Male', age: 55, rank: 'master', role: 'rogue', arts: ['Me', 'Vi'], gild: 'apple', traits: [['Lustful', 3], ['Scheming', 2], ['Brave', -1]], note: 'A charming liar with a forked tongue under his smile; perhaps of a secret lineage of dark Jerbiton, and a servant of the demon Radegast in some sagas.',
      statArts: { Cr: 6, In: 9, Mu: 7, Pe: 8, Re: 9, An: 3, Aq: 5, Au: 5, Co: 5, He: 3, Ig: 4, Im: 9, Me: 17, Te: 5, Vi: 11 }, statChars: { Int: 2, Per: 1, Pre: 2, Com: 2, Str: -1, Sta: 1, Dex: -1, Qik: -2 }, statVirtues: ['gentle-gift', 'affinity-with-art:Me'], line: 2178,
    },
    { name: 'Carolus', house: 'jerbiton', gender: 'Male', age: 35, rank: 'journeyman', role: 'scholar', arts: ['In', 'Me'], gild: 'apple', traits: [['Analytical', 2], ['Idealistic', 1], ['Organized', -3]], note: 'A well-meaning, scatterbrained magus who poses as an eccentric scholar; his raven familiar was blinded at Crintera, mistaken for Murion’s spy.', familiar: 'a blinded raven', statVirtues: ['gentle-gift'], line: 2260 },
    { name: 'Boris of Novgorod', house: 'mercere', gender: 'Male', age: 37, rank: 'journeyman', role: 'explorer', ungifted: true, traits: [['Indolent', 2], ['Avaricious', 1], ['Talkative', 1]], note: 'A well-traveled Russian Redcap who poses as a merchant and keeps the Novgorod Inn; sells all kinds of things to magi, and gets vis from the Novgorod covenants cheaply.', priorities: ['travel', 'travel', 'travel', 'practice'], line: 2267 },
  ],
  others: [{ count: 1, houses: ['jerbiton'], rank: 'journeyman', note: 'room for one or two more magi, likely Jerbiton of the Apple Gild' }],
  relations: [
    { with: 'waddenzee', attitude: 'enemy', note: 'Outright enmity since Waddenzee’s new leadership.' },
    { with: 'crintera', attitude: 'hostile', note: 'Crintera has viewed it with hostility from the start.' },
    { with: 'fengheld', attitude: 'ally', note: 'A secret yearly trade: silver and luxuries for a rook of vis.' },
    { with: 'heorot', attitude: 'ally', note: 'Oculus Septentrionalis sponsors Heorot’s admission.' },
    { with: 'durenmar', attitude: 'friendly', note: 'Durenmar’s senior magi gave it the magestones.' },
  ],
  approaches: [
    { id: 'boris', kind: 'trade', text: 'Boris of Novgorod, a Redcap posing as a merchant, comes by with books, items and vis to sell or trade; he gets vis from the Novgorod covenants cheaply.', page: 'market', chance: 25, line: 2272 },
    { id: 'apple-gild', kind: 'invitation', text: 'Henri de Tours invites the covenant’s magi to the Apple Gild, which seeks friendly, open dealings with mundanes.', chance: 6, line: 2124 },
    { id: 'imanitos', kind: 'trouble', text: 'Imanitos Mendax visits with charm and gifts; the books he leaves behind may be tainted.', chance: 3, line: 2174 },
  ],
};

const FENGHELD: BookCovenant = {
  id: 'fengheld', name: 'Fengheld', season: 'Autumn', founded: 1039, place: 'a hilltop fortress in the eastern Harz, Saxony', aura: 5, realm: 'Magic', line: 2475,
  summary: 'The largest covenant of the Tribunal, in size and in magi (23, a dozen at the main site and the rest in six chapter houses), and seemingly its most neutral: it settles others’ disputes while its own power grows. Rich in minor items and raw vis from two dozen sites; its vast library is mostly of lower levels.',
  wealth: 'rich', library: 'good', vis: 'very rich',
  folk: { grogs: 50, servants: 60, craftsmen: 25, laborers: 35, companions: 15, text: 'About fifty soldiers, fifteen companions and nearly ten dozen other covenfolk, from smiths and glassblowers to scribes, huntsmen, herders and serfs, in hierarchies each ending in a magus.' },
  chapters: [
    { name: 'Fengheld House', place: 'Cherbourg, Normandy' },
    { name: 'Rheingasse', place: 'Cologne' },
    { name: 'Turris Acontiarum', place: 'the Kyffhäuser Mountains' },
    { name: 'Lusatia', place: 'the March of Lusatia, on the River Spree' },
  ],
  magi: [
    { name: 'Stentorius', house: 'tremere', gender: 'Male', age: 107, rank: 'archmage', role: 'politician', arts: ['Re', 'Me'], title: 'Head of the covenant', traits: [['Proud', 3], ['Stickler for Rules', 2], ['Forgiving', -3]], note: 'One of the most politically powerful magi in the Tribunal; considers himself the ruler of Fengheld and its people. His gold pendant holds many uses of Aura of Rightful Authority.', familiar: 'Oswald, an arrogant large gray cat', priorities: ['longevity', 'politics', 'read', 'vis', 'invent'], line: 2517 },
    { name: 'Horst', house: 'mercere', gender: 'Male', age: 68, rank: 'master', role: 'scholar', ungifted: true, title: 'Senior Redcap of the Tribunal', traits: [['Widely-Read', 3], ['Fascinating', 2], ['Political', -3]], note: 'A famed author of books of high Quality on many subjects, Magic Theory among them, though he has no Gift; his books are the mainstay of a Rhine apprenticeship. Oversees the Mercer House.', priorities: ['write', 'write', 'travel', 'practice'], line: 2530 },
    { name: 'Eule', house: 'bjornaer', gender: 'Female', age: 160, rank: 'master', role: 'beast', arts: ['In', 'Me'], heartbeast: 'owl', traits: [['Owlish', 6], ['Apathetic', 3], ['Wise', 3]], note: 'An honorary Quaesitor, now retired, sought for her good advice; she has not taken human form for years. Only her filius Günther suspects she has entered Final Twilight.', inactive: 'In Final Twilight in all but name: she does nothing with the seasons.', line: 2537 },
    { name: 'Peter von Würzburg', house: 'verditius', gender: 'Male', age: 62, rank: 'master', role: 'enchanter', arts: ['Cr', 'He'], traits: [['Charming', 3], ['Generous', 2], ['Industrious', 2]], note: 'A famed grower of grapes and maker of wine; minor items help the vines on Fengheld’s slopes, and he makes special wines as Charged Items.', familiar: 'an industrious squirrel', line: 2546 },
    { name: 'Dorana', house: 'bonisagus', gender: 'Female', age: 76, rank: 'master', role: 'scholar', arts: ['Cr', 'Au'], traits: [['Hedonistic', 2], ['Peaceful', 1], ['Secretive', -2]], note: 'Foremost of the lineage of Irmele filia Trianoma; decades as a peregrinator taught her nearly every covenant of the Tribunal. Argues for peace, and cannot stand Murion.', line: 2553 },
    { name: 'Indulius', house: 'flambeau', gender: 'Male', age: 60, ageGuess: true, rank: 'master', role: 'battle-mage', arts: ['Pe', 'Ig'], gild: 'ash', traits: [['Relentless', 2], ['Stern', 2]], note: 'A feared hoplite who hunts oath-breakers with Günther Lupus; master of Richenda of Irencillia.', line: 2576 },
    { name: 'Balastor', house: 'criamon', gender: 'Male', age: 26, rank: 'journeyman', role: 'mystic', arts: ['Mu', 'Me'], traits: [['Feral', 3], ['Mischievous', 3], ['Contempt for Humanity', 2]], note: 'Born feral; seeks to return himself and others to that primal state. His Warped Magic gives him a savage look when he casts, and his magic releases suppressed emotions.', line: 2560 },
    { name: 'Beechleaf', house: 'merinita', gender: 'Male', age: 20, rank: 'journeyman', role: 'faerie', arts: ['He', 'Mu'], gild: 'elder', traits: [['Otherworldly', 2], ['Suspicious', 2], ['Naive', 1]], note: 'Raised by a dryad and apprenticed by Primus Handri; his skin is faintly green. Unsure why he was given a place at the main site, and nervous.', line: 2567 },
    { name: 'Günther Lupus', house: 'bjornaer', gender: 'Male', age: 45, ageGuess: true, rank: 'journeyman', role: 'beast', arts: ['An', 'Co'], heartbeast: 'wolf', traits: [['Protective', 2], ['Secretive', 2]], note: 'Eule’s filius, who hides her Final Twilight with a magic item; hunts oath-breakers with Indulius.', line: 2576 },
    { name: 'Clemens', house: 'tremere', gender: 'Male', age: 65, ageGuess: true, rank: 'master', role: 'politician', arts: ['Re', 'Vi'], chapter: 'Lusatia', traits: [['Calculating', 2]], note: 'One of Fengheld’s three masters at its chapter houses.', line: 2511 },
    { name: 'Hassan El-Megrayhi', house: 'criamon', gender: 'Male', age: 70, ageGuess: true, rank: 'master', role: 'mystic', arts: ['In', 'Im'], chapter: 'Turris Acontiarum', traits: [['Contemplative', 3]], note: 'Studies the stars from a lone tower in the Kyffhäuser Mountains with a single mute companion; master of Hachim of Waddenzee.', line: 2503 },
    { name: 'Wilhelm Weiss', house: 'jerbiton', gender: 'Male', age: 55, ageGuess: true, rank: 'master', role: 'social', arts: ['Mu', 'Me'], chapter: 'Rheingasse', gild: 'apple', title: 'Co-leader of the Apple Gild', traits: [['Shrewd', 2], ['Affable', 2]], note: 'Gentle-Gifted; poses as a wealthy merchant in Cologne and runs Fengheld’s supplies and mundane contacts.', statVirtues: ['gentle-gift'], line: 2501 },
    { name: 'Garrinchus', house: 'ex-miscellanea', gender: 'Male', age: 26, ageGuess: true, rank: 'journeyman', role: 'healer', arts: ['Cr', 'Co'], chapter: 'Rheingasse', gild: 'apple', traits: [['Earnest', 2]], note: 'Gentle-Gifted, newly out of apprenticeship; his master was an acknowledged expert in physick.', statVirtues: ['gentle-gift'], line: 2501 },
    { name: 'Marguerite', house: 'flambeau', gender: 'Female', age: 35, ageGuess: true, rank: 'journeyman', role: 'battle-mage', arts: ['Cr', 'Ig'], chapter: 'Fengheld House', traits: [['Rude', 3], ['Proud', 2]], note: 'Lives alone at the chapter in Cherbourg, a woman of stunning beauty who thinks mundanes beneath her; the chapter runs a small trading business.', line: 2499 },
    { name: 'Odorpes', house: 'bjornaer', gender: 'Female', age: 45, ageGuess: true, rank: 'journeyman', role: 'beast', arts: ['Mu', 'An'], heartbeast: 'bear', chapter: 'Lusatia', gild: 'hawthorn', traits: [['Solitary', 2]], note: 'Urgen’s filia, of the ancient bear lineage; spends most of her time as a bear and hibernates all winter.', line: 2505 },
  ],
  others: [
    { count: 3, houses: ['tremere', 'jerbiton', 'flambeau'], rank: 'journeyman', note: 'three more journeymen at the main site' },
    { count: 5, houses: ['tremere', 'bonisagus', 'ex-miscellanea', 'verditius', 'jerbiton'], rank: 'journeyman', chapter: 'a chapter house', note: 'five more journeymen at the chapter houses' },
  ],
  relations: [
    { with: 'oculus-septentrionalis', attitude: 'ally', note: 'A secret yearly trade: a rook of vis for silver and luxuries.' },
    { with: 'durenmar', attitude: 'wary', note: 'Durenmar fears Fengheld’s growing importance; Dorana cannot stand Murion.' },
    { with: 'irencillia', attitude: 'friendly', note: 'Beechleaf, Handri’s filius, was given a place at the main site.' },
  ],
  approaches: [
    { id: 'guest-lab', kind: 'invitation', text: 'Fengheld offers one of its eight guest laboratories to a magus of the covenant, in return for favors to be named later.', chance: 6, line: 2576 },
    { id: 'horst', kind: 'trade', text: 'Horst the Redcap has a new book to sell or have copied: high Quality, on a mundane subject or Magic Theory.', page: 'market', chance: 10, line: 2535 },
    { id: 'adjudicate', kind: 'offer', text: 'Fengheld offers to settle a quarrel between the covenant and a neighbor, as it often does.', chance: 5, line: 2477 },
    { id: 'redcaps', kind: 'visit', text: 'Redcaps resting at Fengheld’s Mercer House bring letters and the Tribunal’s news.', chance: 20, line: 2513 },
  ],
  services: [{ id: 'guest-lab', label: 'A guest laboratory', text: 'Eight laboratories at the main site, and one at most chapters, for guest magi and peregrinatores.', line: 2576 }],
};

const HEOROT: BookCovenant = {
  id: 'heorot', name: 'Heorot', season: 'Spring', founded: 1215, place: 'Zealand, Denmark', aura: 3, auraGuess: true, realm: 'Magic', line: 2731,
  summary: 'A young covenant of three Rhine magi on Zealand, in lands that belong to the Novgorod Tribunal, seeking admission to the Rhine at the gathering of 1221. Its aim is the one Oculus Septentrionalis abandoned: to learn what it can of the Order of Odin.',
  wealth: 'poor', library: 'poor', vis: 'some', gild: 'ash',
  folk: { grogs: 8, servants: 6, craftsmen: 2, laborers: 4, text: 'A small turb, much reduced: Signum’s studies of the trolls have cost fourteen grogs’ lives.' },
  magi: [
    { name: 'Signum Irruptus', house: 'criamon', gender: 'Male', age: 53, rank: 'master', role: 'mystic', arts: ['In', 'Vi'], title: 'Leader of the covenant', traits: [['Brave', 3], ['Obsessed', 3], ['Mindful of Danger', -2]], note: 'Fascinated with the trolls, whom he believes descended from degenerate gods; the obsession has cost fourteen grogs and his own left arm.', priorities: ['longevity', 'travel', 'read', 'vis', 'invent'], line: 2743 },
    { name: 'Theoderich of Augsburg', house: 'jerbiton', gender: 'Male', age: 37, rank: 'journeyman', role: 'scholar', arts: ['In', 'Me'], traits: [['Morbid', 3], ['Inquisitive', 2], ['Laconic', 1]], note: 'A necromancer and historian, formerly of Oculus Septentrionalis, who raises ghosts to question them about the past.', line: 2750 },
    { name: 'Pancrestis filius Occultes', house: 'bonisagus', gender: 'Male', age: 28, rank: 'journeyman', role: 'lab', arts: ['In', 'Vi'], traits: [['Ambitious', 3], ['Fearful of Wilderness', 2], ['Decisive', -2]], note: 'Keen to meet a Norse wizard and learn their magic, urged on by his mentor Philippus Niger, but deeply afraid of the wilderness.', line: 2757 },
  ],
  relations: [
    { with: 'oculus-septentrionalis', attitude: 'ally', note: 'Its sponsor at the Tribunal.' },
    { with: 'crintera', attitude: 'hostile', note: 'Crintera fears clashes over vis sources: Zealand is close to Rügen.' },
  ],
  approaches: [
    { id: 'support', kind: 'request', text: 'Heorot asks the covenant to speak for its admission to the Rhine Tribunal at the gathering of 1221.', chance: 30, until: 1221, line: 2733 },
    { id: 'trolls', kind: 'request', text: 'Signum Irruptus seeks grogs and magi for an expedition against the trolls of Zealand.', chance: 5, line: 2748 },
  ],
};

const CRINTERA: BookCovenant = {
  id: 'crintera', name: 'Crintera', season: 'Winter', founded: 773, place: 'a regio in the Stubnitz Forest, on the isle of Rügen', aura: 8, realm: 'Magic', line: 2797,
  summary: 'The domus magna of House Bjornaer: the six Elders of its council, split between Harmonists and Wilderists, run the House from a four-level regio (auras 1, 3, 5 and 8). In Winter these fifty years, since the Danish invasion spread the Dominion over Rügen; a powderkeg waiting for a spark.',
  domusMagna: 'bjornaer', wealth: 'modest', library: 'good', vis: 'some', gild: 'hawthorn',
  folk: { grogs: 40, servants: 40, craftsmen: 8, laborers: 20, text: 'Six clans named for the Elders’ seats (Wolf, Bear, Horse, Stag, Eagle and Swan), all trained in wood-craft as well as fighting, living hidden in the forest at the regio’s lower levels.' },
  magi: [
    { name: 'Urgen', house: 'bjornaer', gender: 'Male', age: 114, rank: 'archmage', role: 'beast', arts: ['Mu', 'An'], heartbeast: 'bear', title: 'Seat of the Bear; leader of the Hawthorn Gild', gild: 'hawthorn', traits: [['Quick-Tempered', 5], ['Authoritarian', 4], ['Peaceful', -4]], note: 'Primus during the Danish invasion and the most influential Wilderist; would have the Order hold back the mundanes to protect the wild. Some say he harries settlers with “animal attacks.”', line: 2847 },
    {
      name: 'Falke', house: 'bjornaer', gender: 'Female', age: 49, rank: 'master', role: 'politician', arts: ['Aq', 'Mu'], title: 'Prima of House Bjornaer, Seat of the Wolf', gild: 'linden', traits: [['Optimistic', 2], ['Inspirational', 2]], note: 'The young Prima who pleaded at Tribunal for Crintera to resist the occupiers; a Harmonist with a Major Magical Focus in bodies of water.',
      statArts: { Cr: 7, In: 8, Mu: 9, Pe: 5, Re: 7, An: 5, Aq: 16, Au: 6, Co: 7, He: 5, Ig: 4, Im: 6, Me: 6, Te: 5, Vi: 6 }, statChars: { Int: 2, Per: 2, Pre: 4, Com: 2, Str: -2, Sta: -1, Dex: 0, Qik: -1 }, statVirtues: ['affinity-with-art:Aq'], line: 2854,
    },
    { name: 'Jon Arnsson', house: 'bjornaer', gender: 'Male', age: 98, rank: 'master', role: 'beast', arts: ['Re', 'An'], heartbeast: 'lion', title: 'Seat of the Stag, protector of the covenant', traits: [['Pious', 3], ['Conflicted', 2]], note: 'A devout Christian who believes the Danish invasion righteous, and is fiercely loyal to Crintera: his loyalties are torn.', line: 2929 },
    { name: 'Phyllia', house: 'bjornaer', gender: 'Female', age: 58, rank: 'master', role: 'explorer', arts: ['In', 'An'], heartbeast: 'polecat', title: 'Seat of the Eagle', traits: [['Curious', 3], ['Restless', 1], ['Discreet', -3]], note: 'Keeps the council informed of the Order’s doings; travels widely, a notorious gossip. A Harmonist.', priorities: ['longevity', 'travel', 'read', 'vis', 'invent'], line: 2936 },
    { name: 'Ardea', house: 'bjornaer', gender: 'Female', age: 83, rank: 'master', role: 'mystic', arts: ['In', 'Aq'], heartbeast: 'heron', title: 'Seat of the Swan', traits: [['Neutral', 2], ['Serene', 2], ['Hungry for Knowledge', 1]], note: 'Quiet and contemplative, famous for her foresight and divination; has kept clear of both factions.', line: 2943 },
    { name: 'Istvan Padas', house: 'bjornaer', gender: 'Male', age: 48, rank: 'master', role: 'beast', arts: ['An', 'Co'], heartbeast: 'stallion', title: 'Seat of the Horse', traits: [['Hot-Headed', 3], ['Brave', 2], ['Subtle', -2]], note: 'The youngest and most willful Elder, a Wilderist of Magyar descent; his lover is Zora, the fae-blooded priestess of Hertha.', line: 2950 },
    { name: 'Caprea', house: 'bjornaer', gender: 'Female', age: 50, ageGuess: true, rank: 'master', role: 'scholar', arts: ['In', 'An'], guest: true, traits: [['Quick to Anger', 2]], note: 'A guest consulting Crintera’s library to finish her bestiary for the next Tribunal; she blinded Carolus’ raven, thinking it a spy.', line: 2959 },
  ],
  relations: [
    { with: 'oculus-septentrionalis', attitude: 'hostile', note: 'Hostile to it from the start.' },
    { with: 'heorot', attitude: 'hostile', note: 'Fears Heorot will take vis sources near Rügen.' },
    { with: 'durenmar', attitude: 'wary', note: 'The Tribunal refused to help Crintera against the Danes.' },
  ],
  approaches: [
    { id: 'animal-attacks', kind: 'trouble', text: 'Wolves and bears drive settlers from the edge of the covenant’s lands: the Wilderists of Crintera are suspected.', chance: 4, line: 2849 },
    { id: 'danes', kind: 'request', text: 'A Bjornaer elder asks the covenant’s help against the Danish occupiers of Rügen, within the Code.', chance: 4, line: 2807 },
  ],
};

const IRENCILLIA: BookCovenant = {
  id: 'irencillia', name: 'Irencillia', season: 'Autumn', founded: 792, place: 'the northern Bohemian Forest', aura: 5, realm: 'Faerie', line: 3121,
  summary: 'The domus magna of House Merinita, hidden in faerie woods and seen differently by every visitor: a castle of living wood, a tumulus, a hall. Its faerie aura is patchy (1 to 6, sancta in the strongest); each magus’ caricature lives among the fae covenfolk. Larger now than ever, and secluded from Tribunal politics.',
  domusMagna: 'merinita', wealth: 'comfortable', library: 'good', vis: 'some', gild: 'elder',
  folk: { grogs: 10, servants: 30, craftsmen: 6, laborers: 6, text: 'Fae covenfolk of Faerie Might about 10, each with a little magic for their work; no one forms the same picture of them.' },
  magi: [
    { name: 'Handri', house: 'merinita', gender: 'Male', age: 81, rank: 'master', role: 'faerie', arts: ['Mu', 'Im'], title: 'Primus of House Merinita', traits: [['Obsessively Secretive', 6], ['Indecisive', 1], ['Secure in Position', -2]], note: 'Turned his attention wholly to the faeries, on long private missions; rumor says he has met survivors of House Diedne. No one has seen him use magic but his signature spell.', priorities: ['longevity', 'travel', 'read', 'vis', 'invent'], line: 3168 },
    {
      name: 'Ioannes Acer', house: 'merinita', gender: 'Male', age: 23, rank: 'journeyman', role: 'faerie', arts: ['He', 'Re'], gild: 'elder', traits: [['Reckless', 2], ['Chivalrous', 2]], note: 'A young knight of House Merinita, Deft in Herbam, under a vow of chivalry; his magic is strongest on horseback.',
      statArts: { Cr: 6, In: 1, Mu: 7, Pe: 0, Re: 10, An: 3, Aq: 0, Au: 0, Co: 3, He: 10, Ig: 0, Im: 1, Me: 0, Te: 6, Vi: 3 }, statChars: { Int: 2, Per: 0, Pre: 1, Com: 0, Str: 1, Sta: 1, Dex: 1, Qik: 0 }, statVirtues: ['flawless-magic', 'knight'], line: 3175,
    },
    { name: 'Vinaria', house: 'merinita', gender: 'Female', age: 97, rank: 'archmage', role: 'politician', arts: ['Mu', 'Me'], traits: [['Enigmatic', 3], ['Self-Assured', 3], ['Hostile', -3]], note: 'The former Prima, outmaneuvered by Handri; said to have entered Faerie Twilight, she came back seven years later unchanged, and Handri fears her.', line: 3221 },
    { name: 'Glesig', house: 'merinita', gender: 'Female', age: 62, rank: 'master', role: 'faerie', arts: ['Mu', 'Te'], traits: [['Impatient', 2], ['Friendly', 1], ['Tolerant of Fools', -2]], note: 'The House’s expert on the subterranean fae, a specialist in Terram; her caricature Humnel, an immense troll, is her faerie familiar.', familiar: 'Humnel, her troll caricature', line: 3228 },
    { name: 'Iacob', house: 'merinita', gender: 'Male', age: 43, rank: 'master', role: 'politician', arts: ['In', 'Me'], title: 'Leader of the Elder Gild', gild: 'elder', traits: [['Independent', 2], ['Suspicious', 1], ['Talkative', -2]], note: 'Handri’s filius and the most politically active magus of Irencillia; a master of minds.', line: 3235 },
    { name: 'Gravis', house: 'bonisagus', gender: 'Male', age: 33, rank: 'journeyman', role: 'scholar', arts: ['In', 'Vi'], traits: [['Cheerful', 2], ['Driven', 2], ['Sensitive', 1]], note: 'Came to pursue his fascination with the fae; knows more Faerie Lore than many Merinita, yet cannot grasp Faerie Magic.', line: 3242 },
    { name: 'Richenda Spinosa', house: 'flambeau', gender: 'Female', age: 28, rank: 'journeyman', role: 'battle-mage', arts: ['Cr', 'Ig'], traits: [['Bitter', 3], ['Prickly', 2], ['Fae', -2]], note: 'Her gift for fire came from a secret faerie heritage, descent from Kupala who guards the Fire Flower; an atypical Flambeau, apprenticed by Indulius of Fengheld.', line: 3249 },
  ],
  others: [{ count: 3, houses: ['merinita'], rank: 'mixed', note: 'three other magi of House Merinita' }],
  relations: [
    { with: 'fengheld', attitude: 'friendly', note: 'Beechleaf, Handri’s filius, lives at Fengheld.' },
    { with: 'dankmar', attitude: 'wary', note: 'Orphedra of Dankmar was apprenticed here and left.' },
  ],
  approaches: [
    { id: 'elder-gild', kind: 'invitation', text: 'Iacob invites the covenant’s magi to the Elder Gild, which keeps friendly contact between magi and the fae.', chance: 5, line: 3240 },
    { id: 'caricature', kind: 'visit', text: 'A caricature of one of Irencillia’s magi arrives with a message, or in its magus’ place.', chance: 4, line: 3164 },
  ],
};

const ROZNOV: BookCovenant = {
  id: 'roznov', name: 'Roznov', season: 'Autumn', founded: 1067, place: 'a valley at the edge of the Carpathians, eastern Moravia', aura: 4, realm: 'Magic', line: 3281,
  summary: 'Two halves that barely know each other: the pagan priesthood of the Slavic god Radegast, led by Archmage Igor Rastvan, whose summer solstice festival on Mount Radhost (aura 6) yields dozens of pawns of vis fed with human blood; and an archconservative stronghold of House Tremere with ties to Transylvania. Few in the Rhine trust it.',
  wealth: 'modest', library: 'modest', vis: 'rich', gild: 'oak',
  folk: { grogs: 30, servants: 20, craftsmen: 6, laborers: 50, companions: 3, text: 'A score of servants and soldiers at the castle and four times as many in the village below, rotating between them; three young companions each think himself heir to a Kingdom of the Slavs.' },
  magi: [
    { name: 'Igor Rastvan', house: 'ex-miscellanea', gender: 'Male', age: 101, rank: 'archmage', role: 'mystic', arts: ['Pe', 'Co'], title: 'High priest of Radegast', traits: [['Devoted to Radegast', 6], ['Overconfident', 2], ['Peaceful', -2]], note: 'Hale eighty years from his Gauntlet; perhaps the only archmage of his House. His Slavic cursing magic slays from afar, drawing power from pagan ceremony.', line: 3311 },
    { name: 'Severicus', house: 'tremere', gender: 'Male', age: 77, rank: 'master', role: 'politician', arts: ['Re', 'Te'], traits: [['Unyielding', 3], ['Obsessive', 2], ['Sympathetic', -2]], note: 'A noted master of Terram who detests change of any kind; holds his own sigil and about two-fifths of the other Tremere sigils, his two filii’s and Hygwald Veritas’ among them.', priorities: ['longevity', 'politics', 'read', 'vis', 'invent'], line: 3318 },
  ],
  others: [
    { count: 2, houses: ['tremere'], rank: 'journeyman', note: 'Severicus’ two filii' },
    { count: 2, houses: ['ex-miscellanea'], rank: 'mixed', note: 'two former apprentices of Igor Rastvan' },
  ],
  relations: [
    { with: 'waddenzee', attitude: 'friendly', note: 'Severicus holds Hygwald Veritas’ sigil.' },
    { with: 'fengheld', attitude: 'wary', note: 'Stentorius is the only other Tremere in the Rhine with his own sigil.' },
  ],
  approaches: [
    { id: 'sigils', kind: 'request', text: 'Severicus seeks the covenant’s votes, or its magi’s sigils by proxy, for the conservative Tremere at the next Tribunal.', chance: 6, line: 3320 },
    { id: 'solstice', kind: 'invitation', text: 'The covenant is invited to Radegast’s summer solstice festival on Mount Radhost; those who go may learn what feeds the fire.', chance: 3, line: 3300 },
    { id: 'slav-kings', kind: 'trouble', text: 'A young companion of Roznov, would-be king of the Slavs, seeks magi to back his rising.', chance: 3, line: 3333 },
  ],
};

const TRIAMORE: BookCovenant = {
  id: 'triamore', name: 'Triamore', season: 'Autumn', seasonGuess: true, founded: 1151, place: 'a castle and manor on the Meuse at the edge of the Ardennes', aura: 2, realm: 'Magic', line: 1395,
  summary: 'A castle and manorial estate long embroiled in mundane politics, kept from censure by its shrewd princeps Daria la Gris. Weakened by recent deaths and Twilight, it seeks new members and guests; its library is famed, and guests are expected to contribute to it.',
  wealth: 'comfortable', library: 'good', vis: 'some', gild: 'apple',
  folk: { grogs: 12, servants: 20, craftsmen: 5, laborers: 15, text: 'The household of a castle and manor.' },
  magi: [
    { name: 'Daria la Gris', house: 'tremere', gender: 'Female', age: 67, rank: 'master', role: 'politician', arts: ['Re', 'Vi'], title: 'Princeps; co-leader of the Apple Gild', gild: 'apple', traits: [['Sophisticated', 2], ['Studious', 1], ['Frivolous', -3]], note: 'Stern and uncompromising; works for a new Lotharingian Tribunal with Triamore at its heart, and fosters friendships in Normandy. Has trained two apprentices.', priorities: ['longevity', 'politics', 'read', 'vis', 'invent'], line: 1399 },
    { name: 'Remi of Museau', house: 'jerbiton', gender: 'Male', age: 48, rank: 'master', role: 'social', arts: ['Cr', 'Re'], traits: [['Unpretentious', 3], ['Worldly', 3], ['Cheerful', 2]], note: 'A friendly polymath who can debate scholars, fight, hunt, make music and poetry, much of it without magic, and knows many useful spells.', line: 1406 },
    { name: 'Sicero', house: 'tremere', gender: 'Male', age: 23, rank: 'journeyman', role: 'politician', arts: ['Re', 'Me'], traits: [['Keen to Impress', 2], ['Confident', 1], ['Quiet', 1]], note: 'Recently Gauntleted filius of Goliard of the Stonehenge Tribunal; admitted on his mater’s word, and yet to prove himself.', line: 1413 },
  ],
  relations: [
    { with: 'oculus-septentrionalis', attitude: 'friendly', note: 'Fellow champions of the Apple Gild.' },
    { with: 'fengheld', attitude: 'friendly', note: 'Wilhelm Weiss of Fengheld co-leads the Apple Gild with Daria.' },
  ],
  approaches: [
    { id: 'members', kind: 'invitation', text: 'Daria la Gris invites a magus of the covenant to join Triamore, which has lost several of its number.', chance: 8, line: 1397 },
    { id: 'library', kind: 'offer', text: 'Triamore’s famed library is open to guests who contribute a book to it.', chance: 5, line: 1397 },
    { id: 'lotharingia', kind: 'request', text: 'Daria seeks support for a new Lotharingian Tribunal, with Triamore at its heart.', chance: 5, line: 1401 },
  ],
};

export const RHINE: TribunalBook = {
  tribunal: 'Rhine',
  book: 'GotF',
  title: 'Guardians of the Forests: The Rhine Tribunal',
  present: 1220,
  gathering: { every: 7, from: 1221, at: 'durenmar', line: 741 },
  otherGatherings: [{ name: 'The Gathering of Twelve Years', every: 12, from: 1227, at: 'crintera', house: 'bjornaer', line: 2819 }],
  covenants: [DURENMAR, FENGHELD, CRINTERA, IRENCILLIA, OCULUS, DANKMAR, WADDENZEE, ROZNOV, TRIAMORE, HEOROT],
};
