// "Build the whole character for me": a complete draft that passes the rules check, from the character's
// concept themes and any guided-build answers, every choice with its reason. It replaces the choices
// made so far, goes through the store (so Undo takes it back) and leaves the wizard on its Review step.
import { autoBuild, resetChoices } from '../../engine/guided/autobuild';
import { takeImmunityFlaw } from '../../engine/covenantBoons';
import { seeded } from '../../engine/generate/random';
import { gameDataFor } from '../../store/hooks';
import { useStore } from '../../store/store';
import { visibleSteps } from './wizardSteps';

export function buildWholeCharacter(charId: string): { notice: string } | undefined {
  const st = useStore.getState();
  const ch = st.characters[charId];
  const saga = ch ? st.sagas[ch.sagaId] : undefined;
  if (!ch || !saga) return undefined;
  const x = structuredClone(ch);
  resetChoices(x);
  const covenant = x.covenantId ? st.covenants[x.covenantId] : undefined;
  const data = gameDataFor(saga);
  // the Flaw the covenant's Immunity holds off, as for anyone the toolkit makes for it (at its share), before the build spends its points
  const held = takeImmunityFlaw(x, covenant, data, seeded([...x.id].reduce((t, ch) => (t * 31 + ch.charCodeAt(0)) >>> 0, 7)));
  const res = autoBuild(x, x.guided ?? { answers: {}, declined: [] }, { data, rules: saga.houseRules, saga, covenant, archetypes: x.creation.archetypes ?? [] });
  if (held) res.log.unshift(`Flaw: ${held}.`);
  x.creation.step = visibleSteps(x.type).findIndex((s) => s.id === 'review');
  x.updatedAt = new Date().toISOString();
  st.putCharacter(x);
  const left = res.remaining.length ? ` ${res.remaining.length} issue${res.remaining.length > 1 ? 's' : ''} left for you to settle.` : '';
  return { notice: `Built a whole draft: ${res.log.length} choices, each with its reason.${left} Undo puts the character back as it was.` };
}
