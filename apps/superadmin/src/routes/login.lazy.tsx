import * as React from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
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
    validatorAdapter: zodValidator(),
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
          // Redirect to home
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-50">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Super Admin Login</CardTitle>
          <CardDescription className="text-zinc-400">
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
                  onChange: z.string().email('Invalid email address'),
                }}
              >
                {(field) => (
                  <>
                    <Label htmlFor={field.name} className="text-zinc-300">Email</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="admin@example.com"
                      className="border-zinc-800 bg-zinc-950 text-zinc-50 focus-visible:ring-zinc-700"
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
                  onChange: z.string().min(8, 'Password must be at least 8 characters'),
                }}
              >
                {(field) => (
                  <>
                    <Label htmlFor={field.name} className="text-zinc-300">Password</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-50 focus-visible:ring-zinc-700"
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
                  className="w-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
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
