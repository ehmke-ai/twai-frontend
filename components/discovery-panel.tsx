"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  getDiscovery,
  scanDiscovery,
  type MentionTicker,
  type ScanInfo,
} from "@/lib/api-client";

// Rows per page in the trending table.
const PAGE_SIZE = 10;

// Compact page list with ellipses: always shows first/last, the current page,
// and its immediate neighbors (e.g. 1 … 4 5 6 … 10).
function pageItems(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("…");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pageCount - 1) items.push("…");
  items.push(pageCount);
  return items;
}

// Per-source chip colors so the Source column reads at a glance.
const SOURCE_STYLES: Record<string, string> = {
  stocktwits: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  reddit: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

function SourceChip({ source, count }: { source: string; count: number }) {
  const cls =
    SOURCE_STYLES[source] ??
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize tabular-nums ${cls}`}
    >
      {source} {count}
    </span>
  );
}

type Props = {
  selected: string | null;
  onSelect: (symbol: string) => void;
};

function scanSummary(scan: ScanInfo | null): string {
  if (!scan) return "No scan yet";
  const when = new Date(scan.started_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const status = scan.status === "ok" ? "" : ` · ${scan.status.toUpperCase()}`;
  return `Last scan ${when} (${scan.trigger})${status}`;
}

// Trending table: tickers ranked by distinct posts in the trailing window,
// derived from the stored corpus. Scans run automatically in the backend;
// "Scan now" just triggers one early. Click a row to chart that ticker.
export function DiscoveryPanel({ selected, onSelect }: Props) {
  const [tickers, setTickers] = useState<MentionTicker[]>([]);
  const [lastScan, setLastScan] = useState<ScanInfo | null>(null);
  const [windowHours, setWindowHours] = useState<number>(24);
  const [scanning, setScanning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(tickers.length / PAGE_SIZE));
  // Clamp during render so a shrinking ticker count (delete/scan) never leaves
  // us on an out-of-range page — no effect needed.
  const page = Math.min(pageInput, pageCount);

  const pageRows = useMemo(
    () => tickers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [tickers, page],
  );

  // Load the current derived state on mount (no scan — the backend schedules those).
  useEffect(() => {
    let active = true;
    getDiscovery()
      .then((r) => {
        if (!active) return;
        setTickers(r.tickers);
        setLastScan(r.last_scan);
        setWindowHours(r.window_hours);
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

  async function onScan() {
    setScanning(true);
    setError(null);
    try {
      const r = await scanDiscovery();
      setTickers(r.tickers);
      setLastScan(r.last_scan);
      setWindowHours(r.window_hours);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="flex items-start justify-between gap-4 border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <div>
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Trending tickers
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Distinct posts in the last {windowHours}h, from StockTwits + Reddit.
            Click a row to chart it. {loaded && scanSummary(lastScan)}
          </p>
        </div>
        <button
          onClick={onScan}
          disabled={scanning}
          className="shrink-0 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {scanning ? "Scanning…" : "Scan now"}
        </button>
      </div>

      {error && <div className="px-5 py-3 text-sm text-red-600">{error}</div>}

      {loaded && tickers.length === 0 && !error ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No mentions yet. Click <span className="font-medium">Scan now</span> to
          scan social sources for ticker mentions.
        </div>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-black/[.08] text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.145]">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium text-right">Mentions</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => (
                <tr
                  key={t.symbol}
                  onClick={() => onSelect(t.symbol)}
                  className={`cursor-pointer border-b border-black/[.04] last:border-0 dark:border-white/[.06] ${
                    selected === t.symbol
                      ? "bg-black/[.04] dark:bg-white/[.06]"
                      : "hover:bg-black/[.02] dark:hover:bg-white/[.03]"
                  }`}
                >
                  <td className="px-5 py-3 tabular-nums text-zinc-500">
                    {t.rank}
                  </td>
                  <td className="px-4 py-3 font-medium">{t.symbol}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-500">
                    {t.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {t.total}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(t.by_source).map(([source, count]) => (
                        <SourceChip key={source} source={source} count={count} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-black/[.08] px-5 py-3 dark:border-white/[.145]">
            <p className="text-xs text-zinc-400 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, tickers.length)} of {tickers.length}
            </p>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page === 1}
                    onClick={() => page > 1 && setPage(page - 1)}
                  />
                </PaginationItem>
                {pageItems(page, pageCount).map((item, i) =>
                  item === "…" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        isActive={item === page}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page === pageCount}
                    onClick={() => page < pageCount && setPage(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        </>
      )}
    </div>
  );
}
