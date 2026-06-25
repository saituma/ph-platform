"use client";

import { useMemo } from "react";
import type { ChatGroupItem, MessagingUser } from "./types";
import type { AdminTeamItem } from "./messaging-utils";
import {
  canonicalTeamMatchKey,
  formatGroupLastMessagePreview,
  formatUnreadCount,
  normalizeTeamKey,
  resolveGroupCategory,
} from "./messaging-utils";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { SectionHeader } from "../section-header";

type TeamsTabProps = {
  teams: AdminTeamItem[];
  groups: ChatGroupItem[];
  users: MessagingUser[];
  formatTime: (value?: string | null) => string;
  highlightedTeamName: string | null;
  onOpenTeamInbox: (team: AdminTeamItem) => void;
};

export function TeamsTab({
  teams,
  groups,
  users,
  formatTime,
  highlightedTeamName,
  onOpenTeamInbox,
}: TeamsTabProps) {
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

  const resolveTeamInboxGroup = (teamName: string) => {
    const teamKey = normalizeTeamKey(teamName);
    const teamCanonicalKey = canonicalTeamMatchKey(teamName);
    return (
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

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Teams"
          description="Open team inbox chats from roster teams. Missing inboxes are created automatically from team members."
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {teams.map((team) => {
            const resolvedTeamInboxGroup = resolveTeamInboxGroup(team.team);
            return (
              <button
                key={team.team}
                type="button"
                onClick={() => onOpenTeamInbox(team)}
                className={`w-full text-left rounded-xl border bg-background p-4 ${
                  highlightedTeamName &&
                  team.team.toLowerCase() === highlightedTeamName
                    ? "border-primary"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {team.team}
                      </p>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        Team inbox
                      </span>
                      {(() => {
                        const unread = Number(
                          resolvedTeamInboxGroup?.unreadCount ?? 0,
                        );
                        if (!Number.isFinite(unread) || unread <= 0) return null;
                        return (
                          <Badge className="h-5 rounded-full px-2 text-[10px]">
                            {formatUnreadCount(unread)}
                          </Badge>
                        );
                      })()}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {team.youthCount} youth · {team.adultCount} adult ·{" "}
                      {teamMemberIdsByKey.get(normalizeTeamKey(team.team))
                        ?.length ?? 0}{" "}
                      chat members
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground/90">
                      {formatGroupLastMessagePreview(
                        resolvedTeamInboxGroup ?? {
                          id: 0,
                          name: team.team,
                          category: "team",
                          createdAt: team.createdAt,
                          unreadCount: 0,
                        },
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>Updated {formatTime(team.updatedAt)}</p>
                    <p>Created {formatTime(team.createdAt)}</p>
                    <p className="mt-1">
                      {resolvedTeamInboxGroup ? (
                        <span className="text-xs text-primary font-medium">
                          Open inbox
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Create inbox
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {!teams.length ? (
            <p className="text-sm text-muted-foreground">No teams found.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
