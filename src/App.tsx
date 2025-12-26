import { useState, useEffect } from 'react'
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
import HouseholdSwitcher from '@/components/HouseholdSwitcher'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { NotificationIndicator } from '@/components/NotificationIndicator'
import { NotificationCenter } from '@/components/NotificationCenter'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import type { Chore, CalendarEvent } from '@/lib/types'
import type { NavItem } from '@/components/MobileNavCustomizer'
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

const TAB_CONFIGS: TabConfig[] = [
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
    return tabParam && ['dashboard', 'chores', 'shopping', 'meals', 'recipes', 'calendar', 'settings'].includes(tabParam)
      ? tabParam
      : 'dashboard'
  })
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
  const chores = choresRaw ?? []
  const events = eventsRaw ?? []
  
  const { isAuthenticated, currentHousehold, logout } = useAuth()

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
  
  const enabledNavItems = navItems.filter(item => item.enabled && item.id !== 'settings')
  const visibleNavItems = enabledNavItems.slice(0, 4)
  const overflowNavItems = enabledNavItems.slice(4)

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
    const theme = getThemeById(currentThemeId)
    if (theme) {
      applyTheme(theme, isDarkMode)
    }
  }, [])

  useEffect(() => {
    const theme = getThemeById(currentThemeId)
    if (theme) {
      applyTheme(theme, isDarkMode)
    }
  }, [currentThemeId, isDarkMode])

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
              <NotificationCenter chores={chores} events={events} />
              <HouseholdSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="app-shell space-y-6 md:space-y-8">
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
            <DashboardSection />
          </TabsContent>

          <TabsContent value="chores" className="mt-0">
            <ChoresSection />
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
            <RecipesSection />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsSection />
          </TabsContent>
        </Tabs>
      </main>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl z-20 safe-area-inset-bottom">
          <div className="grid max-w-screen-sm mx-auto" style={{ gridTemplateColumns: `repeat(${Math.min(visibleNavItems.length + 1, 5)}, 1fr)` }}>
            {visibleNavItems.map((item) => {
              const IconComponent = getIcon(item.iconName, item.id)
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${
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
                  className="flex flex-col items-center gap-0.5 py-2 transition-colors text-muted-foreground"
                >
                  <DotsThree size={22} weight="bold" />
                  <span className="text-[10px] font-medium">More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 mb-2">
                {overflowNavItems.map((item) => {
                  const IconComponent = getIcon(item.iconName)
                  
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="gap-2"
                    >
                      <IconComponent size={18} />
                      {item.label}
                    </DropdownMenuItem>
                  )
                })}
                {overflowNavItems.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => setActiveTab('settings')} className="gap-2">
                  <Gear size={18} />
                  Settings
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
