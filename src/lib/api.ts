export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface RequestOptions extends RequestInit {
  skipAuthError?: boolean
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthError, headers, ...rest } = options
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {})
    },
    ...rest
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : null

  if (!response.ok) {
    if (response.status === 401 && skipAuthError) {
      throw new ApiError('Not authenticated', response.status)
    }
    const message = body?.error || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return body as T
}
