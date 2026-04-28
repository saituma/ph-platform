"use client";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../components/ui/select";

const timezoneItems = [
  { label: "Timezone", value: "timezone" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "America/Chicago", value: "America/Chicago" },
  { label: "America/Los_Angeles", value: "America/Los_Angeles" },
];

const startWeekItems = [
  { label: "Start week on", value: "start-week-on" },
  { label: "Monday", value: "Monday" },
  { label: "Sunday", value: "Sunday" },
];

const emailNotifItems = [
  { label: "Email notifications", value: "email-notifications" },
  { label: "Enabled", value: "Enabled" },
  { label: "Disabled", value: "Disabled" },
];

const pushNotifItems = [
  { label: "Push notifications", value: "push-notifications" },
  { label: "Enabled", value: "Enabled" },
  { label: "Disabled", value: "Disabled" },
];

const quietHoursItems = [
  { label: "Quiet hours", value: "quiet-hours" },
  { label: "None", value: "None" },
  { label: "20:00 - 07:00", value: "20:00 - 07:00" },
  { label: "22:00 - 06:00", value: "22:00 - 06:00" },
];

const themeItems = [
  { label: "Theme", value: "theme" },
  { label: "System", value: "System" },
  { label: "Light", value: "Light" },
  { label: "Dark", value: "Dark" },
];

const densityItems = [
  { label: "Density", value: "density" },
  { label: "Comfortable", value: "Comfortable" },
  { label: "Compact", value: "Compact" },
];

const showEmailItems = [
  { label: "Show email in UI", value: "show-email" },
  { label: "Enabled", value: "Enabled" },
  { label: "Hidden", value: "Hidden" },
];

const showPhoneItems = [
  { label: "Show phone in UI", value: "show-phone" },
  { label: "Enabled", value: "Enabled" },
  { label: "Hidden", value: "Hidden" },
];

const programTierItems = [
  { label: "Default program tier", value: "default-program-tier" },
  { label: "PHP Program", value: "PHP Program" },
  { label: "PHP Premium Plus", value: "PHP Premium Plus" },
  { label: "PHP Premium", value: "PHP Premium" },
];

const bookingTypeItems = [
  { label: "Default booking type", value: "default-booking-type" },
  { label: "Video", value: "Video" },
  { label: "In-person", value: "In-person" },
];

const languageItems = [
  { label: "Language", value: "language" },
  { label: "English", value: "English" },
  { label: "Spanish", value: "Spanish" },
];

const dateFormatItems = [
  { label: "Date format", value: "date-format" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
];

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
            <Select items={timezoneItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {timezoneItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={startWeekItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {startWeekItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Button>Save General</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Notifications" description="Personal alert preferences." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select items={emailNotifItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {emailNotifItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={pushNotifItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {pushNotifItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={quietHoursItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {quietHoursItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Button>Save Notifications</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Display" description="Theme and density." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select items={themeItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {themeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={densityItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {densityItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Button>Save Display</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Privacy" description="Data visibility." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select items={showEmailItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {showEmailItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={showPhoneItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {showPhoneItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Button>Save Privacy</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Defaults" description="Auto-assign rules." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select items={programTierItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {programTierItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={bookingTypeItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {bookingTypeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Button>Save Defaults</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Language" description="Localization settings." />
          </CardHeader>
          <CardContent className="space-y-3">
            <Select items={languageItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {languageItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={dateFormatItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {dateFormatItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
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
    </AdminShell>
  );
}
