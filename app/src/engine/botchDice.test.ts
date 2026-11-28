// Batch F, item 6: the botch dice of each hedge, faerie and holy roll come from its engine, not its card,
// and are checked here on the books' own cases. A foreign aura adds a die for each point of its rating, and
// twice that in a regio (DE, Realm Interaction and Regiones).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { elementalBotchDice } from './elementalMagic';
import { bargainBotchDice, riteBotchDice } from './faerieWizardry';
import { witchBotchDice } from './folkWitch';
import { gruagachBotchDice } from './gruagach';
import { godsAidTotal, miracleTotal } from './holy';
import { charmBotchDice, entreatyBotchDice } from './learnedMagic';
import { auraModifier, type AuraState } from './magic';
import { botchDiceOf } from './dice';
import { DEFAULT_HOUSE_RULES } from './types';

const data = buildGameData();
const aura = (realm: AuraState['realm'], strength: number, regio = false): AuraState => ({ realm, strength, ...(regio ? { regio } : {}) });
const iron = (score: number) => ({ sympathy: [{ uid: 't', trait: 'Iron', score }] });

describe('the entreaty of a learned magician (HMRE, Mitigation of Realm Interaction Effects)', () => {
  it('the book’s Giacomo: three realms called in an Infernal aura of 4, eight botch dice', () => {
    // "four extra for the Infernal aura and three more because he entreated three separate powers"; the card rolled 4
    expect(entreatyBotchDice(aura('Infernal', 4), ['Magic', 'Faerie', 'Divine'])).toBe(8);
  });
  it('one realm in no aura: two; in an Infernal regio of 4 the aura’s dice double', () => {
    expect(entreatyBotchDice(aura('None', 0), ['Divine'])).toBe(2);
    expect(entreatyBotchDice(aura('Infernal', 4, true), ['Magic', 'Faerie', 'Divine'])).toBe(12);
  });
  it('a charm read from a text: a die for each point of Language below 5', () => {
    expect(charmBotchDice({ auraBotch: 0, realms: 0, fromText: true, latin: 3 })).toBe(3);
    expect(charmBotchDice({ auraBotch: 0, realms: 0, fromText: false, latin: 3 })).toBe(1);
    expect(charmBotchDice({ auraBotch: 0, realms: 0, fromText: true, latin: 5 })).toBe(1);
  });
});

describe('faerie rites and bargains (RoP: Faerie)', () => {
  const dominion3 = auraModifier('Faerie', aura('Divine', 3)).botch;
  it('a Dominion aura of 3 is foreign to Faerie: three more dice; a Faerie aura adds none', () => {
    expect(dominion3).toBe(3);
    expect(auraModifier('Faerie', aura('Faerie', 5)).botch).toBe(0);
    expect(riteBotchDice({ sympathy: [] }, { auraBotch: dominion3 })).toBe(4);
    expect(bargainBotchDice({ sympathy: [] }, dominion3)).toBe(4);
  });
  it('an Iron −3 trait: "at least three additional botch dice", on a rite and on a bargain', () => {
    expect(riteBotchDice(iron(-3), { auraBotch: 0 })).toBe(4);
    expect(bargainBotchDice(iron(-3), 0)).toBe(4);
    // a positive trait adds none
    expect(bargainBotchDice(iron(3), 0)).toBe(1);
  });
  it('vis adds a die a pawn "unless the vis is associated with Faerie"', () => {
    expect(riteBotchDice({ sympathy: [] }, { auraBotch: 0, vis: 2 })).toBe(3);
    expect(riteBotchDice({ sympathy: [] }, { auraBotch: 0, vis: 2, faerieVis: true })).toBe(1);
    expect(riteBotchDice(iron(-3), { auraBotch: dominion3, vis: 2 })).toBe(9);
  });
});

describe('the hedge traditions (HMRE)', () => {
  it('a gruagach’s vis: a die a pawn, as for Hermetic magi; a Dominion aura of 3 adds three', () => {
    const a = auraModifier('Magic', aura('Divine', 3));
    expect(gruagachBotchDice({ auraBotch: a.botch }, 2)).toBe(6);
    expect(gruagachBotchDice({ auraBotch: 0 }, 0)).toBe(1);
  });
  it('an elementalist’s vis: a die a pawn, no more than the limit', () => {
    expect(elementalBotchDice({ auraBotch: 0 }, 2, 6)).toBe(3);
    expect(elementalBotchDice({ auraBotch: 0 }, 5, 3)).toBe(4);
    expect(elementalBotchDice({ auraBotch: 2 }, 0, 3)).toBe(3);
  });
  it('a folk witch: one, and a foreign aura’s; a Magic aura adds none', () => {
    expect(witchBotchDice({ auraBotch: auraModifier('Magic', aura('Infernal', 2)).botch })).toBe(3);
    expect(witchBotchDice({ auraBotch: auraModifier('Magic', aura('Magic', 5)).botch })).toBe(1);
  });
});

describe('holy rolls (RoP: The Divine)', () => {
  const dc = deriveCharacter(newCharacter('companion', 's'), data, DEFAULT_HOUSE_RULES);
  it('God’s aid: "at least three Botch dice"', () => {
    expect(botchDiceOf(godsAidTotal(dc))).toBe(3);
  });
  it('a prayer for a miracle: one in the Dominion, and an Infernal aura of 3 adds three (the card rolled one)', () => {
    expect(botchDiceOf(miracleTotal(dc, { aura: aura('Divine', 3) }))).toBe(1);
    expect(botchDiceOf(miracleTotal(dc, { aura: aura('Infernal', 3) }))).toBe(4);
  });
});
