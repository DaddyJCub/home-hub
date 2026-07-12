# HomeHub Module — Browser Test Plan (for Claude Cowork in Chrome)

**Goal of this run:** exercise the HomeHub app *inside JCubHub CM* end-to-end, record
what works and what's broken/missing, and produce a structured report. The report will be
used in a separate session to plan improvements — so **be specific, note anything that
feels incomplete, and capture screenshots** at each ❗ checkpoint.

## How to run this (instructions for the browser agent)
- Work top to bottom. Do **not** skip steps.
- For **every** step, record one of: ✅ pass / ⚠️ partial / ❌ fail / ⛔ blocked, plus a
  one-line note of what you actually saw.
- Take a screenshot at each step marked 📸.
- If a step can't be performed (element missing, page errors), mark ❌/⛔, screenshot, and
  **continue** to the next step — don't stop the whole run.
- Do not create destructive/irreversible data. Use clearly-labeled test items
  (e.g. "COWORK TEST — delete me").
- At the end, fill in the **Report template** section.

## Fill these in before starting
- **CM URL:** `https://mgmt.jcubhub.com`  (the Central Management app)
- **HomeHub standalone URL:** `__________________`  (ask the user if unknown)
- **Login:** you will authenticate via Authentik when prompted; use the operator's session.

---

## Section A — Access & load
1. Go to the **CM URL**. 📸 Record whether you land logged-in or hit an Authentik login; if
   login is required, complete it.
2. Confirm the left nav shows items like Dashboard, Inbox, Services, … **Apps**, Settings.
3. Click **Apps** in the left nav. ❗📸
   - ✅ = the Apps area loads without a red error banner.
   - ❌ = note the exact error text (e.g. "A service is temporarily unavailable",
     "Network problem"). This indicates the identity broker or module fetch failed.
4. Locate a **HomeHub** entry/card/tab within Apps. ❗
   - Note how it's presented (a card in a grid? a tab? a nav item?).
   - If HomeHub is **not** present at all, mark ❌ and skip to Section H (still do the
     standalone comparison).
5. Open the **HomeHub** module. ❗📸 Record: does it show a loading spinner that resolves,
   an error, or content?

## Section B — Dashboard / first render
6. Observe the HomeHub module's initial screen. ❗📸 Record every UI element you see:
   header/title, a row of tabs, any counts/summary, empty-states.
7. Confirm a row of tabs exists. Expected: **Chores, Shopping, Meals, Calendar, Tasks**.
   Record the **actual** tabs present (there may be fewer/more). ❗
8. Note load time and whether data appears to be real household data vs. empty.

## Section C — Chores tab
9. Click the **Chores** tab. 📸 Record: list of chores? empty-state? error?
10. If chores exist, click the **circular check/toggle** on the first chore. ❗
    - Expected: it marks complete (strikethrough/greyed) and sinks to the bottom.
    - Record what actually happens; note any lag or flicker (optimistic update).
11. Reload the whole page (F5), reopen Apps → HomeHub → Chores. ❗
    - Expected: the chore you toggled is **still** in the state you left it (persisted).
    - Record pass/fail — this tests the write actually saved server-side.
12. Note what chore detail is shown (title only? room, assignee, frequency, priority,
    due date, streaks?). List fields **visible** vs **absent**. ❗ (gap audit)
13. Look for any way to **add / edit / delete / assign** a chore. Record which of these
    actions exist. ❗ (Expect: likely none — note it.)

## Section D — Shopping tab
14. Click **Shopping**. 📸 Record list vs empty-state.
15. In the "Add an item…" field type `COWORK TEST — milk` and press Enter (or click Add). ❗
    - Expected: item appears in the list immediately.
16. Reload the page, return to Shopping. ❗ Expected: `COWORK TEST — milk` persisted.
17. Toggle the item's checkbox (mark purchased). ❗ Record: strikethrough + moves to
    purchased section?
18. Note what item detail is shown (name, category, quantity, priority, store, notes).
    List visible vs absent fields. ❗ (gap audit)
19. Look for edit/delete/clear-purchased/category-grouping controls. Record which exist. ❗

## Section E — Meals tab
20. Click **Meals**. 📸 Record: meals grouped by date? by meal type? empty-state?
21. Record what's shown per meal (name, type, servings, linked recipe?). ❗
22. Look for **add meal / plan meal / view recipe / week navigation** controls. Record
    which exist. ❗ (Expect mostly read-only — note it.)

