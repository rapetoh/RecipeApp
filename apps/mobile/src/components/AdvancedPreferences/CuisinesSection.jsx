import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Globe } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const CUISINE_OPTIONS = [
  { id: "african", label: "African", emoji: "🌍" },
  { id: "west_african", label: "West African", emoji: "🇳🇬" },
  { id: "american", label: "American", emoji: "🇺🇸" },
  { id: "italian", label: "Italian", emoji: "🇮🇹" },
  { id: "asian", label: "Asian", emoji: "🥢" },
  { id: "indian", label: "Indian", emoji: "🇮🇳" },
  { id: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { id: "middle_eastern", label: "Middle Eastern", emoji: "🧄" },
  { id: "chinese", label: "Chinese", emoji: "🇨🇳" },
  { id: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { id: "thai", label: "Thai", emoji: "🇹🇭" },
];

export function CuisinesSection({ selectedCuisines = [], onToggle }) {
  const handlePress = (cuisineId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(cuisineId);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Globe size={20} color="#45B7D1" />
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Favorite Cuisines
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
        Select all cuisines you enjoy
      </Text>

      <View style={styles.cuisineGrid}>
        {CUISINE_OPTIONS.map((cuisine) => {
          const isSelected = selectedCuisines.includes(cuisine.id);
          return (
            <TouchableOpacity
              key={cuisine.id}
              style={[
                styles.cuisineChip,
                isSelected && styles.cuisineChipSelected,
              ]}
              onPress={() => handlePress(cuisine.id)}
            >
              <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text>
              <Text
                style={[
                  styles.cuisineLabel,
                  { fontFamily: "Inter_500Medium" },
                  isSelected && styles.cuisineLabelSelected,
                ]}
              >
                {cuisine.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#000000",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  cuisineChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
  },
  cuisineChipSelected: {
    borderColor: "#45B7D1",
    backgroundColor: "#F0F8FF",
  },
  cuisineEmoji: {
    fontSize: 18,
  },
  cuisineLabel: {
    fontSize: 14,
    color: "#000000",
  },
  cuisineLabelSelected: {
    color: "#45B7D1",
  },
});

