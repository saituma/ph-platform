import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { FieldConfig } from "./types";

type TeamLevelFieldRowProps = {
  teamField: FieldConfig;
  levelField?: FieldConfig;
  newTeamOption: string;
  editTeamOption: string | null;
  selectedTeam: string | null;
  onNewTeamOptionChange: (value: string) => void;
  onSetEditTeamOption: (value: string | null) => void;
  onSetSelectedTeam: (value: string | null) => void;
  onUpdateFields: (updater: (prev: FieldConfig[]) => FieldConfig[]) => void;
  onOpenTeamModal: () => void;
};

export function TeamLevelFieldRow({
  teamField,
  levelField,
  newTeamOption,
  editTeamOption,
  selectedTeam,
  onNewTeamOptionChange,
  onSetEditTeamOption,
  onSetSelectedTeam,
  onUpdateFields,
  onOpenTeamModal,
}: TeamLevelFieldRowProps) {
  const teamOptions = teamField.options ?? [];

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-2 font-medium text-foreground">Team</p>
          <div className="flex flex-wrap gap-2">
            {teamOptions.map((option) => (
              <div
                key={`team-${option}`}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
              >
                <button
                  type="button"
                  className="text-xs text-foreground"
                  onClick={() => {
                    onSetEditTeamOption(option);
                    onNewTeamOptionChange(option);
                  }}
                >
                  {option}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground"
                  onClick={() => {
                    onUpdateFields((prev) =>
                      prev.map((item) => {
                        if (item.id === "team") {
                          return {
                            ...item,
                            options: (item.options ?? []).filter((value) => value !== option),
                          };
                        }
                        if (item.id === "level") {
                          const current = item.optionsByTeam ?? {};
                          const rest = { ...current };
                          delete rest[option];
                          return { ...item, optionsByTeam: rest };
                        }
                        return item;
                      })
                    );
                    if (selectedTeam === option) {
                      onSetSelectedTeam(teamOptions.filter((team) => team !== option)[0] ?? null);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Add team"
              value={newTeamOption}
              onChange={(event) => onNewTeamOptionChange(event.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!newTeamOption.trim()) return;
                const next = newTeamOption.trim();
                onUpdateFields((prev) =>
                  prev.map((item) => {
                    if (item.id === "team") {
                      const updatedOptions = editTeamOption
                        ? (item.options ?? []).map((value) => (value === editTeamOption ? next : value))
                        : item.options
                        ? [...item.options, next]
                        : [next];
                      return { ...item, options: updatedOptions };
                    }
                    if (item.id === "level") {
                      const current = item.optionsByTeam ?? {};
                      if (editTeamOption) {
                        const levels = current[editTeamOption] ?? [];
                        const rest = { ...current };
                        delete rest[editTeamOption];
                        return { ...item, optionsByTeam: { ...rest, [next]: levels } };
                      }
                      if (current[next]) return item;
                      return { ...item, optionsByTeam: { ...current, [next]: [] } };
                    }
                    return item;
                  })
                );
                onSetEditTeamOption(null);
                onNewTeamOptionChange("");
              }}
            >
              {editTeamOption ? "Update Team" : "Add Team"}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 font-medium text-foreground">Levels</p>
          <div className="rounded-2xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            {teamOptions.length
              ? `Configured for ${Object.keys(levelField?.optionsByTeam ?? {}).length} teams.`
              : "Add a team to start setting levels."}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenTeamModal}
              disabled={!teamOptions.length}
            >
              Manage Levels
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-foreground">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={teamField.visible}
            onChange={() => {
              onUpdateFields((prev) =>
                prev.map((item) => (item.id === "team" ? { ...item, visible: !item.visible } : item))
              );
            }}
            className="h-4 w-4 accent-primary"
          />
          Show team
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={teamField.required}
            onChange={() => {
              onUpdateFields((prev) =>
                prev.map((item) => (item.id === "team" ? { ...item, required: !item.required } : item))
              );
            }}
            className="h-4 w-4 accent-primary"
          />
          Required
        </label>
        {levelField ? (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={levelField.visible}
                onChange={() => {
                  onUpdateFields((prev) =>
                    prev.map((item) => (item.id === "level" ? { ...item, visible: !item.visible } : item))
                  );
                }}
                className="h-4 w-4 accent-primary"
              />
              Show level
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={levelField.required}
                onChange={() => {
                  onUpdateFields((prev) =>
                    prev.map((item) => (item.id === "level" ? { ...item, required: !item.required } : item))
                  );
                }}
                className="h-4 w-4 accent-primary"
              />
              Level required
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}
