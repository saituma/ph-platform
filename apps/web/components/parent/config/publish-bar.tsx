import { Button } from "../../ui/button";

type PublishBarProps = {
  isSaving: boolean;
  onPublish: () => void;
};

export function PublishBar({ isSaving, onPublish }: PublishBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">Ready to publish?</p>
        <p className="text-xs text-muted-foreground">Changes apply instantly to the mobile onboarding flow.</p>
      </div>
      <Button onClick={onPublish} disabled={isSaving}>{isSaving ? "Publishing..." : "Publish Changes"}</Button>
    </div>
  );
}
