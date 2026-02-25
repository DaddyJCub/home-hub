import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { useState } from 'react'
import type { HomeProject, ProjectChecklistItem } from '@/lib/types'
import { PROJECT_STATUSES, type ProjectFormState } from '@/hooks/use-projects'

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectForm: ProjectFormState
  setProjectForm: React.Dispatch<React.SetStateAction<ProjectFormState>>
  editingProject: HomeProject | null
  onSave: () => void
  onReset: () => void
}

export default function ProjectFormDialog({
  open,
  onOpenChange,
  projectForm,
  setProjectForm,
  editingProject,
  onSave,
  onReset,
}: ProjectFormDialogProps) {
  const [newChecklistItem, setNewChecklistItem] = useState('')

  const addChecklistItem = () => {
    const text = newChecklistItem.trim()
    if (!text) return
    const item: ProjectChecklistItem = {
      id: Date.now().toString(),
      text,
      completed: false,
    }
    setProjectForm(prev => ({
      ...prev,
      checklist: [...prev.checklist, item],
    }))
    setNewChecklistItem('')
  }

  const removeChecklistItem = (id: string) => {
    setProjectForm(prev => ({
      ...prev,
      checklist: prev.checklist.filter(c => c.id !== id),
    }))
  }

  const toggleChecklistItem = (id: string) => {
    setProjectForm(prev => ({
      ...prev,
      checklist: prev.checklist.map(c =>
        c.id === id ? { ...c, completed: !c.completed } : c
      ),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { onReset(); setNewChecklistItem('') } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProject ? 'Edit Project' : 'New Home Project'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="proj-title">Title *</Label>
            <Input
              id="proj-title"
              placeholder="e.g. Redo kitchen backsplash"
              value={projectForm.title}
              onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              placeholder="Describe the project scope, materials needed, etc."
              rows={3}
              value={projectForm.description}
              onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Status & Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={projectForm.status}
                onValueChange={(v) => setProjectForm(prev => ({ ...prev, status: v as ProjectFormState['status'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Priority</Label>
              <Select
                value={projectForm.priority}
                onValueChange={(v) => setProjectForm(prev => ({ ...prev, priority: v as ProjectFormState['priority'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cost & Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="proj-cost">Estimated Cost ($)</Label>
              <Input
                id="proj-cost"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={projectForm.estimatedCost}
                onChange={(e) => setProjectForm(prev => ({ ...prev, estimatedCost: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="proj-date">Target Date</Label>
              <Input
                id="proj-date"
                type="date"
                value={projectForm.targetDate}
                onChange={(e) => setProjectForm(prev => ({ ...prev, targetDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label htmlFor="proj-tags">Tags</Label>
            <Input
              id="proj-tags"
              placeholder="kitchen, plumbing, diy (comma-separated)"
              value={projectForm.tags}
              onChange={(e) => setProjectForm(prev => ({ ...prev, tags: e.target.value }))}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label>Checklist</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add step..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addChecklistItem}>
                <Plus size={14} />
              </Button>
            </div>
            {projectForm.checklist.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {projectForm.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm group">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <span className={`flex-1 truncate ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeChecklistItem(item.id)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="proj-notes">Notes</Label>
            <Textarea
              id="proj-notes"
              placeholder="Contractor contacts, reference links, etc."
              rows={2}
              value={projectForm.notes}
              onChange={(e) => setProjectForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); onReset(); setNewChecklistItem('') }}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            {editingProject ? 'Save Changes' : 'Add Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
