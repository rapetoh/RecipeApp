import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
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
  ChevronLeft,
  Bell,
  Clock,
  Calendar,
  Coffee,
  Sun,
  Moon,
  ShoppingCart,
  ChevronRight,
  Settings,
  Smartphone,
  Mail,
  MessageCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

export default function NotificationCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, isAuthenticated, signIn } = useAuth();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Mock notification settings (in real app, this would come from user preferences/database)
  const [notificationSettings, setNotificationSettings] = useState({
    // Daily suggestions
    dailySuggestions: {
      enabled: true,
      time: "18:00",
      days: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },

    // Meal reminders
    mealReminders: {
      breakfast: { enabled: true, time: "08:00" },
      lunch: { enabled: true, time: "12:30" },
      dinner: { enabled: true, time: "18:30" },
    },

    // Grocery lists
    groceryReminders: {
      enabled: true,
      weeklyGeneration: true,
      beforeShopping: true,
    },

    // Meal planning
    mealPlanningReminders: {
      enabled: true,
      weeklyPlanning: true,
      dayBefore: true,
    },

    // App notifications
    pushNotifications: true,
    emailNotifications: false,
    marketingEmails: false,
  });

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleToggleSetting = (category, setting, value = null) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setNotificationSettings((prev) => {
      const newSettings = { ...prev };

      if (value !== null) {
        // Handle nested settings
        if (setting) {
          newSettings[category][setting] = value;
        } else {
          newSettings[category] = value;
        }
      } else {
        // Toggle boolean settings
        if (setting) {
          newSettings[category][setting] = !newSettings[category][setting];
        } else {
          newSettings[category] = !newSettings[category];
        }
      }

      return newSettings;
    });

    // Show feedback for certain important settings
    if (
      category === "pushNotifications" &&
      !notificationSettings.pushNotifications
    ) {
      Alert.alert(
        "Notifications Enabled",
        "You'll now receive push notifications for meal suggestions and reminders.",
        [{ text: "OK", style: "default" }],
      );
    }
  };

  const formatTime = (time24) => {
    const [hour, minute] = time24.split(":");
    const hour12 = parseInt(hour) % 12 || 12;
    const ampm = parseInt(hour) >= 12 ? "PM" : "AM";
    return `${hour12}:${minute} ${ampm}`;
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case "breakfast":
        return <Coffee size={20} color="#FF9F1C" />;
      case "lunch":
        return <Sun size={20} color="#4CAF50" />;
      case "dinner":
        return <Moon size={20} color="#2196F3" />;
      default:
        return <Clock size={20} color="#666666" />;
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Notifications
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isAuthenticated ? (
          <View style={styles.authPrompt}>
            <Bell size={48} color="#8B5CF6" />
            <Text style={[styles.authTitle, { fontFamily: "Inter_700Bold" }]}>
              Stay Updated
            </Text>
            <Text style={[styles.authText, { fontFamily: "Inter_400Regular" }]}>
              Sign in to customize your notification preferences
            </Text>
            <TouchableOpacity style={styles.authButton} onPress={signIn}>
              <Text
                style={[
                  styles.authButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Main Toggle */}
            <View style={styles.mainToggleCard}>
              <View style={styles.mainToggleHeader}>
                <View style={styles.mainToggleIcon}>
                  <Bell size={24} color="#FFFFFF" />
                </View>
                <View style={styles.mainToggleInfo}>
                  <Text
                    style={[
                      styles.mainToggleTitle,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Push Notifications
                  </Text>
                  <Text
                    style={[
                      styles.mainToggleSubtitle,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {notificationSettings.pushNotifications
                      ? "You'll receive notifications for meals and reminders"
                      : "Turn on to get helpful cooking reminders"}
                  </Text>
                </View>
                <Switch
                  value={notificationSettings.pushNotifications}
                  onValueChange={(value) =>
                    handleToggleSetting("pushNotifications", null, value)
                  }
                  trackColor={{ false: "#E0E0E0", true: "#8B5CF6" }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E0E0E0"
                />
              </View>
            </View>

            {/* Daily Suggestions */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Calendar size={20} color="#8B5CF6" />
                </View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Daily Recipe Suggestions
                </Text>
                <Switch
                  value={notificationSettings.dailySuggestions.enabled}
                  onValueChange={(value) =>
                    handleToggleSetting("dailySuggestions", "enabled", value)
                  }
                  trackColor={{ false: "#E0E0E0", true: "#8B5CF6" }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E0E0E0"
                />
              </View>

              {notificationSettings.dailySuggestions.enabled && (
                <View style={styles.sectionDetails}>
                  <Text
                    style={[
                      styles.sectionDescription,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    Get personalized recipe suggestions delivered daily at{" "}
                    {formatTime(notificationSettings.dailySuggestions.time)}.
                  </Text>

                  <TouchableOpacity style={styles.settingRow}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      Notification Time
                    </Text>
                    <View style={styles.settingValue}>
                      <Text
                        style={[
                          styles.settingValueText,
                          { fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        {formatTime(notificationSettings.dailySuggestions.time)}
                      </Text>
                      <ChevronRight size={16} color="#CCCCCC" />
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Meal Reminders */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Clock size={20} color="#22C55E" />
                </View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Meal Reminders
                </Text>
              </View>

              <View style={styles.sectionDetails}>
                <Text
                  style={[
                    styles.sectionDescription,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Get reminded when it's time to cook your planned meals.
                </Text>

                {Object.entries(notificationSettings.mealReminders).map(
                  ([mealType, settings]) => (
                    <View key={mealType} style={styles.mealReminderRow}>
                      <View style={styles.mealReminderLeft}>
                        {getMealIcon(mealType)}
                        <Text
                          style={[
                            styles.mealReminderLabel,
                            { fontFamily: "Inter_500Medium" },
                          ]}
                        >
                          {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                        </Text>
                      </View>

                      <View style={styles.mealReminderRight}>
                        {settings.enabled && (
                          <Text
                            style={[
                              styles.mealReminderTime,
                              { fontFamily: "Inter_400Regular" },
                            ]}
                          >
                            {formatTime(settings.time)}
                          </Text>
                        )}
                        <Switch
                          value={settings.enabled}
                          onValueChange={(value) =>
                            handleToggleSetting("mealReminders", mealType, {
                              ...settings,
                              enabled: value,
                            })
                          }
                          trackColor={{ false: "#E0E0E0", true: "#22C55E" }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor="#E0E0E0"
                          style={styles.mealReminderSwitch}
                        />
                      </View>
                    </View>
                  ),
                )}
              </View>
            </View>

            {/* Grocery Reminders */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <ShoppingCart size={20} color="#F59E0B" />
                </View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Grocery Reminders
                </Text>
                <Switch
                  value={notificationSettings.groceryReminders.enabled}
                  onValueChange={(value) =>
                    handleToggleSetting("groceryReminders", "enabled", value)
                  }
                  trackColor={{ false: "#E0E0E0", true: "#F59E0B" }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E0E0E0"
                />
              </View>

              {notificationSettings.groceryReminders.enabled && (
                <View style={styles.sectionDetails}>
                  <Text
                    style={[
                      styles.sectionDescription,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    Get notified about grocery list updates and shopping
                    reminders.
                  </Text>

                  <View style={styles.checkboxOption}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() =>
                        handleToggleSetting(
                          "groceryReminders",
                          "weeklyGeneration",
                        )
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          notificationSettings.groceryReminders
                            .weeklyGeneration && styles.checkboxChecked,
                        ]}
                      >
                        {notificationSettings.groceryReminders
                          .weeklyGeneration && (
                          <View style={styles.checkboxMark} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          { fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        Weekly grocery list generation
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.checkboxOption}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() =>
                        handleToggleSetting(
                          "groceryReminders",
                          "beforeShopping",
                        )
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          notificationSettings.groceryReminders
                            .beforeShopping && styles.checkboxChecked,
                        ]}
                      >
                        {notificationSettings.groceryReminders
                          .beforeShopping && (
                          <View style={styles.checkboxMark} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          { fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        Reminder before shopping trips
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Communication Preferences */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MessageCircle size={20} color="#6366F1" />
                </View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Communication
                </Text>
              </View>

              <View style={styles.sectionDetails}>
                <Text
                  style={[
                    styles.sectionDescription,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Choose how you'd like to receive updates and tips.
                </Text>

                <View style={styles.communicationOption}>
                  <View style={styles.communicationLeft}>
                    <Smartphone size={18} color="#666666" />
                    <Text
                      style={[
                        styles.communicationLabel,
                        { fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      Push Notifications
                    </Text>
                  </View>
                  <Switch
                    value={notificationSettings.pushNotifications}
                    onValueChange={(value) =>
                      handleToggleSetting("pushNotifications", null, value)
                    }
                    trackColor={{ false: "#E0E0E0", true: "#6366F1" }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E0E0E0"
                  />
                </View>

                <View style={styles.communicationOption}>
                  <View style={styles.communicationLeft}>
                    <Mail size={18} color="#666666" />
                    <Text
                      style={[
                        styles.communicationLabel,
                        { fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      Email Updates
                    </Text>
                  </View>
                  <Switch
                    value={notificationSettings.emailNotifications}
                    onValueChange={(value) =>
                      handleToggleSetting("emailNotifications", null, value)
                    }
                    trackColor={{ false: "#E0E0E0", true: "#6366F1" }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E0E0E0"
                  />
                </View>

                <View style={styles.communicationOption}>
                  <View style={styles.communicationLeft}>
                    <Mail size={18} color="#666666" />
                    <Text
                      style={[
                        styles.communicationLabel,
                        { fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      Marketing Emails
                    </Text>
                  </View>
                  <Switch
                    value={notificationSettings.marketingEmails}
                    onValueChange={(value) =>
                      handleToggleSetting("marketingEmails", null, value)
                    }
                    trackColor={{ false: "#E0E0E0", true: "#6366F1" }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E0E0E0"
                  />
                </View>
              </View>
            </View>

            {/* Settings Link */}
            <View style={styles.settingsCard}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  Alert.alert(
                    "System Settings",
                    "To manage notification permissions, please visit your device's Settings app.",
                    [{ text: "OK", style: "default" }],
                  );
                }}
              >
                <View style={styles.settingsLeft}>
                  <Settings size={20} color="#666666" />
                  <Text
                    style={[
                      styles.settingsLabel,
                      { fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    Device Notification Settings
                  </Text>
                </View>
                <ChevronRight size={20} color="#CCCCCC" />
              </TouchableOpacity>

              <Text
                style={[
                  styles.settingsDescription,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                Manage system-level notification permissions and sounds in your
                device settings.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
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
  headerRight: {
    width: 38,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Auth Prompt
  authPrompt: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    margin: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
  },
  authTitle: {
    fontSize: 24,
    color: "#000000",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  authText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  authButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  authButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Main Toggle Card
  mainToggleCard: {
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
  },
  mainToggleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainToggleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  mainToggleInfo: {
    flex: 1,
  },
  mainToggleTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 24,
  },
  mainToggleSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    lineHeight: 20,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#000000",
    flex: 1,
  },
  sectionDetails: {
    padding: 20,
    gap: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },

  // Setting Rows
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: "#000000",
  },
  settingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingValueText: {
    fontSize: 14,
    color: "#8B5CF6",
  },

  // Meal Reminders
  mealReminderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  mealReminderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mealReminderLabel: {
    fontSize: 14,
    color: "#000000",
  },
  mealReminderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mealReminderTime: {
    fontSize: 12,
    color: "#666666",
    minWidth: 60,
    textAlign: "right",
  },
  mealReminderSwitch: {
    transform: [{ scale: 0.8 }],
  },

  // Checkbox Options
  checkboxOption: {
    paddingVertical: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    borderColor: "#F59E0B",
    backgroundColor: "#F59E0B",
  },
  checkboxMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#000000",
    flex: 1,
  },

  // Communication Options
  communicationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  communicationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  communicationLabel: {
    fontSize: 14,
    color: "#000000",
  },

  // Settings Card
  settingsCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  settingsButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 12,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsLabel: {
    fontSize: 14,
    color: "#000000",
  },
  settingsDescription: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
  },
});
