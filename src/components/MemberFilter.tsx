import { useKV } from '@github/spark/hooks'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Users } from '@phosphor-icons/react'
import type { HouseholdMember } from '@/lib/types'

export default function MemberFilter() {
  const [members = []] = useKV<HouseholdMember[]>('household-members', [])
  const [selectedMember, setSelectedMember] = useKV<string>('selected-member-filter', 'all')

  if (members.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 bg-accent/30 px-3 py-2 rounded-lg border border-accent">
      <User size={18} className="text-accent-foreground" />
      <span className="text-sm font-medium text-accent-foreground">View:</span>
      <Select value={selectedMember} onValueChange={setSelectedMember}>
        <SelectTrigger className="w-40 h-8 border-0 bg-background/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users size={16} />
              Everyone
            </div>
          </SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.name}>
              <div className="flex items-center gap-2">
                <User size={16} />
                {member.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
