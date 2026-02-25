import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { HomeProject, ProjectStatus } from '@/lib/types'
import { PROJECT_STATUSES, statusConfig } from '@/hooks/use-projects'
import ProjectCard from './ProjectCard'

interface ProjectBoardViewProps {
  projectsByStatus: Record<ProjectStatus, HomeProject[]>
  onEditProject: (project: HomeProject) => void
  onDeleteProject: (id: string) => void
  onViewProject: (project: HomeProject) => void
  onMoveToStatus: (id: string, status: ProjectStatus) => void
}

export default function ProjectBoardView({
  projectsByStatus,
  onEditProject,
  onDeleteProject,
  onViewProject,
  onMoveToStatus,
}: ProjectBoardViewProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-[1000px]">
        {PROJECT_STATUSES.map(col => {
          const projects = projectsByStatus[col.value]
          const cfg = statusConfig[col.value]
          return (
            <div
              key={col.value}
              className="flex-1 min-w-[200px] bg-muted/30 rounded-lg border border-border/60"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
                  {projects.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[100px]">
                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No projects
                  </p>
                )}
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={() => onEditProject(project)}
                    onDelete={() => onDeleteProject(project.id)}
                    onClick={() => onViewProject(project)}
                    onMoveToStatus={(status) => onMoveToStatus(project.id, status)}
                    compact
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
