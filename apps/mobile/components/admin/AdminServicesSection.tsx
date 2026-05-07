import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAdminPastel } from "@/components/admin/AdminUI";
import {
  defaultServicePatchJson,
  parseIntOrUndefined,
} from "@/lib/admin-utils";
import { useAdminServices } from "@/hooks/admin/useAdminServices";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import {
  Check,
  ChevronDown,
  Clock,
  Edit2,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react-native";

import { useAdminTeams } from "@/hooks/admin/useAdminTeams";

interface Props {
  token: string | null;
  canLoad: boolean;
  initialAction?: "createService" | null;
}

// --- Constants ---

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

const MINUTE_OPTIONS = [
  "00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55",
].map((value) => ({
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

// --- Pastel card color cycling ---
const CARD_COLORS = ["cardSage", "cardPeach", "cardLavender", "cardMint"] as const;

// --- Internal Components ---

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
  const p = useAdminPastel();
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    if (!values?.length) return "Select...";
    if (values.length === 1) {
      const found = options.find((o) => o.value === values[0]);
      return found ? found.label : values[0];
    }
    return `${values.length} selected`;
  }, [options, values]);

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Outfit-Bold",
          color: p.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 12,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={{
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          height: 56,
          backgroundColor: p.inputBg,
          borderWidth: 1,
          borderColor: p.inputBorder,
        }}
      >
        <Text style={{ fontSize: 16, fontFamily: "Outfit", color: p.textPrimary }}>
          {displayLabel}
        </Text>
        <ChevronDown size={20} color={p.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: p.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: p.cardWhite,
              shadowColor: p.shadowMd, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
            }}
          >
            <View
              style={{
                padding: 24,
                borderBottomWidth: 1,
                borderBottomColor: p.divider,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Outfit-Bold",
                  color: p.textPrimary,
                }}
              >
                {label}
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.map((opt, i) => {
                const isSelected = values?.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onSelect(opt.value)}
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottomWidth: 1,
                      borderBottomColor: p.divider,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: isSelected ? "Outfit-Bold" : "Outfit",
                        color: isSelected ? p.accent : p.textPrimary,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={20} color={p.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={{
                padding: 24,
                backgroundColor: p.buttonPrimary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: p.buttonPrimaryText,
                  fontFamily: "Outfit-Bold",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Done
              </Text>
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
  const p = useAdminPastel();
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : value || "Select...";
  }, [options, value]);

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Outfit-Bold",
          color: p.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 12,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={{
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          height: 56,
          backgroundColor: p.inputBg,
          borderWidth: 1,
          borderColor: p.inputBorder,
        }}
      >
        <Text style={{ fontSize: 16, fontFamily: "Outfit", color: p.textPrimary }}>
          {displayLabel}
        </Text>
        <ChevronDown size={20} color={p.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: p.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: p.cardWhite,
              shadowColor: p.shadowMd, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
            }}
          >
            <View
              style={{
                padding: 24,
                borderBottomWidth: 1,
                borderBottomColor: p.divider,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Outfit-Bold",
                  color: p.textPrimary,
                }}
              >
                {label}
              </Text>
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
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottomWidth: 1,
                      borderBottomColor: p.divider,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: isSelected ? "Outfit-Bold" : "Outfit",
                        color: isSelected ? p.accent : p.textPrimary,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={20} color={p.accent} />}
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
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: "accent" | "neutral" | "danger" | "success";
  icon?: React.ReactNode;
}) {
  const p = useAdminPastel();

  const bg =
    tone === "accent"
      ? p.buttonPrimary
      : tone === "success"
        ? p.success
        : tone === "danger"
          ? p.danger
          : p.inputBg;

  const textColor =
    tone === "accent"
      ? p.buttonPrimaryText
      : tone === "neutral"
        ? p.textPrimary
        : "#FFFFFF";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        height: 48,
        paddingHorizontal: 24,
        borderRadius: 100,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: bg,
        shadowColor: p.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Outfit-Bold",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: textColor,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: any) {
  const p = useAdminPastel();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Outfit-Bold",
          color: p.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 12,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderRadius: 16,
          paddingHorizontal: 20,
          justifyContent: "center",
          backgroundColor: p.inputBg,
          borderWidth: isFocused ? 2 : 1,
          borderColor: isFocused ? p.accent : p.inputBorder,
          minHeight: multiline ? 120 : 62,
          paddingVertical: multiline ? 16 : 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={p.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            fontSize: 16,
            fontFamily: "Outfit",
            color: p.textPrimary,
          }}
          cursorColor={p.accent}
        />
      </View>
    </View>
  );
}

