# HomeHub – Quality-of-Life & Improvement Roadmap

**Scope**: This document lists **only improvements to the existing app** (UX, robustness, performance, security, maintainability). It intentionally **does not introduce any brand‑new product areas** (no finance, inventory, etc.).

Use this as a backlog you can pull from and prioritize. Each item includes:
- **Priority** (P0 = must-have, P1 = important, P2 = nice-to-have)
- **Area** (feature or layer it affects)
- **Goal** (what gets better for the user or devs)
- **Detailed implementation steps**

---

## P0 – Stability, Data Integrity, and Core UX

These are the "make the app feel bulletproof" items. They focus on auth, validation, persistence, error handling, and making the first‑time experience solid.

### P0.0 First-Time Setup & Onboarding Flow
**Area**: Initial setup / Dashboard / Settings  
**Goal**: Make it easy for a brand‑new user to go from "blank app" to a minimally useful setup (household + first chores/recipes/events) in just a few guided steps.

**Implementation Steps**
1. **Detect first‑time users/households**
  - On successful signup and first login, set a user‑scoped preference key (e.g., `hh_onboarding_complete = false`) via the existing data persistence endpoints.
  - Treat households with no chores, shopping items, meals, recipes, or events as "not yet set up".

2. **Add an onboarding checklist card on the dashboard**
  - In `DashboardSection`, render a prominent but dismissible card when onboarding is incomplete, with steps such as:
    - Confirm household name
    - Add at least one household member
    - Create your first chore
    - Create your first shopping item
    - Create your first event or meal
  - Mark steps as complete based on existing data; persist completion in user/household preferences.

3. **Provide guided creation for the first few items**
  - For the first time a user creates a chore/recipe/event, show a short helper text or tooltip explaining what makes a "good" entry (title examples, frequency suggestions, etc.).
  - Offer 2–3 one‑click templates (e.g., "Dishes", "Laundry", "Take out trash") that pre‑fill the chore form.

4. **Offer a "Skip for now" and "Restart onboarding" option**
  - Let users skip the checklist completely; record this so it doesn’t keep reappearing.
  - Add a Settings entry (e.g., "Restart setup guide") that resets the onboarding preference and shows the checklist again.

5. **Ensure onboarding works well in offline/PWA mode**
  - Verify that the onboarding checklist and first‑item creation work correctly even if the user goes offline after the first visit.

---

### P0.1 Robust Server-Side Validation for All Entities
**Area**: API / Data integrity  
**Goal**: Prevent bad data from ever entering SQLite and give users clear, specific error messages.

**Implementation Steps**
1. **Introduce shared validation schemas on the server**
  - Create `server/validation.js` (or similar) that uses `zod` (already in dependencies) to define schemas for:
    - `UserSignup`, `UserLogin`
    - `Chore`, `ShoppingItem`, `Meal`, `Recipe`, `CalendarEvent`
  - Mirror the shape from `src/lib/types.ts` and `src/lib/validators.ts`.

2. **Wire schemas into Express routes**
  - In `server.js`, before operating on `req.body`, validate it:
    - `UserSignupSchema.parse(req.body)`
    - `ChoreSchema.parse(req.body)` for chore create/update, etc.
  - On validation failure, return `400` with a clear message `error: 'Chore title is required'` or similar.

3. **Align client-side validators with server logic**
  - Reuse the same rules in `src/lib/validators.ts` (or move to a shared module) so the UI catches issues **before** they hit the server.
  - Ensure every form (chores, shopping, meals, recipes, events) calls its validator before submitting.

4. **Add tests for critical schemas**
  - Create a minimal test suite (Node `node --test` or Vitest) that verifies:
    - Invalid payloads are rejected with `400`.
    - Required fields and max lengths are enforced.

---

### P0.2 Consistent, Helpful Error Messages End-to-End
**Area**: UX / Error handling  
**Goal**: Replace generic "something failed" errors with actionable, consistent messages.

