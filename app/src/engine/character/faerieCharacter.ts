// Faerie characters (Realms of Power: Faerie, Chapter Three): a faerie built to stand beside the
// player characters, as a companion or in place of a magus. Its Might starts at 5; its Abilities are
// Pretenses, bought from a pool of 15 × (the magi's average age − 5) + 120 points with no Virtue
// needed; it must take a form, a cognizance, a social interaction Virtue or Flaw and a taboo; it has no
// Confidence, does not age, and its Might is its Magic Resistance.

import type { Character, CreatureInfo } from '../types';

export interface FaerieCharacterInfo {
  /** the player character it stands for: a companion (Virtues balanced by Flaws, up to 10) or a magus (1 free, up to 20, two for each Flaw point) */
  replaces: 'companion' | 'magus';
  /** the average age of the saga's magi: it sets the Pretense points (the book assumes 21, for 360) */
  magiAge: number;
}

export interface FaerieCharDerived {
  might: number;
  mightParts: { label: string; value: number }[];
  pretensePoints: number;
  pretenseParts: { label: string; value: number }[];
  /** what the rules require and the character lacks, or what it may not have */
  issues: { id: string; severity: 'error' | 'warning'; message: string; fix?: string }[];
}

const has = (c: Character, id: string) => c.virtues.some((v) => v.defId === id);
const count = (c: Character, id: string) => c.virtues.filter((v) => v.defId === id).length;

export const FAERIE_FORMS = ['humanoid-faerie', 'faerie-beast', 'hybrid-form'];
export const FAERIE_COGNIZANCE = ['incognizant-flaw', 'narrowly-cognizant', 'highly-cognizant'];
export const FAERIE_SOCIAL = ['passes-for-human', 'positive-folktales', 'infiltrator', 'negative-reaction-flaw', 'monstrous-appearance-flaw'];
export const FAERIE_TABOOS = ['traditional-ward-flaw', 'sovereign-ward-flaw'];

/** Start a faerie character on a creature record: Faerie realm, a humanoid form of Size 0. */
export function newFaerieCreature(replaces: FaerieCharacterInfo['replaces'] = 'companion', magiAge = 21): CreatureInfo {
  return { realm: 'Faerie', might: 5, size: 0, kind: 'human', intelligence: replaces === 'magus' ? 'magus' : 'companion', faerieCharacter: { replaces, magiAge } };
}

/** The Pretense multiplier: 15, or 25 Ostentatious, 20 Pretentious, 10 Aloof. */
export function pretenseMultiplier(c: Character): number {
  if (has(c, 'ostentatious')) return 25;
  if (has(c, 'pretentious')) return 20;
  if (has(c, 'aloof-flaw')) return 10;
  return 15;
}

export function deriveFaerieCharacter(c: Character, fc: FaerieCharacterInfo, tally: { virtuePoints: number; flawPoints: number }): FaerieCharDerived {
  // Might: 5, +5 for each Minor Increased Faerie Might, +15 for each Major; 1 with Decreased Might
  const mightParts: { label: string; value: number }[] = [{ label: 'A faerie player character', value: has(c, 'decreased-might-flaw') ? 1 : 5 }];
  for (const v of c.virtues.filter((x) => x.defId === 'increased-faerie-might')) mightParts.push({ label: `Increased Faerie Might (${v.size})`, value: v.size === 'Major' ? 15 : 5 });
  const might = mightParts.reduce((t, p) => t + p.value, 0);
  const mult = pretenseMultiplier(c);
  const age = Math.max(5, fc.magiAge);
  const pretenseParts = [{ label: `${mult} × (the magi's age ${age} − 5) + 120`, value: mult * (age - 5) + 120 }];
  const sprung = count(c, 'freshly-sprung-flaw');
  if (sprung) pretenseParts.push({ label: `Freshly Sprung ×${sprung}`, value: -50 * sprung });
  const pretensePoints = Math.max(0, pretenseParts.reduce((t, p) => t + p.value, 0));

  const issues: FaerieCharDerived['issues'] = [];
  const need = (ids: string[], what: string, fix: string) => {
    if (!ids.some((id) => has(c, id))) issues.push({ id: `faerie-${what}`, severity: 'error', message: `A faerie must have ${what}.`, fix });
  };
  need(FAERIE_FORMS, 'a physical form', 'Take Humanoid Faerie, Faerie Beast or Hybrid Form (each Minor).');
  need(FAERIE_COGNIZANCE, 'a level of cognizance', 'Take Narrowly Cognizant (free), Highly Cognizant (Minor Virtue) or Incognizant (Minor Flaw).');
  need(FAERIE_SOCIAL, 'a Social Interaction Virtue or Flaw', 'Passes for Human (free), Positive Folktales, Infiltrator, Negative Reaction or Monstrous Appearance.');
  need(FAERIE_TABOOS, 'a taboo', 'Take Traditional Ward (Minor Flaw) or Sovereign Ward (Major Flaw): iron, herbs, names, thanks, a place, religious symbols…');
  if (FAERIE_COGNIZANCE.filter((id) => has(c, id)).length > 1) issues.push({ id: 'faerie-cognizance-two', severity: 'error', message: 'A faerie has one level of cognizance.' });
  if (has(c, 'the-gift') || c.virtues.some((v) => /^(gentle|blatant)-gift/.test(v.defId))) issues.push({ id: 'faerie-gift', severity: 'error', message: 'Faeries may not have The Gift, nor any Virtue or Flaw of Hermetic magi.' });
  if (has(c, 'ostentatious') && has(c, 'pretentious')) issues.push({ id: 'faerie-pretense-mult', severity: 'warning', message: 'Ostentatious and Pretentious each set the Pretense multiplier; the higher counts.' });
  // the Virtue budget for the player character it replaces
  if (fc.replaces === 'companion') {
    if (tally.virtuePoints > 10) issues.push({ id: 'faerie-vf-max', severity: 'error', message: `A faerie companion has up to 10 points of Virtues (has ${tally.virtuePoints}).` });
  } else if (tally.virtuePoints > 21) issues.push({ id: 'faerie-vf-max', severity: 'error', message: `A faerie in place of a magus has 1 free point, then up to 20 points of Virtues (has ${tally.virtuePoints}).` });
  return { might, mightParts, pretensePoints, pretenseParts, issues };
}

/** The Virtue points its Flaws allow: as many as the Flaws for a companion; 1 free and two for each Flaw point for a magus, to 20 + 1. */
export function faerieAllowedVirtuePoints(fc: FaerieCharacterInfo, flawPoints: number): number {
  return fc.replaces === 'companion' ? Math.min(10, flawPoints) : 1 + Math.min(20, 2 * flawPoints);
}
