import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../ui/select";
import { Textarea } from "../../ui/textarea";

const APPROVAL_WORKFLOW_ITEMS = [
  { label: "Manual review by coach", value: "manual" },
  { label: "Auto-approve standard entries", value: "auto" },
];

const DEFAULT_TIER_ITEMS = [{ label: "PHP", value: "PHP" }];

type SettingsCardProps = {
  approvalWorkflow: string;
  notes: string;
  termsVersion: string;
  privacyVersion: string;
  onSetApprovalWorkflow: (value: string) => void;
  onSetNotes: (value: string) => void;
  onSetTermsVersion: (value: string) => void;
  onSetPrivacyVersion: (value: string) => void;
};

export function SettingsCard({
  approvalWorkflow,
  notes,
  termsVersion,
  privacyVersion,
  onSetApprovalWorkflow,
  onSetNotes,
  onSetTermsVersion,
  onSetPrivacyVersion,
}: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
        <div>
          <p className="mb-2 font-medium text-foreground">Default Program Tier</p>
          <Select items={DEFAULT_TIER_ITEMS} value="PHP" disabled>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectPopup>
              {DEFAULT_TIER_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground">Approval Workflow</p>
          <Select items={APPROVAL_WORKFLOW_ITEMS} value={approvalWorkflow} onValueChange={(v) => onSetApprovalWorkflow(v ?? "")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectPopup>
              {APPROVAL_WORKFLOW_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground">Terms Version</p>
          <Input
            placeholder="1.0"
            value={termsVersion}
            onChange={(event) => onSetTermsVersion(event.target.value)}
          />
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground">Privacy Version</p>
          <Input
            placeholder="1.0"
            value={privacyVersion}
            onChange={(event) => onSetPrivacyVersion(event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 font-medium text-foreground">Internal Notes</p>
          <Textarea placeholder="Notes for your coaching team." value={notes} onChange={(event) => onSetNotes(event.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
