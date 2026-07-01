"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPosts, type FeedPost } from "@/lib/api-client";

const LABEL_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
  bullish: "default",
  bearish: "destructive",
  neutral: "secondary",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 0)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function PostFeed({ symbol }: { symbol: string | null }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    setLoaded(false);
    getPosts(symbol)
      .then((r) => {
        if (!active) return;
        setPosts(r.posts);
        setError(null);
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
  }, [symbol]);

  if (!symbol) return null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <span className="mr-2 font-mono">{symbol}</span>
          posts
        </CardTitle>
        <CardDescription>
          Recent corpus entries with per-post sentiment labels.
        </CardDescription>
      </CardHeader>

      {error && (
        <CardContent className="pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}

      {loaded && posts.length === 0 && !error ? (
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No posts collected yet for {symbol}.
        </CardContent>
      ) : (
        <CardContent className="max-h-96 overflow-y-auto overscroll-contain px-0 pt-0">
          <ul className="divide-y">
            {posts.map((post) => (
              <li key={`${post.source}-${post.post_id}`} className="px-6 py-3.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">{post.source}</Badge>
                  {post.sentiment && (
                    <Badge variant={LABEL_VARIANT[post.sentiment.label] ?? "secondary"}>
                      {post.sentiment.label}{" "}
                      {post.sentiment.direction >= 0 ? "+" : ""}
                      {post.sentiment.direction.toFixed(2)}
                    </Badge>
                  )}
                  <span className="tabular-nums">{timeAgo(post.created_at)}</span>
                  {post.author && <span>· {post.author}</span>}
                  {post.score != null && (
                    <span className="tabular-nums">· ▲ {post.score}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {post.url ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-foreground"
                    >
                      {post.text}
                    </a>
                  ) : (
                    post.text
                  )}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