## Section F — Calendar tab
23. Click **Calendar**. 📸 Record: a list of events? an actual calendar grid? empty-state?
24. Record per-event detail shown (title, date, time, location, category, attendees). ❗
25. Look for add-event / month view / navigation. Record which exist. ❗

## Section G — Tasks tab
26. Click **Tasks**. 📸 Record list vs empty-state.
27. Type `COWORK TEST — call dentist` in the add field, submit. ❗ Expect it appears.
28. Reload, return to Tasks. ❗ Expect persisted.
29. Toggle it complete. ❗ Record behavior.
30. Note visible vs absent task fields (priority, due date, category, description). ❗

## Section H — Cross-client sync (the key integration proof)
> Requires the **HomeHub standalone URL**. If unknown, ask the user and otherwise skip H.
31. Open the **HomeHub standalone app** in a new tab and log in. 📸
32. Go to its **Shopping list**. Confirm `COWORK TEST — milk` (added in step 15) is present. ❗
    - ✅ = server-backed sync between CM module and standalone app works.
    - ❌ = they're not sharing data — record this clearly (major finding).
33. In the **standalone** app, add a chore or shopping item named `COWORK TEST — sync back`.
34. Return to the **CM module** tab, reload, check the same list. ❗ Expect the new item
    appears. Record result.

## Section I — Permissions / capability behavior (only if you can switch users)
35. If a second, non-owner account is available, log into CM as that user and open Apps. ❗
    Record whether HomeHub appears or is hidden (deny-by-default is expected for users
    without the `apps.homehub` permission). If no second account, mark ⛔ skipped.

## Section J — Errors & polish
36. While in the HomeHub module, open Chrome DevTools → **Console** and **Network**. 📸
    Record any red console errors, and any failing (4xx/5xx) or CORS-blocked requests to
    `/api/native/homehub/*`.
37. Note overall visual polish: does the module match CM's dark indigo/zinc theme? Any
    broken layout, overflow, unstyled elements, or misaligned controls? 📸
38. Try the browser **Back** button after navigating between tabs — does state/navigation
    behave sanely? Record.

## Section K — Feature-gap audit (MOST IMPORTANT for the follow-up)
> The user says "a lot is missing." Systematically compare the **CM HomeHub module** to the
> **standalone HomeHub app** and enumerate the delta.
39. In the standalone HomeHub app, open the main navigation and **list every section/feature
    it offers** (e.g. Chores, Shopping, Meals, Recipes, Calendar, Projects, Tasks, Settings,
    dashboards, insights, etc.). 📸
40. For **each** standalone feature, mark whether the CM module has it: **Present / Partial /
    Missing**. Build this as a table in the report.
41. For features that exist in both, note capabilities the module lacks (add/edit/delete,
    filtering, sorting, detail views, sub-features like chore rotation/streaks, recipe
    linking, calendar month view, categories, assignments, notifications).
42. Call out anything that looks **half-built or confusing to an end user** (dead buttons,
    read-only where you'd expect to edit, empty tabs, missing counts).

---

## Report template (fill this in and hand back)

### 1. Environment
- CM URL, HomeHub URL, date/time, which account(s) used.

### 2. Access result
- Did Apps load? Did the HomeHub module load? First-render screenshot + any error text.

### 3. Step results table
| Step | Area | Result (✅/⚠️/❌/⛔) | What you saw |
|------|------|--------------------|--------------|
| 3 | Apps loads | | |
| 5 | Module loads | | |
| 10–11 | Chore toggle + persist | | |
| 15–16 | Shopping add + persist | | |
| 27–29 | Task add/toggle/persist | | |
| 32 | Cross-client sync | | |
| 36 | Console/network errors | | |
| … | | | |

### 4. Feature-gap matrix (from Section K)
| Standalone HomeHub feature | In CM module? | Missing capabilities / notes |
|----------------------------|---------------|------------------------------|
| Chores | Present/Partial/Missing | |
| Shopping | | |
| Meals | | |
| Recipes | | |
| Calendar | | |
| Projects / other | | |
| Tasks | | |
| … | | |

### 5. Bugs & broken things
- Numbered list: what, where (tab/step), screenshot ref, severity (blocker/major/minor).

### 6. Top 5 gaps to fix first (your recommendation)
- Ranked list with a one-line rationale each.

### 7. Screenshots
- Attach all 📸 with step numbers.
