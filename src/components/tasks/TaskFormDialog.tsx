import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PersonalTask } from '@/lib/types'
import type { TaskFormState } from '@/hooks/use-tasks'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskForm: TaskFormState
  setTaskForm: React.Dispatch<React.SetStateAction<TaskFormState>>
  editingTask: PersonalTask | null
  categories: string[]
  onSave: () => void
  onReset: () => void
}

export default function TaskFormDialog({
  open,
  onOpenChange,
  taskForm,
  setTaskForm,
  editingTask,
  categories,
  onSave,
  onReset,
}: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onReset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Edit Task' : 'New Personal Task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              placeholder="What do you need to do?"
              value={taskForm.title}
              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Optional details..."
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Priority & Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(v) => setTaskForm(prev => ({ ...prev, priority: v as TaskFormState['priority'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="task-category">Category</Label>
            <div className="flex gap-2">
              <Input
                id="task-category"
                placeholder="e.g. errands, health, learning"
                value={taskForm.category}
                onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                list="task-categories"
              />
              {categories.length > 0 && (
                <datalist id="task-categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              placeholder="Any additional notes..."
              rows={2}
              value={taskForm.notes}
              onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); onReset() }}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            {editingTask ? 'Save Changes' : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
