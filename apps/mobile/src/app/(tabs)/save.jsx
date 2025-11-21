import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { Heart, ChefHat } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

export default function SavedRecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, signIn, auth } = useAuth();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Fetch saved recipes with proper error handling
  const {
    data: savedRecipesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["saved-recipes", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) {
        throw new Error("User not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/saved-recipes?userId=${auth.user.id}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to fetch saved recipes`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch saved recipes");
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

  if (!fontsLoaded) {
    return null;
  }

  const renderRecipeItem = ({ item: recipe }) => {
    return (
      <TouchableOpacity
        style={styles.recipeItem}
        onPress={() => handleRecipePress(recipe)}
      >
        <View style={styles.recipeContent}>
          <View style={styles.recipeHeader}>
            <Text
              style={[styles.recipeTitle, { fontFamily: "Inter_600SemiBold" }]}
              numberOfLines={2}
            >
              {recipe.name}
            </Text>
            <Heart size={20} color="#FF9F1C" fill="#FF9F1C" />
          </View>

          <Text
            style={[
              styles.recipeDescription,
              { fontFamily: "Inter_400Regular" },
            ]}
            numberOfLines={2}
          >
            {recipe.description || "A delicious recipe you saved for later!"}
          </Text>

          <View style={styles.recipeMeta}>
            <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>
              {recipe.cooking_time || 30} mins • {recipe.cuisine || "Global"} •{" "}
              {recipe.difficulty || "Easy"}
            </Text>
            <Text style={[styles.rating, { fontFamily: "Inter_500Medium" }]}>
              ⭐ {recipe.average_rating || 0}
            </Text>
          </View>

          <Text style={[styles.savedDate, { fontFamily: "Inter_400Regular" }]}>
            Saved{" "}
            {new Date(
              recipe.saved_at || recipe.created_at,
            ).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: "Inter_600SemiBold" }]}>
          Saved Recipes
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!isAuthenticated ? (
          <View style={styles.signInState}>
            <Heart size={48} color="#FF9F1C" />
            <Text
              style={[styles.signInTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Save Your Favorite Recipes
            </Text>
            <Text
              style={[styles.signInText, { fontFamily: "Inter_400Regular" }]}
            >
              Sign in to save recipes and access them anytime, anywhere
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
              Unable to Load Saved Recipes
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
              Loading saved recipes...
            </Text>
          </View>
        ) : !savedRecipesData?.data || savedRecipesData.data.length === 0 ? (
          <View style={styles.emptyState}>
            <ChefHat size={48} color="#999999" />
            <Text
              style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              No Saved Recipes Yet
            </Text>
            <Text
              style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}
            >
              Start exploring recipes and tap the heart icon to save your
              favorites
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
        ) : (
          <>
            <View style={styles.statsHeader}>
              <Text
                style={[styles.statsText, { fontFamily: "Inter_500Medium" }]}
              >
                {savedRecipesData.data.length} saved recipe
                {savedRecipesData.data.length !== 1 ? "s" : ""}
              </Text>
            </View>

            <FlatList
              data={savedRecipesData.data}
              renderItem={renderRecipeItem}
              keyExtractor={(item, index) => `saved-recipe-${item.id}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
              onRefresh={refetch}
              refreshing={isLoading}
            />
          </>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    fontSize: 24,
    color: "#000000",
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  statsHeader: {
    paddingVertical: 12,
  },
  statsText: {
    fontSize: 14,
    color: "#666666",
  },
  recipeItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recipeContent: {
    flex: 1,
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  recipeTitle: {
    fontSize: 18,
    color: "#000000",
    flex: 1,
    marginRight: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
    lineHeight: 20,
  },
  recipeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#666666",
  },
  rating: {
    fontSize: 12,
    color: "#666666",
  },
  savedDate: {
    fontSize: 12,
    color: "#999999",
  },
});
