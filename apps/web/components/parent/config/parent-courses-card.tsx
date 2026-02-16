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
import {
  useCreateParentCourseMutation,
  useGetParentCoursesQuery,
  useUpdateParentCourseMutation,
} from "../../../lib/apiSlice";
import {
  ParentCourse,
  ParentCourseModule,
  ModuleType,
  PARENT_COURSE_CATEGORIES,
  PARENT_TIER_OPTIONS,
  normalizeModules,
} from "./parent-course-types";
import { ParentCourseModulesEditor } from "./parent-course-modules-editor";
import { ParentCourseMediaUpload } from "./parent-course-media-upload";

const INITIAL_MODULE_TYPE: ModuleType = "article";

export function ParentCoursesCard() {
  const { data, refetch, isLoading } = useGetParentCoursesQuery();
  const [createCourse, { isLoading: isCreating }] = useCreateParentCourseMutation();
  const [updateCourse, { isLoading: isUpdating }] = useUpdateParentCourseMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<ParentCourse | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState(PARENT_COURSE_CATEGORIES[0]);
  const [tier, setTier] = useState("");
  const [modules, setModules] = useState<ParentCourseModule[]>([]);
  const [newModuleType, setNewModuleType] = useState<ModuleType>(INITIAL_MODULE_TYPE);
  const [error, setError] = useState<string | null>(null);

  const courses = useMemo(() => {
    return (data?.items ?? []).map((course: ParentCourse) => ({
      ...course,
      modules: normalizeModules(course.modules ?? []),
    }));
  }, [data]);

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setDescription("");
    setCoverImage("");
    setCategory(PARENT_COURSE_CATEGORIES[0]);
    setTier("");
    setModules([]);
    setNewModuleType(INITIAL_MODULE_TYPE);
    setEditingCourse(null);
    setError(null);
  };

  const openNewCourse = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditCourse = (course: ParentCourse) => {
    setEditingCourse(course);
    setTitle(course.title ?? "");
    setSummary(course.summary ?? "");
    setDescription(course.description ?? "");
    setCoverImage(course.coverImage ?? "");
    setCategory(course.category ?? PARENT_COURSE_CATEGORIES[0]);
    setTier(course.programTier ?? "");
    setModules(normalizeModules(course.modules ?? []));
    setNewModuleType(course.modules?.[0]?.type ?? INITIAL_MODULE_TYPE);
    setError(null);
    setModalOpen(true);
  };

  const validateCourse = () => {
    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return false;
    }
    if (!modules.length) {
      setError("Add at least one module to the course.");
      return false;
    }
    return true;
  };

  const handleSave = async (keepOpen = false) => {
    setError(null);
    if (!validateCourse()) return;

    const payload = {
      title: title.trim(),
      summary: summary.trim(),
      description: description.trim() || undefined,
      coverImage: coverImage.trim() || undefined,
      category,
      programTier: tier || undefined,
      modules: modules.map((module, index) => ({
        ...module,
        title: module.title.trim(),
        content: module.content?.trim() || undefined,
        mediaUrl: module.mediaUrl?.trim() || undefined,
        order: index,
      })),
    };

    try {
      if (editingCourse) {
        await updateCourse({ id: editingCourse.id, data: payload }).unwrap();
      } else {
        await createCourse(payload).unwrap();
      }
      if (!keepOpen) {
        setModalOpen(false);
      }
      resetForm();
      refetch();
    } catch (err: any) {
      console.error("Course save error:", err);
      let msg = "Failed to save course.";
      if (err?.data?.error === "Invalid request" && err?.data?.issues) {
        const issues = err.data.issues as any[];
        const errors = issues.map((issue) => {
          const path = issue.path.join(".");
          const field = path.replace(/modules\.(\d+)\./, (match: string, p1: string) => `Module ${parseInt(p1) + 1} `);
          return `${field}: ${issue.message}`;
        });
        msg = `Validation Error: ${errors.join(" | ")}`;
      } else if (err?.data?.error) {
        msg = err.data.error;
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parent Education Courses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Build courses with multiple modules (articles, videos, PDFs, FAQs).
          </p>
          <Button onClick={openNewCourse}>New Course</Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading courses...</p>
        ) : courses.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.category} • {course.programTier ?? "All tiers"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEditCourse(course)}>
                    Edit
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{course.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{course.modules.length} modules</Badge>
                  {course.modules.filter((module) => module.preview).length ? (
                    <Badge variant="accent">Preview enabled</Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No courses yet. Create the first parent education course.
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit Course" : "New Course"}</DialogTitle>
              <DialogDescription>
                {editingCourse
                  ? "Update the course details and modules."
                  : "Create a new course with multiple modules."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Course Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setError(null);
                    }}
                    placeholder="Course title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setError(null);
                    }}
                  >
                    {PARENT_COURSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short summary" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional course overview"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cover Image URL</Label>
                  <Input
                    value={coverImage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCoverImage(val);
                      if (val.startsWith("data:")) {
                        setError("Cover Image: Use an upload or a hosted URL instead of pasting base64 data.");
                      } else {
                        setError(null);
                      }
                    }}
                    placeholder="https://..."
                    className={coverImage.startsWith("data:") ? "border-destructive text-destructive" : ""}
                  />
                  {coverImage.startsWith("data:") ? (
                    <p className="text-xs font-medium text-destructive">
                      Base64 detected! Please delete this and upload an image instead.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Upload an image or paste a hosted URL.
                    </p>
                  )}
                  <ParentCourseMediaUpload
                    label="Upload Cover Image"
                    folder="parent-courses/covers"
                    accept="image/*"
                    maxSizeMb={8}
                    onUploaded={(url) => {
                      setCoverImage(url);
                      setError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Tier</Label>
                  <Select
                    value={tier}
                    onChange={(e) => {
                      setTier(e.target.value);
                      setError(null);
                    }}
                  >
                    {PARENT_TIER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <ParentCourseModulesEditor
                modules={modules}
                onModulesChange={setModules}
                newModuleType={newModuleType}
                onNewModuleTypeChange={setNewModuleType}
                onError={setError}
              />

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={isCreating || isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSave(true)}
                  disabled={isCreating || isUpdating}
                >
                  Save & Add Another
                </Button>
                <Button onClick={() => handleSave(false)} disabled={isCreating || isUpdating}>
                  {editingCourse ? "Update Course" : "Publish Course"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
