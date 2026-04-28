"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";
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

const PROGRAM_TIER_ITEMS = [
  { label: "Approve & Assign PHP Program", value: "PHP" },
  { label: "Approve & Assign PHP Premium", value: "PHP_Premium" },
  { label: "Approve & Assign PHP Premium Plus", value: "PHP_Premium_Plus" },
  { label: "Approve & Assign PHP Pro", value: "PHP_Pro" },
];

const ASSIGN_TIER_ITEMS = [
  { label: "PHP Program", value: "PHP" },
  { label: "PHP Premium", value: "PHP_Premium" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
  { label: "PHP Pro", value: "PHP_Pro" },
];

const NEW_USER_TIER_ITEMS = [
  { label: "Program tier", value: "" },
  { label: "PHP Program", value: "PHP" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
  { label: "PHP Premium", value: "PHP_Premium" },
];

export function UsersDialogs({ active, onClose, selectedUserId }: UsersDialogsProps) {
  const [error, setError] = useState<string | null>(null);
  const [newUserTier, setNewUserTier] = useState("");
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
      <DialogPopup>
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

        {active === "new-user" ? (
          <>
            <DialogPanel className="space-y-4">
              <Input placeholder="Athlete name" />
              <Input placeholder="Parent email" />
              <Select
                items={NEW_USER_TIER_ITEMS}
                value={newUserTier}
                onValueChange={(value) => setNewUserTier(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Program tier" />
                </SelectTrigger>
                <SelectPopup>
                  {NEW_USER_TIER_ITEMS.filter((i) => i.value).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </DialogPanel>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onClose}>Create</Button>
            </DialogFooter>
          </>
        ) : null}

        {active === "review-onboarding" ? (
          <>
            <DialogPanel className="space-y-4">
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
                    {onboarding?.athlete?.injuries
                      ? JSON.stringify(onboarding.athlete.injuries)
                      : "None"}
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
                items={PROGRAM_TIER_ITEMS}
                value={programTier}
                onValueChange={(value) => {
                  if (!selectedUserId || value == null) return;
                  setProgramTierSelection({ userId: selectedUserId, tier: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {PROGRAM_TIER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </DialogPanel>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
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
                  }
                }}
                disabled={isUpdatingTier}
              >
                {isUpdatingTier ? "Saving..." : "Finalize Review"}
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {active === "assign-program" ? (
          <>
            <DialogPanel className="space-y-4">
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
                items={ASSIGN_TIER_ITEMS}
                value={programTier}
                onValueChange={(value) => {
                  if (!selectedUserId || value == null) return;
                  setProgramTierSelection({ userId: selectedUserId, tier: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {ASSIGN_TIER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <Textarea placeholder="Assignment notes" />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </DialogPanel>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
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
                  }
                }}
                disabled={isUpdatingTier}
              >
                {isUpdatingTier ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
