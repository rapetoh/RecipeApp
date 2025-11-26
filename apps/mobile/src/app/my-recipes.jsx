import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
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
  Plus,
  Search,
  ChefHat,
  Clock,
  Users,
  Star,
  Edit,
  Trash2,
  BookOpen,
} from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth, useRequireAuth } from "@/utils/auth/useAuth";

export default function MyRecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
  
  // Automatically redirect to sign-in if not authenticated
  useRequireAuth();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user recipes
  const {
    data: recipesData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userRecipes", searchText],
    queryFn: async () => {
      const searchParam = searchText
        ? `?search=${encodeURIComponent(searchText)}`
        : "";
      const response = await fetch(`${apiUrl}/api/user-recipes${searchParam}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to view your recipes");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch recipes");
      }

      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId) => {
      const response = await fetch(`${apiUrl}/api/user-recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["userRecipes"]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleCreateRecipe = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/recipe-form");
  };

  const handleViewRecipe = (recipeId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-detail?id=${recipeId}`);
  };

  const handleEditRecipe = (recipeId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-form?edit=${recipeId}`);
  };

  const handleDeleteRecipe = (recipe) => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteRecipeMutation.mutate(recipe.id),
        },
      ],
    );
  };

  const formatTime = (minutes) => {
    if (!minutes) return "Quick";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (!fontsLoaded) return null;

  const recipes = recipesData?.data?.recipes || [];
  const isEmpty = recipes.length === 0 && !loading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          My Recipes
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRecipe}
        >
          <Plus size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#999999" />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Search your recipes..."
            placeholderTextColor="#999999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Empty State */}
        {isEmpty && !loading && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <BookOpen size={48} color="#CCCCCC" />
            </View>
            <Text style={[styles.emptyTitle, { fontFamily: "Inter_700Bold" }]}>
              No Recipes Yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { fontFamily: "Inter_400Regular" }]}
            >
              Start creating your own recipes and build your personal cookbook!
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={handleCreateRecipe}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text
                style={[
                  styles.emptyCreateText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Create First Recipe
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recipe List */}
        {recipes.map((recipe) => (
          <TouchableOpacity
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() => handleViewRecipe(recipe.id)}
          >
            <View style={styles.recipeImageContainer}>
              {recipe.image_url ? (
                <Image
                  source={{ uri: recipe.image_url }}
                  style={styles.recipeImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <ChefHat size={32} color="#CCCCCC" />
                </View>
              )}
              <View style={styles.creatorBadge}>
                <Text
                  style={[
                    styles.creatorText,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  YOURS
                </Text>
              </View>
            </View>

            <View style={styles.recipeContent}>
              <Text
                style={[styles.recipeName, { fontFamily: "Inter_600SemiBold" }]}
                numberOfLines={2}
              >
                {recipe.name}
              </Text>

              {recipe.description && (
                <Text
                  style={[
                    styles.recipeDescription,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                  numberOfLines={2}
                >
                  {recipe.description}
                </Text>
              )}

              <View style={styles.recipeInfo}>
                <View style={styles.infoItem}>
                  <Clock size={14} color="#666666" />
                  <Text
                    style={[
                      styles.infoText,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {formatTime(recipe.cooking_time)}
                  </Text>
                </View>

                {recipe.servings && (
                  <View style={styles.infoItem}>
                    <Users size={14} color="#666666" />
                    <Text
                      style={[
                        styles.infoText,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {recipe.servings}
                    </Text>
                  </View>
                )}

                <View style={styles.infoItem}>
                  <Text
                    style={[
                      styles.difficultyText,
                      { fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    {recipe.difficulty || "Medium"}
                  </Text>
                </View>
              </View>

              <View style={styles.recipeActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditRecipe(recipe.id)}
                >
                  <Edit size={16} color="#FF9F1C" />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { fontFamily: "Inter_500Medium", color: "#FF9F1C" },
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteRecipe(recipe)}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { fontFamily: "Inter_500Medium", color: "#EF4444" },
                    ]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Load More/Pagination could go here */}
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
  createButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF9F1C",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9F1C",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyCreateText: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  // Recipe Cards
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  recipeImageContainer: {
    position: "relative",
    height: 180,
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  creatorBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FF9F1C",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  creatorText: {
    color: "#FFFFFF",
    fontSize: 10,
    letterSpacing: 1,
  },

  // Recipe Content
  recipeContent: {
    padding: 16,
  },
  recipeName: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 8,
    lineHeight: 24,
  },
  recipeDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#666666",
  },
  difficultyText: {
    fontSize: 12,
    color: "#FF9F1C",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Recipe Actions
  recipeActions: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
  },
  actionButtonText: {
    fontSize: 14,
  },
});
