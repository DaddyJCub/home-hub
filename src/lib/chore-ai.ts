import { ollamaGenerateJSON } from './ollama'
import type { Chore, ChoreCompletion, ChoreFrequency } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AISuggestedChore {
  title: string
  description?: string
  room?: string
  frequency: ChoreFrequency
  priority: 'low' | 'medium' | 'high'
  estimatedMinutes?: number
  assignedTo?: string
}

export interface ParsedChore {
  title: string
  description?: string
  room?: string
  rooms?: string[]
  frequency: ChoreFrequency
  priority: 'low' | 'medium' | 'high'
  estimatedMinutes?: number
  assignedTo?: string
  daysOfWeek?: number[]
  customIntervalDays?: number
}

export interface WorkloadMemberStats {
  member: string
  choreCount: number
  estimatedWeeklyMinutes: number
  completionsLast30Days: number
  completionRate: number
}

export interface WorkloadSuggestion {
  choreTitle: string
  choreId: string
  currentAssignee: string
  suggestedAssignee: string
  reason: string
}

export interface WorkloadAnalysis {
  memberStats: WorkloadMemberStats[]
  suggestions: WorkloadSuggestion[]
  summary: string
}

export interface ScheduleSuggestion {
  choreTitle: string
  choreId: string
  currentFrequency: ChoreFrequency
  suggestedFrequency: ChoreFrequency
  suggestedCustomDays?: number
  reason: string
}

