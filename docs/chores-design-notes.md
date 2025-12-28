# Chores recurrence & status notes

## Research references
- Grocy chore model (due/overdue, fixed vs after completion): https://grocy.info/changelog/2020-08-02-grocy-release-v3-0-0
- Todoist recurring tasks (fixed date vs after completion with `every!` syntax): https://todoist.com/help/articles/how-to-add-recurring-due-dates
- Microsoft To Do recurring tasks (regenerate after completion): https://support.microsoft.com/en-us/office/set-up-repeat-tasks-in-to-do-7f2c55f5-2a7a-4a4a-92e0-3fb9c7c6694d

Key takeaways:
- Two common recurrence modes: **fixed cadence** (next occurrence anchored to schedule) and **after completion** (next due shifts from completion time).
- Clear next occurrence and overdue state keeps dashboards trustworthy; completing the current instance should immediately move the next due forward.
- Show explicit “due in/overdue by” language to avoid ambiguity.

## Implemented model
- `scheduleType`: `fixed` (next occurrence follows cadence) or `after_completion` (next due = completion time + interval).
- `dueAt`: timestamp for the active/next occurrence (used for overdue/pending checks).
- `lastCompletedAt` / `lastCompletedBy`: record of latest completion.
- Completion history stays in `chore-completions`.
- Completing a recurring chore:
  - Record completion event.
  - Compute `dueAt` for the next occurrence:
    - `fixed`: advance from current `dueAt` by the interval until it lands in the future.
    - `after_completion`: `completionTime + interval`.
  - Dashboard/chores list drop the completed instance immediately.
- Status:
  - **Pending** = not completed and current time <= `dueAt`.
  - **Overdue** = `dueAt` < now.
  - **Due Today** uses calendar day of `dueAt`.
  - **Upcoming** = due in the future (not today).
  - **Completed Recently** = completion in last 24h.

## Manual test checklist (iOS PWA + Desktop)
1) Create a daily **Fixed** chore with a due time (e.g., 7:00 PM). Complete it on phone; it should disappear from “pending” and next due shows tomorrow same time on both devices.
2) Create an **After Completion** chore every 2 days. Complete on phone; next due should be 2 days from completion and reflected on desktop.
3) Verify sections on Dashboard/Chores: Overdue, Due Today, Upcoming, Completed Recently show consistent counts; no completed-today items in Pending.
4) Reload app/PWA; session persists and chores keep updated due times.
5) Logout/login on desktop and confirm the same chore states and due times match the phone.
