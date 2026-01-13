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
import { Menu, Camera, Settings, Heart, X, Mic } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import VoiceSuggestions from "@/components/VoiceSuggestions";
import { getApiUrl } from "@/config/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const cardWidth = (screenWidth - 44) / 2;

// Calculate responsive spacing based on screen height
const isSmallScreen = screenHeight < 700;
const isMediumScreen = screenHeight >= 700 && screenHeight < 850;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();
  const [longPressModalVisible, setLongPressModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedRecipePosition, setSelectedRecipePosition] = useState({ x: 0, y: 0 });
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user preferences (for display purposes only)
  // Note: Routing logic is handled in index.jsx, not here
  const { data: preferencesData, isLoading: preferencesLoading, refetch: refetchPreferences } = useQuery({
    queryKey: ["preferences", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/preferences?userId=${auth.user.id}`);
        if (!response.ok) return null;
        const result = await response.json();
        return result.success ? result.data : null;
      } catch (error) {
        console.error("Error fetching preferences:", error);
        return null;
      }
    },
    enabled: !!auth?.user?.id && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes - no need to refetch constantly
    refetchOnMount: true,
  });

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


  // Accept recommendation mutation
  const acceptRecommendationMutation = useMutation({
    mutationFn: async (recommendationId) => {
      const apiUrl = getApiUrl();
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

  const handleVoiceButtonPress = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to use voice suggestions", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setVoiceModalVisible(true);
  };


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

  // Get time-based greeting and meal time
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getMealTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Breakfast time";
    if (hour >= 11 && hour < 15) return "Lunch time";
    if (hour >= 15 && hour < 21) return "Dinner time";
    return "Snack time";
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const handleFoodRecognitionPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/food-recognition");
  };

  const handleIngredientsToRecipesPress = () => {
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
    router.push("/ingredients-to-recipes");
  };

  const handleRecipePress = (recipe) => {
    router.push(`/recipe-detail?id=${recipe.id}`);
  };


  // Favorite recipe mutation
  const favoriteRecipeMutation = useMutation({
    mutationFn: async (recipeId) => {
      if (!auth?.user?.id) throw new Error("User authentication required");
      
      const apiUrl = getApiUrl();
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
      
      const apiUrl = getApiUrl();
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
              {getTimeBasedGreeting()}, {userName}
            </Text>
            <Text
              style={[styles.timeText, { fontFamily: "Inter_400Regular" }]}
            >
              {getCurrentTime()} · {getMealTime()}
            </Text>
          </View>
        </View>
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

        {/* Ingredients to Recipes Banner */}
        {isAuthenticated && (
          <View style={[styles.promoBanner, { marginTop: isSmallScreen ? 10 : 12, backgroundColor: "#F0F9FF" }]}>
            <View style={styles.promoContent}>
              <Text style={[styles.promoTitle, { fontFamily: "Inter_700Bold", color: "#000000" }]}>
                What Can I Cook?
              </Text>
              <Text
                style={[styles.promoSubtitle, { fontFamily: "Inter_400Regular", color: "#666666" }]}
              >
                Take a photo of your ingredients and get recipe suggestions.
              </Text>
              <TouchableOpacity
                style={[styles.promoButton, { backgroundColor: "#0EA5E9" }]}
                onPress={handleIngredientsToRecipesPress}
              >
                <Text style={styles.promoButtonIcon}>📸</Text>
                <Text
                  style={[
                    styles.promoButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Scan Ingredients
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoIcon}>
              <Text style={styles.promoEmoji}>🥘</Text>
            </View>
          </View>
        )}

        {/* Voice Suggestions Section - Replaces Today's Suggestions */}
        {isAuthenticated && (
          <View style={[styles.voiceSection, { marginTop: isSmallScreen ? 12 : 16, paddingVertical: isSmallScreen ? 20 : 24 }]}>
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={handleVoiceButtonPress}
              activeOpacity={0.8}
            >
              <View style={styles.voiceButtonGlow} />
              <View style={styles.voiceButtonInner}>
                <Mic size={isSmallScreen ? 28 : 32} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text
              style={[
                styles.voiceTitle,
                { fontFamily: "Inter_700Bold" },
              ]}
            >
              What's the vibe?
            </Text>
            <Text
              style={[
                styles.voiceExample,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              "I'm tired and want something sweet in 10 minutes..."
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Voice Suggestions Modal */}
      <VoiceSuggestions
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
      />

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
    paddingTop: isSmallScreen ? 12 : 16,
    paddingBottom: isSmallScreen ? 6 : 8,
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
    fontSize: isSmallScreen ? 18 : 20,
    color: "#000000",
    marginBottom: isSmallScreen ? 2 : 4,
  },
  timeText: {
    fontSize: 14,
    color: "#666666",
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
    padding: isSmallScreen ? 16 : 18,
    marginTop: isSmallScreen ? 12 : 16,
    flexDirection: "row",
    alignItems: "center",
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    color: "#FFFFFF",
    marginBottom: 3,
  },
  promoSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: "#CCCCCC",
    marginBottom: isSmallScreen ? 8 : 10,
    lineHeight: isSmallScreen ? 18 : 20,
  },
  promoButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 8,
    paddingHorizontal: isSmallScreen ? 14 : 16,
    paddingVertical: isSmallScreen ? 6 : 8,
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
    fontSize: isSmallScreen ? 32 : 40,
  },
  voiceSection: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: "center",
    paddingVertical: 24,
  },
  voiceButton: {
    width: isSmallScreen ? 100 : 120,
    height: isSmallScreen ? 100 : 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: isSmallScreen ? 16 : 20,
    position: "relative",
  },
  voiceButtonGlow: {
    position: "absolute",
    width: isSmallScreen ? 120 : 140,
    height: isSmallScreen ? 120 : 140,
    borderRadius: isSmallScreen ? 60 : 70,
    backgroundColor: "#FF9F1C",
    opacity: 0.3,
  },
  voiceButtonInner: {
    width: isSmallScreen ? 80 : 100,
    height: isSmallScreen ? 80 : 100,
    borderRadius: isSmallScreen ? 40 : 50,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF9F1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  voiceTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    color: "#000000",
    marginBottom: isSmallScreen ? 4 : 6,
  },
  voiceExample: {
    fontSize: isSmallScreen ? 14 : 16,
    color: "#666666",
    textAlign: "center",
    fontStyle: "italic",
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
