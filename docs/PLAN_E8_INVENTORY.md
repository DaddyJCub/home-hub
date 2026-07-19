# E8 — Inventory & Maintenance Reminders (implementation plan)

Status: **planned** (not built). New data domain; simpler than E6 (no money math)
but adds a section, a collection, and reminder wiring.

## Goal
Track household items (appliances, tools, "where is X?"), their warranties, and
recurring maintenance (HVAC filter, smoke-detector batteries, gutter cleaning),
and surface what's **due** through the existing notification pipeline and the
Today-at-a-glance card.

## Data model (`src/lib/types.ts`)
```ts
export interface InventoryItem {
  id: string
  householdId: string
  name: string
  category?: string          // Appliance, Tool, Electronics, Furniture, …
  location?: string          // "Garage shelf B", answers "where is X?"
  brand?: string
  model?: string
  serialNumber?: string
  purchaseDate?: string      // 'YYYY-MM-DD'
  warrantyExpires?: string   // 'YYYY-MM-DD'
  // Recurring maintenance
  maintenanceIntervalDays?: number
  lastMaintained?: string    // 'YYYY-MM-DD'
  notes?: string
  createdAt: number
}
```
`nextMaintenanceDue(item)` = `lastMaintained + maintenanceIntervalDays` (or
`purchaseDate` if never maintained). Warranty and maintenance both produce a due
date the rest of the app can reason about.

## Pure helpers (`src/lib/inventory.ts`, unit-tested)
- `nextMaintenanceDue(item): string | null`
- `dueSoon(item, withinDays=14): { warranty?: boolean; maintenance?: boolean }`
- `sortByUrgency(items)` — soonest due first, undated last.
Tests: interval from lastMaintained vs purchaseDate, warranty within/after
window, item with no dates never flagged.

## Storage
- Standalone: one `useKV<InventoryItem[]>('inventory', [])` (household-scoped) +
  a Zod validator in `server/validation.js`.
- CM parity: add `inventory` to `NATIVE_HOUSEHOLD_KEYS` (server.js) and to
  `HouseholdData` + the CM client, then an `InventorySection`.

## UI
- New "Inventory" tab (behind an `enabled-tabs` flag):
  - Add/edit item form (name, category, location, brand/model/serial, purchase +
    warranty dates, maintenance interval).
  - List with search + filter by category/location (reuse the shopping filter
    pattern), each row showing next-due / warranty badges (⚠ amber when due
    soon, red when overdue) via the E4 badge style.
  - "Mark maintained" action → sets `lastMaintained = today`, recomputing the
    next due date (mirror the chore-completion pattern; offer Undo).
- Dashboard / Today-at-a-glance: a "Maintenance due" line when anything is due in
  the next 14 days.

## Reminders (reuse, don't rebuild)
Feed due items into the existing notification pipeline
(`src/lib/notifications.ts`): add an `inventory` `NotificationKind`, a
preference toggle, and schedule a check in `checkAndScheduleNotifications` that
respects quiet hours (already implemented for chores/events). Dedup with the
existing `canSendTag` cache so a due item nags once per day, not every poll.

## Cross-surface + rollout
Standalone first, then CM parity via the contract key. The wall "Household Today"
glance (E1) can gain a "maintenance due" line once the collection exists.

## Estimated effort
~1.5–2 focused days: 0.5d model + inventory.ts + tests, 0.75d standalone
section + dashboard, 0.25d notification wiring, 0.5d CM parity.
