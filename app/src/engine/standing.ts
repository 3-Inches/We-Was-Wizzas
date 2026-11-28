// What a character does with a season nobody planned (its standing activity), and how it reads.

import { ART_NAMES, type Art } from '../data';
import type { DerivedCharacter } from './character/derive';
import { ensureAbility } from './character/factory';
import { writingFor } from './books';
import { seasonRole, seasonsOf, seasonsUsed } from './seasons';
import type { Character, StandingActivity } from './types';
import { isTrade } from './workshop';

/** The Ability Worship teaches: Church Lore, Concentration or Music (the one the character knows best), else Church Lore (The Church). */
export function worshipAbility(c: Character, d: DerivedCharacter): string {
  const known = d.abilities.filter((a) => (a.abilityId === 'organization-lore' && /church/i.test(a.name)) || a.abilityId === 'concentration' || a.abilityId === 'music').sort((a, b) => b.total - a.total)[0];
  return `ability:${known?.uid ?? ensureAbility(c, 'organization-lore', {}, 'Church').uid}`;
}

/** The Divine aura a character worships in (Worship's Source Quality): a small church's 4, unless the covenant's own aura is Divine. */
export const WORSHIP_AURA = 4;

/** The Ability a character works with: its Craft or Profession, else its best Ability. */
export function workAbility(d: DerivedCharacter): string | undefined {
  const trade = d.abilities.filter((a) => isTrade(a.abilityId)).sort((a, b) => b.total - a.total)[0];
  if (trade) return `ability:${trade.uid}`;
  const best = d.abilities.filter((a) => a.abilityId !== 'living-language' && a.abilityId !== 'dead-language').sort((a, b) => b.total - a.total)[0];
  return best ? `ability:${best.uid}` : undefined;
}

/** What a character does when nobody planned the season: its standing activity, with 'auto' worked out. */
export function resolveStanding(c: Character, d: DerivedCharacter, year: number): StandingActivity {
  const s = c.standing ?? { kind: 'auto' };
  // a creature left to the clock does nothing it was not set to do
  if (c.creature && s.kind === 'auto') return { kind: 'none' };
  // once the year's free seasons are spent, a season is work, or a Regular's Worship, whatever else was chosen (DE, Assigning Seasons)
  const role = seasonRole(seasonsOf(c, d), seasonsUsed(c, year));
  if (role === 'worship') return { kind: 'worship' };
  if (role === 'work' && s.kind !== 'none') return c.workshop ? { kind: 'work' } : { kind: 'exposure', target: s.kind === 'exposure' && s.target ? s.target : workAbility(d) };
  if (s.kind !== 'auto') return s;
  if (c.creature) return { kind: 'none' };
  if (d.isMagus) {
    // vis extraction goes on only by choice: left to the clock, the magus works its own projects
    const p = c.projects?.find((x) => !x.done && x.kind !== 'extract');
    return { kind: 'lab', projectUid: p?.uid };
  }
  return { kind: 'practice', target: s.target ?? workAbility(d) };
}

export function describeStanding(c: Character, d: DerivedCharacter, s: StandingActivity): string {
  const name = (t?: string) => {
    if (!t) return 'nothing chosen';
    const [k, id] = t.split(':');
    if (k === 'mastery') return `${c.spells.find((x) => x.uid === id)?.spell.name ?? 'a spell'} (Mastery)`;
    return k === 'art' ? ART_NAMES[id as Art] : d.abilityByUid.get(id)?.name ?? 'an Ability';
  };
  switch (s.kind) {
    case 'priorities': return 'Follows the priority list';
    case 'read': {
      return `Read ${name(s.target)}${s.bookUid ? ' from the library' : ''}`;
    }
    case 'exposure': return `Exposure in ${name(s.target)} (2 xp)`;
    case 'practice': return `Practice ${name(s.target)} (Quality 4)`;
    case 'vis': return `Study ${name(s.target)} from vis`;
    case 'work': return 'Work in the workshop';
    case 'taught': return s.teacher?.startsWith('char:') ? `Taught by a covenant-mate${s.target ? '' : ' (what teaches the most)'}` : `Taught ${name(s.target)}`;
    case 'teach': return `Teach ${s.students?.length ? `${s.students.length} student${s.students.length > 1 ? 's' : ''}` : 'whoever asks'}${s.target ? ` ${name(s.target)}` : ' (what teaches the most)'}`;
    case 'assist': return 'Help in a covenant-mate’s lab';
    case 'worship': return `Worship (Quality ${WORSHIP_AURA}, a church's Dominion)`;
    case 'lab': {
      const p = c.projects?.find((x) => x.uid === s.projectUid && !x.done);
      return p ? `Lab: ${p.name}` : 'Lab work (Exposure in Magic Theory)';
    }
    case 'write': {
      const p = writingFor(c, s.projectUid);
      return p ? `Write: ${p.title} (${p.points}/${p.needed})` : 'Write (nothing left to write)';
    }
    case 'none': return 'Nothing';
    default: return 'Automatic';
  }
}
