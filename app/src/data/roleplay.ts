// The Guide's two pages on playing the game itself: one for players (playing a person of Mythic
// Europe, and what that person knows) and one for storyguides (agreeing a saga, finding stories,
// challenging wizards, making it feel medieval). The advice is drawn from the books, each piece
// pointing at the section it came from, and from a few named outside sources; the history of 1220
// and after is real history. Text is inline markdown (**bold**, *italic*).

export interface RpSource {
  book: string;
  /** the line of the heading in the book's markdown file */
  line: number;
  /** the heading's text (the test checks it is there) */
  label: string;
}

export interface RpLink {
  label: string;
  url: string;
  /** who wrote it, or what it is */
  note?: string;
}

export type RpBlock =
  | { p: string }
  | { heading: string }
  /** a bold lead-in and what follows it */
  | { points: [string, string][] }
  | { list: string[]; ordered?: boolean; title?: string }
  | { table: { head: string[]; rows: string[][] }; title?: string }
  /** something to try at the table */
  | { tryThis: string }
  /** where the toolkit helps with it */
  | { inApp: string };

export interface RpSection {
  id: string;
  title: string;
  /** one line, shown when the card is folded and in the contents list */
  summary: string;
  blocks: RpBlock[];
  sources?: RpSource[];
  links?: RpLink[];
  /** a part the page draws itself, shown after the text (the toolkit page's tutorials, optional rules) */
  live?: string;
  /** the card's tutorial target */
  tour?: string;
  /** open on a phone too, until the reader folds it */
  startOpen?: boolean;
}

export interface RpGuide {
  id: 'players' | 'storyguides' | 'toolkit';
  tab: string;
  title: string;
  lead: string;
  sections: RpSection[];
}

const DE = (line: number, label: string): RpSource => ({ book: 'DE', line, label });

// The same safety-tool pointers serve both pages.
const SAFETY_LINKS: RpLink[] = [
  { label: 'Safety tools for roleplaying games', url: 'https://slyflourish.com/safety_tools.html', note: 'a short summary by Mike Shea. Lines and veils are Ron Edwards’s idea; the X-Card is John Stavropoulos’s; the TTRPG Safety Toolkit, curated by Kienna Shaw and Lauren Bryant-Monk, collects many more.' },
];

/** Europe in 1220, for both pages. This is real history, not from the game books. */
const YEAR_1220: RpBlock = {
  table: {
    head: ['Where', 'In 1220'],
    rows: [
      ['Rome', 'Pope Honorius III. Five years ago a great council at the Lateran ordered every Christian to confess and take communion at least once a year.'],
      ['The Empire (Germany and northern Italy)', 'Frederick II, who is also King of Sicily, is crowned Emperor in Rome this November. He has promised the Pope a crusade and keeps putting it off.'],
      ['France', 'Philip II, called Augustus: an old king who has driven the English from most of their French lands and made the crown strong.'],
      ['England', 'Henry III, a boy of twelve, ruled by a council. His father John sealed Magna Carta five years ago and died in the middle of a civil war.'],
      ['Iberia', 'Five Christian kingdoms push south against the Almohads, who have been weak since their defeat at Las Navas de Tolosa in 1212.'],
      ['The south of France', 'The Albigensian Crusade: northern lords and the Church against the Cathar heresy and the Counts of Toulouse. Eleven years of war, and not over.'],
      ['Egypt and the Holy Land', 'The Fifth Crusade holds the port of Damietta on the Nile. Jerusalem has been in Muslim hands since 1187.'],
      ['Constantinople', 'Taken and sacked by crusaders in 1204. A Latin emperor rules there now. Greek rulers in exile, at Nicaea and in Epirus, mean to take it back.'],
      ['The Baltic', 'German and Danish crusaders are conquering and baptizing the last pagan peoples of Europe.'],
      ['Far to the east', 'Rumors of a great army destroying the Muslim kingdoms of Persia. Some hope it is the Christian king Prester John. It is Genghis Khan.'],
      ['New things', 'Friars: the followers of Francis of Assisi and of Dominic, who beg, preach and own nothing. Universities at Bologna, Paris and Oxford. Aristotle, newly translated from Arabic, exciting the schools and worrying the bishops.'],
    ],
  },
};

