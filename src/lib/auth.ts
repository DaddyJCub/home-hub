import type { User, Household, HouseholdMember, UserRole } from './types'

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export async function createUser(email: string, password: string, displayName: string): Promise<User> {
  const passwordHash = await hashPassword(password)
  
  return {
    id: generateId(),
    email: email.toLowerCase().trim(),
    passwordHash,
    displayName: displayName.trim(),
    createdAt: Date.now()
  }
}

export async function createHousehold(name: string, ownerId: string): Promise<Household> {
  return {
    id: generateId(),
    name: name.trim(),
    ownerId,
    createdAt: Date.now(),
    inviteCode: generateInviteCode()
  }
}

export function createHouseholdMember(
  householdId: string,
  userId: string,
  displayName: string,
  role: UserRole
): HouseholdMember {
  return {
    id: generateId(),
    householdId,
    userId,
    displayName: displayName.trim(),
    role,
    joinedAt: Date.now()
  }
}
