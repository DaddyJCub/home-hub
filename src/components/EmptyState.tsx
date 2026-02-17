import type { Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  icon: Icon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: IconComponent, title, description, action }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <IconComponent size={48} className="mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </Card>
  )
}
