// Virtues that act in play: Secondary Insight's extra points when an Art is studied, Diedne Magic's
// spontaneous casting, and Mythic (Characteristic)'s specialty.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { applySeason, newSeasonEntry } from './longterm';
import { castingScore } from './magic';
import { DEFAULT_HOUSE_RULES } from './types';

const data = buildGameData();

describe('Secondary Insight', () => {
  it('gives a point in four Forms when a Technique is studied, the chosen first, the lowest after, and is taken back with the season', () => {
    const c = newCharacter('magus', 's');
    addVirtue(c, data, 'secondary-insight');
    c.arts.Ig = { apprenticeship: 30 };
    c.insight = ['An'];
    const e = newSeasonEntry(1220, 'Spring', 'study-vis', 'Studied Creo vis', { 'art:Cr': 8 });
    applySeason(c, e, 1);
    const forms = Object.keys(e.gains).filter((k) => k !== 'art:Cr');
    expect(forms).toHaveLength(4);
    expect(forms).toContain('art:An');
    expect(forms).not.toContain('art:Ig');
    expect(Object.values(e.gains).filter((v) => v === 1)).toHaveLength(4);
    expect(c.arts.An?.play).toBe(1);
    applySeason(c, e, -1);
    expect(c.arts.An?.play ?? 0).toBe(0);
    applySeason(c, e, 1);
    expect(Object.keys(e.gains)).toHaveLength(5);
  });
  it('gives two Techniques for a Form, and nothing to one without the Virtue or for an Ability', () => {
    const c = newCharacter('magus', 's');
    addVirtue(c, data, 'secondary-insight');
    const e = newSeasonEntry(1220, 'Spring', 'study-book', 'Read', { 'art:Ig': 6 });
    applySeason(c, e, 1);
    expect(Object.keys(e.gains).filter((k) => /^art:(Cr|In|Mu|Pe|Re)$/.test(k))).toHaveLength(2);
    const plain = newCharacter('magus', 's');
    const f = newSeasonEntry(1220, 'Spring', 'study-book', 'Read', { 'art:Ig': 6 });
    applySeason(plain, f, 1);
    expect(Object.keys(f.gains)).toEqual(['art:Ig']);
  });
});

describe('Diedne Magic', () => {
  it('doubles the lowest Art when a spontaneous spell is exerted', () => {
    const c = newCharacter('magus', 's');
    addVirtue(c, data, 'diedne-magic');
    c.arts.Cr = { apprenticeship: 15 };
    c.arts.Ig = { apprenticeship: 55 };
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    const plain = castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'spontaneous', wordsGestures: 0 });
    const exerted = castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'spontaneous', wordsGestures: 0, diedneExerted: true });
    expect(exerted.total - plain.total).toBe(5); // Creo 5 (15 xp) counts twice
    expect(c.virtues.some((v) => v.requiredBy && v.noPoints)).toBe(true); // the lineage's Story Flaw, without points
  });
});

describe('Mythic (Characteristic)', () => {
  it('names the specialty for the Characteristic it was taken for', () => {
    const c = newCharacter('companion', 's');
    c.characteristics.Int = 2;
    addVirtue(c, data, 'mythic-characteristic', 'Minor', 'Int', { note: 'great knowledge' });
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    expect(d.charSpecialties).toEqual([expect.objectContaining({ char: 'Int', text: 'great knowledge' })]);
  });
});
