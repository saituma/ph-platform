"use client";

import { useState, useMemo } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { useCreateChatGroupMutation } from "@/lib/apiSlice";
import { GroupThreadPane } from "./group-thread-pane";
import { SplitPaneShell } from "./split-pane-shell";
import type { ChatGroupItem, MessagingUser } from "./types";
import type { AdminTeamItem, GroupLiveHandlers } from "./messaging-utils";
import {
  EMPTY_TYPING_SET,
  canonicalTeamMatchKey,
  formatGroupLastMessagePreview,
  formatUnreadCount,
  normalizeTeamKey,
  resolveGroupCategory,
} from "./messaging-utils";
import { toast } from "../../../lib/toast";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";
import { Skeleton } from "../../ui/skeleton";

type TeamsTabProps = {
  teams: AdminTeamItem[];
  groups: ChatGroupItem[];
  users: MessagingUser[];
  currentUserId: number | null;
  resolveUserName: (userId: number) => string;
  formatTime: (value?: string | null) => string;
  scheduleInboxRefetch: (delayMs?: number) => void;
  refetchInbox: () => void;
  groupTypingUserIds: ReadonlyMap<number, ReadonlySet<number>>;
  onGroupTypingChange: (groupId: number, isTyping: boolean) => void;
  isTeamsLoading: boolean;
  isTeamsError: boolean;
  onRetryTeams: () => void;
  highlightedTeamName: string | null;
  registerGroupLiveHandlers: (handlers: GroupLiveHandlers | null) => void;
};

