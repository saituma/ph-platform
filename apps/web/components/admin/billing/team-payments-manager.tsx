"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Eye, Users, CheckCircle2, Clock } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

type TeamPaymentItem = {
  id: number;
  team: string;
  paymentMode: "coach_pays_all" | "per_player_all" | "per_player_selected";
  subscriptionStatus: string;
  planPaymentType: string;
  planCommitmentMonths: number;
  planExpiresAt: string | null;
  maxAthletes: number;
  memberCount: number;
};

export function TeamPaymentsManager() {
  const [teams, setTeams] = useState<TeamPaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTeams() {
      try {
        const res = await fetch("/api/backend/admin/teams?limit=500");
        const data = await res.json();
        if (Array.isArray(data.teams)) {
          setTeams(data.teams);
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setIsLoading(false);
      }
    }
    void loadTeams();
  }, []);

  function getPaymentModeBadge(mode: TeamPaymentItem["paymentMode"]) {
    switch (mode) {
      case "per_player_all":
        return <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/10">All Players Pay</Badge>;
      case "per_player_selected":
        return <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/10">Selected Players Pay</Badge>;
      default:
        return <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Coach Pays All</Badge>;
    }
  }

  function getStatusBadge(status: string) {
    if (status === "active") {
      return <span className="inline-flex items-center gap-1.5 text-xs text-green-500"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>;
    }
    return <span className="inline-flex items-center gap-1.5 text-xs text-amber-500"><Clock className="h-3.5 w-3.5" /> Pending Payment</span>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Payment Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Athletes</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Loading teams...
                </TableCell>
              </TableRow>
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No teams found.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id} className="hover:bg-muted/20">
                  <TableCell>
                    <Link href={`/billing/team-payments/detail/${team.id}`} className="font-medium hover:underline text-foreground">
                      {team.team}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {getPaymentModeBadge(team.paymentMode)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(team.subscriptionStatus)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {team.memberCount} / {team.maxAthletes}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {team.planExpiresAt ? format(new Date(team.planExpiresAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/billing/team-payments/detail/${team.id}`} />}>
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