export const PLAYER_GUIDE: RpGuide = {
  id: 'players',
  tab: 'Playing the game',
  title: 'Playing the game',
  lead: 'The toolkit does the sums. This page is about the other half: playing a person in a world that is not ours. None of it is rules. Take what helps and leave the rest.',
  sections: [
    {
      id: 'game',
      title: 'A different kind of game',
      summary: 'Several characters each, a home to share, and years that pass',
      blocks: [
        { p: 'If you have played other roleplaying games, four things here will feel new.' },
        {
          points: [
            ['You play more than one character.', 'Usually a magus, a companion and a share of the grogs, one at a time. This is called troupe play. Everyone gets a wizard, and nobody has to bring theirs to every story.'],
            ['The characters are unequal on purpose.', 'A magus is far more powerful than a knight. The balance is that the spotlight moves: this week your magus leads, next week your companion follows someone else’s.'],
            ['Home matters more than the road.', 'The covenant, where your characters live, is the center of the saga. Stories come to it, grow out of it and change it. Treat it as a character you all share.'],
            ['Time passes.', 'A story is an interruption in a life of study. Seasons and years go by between adventures. Characters learn, grow old and die. Your magus at seventy will not be the person they were at twenty-five.'],
          ],
        },
        { p: 'The core book’s own last word on all of this: if you have fun with it, you are doing it right.' },
      ],
      sources: [DE(454, 'Basic Ideas'), DE(22361, 'Troupe-Style Roleplaying')],
    },
    {
      id: 'three',
      title: 'Your three kinds of character',
      summary: 'The magus plays the long game, the companion goes where magi cannot, the grog plays loud',
      blocks: [
        { p: 'Each asks for a different kind of play.' },
        {
          points: [
            ['The magus: play the long game.', 'A magus is a scholar with terrifying power and few friends. Decide what yours is trying to become: the Order’s finest healer, the finder of a lost secret, the wizard who talks to storms. Then let that ambition pull them out of the laboratory.'],
            ['The companion: play the one who can.', 'Companions go where magi cannot: into the lord’s hall, the bishop’s court, the tavern. Give yours a reason to live among wizards. Most people who join a covenant have a good reason not to be somewhere else. Tie them to another player’s magus, so that two of you have cause to ride out together.'],
            ['The grog: play loud, and without fear.', 'Grogs are the supporting cast: the shield wall, the cook, the stable hand. You will probably not be playing this one next week, so take the risk and make the joke. Argue with the magus about whether fighting a dragon is wise. A grog who dies well is remembered. One who gets lucky becomes a legend.'],
          ],
        },
        { p: 'A grog needs only one strong note: always hungry, in love with the miller’s daughter, terrified of fire. Play it every time, and the next player to pick that grog up will know who they are.' },
        { tryThis: 'Before the first session, answer three questions for your magus and for your companion. What do they want this year? What do they want before they die? Whom at the covenant do they trust least?' },
      ],
      sources: [DE(1057, 'Character Types'), { book: 'Grogs', line: 654, label: 'What is a Grog?' }, { book: 'Cov', line: 2600, label: 'Making Covenfolk Interesting' }],
    },
    {
      id: 'life',
      title: 'Bringing a character to life',
      summary: 'Wants, Flaws as invitations, Personality Traits as stage directions',
      blocks: [
        {
          points: [
            ['Give them wants.', 'A character who wants something does things. One who wants nothing waits for the storyguide. Tell the storyguide what yours is after. It is the easiest story for them to write.'],
            ['Your Flaws are invitations.', 'A Story Flaw (an enemy, a dependent, a dark secret) is a story you asked for. A Personality Flaw is a promise about how you will play. When one comes up, lean in. The scene where your Wrathful knight loses their temper at the abbot is the one everyone will remember.'],
            ['Use your Personality Traits as stage directions.', 'Brave +2, Loyal −1, Curious +3: glance at them before you decide what the character does. For grogs, who pass from player to player, they are how the next person knows who this is. Change them between sessions when the story has changed the person.'],
            ['Borrow medieval virtues and vices.', 'The seven deadly sins (Pride, Envy, Wrath, Sloth, Avarice, Gluttony, Lust) and the three virtues (Faith, Hope, Love) make very medieval traits. So do the four temperaments of the humors: sanguine, choleric, melancholic, phlegmatic.'],
            ['Let them be wrong.', 'Your character believes things you do not, and does not know things you do. Play their certainty. A plan that fails makes more story than one that works.'],
            ['Do things, and say yes.', 'When a lead appears, follow it. When another player offers an idea, build on it instead of blocking it.'],
            ['Give your magic a face.', 'Every magus has a sigil: a small quirk that marks all their spells, such as a smell of woodsmoke, a chill, or a tint of green. Describe it. Say what the casting looks and sounds like: the Latin, the gestures, the silence afterwards.'],
          ],
        },
        { inApp: 'A Personality Trait can be rolled on **Game Table › Dice › Roll** in place of a Characteristic and Ability. The storyguide gives Confidence Points after a session, on the Game Table’s **Overview**, for goals met and for play that entertained the table.' },
      ],
      sources: [DE(1155, 'Personality Traits'), DE(1211, 'Getting New Confidence Points'), DE(9583, 'Sigils'), DE(22081, 'Story Types'), { book: 'AA', line: 1427, label: 'Complexion' }],
      links: [{ label: '11 ways to be a better roleplayer', url: 'https://lookrobot.co.uk/2013/06/20/11-ways-to-be-a-better-roleplayer/', note: 'by Grant Howitt: “do stuff”, say yes, make failure interesting.' }],
    },
    {
      id: 'world',
      title: 'What your character knows that you do not',
      summary: 'Mythic Europe is 1220 as the people of 1220 believed it to be, and it is all true',
      blocks: [
        { p: 'Mythic Europe is the Europe of 1220 as its own people believed it to be. The first step into any character is to accept that their world is *true*.' },
        { heading: 'How the world works' },
        {
          points: [
            ['The Earth stands still at the center.', 'It is a sphere. The Sun, Moon, planets and stars are carried round it on great spheres. Above the Moon nothing ever changes, and Hermetic magic cannot reach past it.'],
            ['Everything is made of four elements:', 'earth, water, air and fire. A body is healthy when its four humors are in balance. Illness is an imbalance, not an infection. Nobody has heard of germs, because here there are none.'],
            ['Things are as they seem.', 'A moving thing stops unless something keeps pushing it. Heavy things fall because down is where they belong. Worms and flies are born from rotting matter.'],
            ['God is a fact.', 'Almost everyone in the West is a baptized Christian. Jews are the main exception, with Muslims too in Spain and Sicily. The Church touches every part of life: the bells that mark the hours, the saints’ days that mark the year, the tithe, the yearly confession before Easter. More people have seen a miracle than have seen a wizard cast a spell.'],
            ['So is the Devil, and so are the faeries.', 'Demons tempt. Faeries draw people into their stories. Old magic lives in wild places. Hardly a village is without some touch of it: a pool with a virtue, a thing in the wood that must be left its share.'],
          ],
        },
        { heading: 'Everyone has a place' },
        {
          points: [
            ['Three kinds of people:', 'those who pray, those who fight and those who work. Nine in ten are peasants. A person’s rights depend on which they are, whose land they live on, and what custom says there.'],
            ['Power is personal.', 'A lord holds land from a greater lord in return for service, usually in war. One knight may owe two lords at once. There is no state. There is the king, his vassals, their vassals, and the oaths between them.'],
            ['Towns stand a little apart.', 'A town is run by its leading merchants. It sells what the countryside cannot make, and it is the one place with a crowd large enough to vanish into. It also stinks, and people die younger there.'],
            ['Women hold less public power than men,', 'and how much varies from land to land. But widows run businesses and estates, wives command castles while their husbands are at war, and abbesses rule wide lands. The Order itself treats magae and magi as equals. An exceptional woman is exceptional, not impossible.'],
            ['Strangers are suspect.', 'A person belongs to a parish, a lord, a family and a trade. Someone who belongs nowhere has some explaining to do.'],
          ],
        },
        {
          title: 'Everyday facts',
          table: {
            head: ['', 'How it is'],
            rows: [
              ['A day’s travel', 'About 20 miles on foot. A market is somewhere you can walk to, trade at and walk home from in a day: about 7 miles. A rider with messages covers 30. So does a ship in fair weather.'],
              ['News', 'Travels at the speed of people, and is traded at markets. Peasants are not ignorant of the world. They are a few weeks behind it.'],
              ['Money', 'A pound is 20 shillings or 240 silver pennies. Only the penny is a coin: pounds and shillings are for counting. Many debts are paid in grain, labor or livestock.'],
              ['Time', 'The hour by the church bell and the sun. The date by the saint’s day: “the Tuesday after Michaelmas”. The year by sowing, harvest and the great feasts.'],
              ['Reading', 'Rare. A book is written by hand on parchment and is worth a great deal. Latin is the language of the Church, the law and the schools, and of the Order.'],
              ['Law', 'Depends on who you are. A cleric answers to a Church court, a peasant to their lord’s, a burgher to the town’s. Only the greatest lords may hang anyone.'],
              ['Night and winter', 'Dark and hungry. A lantern is a small luxury. The weeks before the new harvest are lean every year.'],
            ],
          },
        },
        { heading: 'What you know that they do not' },
        { p: 'Germs. Gunpowder. The printing press. America. What the Mongols will do in twenty years. Leave these at the door, or enjoy the irony quietly. When you are unsure what your character would know, ask the storyguide. An Area Lore or Organization Lore roll can answer it.' },
      ],
      sources: [
        DE(21558, 'Medieval Physics'), DE(21574, 'The Church'), DE(21753, 'Miracles'), DE(21783, 'Feudalism'), DE(21873, 'Markets and Fairs'), DE(21925, 'Peasants'),
        DE(21935, 'Public Power for Women'), DE(17436, 'Travel'), { book: 'CG', line: 3945, label: 'Medieval Money' }, { book: 'AA', line: 980, label: 'Natural Philosophy' },
      ],
    },
    {
      id: 'order',
      title: 'What your magus knows',
      summary: 'The Oath in plain words, how the Order runs, the Parma, vis, and how a magus ends',
      blocks: [
        { p: 'Fifteen years of apprenticeship taught your magus more than spells. These are things any magus knows without a roll.' },
        {
          points: [
            ['The Oath.', 'Every magus has sworn the Code of Hermes. In plain words: do not kill another magus or harm their magic, except in a declared Wizards’ War. Abide by the Tribunal’s votes. Do not endanger the Order. Do not meddle with mundanes so as to bring ruin on other magi. Do not deal with devils. Do not molest the faeries. Do not use magic to spy on other magi. Train your apprentice to swear the same.'],
            ['Which clauses bite.', 'Dealing with demons is the one crime always punished by death. Scrying on a magus is taken very seriously, even when it happens by accident. “Interfering with mundanes” is argued over at every Tribunal: trading with a lord is fine, serving one as court wizard is not. Most other breaches cost a fine in vis, if someone brings the case and wins the vote.'],
            ['How the Order runs.', 'Magi are equals, and call each other *sodalis*. Each region’s magi meet as a Tribunal every seven years, to vote on disputes. Quaesitores investigate, Redcaps carry the messages, and nobody is in charge.'],
            ['Other magi are dangerous, and bound by the same Oath.', 'Quarrels are settled by certamen, a formal duel of magic that leaves the loser unconscious, not dead. Or by a case at Tribunal. Or, at the worst, by Wizards’ War: declared a full moon ahead, and over by the next.'],
            ['The Parma Magica', 'is the Order’s great secret: the ritual that shields a magus from magic. It also shields them from the unease that other magi’s Gifts would cause, which is why wizards can live together at all. No outsider may ever learn it.'],
            ['Vis is wealth.', 'Raw magic in physical form, counted in pawns. It powers rituals and enchantments, and it is what magi trade, owe and fight over. Silver is for the covenfolk.'],
            ['How it ends.', 'A Longevity Ritual lets a magus live far beyond a normal span, at the price of having no children. The price of a life of magic is Warping, and at the last Final Twilight: one day the magic takes you, and you do not come back.'],
            ['The scar.', 'Two centuries ago the Order destroyed one of its own Houses, Diedne, in the Schism War. Nobody likes to speak of it. Everybody remembers.'],
          ],
        },
        {
          title: 'The twelve Houses, in a line each',
          table: {
            head: ['House', 'Known for'],
            rows: [
              ['Bjornaer', 'Each can take the shape of one animal, their heartbeast. Close to the wild, and a little apart from the rest of the Order.'],
              ['Bonisagus', 'The inventors of Hermetic magic, and its keenest theorists. One branch studies; the other keeps the Order’s peace.'],
              ['Criamon', 'Tattooed mystics chasing an enigma nobody else understands. Little interest in politics.'],
              ['Ex Miscellanea', 'Everyone who fits nowhere else: wizards of a dozen older traditions under one loose roof. Other Houses look down on them.'],
              ['Flambeau', 'Fire and destruction. The Order’s warriors, proud of it, and often in trouble for it.'],
              ['Guernicus', 'The Order’s judges and investigators, the Quaesitores. Convinced the Order survives only by its law.'],
              ['Jerbiton', 'Lovers of art, cities and noble company. They keep the Order on speaking terms with lords and bishops.'],
              ['Mercere', 'The Redcaps, the Order’s messengers. Most have no Gift, and all are honored as magi.'],
              ['Merinita', 'Students of the faeries, and nearly as strange.'],
              ['Tremere', 'Disciplined, loyal and strict about rank. Masters of certamen. They plan for wars others do not see coming.'],
              ['Tytalus', 'They believe conflict makes people strong, so they seek it out, especially with each other.'],
              ['Verditius', 'The finest makers of enchanted devices, and the vainest about it.'],
            ],
          },
        },
        {
          title: 'Words magi use',
          list: [
            '**magus, maga, magi, magae**: a wizard of the Order; a female one; the plurals.',
            '**sodalis** (plural **sodales**): “colleague”. How one magus addresses another, as an equal.',
            '**parens**, **filius** or **filia**: the magus who trained you, and the one you trained. Used after the Gauntlet, the test that ends apprenticeship.',
            '**mundane**: anyone and anything without magic.',
            '**hedge wizard**: any worker of magic outside the Order. Not a polite term.',
            '**turb**: the covenant’s fighting grogs. A **custos** is a trusted grog. The **autocrat** runs the household for the magi.',
          ],
        },
      ],
      sources: [DE(873, 'The Code of Hermes'), DE(979, 'Tribunals'), DE(719, 'The Houses of Hermes'), DE(484, 'Glossary'), DE(9858, 'Certamen'), DE(10737, 'Longevity Rituals'), { book: 'Grogs', line: 654, label: 'What is a Grog?' }],
    },
    {
      id: 'gift',
      title: 'The Gift: how people see your magus',
      summary: 'It does not say “wizard”. It says “do not trust this person”.',
      blocks: [
        { p: 'The Gift does not make people think “wizard”. It makes them feel that this person is not to be trusted.' },
        { p: 'The core book’s advice is to imagine that your magus walks into every room with an old reputation for dishonesty, and for privilege they never earned. The merchant assumes they cheat. The lord assumes they are a faithless vassal. Nobody could say why.' },
        {
          points: [
            ['It works face to face.', 'A letter carries none of it. Neither does a messenger. This is why covenants send companions to do the talking.'],
            ['Animals feel it too.', 'A horse will not carry your magus, and a dog never warms to them.'],
            ['People get used to a person, never to The Gift.', 'The covenfolk have learned that *their* magi can be trusted. A visiting magus starts from nothing.'],
            ['Keep quiet and it passes.', 'Plain clothes, the middle of the group, mouth shut: a magus who draws no attention draws no suspicion.'],
            ['Gentle and Blatant.', 'A magus with the Gentle Gift has none of this trouble. One with the Blatant Gift is driven out of villages.'],
          ],
        },
        { tryThis: 'Play it from both sides. As the magus, notice the innkeeper’s chill, and decide whether it still stings after thirty years. As a grog, remember that you have learned to trust this one wizard, and that all the others still make your skin crawl.' },
      ],
      sources: [DE(8828, 'The Gift'), DE(8856, 'First Impressions')],
    },
    {
      id: 'outside',
      title: 'How the world sees wizards',
      summary: 'What your companion or grog believed about magi before they met one',
      blocks: [
        { p: 'Your companion and your grogs did not grow up in the Order. Most people know that wizards exist. Beyond that, what they know is a mix of fact, tavern tale and deliberate lies.' },
        {
          title: 'Most nobles, and plenty of others, know that wizards…',
          list: [
            'live in wild places, and live longer than other people;',
            'belong to a wider brotherhood that forbids them to rule lands or take sides in wars;',
            'cannot pass their craft to their own children, and take misfits as apprentices;',
            'are served by messengers in red caps, whom it is very unwise to harm;',
            'keep clever animals, and hunt strange beasts and faeries;',
            'once fought a terrible war among themselves, when some of them turned to the Devil.',
          ],
        },
        {
          title: 'Things people believe that are false',
          list: [
            'Every wizard frightens animals and unsettles people.',
            'A wizard is helpless without their staff.',
            'No magic can be worked in silence.',
            'Wizards wear blue robes sewn with stars, and tall pointed hats.',
          ],
        },
        { p: 'Many of these are spread on purpose by House Jerbiton, who find them useful. A grog fresh from the village may believe every one. Decide what yours believed on the day they arrived, and what a year at the covenant has taught them since.' },
      ],
      sources: [{ book: 'LoM', line: 1732, label: 'How Much Do Nobles Know?' }, DE(999, 'The Order and Society')],
    },
    {
      id: 'year',
      title: 'The year is 1220',
      summary: 'Who rules where, and what people are talking about',
      blocks: [
        { p: 'The usual starting year. Your character would know the names nearest home, and would have heard the rest as rumor. This is real history, so an encyclopedia will tell you more about any line of it.' },
        YEAR_1220,
        { p: 'You do not need any of this to play. The core book says so itself: if historical accuracy is spoiling the fun, you need less of it.' },
      ],
      sources: [DE(21504, 'Mythic Europe'), { book: 'Church', line: 651, label: 'The Church in 1220 AD' }],
    },
    {
      id: 'together',
      title: 'Playing well together',
      summary: 'Sharing the spotlight, arguing in character, and agreeing what the game will not show',
      blocks: [
        {
          points: [
            ['Pass the spotlight.', 'When your magus has solved two problems in a row, ask what the grog thinks. The game is built on taking turns at being important.'],
            ['Disagree in character, agree as players.', 'A council where the magi argue for an hour can be the best session of the year, so long as the people at the table are enjoying it. Check that they are.'],
            ['Keep what you know apart from what they know.', 'You have read the bestiary. Your grog has not.'],
            ['Come with a plan for the seasons.', 'Between stories your magus studies, invents and enchants. Know roughly what their next year holds before you sit down. It keeps the table moving, and it tells everyone who your magus is.'],
            ['Talk about the hard parts first.', 'The Middle Ages were cruel in ways that are no fun to play: to women, to Jews, to heretics, to the poor. The core book says plainly that your troupe may soften or leave out whatever it likes. Many groups agree *lines* (things that will not appear at all) and *veils* (things that happen off-stage) before they begin. Keep a way for anyone to say “skip this” in the middle of a scene, without having to explain.'],
            ['Say what you enjoyed.', 'At the end of a session, name the moment you liked best. It teaches the storyguide what to bring next time.'],
          ],
        },
      ],
      sources: [DE(21540, 'Un-Fun History'), DE(22497, 'Saga Priorities'), { book: 'Cov', line: 1611, label: 'The Council Meeting' }],
      links: SAFETY_LINKS,
    },
    {
      id: 'long',
      title: 'The long game: seasons and years',
      summary: 'A season is a choice about who your character is',
      blocks: [
        {
          points: [
            ['A season is a choice about who you are.', 'Reading the covenant’s best book on fire. Teaching the new apprentice. Riding out to mend things with the abbot. Each says something. Choose as the character would, not only for the best number.'],
            ['Keep a list of wants.', 'A spell to invent, a familiar to find, a talisman, an apprentice, a rival to outdo. When the storyguide asks what your magus is doing this year, you will have an answer, and they will have a story.'],
            ['Let time leave marks.', 'A hard winter. A wound that took two seasons to heal. A friend grown old. Mention them. Change a Personality Trait. The saga is the sum of these.'],
            ['Companions and grogs age faster than magi.', 'Your knight will be old while your magus is in their prime. Plan for an heir, a successor, a good death. Playing the daughter of a character you loved is one of the pleasures of a long saga.'],
          ],
        },
        { inApp: '**Game Table › Seasons** plans and resolves each season for everyone. The **Chronicle** tells the saga back to you, season by season.' },
      ],
      sources: [DE(22325, 'Saga Speed'), DE(454, 'Basic Ideas')],
    },
    {
      id: 'more',
      title: 'Read more',
      summary: 'In the books, and outside them',
      blocks: [
        {
          list: [
            'In the core book: **Chapter 14, Mythic Europe**, for the world, and **Chapter 2, The Order of Hermes**, for what a magus knows. Both are short.',
            '*Lords of Men* for nobles and peasants. *The Church* for parish, monastery and pilgrimage. *City & Guild* for towns, trades and money.',
            '*Art & Academe* for how the learned of 1220 understand the world: the humors, the elements, the stars.',
            '*Grogs* for playing the supporting cast, and *Covenants* for life at home.',
            'The rules side of all this is under **Game Mechanics › Sagas & setting**.',
          ],
        },
      ],
      sources: [DE(21504, 'Mythic Europe'), DE(635, 'The Order of Hermes')],
      links: [
        { label: 'Project: Redcap, “Learning to Play”', url: 'https://redcap.org/page/Learning_to_Play', note: 'the community wiki’s advice for people new to the game.' },
        { label: 'Project: Redcap, “Primer for New Players”', url: 'https://redcap.org/page/Primer_for_New_Players' },
        { label: 'The Ars Magica forum at Atlas Games', url: 'https://forum.atlas-games.com/', note: 'where players and the game’s authors answer questions.' },
      ],
    },
  ],
};

