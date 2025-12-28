# Planning Guide

A collaborative household management application that helps households coordinate chores, shopping, meal planning, and recipes in one unified space with real user accounts. Current release operates in **Single Household / Personal Mode**; multi-household support remains forward-compatible for future expansion.

**Experience Qualities**:
1. **Secure & Personal** - Each user has their own account and is automatically placed into one default household (role-based permissions kept for forward compatibility).
2. **Collaborative** - Household members can work together with real-time visibility into contributions and shared data.
3. **Organized** - Information is logically grouped by household, reducing mental overhead of coordination.
4. **Practical** - Quick access to daily needs like shopping lists and upcoming meals without unnecessary complexity.
5. **Reliable** - Data persists across sessions with proper state synchronization between components.

**Complexity Level**: Complex Application (advanced functionality with multiple views and user management)
This is a multi-feature application with user authentication, role-based access control (kept for forward compatibility), and distinct but related sections (chores, shopping, meals, recipes, calendar) scoped to the user’s default household. State management includes user sessions, household scoping, and synchronized localStorage persistence. Household switching UI is hidden in this release.

## Essential Features

### User Authentication
- **Functionality**: Email and password-based authentication with secure password hashing
- **Purpose**: Provide secure, personal accounts for each user to access their households
- **Trigger**: User visits app without valid session
- **Progression**: View login screen → Enter email and password → Sign in → Access household dashboard OR Create new account → Enter display name, email, password → Automatically create first household → Access dashboard
- **Success criteria**: Users can create accounts, sign in, sign out, and maintain sessions. Passwords are securely hashed. First household is automatically created on signup.

### Household Management (current mode: Single Household / Personal)
- **Functionality**: Auto-create and use a single default household per user; no visible household switching or invite code flows in the UI. (Internal model remains compatible with future multi-household.)
- **Purpose**: Remove setup friction and ensure all data is available immediately after signup.
- **Trigger**: On signup, a default household is created and selected automatically.
- **Success criteria**: Users sign up and immediately see the dashboard with no extra setup; all data is scoped to the default household; no empty-household confusion.

### Role-Based Access Control
- **Functionality**: Three role levels - Owner (full control), Admin (manage members/settings), Member (normal use)
- **Purpose**: Provide appropriate permissions and prevent accidental data loss or unauthorized changes
- **Trigger**: Role is assigned when user creates or joins household
- **Progression**: Owner/Admin can view invite code → Share with new members → New members join with Member role → Owner/Admin can manage members in settings
- **Success criteria**: Owners and Admins can invite members and access admin functions. Members have standard access. Only Owners can delete households or transfer ownership.

### Household Invitations
- **Functionality**: Generate and share unique 8-character invite codes for each household
- **Purpose**: Allow secure, controlled addition of new household members
- **Trigger**: Owner or Admin clicks "Invite" button
- **Progression**: Click "Invite" → View unique invite code → Copy code → Share with new member → New member uses "Join" feature → Enters code → Added to household as Member
- **Success criteria**: Each household has a unique, persistent invite code. Codes can be copied easily. Invalid codes show error message. Users cannot join the same household twice.

### Chore Management
- **Functionality**: Comprehensive chore tracking system inspired by Grocy with completion history, streak tracking, rotation assignments, time tracking, skip/reschedule options, overdue indicators, and detailed statistics
- **Purpose**: Ensure fair distribution of household tasks with gamification (streaks), accountability (completion history), flexible scheduling, and insights into household contribution patterns
- **Trigger**: User navigates to chores section, selects member filter, or views weekly chore schedule widget on dashboard
- **Progression**: View chore list with tabs (Pending/Completed/All) → Add/edit chore → Assign to person or set rotation → Set room/location (customizable list; add/rename/delete) → Set priority level → Set frequency (once/daily/weekly/biweekly/monthly/quarterly/yearly/custom interval) → Select days of week for weekly tasks → Choose schedule type (Fixed cadence vs After Completion) → Set next due date/time → Enable time tracking (optional) → Mark complete with optional notes → View completion history and streaks → Skip recurring chores (reschedules to next due) → Track statistics by member
- **Key Features**:
  - **Completion Tracking**: Full history of who completed each chore and when, with optional notes
  - **Streak Tracking**: Visual streak counter (🔥) for recurring chores completed on time, best streak tracking, streak resets on skip or overdue
  - **Overdue Indicators**: Red highlighting, "X days overdue" display, overdue alert banner, Due Today and Due Soon groupings on dashboard/chores list
  - **Chore Rotation**: Fixed (one person), Rotate (cycles through members automatically), Anyone (whoever does it)
  - **Time Tracking**: Optional start/stop timer, track actual vs estimated time, average completion time calculation
  - **Skip/Reschedule**: Skip button for recurring chores, logs skip in history, reschedules to next due date
  - **Recurrence Modes**: `scheduleType` supports **Fixed** (advance from scheduled `dueAt`) and **After Completion** (advance from completion time); chores track `dueAt` and `lastCompletedAt` for current cycle
  - **Statistics Dashboard**: This week's completions, total completions, average streak, overdue count, completions by member
  - **Advanced Filtering**: Filter by room, priority; sort by due date, priority, room, or created date
  - **Rooms Management**: Room list is user-manageable (add/rename/delete) and used for filtering, progress bars, and grouping on dashboard
