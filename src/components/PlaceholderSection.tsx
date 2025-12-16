import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench } from '@phosphor-icons/react'

export default function PlaceholderSection({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench size={24} />
          {title} - Migration in Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section is being updated to work with the new household system.
          All your data is safe and will be available once the migration is complete.
        </p>
      </CardContent>
    </Card>
  )
}
