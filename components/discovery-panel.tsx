"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDiscovery,
  scanDiscovery,
  type MentionTicker,
  type ScanInfo,
} from "@/lib/api-client";

const PAGE_SIZE = 10;

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

export function DiscoveryPanel({ selected, onSelect }: Props) {
  const [tickers, setTickers] = useState<MentionTicker[]>([]);
  const [lastScan, setLastScan] = useState<ScanInfo | null>(null);
  const [windowHours, setWindowHours] = useState<number>(24);
  const [scanning, setScanning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(tickers.length / PAGE_SIZE));
  const page = Math.min(pageInput, pageCount);

  const pageRows = useMemo(
    () => tickers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [tickers, page],
  );

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
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Trending tickers</CardTitle>
        <CardDescription>
          Distinct posts in the last {windowHours}h from X. Click a row
          to chart it. {loaded && scanSummary(lastScan)}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" onClick={onScan} disabled={scanning}>
            {scanning ? "Scanning…" : "Scan now"}
          </Button>
        </CardAction>
      </CardHeader>

      {error && (
        <CardContent className="pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}

      {loaded && tickers.length === 0 && !error ? (
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No mentions yet. Click <span className="font-medium text-foreground">Scan now</span>{" "}
          to scan social sources for ticker mentions.
        </CardContent>
      ) : (
        <>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-6">#</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Mentions</TableHead>
                  <TableHead className="pr-6">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((t) => (
                  <TableRow
                    key={t.symbol}
                    onClick={() => onSelect(t.symbol)}
                    data-state={selected === t.symbol ? "selected" : undefined}
                    className="cursor-pointer"
                  >
                    <TableCell className="pl-6 tabular-nums text-muted-foreground">
                      {t.rank}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold">{t.symbol}</span>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                      {t.name || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {t.total}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(t.by_source).map(([source, count]) => (
                          <Badge key={source} variant="outline">
                            {source} {count}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          {pageCount > 1 && (
            <CardFooter className="justify-between">
              <p className="text-xs tabular-nums text-muted-foreground">
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
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}
