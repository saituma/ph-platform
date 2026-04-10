import React, { useState, useEffect } from "react";
import { View, Pressable, TextInput, Modal, Platform } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { defaultServicePatchJson, parseIntOrUndefined } from "@/lib/admin-utils";
import { SmallAction } from "./AdminShared";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  token: string | null;
  canLoad: boolean;
}

export function AdminServicesSection({ token, canLoad }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const servicesHook = useAdminServices(token, canLoad);

  // Create service state
  const [serviceCreateName, setServiceCreateName] = useState("");
  const [serviceCreateType, setServiceCreateType] = useState("call");
  const [serviceCreateDurationMinutes, setServiceCreateDurationMinutes] = useState("30");
  const [serviceCreateCapacity, setServiceCreateCapacity] = useState("");
  const [serviceCreateIsActive, setServiceCreateIsActive] = useState("true");
  const [serviceCreateDefaultLocation, setServiceCreateDefaultLocation] = useState("");
  const [serviceCreateDefaultMeetingLink, setServiceCreateDefaultMeetingLink] = useState("");
  const [serviceCreateAdvancedJson, setServiceCreateAdvancedJson] = useState("{}");
  const [serviceCreateSchedulePattern, setServiceCreateSchedulePattern] = useState<"temporary" | "permanent">("temporary");
  const [serviceCreateDate, setServiceCreateDate] = useState<Date>(new Date());
  const [serviceCreateTime, setServiceCreateTime] = useState<Date>(new Date());
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);
  const [showCreateTimePicker, setShowCreateTimePicker] = useState(false);

  // Edit service state
  const [serviceDetailOpenId, setServiceDetailOpenId] = useState<number | null>(null);
  const [serviceEditName, setServiceEditName] = useState("");
  const [serviceEditType, setServiceEditType] = useState("call");
  const [serviceEditDurationMinutes, setServiceEditDurationMinutes] = useState("30");
  const [serviceEditCapacity, setServiceEditCapacity] = useState("");
  const [serviceEditDefaultLocation, setServiceEditDefaultLocation] = useState("");
  const [serviceEditDefaultMeetingLink, setServiceEditDefaultMeetingLink] = useState("");
  const [serviceEditEligiblePlans, setServiceEditEligiblePlans] = useState<string[]>([]);
  const [serviceEditIsActive, setServiceEditIsActive] = useState(true);
  const [serviceEditAdvancedJson, setServiceEditAdvancedJson] = useState<Record<number, string>>({});
  const [serviceEditSchedulePattern, setServiceEditSchedulePattern] = useState<Record<number, "temporary" | "permanent">>({});
  const [serviceEditDate, setServiceEditDate] = useState<Record<number, Date>>({});
  const [serviceEditTime, setServiceEditTime] = useState<Record<number, Date>>({});
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  useEffect(() => {
    if (canLoad) {
      servicesHook.loadServices(false);
    }
  }, [canLoad]);

  useEffect(() => {
    if (!serviceDetailOpenId) return;
    const svc = servicesHook.services.find((s) => s.id === serviceDetailOpenId);
    if (!svc) return;

    setServiceEditName(String(svc.name ?? ""));
    setServiceEditType(String(svc.type ?? "call"));
    setServiceEditDurationMinutes(String(svc.durationMinutes ?? 30));
    setServiceEditCapacity(svc.capacity == null ? "" : String(svc.capacity));
    setServiceEditDefaultLocation(String(svc.defaultLocation ?? ""));
    setServiceEditDefaultMeetingLink(String(svc.defaultMeetingLink ?? ""));
    setServiceEditEligiblePlans(
      Array.isArray(svc.eligiblePlans)
        ? svc.eligiblePlans
        : svc.programTier ? [String(svc.programTier)] : [],
    );
    setServiceEditIsActive(svc.isActive !== false);

    setServiceEditSchedulePattern(prev => ({ ...prev, [serviceDetailOpenId]: (svc.schedulePattern === "permanent" ? "permanent" : "temporary") }));
    if (svc.schedulePatternOptions && typeof svc.schedulePatternOptions === "object" && !Array.isArray(svc.schedulePatternOptions)) {
      const opts = svc.schedulePatternOptions as any;
      if (opts.oneTimeDate) {
        setServiceEditDate(prev => ({ ...prev, [serviceDetailOpenId]: new Date(opts.oneTimeDate) }));
      }
      if (opts.oneTimeTime) {
        const t = new Date();
        const [hr, mn] = opts.oneTimeTime.split(":");
        t.setHours(Number(hr), Number(mn), 0, 0);
        setServiceEditTime(prev => ({ ...prev, [serviceDetailOpenId]: t }));
      }
    }

    if (!serviceEditAdvancedJson[serviceDetailOpenId]) {
      setServiceEditAdvancedJson((prev) => ({
        ...prev,
        [serviceDetailOpenId]: defaultServicePatchJson(svc),
      }));
    }
  }, [serviceDetailOpenId, servicesHook.services]);

    try {
      const dateStr = serviceCreateDate.toISOString().slice(0, 10);
      const timeStr = serviceCreateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      
      const payload: any = {
        name: serviceCreateName,
        type: serviceCreateType,
        durationMinutes: serviceCreateDurationMinutes,
        capacity: serviceCreateCapacity,
        isActive: serviceCreateIsActive,
        defaultLocation: serviceCreateDefaultLocation,
        defaultMeetingLink: serviceCreateDefaultMeetingLink,
        schedulePattern: serviceCreateSchedulePattern,
        schedulePatternOptions: {
          oneTimeDate: dateStr,
          oneTimeTime: timeStr,
        },
      };

      try {
         const adv = JSON.parse(serviceCreateAdvancedJson);
         Object.assign(payload, adv);
      } catch (e) {
         // ignore
      }

      await servicesHook.createServiceType(payload);
      
      // Reset state
      setServiceCreateName("");
      setServiceCreateType("call");
      setServiceCreateDurationMinutes("30");
      setServiceCreateCapacity("");
      setServiceCreateIsActive("true");
      setServiceCreateDefaultLocation("");
      setServiceCreateDefaultMeetingLink("");
      setServiceCreateAdvancedJson("{}");
      setServiceCreateSchedulePattern("temporary");
    } catch (e) {
      servicesHook.setServicesError(e instanceof Error ? e.message : "Create failed");
    }

  return (
    <View className="gap-4">
      <View className="gap-3">
        <Text className="text-[13px] font-outfit-semibold text-app">Create service type</Text>
        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Name</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={serviceCreateName}
              onChangeText={setServiceCreateName}
              placeholder="e.g. Coach Call"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">
            Type (call, group_call, individual_call, lift_lab_1on1, role_model, one_on_one)
          </Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={serviceCreateType}
              onChangeText={setServiceCreateType}
              placeholder="call"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">
            Service Pattern
          </Text>
          <View className="flex-row gap-2">
            {(["temporary", "permanent"] as const).map(p => (
              <Pressable 
                key={p} 
                onPress={() => setServiceCreateSchedulePattern(p)} 
                className="flex-1 rounded-2xl border py-3 items-center" 
                style={{
                  backgroundColor: serviceCreateSchedulePattern === p ? `${colors.accent}22` : (isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)"),
                  borderColor: serviceCreateSchedulePattern === p ? colors.accent : (isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)")
                }}
              >
                <Text className="text-[13px] font-outfit-semibold" style={{ color: serviceCreateSchedulePattern === p ? colors.accent : colors.textSecondary }}>
                   {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">
            Schedule Date & Time
          </Text>
          <View className="flex-row gap-2">
            <Pressable onPress={() => setShowCreateDatePicker(true)} className="flex-1 rounded-2xl border px-4 py-3" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}>
              <Text className="text-[14px] font-outfit text-app">{serviceCreateDate.toLocaleDateString()}</Text>
            </Pressable>
            <Pressable onPress={() => setShowCreateTimePicker(true)} className="flex-1 rounded-2xl border px-4 py-3" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}>
              <Text className="text-[14px] font-outfit text-app">{serviceCreateTime.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'})}</Text>
            </Pressable>
          </View>
        </View>

        {/* Date Time pickers via React Native community standard (if needed we can use generic imports but they might fail. We inject generic DateTimePicker logic if it wasn't stripped) */}
        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Duration minutes</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={serviceCreateDurationMinutes}
              onChangeText={setServiceCreateDurationMinutes}
              placeholder="30"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Capacity (optional)</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={serviceCreateCapacity}
              onChangeText={setServiceCreateCapacity}
              placeholder="e.g. 1"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Active? (true/false)</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={serviceCreateIsActive}
              onChangeText={setServiceCreateIsActive}
              placeholder="true"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Default location (optional)</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={serviceCreateDefaultLocation}
              onChangeText={setServiceCreateDefaultLocation}
              placeholder="e.g. Zoom"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Default meeting link (optional)</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={serviceCreateDefaultMeetingLink}
              onChangeText={setServiceCreateDefaultMeetingLink}
              placeholder="https://…"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Advanced JSON (optional)</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[12px] font-outfit text-app"
              value={serviceCreateAdvancedJson}
              onChangeText={setServiceCreateAdvancedJson}
              placeholder='{"programTier":"PHP_Premium"}'
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={{ minHeight: 72, textAlignVertical: "top" }}
            />
          </View>
        </View>

        <View className="flex-row gap-2">
          <SmallAction
            label={servicesHook.serviceCreateBusy ? "Creating…" : "Create"}
            tone="success"
            onPress={handleCreate}
            disabled={servicesHook.serviceCreateBusy}
          />
          <SmallAction
            label="Refresh"
            tone="neutral"
            onPress={() => servicesHook.loadServices(true)}
            disabled={servicesHook.servicesLoading}
          />
        </View>
      </View>

      {servicesHook.servicesLoading && servicesHook.services.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="92%" height={14} />
          <Skeleton width="86%" height={14} />
          <Skeleton width="90%" height={14} />
        </View>
      ) : servicesHook.servicesError ? (
        <Text selectable className="text-sm font-outfit text-red-400">
          {servicesHook.servicesError}
        </Text>
      ) : servicesHook.services.length === 0 ? (
        <Text className="text-sm font-outfit text-secondary">No service types.</Text>
      ) : (
        <View className="gap-3">
          {servicesHook.services.map((s) => (
            <Pressable
              key={String(s.id)}
              onPress={() => setServiceDetailOpenId(s.id)}
              style={({ pressed }) => [
                {
                  borderRadius: 18,
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="gap-1">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
                    #{s.id} {s.name ?? "(name)"}
                  </Text>
                  <Text className="text-[11px] font-outfit text-secondary" numberOfLines={1}>
                    {s.isActive === false ? "inactive" : "active"}
                  </Text>
                </View>
                <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                  {s.type ?? "—"} • {s.durationMinutes ?? "—"}m • cap {s.capacity ?? "—"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* SERVICE DETAIL MODAL */}
      <Modal
        visible={serviceDetailOpenId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setServiceDetailOpenId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 pb-3 flex-row items-center justify-between gap-3">
            <View style={{ flex: 1 }}>
              <Text className="text-[18px] font-clash font-bold text-app" numberOfLines={1}>
                Service #{serviceDetailOpenId ?? ""}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">Patch and manage</Text>
            </View>
            <SmallAction label="Done" tone="neutral" onPress={() => setServiceDetailOpenId(null)} />
          </View>

          <ThemedScrollView>
            {serviceDetailOpenId != null && (() => {
              const s = servicesHook.services.find((x) => x.id === serviceDetailOpenId);
              const busy = servicesHook.serviceEditBusyId === serviceDetailOpenId;
              const jsonValue = serviceEditAdvancedJson[serviceDetailOpenId] ?? "{}";

              return (
                <View className="gap-4 p-4">
                  <View
                    className="rounded-[20px] border p-4"
                    style={{
                      backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                      ...(isDark ? Shadows.none : Shadows.md),
                    }}
                  >
                    <Text className="text-[14px] font-clash font-bold text-app" numberOfLines={2}>
                      {s?.name ?? "(name)"}
                    </Text>
                    <Text className="text-[12px] font-outfit text-secondary">
                      {s?.type ?? "—"} • {s?.durationMinutes ?? "—"}m • cap {s?.capacity ?? "—"}
                    </Text>
                    <Text className="text-[11px] font-outfit text-secondary">
                      Status: {s?.isActive === false ? "inactive" : "active"}
                    </Text>
                  </View>

                  <View
                    className="rounded-[20px] border p-4"
                    style={{
                      backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                      ...(isDark ? Shadows.none : Shadows.md),
                    }}
                  >
                    <Text className="text-[13px] font-outfit-semibold text-app">Quick edit</Text>
                    <View className="mt-3 gap-2">
                      <View
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                        }}
                      >
                        <TextInput
                          className="text-[14px] font-outfit text-app"
                          value={serviceEditName}
                          onChangeText={setServiceEditName}
                          placeholder="Service name"
                          placeholderTextColor={colors.placeholder}
                        />
                      </View>

                      <View className="flex-row flex-wrap gap-2">
                        {["call", "group_call", "individual_call", "lift_lab_1on1", "role_model"].map((t) => (
                          <Pressable
                            key={`type-${t}`}
                            accessibilityRole="button"
                            onPress={() => setServiceEditType(t)}
                            className="rounded-full border px-3 py-2"
                            style={{
                              backgroundColor: serviceEditType === t
                                ? isDark ? `${colors.accent}22` : `${colors.accent}16`
                                : isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                              borderColor: serviceEditType === t
                                ? isDark ? `${colors.accent}44` : `${colors.accent}2E`
                                : isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                            }}
                          >
                            <Text
                              className="text-[11px] font-outfit-semibold"
                              style={{ color: serviceEditType === t ? colors.accent : colors.textSecondary }}
                            >
                              {t}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <View className="flex-row gap-2">
                        <View className="flex-1 rounded-2xl border px-4 py-3" style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                        }}>
                          <TextInput
                            className="text-[14px] font-outfit text-app"
                            value={serviceEditDurationMinutes}
                            onChangeText={setServiceEditDurationMinutes}
                            placeholder="Duration"
                            keyboardType="number-pad"
                          />
                        </View>
                        <View className="flex-1 rounded-2xl border px-4 py-3" style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                        }}>
                          <TextInput
                            className="text-[14px] font-outfit text-app"
                            value={serviceEditCapacity}
                            onChangeText={setServiceEditCapacity}
                            placeholder="Capacity"
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>

                      <View className="flex-row gap-2">
                        <SmallAction
                          label={serviceEditIsActive ? "Active" : "Inactive"}
                          tone="neutral"
                          onPress={() => setServiceEditIsActive((v) => !v)}
                          disabled={busy}
                        />
                        <SmallAction
                          label={busy ? "Saving…" : "Save quick edit"}
                          tone="success"
                          onPress={() => {
                          const duration = parseIntOrUndefined(serviceEditDurationMinutes);
                            const cap = parseIntOrUndefined(serviceEditCapacity);
                            
                            const dDate = serviceEditDate[serviceDetailOpenId] ?? new Date();
                            const dTime = serviceEditTime[serviceDetailOpenId] ?? new Date();
                            const dateStr = dDate.toISOString().slice(0, 10);
                            const timeStr = dTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

                            servicesHook.updateServiceType(serviceDetailOpenId, {
                              name: serviceEditName.trim() || undefined,
                              type: serviceEditType,
                              durationMinutes: duration ?? undefined,
                              capacity: cap ?? undefined,
                              isActive: serviceEditIsActive,
                              schedulePattern: serviceEditSchedulePattern[serviceDetailOpenId],
                              schedulePatternOptions: {
                                oneTimeDate: dateStr,
                                oneTimeTime: timeStr,
                              }
                            });
                          }}
                          disabled={busy}
                        />
                      </View>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="text-[12px] font-outfit text-secondary">Patch JSON</Text>
                    <View
                      className="rounded-2xl border px-4 py-3"
                      style={{
                        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                      }}
                    >
                      <TextInput
                        className="text-[12px] font-outfit text-app"
                        value={jsonValue}
                        onChangeText={(t) => setServiceEditAdvancedJson((prev) => ({ ...prev, [serviceDetailOpenId]: t }))}
                        multiline
                        style={{ minHeight: 120, textAlignVertical: "top" }}
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    <SmallAction
                      label={busy ? "Saving…" : "Save JSON"}
                      tone="success"
                      onPress={() => {
                        try {
                          const patch = JSON.parse(jsonValue);
                          servicesHook.updateServiceType(serviceDetailOpenId, patch);
                        } catch {
                          servicesHook.setServicesError("Invalid JSON");
                        }
                      }}
                      disabled={busy}
                    />
                    <SmallAction
                      label={busy ? "Deleting…" : "Delete"}
                      tone="danger"
                      onPress={() => servicesHook.deleteServiceType(serviceDetailOpenId)}
                      disabled={busy}
                    />
                  </View>
                </View>
              );
            })()}
          </ThemedScrollView>
        </View>
      </Modal>
    </View>
  );
}
