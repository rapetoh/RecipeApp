import React, { useState, useRef } from "react";
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
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  ChevronLeft,
  Heart,
  Clock,
  Layers,
  Users,
  Star,
  ChefHat,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/utils/api";

const { width: screenWidth } = Dimensions.get("window");

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();
  const { id } = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const flatListRef = useRef(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch recipe details
  const {
    data: recipeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/api/recipes/${id}?userId=${auth?.user?.id || ""}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch recipe");
      }
      return response.json();
    },
    enabled: !!id,
    onSuccess: (data) => {
      if (data.success && data.data) {
        setIsFavorited(data.data.is_saved || false);
      }
    },
  });

  // Save/unsave recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: async (action) => {
      if (!isAuthenticated) {
        throw new Error("Please sign in to save recipes");
      }

      const apiUrl = getApiUrl();
      const url = `${apiUrl}/api/saved-recipes`;

      if (action === "save") {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: auth?.user?.id,
            recipeId: parseInt(id),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save recipe");
        }

        return response.json();
      } else {
        const response = await fetch(
          `${url}?userId=${auth?.user?.id}&recipeId=${id}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to remove recipe");
        }

        return response.json();
      }
    },
    onSuccess: (data, action) => {
      setIsFavorited(action === "save");
      queryClient.invalidateQueries(["saved-recipes"]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onError: (error) => {
      console.error("Save recipe error:", error);
      Alert.alert("Error", error.message);
    },
  });

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleFavoritePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to save recipes", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    const action = isFavorited ? "unsave" : "save";
    saveRecipeMutation.mutate(action);
  };

  const handleStartCooking = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to track your cooking", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    // Navigate to meal planning or track cooking
    Alert.alert(
      "Start Cooking",
      "Would you like to add this to your meal plan or start cooking now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add to Meal Plan",
          onPress: () => router.push("/meal-planning"),
        },
        {
          text: "Start Cooking",
          style: "default",
          onPress: () =>
            Alert.alert(
              "Feature Coming Soon",
              "Cooking timer and step-by-step guide coming soon!",
            ),
        },
      ],
    );
  };

  const onScroll = (event) => {
    const slideSize = screenWidth - 32; // Account for padding
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  const renderCarouselItem = ({ item }) => (
    <View style={[styles.carouselItem, { width: screenWidth - 32 }]}>
      <Image
        source={{ uri: item }}
        style={styles.carouselImage}
        contentFit="cover"
        transition={200}
      />
    </View>
  );

  const renderDotIndicator = (images) => (
    <View style={styles.dotContainer}>
      {images.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === currentImageIndex ? "#000000" : "#CFCFCF",
            },
          ]}
        />
      ))}
    </View>
  );

  const renderIngredientItem = ({ item }) => (
    <View style={styles.ingredientItem}>
      <Text
        style={[styles.ingredientAmount, { fontFamily: "Inter_600SemiBold" }]}
      >
        {item.amount} {item.unit}
      </Text>
      <Text style={[styles.ingredientName, { fontFamily: "Inter_400Regular" }]}>
        {item.name}
      </Text>
    </View>
  );

  const renderInstructionItem = ({ item }) => (
    <View style={styles.instructionItem}>
      <View style={styles.stepNumber}>
        <Text
          style={[styles.stepNumberText, { fontFamily: "Inter_600SemiBold" }]}
        >
          {item.step}
        </Text>
      </View>
      <Text
        style={[styles.instructionText, { fontFamily: "Inter_400Regular" }]}
      >
        {item.instruction}
      </Text>
    </View>
  );

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
          Loading recipe...
        </Text>
      </View>
    );
  }

  if (error || !recipeData?.success) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>
          Failed to load recipe
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text
            style={[
              styles.retryButtonText,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const recipe = recipeData.data;
  const carouselImages = recipe.image_url
    ? [recipe.image_url]
    : ["https://images.pexels.com/photos/5773960/pexels-photo-5773960.jpeg"];
  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];
  const nutrition = recipe.nutrition || {};

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Top Navigation Bar */}
      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleBackPress}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>

        <Text
          style={[styles.navigationTitle, { fontFamily: "Inter_600SemiBold" }]}
        >
          Recipe Details
        </Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={handleFavoritePress}
          accessibilityLabel={
            isFavorited ? "Remove from favorites" : "Add to favorites"
          }
          accessibilityRole="button"
        >
          <Heart
            size={22}
            color="#000000"
            fill={isFavorited ? "#000000" : "none"}
            strokeWidth={1}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={carouselImages}
            renderItem={renderCarouselItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.carouselContent}
          />
          {carouselImages.length > 1 && renderDotIndicator(carouselImages)}
        </View>

        {/* Recipe Card */}
        <View style={styles.recipeCard}>
          {/* Title */}
          <Text style={[styles.recipeTitle, { fontFamily: "Inter_700Bold" }]}>
            {recipe.name}
          </Text>

          {/* Author Line */}
          <Text style={[styles.authorText, { fontFamily: "Inter_400Regular" }]}>
            {recipe.cuisine} cuisine
          </Text>

          {/* Meta Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={19} color="#6C6C6C" />
              <Text
                style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}
              >
                {recipe.cooking_time || 30} Mins
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Layers size={19} color="#6C6C6C" />
              <Text
                style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}
              >
                {ingredients.length} Ingredients
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Users size={19} color="#6C6C6C" />
              <Text
                style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}
              >
                {recipe.servings || 4} Servings
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Star size={19} color="#FF9F1C" fill="#FF9F1C" />
              <Text
                style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}
              >
                {recipe.average_rating || 0}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={[styles.descriptionText, { fontFamily: "Inter_400Regular" }]}
          >
            {recipe.description ||
              "A delicious and carefully crafted recipe that will delight your taste buds and bring joy to your dining experience."}
          </Text>

          {/* Difficulty & Time */}
          <View style={styles.difficultyRow}>
            <View style={styles.difficultyItem}>
              <ChefHat size={16} color="#666666" />
              <Text
                style={[
                  styles.difficultyText,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                {recipe.difficulty || "Medium"} difficulty
              </Text>
            </View>
            <View style={styles.difficultyItem}>
              <Text
                style={[styles.prepText, { fontFamily: "Inter_400Regular" }]}
              >
                Prep: {recipe.prep_time || 15} mins
              </Text>
            </View>
          </View>

          {/* Nutrition Info */}
          {nutrition.calories && (
            <View style={styles.nutritionContainer}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Nutrition (per serving)
              </Text>
              <View style={styles.nutritionRow}>
                <Text
                  style={[
                    styles.nutritionItem,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Calories: {nutrition.calories}
                </Text>
                <Text
                  style={[
                    styles.nutritionItem,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Protein: {nutrition.protein}g
                </Text>
                <Text
                  style={[
                    styles.nutritionItem,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Carbs: {nutrition.carbs}g
                </Text>
                <Text
                  style={[
                    styles.nutritionItem,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Fat: {nutrition.fat}g
                </Text>
              </View>
            </View>
          )}

          {/* Ingredients Section */}
          <Text
            style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Ingredients
          </Text>
          <FlatList
            data={ingredients}
            renderItem={renderIngredientItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
            style={styles.ingredientsList}
          />

          {/* Instructions Section */}
          <Text
            style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Instructions
          </Text>
          <FlatList
            data={instructions}
            renderItem={renderInstructionItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
            style={styles.instructionsList}
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View
        style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStartCooking}
          accessibilityLabel="Start cooking this recipe"
          accessibilityRole="button"
        >
          <Text
            style={[styles.ctaButtonText, { fontFamily: "Inter_600SemiBold" }]}
          >
            Start Cooking
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  navigationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 67,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },
  navigationTitle: {
    fontSize: 19,
    color: "#000000",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  carouselContainer: {
    marginBottom: 12,
  },
  carouselContent: {
    paddingHorizontal: 0,
  },
  carouselItem: {
    marginRight: 0,
  },
  carouselImage: {
    width: "100%",
    height: (screenWidth - 32) * 0.67,
    borderRadius: 10,
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 5,
  },
  recipeCard: {
    paddingTop: 12,
  },
  recipeTitle: {
    fontSize: 24,
    lineHeight: 29,
    color: "#000000",
    marginBottom: 10,
  },
  authorText: {
    fontSize: 17,
    color: "#6C6C6C",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  metaText: {
    fontSize: 14,
    color: "#6C6C6C",
    marginLeft: 5,
  },
  descriptionText: {
    fontSize: 17,
    lineHeight: 24,
    color: "#808080",
    marginBottom: 24,
  },
  difficultyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  difficultyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  difficultyText: {
    fontSize: 14,
    color: "#666666",
    marginLeft: 6,
    textTransform: "capitalize",
  },
  prepText: {
    fontSize: 14,
    color: "#666666",
  },
  nutritionContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  nutritionItem: {
    fontSize: 12,
    color: "#666666",
  },
  sectionTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 16,
    marginTop: 24,
  },
  ingredientsList: {
    marginBottom: 24,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  ingredientAmount: {
    fontSize: 14,
    color: "#000000",
    minWidth: 80,
  },
  ingredientName: {
    fontSize: 14,
    color: "#666666",
    flex: 1,
    textTransform: "capitalize",
  },
  instructionsList: {
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  instructionText: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 24,
    flex: 1,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 19,
    paddingTop: 19,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  ctaButton: {
    backgroundColor: "#111111",
    borderRadius: 38,
    paddingVertical: 19,
    paddingHorizontal: 29,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 62,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 19,
    color: "#FFFFFF",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#FF0000",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 14,
    color: "#000000",
  },
});