export function AdminServicesSection({ token, canLoad, initialAction }: Props) {
  const p = useAdminPastel();
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
  const [serviceCreateSchedule, setServiceCreateSchedule] = useState<"one_time" | "permanent">(
    "one_time",
  );
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
    return teams.map((t) => ({ label: `Team: ${t.team}`, value: `team:${t.id}` }));
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
    setServiceEditEligibleTargets(
      Array.isArray(svc.eligibleTargets) ? svc.eligibleTargets : [],
    );
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
    <View style={{ paddingHorizontal: 24 }}>
      {/* Header */}
      <View style={{ marginBottom: 32 }}>
        <Text
          style={{
            fontSize: 24,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
            marginBottom: 8,
          }}
        >
          Services
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Outfit",
            color: p.textSecondary,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          See every bookable session type, edit details, and control visibility.
        </Text>
        <ServiceActionButton
          label="Add Service"
          onPress={() => setCreateOpen(true)}
          icon={<Plus size={16} color={p.buttonPrimaryText} />}
          tone="accent"
        />
      </View>

      {/* Service List */}
      {servicesHook.servicesLoading && servicesHook.services.length === 0 ? (
        <View style={{ gap: 16 }}>
          <Skeleton width="100%" height={100} borderRadius={28} />
          <Skeleton width="100%" height={100} borderRadius={28} />
        </View>
      ) : (
        <View style={{ gap: 16, paddingBottom: 80 }}>
          {servicesHook.services.map((s, idx) => {
            const cardColorKey = CARD_COLORS[idx % CARD_COLORS.length];
            const cardBg = p[cardColorKey] as string;

            return (
              <View
                key={s.id}
                style={{
                  borderRadius: 28,
                  padding: 24,
                  backgroundColor: cardBg,
                  shadowColor: p.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
                }}
              >
                {/* Top row: name + active toggle */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 18,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
                      }}
                    >
                      {s.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      {s.isBookable === false ? (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 100,
                            backgroundColor: p.warningSoft,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontFamily: "Outfit-Bold",
                              color: p.warning,
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Non-bookable
                          </Text>
                        </View>
                      ) : null}
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Outfit",
                          color: p.textSecondary,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {s.type ? s.type.replace(/_/g, " ") : "Schedule item"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleActive(s)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 100,
                      backgroundColor:
                        s.isActive !== false ? p.successSoft : p.inputBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Outfit-Bold",
                        textTransform: "uppercase",
                        letterSpacing: 2,
                        color: s.isActive !== false ? p.success : p.textSecondary,
                      }}
                    >
                      {s.isActive !== false ? "On" : "Off"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Description */}
                {s.description ? (
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 14,
                      fontFamily: "Outfit",
                      color: p.textSecondary,
                      marginBottom: 16,
                      lineHeight: 22,
                    }}
                  >
                    {s.description}
                  </Text>
                ) : null}

                {/* Info chips */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: p.accentSoft,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 100,
                    }}
                  >
                    <Clock size={12} color={p.accent} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
                      }}
                    >
                      {s.durationMinutes}m
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: p.accentSoft,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 100,
                    }}
                  >
                    <Users size={12} color={p.accent} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
                      }}
                    >
                      {s.totalSlots != null
                        ? `${s.remainingTotalSlots ?? "—"} / ${s.totalSlots} slots`
                        : s.capacity != null
                          ? `${s.capacity} capacity`
                          : "Unlimited"}
                    </Text>
                  </View>
                </View>

                {/* Target / Tier line */}
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 10,
                    fontFamily: "Outfit",
                    color: p.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 20,
                  }}
                >
                  Target:{" "}
                  {s.eligibleTargets?.length ? s.eligibleTargets.join(", ") : "All"}{" "}
                  {"·"} Tier:{" "}
                  {s.eligiblePlans?.length
                    ? s.eligiblePlans.join(", ")
                    : s.programTier ?? "All"}
                </Text>

                {/* Action buttons */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setServiceDetailOpenId(s.id)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 100,
                      backgroundColor: p.cardWhite,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <Edit2 size={14} color={p.textPrimary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => servicesHook.deleteServiceType(s.id)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 100,
                      backgroundColor: p.dangerSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <Trash2 size={14} color={p.danger} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Outfit-Bold",
                        color: p.danger,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ========== CREATE MODAL ========== */}
      <Modal visible={createOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: p.divider,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
              }}
            >
              New Service
            </Text>
            <TouchableOpacity onPress={() => setCreateOpen(false)}>
              <X size={24} color={p.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <FormField
              label="Service Name"
              value={serviceCreateName}
              onChangeText={setServiceCreateName}
              placeholder="e.g. 1:1 Session"
            />
            <FormField
              label="Description"
              value={serviceCreateDescription}
              onChangeText={setServiceCreateDescription}
              placeholder="Describe the session..."
              multiline
            />

            {/* Booking Mode */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Outfit-Bold",
                  color: p.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 12,
                  marginLeft: 4,
                }}
              >
                Booking Mode
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[
                  { label: "Bookable", value: true, detail: "Clients can request" },
                  { label: "Non-bookable", value: false, detail: "Visible only" },
                ].map((item) => {
                  const active = serviceCreateIsBookable === item.value;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => setServiceCreateIsBookable(item.value)}
                      style={{
                        flex: 1,
                        borderRadius: 28,
                        padding: 16,
                        backgroundColor: active ? p.accentSoft : p.inputBg,
                        borderWidth: 1,
                        borderColor: active ? p.accent : p.inputBorder,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Outfit-Bold",
                          color: p.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "Outfit",
                          color: p.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        {item.detail}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {serviceCreateIsBookable ? (
              <Dropdown
                label="Service Type"
                value={serviceCreateType}
                onSelect={setServiceCreateType}
                options={SERVICE_TYPES}
              />
            ) : null}
            <FormField
              label="Duration (Minutes)"
              value={serviceCreateDurationMinutes}
              onChangeText={setServiceCreateDurationMinutes}
              keyboardType="numeric"
            />
            {serviceCreateIsBookable ? (
              <FormField
                label="Slots Available"
                value={serviceCreateCapacity}
                onChangeText={setServiceCreateCapacity}
                keyboardType="numeric"
                placeholder="Leave empty for unlimited"
              />
            ) : null}

            {/* Schedule section */}
            <View
              style={{
                marginBottom: 24,
                borderRadius: 28,
                padding: 20,
                backgroundColor: p.cardWhite,
                borderWidth: 1,
                borderColor: p.inputBorder,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Outfit-Bold",
                  color: p.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                Schedule
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Temporary", value: "one_time" as const },
                  { label: "Permanent", value: "permanent" as const },
                ].map((item) => {
                  const active = serviceCreateSchedule === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setServiceCreateSchedule(item.value)}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 100,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active ? p.accent : p.inputBg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Outfit-Bold",
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                          color: active ? p.buttonPrimaryText : p.textSecondary,
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {serviceCreateSchedule === "permanent" ? (
                <>
                  <Dropdown
                    label="Day of Week"
                    value={serviceCreateWeekday}
                    onSelect={setServiceCreateWeekday}
                    options={WEEKDAY_OPTIONS}
                  />
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Hour"
                        value={serviceCreateWeekHour}
                        onSelect={setServiceCreateWeekHour}
                        options={HOUR_OPTIONS}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Minute"
                        value={serviceCreateWeekMinute}
                        onSelect={setServiceCreateWeekMinute}
                        options={MINUTE_OPTIONS}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Dropdown
                    label="Date"
                    value={serviceCreateOneTimeDate}
                    onSelect={setServiceCreateOneTimeDate}
                    options={getNextSevenDays()}
                  />
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Hour"
                        value={serviceCreateOneTimeHour}
                        onSelect={setServiceCreateOneTimeHour}
                        options={HOUR_OPTIONS}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Minute"
                        value={serviceCreateOneTimeMinute}
                        onSelect={setServiceCreateOneTimeMinute}
                        options={MINUTE_OPTIONS}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            <MultiSelect
              label="Eligible Tiers"
              values={serviceCreateEligiblePlans}
              onSelect={(val) => {
                setServiceCreateEligiblePlans((prev) =>
                  prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
                );
              }}
              options={PROGRAM_TIERS}
            />

            <MultiSelect
              label="Target Audience"
              values={serviceCreateEligibleTargets}
              onSelect={(val) => {
                setServiceCreateEligibleTargets((prev) =>
                  prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
                );
              }}
              options={combinedTargetOptions}
            />

            <View style={{ marginTop: 16 }}>
              <ServiceActionButton
                label="Create Service"
                onPress={handleCreate}
                tone="accent"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========== EDIT MODAL ========== */}
      <Modal visible={serviceDetailOpenId !== null} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: p.divider,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
              }}
            >
              Edit Service
            </Text>
            <TouchableOpacity onPress={() => setServiceDetailOpenId(null)}>
              <X size={24} color={p.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <FormField
              label="Service Name"
              value={serviceEditName}
              onChangeText={setServiceEditName}
            />
            <FormField
              label="Description"
              value={serviceEditDescription}
              onChangeText={setServiceEditDescription}
              placeholder="Describe the session..."
              multiline
            />
            <Dropdown
              label="Service Type"
              value={serviceEditType}
              onSelect={setServiceEditType}
              options={SERVICE_TYPES}
            />
            <FormField
              label="Duration (Minutes)"
              value={serviceEditDurationMinutes}
              onChangeText={setServiceEditDurationMinutes}
              keyboardType="numeric"
            />
            <FormField
              label="Slots (Capacity)"
              value={serviceEditCapacity}
              onChangeText={setServiceEditCapacity}
              keyboardType="numeric"
              placeholder="Leave empty for unlimited"
            />

            <MultiSelect
              label="Eligible Tiers"
              values={serviceEditEligiblePlans}
              onSelect={(val) => {
                setServiceEditEligiblePlans((prev) =>
                  prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
                );
              }}
              options={PROGRAM_TIERS}
            />

            <MultiSelect
              label="Target Audience"
              values={serviceEditEligibleTargets}
              onSelect={(val) => {
                setServiceEditEligibleTargets((prev) =>
                  prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
                );
              }}
              options={combinedTargetOptions}
            />

            {/* Active toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 32,
                padding: 16,
                borderRadius: 28,
                backgroundColor: p.inputBg,
              }}
            >
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  color: p.textPrimary,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  fontSize: 12,
                }}
              >
                Service Active
              </Text>
              <TouchableOpacity
                onPress={() => setServiceEditIsActive(!serviceEditIsActive)}
                style={{
                  width: 56,
                  height: 32,
                  borderRadius: 100,
                  justifyContent: "center",
                  backgroundColor: serviceEditIsActive ? p.success : p.inputBorder,
                  paddingHorizontal: 4,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#FFFFFF",
                    alignSelf: serviceEditIsActive ? "flex-end" : "flex-start",
                    shadowColor: p.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
                  }}
                />
              </TouchableOpacity>
            </View>

            <ServiceActionButton
              label="Save Changes"
              onPress={handleUpdate}
              tone="accent"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
