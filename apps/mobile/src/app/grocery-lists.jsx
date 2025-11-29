import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
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
  ShoppingCart,
  Calendar,
  Plus,
  CheckCircle,
  Circle,
  Clock,
  DollarSign,
  ChevronDown,
  History,
  Settings,
  RefreshCw,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

export default function GroceryListsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();

  const [selectedDateRange, setSelectedDateRange] = useState("7"); // 7 or 14 days
  const [showDateOptions, setShowDateOptions] = useState(false);
  const [currentListId, setCurrentListId] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Date range options
  const dateRangeOptions = [
    { value: "7", label: "Next 7 Days", days: 7 },
    { value: "14", label: "Next 14 Days", days: 14 },
  ];

  // Calculate date range
  const getDateRange = (days) => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + parseInt(days) - 1);

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
      label: `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    };
  };

  const currentDateRange = getDateRange(selectedDateRange);

  // Fetch existing grocery lists
  const { data: existingLists, isLoading: isLoadingLists } = useQuery({
    queryKey: ["grocery-lists", auth?.user?.id],
    queryFn: async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
        const response = await fetch(
          `${apiUrl}/api/grocery-lists?userId=${auth?.user?.id}`,
        );
        if (!response.ok) {
          console.warn("Failed to fetch grocery lists, using empty data");
          return { data: [] };
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching grocery lists:", error);
        return { data: [] };
      }
    },
    enabled: !!auth?.user?.id && isAuthenticated,
  });

  // Helper function to parse items (might be JSON string from database)
  const parseItems = (items) => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Error parsing items:", e);
        return [];
      }
    }
    return [];
  };

  // Find current list for selected date range
  const currentList = existingLists?.data?.find((list) => {
    if (!list.created_from_meal_plan || !list.meal_plan_week) return false;
    
    try {
      const listStartDate = new Date(list.meal_plan_week);
      const rangeStartDate = new Date(currentDateRange.start);
      
      // Check if dates are on the same day
      return (
        listStartDate.getFullYear() === rangeStartDate.getFullYear() &&
        listStartDate.getMonth() === rangeStartDate.getMonth() &&
        listStartDate.getDate() === rangeStartDate.getDate()
      );
    } catch (error) {
      console.error("Error comparing dates:", error);
      return false;
    }
  });

  // Parse items for current list
  const currentListItems = currentList ? parseItems(currentList.items) : [];

  // Generate grocery list mutation
  const generateListMutation = useMutation({
    mutationFn: async () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/grocery-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth?.user?.id,
          startDate: currentDateRange.start,
          endDate: currentDateRange.end,
          name: `Grocery List - ${currentDateRange.label}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate grocery list");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["grocery-lists"]);
      setCurrentListId(data.data.id);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to generate grocery list");
    },
  });

  // Update grocery list mutation
  const updateListMutation = useMutation({
    mutationFn: async ({ listId, items }) => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/grocery-lists`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId,
          items,
          userId: auth?.user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update grocery list");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["grocery-lists"]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to update item");
    },
  });

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleDateRangeSelect = (value) => {
    setSelectedDateRange(value);
    setShowDateOptions(false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGenerateList = () => {
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

    generateListMutation.mutate();
  };

  const handleToggleItem = (itemIndex) => {
    if (!currentList || !Array.isArray(currentListItems) || itemIndex < 0 || itemIndex >= currentListItems.length) {
      return;
    }

    const updatedItems = [...currentListItems];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      checked: !(updatedItems[itemIndex]?.checked || false),
    };

    updateListMutation.mutate({
      listId: currentList.id,
      items: updatedItems,
    });
  };

  const handleHistoryPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/grocery-history");
  };

  const handleBudgetPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/food-budget");
  };

  // Calculate progress
  const getProgress = () => {
    if (!Array.isArray(currentListItems) || currentListItems.length === 0) {
      return { checked: 0, total: 0, percentage: 0 };
    }

    const total = currentListItems.length;
    const checked = currentListItems.filter((item) => item?.checked === true).length;
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

    return { checked, total, percentage };
  };

  const progress = getProgress();

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
          Grocery Lists
        </Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={handleHistoryPress}
        >
          <History size={22} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingLists}
            onRefresh={() => queryClient.invalidateQueries(["grocery-lists"])}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Date Range Selector */}
        <View style={styles.dateRangeSection}>
          <Text
            style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Select Period
          </Text>
          <TouchableOpacity
            style={styles.dateRangeSelector}
            onPress={() => setShowDateOptions(!showDateOptions)}
          >
            <Calendar size={20} color="#8B5CF6" />
            <Text
              style={[styles.dateRangeText, { fontFamily: "Inter_500Medium" }]}
            >
              {
                dateRangeOptions.find((opt) => opt.value === selectedDateRange)
                  ?.label
              }
            </Text>
            <ChevronDown size={20} color="#666666" />
          </TouchableOpacity>

          {showDateOptions && (
            <View style={styles.dateOptions}>
              {dateRangeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dateOption,
                    selectedDateRange === option.value &&
                      styles.dateOptionSelected,
                  ]}
                  onPress={() => handleDateRangeSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      { fontFamily: "Inter_500Medium" },
                      selectedDateRange === option.value &&
                        styles.dateOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text
            style={[
              styles.dateRangeSubtext,
              { fontFamily: "Inter_400Regular" },
            ]}
          >
            {currentDateRange.label}
          </Text>
        </View>

        {/* Current List */}
        {currentList ? (
          <View style={styles.currentListSection}>
            {/* Progress Header */}
            <View style={styles.progressHeader}>
              <View style={styles.progressInfo}>
                <ShoppingCart size={24} color="#8B5CF6" />
                <View style={styles.progressText}>
                  <Text
                    style={[
                      styles.listTitle,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Your Grocery List
                  </Text>
                  <Text
                    style={[
                      styles.progressStats,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {progress.checked} of {progress.total} items •{" "}
                    {progress.percentage}% complete
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.budgetButton}
                onPress={handleBudgetPress}
              >
                <DollarSign size={20} color="#22C55E" />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress.percentage}%` },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.progressPercentage,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {progress.percentage}%
              </Text>
            </View>

            {/* Budget Summary */}
            <View style={styles.budgetSummary}>
              <Text
                style={[styles.budgetText, { fontFamily: "Inter_500Medium" }]}
              >
                Estimated cost: ${(Number(currentList.estimated_cost) || 0).toFixed(2)}
              </Text>
            </View>

            {/* Grocery Items */}
            <View style={styles.itemsContainer}>
              {Array.isArray(currentListItems) && currentListItems.length > 0 ? (
                currentListItems.map((item, index) => {
                  const isChecked = item?.checked === true;
                  const itemName = item?.name || "Unknown Item";
                  const itemAmount = item?.amount || 0;
                  const itemUnit = item?.unit || "";
                  const itemPrice = Number(item?.estimated_price) || 0;

                  return (
                    <TouchableOpacity
                      key={item?.id || index}
                      style={[
                        styles.itemCard,
                        isChecked && styles.itemCardChecked,
                      ]}
                      onPress={() => handleToggleItem(index)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.itemLeft}>
                        <View style={styles.checkboxContainer}>
                          {isChecked ? (
                            <CheckCircle size={22} color="#22C55E" />
                          ) : (
                            <Circle size={22} color="#CCCCCC" />
                          )}
                        </View>
                        <View style={styles.itemInfo}>
                          <Text
                            style={[
                              styles.itemName,
                              { fontFamily: "Inter_500Medium" },
                              isChecked && styles.itemNameChecked,
                            ]}
                          >
                            {itemName}
                          </Text>
                          <Text
                            style={[
                              styles.itemQuantity,
                              { fontFamily: "Inter_400Regular" },
                              isChecked && styles.itemQuantityChecked,
                            ]}
                          >
                            {itemAmount} {itemUnit}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.itemRight}>
                        <Text
                          style={[
                            styles.itemPrice,
                            { fontFamily: "Inter_500Medium" },
                            isChecked && styles.itemPriceChecked,
                          ]}
                        >
                          ${itemPrice.toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyItemsContainer}>
                  <Text style={[styles.emptyItemsText, { fontFamily: "Inter_400Regular" }]}>
                    No items in this list
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* No List State */
          <View style={styles.noListSection}>
            <ShoppingCart size={64} color="#E0E0E0" />
            <Text
              style={[styles.noListTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              No Grocery List Yet
            </Text>
            <Text
              style={[styles.noListText, { fontFamily: "Inter_400Regular" }]}
            >
              Generate a grocery list from your meal plans for the selected
              period.
            </Text>

            {!isAuthenticated ? (
              <TouchableOpacity style={styles.signInButton} onPress={signIn}>
                <Text
                  style={[
                    styles.signInButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Sign In to Generate List
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  generateListMutation.isPending &&
                    styles.generateButtonDisabled,
                ]}
                onPress={handleGenerateList}
                disabled={generateListMutation.isPending}
              >
                {generateListMutation.isPending ? (
                  <RefreshCw size={20} color="#FFFFFF" />
                ) : (
                  <Plus size={20} color="#FFFFFF" />
                )}
                <Text
                  style={[
                    styles.generateButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {generateListMutation.isPending
                    ? "Generating..."
                    : "Generate List"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
  historyButton: {
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

  // Date Range Section
  dateRangeSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 12,
  },
  dateRangeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dateRangeText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  dateOptions: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dateOptionSelected: {
    backgroundColor: "#F3F3FF",
  },
  dateOptionText: {
    fontSize: 16,
    color: "#000000",
  },
  dateOptionTextSelected: {
    color: "#8B5CF6",
  },
  dateRangeSubtext: {
    fontSize: 14,
    color: "#666666",
    marginTop: 8,
    textAlign: "center",
  },

  // Current List Section
  currentListSection: {
    paddingBottom: 40,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  progressText: {
    marginLeft: 12,
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    color: "#000000",
    lineHeight: 24,
  },
  progressStats: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  budgetButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },

  // Progress Bar
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    marginRight: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: "#22C55E",
    minWidth: 40,
    textAlign: "right",
  },

  // Budget Summary
  budgetSummary: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  budgetText: {
    fontSize: 16,
    color: "#000000",
    textAlign: "center",
  },

  // Items
  itemsContainer: {
    gap: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  itemCardChecked: {
    backgroundColor: "#F8FDF8",
    borderColor: "#22C55E",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
  },
  itemNameChecked: {
    color: "#666666",
    textDecorationLine: "line-through",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  itemQuantityChecked: {
    color: "#999999",
  },
  itemRight: {
    alignItems: "flex-end",
  },
  itemPrice: {
    fontSize: 16,
    color: "#000000",
  },
  itemPriceChecked: {
    color: "#666666",
  },

  // No List Section
  noListSection: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  noListTitle: {
    fontSize: 24,
    color: "#000000",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  noListText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  generateButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  signInButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  signInButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  emptyItemsContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyItemsText: {
    fontSize: 14,
    color: "#999999",
  },
});
