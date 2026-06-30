import { useState } from 'react'
import { ChatCircleDots } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function FeedbackModal() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (subject.trim().length < 3) { toast.error('Subject must be at least 3 characters'); return }
    if (message.trim().length < 5) { toast.error('Message must be at least 5 characters'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject: subject.trim(), message: message.trim(), email: email.trim() || undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send feedback')
      }
      toast.success('Thanks! Your feedback was received.')
      setOpen(false)
      setCategory('general')
      setSubject('')
      setMessage('')
      setEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Send feedback"
          aria-label="Send feedback"
          className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <ChatCircleDots size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug report</SelectItem>
                <SelectItem value="feature_request">Feature request</SelectItem>
                <SelectItem value="general">General feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-subject">Subject</Label>
            <Input
              id="fb-subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary"
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-message">Message</Label>
            <Textarea
              id="fb-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe the issue or idea in detail"
              rows={4}
              maxLength={2000}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-email">
              Email <span className="text-muted-foreground text-xs">(optional — for follow-up)</span>
            </Label>
            <Input
              id="fb-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={200}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default FeedbackModal
