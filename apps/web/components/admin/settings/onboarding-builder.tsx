"use client";

import { useState } from "react";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Badge } from "../../ui/badge";

type FieldType = "text" | "number" | "select" | "textarea" | "email";

type Field = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
};

type OnboardingBuilderProps = {
  onSave: () => void;
};

const defaults: Field[] = [
  { id: "name", label: "Athlete Name", type: "text", required: true },
  { id: "age", label: "Age", type: "number", required: true },
  { id: "training", label: "Training Days Per Week", type: "number", required: true },
  { id: "injuries", label: "Injuries", type: "textarea", required: false },
  { id: "goals", label: "Performance Goals", type: "textarea", required: true },
  { id: "parent", label: "Parent Email", type: "email", required: true },
];

export function OnboardingBuilder({ onSave }: OnboardingBuilderProps) {
  const [fields, setFields] = useState<Field[]>(defaults);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newRequired, setNewRequired] = useState(true);

  const addField = () => {
    if (!newLabel.trim()) return;
    setFields((prev) => [
      ...prev,
      {
        id: `${newLabel.toLowerCase().replace(/\\s+/g, "-")}-${Date.now()}`,
        label: newLabel.trim(),
        type: newType,
        required: newRequired,
      },
    ]);
    setNewLabel("");
    setNewType("text");
    setNewRequired(true);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateField = (index: number, patch: Partial<Field>) => {
    setFields((prev) => prev.map((field, idx) => (idx === index ? { ...field, ...patch } : field)));
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="New field label"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
          />
          <Select value={newType} onChange={(event) => setNewType(event.target.value as FieldType)}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="email">Email</option>
            <option value="select">Select</option>
            <option value="textarea">Textarea</option>
          </Select>
          <Select
            value={newRequired ? "required" : "optional"}
            onChange={(event) => setNewRequired(event.target.value === "required")}
          >
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </Select>
        </div>
        <Button variant="outline" onClick={addField}>
          Add Field
        </Button>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                  value={field.label}
                  onChange={(event) => updateField(index, { label: event.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={field.type}
                    onChange={(event) => updateField(index, { type: event.target.value as FieldType })}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="select">Select</option>
                    <option value="textarea">Textarea</option>
                  </Select>
                  <Select
                    value={field.required ? "required" : "optional"}
                    onChange={(event) => updateField(index, { required: event.target.value === "required" })}
                  >
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                  </Select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => moveField(index, -1)}>
                    Up
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => moveField(index, 1)}>
                    Down
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removeField(index)}>
                    Remove
                  </Button>
                </div>
                <Badge variant={field.required ? "primary" : "outline"}>
                  {field.required ? "Required" : "Optional"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={onSave}>Save Onboarding</Button>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Mobile Preview
        </p>
        <div className="mt-3 space-y-3">
          {fields.map((field) => (
            <div key={`preview-${field.id}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{field.label}</p>
                <span className="text-xs text-muted-foreground">
                  {field.required ? "Required" : "Optional"}
                </span>
              </div>
              <div className="h-10 w-full rounded-full border border-border bg-background" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