**Implementation Steps**
1. **Standardize API error format**
  - In `server.js`, ensure all error responses follow `{ error: string, code?: string }`.
  - For known cases (e.g., auth, permissions, validation), set a stable `code` like `INVALID_CREDENTIALS`, `PERMISSION_DENIED`, `VALIDATION_ERROR`.

2. **Centralize client error handling**
  - In `src/lib/api.ts`, when a non-OK response arrives, forward both `message` and `code`.
  - Extend `ApiError` to include `code?: string`.

3. **Use one helper to map errors to toasts**
  - In `src/lib/AuthContext.tsx` and sections under `src/components/sections/`, replace ad‑hoc toast messages with a helper like `showUserFriendlyError(error, fallbackMessage)`.
  - Map `code` to friendly copy: e.g. `INVALID_CREDENTIALS → 'Email or password is incorrect.'`.

4. **Surface inline form errors**
  - For main forms (login/signup, add/edit chore, shopping item, meal, recipe, event), wire validation errors to:
    - Highlight the specific field.
    - Show the error below the input.
  - Keep the toast as a summary, but rely primarily on inline hints.

---

### P0.3 Authentication & Session UX Polish
**Area**: Auth / Sessions  
**Goal**: Make login/signup/logout and session recovery smooth and predictable.

**Implementation Steps**
1. **Audit current auth flows**
  - Review `src/components/AuthPage.tsx`, `src/lib/AuthContext.tsx`, and `/api/auth/*` handlers in `server.js`.
  - Document all current states: loading, success, invalid credentials, locked out, unknown error.

2. **Improve initial session load behavior**
  - In `AuthProvider.loadSession`, ensure the app clearly distinguishes:
    - "Checking session" (splash/loader state).
    - "Not logged in" (show AuthPage only after check completes).
  - Avoid flicker between dashboard ↔ login on refresh.

3. **Add clear logout and session-expired handling**
  - When `/api/auth/me` returns 401 after a period of inactivity, show a dedicated toast and redirect to login with a message like "Your session expired. Please sign in again.".
  - Ensure `logout` clears all user‑scoped localStorage keys used by `src/shims/spark-hooks.ts` so the next login starts clean.

4. **Confirm password rules and feedback**
  - On signup, enforce and display password requirements (length, complexity if desired).
  - Provide real‑time feedback in `AuthPage` instead of failing only after submit.

---

### P0.4 Data Integrity & Household Scoping Checks
**Area**: Chores / Shopping / Meals / Recipes / Calendar  
**Goal**: Guarantee all data is correctly scoped to the current household and avoid cross-household leaks.

**Implementation Steps**
1. **Verify householdId is always set on writes**
  - For create/update calls for chores, shopping items, meals, recipes, and events:
    - Confirm the server sets `household_id` based on `req.auth.householdId` instead of trusting the client.
  - Adjust code in `server.js` where necessary.

2. **Enforce household filters on reads**
  - Make sure every `SELECT` for user data uses the `household_id` from auth / query param, not just `user_id`.
  - Double‑check helpers that fetch lists for dashboard and sections.

3. **Align client filtering**
  - In each section component under `src/components/sections/`, ensure that in‑memory lists are filtered by the current household from `useAuth()`.
  - Use small `useMemo` helpers like you already do in `IntegrityDiagnostics` to avoid mistakes.

4. **Use Integrity Diagnostics as a safety net**
  - Expand `src/components/IntegrityDiagnostics.tsx` to:
    - Check for missing `householdId` on entities.
    - Offer one‑click fixes (e.g., assign current household where safe).

---

### P0.5 Offline / Sync UX Clarity
**Area**: Offline mode / Local storage sync  
**Goal**: Make it obvious when data is offline, syncing, or failed to sync, so users trust their changes.

**Implementation Steps**
1. **Review sync state handling**
  - Inspect `src/shims/spark-hooks.ts` and `src/hooks/use-sync-status.ts`.
  - Document the existing states: last success, last error, pending queue.

2. **Unify sync indicators**
  - Ensure the `RefreshIndicator`, `OfflineIndicator`, and any sync badges use the same source of truth for status.
  - Define statuses like `idle`, `syncing`, `error`, `offline`.

