import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Target, Heart, Globe, Users, DollarSign, UtensilsCrossed } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const GOALS_OPTIONS = [
  { id: "save_time", label: "Save time", icon: Target, color: "#FF6B6B" },
  { id: "eat_healthier", label: "Eat healthier", icon: Heart, color: "#4ECDC4" },
  { id: "discover_cuisines", label: "Discover new cuisines", icon: Globe, color: "#45B7D1" },
  { id: "family_meals", label: "Plan meals for my family", icon: Users, color: "#FFA07A" },
  { id: "budget_friendly", label: "Stick to a budget", icon: DollarSign, color: "#98D8C8" },
  { id: "tasty_food", label: "Just eat tasty food", icon: UtensilsCrossed, color: "#F7DC6F" },
];

export function GoalsSection({ selectedGoals = [], onToggle }) {
  const handlePress = (goalId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(goalId);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Target size={20} color="#FF9F1C" />
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Cooking Goals
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
        Select all that apply
      </Text>

      <View style={styles.goalsGrid}>
        {GOALS_OPTIONS.map((goal) => {
          const IconComponent = goal.icon;
          const isSelected = selectedGoals.includes(goal.id);

          return (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalChip,
                isSelected && styles.goalChipSelected,
                isSelected && { backgroundColor: goal.color },
              ]}
              onPress={() => handlePress(goal.id)}
            >
              <IconComponent
                size={16}
                color={isSelected ? "#FFFFFF" : goal.color}
              />
              <Text
                style={[
                  styles.goalChipText,
                  { fontFamily: "Inter_500Medium" },
                  isSelected && styles.goalChipTextSelected,
                ]}
              >
                {goal.label}
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
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  goalChipSelected: {
    borderColor: "transparent",
  },
  goalChipText: {
    fontSize: 14,
    color: "#333333",
  },
  goalChipTextSelected: {
    color: "#FFFFFF",
  },
});

