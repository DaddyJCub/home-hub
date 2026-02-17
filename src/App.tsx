import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Broom, ShoppingCart, CookingPot, House, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
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
import { NotificationCenter } from '@/components/NotificationCenter'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import { BugIndicator } from '@/components/BugIndicator'
import { motion, AnimatePresence } from 'framer-motion'
import type { Chore, CalendarEvent } from '@/lib/types'
import DashboardSection from '@/components/sections/DashboardSection'
import ChoresSection from '@/components/sections/ChoresSection'
import ShoppingSection from '@/components/sections/ShoppingSection'
import MealsSection from '@/components/sections/MealsSection'
import SettingsSection from '@/components/sections/SettingsSection'

type TabId = 'dashboard' | 'chores' | 'meals' | 'shopping'

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
  { id: 'meals', label: 'Meals', shortLabel: 'Meals', icon: CookingPot, enabled: true },
  { id: 'shopping', label: 'Shopping', shortLabel: 'Shop', icon: ShoppingCart, enabled: true },
]

const VALID_TABS = ['dashboard', 'chores', 'shopping', 'meals', 'settings']

function AppContent() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    // Redirect old calendar/recipes tabs to meals
    if (tabParam === 'calendar' || tabParam === 'recipes') return 'meals'
    if (tabParam && VALID_TABS.includes(tabParam)) return tabParam
    const stored = window.localStorage.getItem('hh_last_tab')
    if (stored === 'calendar' || stored === 'recipes') return 'meals'
    return stored && VALID_TABS.includes(stored) ? stored : 'dashboard'
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
  const [currentThemeId] = useKV<string>('theme-id', 'warm-home')
  const [isDarkMode] = useKV<boolean>('dark-mode', false)
  const [choresRaw] = useKV<Chore[]>('chores', [])
  const [eventsRaw] = useKV<CalendarEvent[]>('calendar-events', [])

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

  const tabOrder = useMemo(() => TAB_CONFIGS.map(tab => tab.id), [])

  useEffect(() => {
    if (highlightTarget && highlightTarget.tab !== activeTab) {
      setActiveTab(highlightTarget.tab)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setActiveTab('meals')
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
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveTab('settings')}
                  className={`h-9 w-9 ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                >
                  <Gear size={20} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main
        className="app-shell space-y-6 md:space-y-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Navigation */}
          {!isMobile && !isTablet && (
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-card/70 backdrop-blur-sm p-1 rounded-2xl border border-border/60 shadow-md">
              {TAB_CONFIGS.map(tab => {
                const IconComponent = tab.icon
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                    <IconComponent />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          )}

          {/* Tablet Navigation */}
          {isTablet && (
            <div className="mb-6 border-b border-border/60 pb-3">
              <div className="flex items-center overflow-x-auto scrollbar-hide">
                <TabsList className="inline-flex w-auto h-12 bg-card/70 backdrop-blur-sm p-1 rounded-2xl gap-1 border border-border/60 shadow-sm">
                  {TAB_CONFIGS.map(tab => {
                    const IconComponent = tab.icon
                    return (
                      <TabsTrigger key={tab.id} value={tab.id} className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                        <IconComponent size={20} />
                        <span className="text-sm">{tab.label}</span>
                      </TabsTrigger>
                    )
                  })}
                  <TabsTrigger value="settings" className="gap-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                    <Gear size={20} />
                    <span className="text-sm">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
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

              <TabsContent value="meals" className="mt-0">
                <MealsSection
                  initialRecipeId={viewRecipeId}
                  onRecipeViewed={() => setViewRecipeId(null)}
                />
              </TabsContent>

              <TabsContent value="shopping" className="mt-0">
                <ShoppingSection />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <SettingsSection />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl z-20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="grid max-w-screen-sm mx-auto grid-cols-5">
            {TAB_CONFIGS.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 py-3 transition-colors min-h-[48px] ${
                    activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <IconComponent size={22} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                  <span className="text-[10px] font-medium">{tab.shortLabel}</span>
                </button>
              )
            })}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-0.5 py-3 transition-colors min-h-[48px] ${
                activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Gear size={22} weight={activeTab === 'settings' ? 'fill' : 'regular'} />
              <span className="text-[10px] font-medium">Settings</span>
            </button>
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
