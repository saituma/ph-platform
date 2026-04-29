import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { SuperadminShell } from '../components/superadmin-shell'
import { getLocations, trackSuperAdminEvent } from '../lib/api'
import { requireAuth } from '../lib/auth'

export const Route = createFileRoute('/locations')({
  beforeLoad: requireAuth,
  component: LocationsPage,
})

function LocationsPage() {
  const locations = useQuery({ queryKey: ['superadmin', 'locations'], queryFn: () => getLocations(365) })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const didTrackView = useRef(false)
  const rows = locations.data || []
  const selected = useMemo(() => {
    if (!rows.length) return null
    if (selectedId == null) return rows[0]
    return rows.find((r) => r.id === selectedId) || rows[0]
  }, [rows, selectedId])

  const mapSrc = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.longitude - 0.02}%2C${selected.latitude - 0.02}%2C${selected.longitude + 0.02}%2C${selected.latitude + 0.02}&layer=mapnik&marker=${selected.latitude}%2C${selected.longitude}`
    : null
  const apiSource = (import.meta.env.VITE_SERVER_URL as string | undefined) || 'http://localhost:3001/api'

  useEffect(() => {
    if (didTrackView.current) return
    didTrackView.current = true
    void trackSuperAdminEvent('locations_page_view', '/locations')
  }, [])

  return (
    <SuperadminShell title="Locations">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="rounded-md border border-border bg-card p-2">
              <div className="text-muted-foreground">Superadmin API source</div>
              <div className="mt-1 font-mono break-all">{apiSource}</div>
            </div>
            <div className="rounded-md border border-border bg-card p-2 text-muted-foreground">
              If your users are on <span className="font-mono">https://ph-platform-onboarding.vercel.app</span>, that app must send
              location events to this same backend (`POST /api/location`). If not, this tab will remain empty.
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">OSM Map</CardTitle>
          </CardHeader>
          <CardContent>
            {!mapSrc ? (
              <div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
                No location points yet. Mobile app users must grant location permission and send telemetry first.
              </div>
            ) : (
              <iframe
                title="OSM user location"
                src={mapSrc}
                className="h-[420px] w-full rounded-md border border-border"
                loading="lazy"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">User Location Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!rows.length ? (
              <div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
                No stored rows in the last 365 days.
              </div>
            ) : (
              rows.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(loc.id)
                    void trackSuperAdminEvent('locations_marker_select', '/locations', loc.userId)
                  }}
                  className={`block w-full rounded-md border p-2 text-left text-xs ${
                    selected?.id === loc.id ? 'border-zinc-400 bg-zinc-900' : 'border-border bg-card'
                  }`}
                >
                  <div className="font-medium">{loc.name || loc.email || `User #${loc.userId}`}</div>
                  <div className="mt-1 text-muted-foreground">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </div>
                  <div className="mt-1 text-muted-foreground">{new Date(loc.createdAt).toLocaleString()}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </SuperadminShell>
  )
}
