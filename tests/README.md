# Tests (carried over from the chat sandbox)
- `setup.sh` builds the throwaway environment (Leaflet 1.9.4 via npm, a placeholder map tile, fixtures).
- `fixtures_gen.py` writes `fixtures.json` — keep its columns identical to what the app's real queries select.
- `shoot_life.py` is the shared harness (routes Supabase REST to fixtures); `shoot_b5x.py` are per-build checks at 390×844 with axe-core scans.
- `*_test.mjs` test Edge Functions with `sb_stub.js` standing in for supabase-js (bundle with esbuild first, see each file).
- Serve the page from http://localhost:8765 (passkeys need a secure origin).
Paths still point at the old sandbox (`/mnt/user-data/...`, `/home/claude/paper`, `/tmp`). Make them repo-relative and add a CI workflow (roadmap E3).
