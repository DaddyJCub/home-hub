# HomeHub — Full Review & Enhancement Roadmap (July 2026)

_Reviewer pass across all three surfaces of the JCubHub HomeHub experience:_

1. **Standalone app** — `home-hub` (React 19 + Vite + Express/better-sqlite3 PWA)
2. **CM native module** — `jcubhub-central-management/frontend/src/modules/homehub` (native port over the `homehub/0.1.0` contract, no WebView)
3. **Wall kiosk** — `jcubhub-central-management/frontend/src/wall` (device-token tablet dashboard)

This supersedes the older `REVIEW_SUMMARY.md` / `CODE_REVIEW_AND_IMPROVEMENTS.md`, several
recommendations of which have since shipped (rate limiting, server-side Zod validation,
recipe→shopping scaling, CM module CRUD parity). Where those are done, they're marked ✅ below.

---

## 1. Current state — what's solid

**Standalone app.** Mature and broad: dashboard, chores (rotation, streaks, rooms,
priorities, AI suggestions), calendar (recurrence), meals + recipes (with scaling into
shopping), shopping (categories/stores/filters/sort), projects (kanban), personal tasks.
Strong platform layer: PWA + offline queue, push, pull-to-refresh, swipe nav, theming,
bug tracker, onboarding checklist, diagnostics panels. Server now has `express-rate-limit`
and Zod request validation, WAL SQLite, bcrypt auth, SMTP reset.

