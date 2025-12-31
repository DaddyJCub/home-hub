import { z } from 'zod';

// Helpers
const trimmedString = (message, min = 1, max = 200) =>
  z
    .string({ required_error: message })
    .trim()
    .min(min, message)
    .max(max, `${message} is too long`);

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Email is invalid')
  .transform((val) => val.trim().toLowerCase());

export const UserSignupSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters and include a mix of letters and numbers')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must include at least one letter and one number'),
  displayName: trimmedString('Display name is required', 1, 80)
});

export const UserLoginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required')
});

export const HouseholdCreateSchema = z.object({
  name: trimmedString('Household name is required', 1, 120)
});

export const HouseholdJoinSchema = z.object({
  inviteCode: trimmedString('Invite code is required', 1, 40)
});

export const HouseholdMemberSchema = z.object({
  displayName: trimmedString('Display name is required', 1, 80),
  role: z.enum(['owner', 'admin', 'member']).optional(),
  householdId: z.string().optional()
});

export const SwitchHouseholdSchema = z.object({
  householdId: trimmedString('householdId is required')
});

const choreSchema = (householdId) =>
  z
    .object({
      id: trimmedString('Chore id is required'),
      householdId: z.string().optional(),
      title: trimmedString('Chore title is required', 1, 200),
      description: z.string().max(2000).optional(),
      assignedTo: z.string().max(200).optional(),
      frequency: z
        .enum(['once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'])
        .optional()
        .default('once'),
      customIntervalDays: z.number().int().positive().max(365).optional(),
      scheduleType: z.enum(['fixed', 'after_completion']).optional(),
      completed: z.boolean().default(false),
      dueAt: z.number().int().optional(),
      lastCompletedAt: z.number().int().optional(),
      lastCompletedBy: z.string().max(200).optional(),
      createdAt: z.number().int().optional(),
      room: z.string().max(200).optional(),
      rooms: z.array(z.string().max(200)).optional(),
      completedRooms: z.array(z.string().max(200)).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      dueDate: z.string().max(50).optional(),
      notes: z.string().max(2000).optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      estimatedMinutes: z.number().int().positive().max(1440).optional(),
      rotation: z.enum(['none', 'rotate', 'anyone']).optional(),
      rotationOrder: z.array(z.string().max(200)).optional(),
      currentRotationIndex: z.number().int().nonnegative().optional(),
      streak: z.number().int().nonnegative().optional(),
      bestStreak: z.number().int().nonnegative().optional(),
      totalCompletions: z.number().int().nonnegative().optional(),
      averageCompletionTime: z.number().int().nonnegative().optional(),
      lastSkipped: z.number().int().optional(),
      trackTime: z.boolean().optional()
    })
    .transform((val) => ({
      ...val,
      householdId
    }));

const choreCompletionSchema = (householdId) =>
  z
    .object({
      id: trimmedString('Completion id is required'),
      choreId: trimmedString('Chore id is required'),
      completedBy: trimmedString('Completed by is required'),
      householdId: z.string().optional(),
      completedAt: z.number().int(),
      scheduledFor: z.string().optional(),
      notes: z.string().max(2000).optional(),
      skipped: z.boolean().optional(),
      room: z.string().max(200).optional()
    })
    .transform((val) => ({
      ...val,
      householdId
    }));

const shoppingItemSchema = (householdId) =>
  z
    .object({
      id: trimmedString('Shopping item id is required'),
      householdId: z.string().optional(),
      name: trimmedString('Item name is required', 1, 200),
      category: z.string().max(120).optional().default(''),
      quantity: z.string().max(120).optional().default('1'),
      purchased: z.boolean().optional().default(false),
      createdAt: z.number().int().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      notes: z.string().max(2000).optional(),
      store: z.string().max(200).optional()
    })
    .transform((val) => ({
      ...val,
      householdId
    }));

const mealSchema = (householdId) =>
  z
    .object({
      id: trimmedString('Meal id is required'),
      householdId: z.string().optional(),
      date: trimmedString('Meal date is required'),
      type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
      name: trimmedString('Meal name is required', 1, 200),
      recipeId: z.string().optional(),
      isNote: z.boolean().optional(),
      servings: z.number().int().positive().max(100).optional(),
      notes: z.string().max(2000).optional()
    })
    .transform((val) => ({
      ...val,
      householdId
    }));

const recipeSchema = (householdId) =>
  z
    .object({
      id: trimmedString('Recipe id is required'),
      householdId: z.string().optional(),
      name: trimmedString('Recipe name is required', 1, 200),
      ingredients: z.array(z.string().max(500)).default([]),
      instructions: z.string().max(10000).optional().default(''),
      prepTime: z.string().max(100).optional(),
      cookTime: z.string().max(100).optional(),
      servings: z.string().max(50).optional(),
      tags: z.array(z.string().max(100)).optional(),
      category: z
        .enum([
          'breakfast',
          'lunch',
          'dinner',
          'side',
          'dessert',
          'snack',
          'drink',
          'appetizer',
          'soup',
          'salad',
          'other'
        ])
        .optional(),
      sourceUrl: z.string().url().optional(),
      imageUrl: z.string().url().optional(),
      createdAt: z.number().int().optional(),
      lastMade: z.number().int().optional(),
      timesCooked: z.number().int().nonnegative().optional(),
      rating: z.number().min(1).max(5).optional(),
      nutrition: z
        .object({
          calories: z.number().nonnegative().optional(),
          protein: z.number().nonnegative().optional(),
          carbs: z.number().nonnegative().optional(),
          fat: z.number().nonnegative().optional()
        })
        .optional()
    })
    .transform((val) => ({
      ...val,
      householdId
    }));

const calendarEventSchema = (householdId) =>
  z
    .object({
      id: trimmedString('Event id is required'),
      householdId: z.string().optional(),
      title: trimmedString('Event title is required', 1, 200),
      date: trimmedString('Event date is required', 1, 50),
      endDate: z.string().optional(),
      isAllDay: z.boolean().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      description: z.string().max(2000).optional(),
      location: z.string().max(500).optional(),
      attendees: z.array(z.string().max(200)).optional(),
      category: z
        .enum([
          'personal',
          'work',
          'appointment',
          'booking',
          'vacation',
          'holiday',
          'school',
          'sports',
          'medical',
          'birthday',
          'other'
        ])
        .optional()
        .default('other'),
      color: z.string().max(50).optional(),
      bookedBy: z.string().max(200).optional(),
      createdAt: z.number().int().optional(),
      recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']).optional(),
      recurrenceEndDate: z.string().optional(),
      recurrenceParentId: z.string().optional(),
      reminder: z.enum(['none', '5min', '15min', '30min', '1hour', '2hours', '1day', '2days', '1week']).optional(),
      isPrivate: z.boolean().optional(),
      notes: z.string().max(2000).optional(),
      url: z.string().url().optional()
    })
    .transform((val) => ({
      ...val,
      householdId
    }));

export const buildHouseholdDataValidators = (householdId) => ({
  chores: z.array(choreSchema(householdId)),
  'chore-completions': z.array(choreCompletionSchema(householdId)),
  'shopping-items': z.array(shoppingItemSchema(householdId)),
  meals: z.array(mealSchema(householdId)),
  recipes: z.array(recipeSchema(householdId)),
  'calendar-events': z.array(calendarEventSchema(householdId))
});

export const formatZodError = (err) => {
  if (!err?.issues?.length) return 'Invalid request';
  const first = err.issues[0];
  return first.message || 'Invalid request';
};
