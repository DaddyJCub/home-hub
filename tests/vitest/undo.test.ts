import { describe, it, expect, vi } from 'vitest'
import { toastWithUndo, restoreItem } from '@/lib/undo'

// Capture the options object sonner is called with so we can exercise the
// Undo action without a DOM.
const successMock = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (message: string, opts: unknown) => successMock(message, opts),
  },
}))

type Item = { id: string; name: string }

describe('undo helpers', () => {
  it('restoreItem re-adds a removed item', () => {
    let list: Item[] = [{ id: 'a', name: 'A' }]
    const setter = (next: Item[] | ((prev: Item[] | undefined) => Item[])) => {
      list = typeof next === 'function' ? next(list) : next
    }
    restoreItem(setter, { id: 'b', name: 'B' })
    expect(list.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('restoreItem does not duplicate an item already present', () => {
    let list: Item[] = [{ id: 'a', name: 'A' }]
    const setter = (next: Item[] | ((prev: Item[] | undefined) => Item[])) => {
      list = typeof next === 'function' ? next(list) : next
    }
    restoreItem(setter, { id: 'a', name: 'A' })
    expect(list).toHaveLength(1)
  })

  it('restoreItem tolerates an undefined previous list', () => {
    let list: Item[] | undefined = undefined
    const setter = (next: Item[] | ((prev: Item[] | undefined) => Item[])) => {
      list = typeof next === 'function' ? next(list) : next
    }
    restoreItem(setter, { id: 'a', name: 'A' })
    expect(list).toEqual([{ id: 'a', name: 'A' }])
  })

  it('toastWithUndo wires the Undo action to the callback', () => {
    successMock.mockClear()
    const onUndo = vi.fn()
    toastWithUndo('Item deleted', onUndo)
    expect(successMock).toHaveBeenCalledOnce()
    const opts = successMock.mock.calls[0][1] as { action: { label: string; onClick: () => void } }
    expect(opts.action.label).toBe('Undo')
    opts.action.onClick()
    expect(onUndo).toHaveBeenCalledOnce()
  })
})
