import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  BackHandler,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
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
import { useRouter, useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";
import { IngredientIcon } from "@/components/IngredientIcon";

export default function GroceryListsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();

  const [viewMode, setViewMode] = useState("week"); // "week" | "2weeks" | "month"
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Update the ref when selectedPeriod changes
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        gestureEnabled: !selectedPeriod,
      });
    }, [navigation, selectedPeriod])
  );

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Helper functions for period grouping
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
      // Get last day of the month
      end.setMonth(startDate.getMonth() + 1, 0);
    }
    return end;
  };

  const formatPeriodName = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getFullYear() === end.getFullYear()) {
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startStr} - ${endStr}`;
    } else {
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startStr} - ${endStr}`;
    }
  };

  const formatDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  // Fetch existing grocery lists
  const { data: groceryListsData, isLoading: isLoadingLists } = useQuery({
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

  // Generate all periods (past, current, future) and match with existing lists
  const allPeriods = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create a map of existing lists by period key
    const listsByPeriod = new Map();
    if (groceryListsData?.data) {
      groceryListsData.data.forEach((list) => {
        const startDate = list.meal_plan_week 
          ? new Date(list.meal_plan_week) 
          : new Date(list.created_at);
        
        if (!startDate || isNaN(startDate.getTime())) return;

        const periodStart = getPeriodStart(startDate, viewMode);
        if (!periodStart || isNaN(periodStart.getTime())) return;
        
        const periodKey = formatDateString(periodStart);
        
        if (!listsByPeriod.has(periodKey)) {
          listsByPeriod.set(periodKey, []);
        }
        listsByPeriod.get(periodKey).push(list);
      });
    }

    // Generate periods: continuous range from oldest past to newest future
    const periods = [];
    const addedPeriodKeys = new Set(); // Track added keys to prevent duplicates
    const numPastPeriods = 8;
    const numFuturePeriods = 4;

    // Calculate the oldest period start date
    let oldestPeriodStart;
    if (viewMode === "week") {
      const oldestDate = new Date(today);
      oldestDate.setDate(today.getDate() - (numPastPeriods * 7));
      oldestPeriodStart = getPeriodStart(oldestDate, viewMode);
    } else if (viewMode === "2weeks") {
      const oldestDate = new Date(today);
      oldestDate.setDate(today.getDate() - (numPastPeriods * 14));
      oldestPeriodStart = getPeriodStart(oldestDate, viewMode);
    } else if (viewMode === "month") {
      const targetMonth = today.getMonth() - numPastPeriods;
      const targetYear = today.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      oldestPeriodStart = new Date(targetYear, normalizedMonth, 1);
    } else {
      oldestPeriodStart = getPeriodStart(today, viewMode);
    }

    // Calculate the newest period start date
    let newestPeriodStart;
    if (viewMode === "week") {
      const newestDate = new Date(today);
      newestDate.setDate(today.getDate() + (numFuturePeriods * 7));
      newestPeriodStart = getPeriodStart(newestDate, viewMode);
    } else if (viewMode === "2weeks") {
      const newestDate = new Date(today);
      newestDate.setDate(today.getDate() + (numFuturePeriods * 14));
      newestPeriodStart = getPeriodStart(newestDate, viewMode);
    } else if (viewMode === "month") {
      const targetMonth = today.getMonth() + numFuturePeriods;
      const targetYear = today.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      newestPeriodStart = new Date(targetYear, normalizedMonth, 1);
    } else {
      newestPeriodStart = getPeriodStart(today, viewMode);
    }

    // Generate ALL periods in the continuous range
    let currentPeriodDate = new Date(oldestPeriodStart);
    const todayTime = today.getTime();

    while (currentPeriodDate <= newestPeriodStart) {
      const periodStart = getPeriodStart(currentPeriodDate, viewMode);
      if (!periodStart || isNaN(periodStart.getTime())) {
        // Move to next period
        if (viewMode === "week") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 7);
        } else if (viewMode === "2weeks") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 14);
        } else if (viewMode === "month") {
          currentPeriodDate.setMonth(currentPeriodDate.getMonth() + 1);
        } else {
          break;
        }
        continue;
      }

      const periodEnd = getPeriodEnd(periodStart, viewMode);
      if (!periodEnd || isNaN(periodEnd.getTime())) {
        // Move to next period
        if (viewMode === "week") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 7);
        } else if (viewMode === "2weeks") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 14);
        } else if (viewMode === "month") {
          currentPeriodDate.setMonth(currentPeriodDate.getMonth() + 1);
        } else {
          break;
        }
        continue;
      }

      const periodKey = formatDateString(periodStart);
      
      // Skip if this period key already exists (prevents duplicate keys)
      if (addedPeriodKeys.has(periodKey)) {
        // Move to next period
        if (viewMode === "week") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 7);
        } else if (viewMode === "2weeks") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 14);
        } else if (viewMode === "month") {
          currentPeriodDate.setMonth(currentPeriodDate.getMonth() + 1);
        } else {
          break;
        }
        continue;
      }

      const periodEndDate = new Date(periodEnd);
      periodEndDate.setHours(23, 59, 59, 999);
      
      const periodStartTime = periodStart.getTime();
      const periodEndTime = periodEndDate.getTime();
      
      const isPast = periodEndTime < todayTime;
      const isCurrent = periodStartTime <= todayTime && periodEndTime >= todayTime;
      const isFuture = periodStartTime > todayTime;
      
      const existingLists = listsByPeriod.get(periodKey) || [];
      const hasList = existingLists.length > 0;
      
      // Only show past periods if they have a list
      if (isPast && !hasList) {
        // Move to next period
        if (viewMode === "week") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 7);
        } else if (viewMode === "2weeks") {
          currentPeriodDate.setDate(currentPeriodDate.getDate() + 14);
        } else if (viewMode === "month") {
          currentPeriodDate.setMonth(currentPeriodDate.getMonth() + 1);
        } else {
          break;
        }
        continue;
      }
      
      // Get the most recent list for this period (if multiple exist, use the latest)
      const list = existingLists.length > 0 
        ? existingLists.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        : null;
      
      const items = list ? parseItems(list.items) : [];
      const checkedCount = items.filter((item) => item?.checked === true).length;
      const estimatedCost = list ? Number(list.estimated_cost) || 0 : 0;
      const completionPercentage = items.length > 0 
        ? Math.round((checkedCount / items.length) * 100) 
        : 0;
      
      // Status logic: past periods show "incomplete" for partial, current/future show "partial"
      const isCompleted = items.length > 0 && (checkedCount / items.length) >= 0.8;
      const status = isPast 
        ? (isCompleted ? "completed" : "incomplete")
        : (isCompleted ? "completed" : "partial");
      
      periods.push({
        id: periodKey,
        startDate: periodKey,
        endDate: formatDateString(periodEnd),
        name: formatPeriodName(periodStart, periodEnd),
        list: list,
        hasList: hasList,
        isPast: isPast,
        isCurrent: isCurrent,
        isFuture: isFuture,
        totalItems: items.length,
        checkedItems: checkedCount,
        estimatedCost: estimatedCost,
        completionPercentage: completionPercentage,
        status: status,
      });
      
      addedPeriodKeys.add(periodKey);

      // Move to next period
      if (viewMode === "week") {
        currentPeriodDate.setDate(currentPeriodDate.getDate() + 7);
      } else if (viewMode === "2weeks") {
        currentPeriodDate.setDate(currentPeriodDate.getDate() + 14);
      } else if (viewMode === "month") {
        currentPeriodDate.setMonth(currentPeriodDate.getMonth() + 1);
      } else {
        break;
      }
    }


    return periods.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [groceryListsData?.data, viewMode]);

  // Get items for selected period
  const selectedPeriodItems = useMemo(() => {
    if (!selectedPeriod || !selectedPeriod.list) return [];
    return parseItems(selectedPeriod.list.items);
  }, [selectedPeriod]);

  // Update selectedPeriod when allPeriods changes (after query refetch)
  // Only update if selectedPeriod is not null (user is viewing a detail)
  useEffect(() => {
    if (!selectedPeriod) return; // Don't run if no period is selected
    
    if (allPeriods.length > 0) {
      const updatedPeriod = allPeriods.find((p) => p.id === selectedPeriod.id);
      if (updatedPeriod) {
        // Only update if data actually changed (avoid unnecessary re-renders)
        const currentItems = parseItems(selectedPeriod.list?.items || []);
        const updatedItems = parseItems(updatedPeriod.list?.items || []);
        if (JSON.stringify(currentItems) !== JSON.stringify(updatedItems)) {
          setSelectedPeriod(updatedPeriod);
        }
      }
    }
  }, [allPeriods, selectedPeriod]);

  // Handle swipe back gesture - clear selectedPeriod instead of navigating away
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        gestureEnabled: !selectedPeriod,
      });
    }, [navigation, selectedPeriod])
  );

  // Generate grocery list mutation
  const generateListMutation = useMutation({
    mutationFn: async ({ startDate, endDate }) => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const periodName = formatPeriodName(new Date(startDate), new Date(endDate));
      const response = await fetch(`${apiUrl}/api/grocery-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth?.user?.id,
          startDate,
          endDate,
          name: `Grocery List - ${periodName}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate grocery list");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["grocery-lists"]);
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

  // Handle period selection
  const handlePeriodPress = (period) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPeriod(period);
  };

  // Handle generate for specific period
  const handleGenerateForPeriod = (period) => {
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

    generateListMutation.mutate({
      startDate: period.startDate,
      endDate: period.endDate,
    });
  };

  const handleBackPress = () => {
    if (selectedPeriod) {
      // Clear selected period to go back to list view
      setSelectedPeriod(null);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return;
    }
    // If no period selected, navigate back to previous screen
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleToggleItem = (itemIndex) => {
    // Don't allow editing past lists
    if (selectedPeriod?.isPast) {
      return;
    }

    if (!selectedPeriod || !selectedPeriod.list || !Array.isArray(selectedPeriodItems) || itemIndex < 0 || itemIndex >= selectedPeriodItems.length) {
      return;
    }

    const updatedItems = [...selectedPeriodItems];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      checked: !(updatedItems[itemIndex]?.checked || false),
    };

    // Optimistically update the selected period
    const updatedList = {
      ...selectedPeriod.list,
      items: JSON.stringify(updatedItems),
    };
    const updatedSelectedPeriod = {
      ...selectedPeriod,
      list: updatedList,
      checkedItems: updatedItems.filter((item) => item?.checked === true).length,
      completionPercentage: updatedItems.length > 0 
        ? Math.round((updatedItems.filter((item) => item?.checked === true).length / updatedItems.length) * 100) 
        : 0,
      status: updatedItems.length > 0 && (updatedItems.filter((item) => item?.checked === true).length / updatedItems.length) >= 0.8 
        ? "completed" 
        : selectedPeriod.isPast 
        ? "incomplete" 
        : "partial",
    };
    setSelectedPeriod(updatedSelectedPeriod);

    updateListMutation.mutate({
      listId: selectedPeriod.list.id,
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

  // Calculate progress for selected period
  const getProgress = () => {
    if (!selectedPeriod || !Array.isArray(selectedPeriodItems) || selectedPeriodItems.length === 0) {
      return { checked: 0, total: 0, percentage: 0 };
    }

    const total = selectedPeriodItems.length;
    const checked = selectedPeriodItems.filter((item) => item?.checked === true).length;
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

    return { checked, total, percentage };
  };

  const progress = selectedPeriod ? getProgress() : { checked: 0, total: 0, percentage: 0 };

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
          <History size={22} color="#FF9F1C" />
        </TouchableOpacity>
      </View>

      {/* View Mode Selector */}
      {!selectedPeriod && (
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
          )}

      {/* Show detail view if period is selected */}
      {selectedPeriod ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isLoadingLists}
              onRefresh={async () => {
                setRefreshing(true);
                await queryClient.invalidateQueries(["grocery-lists"]);
                setRefreshing(false);
              }}
              colors={["#FF9F1C"]}
              tintColor="#FF9F1C"
            />
          }
        >
          {/* Period Summary */}
          <View style={styles.periodSummaryCard}>
            <View style={styles.summaryHeader}>
              <ShoppingCart size={24} color="#FF9F1C" />
              <View style={styles.summaryInfo}>
                  <Text
                    style={[
                    styles.summaryTitle,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                  {selectedPeriod.name}
                  </Text>
                  <Text
                    style={[
                    styles.summaryStats,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {progress.checked} of {progress.total} items •{" "}
                    {progress.percentage}% complete
                  </Text>
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
                Estimated cost: ${(selectedPeriod.estimatedCost || 0).toFixed(2)}
              </Text>
            </View>
            </View>

            {/* Grocery Items */}
            <View style={styles.itemsContainer}>
            {Array.isArray(selectedPeriodItems) && selectedPeriodItems.length > 0 ? (
              selectedPeriodItems.map((item, index) => {
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
                      selectedPeriod?.isPast && styles.itemCardPast,
                    ]}
                    onPress={() => {
                      if (!selectedPeriod?.isPast) {
                        handleToggleItem(index);
                      }
                    }}
                    activeOpacity={selectedPeriod?.isPast ? 1 : 0.7}
                    disabled={selectedPeriod?.isPast}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.checkboxContainer}>
                        {isChecked ? (
                          <CheckCircle 
                            size={22} 
                            color={selectedPeriod?.isPast ? "#999999" : "#22C55E"} 
                          />
                        ) : (
                          <Circle 
                            size={22} 
                            color={selectedPeriod?.isPast ? "#E5E5E5" : "#CCCCCC"} 
                          />
                      )}
                    </View>
                    {(() => {
                      const iconData = getIngredientIcon(itemName);
                      return (
                        <Image
                          source={{ uri: iconData.imageUrl }}
                          style={styles.itemImage}
                          contentFit="cover"
                          defaultSource={{ uri: iconData.fallbackUrl }}
                        />
                      );
                    })()}
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
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isLoadingLists}
              onRefresh={async () => {
                setRefreshing(true);
                await queryClient.invalidateQueries(["grocery-lists"]);
                setRefreshing(false);
              }}
              colors={["#FF9F1C"]}
              tintColor="#FF9F1C"
            />
          }
        >

          {/* All Periods List */}
          <View style={styles.periodsSection}>
            {allPeriods.length > 0 ? (
              <View style={styles.periodsContainer}>
                {allPeriods.map((period) => {
                  // Show "Generate List" button for periods without lists
                  if (!period.hasList) {
                    return (
                      <View
                        key={period.id}
                        style={[styles.periodCard, styles.periodCardNoList]}
                      >
                        <View style={styles.periodCardLeft}>
                          <View style={styles.periodIcon}>
                            <Calendar size={20} color="#FF9F1C" />
                          </View>
                          <View style={styles.periodInfo}>
            <Text
                              style={[
                                styles.periodTitle,
                                { fontFamily: "Inter_600SemiBold" },
                              ]}
            >
                              {period.name}
            </Text>
            <Text
                              style={[
                                styles.periodStats,
                                { fontFamily: "Inter_400Regular" },
                              ]}
            >
                              No list generated yet
            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.generateButtonInline,
                            generateListMutation.isPending && styles.generateButtonInlineDisabled,
                          ]}
                          onPress={() => handleGenerateForPeriod(period)}
                          disabled={generateListMutation.isPending}
                        >
                <Text
                  style={[
                              styles.generateButtonInlineText,
                              { fontFamily: "Inter_500Medium" },
                  ]}
                >
                            {generateListMutation.isPending ? "Generating..." : "Generate"}
                </Text>
                          {!generateListMutation.isPending && (
                            <Plus size={16} color="#FFFFFF" />
                          )}
              </TouchableOpacity>
                      </View>
                    );
                  }

                  // Show list card for periods with lists
                  return (
              <TouchableOpacity
                      key={period.id}
                style={[
                        styles.periodCard,
                        period.isPast && styles.periodCardPast,
                      ]}
                      onPress={() => handlePeriodPress(period)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.periodCardLeft}>
                        <View style={styles.periodIcon}>
                          <ShoppingCart size={20} color={period.isPast ? "#999999" : "#FF9F1C"} />
                        </View>
                        <View style={styles.periodInfo}>
                          <View style={styles.periodTitleRow}>
                            <Text
                              style={[
                                styles.periodTitle,
                                { fontFamily: "Inter_600SemiBold" },
                                period.isPast && styles.periodTitlePast,
                              ]}
                            >
                              {period.name}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.periodStats,
                              { fontFamily: "Inter_400Regular" },
                              period.isPast && styles.periodStatsPast,
                            ]}
                          >
                            {period.checkedItems} of {period.totalItems} items checked •{" "}
                            ${(period.estimatedCost || 0).toFixed(2)}
                          </Text>
                          <View style={styles.periodMeta}>
                            <View
                              style={[
                                styles.periodStatusBadge,
                                {
                                  backgroundColor:
                                    period.status === "completed"
                                      ? "#22C55E20"
                                      : "#F59E0B20",
                                },
                                period.isPast && styles.periodStatusBadgePast,
                              ]}
                            >
                              {period.status === "completed" ? (
                                <CheckCircle size={16} color={period.isPast ? "#999999" : "#22C55E"} />
                              ) : (
                                <Clock size={16} color={period.isPast ? "#999999" : "#F59E0B"} />
                )}
                <Text
                  style={[
                                  styles.periodStatusText,
                                  {
                                    fontFamily: "Inter_500Medium",
                                    color: period.isPast
                                      ? "#999999"
                                      : period.status === "completed"
                                      ? "#22C55E"
                                      : "#F59E0B",
                                  },
                                ]}
                              >
                                {period.status === "completed" 
                                  ? "Completed" 
                                  : period.isPast 
                                  ? "Past" 
                                  : "In Progress"}
                </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <View style={styles.periodCardRight}>
                        <ChevronRight size={20} color={period.isPast ? "#CCCCCC" : "#FF9F1C"} />
                      </View>
              </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={[styles.emptyStateText, { fontFamily: "Inter_400Regular" }]}>
                  No grocery lists yet
                </Text>
          </View>
        )}
          </View>
      </ScrollView>
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
  historyButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // View Mode Selector
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
    backgroundColor: "#FF9F1C",
  },
  viewModeButtonText: {
    fontSize: 14,
    color: "#666666",
  },
  viewModeButtonTextActive: {
    color: "#FFFFFF",
  },

  // Period Summary Card (Detail View)
  periodSummaryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryInfo: {
    marginLeft: 12,
    flex: 1,
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

  // Current Period Card
  currentPeriodCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  currentPeriodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  currentPeriodText: {
    fontSize: 14,
    color: "#666666",
  },
  viewCurrentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FF9F1C",
  },
  viewCurrentButtonText: {
    fontSize: 16,
    color: "#FF9F1C",
  },

  // Periods Section
  periodsSection: {
    paddingBottom: 40,
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
    backgroundColor: "#FFF5E6",
  },
  dateOptionText: {
    fontSize: 16,
    color: "#000000",
  },
  dateOptionTextSelected: {
    color: "#FF9F1C",
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
    gap: 12,
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
    backgroundColor: "#FF9F1C",
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
  generateButtonInline: {
    backgroundColor: "#FF9F1C",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  generateButtonInlineDisabled: {
    backgroundColor: "#CCCCCC",
  },
  generateButtonInlineText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  signInButton: {
    backgroundColor: "#FF9F1C",
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

  // Period Cards
  periodsContainer: {
    gap: 12,
    marginTop: 12,
  },
  periodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  periodCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  periodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  periodInfo: {
    flex: 1,
  },
  periodTitle: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
    flexShrink: 1,
  },
  periodStats: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  periodMeta: {
    marginTop: 8,
  },
  periodStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    alignSelf: "flex-start",
  },
  periodStatusText: {
    fontSize: 12,
  },
  periodCardRight: {
    marginLeft: 12,
  },
  periodCardNoList: {
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  periodCardPast: {
    backgroundColor: "#FAFAFA",
    borderColor: "#E5E5E5",
    opacity: 0.8,
  },
  periodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  periodTitlePast: {
    color: "#999999",
  },
  periodStatsPast: {
    color: "#999999",
  },
  periodStatusBadgePast: {
    opacity: 0.7,
  },
  readOnlyBadge: {
    backgroundColor: "#F3F3F3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readOnlyBadgeText: {
    fontSize: 10,
    color: "#666666",
  },
  itemCardPast: {
    backgroundColor: "#FAFAFA",
    borderColor: "#E5E5E5",
    opacity: 0.8,
  },
});
