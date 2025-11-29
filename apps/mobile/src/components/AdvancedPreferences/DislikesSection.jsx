import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { X as XIcon, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function DislikesSection({
  dislikes = [],
  onRemove,
  onAdd,
  onQuickAdd,
}) {
  const QUICK_DISLIKES = [
    "Onions",
    "Mushrooms",
    "Cilantro",
    "Olives",
    "Anchovies",
  ];

  const handleQuickAdd = (dislike) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onQuickAdd(dislike);
  };

  const handleRemove = (dislike) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRemove(dislike);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <XIcon size={20} color="#F59E0B" />
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Ingredients to Avoid
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
        We'll avoid these in your recommendations
      </Text>

      <View style={styles.quickAddGrid}>
        {QUICK_DISLIKES.map((dislike) => {
          const isSelected = dislikes.includes(dislike);
          return (
            <TouchableOpacity
              key={dislike}
              style={[
                styles.quickAddChip,
                isSelected && styles.quickAddChipSelected,
              ]}
              onPress={() => handleQuickAdd(dislike)}
            >
              <Text
                style={[
                  styles.quickAddText,
                  { fontFamily: "Inter_500Medium" },
                  isSelected && styles.quickAddTextSelected,
                ]}
              >
                {dislike}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={onAdd}>
        <Plus size={18} color="#8B5CF6" />
        <Text
          style={[styles.addButtonText, { fontFamily: "Inter_500Medium" }]}
        >
          Add Custom Ingredient
        </Text>
      </TouchableOpacity>

      {dislikes.length > 0 ? (
        <View style={styles.selectedContainer}>
          <Text
            style={[
              styles.selectedTitle,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Ingredients to Avoid ({dislikes.length})
          </Text>
          <View style={styles.selectedGrid}>
            {dislikes.map((dislike, index) => (
              <View key={index} style={styles.selectedTag}>
                <Text
                  style={[
                    styles.selectedTagText,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {dislike}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemove(dislike)}
                  style={styles.removeButton}
                >
                  <XIcon size={14} color="#F59E0B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}>
          No ingredients to avoid yet
        </Text>
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
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  quickAddText: {
    fontSize: 14,
    color: "#000000",
  },
  quickAddTextSelected: {
    color: "#F59E0B",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F3F3FF",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 14,
    color: "#8B5CF6",
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
    borderColor: "#F59E0B",
  },
  selectedTagText: {
    fontSize: 12,
    color: "#000000",
  },
  removeButton: {
    padding: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    paddingVertical: 16,
  },
});

