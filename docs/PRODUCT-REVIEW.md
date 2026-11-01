# Otto product review — Nov 1, 2026 (build .61)

> **Status:** §6 items .62–.67 shipped (see ROADMAP). Still open from §4–§5: cash-flow line, spending map, People ↔ Places, arrival context, Shortcuts, and the Body / Car / Places tab redesigns.

How this was made: a scripted crawl opened every page and every tab (49 screens) and recorded every button and heading. Then read-only aggregate queries against the real Supabase data showed what's actually used. No individual records were read.

## 1. What your data says

| Area | Real data | What it means |
|---|---|---|
| Steps | **3,030 days, back to Jul 2018** (avg ~5,000/day) | Your richest history, but the app only shows 30 or 90 days. |
| Money | 576 transactions since Jul 13 · ~$3,000/mo · **80 uncategorized** · 97 with a location | Money is the daily driver. Categorizing is a chore that piles up. |
| Food spend | **Food & drink $4,093 in 90 days** (191 purchases, ~2/day) | Your biggest category by far, about $1,360/mo. |
| Food system | 8 recipes, 47 ingredients, 2 meal plans (both still **draft**), 4 receipts | Built but never started. The loop doesn't connect to spending. |
| Places | 6,518 points over 17 days, 31 visits, 16 places (Mom's ×8, Hannah's ×4, 6 unnamed) | Works. Naming places is the friction. |
| Todos | **31 open, 2 done** | Things go in and never come out. |
| Sleep | 14 nights, last one Oct 27 | The feed stalls. |
| Check-ins / Mood | 1 ever | The Mood tab is dead weight. |
| Chat actions | 24: categorize, name place, not a stop, receipts, todo, check-in | Otto chat is mostly used for **inbox chores**. |
| Trips, Drone, Documents, Courses, Fuel, Car services, Outfits | **0 rows** | 7 of 15 areas have never been used. |

**Spending by weekday is misleading.** Monday shows $4,393 vs $281 on Sunday because the bank posts weekend purchases on Monday. Any "when do I spend" chart must use `authorized_date`.

## 2. The real problem

Otto gives all 15 areas equal weight. Five carry your life (Money, Food, Places, Body, Plan); seven are empty. Every page answers "here is the data structure," not "here is what you should know or do." The result feels unorganized even though each page is fine on its own.

Three fixes:
1. **Organize around loops, not tables.** The loops you actually live:
   - **Spend ↔ Eat:** $1,360/mo on food vs a meal plan that never starts.
   - **Your day:** places + steps + spending + todos, all on one timeline.
   - **Life admin:** car, documents, school, apartments, subscriptions. These are deadlines, not daily pages.
2. **Hide what's empty until it's needed.** Areas with no data collapse into "Not started," and areas that are projects (School, Apartments, Drone, Trips) get an end date and an archive.
3. **Turn chores into one-tap moments.** 80 uncategorized transactions, 6 unnamed places and 31 stale todos should be swipe cards, not pages.

## 3. Page-by-page findings (from the crawl)

**Home (11 controls).** Good bones. Problems:
- The top card says "$0 left" with an empty gauge when the budget hasn't loaded.
- The Inbox shows up three times: the header button, the widget and the All tile.
- No widget for the biggest thing in your life, food spend.
- "Next" lists bills only; no todos or events show when there aren't any.

**Account.** Background, Map style and Data sources are all here, but this is "Settings," and its only entry is a person icon. Sign out and Check for updates are buried at the bottom.

**Plan (22 controls).** The heaviest page:
- Week/Month switch, month arrows, 7 day chips, Today list, add form, triage card, Later/Someday/Done tabs, search, and a second list, all on one page.
- With 31 open and 2 done, the page is a backlog, not a plan.
- "Events, todos, meals, bills" is a label pretending to be a title.

**Money (4 tabs).**
- The two account cards sit above the tabs on every tab.
- *This week* stacks Pace, Left to spend, Spending by day, Bills, Categories and Other recurring bills: six cards that tell one story three times.
- *Recurring* duplicates the **Subscriptions** area: the same 4 charges in two places.
- *Accounts* repeats the cards from the top.