- **Success criteria**: Chores track full completion history with streaks, rotation works automatically, time tracking captures actual effort, statistics provide insights into household contributions, overdue chores are prominently highlighted, and skip functionality allows flexibility without losing data

### Shopping List
- **Functionality**: Collaborative list of items to purchase with categories, quantity, priority levels, store assignments, and notes
- **Purpose**: Prevent duplicate purchases, organize shopping by category and store, ensure nothing is forgotten, and prioritize urgent items
- **Trigger**: User navigates to shopping section
- **Progression**: View shopping list grouped by category → Add item with category, quantity, priority, and store → Check off item when purchased → Item moves to purchased state → Clear purchased items → Generate shopping list from weekly meal plan
- **Success criteria**: Items can be added with full details (category, quantity, priority, store, notes), grouped by category, checked off, cleared, and auto-generated from meal plans

### Meal Planning
- **Functionality**: Weekly calendar view of planned meals
- **Purpose**: Answer "what's for dinner?" and coordinate grocery shopping needs
- **Trigger**: User navigates to meal plan section
- **Progression**: View weekly calendar → Select day → Add meal (breakfast/lunch/dinner) → Link to recipe (optional) → View week at a glance
- **Success criteria**: Meals can be planned for specific days/times, linked to recipes, and viewed in calendar format

### Calendar & Events
- **Functionality**: Multi-view calendar (Month/Week/Agenda) with multi-day event support, recurring events, reminders, 11 event categories, drag-to-select date ranges, and "Today at a Glance" overview
- **Purpose**: Centralize family scheduling with support for long trips, recurring appointments, flexible viewing options, and quick daily overview
- **Trigger**: User navigates to calendar section, switches views, or selects member filter
- **Progression**: View calendar in preferred view (Month/Week/Agenda) → Click day or drag across multiple days to add event → Enter event details (title, dates, times, location, category, attendees) → Set recurrence pattern (none/daily/weekly/biweekly/monthly/yearly) → Set reminder (none/at time/15min/30min/1hr/1day/1week before) → Toggle all-day and private options → Save event → View events with multi-day spans displayed as colored bars → Use "Today at a Glance" card for quick daily overview
- **Key Features**:
  - **Multiple Views**: Month (traditional calendar grid), Week (7-day detailed view), Agenda (chronological list)
  - **Multi-Day Events**: Drag to select date range, events span across days with visual bars, support for trips and vacations
  - **Recurring Events**: Daily, weekly, bi-weekly, monthly, yearly patterns with optional end date
  - **11 Event Categories**: Personal, Work, Appointment, Booking, Birthday, Holiday, Travel, School, Health, Social, Other - each with distinct colors
  - **Reminders**: Configurable reminder times (at event time, 15/30/60 min, 1 day, 1 week before)
  - **Today Overview**: "Today at a Glance" card showing today's events, all-day events, and quick navigation
  - **Privacy**: Mark events as private (shown with lock icon)
  - **URL Support**: Attach links to events (meeting URLs, booking confirmations)
- **Success criteria**: Events can span multiple days with intuitive drag selection, recurring events generate properly, multiple views provide flexibility for different planning needs, today's overview provides quick daily summary, and all event types are clearly distinguished by category colors

### Recipe Collection
- **Functionality**: Store and organize favorite recipes with ingredients, instructions, tags, and labels; automatically parse recipes from website URLs
- **Purpose**: Keep household recipes in one accessible place, enable better organization and discovery, and integrate with meal planning
- **Trigger**: User navigates to recipes section
- **Progression**: View recipe list → Add new recipe manually or from URL → AI parses website content → Enter/edit name, ingredients, instructions, tags → Save → Filter by tags/search recipes → Select recipe to view details → Optional: add to meal plan
- **Success criteria**: Recipes can be created manually or from URLs, tagged/labeled, filtered, searched, and linked to meal plans

