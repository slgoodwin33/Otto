# Otto roadmap (handoff from Claude chat, Oct 29 2026)

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
