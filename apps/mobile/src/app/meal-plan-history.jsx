import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
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
  Calendar,
  Coffee,
  Sun,
  Moon,
  ChevronRight,
  Copy,
  Eye,
  MoreVertical,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

export default function MealPlanHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();

  const [selectedWeek, setSelectedWeek] = useState(null);
  const [showWeekOptions, setShowWeekOptions] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("week"); // "week" | "2weeks" | "month"

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Helper functions
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const getMonthStart = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  const getPeriodStart = (date, mode) => {
    if (mode === "week") {
      return getWeekStart(date);
    } else if (mode === "2weeks") {
      const weekStart = getWeekStart(date);
      // Get the start of the 2-week period (every 2 weeks from a fixed point)
      // Use a fixed reference date (Jan 1, 2024, which was a Monday)
      const referenceDate = new Date(2024, 0, 1);
      const daysDiff = Math.floor((weekStart.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
      const twoWeekPeriod = Math.floor(daysDiff / 14);
      const periodStart = new Date(referenceDate);
      periodStart.setDate(referenceDate.getDate() + (twoWeekPeriod * 14));
      return periodStart;
    } else if (mode === "month") {
      return getMonthStart(date);
    }
    return getWeekStart(date);
  };

  const getPeriodEnd = (startDate, mode) => {
    const end = new Date(startDate);
    if (mode === "week") {
      end.setDate(startDate.getDate() + 6);
    } else if (mode === "2weeks") {
      end.setDate(startDate.getDate() + 13);
    } else if (mode === "month") {
      end.setMonth(startDate.getMonth() + 1);
      end.setDate(0); // Last day of the month
    }
    return end;
  };

  const getTotalPossibleMeals = (mode) => {
    if (mode === "week") {
      return 21; // 7 days × 3 meals
    } else if (mode === "2weeks") {
      return 42; // 14 days × 3 meals
    } else if (mode === "month") {
      // Calculate actual days in the period
      return 93; // ~31 days × 3 meals (average, will be recalculated per period)
    }
    return 21;
  };

  const formatWeekName = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // If same year, only show year on end date
    if (start.getFullYear() === end.getFullYear()) {
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startStr} - ${endStr}`;
    } else {
      // Different years, show year on both
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startStr} - ${endStr}`;
    }
  };

  // Helper function to format date as YYYY-MM-DD without timezone conversion
  const formatDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch historical meal plans
  const { data: historicalPeriods, isLoading } = useQuery({
    queryKey: ["meal-plan-history", auth?.user?.id, viewMode],
    queryFn: async () => {
      if (!auth?.user?.id) return { data: [] };

      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
        // Fetch ALL meal plans for the user (no date restrictions)
        const response = await fetch(
          `${apiUrl}/api/meal-plans?userId=${auth.user.id}`
        );

        if (!response.ok) {
          console.warn("Failed to fetch meal plans, using empty data");
          return { data: [] };
        }

        const result = await response.json();
        
        // Group meal plans by period (week/month/2weeks)
        const periodsMap = new Map();
        
        if (result.success && result.data) {
          result.data.forEach((meal) => {
            const date = new Date(meal.date);
            const periodStart = getPeriodStart(date, viewMode);
            const periodKey = formatDateString(periodStart);
            
            if (!periodsMap.has(periodKey)) {
              const periodEnd = getPeriodEnd(periodStart, viewMode);
              
              // Calculate actual days in period for month mode
              let totalPossibleMeals = getTotalPossibleMeals(viewMode);
              if (viewMode === "month") {
                const daysInMonth = periodEnd.getDate();
                totalPossibleMeals = daysInMonth * 3;
              }
              
              periodsMap.set(periodKey, {
                id: periodKey,
                startDate: periodKey,
                endDate: formatDateString(periodEnd),
                name: formatWeekName(periodStart, periodEnd),
                meals: {},
                mealsPlanned: 0,
                totalPossibleMeals: totalPossibleMeals,
                totalRecipes: new Set(),
              });
            }
            
            const period = periodsMap.get(periodKey);
            // Normalize date to YYYY-MM-DD format (handle both string and Date objects)
            const dateKey = typeof meal.date === 'string' 
              ? meal.date.split('T')[0]  // Remove time part if present
              : formatDateString(meal.date);
            
            if (!period.meals[dateKey]) {
              period.meals[dateKey] = {};
            }
            
            period.meals[dateKey][meal.meal_type] = {
              id: meal.recipe_id,
              name: meal.recipe_name,
              cooking_time: meal.cooking_time,
            };
            
            period.mealsPlanned++;
            period.totalRecipes.add(meal.recipe_id);
          });
        }
        
        // Convert to array and calculate stats
        const periods = Array.from(periodsMap.values()).map((period) => {
          const planningPercentage = period.totalPossibleMeals > 0 
            ? (period.mealsPlanned / period.totalPossibleMeals) * 100 
            : 0;
          return {
            ...period,
            totalRecipes: period.totalRecipes.size,
            planningPercentage: Math.round(planningPercentage),
            status: planningPercentage >= 80 ? "completed" : "partial",
          };
        }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        return { data: periods };
      } catch (error) {
        console.error("Error fetching meal plan history:", error);
        return { data: [] };
      }
    },
    enabled: !!auth?.user?.id && isAuthenticated,
  });

  // Copy meal plan mutation
  const copyMealPlanMutation = useMutation({
    mutationFn: async ({ weekId, targetStartDate }) => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const period = historicalPeriods?.data?.find((w) => w.id === weekId);
      
      if (!period) {
        throw new Error("Period not found");
      }

      // Copy all meals from the period to the target date
      const promises = [];
      Object.keys(period.meals || {}).forEach((dateKey) => {
        const originalDate = new Date(dateKey);
        const daysDiff = Math.floor(
          (originalDate - new Date(period.startDate)) / (1000 * 60 * 60 * 24)
        );
        const targetDate = new Date(targetStartDate);
        targetDate.setDate(targetDate.getDate() + daysDiff);
        
        Object.entries(period.meals[dateKey] || {}).forEach(([mealType, meal]) => {
          promises.push(
            fetch(`${apiUrl}/api/meal-plans`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: auth.user.id,
                date: targetDate.toISOString().split("T")[0],
                mealType: mealType,
                recipeId: meal.id,
              }),
            })
          );
        });
      });

      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["meal-plans"]);
      queryClient.invalidateQueries(["meal-plan-history"]);
      setShowWeekOptions(null);
      setSelectedWeek(null);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      Alert.alert(
        "Meal Plan Copied!",
        "This week's meal plan has been copied to your current planning period.",
        [
          { text: "OK", style: "default" },
          {
            text: "View Plans",
            onPress: () => router.push("/meal-planning"),
            style: "default",
          },
        ],
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to copy meal plan");
    },
  });

  const handleBackPress = () => {
    if (selectedWeek) {
      setSelectedWeek(null);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleWeekPress = (week) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedWeek(week);
  };

  const handleWeekOptions = (week) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowWeekOptions(week);
  };

  const handleCopyWeek = () => {
    if (!showWeekOptions) return;

    Alert.alert(
      "Copy Meal Plan",
      `Copy "${showWeekOptions.name}" to your current meal planning?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () => {
            const nextMonday = getNextMonday();
            copyMealPlanMutation.mutate({
              weekId: showWeekOptions.id,
              targetStartDate: nextMonday,
            });
          },
        },
      ],
    );
  };

  const handleViewWeek = () => {
    if (!showWeekOptions) return;
    setShowWeekOptions(null);
    handleWeekPress(showWeekOptions);
  };

  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split("T")[0];
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
    } else {
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={20} color="#22C55E" />;
      case "partial":
        return <AlertCircle size={20} color="#F59E0B" />;
      default:
        return <Clock size={20} color="#666666" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#22C55E";
      case "partial":
        return "#F59E0B";
      default:
        return "#666666";
    }
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case "breakfast":
        return <Coffee size={16} color="#FF9F1C" />;
      case "lunch":
        return <Sun size={16} color="#4CAF50" />;
      case "dinner":
        return <Moon size={16} color="#2196F3" />;
      default:
        return <Clock size={16} color="#666666" />;
    }
  };

  const getPeriodDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];

    // Calculate all days from start to end (inclusive)
    const currentDate = new Date(start);
    while (currentDate <= end) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  if (!fontsLoaded) return null;

  // Show detailed period view
  if (selectedWeek) {
    const periodDays = getPeriodDays(selectedWeek.startDate, selectedWeek.endDate);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <ChevronLeft size={22} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text
              style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              {selectedWeek.name}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              {formatDateRange(selectedWeek.startDate, selectedWeek.endDate)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => setShowWeekOptions(selectedWeek)}
          >
            <Copy size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Week Summary */}
          <View style={styles.weekSummaryCard}>
            <View style={styles.summaryHeader}>
              <Calendar size={24} color="#8B5CF6" />
              <View style={styles.summaryInfo}>
                <Text
                  style={[
                    styles.summaryTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Period Summary
                </Text>
                <Text
                  style={[
                    styles.summaryStats,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {selectedWeek.mealsPlanned} of {selectedWeek.totalPossibleMeals}{" "}
                  meals planned
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(selectedWeek.status) + "20",
                  },
                ]}
              >
                {getStatusIcon(selectedWeek.status)}
                <Text
                  style={[
                    styles.statusText,
                    {
                      fontFamily: "Inter_600SemiBold",
                      color: getStatusColor(selectedWeek.status),
                    },
                  ]}
                >
                  {selectedWeek.status === "completed" ? "Complete" : "Partial"}
                </Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${selectedWeek.planningPercentage || 0}%`,
                      backgroundColor: getStatusColor(selectedWeek.status),
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.progressText, { fontFamily: "Inter_500Medium" }]}
              >
                {selectedWeek.planningPercentage || 0}% planned
              </Text>
            </View>
          </View>

          {/* Daily Meals */}
          <View style={styles.dailyMealsSection}>
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Meal Plan Details
            </Text>

            {periodDays.map((day, index) => {
              const dateStr = formatDateString(day);
              const dayMeals = selectedWeek.meals?.[dateStr];

              return (
                <View key={index} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text
                      style={[
                        styles.dayName,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {day.toLocaleDateString("en-US", { weekday: "long" })}
                    </Text>
                    <Text
                      style={[
                        styles.dayDate,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {day.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>

                  {dayMeals ? (
                    <View style={styles.mealsGrid}>
                      {["breakfast", "lunch", "dinner"].map((mealType) => {
                        const meal = dayMeals[mealType];

                        return (
                          <View key={mealType} style={styles.mealSlot}>
                            <View style={styles.mealSlotHeader}>
                              {getMealIcon(mealType)}
                              <Text
                                style={[
                                  styles.mealSlotType,
                                  { fontFamily: "Inter_500Medium" },
                                ]}
                              >
                                {mealType.charAt(0).toUpperCase() +
                                  mealType.slice(1)}
                              </Text>
                            </View>

                            {meal ? (
                              <View style={styles.mealDetails}>
                                <Text
                                  style={[
                                    styles.mealName,
                                    { fontFamily: "Inter_500Medium" },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {meal.name}
                                </Text>
                                <Text
                                  style={[
                                    styles.mealMeta,
                                    { fontFamily: "Inter_400Regular" },
                                  ]}
                                >
                                  {meal.cooking_time} min
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.emptyMeal}>
                                <Text
                                  style={[
                                    styles.emptyMealText,
                                    { fontFamily: "Inter_400Regular" },
                                  ]}
                                >
                                  No meal
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyDay}>
                      <Text
                        style={[
                          styles.emptyDayText,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        No meals planned for this day
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show history list
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Meal Plan History
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === "week" && styles.viewModeButtonActive,
          ]}
          onPress={() => {
            setViewMode("week");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === "week" && styles.viewModeButtonTextActive,
              { fontFamily: viewMode === "week" ? "Inter_600SemiBold" : "Inter_500Medium" },
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === "2weeks" && styles.viewModeButtonActive,
          ]}
          onPress={() => {
            setViewMode("2weeks");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === "2weeks" && styles.viewModeButtonTextActive,
              { fontFamily: viewMode === "2weeks" ? "Inter_600SemiBold" : "Inter_500Medium" },
            ]}
          >
            2 Weeks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === "month" && styles.viewModeButtonActive,
          ]}
          onPress={() => {
            setViewMode("month");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === "month" && styles.viewModeButtonTextActive,
              { fontFamily: viewMode === "month" ? "Inter_600SemiBold" : "Inter_500Medium" },
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={async () => {
              setRefreshing(true);
              await queryClient.invalidateQueries(["meal-plan-history"]);
              setRefreshing(false);
            }}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        {(() => {
          if (!isAuthenticated) {
            return (
              <View style={styles.authPrompt}>
                <Calendar size={48} color="#8B5CF6" />
                <Text style={[styles.authTitle, { fontFamily: "Inter_700Bold" }]}>
                  View Your History
                </Text>
                <Text style={[styles.authText, { fontFamily: "Inter_400Regular" }]}>
                  Sign in to see your past meal plans and reuse successful weeks
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
            );
          }

          if (isLoading) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
                  Loading meal plan history...
                </Text>
              </View>
            );
          }

          const hasData = historicalPeriods?.data?.length > 0;

          if (hasData) {
            return (
              <View style={styles.historyContainer}>
                {/* Current Week Indicator */}
                <View style={styles.currentWeekCard}>
                  <View style={styles.currentWeekHeader}>
                    <Calendar size={20} color="#8B5CF6" />
                    <Text
                      style={[
                        styles.currentWeekText,
                        { fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      Current planning period
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewCurrentButton}
                    onPress={() => router.push("/meal-planning")}
                  >
                    <Text
                      style={[
                        styles.viewCurrentButtonText,
                        { fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      View Current Plan
                    </Text>
                    <ChevronRight size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>

                {/* Historical Periods */}
                <View style={styles.historySection}>
                  <Text
                    style={[
                      styles.historySectionTitle,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Past Meal Plans
                  </Text>

                  <View style={styles.weeksContainer}>
                    {(historicalPeriods?.data || []).map((period) => {
                      const planningPercentage = period.totalPossibleMeals > 0
                        ? (period.mealsPlanned / period.totalPossibleMeals) * 100
                        : 0;

                      return (
                        <TouchableOpacity
                          key={period.id}
                          style={styles.weekCard}
                          onPress={() => handleWeekPress(period)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.weekCardLeft}>
                            <View style={styles.weekIcon}>
                              <Calendar size={20} color="#8B5CF6" />
                            </View>
                            <View style={styles.weekInfo}>
                              <Text
                                style={[
                                  styles.weekTitle,
                                  { fontFamily: "Inter_600SemiBold" },
                                ]}
                              >
                                {period.name}
                              </Text>
                              <Text
                                style={[
                                  styles.weekStats,
                                  { fontFamily: "Inter_400Regular" },
                                ]}
                              >
                                {period.mealsPlanned} of {period.totalPossibleMeals} meals planned •{" "}
                                {period.totalRecipes} recipes
                              </Text>
                              <View style={styles.weekMeta}>
                                <View
                                  style={[
                                    styles.weekStatusBadge,
                                    {
                                      backgroundColor:
                                        getStatusColor(period.status) + "20",
                                    },
                                  ]}
                                >
                                  {getStatusIcon(period.status)}
                                  <Text
                                    style={[
                                      styles.weekStatusText,
                                      {
                                        fontFamily: "Inter_500Medium",
                                        color: getStatusColor(period.status),
                                      },
                                    ]}
                                  >
                                    {Math.round(planningPercentage)}% planned
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          <View style={styles.weekCardRight}>
                            <TouchableOpacity
                              style={styles.weekOptionsButton}
                              onPress={() => handleWeekOptions(period)}
                            >
                              <MoreVertical size={16} color="#999999" />
                            </TouchableOpacity>
                            <ChevronRight size={20} color="#CCCCCC" />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.emptyContainer}>
              <Calendar size={64} color="#E0E0E0" />
              <Text
                style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}
              >
                No History Yet
              </Text>
              <Text
                style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}
              >
                Your meal plan history will appear here once you start planning meals.
              </Text>
            </View>
          );
        })()}
      </ScrollView>

      {/* Week Options Modal */}
      {showWeekOptions && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowWeekOptions(null)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text
                  style={[
                    styles.modalTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {showWeekOptions.name}
                </Text>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setShowWeekOptions(null)}
                >
                  <X size={20} color="#666666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleViewWeek}
              >
                <Eye size={18} color="#666666" />
                <Text
                  style={[
                    styles.modalOptionText,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  View Details
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleCopyWeek}
              >
                <Copy size={18} color="#8B5CF6" />
                <Text
                  style={[
                    styles.modalOptionTextPrimary,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  Copy This Week's Plan
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}
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
  headerTitleContainer: {
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  headerRight: {
    width: 38,
  },
  viewModeContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F5F5F5",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  viewModeButtonActive: {
    backgroundColor: "#8B5CF6",
  },
  viewModeButtonText: {
    fontSize: 14,
    color: "#666666",
  },
  viewModeButtonTextActive: {
    color: "#FFFFFF",
  },
  copyButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F3FF",
    justifyContent: "center",
    alignItems: "center",
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

  // Current Week Card
  currentWeekCard: {
    backgroundColor: "#F3F3FF",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#8B5CF6",
  },
  currentWeekHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  currentWeekText: {
    fontSize: 14,
    color: "#8B5CF6",
    marginLeft: 8,
  },
  viewCurrentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  viewCurrentButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
  },

  // History Container
  historyContainer: {
    paddingBottom: 40,
  },
  historySection: {
    marginBottom: 32,
  },
  historySectionTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
  weeksContainer: {
    gap: 12,
  },

  // Week Cards
  weekCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  weekCardLeft: {
    flexDirection: "row",
    flex: 1,
  },
  weekIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  weekInfo: {
    flex: 1,
  },
  weekTitle: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
    flexShrink: 1,
  },
  weekStats: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  weekMeta: {
    marginTop: 8,
  },
  weekStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    alignSelf: "flex-start",
  },
  weekStatusText: {
    fontSize: 10,
  },
  weekCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weekOptionsButton: {
    padding: 8,
    borderRadius: 8,
  },

  // Week Detail View
  weekSummaryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  summaryTitle: {
    fontSize: 18,
    color: "#000000",
    lineHeight: 24,
  },
  summaryStats: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#666666",
    minWidth: 80,
    textAlign: "right",
  },

  // Daily Meals Section
  dailyMealsSection: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#F8F9FA",
  },
  dayName: {
    fontSize: 16,
    color: "#000000",
  },
  dayDate: {
    fontSize: 12,
    color: "#666666",
  },
  mealsGrid: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  mealSlot: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
  },
  mealSlotHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  mealSlotType: {
    fontSize: 10,
    color: "#666666",
    textTransform: "uppercase",
  },
  mealDetails: {
    gap: 4,
  },
  mealName: {
    fontSize: 12,
    color: "#000000",
    lineHeight: 16,
  },
  mealMeta: {
    fontSize: 10,
    color: "#999999",
  },
  emptyMeal: {
    paddingVertical: 8,
    alignItems: "center",
  },
  emptyMealText: {
    fontSize: 10,
    color: "#CCCCCC",
  },
  emptyDay: {
    padding: 20,
    alignItems: "center",
  },
  emptyDayText: {
    fontSize: 14,
    color: "#999999",
  },

  // Modal
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    color: "#000000",
    flex: 1,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: "#000000",
  },
  modalOptionTextPrimary: {
    fontSize: 16,
    color: "#8B5CF6",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    color: "#000000",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
});
