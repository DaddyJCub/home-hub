import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Broom, ShoppingCart, CalendarBlank, CookingPot, House, Gear, BookOpen } from '@phosphor-icons/react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useKV } from '@github/spark/hooks'
import { useSwipeGesture } from '@/hooks/use-swipe-gesture'
import { useNotifications } from '@/hooks/use-notifications'
import { getThemeById, applyTheme } from '@/lib/themes'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import AuthPage from '@/components/AuthPage'
import HouseholdSwitcher from '@/components/HouseholdSwitcher'
import MobileSettingsMenu from '@/components/MobileSettingsMenu'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { NotificationIndicator } from '@/components/NotificationIndicator'
import type { NavItem } from '@/components/MobileNavCustomizer'
import type { Chore, CalendarEvent } from '@/lib/types'
import DashboardSection from '@/components/sections/DashboardSection'
import ChoresSection from '@/components/sections/ChoresSection'
import ShoppingSection from '@/components/sections/ShoppingSection'
import MealsSection from '@/components/sections/MealsSection'
import RecipesSection from '@/components/sections/RecipesSection'
import CalendarSection from '@/components/sections/CalendarSection'
import SettingsSection from '@/components/sections/SettingsSection'

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: House, enabled: true },
  { id: 'chores', label: 'Chores', shortLabel: 'Chores', icon: Broom, enabled: true },
  { id: 'shopping', label: 'Shopping', shortLabel: 'Shop', icon: ShoppingCart, enabled: true },
  { id: 'meals', label: 'Meals', shortLabel: 'Meals', icon: CookingPot, enabled: true },
  { id: 'settings', label: 'Settings', shortLabel: 'More', icon: Gear, enabled: true },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: CalendarBlank, enabled: false },
  { id: 'recipes', label: 'Recipes', shortLabel: 'Recipes', icon: BookOpen, enabled: false }
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
  const [currentThemeId = 'warm-home'] = useKV<string>('theme-id', 'warm-home')
  const [isDarkMode = false] = useKV<boolean>('dark-mode', false)
  const [navItems = DEFAULT_NAV_ITEMS] = useKV<NavItem[]>('mobile-nav-items', DEFAULT_NAV_ITEMS)
  const [chores = []] = useKV<Chore[]>('chores', [])
  const [events = []] = useKV<CalendarEvent[]>('calendar-events', [])
  const { isAuthenticated, currentHousehold, logout } = useAuth()

  useNotifications(chores, events)

  const enabledNavItems = navItems.filter(item => item.enabled)
  const tabOrder = enabledNavItems.map(item => item.id)

  const navigateToTab = (direction: 'left' | 'right') => {
    const currentIndex = tabOrder.indexOf(activeTab)
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
    onSwipeLeft: () => isMobile && navigateToTab('right'),
    onSwipeRight: () => isMobile && navigateToTab('left'),
    threshold: 100
  })

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
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 py-3 md:px-4 md:py-4">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="min-w-0 flex-shrink">
              <h1 className="text-xl md:text-3xl font-bold text-primary truncate">HomeHub</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {currentHousehold?.name || 'Household harmony made simple'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationIndicator chores={chores} events={events} />
              <HouseholdSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 pb-20 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-7 mb-6">
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
            {isMobile ? (
              <MobileSettingsMenu onNavigate={setActiveTab}>
                <SettingsSection />
              </MobileSettingsMenu>
            ) : (
              <SettingsSection />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-20 safe-area-inset-bottom">
          <div className={`grid max-w-screen-sm mx-auto`} style={{ gridTemplateColumns: `repeat(${enabledNavItems.length}, 1fr)` }}>
            {enabledNavItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${
                    activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon size={22} weight={activeTab === item.id ? 'fill' : 'regular'} />
                  <span className="text-[10px] font-medium">{item.shortLabel}</span>
                </button>
              )
            })}
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
