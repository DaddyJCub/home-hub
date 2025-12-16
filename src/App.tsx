import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Broom, ShoppingCart, CalendarBlank, CookingPot, House, Gear } from '@phosphor-icons/react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useKV } from '@github/spark/hooks'
import { getThemeById, applyTheme } from '@/lib/themes'
import DashboardSection from '@/components/sections/DashboardSection'
import ChoresSection from '@/components/sections/ChoresSection'
import ShoppingSection from '@/components/sections/ShoppingSection'
import MealsSection from '@/components/sections/MealsSection'
import RecipesSection from '@/components/sections/RecipesSection'
import CalendarSection from '@/components/sections/CalendarSection'
import SettingsSection from '@/components/sections/SettingsSection'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const isMobile = useIsMobile()
  const [currentThemeId = 'warm-home'] = useKV<string>('theme-id', 'warm-home')

  useEffect(() => {
    const theme = getThemeById(currentThemeId)
    if (theme) {
      applyTheme(theme)
    }
  }, [currentThemeId])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-primary">HomeHub</h1>
          <p className="text-sm text-muted-foreground">Household harmony made simple</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
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
                <CookingPot />
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
            <SettingsSection />
          </TabsContent>
        </Tabs>
      </main>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20">
          <div className="grid grid-cols-7">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <House size={24} />
              <span className="text-xs">Home</span>
            </button>
            <button
              onClick={() => setActiveTab('chores')}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === 'chores' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Broom size={24} />
              <span className="text-xs">Chores</span>
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === 'shopping' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <ShoppingCart size={24} />
              <span className="text-xs">Shopping</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === 'calendar' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <CalendarBlank size={24} />
              <span className="text-xs">Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab('meals')}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === 'meals' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <CookingPot size={24} />
              <span className="text-xs">Meals</span>
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === 'recipes' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <CookingPot size={24} />
              <span className="text-xs">Recipes</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Gear size={24} />
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

export default App
