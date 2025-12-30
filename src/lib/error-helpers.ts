import { toast } from 'sonner'
import { ApiError } from '@/lib/api'

const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ACCOUNT_NOT_FOUND: 'No account exists for that email yet.',
  EMAIL_EXISTS: 'That email is already registered.',
  NOT_AUTHENTICATED: 'Please sign in to continue.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please double-check the required fields.',
  NOT_FOUND: 'Requested item was not found.',
  SERVER_ERROR: 'Something went wrong. Please try again.'
}

export function getUserFriendlyMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') {
    return error || fallback
  }
  if (error instanceof ApiError) {
    if (error.code && CODE_MESSAGES[error.code]) {
      return CODE_MESSAGES[error.code]
    }
    return error.message || fallback
  }
  if (error instanceof Error) return error.message || fallback
  return fallback
}

export function showUserFriendlyError(error: unknown, fallback: string): string {
  const message = getUserFriendlyMessage(error, fallback)
  toast.error(message)
  return message
}

export function validateRequired(value: string, label: string): string | null {
  if (!value?.trim()) return `${label} is required`
  return null
}
