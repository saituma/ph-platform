import React, { useState, useEffect, useMemo } from "react";
import { View, TouchableOpacity, TextInput, Modal, Platform, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import {
  defaultServicePatchJson,
  parseIntOrUndefined,
} from "@/lib/admin-utils";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";

import { useAdminTeams } from "@/hooks/admin/useAdminTeams";

interface Props {
  token: string | null;
  canLoad: boolean;
  initialAction?: "createService" | null;
}

// --- Internal Components ---

const SERVICE_TYPES = [
  { label: "1-to-1 session", value: "one_to_one" },
  { label: "Semi-private session", value: "semi_private" },
  { label: "In-person session", value: "in_person" },
];

const PROGRAM_TIERS = [
  { label: "PHP", value: "PHP" },
  { label: "PHP Pro", value: "PHP_Pro" },
  { label: "PHP Premium", value: "PHP_Premium" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
];

const TARGET_AUDIENCES = [
  { label: "All Clients", value: "all" },
  { label: "Youth Athletes", value: "youth" },
  { label: "Adult Athletes", value: "adult" },
];

const WEEKDAY_OPTIONS = [
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
  { label: "Sunday", value: "0" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const value = String(i).padStart(2, "0");
  return { label: value, value };
});

const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((value) => ({
  label: value,
  value,
}));

function getNextSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() + index);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      value: `${yyyy}-${mm}-${dd}`,
      label: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  });
}

