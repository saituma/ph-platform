import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";

type SettingsCardProps = {
  defaultProgramTier: string;
  approvalWorkflow: string;
  notes: string;
  onSetDefaultProgramTier: (value: string) => void;
  onSetApprovalWorkflow: (value: string) => void;
  onSetNotes: (value: string) => void;
};

export function SettingsCard({
  defaultProgramTier,
  approvalWorkflow,
  notes,
  onSetDefaultProgramTier,
  onSetApprovalWorkflow,
  onSetNotes,
}: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
        <div>
          <p className="mb-2 font-medium text-foreground">Default Program Tier</p>
          <Select value={defaultProgramTier} onChange={(event) => onSetDefaultProgramTier(event.target.value)}>
            <option value="PHP">PHP</option>
            <option value="PHP_Plus">PHP Plus</option>
            <option value="PHP_Premium">PHP Premium</option>
          </Select>
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground">Approval Workflow</p>
          <Select value={approvalWorkflow} onChange={(event) => onSetApprovalWorkflow(event.target.value)}>
            <option value="manual">Manual review by coach</option>
            <option value="auto">Auto-approve standard entries</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 font-medium text-foreground">Internal Notes</p>
          <Textarea placeholder="Notes for your coaching team." value={notes} onChange={(event) => onSetNotes(event.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
