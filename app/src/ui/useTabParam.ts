import { useSearchParams } from 'react-router-dom';

/** A page's open tab, kept in the address (?tab=) so links, the back button and tutorials can open it. */
export function useTabParam<T extends string>(fallback: T): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as T) || fallback;
  return [tab, (t: T) => setParams({ tab: t }, { replace: true })];
}
