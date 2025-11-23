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
  ChefHat,
  Clock,
  Users,
  Plus,
  Minus,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

const SKILL_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    emoji: "🥕",
    description: "Simple recipes with basic techniques",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    emoji: "👩‍🍳",
    description: "More complex dishes with varied techniques",
  },
  {
    id: "advanced",
    label: "Advanced",
    emoji: "👨‍🍳",
    description: "Challenging recipes with advanced skills",
  },
];

const TIME_OPTIONS = [
  { id: "under_15", label: "Under 15 minutes", emoji: "⚡", color: "#4ECDC4" },
  { id: "15_30", label: "15-30 minutes", emoji: "⏱️", color: "#45B7D1" },
  { id: "30_45", label: "30-45 minutes", emoji: "🕐", color: "#FFA07A" },
  { id: "no_limit", label: "No time limit", emoji: "🍷", color: "#98D8C8" },
];

export default function OnboardingCookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get data from previous screens
  const goals = params.goals ? JSON.parse(params.goals) : [];
  const dietType = params.dietType || "";
  const allergies = params.allergies ? JSON.parse(params.allergies) : [];
  const favoriteCuisines = params.favoriteCuisines
    ? JSON.parse(params.favoriteCuisines)
    : [];
  const dislikedIngredients = params.dislikedIngredients
    ? JSON.parse(params.dislikedIngredients)
    : [];

  const [selectedSkill, setSelectedSkill] = useState("beginner");
  const [selectedTime, setSelectedTime] = useState("15_30");
  const [peopleCount, setPeopleCount] = useState(1);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleSkillPress = (skillId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSkill(skillId);
  };

  const handleTimePress = (timeId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTime(timeId);
  };

  const adjustPeopleCount = (change) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPeopleCount((prev) => Math.max(1, Math.min(20, prev + change)));
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

    // Pass all data to final screen
    router.push({
      pathname: "/onboarding-notifications",
      params: {
        goals: JSON.stringify(goals),
        dietType: dietType,
        allergies: JSON.stringify(allergies),
        favoriteCuisines: JSON.stringify(favoriteCuisines),
        dislikedIngredients: JSON.stringify(dislikedIngredients),
        cookingSkill: selectedSkill,
        preferredCookingTime: selectedTime,
        peopleCount: peopleCount.toString(),
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
            <View style={[styles.progressFill, { width: "80%" }]} />
          </View>
          <Text
            style={[styles.stepIndicator, { fontFamily: "Inter_500Medium" }]}
          >
            Step 4 of 5
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cooking Skill Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ChefHat size={28} color="#FF9F1C" />
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}
            >
              How comfortable are you with cooking?
            </Text>
          </View>

          <View style={styles.skillContainer}>
            {SKILL_LEVELS.map((skill) => {
              const isSelected = selectedSkill === skill.id;

              return (
                <TouchableOpacity
                  key={skill.id}
                  style={[
                    styles.skillCard,
                    isSelected && styles.skillCardSelected,
                  ]}
                  onPress={() => handleSkillPress(skill.id)}
                >
                  <Text style={styles.skillEmoji}>{skill.emoji}</Text>
                  <Text
                    style={[
                      styles.skillLabel,
                      { fontFamily: "Inter_600SemiBold" },
                      isSelected && styles.skillLabelSelected,
                    ]}
                  >
                    {skill.label}
                  </Text>
                  <Text
                    style={[
                      styles.skillDescription,
                      { fontFamily: "Inter_400Regular" },
                      isSelected && styles.skillDescriptionSelected,
                    ]}
                  >
                    {skill.description}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cooking Time Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={28} color="#45B7D1" />
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}
            >
              How much time do you usually want to spend per meal?
            </Text>
          </View>

          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((timeOption) => {
              const isSelected = selectedTime === timeOption.id;

              return (
                <TouchableOpacity
                  key={timeOption.id}
                  style={[
                    styles.timeCard,
                    isSelected && styles.timeCardSelected,
                    {
                      borderColor: isSelected
                        ? timeOption.color
                        : "transparent",
                    },
                  ]}
                  onPress={() => handleTimePress(timeOption.id)}
                >
                  <Text style={styles.timeEmoji}>{timeOption.emoji}</Text>
                  <Text
                    style={[
                      styles.timeLabel,
                      { fontFamily: "Inter_600SemiBold" },
                      isSelected && { color: timeOption.color },
                    ]}
                  >
                    {timeOption.label}
                  </Text>
                  {isSelected && (
                    <View
                      style={[
                        styles.timeCheckmark,
                        { backgroundColor: timeOption.color },
                      ]}
                    >
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* People Count Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={28} color="#98D8C8" />
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}
            >
              How many people do you usually cook for?
            </Text>
          </View>

          <View style={styles.peopleCountContainer}>
            <TouchableOpacity
              style={[
                styles.countButton,
                peopleCount <= 1 && styles.countButtonDisabled,
              ]}
              onPress={() => adjustPeopleCount(-1)}
              disabled={peopleCount <= 1}
            >
              <Minus
                size={20}
                color={peopleCount <= 1 ? "#CCCCCC" : "#666666"}
              />
            </TouchableOpacity>

            <View style={styles.countDisplay}>
              <Text
                style={[styles.countNumber, { fontFamily: "Inter_700Bold" }]}
              >
                {peopleCount}
              </Text>
              <Text
                style={[styles.countLabel, { fontFamily: "Inter_500Medium" }]}
              >
                {peopleCount === 1 ? "person" : "people"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.countButton,
                peopleCount >= 20 && styles.countButtonDisabled,
              ]}
              onPress={() => adjustPeopleCount(1)}
              disabled={peopleCount >= 20}
            >
              <Plus
                size={20}
                color={peopleCount >= 20 ? "#CCCCCC" : "#666666"}
              />
            </TouchableOpacity>
          </View>

          {peopleCount >= 6 && (
            <View style={styles.familyTip}>
              <Text
                style={[
                  styles.familyTipText,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                🍽️ Great! We'll suggest family-friendly recipes and larger
                portions
              </Text>
            </View>
          )}
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
    marginBottom: 24,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 22,
    color: "#000000",
    lineHeight: 28,
  },
  skillContainer: {
    gap: 16,
  },
  skillCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  skillCardSelected: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  skillEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  skillLabel: {
    fontSize: 18,
    color: "#333333",
    marginBottom: 4,
  },
  skillLabelSelected: {
    color: "#FF9F1C",
  },
  skillDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  skillDescriptionSelected: {
    color: "#CC7A00",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeCard: {
    width: "47%",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    minHeight: 100,
    justifyContent: "center",
    position: "relative",
  },
  timeCardSelected: {
    backgroundColor: "#FFFFFF",
  },
  timeEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: "#333333",
    textAlign: "center",
    lineHeight: 20,
  },
  timeCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  peopleCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    padding: 20,
    gap: 32,
  },
  countButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countButtonDisabled: {
    backgroundColor: "#F0F0F0",
  },
  countDisplay: {
    alignItems: "center",
    minWidth: 80,
  },
  countNumber: {
    fontSize: 32,
    color: "#98D8C8",
    marginBottom: 4,
  },
  countLabel: {
    fontSize: 16,
    color: "#666666",
  },
  familyTip: {
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  familyTipText: {
    fontSize: 14,
    color: "#45B7D1",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 12,
    right: 12,
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
