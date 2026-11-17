// The core book's templates build whole: every name placed, and the rules check content.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { CHARACTER_TEMPLATES, characterFromTemplate, personalityFrom } from './templates';
import { DEFAULT_HOUSE_RULES } from './types';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;

describe('the core book’s character templates', () => {
  it('are all there: six grogs, five companions, a magus of each House', () => {
    expect(CHARACTER_TEMPLATES.filter((t) => t.type === 'grog')).toHaveLength(6);
    expect(CHARACTER_TEMPLATES.filter((t) => t.type === 'companion')).toHaveLength(5);
    expect(CHARACTER_TEMPLATES.filter((t) => t.type === 'magus').map((t) => t.house)).toHaveLength(12);
    expect(personalityFrom('Angry +3, Brave +3, Trusting –2').map((p) => [p.trait, p.score])).toEqual([['Angry', 3], ['Brave', 3], ['Trusting', -2]]);
  });

  it('each builds with every Virtue, Ability, Art and spell placed', () => {
    const report: string[] = [];
    for (const t of CHARACTER_TEMPLATES) {
      const { c, problems } = characterFromTemplate(t, 's', 1220, data, rules);
      const d = deriveCharacter(c, data, rules);
      const errors = validateCharacter(d, data, rules).filter((i) => i.severity === 'error').map((i) => `${i.id}: ${i.message}`);
      if (problems.length || errors.length) report.push(`${t.name}: ${[...problems, ...errors].join(' | ')}`);
    }
    expect(report).toEqual([]);
  });
  it('takes the native language from the saga’s Tribunal, and leaves it for the player to name when there is none', () => {
    const t = CHARACTER_TEMPLATES.find((x) => /\b(Native|Living) Language\s+\d/.test(x.sheet.abilities))!;
    const lang = (tribunal?: string) => characterFromTemplate(t, 's', 1220, data, rules, tribunal).c.abilities.filter((a) => a.abilityId === 'living-language').map((a) => a.param);
    expect(lang('Rhine')).toContain('German');
    expect(lang()).toContain('');
    const c = characterFromTemplate(t, 's', 1220, data, rules).c;
    expect(validateCharacter(deriveCharacter(c, data, rules), data, rules).some((i) => i.id.startsWith('lang-name-'))).toBe(true);
  });
});
