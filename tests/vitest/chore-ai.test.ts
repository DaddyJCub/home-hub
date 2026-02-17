import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the ollama module before any imports that use it
vi.mock('@/lib/ollama', () => ({
  ollamaGenerateJSON: vi.fn(),
  testOllamaConnection: vi.fn().mockResolvedValue({ ok: true, models: ['llama3.2'] }),
}))

import {
  generateChoreSuggestions,
  parseNaturalLanguageChore,
  analyzeWorkloadDistribution,
  suggestScheduleOptimizations,
} from '@/lib/chore-ai'
import { ollamaGenerateJSON } from '@/lib/ollama'
import type { Chore, ChoreCompletion } from '@/lib/types'

const mockedGenerateJSON = vi.mocked(ollamaGenerateJSON)

const baseChore: Chore = {
  id: 'c1',
  householdId: 'h1',
  title: 'Do Dishes',
  assignedTo: 'Alice',
  frequency: 'daily',
  completed: false,
  createdAt: Date.now(),
  room: 'Kitchen',
  rooms: ['Kitchen'],
  priority: 'medium',
  estimatedMinutes: 15,
}

const baseCompletion: ChoreCompletion = {
  id: 'comp1',
  choreId: 'c1',
  completedBy: 'Alice',
  householdId: 'h1',
  completedAt: Date.now() - 86400000,
}

const baseContext = {
  rooms: ['Kitchen', 'Bathroom', 'Living Room'],
  members: ['Alice', 'Bob'],
  existingChores: [baseChore],
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// generateChoreSuggestions
// ---------------------------------------------------------------------------

describe('generateChoreSuggestions', () => {
  it('returns parsed suggestions from AI response', async () => {
    const mockResponse = [
      {
        title: 'Clean Oven',
        description: 'Deep clean the oven interior.',
        room: 'Kitchen',
        frequency: 'monthly',
        priority: 'medium',
        estimatedMinutes: 45,
      },
      {
        title: 'Scrub Toilet',
        description: 'Clean the toilet bowl and seat.',
        room: 'Bathroom',
        frequency: 'weekly',
        priority: 'high',
        estimatedMinutes: 10,
      },
    ]

    mockedGenerateJSON.mockResolvedValueOnce(mockResponse)

    const result = await generateChoreSuggestions(baseContext, 2)

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Clean Oven')
    expect(result[0].frequency).toBe('monthly')
    expect(result[0].room).toBe('Kitchen')
    expect(result[1].title).toBe('Scrub Toilet')
    expect(result[1].priority).toBe('high')
  })

  it('validates and defaults invalid frequency values', async () => {
    mockedGenerateJSON.mockResolvedValueOnce([
      { title: 'Test', frequency: 'biannual', priority: 'medium', estimatedMinutes: 10 },
    ])

    const result = await generateChoreSuggestions(baseContext, 1)

    expect(result[0].frequency).toBe('weekly') // default for invalid
  })

  it('validates and defaults invalid priority values', async () => {
    mockedGenerateJSON.mockResolvedValueOnce([
      { title: 'Test', frequency: 'daily', priority: 'urgent', estimatedMinutes: 10 },
    ])

    const result = await generateChoreSuggestions(baseContext, 1)

    expect(result[0].priority).toBe('medium') // default for invalid
  })

  it('throws on non-array response', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({ title: 'not an array' })

    await expect(generateChoreSuggestions(baseContext)).rejects.toThrow('unexpected format')
  })

  it('includes existing chore titles in the prompt context', async () => {
    mockedGenerateJSON.mockResolvedValueOnce([])

    await generateChoreSuggestions(baseContext).catch(() => {})

    const call = mockedGenerateJSON.mock.calls[0]
    expect(call[0]).toContain('Do Dishes')
  })
})

// ---------------------------------------------------------------------------
// parseNaturalLanguageChore
// ---------------------------------------------------------------------------

