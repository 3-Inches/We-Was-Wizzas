// Cards for "new path" options (design spec, section 4): what the option lets a character do
// that a core-only character cannot, what it costs, the roll behind it, and the nearest core
// route. A player cannot judge these from a number. Each card is written from the Definitive
// Edition text cited; the verdicts are drafts for the storyguide to confirm.

export interface PathCard {
  access: string;
  costs: string;
  engine: string;
  output: string;
  growsWith: string;
  nearestCore: string;
  verdict: string;
}

export const CARDS: Record<string, PathCard> = {
  'faerie-raised-magic': {
    access: 'Major Hermetic Virtue. Taken at creation, it normally comes with the Faerie Upbringing Flaw (and perhaps Weak Parens).',
    costs: 'Experience from Exposure, Adventure or Practice: the spell’s magnitude + 4 points (a spell of level 5 or less costs its level, at least 1). No lab season. Never Rituals.',
    engine: 'Technique + Form + Intelligence + Magic Theory must be at least the spell’s level – 10.',
    output: 'Formulaic spells that mimic faerie powers or supernatural effects the character saw that season; points on a spell similar to one already known count half again. Includes Spell Improvisation.',
    growsWith: 'The Arts involved, Intelligence and Magic Theory.',
    nearestCore: 'Inventing the spell in the lab: one season, or several when the Lab Total is close to the level. Lab texts, a similar spell, a high aura and lab bonuses all shorten it.',
    verdict: 'Pays off for a magus who adventures a lot: experience that would otherwise go to Abilities buys spells without spending seasons. A magus who mostly works in the lab, with a good aura and a library of lab texts, usually learns the same spells faster there.',
  },
  'flexible-formulaic-magic': {
    access: 'Major Hermetic Virtue.',
    costs: 'Nothing extra: the spell is cast at its modified level, so Fatigue and Penetration follow the new level.',
    engine: 'Raise or lower one of Range, Duration, Target or Target size by one step for one magnitude, or swap one for another of the same level.',
    output: 'Known Formulaic spells stretch to fit the situation (a longer Range, a bigger Target…). Not Rituals.',
    growsWith: 'The number of Formulaic spells the magus knows.',
    nearestCore: 'Knowing several versions of the same spell, or casting it spontaneously at a much lower total.',
    verdict: 'Strong for a magus with a broad grimoire who meets unexpected situations; less useful for one who mostly invents exactly the spell needed.',
  },
  'life-boost': {
    access: 'Minor Hermetic Virtue.',
    costs: 'One Fatigue level per +5, spent whether or not the spell works. Beyond your Fatigue levels you Soak 5 damage per extra level + a stress die, without armor: you can kill yourself.',
    engine: '+5 to a Formulaic or Ritual Casting Total per Fatigue level, committed before the roll.',
    output: 'Much higher Casting Totals, and so Penetration, when it matters.',
    growsWith: 'Stamina and Soak (to survive the extra levels).',
    nearestCore: 'Raising the Arts, or Penetration and Arcane Connections, for the same Penetration.',
    verdict: 'A reliable emergency lever for a combat magus; costly in long fights, where Fatigue matters.',
  },
  'second-sight': {
    access: 'Minor Supernatural Virtue: grants the Ability Second Sight 1.',
    costs: 'None; a roll when it matters.',
    engine: 'Perception + Second Sight against 6 + the magnitude of the Might (or the spell) behind the concealment. Magic Resistance does not interfere.',
    output: 'Sees through illusions and invisibility (Imaginem concealment), and sees spirits and regio boundaries.',
    growsWith: 'Second Sight and Perception.',
    nearestCore: 'Intellego Imaginem or Intellego Vim spells, cast and maintained at the right moment.',
    verdict: 'Always on and needs no spell; worth most in sagas full of spirits, faeries and regiones.',
  },
  premonitions: {
    access: 'Minor Supernatural Virtue: grants the Ability Premonitions 1.',
    costs: 'None.',
    engine: 'Perception + Premonitions against 3 for imminent mortal peril, higher for distant or minor danger.',
    output: 'A warning before danger, with more detail on a good roll. The storyguide can call for it.',
    growsWith: 'Premonitions and Perception.',
    nearestCore: 'Intellego spells of divination, which need time and the right question.',
    verdict: 'Keeps a character alive in dangerous sagas; a light, always-useful Virtue.',
  },
  'major-magical-focus': {
    access: 'Major Hermetic Virtue. Only one Magical Focus per character, Major or Minor.',
    costs: 'None; the focus must be narrower than a single Art (weather, necromancy, birds, emotions).',
    engine: 'Inside the focus, add the lowest applicable Art twice to Casting Totals and Lab Totals.',
    output: 'Very high totals inside the focus, in the field and in the lab.',
    growsWith: 'The Arts the focus covers.',
    nearestCore: 'Raising both Arts of the combination, which costs far more experience.',
    verdict: 'One of the strongest Virtues for a specialist; worth little for work outside the focus.',
  },
  'minor-magical-focus': {
    access: 'Minor Hermetic Virtue. Only one Magical Focus per character, Major or Minor.',
    costs: 'None; the field is narrower than one Technique + Form combination (healing, self-transformation).',
    engine: 'Inside the focus, add the lowest applicable Art twice, as for a Major Magical Focus.',
    output: 'High totals in a narrow field.',
    growsWith: 'The Arts the focus covers.',
    nearestCore: 'Raising the Arts of that combination.',
    verdict: 'Excellent value for a character built around one kind of spell.',
  },
  'elemental-magic': {
    access: 'Major Hermetic Virtue.',
    costs: 'None.',
    engine: 'Studying Aquam, Auram, Ignem or Terram from a source dedicated to it gives half the Source Quality (rounded up) in each of the other three. At creation, half the experience in each elemental Form is copied to the others.',
    output: 'Four Forms that grow together; a spell with an elemental requisite uses its primary Form.',
    growsWith: 'Study of any elemental Form.',
    nearestCore: 'Studying each of the four Forms separately.',
    verdict: 'Very strong for an elementalist who studies these Forms often; little for a magus who rarely uses them.',
  },
  'mercurian-magic': {
    access: 'Major Hermetic Virtue. Known Mercurians also have the Minor Flaw Ceremonial Spontaneous Magic.',
    costs: 'None.',
    engine: 'Knows Wizard’s Vigil at the level of the highest Ritual spell known; adds Mastery scores to the Vigil’s effective level.',
    output: 'Ritual spells cost half the usual vis; better group magic.',
    growsWith: 'The Ritual spells the magus learns, and Mastery.',
    nearestCore: 'Paying the full vis cost for every Ritual.',
    verdict: 'Worth most where vis is scarce and Rituals (Aegis of the Hearth, longevity) are frequent.',
  },
};
