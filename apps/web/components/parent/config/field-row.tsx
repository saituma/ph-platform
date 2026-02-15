import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { FieldConfig, FieldType } from "./types";

type FieldRowProps = {
  field: FieldConfig;
  fields: FieldConfig[];
  newFieldOption: string;
  onNewFieldOptionChange: (value: string) => void;
  onUpdateField: (fieldId: string, updates: Partial<FieldConfig>) => void;
  onAddDropdownOption: (fieldId: string) => void;
  onRemoveDropdownOption: (fieldId: string, option: string) => void;
  onRemoveField: (fieldId: string) => void;
};

export function FieldRow({
  field,
  fields,
  newFieldOption,
  onNewFieldOptionChange,
  onUpdateField,
  onAddDropdownOption,
  onRemoveDropdownOption,
  onRemoveField,
}: FieldRowProps) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <Input
          value={field.label}
          onChange={(event) => onUpdateField(field.id, { label: event.target.value })}
        />
        <Select
          value={field.type}
          onChange={(event) => onUpdateField(field.id, { type: event.target.value as FieldType })}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="dropdown">Dropdown</option>
        </Select>
      </div>

      {field.type === "dropdown" ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((option) => (
              <div
                key={`${field.id}-${option}`}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
              >
                {option}
                <button
                  type="button"
                  className="text-muted-foreground"
                  onClick={() => onRemoveDropdownOption(field.id, option)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Add option"
              value={newFieldOption}
              onChange={(event) => onNewFieldOptionChange(event.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddDropdownOption(field.id)}
              disabled={field.id === "level" && !fields.find((item) => item.id === "team")?.options?.length}
            >
              Add
            </Button>
          </div>
          {field.id === "level" && !fields.find((item) => item.id === "team")?.options?.length ? (
            <p className="text-xs text-muted-foreground">Add team options first, then add levels.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-foreground">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={field.visible}
            onChange={() => onUpdateField(field.id, { visible: !field.visible })}
            className="h-4 w-4 accent-primary"
          />
          Show
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={field.required}
            onChange={() => onUpdateField(field.id, { required: !field.required })}
            className="h-4 w-4 accent-primary"
          />
          Required
        </label>
        <Button variant="outline" size="sm" onClick={() => onRemoveField(field.id)}>
          Remove
        </Button>
      </div>
    </div>
  );
}
