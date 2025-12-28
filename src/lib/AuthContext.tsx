import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, ApiError } from '@/lib/api'
import type { Household, HouseholdMember, User } from '@/lib/types'

interface AuthResult {
  success: boolean
  error?: string
}

interface AuthState {
  user: User
  households: Household[]
  householdMembers: HouseholdMember[]
  currentHouseholdId: string | null
}

interface AuthContextType {
  currentUser: User | null
  currentHousehold: Household | null
  householdMembers: HouseholdMember[]
  userHouseholds: Household[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<AuthResult>
  switchHousehold: (householdId: string) => Promise<void>
  createHousehold: (name: string) => Promise<Household | null>
  joinHousehold: (inviteCode: string) => Promise<AuthResult>
  addHouseholdMember: (displayName: string) => Promise<HouseholdMember | null>
  removeHouseholdMember: (memberId: string) => Promise<boolean>
  currentUserRole: 'owner' | 'admin' | 'member' | null
  lastAuthError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastAuthError, setLastAuthError] = useState<string | null>(null)

  const applyAuthPayload = useCallback((payload: AuthState | null) => {
    setAuthState(payload)
    setLastAuthError(null)
  }, [])

  const loadSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const payload = await apiRequest<AuthState>('/api/auth/me', { skipAuthError: true })
      applyAuthPayload(payload)
    } catch (err) {
      // Ignore unauthenticated errors on initial load
      const status = err instanceof ApiError ? err.status : null
      if (status !== 401) {
        setLastAuthError(err instanceof Error ? err.message : 'Failed to load session')
      }
      applyAuthPayload(null)
    } finally {
      setIsLoading(false)
    }
  }, [applyAuthPayload])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  const currentUser = authState?.user ?? null
  const currentHousehold = useMemo(() => {
    if (!authState) return null
    if (authState.currentHouseholdId) {
      const found = authState.households.find(h => h.id === authState.currentHouseholdId)
      if (found) return found
    }
    return authState.households[0] || null
  }, [authState])

  const householdMembersAll = authState?.householdMembers ?? []
  const householdMembers = useMemo(() => {
    if (!currentHousehold) return []
    return householdMembersAll.filter(m => m.householdId === currentHousehold.id)
  }, [currentHousehold, householdMembersAll])

  const userHouseholds = useMemo(() => {
    if (!authState || !currentUser) return []
    const membershipIds = authState.householdMembers
      .filter(m => m.userId === currentUser.id)
      .map(m => m.householdId)
    return authState.households.filter(h => membershipIds.includes(h.id))
  }, [authState, currentUser])

  const currentUserRole = useMemo(() => {
    if (!currentUser || !currentHousehold) return null
    return householdMembers.find(m => m.userId === currentUser.id)?.role || null
  }, [currentUser, currentHousehold, householdMembers])

  const handleAuthError = (error: unknown, fallback: string) => {
    const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback
    setLastAuthError(message)
    return message
  }

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      setIsLoading(true)
      try {
        const payload = await apiRequest<AuthState>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        applyAuthPayload(payload)
        return { success: true }
      } catch (err) {
        const message = handleAuthError(err, 'Login failed')
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [applyAuthPayload]
  )

  const signup = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthResult> => {
      setIsLoading(true)
      try {
        const payload = await apiRequest<AuthState>('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password, displayName })
        })
        applyAuthPayload(payload)
        return { success: true }
      } catch (err) {
        const message = handleAuthError(err, 'Signup failed')
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [applyAuthPayload]
  )

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout errors
    } finally {
      applyAuthPayload(null)
    }
  }, [applyAuthPayload])

  const switchHousehold = useCallback(
    async (householdId: string) => {
      if (!householdId) return
      try {
        const payload = await apiRequest<AuthState>('/api/auth/switch-household', {
          method: 'POST',
          body: JSON.stringify({ householdId })
        })
        applyAuthPayload(payload)
      } catch (err) {
        handleAuthError(err, 'Failed to switch household')
      }
    },
    [applyAuthPayload]
  )

  const createHousehold = useCallback(
    async (name: string): Promise<Household | null> => {
      if (!name.trim()) return null
      try {
        const payload = await apiRequest<AuthState>('/api/households', {
          method: 'POST',
          body: JSON.stringify({ name })
        })
        applyAuthPayload(payload)
        return payload.households.find(h => h.id === payload.currentHouseholdId) || null
      } catch (err) {
        handleAuthError(err, 'Failed to create household')
        return null
      }
    },
    [applyAuthPayload]
  )

  const joinHousehold = useCallback(
    async (inviteCode: string): Promise<AuthResult> => {
      if (!inviteCode.trim()) return { success: false, error: 'Invite code is required' }
      try {
        const payload = await apiRequest<AuthState>('/api/households/join', {
          method: 'POST',
          body: JSON.stringify({ inviteCode })
        })
        applyAuthPayload(payload)
        return { success: true }
      } catch (err) {
        const message = handleAuthError(err, 'Failed to join household')
        return { success: false, error: message }
      }
    },
    [applyAuthPayload]
  )

  const addHouseholdMember = useCallback(
    async (displayName: string): Promise<HouseholdMember | null> => {
      if (!displayName.trim() || !authState?.currentHouseholdId) return null
      try {
        const payload = await apiRequest<AuthState>('/api/households/members', {
          method: 'POST',
          body: JSON.stringify({ displayName, householdId: authState.currentHouseholdId })
        })
        applyAuthPayload(payload)
        const newest = payload.householdMembers
          .filter(m => m.householdId === payload.currentHouseholdId)
          .slice(-1)[0]
        return newest || null
      } catch (err) {
        handleAuthError(err, 'Failed to add member')
        return null
      }
    },
    [applyAuthPayload, authState?.currentHouseholdId]
  )

  const removeHouseholdMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (!memberId || !authState?.currentHouseholdId) return false
      try {
        const payload = await apiRequest<AuthState>(`/api/households/members/${memberId}`, {
          method: 'DELETE'
        })
        applyAuthPayload(payload)
        return true
      } catch (err) {
        handleAuthError(err, 'Failed to remove member')
        return false
      }
    },
    [applyAuthPayload, authState?.currentHouseholdId]
  )

  const value: AuthContextType = {
    currentUser,
    currentHousehold,
    householdMembers,
    userHouseholds,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    logout,
    signup,
    switchHousehold,
    createHousehold,
    joinHousehold,
    addHouseholdMember,
    removeHouseholdMember,
    currentUserRole,
    lastAuthError
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
