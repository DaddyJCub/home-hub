# Planning Guide

A collaborative household management application that helps partners coordinate chores, shopping, meal planning, and recipes in one unified space.

**Experience Qualities**:
1. **Collaborative** - Both partners should feel equally empowered to add, edit, and complete tasks with real-time visibility into each other's contributions.
2. **Organized** - Information should be logically grouped and easy to find, reducing mental overhead of household coordination.
3. **Practical** - Quick access to daily needs like shopping lists and upcoming meals without unnecessary complexity.

**Complexity Level**: Light Application (multiple features with basic state)
This is a multi-feature application with distinct but related sections (chores, shopping, meals, recipes) that share a common household context. The state management is straightforward with persistent storage needs but doesn't require complex user flows or advanced integrations.

## Essential Features

### Chore Management
- **Functionality**: Create, assign, and track household chores with optional recurring schedules
- **Purpose**: Ensure fair distribution of household tasks and visibility into what needs to be done
- **Trigger**: User navigates to chores section
- **Progression**: View chore list → Add/edit chore → Assign to person → Set frequency (one-time/recurring) → Mark complete → Chore updates or resets based on schedule
- **Success criteria**: Chores can be created, assigned, completed, and recurring chores automatically reset

### Shopping List
- **Functionality**: Collaborative list of items to purchase with categories and quantity
- **Purpose**: Prevent duplicate purchases and ensure nothing is forgotten at the store
- **Trigger**: User navigates to shopping section
- **Progression**: View shopping list → Add item with category → Check off item when purchased → Item moves to purchased state → Clear purchased items
- **Success criteria**: Items can be added, categorized, checked off, and cleared

### Meal Planning
- **Functionality**: Weekly calendar view of planned meals
- **Purpose**: Answer "what's for dinner?" and coordinate grocery shopping needs
- **Trigger**: User navigates to meal plan section
- **Progression**: View weekly calendar → Select day → Add meal (breakfast/lunch/dinner) → Link to recipe (optional) → View week at a glance
- **Success criteria**: Meals can be planned for specific days/times, linked to recipes, and viewed in calendar format

### Recipe Collection
- **Functionality**: Store and organize favorite recipes with ingredients and instructions
- **Purpose**: Keep household recipes in one accessible place and integrate with meal planning
- **Trigger**: User navigates to recipes section
- **Progression**: View recipe list → Add new recipe → Enter name, ingredients, instructions → Save → Search/filter recipes → Select recipe to view details → Optional: add to meal plan
- **Success criteria**: Recipes can be created, viewed, searched, and linked to meal plans

### User Profiles
- **Functionality**: Simple identification for each household member
- **Purpose**: Enable task assignment and contribution tracking
- **Trigger**: Initial setup or settings access
- **Progression**: Access settings → Add household members (names only) → Assign tasks to members → View who's responsible for what
- **Success criteria**: Multiple household members can be added and assigned to tasks

## Edge Case Handling

- **Empty States**: Display helpful prompts with suggested first actions when lists/schedules are empty
- **Data Persistence**: All data persists using useKV to survive page refreshes and work offline-first
- **Completed Items Overflow**: Provide clear/archive functionality to prevent clutter from completed items
- **Missing Recipe Links**: Meal plans work independently of recipes; linking is optional enhancement
- **Recurring Chore Logic**: Clearly indicate next due date and handle completion without losing schedule

## Design Direction

The design should evoke a warm, welcoming feeling that makes household management feel less like work and more like collaborative home-making. It should feel organized but not sterile, friendly but not childish, and efficient but not rushed.

## Color Selection

A warm, earthy palette that feels grounded and homey with touches of natural green for freshness.

- **Primary Color**: Warm terracotta (oklch(0.62 0.15 35)) - Conveys warmth, home, and approachability
- **Secondary Colors**: 
  - Sage green (oklch(0.75 0.08 145)) - Represents growth, freshness, and calm organization
  - Cream (oklch(0.95 0.02 85)) - Soft background that's easier on eyes than pure white
