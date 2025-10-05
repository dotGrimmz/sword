# 🗡️ Copilot Instructions for the `sword` Repo

These instructions help an AI coding assistant (like GitHub Copilot or ChatGPT) understand this repository’s structure, technologies, and working patterns.  
They reflect the _SWORD MVP architecture_ — a Next.js offline-first PWA powered by Supabase.

---

## 1 Big Picture

- **Purpose:**  
  SWORD is a mobile-first **Bible and Apologetics study app** built with Next.js (App Router), designed for offline-first use.  
  Users can read Bible text, study curated apologetic lessons, write notes, and sync later when online.

- **Tech Stack Overview:**

  - **Next.js (App Router, TypeScript)** — main framework.
  - **Supabase** — Auth, Postgres (for Bible + user data), and storage.
  - **localForage (IndexedDB)** — browser-side offline cache.
  - **React Query + Zustand** — state management and caching.
  - **Tailwind CSS + Shadcn UI** — styling and components.
  - **Zod** — schema validation for data integrity.

- **Runtime:**  
  Client-heavy PWA with server-side API routes for authenticated Supabase calls.

---

## 2 Developer Workflows & Commands

| Task                    | Command                               |
| ----------------------- | ------------------------------------- |
| Start dev server        | `npm run dev` _(Next.js + Turbopack)_ |
| Build production        | `npm run build`                       |
| Start production server | `npm run start`                       |
| Lint project            | `npm run lint`                        |
| Type check              | `tsc --noEmit`                        |

> **Local environment:**  
> Required `.env.local` vars:
>
> ```
> NEXT_PUBLIC_SUPABASE_URL=
> NEXT_PUBLIC_SUPABASE_ANON_KEY=
> ```

---

## 3 Project Patterns & Conventions

- **App Router** under `/src/app` — server and client components follow Next.js conventions.
- **Supabase client** lives in `/src/lib/supabaseClient.ts`.
- **Offline caching** logic lives in `/src/lib/localCache.ts` (localForage instance).
- **React Query + Zustand** wrap pages for data hydration and global state.
- **Bible and Apologetics hooks** (`useBibleChunk`, `useLesson`, etc.) are under `/src/hooks/`.
- **Components** follow folders: `/components/ui`, `/components/bible`, `/components/lessons`, `/components/notes`.

---

## 4 Files & Folders to Edit

| Area             | File(s)                      | Notes                               |
| ---------------- | ---------------------------- | ----------------------------------- |
| Supabase setup   | `src/lib/supabaseClient.ts`  | Initialize client w/ env vars       |
| Local cache      | `src/lib/localCache.ts`      | Handles IndexedDB via localForage   |
| Bible fetching   | `src/hooks/useBibleChunk.ts` | Pulls from Supabase, caches offline |
| Lessons fetching | `src/hooks/useLesson.ts`     | Caches Apologetics lessons          |
| UI entry         | `src/app/page.tsx`           | Dashboard or Home screen            |
| Global styles    | `src/app/globals.css`        | Tailwind + theme variables          |
| Layout           | `src/app/layout.tsx`         | Font setup, global providers        |
| API routes       | `src/app/api/*`              | Server handlers for Supabase calls  |

---

## 5 Integration Points & Dependencies

- **Next.js (15+)** — App Router, React Server Components, edge-ready.
- **Supabase JS SDK** — all queries/mutations use client or server helpers.
- **localForage** — offline-first storage using IndexedDB.
- **React Query** — network + cache layer for Supabase calls.
- **Zustand** — lightweight UI/global state.
- **Zod** — validation schemas for Supabase data.
- **TailwindCSS + Shadcn UI + Lucide React** — styling + icons.
- **Workbox (optional)** — for Service Worker PWA caching.

---

## 6 What NOT to Change Lightly

- The `supabaseClient.ts` initialization — must always reference `NEXT_PUBLIC_SUPABASE_*` vars.
- The `localCache.ts` instance — ensures shared IndexedDB usage across modules.
- Database JSON schema for `apologetic_lessons.content` — expected to remain flexible JSON, not relational.
- Next.js `tsconfig.json` → uses `"moduleResolution": "bundler"`, matching App Router conventions.

---

## 7 Typical Development Tasks

| Task                 | How                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------ |
| Add new lesson page  | Create `src/app/lessons/[id]/page.tsx` and import `getLesson()` from `useLesson.ts`. |
| Add new component    | Place in `/components/ui` and export default functional component.                   |
| Create API endpoint  | Add file under `/src/app/api/.../route.ts` using Supabase server client.             |
| Store lesson offline | Call `await cache.setItem('lesson:<id>', data)` in your data hooks.                  |
| Sync queued notes    | Use React Query background sync (check `navigator.onLine`).                          |

---

## 8 Debugging Hints

- If lessons fail to load:  
  → check browser DevTools → Application → IndexedDB (`sword_db`) for cached data.
- If Supabase auth fails:  
  → confirm correct URL + anon key in `.env.local`.
- If Tailwind classes don’t apply:  
  → ensure `content` paths in `tailwind.config.ts` include `"./src/**/*.{ts,tsx}"`.
- Offline test:  
  → open DevTools → Network tab → “Offline” → reload → app should still load cached Bible/lesson data.

---

## 9 Where to Look for Context

- `README.md` — local dev + deploy instructions.
- `supabase/schema.sql` — (optional) DB schema reference.
- `src/hooks/*` — canonical examples of Supabase + localForage hybrid fetching.
- `src/lib/*` — Supabase client, offline cache, validation utils.

---

## 10 Future Extensions (Phase 2+)

- Add PWA Service Worker via Workbox.
- Add user reflection syncing (`user_lesson_notes`).
- Integrate Bible search and memory verses module.
- Deploy to Vercel with Supabase + Edge caching.

---

### 🧭 Summary

**SWORD** is a Next.js + Supabase PWA with offline IndexedDB caching.  
Copilot should assume all data is fetched from Supabase, cached locally, and synced back when online.  
Focus on clean hooks, async fetch patterns, and progressive enhancement — not static content.
