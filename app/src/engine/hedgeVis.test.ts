// A hedge magician's season takes its vis from the purse or the covenant's stores, and puts vis it draws
// there (audit C2). Checked against Hedge Magic's own examples: the folk witch's brew, the elemental
// philosopher's moved vis and the gruagach's boar tattoo.
import { describe, expect, it } from 'vitest';
import { newCharacter } from './character/factory';
import { brew, fetishVisArt, kitchenVisLimit, potionVisArts, witchLongevityVis, WITCH_LONGEVITY_ARTS } from './folkWitch';
import { moveVis, refiningVisArts } from './elementalMagic';
import { tattoo, tattooVisArts } from './gruagach';
import { newSeasonEntry } from './longterm';
import { unlogSeason, visUndo } from './unlog';
import { fullerPlace, putInto, spendFrom, visAvailable, visInPlaces } from './vis';
import { WITCH_HEALING } from '../data/hedgeFolkWitch';
import type { Character, Covenant } from './types';

function witch(purse: Character['purse'] = { pounds: 0, vis: [] }): Character {
  const c = newCharacter('companion', 'w');
  c.purse = purse;
  return c;
}
const covenant = (vis: Covenant['visStocks']) => ({ id: 'cov', name: 'Ash Hollow', visStocks: vis }) as unknown as Covenant;

describe('a folk witch’s brew, from the stores (HMRE, Potion Brewing, the book’s example)', () => {
  // Folk Witch Magic Theory 4, Healing 5, Intelligence +1, a Magic aura of 3: a Lab Total of 13, potions for Light Wounds
  const light = WITCH_HEALING.find((r) => /light/i.test(r.wound))!;
  it('takes Corpus vis, the Healing Form', () => {
    expect(potionVisArts('witch-healing')).toEqual(['Co']);
    expect(light.woundVis).toBe(3);
  });
  it('4 doses for 7 pawns of Corpus, taken from the covenant’s stores', () => {
    const c = witch();
    const cov = covenant([{ art: 'Co', pawns: 10 }]);
    const have = visInPlaces(c, cov, ['Co']);
    expect(fullerPlace(c, cov, ['Co'])).toBe('covenant');
    const b = brew(4, light.woundVis, Math.min(kitchenVisLimit(c, 4, true), have.covenant));
    expect(b).toMatchObject({ doses: 4, vis: 7 });
    const r = spendFrom(c, cov, 'covenant', ['Co'], b.vis);
    expect(r.ok).toBe(true);
    expect(r.text).toBe('Spent 7 pawns of Corpus vis from the covenant’s stores.');
    expect(visAvailable(cov.visStocks, ['Co'])).toBe(3);
  });
  it('"if she only had 4 pawns of vis available, she would only be able to manufacture 1 dose"', () => {
    const c = witch({ pounds: 0, vis: [{ art: 'Co', pawns: 4 }] });
    const b = brew(4, light.woundVis, Math.min(kitchenVisLimit(c, 4, true), visInPlaces(c, undefined, ['Co']).purse));
    expect(b).toMatchObject({ doses: 1, vis: 4 });
    expect(spendFrom(c, undefined, 'purse', ['Co'], b.vis).ok).toBe(true);
    expect(c.purse!.vis).toEqual([]);
  });
  it('a Lab Text of level 4: 5 doses for 8 pawns, the most a season allows', () => {
    const c = witch({ pounds: 0, vis: [{ art: 'Co', pawns: 20 }] });
    expect(brew(4, light.woundVis, Math.min(kitchenVisLimit(c, 4, true), 20), { labText: 4 })).toMatchObject({ doses: 5, vis: 8 });
  });
  it('refuses when the place chosen is short, and takes nothing', () => {
    const c = witch({ pounds: 0, vis: [{ art: 'Co', pawns: 2 }] });
    const r = spendFrom(c, covenant([{ art: 'Co', pawns: 9 }]), 'purse', ['Co'], 4);
    expect(r).toMatchObject({ ok: false, text: 'It needs 4 pawns of Corpus vis; the purse has 2.' });
    expect(c.purse!.vis).toEqual([{ art: 'Co', pawns: 2 }]);
  });
  it('a fetish’s pawn, and a Longevity Ritual’s pawn for every five years in Creo, Corpus or Vim', () => {
    expect(['dowsing', 'witch-flight', 'shapeshifter'].map(fetishVisArt)).toEqual(['In', 'Au', 'An']);
    expect(witchLongevityVis(40)).toBe(8);
    expect(witchLongevityVis(41)).toBe(9);
    expect(WITCH_LONGEVITY_ARTS).toEqual(['Cr', 'Co', 'Vi']);
  });
  it('Dowsing brews with the Form of what is sought; Cursing with the curse’s', () => {
    expect(potionVisArts('dowsing')).toHaveLength(10);
    expect(potionVisArts('witch-cursing')).toEqual(['An', 'Co', 'Me']);
  });
});

