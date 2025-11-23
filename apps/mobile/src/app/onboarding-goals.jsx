import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
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
  Target,
  Heart,
  Globe,
  Users,
  DollarSign,
  UtensilsCrossed,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const GOALS_OPTIONS = [
  { id: "save_time", label: "Save time", icon: Target, color: "#FF6B6B" },
  {
    id: "eat_healthier",
    label: "Eat healthier",
    icon: Heart,
    color: "#4ECDC4",
  },
  {
    id: "discover_cuisines",
    label: "Discover new cuisines",
    icon: Globe,
    color: "#45B7D1",
  },
  {
    id: "family_meals",
    label: "Plan meals for my family",
    icon: Users,
    color: "#FFA07A",
  },
  {
    id: "budget_friendly",
    label: "Stick to a budget",
    icon: DollarSign,
    color: "#98D8C8",
  },
  {
    id: "tasty_food",
    label: "Just eat tasty food",
    icon: UtensilsCrossed,
    color: "#F7DC6F",
  },
];

export default function OnboardingGoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedGoals, setSelectedGoals] = useState([]);
  const scaleValues = useRef(
    GOALS_OPTIONS.map(() => new Animated.Value(1)),
  ).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleGoalPress = (goalId, index) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate the button press
    Animated.sequence([
      Animated.timing(scaleValues[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValues[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((id) => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });
  };

  const handleContinue = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Pass selected goals to the next screen
    router.push({
      pathname: "/onboarding-diet",
      params: {
        goals: JSON.stringify(selectedGoals),
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
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "20%" }]} />
          </View>
          <Text
            style={[styles.stepIndicator, { fontFamily: "Inter_500Medium" }]}
          >
            Step 1 of 5
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
            What are your main goals? 🎯
          </Text>
          <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            Help us personalize your experience by selecting what matters most
            to you
          </Text>
        </View>

        {/* Goals Grid */}
        <View style={styles.goalsContainer}>
          {GOALS_OPTIONS.map((goal, index) => {
            const IconComponent = goal.icon;
            const isSelected = selectedGoals.includes(goal.id);

            return (
              <Animated.View
                key={goal.id}
                style={[
                  styles.goalCard,
                  isSelected && styles.goalCardSelected,
                  { transform: [{ scale: scaleValues[index] }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.goalCardInner}
                  onPress={() => handleGoalPress(goal.id, index)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.goalIcon,
                      { backgroundColor: `${goal.color}20` },
                      isSelected && { backgroundColor: goal.color },
                    ]}
                  >
                    <IconComponent
                      size={28}
                      color={isSelected ? "#FFFFFF" : goal.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.goalLabel,
                      { fontFamily: "Inter_600SemiBold" },
                      isSelected && styles.goalLabelSelected,
                    ]}
                  >
                    {goal.label}
                  </Text>
                  <View
                    style={[
                      styles.checkmark,
                      isSelected && styles.checkmarkVisible,
                    ]}
                  >
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedGoals.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedGoals.length === 0}
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

        {selectedGoals.length === 0 && (
          <Text style={[styles.helperText, { fontFamily: "Inter_400Regular" }]}>
            Select at least one goal to continue
          </Text>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  progressContainer: {
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
  titleSection: {
    paddingVertical: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  goalCard: {
    width: "47%",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 16,
  },
  goalCardSelected: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  goalCardInner: {
    padding: 20,
    alignItems: "center",
    minHeight: 120,
    position: "relative",
  },
  goalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
    lineHeight: 22,
  },
  goalLabelSelected: {
    color: "#FF9F1C",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0,
    transform: [{ scale: 0.5 }],
  },
  checkmarkVisible: {
    opacity: 1,
    transform: [{ scale: 1 }],
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
  continueButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  continueButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  helperText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    marginTop: 12,
  },
});
