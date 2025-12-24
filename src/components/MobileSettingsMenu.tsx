import { CalendarBlank, CookingPot, Gear } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface MobileSettingsMenuProps {
  onNavigate: (tab: string) => void
  children: React.ReactNode
}

export default function MobileSettingsMenu({ onNavigate, children }: MobileSettingsMenuProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold">More</h2>
        <p className="text-sm text-muted-foreground">Additional features and settings</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:hidden">
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onNavigate('calendar')}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarBlank size={24} className="text-primary" weight="duotone" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Calendar</h3>
              <p className="text-sm text-muted-foreground">View household events</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onNavigate('recipes')}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <CookingPot size={24} className="text-primary" weight="duotone" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Recipes</h3>
              <p className="text-sm text-muted-foreground">Browse recipe collection</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden">
        <Separator className="my-4" />
        <div className="flex items-center gap-2 mb-4">
          <Gear size={20} className="text-muted-foreground" />
          <h3 className="font-semibold">App Settings</h3>
        </div>
      </div>

      {children}
    </div>
  )
}
