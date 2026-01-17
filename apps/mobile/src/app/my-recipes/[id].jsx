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
  Dimensions,
  FlatList,
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
  Clock,
  ChefHat,
  Edit,
  Trash2,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/config/api";
import IngredientPreview from "@/components/IngredientPreview";

const { width: screenWidth } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_PADDING = 16;
const recipeCardWidth = (screenWidth - CARD_PADDING * 2 - CARD_MARGIN) / 2;

export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams();
  const { auth, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch collection details
  const {
    data: collectionData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["collection-recipes", id, auth?.user?.id],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/collections/${id}?userId=${auth?.user?.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error("Failed to fetch collection");
      }
      const result = await response.json();
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
    enabled: !!id && !!auth?.user?.id && isAuthenticated,
  });

  const collection = collectionData?.data?.collection;
  const recipes = collectionData?.data?.recipes || [];

  // Filter recipes by search text
  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchText.trim()) return true;
    const searchLower = searchText.toLowerCase();
    return (
      recipe.name?.toLowerCase().includes(searchLower) ||
      recipe.description?.toLowerCase().includes(searchLower) ||
      recipe.cuisine?.toLowerCase().includes(searchLower) ||
      recipe.category?.toLowerCase().includes(searchLower)
    );
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId) => {
      const apiUrl = getApiUrl();
      // Try user-recipes endpoint first (for user-created recipes)
      let response = await fetch(`${apiUrl}/api/user-recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      // If 404, try main recipes endpoint (for AI-generated recipes owned by user)
      if (response.status === 404) {
        response = await fetch(`${apiUrl}/api/recipes/${recipeId}`, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
            ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
          },
          credentials: 'include',
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["collections", auth?.user?.id] });
      queryClient.refetchQueries({ queryKey: ["collection-recipes"] });
      queryClient.refetchQueries({ queryKey: ["recipe"] });
      queryClient.refetchQueries({ queryKey: ["my-collections-recipes"] });
      setShowActionsMenu(false);
      setSelectedRecipe(null);
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

  const handleRecipePress = (recipe) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  const handleEditRecipe = (recipe) => {
    setShowActionsMenu(false);
    setSelectedRecipe(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-form?edit=${recipe.id}`);
  };

  const handleDeleteRecipe = (recipe) => {
    setShowActionsMenu(false);
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteRecipeMutation.mutate(recipe.id);
            setSelectedRecipe(null);
          },
        },
      ],
    );
  };

  const handleMorePress = (recipe, event) => {
    event?.stopPropagation();
    setSelectedRecipe(recipe);
    setShowActionsMenu(true);
  };

  const formatTime = (minutes) => {
    if (!minutes) return "Quick";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getCategory = (recipe) => {
    // Try to get category from recipe data
    if (recipe.category) return recipe.category;
    if (recipe.cuisine) return recipe.cuisine;
    return "Recipe";
  };

  const renderRecipeCard = ({ item: recipe }) => {
    return (
      <TouchableOpacity
        style={[styles.recipeCard, { width: recipeCardWidth }]}
        onPress={() => handleRecipePress(recipe)}
        activeOpacity={0.7}
      >
        {/* Recipe Image */}
        <View style={styles.imageContainer}>
          {recipe.image_url ? (
            <Image
              source={{ uri: recipe.image_url }}
              style={styles.recipeImage}
              contentFit="cover"
            />
          ) : recipe.ingredients && recipe.ingredients.length > 0 ? (
            <IngredientPreview 
              ingredients={recipe.ingredients} 
              recipeId={recipe.id}
              maxItems={6}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <ChefHat size={32} color="#CCCCCC" />
            </View>
          )}
          
          {/* Edit Icon */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => handleMorePress(recipe, e)}
          >
            <Edit size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Recipe Info */}
        <View style={styles.recipeInfo}>
          <Text
            style={[styles.recipeTitle, { fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={2}
          >
            {recipe.name}
          </Text>
          <View style={styles.recipeMeta}>
            <View style={styles.metaItem}>
              <Clock size={12} color="#999999" />
              <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>
                {formatTime(recipe.cooking_time)}
              </Text>
            </View>
            <Text style={[styles.categoryText, { fontFamily: "Inter_400Regular" }]}>
              {getCategory(recipe)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <ChevronLeft size={22} color="#000000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Loading...
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
            Loading recipes...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !collection) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <ChevronLeft size={22} color="#000000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Error
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Failed to load collection
          </Text>
        </View>
      </View>
    );
  }

  const isEmpty = recipes.length === 0;
  const hasSearchResults = filteredRecipes.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {collection.name}
        </Text>
        {collection.system_type === 'my_creations' ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateRecipe}
          >
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#999999" />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Search recipes..."
            placeholderTextColor="#999999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Recipes Grid */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          <ChefHat size={48} color="#CCCCCC" />
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_700Bold" }]}>
            No Recipes Yet
          </Text>
          <Text style={[styles.emptySubtitle, { fontFamily: "Inter_400Regular" }]}>
            Add recipes to this collection to see them here
          </Text>
        </View>
      ) : !hasSearchResults && searchText.trim() ? (
        <View style={styles.emptyState}>
          <Search size={48} color="#CCCCCC" />
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_700Bold" }]}>
            No Results Found
          </Text>
          <Text style={[styles.emptySubtitle, { fontFamily: "Inter_400Regular" }]}>
            No recipes match your search "{searchText}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Actions Menu */}
      {showActionsMenu && selectedRecipe && (
        <View style={styles.actionsMenu}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => handleEditRecipe(selectedRecipe)}
          >
            <Edit size={18} color="#000000" />
            <Text style={[styles.actionText, { fontFamily: "Inter_500Medium" }]}>
              Edit Recipe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionItem, styles.actionItemDanger]}
            onPress={() => handleDeleteRecipe(selectedRecipe)}
          >
            <Trash2 size={18} color="#EF4444" />
            <Text style={[styles.actionText, styles.actionTextDanger, { fontFamily: "Inter_500Medium" }]}>
              Delete Recipe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              setShowActionsMenu(false);
              setSelectedRecipe(null);
            }}
          >
            <Text style={[styles.actionText, { fontFamily: "Inter_500Medium" }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Backdrop for actions menu */}
      {showActionsMenu && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            setShowActionsMenu(false);
            setSelectedRecipe(null);
          }}
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
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
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
  gridContent: {
    padding: CARD_PADDING,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: CARD_MARGIN * 2,
  },
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: CARD_MARGIN * 2,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
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
  editButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  recipeInfo: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 8,
    minHeight: 44,
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#999999",
  },
  categoryText: {
    fontSize: 12,
    color: "#666666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
  actionsMenu: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderRadius: 12,
  },
  actionItemDanger: {
    backgroundColor: "#FEF2F2",
  },
  actionText: {
    fontSize: 16,
    color: "#000000",
  },
  actionTextDanger: {
    color: "#EF4444",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 999,
  },
});

