"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  type WatchlistEntry,
} from "@/lib/api-client";

type Props = {
  // Called after the watchlist changes (add/delete) so the dashboard can react,
  // e.g. re-run discovery. Optional.
  onChange?: (symbols: string[]) => void;
  // When true, the header title toggles the table body open/closed. Lets the
  // dashboard tuck the (long) watchlist away below the primary content.
  collapsible?: boolean;
  // Initial open state when collapsible. Ignored otherwise.
  defaultOpen?: boolean;
};

function NameCell({ name }: { name: string }) {
  return (
    <span className="truncate text-zinc-500">{name || "—"}</span>
  );
}

// The discovery universe: tickers the scan counts mentions for. Seeded with the
// top 100 by market cap; add/delete to curate. Deleting a ticker also purges its
// mention history on the backend.
export function WatchlistPanel({
  onChange,
  collapsible = false,
  defaultOpen = true,
}: Props) {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);

  useEffect(() => {
    let active = true;
    getWatchlist()
      .then((r) => {
        if (active) setEntries(r.entries);
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

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.symbol.includes(q) ||
        e.name.toUpperCase().includes(q),
    );
  }, [entries, filter]);

  function commit(next: WatchlistEntry[]) {
    setEntries(next);
    onChange?.(next.map((e) => e.symbol));
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const symbol = input.trim().toUpperCase();
    if (!symbol || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await addToWatchlist(symbol);
      commit(r.entries);
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
      commit(r.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div
        className={`px-5 py-3 ${open ? "border-b border-black/[.08] dark:border-white/[.145]" : ""}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {(() => {
              const heading = (
                <>
                  {collapsible && (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
                      aria-hidden
                    >
                      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    Watchlist
                  </h2>
                  {loaded && entries.length > 0 && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {entries.length}
                    </span>
                  )}
                </>
              );
              return collapsible ? (
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  className="flex items-center gap-2 -ml-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                >
                  {heading}
                </button>
              ) : (
                <div className="flex items-center gap-2">{heading}</div>
              );
            })()}
            {open && (
              <p className="mt-0.5 text-xs text-zinc-400">
                Discovery only scans these tickers. Removing one deletes its mention
                history.
              </p>
            )}
          </div>
          {open && (
          <form onSubmit={onAdd} className="flex shrink-0 items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Symbol"
              aria-label="Add ticker"
              maxLength={8}
              className="w-24 rounded-md border border-black/[.1] bg-transparent px-3 py-1.5 text-sm uppercase tabular-nums outline-none placeholder:normal-case placeholder:text-zinc-400 focus:border-black/[.25] dark:border-white/[.145] dark:focus:border-white/[.35]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Add
            </button>
          </form>
          )}
        </div>

        {open && entries.length > 8 && (
          <div className="relative mt-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search symbols or names…"
              aria-label="Filter watchlist"
              className="w-full rounded-md border border-black/[.08] bg-black/[.02] py-2 pl-3 pr-3 text-sm outline-none placeholder:text-zinc-400 focus:border-black/[.2] dark:border-white/[.12] dark:bg-white/[.03] dark:focus:border-white/[.25]"
            />
          </div>
        )}
      </div>

      {open && error && (
        <div className="px-5 py-3 text-sm text-red-600">{error}</div>
      )}

      {open &&
        (loaded && entries.length === 0 && !error ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          Your watchlist is empty. Add a ticker above to include it in discovery
          scans.
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No symbols match &ldquo;{filter.trim()}&rdquo;.
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto overscroll-contain">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-black/[.08] bg-white text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.145] dark:bg-zinc-950">
              <tr>
                <th className="w-20 px-5 py-2 font-medium">Ticker</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="w-10 px-4 py-2" aria-hidden />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
              {filtered.map((entry) => (
                <tr
                  key={entry.symbol}
                  className="group transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.03]"
                >
                  <td className="px-5 py-2.5 font-medium tabular-nums">
                    {entry.symbol}
                  </td>
                  <td className="max-w-0 px-4 py-2.5">
                    <NameCell name={entry.name} />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onRemove(entry.symbol)}
                      disabled={busy}
                      aria-label={`Remove ${entry.symbol}`}
                      title={`Remove ${entry.symbol} (deletes its mention history)`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 opacity-40 transition-all hover:bg-red-50 hover:text-red-600 hover:opacity-100 group-hover:opacity-100 disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-3.5 w-3.5"
                        aria-hidden
                      >
                        <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ))}

      {open && filter && filtered.length > 0 && filtered.length < entries.length && (
        <div className="border-t border-black/[.06] px-5 py-2 text-xs text-zinc-400 dark:border-white/[.08]">
          Showing {filtered.length} of {entries.length}
        </div>
      )}
    </div>
  );
}
