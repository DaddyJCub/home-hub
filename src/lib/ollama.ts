const STORAGE_KEY = 'hh_kv_ollama-config'
const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2'

export interface OllamaConfig {
  url: string
  model: string
}

export function getOllamaConfig(): OllamaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        url: (parsed?.url || DEFAULT_OLLAMA_URL).trim().replace(/\/+$/, ''),
        model: (parsed?.model || DEFAULT_MODEL).trim(),
      }
    }
  } catch {
    // ignore parse errors
  }
  return { url: DEFAULT_OLLAMA_URL, model: DEFAULT_MODEL }
}

/**
 * Route requests through the server-side proxy to avoid CORS issues.
 * The proxy forwards to the user-configured Ollama URL.
 */
async function ollamaFetch(
  apiPath: string,
  options: RequestInit = {},
): Promise<Response> {
  const config = getOllamaConfig()
  return fetch(`/api/ollama${apiPath}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-Ollama-Url': config.url,
    },
    credentials: 'include',
  })
}

export async function ollamaGenerate(
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  const config = getOllamaConfig()
  const body: Record<string, unknown> = {
    model: config.model,
    prompt,
    stream: false,
  }
  if (systemPrompt) {
    body.system = systemPrompt
  }

  const response = await ollamaFetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Ollama request failed (${response.status}): ${text || response.statusText}`,
    )
  }

  const data = await response.json()
  return data.response ?? ''
}

export async function ollamaChat(
  messages: { role: string; content: string }[],
): Promise<string> {
  const config = getOllamaConfig()

  const response = await ollamaFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Ollama chat failed (${response.status}): ${text || response.statusText}`,
    )
  }

  const data = await response.json()
  return data.message?.content ?? ''
}

export async function testOllamaConnection(): Promise<{
  ok: boolean
  models?: string[]
  error?: string
}> {
  try {
    const response = await ollamaFetch('/api/tags', {
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { ok: false, error: `HTTP ${response.status}: ${text || response.statusText}` }
    }
    const data = await response.json()
    const models = (data.models ?? []).map(
      (m: { name: string }) => m.name,
    )
    return { ok: true, models }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Connection failed'
    return { ok: false, error: message }
  }
}
