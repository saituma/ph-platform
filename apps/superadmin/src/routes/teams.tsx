import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { SuperadminShell } from '../components/superadmin-shell'
import { getTeams } from '../lib/api'
import { requireAuth } from '../lib/auth'

export const Route = createFileRoute('/teams')({
  beforeLoad: requireAuth,
  component: TeamsPage,
})

function TeamsPage() {
  const teams = useQuery({ queryKey: ['superadmin', 'teams'], queryFn: getTeams })
  return (
    <SuperadminShell title="Teams">
      <Card>
        <CardHeader><CardTitle className="text-sm">Team Directory</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr><th className="p-2">Team</th><th className="p-2">Members</th><th className="p-2">Youth</th><th className="p-2">Adult</th><th className="p-2">Updated</th></tr>
            </thead>
            <tbody>
              {(teams.data || []).map((team) => (
                <tr key={team.id} className="border-b border-border/60">
                  <td className="p-2 font-medium">{team.team}</td>
                  <td className="p-2">{team.memberCount}</td>
                  <td className="p-2">{team.youthCount}</td>
                  <td className="p-2">{team.adultCount}</td>
                  <td className="p-2 text-muted-foreground">{new Date(team.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SuperadminShell>
  )
}
