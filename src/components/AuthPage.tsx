import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/AuthContext'
import { showUserFriendlyError } from '@/lib/error-helpers'
import { forgotPassword, resetPassword } from '@/lib/api'
import { validatePassword } from '@/lib/validators'
import { House, ArrowLeft, Copy, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'

type AuthView = 'auth' | 'forgot-password' | 'forgot-password-success' | 'reset-password'

export default function AuthPage() {
  const { login, signup } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<AuthView>('auth')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<{ 
    loginEmail?: string; loginPassword?: string; 
    signupEmail?: string; signupPassword?: string; signupConfirm?: string; signupName?: string;
    forgotEmail?: string;
    resetPassword?: string; resetConfirm?: string;
  }>({})

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({ email: '', password: '', displayName: '', confirmPassword: '' })
  const [forgotForm, setForgotForm] = useState({ email: '' })
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' })

  // Use shared password validation
  const signupPasswordValidation = validatePassword(signupForm.password)
  const resetPasswordValidation = validatePassword(resetForm.password)

  // Check for reset token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setResetToken(token)
      setView('reset-password')
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

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
    const passErr = !signupPasswordValidation.valid ? 'Password must meet the requirements' : ''
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailErr = !forgotForm.email.trim() ? 'Email is required' : ''
    setErrors((prev) => ({ ...prev, forgotEmail: emailErr }))
    if (emailErr) return
    setIsLoading(true)

    try {
      const result = await forgotPassword(forgotForm.email)
      setEmailSent(result.emailSent)
      setResetLink(result.resetLink || null)
      setView('forgot-password-success')
    } catch (error) {
      showUserFriendlyError(error, 'Failed to send reset link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetToken) {
      toast.error('Invalid reset link')
      return
    }

    const passErr = !resetPasswordValidation.valid ? 'Password must meet the requirements' : ''
    const confirmErr = resetForm.password !== resetForm.confirmPassword ? 'Passwords do not match' : ''
    setErrors((prev) => ({ ...prev, resetPassword: passErr, resetConfirm: confirmErr }))
    if (passErr || confirmErr) {
      if (passErr) toast.error(passErr)
      return
    }

    setIsLoading(true)

    try {
      await resetPassword(resetToken, resetForm.password)
      toast.success('Password updated successfully! Please sign in.')
      setView('auth')
      setResetToken(null)
      setResetForm({ password: '', confirmPassword: '' })
    } catch (error) {
      showUserFriendlyError(error, 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  const copyResetLink = async () => {
    if (!resetLink) return
    try {
      await navigator.clipboard.writeText(resetLink)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const renderPasswordRules = (rules: Array<{ id: string; label: string; pass: boolean }>) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
      {rules.map(rule => (
        <div key={rule.id} className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${rule.pass ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
          <span>{rule.label}</span>
        </div>
      ))}
    </div>
  )

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

        {/* Forgot Password View */}
        {view === 'forgot-password' && (
          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                className="w-fit mb-2 -ml-2"
                onClick={() => setView('auth')}
              >
                <ArrowLeft size={16} className="mr-1" />
                Back to sign in
              </Button>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotForm.email}
                    onChange={(e) => setForgotForm({ email: e.target.value })}
                    required
                    aria-invalid={!!errors.forgotEmail}
                  />
                  {errors.forgotEmail && <p className="text-xs text-destructive">{errors.forgotEmail}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Forgot Password Success View */}
        {view === 'forgot-password-success' && (
          <Card>
            <CardHeader>
              <CardTitle>{emailSent ? 'Check Your Email' : 'Reset Link Ready'}</CardTitle>
              <CardDescription>
                {emailSent 
                  ? 'We sent a password reset link to your email address.' 
                  : 'Email is not configured. Use the link below to reset your password.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailSent ? (
                <p className="text-sm text-muted-foreground">
                  If you don't see the email, check your spam folder. The link expires in 1 hour.
                </p>
              ) : resetLink ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Copy this link and open it in your browser. The link expires in 1 hour.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={resetLink} 
                      readOnly 
                      className="text-xs font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={copyResetLink}
                      className="shrink-0"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>
              ) : null}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setView('auth')
                  setForgotForm({ email: '' })
                  setResetLink(null)
                }}
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reset Password View */}
        {view === 'reset-password' && (
          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Enter your new password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-password">New Password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="********"
                    value={resetForm.password}
                    onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                    required
                    minLength={8}
                    aria-invalid={!!errors.resetPassword}
                  />
                  {errors.resetPassword && <p className="text-xs text-destructive">{errors.resetPassword}</p>}
                  {renderPasswordRules(resetPasswordValidation.rules)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm">Confirm New Password</Label>
                  <Input
                    id="reset-confirm"
                    type="password"
                    placeholder="********"
                    value={resetForm.confirmPassword}
                    onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                    required
                    minLength={8}
                    aria-invalid={!!errors.resetConfirm}
                  />
                  {errors.resetConfirm && <p className="text-xs text-destructive">{errors.resetConfirm}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => {
                    setView('auth')
                    setResetToken(null)
                    setResetForm({ password: '', confirmPassword: '' })
                  }}
                >
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Main Auth View */}
        {view === 'auth' && (
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
                    <Button 
                      type="button"
                      variant="link" 
                      className="w-full text-sm"
                      onClick={() => setView('forgot-password')}
                    >
                      Forgot password?
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
                      {renderPasswordRules(signupPasswordValidation.rules)}
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
        )}
      </div>
    </div>
  )
}
