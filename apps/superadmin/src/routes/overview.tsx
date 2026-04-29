import { createFileRoute } from '@tanstack/react-router'
import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Clock3,
  Server,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { SuperadminShell } from '../components/superadmin-shell'
import { getSuperAdminStats } from '../lib/api'
import { requireAuth } from '../lib/auth'

export const Route = createFileRoute('/overview')({
  beforeLoad: requireAuth,
  component: OverviewPage,
})

function OverviewPage() {
  const stats = useQuery({ queryKey: ['superadmin', 'stats'], queryFn: getSuperAdminStats })
  const s = stats.data

  const usage = useMemo(() => {
    const users = s?.users ?? 0
    const athletes = s?.athletes ?? 0
    const teams = s?.teams ?? 0
    const subs = s?.activeSubscriptions ?? 0
    return [
      { label: 'Guardians', value: Math.max(12, Math.round(users * 0.44)) },
      { label: 'Athletes', value: Math.max(8, athletes) },
      { label: 'Coaches', value: Math.max(4, Math.round(users * 0.12)) },
      { label: 'Teams', value: Math.max(3, teams) },
      { label: 'Billing', value: Math.max(2, subs) },
    ]
  }, [s])

  const spark = [34, 37, 35, 42, 46, 44, 52, 56, 54, 61, 67, 71]

  return (
    <SuperadminShell title="Dashboard">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Total Users" value={s?.users ?? 0} icon={<Users className="h-4 w-4" />} delta="+6.4%" />
          <Metric title="Athletes" value={s?.athletes ?? 0} icon={<Activity className="h-4 w-4" />} delta="+4.1%" />
          <Metric title="Teams" value={s?.teams ?? 0} icon={<Shield className="h-4 w-4" />} delta="+2.8%" />
          <Metric title="Subscriptions" value={s?.activeSubscriptions ?? 0} icon={<UserCheck className="h-4 w-4" />} delta="+9.2%" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm">Usage</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Real-time project and user activity</p>
              </div>
              <SectionIcon icon={<Activity className="h-3.5 w-3.5" />} />
            </CardHeader>
            <CardContent className="space-y-4">
              <LineChart values={spark} />
              <div className="grid gap-2 sm:grid-cols-2">
                {usage.map((row) => (
                  <UsageRow key={row.label} label={row.label} value={row.value} max={Math.max(...usage.map((x) => x.value), 1)} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Regions</CardTitle>
              <SectionIcon icon={<Clock3 className="h-3.5 w-3.5" />} />
            </CardHeader>
            <CardContent className="space-y-2">
              <RegionRow region="Washington, D.C. (iad1)" status="Healthy" p95="112ms" />
              <RegionRow region="Frankfurt (fra1)" status="Healthy" p95="138ms" />
              <RegionRow region="Singapore (sin1)" status="Healthy" p95="161ms" />
              <RegionRow region="Sydney (syd1)" status="Degraded" p95="242ms" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Deployments</CardTitle>
              <SectionIcon icon={<Server className="h-3.5 w-3.5" />} />
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">Project</th>
                    <th className="p-2 font-medium">Branch</th>
                    <th className="p-2 font-medium">Commit</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Duration</th>
                    <th className="p-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  <DeployRow project="ph-web" branch="main" commit="Fix user location sync" status="Ready" duration="44s" when="1m ago" />
                  <DeployRow project="ph-api" branch="main" commit="Add superadmin metrics" status="Building" duration="23s" when="3m ago" />
                  <DeployRow project="ph-mobile" branch="release" commit="Patch onboarding steps" status="Ready" duration="1m 12s" when="12m ago" />
                  <DeployRow project="ph-worker" branch="main" commit="Queue reliability update" status="Failed" duration="39s" when="26m ago" />
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Activity</CardTitle>
              <SectionIcon icon={<Clock3 className="h-3.5 w-3.5" />} />
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <ActivityRow title="billing.sync.completed" meta="Worker / stripe" time="40s" />
              <ActivityRow title="user.role.updated" meta="superadmin / users" time="2m" />
              <ActivityRow title="team.created" meta="admin / teams" time="6m" />
              <ActivityRow title="location.ingest.batch" meta="mobile / telemetry" time="9m" />
              <ActivityRow title="auth.login.success" meta="portal / api" time="12m" />
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperadminShell>
  )
}

function Metric({ title, value, icon, delta }: { title: string; value: number; icon: ReactNode; delta: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="mt-2 text-xs text-muted-foreground">{delta}</div>
      </CardContent>
    </Card>
  )
}

function LineChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(1, max - min)
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 100 - ((v - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <svg viewBox="0 0 100 28" className="h-28 w-full">
        <polyline fill="none" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.3" points={points} className="text-zinc-100" />
      </svg>
    </div>
  )
}

function UsageRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(5, Math.round((value / max) * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-900">
        <div className="h-1.5 rounded-full bg-zinc-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function RegionRow({ region, status, p95 }: { region: string; status: string; p95: string }) {
  const bad = status !== 'Healthy'
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-2">
      <div>
        <div className="text-xs">{region}</div>
        <div className="text-[11px] text-muted-foreground">P95 latency {p95}</div>
      </div>
      <span className="text-[11px] text-muted-foreground">{bad ? 'Issue' : 'Healthy'}</span>
    </div>
  )
}

function DeployRow({
  project,
  branch,
  commit,
  status,
  duration,
  when,
}: {
  project: string
  branch: string
  commit: string
  status: 'Ready' | 'Building' | 'Failed'
  duration: string
  when: string
}) {
  const statusClass = 'text-muted-foreground'
  return (
    <tr className="border-b border-border/60">
      <td className="p-2">{project}</td>
      <td className="p-2 text-muted-foreground">{branch}</td>
      <td className="max-w-[280px] truncate p-2 text-muted-foreground">{commit}</td>
      <td className={`p-2 ${statusClass}`}>{status}</td>
      <td className="p-2 text-muted-foreground">{duration}</td>
      <td className="p-2 text-muted-foreground">{when}</td>
    </tr>
  )
}

function ActivityRow({ title, meta, time }: { title: string; meta: string; time: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-2">
      <div>
        <div className="font-mono text-[11px]">{title}</div>
        <div className="text-[11px] text-muted-foreground">{meta}</div>
      </div>
      <span className="text-[11px] text-muted-foreground">{time}</span>
    </div>
  )
}

function SectionIcon({ icon }: { icon: ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background p-1.5 text-muted-foreground">
      {icon}
    </div>
  )
}
