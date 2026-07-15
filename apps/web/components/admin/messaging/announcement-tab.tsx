"use client";

import { useMemo, useState } from "react";
import {
  useCreateContentMutation,
  useDeleteContentMutation,
  useGetAnnouncementsQuery,
  useUpdateContentMutation,
} from "@/lib/apiSlice";
import { toast } from "../../../lib/toast";
import { PROGRAM_TIER_ITEMS } from "../billing/billing-admin-utils";
import type { AnnouncementItem, ChatGroupItem } from "./types";
import type { AdminTeamItem } from "./messaging-utils";
import { formatSchedule, isValidDateTimeValue, toLocalInputValue } from "./messaging-utils";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Skeleton } from "../../ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { SectionHeader } from "../section-header";

type AnnouncementTabProps = {
  groups: ChatGroupItem[];
  teams: AdminTeamItem[];
  resolveUserName: (userId: number) => string;
  formatTime: (value?: string | null) => string;
};

export function AnnouncementTab({
  groups,
  teams,
  resolveUserName,
  formatTime,
}: AnnouncementTabProps) {
  const {
    data: announcementsData,
    isLoading: isAnnouncementsLoading,
    isError: isAnnouncementsError,
    refetch: refetchAnnouncements,
  } = useGetAnnouncementsQuery();

  const [createAnnouncement, { isLoading: isCreatingAnnouncement }] =
    useCreateContentMutation();
  const [updateAnnouncement, { isLoading: isUpdatingAnnouncement }] =
    useUpdateContentMutation();
  const [deleteAnnouncement] = useDeleteContentMutation();

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementAudienceType, setAnnouncementAudienceType] = useState<
    "all" | "youth" | "adult" | "team" | "group" | "tier"
  >("all");
  const [announcementAudienceTeam, setAnnouncementAudienceTeam] = useState("");
  const [announcementAudienceGroupId, setAnnouncementAudienceGroupId] =
    useState("");
  const [announcementAudienceTier, setAnnouncementAudienceTier] = useState("");
  const [announcementTimingType, setAnnouncementTimingType] = useState<
    "permanent" | "scheduled"
  >("permanent");
  const [announcementStartsAt, setAnnouncementStartsAt] = useState("");
  const [announcementEndsAt, setAnnouncementEndsAt] = useState("");

  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    number | null
  >(null);
  const [editAnnouncementTitle, setEditAnnouncementTitle] = useState("");
  const [editAnnouncementBody, setEditAnnouncementBody] = useState("");
  const [editAnnouncementTimingType, setEditAnnouncementTimingType] = useState<
    "permanent" | "scheduled"
  >("permanent");
  const [editAnnouncementStartsAt, setEditAnnouncementStartsAt] = useState("");
  const [editAnnouncementEndsAt, setEditAnnouncementEndsAt] = useState("");
  const [editAnnouncementIsActive, setEditAnnouncementIsActive] = useState(true);

  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<
    number | null
  >(null);
  const [deleteAnnouncementTarget, setDeleteAnnouncementTarget] =
    useState<AnnouncementItem | null>(null);

  const announcements = useMemo<AnnouncementItem[]>(
    () => (announcementsData?.items as AnnouncementItem[] | undefined) ?? [],
    [announcementsData],
  );

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    const parsedAudienceGroupId = Number(announcementAudienceGroupId);
    if (announcementAudienceType === "team" && !announcementAudienceTeam.trim()) {
      toast.error("Missing team", "Choose a team for this announcement audience.");
      return;
    }
    if (
      announcementAudienceType === "group" &&
      !Number.isFinite(parsedAudienceGroupId)
    ) {
      toast.error("Missing group", "Choose a group for this announcement audience.");
      return;
    }
    if (announcementAudienceType === "tier" && !announcementAudienceTier) {
      toast.error("Missing tier", "Choose a tier for this announcement audience.");
      return;
    }
    if (announcementTimingType === "scheduled") {
      if (
        !isValidDateTimeValue(announcementStartsAt) ||
        !isValidDateTimeValue(announcementEndsAt)
      ) {
        toast.error("Missing schedule", "Choose both a start and end time.");
        return;
      }
      const start = new Date(announcementStartsAt);
      const end = new Date(announcementEndsAt);
      if (end.getTime() <= start.getTime()) {
        toast.error("Invalid schedule", "End time must be after the start time.");
        return;
      }
    }

    const apiAudienceType =
      announcementAudienceType === "youth" || announcementAudienceType === "adult"
        ? "athlete_type"
        : announcementAudienceType;
    const apiAthleteType =
      announcementAudienceType === "youth" || announcementAudienceType === "adult"
        ? announcementAudienceType
        : undefined;

    try {
      const startsAt =
        announcementTimingType === "scheduled" &&
        isValidDateTimeValue(announcementStartsAt)
          ? new Date(announcementStartsAt).toISOString()
          : undefined;
      const endsAt =
        announcementTimingType === "scheduled" &&
        isValidDateTimeValue(announcementEndsAt)
          ? new Date(announcementEndsAt).toISOString()
          : undefined;
      await createAnnouncement({
        title: announcementTitle.trim(),
        content: announcementTitle.trim(),
        body: announcementBody.trim(),
        type: "article",
        surface: "announcements",
        announcementAudienceType: apiAudienceType,
        announcementAudienceAthleteType: apiAthleteType,
        announcementAudienceTier:
          announcementAudienceType === "tier" ? announcementAudienceTier : undefined,
        announcementAudienceTeam:
          announcementAudienceType === "team"
            ? announcementAudienceTeam.trim()
            : undefined,
        announcementAudienceGroupId:
          announcementAudienceType === "group" ? parsedAudienceGroupId : undefined,
        announcementStartsAt: startsAt,
        announcementEndsAt: endsAt,
      }).unwrap();
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementAudienceType("all");
      setAnnouncementAudienceTeam("");
      setAnnouncementAudienceGroupId("");
      setAnnouncementAudienceTier("");
      setAnnouncementTimingType("permanent");
      setAnnouncementStartsAt("");
      setAnnouncementEndsAt("");
      refetchAnnouncements();
      toast.success("Announcement sent", "Your announcement is now visible to users.");
    } catch {
      toast.error("Failed", "Could not publish announcement.");
    }
  };

  const startEditAnnouncement = (item: AnnouncementItem) => {
    const id = Number(item.id);
    if (!Number.isFinite(id)) return;
    setEditingAnnouncementId(id);
    setEditAnnouncementTitle(String(item.title ?? "").trim());
    setEditAnnouncementBody(String(item.body ?? "").trim());
    setEditAnnouncementIsActive(item.isActive ?? true);
    if (item.startsAt && item.endsAt) {
      setEditAnnouncementTimingType("scheduled");
      setEditAnnouncementStartsAt(toLocalInputValue(item.startsAt));
      setEditAnnouncementEndsAt(toLocalInputValue(item.endsAt));
    } else {
      setEditAnnouncementTimingType("permanent");
      setEditAnnouncementStartsAt("");
      setEditAnnouncementEndsAt("");
    }
  };

  const cancelEditAnnouncement = () => {
    setEditingAnnouncementId(null);
    setEditAnnouncementTitle("");
    setEditAnnouncementBody("");
    setEditAnnouncementTimingType("permanent");
    setEditAnnouncementStartsAt("");
    setEditAnnouncementEndsAt("");
    setEditAnnouncementIsActive(true);
  };

  const handleDeleteAnnouncement = (item: AnnouncementItem) => {
    const id = Number(item.id);
    if (!Number.isFinite(id)) {
      toast.error("Failed", "Invalid announcement id.");
      return;
    }
    setDeleteAnnouncementTarget(item);
  };

  const confirmDeleteAnnouncement = async () => {
    if (!deleteAnnouncementTarget) return;
    const id = Number(deleteAnnouncementTarget.id);
    if (!Number.isFinite(id)) {
      toast.error("Failed", "Invalid announcement id.");
      return;
    }
    try {
      setDeletingAnnouncementId(id);
      if (editingAnnouncementId === id) {
        cancelEditAnnouncement();
      }
      await deleteAnnouncement({ id }).unwrap();
      toast.success("Deleted", "Announcement removed.");
      setDeleteAnnouncementTarget(null);
      refetchAnnouncements();
    } catch {
      toast.error("Failed", "Could not delete announcement.");
    } finally {
      setDeletingAnnouncementId((current) => (current === id ? null : current));
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (editingAnnouncementId == null) return;
    if (!editAnnouncementTitle.trim() || !editAnnouncementBody.trim()) {
      toast.error("Missing fields", "Title and message are required.");
      return;
    }
    if (editAnnouncementTimingType === "scheduled") {
      if (
        !isValidDateTimeValue(editAnnouncementStartsAt) ||
        !isValidDateTimeValue(editAnnouncementEndsAt)
      ) {
        toast.error("Missing schedule", "Choose both a start and end time.");
        return;
      }
      const start = new Date(editAnnouncementStartsAt);
      const end = new Date(editAnnouncementEndsAt);
      if (end.getTime() <= start.getTime()) {
        toast.error("Invalid schedule", "End time must be after the start time.");
        return;
      }
    }
    try {
      const startsAt =
        editAnnouncementTimingType === "scheduled" &&
        isValidDateTimeValue(editAnnouncementStartsAt)
          ? new Date(editAnnouncementStartsAt).toISOString()
          : null;
      const endsAt =
        editAnnouncementTimingType === "scheduled" &&
        isValidDateTimeValue(editAnnouncementEndsAt)
          ? new Date(editAnnouncementEndsAt).toISOString()
          : null;
      await updateAnnouncement({
        id: editingAnnouncementId,
        data: {
          title: editAnnouncementTitle.trim(),
          content: editAnnouncementTitle.trim(),
          body: editAnnouncementBody.trim(),
          type: "article",
          announcementStartsAt: startsAt,
          announcementEndsAt: endsAt,
          announcementIsActive: editAnnouncementIsActive,
        },
      }).unwrap();
      cancelEditAnnouncement();
      refetchAnnouncements();
      toast.success("Updated", "Announcement updated.");
    } catch {
      toast.error("Failed", "Could not update announcement.");
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title="Send Announcement"
              description="Broadcast to all users from one place."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Announcement title"
              aria-label="Announcement title"
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Audience type</p>
                {(() => {
                  const audienceTypeItems = [
                    { label: "All users", value: "all" },
                    { label: "Youth athletes", value: "youth" },
                    { label: "Adult athletes", value: "adult" },
                    { label: "Specific team", value: "team" },
                    { label: "Specific group", value: "group" },
                    { label: "Program tier", value: "tier" },
                  ];
                  return (
                    <Select
                      items={audienceTypeItems}
                      value={announcementAudienceType}
                      onValueChange={(v) =>
                        setAnnouncementAudienceType(
                          v as "all" | "youth" | "adult" | "team" | "group" | "tier",
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {audienceTypeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  );
                })()}
              </div>
              {announcementAudienceType === "team" ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Team</p>
                  {(() => {
                    const teamItems = [
                      { label: "Choose a team", value: "" },
                      ...teams.map((team) => ({
                        label: team.team,
                        value: team.team,
                      })),
                    ];
                    return (
                      <Select
                        items={teamItems}
                        value={announcementAudienceTeam}
                        onValueChange={(v) => setAnnouncementAudienceTeam(v ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {teamItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
                </div>
              ) : null}
              {announcementAudienceType === "group" ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Group</p>
                  {(() => {
                    const groupItems = [
                      { label: "Choose a group", value: "" },
                      ...groups.map((group) => ({
                        label: group.name ?? `Group ${group.id}`,
                        value: String(group.id),
                      })),
                    ];
                    return (
                      <Select
                        items={groupItems}
                        value={announcementAudienceGroupId}
                        onValueChange={(v) =>
                          setAnnouncementAudienceGroupId(v ?? "")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {groupItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
                </div>
              ) : null}
              {announcementAudienceType === "tier" ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Tier</p>
                  {(() => {
                    const tierItems = [
                      { label: "Choose a tier", value: "" },
                      ...PROGRAM_TIER_ITEMS,
                    ];
                    return (
                      <Select
                        items={tierItems}
                        value={announcementAudienceTier}
                        onValueChange={(v) =>
                          setAnnouncementAudienceTier(v ?? "")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {tierItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Timing</p>
                {(() => {
                  const timingItems = [
                    { label: "Permanent", value: "permanent" },
                    { label: "Scheduled", value: "scheduled" },
                  ];
                  return (
                    <Select
                      items={timingItems}
                      value={announcementTimingType}
                      onValueChange={(v) =>
                        setAnnouncementTimingType(v as "permanent" | "scheduled")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {timingItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  );
                })()}
              </div>
            </div>
            {announcementTimingType === "scheduled" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Starts</p>
                  <Input
                    type="datetime-local"
                    value={announcementStartsAt}
                    onChange={(event) =>
                      setAnnouncementStartsAt(event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Ends</p>
                  <Input
                    type="datetime-local"
                    value={announcementEndsAt}
                    onChange={(event) =>
                      setAnnouncementEndsAt(event.target.value)
                    }
                  />
                </div>
              </div>
            ) : null}
            <Textarea
              placeholder="Write announcement message"
              aria-label="Announcement message"
              value={announcementBody}
              onChange={(event) => setAnnouncementBody(event.target.value)}
              className="min-h-40"
            />
            <Button
              onClick={() => void handleCreateAnnouncement()}
              disabled={
                isCreatingAnnouncement ||
                !announcementTitle.trim() ||
                !announcementBody.trim() ||
                (announcementAudienceType === "team" && !announcementAudienceTeam) ||
                (announcementAudienceType === "group" && !announcementAudienceGroupId) ||
                (announcementAudienceType === "tier" && !announcementAudienceTier) ||
                (announcementTimingType === "scheduled" &&
                  (!isValidDateTimeValue(announcementStartsAt) ||
                    !isValidDateTimeValue(announcementEndsAt) ||
                    new Date(announcementEndsAt).getTime() <=
                      new Date(announcementStartsAt).getTime()))
              }
            >
              {isCreatingAnnouncement ? "Sending..." : "Send announcement"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[430px] pr-3">
              <div className="space-y-3">
                {isAnnouncementsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={`announcement-skel-${i}`} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : isAnnouncementsError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-destructive">Could not load announcements.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => refetchAnnouncements()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <>
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.createdBy
                            ? `By ${resolveUserName(Number(item.createdBy))}`
                            : "By Staff"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Status: {item.isActive === false ? "Off" : "On"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatSchedule(item.startsAt, item.endsAt)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    {editingAnnouncementId === Number(item.id) ? (
                      <div className="mt-3 space-y-2">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-foreground">
                              Status
                            </p>
                            {(() => {
                              const activeItems = [
                                { label: "Active", value: "on" },
                                { label: "Paused", value: "off" },
                              ];
                              return (
                                <Select
                                  items={activeItems}
                                  value={editAnnouncementIsActive ? "on" : "off"}
                                  onValueChange={(v) =>
                                    setEditAnnouncementIsActive(v === "on")
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectPopup>
                                    {activeItems.map((ai) => (
                                      <SelectItem key={ai.value} value={ai.value}>
                                        {ai.label}
                                      </SelectItem>
                                    ))}
                                  </SelectPopup>
                                </Select>
                              );
                            })()}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-foreground">
                              Timing
                            </p>
                            {(() => {
                              const editTimingItems = [
                                { label: "Permanent", value: "permanent" },
                                { label: "Scheduled", value: "scheduled" },
                              ];
                              return (
                                <Select
                                  items={editTimingItems}
                                  value={editAnnouncementTimingType}
                                  onValueChange={(v) =>
                                    setEditAnnouncementTimingType(
                                      v as "permanent" | "scheduled",
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectPopup>
                                    {editTimingItems.map((ti) => (
                                      <SelectItem key={ti.value} value={ti.value}>
                                        {ti.label}
                                      </SelectItem>
                                    ))}
                                  </SelectPopup>
                                </Select>
                              );
                            })()}
                          </div>
                        </div>
                        {editAnnouncementTimingType === "scheduled" ? (
                          <div className="grid gap-2 md:grid-cols-2">
                            <Input
                              type="datetime-local"
                              value={editAnnouncementStartsAt}
                              onChange={(event) =>
                                setEditAnnouncementStartsAt(event.target.value)
                              }
                            />
                            <Input
                              type="datetime-local"
                              value={editAnnouncementEndsAt}
                              onChange={(event) =>
                                setEditAnnouncementEndsAt(event.target.value)
                              }
                            />
                          </div>
                        ) : null}
                        <Input
                          value={editAnnouncementTitle}
                          onChange={(event) =>
                            setEditAnnouncementTitle(event.target.value)
                          }
                        />
                        <Textarea
                          value={editAnnouncementBody}
                          onChange={(event) =>
                            setEditAnnouncementBody(event.target.value)
                          }
                          className="min-h-28"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => void handleUpdateAnnouncement()}
                            disabled={isUpdatingAnnouncement}
                          >
                            {isUpdatingAnnouncement ? "Saving..." : "Save"}
                          </Button>
                          <Button variant="ghost" onClick={cancelEditAnnouncement}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                          {item.body}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => startEditAnnouncement(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingAnnouncementId === Number(item.id)}
                            onClick={() => void handleDeleteAnnouncement(item)}
                          >
                            {deletingAnnouncementId === Number(item.id)
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {!announcements.length ? (
                  <p className="text-sm text-muted-foreground">
                    No announcements yet.
                  </p>
                ) : null}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={deleteAnnouncementTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteAnnouncementTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete announcement?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteAnnouncementTarget?.title || "this announcement"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteAnnouncementTarget(null)}
              disabled={
                deletingAnnouncementId ===
                Number(deleteAnnouncementTarget?.id ?? NaN)
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteAnnouncement()}
              disabled={
                deletingAnnouncementId ===
                Number(deleteAnnouncementTarget?.id ?? NaN)
              }
            >
              {deletingAnnouncementId ===
              Number(deleteAnnouncementTarget?.id ?? NaN)
                ? "Deleting..."
                : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
