import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminCard } from "@/roles/admin/components/AdminCard";
import { apiRequest } from "@/lib/api";
import { formatIsoShort, parseIntOrUndefined } from "@/lib/admin-utils";
import { useAdminPhysioReferrals, AdminPhysioReferralItem } from "@/hooks/admin/useAdminPhysioReferrals";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import { useAppSelector } from "@/store/hooks";
import type { AdminUser } from "@/types/admin";
import { Feather } from "@/components/ui/theme-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Shadows } from "@/constants/theme";

// --- Constants ---

const TARGET_MODES = [
  { label: "Single Athlete", value: "single" },
  { label: "Team", value: "team" },
  { label: "Age Range", value: "age_range" },
  { label: "Group", value: "group" },
] as const;

const REFERRAL_TYPES = ["Physio", "Stocks", "Nutrition", "Recovery", "Doctor", "Specialist", "Other"];

// --- Components ---

function ActionButton({
  label,
  onPress,
  tone = "accent",
  size = "md",
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: "neutral" | "success" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: any;
}) {
  const { isDark } = useAppTheme();
  const bg = tone === "accent" || tone === "success" ? "#22C55E" : 
             tone === "danger" ? "#EF4444" : 
             isDark ? "rgba(255,255,255,0.15)" : "#F1F5F9";
  const textColor = (tone === "neutral" && !isDark) ? "#0F172A" : "#FFFFFF";
  const height = size === "sm" ? 44 : size === "md" ? 58 : 66;
  const px = size === "sm" ? 16 : size === "md" ? 28 : 36;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        height,
        paddingHorizontal: px,
        borderRadius: 14,
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: (disabled || loading) ? 0.6 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {icon && <Feather name={icon} size={size === "sm" ? 18 : 22} color={textColor} style={{ marginRight: 10 }} />}
          <Text
            className="font-outfit-bold uppercase tracking-[1.5px]"
            style={{ color: textColor, fontSize: size === "sm" ? 13 : 15 }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  prefix?: string;
}) {
  const { colors, isDark } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
        {label}
      </Text>
      <View 
        className="rounded-[18px] border flex-row items-center px-5"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
          borderColor: isFocused ? colors.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"),
          minHeight: multiline ? 140 : 62,
          paddingTop: multiline ? 18 : 0,
          paddingBottom: multiline ? 18 : 0,
          borderWidth: isFocused ? 2 : 1,
        }}
      >
        {prefix && (
          <View className="bg-accent/10 px-2 py-1 rounded-lg mr-3">
            <Text className="text-[14px] font-outfit-bold text-accent">{prefix}</Text>
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={multiline ? "top" : "center"}
          className="flex-1 text-[17px] font-outfit text-app"
          cursorColor={colors.accent}
        />
      </View>
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
  options: { label: string; value: string }[] | string[];
}) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    const found = options.find(o => typeof o === 'string' ? o === value : o.value === value);
    if (!found) return value || "Select...";
    return typeof found === 'string' ? found : found.label;
  }, [options, value]);

  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className="rounded-[18px] border flex-row items-center justify-between px-5 h-[62px]"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
        }}
      >
        <Text className="text-[17px] font-outfit text-app">{displayLabel}</Text>
        <Feather name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setOpen(false)}
        >
          <View 
            className="w-full max-w-sm rounded-[32px] overflow-hidden"
            style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}
          >
            <View className="p-6 border-b border-app/10">
              <Text className="text-xl font-clash font-bold text-app">{label}</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.map((opt, i) => {
                const optVal = typeof opt === 'string' ? opt : opt.value;
                const optLab = typeof opt === 'string' ? opt : opt.label;
                const isSelected = optVal === value;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      onSelect(optVal);
                      setOpen(false);
                    }}
                    className="px-6 py-5 flex-row items-center justify-between border-b border-app/5"
                  >
                    <Text 
                      className={`text-[16px] ${isSelected ? 'font-outfit-bold text-accent' : 'font-outfit text-app'}`}
                    >
                      {optLab}
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

