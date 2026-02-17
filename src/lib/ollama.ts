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

  const response = await fetch(`${config.url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const response = await fetch(`${config.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const config = getOllamaConfig()
  try {
    const response = await fetch(`${config.url}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
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
