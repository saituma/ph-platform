import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ScaledText";

export function ProgramTabBar({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<View | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0 });
  const handleSelect = (tab: string) => {
    onTabChange(tab);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((x, y, width) => {
        setAnchor({ x, y, width });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const renderContainer = (withDropdown: boolean) => (
    <View className="rounded-3xl bg-secondary/10 border border-app/10 p-3 overflow-hidden">
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="min-h-[52px] w-full rounded-2xl bg-input px-4 flex-row items-center justify-between"
        activeOpacity={0.85}
      >
        <Text className="text-4xl font-clash text-app">{activeTab}</Text>
        <View className="h-8 w-8 rounded-full bg-secondary/40 items-center justify-center">
          <Feather name="chevron-down" size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>
      {withDropdown ? (
        <View className="mt-4 rounded-2xl bg-input p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.6px]">
                Select Section
              </Text>
              <Text className="text-4xl font-clash text-app mt-1">Program Sections</Text>
            </View>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              className="h-9 w-9 rounded-full bg-secondary/40 items-center justify-center"
            >
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {tabs.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => handleSelect(tab)}
                className={`min-h-[48px] rounded-2xl px-3 flex-row items-center justify-between ${
                  isActive ? "bg-accent/10" : "bg-transparent"
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`h-2.5 w-2.5 rounded-full mr-3 ${
                      isActive ? "bg-accent" : "bg-secondary/40"
                    }`}
                  />
                  <Text className={`text-4xl font-outfit ${isActive ? "text-accent" : "text-app"}`}>
                    {tab}
                  </Text>
                </View>
                {isActive ? <Feather name="check" size={16} color="#2F8F57" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="mb-6 px-6">
      <View ref={containerRef} style={{ opacity: open ? 0 : 1 }}>
        {renderContainer(false)}
      </View>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={{
              position: "absolute",
              top: anchor.y,
              left: anchor.x,
              width: anchor.width,
            }}
          >
            {renderContainer(true)}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
