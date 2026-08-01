# SWORD

**SWORD** is a mobile-first, offline-capable Bible study PWA for Realign Ministries. Readers can study Scripture, write reflections, mark passages, and join Pre-Read community studies — with content managed through an admin CMS.

Built as a Next.js monolith (UI + BFF API) on Supabase, deployable as an installable Progressive Web App.

## Features

- **Scripture** — Bible reading by book/chapter with resume and translation switching
- **Reflections & Marked** — personal notes and marked passages, synced when online
- **Today** — home dashboard for continue reading and recent activity
- **Pre-Read** — scheduled community studies with materials, comments, and stream hosts
- **Events** — church event listings and detail pages
- **Admin** — CMS for Pre-Read content, hosts, events, quizzes, and users
- **Offline** — IndexedDB caching and mutation sync queue (see [README_OFFLINE.md](./README_OFFLINE.md))

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 |
| Backend | Supabase (Auth, Postgres, Storage, RLS) |
| UI | Tailwind CSS 4, Radix UI, Motion |
| Offline / PWA | localForage, next-pwa |
| Hosting | Vercel |

For architecture detail, see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).

## Getting started

**Requirements:** Node.js 20+, npm

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/dashboard` when signed in, otherwise `/login`.

### Environment

Add a `.env.local` with at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Commonly used optional vars:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations |
| `NEXT_PUBLIC_SITE_URL` | App origin (OAuth / SSR callbacks) |
| `NEXT_PUBLIC_PROD_URL` | Production URL (e.g. QR login) |
| `OPENAI_API_KEY` | Quiz generation and related AI helpers |

Auth uses Supabase (email/password and Google OAuth). Configure redirect URLs in the Supabase dashboard to match your local and production origins.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm test` | Node test runner (`tests/*.test.mjs`) |

## Project layout

```
app/           # App Router pages + API routes
components/    # UI screens and shared components
lib/           # Supabase clients, offline, domain helpers
supabase/      # Migrations / Supabase config
scripts/       # Seed and maintenance scripts
tests/         # Unit tests
```

## Docs

- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) — architecture, data model, API surface
- [README_OFFLINE.md](./README_OFFLINE.md) — offline packs, sync queue, cache versioning