export const STORYGUIDE_GUIDE: RpGuide = {
  id: 'storyguides',
  tab: 'Running the game',
  title: 'Running the game',
  lead: 'Running *Ars Magica* is easier than its reputation. You do not need to know medieval history, and you do not need to out-think the wizards. You need a situation, some people who want things, and players who know they can change how it ends.',
  sections: [
    {
      id: 'job',
      title: 'Your job',
      summary: 'The player characters are the center, fun comes first, and you are not alone',
      blocks: [
        {
          points: [
            ['The player characters are the center.', 'They need not be the most powerful people in the story. The story is about what they do, and how it ends depends on them. If someone has to be rescued, let another player’s character do the rescuing.'],
            ['Fun comes before accuracy.', 'The core book says it twice. If historical accuracy is spoiling the fun, you need less of it. Any way your troupe enjoys playing counts as playing properly.'],
            ['You are not alone.', 'In this game the storyguide’s chair is meant to be shared. See *Sharing the chair*, below.'],
            ['Describe, ask, answer.', 'You say what the world does. They say what they do. The world answers. When you do not know the rule, make a ruling, note it down, and look it up afterwards.'],
          ],
        },
        { p: 'Read the players’ page too. Everything there about what characters know is yours to bring to life.' },
      ],
      sources: [DE(22041, 'Player Character Centrality'), DE(21504, 'Mythic Europe'), DE(22497, 'Saga Priorities')],
    },
    {
      id: 'zero',
      title: 'Before you start: agree the saga',
      summary: 'Eight questions the books leave open on purpose',
      blocks: [
        { p: 'The books leave several large questions open on purpose. Settle them together before anyone makes a character. One evening is enough.' },
        {
          table: {
            head: ['The question', 'The choices', 'Why it matters'],
            rows: [
              ['How close to history?', 'A backdrop only. Real kings and real events. Or history the magi are free to change.', 'It decides how much reading you do, and whether famous events are fixed.'],
              ['How strict is the Order?', 'Quaesitores everywhere. Or a Code enforced only against the unpopular.', 'A strict Order makes a political saga. A loose one leaves room for adventure, and for meddling.'],
              ['What is the Church like?', 'Mostly good with some bad members, or the reverse. And is magic itself a sin?', 'The Church is in every village, and some players care a great deal. Ask them.'],
              ['How many demons?', 'One great enemy, or a diabolist in every village. Monsters to fight, or tempters.', 'It sets how dark the saga is.'],
              ['How fast does time pass?', 'Slow: several sessions to a season. Medium: one to four seasons a session. Fast: more than a year a session.', 'The biggest single choice. See below.'],
              ['How much vis?', 'About 5, 10 or 20 pawns for each magus each year.', 'With little vis, every ritual is a decision. The book calls 20 too much for most sagas.'],
              ['What kind of stories?', 'High fantasy. Dealings with lords and bishops. Hermetic politics. Action. Mysteries. Building something.', 'Most sagas mix them. Know which your players came for.'],
              ['What stays off-stage?', 'Lines and veils (see *Playing well together* on the players’ page).', 'Medieval cruelty is real history. Decide together what your game shows.'],
            ],
          },
        },
        { heading: 'How fast?' },
        {
          points: [
            ['Start medium.', 'The book recommends it. One to four seasons a session is easy to speed up or slow down once you know what the troupe likes.'],
            ['A slow saga', 'feels like other roleplaying games. Characters change little, and the laboratory hardly matters.'],
            ['A fast saga', 'is about magi becoming legends. Companions come and go in a handful of sessions.'],
            ['Most real sagas are pulsed:', 'a burst of stories inside one season, then years of quiet study. If you play this way, decide why the world stays quiet.'],
          ],
        },
        { inApp: 'The **Saga Overview** holds these choices: the books in use, the optional rules, and a **Journal** for what you agreed. Its troupe card records who plays whom.' },
      ],
      sources: [DE(22231, 'Background Questions'), DE(21582, 'Magic and Sin'), DE(22305, 'Resources'), DE(22325, 'Saga Speed'), DE(22465, 'Saga Styles')],
      links: SAFETY_LINKS,
    },
    {
      id: 'chair',
      title: 'Sharing the chair',
      summary: 'Troupe play is a ladder: climb as far as suits you',
      blocks: [
        { p: 'Troupe play is a ladder. Climb as far as suits your group, and stop where it is comfortable.' },
        {
          ordered: true,
          list: [
            '**Two characters each.** Every player has a magus and a companion, and brings one of them to each story.',
            '**A pool of grogs.** The covenant’s grogs belong to everyone. In a story, one or two players bring a main character and the rest play grogs. Fewer magi are easier to challenge, and grogs can be bold, funny and mortal.',
            '**A guest storyguide.** A player runs one story while you play a grog. Have them set it somewhere self-contained, such as an island or a regio that opens only once, so it cannot collide with your plans.',
            '**Alpha and beta.** One storyguide keeps the whole saga. Others each own a piece of it: the faerie forest, the Tribunal, the town. Now the main storyguide can play a magus too.',
            '**Everyone runs.** No chief storyguide at all. It needs a troupe where everybody is comfortable with the rules.',
          ],
        },
        {
          points: [
            ['Characters who stay home do not fall behind.', 'Advancement is by seasons lived, not stories attended. A magus left in the laboratory for a year comes out stronger.'],
            ['A missing player is no problem.', 'Their characters stay home and study.'],
            ['One player looks after each pooled grog', 'between sessions, so somebody always knows what that grog did all winter.'],
          ],
        },
      ],
      sources: [DE(22361, 'Troupe-Style Roleplaying')],
      links: [{ label: 'Project: Redcap, “Troupe style”', url: 'https://redcap.org/page/Troupe_style' }],
    },
    {
      id: 'stories',
      title: 'Where stories come from',
      summary: 'What do wizards do? The players have already told you',
      blocks: [
        { p: 'Every new storyguide asks the same thing: what do wizards actually *do*? They do not, as a rule, clear out caves for treasure. Start here.' },
        {
          points: [
            ['The players have already told you.', 'Every Story Flaw on a character sheet and every Hook on the covenant is a story somebody asked for. List them before the first session. The book expects Hooks to drive a good part of the saga: about six stories to settle a minor one, about twenty for a major.'],
            ['Ask what they want.', 'A magus who wants a familiar, a lost book or a voice at Tribunal has written your next story. These work at any level of power, because the player has chosen a goal that magic cannot simply hand over.'],
            ['Bring trouble to the door.', 'A monster. A bishop asking questions. A lord demanding fealty. This is the easy way to start a saga. It gets harder as the magi grow strong enough to end such troubles with one spell.'],
            ['Let the past come back.', 'A long saga becomes a web: the faerie queen they flattered, the Quaesitor they embarrassed, the village they saved. Stories in which characters are bound by what they did before work at every level of power.'],
          ],
        },
        {
          title: 'Seven kinds of story',
          table: {
            head: ['Kind', 'For example'],
            rows: [
              ['Exploration', 'The covenant’s own cellars. The nearest village. A faerie wood where the beasts talk and the people do not.'],
              ['Treasure', 'Vis above all, and best of all a source that yields every year. Books. An Arcane Connection to an enemy.'],
              ['A plea for help', 'A village with a monster. Two lords, a week apart, each the innocent victim of the other.'],
              ['Trouble at home', 'The aura fades. The grogs rebel. A rival magus harasses you without quite breaking the Code.'],
              ['Politics', 'Tribunal is coming, and everyone wants your vote. A magus of yours is framed. Or is guilty.'],
              ['A quest', 'The cave where Bonisagus worked. A cure. A father. Told across many stories, with others in between.'],
              ['Life at home', 'A wedding among the covenfolk. A runaway apprentice. The cook and the steward at war.'],
            ],
          },
        },
        { p: 'For a first story, exploration is the safe choice. Everyone wants to know what lies around the covenant, and every place they find can hold a later story.' },
        { inApp: 'The covenant’s **Hooks & Boons** tab holds the stories the players asked for. The Game Table’s **Overview** shows what needs attention and what the calendar holds. **The Tribunal** brings news from the other covenants as the seasons pass.' },
      ],
      sources: [DE(22081, 'Story Types'), DE(22115, 'Story Ideas'), DE(8800, 'The Covenant in Play')],
    },
    {
      id: 'situations',
      title: 'Prepare situations, not plots',
      summary: 'A story on one page, with three ways it can end',
      blocks: [
        { p: 'The core book is blunt: a roleplaying story should not have a plot worked out in advance. If you already know what happens, the players have nothing to decide.' },
        {
          title: 'A story on one page',
          ordered: true,
          list: [
            '**The situation.** Who wants what, and why it cannot wait.',
            '**What happens if nobody acts.** This is your timeline. It is also what you fall back on when the players surprise you.',
            '**Two ways in.** The hardest moment is the start, when the players cannot see what to do. Give them two obvious first moves.',
            '**Three ways it can end:** well, badly, and somewhere between. Make the bad ending cost something other than lives: a vis source, a friendship, a wound that eats two seasons of study.',
            '**The one thing they must learn,** and one sure way to learn it. Then add two more ways. Clues are always less obvious than they look from your side.',
            '**An ending with weight.** Think of two or three scenes that could settle the matter, each with the player characters in the middle of it.',
          ],
        },
        {
          points: [
            ['Warn before you ruin.', 'A disaster should be visible from far off, and grow clearer as it nears. Grogs may die. Magi, companions and the covenant should fall only to choices the players knew they were making.'],
            ['Let each scene point at the next.', 'When the characters finish what was obvious, something new should be obvious. Otherwise the story starts again from nothing every hour.'],
          ],
        },
      ],
      sources: [DE(22047, 'Plots'), DE(22055, 'Variable Outcomes'), DE(22063, 'Hooks')],
      links: [{ label: 'Don’t Prep Plots', url: 'https://thealexandrian.net/wordpress/4147/roleplaying-games/dont-prep-plots', note: 'by Justin Alexander. The same advice at more length, and the source of the “three clues” rule of thumb in step 5.' }],
    },
    {
      id: 'wizards',
      title: 'Challenging wizards',
      summary: 'Let them be magnificent, then ask what happens next',
      blocks: [
        { p: 'A magus a few years out of apprenticeship can read minds, walk through walls and burn a troop of knights. Do not fight this. It is the game.' },
        {
          points: [
            ['Let them be magnificent.', 'If a spell can solve the problem, let it, and enjoy it with them. Then ask what happens next.'],
            ['Make the price social.', 'The spell worked. Who saw it? Whose rights did it trample? The Code forbids bringing ruin on other magi by meddling with mundanes. It forbids spying on magi by magic, and molesting the faeries. Each of those is a story that begins the moment a spell succeeds.'],
            ['Offer goals that magic cannot shortcut.', 'The abbot’s real friendship, not the one a Mentem spell would make. A vote at Tribunal. A child’s trust. This is the core book’s own example: the stronger the maga, the more her goal must be something she will not simply compel.'],
            ['Use what resists magic.', 'The Dominion smothers spells in towns and churches. Kings, great churchmen and anyone carrying a relic have Magic Resistance. Faeries and demons have Might. Other magi have their Parma.'],
            ['Use The Gift.', 'In a room full of strangers, the magus is the worst person to do the talking. That is the companions’ cue.'],
            ['Send the others.', 'When the magi are too strong for a problem, give the companions and grogs a reason to handle it without disturbing them. If it all goes wrong, the magi arrive as the rescue, played by the same players.'],
            ['Use time.', 'A wound, a long journey, a season lost from the laboratory: magi feel these more keenly than any blow.'],
          ],
        },
      ],
      sources: [DE(22081, 'Story Types'), DE(873, 'The Code of Hermes'), DE(8828, 'The Gift'), { book: 'LoM', line: 1809, label: 'Why Don' }, { book: 'LoM', line: 1732, label: 'How Much Do Nobles Know?' }],
    },
    {
      id: 'medieval',
      title: 'Making it feel medieval',
      summary: 'Put one true medieval thing at the center of each story',
      blocks: [
        { p: 'You do not get a medieval feel by avoiding mistakes. You get it by putting one true medieval thing at the center of each story.' },
        { p: 'The method is the core book’s. Find a single fact that interests you. People stole relics from shrines. A widow could carry on her husband’s trade, and was resented for it. A great lord’s visit could beggar his host. Then build the story so that it turns on that fact. You need to know one thing, not the whole period, and the players look where you point.' },
        {
          title: 'Ten medieval things to hang a story on',
          list: [
            'A relic is stolen from the abbey, and the monks suspect magic.',
            'The bishop is coming on a visitation, and the covenant lies in his diocese.',
            'The parish priest wants the tithe on everything God increases. That includes vis.',
            'A penitent magus is given a pilgrimage to walk, with no magic allowed.',
            'The covenfolk want to be confirmed, which means answering a bishop’s questions.',
            'A friendly lord’s own lord is coming to stay, and must be impressed.',
            'A lord dies without a son, and three people claim the land beside yours.',
            'The covenant’s market is drawing trade from the town’s, and the town complains.',
            'A hunting party, mauled by something in your woods, hammers on the gate.',
            'A saint takes an interest in the covenant, and a Dominion aura begins to grow.',
          ],
        },
        {
          points: [
            ['The Church is the quickest medieval color.', 'It is in every village and every week of the year. Play clergy as people, not as saints or villains.'],
            ['Miracles happen.', 'How often is yours to set. The book’s default is that almost everyone knows someone who has seen one.'],
            ['Mistakes do not matter', 'unless they break the mood. A wristwatch does; the wrong cut of tunic does not. If a player knows the period better than you, make them your adviser. If you find you gave the king the wrong name, change it and move on.'],
            ['You need no research at all.', 'Pick a Tribunal, invent the local lord and the parish, and begin. Or open a Tribunal book and let its authors do the reading for you.'],
          ],
        },
      ],
      sources: [DE(21512, 'Making It Historical'), DE(21574, 'The Church'), DE(21753, 'Miracles'), DE(22019, 'Errors and Anachronisms'), DE(22429, 'Researching a Setting')],
    },
    {
      id: 'people',
      title: 'Playing the world’s people',
      summary: 'One want, one fear, and how strangers treat a magus',
      blocks: [
        {
          points: [
            ['Everyone wants something.', 'Give each person the characters meet one want and one fear. That is enough to play them for an hour.'],
            ['Peasants are not fools.', 'They cannot read. But they have been to market, to town and on pilgrimage, and the supernatural is part of their lives.'],
            ['Nobles know a little about wizards,', 'much of it wrong (see *How the world sees wizards* on the players’ page). Most remember that wizards may not swear fealty, so they look for subtler ways to make use of them.'],
            ['Clergy run the whole range,', 'from those certain that magi worship the Devil to those who treat them as fellow scholars.'],
            ['Faeries want stories. Demons want souls.', 'A faerie needs people to play their parts in its tale. A demon is a patient liar who offers exactly what you want. Creatures of magic mostly do not care about people at all.'],
          ],
        },
        {
          title: 'How strangers treat travelers with a magus among them',
          table: {
            head: ['', 'No Gift, or the Gentle Gift', 'The Gift', 'The Blatant Gift'],
            rows: [
              ['A village', 'Wary, but a barn for the night if treated well.', 'Doors barred, and a watch kept all night.', 'Driven out, and watched for over the next days.'],
              ['An inn', 'Welcome. A price that can be haggled. News gladly traded.', 'A cold host, a high price, guests who look away.', 'Turned from the door, with a threat to call the watch.'],
              ['A monastery', 'The guest house and the common table, for two or three nights.', 'A room apart, a monk always nearby, one night.', 'Lodged outside the walls and watched. One night.'],
              ['Another covenant', 'Shown to the guard room, where the guards chat.', 'Shown in. The guards watch in silence.', 'Kept outside the gate, with the guards on alert.'],
            ],
          },
        },
        { p: 'Where the magus is known and has always behaved well, the welcome is warmer. People still prefer to talk to the companions.' },
      ],
      sources: [DE(8856, 'First Impressions'), DE(999, 'The Order and Society'), DE(21925, 'Peasants'), DE(17464, 'The Nature of the Realms'), { book: 'LoM', line: 1732, label: 'How Much Do Nobles Know?' }],
    },
    {
      id: 'pace',
      title: 'Stories and seasons: pacing a saga',
      summary: 'Two kinds of session, three kinds of reward, and letting the years pass',
      blocks: [
        {
          points: [
            ['Two kinds of session.', 'In a story you play scenes. In a round of seasons you go round the table: what is each character doing this season, this year? Many troupes do some of each: a story, then a year of seasons to close the evening.'],
            ['Open the year with a council.', 'The magi meet, share out the vis and the books, and argue about what the covenant should do. It is the most natural scene in the game, and it tells you which stories the players want.'],
            ['Let time pass.', 'Years should go by. Apprentices grow up. The old steward dies. The oak they planted is a tree. This is what the game does that others do not.'],
            ['Reward in three currencies.', 'Experience: a story is worth 5 to 10 points for the season. Confidence: two or three points a session, for goals met and for play that delighted the table. And things: vis, books, friends, a title, a grudge.'],
            ['Go gently with vis and books.', 'Give finds, which run out, before sources, which do not. A tractatus is read once; a great summa lifts the whole covenant. Taking a treasure back annoys players far more than never giving it.'],
            ['Change the stories as the magi grow.', 'Young magi can be threatened. Old magi must be tempted, entangled and asked to choose.'],
          ],
        },
        { inApp: '**Game Table › Seasons** runs the round for everyone. On the Game Table’s **Overview**, *After a story* gives the experience and *Confidence & Faith* the Confidence Points. The **Chronicle** writes up each season as it ends.' },
      ],
      sources: [DE(16118, 'Adventure'), DE(1211, 'Getting New Confidence Points'), DE(22305, 'Resources'), DE(22325, 'Saga Speed'), { book: 'Cov', line: 1611, label: 'The Council Meeting' }],
    },
    {
      id: 'table',
      title: 'At the table',
      summary: 'When to roll, how hard to make it, and how to end a session',
      blocks: [
        {
          points: [
            ['Roll when failure would be interesting.', 'When it would not, say yes and move on.'],
          ],
        },
        {
          title: 'Ease Factors at a glance',
          table: {
            head: ['Ease Factor', 'Who manages it'],
            rows: [
              ['3, Simple', 'An untrained person, usually. Roll only if failing would matter a great deal.'],
              ['6, Easy', 'Someone with a little skill, usually.'],
              ['9, Average', 'A skilled or talented person, usually. The untrained, rarely.'],
              ['12, Hard', 'The skilled fail about half the time. The untrained always fail.'],
              ['15, Very hard', 'Only experts, and not always.'],
              ['18, Impressive', 'Masters, about half the time.'],
              ['21 and up', 'The best in the land, on a good day.'],
            ],
          },
        },
        {
          points: [
            ['Enjoy the botch.', 'A botched spell is not a spell that fails. It goes off, wrongly. Ask the player what the worst fitting thing would be. They are usually crueler than you are.'],
            ['Move the spotlight on purpose.', 'Notice who has not spoken for a while, and turn the next scene toward their character.'],
            ['Begin with what happened; end on a choice.', 'Open each session by asking a player to tell the story so far. Close on a decision or a revelation, not on the walk home.'],
            ['Keep a way to stop.', 'Agree before play how anyone can pause or skip a scene. Use it yourself once, so the others know it is safe.'],
            ['Playing online?', 'One shared screen, large text, and dice everyone can see.'],
          ],
        },
        { inApp: '**Dice › Roll** shows the chance of success before anyone rolls. **Dice › Spellcasting** offers a suggestion when a spell botches. **Stream mode**, under Display in the sidebar, enlarges the text for a shared screen.' },
      ],
      sources: [DE(613, 'Ease Factor'), DE(9715, 'Botch Suggestions'), DE(22497, 'Saga Priorities')],
      links: SAFETY_LINKS,
    },
    {
      id: 'history',
      title: 'If you follow history: what comes next',
      summary: 'Europe in 1220, and thirty years of events to foreshadow',
      blocks: [
        { p: 'Many troupes let real history run in the background. The characters hear of it, profit by it, or try to stop it. Here is Europe as the saga opens, and then what is coming.' },
        YEAR_1220,
        {
          title: 'What comes next',
          table: {
            head: ['Year', 'What happens'],
            rows: [
              ['1221', 'The Fifth Crusade marches on Cairo, is trapped by the Nile flood, and gives up Damietta. Dominic dies.'],
              ['1223', 'Philip II of France dies; his son Louis VIII follows him. A Mongol army destroys the princes of Rus at the Kalka river, then vanishes eastward again.'],
              ['1226', 'Louis VIII dies. Louis IX is twelve, and his mother Blanche of Castile rules for him. Francis of Assisi dies.'],
              ['1227', 'Pope Honorius III dies. Gregory IX excommunicates Frederick II for delaying his crusade. Genghis Khan dies.'],
              ['1229', 'Frederick II, still excommunicate, regains Jerusalem by treaty without a battle. The Albigensian Crusade ends, with the south of France brought under the crown.'],
              ['1231', 'The Pope begins to appoint inquisitors against heresy, most of them friars.'],
              ['1236 to 1248', 'Castile takes Córdoba, then Seville. Muslim Spain shrinks to Granada.'],
              ['1237 to 1241', 'The Mongols return. Rus falls, and Kiev is destroyed in 1240. In 1241 they crush a Polish army and a Hungarian one within days of each other. The next year they withdraw.'],
              ['1244', 'Jerusalem is lost again, this time for good. Montségur, the last Cathar stronghold, falls.'],
              ['1250', 'Frederick II dies. The Empire will have no undisputed ruler for a generation.'],
            ],
          },
        },
        {
          points: [
            ['The Order keeps its own calendar.', 'Each Tribunal meets every seven years. The Grand Tribunal meets every thirty-three, at Durenmar.'],
            ['Decide whether the magi can change it.', 'The official assumption is that history ran true until 1220, and may turn aside once the players touch it. Foreshadow an event, and let them try.'],
          ],
        },
        { p: 'The dates above are real history, from outside the game’s books.' },
      ],
      sources: [DE(22231, 'Background Questions'), DE(979, 'Tribunals'), DE(22019, 'Errors and Anachronisms')],
    },
    {
      id: 'more',
      title: 'Read more',
      summary: 'Ready-made stories, and advice from other storyguides',
      blocks: [
        {
          list: [
            'In the core book: **Chapter 15, Stories** and **Chapter 16, Sagas**. They are short, and worth reading whole.',
            'Ready-made stories: *Tales of Mythic Europe* for young magi, *Thrice-Told Tales* for stories that return years later, and *Hooks* for short ones that open new parts of the setting.',
            'People and places to build on: *Antagonists* and *Mythic Locations*. A Tribunal book gives you a whole region with the reading already done.',
            'The rules side of all this is under **Game Mechanics › Sagas & setting**.',
          ],
        },
      ],
      sources: [DE(22031, 'Stories'), DE(22227, 'Sagas')],
      links: [
        { label: 'Project: Redcap, “Storyguiding Advice”', url: 'https://redcap.org/page/Storyguiding_Advice', note: 'the community wiki’s collection of advice and links.' },
        { label: 'Nigrasaxa', url: 'https://www.atlas-games.com/pdf_storage/nigrasaxa.pdf', note: 'a free introductory saga from Atlas Games, with notes for first-time storyguides. Written for the Fourth Edition; the advice carries over.' },
        { label: 'The Ars Magica forum at Atlas Games', url: 'https://forum.atlas-games.com/', note: 'search it for “new storyguide”: the same questions have been answered many times, kindly.' },
      ],
    },
  ],
};

export const ROLEPLAY_GUIDES: RpGuide[] = [PLAYER_GUIDE, STORYGUIDE_GUIDE];