3. **Improve error surfacing for sync failures**
  - When sync fails repeatedly, show a toast with an action: "View sync details" which opens a small diagnostics dialog.
  - In that dialog, surface last error message and when it occurred.

4. **Add a manual "Retry sync" control**
  - From Settings or a diagnostics card, allow users to trigger a full retry of pending writes.

---

## P1 – Workflow & UI Polish in Existing Features

These items make day‑to‑day usage smoother without adding brand‑new feature areas.

### P1.0 Creation Flow UX for Chores, Recipes, Events, Meals & Shopping
**Area**: All content creation forms (chores, shopping items, meals, recipes, events)  
**Goal**: Streamline adding new items with sensible defaults and fewer required steps.

**Implementation Steps**
1. **Audit each creation form**
  - For each section component under `src/components/sections/`, list which fields are required vs optional.
  - Identify a minimal required subset for quick creation (e.g., title + assignee + due date for chores).

2. **Introduce "quick add" variants**
  - For chores, shopping items, and events, add a compact inline form at the top of the list that shows only the key fields.
  - Provide a "More options" button or link that expands to the full editor for advanced settings (frequency, rotation, notes, tags, etc.).

3. **Apply smart defaults**
  - Chores: default `frequency = 'once'`, `assignedTo = current member filter` if one is selected, and `dueAt` to today or tomorrow.
  - Events: default category (e.g., Personal), reasonable duration (30–60 minutes), and start time rounded to the next half‑hour.
  - Recipes: default name to "Untitled recipe" until edited, and start with an empty template hints section.
  - Shopping items: default quantity to `1` and priority to medium.

4. **Use progressive disclosure for advanced options**
  - Group advanced controls (e.g., rotation, time tracking, notes, tags) into a collapsible section in each editor.
  - Keep the top of the form as short as possible for mobile usability.

5. **Preserve unsaved input safely**
  - When a user navigates away from a creation/edit form, optionally store in‑progress data in local state or user‑scoped storage so they can resume without losing work.

6. **Unify shared field components**
  - Extract shared components for date/time picking, member selection, and household scoping so the creation UX feels consistent across chores, events, meals, and recipes.

---

### P1.1 Chore List Usability Improvements
**Area**: Chores section & dashboard  
**Goal**: Make it faster to understand and manage chores with the current feature set.

**Implementation Steps**
1. **Default sorting and grouping**
  - In `src/components/sections/ChoresSection.tsx`, ensure chores default to grouping:
    - Overdue → Due Today → Due Soon → Upcoming.
  - Make this ordering consistent between dashboard widgets and the full chore view.

2. **Readable due labels**
  - Use `date-fns` (already in the project) to format human‑friendly labels like "Due today", "Due in 2 days", "3 days overdue".
  - Apply consistent formatting wherever chores are listed.

3. **Inline completion notes (optional)**
  - When marking a recurring chore complete, allow an optional quick note (e.g., modal with a single textarea) without changing the underlying data model.

4. **Improve member filter UX**
  - In the header/member filter UI, ensure the selected member clearly affects chore lists (and that the filter state is visually obvious).

---

### P1.2 Shopping List Interaction Refinements
**Area**: Shopping section  
**Goal**: Make adding and checking off items feel snappy and predictable.

**Implementation Steps**
1. **Keyboard / mobile input flow**
  - In `src/components/sections/ShoppingSection.tsx`, ensure that after adding an item:
    - The form resets.
    - Focus returns to the item name input (desktop) or keeps the keyboard up (mobile).

2. **Consistent grouping and ordering**
  - Group by category, then sort items within a group by priority and name.
  - Keep purchased items visually separate (collapsed or at the bottom).

3. **One-tap complete behavior**
  - Ensure the check/uncheck interaction is optimized for touch targets (44×44), using the existing UI primitives.

4. **Clear action for clearing purchased items**
  - Provide a single, clearly labeled "Clear purchased" action with a confirmation dialog to prevent accidental loss.

---

### P1.3 Meal & Recipe Editing UX
**Area**: MealsSection, RecipesSection  
**Goal**: Reduce friction when creating and editing meals/recipes with existing capabilities.

