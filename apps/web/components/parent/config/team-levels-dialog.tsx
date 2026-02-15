import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { cn } from "../../../lib/utils";
import { FieldConfig } from "./types";

type TeamLevelsDialogProps = {
  open: boolean;
  fields: FieldConfig[];
  selectedTeam: string | null;
  editLevelOption: string | null;
  newLevelOption: string;
  onOpenChange: (open: boolean) => void;
  onSetSelectedTeam: (team: string | null) => void;
  onSetEditLevelOption: (value: string | null) => void;
  onSetNewLevelOption: (value: string) => void;
  onUpdateFields: (updater: (prev: FieldConfig[]) => FieldConfig[]) => void;
};

export function TeamLevelsDialog({
  open,
  fields,
  selectedTeam,
  editLevelOption,
  newLevelOption,
  onOpenChange,
  onSetSelectedTeam,
  onSetEditLevelOption,
  onSetNewLevelOption,
  onUpdateFields,
}: TeamLevelsDialogProps) {
  const teams = fields.find((item) => item.id === "team")?.options ?? [];
  const levels = fields.find((item) => item.id === "level")?.optionsByTeam?.[selectedTeam ?? ""] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Team Levels</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Teams</p>
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={`team-select-${team}`}
                  type="button"
                  onClick={() => {
                    onSetSelectedTeam(team);
                    onSetEditLevelOption(null);
                    onSetNewLevelOption("");
                  }}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm",
                    selectedTeam === team
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  {team}
                </button>
              ))}
              {!teams.length ? (
                <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Add teams first to configure levels.
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/40 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">{selectedTeam ? `${selectedTeam} Levels` : "Select a team"}</p>
              {selectedTeam ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {levels.map((level) => (
                      <div
                        key={`level-${selectedTeam}-${level}`}
                        className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSetEditLevelOption(level);
                            onSetNewLevelOption(level);
                          }}
                          className="text-xs text-foreground"
                        >
                          {level}
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground"
                          onClick={() => {
                            onUpdateFields((prev) =>
                              prev.map((item) => {
                                if (item.id !== "level") return item;
                                const current = item.optionsByTeam ?? {};
                                const updated = (current[selectedTeam] ?? []).filter((value) => value !== level);
                                return { ...item, optionsByTeam: { ...current, [selectedTeam]: updated } };
                              })
                            );
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Add level"
                      value={newLevelOption}
                      onChange={(event) => onSetNewLevelOption(event.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!selectedTeam || !newLevelOption.trim()) return;
                        const next = newLevelOption.trim();
                        onUpdateFields((prev) =>
                          prev.map((item) => {
                            if (item.id !== "level") return item;
                            const current = item.optionsByTeam ?? {};
                            const existing = current[selectedTeam] ?? [];
                            const updated = editLevelOption
                              ? existing.map((value) => (value === editLevelOption ? next : value))
                              : existing.includes(next)
                              ? existing
                              : [...existing, next];
                            return { ...item, optionsByTeam: { ...current, [selectedTeam]: updated } };
                          })
                        );
                        onSetEditLevelOption(null);
                        onSetNewLevelOption("");
                      }}
                    >
                      {editLevelOption ? "Update Level" : "Add Level"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Pick a team on the left to manage its levels.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Levels are shown in the mobile app after the parent selects a team.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
