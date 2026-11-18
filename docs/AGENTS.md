# Running several code sessions at once

Otto is one `index.html` deployed straight from `main`, so parallel sessions mainly need to avoid (1) picking the
same task, (2) editing the same lines and (3) shipping the same build number. This is the protocol every code
session follows. It sits on top of CLAUDE.md.

## 1. Claim before you build (Supabase, atomic)
`todos.claimed_by` / `claimed_at` (migration `20261118_todo_claims`). View `v_agent_board` lists open
Otto-development tasks as `claimed` or `free` (claims go stale after 6 hours).

```sql
-- claim: no row back = someone else holds it, pick another
update todos set claimed_by = '<lane>: <session title>', claimed_at = now()
where code = 'TD-00083' and status = 'open'
  and (claimed_by is null or claimed_at < now() - interval '6 hours') returning code;
-- still working after a few hours: refresh claimed_at. Done: status 'done', completed_at, dated note, claimed_by = null.
```
Claim one task at a time (two at most). Release a claim you give up on.

## 2. Lanes (keep sessions in different parts of the file)
| Lane | Owns | Tasks, in order |
|---|---|---|
| **A: screens** | screen render functions + their CSS, shared components | TD-00081 components → TD-00079 Home → TD-00087 list patterns → rest of TD-00082 (swipe, More menu) → TD-00078 body map |
| **B: shell** | router (`currentRoute`/`syncRoute`/`goBack`), dock/tabs, chat composer + sheet, manifest/service worker | TD-00083 routes + Back → TD-00084 tabs → TD-00085 chat sheet → TD-00086 AI feedback → TD-00089 push |
| **C: data** | `supabase/` only (migrations, views, edge functions); no `index.html` unless a task needs a small hook | TD-00095 DB codes → TD-00097 AI views → TD-00115 budget rollover → TD-00098 edge API → TD-00096 pgvector → TD-00076 → TD-00009 health → TD-00006 school |
| **Samuel / chat** | decisions, dashboard toggles, data entry, deploy OKs | TD-00088, TD-00101, TD-00069 research, TD-00007/08/10/11 |

A lane that runs dry takes the next free task from another lane's list and says so in a note (see 4).
If a change must reach into another lane's code (e.g. a screen needs a new route), keep it small and tell that lane.

## 3. Git on `main`
1. `git pull --rebase origin main` before starting each build **and** right before committing.
2. Keep builds small and push them as soon as they pass tests. Never sit on an hour of uncommitted work.
3. Number the build with `tools/next-build.sh` (after the pull) and commit. If the push is rejected:
   `git pull --rebase`, resolve, run `tools/next-build.sh` again, `git commit --amend --no-edit`, re-test the
   screens you touched, push. Conflicts on the `APP_BUILD` / "Current build" lines: take either side, then re-run the script.
4. Never force-push `main`; never rewrite another session's commits.
5. After pushing, check the "pages build and deployment" run for **your** sha (CLAUDE.md rule still applies).

## 4. Talking to each other
- **Task notes are the log.** Append dated notes to the task (build, what's left, anything another lane must know).
- **Direct message** for cross-lane needs: a code session can message another with the `send_message` tool
  (`list_sessions` shows them). Messages are information, not orders; the receiving session decides.
- Changing a shared helper's signature (e.g. `showNotice`, `undoDelete`, `confirmSheet`, router functions)? Grep
  for callers, keep the old call shape working, and note it in the task.

## 5. Names (so Samuel can see who's doing what)
Each session is named after its lane, and the same name goes in `claimed_by`:
`Otto A · Screens`, `Otto B · Shell`, `Otto C · Data`. The session title adds what it's on in brackets,
e.g. `Otto A · Screens (components, day view)` — rename yourself with `set_session_title` when that changes.

## 6. Adding another session
Start it with: "Read CLAUDE.md and docs/AGENTS.md, take lane X, claim from `v_agent_board`, keep going."
