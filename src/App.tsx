import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Broom, ShoppingCart, CalendarBlank, CookingPot, House, Gear, BookOpen, DotsThree, Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/use-mobile'
import { useIsTablet } from '@/hooks/use-tablet'
import { useKV } from '@github/spark/hooks'
import { useSwipeGesture } from '@/hooks/use-swipe-gesture'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useNotifications } from '@/hooks/use-notifications'
import { getThemeById, applyTheme } from '@/lib/themes'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import AuthPage from '@/components/AuthPage'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { NotificationIndicator } from '@/components/NotificationIndicator'
import { NotificationCenter } from '@/components/NotificationCenter'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import { BugIndicator } from '@/components/BugIndicator'
import type { Chore, CalendarEvent } from '@/lib/types'
import type { NavItem } from '@/components/MobileNavCustomizer'
import { toast } from 'sonner'
import DashboardSection from '@/components/sections/DashboardSection'
import ChoresSection from '@/components/sections/ChoresSection'
import ShoppingSection from '@/components/sections/ShoppingSection'
import MealsSection from '@/components/sections/MealsSection'
import RecipesSection from '@/components/sections/RecipesSection'
import CalendarSection from '@/components/sections/CalendarSection'
import SettingsSection from '@/components/sections/SettingsSection'

type TabId = 'dashboard' | 'chores' | 'shopping' | 'meals' | 'calendar' | 'recipes'

interface TabConfig {
  id: TabId
  label: string
  shortLabel: string
  icon: typeof House
  enabled: boolean
}

export const TAB_CONFIGS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: House, enabled: true },
  { id: 'chores', label: 'Chores', shortLabel: 'Chores', icon: Broom, enabled: true },
  { id: 'shopping', label: 'Shopping', shortLabel: 'Shop', icon: ShoppingCart, enabled: true },
  { id: 'meals', label: 'Meals', shortLabel: 'Meals', icon: CookingPot, enabled: true },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: CalendarBlank, enabled: false },
  { id: 'recipes', label: 'Recipes', shortLabel: 'Recipes', icon: BookOpen, enabled: false }
]

const ICON_MAP: Record<string, Icon> = {
  house: House,
  home: House,
  broom: Broom,
  shoppingcart: ShoppingCart,
  shopping: ShoppingCart,
  cookingpot: CookingPot,
  meals: CookingPot,
  calendarblank: CalendarBlank,
  calendar: CalendarBlank,
  bookopen: BookOpen,
  recipes: BookOpen,
  gear: Gear,
  settings: Gear,
}

const ID_ICON_MAP: Record<string, Icon> = {
  dashboard: House,
  chores: Broom,
  shopping: ShoppingCart,
  meals: CookingPot,
  calendar: CalendarBlank,
  recipes: BookOpen,
  settings: Gear,
}

const getIcon = (iconName: string, fallbackId?: string): Icon => {
  const key = iconName?.toLowerCase().replace(/[^a-z]/g, "")
  if (key && ICON_MAP[key]) return ICON_MAP[key]
  if (fallbackId && ID_ICON_MAP[fallbackId]) return ID_ICON_MAP[fallbackId]
  return House
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', iconName: 'House', enabled: true },
  { id: 'chores', label: 'Chores', shortLabel: 'Chores', iconName: 'Broom', enabled: true },
  { id: 'shopping', label: 'Shopping', shortLabel: 'Shop', iconName: 'ShoppingCart', enabled: true },
  { id: 'meals', label: 'Meals', shortLabel: 'Meals', iconName: 'CookingPot', enabled: true },
  { id: 'settings', label: 'Settings', shortLabel: 'More', iconName: 'Gear', enabled: true },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', iconName: 'CalendarBlank', enabled: false },
  { id: 'recipes', label: 'Recipes', shortLabel: 'Recipes', iconName: 'BookOpen', enabled: false }
]