### Automated Meal Planning
- **Functionality**: AI-powered meal plan generation based on recipes, preferences, and dietary constraints
- **Purpose**: Save time planning weekly meals by automatically suggesting balanced meal plans
- **Trigger**: User clicks "Auto-plan Week" or "Suggest Meals" button
- **Progression**: User sets preferences (optional) → AI analyzes available recipes and tags → Generates balanced weekly meal plan → User reviews suggestions → Accept all, modify, or regenerate → Meals populate calendar
- **Success criteria**: System generates coherent weekly meal plans using available recipes and allows easy customization

### Dashboard Overview
- **Functionality**: Mobile-first unified dashboard with collapsible sections, horizontal scrolling quick stats, progressive disclosure, time-based greeting, and priority alerts
- **Purpose**: Provide at-a-glance household status optimized for mobile with reduced scrolling, quick access to high-priority items, and ability to focus on individual member responsibilities
- **Trigger**: User navigates to dashboard (default/home section), selects member filter, or expands/collapses sections
- **Progression**: View dashboard → See personalized greeting based on time of day → Review horizontal scrolling quick stats (tasks, events, shopping, meals) → Check high-priority alerts (overdue chores, today's events) → Expand collapsible sections for details → View combined "Today's Schedule" (meals + events) → Quick-add items → Navigate to detailed sections
- **Key Features**:
  - **Mobile-First Design**: Optimized layout to reduce scrolling, touch-friendly interactions
  - **Time-Based Greeting**: "Good morning/afternoon/evening" with current date
  - **Horizontal Quick Stats**: Scrollable stat cards showing pending tasks, today's events, shopping items, planned meals
  - **High-Priority Alerts**: Prominent display of overdue chores and immediate attention items; chores section grouped into Overdue, Due Today, Due Soon (next 24h), and Upcoming with recent completions
  - **Collapsible Sections**: Expand/collapse Today's Schedule, Chores, Shopping Preview to manage information density; chore items are clickable for detail/quick complete
  - **Progressive Disclosure**: Show summary counts by default, details on demand
  - **Combined Schedule**: Today's meals and events merged into unified timeline view
  - **Room Progress**: Progress bars by room using customizable rooms list; highlights which areas need attention
  - **Member Filtering**: All dashboard data filters when specific member selected
- **Success criteria**: Dashboard loads quickly on mobile, reduces scrolling through collapsible sections, highlights urgent items prominently, provides quick stats at a glance, and maintains full functionality while being more compact

### User Profiles
- **Functionality**: Simple identification for each household member with visual contribution tracking and member-specific filtered views
- **Purpose**: Enable task assignment, contribution tracking, workload visibility, and personalized views for each household member
- **Trigger**: Settings section, inline during chore creation, or member filter in header
- **Progression**: Access settings → Add household members (names only) → Assign chores to members → View member stats on dashboard → Filter chores by assignee → Track completion rates and estimated time → Use header member filter to view all sections filtered by a specific member → Toggle between individual member views and "Everyone" view
- **Success criteria**: Multiple household members can be added, assigned to tasks, their contributions are visualized with completion rates, pending tasks, event attendance, and estimated time remaining. Member-specific filtering works across all sections (Dashboard, Chores, Calendar) showing only data relevant to the selected person.

### Theme Customization
- **Functionality**: Choose from multiple pre-designed color themes with dark/light mode toggle
- **Purpose**: Personalize the visual appearance to match user preferences
- **Trigger**: User navigates to settings section
- **Progression**: View settings → Browse theme options → Select new theme → Theme applies instantly → Toggle dark/light mode → Save preference
- **Success criteria**: Users can switch between themes and dark/light mode, preferences persist across sessions and are synchronized between all app components

### Bug Tracking & Diagnostics
- **Functionality**: Automatic capture of application errors with detailed context for debugging
- **Purpose**: Enable easy diagnosis of issues by capturing errors with stack traces, timestamps, and context
- **Trigger**: Any unhandled error, promise rejection, or console error occurs in the application
- **Progression**: Error occurs → Bug tracker captures details (message, stack trace, URL, timestamp, context) → Bug indicator badge appears in header → User can view bugs in Settings → Copy formatted bug report for sharing → Mark resolved or delete bugs
- **Success criteria**: All errors are automatically captured with useful context, users can easily copy bug reports for diagnosis, and resolved bugs can be cleared

### Dashboard Customization
- **Functionality**: Drag-and-drop widget reordering, toggle visibility, apply layout presets, and organize dashboard layout
- **Purpose**: Allow users to fully personalize their dashboard with custom widget ordering and quick preset layouts for different use cases
- **Trigger**: User clicks "Customize Dashboard" button on the dashboard
- **Progression**: View dashboard → Click customize button → Dialog with two tabs (Widgets and Presets) → Widgets tab: drag widgets by handle to reorder, toggle visibility switches → Presets tab: choose from pre-configured layouts (Full View, Minimal, Chores Focus, Events & Planning, Household View) → Changes apply immediately → Preferences persist across sessions
- **Success criteria**: Users can drag-and-drop to reorder widgets, show/hide widgets (stats cards, time estimates, weekly chore schedule, room chore tracking, member statistics, today's events, today's meals, priorities, upcoming events, weekly meal calendar, shopping preview), apply preset layouts with one click, see how many widgets are enabled, and preferences persist across sessions and household switches. Widget order is maintained and respected in the dashboard render.

### Admin Functions
- **Functionality**: Data management including export backup and selective/full data deletion
- **Purpose**: Give users control over their data with backup and cleanup options
- **Trigger**: User accesses admin section in settings
- **Progression**: View settings → Export data as JSON backup or Delete specific data categories → Confirm destructive actions → System updates
- **Success criteria**: Users can export all data and selectively delete data categories safely

### Mobile Optimization Features
- **Functionality**: Customizable bottom navigation with overflow "More" menu, swipe gestures, offline mode with service worker, visual feedback for connectivity
- **Purpose**: Provide a native-app-like mobile experience with personalization, intuitive gesture navigation, and reliable offline functionality
- **Trigger**: Mobile browser/PWA usage, network connectivity changes, service worker updates
- **Progression**: 
  - **Custom Navigation**: Settings → Mobile Navigation → Toggle tabs on/off → First 4 enabled tabs show in bottom nav → Additional tabs appear in "More" menu → Swipe left/right between enabled tabs
  - **Offline Mode**: App loads → Service worker caches assets → Network goes offline → Banner appears at top → Changes queue for sync → Network returns → Changes sync automatically → Banner disappears
  - **Updates**: New version deployed → Service worker detects update → Update banner appears at bottom → Click "Update" → App refreshes with new version
- **Success criteria**: Users can customize which tabs appear in mobile nav, overflow tabs accessible via "More" menu, swipe between tabs with natural gestures, use app fully offline with visual feedback, receive non-intrusive update notifications, and maintain all functionality in PWA mode

### Member-Specific Views
- **Functionality**: Global filter in header that shows only data relevant to a selected household member across all sections
- **Purpose**: Allow individual household members to focus on their own responsibilities and schedule without being overwhelmed by shared household data
- **Trigger**: User selects a member from the dropdown filter in the header
- **Progression**: Select member from header dropdown → All sections automatically filter to show only that member's data → Dashboard shows member's chores, events, and stats → Chores section shows only assigned chores → Calendar shows only events where member is booked by or attending → Toggle back to "Everyone" to see all household data
- **Success criteria**: Member filter persists across page refreshes, updates all sections simultaneously, clearly indicates when a member view is active, and seamlessly switches between individual and household-wide views

## Edge Case Handling

- **Empty States**: Display helpful prompts with suggested first actions when lists/schedules are empty
- **Data Persistence**: All data persists using useKV hook with localStorage backend that synchronizes across components using the same key via custom events
- **Multi-Household Data Isolation**: All data operations properly filter by householdId to prevent data from one household appearing in another; create/update/delete operations preserve other households' data
- **Completed Items Overflow**: Provide clear/archive functionality to prevent clutter from completed items
- **Missing Recipe Links**: Meal plans work independently of recipes; linking is optional enhancement
- **Recurring Chore Logic**: Clearly indicate next due date and handle completion without losing schedule
- **Offline Mode**: App functions fully offline with service worker caching; changes sync when connection returns
- **PWA Install**: Manifest configured for native-like installation on mobile devices with proper icons and display mode
- **Gesture Conflicts**: Swipe gestures only active on mobile with appropriate threshold to avoid accidental navigation
- **Error Boundaries**: React error boundaries catch rendering errors and display user-friendly fallback with bug reporting capability
- **State Synchronization**: Multiple components using the same useKV key stay synchronized via event-based updates (both same-tab and cross-tab)

## Technical Architecture

### State Management
- **useKV Hook**: Custom hook wrapping localStorage with React state synchronization
  - Automatic persistence to localStorage with `hh_kv_` prefix
  - Event-based synchronization between components using the same key
  - Cross-tab synchronization via storage events
  - Same-tab synchronization via custom `hh-kv-change` events
  - Functional updates supported for safe concurrent modifications

### Data Model
All data entities include a `householdId` field for multi-household support:
- **Chore**: id, householdId, title, description, assignedTo, frequency (once/daily/weekly/biweekly/monthly/quarterly/yearly/custom), customIntervalDays, room, priority, **scheduleType (fixed|after_completion), dueAt (timestamp), lastCompletedAt, lastCompletedBy**, dueDate (one-time), notes, daysOfWeek, estimatedMinutes, completed, createdAt, rotation (none/rotate/anyone), rotationOrder[], currentRotationIndex, streak, bestStreak, totalCompletions, averageCompletionTime, lastSkipped, trackTime
- **ChoreCompletion**: id, choreId, householdId, completedBy, completedAt, scheduledFor, notes, skipped
- **ShoppingItem**: id, householdId, name, category, quantity, priority, store, notes, purchased, createdAt
- **Meal**: id, householdId, date, type (breakfast/lunch/dinner), name, recipeId
- **Recipe**: id, householdId, name, ingredients[], instructions, prepTime, cookTime, servings, tags[], sourceUrl, imageUrl, createdAt
- **CalendarEvent**: id, householdId, title, date, endDate, startTime, endTime, isAllDay, description, location, category (personal/work/appointment/booking/birthday/holiday/travel/school/health/social/other), bookedBy, attendees[], recurrence (none/daily/weekly/biweekly/monthly/yearly), recurrenceEndDate, reminder (none/atTime/15min/30min/1hour/1day/1week), isPrivate, url, createdAt

### Authentication Context
- User, Household, and HouseholdMember management
- Role-based permissions (owner, admin, member)
- Household switching with automatic data filtering
- Member management (add/remove) scoped to current household
- Persistent sessions via localStorage

### Error Handling
- Global error boundary with fallback UI
- Automatic bug capture (errors, promise rejections, console errors)
- Bug report formatting for easy sharing/diagnosis
- Stack trace and context preservation

## Design Direction

The design should evoke a warm, welcoming feeling that makes household management feel less like work and more like collaborative home-making. It should feel organized but not sterile, friendly but not childish, and efficient but not rushed.

## Color Selection

A warm, earthy palette that feels grounded and homey with touches of natural green for freshness (default theme). Multiple theme options available for customization.

**Available Themes:**
1. **Warm Home (Default)** - Cozy terracotta and sage with dark mode support
2. **Ocean Breeze** - Cool blues and aqua tones with dark mode support
3. **Forest Calm** - Deep greens and earth tones with dark mode support
4. **Sunset Glow** - Warm oranges and purples with dark mode support
5. **Monochrome** - Clean black and white with enhanced dark mode featuring subtle green/yellow highlights for better contrast and visual hierarchy
6. **Lavender Dream** - Soft purples and pinks with dark mode support

Each theme includes carefully tuned dark mode variants with appropriate contrast ratios. The Monochrome theme's dark mode specifically adds subtle color highlights (green-yellow tones) to primary and accent elements to improve visual hierarchy and make important elements stand out against the dark background.

**Default Theme (Warm Home):**
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
  - **Tabs**: Main navigation between Dashboard/Chores/Shopping/Meals/Recipes/Settings sections
  - **Card**: Container for individual chores, recipes, meal entries, and dashboard widgets
  - **Checkbox**: Completing chores, checking off shopping items, selecting preferences
  - **Dialog**: Adding/editing chores, recipes, meals, auto-planning meals, URL parsing, confirmations
  - **Button**: Primary actions (add, save, delete, auto-plan, parse)
  - **Input/Textarea**: Form fields for entering data
  - **Select**: Category selection, household member assignment, meal type selection
  - **Calendar**: Custom weekly view for meal planning
  - **Badge**: Categories, frequency indicators, assignment labels, recipe tags, theme status
  - **ScrollArea**: Long lists and recipe instructions
  - **Toast**: User feedback for actions (using sonner)
  - **Switch**: Toggle controls for dashboard widgets
  - **Separator**: Visual dividers in settings

- **Customizations**:
  - Custom weekly calendar grid component for meal planning
  - Multi-view calendar with month/week/agenda toggle and multi-day event support
  - Recipe card with expandable ingredients/instructions and tag filtering
  - Shopping list with category grouping headers and auto-generation from meals
  - Chore frequency selector (once/daily/weekly/biweekly/monthly/quarterly/yearly/custom)
  - Chore rotation system (fixed/rotate/anyone) with automatic member cycling
  - Chore statistics dashboard with streak tracking and completion history
  - Time tracking start/stop for chores with average time calculation
  - Dashboard with collapsible sections and horizontal scrolling quick stats
  - AI-powered recipe URL parser
  - AI-powered automated meal planner with day-of-week constraints and daypart configuration
  - Global member filter in header with persistent state
  - Bug indicator badge in header with unresolved count
  - Notification summary widget with today's overview
  - Today at a Glance calendar card with quick daily overview

- **States**:
  - Buttons: Solid primary for main actions, ghost for secondary, with pressed state that feels substantial
  - Checkboxes: Large touch targets with smooth check animation and color transition
  - Cards: Subtle hover lift on interactive cards, completed items have reduced opacity
  - Inputs: Clear focus ring with accent color, validation feedback inline

- **Icon Selection**:
  - House for dashboard/home
  - Broom/cleaning icons for chores (using @phosphor-icons/react)
  - ShoppingCart for shopping list
  - CalendarBlank for meal planning and calendar views
  - CalendarCheck for due today indicators
  - CookingPot for recipes
  - Plus for add actions
  - Check/CheckCircle for completion
  - Trash for deletion
  - Users/User for assignment and member selection
  - Sparkle for AI-powered features
  - LinkIcon for recipe URLs
  - Tag for recipe tags/categories
  - MagnifyingGlass for search
  - Clock for time indicators
  - Timer for time tracking
  - MapPin for location information (calendar events)
  - Pencil for editing
  - Gear for settings
  - Palette for theme selection
  - SquaresFour for dashboard organization
  - ShieldCheck for admin functions
  - FloppyDisk for export/save
  - CaretLeft/CaretRight for calendar navigation
  - CaretUp/CaretDown for collapsible sections
  - X for remove/close
  - Bug for error/bug tracking indicator
  - Copy for clipboard operations
  - Moon/Sun for dark/light mode toggle
  - Fire for streak indicators
  - Trophy for achievements/stats
  - Warning for overdue/alert indicators
  - SkipForward for skip chore action
  - ArrowsClockwise for rotation/recurring
  - Play/Stop for time tracking
  - ChartBar for statistics
  - Repeat for recurring events/chores
  - Lightning for quick actions
  - Eye for view/visibility toggles
  - Funnel for filtering

- **Spacing**:
  - Container padding: p-6 (desktop) / p-4 (mobile)
  - Card padding: p-4
  - Section gaps: gap-6
  - List item gaps: gap-3
  - Button padding: px-6 py-3

- **Mobile**:
  - Tabs convert to customizable bottom navigation bar (3-5 items) with dynamic layout based on enabled tabs
  - Swipe left/right gestures to navigate between tabs
  - Settings menu includes mobile-specific navigation customizer
  - Compact layouts with larger touch targets (min 44x44px)
  - Reduced header sizes and simplified member management
  - Fixed bottom navigation with safe area insets for modern devices
  - Gesture-based navigation for improved one-handed use
  - Offline-first architecture with service worker caching
  - Visual indicators for offline mode and available app updates
  - Cards stack vertically with full width
  - Dialogs slide up from bottom on mobile vs centered on desktop
  - Meal planning calendar shows fewer days at a time with better stacking on mobile
  - Monthly calendar adapts to smaller grid on mobile with reduced event details
  - Dashboard widgets stack vertically with responsive grid
  - Touch targets minimum 44px height
  - Reduced padding throughout (p-4 becomes p-3)
  - Recipe tag filters scroll horizontally on mobile
  - Theme selector grid adapts to single column on mobile
  - Settings cards stack with full width on mobile
  - Calendar event details display in compact format on mobile
- **Tablet** (768px - 1024px):
  - Horizontal scrollable tab navigation with rounded pill-style tabs
  - Optimized two-column grid layouts for dashboard widgets and chore cards
  - Swipe gestures enabled for natural navigation between sections
  - Pull-to-refresh functionality for content updates
  - Badge text remains visible without truncation on wider viewports
  - Responsive padding and spacing that bridges mobile and desktop experiences
  - Touch-friendly targets while utilizing available screen space efficiently
