# HomeHub - User Accounts & Households Migration Guide

## Overview

This guide documents the migration from a simple household member system to a full user authentication and multi-household system.

## What's Been Implemented

### ✅ Core Infrastructure
1. **Type Definitions** (`src/lib/types.ts`)
   - `User` - Individual user accounts with email/password
   - `Household` - Household entities with owner and invite codes
   - `HouseholdMember` - Junction table linking users to households with roles
   - `UserRole` - Role-based access: 'owner' | 'admin' | 'member'
   - All entities updated to include `householdId` for data scoping

2. **Authentication System** (`src/lib/auth.ts`)
   - Password hashing (SHA-256)
   - User creation with validation
   - Household creation with auto-generated invite codes
   - Helper functions for IDs and invite codes

3. **Auth Context** (`src/lib/AuthContext.tsx`)
   - React context managing authentication state
   - Login/Signup/Logout functionality
   - Household switching
   - Current user and household tracking
   - Role-based access control checks

4. **UI Components**
   - `AuthPage.tsx` - Sign-in/Sign-up interface
   - `HouseholdSwitcher.tsx` - Create, join, switch households + invite management
   - `App.tsx` - Updated with AuthProvider and routing

5. **Updated PRD**
   - Documented new authentication and household features
   - Updated complexity level to reflect multi-user system

## What Needs to Be Completed

### 🔧 Section Migrations (7 files)

Each section component needs to be updated to work with the new household system:

#### Required Changes for Each Section:
1. Import `useAuth` hook
2. Get `currentHousehold` from auth context
3. Filter data by `householdId`
4. Update member references: `member.name` → `member.displayName`
5. Include `householdId` when creating new entities
6. Handle case when no household is selected

#### Files to Update:
- `src/components/sections/ChoresSection.tsx`
- `src/components/sections/DashboardSection.tsx`
- `src/components/sections/CalendarSection.tsx`
- `src/components/sections/MealsSection.tsx`
- `src/components/sections/RecipesSection.tsx`
- `src/components/sections/ShoppingSection.tsx`
- `src/components/sections/SettingsSection.tsx`
- `src/components/MemberFilter.tsx`

### Example Pattern (ChoresSection):

```typescript
import { useAuth } from '@/lib/AuthContext'

export default function ChoresSection() {
  const { currentHousehold, householdMembers } = useAuth()
  const [allChores = [], setChores] = useKV<Chore[]>('chores-v2', [])
  
  // Filter chores for current household
  const chores = allChores.filter(c => c.householdId === currentHousehold?.id)
  
  // When creating a new chore
  const handleSaveChore = () => {
    if (!currentHousehold) return
    
    const newChore: Chore = {
      id: Date.now().toString(),
      householdId: currentHousehold.id,  // ← Add this
      title: choreForm.title.trim(),
      assignedTo: choreForm.assignedTo,
      // ... rest of fields
    }
    
    setChores((current = []) => [...current, newChore])
  }
  
  // Use householdMembers from context instead of separate KV storage
  {householdMembers.map((member) => (
    <SelectItem key={member.id} value={member.displayName}>
      {member.displayName}  {/* ← Was member.name */}
    </SelectItem>
  ))}
}
```

### 🔧 MemberFilter Component

This component needs significant rework:
- Remove local member management (creating/deleting)
- Use `householdMembers` from AuthContext
- Display current household members only
- Remove the old `household-members` KV storage reference

### 🔧 Settings Section

Needs updates for:
- Household management (rename household, regenerate invite code)
- Member management (view members, change roles, remove members)
- User profile settings
- Sign out button

### 🔧 Data Migration (Optional but Recommended)

Create a migration utility to:
1. Detect legacy data (chores, shopping items, etc. without `householdId`)
2. Prompt user to migrate
3. Assign all legacy data to their first household
4. Update KV storage keys (e.g., `chores` → `chores-v2`)

## Key Concepts

### Data Scoping
All household data (chores, meals, recipes, etc.) must:
1. Include `householdId` field
2. Be filtered by current household before display
3. Only be created/edited within a household context

### Role Permissions
- **Owner**: Full control, can delete household, manage all settings
- **Admin**: Can invite/remove members, manage household settings
- **Member**: Standard CRUD operations on household data

### Member vs User
- **User**: Account-level (email, password, displayName)
- **HouseholdMember**: Household-specific (links User to Household with role)
- A single User can be a Member of multiple Households

### Storage Keys
Consider versioning storage keys to avoid conflicts:
- `chores` → `chores-v2` (includes householdId)
- `household-members` → `household-members-v2` (new structure)
- Keep old data for potential migration

## Testing Checklist

### Authentication
- [ ] Can create new account
- [ ] Can sign in with existing account
- [ ] Can sign out
- [ ] Session persists across refresh
- [ ] Invalid credentials show error

### Household Management
- [ ] First household auto-created on signup
- [ ] Can create additional households
- [ ] Can switch between households
- [ ] Can join household with invite code
- [ ] Invalid invite code shows error
- [ ] Can view invite code (owner/admin only)

### Data Scoping
- [ ] Chores only show for current household
- [ ] Shopping items only show for current household
- [ ] Recipes only show for current household
- [ ] Calendar events only show for current household
- [ ] Switching households updates all sections

### Role-Based Access
- [ ] Invite button only visible to owner/admin
- [ ] Member list shows roles
- [ ] Owners can manage all settings
- [ ] Members cannot access admin features

## Common Issues

### TypeScript Errors
```
Property 'name' does not exist on type 'HouseholdMember'
```
**Fix**: Change `member.name` to `member.displayName`

```
Property 'householdId' is missing in type 'Chore'
```
**Fix**: Add `householdId: currentHousehold.id` when creating entities

### No Data Showing
**Cause**: Filtering by household but data doesn't have `householdId`
**Fix**: Migrate legacy data or create new test data

### Members Not Showing
**Cause**: Using old `household-members` KV storage
**Fix**: Use `householdMembers` from `useAuth()` hook

## Next Steps

1. **Update ChoresSection** - Most complex, use as template for others
2. **Update DashboardSection** - Shows all household data
3. **Update other sections** - Follow pattern from ChoresSection
4. **Update MemberFilter** - Remove local storage, use AuthContext
5. **Update SettingsSection** - Add household management UI
6. **Test end-to-end** - Create account → Create household → Add data → Invite member
7. **(Optional) Data migration** - Migrate legacy data to new structure

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│            AuthProvider                 │
│  ┌───────────────────────────────────┐  │
│  │ - currentUser                     │  │
│  │ - currentHousehold                │  │
│  │ - householdMembers                │  │
│  │ - userHouseholds                  │  │
│  │ - login/signup/logout             │  │
│  │ - switchHousehold                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ↓
     ┌────────────┴────────────┐
     ↓                         ↓
┌─────────┐            ┌──────────────┐
│ AuthPage│            │ AppContent   │
│         │            │ (requires    │
│ Sign-in │            │  auth)       │
│ Sign-up │            └──────┬───────┘
└─────────┘                   │
                              ├→ Header (HouseholdSwitcher)
                              ├→ ChoresSection (filtered by household)
                              ├→ ShoppingSection (filtered by household)
                              ├→ DashboardSection (filtered by household)
                              └→ ... other sections
```