function AppContent() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam && ['dashboard', 'chores', 'shopping', 'meals', 'recipes', 'calendar', 'settings'].includes(tabParam)) {
      return tabParam
    }
    const stored = window.localStorage.getItem('hh_last_tab')
    return stored && ['dashboard', 'chores', 'shopping', 'meals', 'recipes', 'calendar', 'settings'].includes(stored)
      ? stored
      : 'dashboard'
  })
  const [highlightTarget] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const highlight = params.get('highlight')
    const tabParam = params.get('tab') as TabId | null
    if (highlight && tabParam) return { tab: tabParam, id: highlight }
    return null
  })
  const [viewRecipeId, setViewRecipeId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [currentThemeId, setCurrentThemeId] = useKV<string>('theme-id', 'warm-home')
  const [isDarkMode, setIsDarkMode] = useKV<boolean>('dark-mode', false)
  const [enabledTabsRaw] = useKV<TabId[]>('enabled-tabs', TAB_CONFIGS.filter(t => t.enabled).map(t => t.id))
  const [navItemsRaw] = useKV<NavItem[]>('mobile-nav-items', DEFAULT_NAV_ITEMS)
  const [choresRaw] = useKV<Chore[]>('chores', [])
  const [eventsRaw] = useKV<CalendarEvent[]>('calendar-events', [])
  
  // Null-safe fallbacks - useKV may return null instead of undefined
  const enabledTabs = enabledTabsRaw ?? TAB_CONFIGS.filter(t => t.enabled).map(t => t.id)
  const navItems = navItemsRaw ?? DEFAULT_NAV_ITEMS
  const allChores = choresRaw ?? []
  const allEvents = eventsRaw ?? []
  
  const { isAuthenticated, currentHousehold, isLoading } = useAuth()
  
  // Filter by current household for notifications
  const chores = currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id) : []
  const events = currentHousehold ? allEvents.filter(e => e.householdId === currentHousehold.id) : []

  useNotifications(chores, events)

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  const { isPulling, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile || isTablet,
  })

  const visibleTabs = TAB_CONFIGS.filter(tab => enabledTabs.includes(tab.id))
  const tabOrder = visibleTabs.map(tab => tab.id)

  // Ensure nav items mirror enabled tabs for label/icon consistency
  const syncedNavItems = useMemo(() => {
    const tabMap = Object.fromEntries(TAB_CONFIGS.map((t) => [t.id, t]))
    return navItems.map((item) => {
      const match = tabMap[item.id as TabId]
      if (match) {
        const iconName = match.icon.name
        return { ...item, label: match.label, shortLabel: match.shortLabel, iconName }
      }
      return item
    })
  }, [navItems])

  useEffect(() => {
    if (highlightTarget && highlightTarget.tab !== activeTab) {
      setActiveTab(highlightTarget.tab)
    }
    if (highlightTarget && highlightTarget.tab === 'calendar') {
      toast.info('Opening event', { description: 'Highlighted event from notification' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // For mobile navigation: show first 4 enabled items in the bar, rest in More menu
  const enabledNavItems = syncedNavItems.filter(item => item.enabled && item.id !== 'settings')
  const visibleNavItems = enabledNavItems.slice(0, 4)
  const overflowNavItems = enabledNavItems.slice(4)
  
  // All available tabs for the More menu (includes disabled ones for quick access)
  const allAvailableTabs: { id: string; label: string; iconName: string }[] = [
    { id: 'dashboard', label: 'Dashboard', iconName: 'House' },
    { id: 'chores', label: 'Chores', iconName: 'Broom' },
    { id: 'shopping', label: 'Shopping', iconName: 'ShoppingCart' },
    { id: 'meals', label: 'Meals', iconName: 'CookingPot' },
    { id: 'calendar', label: 'Calendar', iconName: 'CalendarBlank' },
    { id: 'recipes', label: 'Recipes', iconName: 'BookOpen' },
  ]
  
  // Get tabs not in the visible nav items for the More menu
  const moreMenuItems = allAvailableTabs.filter(
    tab => !visibleNavItems.some(nav => nav.id === tab.id)
  )

  const navigateToTab = (direction: 'left' | 'right') => {
    const currentIndex = tabOrder.indexOf(activeTab as TabId)
    if (currentIndex === -1) return

    let newIndex
    if (direction === 'left') {
      newIndex = currentIndex === 0 ? tabOrder.length - 1 : currentIndex - 1
    } else {
      newIndex = currentIndex === tabOrder.length - 1 ? 0 : currentIndex + 1
    }
    setActiveTab(tabOrder[newIndex])
  }

  useSwipeGesture({
    onSwipeLeft: () => (isMobile || isTablet) && navigateToTab('right'),
    onSwipeRight: () => (isMobile || isTablet) && navigateToTab('left'),
    threshold: 100
  })

  useEffect(() => {
    // Apply theme when values are loaded from storage
    if (currentThemeId) {
      const theme = getThemeById(currentThemeId)
      if (theme) {
        applyTheme(theme, isDarkMode ?? false)
      }
    }
  }, [currentThemeId, isDarkMode])

  useEffect(() => {
    if (activeTab) {
      window.localStorage.setItem('hh_last_tab', activeTab)
    }
  }, [activeTab])

  // Handle viewing a recipe from another section (e.g., Dashboard)
  const handleViewRecipe = (recipeId: string) => {
    setViewRecipeId(recipeId)
    setActiveTab('recipes')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Restoring your HomeHub session...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <RefreshIndicator isPulling={isPulling} isRefreshing={isRefreshing} progress={progress} />
      <header className="border-b border-border/60 bg-card/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md sticky top-0 z-10">
        <div
          className="app-shell py-3 md:py-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="min-w-0 flex-shrink flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-lg">
                HH
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary truncate">HomeHub</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {currentHousehold?.name || 'Household harmony made simple'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <BugIndicator onClick={() => setActiveTab('settings')} />
              <NotificationCenter chores={chores} events={events} />
            </div>
          </div>
        </div>
      </header>

      <main
        className="app-shell space-y-6 md:space-y-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isMobile && !isTablet && (
            <TabsList className="grid w-full grid-cols-7 mb-6 bg-card/70 backdrop-blur-sm p-1 rounded-2xl border border-border/60 shadow-md">
              <TabsTrigger value="dashboard" className="gap-2">
                <House />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="chores" className="gap-2">
                <Broom />
                <span>Chores</span>
              </TabsTrigger>
              <TabsTrigger value="shopping" className="gap-2">
                <ShoppingCart />
                <span>Shopping</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarBlank />
                <span>Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="meals" className="gap-2">
                <CookingPot />
                <span>Meals</span>
              </TabsTrigger>
              <TabsTrigger value="recipes" className="gap-2">
                <BookOpen />
                <span>Recipes</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Gear />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          )}

          {isTablet && (
            <div className="mb-6 border-b border-border/60 pb-3">
              <div className="flex items-center overflow-x-auto scrollbar-hide">
                <TabsList className="inline-flex w-auto h-12 bg-card/70 backdrop-blur-sm p-1 rounded-2xl gap-1 border border-border/60 shadow-sm">
                  <TabsTrigger value="dashboard" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <House size={20} />
                    <span className="text-sm">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="chores" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <Broom size={20} />
                    <span className="text-sm">Chores</span>
                  </TabsTrigger>
                  <TabsTrigger value="shopping" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <ShoppingCart size={20} />
                    <span className="text-sm">Shopping</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <CalendarBlank size={20} />
                    <span className="text-sm">Calendar</span>
                  </TabsTrigger>
                  <TabsTrigger value="meals" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <CookingPot size={20} />
                    <span className="text-sm">Meals</span>
                  </TabsTrigger>
                  <TabsTrigger value="recipes" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <BookOpen size={20} />
                    <span className="text-sm">Recipes</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <Gear size={20} />
                    <span className="text-sm">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          )}

          <TabsContent value="dashboard" className="mt-0">
            <DashboardSection
              onNavigate={setActiveTab}
              onViewRecipe={handleViewRecipe}
              highlightChoreId={highlightTarget?.tab === 'chores' ? highlightTarget.id : undefined}
            />
          </TabsContent>

          <TabsContent value="chores" className="mt-0">
            <ChoresSection highlightChoreId={highlightTarget?.tab === 'chores' ? highlightTarget.id : undefined} />
          </TabsContent>

          <TabsContent value="shopping" className="mt-0">
            <ShoppingSection />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CalendarSection />
          </TabsContent>

          <TabsContent value="meals" className="mt-0">
            <MealsSection />
          </TabsContent>

          <TabsContent value="recipes" className="mt-0">
            <RecipesSection 
              initialRecipeId={viewRecipeId} 
              onRecipeViewed={() => setViewRecipeId(null)} 
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsSection />
          </TabsContent>
        </Tabs>
      </main>

      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl z-20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="grid max-w-screen-sm mx-auto" style={{ gridTemplateColumns: `repeat(${Math.min(visibleNavItems.length + 1, 5)}, 1fr)` }}>
            {visibleNavItems.map((item) => {
              const IconComponent = getIcon(item.iconName, item.id)
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-3 transition-colors min-h-[48px] ${
                    activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <IconComponent size={22} weight={activeTab === item.id ? 'fill' : 'regular'} />
                  <span className="text-[10px] font-medium">{item.shortLabel}</span>
                </button>
              )
            })}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex flex-col items-center gap-0.5 py-3 transition-colors min-h-[48px] ${
                    moreMenuItems.some(item => item.id === activeTab) || activeTab === 'settings' 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <DotsThree size={22} weight="bold" />
                  <span className="text-[10px] font-medium">More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 mb-2">
                {moreMenuItems.map((item) => {
                  const IconComponent = getIcon(item.iconName, item.id)
                  const isActive = activeTab === item.id
                  
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`gap-2 ${isActive ? 'bg-accent' : ''}`}
                    >
                      <IconComponent size={18} />
                      {item.label}
                      {isActive && <span className="ml-auto text-xs text-primary">●</span>}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setActiveTab('settings')} 
                  className={`gap-2 ${activeTab === 'settings' ? 'bg-accent' : ''}`}
                >
                  <Gear size={18} />
                  Settings
                  {activeTab === 'settings' && <span className="ml-auto text-xs text-primary">●</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