**CM native module.** Has reached **broad parity** with the standalone since the old
backlog was written — all eight sections render with full create/edit/delete, chore
rotation/streaks/history, meal auto-plan, "generate shopping from meals", projects kanban,
and AI (chore suggestions, natural-language add, meal-plan AI) gated on an Ollama status
probe. Deliberately not ported (CM's shell owns them): auth, push/PWA, diagnostics, bug
tracking, app settings.

**Wall kiosk.** Clean Home-Assistant tile board (toggle/cover/lock/climate/media/sensor),
camera-on-motion, alerts with mute/ack, night dimming, HA Lovelace embed, pairing by
device token. **HomeHub is already reachable here** — a `WALL_SHORTCUTS` entry
(`{"label":"Home Hub","url":"/apps/home-hub"}`) puts a header button on the wall that opens
the **full HomeHub app embedded inside the kiosk** (`openShortcut` → the "dashboard" embed
view), keeping the wall bar on top so the kiosk stays sealed. URLs are sanitized to
same-origin/http(s) in `parse_wall_shortcuts`. So the wall runs the whole interactive app,
not nothing — the gap is a _glanceable native summary_, not integration itself (see E1).

---

## 2. Fixes & polish shipped in this pass (cross-surface)

Focus per the owner's direction was **cross-surface UX polish** — verifiable, low-risk,
parity-closing changes in both the standalone app and the CM module.

### 2.1 Recoverable deletes everywhere (safety) ✅ shipped
A destructive tap on a shared household screen was only partially recoverable:

| Surface | Before | After |
| ------- | ------ | ----- |
| Standalone — chores | Undo toast ✅ | unchanged |
| Standalone — shopping, meals, calendar, tasks, projects | delete → success toast, **no recovery** | **Undo toast** (`src/lib/undo.ts`) |
| CM module — all 7 collections | Confirm dialog, but **no post-confirm recovery** | Confirm **+ Undo toast** (`components/undo.tsx`, `<UndoHost/>`) |

- Standalone: new `toastWithUndo()` + `restoreItem()` helpers; the restore is a functional
  `useKV` update guarded against double-restore. Calendar restores the parent event **and**
  its real recurrence instances. Unit-tested in `tests/vitest/undo.test.ts`.
- CM module: a self-contained pub/sub undo host (no prop-drilling through 8 sections). The
  confirm-dialog copy that claimed "This can't be undone" was corrected, since it now can.

Both apps typecheck clean, build clean, and the standalone unit suite (26 tests) is green.

---

## 2.2 Wall "Household Today" glance (E1) ✅ shipped

Built in `jcubhub-central-management`. The tiles view now shows a native household
glance above the smart-home tiles — chores due today (tap to complete), today's meals,
today's agenda, and the top of the shopping list (tap to check off) — with check-offs
gated on the device's `allow_control`.

- **Backend:** `GET/PUT /api/wall/homehub` (device-token authed) + `app/wall/homehub.py`.
  CM mints a short-lived, least-privilege broker token for a configured identity
  (`WALL_HOMEHUB_IDENTITY_EMAIL`) and reads/relays over the `homehub/0.1.0` native
  contract at `MODULE_HOMEHUB_API_BASE` — the tablet never holds a HomeHub credential.
  Unit-tested (`tests/unit/test_wall_homehub.py`, 5 tests).
- **Frontend:** self-contained `src/wall/HomehubGlance.tsx`, polled on its own cadence,
  hides itself when unconfigured/unreachable. **Reuses** the module's `choreUtils` for
  completion math (no Python re-implementation → no drift).
- CM native-only check, `tsc -b`, `vite build`, and backend tests all pass.

## 3. Ten enhancements to make managing the home easier

Ranked by value-to-effort. Each is written to land in **all three surfaces** (or notes why
it can't) so the "build once" seam holds. Competitive framing draws on how Cozi, OurHome,
Skylight, Hearth, and Fami package the same jobs (sources at the bottom).

### E1 — Wall "Household Today" glance (native summary, not a full-app embed)  ✅ SHIPPED
The glanceable layer a family display needs (per Skylight/Hearth): today-at-a-glance
_without a tap_ — chores due today + who's assigned, today's meals, today's agenda, and the
top of the shopping list, inline on the tile board and readable from across the room, with
tap-to-complete for chores and tap-to-check-off for shopping. See §2.2 for the build. (The
`WALL_SHORTCUTS` embed of the full app remains as the deep-interaction fallback.)

### E2 — Chore rewards / points & celebrations
Chores already track streaks; add **points per chore → weekly leaderboard + milestone
celebrations** (Skylight "stars & rewards", OurHome points). Kid-friendly motivation.
- Add `points?: number` to `Chore`; a derived per-member weekly tally in Dashboard.
- Confetti/toast on 7-day streak and every 25 completions. Shared helper usable by both
  React surfaces; the wall shows the current leaderboard.

### E3 — Voice & photo capture ("Add milk", snap a flyer)
Nori/Cozi's headline convenience. Add a mic button to shopping/tasks quick-add using the
Web Speech API (progressive-enhancement; hide when unsupported), and a "scan a flyer/receipt"
path that runs the existing Ollama vision prompt to extract items/events.
- Standalone + CM both already have quick-add inputs to hang this off.

### E4 — Calendar conflict & double-book detection
Surface overlaps at create time and on the agenda ("2 events overlap 5–6pm"). Pure client
logic in a shared `detectConflicts(events)` util — unit-testable, drops into both calendar
sections and the wall agenda. (Listed in the old review, still not built.)

### E5 — Recurring shopping templates / "usual" lists
Save a named list ("Weekly staples", "Costco run") and re-add it in one tap; auto-suggest
frequently-bought items from history. Complements the existing meals→shopping generator.
- New `shopping-templates` KV collection; add/apply UI in both shopping sections.

### E6 — Household finance / shared expenses MVP
The biggest retention lever the app is missing (no `budget`/`expense` types today). A light
"who paid / who owes" ledger with per-category monthly budgets and auto-settlement between
members. Ties into projects (estimated vs actual cost already exists).
- New `expenses` + `budgets` collections; a Dashboard summary card; contract additions for CM.

### E7 — Meal-plan intelligence: leftovers, variety, and auto-generated lists
Extend the existing auto-planner: avoid repeating a dinner within N days, roll a cooked
recipe forward as "leftovers", and one-tap "build this week's shopping list" (scaling by
servings — the scaling math already exists for single recipes).

### E8 — Inventory & maintenance reminders ("where is X?", "replace the filter")
Track household items, warranties, and recurring maintenance (HVAC filter, smoke-detector
batteries) with due reminders routed through the existing notification/push pipeline. Solves
a job none of the consumer apps do well; strong tie-in to projects.

### E9 — Smarter, adaptive notifications + quiet hours
Today notifications fire on fixed rules. Make reminders adaptive to completion patterns
(nudge before the time a chore is _usually_ done), batch the morning digest, and respect a
household quiet-hours window (the wall already has night mode — share that config).

### E10 — At-a-glance widgets & "Focus/Morning" mode
- Home-screen/PWA widgets (today's chores, next event) and a wall **Morning view** (weather +
  agenda + first chores) that the kiosk auto-shows during a configurable window, reusing the
  existing idle/night-view machinery.
- A dashboard "Focus" toggle that collapses to just what's due today.

### Honorable mentions (quick wins)
- **List search** on chores/tasks (shopping/projects already filter).
- **Biometric unlock** (WebAuthn) for the PWA.
- **Dietary tags** on recipes with meal filtering.
- **ICS calendar import/subscribe** (Google/Apple/Cozi sync is table-stakes for family apps).

---

## 4. Cross-surface parity matrix (post-pass)

| Capability | Standalone | CM module | Wall kiosk |
| ---------- | :--------: | :-------: | :--------: |
| Chores CRUD + rotation + streaks | ✅ | ✅ | — (E1/E2) |
| Calendar CRUD + recurrence | ✅ | ✅ | — (E1) |
| Meals + recipes + auto-plan | ✅ | ✅ | — (E1) |
| Shopping + generate-from-meals | ✅ | ✅ | — (E1) |
| Projects kanban / tasks | ✅ | ✅ | n/a |
| Recoverable deletes | ✅ (now all) | ✅ (now all) | n/a |
| AI (chore/meal/NL-add) | ✅ | ✅ (Ollama-gated) | n/a |
| Auth / push / PWA / diagnostics | ✅ | shell-owned | shell-owned |
| Full HomeHub app on the wall | n/a | n/a | ✅ (embedded via `WALL_SHORTCUTS`) |
| Glanceable HomeHub summary on the wall | n/a | n/a | ✅ (E1 shipped) |
| Wall tap-to-complete chores / check-off shopping | n/a | n/a | ✅ (E1, `allow_control`-gated) |

---

## 5. Architectural notes worth deciding early

- **Whole-collection writes are last-write-wins.** Both the standalone `useKV` and the CM
  contract `PUT /household/:key` replace the entire array. With two members editing at once,
  one can silently clobber the other. Before building E5/E6 CRUD on top, evolve the contract
  to item-level endpoints (`POST/PATCH/DELETE /household/chores/:id`) or add an
  ETag/If-Match optimistic-concurrency check. Fixing it in the contract benefits both clients.
- **Bundle size.** Both apps ship a single ~1.4–1.5 MB JS chunk; introduce route-level
  `import()` splitting (sections are the natural boundary).
- **The "build once" seam.** Shared domain logic (chore scheduling, conflict detection,
  meal-plan rules) should live behind the contract or in a shared lib so a fix lands in every
  surface. E4's `detectConflicts` is a good first shared util to prove the pattern.

---

## 6. Sources (competitive research)

- Nori — Best Family Organizer App 2026: https://heynori.com/blog/family-operations-system/best-family-organizer-app
- KidKarma — Best Chore Apps 2026: https://kidkarma.app/compare/best-chore-apps/
- SameNest — Best Household Management Apps 2026: https://www.samenest.com/blog/best-household-management-apps-2026/
- The Quality Edit — Hearth vs. Skylight (2026): https://www.thequalityedit.com/articles/hearth-vs-skylight-review
- Skylight Calendar (chores, stars & rewards, meal plan, grocery): https://www.amazon.com/Skylight-Calendar-Touchscreen-Interactive-Schedules/dp/B0C9V811L6
- Quicken — Apps to manage family responsibilities 2026: https://www.quicken.com/blog/best-apps-to-manage-family-responsibilities-and-collaboration-in-2026/
