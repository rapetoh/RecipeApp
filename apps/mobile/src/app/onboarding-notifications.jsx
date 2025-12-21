import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
  Alert,
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
  Bell,
  Calendar,
  Scale,
  CheckCircle,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

const DAYS_OF_WEEK = [
  { id: "mon", label: "Mon", fullLabel: "Monday" },
  { id: "tue", label: "Tue", fullLabel: "Tuesday" },
  { id: "wed", label: "Wed", fullLabel: "Wednesday" },
  { id: "thu", label: "Thu", fullLabel: "Thursday" },
  { id: "fri", label: "Fri", fullLabel: "Friday" },
  { id: "sat", label: "Sat", fullLabel: "Saturday" },
  { id: "sun", label: "Sun", fullLabel: "Sunday" },
];

const TIME_OPTIONS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "20:00", label: "8:00 PM" },
];

export default function OnboardingNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  // Get data from all previous screens
  const goals = params.goals ? JSON.parse(params.goals) : [];
  const dietType = params.dietType || "";
  const allergies = params.allergies ? JSON.parse(params.allergies) : [];
  const favoriteCuisines = params.favoriteCuisines
    ? JSON.parse(params.favoriteCuisines)
    : [];
  const dislikedIngredients = params.dislikedIngredients
    ? JSON.parse(params.dislikedIngredients)
    : [];
  const cookingSkill = params.cookingSkill || "beginner";
  const preferredCookingTime = params.preferredCookingTime || "15_30";
  const peopleCount = parseInt(params.peopleCount) || 1;

  const [dailySuggestionEnabled, setDailySuggestionEnabled] = useState(true);
  const [dailySuggestionTime, setDailySuggestionTime] = useState("18:00");
  const [weeklyPlanEnabled, setWeeklyPlanEnabled] = useState(false);
  const [weeklyPlanDays, setWeeklyPlanDays] = useState([
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
  ]);
  const [measurementSystem, setMeasurementSystem] = useState("metric");
  const [loading, setLoading] = useState(false);
  const [notificationPermissionAsked, setNotificationPermissionAsked] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    if (Platform.OS === "web") {
      // Web doesn't support push notifications the same way
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === "granted") {
        setNotificationPermissionAsked(true);
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermissionAsked(true);
      
      if (status === "granted") {
        // Get the push token for future use (can be saved to backend)
        const token = await Notifications.getExpoPushTokenAsync();
        console.log("Notification permission granted. Push token:", token.data);
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setNotificationPermissionAsked(true);
    }
  };

  const handleTimePress = (timeValue) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDailySuggestionTime(timeValue);
  };

  const handleDayPress = (dayId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setWeeklyPlanDays((prev) => {
      if (prev.includes(dayId)) {
        return prev.filter((d) => d !== dayId);
      } else {
        return [...prev, dayId];
      }
    });
  };

  const handleMeasurementPress = (system) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMeasurementSystem(system);
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const savePreferences = async () => {
    setLoading(true);

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const preferences = {
        userId: auth?.user?.id,
        goals,
        dietType: dietType || null,
        allergies,
        favoriteCuisines,
        dislikedIngredients,
        cookingSkill,
        preferredCookingTime,
        peopleCount,
        dailySuggestionEnabled,
        dailySuggestionTime,
        weeklyPlanEnabled,
        weeklyPlanDays,
        measurementSystem,
        onboardingCompleted: true,
      };

      console.log("Saving preferences:", preferences);

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save preferences");
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Invalidate preferences query cache to force fresh data fetch
      await queryClient.invalidateQueries({ queryKey: ["preferences", auth?.user?.id] });
      
      // Small delay to ensure cache invalidation completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to home screen - router.replace() prevents going back to onboarding
      router.replace("/(tabs)/home");
    } catch (error) {
      console.error("Error saving preferences:", error);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Alert.alert(
        "Error",
        "Failed to save your preferences. Please try again.",
        [{ text: "OK", style: "default" }],
      );
    } finally {
      setLoading(false);
    }
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
            <View style={[styles.progressFill, { width: "100%" }]} />
          </View>
          <Text
            style={[styles.stepIndicator, { fontFamily: "Inter_500Medium" }]}
          >
            Step 5 of 5
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Final Settings Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
            Almost done! 🎉
          </Text>
          <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            Let's set up your preferences
          </Text>
        </View>

        {/* Notification Permission Info */}
        {Platform.OS !== "web" && (
          <View style={styles.notificationInfoCard}>
            <Bell size={24} color="#8B5CF6" />
            <View style={styles.notificationInfoText}>
              <Text
                style={[
                  styles.notificationInfoTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Notifications Enabled
              </Text>
              <Text
                style={[
                  styles.notificationInfoSubtitle,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                You'll receive helpful reminders about meal suggestions, cooking times, and grocery lists.
              </Text>
            </View>
          </View>
        )}

        {/* Daily Suggestions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={24} color="#4ECDC4" />
            <View style={styles.sectionHeaderText}>
              <Text
                style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}
              >
                Daily Meal Suggestions
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                Get personalized recipe suggestions every day
              </Text>
            </View>
            <Switch
              value={dailySuggestionEnabled}
              onValueChange={setDailySuggestionEnabled}
              trackColor={{ false: "#E8E8E8", true: "#4ECDC4" }}
              thumbColor={dailySuggestionEnabled ? "#FFFFFF" : "#CCCCCC"}
            />
          </View>

          {dailySuggestionEnabled && (
            <View style={styles.timeSelectionContainer}>
              <Text
                style={[
                  styles.timeSelectionLabel,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Preferred time:
              </Text>
              <View style={styles.timeOptionsGrid}>
                {TIME_OPTIONS.map((time) => {
                  const isSelected = dailySuggestionTime === time.value;

                  return (
                    <TouchableOpacity
                      key={time.value}
                      style={[
                        styles.timeOption,
                        isSelected && styles.timeOptionSelected,
                      ]}
                      onPress={() => handleTimePress(time.value)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          { fontFamily: "Inter_500Medium" },
                          isSelected && styles.timeOptionTextSelected,
                        ]}
                      >
                        {time.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Weekly Meal Plan Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={24} color="#45B7D1" />
            <View style={styles.sectionHeaderText}>
              <Text
                style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}
              >
                Weekly Meal Planning
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                Automatically plan your meals for the week
              </Text>
            </View>
            <Switch
              value={weeklyPlanEnabled}
              onValueChange={setWeeklyPlanEnabled}
              trackColor={{ false: "#E8E8E8", true: "#45B7D1" }}
              thumbColor={weeklyPlanEnabled ? "#FFFFFF" : "#CCCCCC"}
            />
          </View>

          {weeklyPlanEnabled && (
            <View style={styles.daysSelectionContainer}>
              <Text
                style={[
                  styles.daysSelectionLabel,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Plan meals for these days:
              </Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = weeklyPlanDays.includes(day.id);

                  return (
                    <TouchableOpacity
                      key={day.id}
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipSelected,
                      ]}
                      onPress={() => handleDayPress(day.id)}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          { fontFamily: "Inter_500Medium" },
                          isSelected && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Measurement System Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Scale size={24} color="#FFA07A" />
            <View style={styles.sectionHeaderText}>
              <Text
                style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}
              >
                Measurement Units
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                Choose your preferred measurement system
              </Text>
            </View>
          </View>

          <View style={styles.measurementOptions}>
            <TouchableOpacity
              style={[
                styles.measurementOption,
                measurementSystem === "metric" &&
                  styles.measurementOptionSelected,
              ]}
              onPress={() => handleMeasurementPress("metric")}
            >
              <View style={styles.measurementContent}>
                <Text
                  style={[
                    styles.measurementLabel,
                    { fontFamily: "Inter_600SemiBold" },
                    measurementSystem === "metric" &&
                      styles.measurementLabelSelected,
                  ]}
                >
                  Metric
                </Text>
                <Text
                  style={[
                    styles.measurementDescription,
                    { fontFamily: "Inter_400Regular" },
                    measurementSystem === "metric" &&
                      styles.measurementDescriptionSelected,
                  ]}
                >
                  grams, kilograms, liters
                </Text>
              </View>
              {measurementSystem === "metric" && (
                <CheckCircle size={20} color="#FFA07A" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.measurementOption,
                measurementSystem === "imperial" &&
                  styles.measurementOptionSelected,
              ]}
              onPress={() => handleMeasurementPress("imperial")}
            >
              <View style={styles.measurementContent}>
                <Text
                  style={[
                    styles.measurementLabel,
                    { fontFamily: "Inter_600SemiBold" },
                    measurementSystem === "imperial" &&
                      styles.measurementLabelSelected,
                  ]}
                >
                  US Imperial
                </Text>
                <Text
                  style={[
                    styles.measurementDescription,
                    { fontFamily: "Inter_400Regular" },
                    measurementSystem === "imperial" &&
                      styles.measurementDescriptionSelected,
                  ]}
                >
                  cups, ounces, pounds
                </Text>
              </View>
              {measurementSystem === "imperial" && (
                <CheckCircle size={20} color="#FFA07A" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Finish Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.finishButton, loading && styles.finishButtonDisabled]}
          onPress={savePreferences}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text
                style={[
                  styles.finishButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Complete Setup
              </Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          )}
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
  section: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666666",
  },
  timeSelectionContainer: {
    marginTop: 20,
  },
  timeSelectionLabel: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 12,
  },
  timeOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeOption: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  timeOptionSelected: {
    borderColor: "#4ECDC4",
    backgroundColor: "#F0FFFE",
  },
  timeOptionText: {
    fontSize: 14,
    color: "#333333",
  },
  timeOptionTextSelected: {
    color: "#4ECDC4",
  },
  daysSelectionContainer: {
    marginTop: 20,
  },
  daysSelectionLabel: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: 50,
    alignItems: "center",
  },
  dayChipSelected: {
    borderColor: "#45B7D1",
    backgroundColor: "#F0F8FF",
  },
  dayChipText: {
    fontSize: 14,
    color: "#333333",
  },
  dayChipTextSelected: {
    color: "#45B7D1",
  },
  measurementOptions: {
    marginTop: 16,
    gap: 12,
  },
  measurementOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  measurementOptionSelected: {
    borderColor: "#FFA07A",
    backgroundColor: "#FFF8F5",
  },
  measurementContent: {
    flex: 1,
  },
  measurementLabel: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 4,
  },
  measurementLabelSelected: {
    color: "#FFA07A",
  },
  measurementDescription: {
    fontSize: 14,
    color: "#666666",
  },
  measurementDescriptionSelected: {
    color: "#D1845A",
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
  finishButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  finishButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  finishButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  notificationInfoCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    alignItems: "flex-start",
  },
  notificationInfoText: {
    flex: 1,
  },
  notificationInfoTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
  },
  notificationInfoSubtitle: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
});
