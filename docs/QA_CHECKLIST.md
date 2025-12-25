# HomeHub Manual QA Checklist

Use this to sanity-check the app before household rollout. Run in desktop browser, mobile, and installed PWA.

## Accounts / Auth
- Launch app, confirm ErrorBoundary not shown.
- Sign in (or proceed if already authenticated); sign out and back in.

## Navigation
- Click all top tabs (Dashboard, Chores, Shopping, Meals, Calendar, Recipes, Settings); no dead ends or blank screens.
- On mobile/PWA, bottom nav shows; tabs switch correctly; “More” menu works.

## Chores
- Add a chore with assignee, priority, due date.
- Edit the chore; changes persist.
- Complete a chore, then “Clear All” completed (confirm dialog appears).
- Delete a single chore (optional confirm not required, but action works).
- Empty state shows when no chores match filters.

## Shopping
- Add item with quantity; mark purchased/unpurchased.
- Clear purchased (confirm dialog appears).
- Delete an item; list updates.
- Empty state shows when list is empty.

## Meals / Calendar / Recipes
- Add a meal entry; ensure it appears on dashboard widgets.
- Add a calendar event with time; confirm it shows in Upcoming and reminders list.
- Add a recipe (if flow present) or confirm placeholder does not error.

## Settings
- Toggle Dark Mode; theme switches.
- Change theme card; persists after reload.
- Mobile Navigation customizer opens (on mobile).
- Notification Settings: toggle master switch; send “Test notification” (toast + notification shown if permitted).
- PWA Diagnostics: shows manifest/SW; Push Diagnostics: shows subscription count and “Send test push” works.

## Push / PWA
- Install PWA (Chrome or iOS), open in standalone; PWA Diagnostics shows display-mode standalone.
- Grant notifications; send test push from Push Diagnostics; notification appears and opens app when tapped.

## Data safety
- Confirm destructive actions show confirmation: clear completed chores, clear purchased items, admin delete data in Settings (dialogs).
- No unexpected data loss after refresh.

## Error states
- Force offline (toggle network): offline banner appears; offline page works if reloaded; app recovers when back online.
- Invalid actions don’t crash the UI; toasts show errors where relevant.

## Performance sanity
- Navigate across tabs; no excessive loading/spinners; no console errors.
- PWA reloads quickly; healthcheck passes (`/healthz.txt`).

## Docker (optional)
- Build/run image; visit mapped port; healthcheck healthy.
- Logs available via `docker logs homehub`.
