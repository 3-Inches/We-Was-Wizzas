import { sagaPage, wizard, sheet, dice, concept, finishing } from '../places';
import type { Tour } from '../tours';

export const magusTour: Tour = {
  id: 'magus',
  title: 'Make a magus',
  blurb: 'A Hermetic wizard, step by step: House, Virtues and Flaws, Abilities, Arts and spells.',
  group: 'Characters',
  charType: 'magus',
  inSaga: true,
  makesCharacter: true,
  steps: [
    {
      title: 'Create the magus',
      body: 'Under **Create a character**, press **Magus**. The wizard opens, and the tutorial follows the new character. (For an NPC, **Quick build** makes one whole.)',
      at: sagaPage('people'), needs: 'saga', target: 'create-magus', advance: {},
    },
    concept('Name, player, age and the idea of the character, and one to three themes (Warrior, Scholar, Healer…). Not sure what to play? The **guided build** asks what you want from the character and suggests a House, Virtues and Abilities.'),
    {
      title: 'House',
      body: 'Choose a House of Hermes. Each brings a Virtue or rule of its own, and the card says what it gives and asks of a magus.',
      at: wizard, needs: 'character', wizard: 'house', target: 'step-house',
    },
    {
      title: 'Virtues & Flaws',
      body: 'The Gift and Hermetic Magus come free. Flaws pay for Virtues point for point (Minor 1, Major 3), up to the troupe’s limit; **Point balance** keeps count, and the list shows only what this magus may take.',
      at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-balance', 'step-virtues'],
    },
    {
      title: 'Characteristics',
      body: 'Share the Characteristic points among the eight Characteristics. Higher scores cost more, and a score below 0 gives points back.',
      at: wizard, needs: 'character', wizard: 'characteristics', target: 'step-characteristics',
    },
    {
      title: 'Abilities',
      body: 'Experience comes in pools (Early Childhood, Apprenticeship, After Gauntlet), each with its own budget and Abilities it may buy. Choose a pool, add Abilities and raise them.',
      at: wizard, needs: 'character', wizard: 'abilities', target: ['xp-pools', 'step-abilities'],
    },
    {
      title: 'Arts',
      body: 'The apprenticeship also pays for the fifteen Arts. A score costs its triangle in experience (5 costs 15); a Technique and a Form together make every Casting Score and Lab Total.',
      at: wizard, needs: 'character', wizard: 'arts', target: ['arts', 'step-arts'],
    },
    {
      title: 'Spells',
      body: 'Pick the spells learned in apprenticeship. The card shows the levels left; the Rules check flags a spell above the level its Technique and Form allow.',
      at: wizard, needs: 'character', wizard: 'spells', target: ['spells-known', 'step-spells'],
    },
    ...finishing,
    {
      title: 'Magic in play',
      body: 'The **Magic** tab has Casting Scores, Lab Totals, Penetration and Magic Resistance. Set the aura and the circumstances at the top, and every total follows. Spells are cast at **Game Table › Dice › Spellcasting**, where Fatigue, Warping and vis go back on the sheet. Lab projects are worked a season at a time on **Game Table › Seasons**.',
      at: sheet('magic'), needs: 'character', target: ['magic-circumstances', 'tab-magic'],
    },
    {
      title: 'Casting at the table',
      body: 'On **Dice › Spellcasting**, pick the caster: their spells with **Calm** and **Stress** buttons, spontaneous magic, certamen against anyone of the saga or the Tribunal, and Wizard’s Twilight after a botch. Each result shows under the buttons that made it.',
      at: dice('magic'), needs: 'character', target: ['magic-circumstances', 'tab-magic'],
    },
  ],
};
