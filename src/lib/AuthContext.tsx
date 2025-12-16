import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { User, Household, HouseholdMember } from '@/lib/types'

interface AuthContextType {
  currentUser: User | null
  currentHousehold: Household | null
  householdMembers: HouseholdMember[]
  userHouseholds: Household[]
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  signup: (email: string, password: string, displayName: string) => Promise<boolean>
  switchHousehold: (householdId: string) => void
  currentUserRole: 'owner' | 'admin' | 'member' | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users = []] = useKV<User[]>('users', [])
  const [currentUserId, setCurrentUserId] = useKV<string | null>('current-user-id', null)
  const [households = []] = useKV<Household[]>('households', [])
  const [householdMembers = []] = useKV<HouseholdMember[]>('household-members-v2', [])
  const [currentHouseholdId, setCurrentHouseholdId] = useKV<string | null>('current-household-id', null)
  
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null)
  const [userHouseholds, setUserHouseholds] = useState<Household[]>([])
  const [currentHouseholdMembers, setCurrentHouseholdMembers] = useState<HouseholdMember[]>([])

  useEffect(() => {
    if (currentUserId) {
      const user = users.find(u => u.id === currentUserId)
      setCurrentUser(user || null)
      
      const userMemberships = householdMembers.filter(m => m.userId === currentUserId)
      const userHouseholdIds = userMemberships.map(m => m.householdId)
      const userHouseholdsList = households.filter(h => userHouseholdIds.includes(h.id))
      setUserHouseholds(userHouseholdsList)
      
      if (!currentHouseholdId && userHouseholdsList.length > 0) {
        setCurrentHouseholdId(userHouseholdsList[0].id)
      }
    } else {
      setCurrentUser(null)
      setUserHouseholds([])
    }
  }, [currentUserId, users, households, householdMembers])

  useEffect(() => {
    if (currentHouseholdId) {
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

  const login = async (email: string, password: string): Promise<boolean> => {
    const { verifyPassword } = await import('@/lib/auth')
    const user = users.find(u => u.email === email.toLowerCase().trim())
    
    if (!user) return false
    
    const isValid = await verifyPassword(password, user.passwordHash)
    if (isValid) {
      setCurrentUserId(user.id)
      return true
    }
    
    return false
  }

  const logout = () => {
    setCurrentUserId(null)
    setCurrentHouseholdId(null)
  }

  const signup = async (email: string, password: string, displayName: string): Promise<boolean> => {
    const { createUser, createHousehold, createHouseholdMember } = await import('@/lib/auth')
    
    const existingUser = users.find(u => u.email === email.toLowerCase().trim())
    if (existingUser) return false
    
    const newUser = await createUser(email, password, displayName)
    
    await window.spark.kv.set('users', [...users, newUser])
    
    const newHousehold = await createHousehold(`${displayName}'s Household`, newUser.id)
    await window.spark.kv.set('households', [...households, newHousehold])
    
    const newMember = createHouseholdMember(newHousehold.id, newUser.id, displayName, 'owner')
    await window.spark.kv.set('household-members-v2', [...householdMembers, newMember])
    
    setCurrentUserId(newUser.id)
    setCurrentHouseholdId(newHousehold.id)
    
    return true
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
        currentUserRole
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
