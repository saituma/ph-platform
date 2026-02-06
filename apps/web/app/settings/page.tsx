"use client";

import { useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import { SettingsDialogs, type SettingsDialog } from "../../components/admin/settings/settings-dialogs";
import { OnboardingDialog } from "../../components/admin/settings/onboarding-dialog";

export default function SettingsPage() {
  const hasSettings = true;
  const isLoading = false;
  const [activeDialog, setActiveDialog] = useState<SettingsDialog>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  return (
    <>
      <AdminShell title="Settings" subtitle="Global configuration and access rules.">
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`settings-skeleton-${index}`}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hasSettings ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <SectionHeader
                title="Feature Toggles"
                description="Control feature access by tier."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Video Upload</Label>
                <Select>
                  <option>Premium only</option>
                  <option>Plus & Premium</option>
                  <option>All tiers</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority Messaging</Label>
                <Select>
                  <option>Premium only</option>
                  <option>Plus & Premium</option>
                  <option>All tiers</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parent Platform Access</Label>
                <Select>
                  <option>Plus & Premium</option>
                  <option>Premium only</option>
                  <option>All tiers</option>
                </Select>
              </div>
              <Button onClick={() => setActiveDialog("ui-controls")}>Save Toggles</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <SectionHeader
                title="Onboarding Form Builder"
                description="Simple form builder for mobile onboarding."
              />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                <div>
                  <p className="font-semibold text-foreground">Current Fields</p>
                  <p className="text-xs text-muted-foreground">
                    Athlete Name, Age, Training Days, Injuries, Goals, Parent Email
                  </p>
                </div>
                <Button onClick={() => setOnboardingOpen(true)}>Edit Form</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Notifications"
                description="Email and push templates."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Booking Confirmation</Label>
                <Textarea placeholder="Email template..." />
              </div>
              <div className="space-y-2">
                <Label>Message Notification</Label>
                <Textarea placeholder="Push template..." />
              </div>
              <Button onClick={() => setActiveDialog("ui-controls")}>Save Notifications</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Branding"
                description="Logo and app identity."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="file" />
              <Input placeholder="App name" />
              <Input placeholder="Primary color (hex)" />
              <Button onClick={() => setActiveDialog("ui-controls")}>Save Branding</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Legal & Compliance"
                description="Versioned policies and acceptance logs."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <Select>
                <option>Terms v1</option>
                <option>Terms v2</option>
              </Select>
              <Select>
                <option>Privacy v1</option>
                <option>Privacy v2</option>
              </Select>
              <Button onClick={() => setActiveDialog("legal")}>Save Versions</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Booking Rules"
                description="Capacity, cancellation, fixed windows."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Group call capacity" />
              <Input placeholder="Cancellation window (hrs)" />
              <Select>
                <option>Fixed window 13:00</option>
                <option>Fixed window 14:00</option>
              </Select>
              <Button onClick={() => setActiveDialog("ui-controls")}>Save Rules</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Roles & Permissions"
                description="Admin access control (future)."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Invite admin email" />
              <Select>
                <option>Role</option>
                <option>Owner</option>
                <option>Coach</option>
                <option>Assistant</option>
              </Select>
              <Button onClick={() => setActiveDialog("ui-controls")}>Send Invite</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Legal Links"
                description="Used during onboarding."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Input placeholder="https://terms" />
              </div>
              <div className="space-y-2">
                <Label>Privacy Policy</Label>
                <Input placeholder="https://privacy" />
              </div>
              <Button onClick={() => setActiveDialog("legal")}>Save Legal</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Program Access"
                description="Control tier-specific content."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Parent Platform Access</Label>
                <Select>
                  <option>PHP Plus and Premium</option>
                  <option>All tiers</option>
                  <option>Premium only</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Premium Application Notes</Label>
                <Textarea placeholder="Notes for applicants..." />
              </div>
              <Button onClick={() => setActiveDialog("access")}>Save Rules</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Physio Referrals"
                description="Manage discounts and links."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Referral Link</Label>
                <Input placeholder="https://referral" />
              </div>
              <div className="space-y-2">
                <Label>Discount Tier</Label>
                <Select>
                  <option>PHP Plus</option>
                  <option>PHP Premium</option>
                </Select>
              </div>
              <Input placeholder="Discount (%)" />
              <Button onClick={() => setActiveDialog("referrals")}>Save Referrals</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Support Details"
                description="Help center and support channels."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Support email" />
              <Input placeholder="Help center URL" />
              <Button onClick={() => setActiveDialog("support")}>Save Support</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="UI Controls"
                description="Manage visible tabs and home content."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Home Tab Visibility</Label>
                <Select>
                  <option>Enabled</option>
                  <option>Disabled</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parent Platform Tab</Label>
                <Select>
                  <option>Enabled</option>
                  <option>Move to More</option>
                  <option>Disabled</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Messages</Label>
                <Select>
                  <option>Enabled</option>
                  <option>Premium only</option>
                </Select>
              </div>
              <Button onClick={() => setActiveDialog("ui-controls")}>Save UI</Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="Settings not configured"
          description="Set up legal links, access rules, and support details."
          actionLabel="Start Setup"
        />
      )}
      </AdminShell>

    <SettingsDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    <OnboardingDialog
      open={onboardingOpen}
      onClose={() => setOnboardingOpen(false)}
      onSave={() => setActiveDialog("ui-controls")}
    />
    </>
  );
}
