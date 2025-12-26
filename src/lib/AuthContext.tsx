import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { ensureClientKvDefaults } from '@/lib/kv-defaults'
import type { User, Household, HouseholdMember } from '@/lib/types'

interface AuthResult {
  success: boolean
  error?: string
}

interface AuthContextType {
  currentUser: User | null
  currentHousehold: Household | null
  householdMembers: HouseholdMember[]
  userHouseholds: Household[]
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => void
  signup: (email: string, password: string, displayName: string) => Promise<AuthResult>
  switchHousehold: (householdId: string) => void
  currentUserRole: 'owner' | 'admin' | 'member' | null
  lastAuthError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usersRaw, setUsers] = useKV<User[]>('users', [])
  const [currentUserId, setCurrentUserId] = useKV<string | null>('current-user-id', null)
  const [householdsRaw, setHouseholds] = useKV<Household[]>('households', [])
  const [householdMembersRaw, setHouseholdMembers] = useKV<HouseholdMember[]>('household-members-v2', [])
  const [currentHouseholdId, setCurrentHouseholdId] = useKV<string | null>('current-household-id', null)
  const [lastAuthError, setLastAuthError] = useState<string | null>(null)
  
  // Null-safe fallbacks - useKV may return null instead of undefined
  const users = Array.isArray(usersRaw) ? usersRaw : []
  const households = Array.isArray(householdsRaw) ? householdsRaw : []
  const householdMembers = Array.isArray(householdMembersRaw) ? householdMembersRaw : []
  
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null)
  const [userHouseholds, setUserHouseholds] = useState<Household[]>([])
  const [currentHouseholdMembers, setCurrentHouseholdMembers] = useState<HouseholdMember[]>([])

  useEffect(() => {
    ensureClientKvDefaults()
  }, [])

  // Heal corrupted KV data (non-array values)
  useEffect(() => {
    if (usersRaw && !Array.isArray(usersRaw)) {
      const fallback: User[] = []
      setUsers(fallback)
      window.spark?.kv?.set?.('users', fallback)
    }
  }, [usersRaw, setUsers])

  useEffect(() => {
    if (householdsRaw && !Array.isArray(householdsRaw)) {
      const fallback: Household[] = []
      setHouseholds(fallback)
      window.spark?.kv?.set?.('households', fallback)
    }
  }, [householdsRaw, setHouseholds])

  useEffect(() => {
    if (householdMembersRaw && !Array.isArray(householdMembersRaw)) {
      const fallback: HouseholdMember[] = []
      setHouseholdMembers(fallback)
      window.spark?.kv?.set?.('household-members-v2', fallback)
    }
  }, [householdMembersRaw, setHouseholdMembers])

  const persistKv = async (key: string, value: any) => {
    try {
      if (typeof window !== 'undefined' && window.spark?.kv?.set) {
        await window.spark.kv.set(key, value)
      }
    } catch {
      // best-effort; ignore
    }
  }

  const logAuthEvent = async (event: string, message: string, context?: Record<string, unknown>) => {
    try {
      await fetch('/_debug/auth-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, message, context }),
      })
    } catch {
      // Best-effort logging; ignore failures
    }
  }

  useEffect(() => {
    if (currentUserId && Array.isArray(users)) {
      const user = users.find(u => u.id === currentUserId)
      setCurrentUser(user || null)
      
      if (Array.isArray(householdMembers) && Array.isArray(households)) {
        const userMemberships = householdMembers.filter(m => m.userId === currentUserId)
        const userHouseholdIds = userMemberships.map(m => m.householdId)
        const userHouseholdsList = households.filter(h => userHouseholdIds.includes(h.id))
        setUserHouseholds(userHouseholdsList)
        
        if (!currentHouseholdId && userHouseholdsList.length > 0) {
          setCurrentHouseholdId(userHouseholdsList[0].id)
        }
      }
    } else {
      setCurrentUser(null)
      setUserHouseholds([])
    }
  }, [currentUserId, users, households, householdMembers, currentHouseholdId, setCurrentHouseholdId])

  useEffect(() => {
    if (currentHouseholdId && Array.isArray(households) && Array.isArray(householdMembers)) {
      const household = households.find(h => h.id === currentHouseholdId)
      setCurrentHousehold(household || null)
      
      const members = householdMembers.filter(m => m.householdId === currentHouseholdId)
      setCurrentHouseholdMembers(members)
    } else {
      setCurrentHousehold(null)
      setCurrentHouseholdMembers([])
    }
  }, [currentHouseholdId, households, householdMembers])

  const currentUserRole = currentUser && currentHousehold && currentHouseholdMembers.length > 0
    ? currentHouseholdMembers.find(m => m.userId === currentUser.id)?.role || null
    : null

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      if (!normalizedEmail || !password) {
        const error = 'Email and password are required'
        setLastAuthError(error)
        await logAuthEvent('login_error', error, { email: normalizedEmail })
        return { success: false, error }
      }

      const { verifyPassword, createHousehold, createHouseholdMember } = await import('@/lib/auth')

      if (!Array.isArray(users)) {
        const error = 'User storage is not ready yet'
        setLastAuthError(error)
        await logAuthEvent('login_error', error)
        return { success: false, error }
      }

      const user = users.find(u => u.email === normalizedEmail)
      if (!user) {
        const error = 'Account not found'
        setLastAuthError(error)
        await logAuthEvent('login_error', error, { email: normalizedEmail })
        return { success: false, error }
      }
      
      const isValid = await verifyPassword(password, user.passwordHash)
      if (!isValid) {
        const error = 'Invalid email or password'
        setLastAuthError(error)
        await logAuthEvent('login_error', error, { email: normalizedEmail })
        return { success: false, error }
      }

      setCurrentUserId(user.id)
      persistKv('current-user-id', user.id)
      setLastAuthError(null)

      const memberships = householdMembers.filter(m => m.userId === user.id)
      if (memberships.length === 0) {
        const newHousehold = await createHousehold(`${user.displayName || 'My'} Household`, user.id)
        const newMember = createHouseholdMember(newHousehold.id, user.id, user.displayName || 'Owner', 'owner')
        const updatedHouseholds = [...households, newHousehold]
        const updatedMembers = [...householdMembers, newMember]
        setHouseholds(updatedHouseholds)
        setHouseholdMembers(updatedMembers)
        setCurrentHouseholdId(newHousehold.id)
        persistKv('households', updatedHouseholds)
        persistKv('household-members-v2', updatedMembers)
        persistKv('current-household-id', newHousehold.id)
      } else if (!currentHouseholdId) {
        setCurrentHouseholdId(memberships[0].householdId)
        persistKv('current-household-id', memberships[0].householdId)
      }

      await logAuthEvent('login_success', 'User logged in', { email: normalizedEmail })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setLastAuthError(message)
      await logAuthEvent('login_error', message, { email })
      return { success: false, error: 'Unexpected error during login' }
    }
  }

  const logout = () => {
    setCurrentUserId(null)
    setCurrentHouseholdId(null)
    setLastAuthError(null)
  }

  const signup = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const normalizedName = displayName.trim()

      if (!normalizedName || !normalizedEmail) {
        const error = 'Name and email are required'
        setLastAuthError(error)
        await logAuthEvent('signup_error', error, { email: normalizedEmail })
        return { success: false, error }
      }

      const { createUser, createHousehold, createHouseholdMember } = await import('@/lib/auth')
      
      if (!Array.isArray(users) || !Array.isArray(households) || !Array.isArray(householdMembers)) {
        const error = 'Storage not initialized yet'
        setLastAuthError(error)
        await logAuthEvent('signup_error', error)
        return { success: false, error }
      }
      
      const existingUser = users.find(u => u.email === normalizedEmail)
      if (existingUser) {
        const error = 'Email already in use'
        setLastAuthError(error)
        await logAuthEvent('signup_error', error, { email: normalizedEmail })
        return { success: false, error }
      }
      
      const newUser = await createUser(normalizedEmail, password, normalizedName)
      const updatedUsers = [...users, newUser]
      setUsers(updatedUsers)
      persistKv('users', updatedUsers)
      
      const newHousehold = await createHousehold(`${normalizedName}'s Household`, newUser.id)
      const updatedHouseholds = [...households, newHousehold]
      setHouseholds(updatedHouseholds)
      persistKv('households', updatedHouseholds)
      
      const newMember = createHouseholdMember(newHousehold.id, newUser.id, normalizedName, 'owner')
      const updatedMembers = [...householdMembers, newMember]
      setHouseholdMembers(updatedMembers)
      persistKv('household-members-v2', updatedMembers)
      
      setCurrentUserId(newUser.id)
      setCurrentHouseholdId(newHousehold.id)
      persistKv('current-user-id', newUser.id)
      persistKv('current-household-id', newHousehold.id)
      setLastAuthError(null)
      await logAuthEvent('signup_success', 'User created', { email: normalizedEmail })
      
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      setLastAuthError(message)
      await logAuthEvent('signup_error', message, { email })
      return { success: false, error: 'Signup failed. Please try again.' }
    }
  }

  const switchHousehold = (householdId: string) => {
    setCurrentHouseholdId(householdId)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentHousehold,
        householdMembers: currentHouseholdMembers,
        userHouseholds,
        isAuthenticated: !!currentUser,
        login,
        logout,
        signup,
        switchHousehold,
        currentUserRole,
        lastAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
