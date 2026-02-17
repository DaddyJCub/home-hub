const STORAGE_PREFIX = 'hh_kv_'

const readValue = (key: string) => {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

const writeValue = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  try {
    if (value === undefined) {
      window.localStorage.removeItem(STORAGE_PREFIX + key)
    } else {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    }
  } catch {
    // ignore
  }
}

const deleteValue = (key: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // ignore
  }
}

const keys = () => {
  if (typeof window === 'undefined') return []
  return Object.keys(window.localStorage)
    .filter(k => k.startsWith(STORAGE_PREFIX))
    .map(k => k.replace(STORAGE_PREFIX, ''))
}

if (typeof window !== 'undefined') {
  window.spark = {
    kv: {
      keys: async () => keys(),
      get: async (key: string) => readValue(key),
      set: async (key: string, value: any) => writeValue(key, value),
      delete: async (key: string) => deleteValue(key),
    },
    llmPrompt: (parts: string[], content: string) => {
      // Combine template parts around the content
      return parts.length > 1 ? parts[0] + content + parts[1] : parts[0] + content
    },
    llm: async (prompt: any, _model?: string, _streaming?: boolean) => {
      // Forward to Ollama via the ollama module
      const { ollamaGenerate } = await import('@/lib/ollama')
      const promptStr = typeof prompt === 'string' ? prompt : String(prompt)
      return ollamaGenerate(promptStr)
    },
    user: async () => null
  }
}

declare global {
  interface Window {
    spark?: {
      kv: {
        keys: () => Promise<string[]>
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<void>
        delete: (key: string) => Promise<void>
      }
      llmPrompt?: ((parts: string[], html: string) => any) | undefined
      llm?: ((prompt: any, model: string, streaming?: boolean) => Promise<string | undefined>) | undefined
      user?: () => Promise<unknown>
    }
  }
}
