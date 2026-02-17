import { useState, useCallback } from 'react'
import {
  Sparkle, ArrowRight, Spinner, Users, CalendarDots,
  Plus, Trash, ArrowsClockwise, MagicWand, Check,
  Warning, Lightning
} from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

import type { Chore, ChoreFrequency } from '@/lib/types'
import { normalizeChore } from '@/lib/chore-utils'
import { testOllamaConnection } from '@/lib/ollama'
import {
  generateChoreSuggestions,
  parseNaturalLanguageChore,
  analyzeWorkloadDistribution,
  suggestScheduleOptimizations,
  type AISuggestedChore,
  type ParsedChore,
  type WorkloadAnalysis,
  type ScheduleAnalysis,
} from '@/lib/chore-ai'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AIChoreSuggestionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: string[]
  members: { id: string; displayName: string }[]
  chores: Chore[]
  completions: { id: string; choreId: string; completedBy: string; completedAt: number; skipped?: boolean; householdId: string; notes?: string; room?: string }[]
  householdId: string
  onAddChores: (chores: Chore[]) => void
  onUpdateAssignments: (updates: Array<{ choreId: string; assignedTo: string }>) => void
  onUpdateFrequencies: (updates: Array<{ choreId: string; frequency: ChoreFrequency; customIntervalDays?: number }>) => void
}

// ---------------------------------------------------------------------------
// Priority & frequency display helpers
// ---------------------------------------------------------------------------

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-300',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-300',
  low: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-300',
}