function MultiSelect({
  label,
  values,
  onSelect,
  options,
}: {
  label: string;
  values: string[];
  onSelect: (val: string) => void;
  options: { label: string; value: string }[];
}) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    if (!values?.length) return "Select...";
    if (values.length === 1) {
      const found = options.find(o => o.value === values[0]);
      return found ? found.label : values[0];
    }
    return `${values.length} selected`;
  }, [options, values]);

  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className="rounded-[18px] border flex-row items-center justify-between px-5 h-14"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
        }}
      >
        <Text className="text-[16px] font-outfit text-app">{displayLabel}</Text>
        <Feather name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setOpen(false)}
        >
          <View 
            className="w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}
          >
            <View className="p-6 border-b border-app/5">
              <Text className="text-xl font-clash font-bold text-app">{label}</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.map((opt, i) => {
                const isSelected = values?.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      onSelect(opt.value);
                    }}
                    className="px-6 py-5 flex-row items-center justify-between border-b border-app/5"
                  >
                    <Text 
                      className={`text-[16px] ${isSelected ? 'font-outfit-bold text-accent' : 'font-outfit text-app'}`}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Feather name="check" size={20} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity 
              onPress={() => setOpen(false)}
              className="p-6 bg-accent items-center justify-center"
            >
              <Text className="text-white font-outfit-bold uppercase tracking-wider">Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Dropdown({
  label,
  value,
  onSelect,
  options,
}: {
  label: string;
  value: string;
  onSelect: (val: string) => void;
  options: { label: string; value: string }[];
}) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    const found = options.find(o => o.value === value);
    return found ? found.label : value || "Select...";
  }, [options, value]);

  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className="rounded-[18px] border flex-row items-center justify-between px-5 h-14"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
        }}
      >
        <Text className="text-[16px] font-outfit text-app">{displayLabel}</Text>
        <Feather name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setOpen(false)}
        >
          <View 
            className="w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}
          >
            <View className="p-6 border-b border-app/5">
              <Text className="text-xl font-clash font-bold text-app">{label}</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                    className="px-6 py-5 flex-row items-center justify-between border-b border-app/5"
                  >
                    <Text 
                      className={`text-[16px] ${isSelected ? 'font-outfit-bold text-accent' : 'font-outfit text-app'}`}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Feather name="check" size={20} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ServiceActionButton({ 
  label, 
  onPress, 
  tone = "accent", 
  icon 
}: { 
  label: string; 
  onPress: () => void; 
  tone?: "accent" | "neutral" | "danger" | "success";
  icon?: any;
}) {
  const { colors, isDark } = useAppTheme();
  
  const bg = tone === "accent" ? colors.accent : 
             tone === "success" ? "#22C55E" : 
             tone === "danger" ? "#EF4444" : 
             isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9";
             
  const textColor = (tone === "neutral" && !isDark) ? "#0F172A" : "#FFFFFF";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="h-12 px-6 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
      style={{ backgroundColor: bg }}
    >
      {icon && <Feather name={icon} size={16} color={textColor} />}
      <Text className="text-[14px] font-outfit-bold uppercase tracking-wider" style={{ color: textColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: any) {
  const { colors, isDark } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
        {label}
      </Text>
      <View 
        className="rounded-[18px] border px-5 justify-center"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
          borderColor: isFocused ? colors.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"),
          borderWidth: isFocused ? 2 : 1,
          minHeight: multiline ? 120 : 62,
          paddingVertical: multiline ? 16 : 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="text-[16px] font-outfit text-app"
          cursorColor={colors.accent}
        />
      </View>
    </View>
  );
}

export function AdminServicesSection({ token, canLoad, initialAction }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const servicesHook = useAdminServices(token, canLoad);
  const { teams, load: loadTeams } = useAdminTeams(token, canLoad);

  const [createOpen, setCreateOpen] = useState(false);
  const [serviceCreateName, setServiceCreateName] = useState("");
  const [serviceCreateType, setServiceCreateType] = useState("one_to_one");
  const [serviceCreateDurationMinutes, setServiceCreateDurationMinutes] = useState("60");
  const [serviceCreateDescription, setServiceCreateDescription] = useState("");
  const [serviceCreateCapacity, setServiceCreateCapacity] = useState("");
  const [serviceCreateIsBookable, setServiceCreateIsBookable] = useState(true);
  const [serviceCreateSchedule, setServiceCreateSchedule] = useState<"one_time" | "permanent">("one_time");
  const [serviceCreateWeekday, setServiceCreateWeekday] = useState("1");
  const [serviceCreateWeekHour, setServiceCreateWeekHour] = useState("09");
  const [serviceCreateWeekMinute, setServiceCreateWeekMinute] = useState("00");
  const [serviceCreateOneTimeDate, setServiceCreateOneTimeDate] = useState(
    () => getNextSevenDays()[0]?.value ?? "",
  );
  const [serviceCreateOneTimeHour, setServiceCreateOneTimeHour] = useState("09");
  const [serviceCreateOneTimeMinute, setServiceCreateOneTimeMinute] = useState("00");
  const [serviceCreateEligiblePlans, setServiceCreateEligiblePlans] = useState<string[]>([]);
  const [serviceCreateEligibleTargets, setServiceCreateEligibleTargets] = useState<string[]>([]);

  const [serviceDetailOpenId, setServiceDetailOpenId] = useState<number | null>(null);
  const [serviceEditName, setServiceEditName] = useState("");
  const [serviceEditType, setServiceEditType] = useState("one_to_one");
  const [serviceEditDurationMinutes, setServiceEditDurationMinutes] = useState("30");
  const [serviceEditDescription, setServiceEditDescription] = useState("");
  const [serviceEditIsActive, setServiceEditIsActive] = useState(true);
  const [serviceEditCapacity, setServiceEditCapacity] = useState("");
  const [serviceEditEligiblePlans, setServiceEditEligiblePlans] = useState<string[]>([]);
  const [serviceEditEligibleTargets, setServiceEditEligibleTargets] = useState<string[]>([]);

  useEffect(() => {
    if (canLoad) {
      servicesHook.loadServices(false);
      loadTeams(false);
    }
  }, [canLoad]);

  useEffect(() => {
    if (initialAction === "createService") {
      setCreateOpen(true);
    }
  }, [initialAction]);

  const teamOptions = useMemo(() => {
    return teams.map(t => ({ label: `Team: ${t.team}`, value: `team:${t.id}` }));
  }, [teams]);

  const combinedTargetOptions = useMemo(() => {
    return [...TARGET_AUDIENCES, ...teamOptions];
  }, [teamOptions]);

  useEffect(() => {
    if (!serviceDetailOpenId) return;
    const svc = servicesHook.services.find((s) => s.id === serviceDetailOpenId);
    if (!svc) return;
    setServiceEditName(String(svc.name ?? ""));
    setServiceEditType(String(svc.type ?? "one_to_one"));
    setServiceEditDurationMinutes(String(svc.durationMinutes ?? 30));
    setServiceEditDescription(svc.description ?? "");
    setServiceEditIsActive(svc.isActive !== false);
    setServiceEditCapacity(String(svc.capacity ?? ""));
    setServiceEditEligiblePlans(Array.isArray(svc.eligiblePlans) ? svc.eligiblePlans : []);
    setServiceEditEligibleTargets(Array.isArray(svc.eligibleTargets) ? svc.eligibleTargets : []);
  }, [serviceDetailOpenId, servicesHook.services]);

  const handleCreate = async () => {
    try {
      const schedulePayload =
        serviceCreateSchedule === "permanent"
          ? {
              schedulePattern: "weekly_recurring",
              weeklyEntries: [
                {
                  weekday: Number(serviceCreateWeekday),
                  time: `${serviceCreateWeekHour}:${serviceCreateWeekMinute}`,
                },
              ],
              oneTimeDate: null,
              oneTimeTime: null,
            }
          : {
              schedulePattern: "one_time",
              weeklyEntries: [],
              oneTimeDate: serviceCreateOneTimeDate || null,
              oneTimeTime: serviceCreateOneTimeDate
                ? `${serviceCreateOneTimeHour}:${serviceCreateOneTimeMinute}`
                : null,
            };
      await servicesHook.createServiceType({
        name: serviceCreateName,
        type: serviceCreateIsBookable ? serviceCreateType : null,
        durationMinutes: serviceCreateDurationMinutes,
        description: serviceCreateDescription,
        capacity: serviceCreateCapacity,
        totalSlots: serviceCreateCapacity,
        eligiblePlans: serviceCreateEligiblePlans,
        eligibleTargets: serviceCreateEligibleTargets,
        isActive: true,
        isBookable: serviceCreateIsBookable,
        ...schedulePayload,
        slotMode: "shared_capacity",
        slotIntervalMinutes: null,
        slotDefinitions: [],
      });
      setCreateOpen(false);
      setServiceCreateName("");
      setServiceCreateType("one_to_one");
      setServiceCreateDurationMinutes("60");
      setServiceCreateDescription("");
      setServiceCreateCapacity("");
      setServiceCreateIsBookable(true);
      setServiceCreateSchedule("one_time");
      setServiceCreateWeekday("1");
      setServiceCreateWeekHour("09");
      setServiceCreateWeekMinute("00");
      setServiceCreateOneTimeDate(getNextSevenDays()[0]?.value ?? "");
      setServiceCreateOneTimeHour("09");
      setServiceCreateOneTimeMinute("00");
      setServiceCreateEligiblePlans([]);
      setServiceCreateEligibleTargets([]);
    } catch (e) {}
  };

  const handleUpdate = async () => {
    if (!serviceDetailOpenId) return;
    try {
      await servicesHook.updateServiceType(serviceDetailOpenId, {
        name: serviceEditName,
        type: serviceEditType,
        durationMinutes: parseInt(serviceEditDurationMinutes),
        description: serviceEditDescription,
        isActive: serviceEditIsActive,
        capacity: parseIntOrUndefined(serviceEditCapacity),
        eligiblePlans: serviceEditEligiblePlans,
        eligibleTargets: serviceEditEligibleTargets,
      });
      setServiceDetailOpenId(null);
    } catch (e) {}
  };

  const handleToggleActive = async (service: any) => {
    try {
      await servicesHook.updateServiceType(service.id, {
        isActive: !(service.isActive ?? true),
      });
    } catch (e) {}
  };

  return (
    <View className="px-6">
      <View className="mb-8">
        <Text className="text-2xl font-clash font-bold text-app mb-2">Services</Text>
        <Text className="text-sm font-outfit text-textSecondary leading-relaxed mb-6">
          See every bookable session type, edit details, and control visibility.
        </Text>
        <ServiceActionButton 
          label="Add Service" 
          onPress={() => setCreateOpen(true)} 
          icon="plus" 
          tone="accent" 
        />
      </View>

      {servicesHook.servicesLoading && servicesHook.services.length === 0 ? (
        <View className="gap-4">
          <Skeleton width="100%" height={100} borderRadius={24} />
          <Skeleton width="100%" height={100} borderRadius={24} />
        </View>
      ) : (
        <View className="gap-4 pb-20">
          {servicesHook.services.map((s) => (
            <View 
              key={s.id}
              className="rounded-[32px] border p-6"
              style={{
                backgroundColor: isDark ? colors.cardElevated : colors.card,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                ...Shadows.sm
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1 mr-4">
                  <Text className="text-lg font-clash font-bold text-app" numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View className="flex-row flex-wrap items-center gap-2 mt-1">
                    {s.isBookable === false ? (
                      <View className="px-2 py-1 rounded-lg bg-secondary/10 border border-app/10">
                        <Text className="text-[10px] font-outfit-bold text-textSecondary uppercase tracking-wider">
                          Non-bookable
                        </Text>
                      </View>
                    ) : null}
                    <Text className="text-xs font-outfit text-textSecondary uppercase tracking-wider">
                      {s.type ? s.type.replace(/_/g, " ") : "Schedule item"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => handleToggleActive(s)}
                  className={`px-3 py-1.5 rounded-full border ${s.isActive !== false ? 'bg-success/10 border-success/20' : 'bg-secondary/10 border-app/10'}`}
                >
                  <Text className={`text-[10px] font-outfit-bold uppercase tracking-widest ${s.isActive !== false ? 'text-success' : 'text-textSecondary'}`}>
                    {s.isActive !== false ? 'On' : 'Off'}
                  </Text>
                </TouchableOpacity>
              </View>

              {s.description ? (
                <Text className="text-sm font-outfit text-textSecondary mb-4 leading-relaxed" numberOfLines={2}>
                  {s.description}
                </Text>
              ) : null}

              <View className="flex-row items-center gap-4 mb-6">
                <View className="flex-row items-center gap-1.5 bg-secondary/5 px-3 py-2 rounded-xl">
                  <Feather name="clock" size={12} color={colors.accent} />
                  <Text className="text-xs font-outfit-bold text-app">{s.durationMinutes}m</Text>
                </View>
                <View className="flex-row items-center gap-1.5 bg-secondary/5 px-3 py-2 rounded-xl">
                  <Feather name="users" size={12} color={colors.accent} />
                  <Text className="text-xs font-outfit-bold text-app">
                    {s.totalSlots != null
                      ? `${s.remainingTotalSlots ?? "—"} / ${s.totalSlots} slots`
                      : s.capacity != null
                        ? `${s.capacity} capacity`
                        : "Unlimited"}
                  </Text>
                </View>
              </View>
              <Text className="text-[10px] font-outfit text-textSecondary uppercase tracking-wider mb-5" numberOfLines={2}>
                Target: {s.eligibleTargets?.length ? s.eligibleTargets.join(", ") : "All"} · Tier: {s.eligiblePlans?.length ? s.eligiblePlans.join(", ") : s.programTier ?? "All"}
              </Text>

              <View className="flex-row gap-3">
                <TouchableOpacity 
                  onPress={() => setServiceDetailOpenId(s.id)}
                  className="flex-1 h-11 rounded-xl bg-secondary/10 items-center justify-center flex-row gap-2"
                >
                  <Feather name="edit-2" size={14} color={colors.text} />
                  <Text className="text-xs font-outfit-bold text-app uppercase tracking-wider">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => servicesHook.deleteServiceType(s.id)}
                  className="flex-1 h-11 rounded-xl bg-red-500/10 items-center justify-center flex-row gap-2"
                >
                  <Feather name="trash-2" size={14} color="#EF4444" />
                  <Text className="text-xs font-outfit-bold text-red-400 uppercase tracking-wider">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* CREATE MODAL */}
      <Modal visible={createOpen} animationType="slide">
        <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
          <View className="px-6 py-6 flex-row items-center justify-between border-b border-app/5">
            <Text className="text-2xl font-clash font-bold text-app">New Service</Text>
            <TouchableOpacity onPress={() => setCreateOpen(false)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ThemedScrollView className="p-6">
            <FormField label="Service Name" value={serviceCreateName} onChangeText={setServiceCreateName} placeholder="e.g. 1:1 Session" />
            <FormField label="Description" value={serviceCreateDescription} onChangeText={setServiceCreateDescription} placeholder="Describe the session..." multiline />
            <View className="mb-6">
              <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
                Booking Mode
              </Text>
              <View className="flex-row gap-3">
                {[
                  { label: "Bookable", value: true, detail: "Clients can request" },
                  { label: "Non-bookable", value: false, detail: "Visible only" },
                ].map((item) => {
                  const active = serviceCreateIsBookable === item.value;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => setServiceCreateIsBookable(item.value)}
                      className="flex-1 rounded-[18px] border p-4"
                      style={{
                        backgroundColor: active ? `${colors.accent}16` : isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
                        borderColor: active ? `${colors.accent}45` : isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
                      }}
                    >
                      <Text className="text-[14px] font-outfit-bold text-app">{item.label}</Text>
                      <Text className="text-[11px] font-outfit text-textSecondary mt-1">{item.detail}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {serviceCreateIsBookable ? (
              <Dropdown label="Service Type" value={serviceCreateType} onSelect={setServiceCreateType} options={SERVICE_TYPES} />
            ) : null}
            <FormField label="Duration (Minutes)" value={serviceCreateDurationMinutes} onChangeText={setServiceCreateDurationMinutes} keyboardType="numeric" />
            {serviceCreateIsBookable ? (
              <FormField label="Slots Available" value={serviceCreateCapacity} onChangeText={setServiceCreateCapacity} keyboardType="numeric" placeholder="Leave empty for unlimited" />
            ) : null}

            <View className="mb-6 rounded-[24px] border p-5" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF" }}>
              <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3">
                Schedule
              </Text>
              <View className="flex-row gap-3 mb-5">
                {[
                  { label: "Temporary", value: "one_time" as const },
                  { label: "Permanent", value: "permanent" as const },
                ].map((item) => {
                  const active = serviceCreateSchedule === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setServiceCreateSchedule(item.value)}
                      className="flex-1 h-11 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: active ? colors.accent : isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" }}
                    >
                      <Text className="text-xs font-outfit-bold uppercase tracking-wider" style={{ color: active ? colors.textInverse : colors.textSecondary }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {serviceCreateSchedule === "permanent" ? (
                <>
                  <Dropdown label="Day of Week" value={serviceCreateWeekday} onSelect={setServiceCreateWeekday} options={WEEKDAY_OPTIONS} />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Dropdown label="Hour" value={serviceCreateWeekHour} onSelect={setServiceCreateWeekHour} options={HOUR_OPTIONS} />
                    </View>
                    <View className="flex-1">
                      <Dropdown label="Minute" value={serviceCreateWeekMinute} onSelect={setServiceCreateWeekMinute} options={MINUTE_OPTIONS} />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Dropdown label="Date" value={serviceCreateOneTimeDate} onSelect={setServiceCreateOneTimeDate} options={getNextSevenDays()} />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Dropdown label="Hour" value={serviceCreateOneTimeHour} onSelect={setServiceCreateOneTimeHour} options={HOUR_OPTIONS} />
                    </View>
                    <View className="flex-1">
                      <Dropdown label="Minute" value={serviceCreateOneTimeMinute} onSelect={setServiceCreateOneTimeMinute} options={MINUTE_OPTIONS} />
                    </View>
                  </View>
                </>
              )}
            </View>
            
            <MultiSelect 
              label="Eligible Tiers" 
              values={serviceCreateEligiblePlans} 
              onSelect={(val) => {
                setServiceCreateEligiblePlans(prev => 
                  prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
                );
              }}
              options={PROGRAM_TIERS}
            />

            <MultiSelect 
              label="Target Audience" 
              values={serviceCreateEligibleTargets} 
              onSelect={(val) => {
                setServiceCreateEligibleTargets(prev => 
                  prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
                );
              }}
              options={combinedTargetOptions}
            />
            
            <View className="mt-4">
              <ServiceActionButton label="Create Service" onPress={handleCreate} tone="accent" />
            </View>
          </ThemedScrollView>
        </SafeAreaView>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={serviceDetailOpenId !== null} animationType="slide">
        <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
          <View className="px-6 py-6 flex-row items-center justify-between border-b border-app/5">
            <Text className="text-2xl font-clash font-bold text-app">Edit Service</Text>
            <TouchableOpacity onPress={() => setServiceDetailOpenId(null)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ThemedScrollView className="p-6">
            <FormField label="Service Name" value={serviceEditName} onChangeText={setServiceEditName} />
            <FormField label="Description" value={serviceEditDescription} onChangeText={setServiceEditDescription} placeholder="Describe the session..." multiline />
            <Dropdown label="Service Type" value={serviceEditType} onSelect={setServiceEditType} options={SERVICE_TYPES} />
            <FormField label="Duration (Minutes)" value={serviceEditDurationMinutes} onChangeText={setServiceEditDurationMinutes} keyboardType="numeric" />
            <FormField label="Slots (Capacity)" value={serviceEditCapacity} onChangeText={setServiceEditCapacity} keyboardType="numeric" placeholder="Leave empty for unlimited" />

            <MultiSelect 
              label="Eligible Tiers" 
              values={serviceEditEligiblePlans} 
              onSelect={(val) => {
                setServiceEditEligiblePlans(prev => 
                  prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
                );
              }}
              options={PROGRAM_TIERS}
            />

            <MultiSelect 
              label="Target Audience" 
              values={serviceEditEligibleTargets} 
              onSelect={(val) => {
                setServiceEditEligibleTargets(prev => 
                  prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
                );
              }}
              options={combinedTargetOptions}
            />
            
            <View className="flex-row items-center justify-between mb-8 p-4 rounded-2xl bg-secondary/5">
              <Text className="font-outfit-bold text-app uppercase tracking-wider text-xs">Service Active</Text>
              <TouchableOpacity 
                onPress={() => setServiceEditIsActive(!serviceEditIsActive)}
                className={`w-14 h-8 rounded-full items-center justify-center ${serviceEditIsActive ? 'bg-success' : 'bg-secondary/20'}`}
              >
                <View className={`w-6 h-6 rounded-full bg-white shadow-sm self-${serviceEditIsActive ? 'end' : 'start'} mx-1`} />
              </TouchableOpacity>
            </View>

            <ServiceActionButton label="Save Changes" onPress={handleUpdate} tone="accent" />
          </ThemedScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
