// Short notes on how each part of a character, covenant or lab can be gained or improved after
// creation, so players can plan ahead (DE Long-Term Events, Mysteries, Twilight, Laboratory;
// Covenants).

export type LaterTopic = 'characteristics' | 'virtues' | 'abilities' | 'arts' | 'spells' | 'boons' | 'lab' | 'library' | 'covenfolk';

const NOTES: Record<LaterTopic, { title: string; items: string[] }> = {
  characteristics: {
    title: 'Raising Characteristics in play',
    items: [
      'They never rise by study. Magic can raise them: a Creo Corpus Ritual for Strength, Stamina, Dexterity or Quickness, a Creo Mentem Ritual for Intelligence, Perception, Presence or Communication, one point per casting (DE Corpus and Mentem guidelines).',
      'Level 30 brings a score up to 0, 35 to +1, 40 to +2, 45 to +3, 50 to +4 and 55 to +5, the human limit. A lasting Momentary Creo effect must be a Ritual, so it costs vis.',
      'A Group, Room or Structure Target (+2, +2, +3 magnitudes) raises everyone there with one casting: a strong Creo magus can improve a whole covenant over time.',
      'Aging lowers Characteristics through Aging Points, so a Longevity Ritual protects what you have.',
    ],
  },
  virtues: {
    title: 'Gaining Virtues (and Flaws) after creation',
    items: [
      'Hermetic Virtues can be taught by a magus who has them, one-on-one in a season: Teaching Source Quality (Communication + Teaching + 3, +6 for one student) against 15 for a Minor Virtue or 21 for a Major one, +3 for each Minor and +9 for each Major Hermetic Virtue the student already has. A teacher who passes on one of his Hermetic Flaws with it adds +3 (Minor) or +9 (Major) (DE Teaching Hermetic Virtues).',
      'Mystery Virtues come by Initiation: the Mystagogue’s Initiation Total against 15 (Minor) or 21 (Major), 18 or 30 if the Mystagogue does not have it. An Ordeal (taking a Flaw) lowers the target of later Initiations (DE Mystery Cults).',
      'A comprehended Wizard’s Twilight can grant a Minor Hermetic or Supernatural Virtue (7–10 Warping Points gained) or a Major one (11 or more). A failed one can bring Flaws.',
      'Original Research and Integration of non-Hermetic magic can add new Hermetic Virtues through Breakthroughs.',
      'Story, Social and Personality Virtues and Flaws change through play at the storyguide’s ruling. Hermetic Flaws, once gained, cannot be removed.',
      'So a Virtue you could not afford now is not lost: plan which way you will get it (a teacher who has it, a Mystery Cult, or Twilight).',
    ],
  },
  abilities: {
    title: 'Improving Abilities in play',
    items: [
      'Seasons of study add experience: a book (summa: author’s Communication + 6, tractatus: Communication + 6), a teacher (Communication + Teaching + 3), training (master’s score + 3), practice (usually 4), adventure (5–10) or exposure (2) (DE Long-Term Events).',
      'The age limit on scores applies only at creation.',
      'Supernatural Abilities can be learned later, but their Source Quality drops by your total score in the Supernatural Abilities you already have.',
    ],
  },
  arts: {
    title: 'Improving Arts in play',
    items: [
      'Arts grow faster than Abilities: summae and tractatus from the covenant library, a teacher one-on-one, studying raw vis (stress die + aura), and two experience points of exposure from each season of lab work in the Art.',
      'Each point costs as much experience as its new score, so a narrow focus climbs quickly and a broad spread slowly.',
    ],
  },
  spells: {
    title: 'Gaining spells in play',
    items: [
      'Invent a spell in the lab (a season, with Lab Total above its level; the surplus speeds it up), learn one from a lab text, or improvise spontaneous magic at any time.',
      'Spell Mastery grows with experience spent on the spell, adding Mastery abilities.',
    ],
  },
  boons: {
    title: 'Hooks and Boons in play',
    items: [
      'Covenants gain no Build Points in play; their resources grow by trade, writing and copying books, enchanting items and stories.',
      'A Boon gained in play should bring a matching Hook. A Boon lost can usually be regained through stories, and Hooks are resolved by them, though it usually takes several (Covenants ch.1).',
    ],
  },
  lab: {
    title: 'Improving the lab in play',
    items: [
      'Refinement rises by one with a season of work, if you have worked in the lab about as many years as its current Refinement and your Magic Theory is at least the new score. Each point frees space and adds Safety (DE Laboratory).',
      'A Minor lab Virtue takes about a season to add and a Major one two, with money or vis as fits; some come by chance during Refinement work (Highly Organized, Spotless).',
      'More floor space (Size) means building: more room for Virtues, but occupied Size lowers Safety.',
    ],
  },
  library: {
    title: 'Growing the library in play',
    items: [
      'Magi and scribes write summae and tractatus in seasons, copy books, and trade with other covenants. Lab texts come with every spell or item invented.',
    ],
  },
  covenfolk: {
    title: 'Covenfolk in play',
    items: [
      'Specialists and craftsmen bought at creation start within the age limits; in play they improve like any character, and new ones are recruited through stories and money.',
      'Loyalty changes with how the covenfolk are treated, years of familiarity, and events (Covenants ch.4).',
    ],
  },
};

/** A collapsed note on how this can be gained or improved later. */
export function LaterNote({ topic }: { topic: LaterTopic }) {
  const n = NOTES[topic];
  return (
    <details className="later-note small">
      <summary>{n.title}</summary>
      <ul>
        {n.items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </details>
  );
}
