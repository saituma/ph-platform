import React from "react";
import { Pressable, View, TextInput } from "react-native";
import { Search, XCircle } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { POPULAR_SEARCHES } from "./constants";

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function SearchHeader({ searchQuery, setSearchQuery }: SearchHeaderProps) {
  const p = useAdminPastel();

  return (
    <View
      style={{
        marginBottom: 24,
        overflow: "hidden",
        borderRadius: 22,
        padding: 20,
        backgroundColor: p.cardSage,
      }}
    >
      <View
        style={{
          position: "absolute",
          right: -40,
          top: -32,
          height: 96,
          width: 96,
          borderRadius: 48,
          backgroundColor: p.accentSoft,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -32,
          left: 32,
          height: 80,
          width: 80,
          borderRadius: 40,
          backgroundColor: p.cardMint,
        }}
      />

      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 26, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 8 }}>
          How can we help?
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textMuted, lineHeight: 20 }}>
          Find quick answers, learn the best next step, and get the right details ready before you contact the team.
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: p.inputBg,
          borderRadius: 22,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Search size={18} color={p.textSecondary} style={{ marginRight: 12 }} />
        <TextInput
          placeholder="Search help topics, schedules, notifications..."
          placeholderTextColor={p.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{
            flex: 1,
            fontFamily: "Outfit-Regular",
            fontSize: 14,
            color: p.textPrimary,
            padding: 0,
          }}
        />
        {searchQuery ? (
          <Pressable
            onPress={() => setSearchQuery("")}
            style={{
              marginLeft: 12,
              height: 32,
              width: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 100,
              backgroundColor: p.cardWhite,
            }}
          >
            <XCircle size={16} color={p.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {POPULAR_SEARCHES.map((term) => (
          <Pressable
            key={term}
            onPress={() => setSearchQuery(term)}
            style={{
              borderRadius: 100,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: p.cardWhite,
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: p.textSecondary,
              }}
            >
              {term}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
