import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Leaf, Fish, CheckCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const DIET_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "pescatarian", label: "Pescatarian", icon: Fish },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
];

export function DietTypeSection({ selectedDiets = [], onToggle }) {
  const handlePress = (dietId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(dietId);
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
        Diet Type
      </Text>
      <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
        Select all that apply
      </Text>
      <View style={styles.optionsGrid}>
        {DIET_OPTIONS.map((diet) => {
          const IconComponent = diet.icon;
          const isSelected = Array.isArray(selectedDiets)
            ? selectedDiets.includes(diet.id)
            : false;

          return (
            <TouchableOpacity
              key={diet.id}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => handlePress(diet.id)}
            >
              <View style={styles.optionContent}>
                {IconComponent && (
                  <IconComponent
                    size={18}
                    color={isSelected ? "#8B5CF6" : "#666666"}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    { fontFamily: "Inter_500Medium" },
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {diet.label}
                </Text>
              </View>
              {isSelected && (
                <CheckCircle size={18} color="#8B5CF6" />
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
  sectionTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: "#8B5CF6",
    backgroundColor: "#F3F3FF",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: "#000000",
  },
  optionTextSelected: {
    color: "#8B5CF6",
  },
});

