import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { ChevronLeft, Save } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function PreferenceHeader({ onBack, onSave, saving = false }) {
  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBack();
  };

  const handleSave = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSave();
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <ChevronLeft size={22} color="#000000" />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
        Advanced Preferences
      </Text>
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FF9F1C" />
        ) : (
          <Save size={18} color="#FF9F1C" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
  },
  saveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#F0F0F0",
  },
});