**Implementation Steps**
1. **Form persistence on error**
  - When saving a recipe or meal fails (validation or network), ensure all input stays intact and clearly highlight problematic fields.

2. **Improved multi-line editing**
  - Make sure ingredients/instructions textareas in `RecipesSection` support comfortable multi-line editing on mobile (auto‑grow, sensible max height, scrollable when long).

3. **Tag entry polish**
  - When entering tags (comma‑separated), trim and dedupe tags on save.
  - Show currently applied tags as removable chips.

4. **Navigation consistency**
  - Ensure that when a user saves or cancels editing, they reliably end up back at the same list state (scroll position preserved if feasible).

---

### P1.4 Calendar Readability & Interaction Tweaks
**Area**: CalendarSection  
**Goal**: Make the existing calendar views easier to read and manipulate, without adding new calendar integrations.

**Implementation Steps**
1. **Visual hierarchy for event types**
  - Use consistent colors and simple badges for event categories already defined in the PRD.
  - Ensure legend / category hints are easily discoverable.

2. **Drag / click affordances**
  - Make the drag‑to‑select and click‑to‑add affordances clearly indicated (e.g., subtle helper text on first visit or a small tooltip).

3. **Today focus controls**
  - Provide a prominent "Today" button that returns to the current day/week in all views.

4. **All-day vs time-specific clarity**
  - Make sure all‑day events are visually distinct from time‑boxed ones in each view.

---

### P1.5 Dashboard & Mobile Navigation Coherence
**Area**: DashboardSection, Mobile nav customizer  
**Goal**: Ensure the dashboard and mobile navigation always reflect the same mental model of "main areas".

**Implementation Steps**
1. **Align tab visibility and dashboard widgets**
  - When a tab (e.g., Recipes or Calendar) is disabled in the mobile nav customization, make sure dashboard widgets for that feature also hide, or clearly indicate that the feature is disabled.

2. **Preset behavior clarity**
  - In `DashboardCustomizer`, ensure that applying a preset gives immediate, obvious feedback (e.g., a toast "Applied Chores Focus layout").

3. **Save / reset flows**
  - Give users a way to reset dashboard and nav configuration back to a sensible default.

4. **Consistent icons and labels**
  - Ensure `DEFAULT_NAV_ITEMS` and `TAB_CONFIGS` in `src/App.tsx` stay in sync with any label/icon changes.

---

### P1.6 Fun Chore Motivation: Weekly Challenge & Streak Highlights
**Area**: Chores section & dashboard  
**Goal**: Make chore completion feel a bit more fun and motivating, using light‑touch gamification on top of the existing chore and streak system.

**Implementation Steps**
1. **Define a simple weekly challenge rule**
  - Example: "Complete N chores this week" or "Maintain at least a 3‑day streak on any recurring chore".
  - Compute progress using existing `ChoreCompletion` data and streak fields in `Chore`.

2. **Add a "This Week’s Chore Challenge" widget to the dashboard**
  - Show current progress (e.g., X of N chores completed) as a progress bar or ring.
  - Use friendly, encouraging copy rather than competitive language.

3. **Celebrate completion with lightweight visuals**
  - When the weekly challenge is completed, trigger a one‑time celebration:
    - A small confetti animation or playful icon change (leveraging existing UI/animation libraries if available).
    - A positive toast such as "Nice work! You hit this week’s chore goal.".

4. **Highlight streaks in chore lists**
  - For recurring chores, visually call out strong streaks (e.g., 🔥 icon next to the streak count) in the chores section and/or dashboard widget.

5. **Respect user preferences**
  - Add a toggle in Settings (e.g., "Show weekly challenge & streak celebrations") so users who prefer a quieter experience can disable the gamified elements.

---

## P2 – Performance, Testing, and Developer Experience

These investments don’t change visible behavior much but improve reliability, speed, and maintainability.

### P2.1 Basic Performance Pass on Large Lists
**Area**: Chores, Shopping, Recipes, Events lists  
**Goal**: Keep scrolling and interactions smooth as data grows.

