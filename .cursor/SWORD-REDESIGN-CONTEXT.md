# SWORD Redesign Context (Realign Ministries)

Brief for agents picking up this work. Read before UI/UX or Stitch tasks.

## Goal

Refresh **SWORD** for use at **Realign Ministries** Bible study. This is **not** a full redesign.

- **Keep:** SWORD logo, overall layout/vibe, slim page structure
- **Change:** Color theme (Realign red/orange), terminology
- **Preview in Stitch first** — no code changes until the user approves Stitch output

## Product scope (slim)

### In scope (Stitch + eventual code)

| Route | UI name | Purpose |
|-------|---------|---------|
| `/login` | Welcome | Sign in |
| `/dashboard` | **Today** | Home — continue reading, recent reflections, marked preview |
| `/dashboard/reader` | **Scripture** | Core Bible reading |
| `/dashboard/notes` | **Reflections** | Personal study notes |
| `/dashboard/highlights` | **Marked** | Marked passages (rename in UI; route can stay for now) |
| `/dashboard/settings` | **Profile** | Account, theme, sign out |
| `/privacy`, `/terms` | Legal | Light touch |

### Out of scope (cut or deprioritize)

- **Apologetics** — remove from IA (`/apologetics/*`, admin topics/paths/sources)
- **Memory** — cut (`/dashboard/memory`); spaced repetition was half-baked

### Exists but not in this redesign pass

- **Pre-Read** (`/pre-read`) — stays in app; community feature; do not redesign in Stitch yet
- **Admin** (`/admin/*`) — unchanged for now

## User actions (reader)

1. **Read** — Bible by book/chapter; auto-resume last position (bookmark is invisible, not a nav item)
2. **Mark** — save/remove verse from Marked Passages (replaces Highlights + Memory conceptually)
3. **Reflect** — write note tied to passage

Verse menu: **Mark** | **Reflect** (optional later: Copy)

## Terminology

| Old | New |
|-----|-----|
| Save / Highlights | **Mark** / **Marked** |
| Notes | **Reflections** |
| Home | **Today** |
| Reader | **Scripture** |
| Settings | **Profile** |

## Bottom nav (4 items)

`Today | Scripture | Reflections | Marked`

Profile via icon on Today. Pre-Read can remain a link/card on Today (not in bottom nav for this pass).

## Realign Ministries branding

- Logo provided: **RM** / Realign Ministries (infinity loop + upward arrow)
- **Emphasize arrow colors:** red → orange gradient
- **Avoid purple/magenta** from the loop’s right side in app chrome

### Palette (theme-only)

| Token | Hex |
|-------|-----|
| Primary red | `#D91F26` |
| Accent orange | `#F28C00` |
| Deep red (pressed) | `#B81820` |
| Background | `#FFF5F0` |
| Secondary wash | `#FFE8DC` |
| Text | `#1A1A1A` |

Use red→orange gradient sparingly (primary buttons, active nav). Warm off-white backgrounds — **not** black like the logo backdrop.

Current app theme is `ocean` (cyan) in `app/globals.css`. A new `realign` theme is preferred over reusing `sunset` as-is (Realign is red-first).

## Stitch workflow

1. User approves look in **Google Stitch** before any code merge
2. Generate **one proof screen** first (recommend **Scripture** or **Today**)
3. Stitch prompt constraints: same SWORD layout, recolor + relabel only; SWORD logo unchanged; optional small “Realign Ministries” credit
4. After approval → apply CSS theme variables + copy/label updates in codebase

### MCP

Stitch config: `.cursor/mcp.json` (API key — do not commit secrets; add to `.gitignore` if needed).

If direct URL MCP fails in Cursor, use local proxy: `npx @_davideast/stitch-mcp proxy` with `STITCH_API_KEY`.

Useful Stitch tools: `create_project`, `list_projects`, `generate_screen_from_text`, `fetch_screen_image`.

## Git / deploy context

- Work on **`staging`** branch; push to `origin/staging`
- Vercel preview: `https://sword-git-staging-grimmzs-projects.vercel.app`
- `staging` was synced with `main` at `bf6f357` (CVE fix merge)
- Pre-Read and admin routes may have Vercel deployment protection (SSO) on preview

## Code pointers

- Nav map: `components/app-navigation.ts`
- Bottom nav: `components/BottomNavigation.tsx`
- Themes: `app/globals.css` (`ocean`, `sunset`, `forest`, …)
- Reader actions: `components/BibleReaderScreen.tsx` (highlight, bookmark, note)
- SWORD tagline: *Scripture • Wisdom • Order • Reflection • Devotion*

## Do not (unless user asks)

- Full layout redesign without Stitch preview
- Reintroduce Memory or Apologetics into slim nav
- Commit `.env.local` or MCP API keys
- Redesign Pre-Read in Stitch without explicit request
