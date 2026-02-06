"use client";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

export default function ProfilePage() {
  return (
    <AdminShell
      title="Profile"
      subtitle="Account details and preferences."
      actions={<Button>Edit Profile</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <SectionHeader title="Coach Profile" description="Public coach details." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name" defaultValue="Coach" />
            <Input placeholder="Email" defaultValue="coach@liftlab.com" />
            <Textarea placeholder="Bio" defaultValue="Youth football performance coach." />
            <Button>Save Profile</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionHeader title="Preferences" description="Admin preferences." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Timezone" defaultValue="America/New_York" />
            <Input placeholder="Default view" defaultValue="Dashboard" />
            <Button>Save Preferences</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionHeader title="Security" description="Update password and security." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="password" placeholder="Current password" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="password" placeholder="New password" />
              <Input type="password" placeholder="Confirm new password" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
