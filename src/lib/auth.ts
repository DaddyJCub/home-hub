import type { User, Household, HouseholdMember, UserRole } from './types'

// Utility: robust SHA-256 with fallbacks for insecure contexts (http) where crypto.subtle is unavailable
async function sha256(password: string): Promise<string> {
  // Preferred: Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Node fallback (server-side render or tests)
  try {
    const nodeCrypto = await import('crypto')
    return nodeCrypto.createHash('sha256').update(password).digest('hex')
  } catch {
    // Last resort: simple deterministic hash (non-cryptographic, but avoids blocking signup)
    let hash = 0
    for (let i = 0; i < password.length; i++) {
      const chr = password.charCodeAt(i)
      hash = (hash << 5) - hash + chr
      hash |= 0
    }
    return hash.toString(16)
  }
}

export async function hashPassword(password: string): Promise<string> {
  return sha256(password)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await sha256(password)
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