- **Accent Color**: Burnt orange (oklch(0.68 0.18 45)) - Energetic highlight for CTAs and important actions
- **Foreground/Background Pairings**:
  - Primary (Terracotta oklch(0.62 0.15 35)): White text (oklch(0.98 0 0)) - Ratio 5.2:1 ✓
  - Accent (Burnt Orange oklch(0.68 0.18 45)): White text (oklch(0.98 0 0)) - Ratio 6.1:1 ✓
  - Cream background (oklch(0.95 0.02 85)): Dark brown text (oklch(0.25 0.02 35)) - Ratio 11.8:1 ✓
  - Sage accent areas (oklch(0.75 0.08 145)): Dark text (oklch(0.25 0.02 35)) - Ratio 8.4:1 ✓

## Font Selection

Typography should balance readability for lists and recipes with personality that feels warm and human rather than corporate.

- **Primary Font**: Karla (body and UI) - Clean, friendly sans-serif with excellent readability
- **Accent Font**: Bitter (headings) - Warm slab-serif that adds character without being too casual

- **Typographic Hierarchy**:
  - H1 (Section Titles): Bitter Bold/32px/tight leading
  - H2 (Card Headers): Bitter SemiBold/24px/normal leading
  - H3 (List Items): Karla SemiBold/18px/relaxed leading
  - Body (Instructions, Details): Karla Regular/16px/relaxed leading (1.6)
  - Small (Metadata, Labels): Karla Regular/14px/normal leading

## Animations

Animations should feel responsive and helpful - confirming actions and guiding attention without being distracting. Use subtle transitions when checking off items (satisfying micro-interaction), smooth tab switching between sections, and gentle hover states that make interactive elements feel touchable. Avoid loading spinners in favor of optimistic UI updates.

## Component Selection

- **Components**:
  - **Tabs**: Main navigation between Chores/Shopping/Meals/Recipes sections
  - **Card**: Container for individual chores, recipes, and meal entries
  - **Checkbox**: Completing chores and checking off shopping items
  - **Dialog**: Adding/editing chores, recipes, and meals
  - **Button**: Primary actions (add, save, delete)
  - **Input/Textarea**: Form fields for entering data
  - **Select**: Category selection, household member assignment, meal type selection
  - **Calendar**: Custom weekly view for meal planning
  - **Badge**: Categories, frequency indicators, assignment labels
  - **ScrollArea**: Long lists and recipe instructions

- **Customizations**:
  - Custom weekly calendar grid component for meal planning
  - Recipe card with expandable ingredients/instructions
  - Shopping list with category grouping headers
  - Chore frequency selector (daily/weekly/biweekly/monthly)

- **States**:
  - Buttons: Solid primary for main actions, ghost for secondary, with pressed state that feels substantial
  - Checkboxes: Large touch targets with smooth check animation and color transition
  - Cards: Subtle hover lift on interactive cards, completed items have reduced opacity
  - Inputs: Clear focus ring with accent color, validation feedback inline

- **Icon Selection**:
  - Broom/cleaning icons for chores (using @phosphor-icons/react)
  - ShoppingCart for shopping list
  - CalendarBlank for meal planning
  - CookingPot for recipes
  - Plus for add actions
  - Check for completion
  - Trash for deletion
  - User/Users for assignment

- **Spacing**:
  - Container padding: p-6 (desktop) / p-4 (mobile)
  - Card padding: p-4
  - Section gaps: gap-6
  - List item gaps: gap-3
  - Button padding: px-6 py-3

- **Mobile**:
  - Tabs convert to bottom navigation bar on mobile
  - Cards stack vertically with full width
  - Dialogs slide up from bottom on mobile vs centered on desktop
  - Meal planning calendar shows 3 days at a time with horizontal scroll on mobile
  - Touch targets minimum 44px height
  - Reduced padding throughout (p-4 becomes p-3)
