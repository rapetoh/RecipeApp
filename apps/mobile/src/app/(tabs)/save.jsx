import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { Heart, ChefHat, Search, Clock } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";
import { getApiUrl } from "@/config/api";

const { width: screenWidth } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_PADDING = 16;
const recipeCardWidth = (screenWidth - CARD_PADDING * 2 - CARD_MARGIN) / 2;

export default function SavedRecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, signIn, auth } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Fetch favorited recipes with proper error handling
  const {
    data: favoritedRecipesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["recipe-favorites", auth?.user?.id, debouncedSearch],
    queryFn: async () => {
      if (!auth?.user?.id) {
        throw new Error("User not authenticated");
      }

      const apiUrl = getApiUrl();
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const response = await fetch(`${apiUrl}/api/recipe-favorites?userId=${auth.user.id}${searchParam}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to fetch favorited recipes`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch favorited recipes");
      }

      return data;
    },
    enabled: !!auth?.user?.id && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Retry up to 2 times unless it's an auth error
      if (error.message.includes("User not authenticated")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const handleRecipePress = (recipe) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  const handleSignInPress = () => {
    signIn();
  };

  const handleRetry = () => {
    refetch();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (minutes) => {
    if (!minutes) return "Quick";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getCategory = (recipe) => {
    if (recipe.category) return recipe.category;
    if (recipe.cuisine) return recipe.cuisine;
    return "Recipe";
  };

  if (!fontsLoaded) {
    return null;
  }

  const favoritedRecipes = favoritedRecipesData?.data || [];

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
              transition={200}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <ChefHat size={32} color="#CCCCCC" />
            </View>
          )}
          
          {/* Heart Badge */}
          <View style={styles.heartBadge}>
            <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
          </View>
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Favorite Recipes
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      {isAuthenticated && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={20} color="#999999" style={{ marginRight: 12 }} />
            <TextInput
              style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
              placeholder="Search favorite recipes..."
              placeholderTextColor="#999999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {!isAuthenticated ? (
          <View style={styles.signInState}>
            <Heart size={48} color="#FF9F1C" />
            <Text
              style={[styles.signInTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Favorite Your Recipes
            </Text>
            <Text
              style={[styles.signInText, { fontFamily: "Inter_400Regular" }]}
            >
              Sign in to favorite recipes and access them anytime, anywhere
            </Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignInPress}
            >
              <Text
                style={[
                  styles.signInButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <Text
              style={[styles.errorTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Unable to Load Favorite Recipes
            </Text>
            <Text
              style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}
            >
              {error.message || "Something went wrong. Please try again."}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text
                style={[
                  styles.retryButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#FF9F1C" />
            <Text
              style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}
            >
              Loading favorite recipes...
            </Text>
          </View>
        ) : !favoritedRecipesData?.data || favoritedRecipesData.data.length === 0 ? (
          <View style={styles.emptyState}>
            <ChefHat size={48} color="#999999" />
            <Text
              style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              No Favorite Recipes Yet
            </Text>
            <Text
              style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}
            >
              Start exploring recipes and tap the heart icon to favorite them
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Text
                style={[
                  styles.browseButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Browse Recipes
              </Text>
            </TouchableOpacity>
          </View>
        ) : favoritedRecipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={48} color="#999999" />
            <Text
              style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              {debouncedSearch ? "No Results Found" : "No Favorite Recipes"}
            </Text>
            <Text
              style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}
            >
              {debouncedSearch 
                ? `No favorite recipes match your search "${debouncedSearch}"`
                : "Favorite recipes to see them here"
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={favoritedRecipes}
            renderItem={renderRecipeCard}
            keyExtractor={(item, index) => `favorite-recipe-${item.id}-${index}`}
            numColumns={2}
            contentContainerStyle={[
              styles.gridContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        )}
      </View>
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
  headerLeft: {
    width: 38,
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 38,
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
  content: {
    flex: 1,
  },
  signInState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  signInTitle: {
    fontSize: 24,
    color: "#000000",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  signInText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
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
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    color: "#000000",
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  browseButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
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
  heartBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255, 159, 28, 0.9)",
    borderRadius: 16,
    width: 28,
    height: 28,
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
});
