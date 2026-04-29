import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { SuperadminShell } from '../components/superadmin-shell'
import { getSuperAdminAuditLogs } from '../lib/api'
import { requireAuth } from '../lib/auth'

export const Route = createFileRoute('/audit')({
  beforeLoad: requireAuth,
  component: AuditPage,
})

function AuditPage() {
  const audit = useQuery({ queryKey: ['superadmin', 'audit-logs'], queryFn: getSuperAdminAuditLogs })
  return (
    <SuperadminShell title="Audit">
      <Card>
        <CardHeader><CardTitle className="text-sm">Audit Stream</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr><th className="p-2">Time</th><th className="p-2">Action</th><th className="p-2">Actor</th><th className="p-2">Target</th></tr>
            </thead>
            <tbody>
              {(audit.data || []).map((log) => (
                <tr key={log.id} className="border-b border-border/60">
                  <td className="p-2 text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-2 font-mono">{log.action}</td>
                  <td className="p-2">{log.performerName || log.performerEmail || 'Unknown'}</td>
                  <td className="p-2 text-muted-foreground">{log.targetTable || '—'}{log.targetId ? ` #${log.targetId}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SuperadminShell>
  )
}