describe('an elementalist’s Refining (HMRE, Refining)', () => {
  it('a potion takes the Forms of the elementalist’s elements; a philosopher may use any Art', () => {
    expect(refiningVisArts(['water', 'fire'], 'Medicinal')).toEqual(['Aq', 'Ig']);
    expect(refiningVisArts(['air'], 'Philosophical')).toHaveLength(15);
  });
  it('"5 pawns of Vim vis could be moved … leaving 2 pawns of Auram vis", and Unlog puts them back', () => {
    const c = witch({ pounds: 0, vis: [{ art: 'Vi', pawns: 5 }] });
    const before = structuredClone(c);
    const m = moveVis(25, 5, false);
    expect(m).toEqual({ ok: true, arrive: 2 });
    spendFrom(c, undefined, 'purse', ['Vi'], 5);
    expect(putInto(c, undefined, 'purse', 'Au', m.arrive)).toBe('2 pawns of Auram vis put in the purse.');
    expect(c.purse!.vis).toEqual([{ art: 'Au', pawns: 2 }]);
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Elemental refining: moving vis');
    e.undo = visUndo(before, c);
    expect(e.undo).toEqual({ vis: { from: 'purse', taken: [{ art: 'Vi', pawns: 5 }] }, visAdded: { to: 'purse', added: [{ art: 'Au', pawns: 2 }] } });
    c.seasonLog.push(e);
    expect(unlogSeason(c, e.uid).ok).toBe(true);
    expect(c.purse!.vis).toEqual([{ art: 'Vi', pawns: 5 }]);
  });
  it('vis drawn into the covenant’s stores comes out again when the season is unlogged', () => {
    const c = witch();
    const cov = covenant([]);
    const covBefore = structuredClone(cov);
    putInto(c, cov, 'covenant', 'Aq', 3);
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Elemental refining: vis from the aura');
    e.undo = visUndo(c, c, covBefore, cov);
    c.seasonLog.push(e);
    const r = unlogSeason(c, e.uid, [cov]);
    expect(r.covenants).toEqual([cov]);
    expect(cov.visStocks).toEqual([]);
  });
});

describe('a gruagach’s tattoo (HMRE, Enchanting Tattoos: the boar tattoo)', () => {
  it('"requires two pawns of Animal or Corpus vis", taken from the most plentiful', () => {
    // a Grant Blessing of level 15, its spare level spent on two uses a day; Lab Total 32, Pictish 3
    const t = tattoo(32, 15, 3, false, { usesMod: 1 });
    expect(t).toMatchObject({ ok: true, vis: 2, level: 16 });
    const arts = tattooVisArts('GvBl');
    expect(arts).toEqual(expect.arrayContaining(['An', 'Co']));
    const c = witch({ pounds: 0, vis: [{ art: 'An', pawns: 1 }, { art: 'Co', pawns: 3 }] });
    const r = spendFrom(c, undefined, 'purse', arts, t.vis);
    expect(r.taken).toEqual([{ art: 'Co', pawns: 2 }]);
  });
  it('Take works with Intellego, Rego or Perdo; Vision with Imaginem or Vim', () => {
    expect(tattooVisArts('TaVs')).toEqual(['In', 'Re', 'Pe', 'Im', 'Vi']);
  });
});
