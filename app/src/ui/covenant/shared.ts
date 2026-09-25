import type { GameData } from '../../data';
import type { DerivedCovenant } from '../../engine/covenant';
import type { Covenant } from '../../engine/types';

export interface CovTabProps {
  cov: Covenant;
  update: (fn: (c: Covenant) => void) => void;
  dc: DerivedCovenant;
  data: GameData;
}
