import { toast } from 'sonner'

/**
 * Show a success toast that offers to undo the action. The undo window is the
 * toast's visible lifetime — if the user doesn't tap Undo, the change stands.
 *
 * Use this for every destructive action (delete/remove) so a mis-tap on a
 * shared household screen is always recoverable. Chores already followed this
 * pattern; this helper makes the rest of the app consistent.
 */
export function toastWithUndo(message: string, onUndo: () => void, duration = 6000): void {
  toast.success(message, {
    duration,
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
  })
}

/**
 * Restore a previously-removed record into a `useKV` array without creating a
 * duplicate if the undo action somehow fires twice (double-tap, re-render).
 * Pass the `useKV` setter and the item that was removed.
 */
export function restoreItem<T extends { id: string }>(
  setter: (next: T[] | ((prev: T[] | undefined) => T[])) => void,
  item: T,
): void {
  setter((prev) => {
    const list = prev ?? []
    return list.some((i) => i.id === item.id) ? list : [...list, item]
  })
}
