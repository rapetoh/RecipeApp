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
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, Bell, Camera, Settings } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = (screenWidth - 44) / 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");

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

  // Fetch recipes based on category
  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ["recipes", activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "20",
        ...(activeCategory !== "all" && { category: activeCategory }),
        ...(auth?.user?.id && { userId: auth.user.id }), // Include user ID for saved status
      });

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/recipes?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

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

  const categories = [
    { id: "all", name: "All", emoji: "🍽️" },
    { id: "breakfast", name: "Breakfast", emoji: "🍳" },
    { id: "lunch", name: "Lunch", emoji: "🥗" },
    { id: "dinner", name: "Dinner", emoji: "🍽️" },
    { id: "dessert", name: "Dessert", emoji: "🍰" },
    { id: "snack", name: "Snack", emoji: "🍿" },
  ];

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

  const handleCategoryPress = (category) => {
    setActiveCategory(category);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRecipePress = (recipe) => {
    router.push(`/recipe-detail?id=${recipe.id}`);
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
  const recipes = recipesData?.data || [];
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

        {/* Category Scroller */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroller}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                activeCategory === category.id && styles.categoryPillActive,
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text
                style={[
                  styles.categoryText,
                  { fontFamily: "Inter_600SemiBold" },
                  activeCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recipe Feed */}
        <View style={styles.recipeFeed}>
          {recipesLoading ? (
            <Text
              style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}
            >
              Loading recipes...
            </Text>
          ) : (
            <View style={styles.recipeGrid}>
              {recipes.map((recipe, index) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={[
                    styles.recipeCard,
                    { marginRight: index % 2 === 0 ? 12 : 0 },
                  ]}
                  onPress={() => handleRecipePress(recipe)}
                >
                  <View style={styles.recipeCardContent}>
                    <Text
                      style={[
                        styles.recipeTitle,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {recipe.name}
                    </Text>
                    <Text
                      style={[
                        styles.recipeMeta,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {recipe.cooking_time || 30} mins • {recipe.cuisine}
                    </Text>
                    <View style={styles.recipeStats}>
                      <Text
                        style={[
                          styles.rating,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        ⭐ {recipe.average_rating || 0}
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
          )}
        </View>
      </ScrollView>
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
  categoryScroller: {
    marginTop: 24,
    marginBottom: 20,
  },
  categoryContent: {
    paddingRight: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  categoryPillActive: {
    backgroundColor: "#000000",
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: "#666666",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  recipeFeed: {
    marginTop: 8,
  },
  recipeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  recipeCard: {
    width: cardWidth,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recipeCardContent: {
    // Content styling
  },
  recipeTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 8,
    lineHeight: 22,
  },
  recipeMeta: {
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
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666666",
    marginTop: 32,
  },
});
