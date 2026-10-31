# Otto

Samuel's personal life app: money, plan, body, kitchen, places, closet, car, documents, people and more. Used daily as an iPhone home-screen web app.

- **App:** `index.html` (one file, vanilla JS + Leaflet), served by GitHub Pages from `main`.
- **Backend:** Supabase (Postgres + RLS, Storage, Edge Functions). Edge Function source is in `supabase/functions/`.
- **Tests:** Playwright screenshot checks and Edge Function tests in `tests/` (see `tests/README.md`).
- **Docs:** `docs/ROADMAP.md` (what's next), `docs/DESIGN.md` (design system), `CLAUDE.md` (rules for Claude working in this repo).

Every change is a commit, so any build can be reverted. Edit the current `index.html` from this repo, not a saved copy, or newer fixes get overwritten.
