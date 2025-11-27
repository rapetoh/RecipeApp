import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

const { width: screenWidth } = Dimensions.get("window");

export default function MealCalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch meal plans for the current month
  const { data: mealPlans } = useQuery({
    queryKey: [
      "calendar-meal-plans",
      auth?.user?.id,
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
    ],
    queryFn: async () => {
      if (!auth?.user?.id) return { data: [] };

      // Get first and last day of the month
      const firstDay = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      );
      const lastDay = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
      );

      const startDate = firstDay.toISOString().split("T")[0];
      const endDate = lastDay.toISOString().split("T")[0];

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      console.log('📅 Calendar fetching meal plans:', { startDate, endDate, userId: auth.user.id });

      const response = await fetch(
        `${apiUrl}/api/meal-plans?userId=${auth.user.id}&startDate=${startDate}&endDate=${endDate}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch meal plans");
      }

      const result = await response.json();
      console.log('📅 Calendar received meal plans:', result);
      return result;
    },
    enabled: !!auth?.user?.id && isAuthenticated,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when navigating to calendar
  });

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleDateSelect = (date) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const dateStr = date.toISOString().split("T")[0];
    
    // Store selected date in query cache for meal planning to pick up
    queryClient.setQueryData(['selectedDateFromCalendar'], dateStr);
    
    // Navigate back to previous screen (meal planning)
    router.back();
  };

  const handlePreviousMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstDayOfMonth);

    // Start from the previous Sunday
    const dayOfWeek = firstDayOfMonth.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);

      const isCurrentMonth = day.getMonth() === month;
      const isToday = day.getTime() === today.getTime();
      const isPast = day < today;
      const hasMeals = hasPlannedMeals(day);

      days.push({
        date: day,
        dayNumber: day.getDate(),
        isCurrentMonth,
        isToday,
        isPast,
        hasMeals,
      });
    }

    return days;
  };

  const hasPlannedMeals = (date) => {
    if (!mealPlans?.data) return false;

    const dateStr = date.toISOString().split("T")[0];
    return mealPlans.data.some((plan) => {
      const planDateStr = plan.date.split("T")[0];
      return planDateStr === dateStr;
    });
  };

  const getMealCount = (date) => {
    if (!mealPlans?.data) return 0;

    const dateStr = date.toISOString().split("T")[0];
    return mealPlans.data.filter((plan) => {
      const planDateStr = plan.date.split("T")[0];
      return planDateStr === dateStr;
    }).length;
  };

  // Check if a day has all meals planned (breakfast, lunch, dinner)
  const isDayFullyPlanned = (date) => {
    if (!mealPlans?.data) return false;
    
    const dateStr = date.toISOString().split("T")[0];
    const mealsForDay = mealPlans.data.filter((plan) => {
      const planDateStr = plan.date.split("T")[0];
      return planDateStr === dateStr;
    });
    
    // Check if we have all 3 meal types
    const mealTypes = mealsForDay.map(m => m.meal_type);
    return mealTypes.includes('breakfast') && 
           mealTypes.includes('lunch') && 
           mealTypes.includes('dinner');
  };

  if (!fontsLoaded) {
    return null;
  }

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarDays = generateCalendarDays();

  // Split days into weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Meal Calendar
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            style={styles.monthButton}
            onPress={handlePreviousMonth}
          >
            <ChevronLeft size={20} color="#FF9F1C" />
          </TouchableOpacity>

          <View style={styles.monthTitleContainer}>
            <CalendarIcon size={20} color="#FF9F1C" />
            <Text style={[styles.monthTitle, { fontFamily: "Inter_700Bold" }]}>
              {monthName}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.monthButton}
            onPress={handleNextMonth}
          >
            <ChevronRight size={20} color="#FF9F1C" />
          </TouchableOpacity>
        </View>

        {/* Week Days Header */}
        <View style={styles.weekDaysHeader}>
          {weekDays.map((day) => (
            <View key={day} style={styles.weekDayItem}>
              <Text
                style={[
                  styles.weekDayText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((dayData, dayIndex) => {
                const mealCount = getMealCount(dayData.date);
                const isFullyPlanned = isDayFullyPlanned(dayData.date);

                // Debug log for specific dates
                if (dayData.dayNumber === 26 && dayData.isCurrentMonth) {
                  console.log('📅 Calendar - Nov 26 Debug:', {
                    isFullyPlanned,
                    mealCount,
                    isToday: dayData.isToday,
                    dateStr: dayData.date.toISOString().split("T")[0],
                    mealsData: mealPlans?.data?.filter(p => {
                      const planDateStr = p.date.split("T")[0];
                      const targetDateStr = dayData.date.toISOString().split("T")[0];
                      return planDateStr === targetDateStr;
                    })
                  });
                }

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      !dayData.isCurrentMonth && styles.dayNotCurrentMonth,
                      dayData.isToday && styles.dayToday,
                      dayData.hasMeals && styles.dayWithMeals,
                      isFullyPlanned && styles.dayFullyPlanned,
                    ]}
                    onPress={() => handleDateSelect(dayData.date)}
                    disabled={dayData.isPast && !dayData.isToday}
                  >
                    {/* Checkmark badge for fully planned days */}
                    {isFullyPlanned && (
                      <View style={styles.completeBadge}>
                        <CheckCircle size={12} color="#4CAF50" />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.dayNumber,
                        { fontFamily: "Inter_600SemiBold" },
                        !dayData.isCurrentMonth &&
                          styles.dayNumberNotCurrentMonth,
                        dayData.isToday && styles.dayNumberToday,
                        dayData.isPast &&
                          !dayData.isToday &&
                          styles.dayNumberPast,
                        dayData.hasMeals && styles.dayNumberWithMeals,
                      ]}
                    >
                      {dayData.dayNumber}
                    </Text>

                    {/* Meal indicators */}
                    {mealCount > 0 && (
                      <View style={styles.mealIndicatorContainer}>
                        {Array.from({ length: Math.min(mealCount, 3) }).map(
                          (_, index) => (
                            <View key={index} style={styles.mealIndicator} />
                          ),
                        )}
                        {mealCount > 3 && (
                          <Text
                            style={[
                              styles.mealCountText,
                              { fontFamily: "Inter_500Medium" },
                            ]}
                          >
                            +{mealCount - 3}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text
            style={[styles.legendTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Legend
          </Text>

          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, styles.legendToday]} />
              <Text
                style={[styles.legendText, { fontFamily: "Inter_400Regular" }]}
              >
                Today
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, styles.legendWithMeals]} />
              <Text
                style={[styles.legendText, { fontFamily: "Inter_400Regular" }]}
              >
                Has meals planned
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, styles.legendFullyPlanned]} />
              <Text
                style={[styles.legendText, { fontFamily: "Inter_400Regular" }]}
              >
                All 3 meals planned
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.mealIndicator} />
              <Text
                style={[styles.legendText, { fontFamily: "Inter_400Regular" }]}
              >
                Each dot = 1 meal
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text
            style={[
              styles.instructionsText,
              { fontFamily: "Inter_400Regular" },
            ]}
          >
            Tap any date to view and plan meals for that day. Days with planned
            meals are highlighted.
          </Text>
        </View>
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
  placeholder: {
    width: 38,
  },
  content: {
    flex: 1,
  },

  // Month Navigation
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF4E6",
    justifyContent: "center",
    alignItems: "center",
  },
  monthTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthTitle: {
    fontSize: 20,
    color: "#000000",
  },

  // Week Days
  weekDaysHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  weekDayItem: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 12,
    color: "#666666",
  },

  // Calendar Grid
  calendarGrid: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    margin: 2,
    position: "relative",
    overflow: "visible",
  },
  dayNotCurrentMonth: {
    opacity: 0.3,
  },
  dayToday: {
    backgroundColor: "#FF9F1C",
  },
  dayWithMeals: {
    backgroundColor: "#FFF4E6",
    borderWidth: 2,
    borderColor: "#FF9F1C",
  },
  dayNumber: {
    fontSize: 16,
    color: "#000000",
    textAlign: "center",
  },
  dayNumberNotCurrentMonth: {
    color: "#CCCCCC",
  },
  dayNumberToday: {
    color: "#FFFFFF",
  },
  dayNumberPast: {
    color: "#CCCCCC",
  },
  dayNumberWithMeals: {
    color: "#FF9F1C",
  },
  dayFullyPlanned: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  completeBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 1,
    zIndex: 10,
    elevation: 5,
  },

  // Meal Indicators
  mealIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 4,
    gap: 2,
  },
  mealIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF9F1C",
  },
  mealCountText: {
    fontSize: 8,
    color: "#FF9F1C",
    marginLeft: 2,
  },

  // Legend
  legend: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginTop: 20,
  },
  legendTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 12,
  },
  legendItems: {
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  legendToday: {
    backgroundColor: "#FF9F1C",
  },
  legendWithMeals: {
    backgroundColor: "#FFF4E6",
    borderWidth: 2,
    borderColor: "#FF9F1C",
  },
  legendFullyPlanned: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  legendText: {
    fontSize: 14,
    color: "#666666",
  },

  // Instructions
  instructions: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  instructionsText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
});
