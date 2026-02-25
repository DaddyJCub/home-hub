import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  DotsThreeVertical, Pencil, Trash, ArrowRight,
  CalendarBlank, CurrencyDollar, CheckSquare
} from '@phosphor-icons/react'
import type { HomeProject } from '@/lib/types'
import { projectPriorityConfig, statusConfig, PROJECT_STATUSES } from '@/hooks/use-projects'
import { format } from 'date-fns'

export interface ProjectCardProps {
  project: HomeProject
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
  onMoveToStatus: (status: HomeProject['status']) => void
  compact?: boolean
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onClick,
  onMoveToStatus,
  compact = false,
}: ProjectCardProps) {
  const priorityCfg = projectPriorityConfig[project.priority]
  const status = statusConfig[project.status]
  const checklistTotal = project.checklist?.length ?? 0
  const checklistDone = project.checklist?.filter(c => c.completed).length ?? 0
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0

  return (
    <Card
      variant="flat"
      className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${
        project.status === 'done' ? 'opacity-70' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex">
        {/* Priority color bar */}
        <div className={`w-[3px] flex-shrink-0 ${priorityCfg.color}`} />

        <CardContent className={`flex-1 ${compact ? 'p-2.5' : 'p-3'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-medium text-sm truncate ${
                  project.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}>
                  {project.title}
                </h3>
              </div>

              {/* Status & priority badges */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${status.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.color} mr-1`} />
                  {PROJECT_STATUSES.find(s => s.value === project.status)?.label}
                </Badge>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityCfg.text}`}>
                  {priorityCfg.label}
                </Badge>
                {project.tags?.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {project.targetDate && (
                  <span className="flex items-center gap-0.5">
                    <CalendarBlank size={11} />
                    {format(project.targetDate, 'MMM d, yyyy')}
                  </span>
                )}
                {project.estimatedCost != null && (
                  <span className="flex items-center gap-0.5">
                    <CurrencyDollar size={11} />
                    ${project.estimatedCost.toLocaleString()}
                    {project.actualCost != null && project.status === 'done' && (
                      <span className="text-muted-foreground"> / ${project.actualCost.toLocaleString()}</span>
                    )}
                  </span>
                )}
                {checklistTotal > 0 && (
                  <span className="flex items-center gap-0.5">
                    <CheckSquare size={11} />
                    {checklistDone}/{checklistTotal}
                  </span>
                )}
              </div>

              {/* Checklist progress */}
              {checklistTotal > 0 && !compact && (
                <div className="mt-2">
                  <Progress value={checklistPercent} className="h-1.5" />
                </div>
              )}
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DotsThreeVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Pencil size={14} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {PROJECT_STATUSES.filter(s => s.value !== project.status).map(s => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={(e) => { e.stopPropagation(); onMoveToStatus(s.value) }}
                  >
                    <ArrowRight size={14} className="mr-2" />
                    Move to {s.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                  <Trash size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
