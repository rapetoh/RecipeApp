import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
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
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, Bell, Camera, Settings, Heart, X } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = (screenWidth - 44) / 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();
  const [suggestionCategory, setSuggestionCategory] = useState("all");
  const [longPressModalVisible, setLongPressModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedRecipePosition, setSelectedRecipePosition] = useState({ x: 0, y: 0 });

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Check if user needs onboarding
  const { data: preferencesData, isLoading: preferencesLoading, refetch: refetchPreferences } = useQuery({
    queryKey: ["preferences", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
        const response = await fetch(`${apiUrl}/api/preferences?userId=${auth.user.id}`);
        if (!response.ok) return null;
        const result = await response.json();
        return result.success ? result.data : null;
      } catch (error) {
        console.error("Error checking preferences:", error);
        return null;
      }
    },
    enabled: !!auth?.user?.id && isAuthenticated,
    staleTime: 0, // Always refetch to get latest data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Redirect to onboarding if user is authenticated but hasn't completed onboarding
  useEffect(() => {
    // Only redirect if we're done loading and user is authenticated
    if (
      isAuthenticated &&
      auth?.user?.id &&
      !preferencesLoading &&
      preferencesData !== undefined
    ) {
      // If preferences don't exist or onboardingCompleted is false, redirect to onboarding
      if (!preferencesData || !preferencesData.onboardingCompleted) {
        // Add a small delay to prevent race condition with cache invalidation
        const timer = setTimeout(() => {
          router.replace("/onboarding-goals");
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, auth?.user?.id, preferencesData, preferencesLoading, router]);

  // Fetch daily recommendations
  const { data: recommendationData, isLoading: recommendationLoading } =
    useQuery({
      queryKey: ["recommendations", auth?.user?.id],
      queryFn: async () => {
        if (!auth?.user?.id) return null;

        const response = await fetch(
          `/api/recommendations?userId=${auth.user.id}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }
        return response.json();
      },
      enabled: !!auth?.user?.id,
      staleTime: 1000 * 60 * 30, // 30 minutes
    });

  // Fetch today's AI-generated suggestions
  const { data: todaySuggestionsResponse, isLoading: todaySuggestionsLoading, refetch: refetchTodaySuggestions } = useQuery({
    queryKey: ["today-suggestions", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/today-suggestions?userId=${auth.user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch today's suggestions");
      }
      const result = await response.json();
      // Return full response to access fallback flag
      return result.success ? result : null;
    },
    enabled: !!auth?.user?.id && isAuthenticated,
    staleTime: 1000 * 60 * 60, // 1 hour (suggestions refresh daily)
    retry: 2,
    // Poll every 30 seconds if we're showing fallback suggestions
    refetchInterval: (query) => {
      const data = query.state.data;
      // Enable polling if we're showing fallback suggestions
      if (data?.fallback === true) {
        return 30000; // Poll every 30 seconds
      }
      return false; // Stop polling when we have today's suggestions
    },
  });
  
  // Extract suggestions data and fallback flag
  const todaySuggestions = todaySuggestionsResponse?.data || [];
  const isShowingFallback = todaySuggestionsResponse?.fallback === true;
  
  // Filter suggestions by category
  const filteredSuggestions = todaySuggestions && todaySuggestions.length > 0
    ? (suggestionCategory === "all" 
        ? todaySuggestions 
        : todaySuggestions.filter(r => r.category === suggestionCategory))
    : [];

  // Accept recommendation mutation
  const acceptRecommendationMutation = useMutation({
    mutationFn: async (recommendationId) => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/recommendations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          accepted: true,
          userId: auth?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept recommendation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["recommendations"]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
  });

  // Regenerate today's suggestions mutation
  const regenerateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      if (!auth?.user?.id) return null;
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/today-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate suggestions");
      }
      const result = await response.json();
      return result.success ? result.data : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["today-suggestions"]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      Alert.alert("Success", "Today's suggestions have been refreshed!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to regenerate suggestions");
    },
  });


  const handleMenuPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to access menu options", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    router.push("/(tabs)/profile");
  };

  const handleNotificationPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to view notifications", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    Alert.alert("Notifications", "No new notifications");
  };

  const handleFoodRecognitionPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/food-recognition");
  };


  const handleRecipePress = (recipe) => {
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  const handleRegenerateSuggestions = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to regenerate suggestions", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    Alert.alert(
      "Regenerate Suggestions",
      "Generate new recipe suggestions for today? (You can do this up to 2 times per day)",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Regenerate", 
          onPress: () => regenerateSuggestionsMutation.mutate(),
          style: "default"
        },
      ]
    );
  };

  // Favorite recipe mutation
  const favoriteRecipeMutation = useMutation({
    mutationFn: async (recipeId) => {
      if (!auth?.user?.id) throw new Error("User authentication required");
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/saved-recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.user.id,
          recipeId: recipeId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["today-suggestions"]);
      queryClient.invalidateQueries(["saved-recipes"]);
      setLongPressModalVisible(false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      Alert.alert("Success", "Recipe saved to favorites!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to save recipe");
    },
  });

  // Dislike recipe mutation
  const dislikeRecipeMutation = useMutation({
    mutationFn: async (recipeId) => {
      if (!auth?.user?.id) throw new Error("User authentication required");
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/meal-tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.user.id,
          recipeId: recipeId,
          liked: false, // Mark as disliked
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to record dislike");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // variables is the recipeId we passed to mutate()
      const recipeId = variables;
      
      // Optimistically remove from UI immediately (no waiting for refetch)
      queryClient.setQueryData(["today-suggestions", auth?.user?.id], (oldData) => {
        // oldData is the full response object: { success, data: [...], fallback, ... }
        if (!oldData || !oldData.data || !Array.isArray(oldData.data)) {
          return oldData; // Return unchanged if data structure is invalid
        }
        
        // Filter the data array and return new response object
        return {
          ...oldData,
          data: oldData.data.filter(recipe => recipe.id !== recipeId),
        };
      });
      
      // Also invalidate to sync with backend
      queryClient.invalidateQueries(["today-suggestions"]);
      
      setLongPressModalVisible(false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      // No alert - recipe just disappears silently
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to record preference");
    },
  });

  // Handle long press on suggestion card
  const handleLongPress = (recipe, event) => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to use this feature", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Get position for modal placement (near the card)
    const { pageX, pageY } = event.nativeEvent;
    setSelectedRecipePosition({ x: pageX, y: pageY });
    setSelectedRecipe(recipe);
    setLongPressModalVisible(true);
  };

  // Handle favorite from modal
  const handleFavoriteFromModal = () => {
    if (selectedRecipe) {
      favoriteRecipeMutation.mutate(selectedRecipe.id);
    }
  };

  // Handle dislike from modal
  const handleDislikeFromModal = () => {
    if (selectedRecipe) {
      dislikeRecipeMutation.mutate(selectedRecipe.id);
    }
  };

  // Close modal
  const closeLongPressModal = () => {
    setLongPressModalVisible(false);
    setSelectedRecipe(null);
  };

  const handleAcceptRecommendation = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to accept recommendations",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => signIn() },
        ],
      );
      return;
    }

    if (recommendation?.id) {
      acceptRecommendationMutation.mutate(recommendation.id);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const recommendation = recommendationData?.data?.recommendation;
  const userName = auth?.user?.name?.split(" ")[0] || "User";

  return (
    <>
      <Stack.Screen 
        options={{ 
          gestureEnabled: false, // Disable swipe-back gesture to prevent going back to onboarding
          headerShown: false 
        }} 
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Menu size={24} color="#000000" />
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text
              style={[styles.greeting, { fontFamily: "Inter_600SemiBold" }]}
            >
              Good Morning,
            </Text>
            <Text
              style={[styles.userName, { fontFamily: "Inter_600SemiBold" }]}
            >
              {userName}! 👋
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <Bell size={24} color="#000000" />
          {isAuthenticated && <View style={styles.notificationDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Authentication Banner */}
        {!isAuthenticated && (
          <TouchableOpacity style={styles.authBanner} onPress={signIn}>
            <Text style={[styles.authTitle, { fontFamily: "Inter_700Bold" }]}>
              Join RecipeApp Today!
            </Text>
            <Text
              style={[styles.authSubtitle, { fontFamily: "Inter_400Regular" }]}
            >
              Sign up to save recipes, get personalized recommendations, and
              more
            </Text>
            <View style={styles.authButton}>
              <Text
                style={[
                  styles.authButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Sign Up Free
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Daily Recommendation Banner */}
        {isAuthenticated && recommendation && (
          <View style={styles.recommendationCard}>
            <Text
              style={[
                styles.recommendationTitle,
                { fontFamily: "Inter_700Bold" },
              ]}
            >
              Today's Recommendation
            </Text>
            <Text
              style={[
                styles.recommendationName,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {recommendation.recipe.name}
            </Text>
            <Text
              style={[
                styles.recommendationReason,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              {recommendation.reason}
            </Text>
            <View style={styles.recommendationMeta}>
              <Text
                style={[
                  styles.recommendationTime,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                {recommendation.recipe.cooking_time} mins •{" "}
                {recommendation.recipe.difficulty}
              </Text>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAcceptRecommendation}
                disabled={acceptRecommendationMutation.isPending}
              >
                <Text
                  style={[
                    styles.acceptButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {acceptRecommendationMutation.isPending ? "..." : "Accept"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Food Recognition Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={[styles.promoTitle, { fontFamily: "Inter_700Bold" }]}>
              Identify Any Dish
            </Text>
            <Text
              style={[styles.promoSubtitle, { fontFamily: "Inter_400Regular" }]}
            >
              Use a photo or type any dish name to get a recipe.
            </Text>
            <TouchableOpacity
              style={styles.promoButton}
              onPress={handleFoodRecognitionPress}
            >
              <Text style={styles.promoButtonIcon}>⚡</Text>
              <Text
                style={[
                  styles.promoButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Get instant Recipe
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoIcon}>
            <Text style={styles.promoEmoji}>🍜</Text>
          </View>
        </View>

        {/* Today's Suggestions Section */}
        {isAuthenticated && (
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionsHeader}>
              <Text
                style={[
                  styles.suggestionsTitle,
                  { fontFamily: "Inter_700Bold" },
                ]}
              >
                Today's Suggestions
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRegenerateSuggestions}
                disabled={regenerateSuggestionsMutation.isPending || todaySuggestionsLoading}
              >
                <Text
                  style={[
                    styles.refreshButtonText,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {regenerateSuggestionsMutation.isPending || todaySuggestionsLoading ? "..." : "↻"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category Filters */}
            {todaySuggestions && todaySuggestions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryFilterScroller}
                contentContainerStyle={styles.categoryFilterContent}
              >
                {[
                  { id: "all", name: "All", emoji: "🍽️" },
                  { id: "breakfast", name: "Breakfast", emoji: "🍳" },
                  { id: "lunch", name: "Lunch", emoji: "🥗" },
                  { id: "dinner", name: "Dinner", emoji: "🍽️" },
                  { id: "dessert", name: "Dessert", emoji: "🍰" },
                  { id: "snack", name: "Snack", emoji: "🍿" },
                ].map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryFilterPill,
                      suggestionCategory === category.id && styles.categoryFilterPillActive,
                    ]}
                    onPress={() => {
                      setSuggestionCategory(category.id);
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <Text style={styles.categoryFilterEmoji}>{category.emoji}</Text>
                    <Text
                      style={[
                        styles.categoryFilterText,
                        { fontFamily: "Inter_600SemiBold" },
                        suggestionCategory === category.id && styles.categoryFilterTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Loading State with Progress Indicator */}
            {todaySuggestionsLoading ? (
              <View style={styles.suggestionsLoadingContainer}>
                <ActivityIndicator size="large" color="#FF9F1C" />
                <Text
                  style={[
                    styles.suggestionsLoadingText,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Generating personalized recipes for you...
                </Text>
                <Text
                  style={[
                    styles.suggestionsLoadingSubtext,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  This may take 10-20 seconds
                </Text>
              </View>
            ) : filteredSuggestions && filteredSuggestions.length > 0 ? (
              <View style={styles.suggestionsGrid}>
                {filteredSuggestions.map((recipe, index) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[
                      styles.suggestionCard,
                      { marginRight: index % 2 === 0 ? 12 : 0 },
                    ]}
                    onPress={() => handleRecipePress(recipe)}
                    onLongPress={(e) => handleLongPress(recipe, e)}
                  >
                    {/* Recipe Image */}
                    {recipe.image_url ? (
                      <Image
                        source={{ uri: recipe.image_url }}
                        style={styles.suggestionImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.suggestionImagePlaceholder}>
                        <Text style={styles.suggestionPlaceholderEmoji}>🍽️</Text>
                      </View>
                    )}
                    
                    {/* Recipe Content */}
                    <View style={styles.suggestionCardContent}>
                      <Text
                        style={[
                          styles.suggestionTitle,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                        numberOfLines={2}
                      >
                        {recipe.name}
                      </Text>
                      <Text
                        style={[
                          styles.suggestionMeta,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                        numberOfLines={1}
                      >
                        {recipe.cooking_time || 30} mins • {recipe.cuisine || "International"}
                      </Text>
                      <View style={styles.recipeStats}>
                        <Text
                          style={[
                            styles.rating,
                            { fontFamily: "Inter_400Regular" },
                          ]}
                        >
                          ⭐ {recipe.average_rating || 4.0}
                        </Text>
                        <Text
                          style={[
                            styles.ingredients,
                            { fontFamily: "Inter_400Regular" },
                          ]}
                        >
                          {recipe.ingredients?.length || 0} ingredients
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : todaySuggestions && todaySuggestions.length === 0 ? (
              <View style={styles.suggestionsEmptyContainer}>
                <Text
                  style={[
                    styles.suggestionsEmptyText,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  No suggestions available. Pull to refresh.
                </Text>
              </View>
            ) : (
              <View style={styles.suggestionsEmptyContainer}>
                <Text
                  style={[
                    styles.suggestionsEmptyText,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  No {suggestionCategory !== "all" ? suggestionCategory : ""} suggestions found. Try another category.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Long Press Modal for Quick Actions */}
      <Modal
        visible={longPressModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeLongPressModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={closeLongPressModal}
        >
          <View
            style={[
              styles.longPressModal,
              {
                top: Math.min(selectedRecipePosition.y, screenWidth * 0.6),
                left: Math.max(16, Math.min(selectedRecipePosition.x - 100, screenWidth - 216)),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
                numberOfLines={1}
              >
                {selectedRecipe?.name}
              </Text>
              <TouchableOpacity
                onPress={closeLongPressModal}
                style={styles.modalCloseButton}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleFavoriteFromModal}
                disabled={favoriteRecipeMutation.isPending}
              >
                <Heart 
                  size={20} 
                  color="#FF9F1C" 
                  fill="#FF9F1C"
                />
                <Text
                  style={[
                    styles.modalActionText,
                    { fontFamily: "Inter_500Medium", color: "#FF9F1C" },
                  ]}
                >
                  {favoriteRecipeMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalDivider} />

              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleDislikeFromModal}
                disabled={dislikeRecipeMutation.isPending}
              >
                <Text style={styles.modalActionIcon}>👎</Text>
                <Text
                  style={[
                    styles.modalActionText,
                    { fontFamily: "Inter_500Medium", color: "#666666" },
                  ]}
                >
                  {dislikeRecipeMutation.isPending ? "Saving..." : "Don't like"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
    </>
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
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    color: "#000000",
  },
  notificationButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4444",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  authBanner: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  authTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 16,
    lineHeight: 20,
    opacity: 0.9,
  },
  authButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  authButtonText: {
    color: "#FF9F1C",
    fontSize: 14,
  },
  recommendationCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9F1C",
  },
  recommendationTitle: {
    fontSize: 14,
    color: "#FF9F1C",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recommendationName: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 8,
  },
  recommendationReason: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 12,
    lineHeight: 20,
  },
  recommendationMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recommendationTime: {
    fontSize: 12,
    color: "#999999",
  },
  acceptButton: {
    backgroundColor: "#000000",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  promoBanner: {
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 12,
    lineHeight: 20,
  },
  promoButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  promoButtonIcon: {
    fontSize: 18,
  },
  promoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 6,
  },
  promoIcon: {
    marginLeft: 16,
  },
  promoEmoji: {
    fontSize: 40,
  },
  suggestionsSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  suggestionsTitle: {
    fontSize: 22,
    color: "#000000",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonText: {
    fontSize: 18,
    color: "#000000",
  },
  categoryFilterScroller: {
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingRight: 16,
  },
  categoryFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  categoryFilterPillActive: {
    backgroundColor: "#000000",
  },
  categoryFilterEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryFilterText: {
    fontSize: 14,
    color: "#666666",
  },
  categoryFilterTextActive: {
    color: "#FFFFFF",
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  suggestionCard: {
    width: cardWidth,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#F8F9FA",
  },
  suggestionImagePlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionPlaceholderEmoji: {
    fontSize: 48,
    opacity: 0.3,
  },
  suggestionCardContent: {
    padding: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 8,
    lineHeight: 22,
  },
  suggestionMeta: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 8,
  },
  recipeStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rating: {
    fontSize: 12,
    color: "#666666",
  },
  ingredients: {
    fontSize: 12,
    color: "#666666",
  },
  suggestionsLoadingContainer: {
    paddingVertical: 60,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  suggestionsLoadingText: {
    fontSize: 16,
    color: "#000000",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  suggestionsLoadingSubtext: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
  },
  suggestionsEmptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  suggestionsEmptyText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  longPressModal: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    color: "#000000",
    flex: 1,
    marginRight: 8,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  modalActions: {
    gap: 0,
  },
  modalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  modalActionIcon: {
    fontSize: 20,
  },
  modalActionText: {
    fontSize: 16,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },
});
