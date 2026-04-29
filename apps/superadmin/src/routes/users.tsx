import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, UserCheck, UserX } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { SuperadminShell } from '../components/superadmin-shell'
import { deleteUser, getLocations, getUsers, setUserBlocked, setUserRole, type AppUser } from '../lib/api'
import { requireAuth } from '../lib/auth'

export const Route = createFileRoute('/users')({
  beforeLoad: requireAuth,
  component: UsersPage,
})

function UsersPage() {
  const [q, setQ] = useState('')
  const queryClient = useQueryClient()
  const users = useQuery({ queryKey: ['superadmin', 'users', q], queryFn: () => getUsers(200, q) })
  const locations = useQuery({ queryKey: ['superadmin', 'locations'], queryFn: () => getLocations(14) })
  const byUser = useMemo(() => new Map((locations.data || []).map((l) => [l.userId, l])), [locations.data])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['superadmin'] })
  const roleMutation = useMutation({ mutationFn: ({ userId, role }: { userId: number; role: string }) => setUserRole(userId, role), onSuccess: refresh })
  const blockMutation = useMutation({ mutationFn: ({ userId, blocked }: { userId: number; blocked: boolean }) => setUserBlocked(userId, blocked), onSuccess: refresh })
  const deleteMutation = useMutation({ mutationFn: (userId: number) => deleteUser(userId), onSuccess: refresh })
  const busy = roleMutation.isPending || blockMutation.isPending || deleteMutation.isPending

  return (
    <SuperadminShell title="Users">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">All Users</CardTitle>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="h-8 w-56 text-xs" />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="p-2">User</th><th className="p-2">Role</th><th className="p-2">Team</th><th className="p-2">Location</th><th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users.data || []).map((user) => (
                <tr key={user.id} className="border-b border-border/60">
                  <td className="p-2"><div className="font-medium">{user.name || user.email}</div><div className="text-muted-foreground">{user.email}</div></td>
                  <td className="p-2">{user.role}</td>
                  <td className="p-2">{user.athleteTeam || '—'}</td>
                  <td className="p-2 text-muted-foreground">{byUser.get(user.id) ? `${byUser.get(user.id)!.latitude.toFixed(3)}, ${byUser.get(user.id)!.longitude.toFixed(3)}` : 'No signal'}</td>
                  <td className="p-2"><UserActions user={user} busy={busy} onPromote={() => roleMutation.mutate({ userId: user.id, role: 'admin' })} onDemote={() => roleMutation.mutate({ userId: user.id, role: 'guardian' })} onBlock={(b) => blockMutation.mutate({ userId: user.id, blocked: b })} onDelete={() => deleteMutation.mutate(user.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SuperadminShell>
  )
}

function UserActions({ user, busy, onPromote, onDemote, onBlock, onDelete }: { user: AppUser; busy: boolean; onPromote: () => void; onDemote: () => void; onBlock: (blocked: boolean) => void; onDelete: () => void }) {
  return <div className="flex flex-wrap gap-1.5">
    {user.role === 'admin' ? <Button size="xs" variant="outline" disabled={busy} onClick={onDemote}>Demote</Button> : <Button size="xs" variant="outline" disabled={busy} onClick={onPromote}>Promote</Button>}
    <Button size="xs" variant="outline" disabled={busy} onClick={() => onBlock(!Boolean(user.isBlocked))}>{user.isBlocked ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}{user.isBlocked ? 'Unblock' : 'Block'}</Button>
    <Button size="xs" variant="destructive" disabled={busy} onClick={onDelete}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
  </div>
}
