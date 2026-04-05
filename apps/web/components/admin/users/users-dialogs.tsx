"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useGetUserOnboardingQuery, useUpdateProgramTierMutation } from "../../../lib/apiSlice";

export type UsersDialog =
  | null
  | "new-user"
  | "review-onboarding"
  | "assign-program";

type UsersDialogsProps = {
  active: UsersDialog;
  onClose: () => void;
  selectedUserId?: number | null;
};

type BillingRequest = {
  userId?: number;
  planTier?: string | null;
  displayPrice?: string | null;
  billingInterval?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
};

export function UsersDialogs({ active, onClose, selectedUserId }: UsersDialogsProps) {
  const [error, setError] = useState<string | null>(null);
  const [programTierSelection, setProgramTierSelection] = useState<{ userId: number; tier: string } | null>(null);
  const [billingStatus, setBillingStatus] = useState<{
    planTier?: string | null;
    displayPrice?: string | null;
    billingInterval?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    createdAt?: string | null;
  } | null>(null);
  const shouldFetch = Boolean(
    selectedUserId && (active === "review-onboarding" || active === "assign-program")
  );
  const { data: onboarding, isFetching } = useGetUserOnboardingQuery(
    shouldFetch ? selectedUserId! : skipToken
  );
  const [updateProgramTier, { isLoading: isUpdatingTier }] = useUpdateProgramTierMutation();

  const athleteId = useMemo(() => onboarding?.athlete?.id, [onboarding]);
  const resolvedTier =
    onboarding?.athlete?.currentProgramTier ??
    onboarding?.guardian?.currentProgramTier ??
    "PHP";
  const programTier =
    selectedUserId && programTierSelection?.userId === selectedUserId
      ? programTierSelection.tier
      : resolvedTier;
  useEffect(() => {
    if (!selectedUserId || !shouldFetch) return;
    let activeRequest = true;
    (async () => {
      try {
        const res = await fetch("/api/backend/admin/subscription-requests");
        if (!res.ok) return;
        const payload = await res.json();
        const requests: BillingRequest[] = Array.isArray(payload?.requests) ? payload.requests : [];
        const match = requests.find((request) => request.userId === selectedUserId);
        if (!activeRequest) return;
        if (!match) {
          setBillingStatus(null);
          return;
        }
        setBillingStatus({
          planTier: match.planTier ?? null,
          displayPrice: match.displayPrice ?? null,
          billingInterval: match.billingInterval ?? null,
          status: match.status ?? null,
          paymentStatus: match.paymentStatus ?? null,
          createdAt: match.createdAt ?? null,
        });
      } catch {
        if (!activeRequest) return;
        setBillingStatus(null);
      }
    })();
    return () => {
      activeRequest = false;
    };
  }, [selectedUserId, shouldFetch]);
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "new-user" && "Create New User"}
            {active === "review-onboarding" && "Review Onboarding"}
            {active === "assign-program" && "Assign Program"}
          </DialogTitle>
          <DialogDescription>
            {selectedUserId ? `Selected user #${selectedUserId}` : "Select a user."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "new-user" ? (
            <>
              <Input placeholder="Athlete name" />
              <Input placeholder="Parent email" />
              <Select>
                <option>Program tier</option>
                <option>PHP Program</option>
                <option>PHP Premium Plus</option>
                <option>PHP Premium</option>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Create</Button>
              </div>
            </>
          ) : null}
          {active === "review-onboarding" ? (
            <div className="space-y-4">
              {isFetching ? (
                <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  Loading onboarding details...
                </div>
              ) : null}
              <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Tier:</span>
                  <span className="font-medium">{resolvedTier}</span>
                </div>
                {billingStatus ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Latest Plan:</span>
                      <span className="font-medium">
                        {billingStatus.planTier ?? "--"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing:</span>
                      <span className="font-medium">
                        {billingStatus.displayPrice ?? "--"}{" "}
                        {billingStatus.billingInterval ? `• ${billingStatus.billingInterval}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {billingStatus.status ?? "--"} / {billingStatus.paymentStatus ?? "--"}
                      </span>
                    </div>
                  </>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age / Team:</span>
                  <span className="font-medium">
                    {onboarding?.athlete?.age ?? "--"} / {onboarding?.athlete?.team ?? "--"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Training Days:</span>
                  <span className="font-medium">
                    {onboarding?.athlete?.trainingPerWeek ?? "--"} days/week
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Injuries:</span>
                  <span className="font-medium">
                    {onboarding?.athlete?.injuries ? JSON.stringify(onboarding.athlete.injuries) : "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goals:</span>
                  <span className="font-medium">
                    {onboarding?.athlete?.performanceGoals ?? "--"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equipment:</span>
                  <span className="font-medium">
                    {onboarding?.athlete?.equipmentAccess ?? "--"}
                  </span>
                </div>
              </div>
              <Textarea placeholder="Coach feedback or notes" />
              <Select
                value={programTier}
                onChange={(e) => {
                  if (!selectedUserId) return;
                  setProgramTierSelection({ userId: selectedUserId, tier: e.target.value });
                }}
              >
                <option value="PHP">Approve & Assign PHP Program</option>
                <option value="PHP_Premium">Approve & Assign PHP Premium</option>
                <option value="PHP_Premium_Plus">Approve & Assign PHP Premium Plus</option>
                <option value="PHP_Pro">Approve & Assign PHP Pro</option>
              </Select>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedUserId || !athleteId) {
                      setError("Unable to resolve athlete for this user.");
                      return;
                    }
                    setError(null);
                    try {
                      await updateProgramTier({ athleteId, programTier }).unwrap();
                      onClose();
                    } catch {
                      setError("Failed to update tier");
                      return;
                    }
                  }}
                  disabled={isUpdatingTier}
                >
                  {isUpdatingTier ? "Saving..." : "Finalize Review"}
                </Button>
              </div>
            </div>
          ) : null}
          {active === "assign-program" ? (
            <>
              <div className="rounded-2xl border border-border bg-secondary/20 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Tier:</span>
                  <span className="font-medium">{resolvedTier}</span>
                </div>
                {billingStatus ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Latest Plan:</span>
                      <span className="font-medium">{billingStatus.planTier ?? "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {billingStatus.status ?? "--"} / {billingStatus.paymentStatus ?? "--"}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              <Select
                value={programTier}
                onChange={(e) => {
                  if (!selectedUserId) return;
                  setProgramTierSelection({ userId: selectedUserId, tier: e.target.value });
                }}
              >
                <option value="PHP">PHP Program</option>
                <option value="PHP_Premium">PHP Premium</option>
                <option value="PHP_Premium_Plus">PHP Premium Plus</option>
                <option value="PHP_Pro">PHP Pro</option>
              </Select>
              <Textarea placeholder="Assignment notes" />
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedUserId || !athleteId) {
                      setError("Unable to resolve athlete for this user.");
                      return;
                    }
                    setError(null);
                    try {
                      await updateProgramTier({ athleteId, programTier }).unwrap();
                      onClose();
                    } catch {
                      setError("Failed to update tier");
                      return;
                    }
                  }}
                  disabled={isUpdatingTier}
                >
                  {isUpdatingTier ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