// --- Screen ---

export default function AdminOpsReferralsScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const referralsHook = useAdminPhysioReferrals(token, canLoad);
  const teamsHook = useAdminTeams(token, canLoad);
  const { load: loadUsers, users: athleteOptions, loading: usersLoading } = useAdminUsers(token, canLoad);
  const { uploadAttachment } = useMediaUpload(token);

  const [activeTab, setActiveTab] = useState<"create" | "existing">("create");
  const [q, setQ] = useState("");

  // Create Form State
  const [targetMode, setTargetMode] = useState<"single" | "team" | "age_range" | "group">("single");
  const [referralType, setReferralType] = useState("Physio");
  const [customReferralType, setCustomReferralType] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [selectedAthleteId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAthleteLabel, setSelectedAthleteLabel] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [ageMode, setAgeMode] = useState<"single_age" | "range_age">("single_age");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [providerName, setProviderName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [emailField, setEmailField] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Referral Groups
  const [referralGroups, setReferralGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    if (!canLoad) return;
    void referralsHook.load({ limit: 50 }, true);
    void teamsHook.load(true);
    void loadReferralGroups();
  }, [canLoad]);

  useEffect(() => {
    if (athleteSearch.length > 1) {
      void loadUsers(athleteSearch);
    }
  }, [athleteSearch, loadUsers]);

  const loadReferralGroups = async () => {
    try {
      const res = await apiRequest<{ items: any[] }>("/admin/referral-groups", { token });
      setReferralGroups(res?.items ?? []);
    } catch (e) {
      console.error("Failed to load referral groups", e);
    }
  };

  const pickImage = async (source: "camera" | "library") => {
    const permission = source === "camera" 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) return;

    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

    if (result.canceled || !result.assets[0]) return;
    
    const asset = result.assets[0];
    setIsUploading(true);
    try {
      const uploaded = await uploadAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? "referral.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes: asset.fileSize ?? 0,
        isImage: true,
      });
      setImageUrl(uploaded.mediaUrl);
    } catch (e) {
      Alert.alert("Upload Failed", "Could not upload the referral image.");
    } finally {
      setIsUploading(false);
    }
  };

  const targetedCount = useMemo(() => {
    if (targetMode === "single") return selectedAthleteId ? 1 : 0;
    if (targetMode === "team") {
      if (!teamName) return 0;
      // We assume athleteOptions might be partial, but we show what we have
      return athleteOptions.filter(u => (u as any).team === teamName).length;
    }
    if (targetMode === "age_range") {
      const min = parseInt(minAge);
      const max = ageMode === "single_age" ? min : parseInt(maxAge);
      if (isNaN(min) || (ageMode === "range_age" && isNaN(max))) return 0;
      return athleteOptions.filter(u => {
        const age = (u as any).age;
        return typeof age === 'number' && age >= min && age <= max;
      }).length;
    }
    if (targetMode === "group") {
      return referralGroups.find(g => String(g.id) === selectedGroupId)?.members?.length ?? 0;
    }
    return 0;
  }, [targetMode, selectedAthleteId, teamName, athleteOptions, minAge, maxAge, ageMode, selectedGroupId, referralGroups]);

  const resetForm = () => {
    setTargetMode("single");
    setReferralType("Physio");
    setCustomReferralType("");
    setAthleteSearch("");
    setSelectedUserId(null);
    setSelectedAthleteLabel(null);
    setTeamName("");
    setAgeMode("single_age");
    setMinAge("");
    setMaxAge("");
    setReferralLink("");
    setDiscountPercent("");
    setProviderName("");
    setOrganizationName("");
    setImageUrl("");
    setLocation("");
    setPhone("");
    setEmailField("");
    setSpecialty("");
    setNotes("");
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!canLoad || !token) return;
    setCreateError(null);

    const resolvedType = referralType === "Other" ? customReferralType : referralType;
    if (!resolvedType) {
      setCreateError("Referral type is required.");
      return;
    }
    if (!referralLink) {
      setCreateError("Referral link is required.");
      return;
    }

    const metadata = {
      assignmentMode: targetMode,
      referralType: resolvedType,
      providerName: providerName.trim(),
      organizationName: organizationName.trim(),
      imageUrl: imageUrl.trim(),
      location: location.trim(),
      phone: phone.trim(),
      email: emailField.trim(),
      specialty: specialty.trim(),
      notes: notes.trim(),
    };

    try {
      if (targetMode === "single") {
        if (!selectedAthleteId) throw new Error("Please select an athlete.");
        await referralsHook.create({
          athleteId: selectedAthleteId,
          referalLink: referralLink,
          discountPercent: discountPercent ? Number(discountPercent) : undefined,
          metadata,
        });
      } else {
        // Bulk creation
        const targeting = 
          targetMode === "team" ? { mode: "team", team: teamName } :
          targetMode === "age_range" ? { mode: "age_range", minAge: Number(minAge), maxAge: Number(ageMode === "single_age" ? minAge : maxAge) } :
          { mode: "group", groupId: Number(selectedGroupId) };

        await apiRequest("/admin/physio-referrals/bulk", {
          method: "POST",
          token,
          body: { targeting, referalLink: referralLink, discountPercent: discountPercent ? Number(discountPercent) : undefined, metadata },
        });
      }
      
      resetForm();
      setActiveTab("existing");
      void referralsHook.load({ limit: 50 }, true);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create referral.");
    }
  };

  const renderCreateForm = () => (
    <View className="pb-40">
      {/* Target & Type Selection */}
      <View className="px-6 mb-8">
        <Dropdown 
          label="Target Mode" 
          value={targetMode} 
          onSelect={(val: any) => setTargetMode(val)} 
          options={TARGET_MODES as any} 
        />

        <View className="flex-row gap-x-4">
          <View className="flex-1">
            <Dropdown 
              label="Referral Type" 
              value={referralType} 
              onSelect={setReferralType} 
              options={REFERRAL_TYPES} 
            />
          </View>
          {referralType === "Other" && (
            <View className="flex-1">
              <FormInput 
                label="Custom Type" 
                value={customReferralType} 
                onChangeText={setCustomReferralType} 
                placeholder="e.g. Wellness" 
              />
            </View>
          )}
        </View>
      </View>

      {/* Target Configuration */}
      <View className="px-6 mb-8">
        {targetMode === "single" && (
          <View>
            <FormInput 
              label="Athlete" 
              value={athleteSearch} 
              onChangeText={setAthleteSearch} 
              placeholder="Search by name or guardian" 
            />
            {athleteSearch.length > 0 && !selectedAthleteId && (
              <View 
                className="mb-6 rounded-[24px] border overflow-hidden"
                style={{ 
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  ...Shadows.md
                }}
              >
                {usersLoading ? <ActivityIndicator size="small" className="py-6" color={colors.accent} /> : 
                  athleteOptions.slice(0, 6).map(u => (
                    <TouchableOpacity 
                      key={u.id} 
                      onPress={() => {
                        setSelectedUserId(u.id!);
                        setSelectedAthleteLabel(u.name || u.email || "Unknown");
                        setAthleteSearch(u.name || u.email || "Unknown");
                      }}
                      className="p-5 border-b border-app/5 last:border-0 flex-row items-center justify-between"
                    >
                      <View className="flex-1">
                        <Text className="font-outfit-bold text-[16px] text-app">{u.name}</Text>
                        <Text className="text-[12px] font-outfit text-textSecondary mt-0.5">{u.email}</Text>
                      </View>
                      <Feather name="plus-circle" size={20} color={colors.accent} />
                    </TouchableOpacity>
                  ))
                }
              </View>
            )}
            {selectedAthleteId && (
              <View className="mb-8 flex-row items-center justify-between bg-accent/5 p-5 rounded-[22px] border border-accent/20">
                <View className="flex-row items-center flex-1">
                  <View className="h-10 w-10 rounded-full bg-accent/10 items-center justify-center mr-4">
                    <Feather name="user" size={20} color={colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-outfit-bold text-accent uppercase tracking-wider mb-0.5">Target Athlete</Text>
                    <Text className="font-outfit-bold text-[16px] text-app">{selectedAthleteLabel}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setSelectedUserId(null); setAthleteSearch(""); }}>
                  <Feather name="x-circle" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {targetMode === "team" && (
          <Dropdown 
            label="Select Team" 
            value={teamName} 
            onSelect={setTeamName} 
            options={teamsHook.teams.map(t => ({ label: `${t.team} (${t.memberCount})`, value: t.team }))} 
          />
        )}

        {targetMode === "age_range" && (
          <View>
            <Dropdown 
              label="Age Option" 
              value={ageMode} 
              onSelect={(val: any) => setAgeMode(val)} 
              options={[{ label: "Single Age", value: "single_age" }, { label: "Age Range", value: "range_age" }]} 
            />
            <View className="flex-row gap-4">
              <View className="flex-1">
                <FormInput 
                  label={ageMode === "single_age" ? "Age" : "Min Age"} 
                  value={minAge} 
                  onChangeText={setMinAge} 
                  keyboardType="numeric" 
                  placeholder="6" 
                />
              </View>
              {ageMode === "range_age" && (
                <View className="flex-1">
                  <FormInput 
                    label="Max Age" 
                    value={maxAge} 
                    onChangeText={setMaxAge} 
                    keyboardType="numeric" 
                    placeholder="14" 
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {targetMode === "group" && (
          <Dropdown 
            label="Saved Group" 
            value={selectedGroupId} 
            onSelect={setSelectedGroupId} 
            options={referralGroups.map(g => ({ label: `${g.name} (${g.members.length})`, value: String(g.id) }))} 
          />
        )}

        <View 
          className="p-8 rounded-[32px] border mb-10 flex-row items-center justify-between"
          style={{ 
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)"
          }}
        >
          <View>
            <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-1">Target Preview</Text>
            <Text className="text-sm font-outfit text-textSecondary">Eligible athletes matching criteria</Text>
          </View>
          <View className="h-16 w-16 rounded-2xl bg-accent/10 items-center justify-center border border-accent/20">
            <Text className="text-3xl font-clash font-bold text-accent">{targetedCount}</Text>
          </View>
        </View>
      </View>

      {/* Referral Details */}
      <View className="px-6 mb-10">
        <View className="flex-row gap-x-4">
          <View className="w-[35%]">
            <FormInput 
              label="Discount" 
              value={discountPercent} 
              onChangeText={setDiscountPercent} 
              keyboardType="numeric" 
              placeholder="10" 
              prefix="%"
            />
          </View>
          <View className="flex-1">
            <FormInput 
              label="Referral Link" 
              value={referralLink} 
              onChangeText={setReferralLink} 
              placeholder="https://partner-provider.com/..." 
            />
          </View>
        </View>
      </View>

      {/* Partner Details Section */}
      <View className="px-6 mb-12">
        <View className="flex-row items-center gap-2 mb-8">
          <View className="h-5 w-1.5 rounded-full bg-accent" />
          <Text className="text-[15px] font-outfit-bold text-app uppercase tracking-[2.5px]">Partner Details</Text>
        </View>
        
        <FormInput label="Provider / Contact Name" value={providerName} onChangeText={setProviderName} placeholder="e.g. Dr. John Smith" />
        <FormInput label="Organisation / Company" value={organizationName} onChangeText={setOrganizationName} placeholder="e.g. City Physio" />
        
        <View className="mb-8">
          <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-4 ml-1">Referral Image</Text>
          
          {imageUrl ? (
            <View className="mb-6 rounded-[28px] overflow-hidden border border-app/10 relative shadow-sm">
              <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 240 }} resizeMode="cover" />
              <TouchableOpacity 
                onPress={() => setImageUrl("")}
                className="absolute top-4 right-4 bg-black/60 h-12 w-12 items-center justify-center rounded-full"
              >
                <Feather name="trash-2" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : isUploading ? (
            <View className="mb-6 h-[240px] rounded-[28px] bg-secondary/5 items-center justify-center border border-dashed border-app/20">
              <ActivityIndicator color={colors.accent} />
              <Text className="mt-3 text-xs font-outfit text-textSecondary uppercase tracking-widest">Uploading Image...</Text>
            </View>
          ) : (
            <View className="flex-row gap-4 mb-6">
              <TouchableOpacity 
                onPress={() => pickImage("camera")}
                activeOpacity={0.7}
                className="flex-1 h-16 rounded-[22px] border border-app/10 items-center justify-center bg-card flex-row"
              >
                <Feather name="camera" size={20} color={colors.text} />
                <Text className="ml-3 font-outfit-bold text-[14px] text-app uppercase tracking-wider">Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => pickImage("library")}
                activeOpacity={0.7}
                className="flex-1 h-16 rounded-[22px] border border-app/10 items-center justify-center bg-card flex-row"
              >
                <Feather name="image" size={20} color={colors.text} />
                <Text className="ml-3 font-outfit-bold text-[14px] text-app uppercase tracking-wider">Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FormInput label="Location / Address" value={location} onChangeText={setLocation} placeholder="123 Health St, London..." />
        <View className="flex-row gap-x-4">
          <View className="flex-1"><FormInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+44..." /></View>
          <View className="flex-1"><FormInput label="Email" value={emailField} onChangeText={setEmailField} placeholder="contact@..." /></View>
        </View>
        <FormInput label="Focus / Specialty" value={specialty} onChangeText={setSpecialty} placeholder="e.g. Sports Injury, Physio" />
        <FormInput label="Additional Notes" value={notes} onChangeText={setNotes} placeholder="Visible to athlete..." multiline />
      </View>

      <View className="px-6">
        {createError && (
          <View className="mb-6 p-5 rounded-[22px] bg-red-500/10 border border-red-500/20">
            <Text className="text-red-400 font-outfit text-center text-sm">{createError}</Text>
          </View>
        )}

        <ActionButton 
          label={targetMode === "single" ? "Save Referral & Notify Athlete" : "Create Referrals & Notify Athletes"}
          onPress={handleCreate} 
          loading={referralsHook.mutatingId === -1}
          tone="accent"
          size="lg"
        />
      </View>
    </View>
  );

  const renderExistingList = () => (
    <View className="px-6 pb-40 gap-6">
      {referralsHook.items.length === 0 ? (
        <View className="py-20 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
          <Feather name="search" size={32} color={colors.textSecondary} />
          <Text className="text-sm font-outfit text-textSecondary mt-4 italic">No referrals found matching your query.</Text>
        </View>
      ) : (
        referralsHook.items.map((item) => {
          const meta = item.metadata || {};
          const hasMeta = !!(meta.providerName || meta.organizationName || meta.location || meta.phone || meta.email || meta.specialty || meta.notes || meta.imageUrl);
          
          return (
            <View 
              key={item.id} 
              className="rounded-[36px] border p-8"
              style={{ 
                backgroundColor: isDark ? colors.cardElevated : colors.card,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                ...(isDark ? Shadows.none : Shadows.md)
              }}
            >
              <View className="flex-row items-center justify-between mb-6">
                <View className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                  <Text className="text-[10px] font-outfit-bold text-accent uppercase tracking-widest">
                    {meta.referralType || "Physio"}
                  </Text>
                </View>
                <Text className="text-xs font-outfit text-textSecondary uppercase tracking-wider">{formatIsoShort(item.createdAt || "")}</Text>
              </View>
              
              <Text className="text-2xl font-clash font-bold text-app mb-1">{item.athleteName}</Text>
              <Text className="text-sm font-outfit text-textSecondary mb-6">Tier: {item.programTier || "PHP"} · Target: {meta.assignmentMode || "Single"}</Text>

              {hasMeta && (
                <View 
                  className="mb-6 p-6 rounded-[28px]"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)" }}
                >
                  {meta.imageUrl && (
                    <Image 
                      source={{ uri: meta.imageUrl }} 
                      style={{ width: '100%', height: 180, borderRadius: 20, marginBottom: 16 }} 
                      resizeMode="cover" 
                    />
                  )}
                  {meta.providerName && <Text className="font-outfit-bold text-app text-lg">{meta.providerName}</Text>}
                  {meta.organizationName && <Text className="font-outfit text-textSecondary text-sm mb-3">{meta.organizationName}</Text>}
                  
                  <View className="flex-row flex-wrap gap-4 mt-2">
                    {meta.location && (
                      <View className="flex-row items-center gap-1.5">
                        <Feather name="map-pin" size={12} color={colors.accent} />
                        <Text className="text-xs font-outfit text-textSecondary">{meta.location}</Text>
                      </View>
                    )}
                    {meta.phone && (
                      <View className="flex-row items-center gap-1.5">
                        <Feather name="phone" size={12} color={colors.accent} />
                        <Text className="text-xs font-outfit text-textSecondary">{meta.phone}</Text>
                      </View>
                    )}
                    {meta.email && (
                      <View className="flex-row items-center gap-1.5">
                        <Feather name="mail" size={12} color={colors.accent} />
                        <Text className="text-xs font-outfit text-textSecondary">{meta.email}</Text>
                      </View>
                    )}
                  </View>

                  {meta.specialty && (
                    <Text className="mt-4 text-xs font-outfit-bold text-accent uppercase tracking-wider">
                      Focus: {meta.specialty}
                    </Text>
                  )}
                  {meta.notes && (
                    <Text className="mt-3 text-sm font-outfit text-textSecondary italic leading-relaxed">
                      "{meta.notes}"
                    </Text>
                  )}
                </View>
              )}
              
              <View className="flex-row gap-4 pt-6 border-t border-app/5">
                <TouchableOpacity 
                  onPress={() => {}}
                  className="flex-1 h-12 rounded-2xl bg-secondary/10 items-center justify-center"
                >
                  <Text className="text-xs font-outfit-bold text-app uppercase tracking-widest">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {}}
                  className="flex-1 h-12 rounded-2xl bg-red-500/10 items-center justify-center"
                >
                  <Text className="text-xs font-outfit-bold text-red-400 uppercase tracking-widest">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView showsVerticalScrollIndicator={false}>
        <View className="pt-10 mb-8 px-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text className="text-5xl font-telma-bold text-app tracking-tight">
              Referrals
            </Text>
          </View>
          <Text className="text-base font-outfit text-textSecondary leading-relaxed">
            Create managed referrals for athletes, teams, or groups.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View className="px-6 mb-10">
          <View 
            className="flex-row p-1.5 rounded-[26px] border"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab("create")}
              className="flex-1 h-14 rounded-[20px] items-center justify-center"
              style={{
                backgroundColor: activeTab === "create" ? colors.accent : "transparent",
              }}
            >
              <Text 
                className="font-outfit-bold text-[14px] uppercase tracking-wider"
                style={{ color: activeTab === "create" ? "#FFFFFF" : colors.textSecondary }}
              >
                Create
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("existing")}
              className="flex-1 h-14 rounded-[20px] items-center justify-center"
              style={{
                backgroundColor: activeTab === "existing" ? colors.accent : "transparent",
              }}
            >
              <Text 
                className="font-outfit-bold text-[14px] uppercase tracking-wider"
                style={{ color: activeTab === "existing" ? "#FFFFFF" : colors.textSecondary }}
              >
                Existing
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === "create" ? renderCreateForm() : (
          <View>
            <View className="px-6 mb-8">
              <View 
                className="flex-row items-center rounded-2xl border px-4 h-14"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
                }}
              >
                <Feather name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  placeholder="Search existing referrals..."
                  value={q}
                  onChangeText={setQ}
                  className="flex-1 ml-3 font-outfit text-[16px] text-app"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>
            {renderExistingList()}
          </View>
        )}
      </ThemedScrollView>
    </SafeAreaView>
  );
}