**Body (3 tabs).**
- "30 days / 90 days" and "+ Log activity by hand" float above the tabs.
- *Activity* is one bar chart.
- *Mood* is empty: 1 check-in ever.
- 8 years of steps are invisible.

**Kitchen (5 tabs: Kitchen, Fridge, Groceries, Meals, Recipes).** Fridge, Groceries and Meals all show "No meal plan yet" when there's no plan. That's three tabs dead-ending on the same missing thing. The food spend lives in Money, so the two never meet.

**Places (map + 4 sheet tabs).**
- Timeline opens on "No location data for this day" if today is empty, with no jump to the last day that has data.
- Insights says "Name your work stop" but doesn't offer the button.
- Weather is tides + radar, which is fine, but it's not a "place."
- Layers has 7 switches and 2 rows of date chips. That's power-user stuff on the front.

**All (17 tiles).** Lists everything equally, including never-used areas, with "IN DOCK" badges taking the best spot on four tiles.

**Closet.** A nice Today outfit card. The "Laundry done" button sits *above* the tabs on every tab and appears twice on Laundry.

**Car (5 tabs).** Service, Gas and Costs are all empty and each shows its own "+ Add". Records is just a link to Documents.

**Documents.** A Face ID setup wall with 0 documents behind it.

**People.** 1 person. It doesn't know Hannah's house is a place you visit 4×.

**Subscriptions.** Duplicates Money › Recurring.

**Trips, Drone, School, Apartments.** Thoughtful scaffolding (the Apartments board, afford check and move checklist are good) but 0 data. These are **projects**: they start, they end.

**Chat.** A blank screen until you type. No suggestions based on what's pending.

## 4. Ideas — with the use case each one serves

### A. Daily rhythm
1. **Morning card → day story → evening wrap.** Home changes through the day.
   - 7 AM: "3 things today, rent due Sunday, 52°/rain."
   - Noon: "You're at Work · $14 spent · 3,100 steps."
   - 9 PM: "Your day" card: places on a mini map, spend, steps, one question ("Name this stop?").
2. **Day pages ("Life log").** Every day becomes a scrollable card: route on a map, stops, purchases pinned where they happened (97 already have coordinates), steps, sleep, meals. Swipe left for yesterday. *Use case:* "What did I do last Saturday?" "Where did I buy that?"
3. **Sunday reset (guided, ~3 min).** One flow: close the budget week → triage todos (keep / someday / drop) → pick next week's meals → done. *Use case:* 31 open todos become 8 real ones, and a meal plan actually starts.

### B. Chores become swipes
4. **Inbox as cards.** One card per thing: "Starbucks $6.45 — Dining out?" Swipe right to accept Otto's guess, left to pick another category. Same for "Name this stop" (shows the spot on a mini map) and stale todos. *Use case:* clear 80 transactions in 2 minutes on the train.
5. **Rules from swipes.** After you categorize the same merchant twice, Otto offers "Always file Dunkin' as Dining out?" and writes a `category_rules` row. The table already exists.

### C. Spend ↔ Eat (your biggest number)
6. **Food spend meter.** One Home widget: "Food this week $96 · eating out 71%," with a split bar for groceries vs restaurants vs coffee. Tap it for the list.
7. **"Cook it" savings.** Every planned meal you cook shows what the takeout version would have cost, from your own average order. *Use case:* "This week cooking saved you $38."
8. **Grocery trip auto-detect.** A visit to a grocery store plus a charge within an hour adds up to "Was this a grocery run? Update what's at home." Places + Money + Kitchen in one loop.
9. **Kitchen from 5 tabs to 3: Cook · Shop · Plan.**
   - *Cook* shows what you can make now.
   - *Shop* is the list plus receipts.
   - *Plan* is the week and recipes.
   - "No meal plan yet" turns into one button: "Plan 3 dinners from what's at home."

