# Otto design notes

## Information architecture (decided Oct 25–26, 2026)
- Tab bar picks the **area**, section tabs pick the **view**, toggles change **how** a view is shown.
- Dock: Today + up to 3 pins + All (iOS "More" + customizable dock + App Library launcher). Floating, collapses to a pill on scroll.
- One entry for search/ask/add: the Otto ring button. Inbox = only things that need him.
- Home = bento widget grid; tap a widget to go deeper. Every area = full tab with section tabs.
- Canvas with all screens: https://claude.ai/artifact/F8M3EhNKXwbrbg5mZ6YFfm (pages: Polish v1, Final design, Explorations).

## Brand (from the app icon)
- Icon: white ring on a sage gradient `#8BBCA1 → #6C9D82`. Ring = Otto: ask button, chat avatar, thinking pulse, launch screen. Gradient only on the Otto button.

## Polish v1 (proposed, approved "for now")
- Neutrals tinted toward sage: bg `#0C0F0E`, surface `#151A18`, raised `#1C2220`, hairline `#28302C`, ink `#ECF1EE`, muted `#9DA8A2`.
- Sage `#8BBCA1` = tappable/selected; deep sage `#6C9D82` = pressed. Amber `#E9B35C` due soon, coral `#EF7A52` over/destructive, sky `#8FB4E8` neutral data. "Good" = ✓ + text, never color alone.
- Type: SF Pro (system font) with Apple sizes (34 large title, 22, 17 headline/body, 15, 13 footnote), tabular digits for numbers; fewer ALL-CAPS labels.
- Buttons: primary (filled sage, dark text `#0E1F16`), secondary (sage tint), plain (sage text), destructive (coral text); 44 pt minimum; press feedback.
- Radii: cards 22, buttons/fields 14, chips round. Large titles collapsing on scroll, edge-swipe back, one sheet style (grabber, drag, snap, dim), shimmer skeletons, ring empty states, haptics.
- Accessibility: WCAG 2.2 AA (contrast ≥ 4.5:1, 44 pt targets, labels, reduced motion respected).
