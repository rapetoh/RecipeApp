import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Search,
  Clock,
  ChefHat,
  Plus,
  Coffee,
  Sun,
  Moon,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/config/api";

const { width: screenWidth } = Dimensions.get("window");

export function RecipeSelectionModal({
  visible,
  onClose,
  selectedDate,
  selectedMealType,
  onSelectRecipe,
  fontFamily,
  isAuthenticated,
}) {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch recipes from user's collections (same as My Recipes page)
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["my-collections-recipes", auth?.user?.id, debouncedSearchQuery],
    queryFn: async () => {
      if (!auth?.user?.id) {
        throw new Error("User not authenticated");
      }

      const apiUrl = getApiUrl();
      const params = new URLSearchParams({
        limit: "20",
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      });

      // Use my-collections endpoint to get all recipes from user's collections
      const response = await fetch(`${apiUrl}/api/recipes/my-collections?userId=${auth.user.id}&${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
      }
      
      const result = await response.json();
      // Transform response to match expected format
      return {
        success: result.success,
        data: result.data?.recipes || [],
        total: result.data?.total || 0,
      };
    },
    enabled: visible && isAuthenticated && !!auth?.user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getMealTypeIcon = (mealType) => {
    switch (mealType) {
      case "breakfast":
        return <Coffee size={20} color="#FF9F1C" />;
      case "lunch":
        return <Sun size={20} color="#4CAF50" />;
      case "dinner":
        return <Moon size={20} color="#2196F3" />;
      default:
        return null;
    }
  };

  const getMealTypeColor = (mealType) => {
    switch (mealType) {
      case "breakfast":
        return "#FF9F1C";
      case "lunch":
        return "#4CAF50";
      case "dinner":
        return "#2196F3";
      default:
        return "#FF9F1C";
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleRecipeSelect = (recipe) => {
    onSelectRecipe(recipe);
    setSearchQuery(""); // Clear search for next time
  };

  const handleModalClose = () => {
    setSearchQuery(""); // Clear search when closing
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleModalClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleModalClose}
      >
        <View
          style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.mealTypeIcon,
                  {
                    backgroundColor: getMealTypeColor(selectedMealType) + "20",
                  },
                ]}
              >
                {getMealTypeIcon(selectedMealType)}
              </View>
              <View style={styles.headerText}>
                <Text
                  style={[styles.modalTitle, { fontFamily: fontFamily.bold }]}
                >
                  Add Recipe
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { fontFamily: fontFamily.medium },
                  ]}
                >
                  {selectedMealType?.charAt(0).toUpperCase() +
                    selectedMealType?.slice(1)}{" "}
                  • {formatDate(selectedDate)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleModalClose}
            >
              <X size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#666666" />
              <TextInput
                style={[styles.searchInput, { fontFamily: fontFamily.regular }]}
                placeholder="Search recipes..."
                placeholderTextColor="#999999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* Recipe List */}
          <ScrollView
            style={styles.recipeList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF9F1C" />
                <Text
                  style={[
                    styles.loadingText,
                    { fontFamily: fontFamily.medium },
                  ]}
                >
                  Loading recipes...
                </Text>
              </View>
            ) : recipes?.data?.length > 0 ? (
              <>
                {recipes.data.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCard}
                    onPress={() => handleRecipeSelect(recipe)}
                  >
                    {recipe.image_url ? (
                      <Image
                        source={{ uri: recipe.image_url }}
                        style={styles.recipeImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.recipeImagePlaceholder}>
                        <ChefHat size={24} color="#CCCCCC" />
                      </View>
                    )}

                    <View style={styles.recipeInfo}>
                      <Text
                        style={[
                          styles.recipeName,
                          { fontFamily: fontFamily.semiBold },
                        ]}
                        numberOfLines={2}
                      >
                        {recipe.name}
                      </Text>

                      <View style={styles.recipeMetaContainer}>
                        <View style={styles.recipeMeta}>
                          <Clock size={14} color="#666666" />
                          <Text
                            style={[
                              styles.recipeMetaText,
                              { fontFamily: fontFamily.regular },
                            ]}
                          >
                            {recipe.cooking_time || recipe.prep_time || "30"}{" "}
                            min
                          </Text>
                        </View>

                        {recipe.cuisine && (
                          <View style={styles.recipeMeta}>
                            <Text
                              style={[
                                styles.recipeMetaText,
                                { fontFamily: fontFamily.regular },
                              ]}
                            >
                              {recipe.cuisine}
                            </Text>
                          </View>
                        )}

                        {recipe.difficulty && (
                          <View style={styles.recipeMeta}>
                            <Text
                              style={[
                                styles.recipeMetaText,
                                { fontFamily: fontFamily.regular },
                              ]}
                            >
                              {recipe.difficulty}
                            </Text>
                          </View>
                        )}
                      </View>

                      {recipe.description && (
                        <Text
                          style={[
                            styles.recipeDescription,
                            { fontFamily: fontFamily.regular },
                          ]}
                          numberOfLines={2}
                        >
                          {recipe.description}
                        </Text>
                      )}
                    </View>

                    <View style={styles.addIconContainer}>
                      <Plus size={20} color="#FF9F1C" />
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Bottom spacing */}
                <View style={styles.bottomSpacing} />
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Search size={48} color="#CCCCCC" />
                <Text
                  style={[
                    styles.emptyTitle,
                    { fontFamily: fontFamily.semiBold },
                  ]}
                >
                  {searchQuery ? "No recipes found" : "Search for recipes"}
                </Text>
                <Text
                  style={[styles.emptyText, { fontFamily: fontFamily.regular }]}
                >
                  {searchQuery
                    ? `No recipes match "${searchQuery}". Try a different search term.`
                    : "Type in the search bar to find recipes to add to your meal plan."}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: "90%",
    flex: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },

  // Header
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mealTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    color: "#000000",
    lineHeight: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },

  // Search
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    padding: 0,
  },

  // Recipe List
  recipeList: {
    flex: 1,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
  },

  // Recipe Card
  recipeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    alignItems: "center",
  },
  recipeImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },
  recipeImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recipeInfo: {
    flex: 1,
    gap: 4,
  },
  recipeName: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
  },
  recipeMetaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 2,
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 12,
    color: "#666666",
  },
  recipeDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    marginTop: 4,
  },
  addIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF4E6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#FF9F1C",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    color: "#000000",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },

  // Bottom spacing
  bottomSpacing: {
    height: 20,
  },
});
