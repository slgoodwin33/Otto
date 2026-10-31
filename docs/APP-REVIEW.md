# Otto app review — Oct 31, 2026 (build .55)

> **Status:** builds .56–.60 shipped the plan below (see ROADMAP "Just shipped"). Two findings turned out wrong on closer checking: content is *not* hidden behind the dock (the dock collapses to a pill on scroll and pages already pad 110px), and Plan's Later/Someday/Done tabs filter the list below them, so they stay where they are. Not done yet: the remaining ~360 `!important` overrides (only provably dead CSS was removed), the Inbox/money de-duplication (1.6), and Places opening with its sheet at peek.

Scope: information architecture, visual richness, motion, consolidation.
Method: read `index.html`, rendered every area at iPhone size (390×844) with the test fixtures, and instrumented the load. Money numbers in the screenshots are fixture data, so "$0" values aren't bugs.

## The one-paragraph version
Otto has been rebuilt in place about 20 times (Build 005 → .54), and every generation is still in the file. Three old Home screens still render behind the current one on every data change. Areas run on two different page systems, so titles, headers and back links disagree. Pages swap with a 0.14 s fade and tabs swap instantly, which is most of the "clunky" feel. Fix the foundation first (one page system, delete old layers, one tab component, real URLs). Then motion and visuals become cheap to add, and they stay consistent.

---

## 1. Consolidate (do first — everything else gets easier)

**1.1 Delete the three dead Home generations.** `renderBriefing()` still draws the old Paper home tiles, the Home v2 day sheet and a hidden full-screen Leaflet map (`#homeMap`) on every refresh, even though `body.ia2` hides all of them. On load it ran 8 times, and the current Home (`renderIa2Home`) ran **13 times in 3.5 s**. Each pass also tears down and rebuilds the Last stop mini map. This is wasted battery and causes flicker, and the map bleed-through bug came from this layering. Remove `#homeMap`, `#daySheet`, `#homeDock`, `#briefCard`, `#panelHome` and their CSS and JS.

