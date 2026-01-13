import React, { useState, useRef, useEffect } from "react";
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
import { RecipeActionButtons } from "./RecipeActionButtons";
import { MealPlanModal } from "./MealPlanModal";
import { IngredientIcon } from "@/components/IngredientIcon";
import { convertIngredients } from "@/utils/unitConverter";
import { getApiUrl } from "@/config/api";

const { width: screenWidth } = Dimensions.get("window");

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();
  const params = useLocalSearchParams();
  // Handle id as potentially an array (expo-router can return arrays)
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);

  const flatListRef = useRef(null);

  // Debug: Log when component mounts and auth changes
  useEffect(() => {
    console.log('📱 RecipeDetail mounted/updated:', {
      recipeId: id,
      userId: auth?.user?.id,
      isAuthenticated,
      showModal: showMealPlanModal
    });
  }, [id, auth?.user?.id, isAuthenticated, showMealPlanModal]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user preferences for measurement system
  const { data: preferencesData } = useQuery({
    queryKey: ["preferences", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;
      const apiUrl = getApiUrl();
      try {
        const response = await fetch(`${apiUrl}/api/preferences?userId=${auth.user.id}`);
        if (response.ok) {
          const result = await response.json();
          return result.success ? result.data : null;
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
      return null;
    },
    enabled: !!auth?.user?.id,
  });

  // Fetch recipe details
  const {
    data: recipeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recipe", id, auth?.user?.id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Recipe ID is required");
      }
      
      const apiUrl = getApiUrl();
      
      // First try user-recipes endpoint if authenticated (for user's own recipes)
      if (auth?.jwt) {
        try {
          const userResponse = await fetch(
            `${apiUrl}/api/user-recipes/${id}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.jwt}`,
              },
              credentials: 'include',
            }
          );
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.success) {
              return userData;
            }
          }
        } catch (userError) {
          // Fall through to regular recipes endpoint
          console.log('Not a user recipe, trying regular endpoint');
        }
      }
      
      // Fallback to regular recipes endpoint
      const response = await fetch(
        `${apiUrl}/api/recipes/${id}?userId=${auth?.user?.id || ""}`,
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch recipe");
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

  // Update isFavorited when recipeData changes (handles cached data)
  useEffect(() => {
    if (recipeData?.success && recipeData?.data) {
      setIsFavorited(recipeData.data.is_saved || false);
    } else if (recipeData?.data && !recipeData?.success) {
      // Handle case where data exists but success field is missing
      setIsFavorited(recipeData.data.is_saved || false);
    }
  }, [recipeData]);

  // Favorite/unfavorite recipe mutation
  const favoriteRecipeMutation = useMutation({
    mutationFn: async (action) => {
      if (!isAuthenticated) {
        throw new Error("Please sign in to favorite recipes");
      }

      if (!id) {
        throw new Error("Recipe ID is required");
      }

      const apiUrl = getApiUrl();
      const url = `${apiUrl}/api/recipe-favorites`;

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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to favorite recipe");
        }

        return response.json();
      } else {
        const response = await fetch(
          `${url}?userId=${auth?.user?.id}&recipeId=${id}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to unfavorite recipe");
        }

        return response.json();
      }
    },
    onSuccess: (data, action) => {
      setIsFavorited(action === "save");
      queryClient.invalidateQueries(["recipe-favorites"]);
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      // Refetch collections to update Favorites collection count and recipe list immediately
      queryClient.refetchQueries({ queryKey: ["collections", auth?.user?.id] });
      queryClient.refetchQueries({ queryKey: ["collection-recipes"] });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onError: (error) => {
      console.error("Favorite recipe error:", error);
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
      Alert.alert("Sign In Required", "Please sign in to favorite recipes", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    const action = isFavorited ? "unsave" : "save";
    favoriteRecipeMutation.mutate(action);
  };

  // Generate next 14 days for meal plan modal
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 14; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push({
        date: day.toISOString().split("T")[0],
        day: day,
      });
    }
    return days;
  };

  // Add to meal plan mutation
  const addToMealPlanMutation = useMutation({
    mutationFn: async ({ date, mealType, recipeId }) => {
      const apiUrl = getApiUrl();
      console.log('Adding to meal plan:', { date, mealType, recipeId, userId: auth?.user?.id });
      
      const response = await fetch(`${apiUrl}/api/meal-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth?.user?.id,
          date,
          mealType,
          recipeId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Add meal plan error:', errorData);
        throw new Error(errorData.error || "Failed to add meal to plan");
      }

      const result = await response.json();
      console.log('Meal plan added successfully:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["meal-plans"]);
      setShowMealPlanModal(false);
      setSelectedDate(null);
      setSelectedMealType(null);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      // Navigate to meal planning with selected date
      router.push(`/meal-planning?selectedDate=${variables.date}`);
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to add meal to plan");
    },
  });

  const handleAddToMealPlan = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to add meals to plan", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }
    setShowMealPlanModal(true);
  };

  const handleMealPlanConfirm = ({ date, mealType }) => {
    console.log('🎯 handleMealPlanConfirm called with:', { date, mealType, id });
    console.log('🔐 Auth state:', { 
      userId: auth?.user?.id, 
      isAuthenticated, 
      hasAuth: !!auth 
    });
    
    if (!id) {
      console.error('❌ Recipe ID is missing!');
      Alert.alert("Error", "Recipe ID is missing");
      return;
    }
    
    if (!auth?.user?.id) {
      console.error('❌ User ID is missing!');
      Alert.alert("Error", "You must be signed in to add meals");
      return;
    }
    
    console.log('✅ Calling mutation with:', {
      date,
      mealType,
      recipeId: parseInt(id),
    });
    
    addToMealPlanMutation.mutate({
      date,
      mealType,
      recipeId: parseInt(id),
    });
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

  const renderIngredientItem = ({ item }) => {
    return (
      <View style={styles.ingredientItem}>
        <IngredientIcon ingredient={item} size={40} />
        <View style={styles.ingredientTextContainer}>
          <Text
            style={[styles.ingredientAmount, { fontFamily: "Inter_600SemiBold" }]}
          >
            {item.amount} {item.unit}
          </Text>
          <Text style={[styles.ingredientName, { fontFamily: "Inter_400Regular" }]}>
            {item.name}
          </Text>
        </View>
      </View>
    );
  };

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
  const hasImage = recipe.image_url && recipe.image_url.trim() !== "";
  const carouselImages = hasImage ? [recipe.image_url] : [];
  const rawIngredients = recipe.ingredients || [];
  
  // Convert ingredients based on user's measurement preference
  const measurementSystem = preferencesData?.measurementSystem || 'metric';
  const ingredients = convertIngredients(rawIngredients, measurementSystem);
  
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
          style={[
            styles.favoriteToggle,
            isFavorited && styles.favoriteToggleActive
          ]}
          onPress={handleFavoritePress}
          accessibilityLabel={
            isFavorited ? "Remove from favorites" : "Add to favorites"
          }
          accessibilityRole="switch"
          accessibilityState={{ checked: isFavorited }}
        >
          <Heart
            size={22}
            color={isFavorited ? "#FFFFFF" : "#000000"}
            fill={isFavorited ? "#FFFFFF" : "none"}
            strokeWidth={isFavorited ? 0 : 2}
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
        {/* Hero Carousel or Placeholder */}
        <View style={styles.carouselContainer}>
          {carouselImages.length > 0 ? (
            <>
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
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <ChefHat size={60} color="#FF9F1C" />
            </View>
          )}
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
            {recipe.cooking_time && (
              <View style={styles.metaItem}>
                <Clock size={19} color="#6C6C6C" />
                <Text
                  style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}
                >
                  {recipe.cooking_time} Mins
                </Text>
              </View>
            )}

            <View style={styles.metaItem}>
              <Layers size={19} color="#6C6C6C" />
              <Text
                style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}
              >
                {ingredients.length} Ingredients
              </Text>
            </View>

            {recipe.servings && (
              <View style={styles.metaItem}>
                <Users size={19} color="#6C6C6C" />
                <Text
                  style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}
                >
                  {recipe.servings} Servings
                </Text>
              </View>
            )}

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
          {recipe.description && (
            <Text
              style={[styles.descriptionText, { fontFamily: "Inter_400Regular" }]}
            >
              {recipe.description}
            </Text>
          )}

          {/* Difficulty & Time */}
          {(recipe.difficulty || recipe.prep_time) && (
            <View style={styles.difficultyRow}>
              {recipe.difficulty && (
                <View style={styles.difficultyItem}>
                  <ChefHat size={16} color="#666666" />
                  <Text
                    style={[
                      styles.difficultyText,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)} difficulty
                  </Text>
                </View>
              )}
              {recipe.prep_time && (
                <View style={styles.difficultyItem}>
                  <Text
                    style={[styles.prepText, { fontFamily: "Inter_400Regular" }]}
                  >
                    Prep: {recipe.prep_time} mins
                  </Text>
                </View>
              )}
            </View>
          )}

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
      <RecipeActionButtons
        recipeId={id}
        isAuthenticated={isAuthenticated}
        signIn={signIn}
        onAddToMealPlan={handleAddToMealPlan}
        insets={insets}
        fontFamily={{
          regular: "Inter_400Regular",
          medium: "Inter_500Medium",
          semiBold: "Inter_600SemiBold",
          bold: "Inter_700Bold",
        }}
      />

      {/* Meal Plan Modal */}
      <MealPlanModal
        visible={showMealPlanModal}
        onClose={() => {
          setShowMealPlanModal(false);
          setSelectedDate(null);
          setSelectedMealType(null);
        }}
        recipeName={recipe?.name || ""}
        selectedDate={selectedDate}
        selectedMealType={selectedMealType}
        onDateSelect={setSelectedDate}
        onMealTypeSelect={setSelectedMealType}
        onConfirm={handleMealPlanConfirm}
        isLoading={addToMealPlanMutation.isPending}
        nextDays={getNext14Days()}
        fontFamily={{
          regular: "Inter_400Regular",
          medium: "Inter_500Medium",
          semiBold: "Inter_600SemiBold",
          bold: "Inter_700Bold",
        }}
      />
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
  favoriteToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  favoriteToggleActive: {
    backgroundColor: "#FF4444",
    borderColor: "#FF4444",
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
    minHeight: (screenWidth - 32) * 0.67,
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
  placeholderContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
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
  aiBadge: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  aiBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  ingredientTextContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
