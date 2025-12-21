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
  CheckCircle,
  Circle,
  DollarSign,
  ChevronRight,
  Trash2,
  MoreVertical,
  X,
  Eye,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

export default function GroceryHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();
  const [selectedList, setSelectedList] = useState(null);
  const [showListOptions, setShowListOptions] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch grocery lists
  const {
    data: groceryLists,
    isLoading,
    refetch,
  } = useQuery({
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

  // Delete grocery list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId) => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/grocery-lists/${listId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: auth?.user?.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete grocery list");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["grocery-lists"]);
      setShowListOptions(null);
      setSelectedList(null);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to delete grocery list");
    },
  });

  const handleBackPress = () => {
    if (selectedList) {
      setSelectedList(null);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleListPress = (list) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedList(list);
  };

  const handleListOptions = (list) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowListOptions(list);
  };

  const handleDeleteList = () => {
    if (!showListOptions) return;

    Alert.alert(
      "Delete Grocery List",
      `Are you sure you want to delete "${showListOptions.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteListMutation.mutate(showListOptions.id),
        },
      ],
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDateRange = (list) => {
    if (!list.meal_plan_week) return formatDate(list.created_at);

    const startDate = new Date(list.meal_plan_week);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Assuming 7-day plans

    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
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

  const getListSummary = (list) => {
    const items = parseItems(list.items);
    const total = items.length;
    const checked = items.filter((item) => item?.checked === true).length;
    return {
      total,
      checked,
      percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
    };
  };

  const isRecentList = (list) => {
    const listDate = new Date(list.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now - listDate) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  };

  if (!fontsLoaded) return null;

  // Show detailed list view
  if (selectedList) {
    const summary = getListSummary(selectedList);

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
              Grocery List
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              {getDateRange(selectedList)}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* List Summary */}
          <View style={styles.listSummaryCard}>
            <View style={styles.summaryHeader}>
              <ShoppingCart size={24} color="#FF9F1C" />
              <View style={styles.summaryInfo}>
                <Text
                  style={[
                    styles.summaryTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {selectedList.name}
                </Text>
                <Text
                  style={[
                    styles.summaryStats,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {summary.checked} of {summary.total} items •{" "}
                  {summary.percentage}% complete
                </Text>
              </View>
              <View style={styles.summaryBadge}>
                <Text
                  style={[
                    styles.summaryBadgeText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {summary.percentage}%
                </Text>
              </View>
            </View>

            {/* Cost Summary */}
            <View style={styles.costSummary}>
              <Text
                style={[styles.costText, { fontFamily: "Inter_500Medium" }]}
              >
                Total estimated cost: $
                {(Number(selectedList.estimated_cost) || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Items List */}
          <View style={styles.itemsSection}>
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Items ({parseItems(selectedList.items).length})
            </Text>

            <View style={styles.itemsContainer}>
              {(() => {
                const items = parseItems(selectedList.items);
                return Array.isArray(items) && items.length > 0 ? (
                  items.map((item, index) => {
                    const isChecked = item?.checked === true;
                    const itemName = item?.name || "Unknown Item";
                    const itemAmount = item?.amount || 0;
                    const itemUnit = item?.unit || "";
                    const itemPrice = Number(item?.estimated_price) || 0;

                    return (
                      <View
                        key={item?.id || index}
                        style={[
                          styles.itemCard,
                          isChecked && styles.itemCardChecked,
                        ]}
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
                    );
                  })
                ) : (
                  <View style={styles.emptyItemsContainer}>
                    <Text style={[styles.emptyItemsText, { fontFamily: "Inter_400Regular" }]}>
                      No items in this list
                    </Text>
                  </View>
                );
              })()}
            </View>
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
          Grocery History
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={["#FF9F1C"]}
            tintColor="#FF9F1C"
          />
        }
      >
        {!isAuthenticated ? (
          <View style={styles.authPrompt}>
            <ShoppingCart size={48} color="#FF9F1C" />
            <Text style={[styles.authTitle, { fontFamily: "Inter_700Bold" }]}>
              View Your History
            </Text>
            <Text style={[styles.authText, { fontFamily: "Inter_400Regular" }]}>
              Sign in to see your past grocery lists
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
        ) : groceryLists?.data?.length > 0 ? (
          <View style={styles.listsContainer}>
            {groceryLists.data.map((list) => {
              const summary = getListSummary(list);
              const isRecent = isRecentList(list);

              return (
                <TouchableOpacity
                  key={list.id}
                  style={[styles.listCard, isRecent && styles.listCardRecent]}
                  onPress={() => handleListPress(list)}
                  activeOpacity={0.7}
                >
                  <View style={styles.listCardLeft}>
                    <View
                      style={[
                        styles.listIcon,
                        isRecent && styles.listIconRecent,
                      ]}
                    >
                      <ShoppingCart
                        size={20}
                        color={isRecent ? "#FF9F1C" : "#666666"}
                      />
                    </View>
                    <View style={styles.listCardInfo}>
                      <Text
                        style={[
                          styles.listCardTitle,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {list.name}
                      </Text>
                      <Text
                        style={[
                          styles.listCardDate,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        {getDateRange(list)}
                      </Text>
                      <Text
                        style={[
                          styles.listCardStats,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        {summary.total} items, {summary.checked} completed
                      </Text>
                    </View>
                  </View>

                  <View style={styles.listCardRight}>
                    <View style={styles.listCardMeta}>
                      <Text
                        style={[
                          styles.listCardCost,
                          { fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        ${(Number(list.estimated_cost) || 0).toFixed(2)}
                      </Text>
                      <View
                        style={[
                          styles.progressBadge,
                          summary.percentage === 100 &&
                            styles.progressBadgeComplete,
                        ]}
                      >
                        <Text
                          style={[
                            styles.progressBadgeText,
                            { fontFamily: "Inter_600SemiBold" },
                            summary.percentage === 100 &&
                              styles.progressBadgeTextComplete,
                          ]}
                        >
                          {summary.percentage}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.listCardActions}>
                      <TouchableOpacity
                        style={styles.listOptionsButton}
                        onPress={() => handleListOptions(list)}
                      >
                        <MoreVertical size={16} color="#999999" />
                      </TouchableOpacity>
                      <ChevronRight size={20} color="#CCCCCC" />
                    </View>
                  </View>

                  {isRecent && (
                    <View style={styles.recentBadge}>
                      <Text
                        style={[
                          styles.recentBadgeText,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        Recent
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ShoppingCart size={64} color="#E0E0E0" />
            <Text
              style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              No History Yet
            </Text>
            <Text
              style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}
            >
              Your grocery lists will appear here once you start creating them.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* List Options Modal */}
      {showListOptions && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowListOptions(null)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text
                  style={[
                    styles.modalTitle,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {showListOptions.name}
                </Text>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setShowListOptions(null)}
                >
                  <X size={20} color="#666666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowListOptions(null);
                  handleListPress(showListOptions);
                }}
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
                style={[styles.modalOption, styles.modalOptionDanger]}
                onPress={handleDeleteList}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text
                  style={[
                    styles.modalOptionTextDanger,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  Delete List
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

  // Lists Container
  listsContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  listCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    position: "relative",
  },
  listCardRecent: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF5E6",
  },
  listCardLeft: {
    flexDirection: "row",
    flex: 1,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listIconRecent: {
    backgroundColor: "#FFF5E6",
  },
  listCardInfo: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
  },
  listCardDate: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  listCardStats: {
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
  listCardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  listCardMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  listCardCost: {
    fontSize: 16,
    color: "#000000",
  },
  progressBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressBadgeComplete: {
    backgroundColor: "#DCFCE7",
  },
  progressBadgeText: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressBadgeTextComplete: {
    color: "#16A34A",
  },
  listCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listOptionsButton: {
    padding: 8,
    borderRadius: 8,
  },
  recentBadge: {
    position: "absolute",
    top: -6,
    right: 12,
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recentBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
  },

  // Selected List View
  listSummaryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  summaryBadge: {
    backgroundColor: "#22C55E",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryBadgeText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  costSummary: {
    marginTop: 8,
    alignItems: "center",
  },
  costText: {
    fontSize: 16,
    color: "#000000",
  },

  // Items Section
  itemsSection: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
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
  itemPrice: {
    fontSize: 16,
    color: "#000000",
  },
  itemPriceChecked: {
    color: "#666666",
  },

  // Empty State
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
  emptyItemsContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyItemsText: {
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
  modalOptionDanger: {
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: "#000000",
  },
  modalOptionTextDanger: {
    fontSize: 16,
    color: "#EF4444",
  },
});
