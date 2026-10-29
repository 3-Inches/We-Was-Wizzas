// What the Rhine's named magi have beyond their stat blocks: the enchanted items and familiar the
// book gives (Philippus Niger's talisman, bridle and chain and his basilisk Sordus; Falke's anklet-
// ring; the pendant Stentorius made for his cat Oswald), and the House Mysteries the senior magi of
// Houses Merinita, Bjornaer and Verditius have been initiated into. The book names no Mysteries: those
// are read from what it says of each magus, and say so; they are added only when the saga uses
// Mystery Initiation.

import type { MagusExtras } from './types';

const FORMS_OF_UNRAVELING: [string, 'An' | 'Aq' | 'Au' | 'Co' | 'He' | 'Ig' | 'Im' | 'Me' | 'Te' | 'Vi'][] = [
  ['Animal', 'An'], ['Aquam', 'Aq'], ['Auram', 'Au'], ['Corpus', 'Co'], ['Herbam', 'He'], ['Ignem', 'Ig'], ['Imaginem', 'Im'], ['Mentem', 'Me'], ['Terram', 'Te'], ['Vim', 'Vi'],
];

export const RHINE_EXTRAS: Record<string, MagusExtras> = {
  'Philippus Niger': {
    items: [
      {
        name: 'Knife of Human Bone', kind: 'talisman', material: 'bone', size: 'small', line: 1784,
        text: 'A wickedly curved dagger with a serrated blade, enchanted to always be razor-sharp.',
        attunements: [['Precise Destruction', 2], ['Destroy Body', 4], ['Destroying Minds', 3]],
        effects: [
          // ten related effects, one for each Hermetic Form
          ...FORMS_OF_UNRAVELING.map(([name, form]) => ({
            name: `Unraveling the Fabric of ${name}`, technique: 'Pe' as const, form: 'Vi' as const, requisites: form === 'Vi' ? [] : [form], level: 20, range: 'Voice', duration: 'Sun', target: 'Individual', uses: '24', final: 25,
            text: `Unravels a spell of ${name} (base effect, +2 Voice); one of ten related effects, one for each Form.`,
          })),
          {
            name: 'Evisceration of Ten Thousand Knives', technique: 'Pe', form: 'Co', level: 40, range: 'Voice', duration: 'Momentary', target: 'Group', uses: '24', penetration: 20, final: 55,
            text: 'As the spell of his own invention, but with Target Group (Base 20, +2 Voice, +2 Group).',
          },
        ],
      },
      {
        name: 'The Wizard’s Bridle', kind: 'invested', material: 'base metal', size: 'medium', line: 1790,
        text: 'A wicked-looking frame that sits over the victim’s head, forcing the mouth open and trapping the tongue with a spiked plate; chains and rods to shackles and manacles prevent both words and gestures. Made with two of Philippus’s filii; used once, on a Marched magus of House Tytalus.',
        effects: [
          { name: 'Bind the Gift', technique: 'Re', form: 'Vi', level: 35, range: 'Touch', duration: 'Concentration', target: 'Individual', uses: 'unlimited', concentration: true, final: 50, text: 'Suppresses any spell of level 25 or lower cast by the wearer.' },
          { name: 'Hinder the Gift', technique: 'Pe', form: 'Vi', level: 55, range: 'Touch', duration: 'Sun', target: 'Individual', uses: '2', penetration: 20, environmental: true, final: 69, text: 'Reduces the Casting Total of any spell by 25: a constant effect.' },
        ],
      },
      {
        name: 'The Subtle Chain', kind: 'invested', material: 'silver', size: 'large', line: 1796,
        text: 'A fine silver chain, thirty feet long and joined in a loop; laid on the ground it forms a circle three paces across. Each ward once a day.',
        effects: [
          { name: 'Circular Ward Against Demons', technique: 'Re', form: 'Vi', level: 30, range: 'Touch', duration: 'Ring', target: 'Circle', final: 30, text: 'Base effect.' },
          { name: 'Ring of Warding Against Spirits', technique: 'Re', form: 'Me', level: 25, range: 'Touch', duration: 'Ring', target: 'Circle', final: 25, text: 'Base effect.' },
          { name: 'Ward Against Beasts of Legend', technique: 'Re', form: 'An', level: 25, range: 'Touch', duration: 'Ring', target: 'Circle', final: 25, text: 'Base effect.' },
          { name: 'Ward Against Faeries of the Air', technique: 'Re', form: 'Au', level: 25, range: 'Touch', duration: 'Ring', target: 'Circle', final: 25, text: 'Base effect.' },
          { name: 'Ward Against Faeries of the Wood', technique: 'Re', form: 'He', level: 25, range: 'Touch', duration: 'Ring', target: 'Circle', final: 25, text: 'Base effect.' },
          { name: 'Ward Against Monsters Which Walk As Man', technique: 'Re', form: 'Co', level: 25, range: 'Touch', duration: 'Ring', target: 'Circle', final: 25, text: 'Protects against creatures with a Might who are affected by Corpus.' },
        ],
      },
    ],
    familiar: {
      name: 'Sordus', species: 'basilisk', might: 30, size: -2, realm: 'Magic', technique: 'Pe', form: 'Vi', labTotal: 81, golden: 4, silver: 2, bronze: 2, line: 1820,
      powers: [{ name: 'Mental Communication', technique: 'In', form: 'Me', level: 15, text: 'Sordus and Philippus are in constant mental contact, exchanging words, images and emotions; either can deny contact to the other.' }],
      notes: 'A huge lizard, knee-high and six feet long, with a crest like a crown. Magic Might 30 (Animal); Int −3, Sta +4; Soak +10; too lazy to fight. Gaze of Death (8 points, Init −3, Corpus: an Incapacitating wound on anyone its gaze rests on); Horrid Wilting and Pollute Water (0 points, beyond its control: plants within 5 paces die, standing water stagnates). Speaks German, Latin and East Norse. Vis: 10 pawns of Perdo in each eye. It took Philippus three years to track down.',
    },
  },
  Falke: {
    items: [
      {
        name: 'Silver anklet-ring', kind: 'talisman', material: 'silver', size: 'tiny', line: 2913,
        text: 'A silver anklet-ring decorated with a checkered pattern of watery crystal and amber; it becomes a leg-band when she changes shape.',
        attunements: [['water-related effects', 5], ['Corpus', 3]],
        effects: [
          { name: 'Perceive the Change', technique: 'In', form: 'Co', level: 15, range: 'Touch', duration: 'Sun', target: 'Individual', uses: '2', environmental: true, final: 19, text: 'Detects whether Falke has changed form, and if she has, triggers the next effect; a constant effect she always chooses not to resist.' },
          { name: 'Change Size', technique: 'Mu', form: 'Te', level: 10, range: 'Personal', duration: 'Sun', target: 'Individual', uses: '2', environmental: true, linked: true, final: 17, text: 'Triggered by the previous effect, the talisman becomes a leg-band: constant once triggered.' },
          { name: 'Perceive Motives', technique: 'In', form: 'Me', level: 10, range: 'Eye', duration: 'Momentary', target: 'Individual', uses: '3', final: 12, text: 'As Sight of the Transparent Motive, with Penetration 0 so that it does not work on Hermetic magi.' },
        ],
      },
    ],
  },
  Stentorius: {
    items: [
      {
        name: 'Oswald’s golden pendant', kind: 'invested', material: 'gold', size: 'tiny', carriedBy: 'Oswald, his familiar', line: 2528,
        text: 'A bejeweled golden pendant Stentorius crafted for his familiar, the arrogant gray cat Oswald, who considers himself the ruler of Fengheld. The book gives Aura of Rightful Authority, with several uses, “amongst other effects”.',
        effects: [{ name: 'Aura of Rightful Authority', technique: 'Re', form: 'Me', level: 20, range: 'Eye', duration: 'Sun', target: 'Individual', uses: '6', final: 23, text: 'Those it meets the eye of obey reasonable commands as from their rightful lord (the book: several uses a day).' }],
      },
    ],
  },
  // House Merinita: the faerie Mysteries (Houses of Hermes: Mystery Cults)
  Handri: { mysteries: [['arcadian-travel', 'The Primus treats with the faerie courts, and travels between them and the mortal world.']] },
  Glesig: { mysteries: [['arcadian-travel', 'The House’s expert on the subterranean fae goes among them.']] },
  Orphedra: { mysteries: [['glamour', 'The covenant’s link to the dark fae of the forest, strong in Imaginem: illusions with a measure of reality.']] },
  Iacob: { mysteries: [['story-magic', 'He leads the Elder Gild and quietly promotes a faerie religion: magic that runs on the shape stories must take.']] },
  Vinaria: { mysteries: [['nature-lore', 'An elemental maga of long faerie experience, bound to the wild places.']] },
  Beechleaf: { mysteries: [['nature-lore', 'Raised by a dryad: a nature maga of the forest.']] },
  // House Bjornaer
  Urgen: { mysteries: [['theriomorphy', 'The eldest of the bear lineage, a Wilderist who lives much of his life as his heartbeast.']] },
  Ardea: { mysteries: [['the-mystery-of-the-anima', 'The Elder of the Swan leads the House’s rituals at the Gathering of Twelve Years.']] },
  Eule: { mysteries: [['secret-name', 'Perhaps the oldest magus of the Rhine, and long initiated into the House’s Mysteries.']] },
  'Jon Arnsson': { mysteries: [['sensory-magic', 'The Stag Elder, protector of the covenant: spells carried on a lion’s roar.']] },
  // House Verditius
  'Gudrun Tigurina': { mysteries: [['items-of-quality', 'Durenmar’s Artificer.'], ['verditius-elder-runes', 'Durenmar’s Artificer, versed in the old rune magic.']] },
  'Peter von Würzburg': { mysteries: [['items-of-quality', 'His minor magical items tend the vines that cover Fengheld’s slopes.']] },
};
