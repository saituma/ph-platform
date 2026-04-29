import { Link, createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { SuperadminShell } from '../components/superadmin-shell'
import { requireAuth } from '../lib/auth'

export const Route = createFileRoute('/controls')({
  beforeLoad: requireAuth,
  component: ControlsPage,
})

function ControlsPage() {
  const tools = [
    { title: 'Users', subtitle: 'Role and account lifecycle', to: '/users' as const },
    { title: 'Teams', subtitle: 'Team operations', to: '/teams' as const },
    { title: 'Locations', subtitle: 'User telemetry feed', to: '/locations' as const },
    { title: 'Audit', subtitle: 'Security event stream', to: '/audit' as const },
    { title: 'Overview', subtitle: 'KPI and platform health', to: '/overview' as const },
  ]

  return (
    <SuperadminShell title="Controls">
      <Card>
        <CardHeader><CardTitle className="text-sm">Tools</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.title} to={tool.to} className="rounded-md border border-border bg-card p-3 hover:bg-accent">
              <div className="text-sm font-medium">{tool.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{tool.subtitle}</div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </SuperadminShell>
  )
}
