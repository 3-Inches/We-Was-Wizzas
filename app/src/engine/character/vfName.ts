// The name a Virtue or Flaw shows on the sheet, with what it was taken for: Puissant Craft: Runes, Affinity with Creo.

import type { GameData, VirtueFlawDef } from '../../data';
import type { CharVirtue } from '../types';
import { paramValues } from './derive';

export function vfDisplayName(def: VirtueFlawDef | undefined, cv: CharVirtue, data?: GameData): string {
  const base = def?.name ?? cv.defId;
  if (!cv.param) return base;
  const one = (p: string) => {
    if (def?.param?.kind === 'ability' && data) {
      // an Ability of a kind, named with it: Craft: Runes (ParamInput)
      const [id, ...kind] = p.split(':');
      const name = data.abilityById.get(id)?.name;
      return name && kind.length ? `${name.replace(/ \(Type\)$/, '')}: ${kind.join(':')}` : name ?? p;
    }
    if (def?.param?.kind === 'art' || def?.param?.kind === 'technique' || def?.param?.kind === 'form') {
      return ({ Cr: 'Creo', In: 'Intellego', Mu: 'Muto', Pe: 'Perdo', Re: 'Rego', An: 'Animal', Aq: 'Aquam', Au: 'Auram', Co: 'Corpus', He: 'Herbam', Ig: 'Ignem', Im: 'Imaginem', Me: 'Mentem', Te: 'Terram', Vi: 'Vim' } as Record<string, string>)[p] ?? p;
    }
    return p;
  };
  const label = def?.param?.multiple ? paramValues(cv.param).map(one).join(', ') : one(cv.param);
  if (/\(.*\)/.test(base)) return base.replace(/\(([^)]*)\)/, `(${label})`);
  if (/ Ability$/.test(base)) return base.replace(/Ability$/, label);
  if (/ Art$/.test(base)) return base.replace(/Art$/, label);
  if (/Technique$|Form$/.test(base)) return base.replace(/(Technique|Form)$/, label);
  return `${base} (${label})`;
}
