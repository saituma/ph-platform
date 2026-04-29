import * as React from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { apiClient } from '../lib/api'

export const Route = createLazyFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await apiClient('/auth/login', {
          method: 'POST',
          body: JSON.stringify(value),
        })
        
        if (response.accessToken) {
          localStorage.setItem('auth_token', response.accessToken)
          const me = await apiClient('/auth/me')
          if (me?.user?.role !== 'superAdmin') {
            localStorage.removeItem('auth_token')
            setError('Access denied: superAdmin account required.')
            return
          }
          navigate({ to: '/' })
        } else {
          setError('Login failed: No access token received')
        }
      } catch (err: any) {
        setError(err.message || 'Login failed')
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Super Admin Login</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your credentials to access the command center.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'Email is required'
                    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                    return isValid ? undefined : 'Invalid email address'
                  },
                }}
              >
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="admin@example.com"
                      className=""
                    />
                    {field.state.meta.errors ? (
                      <p className="text-xs text-red-500">{field.state.meta.errors.join(', ')}</p>
                    ) : null}
                  </>
                )}
              </form.Field>
            </div>
            <div className="space-y-2">
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'Password is required'
                    return value.length >= 8 ? undefined : 'Password must be at least 8 characters'
                  },
                }}
              >
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Password</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className=""
                    />
                    {field.state.meta.errors ? (
                      <p className="text-xs text-red-500">{field.state.meta.errors.join(', ')}</p>
                    ) : null}
                  </>
                )}
              </form.Field>
            </div>
          </CardContent>
          <CardFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isLoading || isSubmitting}
                  className="w-full"
                >
                  {isLoading || isSubmitting ? 'Logging in...' : 'Sign In'}
                </Button>
              )}
            </form.Subscribe>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
