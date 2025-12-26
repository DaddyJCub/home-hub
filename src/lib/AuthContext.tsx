import { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react'
import type { User, Household, HouseholdMember } from '@/lib/types'
import { loadJson, saveJson } from '@/lib/localStore'
import { generateId, generateInviteCode } from '@/lib/auth'

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
  createHousehold: (name: string) => Household | null
  joinHousehold: (inviteCode: string) => AuthResult
  addHouseholdMember: (displayName: string) => HouseholdMember | null
  removeHouseholdMember: (memberId: string) => boolean
  currentUserRole: 'owner' | 'admin' | 'member' | null
  lastAuthError: string | null
}

const USERS_KEY = 'hh_users'
const HOUSEHOLDS_KEY = 'hh_households'
const MEMBERS_KEY = 'hh_members'
const CURRENT_USER_KEY = 'hh_current_user'
const CURRENT_HOUSEHOLD_KEY = 'hh_current_household'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => loadJson<User[]>(USERS_KEY, []))
  const [households, setHouseholds] = useState<Household[]>(() => loadJson<Household[]>(HOUSEHOLDS_KEY, []))
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(() => loadJson<HouseholdMember[]>(MEMBERS_KEY, []))
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => loadJson<string | null>(CURRENT_USER_KEY, null))
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(() => loadJson<string | null>(CURRENT_HOUSEHOLD_KEY, null))
  const [lastAuthError, setLastAuthError] = useState<string | null>(null)

  // Persist on change
  useEffect(() => saveJson(USERS_KEY, users), [users])
  useEffect(() => saveJson(HOUSEHOLDS_KEY, households), [households])
  useEffect(() => saveJson(MEMBERS_KEY, householdMembers), [householdMembers])
  useEffect(() => saveJson(CURRENT_USER_KEY, currentUserId), [currentUserId])
  useEffect(() => saveJson(CURRENT_HOUSEHOLD_KEY, currentHouseholdId), [currentHouseholdId])

  const currentUser = useMemo(
    () => (currentUserId ? users.find(u => u.id === currentUserId) || null : null),
    [currentUserId, users]
  )

  const currentHousehold = useMemo(
    () => (currentHouseholdId ? households.find(h => h.id === currentHouseholdId) || null : null),
    [currentHouseholdId, households]
  )

  const userHouseholds = useMemo(() => {
    if (!currentUserId) return []
    const membershipIds = householdMembers.filter(m => m.userId === currentUserId).map(m => m.householdId)
    return households.filter(h => membershipIds.includes(h.id))
  }, [currentUserId, householdMembers, households])

  const currentHouseholdMembers = useMemo(() => {
    if (!currentHouseholdId) return []
    return householdMembers.filter(m => m.householdId === currentHouseholdId)
  }, [currentHouseholdId, householdMembers])

  const currentUserRole =
    currentUser && currentHousehold
      ? currentHouseholdMembers.find(m => m.userId === currentUser.id)?.role || null
      : null

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = email.toLowerCase().trim()
    const pwd = password || ''
    if (!normalizedEmail || !pwd) {
      const error = 'Email and password are required'
      setLastAuthError(error)
      return { success: false, error }
    }

    const { verifyPassword, createHousehold, createHouseholdMember } = await import('@/lib/auth')

    const user = users.find(u => u.email === normalizedEmail)
    if (!user) {
      const error = 'Account not found'
      setLastAuthError(error)
      return { success: false, error }
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      const error = 'Invalid email or password'
      setLastAuthError(error)
      return { success: false, error }
    }

    setCurrentUserId(user.id)
    setLastAuthError(null)

    const memberships = householdMembers.filter(m => m.userId === user.id)
    if (memberships.length === 0) {
      const newHousehold = await createHousehold(`${user.displayName || 'My'} Household`, user.id)
      const newMember = createHouseholdMember(newHousehold.id, user.id, user.displayName || 'Owner', 'owner')
      setHouseholds(prev => [...prev, newHousehold])
      setHouseholdMembers(prev => [...prev, newMember])
      setCurrentHouseholdId(newHousehold.id)
    } else if (!currentHouseholdId) {
      setCurrentHouseholdId(memberships[0].householdId)
    }

    return { success: true }
  }

  const logout = () => {
    setCurrentUserId(null)
    setCurrentHouseholdId(null)
    setLastAuthError(null)
  }

  const signup = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedName = displayName.trim()

    if (!normalizedName || !normalizedEmail) {
      const error = 'Name and email are required'
      setLastAuthError(error)
      return { success: false, error }
    }

    const { createUser, createHousehold, createHouseholdMember } = await import('@/lib/auth')

    const existingUser = users.find(u => u.email === normalizedEmail)
    if (existingUser) {
      const error = 'Email already in use'
      setLastAuthError(error)
      return { success: false, error }
    }

    const newUser = await createUser(normalizedEmail, password, normalizedName)
    const newHousehold = await createHousehold(`${normalizedName}'s Household`, newUser.id)
    const newMember = createHouseholdMember(newHousehold.id, newUser.id, normalizedName, 'owner')

    setUsers(prev => [...prev, newUser])
    setHouseholds(prev => [...prev, newHousehold])
    setHouseholdMembers(prev => [...prev, newMember])
    setCurrentUserId(newUser.id)
    setCurrentHouseholdId(newHousehold.id)
    setLastAuthError(null)

    return { success: true }
  }

  const switchHousehold = (householdId: string) => {
    setCurrentHouseholdId(householdId)
  }

  const createHousehold = (name: string): Household | null => {
    if (!currentUser) return null
    const newHousehold: Household = {
      id: generateId(),
      name: name.trim(),
      ownerId: currentUser.id,
      createdAt: Date.now(),
      inviteCode: generateInviteCode()
    }
    const newMember: HouseholdMember = {
      id: generateId(),
      householdId: newHousehold.id,
      userId: currentUser.id,
      displayName: currentUser.displayName,
      role: 'owner',
      joinedAt: Date.now()
    }
    setHouseholds(prev => [...prev, newHousehold])
    setHouseholdMembers(prev => [...prev, newMember])
    setCurrentHouseholdId(newHousehold.id)
    return newHousehold
  }

  const joinHousehold = (inviteCode: string): AuthResult => {
    if (!currentUser) return { success: false, error: 'Not logged in' }
    const target = households.find(h => h.inviteCode?.toUpperCase() === inviteCode.toUpperCase().trim())
    if (!target) return { success: false, error: 'Invalid invite code' }

    const already = householdMembers.some(m => m.householdId === target.id && m.userId === currentUser.id)
    if (already) {
      setCurrentHouseholdId(target.id)
      return { success: true }
    }

    const newMember: HouseholdMember = {
      id: generateId(),
      householdId: target.id,
      userId: currentUser.id,
      displayName: currentUser.displayName,
      role: 'member',
      joinedAt: Date.now()
    }
    setHouseholdMembers(prev => [...prev, newMember])
    setCurrentHouseholdId(target.id)
    return { success: true }
  }

  // Add a household member (non-user member for chore assignment)
  const addHouseholdMember = (displayName: string): HouseholdMember | null => {
    if (!currentHouseholdId || !displayName.trim()) return null
    
    const newMember: HouseholdMember = {
      id: generateId(),
      householdId: currentHouseholdId,
      userId: `local_${generateId()}`, // Local-only member (not a real user)
      displayName: displayName.trim(),
      role: 'member',
      joinedAt: Date.now()
    }
    setHouseholdMembers(prev => [...prev, newMember])
    return newMember
  }

  // Remove a household member
  const removeHouseholdMember = (memberId: string): boolean => {
    if (!currentHouseholdId) return false
    
    const member = householdMembers.find(m => m.id === memberId && m.householdId === currentHouseholdId)
    if (!member) return false
    
    // Don't allow removing the owner
    if (member.role === 'owner') return false
    
    setHouseholdMembers(prev => prev.filter(m => m.id !== memberId))
    return true
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
        createHousehold,
        joinHousehold,
        addHouseholdMember,
        removeHouseholdMember,
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