describe('parseNaturalLanguageChore', () => {
  it('returns parsed chore from natural language input', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({
      title: 'Vacuum Living Room',
      description: 'Vacuum the carpet and rugs',
      room: 'Living Room',
      frequency: 'weekly',
      priority: 'medium',
      estimatedMinutes: 20,
      assignedTo: 'Bob',
      daysOfWeek: [2, 4],
    })

    const result = await parseNaturalLanguageChore('vacuum living room every tuesday and thursday', baseContext)

    expect(result.title).toBe('Vacuum Living Room')
    expect(result.room).toBe('Living Room')
    expect(result.frequency).toBe('weekly')
    expect(result.assignedTo).toBe('Bob')
    expect(result.daysOfWeek).toEqual([2, 4])
  })

  it('throws when AI returns no title', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({ description: 'something' })

    await expect(
      parseNaturalLanguageChore('do something', baseContext)
    ).rejects.toThrow('could not parse')
  })

  it('filters invalid daysOfWeek values', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({
      title: 'Test',
      frequency: 'weekly',
      priority: 'low',
      daysOfWeek: [1, 7, -1, 3],
    })

    const result = await parseNaturalLanguageChore('test', baseContext)

    expect(result.daysOfWeek).toEqual([1, 3]) // 7 and -1 filtered out
  })
})

// ---------------------------------------------------------------------------
// analyzeWorkloadDistribution
// ---------------------------------------------------------------------------

describe('analyzeWorkloadDistribution', () => {
  it('returns merged stats with AI analysis', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({
      memberStats: [
        { member: 'Alice', choreCount: 5, estimatedWeeklyMinutes: 120, completionsLast30Days: 20, completionRate: 0.9 },
        { member: 'Bob', choreCount: 1, estimatedWeeklyMinutes: 15, completionsLast30Days: 3, completionRate: 0.5 },
      ],
      suggestions: [
        {
          choreTitle: 'Do Dishes',
          choreId: 'c1',
          currentAssignee: 'Alice',
          suggestedAssignee: 'Bob',
          reason: 'Alice has 5x more chores than Bob',
        },
      ],
      summary: 'Alice is doing most of the work.',
    })

    const result = await analyzeWorkloadDistribution({
      ...baseContext,
      completions: [baseCompletion],
    })

    expect(result.memberStats).toHaveLength(2)
    expect(result.memberStats[0].member).toBe('Alice')
    // Local stats are used for choreCount (1, not 5 from AI, since we merge with local)
    expect(result.memberStats[0].choreCount).toBe(1)
    // completionRate comes from AI
    expect(result.memberStats[0].completionRate).toBe(0.9)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].suggestedAssignee).toBe('Bob')
    expect(result.summary).toBe('Alice is doing most of the work.')
  })

  it('handles empty suggestions gracefully', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({
      memberStats: [],
      suggestions: [],
      summary: 'Workload is balanced.',
    })

    const result = await analyzeWorkloadDistribution({
      ...baseContext,
      completions: [],
    })

    expect(result.suggestions).toEqual([])
    expect(result.summary).toBe('Workload is balanced.')
  })
})

// ---------------------------------------------------------------------------
// suggestScheduleOptimizations
// ---------------------------------------------------------------------------

describe('suggestScheduleOptimizations', () => {
  it('returns schedule suggestions', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({
      suggestions: [
        {
          choreTitle: 'Do Dishes',
          choreId: 'c1',
          currentFrequency: 'daily',
          suggestedFrequency: 'weekly',
          suggestedCustomDays: null,
          reason: 'Only completed once a week on average.',
        },
      ],
      summary: 'One schedule adjustment recommended.',
    })

    const result = await suggestScheduleOptimizations({
      ...baseContext,
      completions: [baseCompletion],
    })

    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].suggestedFrequency).toBe('weekly')
    expect(result.summary).toContain('adjustment')
  })

  it('validates frequency values in suggestions', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({
      suggestions: [
        {
          choreTitle: 'Test',
          choreId: 'c1',
          currentFrequency: 'invalid-freq',
          suggestedFrequency: 'also-invalid',
          reason: 'Test',
        },
      ],
      summary: 'Test',
    })

    const result = await suggestScheduleOptimizations({
      ...baseContext,
      completions: [],
    })

    expect(result.suggestions[0].currentFrequency).toBe('weekly') // default
    expect(result.suggestions[0].suggestedFrequency).toBe('weekly') // default
  })

  it('filters out suggestions missing choreId', async () => {
    mockedGenerateJSON.mockResolvedValueOnce({
      suggestions: [
        { choreTitle: 'Valid', choreId: 'c1', currentFrequency: 'daily', suggestedFrequency: 'weekly', reason: 'ok' },
        { choreTitle: 'Missing ID', choreId: '', currentFrequency: 'daily', suggestedFrequency: 'weekly', reason: 'bad' },
      ],
      summary: 'Test',
    })

    const result = await suggestScheduleOptimizations({
      ...baseContext,
      completions: [],
    })

    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].choreTitle).toBe('Valid')
  })
})
