import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Activity, Globe, LogOut, Settings2, Shield, Users, Wrench } from 'lucide-react'
import { Button } from './ui/button'
import { logout } from '../lib/auth'

const nav = [
  { to: '/overview', label: 'Overview', icon: Activity },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/locations', label: 'Locations', icon: Globe },
  { to: '/teams', label: 'Teams', icon: Shield },
  { to: '/audit', label: 'Audit', icon: Settings2 },
  { to: '/controls', label: 'Controls', icon: Wrench },
] as const

export function SuperadminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="border-r border-border bg-background p-2.5">
          <div className="mb-2 flex h-9 items-center px-2 text-[11px] font-semibold tracking-wide text-zinc-400">
            PH SUPERADMIN
          </div>
          <nav className="space-y-0.5">
            {nav.map((item) => {
              const active = pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex h-8 items-center gap-2 rounded-md border px-2 text-[13px] ${
                    active
                      ? 'border-border bg-card text-foreground'
                      : 'border-transparent text-zinc-400 hover:border-border hover:bg-card hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <div>
          <header className="sticky top-0 z-10 flex h-11 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
            <h1 className="text-sm font-medium">{title}</h1>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
          <main className="mx-auto w-full max-w-[1280px] p-4">{children}</main>
        </div>
      </div>
    </div>
  )
}
