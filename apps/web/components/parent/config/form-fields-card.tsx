import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { FieldConfig, FieldType } from "./types";
import { FieldRow } from "./field-row";
import { TeamLevelFieldRow } from "./team-level-field-row";

type FormFieldsCardProps = {
  fields: FieldConfig[];
  newFieldLabel: string;
  newFieldType: FieldType;
  newFieldRequired: boolean;
  newFieldOption: string;
  newTeamOption: string;
  editTeamOption: string | null;
  selectedTeam: string | null;
  onSetNewFieldLabel: (value: string) => void;
  onSetNewFieldType: (value: FieldType) => void;
  onSetNewFieldRequired: (value: boolean) => void;
  onSetNewFieldOption: (value: string) => void;
  onSetNewTeamOption: (value: string) => void;
  onSetEditTeamOption: (value: string | null) => void;
  onSetSelectedTeam: (value: string | null) => void;
  onUpdateFields: (updater: (prev: FieldConfig[]) => FieldConfig[]) => void;
  onHandleAddField: () => void;
  onHandleAddTeamLevel: () => void;
  onOpenTeamModal: () => void;
};

export function FormFieldsCard(props: FormFieldsCardProps) {
  const {
    fields,
    newFieldLabel,
    newFieldType,
    newFieldRequired,
    newFieldOption,
    newTeamOption,
    editTeamOption,
    selectedTeam,
    onSetNewFieldLabel,
    onSetNewFieldType,
    onSetNewFieldRequired,
    onSetNewFieldOption,
    onSetNewTeamOption,
    onSetEditTeamOption,
    onSetSelectedTeam,
    onUpdateFields,
    onHandleAddField,
    onHandleAddTeamLevel,
    onOpenTeamModal,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Fields</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {fields.map((field) => {
          if (field.id === "level") return null;
          if (field.id === "team") {
            return (
              <TeamLevelFieldRow
                key={field.id}
                teamField={field}
                levelField={fields.find((item) => item.id === "level")}
                newTeamOption={newTeamOption}
                editTeamOption={editTeamOption}
                selectedTeam={selectedTeam}
                onNewTeamOptionChange={onSetNewTeamOption}
                onSetEditTeamOption={onSetEditTeamOption}
                onSetSelectedTeam={onSetSelectedTeam}
                onUpdateFields={onUpdateFields}
                onOpenTeamModal={onOpenTeamModal}
              />
            );
          }
          return (
            <FieldRow
              key={field.id}
              field={field}
              fields={fields}
              newFieldOption={newFieldOption}
              onNewFieldOptionChange={onSetNewFieldOption}
              onUpdateField={(fieldId, updates) => {
                onUpdateFields((prev) =>
                  prev.map((item) => (item.id === fieldId ? { ...item, ...updates } : item))
                );
              }}
              onAddDropdownOption={(fieldId) => {
                if (!newFieldOption.trim()) return;
                const next = newFieldOption.trim();
                if (fieldId === "level" && !fields.find((item) => item.id === "team")?.options?.length) {
                  return;
                }
                onUpdateFields((prev) =>
                  prev.map((item) =>
                    item.id === fieldId
                      ? { ...item, options: item.options ? [...item.options, next] : [next] }
                      : item
                  )
                );
                onSetNewFieldOption("");
              }}
              onRemoveDropdownOption={(fieldId, option) => {
                onUpdateFields((prev) =>
                  prev.map((item) =>
                    item.id === fieldId
                      ? { ...item, options: (item.options ?? []).filter((value) => value !== option) }
                      : item
                  )
                );
              }}
              onRemoveField={(fieldId) => {
                onUpdateFields((prev) => prev.filter((item) => item.id !== fieldId));
              }}
            />
          );
        })}

        <div className="rounded-2xl border border-dashed border-border p-4">
          <p className="mb-3 font-medium text-foreground">Add Field</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Field label"
              value={newFieldLabel}
              onChange={(event) => onSetNewFieldLabel(event.target.value)}
            />
            <Select value={newFieldType} onChange={(event) => onSetNewFieldType(event.target.value as FieldType)}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="dropdown">Dropdown</option>
              <option value="date">Date</option>
            </Select>
          </div>
          {newFieldType === "dropdown" ? (
            <Input
              className="mt-3"
              placeholder="Add dropdown option"
              value={newFieldOption}
              onChange={(event) => onSetNewFieldOption(event.target.value)}
            />
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                id="new-field-required"
                type="checkbox"
                checked={newFieldRequired}
                onChange={() => onSetNewFieldRequired(!newFieldRequired)}
                className="h-4 w-4 accent-primary"
              />
              Required
            </label>
            <Button variant="outline" onClick={onHandleAddField}>
              Add Field
            </Button>
            <Button variant="outline" onClick={onHandleAddTeamLevel}>
              Add Team + Level
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
