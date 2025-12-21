import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
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
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  ChevronDown,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  ShoppingCart,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

export default function FoodBudgetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState("monthly"); // "weekly", "biweekly", "monthly"
  const [showPeriodOptions, setShowPeriodOptions] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const budgetPeriodOptions = [
    { value: "weekly", label: "Weekly", multiplier: 1 },
    { value: "biweekly", label: "Bi-Weekly", multiplier: 2 },
    { value: "monthly", label: "Monthly", multiplier: 4.33 },
  ];

  // Fetch user preferences (includes budget)
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ["preferences", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(
        `${apiUrl}/api/preferences?userId=${auth.user.id}`,
      );
      if (!response.ok) throw new Error("Failed to fetch preferences");
      const result = await response.json();
      return result.success ? result.data : null;
    },
    enabled: !!auth?.user?.id && isAuthenticated,
  });

  // Derive current budget from preferences
  const currentBudget = {
    amount: preferences?.budgetAmount || null,
    period: preferences?.budgetPeriod || "monthly",
  };

  // Fetch grocery lists for budget analysis
  const { data: groceryLists, isLoading } = useQuery({
    queryKey: ["grocery-lists", auth?.user?.id],
    queryFn: async () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(
        `${apiUrl}/api/grocery-lists?userId=${auth?.user?.id}`,
      );
      if (!response.ok) throw new Error("Failed to fetch grocery lists");
      return response.json();
    },
    enabled: !!auth?.user?.id && isAuthenticated,
  });

  // Calculate spending analytics based on user's budget period
  const getSpendingAnalytics = () => {
    if (!groceryLists?.data) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all lists from last 30 days for averaging
    const recentLists = groceryLists.data.filter((list) => {
      const listDate = new Date(list.created_at);
      return listDate >= thirtyDaysAgo;
    });

    const totalSpent30Days = recentLists.reduce(
      (sum, list) => sum + (Number(list.estimated_cost) || 0),
      0,
    );

    // If no budget set, return basic stats
    if (!currentBudget.amount) {
      const averageWeekly = totalSpent30Days / 4.33;
      const averageBiWeekly = totalSpent30Days / 2.17;
      return {
        periodType: "monthly",
        periodLabel: "Monthly",
        averageSpending: totalSpent30Days,
        budgetAmount: 0,
        progress: 0,
        totalSpent30Days,
        averageWeekly,
        averageBiWeekly,
        listsCount30Days: recentLists.length,
      };
    }

    // Get user's budget period
    const budgetPeriod = currentBudget.period || "monthly";
    const currentPeriod = budgetPeriodOptions.find(
      (p) => p.value === budgetPeriod,
    );

    // Calculate average spending for the user's budget period
    let averageSpending;
    let periodLabel;
    
    if (budgetPeriod === "weekly") {
      // Average weekly spending over last 30 days
      averageSpending = totalSpent30Days / 4.33;
      periodLabel = "Weekly";
    } else if (budgetPeriod === "biweekly") {
      // Average bi-weekly spending over last 30 days
      averageSpending = totalSpent30Days / 2.17;
      periodLabel = "Bi-Weekly";
    } else {
      // Monthly: average monthly spending (last 30 days = 1 month)
      averageSpending = totalSpent30Days;
      periodLabel = "Monthly";
    }

    // Compare average spending to user's budget amount (not converted)
    const budgetAmount = currentBudget.amount;
    const progress = budgetAmount > 0 ? (averageSpending / budgetAmount) * 100 : 0;

    // Calculate other stats for display
    const averageWeekly = totalSpent30Days / 4.33;
    const averageBiWeekly = totalSpent30Days / 2.17;

    return {
      periodType: budgetPeriod,
      periodLabel: periodLabel,
      averageSpending: averageSpending,
      budgetAmount: budgetAmount,
      progress: progress,
      totalSpent30Days: totalSpent30Days,
      averageWeekly: averageWeekly,
      averageBiWeekly: averageBiWeekly,
      listsCount30Days: recentLists.length,
    };
  };

  const analytics = getSpendingAnalytics();

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // Save budget mutation with optimistic updates
  const saveBudgetMutation = useMutation({
    mutationFn: async ({ budgetAmount, budgetPeriod }) => {
      if (!auth?.user?.id) throw new Error("User not authenticated");
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.user.id,
          ...preferences,
          budgetAmount,
          budgetPeriod,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save budget");
      }

      return response.json();
    },
    onMutate: async ({ budgetAmount, budgetPeriod }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(["preferences", auth?.user?.id]);

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData(["preferences", auth?.user?.id]);

      // Optimistically update
      queryClient.setQueryData(["preferences", auth?.user?.id], (old) => ({
        ...old,
        budgetAmount,
        budgetPeriod,
      }));

      return { previousPreferences };
    },
    onError: (err, newBudget, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(["preferences", auth?.user?.id], context.previousPreferences);
      }
      Alert.alert("Error", err.message || "Failed to save budget. Please try again.");
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setShowBudgetModal(false);
      setBudgetAmount("");
      Alert.alert(
        "Budget Updated",
        "Your food budget has been updated successfully!",
      );
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(["preferences", auth?.user?.id]);
    },
  });

  const handleEditBudget = () => {
    setBudgetAmount(currentBudget.amount ? currentBudget.amount.toString() : "");
    setBudgetPeriod(currentBudget.period || "monthly");
    setShowBudgetModal(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSaveBudget = () => {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid budget amount");
      return;
    }

    saveBudgetMutation.mutate({
      budgetAmount: amount,
      budgetPeriod: budgetPeriod,
    });
  };

  const getBudgetStatus = (progress) => {
    if (progress <= 70) {
      return {
        status: "good",
        color: "#22C55E",
        icon: CheckCircle,
        text: "On Track",
      };
    } else if (progress <= 90) {
      return {
        status: "warning",
        color: "#F59E0B",
        icon: AlertCircle,
        text: "Close to Limit",
      };
    } else {
      return {
        status: "over",
        color: "#EF4444",
        icon: TrendingUp,
        text: "Over Budget",
      };
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return "$0.00";
    return `$${numAmount.toFixed(2)}`;
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
          Food Budget
        </Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditBudget}>
          <Edit size={20} color="#FF9F1C" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isAuthenticated ? (
          <View style={styles.authPrompt}>
            <DollarSign size={48} color="#FF9F1C" />
            <Text style={[styles.authTitle, { fontFamily: "Inter_700Bold" }]}>
              Track Your Budget
            </Text>
            <Text style={[styles.authText, { fontFamily: "Inter_400Regular" }]}>
              Sign in to set and track your food spending budget
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
        ) : isLoadingPreferences ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
              Loading budget...
            </Text>
          </View>
        ) : (
          <>
            {/* Current Budget Card */}
            <View style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetIcon}>
                  <DollarSign size={24} color="#FFFFFF" />
                </View>
                <View style={styles.budgetInfo}>
                  <Text
                    style={[
                      styles.budgetLabel,
                      { fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    Current Budget
                  </Text>
                  <Text
                    style={[
                      styles.budgetAmount,
                      { fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    {currentBudget.amount 
                      ? formatCurrency(currentBudget.amount)
                      : "Not set"}
                  </Text>
                  {currentBudget.amount && (
                    <Text
                      style={[
                        styles.budgetPeriod,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      per {currentBudget.period}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Analytics */}
            {analytics && (
              <>
                {/* Period Overview */}
                <View style={styles.overviewCard}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {analytics.periodLabel} Overview
                  </Text>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text
                        style={[
                          styles.progressLabel,
                          { fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        Spending Progress
                      </Text>
                      <Text
                        style={[
                          styles.progressAmount,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {formatCurrency(analytics.averageSpending)} /{" "}
                        {formatCurrency(analytics.budgetAmount)}
                      </Text>
                    </View>

                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(analytics.progress, 100)}%`,
                            backgroundColor: getBudgetStatus(
                              analytics.progress,
                            ).color,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.progressFooter}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              getBudgetStatus(analytics.progress).color +
                              "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              fontFamily: "Inter_600SemiBold",
                              color: getBudgetStatus(analytics.progress)
                                .color,
                            },
                          ]}
                        >
                          {getBudgetStatus(analytics.progress).text}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.progressPercentage,
                          { fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        {Math.round(analytics.progress)}% used
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Calendar size={20} color="#FF9F1C" />
                    </View>
                    <Text
                      style={[
                        styles.statValue,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {formatCurrency(analytics.averageSpending)}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      Avg {analytics.periodLabel}
                    </Text>
                    <Text
                      style={[
                        styles.statSubLabel,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      (last 30 days)
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <DollarSign size={20} color="#FF9F1C" />
                    </View>
                    <Text
                      style={[
                        styles.statValue,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {formatCurrency(analytics.totalSpent30Days)}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      Total Spent
                    </Text>
                    <Text
                      style={[
                        styles.statSubLabel,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      (last 30 days)
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      {analytics.progress <= 100 ? (
                        <TrendingDown size={20} color="#22C55E" />
                      ) : (
                        <TrendingUp size={20} color="#EF4444" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.statValue,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {formatCurrency(
                        Math.abs(
                          analytics.budgetAmount - analytics.averageSpending,
                        ),
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {analytics.progress <= 100
                        ? "Remaining"
                        : "Over Budget"}
                    </Text>
                  </View>
                </View>

                {/* Tips Card */}
                <View style={styles.tipsCard}>
                  <Text
                    style={[styles.cardTitle, { fontFamily: "Inter_600SemiBold" }]}
                  >
                    Budget Tips
                  </Text>
                  <View style={styles.tipsList}>
                    <View style={styles.tip}>
                      <View style={styles.tipIcon}>
                        <Target size={16} color="#FF9F1C" />
                      </View>
                      <Text
                        style={[styles.tipText, { fontFamily: "Inter_400Regular" }]}
                      >
                        Plan your meals ahead to avoid impulse purchases
                      </Text>
                    </View>
                    <View style={styles.tip}>
                      <View style={styles.tipIcon}>
                        <CheckCircle size={16} color="#22C55E" />
                      </View>
                      <Text
                        style={[styles.tipText, { fontFamily: "Inter_400Regular" }]}
                      >
                        Buy in-season ingredients to save money
                      </Text>
                    </View>
                    <View style={styles.tip}>
                      <View style={styles.tipIcon}>
                        <ShoppingCart size={16} color="#F59E0B" />
                      </View>
                      <Text
                        style={[styles.tipText, { fontFamily: "Inter_400Regular" }]}
                      >
                        Check your grocery list progress to track spending
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Budget Modal */}
      <Modal
        visible={showBudgetModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowBudgetModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
              >
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, { fontFamily: "Inter_600SemiBold" }]}
                  >
                    Set Food Budget
                  </Text>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setShowBudgetModal(false)}
                  >
                    <X size={20} color="#666666" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalBodyContent}>
                    <View style={styles.inputGroup}>
                      <Text
                        style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
                      >
                        Budget Amount
                      </Text>
                      <View style={styles.amountInputContainer}>
                        <Text
                          style={[
                            styles.currencySymbol,
                            { fontFamily: "Inter_500Medium" },
                          ]}
                        >
                          $
                        </Text>
                        <TextInput
                          style={[
                            styles.amountInput,
                            { fontFamily: "Inter_500Medium" },
                          ]}
                          placeholder="0.00"
                          placeholderTextColor="#999999"
                          value={budgetAmount}
                          onChangeText={setBudgetAmount}
                          keyboardType="numeric"
                          autoFocus={true}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text
                        style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
                      >
                        Budget Period
                      </Text>
                      <TouchableOpacity
                        style={styles.periodSelector}
                        onPress={() => setShowPeriodOptions(!showPeriodOptions)}
                      >
                        <Text
                          style={[
                            styles.periodText,
                            { fontFamily: "Inter_500Medium" },
                          ]}
                        >
                          {
                            budgetPeriodOptions.find((p) => p.value === budgetPeriod)
                              ?.label
                          }
                        </Text>
                        <ChevronDown size={20} color="#666666" />
                      </TouchableOpacity>

                      {showPeriodOptions && (
                        <View style={styles.periodOptions}>
                          {budgetPeriodOptions.map((option) => (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.periodOption,
                                budgetPeriod === option.value &&
                                  styles.periodOptionSelected,
                              ]}
                              onPress={() => {
                                setBudgetPeriod(option.value);
                                setShowPeriodOptions(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.periodOptionText,
                                  { fontFamily: "Inter_500Medium" },
                                  budgetPeriod === option.value &&
                                    styles.periodOptionTextSelected,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        saveBudgetMutation.isPending && styles.saveButtonDisabled,
                      ]}
                      onPress={handleSaveBudget}
                      disabled={saveBudgetMutation.isPending}
                    >
                      {saveBudgetMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Save size={20} color="#FFFFFF" />
                      )}
                      <Text
                        style={[
                          styles.saveButtonText,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {saveBudgetMutation.isPending ? "Saving..." : "Save Budget"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
  editButton: {
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
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  authButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Budget Card
  budgetCard: {
    backgroundColor: "#FF9F1C",
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  budgetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 36,
  },
  budgetPeriod: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
  progressContainer: {
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 14,
    color: "#666666",
  },
  progressAmount: {
    fontSize: 16,
    color: "#000000",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
  },
  progressPercentage: {
    fontSize: 14,
    color: "#666666",
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  statSubLabel: {
    fontSize: 10,
    color: "#999999",
    textAlign: "center",
    marginTop: 2,
  },

  // Activity Card
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 14,
    color: "#FF9F1C",
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: "#000000",
    lineHeight: 20,
  },
  activityDate: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    color: "#000000",
  },

  // Tips Card
  tipsCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  tipsList: {
    gap: 12,
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    color: "#000000",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    maxHeight: 400,
  },
  modalBodyContent: {
    gap: 20,
    paddingBottom: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: "#000000",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  currencySymbol: {
    fontSize: 18,
    color: "#666666",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    color: "#000000",
    padding: 0,
  },
  periodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  periodText: {
    fontSize: 16,
    color: "#000000",
  },
  periodOptions: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  periodOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  periodOptionSelected: {
    backgroundColor: "#FFF5E6",
  },
  periodOptionText: {
    fontSize: 16,
    color: "#000000",
  },
  periodOptionTextSelected: {
    color: "#FF9F1C",
  },
  saveButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});
