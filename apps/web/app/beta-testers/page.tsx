"use client";

import { FlaskConical, Mail, Phone, Clock } from "lucide-react";
import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Skeleton } from "../../components/ui/skeleton";
import { useGetBetaTestersQuery } from "@/lib/apiSlice";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BetaTestersPage() {
  const { data, isLoading } = useGetBetaTestersQuery();
  const testers = data?.items ?? [];

  return (
    <AdminShell title="Beta Testers">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center bg-primary/10 text-primary">
            <FlaskConical className="h-5 w-5" />
          </div>
          <SectionHeader
            title="Beta Testers"
            description={`${data?.total ?? 0} signups`}
          />
        </div>

        <Card>
          <CardHeader>
            <p className="text-sm font-medium">All Submissions</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : testers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No beta tester signups yet.
              </p>
            ) : (
              <ScrollArea className="h-[600px] pr-2">
                <div className="space-y-2">
                  {testers.map((tester) => (
                    <div
                      key={tester.id}
                      className="rounded-lg border border-border p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{tester.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {tester.email}
                            </span>
                            {tester.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {tester.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatDate(tester.createdAt)}
                        </span>
                      </div>
                      {tester.reason && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          {tester.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
