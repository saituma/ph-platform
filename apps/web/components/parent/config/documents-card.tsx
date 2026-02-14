import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { DocumentConfig } from "./types";

type DocumentsCardProps = {
  docs: DocumentConfig[];
  newDocLabel: string;
  onSetNewDocLabel: (value: string) => void;
  onSetDocs: (updater: (prev: DocumentConfig[]) => DocumentConfig[]) => void;
};

export function DocumentsCard({ docs, newDocLabel, onSetNewDocLabel, onSetDocs }: DocumentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {docs.map((doc) => (
          <div key={doc.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-xs text-foreground">
            <input
              type="checkbox"
              checked={doc.required}
              onChange={() => onSetDocs((prev) => prev.map((item) => (item.id === doc.id ? { ...item, required: !item.required } : item)))}
              className="h-4 w-4 accent-primary"
            />
            <Input
              value={doc.label}
              onChange={(event) => onSetDocs((prev) => prev.map((item) => (item.id === doc.id ? { ...item, label: event.target.value } : item)))}
            />
            <Button variant="outline" size="sm" onClick={() => onSetDocs((prev) => prev.filter((item) => item.id !== doc.id))}>
              Remove
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3">
          <Input placeholder="Add document requirement" value={newDocLabel} onChange={(event) => onSetNewDocLabel(event.target.value)} />
          <Button
            variant="outline"
            onClick={() => {
              if (!newDocLabel.trim()) return;
              const id = `${newDocLabel.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
              onSetDocs((prev) => [...prev, { id, label: newDocLabel.trim(), required: false }]);
              onSetNewDocLabel("");
            }}
          >
            Add Document
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
