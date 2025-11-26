import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
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
  Plus,
  Coffee,
  Sun,
  Moon,
  CheckCircle,
  Clock,
  MoreVertical,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";
import { RecipeSelectionModal } from "./RecipeSelectionModal";

const { width: screenWidth } = Dimensions.get("window");

export default function MealPlanningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const { auth, isAuthenticated, signIn } = useAuth();
  
  // Handle date from URL params (from calendar navigation)
  const getInitialDate = () => {
    if (params.selectedDate) {
      const date = new Date(params.selectedDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [selectedDateForMeal, setSelectedDateForMeal] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Generate next 14 days starting from today
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 14; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push({
        date: day.toISOString().split("T")[0],
        day: day,
      });
    }
    return days;
  };

  const next14Days = getNext14Days();
  
  // Update selectedDate if it's not in the 14-day range
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 13);
    
    if (selectedDate < today || selectedDate > maxDate) {
      setSelectedDate(today);
    }
  }, []);

  // Fetch meal plans for the next 14 days
  const { data: mealPlans, isLoading } = useQuery({
    queryKey: [
      "meal-plans",
      auth?.user?.id,
      next14Days[0]?.date,
      next14Days[13]?.date,
    ],
    queryFn: async () => {
      if (!auth?.user?.id) return { data: [] };

      const startDate = next14Days[0].date;
      const endDate = next14Days[13].date;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(
        `${apiUrl}/api/meal-plans?userId=${auth.user.id}&startDate=${startDate}&endDate=${endDate}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch meal plans");
      }

      return response.json();
    },
    enabled: !!auth?.user?.id && isAuthenticated,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Add meal mutation
  const addMealMutation = useMutation({
    mutationFn: async ({ date, mealType, recipeId }) => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      console.log('Adding meal from meal planning:', { date, mealType, recipeId, userId: auth?.user?.id });
      
      const response = await fetch(`${apiUrl}/api/meal-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth?.user?.id,
          date,
          mealType,
          recipeId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Add meal error:', errorData);
        throw new Error(errorData.error || "Failed to add meal");
      }

      const result = await response.json();
      console.log('Meal added successfully:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["meal-plans"]);
      setShowRecipeModal(false);
      setSelectedDateForMeal(null);
      setSelectedMealType(null);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: () => {
      Alert.alert("Error", "Failed to add meal to plan");
    },
  });

  // Remove meal mutation
  const removeMealMutation = useMutation({
    mutationFn: async ({ date, mealType }) => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      console.log('Removing meal:', { date, mealType, userId: auth?.user?.id });
      
      const response = await fetch(
        `${apiUrl}/api/meal-plans?userId=${auth?.user?.id}&date=${date}&mealType=${mealType}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Remove meal error:', errorData);
        throw new Error(errorData.error || "Failed to remove meal");
      }

      const result = await response.json();
      console.log('Meal removed successfully:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["meal-plans"]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: () => {
      Alert.alert("Error", "Failed to remove meal from plan");
    },
  });

  // Generate grocery list mutation
  const generateGroceryListMutation = useMutation({
    mutationFn: async () => {
      const startDate = next14Days[0].date;
      const endDate = next14Days[13].date;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/grocery-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth?.user?.id,
          startDate,
          endDate,
          name: `Grocery List - ${next14Days[0].day.toLocaleDateString()} to ${next14Days[13].day.toLocaleDateString()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate grocery list");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const estimatedCost = data.data.estimated_cost || 0;
      const itemCount = data.data.items ? data.data.items.length : 0;

      Alert.alert(
        "Grocery List Generated!",
        `Created a list with ${itemCount} items. Estimated cost: $${estimatedCost.toFixed(2)}`,
        [{ text: "OK", style: "default" }],
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to generate grocery list");
    },
  });

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddMeal = (date, mealType) => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to create meal plans", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    setSelectedDateForMeal(date);
    setSelectedMealType(mealType);
    setShowRecipeModal(true);
  };

  const handleRecipeSelect = (recipe) => {
    addMealMutation.mutate({
      date: selectedDateForMeal,
      mealType: selectedMealType,
      recipeId: recipe.id,
    });
  };

  const handleRemoveMeal = (date, mealType) => {
    Alert.alert(
      "Remove Meal",
      "Are you sure you want to remove this meal from your plan?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeMealMutation.mutate({
              date: date.toISOString().split("T")[0],
              mealType,
            });
          },
        },
      ]
    );
  };

  const handleGenerateGroceryList = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to generate grocery lists",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => signIn() },
        ],
      );
      return;
    }

    if (!mealPlans?.data || mealPlans.data.length === 0) {
      Alert.alert(
        "No Meal Plans",
        "Please add some meals to your plan first to generate a grocery list.",
      );
      return;
    }

    Alert.alert(
      "Generate Grocery List",
      "Create a grocery list from your meal plans for this week?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: () => generateGroceryListMutation.mutate(),
        },
      ],
    );
  };

  const getMealForSlot = (date, mealType) => {
    if (!mealPlans?.data) return null;

    const dateStr = date.toISOString().split("T")[0];
    return mealPlans.data.find(
      (plan) => plan.date === dateStr && plan.meal_type === mealType,
    );
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case "breakfast":
        return <Coffee size={18} color="#FF9F1C" />;
      case "lunch":
        return <Sun size={18} color="#4CAF50" />;
      case "dinner":
        return <Moon size={18} color="#2196F3" />;
      default:
        return <Clock size={18} color="#666666" />;
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Meal Planning
        </Text>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => router.push("/meal-calendar")}
          >
            <Calendar size={20} color="#FF9F1C" />
          </TouchableOpacity>
        )}
        {!isAuthenticated && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isAuthenticated && (
          <View style={styles.authPrompt}>
            <Calendar size={48} color="#FF9F1C" />
            <Text style={[styles.authTitle, { fontFamily: "Inter_700Bold" }]}>
              Plan Your Meals
            </Text>
            <Text style={[styles.authText, { fontFamily: "Inter_400Regular" }]}>
              Sign in to create weekly meal plans and organize your cooking
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
        )}

        {/* 14-Day Navigation */}
        <View style={styles.weekContainer}>
          <Text style={[styles.weekTitle, { fontFamily: "Inter_700Bold" }]}>
            Next 14 Days
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.daysScroll}
            contentContainerStyle={styles.daysScrollContent}
          >
            {next14Days.map((dayObj, index) => {
              const date = dayObj.day;
              return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayItem,
                  isToday(date) && styles.dayItemToday,
                  selectedDate.toDateString() === date.toDateString() &&
                    styles.dayItemSelected,
                ]}
                onPress={() => handleDateSelect(date)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { fontFamily: "Inter_500Medium" },
                    isToday(date) && styles.dayTextToday,
                    selectedDate.toDateString() === date.toDateString() &&
                      styles.dayTextSelected,
                  ]}
                >
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { fontFamily: "Inter_600SemiBold" },
                    isToday(date) && styles.dayNumberToday,
                    selectedDate.toDateString() === date.toDateString() &&
                      styles.dayNumberSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
            })}
          </ScrollView>
        </View>

        {/* Selected Day Meals */}
        <View style={styles.daySection}>
          <Text style={[styles.dayTitle, { fontFamily: "Inter_700Bold" }]}>
            {formatDate(selectedDate)}
          </Text>

          {["breakfast", "lunch", "dinner"].map((mealType) => {
            const meal = getMealForSlot(selectedDate, mealType);

            return (
              <View key={mealType} style={styles.mealSlot}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealLabelContainer}>
                    {getMealIcon(mealType)}
                    <Text
                      style={[
                        styles.mealLabel,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    </Text>
                  </View>

                  {isAuthenticated && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() =>
                        handleAddMeal(
                          selectedDate.toISOString().split("T")[0],
                          mealType,
                        )
                      }
                    >
                      <Plus size={16} color="#FF9F1C" />
                    </TouchableOpacity>
                  )}
                </View>

                {meal ? (
                  <TouchableOpacity
                    style={styles.plannedMeal}
                    onPress={() =>
                      router.push(`/recipe-detail?id=${meal.recipe_id}`)
                    }
                    onLongPress={() =>
                      handleRemoveMeal(selectedDate, mealType)
                    }
                  >
                    <View style={styles.mealInfo}>
                      <Text
                        style={[
                          styles.mealName,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {meal.recipe_name}
                      </Text>
                      <Text
                        style={[
                          styles.mealMeta,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        {meal.cooking_time} mins • {meal.cuisine}
                      </Text>
                    </View>
                    <View style={styles.mealActions}>
                      <CheckCircle size={20} color="#4CAF50" />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveMeal(selectedDate, mealType)}
                      >
                        <MoreVertical size={18} color="#666666" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.emptyMeal}>
                    <Text
                      style={[
                        styles.emptyMealText,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      No meal planned
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Quick Actions */}
        {isAuthenticated && (
          <View style={styles.actionsSection}>
            <Text
              style={[styles.actionsTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Quick Actions
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/search")}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  { fontFamily: "Inter_500Medium" },
                ]}
              >
                Browse Recipes to Add
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={handleGenerateGroceryList}
            >
              <Text
                style={[
                  styles.actionButtonTextSecondary,
                  { fontFamily: "Inter_500Medium" },
                ]}
              >
                Generate Grocery List
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Recipe Selection Modal */}
      {isAuthenticated && (
        <RecipeSelectionModal
          visible={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false);
            setSelectedDateForMeal(null);
            setSelectedMealType(null);
          }}
          selectedDate={selectedDateForMeal}
          selectedMealType={selectedMealType}
          onSelectRecipe={handleRecipeSelect}
          fontFamily={{
            regular: "Inter_400Regular",
            medium: "Inter_500Medium",
            semiBold: "Inter_600SemiBold",
            bold: "Inter_700Bold",
          }}
          isAuthenticated={isAuthenticated}
        />
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
  placeholder: {
    width: 38,
  },
  calendarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF4E6",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
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
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  authButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  weekContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  weekTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 16,
  },
  daysScroll: {
    marginHorizontal: -16,
  },
  daysScrollContent: {
    paddingHorizontal: 16,
  },
  dayItem: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    minWidth: 70,
  },
  dayItemToday: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9F1C",
  },
  dayItemSelected: {
    backgroundColor: "#FF9F1C",
  },
  dayText: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  dayTextToday: {
    color: "#FF9F1C",
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  dayNumber: {
    fontSize: 16,
    color: "#000000",
  },
  dayNumberToday: {
    color: "#FF9F1C",
  },
  dayNumberSelected: {
    color: "#FFFFFF",
  },
  daySection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  dayTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 16,
  },
  mealSlot: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealLabel: {
    fontSize: 16,
    color: "#000000",
    marginLeft: 8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  plannedMeal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
  },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removeButton: {
    padding: 4,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
  },
  mealMeta: {
    fontSize: 12,
    color: "#666666",
  },
  emptyMeal: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyMealText: {
    fontSize: 14,
    color: "#999999",
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  actionsTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    color: "#000000",
  },
});
