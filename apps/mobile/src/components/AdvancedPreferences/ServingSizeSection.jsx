import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Users, Minus, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function ServingSizeSection({ servings = 4, onChange }) {
  const handleDecrease = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (servings > 1) {
      onChange(servings - 1);
    }
  };

  const handleIncrease = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (servings < 20) {
      onChange(servings + 1);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Users size={20} color="#4ECDC4" />
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Default Serving Size
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
        Number of people you usually cook for
      </Text>

      <View style={styles.counterContainer}>
        <TouchableOpacity
          style={[styles.counterButton, servings <= 1 && styles.counterButtonDisabled]}
          onPress={handleDecrease}
          disabled={servings <= 1}
        >
          <Minus size={20} color={servings <= 1 ? "#CCCCCC" : "#000000"} />
        </TouchableOpacity>

        <View style={styles.counterDisplay}>
          <Text style={[styles.counterNumber, { fontFamily: "Inter_700Bold" }]}>
            {servings}
          </Text>
          <Text style={[styles.counterLabel, { fontFamily: "Inter_400Regular" }]}>
            {servings === 1 ? "person" : "people"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.counterButton, servings >= 20 && styles.counterButtonDisabled]}
          onPress={handleIncrease}
          disabled={servings >= 20}
        >
          <Plus size={20} color={servings >= 20 ? "#CCCCCC" : "#000000"} />
        </TouchableOpacity>
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
    marginBottom: 20,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    gap: 32,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  counterButtonDisabled: {
    backgroundColor: "#F0F0F0",
    borderColor: "#E0E0E0",
  },
  counterDisplay: {
    alignItems: "center",
    minWidth: 80,
  },
  counterNumber: {
    fontSize: 32,
    color: "#4ECDC4",
    marginBottom: 4,
  },
  counterLabel: {
    fontSize: 14,
    color: "#666666",
  },
});

