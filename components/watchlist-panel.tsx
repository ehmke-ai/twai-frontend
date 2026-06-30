"use client";

import { useEffect, useState } from "react";

import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/lib/api-client";

type Props = {
  // Called after the watchlist changes (add/delete) so the dashboard can react,
  // e.g. re-run discovery. Optional.
  onChange?: (symbols: string[]) => void;
};

// The discovery universe: tickers the scan counts mentions for. Seeded with the
// top 100 by market cap; add/delete to curate. Deleting a ticker also purges its
// mention history on the backend.
export function WatchlistPanel({ onChange }: Props) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getWatchlist()
      .then((r) => {
        if (active) setSymbols(r.symbols);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function commit(symbols: string[]) {
    setSymbols(symbols);
    onChange?.(symbols);
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const symbol = input.trim().toUpperCase();
    if (!symbol || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await addToWatchlist(symbol);
      commit(r.symbols);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(symbol: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await removeFromWatchlist(symbol);
      commit(r.symbols);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="flex items-start justify-between gap-4 border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <div>
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Watchlist
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Discovery only scans these tickers. Seeded with the top 100 by market
            cap. Removing a ticker also deletes its mention history.
          </p>
        </div>
        <form onSubmit={onAdd} className="flex shrink-0 items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add ticker"
            aria-label="Add ticker"
            maxLength={8}
            className="w-28 rounded-md border border-black/[.1] bg-transparent px-3 py-2 text-sm uppercase tabular-nums outline-none placeholder:normal-case placeholder:text-zinc-400 focus:border-black/[.25] dark:border-white/[.145] dark:focus:border-white/[.35]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Add
          </button>
        </form>
      </div>

      {error && <div className="px-5 py-3 text-sm text-red-600">{error}</div>}

      {loaded && symbols.length === 0 && !error ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          Your watchlist is empty. Add a ticker above to include it in discovery
          scans.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {symbols.map((symbol) => (
            <span
              key={symbol}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/[.08] bg-black/[.03] py-1 pl-3 pr-1.5 text-sm font-medium tabular-nums dark:border-white/[.12] dark:bg-white/[.04]"
            >
              {symbol}
              <button
                onClick={() => onRemove(symbol)}
                disabled={busy}
                aria-label={`Remove ${symbol}`}
                title={`Remove ${symbol} (deletes its mention history)`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/[.08] hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-white/[.12] dark:hover:text-zinc-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
