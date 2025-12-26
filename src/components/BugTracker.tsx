import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Bug,
  Trash,
  Copy,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  Eye,
  Export,
  X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  getBugReports,
  deleteBug,
  resolveBug,
  clearAllBugs,
  clearResolvedBugs,
  formatBugForChat,
  formatAllBugsForChat,
  copyToClipboard,
  type BugReport,
} from '@/lib/bugTracker'

const typeColors: Record<BugReport['type'], string> = {
  error: 'bg-red-500/20 text-red-700 border-red-300 dark:text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-700 border-yellow-300 dark:text-yellow-400',
  'unhandled-rejection': 'bg-orange-500/20 text-orange-700 border-orange-300 dark:text-orange-400',
  'console-error': 'bg-purple-500/20 text-purple-700 border-purple-300 dark:text-purple-400',
}

const typeLabels: Record<BugReport['type'], string> = {
  error: 'Runtime Error',
  warning: 'Warning',
  'unhandled-rejection': 'Promise Rejection',
  'console-error': 'Console Error',
}

interface BugDetailDialogProps {
  bug: BugReport
  onClose: () => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onCopy: (bug: BugReport) => void
}

function BugDetailDialog({ bug, onClose, onResolve, onDelete, onCopy }: BugDetailDialogProps) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Bug className="text-destructive" />
          Bug Details
        </DialogTitle>
        <DialogDescription>
          {new Date(bug.timestamp).toLocaleString()}
        </DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={typeColors[bug.type]}>{typeLabels[bug.type]}</Badge>
            {bug.resolved && (
              <Badge variant="outline" className="bg-green-500/20 text-green-700">
                Resolved
              </Badge>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Error Message</h4>
            <pre className="text-xs bg-muted/50 p-3 rounded-lg border overflow-auto whitespace-pre-wrap break-all">
              {bug.message}
            </pre>
          </div>

          {bug.stack && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Stack Trace</h4>
              <pre className="text-xs bg-muted/50 p-3 rounded-lg border overflow-auto max-h-48 whitespace-pre-wrap">
                {bug.stack}
              </pre>
            </div>
          )}

          {bug.componentStack && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Component Stack</h4>
              <pre className="text-xs bg-muted/50 p-3 rounded-lg border overflow-auto max-h-32 whitespace-pre-wrap">
                {bug.componentStack}
              </pre>
            </div>
          )}

          {bug.context && Object.keys(bug.context).length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Context</h4>
              <pre className="text-xs bg-muted/50 p-3 rounded-lg border overflow-auto">
                {JSON.stringify(bug.context, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <div><strong>URL:</strong> {bug.url}</div>
            <div><strong>ID:</strong> {bug.id}</div>
          </div>
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(bug)}
          className="gap-2"
        >
          <Copy size={16} />
          Copy for Chat
        </Button>
        {!bug.resolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onResolve(bug.id)
              onClose()
            }}
            className="gap-2"
          >
            <CheckCircle size={16} />
            Mark Resolved
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            onDelete(bug.id)
            onClose()
          }}
          className="gap-2"
        >
          <Trash size={16} />
          Delete
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </DialogContent>
  )
}

export default function BugTracker() {
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const refreshBugs = useCallback(() => {
    setBugs(getBugReports().reverse()) // Newest first
  }, [])

  useEffect(() => {
    refreshBugs()
    // Refresh every 5 seconds to catch new bugs
    const interval = setInterval(refreshBugs, 5000)
    return () => clearInterval(interval)
  }, [refreshBugs])

  const handleCopyBug = async (bug: BugReport) => {
    const formatted = formatBugForChat(bug)
    const success = await copyToClipboard(formatted)
    if (success) {
      toast.success('Bug report copied to clipboard! Ready to paste in chat.')
    } else {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleCopyAllBugs = async () => {
    const formatted = formatAllBugsForChat()
    const success = await copyToClipboard(formatted)
    if (success) {
      toast.success('All bugs copied to clipboard!')
    } else {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleResolve = (id: string) => {
    resolveBug(id)
    refreshBugs()
    toast.success('Bug marked as resolved')
  }

  const handleDelete = (id: string) => {
    deleteBug(id)
    refreshBugs()
    toast.success('Bug deleted')
  }

  const handleClearAll = () => {
    clearAllBugs()
    refreshBugs()
    toast.success('All bugs cleared')
  }

  const handleClearResolved = () => {
    clearResolvedBugs()
    refreshBugs()
    toast.success('Resolved bugs cleared')
  }

  const unresolvedCount = bugs.filter(b => !b.resolved).length
  const resolvedCount = bugs.filter(b => b.resolved).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug size={24} className="text-destructive" />
              Bug Tracker
              {unresolvedCount > 0 && (
                <Badge variant="destructive">{unresolvedCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Automatic error capturing for easy debugging
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshBugs} className="gap-2">
            <ArrowsClockwise size={16} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleCopyAllBugs}
            disabled={unresolvedCount === 0}
            className="gap-2"
          >
            <Export size={16} />
            Copy All for Chat ({unresolvedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearResolved}
            disabled={resolvedCount === 0}
            className="gap-2"
          >
            <CheckCircle size={16} />
            Clear Resolved ({resolvedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={bugs.length === 0}
            className="gap-2 border-destructive/50 hover:bg-destructive/10"
          >
            <Trash size={16} />
            Clear All
          </Button>
        </div>

        <Separator />

        {/* Bug list */}
        {bugs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bug size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No bugs captured yet</p>
            <p className="text-xs mt-1">Errors will appear here automatically</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-2 pr-2">
              {bugs.map((bug) => (
                <div
                  key={bug.id}
                  className={`p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors ${
                    bug.resolved ? 'opacity-60' : ''
                  }`}
                  onClick={() => {
                    setSelectedBug(bug)
                    setIsDialogOpen(true)
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Badge className={`${typeColors[bug.type]} text-xs shrink-0`}>
                      {typeLabels[bug.type]}
                    </Badge>
                    {bug.resolved && (
                      <CheckCircle size={16} className="text-green-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{bug.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(bug.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyBug(bug)
                        }}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(bug.id)
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Detail dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {selectedBug && (
            <BugDetailDialog
              bug={selectedBug}
              onClose={() => setIsDialogOpen(false)}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onCopy={handleCopyBug}
            />
          )}
        </Dialog>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-semibold mb-1">How to use:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Errors are automatically captured when they occur</li>
            <li>Click "Copy All for Chat" to copy bug reports</li>
            <li>Paste directly into a chat to diagnose issues</li>
            <li>Mark bugs as resolved once fixed</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

export { BugTracker }