const frequencyLabels: Record<string, string> = {
  once: 'One-time', daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly',
  monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', custom: 'Custom',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIChoreSuggestions({
  open, onOpenChange,
  rooms, members, chores, completions, householdId,
  onAddChores, onUpdateAssignments, onUpdateFrequencies,
}: AIChoreSuggestionsProps) {
  const [tab, setTab] = useState('suggest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suggest tab state
  const [suggestions, setSuggestions] = useState<AISuggestedChore[]>([])
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  // Smart Add tab state
  const [nlInput, setNlInput] = useState('')
  const [parsedChore, setParsedChore] = useState<ParsedChore | null>(null)

  // Workload tab state
  const [workload, setWorkload] = useState<WorkloadAnalysis | null>(null)

  // Schedule tab state
  const [schedule, setSchedule] = useState<ScheduleAnalysis | null>(null)

  const memberNames = members.map(m => m.displayName)
  const aiContext = {
    rooms,
    members: memberNames,
    existingChores: chores,
    completions,
  }

  // ---------------------------------------------------------------------------
  // Connection check wrapper
  // ---------------------------------------------------------------------------

  const withConnectionCheck = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try {
      const conn = await testOllamaConnection()
      if (!conn.ok) {
        setError(`Cannot connect to Ollama: ${conn.error}. Please check your AI settings.`)
        return
      }
      await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Suggest Chores tab
  // ---------------------------------------------------------------------------

  const handleGenerateSuggestions = useCallback(() => {
    withConnectionCheck(async () => {
      const result = await generateChoreSuggestions(aiContext)
      setSuggestions(result)
      setDismissed(new Set())
    })
  }, [aiContext, withConnectionCheck])

  const handleAddSuggestion = useCallback((suggestion: AISuggestedChore, index: number) => {
    const newChore: Chore = {
      id: `${Date.now()}-ai-${index}`,
      householdId,
      title: suggestion.title,
      description: suggestion.description,
      assignedTo: suggestion.assignedTo || '',
      frequency: suggestion.frequency,
      room: suggestion.room || undefined,
      rooms: suggestion.room ? [suggestion.room] : [],
      priority: suggestion.priority,
      estimatedMinutes: suggestion.estimatedMinutes,
      completed: false,
      createdAt: Date.now(),
      dueAt: Date.now(),
      streak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    } as Chore

    onAddChores([normalizeChore(newChore)])
    setDismissed(prev => new Set(prev).add(index))
    toast.success(`Added "${suggestion.title}"`)
  }, [householdId, onAddChores])

  const handleAddAllSuggestions = useCallback(() => {
    const remaining = suggestions
      .map((s, i) => ({ s, i }))
      .filter(({ i }) => !dismissed.has(i))

    if (remaining.length === 0) return

    const newChores = remaining.map(({ s, i }) =>
      normalizeChore({
        id: `${Date.now()}-ai-${i}`,
        householdId,
        title: s.title,
        description: s.description,
        assignedTo: s.assignedTo || '',
        frequency: s.frequency,
        room: s.room || undefined,
        rooms: s.room ? [s.room] : [],
        priority: s.priority,
        estimatedMinutes: s.estimatedMinutes,
        completed: false,
        createdAt: Date.now(),
        dueAt: Date.now(),
        streak: 0,
        bestStreak: 0,
        totalCompletions: 0,
      } as Chore)
    )

    onAddChores(newChores)
    setDismissed(new Set(suggestions.map((_, i) => i)))
    toast.success(`Added ${newChores.length} chores`)
  }, [suggestions, dismissed, householdId, onAddChores])

  // ---------------------------------------------------------------------------
  // Smart Add tab
  // ---------------------------------------------------------------------------

  const handleParseNL = useCallback(() => {
    if (!nlInput.trim()) {
      toast.error('Enter a chore description first')
      return
    }
    withConnectionCheck(async () => {
      const result = await parseNaturalLanguageChore(nlInput.trim(), aiContext)
      setParsedChore(result)
    })
  }, [nlInput, aiContext, withConnectionCheck])

  const handleAddParsedChore = useCallback(() => {
    if (!parsedChore) return

    const newChore: Chore = normalizeChore({
      id: `${Date.now()}-ai-nl`,
      householdId,
      title: parsedChore.title,
      description: parsedChore.description,
      assignedTo: parsedChore.assignedTo || '',
      frequency: parsedChore.frequency,
      room: parsedChore.room || (parsedChore.rooms?.[0]) || undefined,
      rooms: parsedChore.rooms?.length ? parsedChore.rooms : parsedChore.room ? [parsedChore.room] : [],
      priority: parsedChore.priority,
      estimatedMinutes: parsedChore.estimatedMinutes,
      daysOfWeek: parsedChore.daysOfWeek,
      customIntervalDays: parsedChore.customIntervalDays,
      completed: false,
      createdAt: Date.now(),
      dueAt: Date.now(),
      streak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    } as Chore)

    onAddChores([newChore])
    setParsedChore(null)
    setNlInput('')
    toast.success(`Added "${parsedChore.title}"`)
  }, [parsedChore, householdId, onAddChores])

  // ---------------------------------------------------------------------------
  // Workload tab
  // ---------------------------------------------------------------------------

  const handleAnalyzeWorkload = useCallback(() => {
    withConnectionCheck(async () => {
      const result = await analyzeWorkloadDistribution(aiContext as Parameters<typeof analyzeWorkloadDistribution>[0])
      setWorkload(result)
    })
  }, [aiContext, withConnectionCheck])

  const handleApplyWorkloadSuggestions = useCallback(() => {
    if (!workload?.suggestions.length) return
    const updates = workload.suggestions.map(s => ({
      choreId: s.choreId,
      assignedTo: s.suggestedAssignee,
    }))
    onUpdateAssignments(updates)
    setWorkload(null)
  }, [workload, onUpdateAssignments])

  // ---------------------------------------------------------------------------
  // Schedule tab
  // ---------------------------------------------------------------------------

  const handleAnalyzeSchedule = useCallback(() => {
    withConnectionCheck(async () => {
      const result = await suggestScheduleOptimizations(aiContext as Parameters<typeof suggestScheduleOptimizations>[0])
      setSchedule(result)
    })
  }, [aiContext, withConnectionCheck])

  const handleApplyScheduleSuggestion = useCallback((suggestion: ScheduleAnalysis['suggestions'][number]) => {
    onUpdateFrequencies([{
      choreId: suggestion.choreId,
      frequency: suggestion.suggestedFrequency,
      customIntervalDays: suggestion.suggestedCustomDays,
    }])
    setSchedule(prev => prev ? {
      ...prev,
      suggestions: prev.suggestions.filter(s => s.choreId !== suggestion.choreId),
    } : null)
  }, [onUpdateFrequencies])

  const handleApplyAllSchedule = useCallback(() => {
    if (!schedule?.suggestions.length) return
    onUpdateFrequencies(schedule.suggestions.map(s => ({
      choreId: s.choreId,
      frequency: s.suggestedFrequency,
      customIntervalDays: s.suggestedCustomDays,
    })))
    setSchedule(null)
  }, [schedule, onUpdateFrequencies])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const activeSuggestions = suggestions.filter((_, i) => !dismissed.has(i))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle className="text-primary" weight="fill" />
            AI Chore Assistant
          </DialogTitle>
          <DialogDescription>
            Use AI to suggest chores, parse natural language, balance workloads, and optimize schedules.
          </DialogDescription>
        </DialogHeader>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <Warning size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suggest" className="text-xs gap-1">
              <Sparkle size={14} />
              <span className="hidden sm:inline">Suggest</span>
            </TabsTrigger>
            <TabsTrigger value="smart-add" className="text-xs gap-1">
              <MagicWand size={14} />
              <span className="hidden sm:inline">Smart Add</span>
            </TabsTrigger>
            <TabsTrigger value="workload" className="text-xs gap-1">
              <Users size={14} />
              <span className="hidden sm:inline">Workload</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs gap-1">
              <CalendarDots size={14} />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Suggest Chores Tab ──────────────────────────────────────── */}
          <TabsContent value="suggest" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              AI analyzes your rooms and existing chores to suggest useful additions.
            </p>

            <div className="flex gap-2">
              <Button onClick={handleGenerateSuggestions} disabled={loading} className="gap-1">
                {loading ? <Spinner size={16} className="animate-spin" /> : <Sparkle size={16} />}
                Generate Suggestions
              </Button>
              {activeSuggestions.length > 1 && (
                <Button variant="outline" onClick={handleAddAllSuggestions} className="gap-1">
                  <Plus size={16} />
                  Add All ({activeSuggestions.length})
                </Button>
              )}
            </div>

            {loading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Thinking...</p>
                <Progress value={undefined} className="h-1" />
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <Card
                    key={i}
                    className={`transition-opacity ${dismissed.has(i) ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{s.title}</span>
                            {s.room && (
                              <Badge variant="outline" className="text-[10px]">{s.room}</Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] ${priorityColors[s.priority] || ''}`}>
                              {s.priority}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {frequencyLabels[s.frequency] || s.frequency}
                            </Badge>
                            {s.estimatedMinutes && (
                              <span className="text-[10px] text-muted-foreground">{s.estimatedMinutes} min</span>
                            )}
                          </div>
                          {s.description && (
                            <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {dismissed.has(i) ? (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Check size={10} /> Added
                            </Badge>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleAddSuggestion(s, i)}>
                                <Plus size={14} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setDismissed(prev => new Set(prev).add(i))}>
                                <Trash size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Smart Add Tab ──────────────────────────────────────────── */}
          <TabsContent value="smart-add" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Describe a chore in plain language and AI will parse it into structured fields.
            </p>

            <Textarea
              placeholder='e.g., "Vacuum the living room every Tuesday and Thursday, high priority, takes about 20 minutes"'
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              className="min-h-[80px]"
            />

            <Button onClick={handleParseNL} disabled={loading || !nlInput.trim()} className="gap-1">
              {loading ? <Spinner size={16} className="animate-spin" /> : <MagicWand size={16} />}
              Parse Chore
            </Button>

            {loading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Parsing...</p>
                <Progress value={undefined} className="h-1" />
              </div>
            )}

            {parsedChore && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Lightning size={14} className="text-primary" />
                    Parsed Result
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Title</span>
                      <p className="font-medium">{parsedChore.title}</p>
                    </div>
                    {parsedChore.description && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">Description</span>
                        <p>{parsedChore.description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground text-xs">Room</span>
                      <p>{parsedChore.room || parsedChore.rooms?.join(', ') || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Frequency</span>
                      <p>{frequencyLabels[parsedChore.frequency] || parsedChore.frequency}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Priority</span>
                      <Badge variant="outline" className={`text-xs ${priorityColors[parsedChore.priority] || ''}`}>
                        {parsedChore.priority}
                      </Badge>
                    </div>
                    {parsedChore.estimatedMinutes && (
                      <div>
                        <span className="text-muted-foreground text-xs">Estimated Time</span>
                        <p>{parsedChore.estimatedMinutes} min</p>
                      </div>
                    )}
                    {parsedChore.assignedTo && (
                      <div>
                        <span className="text-muted-foreground text-xs">Assigned To</span>
                        <p>{parsedChore.assignedTo}</p>
                      </div>
                    )}
                    {parsedChore.daysOfWeek && parsedChore.daysOfWeek.length > 0 && (
                      <div>
                        <span className="text-muted-foreground text-xs">Days</span>
                        <p>{parsedChore.daysOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleAddParsedChore} className="gap-1">
                      <Plus size={14} />
                      Add Chore
                    </Button>
                    <Button variant="outline" onClick={() => setParsedChore(null)}>
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Workload Tab ───────────────────────────────────────────── */}
          <TabsContent value="workload" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Analyze how chores are distributed across household members and get rebalancing suggestions.
            </p>

            {members.length < 2 ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                <Users size={16} />
                You need at least 2 household members for workload analysis.
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button onClick={handleAnalyzeWorkload} disabled={loading} className="gap-1">
                    {loading ? <Spinner size={16} className="animate-spin" /> : <Users size={16} />}
                    Analyze Workload
                  </Button>
                  {workload && workload.suggestions.length > 0 && (
                    <Button variant="outline" onClick={handleApplyWorkloadSuggestions} className="gap-1">
                      <ArrowsClockwise size={16} />
                      Apply All
                    </Button>
                  )}
                </div>

                {loading && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Analyzing...</p>
                    <Progress value={undefined} className="h-1" />
                  </div>
                )}

                {workload && (
                  <div className="space-y-3">
                    <p className="text-sm">{workload.summary}</p>

                    {/* Member stats */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Breakdown</h4>
                      {workload.memberStats.map(stat => {
                        const maxMinutes = Math.max(...workload.memberStats.map(s => s.estimatedWeeklyMinutes), 1)
                        return (
                          <div key={stat.member} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{stat.member}</span>
                              <span className="text-muted-foreground text-xs">
                                {stat.choreCount} chores &bull; ~{stat.estimatedWeeklyMinutes} min/week &bull; {stat.completionsLast30Days} done (30d)
                              </span>
                            </div>
                            <Progress value={(stat.estimatedWeeklyMinutes / maxMinutes) * 100} className="h-2" />
                          </div>
                        )
                      })}
                    </div>

                    {/* Suggestions */}
                    {workload.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested Reassignments</h4>
                        {workload.suggestions.map((s, i) => (
                          <Card key={i}>
                            <CardContent className="p-3 flex items-center gap-2 text-sm">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{s.choreTitle}</span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <span>{s.currentAssignee || 'Unassigned'}</span>
                                  <ArrowRight size={12} />
                                  <span className="text-primary font-medium">{s.suggestedAssignee}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Schedule Tab ───────────────────────────────────────────── */}
          <TabsContent value="schedule" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              AI analyzes completion patterns and suggests schedule adjustments for your recurring chores.
            </p>

            <div className="flex gap-2">
              <Button onClick={handleAnalyzeSchedule} disabled={loading} className="gap-1">
                {loading ? <Spinner size={16} className="animate-spin" /> : <CalendarDots size={16} />}
                Analyze Schedules
              </Button>
              {schedule && schedule.suggestions.length > 0 && (
                <Button variant="outline" onClick={handleApplyAllSchedule} className="gap-1">
                  <ArrowsClockwise size={16} />
                  Apply All
                </Button>
              )}
            </div>

            {loading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Analyzing completion patterns...</p>
                <Progress value={undefined} className="h-1" />
              </div>
            )}

            {schedule && (
              <div className="space-y-3">
                <p className="text-sm">{schedule.summary}</p>

                {schedule.suggestions.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                    <Check size={16} className="text-green-500" />
                    All schedules look good! No changes recommended.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedule.suggestions.map((s, i) => (
                      <Card key={i}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-sm">{s.choreTitle}</span>
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {frequencyLabels[s.currentFrequency] || s.currentFrequency}
                                </Badge>
                                <ArrowRight size={12} className="text-muted-foreground" />
                                <Badge variant="secondary" className="text-[10px] text-primary">
                                  {frequencyLabels[s.suggestedFrequency] || s.suggestedFrequency}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs shrink-0"
                              onClick={() => handleApplyScheduleSuggestion(s)}
                            >
                              Apply
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
