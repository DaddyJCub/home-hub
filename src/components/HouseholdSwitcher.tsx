import { useAuth } from '@/lib/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { House, SignOut, Plus, UserPlus } from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function HouseholdSwitcher() {
  const { currentHousehold, userHouseholds, switchHousehold, logout, currentUser, currentUserRole, createHousehold: createHouseholdCtx, joinHousehold } = useAuth()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim() || !currentUser) return

    const created = createHouseholdCtx(newHouseholdName.trim())
    if (created) {
      switchHousehold(created.id)
      toast.success(`${created.name} created!`)
    }
    setNewHouseholdName('')
    setCreateDialogOpen(false)
  }

  const handleJoinHousehold = () => {
    if (!inviteCode.trim() || !currentUser) return

    const result = joinHousehold(inviteCode)
    if (result.success) {
      setInviteCode('')
      setJoinDialogOpen(false)
      toast.success('Joined household!')
    } else {
      toast.error(result.error || 'Invalid invite code')
    }
  }

  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin'

  return (
    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 md:gap-2 bg-secondary/50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border text-xs md:text-sm">
        <House size={16} className="text-primary flex-shrink-0 hidden md:block" />
        {userHouseholds.length > 1 ? (
          <Select
            value={currentHousehold?.id || ''}
            onValueChange={switchHousehold}
          >
            <SelectTrigger className="w-28 md:w-48 h-7 md:h-8 border-0 bg-background/80 text-xs md:text-sm">
              <SelectValue placeholder="Select household" />
            </SelectTrigger>
            <SelectContent>
              {userHouseholds.map((household) => (
                <SelectItem key={household.id} value={household.id}>
                  {household.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs md:text-sm font-medium truncate max-w-[120px] md:max-w-none">{currentHousehold?.name}</span>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 md:gap-2 h-7 md:h-9 px-2 md:px-3 text-xs md:text-sm">
            <Plus size={14} />
            <span className="hidden sm:inline">New</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Household</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                placeholder="The Smith Family"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateHousehold()}
              />
            </div>
            <Button onClick={handleCreateHousehold} className="w-full">
              Create Household
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 md:gap-2 h-7 md:h-9 px-2 md:px-3 text-xs md:text-sm">
            <UserPlus size={14} />
            <span className="hidden sm:inline">Join</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Join Household</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter 8-character code"
                maxLength={8}
                className="uppercase"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinHousehold()}
              />
              <p className="text-xs text-muted-foreground">
                Ask the household owner or admin for an invite code
              </p>
            </div>
            <Button onClick={handleJoinHousehold} className="w-full">
              Join Household
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {canInvite && currentHousehold?.inviteCode && (
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 md:gap-2 h-7 md:h-9 px-2 md:px-3 text-xs md:text-sm hidden sm:flex">
              <UserPlus size={14} />
              Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Members</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <div className="flex items-center gap-2">
                  <Badge className="text-xl md:text-2xl font-mono px-3 md:px-4 py-2">
                    {currentHousehold.inviteCode}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(currentHousehold.inviteCode!)
                      toast.success('Invite code copied!')
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with people you want to invite to {currentHousehold.name}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Button variant="ghost" size="sm" onClick={logout} className="gap-1 md:gap-2 h-7 md:h-9 px-2 md:px-3 text-xs md:text-sm">
        <SignOut size={14} />
        <span className="hidden md:inline">Sign Out</span>
      </Button>
    </div>
  )
}
