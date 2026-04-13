import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminCard } from "@/roles/admin/components/AdminCard";
import { apiRequest } from "@/lib/api";
import { formatIsoShort, parseIntOrUndefined } from "@/lib/admin-utils";
import { useAdminPhysioReferrals } from "@/hooks/admin/useAdminPhysioReferrals";
import { useAppSelector } from "@/store/hooks";
import type { AdminUserLite } from "@/types/admin";
import { Feather } from "@/components/ui/theme-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function resolveReferralType(metadata: any): string {
  const label = String(metadata?.referralType ?? "").trim();
  if (label) return label;
  if (metadata?.physioName || metadata?.clinicName) return "Physio";
  return "Referral";
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  return (
    <View className="gap-2">
      <Text className="text-[12px] font-outfit text-secondary">{label}</Text>
      <View
        className="rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
        }}
      >
        <TextInput
          className="text-[14px] font-outfit text-app"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

export default function AdminOpsReferralsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const referralsHook = useAdminPhysioReferrals(token, canLoad);

  const [q, setQ] = useState("");

  const [detailId, setDetailId] = useState<number | null>(null);
  const detailItem = useMemo(
    () => referralsHook.items.find((x) => x.id === detailId) ?? null,
    [detailId, referralsHook.items],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createAthleteSearch, setCreateAthleteSearch] = useState("");
  const [createAthleteOptions, setCreateAthleteOptions] = useState<AdminUserLite[]>([]);
  const [createAthleteId, setCreateAthleteId] = useState("");
  const [createReferralType, setCreateReferralType] = useState("Physio");
  const [createLink, setCreateLink] = useState("");
  const [createDiscount, setCreateDiscount] = useState("");
  const [createProviderName, setCreateProviderName] = useState("");
  const [createOrganizationName, setCreateOrganizationName] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editReferralType, setEditReferralType] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editProviderName, setEditProviderName] = useState("");
  const [editOrganizationName, setEditOrganizationName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!canLoad) return;
    void referralsHook.load({ limit: 50 }, true);
  }, [canLoad, referralsHook]);

  useEffect(() => {
    if (!detailItem) return;
    setEditError(null);
    setEditReferralType(resolveReferralType(detailItem.metadata));
    setEditLink(String(detailItem.referalLink ?? ""));
    setEditDiscount(
      typeof detailItem.discountPercent === "number"
        ? String(detailItem.discountPercent)
        : "",
    );
    setEditProviderName(
      String(detailItem.metadata?.providerName ?? detailItem.metadata?.physioName ?? ""),
    );
    setEditOrganizationName(
      String(detailItem.metadata?.organizationName ?? detailItem.metadata?.clinicName ?? ""),
    );
    setEditNotes(String(detailItem.metadata?.notes ?? ""));
  }, [detailItem]);

  const searchAthletes = useCallback(
    async (forceRefresh: boolean) => {
      if (!canLoad || !token) return;
      const query = createAthleteSearch.trim();
      if (!query) {
        setCreateAthleteOptions([]);
        return;
      }
      try {
        const params = new URLSearchParams();
        params.set("q", query);
        params.set("limit", "25");
        const res = await apiRequest<{ users?: AdminUserLite[] }>(
          `/admin/users?${params.toString()}`,
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setCreateAthleteOptions(Array.isArray(res?.users) ? res.users : []);
      } catch {
        setCreateAthleteOptions([]);
      }
    },
    [canLoad, createAthleteSearch, token],
  );

  const submitCreate = useCallback(async () => {
    if (!canLoad) return;
    setCreateError(null);

    const athleteId = parseIntOrUndefined(createAthleteId);
    if (!athleteId) {
      setCreateError("Athlete ID is required.");
      return;
    }
    const referralType = createReferralType.trim();
    const referalLink = createLink.trim();

    const discountPercent = parseIntOrUndefined(createDiscount);

    try {
      await referralsHook.create({
        athleteId,
        referalLink,
        ...(typeof discountPercent === "number" ? { discountPercent } : {}),
        metadata: {
          referralType,
          providerName: createProviderName.trim(),
          organizationName: createOrganizationName.trim(),
          notes: createNotes.trim(),
        },
      });
      setCreateOpen(false);
      setCreateAthleteSearch("");
      setCreateAthleteOptions([]);
      setCreateAthleteId("");
      setCreateReferralType("Physio");
      setCreateLink("");
      setCreateDiscount("");
      setCreateProviderName("");
      setCreateOrganizationName("");
      setCreateNotes("");
      await referralsHook.load({ q: q.trim() || undefined, limit: 50 }, true);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create referral.");
    }
  }, [
    canLoad,
    createAthleteId,
    createDiscount,
    createLink,
    createNotes,
    createOrganizationName,
    createProviderName,
    createReferralType,
    q,
    referralsHook,
  ]);

  const submitUpdate = useCallback(async () => {
    if (!detailItem) return;
    setEditError(null);
    const referralType = editReferralType.trim();
    const referalLink = editLink.trim();
    const discountPercent = parseIntOrUndefined(editDiscount);

    try {
      await referralsHook.update(detailItem.id, {
        referalLink,
        ...(typeof discountPercent === "number" ? { discountPercent } : { discountPercent: null }),
        metadata: {
          ...(detailItem.metadata ?? {}),
          referralType,
          providerName: editProviderName.trim(),
          organizationName: editOrganizationName.trim(),
          notes: editNotes.trim(),
        },
      });
      await referralsHook.load({ q: q.trim() || undefined, limit: 50 }, true);
      setDetailId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update referral.");
    }
  }, [
    detailItem,
    editDiscount,
    editLink,
    editNotes,
    editOrganizationName,
    editProviderName,
    editReferralType,
    q,
    referralsHook,
  ]);

  const submitDelete = useCallback(async () => {
    if (!detailItem) return;
    setEditError(null);
    try {
      await referralsHook.remove(detailItem.id);
      await referralsHook.load({ q: q.trim() || undefined, limit: 50 }, true);
      setDetailId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to delete referral.");
    }
  }, [detailItem, q, referralsHook]);

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="pt-10 mb-6 px-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text className="text-5xl font-telma-bold text-app tracking-tight">
              Referrals
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Manage referral logs and partner links (web parity).
          </Text>
        </View>

        <View className="px-6 gap-4">
          <AdminCard>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <TextField
                  label="Search"
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search by athlete, tier, or provider…"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => referralsHook.load({ q: q.trim() || undefined, limit: 50 }, true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                className="h-12 w-12 rounded-2xl border items-center justify-center mt-6"
              >
                <Feather name="search" size={18} color={colors.accent} />
              </Pressable>
            </View>

            <View className="flex-row gap-3 mt-4">
              <Pressable
                accessibilityRole="button"
                onPress={() => setCreateOpen(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                className="flex-1 rounded-2xl border px-4 py-3 items-center justify-center"
              >
                <Text
                  className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider"
                  style={{ color: colors.accent }}
                >
                  New Referral
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/physio-referral")}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                className="flex-1 rounded-2xl border px-4 py-3 items-center justify-center"
              >
                <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider text-secondary">
                  Athlete View
                </Text>
              </Pressable>
            </View>

            {referralsHook.error ? (
              <Text selectable className="text-sm font-outfit text-red-400 mt-4">
                {referralsHook.error}
              </Text>
            ) : null}
          </AdminCard>

          {!canLoad ? (
            <AdminCard>
              <Text className="text-sm font-outfit text-secondary text-center py-4">
                Admin tools will load after auth bootstrap.
              </Text>
            </AdminCard>
          ) : referralsHook.loading && referralsHook.items.length === 0 ? (
            <AdminCard>
              <Text className="text-sm font-outfit text-secondary text-center py-4">
                Loading referrals…
              </Text>
            </AdminCard>
          ) : referralsHook.items.length === 0 ? (
            <AdminCard>
              <Text className="text-sm font-outfit text-secondary text-center py-4">
                No referrals found.
              </Text>
            </AdminCard>
          ) : (
            <View className="gap-3">
              {referralsHook.items.map((item) => {
                const typeLabel = resolveReferralType(item.metadata);
                const athleteLabel = String(item.athleteName ?? "Athlete").trim();
                const tierLabel = String(item.programTier ?? "").trim();
                return (
                  <Pressable
                    key={String(item.id)}
                    accessibilityRole="button"
                    onPress={() => setDetailId(item.id)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                  >
                    <AdminCard>
                      <View className="flex-row items-start">
                        <View className="flex-1 pr-3">
                          <View className="flex-row items-center gap-2 mb-1">
                            <View className="px-2.5 py-1 rounded-full border border-app/10 bg-card">
                              <Text className="text-[10px] font-outfit-bold text-secondary uppercase tracking-[1.1px]">
                                {typeLabel}
                              </Text>
                            </View>
                            {tierLabel ? (
                              <Text className="text-[11px] font-outfit text-secondary">
                                {tierLabel}
                              </Text>
                            ) : null}
                          </View>
                          <Text className="text-[16px] font-outfit-bold font-bold text-app tracking-tight">
                            {athleteLabel}
                          </Text>
                          <Text className="text-[12px] font-outfit text-secondary mt-1">
                            #{item.id}
                            {item.createdAt ? ` · ${formatIsoShort(item.createdAt)}` : ""}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="rgba(148,163,184,0.7)" />
                      </View>
                    </AdminCard>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* Create Modal */}
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
          <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View className="pt-8 px-6 mb-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-3xl font-clash text-app font-bold">New Referral</Text>
                <Pressable accessibilityRole="button" onPress={() => setCreateOpen(false)}>
                  <Text className="text-sm font-outfit-bold font-bold" style={{ color: colors.accent }}>
                    Close
                  </Text>
                </Pressable>
              </View>
              <Text className="text-sm font-outfit text-secondary mt-2">
                Create a referral for a single athlete (web-compatible API).
              </Text>
            </View>

            <View className="px-6 gap-4">
              <AdminCard>
                <TextField
                  label="Athlete search"
                  value={createAthleteSearch}
                  onChangeText={(next) => {
                    setCreateAthleteSearch(next);
                    setCreateError(null);
                  }}
                  placeholder="Type a name or email…"
                />
                <View className="flex-row gap-3 mt-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => searchAthletes(true)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                    className="flex-1 rounded-2xl border px-4 py-3 items-center justify-center"
                  >
                    <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider text-secondary">
                      Search
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setCreateAthleteSearch("");
                      setCreateAthleteOptions([]);
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                    className="flex-1 rounded-2xl border px-4 py-3 items-center justify-center"
                  >
                    <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider text-secondary">
                      Clear
                    </Text>
                  </Pressable>
                </View>

                {createAthleteOptions.length > 0 ? (
                  <View className="mt-4 gap-2">
                    <Text className="text-[12px] font-outfit text-secondary">
                      Select athlete
                    </Text>
                    <View className="gap-2">
                      {createAthleteOptions.slice(0, 6).map((u) => (
                        <Pressable
                          key={String(u.id)}
                          accessibilityRole="button"
                          onPress={() => {
                            setCreateAthleteId(String(u.id));
                            setCreateError(null);
                          }}
                          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                          className="rounded-2xl border px-4 py-3"
                        >
                          <Text className="text-[13px] font-outfit-semibold text-app" numberOfLines={1}>
                            #{u.id} {u.name ?? u.email ?? "User"}
                          </Text>
                          <Text className="text-[11px] font-outfit text-secondary" numberOfLines={1}>
                            {u.email ?? ""}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View className="mt-4">
                  <TextField
                    label="Athlete ID"
                    value={createAthleteId}
                    onChangeText={(next) => {
                      setCreateAthleteId(next);
                      setCreateError(null);
                    }}
                    placeholder="e.g. 123"
                  />
                </View>
              </AdminCard>

              <AdminCard>
                <TextField
                  label="Referral type"
                  value={createReferralType}
                  onChangeText={setCreateReferralType}
                  placeholder="Physio"
                />
                <View className="mt-4">
                  <TextField
                    label="Referral link"
                    value={createLink}
                    onChangeText={setCreateLink}
                    placeholder="https://…"
                  />
                </View>
                <View className="mt-4">
                  <TextField
                    label="Discount percent (optional)"
                    value={createDiscount}
                    onChangeText={setCreateDiscount}
                    placeholder="e.g. 10"
                  />
                </View>
              </AdminCard>

              <AdminCard>
                <TextField
                  label="Provider name (optional)"
                  value={createProviderName}
                  onChangeText={setCreateProviderName}
                  placeholder="e.g. Dr. Smith"
                />
                <View className="mt-4">
                  <TextField
                    label="Organization name (optional)"
                    value={createOrganizationName}
                    onChangeText={setCreateOrganizationName}
                    placeholder="e.g. Clinic Name"
                  />
                </View>
                <View className="mt-4">
                  <TextField
                    label="Notes (optional)"
                    value={createNotes}
                    onChangeText={setCreateNotes}
                    placeholder="Notes shown to the athlete…"
                    multiline
                  />
                </View>
                {createError ? (
                  <Text selectable className="text-sm font-outfit text-red-400 mt-4">
                    {createError}
                  </Text>
                ) : null}
                <View className="flex-row gap-3 mt-4">
                  <Pressable
                    accessibilityRole="button"
                    onPress={submitCreate}
                    disabled={referralsHook.mutatingId === -1}
                    style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                    className="flex-1 rounded-2xl border px-4 py-3 items-center justify-center"
                  >
                    <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider" style={{ color: colors.accent }}>
                      {referralsHook.mutatingId === -1 ? "Creating…" : "Create"}
                    </Text>
                  </Pressable>
                </View>
              </AdminCard>
            </View>
          </ThemedScrollView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailId != null} animationType="slide" onRequestClose={() => setDetailId(null)}>
        <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
          <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View className="pt-8 px-6 mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-3xl font-clash text-app font-bold" numberOfLines={1}>
                    {detailItem?.athleteName ?? "Referral"}
                  </Text>
                  <Text className="text-sm font-outfit text-secondary mt-1">
                    #{detailItem?.id}
                    {detailItem?.createdAt ? ` · ${formatIsoShort(detailItem.createdAt)}` : ""}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setDetailId(null)}>
                  <Text className="text-sm font-outfit-bold font-bold" style={{ color: colors.accent }}>
                    Close
                  </Text>
                </Pressable>
              </View>
            </View>

            {!detailItem ? (
              <View className="px-6">
                <AdminCard>
                  <Text className="text-sm font-outfit text-secondary text-center py-4">
                    Referral not found.
                  </Text>
                </AdminCard>
              </View>
            ) : (
              <View className="px-6 gap-4">
                <AdminCard>
                  <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-[1.2px] text-dim mb-3">
                    Edit
                  </Text>
                  <TextField
                    label="Referral type"
                    value={editReferralType}
                    onChangeText={setEditReferralType}
                  />
                  <View className="mt-4">
                    <TextField label="Referral link" value={editLink} onChangeText={setEditLink} />
                  </View>
                  <View className="mt-4">
                    <TextField
                      label="Discount percent (optional)"
                      value={editDiscount}
                      onChangeText={setEditDiscount}
                      placeholder="e.g. 10"
                    />
                  </View>
                  <View className="mt-4">
                    <TextField label="Provider name" value={editProviderName} onChangeText={setEditProviderName} />
                  </View>
                  <View className="mt-4">
                    <TextField label="Organization name" value={editOrganizationName} onChangeText={setEditOrganizationName} />
                  </View>
                  <View className="mt-4">
                    <TextField label="Notes" value={editNotes} onChangeText={setEditNotes} multiline />
                  </View>

                  {editError ? (
                    <Text selectable className="text-sm font-outfit text-red-400 mt-4">
                      {editError}
                    </Text>
                  ) : null}

                  <View className="flex-row gap-3 mt-4">
                    <Pressable
                      accessibilityRole="button"
                      onPress={submitUpdate}
                      disabled={referralsHook.mutatingId === detailItem.id}
                      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                      className="flex-1 rounded-2xl border px-4 py-3 items-center justify-center"
                    >
                      <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider" style={{ color: colors.accent }}>
                        {referralsHook.mutatingId === detailItem.id ? "Saving…" : "Save"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={submitDelete}
                      disabled={referralsHook.mutatingId === detailItem.id}
                      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                      className="flex-1 rounded-2xl border px-4 py-3 items-center justify-center"
                    >
                      <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider text-red-400">
                        {referralsHook.mutatingId === detailItem.id ? "Deleting…" : "Delete"}
                      </Text>
                    </Pressable>
                  </View>
                </AdminCard>
              </View>
            )}
          </ThemedScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
