import * as React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Users, Shield, Activity, CreditCard, LogOut } from 'lucide-react'

export const Route = createFileRoute('/')({
  beforeLoad: ({ location }) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (!token && location.pathname !== '/login') {
        throw redirect({
          to: '/login',
        })
      }
    }
  },
  component: Home,
})

function Home() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => apiClient('/super-admin/stats'),
  })

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="animate-pulse text-xl">Loading command center...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <Card className="border-red-500/20 bg-red-500/10 text-red-500">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{(error as Error).message}</p>
            <Button onClick={handleLogout} className="mt-4 bg-red-600 text-white hover:bg-red-700">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Sidebar / Header Placeholder */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-zinc-50 p-1">
            <Shield className="h-full w-full text-zinc-950" />
          </div>
          <span className="text-xl font-bold tracking-tight">SUPERADMIN</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-zinc-50">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>

      <main className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Activity className="h-4 w-4 text-green-500" />
            System Live
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats?.users || 0}
            icon={<Users className="h-5 w-5" />}
            description="Active accounts in system"
          />
          <StatCard
            title="Total Athletes"
            value={stats?.athletes || 0}
            icon={<Activity className="h-5 w-5" />}
            description="Registered athletes"
          />
          <StatCard
            title="Active Teams"
            value={stats?.teams || 0}
            icon={<Shield className="h-5 w-5" />}
            description="Active professional teams"
          />
          <StatCard
            title="Subscriptions"
            value={stats?.activeSubscriptions || 0}
            icon={<CreditCard className="h-5 w-5" />}
            description="Approved billing requests"
          />
        </div>

        {/* Audit Logs or User Management list could go here */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Command Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
             <Button variant="outline" className="h-24 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900">
                Manage Admins
             </Button>
             <Button variant="outline" className="h-24 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900">
                View Audit Logs
             </Button>
             <Button variant="outline" className="h-24 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900">
                System Settings
             </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value, icon, description }: { title: string, value: number, icon: React.ReactNode, description: string }) {
  return (
    <Card className="border-zinc-800 bg-zinc-900 text-zinc-50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        <div className="text-zinc-500">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-zinc-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}
