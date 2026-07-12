# HomeHub CM-module — improvement backlog

Insider gap list from whoever builds next. The CM `homehub_module` (`jcubhub-central-management/frontend/src/modules/homehub/`) is a deliberate **v0.1 slice** over the `homehub/0.1.0` contract. This is what's thin, roughly prioritized. Pair it with the Cowork browser report (`HOMEHUB_MODULE_BROWSER_TESTPLAN.md`) for observed evidence.

## Current module coverage (as shipped)
| Tab | Read | Create | Toggle | Edit | Delete |
|-----|------|--------|--------|------|--------|
| Chores | ✅ | ❌ | ✅ complete | ❌ | ❌ |
| Shopping | ✅ | ✅ add | ✅ purchased | ❌ | ❌ |
| Meals | ✅ | ❌ | — | ❌ | ❌ |
| Calendar | ✅ | ❌ | — | ❌ | ❌ |
| Tasks | ✅ | ✅ add | ✅ complete | ❌ | ❌ |
| Recipes | ❌ (not rendered) | — | — | — | — |
| Home-projects | ❌ (not rendered) | — | — | — | — |

Note: `recipes` and `home-projects` are **already in the contract allowlist** and returned by `/dashboard` — they just aren't rendered. Adding those tabs is pure frontend work, no backend change.

## P0 — makes the module frustrating / "doesn't make sense to end users"
1. **No delete anywhere.** You can add a shopping item or task but never remove one. Add delete (✕) to chores, shopping, tasks (and meals/calendar once they're writable). Trivial with the existing pattern: filter the array, `putHousehold`/`putUser`.
2. **Chores are toggle-only** — no way to add or edit a chore from the module. Add an "Add chore" input (mirror Shopping/Tasks) and basic edit.
3. **Meals & Calendar are read-only.** Add create/edit/delete so they're actually usable, not just viewers.
4. **Recipes and Home-projects tabs missing** entirely though the data is already fetched.

## P1 — capability & detail gaps
5. **No detail/edit views.** Shopping (quantity/category/store/priority/notes), chores (room, assignee, frequency, priority, due date), tasks (priority/due/category/description), meals (type/servings/recipe link), events (time/location/category/attendees) are all stored but neither shown nor editable.
6. **No filtering / sorting / search** on any list.
7. **Calendar is a flat list** — no month/week view or date navigation.
8. **Meals** — no recipe linking, week navigation, or servings.
9. **Household switcher missing.** The broker maps a user to their *default* household only; the standalone app supports switching. Needs a contract addition (list households + select) if multi-household matters here.

## P2 — platform / polish
10. **Respect the feature-flag gate.** `/api/native/homehub/features` returns `{intake_complete:false, features:[]}` — the module should read it and show onboarding / hide unfinished areas instead of ignoring it.
11. **Sync-status + offline.** The standalone `useKV` has an offline queue + sync indicator; the module has neither. Surface save failures better than a single note line.
12. **Loading skeletons + empty-state CTAs** (currently a bare spinner / "No X yet.").
13. **Visual parity pass** against CM tokens (spacing, list density, priority affordances).

## Architectural note worth deciding early (multi-user safety)
The contract mutates **whole collections** (`PUT /household/chores` replaces the entire array). With two household members editing at once this is **last-write-wins** — one person's change can silently clobber another's. Before building lots of CRUD on top, consider evolving the contract to **item-level** endpoints (`POST /household/chores`, `PATCH/DELETE /household/chores/:id`) or an ETag/If-Match optimistic-concurrency check on the array. The standalone web app has the same whole-blob risk today, so fixing it in the contract benefits both clients (the "build once" seam).

## Suggested first PR for the next chat
P0 items 1–2 (delete + add-chore) + item 4 (render recipes/home-projects read views) — all frontend-only, high user-visible payoff, no contract change. Then decide the item-level-endpoint question before P1 edit views.
