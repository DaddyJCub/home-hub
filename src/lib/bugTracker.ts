// Bug Tracking System for HomeHub
// Captures errors and provides easy access for debugging

export interface BugReport {
  id: string
  timestamp: number
  type: 'error' | 'warning' | 'unhandled-rejection' | 'console-error'
  message: string
  stack?: string
  componentStack?: string
  url: string
  userAgent: string
  context?: Record<string, unknown>
  resolved: boolean
}

const BUG_STORAGE_KEY = 'homehub-bug-reports'
const MAX_BUGS = 100 // Keep last 100 bugs
const RATE_LIMIT_COUNT = 10
const RATE_LIMIT_WINDOW_MS = 10 * 1000
let recentTimestamps: number[] = []

// Generate unique ID
const generateId = () => `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Get all bug reports from localStorage
export const getBugReports = (): BugReport[] => {
  try {
    const stored = localStorage.getItem(BUG_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save bug reports to localStorage
const saveBugReports = (reports: BugReport[]) => {
  try {
    // Keep only the most recent bugs
    const trimmed = reports.slice(-MAX_BUGS)
    localStorage.setItem(BUG_STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('Failed to save bug reports:', e)
  }
}

// Add a new bug report
export const addBugReport = (
  type: BugReport['type'],
  message: string,
  options?: {
    stack?: string
    componentStack?: string
    context?: Record<string, unknown>
  }
): BugReport => {
  const now = Date.now()
  recentTimestamps = recentTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  if (recentTimestamps.length >= RATE_LIMIT_COUNT) {
    console.warn('Bug tracker rate limited')
    return {
      id: 'rate-limited',
      timestamp: now,
      type,
      message: 'Rate limited',
      url: window.location.href,
      userAgent: navigator.userAgent,
      resolved: false
    }
  }
  recentTimestamps.push(now)

  const report: BugReport = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    message,
    stack: options?.stack,
    componentStack: options?.componentStack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    context: options?.context,
    resolved: false,
  }

  const reports = getBugReports()
  reports.push(report)
  saveBugReports(reports)

  return report
}

// Mark a bug as resolved
export const resolveBug = (id: string) => {
  const reports = getBugReports()
  const updated = reports.map(r => r.id === id ? { ...r, resolved: true } : r)
  saveBugReports(updated)
}

// Delete a bug report
export const deleteBug = (id: string) => {
  const reports = getBugReports()
  const filtered = reports.filter(r => r.id !== id)
  saveBugReports(filtered)
}

// Clear all bug reports
export const clearAllBugs = () => {
  localStorage.removeItem(BUG_STORAGE_KEY)
}

// Clear resolved bugs only
export const clearResolvedBugs = () => {
  const reports = getBugReports()
  const unresolved = reports.filter(r => !r.resolved)
  saveBugReports(unresolved)
}

// Get unresolved bug count
export const getUnresolvedCount = (): number => {
  return getBugReports().filter(r => !r.resolved).length
}

// Format bug report for clipboard (ready to paste into chat)
export const formatBugForChat = (report: BugReport): string => {
  const lines = [
    '## Bug Report',
    '',
    `**Type:** ${report.type}`,
    `**Time:** ${new Date(report.timestamp).toLocaleString()}`,
    `**URL:** ${report.url}`,
    '',
    '### Error Message',
    '```',
    report.message,
    '```',
  ]

  if (report.stack) {
    lines.push('', '### Stack Trace', '```', report.stack, '```')
  }

  if (report.componentStack) {
    lines.push('', '### Component Stack', '```', report.componentStack, '```')
  }

  if (report.context && Object.keys(report.context).length > 0) {
    lines.push('', '### Context', '```json', JSON.stringify(report.context, null, 2), '```')
  }

  lines.push('', `**User Agent:** ${report.userAgent}`)

  return lines.join('\n')
}

// Format all unresolved bugs for clipboard
export const formatAllBugsForChat = (): string => {
  const reports = getBugReports().filter(r => !r.resolved)
  
  if (reports.length === 0) {
    return 'No unresolved bugs found.'
  }

  const lines = [
    `# HomeHub Bug Report (${reports.length} issues)`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
  ]

  reports.forEach((report, index) => {
    lines.push(`---`, '', `## Bug ${index + 1}: ${report.type}`, '')
    lines.push(formatBugForChat(report))
    lines.push('')
  })

  return lines.join('\n')
}

// Copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

// Initialize global error handlers
export const initBugTracking = () => {
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    addBugReport('error', event.message, {
      stack: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    addBugReport('unhandled-rejection', error?.message || String(error), {
      stack: error?.stack,
    })
  })

  // Intercept console.error
  const originalConsoleError = console.error
  console.error = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    
    // Avoid capturing our own bug tracker logs
    if (!message.includes('bug report') && !message.includes('BUG_STORAGE')) {
      addBugReport('console-error', message, {
        context: { args: args.length },
      })
    }
    
    originalConsoleError.apply(console, args)
  }

  console.log('[BugTracker] Initialized - capturing errors automatically')
}

// Export storage key for debugging
export { BUG_STORAGE_KEY }
