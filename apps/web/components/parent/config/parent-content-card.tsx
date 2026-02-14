"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { useCreateContentMutation, useGetParentContentQuery, useUpdateContentMutation } from "../../../lib/apiSlice";

const CATEGORIES = [
  "Growth and maturation",
  "Injury prevention",
  "Sleep and recovery",
  "Nutrition for young athletes",
  "Training load management",
  "Mindset and confidence",
];

const CONTENT_TYPES = ["article", "video", "pdf", "faq"] as const;
const TIER_OPTIONS = [
  { value: "", label: "All tiers" },
  { value: "PHP", label: "PHP Program" },
  { value: "PHP_Plus", label: "PHP Plus" },
  { value: "PHP_Premium", label: "PHP Premium" },
];

export function ParentContentCard() {
  const { data, refetch, isLoading } = useGetParentContentQuery();
  const [createContent, { isLoading: isSaving }] = useCreateContentMutation();
  const [updateContent, { isLoading: isUpdating }] = useUpdateContentMutation();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [type, setType] = useState<(typeof CONTENT_TYPES)[number]>("article");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [tier, setTier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    return CATEGORIES.map((cat) => ({
      category: cat,
      items: items.filter((item: any) => item.category === cat),
    }));
  }, [data]);

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setBody("");
    setTier("");
    setType("article");
    setCategory(CATEGORIES[0]);
    setEditingItem(null);
  };

  const handleCreate = async (keepOpen = false) => {
    setError(null);
    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return;
    }
    try {
      await createContent({
        title: title.trim(),
        content: summary.trim(),
        type,
        body: body.trim() || undefined,
        programTier: tier || undefined,
        surface: "parent_platform",
        category,
      }).unwrap();
      resetForm();
      if (!keepOpen) {
        setModalOpen(false);
      }
      refetch();
    } catch (err: any) {
      setError(err?.message ?? "Failed to publish content.");
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setTitle(item.title ?? "");
    setSummary(item.content ?? "");
    setBody(item.body ?? "");
    setType((item.type as any) ?? "article");
    setTier(item.programTier ?? "");
    setCategory(item.category ?? CATEGORIES[0]);
    setError(null);
    setModalOpen(true);
  };

  const handleNewForCategory = (cat: string) => {
    resetForm();
    setCategory(cat);
    setModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    setError(null);
    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return;
    }
    try {
      await updateContent({
        id: editingItem.id,
        data: {
          title: title.trim(),
          content: summary.trim(),
          type,
          body: body.trim() || undefined,
          programTier: tier || undefined,
          category,
        },
      }).unwrap();
      resetForm();
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update content.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parent Education Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Create and edit parent education content.</p>
          <Button onClick={() => { resetForm(); setModalOpen(true); }}>New Content</Button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading content...</p>
          ) : (
            grouped
              .filter((group) => group.items.length > 0)
              .map((group) => (
              <div key={group.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{group.category}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{group.items.length}</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleNewForCategory(group.category)}>
                      Add
                    </Button>
                  </div>
                </div>
                {group.items.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border p-3 text-left hover:border-primary/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.type?.toUpperCase()} • {item.programTier ?? "All tiers"}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                            Edit
                          </Button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Content" : "New Content"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update parent education content." : "Publish a new parent education item."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description" />
              </div>
              <div className="space-y-2">
                <Label>Details / Media URL</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    type === "video" || type === "pdf"
                      ? "Paste video or PDF URL"
                      : "Full content or outline"
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                    {CONTENT_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item.toUpperCase()}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Tier</Label>
                <Select value={tier} onChange={(e) => setTier(e.target.value)}>
                  {TIER_OPTIONS.map((item) => (
                    <option key={item.value || "all"} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                {editingItem ? (
                  <Button onClick={handleUpdate} disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => handleCreate(true)} disabled={isSaving}>
                      {isSaving ? "Publishing..." : "Publish & Add Another"}
                    </Button>
                    <Button onClick={() => handleCreate(false)} disabled={isSaving}>
                      {isSaving ? "Publishing..." : "Publish"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
