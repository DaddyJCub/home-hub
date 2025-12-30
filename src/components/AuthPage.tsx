import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/AuthContext'
import { showUserFriendlyError } from '@/lib/error-helpers'
import { House } from '@phosphor-icons/react'
import { toast } from 'sonner'

export default function AuthPage() {
  const { login, signup } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ loginEmail?: string; loginPassword?: string; signupEmail?: string; signupPassword?: string; signupConfirm?: string; signupName?: string }>({})

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({ email: '', password: '', displayName: '', confirmPassword: '' })
  const passwordRules = [
    { id: 'length', label: 'At least 8 characters', pass: signupForm.password.length >= 8 },
    { id: 'letters', label: 'Contains a letter', pass: /[A-Za-z]/.test(signupForm.password) },
    { id: 'numbers', label: 'Contains a number', pass: /\d/.test(signupForm.password) }
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailErr = !loginForm.email.trim() ? 'Email is required' : ''
    const passErr = !loginForm.password.trim() ? 'Password is required' : ''
    setErrors((prev) => ({ ...prev, loginEmail: emailErr, loginPassword: passErr }))
    if (emailErr || passErr) return
    setIsLoading(true)

    try {
      const result = await login(loginForm.email, loginForm.password)
      if (result.success) {
        toast.success('Welcome back!')
      } else {
        showUserFriendlyError(result.error, 'Invalid email or password')
      }
    } catch (error) {
      showUserFriendlyError(error, 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    const nameErr = !signupForm.displayName.trim() ? 'Display name is required' : ''
    const emailErr = !signupForm.email.trim() ? 'Email is required' : ''
    const passErr = !passwordRules.every(rule => rule.pass) ? 'Password must meet the requirements' : ''
    const confirmErr = signupForm.password !== signupForm.confirmPassword ? 'Passwords do not match' : ''
    setErrors((prev) => ({ ...prev, signupName: nameErr, signupEmail: emailErr, signupPassword: passErr, signupConfirm: confirmErr }))
    if (nameErr || emailErr || passErr || confirmErr) {
      if (passErr) toast.error(passErr)
      return
    }

    setIsLoading(true)

    try {
      const result = await signup(signupForm.email, signupForm.password, signupForm.displayName)
      if (result.success) {
        toast.success('Account created! Welcome to HomeHub')
      } else {
        showUserFriendlyError(result.error, 'Signup failed')
      }
    } catch (error) {
      showUserFriendlyError(error, 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <House size={48} className="text-primary" />
            <h1 className="text-4xl font-bold text-primary">HomeHub</h1>
          </div>
          <p className="text-muted-foreground">Household harmony made simple</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Enter your credentials to access your household</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      aria-invalid={!!errors.loginEmail}
                    />
                    {errors.loginEmail && <p className="text-xs text-destructive">{errors.loginEmail}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="********"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      aria-invalid={!!errors.loginPassword}
                    />
                    {errors.loginPassword && <p className="text-xs text-destructive">{errors.loginPassword}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Start managing your household today</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Display Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupForm.displayName}
                      onChange={(e) => setSignupForm({ ...signupForm, displayName: e.target.value })}
                      required
                      aria-invalid={!!errors.signupName}
                    />
                    {errors.signupName && <p className="text-xs text-destructive">{errors.signupName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                      aria-invalid={!!errors.signupEmail}
                    />
                    {errors.signupEmail && <p className="text-xs text-destructive">{errors.signupEmail}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="********"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                      minLength={8}
                      aria-invalid={!!errors.signupPassword}
                    />
                    {errors.signupPassword && <p className="text-xs text-destructive">{errors.signupPassword}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                      {passwordRules.map(rule => (
                        <div key={rule.id} className="flex items-center gap-1">
                          <div className={`h-2 w-2 rounded-full ${rule.pass ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                          <span>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="********"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                      minLength={8}
                      aria-invalid={!!errors.signupConfirm}
                    />
                    {errors.signupConfirm && <p className="text-xs text-destructive">{errors.signupConfirm}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
