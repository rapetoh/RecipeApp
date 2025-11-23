import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  ArrowRight,
  ArrowLeft,
  Leaf,
  Fish,
  AlertTriangle,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

const DIET_OPTIONS = [
  { id: null, label: "No specific diet", icon: null },
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "pescatarian", label: "Pescatarian", icon: Fish },
  { id: "halal", label: "Halal", icon: null },
  { id: "kosher", label: "Kosher", icon: null },
];

const ALLERGY_OPTIONS = [
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy / Lactose" },
  { id: "nuts", label: "Nuts" },
  { id: "eggs", label: "Eggs" },
  { id: "shellfish", label: "Shellfish" },
  { id: "soy", label: "Soy" },
];

export default function OnboardingDietScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get goals from previous screen
  const goals = params.goals ? JSON.parse(params.goals) : [];

  const [selectedDiet, setSelectedDiet] = useState(null);
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [otherDiet, setOtherDiet] = useState("");
  const [otherAllergies, setOtherAllergies] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleDietPress = (dietId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDiet(dietId);
  };

  const handleAllergyPress = (allergyId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectedAllergies((prev) => {
      if (prev.includes(allergyId)) {
        return prev.filter((id) => id !== allergyId);
      } else {
        return [...prev, allergyId];
      }
    });
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleContinue = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const allAllergies = [...selectedAllergies];
    if (otherAllergies.trim()) {
      allAllergies.push(
        ...otherAllergies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }

    const finalDiet =
      selectedDiet === "other" ? otherDiet.trim() : selectedDiet;

    // Pass data to next screen
    router.push({
      pathname: "/onboarding-cuisines",
      params: {
        goals: JSON.stringify(goals),
        dietType: finalDiet || "",
        allergies: JSON.stringify(allAllergies),
      },
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Progress Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#666666" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "40%" }]} />
          </View>
          <Text
            style={[styles.stepIndicator, { fontFamily: "Inter_500Medium" }]}
          >
            Step 2 of 5
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Diet Type Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
            Do you follow a specific diet? 🥗
          </Text>

          <View style={styles.optionsContainer}>
            {DIET_OPTIONS.map((diet) => {
              const isSelected = selectedDiet === diet.id;
              const IconComponent = diet.icon;

              return (
                <TouchableOpacity
                  key={diet.id || "none"}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => handleDietPress(diet.id)}
                >
                  <View style={styles.optionContent}>
                    {IconComponent && (
                      <IconComponent
                        size={20}
                        color={isSelected ? "#FF9F1C" : "#666666"}
                      />
                    )}
                    <Text
                      style={[
                        styles.optionLabel,
                        { fontFamily: "Inter_500Medium" },
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {diet.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Other Diet Input */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedDiet === "other" && styles.optionCardSelected,
              ]}
              onPress={() => handleDietPress("other")}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionLabel,
                    { fontFamily: "Inter_500Medium" },
                    selectedDiet === "other" && styles.optionLabelSelected,
                  ]}
                >
                  Other
                </Text>
              </View>
              {selectedDiet === "other" && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {selectedDiet === "other" && (
              <TextInput
                style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
                placeholder="Please specify your diet..."
                value={otherDiet}
                onChangeText={setOtherDiet}
                placeholderTextColor="#999999"
              />
            )}
          </View>
        </View>

        {/* Allergies Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={24} color="#FF6B6B" />
            <View style={styles.sectionHeaderText}>
              <Text
                style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}
              >
                Any allergies or intolerances?
              </Text>
            </View>
          </View>

          <View style={styles.allergyGrid}>
            {ALLERGY_OPTIONS.map((allergy) => {
              const isSelected = selectedAllergies.includes(allergy.id);

              return (
                <TouchableOpacity
                  key={allergy.id}
                  style={[
                    styles.allergyChip,
                    isSelected && styles.allergyChipSelected,
                  ]}
                  onPress={() => handleAllergyPress(allergy.id)}
                >
                  <Text
                    style={[
                      styles.allergyLabel,
                      { fontFamily: "Inter_500Medium" },
                      isSelected && styles.allergyLabelSelected,
                    ]}
                  >
                    {allergy.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Other allergies (separate with commas)"
            value={otherAllergies}
            onChangeText={setOtherAllergies}
            placeholderTextColor="#999999"
            multiline
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text
            style={[
              styles.continueButtonText,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Continue
          </Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#E8E8E8",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF9F1C",
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 14,
    color: "#666666",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    color: "#000000",
    marginBottom: 16,
  },
  optionsContainer: {
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
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: "#333333",
  },
  optionLabelSelected: {
    color: "#FF9F1C",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  allergyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  allergyChip: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  allergyChipSelected: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFF5F5",
  },
  allergyLabel: {
    fontSize: 14,
    color: "#333333",
  },
  allergyLabelSelected: {
    color: "#FF6B6B",
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginTop: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  continueButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
});
