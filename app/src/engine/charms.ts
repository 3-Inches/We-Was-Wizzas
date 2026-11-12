// Greater Charm (Realms of Power: Faerie, Major Story Flaw): one of the character's Virtues is ruled
// by a charm, an object or a performance, and only one copy of it exists. Whoever steals it (takes
// the object, or overhears the charm-poem or ritual) has the charmed Virtue, and the owner has it no
// longer until the charm is retrieved or destroyed. The charm may pass from hand to hand many times.

import { vfDisplayName } from './character/derive';
import type { GameData } from '../data';
import type { CharVirtue, Character } from './types';
import { uid } from '../util/id';

export const GREATER_CHARM = 'greater-charm-flaw';

/** The owner's Virtue the charm rules: the one named on the Flaw (its choice). */
export function charmedVirtue(owner: Character, flaw: CharVirtue, data: GameData): CharVirtue | undefined {
  if (flaw.charm) return flaw.charm.virtue;
  const want = (flaw.param ?? '').trim().toLowerCase();
  if (!want) return undefined;
  return owner.virtues.find((v) => {
    if (v.uid === flaw.uid) return false;
    const def = data.vfById.get(v.defId);
    if (def?.kind !== 'virtue') return false;
    const names = [def.name, vfDisplayName(def, v, data)].map((n) => n.toLowerCase());
    return names.some((n) => n === want || n.startsWith(want));
  });
}

/** Who holds each Greater Charm in the saga: the owner, unless it was taken. */
export function charmsOf(chars: Character[], data: GameData): { owner: Character; flaw: CharVirtue; virtue?: CharVirtue; holder: Character | undefined }[] {
  return chars.flatMap((owner) =>
    owner.virtues
      .filter((v) => v.defId === GREATER_CHARM)
      .map((flaw) => ({ owner, flaw, virtue: charmedVirtue(owner, flaw, data), holder: flaw.charm ? chars.find((c) => c.id === flaw.charm!.holderId) : owner })),
  );
}

/**
 * The charm passes to another (stolen, given, overheard), or back to its owner (retrieved or
 * destroyed): the charmed Virtue goes with it. Changes the characters given; returns what happened.
 */
export function passCharm(chars: Character[], ownerId: string, flawUid: string, toId: string, data: GameData): string[] {
  const owner = chars.find((c) => c.id === ownerId);
  const flaw = owner?.virtues.find((v) => v.uid === flawUid && v.defId === GREATER_CHARM);
  if (!owner || !flaw) return [];
  const virtue = charmedVirtue(owner, flaw, data);
  if (!virtue) return [`${owner.name || 'The owner'}'s Greater Charm names no Virtue they have: choose it on the Flaw first.`];
  const vname = vfDisplayName(data.vfById.get(virtue.defId), virtue, data);
  const lines: string[] = [];
  // from whoever has it now
  if (flaw.charm) {
    const was = chars.find((c) => c.id === flaw.charm!.holderId);
    if (was) {
      was.virtues = was.virtues.filter((v) => !(v.fromCharm?.ownerId === owner.id && v.fromCharm.flawUid === flaw.uid));
      if (toId !== was.id) lines.push(`${was.name || 'The holder'} no longer has the charm, nor ${vname}.`);
    }
  } else if (toId !== owner.id) {
    owner.virtues = owner.virtues.filter((v) => v.uid !== virtue.uid);
    lines.push(`${owner.name || 'The owner'} loses ${vname} with the charm.`);
  }
  if (toId === owner.id) {
    if (flaw.charm) {
      owner.virtues.push({ ...flaw.charm.virtue });
      lines.push(`${owner.name || 'The owner'} has the charm back, and ${vname} with it.`);
    }
    delete flaw.charm;
    return lines;
  }
  const to = chars.find((c) => c.id === toId);
  if (!to) return lines;
  flaw.charm = { holderId: to.id, virtue: flaw.charm?.virtue ?? { ...virtue } };
  to.virtues.push({ ...virtue, uid: uid(), free: true, noPoints: true, freeReason: `holding ${owner.name || 'another'}'s Greater Charm`, fromCharm: { ownerId: owner.id, flawUid: flaw.uid }, requiredBy: undefined, grantedBy: undefined });
  lines.push(`${to.name || 'The thief'} has the charm, and ${vname} while it is theirs.`);
  return lines;
}
