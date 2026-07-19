import { useMemo } from 'react'
import { startOfWeek } from 'date-fns'
import { Trophy } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { tallyPoints } from '@/lib/chore-points'
import type { Chore, ChoreCompletion } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

/**
 * This week's chore-points leaderboard (E2). Purely derived from completion
 * history — no new stored state. Hidden until at least one chore is completed
 * this week so it never shows an empty scoreboard.
 */
export default function ChoreLeaderboard({
  chores,
  completions,
}: {
  chores: Chore[]
  completions: ChoreCompletion[]
}) {
  const board = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }).getTime()
    return tallyPoints(chores, completions, { since: weekStart })
  }, [chores, completions])

  if (board.length === 0) return null

  const top = board[0].points

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="text-amber-500" weight="fill" size={18} />
        <h3 className="text-sm font-semibold">This Week's Leaderboard</h3>
      </div>
      <ul className="space-y-2">
        {board.map((entry, i) => (
          <li key={entry.member} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm" aria-hidden>
              {MEDALS[i] ?? `${i + 1}.`}
            </span>
            <span className="flex-1 min-w-0 truncate text-sm font-medium">{entry.member}</span>
            <span className="text-xs text-muted-foreground">{entry.completions} done</span>
            <Badge variant={i === 0 ? 'default' : 'secondary'} className="tabular-nums">
              {entry.points} pts
            </Badge>
            {/* Simple relative bar so standings read at a glance across the room. */}
            <div className="hidden sm:block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${top > 0 ? Math.round((entry.points / top) * 100) : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