export function TeamsTab({
  teams,
  groups,
  users,
  currentUserId,
  resolveUserName,
  formatTime,
  scheduleInboxRefetch,
  refetchInbox,
  groupTypingUserIds,
  onGroupTypingChange,
  isTeamsLoading,
  isTeamsError,
  onRetryTeams,
  highlightedTeamName,
  registerGroupLiveHandlers,
}: TeamsTabProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [creatingTeamKey, setCreatingTeamKey] = useState<string | null>(null);
  const [createGroup] = useCreateChatGroupMutation();

  const chatEligibleUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role !== "admin" && u.role !== "superAdmin" && u.role !== "coach",
      ),
    [users],
  );

  const teamMemberIdsByKey = useMemo(() => {
    const map = new Map<string, number[]>();
    chatEligibleUsers.forEach((user) => {
      const teamName = normalizeTeamKey(
        (user as MessagingUser & { athleteTeam?: string | null; team?: string | null })
          .athleteTeam ??
          (user as MessagingUser & { athleteTeam?: string | null; team?: string | null })
            .team,
      );
      if (!teamName) return;
      const list = map.get(teamName) ?? [];
      if (!list.includes(user.id)) list.push(user.id);
      map.set(teamName, list);
    });
    return map;
  }, [chatEligibleUsers]);

  const teamInboxGroups = useMemo(
    () => groups.filter((group) => resolveGroupCategory(group) === "team"),
    [groups],
  );

  const teamInboxByKey = useMemo(() => {
    const map = new Map<string, ChatGroupItem>();
    teamInboxGroups.forEach((group) => {
      [normalizeTeamKey(group.name), canonicalTeamMatchKey(group.name)]
        .filter(Boolean)
        .forEach((key) => {
          if (!map.has(key)) map.set(key, group);
        });
    });
    return map;
  }, [teamInboxGroups]);

  const teamInboxByTeamId = useMemo(() => {
    const map = new Map<number, ChatGroupItem>();
    teamInboxGroups.forEach((group) => {
      if (typeof group.teamId === "number" && group.teamId > 0 && !map.has(group.teamId)) {
        map.set(group.teamId, group);
      }
    });
    return map;
  }, [teamInboxGroups]);

  const resolveTeamInboxGroup = (team: AdminTeamItem) => {
    const teamKey = normalizeTeamKey(team.team);
    const teamCanonicalKey = canonicalTeamMatchKey(team.team);
    return (
      teamInboxByTeamId.get(team.id) ??
      teamInboxByKey.get(teamKey) ??
      teamInboxByKey.get(teamCanonicalKey) ??
      teamInboxGroups.find((candidate) => {
        const candidateKey = canonicalTeamMatchKey(candidate.name);
        return (
          candidateKey.includes(teamCanonicalKey) ||
          teamCanonicalKey.includes(candidateKey)
        );
      }) ??
      null
    );
  };

  const handleSelectTeam = async (team: AdminTeamItem) => {
    const existingGroup = resolveTeamInboxGroup(team);
    if (existingGroup?.id) {
      setSelectedGroupId(existingGroup.id);
      return;
    }
    const teamKey = normalizeTeamKey(team.team);
    if (creatingTeamKey === teamKey) return;
    const memberIds = teamMemberIdsByKey.get(teamKey) ?? [];
    if (!memberIds.length) {
      toast.error(
        "No team members",
        "This team has no chat-eligible members to start an inbox.",
      );
      return;
    }
    setCreatingTeamKey(teamKey);
    try {
      const response = await createGroup({
        name: team.team.trim(),
        category: "team",
        memberIds,
        teamId: team.id,
      }).unwrap();
      refetchInbox();
      const newGroupId = Number(response?.group?.id ?? NaN);
      if (Number.isFinite(newGroupId) && newGroupId > 0) {
        setSelectedGroupId(newGroupId);
      }
      toast.success("Team inbox ready", `Opened ${team.team} inbox.`);
    } catch {
      toast.error("Failed", "Could not create team inbox.");
    } finally {
      setCreatingTeamKey(null);
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <SplitPaneShell
      isDetailOpen={selectedGroupId != null}
      list={
        <>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Teams</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-1">
            {isTeamsLoading ? (
              <div className="space-y-2 px-3 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={`team-skel-${i}`} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : isTeamsError ? (
              <div className="mx-3 my-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
                <p className="text-sm font-medium text-destructive">Could not load teams.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={onRetryTeams}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
            {teams.map((team) => {
              const resolvedGroup = resolveTeamInboxGroup(team);
              const unread = Number(resolvedGroup?.unreadCount ?? 0);
              const isActive = selectedGroupId === resolvedGroup?.id && resolvedGroup?.id != null;
              const isHighlighted =
                highlightedTeamName != null &&
                team.team.toLowerCase() === highlightedTeamName;
              const isCreatingInbox = creatingTeamKey === normalizeTeamKey(team.team);

              return (
                <button
                  key={team.team}
                  type="button"
                  disabled={isCreatingInbox}
                  onClick={() => void handleSelectTeam(team)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:cursor-wait disabled:opacity-60 ${
                    isActive || isHighlighted
                      ? "bg-primary/10 hover:bg-primary/10"
                      : ""
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {String(team.team ?? "T").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className={`truncate text-sm ${unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                        {team.team}
                      </p>
                      <p className="shrink-0 text-[11px] text-muted-foreground">
                        {formatTime(team.updatedAt)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <p className="truncate text-xs text-muted-foreground">
                        {formatGroupLastMessagePreview(
                          resolvedGroup ?? {
                            id: 0,
                            name: team.team,
                            category: "team",
                            createdAt: team.createdAt,
                            unreadCount: 0,
                          },
                        )}
                      </p>
                      {unread > 0 ? (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {formatUnreadCount(unread)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {team.youthCount} youth · {team.adultCount} adult ·{" "}
                      {teamMemberIdsByKey.get(normalizeTeamKey(team.team))?.length ?? 0} chat members
                    </p>
                  </div>
                  {isCreatingInbox ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : resolvedGroup ? (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      inbox
                    </Badge>
                  ) : null}
                </button>
              );
            })}

            {!teams.length ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">No teams found.</p>
              </div>
            ) : null}
              </>
            )}
          </div>
        </ScrollArea>
        </>
      }
      detail={
        <>
        {selectedGroupId != null ? (
          <GroupThreadPane
            groupId={selectedGroupId}
            groupName={selectedGroup?.name ?? "Team inbox"}
            currentUserId={currentUserId}
            users={users}
            typingUserIds={groupTypingUserIds.get(selectedGroupId) ?? EMPTY_TYPING_SET}
            onTypingChange={(isTyping) => onGroupTypingChange(selectedGroupId, isTyping)}
            resolveUserName={resolveUserName}
            formatTime={formatTime}
            scheduleInboxRefetch={scheduleInboxRefetch}
            refetchInbox={refetchInbox}
            registerGroupLiveHandlers={registerGroupLiveHandlers}
            onBack={() => setSelectedGroupId(null)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Team chats</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a team to open its inbox
              </p>
            </div>
          </div>
        )}
        </>
      }
    />
  );
}
