# Otto roadmap (handoff from Claude chat, Oct 29 2026)

## Just shipped — build .81 (Nov 6): declutter pass
- Today: the money card is only about money (today's to-dos moved into Next, which now starts with Today and marks late items). Empty tiles (Not synced, Nothing coming up, No data) no longer hold a grid slot; they fold into one "Nothing to show yet: Steps not synced" line under the grid, and the grid packs densely so there are no holes. Loading tiles wait instead of flashing.
- Plan: Week/Month and the month arrows share one row; the "YOUR WEEK / Events, todos, meals, bills" headline is gone; empty days show nothing instead of "Free" ×6 (screen readers hear "nothing planned"). Fixed: the month arrows showed in Week mode (CSS overrode `hidden`).
- Money › Transactions: Spending map / Calendar / + Log cash are outline pills in the sans font on one row (were three solid-lime monospace buttons).
- All areas: even tile heights with a 2-line clamp; one-line intro.

## Just shipped — build .80 (Nov 5): filter sentence + #tags
- Money › Transactions search reads a small language: `#tag`, `@store` (spaces don't matter: @marketbasket), `over $20` / `under $5`, `today · yesterday · this week · last week · this month · last month · this year · last 30 days`, `in <saved zone>` (zones from .77). Anything else is plain text. Suggestions pop up as you type # / @ / "in ".
- Under the box a sentence says what's showing: "4 transactions · $304.66 spent · $76.17 each on average", with one chip per part (✕ drops just that part). "Tag these N…" tags everything shown at once (undo from the notice). Open a purchase to add/remove its tags (#name + Enter creates the tag).
- New tables `tags` + `transaction_tags` (migration `20261105_tags_v1.sql`, owner RLS). Borrowed from Firefly III (tags + tag_transaction_journal) and Monica (tags + contact_tag): one tag row, many purchases; names are one word because they're typed inline.
- Filters work on the transactions loaded on the phone (most recent 120); the sentence says so and offers Load older when a filter reaches past them.

## Just shipped — build .79 (Nov 5): pinch-zoom calendar
- New page `#/cal/<steps|spend>/<year|month|week>/<date>`: Year = 12 mini heatmaps with each month's average (steps) or total (spending); spread two fingers on a month to open it; on a day to open its week (bars + top purchases); on a week day to open the full Day page. Pinch in to step back out. The zoom grows out of the spot under your fingers. Same moves without gestures: tap, − / +, the breadcrumb, ‹ › to page, ctrl+scroll on a trackpad.
- Entry: Body › History "Zoom calendar" and Money › Transactions "Calendar". Spending = purchases in expense categories (or uncategorized), by purchase date; a past day with nothing bought is $0, not missing. Back from a Day page returns to the week you came from.

## Just shipped — build .78 (Nov 5): move money between categories
- Money › This week: hold a category for a moment, drag it onto another, let go. A sheet opens with From → To, a big amount, a slider, "Cover the overage" / "All of it", and the after-state of both. Drag an over-budget category onto one with money left and it pulls from that one. Also reachable without dragging: tap a category → Move money ›.
- Only unspent planned money moves; the week's total stays the same. New DB function `move_budget(period, from, to, cents)` (migration `20261105_move_budget_v1.sql`, security invoker so the owner RLS still applies) changes both `budget_allocations.planned_cents` in one transaction. Undo = tap the notice (moves it back). Planned only; actual spending untouched.

## Just shipped — build .77 (Nov 5): draw a loop on the spending map, saved zones
- Money › Where money goes: "✎ Draw a loop" freezes the map; drag a loop with one finger and only purchases inside it count (stats, categories, top spots), with "about $X a month · N visits a week". Name it and Save zone. Saved zones show as chips; tap one to re-apply, tap again or Clear to drop it; Delete this zone removes it (purchases untouched).
- New table `zones` (migration `20261105_zones_v1.sql`): name + GeoJSON Polygon ([lng,lat]) with a PostGIS `geom` generated column and GiST index, so SQL can ask "spending in Downtown" later (`st_contains(z.geom, st_point(lon,lat))`). Borrowed from GeoJSON/OwnTracks waypoints + Home Assistant zones (named area, stored once, reused everywhere).

## Just shipped — build .76 (Nov 5): scrub the week
- Home hero: press and drag across the week bars; the panel follows your finger with that day's spent / left / top purchase, and the Last stop mini-map dot moves to where you were. Lift to return to today. Money › Recurring cash-flow line scrubs the same way (date, projected balance, what hits that day).

## Just shipped — build .75 (Nov 5): data-viz pass, Body + Car
- Body › Today: the three rings (which showed "0%" when Health hadn't synced) become stat tiles with a meter and a tick at your 30-day average; missing data shows "—, not synced". Steps hero bar gets the same tick. Workouts is a count, so no ring.
- Body › Trends: steps chart redrawn at its real aspect ratio (date labels were squashed), gray bars with above-average days brighter and the latest day in lime; average named in the card title.
- Car › Costs: Per month divides by the months you've actually logged (not ÷12); "Per mile" becomes Gas per mile from odometer readings between fill-ups; the bank-gas card skips a one-bar chart.

## Just shipped — build .74 (Nov 5): dashboard data-viz pass
- Home hero: the number is the chart. Unscaled half-gauge removed; "$X left of $Y", "$Z a day for the next N days", and a bullet bar (spent vs. a tick at an even pace by today) with "Day 4 of 7 · $109 under pace". Week bars use purchase date (now match Money) and gray with today in lime.
- Inbox count in neutral ink (red is for over/overdue). Food split bar uses the category colors with a two-line legend (validated pair #D4731F / #2E7D50, labels as secondary encoding). Empty tiles (Not synced, Nothing coming up) shrink to a dashed outline.
- Money › This week: donut removed (duplicated the category list); cumulative pace line retired (said the same as the bullet + day bars); Spending by day is one SVG with a dashed daily-budget line and over-budget days in amber. Category bars use status colors only at 85%+ / over.
- All hero and tile numbers in the sans with proportional figures.

## Just shipped — build .73 (Nov 5)
- Samuel's dark + neon lime theme (made in another chat on top of an older .55 copy) ported onto .72 instead of replacing the file: lime accent #D7FF3D, near-black #0B0C0A, lime Otto button with glow, new app icon + favicon, black-translucent status bar, theme-color #0B0C0A. Hard-coded sage in map dots, the day-page route, the steps ring and the History heatmap switched to lime. Uploading that older file directly would have dropped builds .55–.72.

## Just shipped — builds .68–.72 (Nov 2)
- .68 Money › Recurring: cash-flow line, checking projected 30 days (weekly pay, each bill/subscription on its date, everyday spending = last 60 days of checking outflows minus bills; rent paid by Apple Cash is matched by amount + date so it isn't counted twice). Shows now / day 30 / lowest + the next dated events.
- .69 Spending map (#/spend): purchases with a store location, grouped by merchant within 150 m, circle area = total, colored by category; 30/90/All, category filter, top town, Top spots list that flies the map. From Money › Transactions and Places › Layers.
- .70 Body → Today · Trends · History · Sleep (Mood retired). Trends adds "Every November" (this month vs the same month each year since 2018); Sleep adds a 14-night card (bedtime/wake, spread, nights under 7h).
- .71 Car → Status (diagram + Next up + records) · Log (services + fill-ups in one list, mpg, gas-station charges from the bank to add in one tap, linked by transaction_id) · Costs (logged vs bank gas kept separate). Fixed Wipers/Air filter zones preselecting "oil".
- .72 People ↔ Places: pick a person's place (people.location_id, no schema change); rows show last visit, visits in 30 days, usual length; "Time at their place" card; Catch up flag from keep_in_touch_days; Day pages name who lives at a stop.

## Waiting on Samuel
- Two Hannah places exist: "Hannah’s House" (id 9, 6 visits, linked) and "Hannah's house" (id 3, 0 visits). Deleting id 3 is destructive, so it's left for you.

## Next
- Arrival context (todos/shopping list when you arrive somewhere), Shortcuts recipes, Places tabs (Day · Insights · Layers; weather → Home morning card), evening wrap card (with a 2-tap mood question).

## Just shipped — builds .63–.67 (Nov 1), from docs/PRODUCT-REVIEW.md
- .63 Money: account cards only on Accounts (below the tabs); stale overview card removed; pace inside the Left-to-spend card; spending by day uses authorized_date; Subscriptions folded into Recurring (deduped; Add / Edit or cancel links).
- .64 Inbox as swipe cards (purchases with Otto's guess + "always file" rule, stops with map + saved-place chips + Not a stop, todos Today/Someday/Done/Drop), Undo, no AI call. Fixed the Apartments map reading locations' lng as lon.
- .65 Kitchen → Cook · Shop · Plan; "Plan 3 dinners from what's at home"; Home Food spend widget (groceries vs eating out this budget week).
- .66 Day pages (#/day/YYYY-MM-DD) from the Home "Your day" widget: map with route, stops and geotagged purchases; steps, spent, miles, sleep; timeline; swipe between days; jump to last day with a route.
- .67 Plan → Today · Upcoming · Backlog (Upcoming = next 30 days from todos, events, bills, renewals, document expirations, school, budget week); Weekly reset (weekend card on Home + Plan): close the week → inbox → todos → next week's meals; "N todos need a decision" uses the card deck.

## Just shipped — build .62 (Nov 1)
- docs/PRODUCT-REVIEW.md: full crawl (49 screens) + real-data review, 24 ideas, redesign table, order of work (.62–.67).
- All: Daily · Life admin · Projects; areas with no data fold into "Not started"; pinned areas show a dot.
- Body › History: every day since 2018 (paged past the 1,000-row API limit): best day / best month / longest 10k streak / total, On this day, year heatmap you can tap, every-year averages.

## Next — from docs/PRODUCT-REVIEW.md §6
- .63 Money: Subscriptions merged into Recurring; This week condensed; weekday spend by authorized_date.
- .64 Inbox as swipe cards + "always file as" rules. · .65 Kitchen → Cook · Shop · Plan + food-spend widget. · .66 Day pages / Life log. · .67 Sunday reset; Plan → Today · Upcoming · Backlog.

## Just shipped — build .61 (Oct 31)
- Background setting (Account → Background, or Home edit → Background): Solid · Glow · Your map (blurred basemap around your last location) · Photo (shrunk, saved on this phone), with a Dim slider. Any choice but Solid turns on glass cards, a frosted dock and page header. Stored in localStorage `otto.bg` (per device, not synced).

## Just shipped — builds .56–.60 (Oct 31), from docs/APP-REVIEW.md
- .56 Removed the three hidden Home generations (map, day sheet, old dock, Paper tiles) and the unseen AI briefing call; chart labels no longer render in Times.
- .57 One page header from the dock names (Kitchen / Body / Places); no second header in life areas; "‹ Home" gone; page addresses (#/money, #/car/2) so reloads return to the same page; ‹ and left-edge swipe go back.
- .58 One tab bar everywhere with a sliding underline; tab content and pages slide by direction; Home draws once per frame (was 13× on load); mini map reused.
- .59 Polish v1 tokens, SF Pro system font (no web fonts), sage page icons, sentence-case labels, red only for over/overdue; 130 dead CSS selectors removed.
- .60 Home charts (week spend strip, 7-day steps, sleep stages), widgets deep-link (Steps → Body · Activity, Recurring → Money · Recurring), ring empty states, real iPhone haptics (iOS 18 switch trick), press feedback, Kitchen opens on Kitchen, roomier Plan add field.
- Roadmap Next items 1, 2, 6, 7 and 9 are covered by these builds.

## Just shipped — build .55 (Oct 31)
- Home "Last stop" mini map no longer shows through other pages on iPhone: every Leaflet map is isolated, and Home is hidden while a page is open.

## Just shipped — build .54 (verify it's live on GitHub Pages)
- Map: one floating tabbed sheet (Timeline · Insights · Weather · Layers) replaces 4 floating buttons, the Timeline pill and the summary chip; Layers lost its date chips; belongings folded behind "See all items"; map background matches the basemap (no light/dark patchwork).
- Stay signed in: `refreshSession` retries dropped requests and only signs out on a real 400/401/403.
- .53: streamed Thinking panel in chat, keyboard-safe chat, Otto ring + sage accent, status band, friendly network errors with silent retry, Discover "limit not on file".

## Next (agreed with Samuel, from his screenshots + screen recording)
1. Drop "‹ Home" links (the dock is the way back); add edge-swipe back.
2. One status line per page; remove page-level "Updated Xm ago".
3. Money: one "left this week" everywhere = spending budget − spent (savings set aside separately; e.g. $598.07 − $191.39 = $406.68). Accounts only in the Accounts tab; Week opens on pace.
4. Inbox answered inline with one-tap chips (category, place name, Not a stop); chat stays free-form.
5. Inbox only as the Home widget; account button only on Home + a Settings tile in All.
6. Page titles match dock labels (Body not Health, Kitchen not Food, Places not Map).
7. Widgets deep-link to the exact view (Steps → Body Activity, Recurring → Money Recurring).
8. Closet: category icons + "Add photo" instead of letter placeholders; prompt for missing outfit pieces; reuse cached weather.
9. **Polish v1** design system (see DESIGN.md) — Samuel liked it "for now"; build when he says go.

## Engineering backlog
- E2 split index.html into modules (keep a single deployable output), E3 tests in repo + CI, E1 done by moving to Claude Code (commits replace manual uploads), E6 OwnTracks auth + key rotation, E8 stable category keys.

## Product backlog
- Connect the areas: document expirations, birthdays, car service due, school deadlines, trips into Plan + Inbox; drone invoices → income; people "last seen" from visits; packing lists from Closet; car miles from Timeline.
- Food loop: grocery charge ≥ $40 → "start the batch?", roll plans forward, short 1–2 day plans, "Cook it" logs meals and uses stock.
- Savings system (HYSA + Roth IRA; research YNAB/Monarch/Copilot first). Spotify, OwnTracks regions, insurance → Bills, closet stock product images, car 3D model.

## Waiting on Samuel
- Confirm closing 5 todos already built/junk: TD-00010, TD-00011, TD-00026, TD-00021, TD-00027 ("The").
- Washington Street, Beverly (5 days this month) — probably the temporary office during the City Hall renovation; name it in the Inbox.
- VIN + mileage in Car; Face ID setup in Documents; clothes photos; iCloud secrets for calendar-sync; ask Mascoma about the $10/mo checking fee.
