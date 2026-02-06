"use client";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";

export default function PreferencesPage() {
  return (
    <AdminShell
      title="Preferences"
      subtitle="Personal admin preferences."
      actions={<Button>Save All</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionHeader title="General" description="Default views and locale." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Default view" defaultValue="Dashboard" />
            <Select>
              <option>Timezone</option>
              <option>America/New_York</option>
              <option>America/Chicago</option>
              <option>America/Los_Angeles</option>
            </Select>
            <Select>
              <option>Start week on</option>
              <option>Monday</option>
              <option>Sunday</option>
            </Select>
            <Button>Save General</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Notifications" description="Personal alert preferences." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select>
              <option>Email notifications</option>
              <option>Enabled</option>
              <option>Disabled</option>
            </Select>
            <Select>
              <option>Push notifications</option>
              <option>Enabled</option>
              <option>Disabled</option>
            </Select>
            <Select>
              <option>Quiet hours</option>
              <option>None</option>
              <option>20:00 - 07:00</option>
              <option>22:00 - 06:00</option>
            </Select>
            <Button>Save Notifications</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Display" description="Theme and density." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select>
              <option>Theme</option>
              <option>System</option>
              <option>Light</option>
              <option>Dark</option>
            </Select>
            <Select>
              <option>Density</option>
              <option>Comfortable</option>
              <option>Compact</option>
            </Select>
            <Button>Save Display</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Privacy" description="Data visibility." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select>
              <option>Show email in UI</option>
              <option>Enabled</option>
              <option>Hidden</option>
            </Select>
            <Select>
              <option>Show phone in UI</option>
              <option>Enabled</option>
              <option>Hidden</option>
            </Select>
            <Button>Save Privacy</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Defaults" description="Auto-assign rules." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select>
              <option>Default program tier</option>
              <option>PHP Program</option>
              <option>PHP Plus</option>
              <option>PHP Premium</option>
            </Select>
            <Select>
              <option>Default booking type</option>
              <option>Video</option>
              <option>In-person</option>
            </Select>
            <Button>Save Defaults</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Language" description="Localization settings." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select>
              <option>Language</option>
              <option>English</option>
              <option>Spanish</option>
            </Select>
            <Select>
              <option>Date format</option>
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
            </Select>
            <Button>Save Language</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionHeader title="Shortcuts" description="Keyboard shortcuts." />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              Press <strong>K</strong> to open quick actions.
            </div>
            <Button>Save Shortcuts</Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 text-center text-xs text-muted-foreground">
        Made with care for Lift Lab. Powered by Client Reach AI.
      </div>
    </AdminShell>
  );
}
