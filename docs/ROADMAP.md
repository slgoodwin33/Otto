# Otto roadmap (handoff from Claude chat, Oct 29 2026)

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