**1.2 One page system.** The core areas (Plan, Money, Body, Kitchen, Places) open through the old `AREAS` sheet. The other ten open *inside* the "All areas" sheet. Symptoms:
- Double headers on Car, Closet, Documents, etc.: "‹ Home / All areas" **and** "‹ All areas / 🚗 Car".
- Titles come from old `AREAS.title`, so the dock says **Kitchen / Body / Places** but pages say **Food / Health / Map** (roadmap #6).
- Life areas use emoji icons and core areas use line icons.
Make every area one page type, driven by `AREAS2`: one header, one title source, one icon set.

**1.3 One tab component.** There are six: `ia2-subtabs`, `seg` (Plan, Money, Todos), `wardrobe-tabs`, `ms-tabs` (map sheet), the Food tabs and the Health tabs. Several overflow with no hint (Money shows "Accour…", Food shows "Recipe…"). Use one scrollable segmented control with a sliding indicator and edge fade.

**1.4 Collapse the CSS.** About 20 stacked build layers, **368 `!important`**, `.chip` defined 14 times, `.sheet` 11 times, `.composer` 8 times. Polish v1 is the natural moment to replace them with one token sheet plus components.

**1.5 Fonts.** The page downloads Schibsted Grotesk *and* IBM Plex, but ia2 overrides Schibsted, and DESIGN.md says SF Pro. Switching to the system font removes two web-font downloads and makes first paint faster.

**1.6 One place per thing.** The Inbox appears as a header button with a badge, a Home widget **and** an All tile. "Money left" appears as a page subtitle, the hero card **and** the All tile readout, with account cards above the tabs too (roadmap #3, #5). Pick one home for each.

**1.7 Small cleanup.** Two `if(false){…}` blocks, `briefRow` unused, the old `tabbar` nav, and `AREA_COLORS` overridden to white by a later `!important`.

## 2. Information architecture

**2.1 Real URLs (`#/money/transactions`).** Areas are opened as a modal "dialog" with no URL. Hash routes would give you:
- A working edge-swipe back via browser history (roadmap #1). Today the only touch handlers are swipe-to-act on list rows and pinch-zoom blocking; nothing handles back.
- Widgets that deep-link to the exact view (roadmap #7).
- Restoring the screen you were on when iOS reloads the home-screen app.

**2.2 Bottom padding under the dock.** Content ends behind the floating dock (the Car legend and Money's "Spending by day" are covered). Pad every page by the dock height plus the safe area.

**2.3 Page-level fixes seen in the screenshots**
- **Plan:** Later / Someday / Done tabs sit at the very bottom, under triage. Move them to the top as one tab row. The add-row text field is squeezed to "Add a t". "Events, todos, meals, bills" is filler copy. "1 todo need a decision" should read "needs".
- **Kitchen:** opens on *Fridge* instead of Kitchen, with 6+ tabs. Merge Fridge and Kitchen stock, and open on what you can make.
- **Places:** the bottom sheet opens with tabs and an empty body. Open it at peek height with Timeline already showing.
- **Money:** remove the account cards above the tabs (they belong in Accounts) and open on pace (roadmap #3).
- **Header:** drop "‹ Home" and "Updated Xm ago" (roadmap #1, #2). Show one sync status line in the dock area instead.

## 3. Visual richness

**3.1 Chart labels render in a serif font (bug).** 6 of the 9 SVG `<text>` elements have no font, so the pace chart's day letters and the Steps ring's "163%" fall back to Times. One rule fixes them all: `svg text{font-family:var(--sans)}`.

**3.2 Page icon tile is plain white.** A later override sets `.page-ico` to `var(--text)`, which kills the per-area colours. Use a sage or area tint.

**3.3 Fewer mono ALL-CAPS labels.** Every widget label is mono uppercase (DAY SO FAR, INBOX, STEPS…), plus mono body text in the All tiles ("1 ready · 2 at home"). DESIGN.md already asks for fewer. Keep mono for numbers only.

**3.4 Charts that use data you already load.**
- Money hero: a 7-day spend sparkline under the number, plus a category bar strip.
- Steps widget: a 7-day mini bar chart instead of a lone ring.
- Sleep widget: last night's stage bar (it already exists on the Body page).
- Recurring: a "next 30 days" timeline strip.
- Places: visit heat by hour or weekday in Insights.

**3.5 Colour meaning.** The Body ring for steps is red at 163% of usual, but red reads as "bad". Keep red/coral for over-budget and overdue only (DESIGN.md: coral = over/destructive).

**3.6 Empty states.** Most are a single grey sentence ("No meal plan yet."). Use the Otto ring empty state from Polish v1 with one action button.

## 4. Motion (the "less clunky" part)

**4.1 Page transitions.** Pages fade in at 0.14 s with no direction. Use the View Transitions API (supported in iOS 18 Safari for same-page changes): slide in from the right on open, reverse on back, and morph the tapped widget into the page header. Wrap it so reduced motion falls back to an instant change.

**4.2 Tab transitions.** Tabs replace content instantly via `innerHTML`. Slide the indicator under the tabs and crossfade or slide the content by direction (about 200 ms).

**4.3 Stop re-render flicker.** Batch renders into one per animation frame instead of 13 per load. Patch widgets in place instead of rewriting the whole grid. Keep one mini-map instance and call `setView` rather than rebuilding it.

**4.4 Haptics don't work on iPhone.** `hapticPulse()` uses `navigator.vibrate`, which iOS Safari doesn't support, so all 44 haptic calls do nothing. iOS 18 Safari gives a real tick when a hidden `<input type="checkbox" switch>` is toggled. Wire `hapticPulse` to that.

**4.5 Micro-motion.**
- Count numbers up when they change (money left, steps).
- Animate todo check-off and removal (strike, then collapse).
- Spring the sheet snap points.
- Add a press scale to all tappable cards. Widgets have one now; area tiles and rows don't.

**4.6 Loading.** There is a mix of shimmer skeletons and 7 plain "Loading…" strings. Use skeletons everywhere, and keep the cached Home showing until fresh data arrives.

## Suggested order (each a revertable build)
1. **.56 Cleanup:** delete old Home layers (1.1), fix the serif chart text (3.1) and the dock padding (2.2). Lowest risk, biggest speed win.
2. **.57 One page system + routes:** 1.2, 2.1, titles and icons, drop "‹ Home" and "Updated". Edge-swipe back comes with it.
3. **.58 One tab component + page transitions:** 1.3, 4.1, 4.2, 4.3.
4. **.59 Polish v1 tokens:** 1.4, 1.5, 3.2, 3.3, 3.5. This is a big CSS removal.
5. **.60 Richness:** 3.4 charts, 3.6 empty states, 4.4 haptics, 4.5 micro-motion, 1.6 de-duplication.
