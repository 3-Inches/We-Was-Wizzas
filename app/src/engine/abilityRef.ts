// The Ability a Virtue names: an Ability (`brawl`), or one Ability of a kind (`craft-type:Runes`), as
// ParamInput writes it. Each Craft is its own Ability: "skill in one Craft does not imply skill in any
// others" (DE line 7474). One reading for every rule that asks which Ability a Virtue helps.

import type { GameData } from '../data';

/** The Ability and the kind a Virtue's Ability names: `craft-type:Runes` is Craft, of the kind Runes. */
export function splitAbilityRef(ref: string): { abilityId: string; kind?: string } {
  const at = ref.indexOf(':');
  if (at < 0) return { abilityId: ref.trim() };
  const kind = ref.slice(at + 1).trim();
  return { abilityId: ref.slice(0, at).trim(), kind: kind || undefined };
}

/** The same kind, as a player may type it: case and spaces apart do not count. */
const sameKind = (a: string, b: string) => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Whether a Virtue's Ability (`ref`) is this one (`abilityId`, of the kind `param`). A Virtue named on
 * the Ability alone helps it whatever its kind; one named on a kind helps that kind only.
 */
export function namesAbility(ref: string | undefined, abilityId: string, param?: string): boolean {
  if (!ref) return false;
  const r = splitAbilityRef(ref);
  if (r.abilityId !== abilityId) return false;
  if (!r.kind) return true;
  return !!param && sameKind(r.kind, param);
}

/** The name a Virtue's Ability shows: Craft: Runes. */
export function abilityRefName(ref: string, data: GameData): string {
  const { abilityId, kind } = splitAbilityRef(ref);
  const name = data.abilityById.get(abilityId)?.name;
  if (!name) return ref;
  return kind ? `${name.replace(/ \(Type\)$/, '')}: ${kind}` : name;
}