**Implementation Steps**
1. **Measure current behavior**
  - Use the React Profiler and browser Performance tab on realistic data sets (e.g., hundreds of chores/items.)

2. **Memoize derived lists**
  - In each section, wrap common filters and sorts in `useMemo` keyed by the minimal dependencies (e.g., `currentHousehold.id`, underlying array reference).

3. **Avoid unnecessary re-renders**
  - Where appropriate, wrap list item components in `React.memo` when their props are stable.

4. **Introduce virtualization later if needed**
  - If profiling shows list rendering as a bottleneck, introduce virtualization (e.g., `react-virtual`) in a focused way, starting with the heaviest list.

---

### P2.2 Testing Foundation for Critical Logic
**Area**: Utilities, Auth, Data access  
**Goal**: Create a minimal but solid testing foundation you can extend over time.

**Implementation Steps**
1. **Pick one runner and wire it up**
  - Use Vitest (already compatible with Vite) for unit and integration tests.
  - Add a `test` script that runs Vitest instead of (or alongside) the current Node test runner.

2. **Start with pure utilities**
  - Write tests for `src/lib/chore-utils.ts`, `src/lib/validators.ts`, and `src/lib/notifications.ts`.
  - Cover edge cases for streak calculation, overdue detection, and validation.

3. **Add a few high‑value integration tests**
  - Test auth flows against the real Express server in a controlled environment (signup → login → switch household → logout).

4. **Add CI hook (optional)**
  - Integrate `npm test` into your CI pipeline so regressions are caught automatically.

---

### P2.3 Logging & Diagnostics Refinement
**Area**: Server logging, bug tracker  
**Goal**: Make it easier for you to debug issues without overwhelming logs.

**Implementation Steps**
1. **Normalize server log structure**
  - Update the `log` helper in `server.js` to always log JSON objects with `level`, `message`, and `context` keys.

2. **Tag logs by feature**
  - When logging from auth, chores, shopping, etc., include a `feature` field in the context.

3. **Refine bug tracker noise**
  - In `src/lib/bugTracker.ts`, ensure you don’t record your own debug logs as console errors.
  - Add light rate limiting (e.g., don’t record more than N errors per 10 seconds) to avoid floods.

4. **Expose a simple diagnostics export**
  - Ensure the existing "copy bug report" flow includes key environment info (app version, browser, approximate time).

---

### P2.4 Security Hardening (Within Existing Scope)
**Area**: Auth endpoints, API inputs  
**Goal**: Reduce attack surface without changing user‑visible functionality.

**Implementation Steps**
1. **Add basic rate limiting for API**
  - Use `express-rate-limit` on `/api/auth/*` and possibly other write endpoints to mitigate brute‑force attempts.

2. **Harden session cookies**
  - Ensure the session cookie is always `HttpOnly`, `Secure` in production, and `SameSite=Lax` or `Strict` as appropriate (looks largely in place; just confirm).

3. **Validate and sanitize all input**
  - Work with the P0.1 validation schemas to ensure all free‑text fields (notes, descriptions) are length‑bounded and sanitized where needed.

4. **Audit log key actions**
  - Log sensitive events (password change, account deletion, data exports) on the server with user ID and timestamp.

---

## How to Use This Document

1. **Prioritize**
  - Start with P0 items; they improve trust and correctness.
  - Then pick 1–2 items from P1 that directly improve daily workflows you care most about (likely Chores and Shopping).

2. **Create Issues / Tasks**
  - Turn each numbered item into one or more GitHub issues, copying the implementation steps as the task checklist.

3. **Iterate in Small Batches**
  - Implement and ship improvements in small slices (e.g., “Auth error messages” as one PR, “Chore list ordering” as another) so you can feel each change.

4. **Review with Real Usage**
  - After each batch, use the app on real data (especially on mobile/PWA) and adjust the next priorities based on what feels best in practice.

This keeps the focus squarely on making **the current HomeHub experience smoother, clearer, and more reliable**, without committing you to any unrelated new product areas.
