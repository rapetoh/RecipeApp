import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const TIME_OPTIONS = [
  { id: "under_15", label: "Under 15 min" },
  { id: "15_30", label: "15-30 min" },
  { id: "30_45", label: "30-45 min" },
  { id: "45_60", label: "45-60 min" },
  { id: "no_limit", label: "No limit" },
];

const MAX_TIME_OPTIONS = [
  { id: "30", label: "30 min max" },
  { id: "45", label: "45 min max" },
  { id: "60", label: "60 min max" },
  { id: "90", label: "90 min max" },
  { id: "no_limit", label: "No limit" },
];

export function TimePreferencesSection({
  preferredTime,
  maxTime,
  onChangePreferred,
  onChangeMax,
}) {
  const handlePreferredChange = (value) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChangePreferred(value);
  };

  const handleMaxChange = (value) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChangeMax(value);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Clock size={20} color="#FF9F1C" />
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Cooking Time Preferences
        </Text>
      </View>

      <View style={styles.timeGroup}>
        <Text style={[styles.groupTitle, { fontFamily: "Inter_500Medium" }]}>
          Preferred Time
        </Text>
        <View style={styles.optionsGrid}>
          {TIME_OPTIONS.map((option) => {
            const isSelected = preferredTime === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.timeOption,
                  isSelected && styles.timeOptionSelected,
                ]}
                onPress={() => handlePreferredChange(option.id)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    { fontFamily: "Inter_500Medium" },
                    isSelected && styles.timeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.timeGroup}>
        <Text style={[styles.groupTitle, { fontFamily: "Inter_500Medium" }]}>
          Maximum Time
        </Text>
        <View style={styles.optionsGrid}>
          {MAX_TIME_OPTIONS.map((option) => {
            const isSelected = maxTime === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.timeOption,
                  isSelected && styles.timeOptionSelected,
                ]}
                onPress={() => handleMaxChange(option.id)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    { fontFamily: "Inter_500Medium" },
                    isSelected && styles.timeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#000000",
  },
  timeGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeOption: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  timeOptionSelected: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  timeOptionText: {
    fontSize: 14,
    color: "#000000",
  },
  timeOptionTextSelected: {
    color: "#FF9F1C",
  },
});

