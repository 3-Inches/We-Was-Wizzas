import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../store/store';
import { useCharacter, useCharacterContext, useDerived, useGameData, useSaga } from '../../store/hooks';
import type { Character } from '../../engine/types';
import { deriveCharacter } from '../../engine/character/derive';
import { adjustAfterChange } from '../../engine/character/rebalance';
import { resolveAll as resolveAllIssues, type Fix } from '../../engine/character/fixes';

export function useCharEditor() {
  const { sagaId, charId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const c = useCharacter(charId);
  const { d, issues } = useDerived(c, saga, data);
  const ctx = useCharacterContext(c, data);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const putCharacter = useStore((s) => s.putCharacter);
  const setNotice = useStore((s) => s.setNotice);
  const rules = saga?.houseRules;

  /**
   * Change the character. Afterwards, what was already bought is kept consistent (an Affinity
   * keeps scores, a smaller budget takes back its excess) and the user is told, with Undo.
   * Returns the notes of those adjustments.
   */
  const change = useCallback(
    (fn: (c: Character) => string | void, message?: string) => {
      if (!charId) return;
      updateCharacter(charId, (x) => {
        const snapshot = structuredClone(x);
        if (!rules) return void fn(x);
        const before = deriveCharacter(snapshot, data, rules);
        const note = fn(x);
        const adjusted = adjustAfterChange(x, before, data, rules);
        const text = [message, note, ...adjusted].filter(Boolean).join(' ');
        if (message || note || adjusted.length) setNotice(text, () => putCharacter(snapshot));
      });
    },
    [charId, updateCharacter, putCharacter, data, rules, setNotice],
  );
  const update = useCallback(
    (fn: (c: Character) => void) =>
      change((x) => {
        fn(x);
      }),
    [change],
  );
  const acknowledge = useCallback((id: string) => update((x) => void x.acknowledgedIssues.push(id)), [update]);

  /** Apply one fix from the rules check. */
  const applyFix = useCallback(
    (fix: Fix, value?: string) => {
      if (fix.kind === 'goto') return;
      change((x) => (fix.kind === 'apply' ? fix.apply(x) : fix.apply(x, value ?? '')), `${fix.label}${value && fix.kind === 'choose' ? `: ${fix.options.find((o) => o.value === value)?.label ?? value}` : ''}.`);
    },
    [change],
  );

  /** Fix every error that has an automatic fix. */
  const resolveAll = useCallback(() => {
    if (!rules) return;
    change((x) => {
      const { applied } = resolveAllIssues(x, data, rules);
      return applied.length ? `Resolved: ${applied.join('; ')}.` : undefined;
    });
  }, [change, data, rules]);

  return { saga, data, c, d, issues, update, change, acknowledge, applyFix, resolveAll, ctx };
}

export type CharEditor = ReturnType<typeof useCharEditor>;
