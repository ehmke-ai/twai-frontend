"use client";

import { useEffect, useState } from "react";

// Shared poll-on-interval hook. Replaces the per-component effect boilerplate
// (active-flag guard, initial load, setInterval, cleanup) used across the
// dashboard panels. `data` is null until the first successful load; `error`
// holds the last failure message. The fetcher is re-run every `ms`.
export function usePolling<T>(fetcher: () => Promise<T>, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetcher().then(
        (d) => {
          if (active) {
            setData(d);
            setError(null);
          }
        },
        (e) => {
          if (active) setError(e instanceof Error ? e.message : String(e));
        },
      ).finally(() => {
        if (active) setLoaded(true);
      });
    load();
    const id = setInterval(load, ms);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);

  return { data, error, loaded };
}
