// What a play-through of the whole toolkit turned up: a Shape and Material bonus on an effect
// instilled, a Verditius's runes, the trades a livelihood is earned by, the Senior Master's Virtue,
// aging spread over what can be spared, and vis eaten for Hunger for (Form) Magic.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { applyAgingPoint, sparestCharacteristic } from './longterm';
import { newProject, planProject, shapeMaterialChoices, workProject } from './projects';
import { GUILD_RANKS, guildRank } from './society';
import { feedHunger } from './time';
import { isTrade } from './workshop';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { newEffect, newItem } from '../ui/items/ItemEditor';

const data = buildGameData();
const ctx = { aura: { realm: 'Magic' as const, strength: 5 } };
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);

function enchanter(): { c: Character; p: ReturnType<typeof newProject> } {
  const c = newCharacter('magus', 's');
  c.characteristics.Int = 3;
  c.arts.In = { apprenticeship: 55 };
  c.arts.Te = { apprenticeship: 55 };
  ensureAbility(c, 'magic-theory', { apprenticeship: 30 }); // 3
  c.purse = { pounds: 0, vis: [{ art: 'Te', pawns: 5 }] };
  const it = { ...newItem('invested'), name: 'Silver ring', openedPawns: 6, shapeMaterialIds: ['ring', 'silver'] };
  const e = { ...newEffect(), name: 'Sense the earth', technique: 'In' as const, form: 'Te' as const, modifiedLevel: 10, baseLevel: 10, pending: true };
  it.effects.push(e);
  c.items.push(it);
  const p = { ...newProject('instill'), itemUid: it.uid, effectUid: e.uid };
  c.projects = [p];
  return { c, p };
}

describe('instilling with Shape and Material', () => {
  it('offers the item’s bonuses, and a talisman’s attunements too', () => {
    const { c } = enchanter();
    const keys = shapeMaterialChoices(c, c.items[0], data).map((x) => x.key);
    expect(keys).toEqual(expect.arrayContaining(['Ring: constant effect', 'Silver: Intellego', 'Silver: Terram']));
    c.talismanUid = c.items[0].uid;
    c.items[0].attunements.push({ label: 'Watchfulness', bonus: 3 });
    expect(shapeMaterialChoices(c, c.items[0], data).map((x) => x.key)).toContain('Watchfulness');
  });
  it('adds the chosen ones to the Lab Total, held to Magic Theory, with a Verditius’s Philosophiae', () => {
    const { c, p } = enchanter();
    const base = planProject(p, c, d(c), ctx, { data }).total!.total;
    p.sm = ['Silver: Intellego'];
    expect(planProject(p, c, d(c), ctx, { data }).total!.total).toBe(base + 2);
    p.sm = ['Silver: Intellego', 'Silver: Terram', 'Ring: constant effect'];
    expect(planProject(p, c, d(c), ctx, { data }).total!.total).toBe(base + 3); // 5, held to Magic Theory 3
    // the ring was crafted by a Verditius with Philosophiae 1: each bonus used is one higher, for whoever enchants it
    c.items[0].runes = 1;
    ensureAbility(c, 'magic-theory', { apprenticeship: 75 }); // 5
    p.sm = ['Silver: Intellego'];
    expect(planProject(p, c, d(c), ctx, { data }).total!.parts.find((x) => /Verditius runes/.test(x.label))?.value).toBe(3); // 2 + 1
    p.sm = ['Silver: Intellego', 'Silver: Terram'];
    expect(planProject(p, c, d(c), ctx, { data }).total!.parts.find((x) => /Verditius runes/.test(x.label))?.value).toBe(5); // 3 + 2, at Magic Theory 5
    // a Verditius opening an item crafts it, runes and all
    const v = newCharacter('magus', 's');
    addVirtue(v, data, 'verditius-magic', 'Minor');
    ensureAbility(v, 'philosophiae', { apprenticeship: 15 }); // 2
    ensureAbility(v, 'magic-theory', { apprenticeship: 75 });
    v.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 10 }] };
    const box = { ...newItem('invested'), name: 'Box', material: 'wood', size: 'small' as const };
    v.items.push(box);
    const open = { ...newProject('open'), itemUid: box.uid };
    v.projects = [open];
    workProject(v, d(v), ctx, undefined, open.uid, data);
    expect(v.items[0].runes).toBe(2);
  });
});

describe('livelihoods and guilds', () => {
  it('earns a living by a Craft or a Profession, not by Crafter’s Healing or Craft Amulets', () => {
    expect(['craft-type', 'profession-type', 'profession-apothecary'].every(isTrade)).toBe(true);
    expect(['crafters-healing', 'craft-amulets'].some(isTrade)).toBe(false);
  });
  it('makes a senior master by the Senior Master Virtue', () => {
    expect(GUILD_RANKS.senior.virtue).toBe('senior-master');
    const c = newCharacter('companion', 's');
    addVirtue(c, data, 'senior-master', 'Major');
    expect(guildRank(c)).toBe('senior');
  });
});

describe('aging spread over what can be spared', () => {
  it('does not lower one high Characteristic again and again', () => {
    const c = newCharacter('companion', 's');
    c.characteristics = { Int: 3, Per: 1, Str: 0, Sta: 0, Pre: 1, Com: 1, Dex: 1, Qik: 0 };
    for (let i = 0; i < 20; i++) applyAgingPoint(c, sparestCharacteristic(c));
    expect(Math.max(...Object.values(c.agingLoss ?? {}))).toBeLessThanOrEqual(2);
  });
});

describe('Hunger for (Form) Magic', () => {
  it('wins back its lost levels as vis of the Form is eaten', () => {
    const c = newCharacter('grog', 's');
    addVirtue(c, data, 'hunger-for-form-magic-flaw', 'Major', 'Vi');
    c.hungerLost = 3;
    c.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 2 }, { art: 'Ig', pawns: 4 }] };
    expect(d(c).currentFatiguePenalty).toBe(-3); // three levels lost: Tired
    expect(feedHunger(c)).toMatch(/Ate 2 pawns of Vim vis: 2 Fatigue levels back, 1 still lost/);
    expect(c.hungerLost).toBe(1);
    expect(d(c).currentFatiguePenalty).toBe(0); // one: Winded
    expect(c.purse.vis.find((v) => v.art === 'Ig')?.pawns).toBe(4);
  });
});
