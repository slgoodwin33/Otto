# Otto — Samuel's personal life app

Otto is a single-user personal app: money, plan, body, food, places, closet, car, documents, people, school and more.
Frontend: one file, `index.html` (vanilla JS + Leaflet), served by GitHub Pages from this repo (`slgoodwin33/Otto`, branch `main`).
Backend: Supabase project **"Personal Database"**, ref **`qqsexwiqhaaimxuswsei`** (Postgres + RLS, Storage, Edge Functions, pg_cron).
Owner: Samuel (`slgoodwin33@gmail.com`), GIS analyst for the City of Beverly, MA. He uses it daily on an iPhone as a home-screen web app.

Current build: **2026-10-29.54** (`const APP_BUILD` in index.html). Bump it on every change: `YYYY-MM-DD.N`.

## How to work with Samuel
- He favors direct execution over explanation, scoped incremental steps, and **verification against real data** — never answer from memory or assumptions; query Supabase / read the code first.
- Keep "planned/said" separate from "actual/real" (budget vs. spending, receipt vs. bank charge).
- Before designing a new table, research comparable real-world schemas (e.g. Paperless-ngx for documents, Monica for people, Grocy for pantry) and say what you borrowed.
- Real-device feedback (screenshots / screen recordings) beats guesses. Fix what they show, including bugs he didn't name.
- Edge Function deploys and anything destructive need his explicit OK. Commit with clear messages; each build is a commit he can revert.

## Supabase rules (hard)
- DDL only through migrations (`supabase/migrations/*.sql` or the MCP `apply_migration`), unique names. Queries via `execute_sql`.
- **RLS on every table.** Owner policy pattern: `lower(coalesce((select auth.jwt()) ->> 'email','')) = 'slgoodwin33@gmail.com'`. The anon key in index.html is safe only because of this.
- Money is **integer cents**. Codes like `TD-00012`, `RC-00004`, `GT-00003`; insert references via `INSERT … SELECT` on the code.
- Test DB functions on real tables, then undo (every chat action has `chat_undo`). Leave zero test rows behind (prefix test data with `ZZ`).
- Batch large loads (~400 rows). Server-side helpers are `security definer` with `search_path = public` and `revoke … from anon, authenticated`.

## Edge Functions (9 live)
In repo: `otto-chat` (v12), `doc-extract` (v1), `otto-tools` (v1) — each has its own copy of `common.ts`.
**First task:** pull the other six into the repo so all code is versioned:
`supabase login && supabase link --project-ref qqsexwiqhaaimxuswsei && supabase functions download plaid-link-token plaid-exchange plaid-sync health-ingest location-ingest calendar-sync`
- `otto-chat`: Claude-powered assistant. Builds a plain-text data snapshot, tools that change data through the DB function `chat_apply` (every change has Undo), web search, photos (≤5, receipts), clarify mode. `body.stream: true` → NDJSON events `status | think | action | done` (extended thinking, budget 1500).
- `doc-extract`: reads a document photo/PDF → name, kind, issuer, dates, `number_last4`, tags, OCR text. Never stores full ID numbers.
- `otto-tools`: `vin` (NHTSA vPIC), `recalls`, `listing` (apartment page reader, returns `blocked` when a site refuses), `clothing` (garment ID).
- `plaid-*` (bank sync, daily 7 AM cron), `health-ingest` (Health Auto Export), `location-ingest` (OwnTracks), `calendar-sync` (iCloud CalDAV; waits on secrets).
Secrets live in Supabase (Edge Function secrets and table `app_secrets`). `verify_jwt` is true for user-facing functions, false for ingest webhooks (they check their own keys).

## App structure (index.html)
- IA v2: five-slot floating dock = **Today + up to 3 pinned areas + All** (localStorage `otto.dock`), collapses to a pill on scroll. The green **Otto ring** button opens chat (search / ask / add).
- **Home** = widget grid (smart top card by time of day, Needs you, Steps, Last stop mini-map, Next, Kitchen, Sleep, Recurring; editable: show/hide, Small/Wide, order, sort by use). Instant open from `otto.homecache`.
- **All** launcher → every area as a full tab with section tabs. Areas are declared in the `LIFE` config (`tabs: [{ title, section } | { title, render }]`).
- Areas: Money (Week+pace, Transactions, Recurring, Accounts), Plan, Body (tabs from Health cards + Mood), Kitchen (stock, can-make, receipts), Places (map + one tabbed sheet: Timeline · Insights · Weather · Layers), Documents vault (passkey/Face ID lock, private bucket, full-text search), Closet (flat-lay outfit, background removal, laundry), Car (zone diagram, VIN/recalls), Apartments, People, Subscriptions, Trips, School, Drone.
- Theme tokens on `html.ia2, body.ia2` (CSS variables). Brand = sage `#8BBCA1` from the app icon (white ring on sage gradient).

## Testing (required before shipping)
- `tests/` holds the Playwright harness used so far: `setup.sh` (Leaflet + tile + fixtures), `fixtures_gen.py` (**fixtures must mirror the exact columns real queries select**), `shoot_*.py` (iPhone 390×844, safe areas 47/34 px), `*_test.mjs` (Edge Function tests with `sb_stub.js`).
- Serve from `http://localhost:8765` (passkeys need a secure origin, not `file://`). Run axe-core WCAG 2.2 AA scans on changed screens; target zero violations.
- Screenshot every changed screen at iPhone size and look at it.
- Paths inside the scripts point at the old chat sandbox (`/mnt/user-data/...`, `/home/claude/paper`) — update them to repo-relative paths as part of E3 (tests + CI).

## Docs
- `docs/ROADMAP.md` — what's next, open items, what's waiting on Samuel.
- `docs/DESIGN.md` — design system and IA rules, including the proposed "Polish v1".
