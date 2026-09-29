import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCurrentMonthValue,
  shiftMonthValue,
} from "../utils/month";

/**
 * Shared DTR month navigation + loading state.
 * `fetchDTR(month)` should return the DTR payload for that month.
 * Guards against out-of-order responses when the user flips months fast.
 */
export function useDTR(fetchDTR, initialMonth) {
  const [month, setMonth] = useState(
    initialMonth || getCurrentMonthValue(),
  );
  const [dtr, setDtr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (m) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDTR(m);
        if (requestIdRef.current !== requestId) return;
        setDtr(data);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err.message);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [fetchDTR],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetch hook: syncs month param to fetched DTR, same pattern as pages
    load(month);
  }, [month, load]);

  const shiftMonth = useCallback(
    (delta) => {
      setMonth((prev) => shiftMonthValue(prev, delta));
    },
    [],
  );

  return { month, setMonth, shiftMonth, dtr, loading, error, reload: () => load(month) };
}
