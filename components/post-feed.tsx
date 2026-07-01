"use client";

import { useEffect, useState } from "react";

import { getPosts, type FeedPost } from "@/lib/api-client";

const SOURCE_STYLES: Record<string, string> = {
  stocktwits: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  reddit: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

const LABEL_STYLES: Record<string, string> = {
  bullish: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  bearish: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

function Chip({ text, cls }: { text: string; cls: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {text}
    </span>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 0)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Recent posts mentioning the selected ticker, newest first, with Claude's
// sentiment verdict on each — the receipts behind the charts.
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
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {symbol} posts
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          Recent posts from the corpus, with per-post sentiment.
        </p>
      </div>

      {error && <div className="px-5 py-3 text-sm text-red-600">{error}</div>}

      {loaded && posts.length === 0 && !error ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No posts collected yet for {symbol}.
        </div>
      ) : (
        <ul className="max-h-96 divide-y divide-black/[.05] overflow-y-auto overscroll-contain dark:divide-white/[.07]">
          {posts.map((post) => (
            <li key={`${post.source}-${post.post_id}`} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                <Chip
                  text={post.source}
                  cls={
                    SOURCE_STYLES[post.source] ??
                    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }
                />
                {post.sentiment && (
                  <Chip
                    text={`${post.sentiment.label} ${post.sentiment.direction >= 0 ? "+" : ""}${post.sentiment.direction.toFixed(2)}`}
                    cls={LABEL_STYLES[post.sentiment.label] ?? LABEL_STYLES.neutral}
                  />
                )}
                <span className="tabular-nums">{timeAgo(post.created_at)}</span>
                {post.author && <span>· {post.author}</span>}
                {post.score != null && (
                  <span className="tabular-nums">· ▲ {post.score}</span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-3 text-sm text-zinc-700 dark:text-zinc-300">
                {post.url ? (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
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
      )}
    </div>
  );
}
