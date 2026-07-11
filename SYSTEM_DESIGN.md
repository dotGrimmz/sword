# SWORD — System Design

> **SWORD Bible Study** is a mobile-first, offline-capable Progressive Web App (PWA) built for **Realign Ministries**. It delivers Scripture reading, personal reflections, marked passages, daily Pre-Read studies, and apologetics content — backed by Supabase and deployed on Vercel.

---

## Table of Contents

1. [System Context](#1-system-context)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Component Architecture](#3-component-architecture)
4. [Feature Modules](#4-feature-modules)
5. [Request & Data Flows](#5-request--data-flows)
6. [Data Model](#6-data-model)
7. [API Surface](#7-api-surface)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Offline & PWA Architecture](#9-offline--pwa-architecture)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Tech Stack](#11-tech-stack)
12. [Design Decisions & Tradeoffs](#12-design-decisions--tradeoffs)

---

## 1. System Context

SWORD sits between ministry users (readers, hosts, admins) and managed backend services. The app is a single Next.js monolith that acts as both the UI and a Backend-for-Frontend (BFF) layer.

```mermaid
C4Context
    title System Context — SWORD Bible Study

    Person(user, "Reader", "Reads Scripture, writes reflections, participates in Pre-Read")
    Person(host, "Stream Host", "Hosts livestream sessions linked to Pre-Read studies")
    Person(admin, "Admin", "Manages Pre-Read content, hosts, and apologetics CMS")

    System(sword, "SWORD PWA", "Next.js monolith — UI + BFF API routes")

    System_Ext(supabase, "Supabase", "Auth, Postgres, Row-Level Security, Storage")
    System_Ext(google, "Google OAuth", "Social sign-in provider")
    System_Ext(vercel, "Vercel", "Hosting, CDN, preview deployments")
    System_Ext(bibleApis, "Bible APIs", "bible-api.com, API.Bible, NIV JSON — seeding only")

    Rel(user, sword, "Uses", "HTTPS")
    Rel(host, sword, "Uses", "HTTPS")
    Rel(admin, sword, "Manages content", "HTTPS")
    Rel(sword, supabase, "Reads/writes data", "HTTPS + JWT")
    Rel(sword, google, "OAuth redirect", "HTTPS")
    Rel(sword, vercel, "Deployed on")
    Rel(admin, bibleApis, "Seeds Bible data", "CLI scripts")
```

---

## 2. High-Level Architecture

The system follows a **monolithic BFF pattern**: one Next.js application serves React pages and REST API route handlers. Supabase is the managed backend (database, auth, storage). The client adds an offline layer via IndexedDB and a service worker.

```mermaid
flowchart TB
    subgraph Client["Client (Browser PWA)"]
        UI["React 19 UI<br/>Screens + Components"]
        Providers["Providers<br/>OfflineProvider · DataCacheProvider"]
        IDB["IndexedDB<br/>(localForage · sword_offline)"]
        SW["Service Worker<br/>(next-pwa / Workbox)"]
        UI --> Providers
        Providers --> IDB
        SW -.->|caches assets| UI
    end

    subgraph NextJS["Next.js 15 Monolith (Vercel)"]
        MW["middleware.ts<br/>Session refresh"]
        Pages["App Router Pages<br/>dashboard · pre-read · admin · apologetics"]
        API["API Route Handlers<br/>/app/api/* (BFF)"]
        MW --> Pages
        MW --> API
    end

    subgraph Supabase["Supabase (BaaS)"]
        Auth["Auth<br/>Email/Password · Google OAuth"]
        PG["PostgreSQL<br/>RLS policies"]
        Storage["Storage<br/>Profile avatars"]
    end

    Client -->|HTTPS fetch / apiFetch| NextJS
    API -->|Supabase JS SDK| Supabase
    Pages -->|Server Components / SSR| Supabase
    Providers -->|Sync queue replay| Auth
    Providers -->|Sync queue replay| PG
```

### Architectural Style

| Aspect | Choice |
|---|---|
| **Pattern** | Monolith with BFF API layer |
| **Rendering** | App Router — Server Components + Client Components |
| **State** | React context, custom `DataCacheProvider`, IndexedDB for offline |
| **Data access** | Supabase JS SDK (server + browser clients) |
| **Multi-tenancy** | Single-tenant (Realign Ministries) |

---

## 3. Component Architecture

```mermaid
flowchart LR
    subgraph AppShell["App Shell"]
        Layout["app/layout.tsx"]
        AppShellC["AppShell.tsx"]
        BottomNav["BottomNavigation.tsx"]
        ThemeCtx["ThemeContext"]
        TransCtx["TranslationContext"]
    end

    subgraph Screens["Feature Screens"]
        Home["HomeScreen<br/>(Today)"]
        Reader["BibleReaderScreen"]
        Notes["NotesScreen"]
        Highlights["HighlightsScreen"]
        Settings["SettingsScreen"]
        PreRead["Pre-Read Page"]
        Apologetics["Apologetics Pages"]
        Admin["Admin Console"]
    end

    subgraph Infra["Infrastructure Layer"]
        ApiFetch["lib/api/fetch.ts"]
        Session["lib/api/session.ts"]
        OfflineStore["lib/offlineStore.ts"]
        SyncQueue["lib/syncQueue.ts"]
        DataCache["lib/data-cache/"]
        SupaClient["lib/supabase/client.ts"]
        SupaServer["lib/supabase/server.ts"]
        SupaAdmin["lib/supabase/admin.ts"]
    end

    subgraph APIRoutes["BFF API Routes"]
        BibleAPI["/api/bible/*"]
        UserAPI["/api/user/*"]
        PreReadAPI["/api/pre-reads/*"]
        ApolAPI["/api/topics · paths · sources"]
        ProfileAPI["/api/profile/*"]
    end

    Layout --> AppShellC
    AppShellC --> BottomNav
    AppShellC --> Screens
    Screens --> ApiFetch
    ApiFetch --> APIRoutes
    APIRoutes --> SupaServer
    Screens --> OfflineStore
    Screens --> DataCache
    OfflineStore --> SyncQueue
    SyncQueue --> SupaClient
```

### Directory Map

```
sword/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root: OfflineProvider + DataCacheProvider
│   ├── (admin)/admin/            # Admin console (role-gated)
│   ├── (modules)/apologetics/    # Public apologetics pages
│   ├── api/                      # 29 BFF route handlers
│   ├── auth/callback/            # OAuth code exchange
│   ├── dashboard/                # Main authenticated app
│   ├── login/                    # Auth screen
│   └── pre-read/                 # Daily Pre-Read view
├── components/                   # UI screens + shared components
│   ├── ui/                       # Radix/shadcn primitives
│   ├── pre-read/                 # Poll, comments, stream host widgets
│   └── *Screen.tsx               # Feature screens
├── lib/                          # Business logic & infrastructure
│   ├── api/                      # Client-side API wrappers
│   ├── supabase/                 # Supabase client factories
│   ├── bible/                    # Reference parsing + queries
│   ├── offline/                  # Pack manifest versioning
│   ├── data-cache/               # In-memory client cache
│   ├── memory/                   # Spaced-repetition scheduling
│   └── syncQueue.ts              # Offline mutation replay
├── types/                        # Shared TypeScript types
├── supabase/migrations/          # SQL migrations (Pre-Read)
├── public/                       # Static assets, PWA manifest, offline packs
├── scripts/                      # Bible seeding scripts
└── middleware.ts                 # Supabase session refresh
```

---

## 4. Feature Modules

### 4.1 Navigation & Information Architecture

Primary navigation (bottom bar):

| Tab | Route | Screen |
|---|---|---|
| Today | `/dashboard` | Home — daily overview, quick actions |
| Scripture | `/dashboard/reader` | Multi-translation Bible reader |
| Reflections | `/dashboard/notes` | Verse-anchored personal notes |
| Marked | `/dashboard/highlights` | Highlighted passages |
| Profile | `/dashboard/settings` | Theme, avatar, preferences |

Secondary routes (reachable but not in bottom nav):

| Feature | Route | Status |
|---|---|---|
| Pre-Read | `/pre-read` | Active |
| Apologetics | `/apologetics` | Implemented, removed from main IA |
| Memory Verses | `/dashboard/memory` | Redirects to Today (deprecated) |

```mermaid
flowchart TD
    Login["/login"] -->|authenticated| Dashboard

    subgraph Dashboard["/dashboard"]
        Today["Today (Home)"]
        Scripture["Scripture Reader"]
        Reflections["Reflections (Notes)"]
        Marked["Marked (Highlights)"]
        Profile["Profile (Settings)"]
    end

    Today --> PreRead["/pre-read"]
    Today -.-> Apologetics["/apologetics"]

    subgraph Admin["/admin (role: admin)"]
        AdminHome["Overview"]
        PreReadCRUD["Pre-Read Manager"]
        Hosts["Hosts Manager"]
        QRLogin["QR Login"]
        TopicsCMS["Topics / Paths / Sources"]
    end

    Profile -->|admin role| Admin
```

### 4.2 Module Responsibilities

| Module | Key Files | Responsibility |
|---|---|---|
| **Bible Reader** | `BibleReaderScreen.tsx`, `lib/api/bible.ts`, `lib/bible/` | Load translations, books, chapters; highlight, bookmark, create notes inline |
| **Reflections** | `NotesScreen.tsx`, `lib/api/notes.ts`, `components/notes/AudioNotePanel.tsx` | CRUD for verse-anchored notes; voice-to-text via Web Speech API |
| **Marked** | `HighlightsScreen.tsx`, `lib/api/highlights.ts` | View and manage highlighted passages |
| **Pre-Read** | `app/pre-read/`, `components/pre-read/`, `lib/api/pre-reads.ts` | Daily study content, polls, threaded comments, stream host cards |
| **Apologetics** | `app/(modules)/apologetics/`, `lib/api/apologetics.ts` | Topics, evidence, counterarguments, sources, learning paths |
| **Memory** | `MemoryScreen.tsx`, `lib/memory/scheduling.ts` | SM-2–style spaced repetition (UI exists, nav deprecated) |
| **Admin** | `app/(admin)/admin/` | Content management for Pre-Read, hosts, apologetics CMS, QR login |
| **Offline** | `OfflineProvider.tsx`, `lib/offlineStore.ts`, `lib/syncQueue.ts` | IndexedDB caching, mutation queue, pack versioning |

---

## 5. Request & Data Flows

### 5.1 Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Login as LoginScreen
    participant SupaAuth as Supabase Auth
    participant Google as Google OAuth
    participant Callback as /auth/callback
    participant MW as middleware.ts
    participant Dashboard as /dashboard

    User->>Login: Enter credentials or click Google
    alt Email/Password
        Login->>SupaAuth: signInWithPassword()
    else Google OAuth
        Login->>SupaAuth: signInWithOAuth(google)
        SupaAuth->>Google: Redirect
        Google->>Callback: Authorization code
    end
    Callback->>SupaAuth: exchangeCodeForSession()
    SupaAuth-->>Callback: Session cookies set
    Callback->>Dashboard: Redirect (sanitized next path)
    Note over MW: Every subsequent request
    MW->>SupaAuth: getUser() — refresh session
    MW-->>Dashboard: Updated cookies
```

### 5.2 Authenticated API Flow (BFF Pattern)

```mermaid
sequenceDiagram
    participant Screen as Client Component
    participant ApiFetch as apiFetch()
    participant Session as session cache
    participant Route as /api/user/notes
    participant Auth as getAccessTokenFromRequest()
    participant Supa as Supabase Server Client
    participant DB as PostgreSQL

    Screen->>ApiFetch: GET /api/user/notes
    ApiFetch->>Session: Get cached access token
    ApiFetch->>Route: Authorization: Bearer <token>
    Route->>Auth: Extract & validate token
    Auth->>Supa: createClient(accessToken)
    Supa->>Supa: auth.getUser()
    Supa->>DB: SELECT * FROM user_notes WHERE user_id = ...
    DB-->>Supa: Rows
    Supa-->>Route: Data
    Route-->>Screen: JSON response
    Screen->>Screen: Update UI / DataCache
```

### 5.3 Bible Content Flow (Mostly Public)

```mermaid
sequenceDiagram
    participant Reader as BibleReaderScreen
    participant API as /api/bible/[book]/[chapter]
    participant Supa as Supabase Server Client
    participant DB as PostgreSQL

    Reader->>API: GET /api/bible/John/3
    API->>Supa: createClient() (cookie session)
    Supa->>DB: bible_translations → bible_books → scripture_chunks
    DB-->>Supa: content_json (verses array)
    Supa-->>API: Chapter data
    API-->>Reader: JSON { verses, book, chapter }
    Reader->>Reader: Render verses, enable highlight/bookmark/note
```

### 5.4 Offline Sync Flow

```mermaid
sequenceDiagram
    participant User
    participant Screen as Client Component
    participant Queue as syncQueue.ts
    participant IDB as IndexedDB
    participant Offline as OfflineProvider
    participant Supa as Supabase Browser Client

    Note over User,Screen: User goes offline
    User->>Screen: Create note
    Screen->>Queue: enqueueAction({ table, op, payload })
    Queue->>IDB: Store sword_queue_<uuid>

    Note over User,Screen: Connectivity restored
    Offline->>Offline: Detect 'online' event
    Offline->>Queue: flushQueueWhenOnline()
    loop Each queued action (FIFO)
        Queue->>IDB: Read queue item
        Queue->>Supa: INSERT/UPDATE/DELETE on table
        alt Success
            Queue->>IDB: Remove queue item
        else Failure
            Queue->>IDB: Increment attempts, re-enqueue
        end
    end
    Offline->>Offline: Fetch /public/packs/manifest.json
    Offline->>IDB: Reconcile pack versions
```

### 5.5 Pre-Read Admin → User Flow

```mermaid
sequenceDiagram
    actor Admin
    actor Reader
    participant AdminUI as Admin Pre-Read Form
    participant API as /api/pre-reads
    participant DB as PostgreSQL (RLS)
    participant PreReadPage as /pre-read
    participant Poll as PollWidget
    participant Comments as CommentsSection

    Admin->>AdminUI: Create Pre-Read study
    AdminUI->>API: POST /api/pre-reads
    API->>DB: INSERT pre_reads (published, visibility window)
    
    Reader->>PreReadPage: Visit /pre-read
    PreReadPage->>DB: Query published pre_read in visibility window
    DB-->>PreReadPage: Study content + host metadata
    Reader->>Poll: Vote on poll question
    Poll->>API: POST /api/pre-reads/[id]/poll-responses
    Reader->>Comments: Post comment
    Comments->>API: POST /api/pre-reads/[id]/comments
```

---

## 6. Data Model

### 6.1 Entity Relationship Diagram

```mermaid
erDiagram
    auth_users ||--|| profiles : has
    profiles ||--o{ pre_reads : creates
    profiles ||--o{ pre_reads : hosts
    pre_reads ||--o{ pre_read_poll_responses : has
    pre_reads ||--o{ pre_read_comments : has
    pre_reads ||--o| pre_reads : "parent (series)"

    bible_translations ||--o{ bible_books : contains
    bible_books ||--o{ scripture_chunks : has

    auth_users ||--o{ user_notes : owns
    auth_users ||--o{ user_highlights : owns
    auth_users ||--o{ user_bookmarks : owns
    auth_users ||--o{ user_memory_verses : owns
    auth_users ||--o{ user_progress : tracks

    topics ||--o{ evidence : has
    topics ||--o{ counters : has
    topics ||--o{ topic_sources : links
    sources ||--o{ topic_sources : referenced_by
    counters ||--o{ counter_sources : cites
    sources ||--o{ counter_sources : cited_in
    paths ||--o{ path_topics : contains
    topics ||--o{ path_topics : included_in

    profiles {
        uuid id PK
        text username
        text avatar_url
        text role "user | host | admin"
        text theme
        text stream_tagline
        text stream_url
        boolean is_host_active
    }

    pre_reads {
        uuid id PK
        uuid parent_id FK
        text book
        int chapter
        text verses_range
        text summary
        text memory_verse
        jsonb reflection_questions
        text poll_question
        jsonb poll_options
        uuid host_profile_id FK
        timestamptz stream_start_time
        boolean is_cancelled
        timestamptz visible_from
        timestamptz visible_until
        boolean published
        uuid created_by FK
    }

    scripture_chunks {
        uuid id PK
        uuid book_id FK
        int chapter
        jsonb content_json
    }

    user_notes {
        uuid id PK
        uuid user_id FK
        text book
        int chapter
        int verse
        text content
    }

    topics {
        uuid id PK
        text title
        text objection
        text claim
        text summary
        text difficulty
        text[] tags
    }
```

### 6.2 Table Groups

| Group | Tables | Access Pattern |
|---|---|---|
| **Bible** | `bible_translations`, `bible_books`, `scripture_chunks` | Public read; seeded via CLI scripts |
| **User Data** | `user_notes`, `user_highlights`, `user_bookmarks`, `user_memory_verses`, `user_progress` | Per-user, filtered by `user_id` |
| **Profiles** | `profiles` | 1:1 with `auth.users`; role-based access |
| **Pre-Read** | `pre_reads`, `pre_read_poll_responses`, `pre_read_comments` | RLS: published + visibility window for users; full access for admins |
| **Apologetics** | `topics`, `evidence`, `counters`, `counter_sources`, `sources`, `topic_sources`, `paths`, `path_topics` | Public read; admin write via CMS |

> **Note:** Only Pre-Read migrations exist in `supabase/migrations/`. Bible, Apologetics, and Profile schemas live in the hosted Supabase project. Generated types are in `lib/database.types.ts` (partial coverage).

---

## 7. API Surface

All API routes live under `/app/api/` and act as a BFF layer over Supabase.

```mermaid
flowchart LR
    subgraph Bible["Bible (Public)"]
        B1["GET /api/bible/translations"]
        B2["GET /api/bible/books"]
        B3["GET /api/bible/:book/:chapter"]
        B4["GET /api/bible/passage"]
        B5["GET /api/bible/search"]
    end

    subgraph User["User Data (Auth Required)"]
        U1["GET/POST /api/user/notes"]
        U2["GET/PATCH/DELETE /api/user/notes/:id"]
        U3["GET/POST /api/user/highlights"]
        U4["GET/POST /api/user/bookmarks"]
        U5["GET/POST /api/user/memory"]
    end

    subgraph Profile["Profile"]
        P1["GET/PATCH /api/profile"]
        P2["POST /api/profile/avatar"]
    end

    subgraph PreRead["Pre-Read"]
        PR1["GET/POST /api/pre-reads"]
        PR2["GET/PATCH/DELETE /api/pre-reads/:id"]
        PR3["GET/POST /api/pre-reads/:id/poll-responses"]
        PR4["GET/POST /api/pre-reads/:id/comments"]
        PR5["DELETE /api/pre-reads/comments/:commentId"]
    end

    subgraph Apologetics["Apologetics CMS"]
        A1["CRUD /api/topics"]
        A2["CRUD /api/topics/:id/evidence"]
        A3["CRUD /api/topics/:id/counters"]
        A4["CRUD /api/sources"]
        A5["CRUD /api/paths"]
        A6["CRUD /api/paths/:id/topics"]
    end

    subgraph Hosts["Hosts"]
        H1["GET/POST /api/hosts"]
        H2["GET/PATCH/DELETE /api/hosts/:id"]
    end
```

### Auth Requirements by Route Group

| Route Group | Auth Mechanism |
|---|---|
| `/api/bible/*` | Optional (cookie session) |
| `/api/user/*` | `Authorization: Bearer <access_token>` |
| `/api/profile/*` | Cookie session |
| `/api/pre-reads/*` | Mixed — public read for published; write requires auth |
| `/api/topics/*`, `/api/paths/*`, `/api/sources/*` | Supabase client (RLS-dependent) |
| `/api/hosts/*` | Auth required |

---

## 8. Authentication & Authorization

### 8.1 Auth Stack

```mermaid
flowchart TD
    subgraph Methods["Login Methods"]
        Email["Email / Password"]
        Google["Google OAuth"]
    end

    subgraph SupaAuth["Supabase Auth"]
        Session["Cookie-based SSR Session"]
        JWT["JWT Access Token"]
    end

    subgraph Enforcement["Authorization Layers"]
        MW["middleware.ts — session refresh"]
        PageGate["Page layouts — redirect if unauthenticated"]
        AdminGate["admin/layout.tsx — role === admin"]
        APIBearer["API routes — Bearer token validation"]
        RLS["PostgreSQL RLS policies"]
    end

    Methods --> SupaAuth
    Session --> MW
    JWT --> APIBearer
    MW --> PageGate
    PageGate --> AdminGate
    APIBearer --> RLS
```

### 8.2 Role Model

| Role | Capabilities |
|---|---|
| `user` | Read Scripture, manage own notes/highlights/bookmarks, participate in Pre-Read polls/comments |
| `host` | Profile includes stream metadata (`stream_url`, `stream_tagline`, `is_host_active`) |
| `admin` | Full Pre-Read CRUD, host management, apologetics CMS, view all poll responses |

### 8.3 RLS Example (Pre-Read)

The `is_admin(uid)` helper function gates admin access. Authenticated users see only published, non-cancelled Pre-Reads within their visibility window. Poll responses are unique per user per Pre-Read.

### 8.4 Security Controls

| Control | Implementation |
|---|---|
| Session refresh | `middleware.ts` calls `supabase.auth.getUser()` on every request |
| Open redirect prevention | `sanitizeAuthNextPath()` in `lib/site-url.ts` |
| Avatar upload validation | Max 5 MB, image MIME types only |
| Service role isolation | `lib/supabase/admin.ts` — server-only, never exposed to browser |
| Storage caching | Supabase public URLs cached 7 days via service worker |

---

## 9. Offline & PWA Architecture

SWORD is designed to work without connectivity. The offline subsystem is shared infrastructure used by Bible, Apologetics, and Notes modules.

```mermaid
flowchart TB
    subgraph PWA["PWA Layer"]
        Manifest["/public/manifest.json"]
        SW["Service Worker (next-pwa)"]
        SW -->|CacheFirst| StorageURLs["Supabase Storage URLs"]
        SW -->|Precache| StaticAssets["JS · CSS · Images"]
    end

    subgraph OfflineCore["Offline Core"]
        Provider["OfflineProvider"]
        Hook["useOfflineStore(namespace)"]
        Store["offlineStore.ts<br/>IndexedDB: sword_offline"]
        Versioning["offline/versioning.ts"]
        Manifest2["/public/packs/manifest.json"]
    end

    subgraph Sync["Sync Layer"]
        Queue["syncQueue.ts"]
        QueueStore["queue store in IndexedDB"]
        Flush["flushQueueWhenOnline()"]
    end

    Provider -->|startup + online event| Versioning
    Versioning -->|compare versions| Manifest2
    Versioning -->|stale packs| Store
    Hook --> Store
    Queue --> QueueStore
    Provider --> Flush
    Flush -->|replay mutations| Supabase
```

### IndexedDB Key Conventions

| Key Pattern | Purpose | Example |
|---|---|---|
| `sword_<namespace>_<id>` | Cached JSON pack | `sword_bible_default` |
| `sword_queue_<uuid>` | Pending offline mutation | `sword_queue_a1b2c3...` |
| `sword_cache_version` | Global cache version marker | — |

### Cache Invalidation

1. Bump `version` in `/public/packs/manifest.json` for a global reset
2. Update per-pack semantic versions for targeted invalidation
3. `OfflineProvider` reconciles automatically on next online session

---

## 10. Deployment & Infrastructure

```mermaid
flowchart LR
    subgraph Dev["Development"]
        Local["next dev --turbopack<br/>localhost:3000"]
        PWAOff["PWA disabled in dev"]
    end

    subgraph Vercel["Vercel (Production)"]
        Build["next build --turbopack"]
        Edge["CDN + Edge Network"]
        Preview["Preview deployments<br/>VERCEL_URL"]
        Prod["sword-dun.vercel.app"]
    end

    subgraph SupaCloud["Supabase Cloud"]
        PG["PostgreSQL"]
        AuthCloud["Auth Service"]
        StorageCloud["Object Storage"]
    end

    subgraph Tooling["Tooling"]
        Seed["scripts/seed_bible_WEB.mjs"]
        Migrations["supabase/migrations/"]
        Tests["node --test tests/*.test.mjs"]
        Postman["postman/ collections"]
    end

    Local --> Build
    Build --> Edge
    Edge --> Prod
    Edge --> Preview
    Prod --> SupaCloud
    Seed --> PG
    Migrations --> PG
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations (server-only) |
| `NEXT_PUBLIC_SITE_URL` | App origin for SSR/OAuth callbacks |
| `NEXT_PUBLIC_PROD_URL` | Production URL (QR login) |
| `NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET` | Avatar storage bucket name |
| `VERCEL_URL` | Auto-set on Vercel preview deploys |
| `API_BIBLE_KEY` | KJV seeding via API.Bible (scripts only) |

### CI/CD

No GitHub Actions workflows are configured. Deployment is handled by Vercel's git integration. Database migrations are applied manually via Supabase CLI or dashboard.

---

## 11. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | 20+ |
| **Language** | TypeScript | 5.x |
| **Framework** | Next.js (App Router) | 15.5 |
| **UI Library** | React | 19.1 |
| **Component Primitives** | Radix UI | — |
| **Styling** | Tailwind CSS | 4.x |
| **Animation** | Motion | 11.x |
| **Icons** | Lucide React | — |
| **Toasts** | Sonner | — |
| **Backend** | Supabase (Postgres + Auth + Storage) | — |
| **Auth SDK** | @supabase/ssr + @supabase/supabase-js | 0.7 / 2.58 |
| **Offline Storage** | localForage (IndexedDB) | 1.10 |
| **PWA** | next-pwa (Workbox) | 5.6 |
| **Bundler** | Turbopack | (via Next.js) |
| **Testing** | Node built-in test runner | — |
| **Hosting** | Vercel | — |

---

## 12. Design Decisions & Tradeoffs

### Decisions

| Decision | Rationale |
|---|---|
| **Monolith over microservices** | Small team, single deployable unit; Supabase handles backend complexity |
| **BFF API routes over direct Supabase from browser** | Centralized auth validation, consistent error handling, hides schema details |
| **IndexedDB + sync queue over full CRDT** | Simpler mutation replay; sufficient for notes/highlights/bookmarks |
| **Custom DataCacheProvider over React Query** | Lightweight in-memory cache with prefetch; no external dependency |
| **Cookie sessions + Bearer tokens** | Cookies for SSR/page auth; Bearer tokens for client-side API calls |
| **PWA over native app** | Single codebase, installable, offline-capable; lower distribution cost |

### Known Gaps & Considerations

| Area | Status |
|---|---|
| **Schema migrations in repo** | Only Pre-Read tables migrated locally; Bible/Apologetics/Profiles schemas exist in Supabase but aren't fully mirrored |
| **Apologetics CMS auth** | API routes rely on Supabase RLS; explicit admin checks not in all route handlers |
| **Memory Verses** | Feature implemented but removed from navigation |
| **Apologetics** | Feature implemented but removed from main information architecture |
| **Admin IA** | Topics/Paths/Sources admin pages exist but aren't linked from admin overview |
| **CI/CD** | No automated test/lint pipeline configured |
| **OPENAI_API_KEY** | Present in env files but unused in application code |

### Scalability Notes

- **Bible content** is read-heavy and cacheable (offline packs + CDN)
- **User data** is partitioned by `user_id` with straightforward indexing
- **Pre-Read** uses visibility windows — queries are time-bounded
- **Supabase connection pooling** handles concurrent users; Vercel serverless functions scale horizontally
- **Offline sync queue** replays FIFO with retry counters — suitable for low-to-moderate concurrent offline users

---

*Generated from codebase analysis — July 2026*