### D. Money that looks forward
10. **Cash-flow line.** Checking balance projected 30 days ahead with paydays and bills as dots. *Use case:* "Can I afford the $1,850 apartment?" You can see the line dip.
11. **Spending map (GIS).** A heat layer of where money goes (97 geotagged purchases), switchable by category. You're a GIS analyst; this should be gorgeous.
12. **Money › This week as one hero.** One big number with a pace line inside it, category chips under it, then the transactions. Six cards become two.
13. **Merge Subscriptions into Money › Recurring.** One list, with a "subscription" chip on each and cancel reminders.

### E. Body with 8 years of history
14. **Step history heatmap.** A calendar grid like GitHub's contribution graph, 2018 to today. Tap a day to see the steps and where you were. Add **personal records** (best day, best month, longest 10k streak) and **On this day** ("Oct 31, 2021: 14,200 steps").
15. **Year-over-year line.** This October vs every October.
16. **Retire the Mood tab** into a 2-tap evening question inside the wrap-up card (idea 1).

### F. Places that know your people
17. **People ↔ Places.** Link Hannah to Hannah's House. Her person page then shows "Last together: Thursday · 4 visits this month · usually 5 h."
18. **Arrival context.** When you arrive at Mom's, Today shows the todos tagged home; at a grocery store, the shopping list.
19. **Timeline jumps to the last day with data** instead of showing an empty Today.

### G. Life admin as one calendar
20. **"Coming up" across everything:** document expirations (license, registration, Part 107), car service due by miles, school deadlines, subscription renewals, and apartment move dates. All in Plan, all in one list.
21. **Projects with an end.** School, Apartments, Drone and Trips show a progress ring and a target date, and archive when done.

### H. iPhone-native touches
22. **Siri / Shortcuts / Back Tap.** Pages now have addresses (`#/money`, `#/car/2`). A Shortcut can open Otto straight to Kitchen › Shop when you walk into the store, or double back-tap to log a purchase.
23. **Search everything** from the Otto ring: type "jetta" to get the car, the registration document and the last service.
24. **Pull to refresh** on every page, plus "Updated" shown only when stale. Pull-to-refresh is currently hidden.

## 5. Redesign proposals

| Page | Now | Proposed |
|---|---|---|
| **All** | 17 equal tiles, 7 empty | **Daily** · **Life admin** · **Projects** (with progress), and "Not started" folded at the bottom |
| **Money** | 4 tabs + cards above tabs | **Week** (one hero + chips + list) · **Activity** (transactions + map) · **Bills** (recurring + subscriptions + cash-flow line) · **Accounts** |
| **Kitchen** | 5 tabs | **Cook** · **Shop** · **Plan** |
| **Body** | Overview · Activity · Mood | **Today** · **Trends** · **History** (8-year heatmap, records, on this day) · **Sleep** |
| **Plan** | One long page | **Today** (top 3 + calendar strip) · **Upcoming** (everything with a date, across areas) · **Backlog** (Later/Someday with a "reset" button) |
| **Places** | Map + 4 tabs | **Day** (timeline, jumps to last data) · **Insights** · **Map layers**; Weather moves to the Home morning card |
| **Car** | 5 tabs, 3 empty | **Status** (diagram + VIN + next service) · **Log** (service and gas in one list) · **Costs** |

## 6. Order of work

1. **.62** All reorganized (Not started folded, Projects grouped) · Body **History** (8-year heatmap, records, on this day) · tab underline resize fix.
2. **.63** Money: Subscriptions merged into Recurring; This week condensed; spending chart uses purchase date.
3. **.64** Inbox as swipe cards (transactions, places, todos) + "always file as" rules.
4. **.65** Kitchen → Cook · Shop · Plan, with a food spend widget on Home.
5. **.66** Day pages / Life log + Timeline jumping to the last data.
6. **.67** Sunday reset flow; Plan → Today · Upcoming · Backlog.
7. Later: cash-flow line, spending map, People ↔ Places, Shortcuts recipes.
