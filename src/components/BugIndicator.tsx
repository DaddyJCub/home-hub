import { useState, useEffect } from 'react'
import { Bug } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getUnresolvedCount } from '@/lib/bugTracker'

interface BugIndicatorProps {
  onClick?: () => void
}

export function BugIndicator({ onClick }: BugIndicatorProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Initial count
    setCount(getUnresolvedCount())

    // Update every 5 seconds
    const interval = setInterval(() => {
      setCount(getUnresolvedCount())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className="relative h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Bug size={20} />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
            >
              {count > 99 ? '99+' : count}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} unresolved bug{count !== 1 ? 's' : ''} - click to view in Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default BugIndicator
