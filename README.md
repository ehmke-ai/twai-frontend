# twai-frontend

Next.js dashboard for the **TWAI researcher** — social mentions + Claude
sentiment per ticker. Thin client: it talks only to the twai-backend API
(`lib/api-client.ts`); no broker or AI secrets ever live here.

## Pages / panels (single research view)

- **Symbol panel** — hero chart for the selected ticker with two tabs:
  - *Mentions*: post volume over time (hour/day buckets)
  - *Sentiment*: one dot per labeled post — x = bearish↔bullish direction,
    y = severity — with post snippet on hover
- **Post feed** — recent posts for the ticker with per-post sentiment chips
- **Trending** — tickers ranked by distinct posts in the trailing window,
  with last-scan status (scans run automatically in the backend)
- **Watchlist** — the scan universe; removal is a soft delete (history kept)

Auth is Neon Auth (Google sign-in) with a server-side email allowlist; the
bearer token is bridged into `api-client` by `components/auth-token-bridge.tsx`.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
```

`.env.local` needs `NEXT_PUBLIC_API_BASE_URL` (backend URL) plus the Neon Auth
variables — see `.env.local.example`.

This project uses **npm** (`package-lock.json`). Install new dependencies with
`npm install <pkg>` so the lockfile Vercel deploys with stays in sync.

## Deploy

Vercel. The backend (FastAPI + scan loop) deploys separately on Railway.
