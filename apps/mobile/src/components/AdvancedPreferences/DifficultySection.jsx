import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChefHat, CheckCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const DIFFICULTY_OPTIONS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Simple recipes with basic techniques",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "More complex dishes with varied techniques",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Challenging recipes with advanced skills",
  },
];

export function DifficultySection({ selectedDifficulty, onSelect }) {
  const handleSelect = (difficultyId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(difficultyId);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ChefHat size={20} color="#FF9F1C" />
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Cooking Difficulty
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
        Your comfort level with cooking
      </Text>

      <View style={styles.optionsContainer}>
        {DIFFICULTY_OPTIONS.map((difficulty) => {
          const isSelected = selectedDifficulty === difficulty.id;
          return (
            <TouchableOpacity
              key={difficulty.id}
              style={[
                styles.difficultyCard,
                isSelected && styles.difficultyCardSelected,
              ]}
              onPress={() => handleSelect(difficulty.id)}
            >
              <View style={styles.difficultyContent}>
                <Text
                  style={[
                    styles.difficultyLabel,
                    { fontFamily: "Inter_600SemiBold" },
                    isSelected && styles.difficultyLabelSelected,
                  ]}
                >
                  {difficulty.label}
                </Text>
                <Text
                  style={[
                    styles.difficultyDescription,
                    { fontFamily: "Inter_400Regular" },
                    isSelected && styles.difficultyDescriptionSelected,
                  ]}
                >
                  {difficulty.description}
                </Text>
              </View>
              {isSelected && (
                <CheckCircle size={20} color="#FF9F1C" />
              )}
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
  optionsContainer: {
    gap: 12,
  },
  difficultyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  difficultyCardSelected: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  difficultyContent: {
    flex: 1,
  },
  difficultyLabel: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
  },
  difficultyLabelSelected: {
    color: "#FF9F1C",
  },
  difficultyDescription: {
    fontSize: 14,
    color: "#666666",
  },
  difficultyDescriptionSelected: {
    color: "#CC7A00",
  },
});