export interface ScheduleAnalysis {
  suggestions: ScheduleSuggestion[]
  summary: string
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

interface AIContext {
  rooms: string[]
  members: string[]
  existingChores: Chore[]
  completions?: ChoreCompletion[]
}

function buildContextBlock(ctx: AIContext): string {
  const lines: string[] = []
  lines.push(`Rooms in this household: ${ctx.rooms.length > 0 ? ctx.rooms.join(', ') : 'None defined'}`)
  lines.push(`Household members: ${ctx.members.length > 0 ? ctx.members.join(', ') : 'Unknown'}`)
  if (ctx.existingChores.length > 0) {
    lines.push(`\nExisting chores (${ctx.existingChores.length}):`)
    for (const c of ctx.existingChores.slice(0, 50)) {
      const rooms = c.rooms?.length ? c.rooms.join(', ') : c.room || 'no room'
      lines.push(`- "${c.title}" | room: ${rooms} | freq: ${c.frequency} | priority: ${c.priority || 'medium'} | assigned: ${c.assignedTo || 'anyone'}`)
    }
    if (ctx.existingChores.length > 50) {
      lines.push(`  ... and ${ctx.existingChores.length - 50} more`)
    }
  } else {
    lines.push('No existing chores yet.')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// 1. Generate chore suggestions
// ---------------------------------------------------------------------------

export async function generateChoreSuggestions(
  ctx: AIContext,
  count: number = 8,
): Promise<AISuggestedChore[]> {
  const contextBlock = buildContextBlock(ctx)

  const systemPrompt = `You are a helpful household management assistant. You suggest practical household chores that are missing from the user's chore list. Focus on common cleaning, maintenance, and organizational tasks appropriate for the rooms and household size. Do not suggest chores that already exist. Be practical and specific.`

  const prompt = `${contextBlock}

Based on the household above, suggest ${count} new chores that would be useful additions. Consider what's missing for each room and common household maintenance tasks.

Respond with a JSON array of objects. Each object must have:
- "title" (string, concise chore name)
- "description" (string, 1-2 sentence explanation of what to do)
- "room" (string, one of the rooms listed above, or empty string if general)
- "frequency" (one of: "once", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly")
- "priority" (one of: "low", "medium", "high")
- "estimatedMinutes" (number, realistic time estimate)

Example format:
[{"title":"Clean Oven","description":"Deep clean the oven interior and racks.","room":"Kitchen","frequency":"monthly","priority":"medium","estimatedMinutes":45}]`

  const result = await ollamaGenerateJSON<AISuggestedChore[]>(prompt, systemPrompt)

  if (!Array.isArray(result)) {
    throw new Error('AI returned an unexpected format — expected an array of chore suggestions.')
  }

  return result.map(item => ({
    title: String(item.title || '').trim(),
    description: item.description ? String(item.description).trim() : undefined,
    room: item.room ? String(item.room).trim() : undefined,
    frequency: validateFrequency(item.frequency),
    priority: validatePriority(item.priority),
    estimatedMinutes: typeof item.estimatedMinutes === 'number' ? item.estimatedMinutes : undefined,
    assignedTo: item.assignedTo ? String(item.assignedTo).trim() : undefined,
  }))
}

// ---------------------------------------------------------------------------
// 2. Parse natural language chore
// ---------------------------------------------------------------------------

export async function parseNaturalLanguageChore(
  input: string,
  ctx: AIContext,
): Promise<ParsedChore> {
  const contextBlock = buildContextBlock(ctx)

  const systemPrompt = `You are a household chore parser. Given natural language describing a chore, extract structured fields. Match rooms and members to those available in the household. Infer reasonable defaults for missing fields.`

  const prompt = `${contextBlock}

Parse this natural language chore description into structured data:
"${input}"

Respond with a single JSON object with these fields:
- "title" (string, concise chore name)
- "description" (string or null, additional details)
- "room" (string or null, must match one of the household rooms if specified)
- "rooms" (array of strings or null, if multiple rooms are mentioned)
- "frequency" (one of: "once", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom")
- "priority" (one of: "low", "medium", "high")
- "estimatedMinutes" (number or null)
- "assignedTo" (string or null, must match a household member name if specified)
- "daysOfWeek" (array of numbers 0-6 where 0=Sunday, or null, if specific days are mentioned)
- "customIntervalDays" (number or null, only if frequency is "custom")`

  const result = await ollamaGenerateJSON<ParsedChore>(prompt, systemPrompt)

  if (!result || typeof result !== 'object' || !result.title) {
    throw new Error('AI could not parse the chore description. Try being more specific.')
  }

  return {
    title: String(result.title).trim(),
    description: result.description ? String(result.description).trim() : undefined,
    room: result.room ? String(result.room).trim() : undefined,
    rooms: Array.isArray(result.rooms) ? result.rooms.map(r => String(r).trim()) : undefined,
    frequency: validateFrequency(result.frequency),
    priority: validatePriority(result.priority),
    estimatedMinutes: typeof result.estimatedMinutes === 'number' ? result.estimatedMinutes : undefined,
    assignedTo: result.assignedTo ? String(result.assignedTo).trim() : undefined,
    daysOfWeek: Array.isArray(result.daysOfWeek) ? result.daysOfWeek.filter(d => typeof d === 'number' && d >= 0 && d <= 6) : undefined,
    customIntervalDays: typeof result.customIntervalDays === 'number' ? result.customIntervalDays : undefined,
  }
}

// ---------------------------------------------------------------------------
// 3. Analyze workload distribution
// ---------------------------------------------------------------------------

export async function analyzeWorkloadDistribution(
  ctx: AIContext & { completions: ChoreCompletion[] },
): Promise<WorkloadAnalysis> {
  const { existingChores, completions, members } = ctx

  // Build local stats to include in the prompt
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const recentCompletions = completions.filter(c => c.completedAt >= thirtyDaysAgo && !c.skipped)

  const memberStats = members.map(member => {
    const assigned = existingChores.filter(c => c.assignedTo === member)
    const completedByMember = recentCompletions.filter(c => c.completedBy === member)
    const weeklyMin = assigned.reduce((sum, c) => {
      const est = c.estimatedMinutes || 15
      switch (c.frequency) {
        case 'daily': return sum + est * 7
        case 'weekly': return sum + est
        case 'biweekly': return sum + est / 2
        case 'monthly': return sum + est / 4
        case 'quarterly': return sum + est / 13
        case 'yearly': return sum + est / 52
        default: return sum + est / 4
      }
    }, 0)

    return {
      member,
      choreCount: assigned.length,
      estimatedWeeklyMinutes: Math.round(weeklyMin),
      completionsLast30Days: completedByMember.length,
    }
  })

  const contextBlock = buildContextBlock(ctx)
  const statsBlock = memberStats.map(s =>
    `- ${s.member}: ${s.choreCount} chores assigned, ~${s.estimatedWeeklyMinutes} min/week estimated, ${s.completionsLast30Days} completions in last 30 days`
  ).join('\n')

  const systemPrompt = `You are a household fairness analyst. Analyze chore distribution across household members and suggest improvements for fair distribution. Be constructive and specific.`

  const prompt = `${contextBlock}

Current workload statistics:
${statsBlock}

Analyze the workload distribution and suggest specific reassignments to make it more fair. Consider both the number of chores and estimated time.

Respond with JSON:
{
  "memberStats": [{"member":"Name","choreCount":0,"estimatedWeeklyMinutes":0,"completionsLast30Days":0,"completionRate":0.0}],
  "suggestions": [{"choreTitle":"string","choreId":"string","currentAssignee":"string","suggestedAssignee":"string","reason":"string"}],
  "summary": "A brief 1-3 sentence summary of the current balance and key recommendation."
}

For completionRate, calculate as completions / expected completions (estimate from frequency). Use actual chore IDs and titles from the existing chores list for suggestions.`

  const result = await ollamaGenerateJSON<WorkloadAnalysis>(prompt, systemPrompt)

  // Merge AI analysis with local stats
  return {
    memberStats: memberStats.map(local => {
      const aiMatch = result.memberStats?.find(a => a.member === local.member)
      return {
        ...local,
        completionRate: aiMatch?.completionRate ?? 0,
      }
    }),
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions.filter(s => s.choreTitle && s.suggestedAssignee)
      : [],
    summary: String(result.summary || 'Analysis complete.'),
  }
}

// ---------------------------------------------------------------------------
// 4. Suggest schedule optimizations
// ---------------------------------------------------------------------------

export async function suggestScheduleOptimizations(
  ctx: AIContext & { completions: ChoreCompletion[] },
): Promise<ScheduleAnalysis> {
  const { existingChores, completions } = ctx
  const now = Date.now()
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

  // Build completion pattern data per chore
  const chorePatterns = existingChores
    .filter(c => c.frequency !== 'once')
    .map(chore => {
      const choreCompletions = completions
        .filter(c => c.choreId === chore.id && c.completedAt >= ninetyDaysAgo && !c.skipped)
        .sort((a, b) => a.completedAt - b.completedAt)

      // Calculate average interval between completions
      let avgInterval = 0
      if (choreCompletions.length >= 2) {
        const intervals: number[] = []
        for (let i = 1; i < choreCompletions.length; i++) {
          intervals.push(choreCompletions[i].completedAt - choreCompletions[i - 1].completedAt)
        }
        avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length / (24 * 60 * 60 * 1000))
      }

      const skips = completions.filter(c => c.choreId === chore.id && c.completedAt >= ninetyDaysAgo && c.skipped).length

      return {
        id: chore.id,
        title: chore.title,
        frequency: chore.frequency,
        customIntervalDays: chore.customIntervalDays,
        completionCount: choreCompletions.length,
        skipCount: skips,
        avgDaysBetween: avgInterval,
      }
    })

  const contextBlock = buildContextBlock(ctx)
  const patternBlock = chorePatterns.map(p =>
    `- "${p.title}" (id: ${p.id}): freq=${p.frequency}, ${p.completionCount} completions, ${p.skipCount} skips in 90d, avg ${p.avgDaysBetween || '?'} days between completions`
  ).join('\n')

  const systemPrompt = `You are a household scheduling optimizer. Analyze chore completion patterns and suggest frequency adjustments. Only suggest changes where there's a clear mismatch between the set frequency and actual completion patterns.`

  const prompt = `${contextBlock}

Completion patterns (last 90 days):
${patternBlock}

Analyze these patterns and suggest frequency changes where the current schedule doesn't match reality. For example, if a weekly chore is only completed monthly, suggest changing it to monthly.

Respond with JSON:
{
  "suggestions": [{"choreTitle":"string","choreId":"string","currentFrequency":"string","suggestedFrequency":"string","suggestedCustomDays":null,"reason":"string"}],
  "summary": "A brief 1-3 sentence summary of scheduling health and key recommendations."
}

Only include chores that would genuinely benefit from a schedule change. Use valid frequency values: "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom".`

  const result = await ollamaGenerateJSON<ScheduleAnalysis>(prompt, systemPrompt)

  return {
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions
          .filter(s => s.choreTitle && s.choreId)
          .map(s => ({
            ...s,
            currentFrequency: validateFrequency(s.currentFrequency),
            suggestedFrequency: validateFrequency(s.suggestedFrequency),
          }))
      : [],
    summary: String(result.summary || 'Analysis complete.'),
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_FREQUENCIES: ChoreFrequency[] = ['once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const

function validateFrequency(val: unknown): ChoreFrequency {
  if (typeof val === 'string' && VALID_FREQUENCIES.includes(val as ChoreFrequency)) {
    return val as ChoreFrequency
  }
  return 'weekly'
}

function validatePriority(val: unknown): 'low' | 'medium' | 'high' {
  if (typeof val === 'string' && (VALID_PRIORITIES as readonly string[]).includes(val)) {
    return val as 'low' | 'medium' | 'high'
  }
  return 'medium'
}
