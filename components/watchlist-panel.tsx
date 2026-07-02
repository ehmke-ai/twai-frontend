"use client";

import { ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  type WatchlistEntry,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Props = {
  onChange?: (symbols: string[]) => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

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
      (e) => e.symbol.includes(q) || e.name.toUpperCase().includes(q),
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

  const heading = (
    <>
      {collapsible && (
        <ChevronRight
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
          aria-hidden
        />
      )}
      <CardTitle>Watchlist</CardTitle>
      {loaded && entries.length > 0 && (
        <Badge variant="secondary">{entries.length}</Badge>
      )}
    </>
  );

  const headerContent = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {collapsible ? (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted"
            >
              {heading}
            </button>
          </CollapsibleTrigger>
        ) : (
          <div className="flex items-center gap-2">{heading}</div>
        )}
        {open && (
          <CardDescription className="mt-1">
            Scans only cover these tickers. Removing one stops scanning — history is
            kept.
          </CardDescription>
        )}
      </div>
      {open && (
        <form onSubmit={onAdd} className="flex shrink-0 items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Symbol"
            aria-label="Add ticker"
            maxLength={8}
            className="w-24 font-mono uppercase"
          />
          <Button type="submit" variant="ghost" disabled={busy || !input.trim()}>
            Add
          </Button>
        </form>
      )}
    </div>
  );

  const body = (
    <>
      {open && entries.length > 8 && (
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search symbols or names…"
          aria-label="Filter watchlist"
          className="mt-3"
        />
      )}

      {open && error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {open &&
        (loaded && entries.length === 0 && !error ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your watchlist is empty. Add a ticker above to include it in scans.
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No symbols match &ldquo;{filter.trim()}&rdquo;.
          </CardContent>
        ) : (
          <CardContent className="max-h-72 overflow-y-auto overscroll-contain px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 pl-6">Ticker</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-10 pr-6" aria-hidden />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.symbol} className="group">
                    <TableCell className="pl-6">
                      <span className="font-mono text-sm font-semibold">
                        {entry.symbol}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-0 truncate text-muted-foreground">
                      {entry.name || "—"}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemove(entry.symbol)}
                        disabled={busy}
                        aria-label={`Remove ${entry.symbol}`}
                        title={`Remove ${entry.symbol} (stops scanning; history is kept)`}
                        className="opacity-50 group-hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ))}

      {open && filter && filtered.length > 0 && filtered.length < entries.length && (
        <CardContent className="border-t py-2 text-xs text-muted-foreground">
          Showing {filtered.length} of {entries.length}
        </CardContent>
      )}
    </>
  );

  if (collapsible) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          <CardHeader className={open ? "border-b" : undefined}>{headerContent}</CardHeader>
          <CollapsibleContent>{body}</CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">{headerContent}</CardHeader>
      {body}
    </Card>
  );
}
