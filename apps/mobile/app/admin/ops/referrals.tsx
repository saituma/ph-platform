import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminInput,
  AdminFormField,
  AdminChipSelect,
  AdminSegmentedTabs,
  AdminEmptyState,
  AdminLoadingState,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  AdminIconButton,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { apiRequest } from "@/lib/api";
import { formatIsoShort } from "@/lib/admin-utils";
import { useAdminPhysioReferrals } from "@/hooks/admin/useAdminPhysioReferrals";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppSelector } from "@/store/hooks";
import {
  Send,
  Plus,
  Filter,
  ChevronDown,
  Image as ImageIcon,
  Trash2,
  Users,
  User,
  Calendar,
  Camera,
  Search,
  MapPin,
  Phone,
  Mail,
  Star,
  XCircle,
  PlusCircle,
  List,
  PenLine,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

// --- Constants ---

const TARGET_MODES = [
  { key: "single" as const, label: "Single Athlete" },
  { key: "team" as const, label: "Team" },
  { key: "age_range" as const, label: "Age Range" },
  { key: "group" as const, label: "Group" },
];

const REFERRAL_TYPES_OPTIONS = [
  { key: "Physio", label: "Physio" },
  { key: "Stocks", label: "Stocks" },
  { key: "Nutrition", label: "Nutrition" },
  { key: "Recovery", label: "Recovery" },
  { key: "Doctor", label: "Doctor" },
  { key: "Specialist", label: "Specialist" },
  { key: "Other", label: "Other" },
];

const CARD_COLORS: AdminCardColor[] = ["sage", "pink", "lavender", "peach", "mint", "yellow"];

// --- Screen ---

export default function AdminOpsReferralsScreen() {
  const p = useAdminPastel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const canAccess = isAdminRole(apiUserRole) || appRole === "coach";
  if (!canAccess) {
    return <ReplaceOnce href="/(tabs)" />;
  }

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

  // Team dropdown modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  // Group dropdown modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);

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
      return athleteOptions.filter(u => (u as any).team === teamName).length;
    }
    if (targetMode === "age_range") {
      const min = parseInt(minAge);
      const max = ageMode === "single_age" ? min : parseInt(maxAge);
      if (isNaN(min) || (ageMode === "range_age" && isNaN(max))) return 0;
      return athleteOptions.filter(u => {
        const age = (u as any).age;
        return typeof age === "number" && age >= min && age <= max;
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
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(400).springify()}
      style={{ paddingBottom: 160 }}
    >
      {/* Target Mode */}
      <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 12,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: p.textMuted,
            marginBottom: 10,
          }}
        >
          Target Mode
        </Text>
        <AdminChipSelect
          options={TARGET_MODES}
          value={targetMode}
          onChange={setTargetMode}
        />
      </View>

      {/* Referral Type */}
      <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 12,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: p.textMuted,
            marginBottom: 10,
          }}
        >
          Referral Type
        </Text>
        <AdminChipSelect
          options={REFERRAL_TYPES_OPTIONS}
          value={referralType}
          onChange={setReferralType}
        />
        {referralType === "Other" && (
          <View style={{ marginTop: 12 }}>
            <AdminFormField
              label="Custom Type"
              value={customReferralType}
              onChangeText={setCustomReferralType}
              placeholder="e.g. Wellness"
            />
          </View>
        )}
      </View>

      {/* Target Configuration */}
      <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
        {targetMode === "single" && (
          <View>
            <AdminFormField
              label="Search Athlete"
              value={athleteSearch}
              onChangeText={setAthleteSearch}
              placeholder="Search by name or guardian"
            />
            {athleteSearch.length > 0 && !selectedAthleteId && (
              <AdminCard color="white" style={{ marginBottom: 16 }}>
                {usersLoading ? (
                  <ActivityIndicator size="small" color={p.accent} style={{ paddingVertical: 16 }} />
                ) : (
                  athleteOptions.slice(0, 6).map(u => (
                    <Pressable
                      key={u.id}
                      onPress={() => {
                        setSelectedUserId(u.id!);
                        setSelectedAthleteLabel(u.name || u.email || "Unknown");
                        setAthleteSearch(u.name || u.email || "Unknown");
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 14,
                        paddingHorizontal: 4,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottomWidth: 1,
                        borderBottomColor: p.divider,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
                          {u.name}
                        </Text>
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, marginTop: 2 }}>
                          {u.email}
                        </Text>
                      </View>
                      <PlusCircle size={20} color={p.accent} strokeWidth={2} />
                    </Pressable>
                  ))
                )}
              </AdminCard>
            )}
            {selectedAthleteId && (
              <AdminCard color="lavender" style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: p.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <User size={20} color={p.accent} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      Target Athlete
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary, marginTop: 2 }}>
                      {selectedAthleteLabel}
                    </Text>
                  </View>
                  <Pressable onPress={() => { setSelectedUserId(null); setAthleteSearch(""); }}>
                    <XCircle size={24} color={p.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              </AdminCard>
            )}
          </View>
        )}

        {targetMode === "team" && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: p.textMuted,
                marginBottom: 8,
              }}
            >
              Select Team
            </Text>
            <Pressable
              onPress={() => setTeamModalOpen(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: 52,
                paddingHorizontal: 18,
                borderRadius: 20,
                backgroundColor: p.inputBg,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: teamName ? p.textPrimary : p.textMuted }}>
                {teamName || "Select a team..."}
              </Text>
              <ChevronDown size={18} color={p.textMuted} strokeWidth={2} />
            </Pressable>

            <Modal visible={teamModalOpen} transparent animationType="fade">
              <AdminModalContainer onClose={() => setTeamModalOpen(false)}>
                <AdminModalTitle>Select Team</AdminModalTitle>
                <AdminModalSubtitle>Choose the team to target</AdminModalSubtitle>
                <ScrollView style={{ maxHeight: 360 }}>
                  {teamsHook.teams.map((t, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setTeamName(t.team);
                        setTeamModalOpen(false);
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 14,
                        paddingHorizontal: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: p.divider,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: t.team === teamName ? p.accent : p.textPrimary }}>
                        {t.team} ({t.memberCount})
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </AdminModalContainer>
            </Modal>
          </View>
        )}

        {targetMode === "age_range" && (
          <View>
            <View style={{ marginBottom: 12 }}>
              <AdminChipSelect
                options={[
                  { key: "single_age" as const, label: "Single Age" },
                  { key: "range_age" as const, label: "Age Range" },
                ]}
                value={ageMode}
                onChange={setAgeMode}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AdminFormField
                  label={ageMode === "single_age" ? "Age" : "Min Age"}
                  value={minAge}
                  onChangeText={setMinAge}
                  keyboardType="number-pad"
                  placeholder="6"
                />
              </View>
              {ageMode === "range_age" && (
                <View style={{ flex: 1 }}>
                  <AdminFormField
                    label="Max Age"
                    value={maxAge}
                    onChangeText={setMaxAge}
                    keyboardType="number-pad"
                    placeholder="14"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {targetMode === "group" && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: p.textMuted,
                marginBottom: 8,
              }}
            >
              Saved Group
            </Text>
            <Pressable
              onPress={() => setGroupModalOpen(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: 52,
                paddingHorizontal: 18,
                borderRadius: 20,
                backgroundColor: p.inputBg,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: selectedGroupId ? p.textPrimary : p.textMuted }}>
                {selectedGroupId
                  ? referralGroups.find(g => String(g.id) === selectedGroupId)?.name ?? "Select..."
                  : "Select a group..."}
              </Text>
              <ChevronDown size={18} color={p.textMuted} strokeWidth={2} />
            </Pressable>

            <Modal visible={groupModalOpen} transparent animationType="fade">
              <AdminModalContainer onClose={() => setGroupModalOpen(false)}>
                <AdminModalTitle>Select Group</AdminModalTitle>
                <AdminModalSubtitle>Choose the referral group to target</AdminModalSubtitle>
                <ScrollView style={{ maxHeight: 360 }}>
                  {referralGroups.map((g, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setSelectedGroupId(String(g.id));
                        setGroupModalOpen(false);
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 14,
                        paddingHorizontal: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: p.divider,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: String(g.id) === selectedGroupId ? p.accent : p.textPrimary }}>
                        {g.name} ({g.members.length})
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </AdminModalContainer>
            </Modal>
          </View>
        )}

        {/* Target Preview */}
        <AdminCard color="mint" style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: p.textMuted, marginBottom: 4 }}>
                Target Preview
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary }}>
                Eligible athletes matching criteria
              </Text>
            </View>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: "Outfit-ExtraBold", fontSize: 24, color: p.accent }}>
                {targetedCount}
              </Text>
            </View>
          </View>
        </AdminCard>
      </View>

      {/* Referral Details */}
      <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: "32%" }}>
            <AdminFormField
              label="Discount %"
              value={discountPercent}
              onChangeText={setDiscountPercent}
              keyboardType="number-pad"
              placeholder="10"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AdminFormField
              label="Referral Link"
              value={referralLink}
              onChangeText={setReferralLink}
              placeholder="https://partner-provider.com/..."
              keyboardType="url"
            />
          </View>
        </View>
      </View>

      {/* Partner Details Section */}
      <View style={{ paddingHorizontal: 24, marginBottom: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: p.accent }} />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, textTransform: "uppercase", letterSpacing: 1.5, color: p.textPrimary }}>
            Partner Details
          </Text>
        </View>

        <AdminFormField label="Provider / Contact Name" value={providerName} onChangeText={setProviderName} placeholder="e.g. Dr. John Smith" />
        <AdminFormField label="Organisation / Company" value={organizationName} onChangeText={setOrganizationName} placeholder="e.g. City Physio" />

        {/* Media Upload */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 12,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: p.textMuted,
              marginBottom: 10,
            }}
          >
            Referral Image
          </Text>

          {imageUrl ? (
            <View style={{ borderRadius: 22, overflow: "hidden", marginBottom: 12, position: "relative" }}>
              <Image source={{ uri: imageUrl }} style={{ width: "100%", height: 200 }} resizeMode="cover" />
              <Pressable
                onPress={() => setImageUrl("")}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={18} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
            </View>
          ) : isUploading ? (
            <View
              style={{
                height: 200,
                borderRadius: 22,
                backgroundColor: p.inputBg,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: p.inputBorder,
              }}
            >
              <ActivityIndicator color={p.accent} />
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 10 }}>
                Uploading...
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => pickImage("camera")}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: p.cardPeach,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Camera size={18} color={p.textPrimary} strokeWidth={2} />
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>Camera</Text>
              </Pressable>
              <Pressable
                onPress={() => pickImage("library")}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: p.cardLavender,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <ImageIcon size={18} color={p.textPrimary} strokeWidth={2} />
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>Gallery</Text>
              </Pressable>
            </View>
          )}
        </View>

        <AdminFormField label="Location / Address" value={location} onChangeText={setLocation} placeholder="123 Health St, London..." />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AdminFormField label="Phone" value={phone} onChangeText={setPhone} placeholder="+44..." />
          </View>
          <View style={{ flex: 1 }}>
            <AdminFormField label="Email" value={emailField} onChangeText={setEmailField} placeholder="contact@..." />
          </View>
        </View>
        <AdminFormField label="Focus / Specialty" value={specialty} onChangeText={setSpecialty} placeholder="e.g. Sports Injury, Physio" />
        <AdminFormField label="Additional Notes" value={notes} onChangeText={setNotes} placeholder="Visible to athlete..." multiline />
      </View>

      {/* Error + Create Button */}
      <View style={{ paddingHorizontal: 24 }}>
        {createError && (
          <AdminCard color="pink" style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.danger, textAlign: "center" }}>
              {createError}
            </Text>
          </AdminCard>
        )}

        <AdminButton
          label={targetMode === "single" ? "Save Referral & Notify" : "Create Referrals & Notify"}
          onPress={handleCreate}
          loading={referralsHook.mutatingId === -1}
          icon={Send}
        />
      </View>
    </Animated.View>
  );

  const renderExistingList = () => (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(400).springify()}
      style={{ paddingHorizontal: 24, paddingBottom: 160, gap: 14 }}
    >
      {referralsHook.items.length === 0 ? (
        <AdminEmptyState
          icon={Search}
          title="No Referrals Found"
          description="No referrals match your query. Create one to get started."
        />
      ) : (
        referralsHook.items.map((item, index) => {
          const meta = item.metadata || {};
          const hasMeta = !!(meta.providerName || meta.organizationName || meta.location || meta.phone || meta.email || meta.specialty || meta.notes || meta.imageUrl);
          const cardColor = CARD_COLORS[index % CARD_COLORS.length];

          return (
            <AdminCard key={item.id} color={cardColor}>
              {/* Header Row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <AdminBadge color="lavender">
                  {meta.referralType || "Physio"}
                </AdminBadge>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>
                  {formatIsoShort(item.createdAt || "")}
                </Text>
              </View>

              {/* Athlete Name */}
              <Text style={{ fontFamily: "Outfit-ExtraBold", fontSize: 20, color: p.textPrimary, marginBottom: 4 }}>
                {item.athleteName}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, marginBottom: 14 }}>
                Tier: {item.programTier || "PHP"} · Target: {meta.assignmentMode || "Single"}
              </Text>

              {/* Meta Details */}
              {hasMeta && (
                <View
                  style={{
                    marginBottom: 14,
                    padding: 16,
                    borderRadius: 20,
                    backgroundColor: p.inputBg,
                  }}
                >
                  {meta.imageUrl && (
                    <Image
                      source={{ uri: meta.imageUrl }}
                      style={{ width: "100%", height: 160, borderRadius: 16, marginBottom: 12 }}
                      resizeMode="cover"
                    />
                  )}
                  {meta.providerName && (
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>
                      {meta.providerName}
                    </Text>
                  )}
                  {meta.organizationName && (
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, marginBottom: 8 }}>
                      {meta.organizationName}
                    </Text>
                  )}

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                    {meta.location && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} color={p.accent} strokeWidth={2} />
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
                          {meta.location}
                        </Text>
                      </View>
                    )}
                    {meta.phone && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Phone size={12} color={p.accent} strokeWidth={2} />
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
                          {meta.phone}
                        </Text>
                      </View>
                    )}
                    {meta.email && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Mail size={12} color={p.accent} strokeWidth={2} />
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>
                          {meta.email}
                        </Text>
                      </View>
                    )}
                  </View>

                  {meta.specialty && (
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.accent, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 10 }}>
                      Focus: {meta.specialty}
                    </Text>
                  )}
                  {meta.notes && (
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, fontStyle: "italic", marginTop: 8, lineHeight: 19 }}>
                      "{meta.notes}"
                    </Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: p.divider }}>
                <View style={{ flex: 1 }}>
                  <AdminButton
                    label="Edit"
                    variant="secondary"
                    icon={PenLine}
                    compact
                    onPress={() => {
                      Alert.alert("Edit not yet available", "Editing referrals from mobile is coming soon. Use the admin web panel.");
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AdminButton
                    label="Delete"
                    variant="danger"
                    icon={Trash2}
                    compact
                    disabled={referralsHook.mutatingId === item.id}
                    onPress={() => {
                      Alert.alert(
                        "Delete Referral",
                        "This will permanently remove the referral and notify the athlete. Continue?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              await referralsHook.remove(item.id);
                              void referralsHook.load({ limit: 50 }, true);
                            },
                          },
                        ],
                      );
                    }}
                  />
                </View>
              </View>
            </AdminCard>
          );
        })
      )}
    </Animated.View>
  );

  return (
    <AdminScreen>
      <ThemedScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ paddingHorizontal: 24, paddingTop: 8, marginBottom: 8 }}
        >
          <AdminBackButton onPress={() => router.back()} />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(100).duration(360).springify()}
        >
          <AdminHeader
            title="Referrals"
            subtitle="Create managed referrals for athletes, teams, or groups."
          />
        </Animated.View>

        {/* Tab Switcher */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(140).duration(360).springify()}
        >
          <AdminSegmentedTabs
            tabs={[
              { key: "create" as const, label: "Create", icon: Plus },
              { key: "existing" as const, label: "Existing", icon: List },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </Animated.View>

        {activeTab === "create" ? renderCreateForm() : (
          <View>
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(160).duration(360).springify()}
              style={{ paddingHorizontal: 24, marginBottom: 16 }}
            >
              <AdminInput
                placeholder="Search existing referrals..."
                value={q}
                onChangeText={setQ}
                onClear={() => setQ("")}
              />
            </Animated.View>
            {renderExistingList()}
          </View>
        )}
      </ThemedScrollView>
    </AdminScreen>
  );
}
