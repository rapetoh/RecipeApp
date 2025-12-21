import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AlertTriangle, X, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const QUICK_ALLERGIES = [
  "Gluten",
  "Dairy / Lactose",
  "Nuts",
  "Eggs",
  "Shellfish",
  "Soy",
];

export function AllergiesSection({
  allergies = [],
  onRemove,
  onAdd,
  onQuickAdd,
}) {
  const handleQuickAdd = (allergy) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onQuickAdd(allergy);
  };

  const handleRemove = (allergy) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRemove(allergy);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AlertTriangle size={20} color="#EF4444" />
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Allergies & Intolerances
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
        Select all that apply
      </Text>

      <View style={styles.quickAddGrid}>
        {QUICK_ALLERGIES.map((allergy) => {
          const isSelected = allergies.includes(allergy);
          return (
            <TouchableOpacity
              key={allergy}
              style={[
                styles.quickAddChip,
                isSelected && styles.quickAddChipSelected,
              ]}
              onPress={() => handleQuickAdd(allergy)}
            >
              <Text
                style={[
                  styles.quickAddText,
                  { fontFamily: "Inter_500Medium" },
                  isSelected && styles.quickAddTextSelected,
                ]}
              >
                {allergy}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={onAdd}>
        <Plus size={18} color="#FF9F1C" />
        <Text
          style={[styles.addButtonText, { fontFamily: "Inter_500Medium" }]}
        >
          Add Custom Allergy
        </Text>
      </TouchableOpacity>

      {allergies.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text
            style={[
              styles.selectedTitle,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Your Allergies ({allergies.length})
          </Text>
          <View style={styles.selectedGrid}>
            {allergies.map((allergy, index) => (
              <View key={index} style={styles.selectedTag}>
                <Text
                  style={[
                    styles.selectedTagText,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {allergy}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemove(allergy)}
                  style={styles.removeButton}
                >
                  <X size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
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
  quickAddGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  quickAddChip: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  quickAddChipSelected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  quickAddText: {
    fontSize: 14,
    color: "#000000",
  },
  quickAddTextSelected: {
    color: "#EF4444",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF5E6",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 14,
    color: "#FF9F1C",
  },
  selectedContainer: {
    marginTop: 8,
  },
  selectedTitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 12,
  },
  selectedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  selectedTagText: {
    fontSize: 12,
    color: "#000000",
  },
  removeButton: {
    padding: 2,
  },
});

