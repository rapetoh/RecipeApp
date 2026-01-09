import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  Animated,
  ScrollView,
  Keyboard,
  Dimensions,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
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
  Camera,
  ImageIcon,
  Search,
  Type,
  Sparkles,
  Clock,
  TrendingUp,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Folder,
  X,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@/utils/useUpload";
import { useAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/utils/api";
import { IngredientIcon } from "@/components/IngredientIcon";

export default function FoodRecognitionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [upload, { loading: uploadLoading }] = useUpload();

  // Mode state (scan vs search)
  const [activeMode, setActiveMode] = useState("scan"); // "scan" or "search"
  const [selectedImage, setSelectedImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedRecipeId, setSavedRecipeId] = useState(null); // Track if recipe was saved
  const [showRecipePreview, setShowRecipePreview] = useState(false); // Toggle recipe preview
  const [isSavingRecipe, setIsSavingRecipe] = useState(false); // Track saving state
  const [showCollectionModal, setShowCollectionModal] = useState(false); // Collection selection modal
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]); // Selected collections for Keep Recipe

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const searchInputRef = useRef(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Popular food searches for suggestions
  const popularSearches = [
    "🍕 Pizza",
    "🍝 Pasta",
    "🍔 Burger",
    "🍜 Ramen",
    "🥗 Caesar Salad",
    "🌮 Tacos",
    "🍖 Steak",
    "🍰 Chocolate Cake",
  ];

  useEffect(() => {
    // Load search history from storage if needed
    // For now using static data - you can integrate with AsyncStorage later
    setSearchHistory(["Chicken Curry", "Beef Stir Fry", "Chocolate Brownies"]);
  }, []);

  // Photo recognition mutation (existing backend)
  const photoRecognitionMutation = useMutation({
    mutationFn: async (imageUrl) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/food-recognition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          userId: auth?.user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setRecognitionResult(data.data);
        setSavedRecipeId(null); // Reset saved state for new result
        setIsSavingRecipe(false);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        throw new Error("Invalid response format");
      }
    },
    onError: (error) => {
      console.error("Recognition error:", error);
      Alert.alert(
        "Analysis Failed",
        "Failed to analyze the image. Please try again."
      );
    },
  });

  // Text search mutation (existing backend - using generate-recipe-from-name)
  const textSearchMutation = useMutation({
    mutationFn: async (foodName) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/generate-recipe-from-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishName: foodName.trim(),
          userId: auth?.user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find recipe");
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.data && data.data.recipe) {
        // Convert the response to match recognition result format for consistent UI
        const recipe = data.data.recipe;
        setRecognitionResult({
          analysis: {
            dish_name: recipe.name,
            cuisine: recipe.cuisine || "Global",
            difficulty: recipe.difficulty || "medium",
            detected_ingredients: Array.isArray(recipe.ingredients)
              ? recipe.ingredients.map((ing) => 
                  typeof ing === "string" ? ing : ing.name || ing.ingredient || ""
                ).filter(Boolean)
              : [],
          },
          generatedRecipe: recipe,
          similarRecipes: [],
        });
        setSavedRecipeId(null); // Reset saved state for new result
        setIsSavingRecipe(false);

        // Add to search history
        if (searchText.trim() && !searchHistory.includes(searchText.trim())) {
          setSearchHistory((prev) => [searchText.trim(), ...prev.slice(0, 4)]);
        }

        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        throw new Error("Invalid response format");
      }
    },
    onError: (error) => {
      console.error("Search error:", error);
      Alert.alert(
        "Search Failed",
        "Couldn't find a recipe for that food. Try a different name or be more specific."
      );
    },
  });

  const handleModeSwitch = (mode) => {
    if (mode === activeMode) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Reset state when switching modes
    setSelectedImage(null);
    setRecognitionResult(null);
    setSearchText("");
    Keyboard.dismiss();

    // Animate mode transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: mode === "search" ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Defer state update to avoid "useInsertionEffect must not schedule updates" error
      // This ensures the update happens outside React's commit phase
      setTimeout(() => {
        setActiveMode(mode);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 0);
    });
  };

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setRecognitionResult(null);
        await analyzeImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setRecognitionResult(null);
        await analyzeImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select photo. Please try again.");
    }
  };

  const analyzeImage = async (imageAsset) => {
    try {
      const uploadResult = await upload({ reactNativeAsset: imageAsset });

      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      photoRecognitionMutation.mutate(uploadResult.url);
    } catch (error) {
      Alert.alert("Error", "Failed to upload image. Please try again.");
    }
  };

  const handleSearchSubmit = () => {
    if (!searchText.trim()) {
      Alert.alert("Empty Search", "Please enter a food name to search.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Keyboard.dismiss();
    setRecognitionResult(null);
    textSearchMutation.mutate(searchText);
  };

  const handleQuickSearch = (foodName) => {
    const cleanName = foodName.replace(/^\S+\s/, ""); // Remove emoji
    setSearchText(cleanName);
    textSearchMutation.mutate(cleanName);
  };

  const handleViewRecipe = (recipeId) => {
    router.push(`/recipe-detail?id=${recipeId}`);
  };

  // Fetch collections for Keep Recipe modal
  const { data: collectionsData } = useQuery({
    queryKey: ["collections", auth?.user?.id],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/collections?userId=${auth?.user?.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to fetch collections");
      }

      const result = await response.json();
      return result;
    },
    enabled: !!auth?.user?.id && showCollectionModal,
  });

  const allCollections = collectionsData?.data || [];
  const customCollections = allCollections.filter(c => c.collection_type === 'custom');
  const systemCollections = allCollections.filter(c => c.collection_type === 'system');
  
  // If no custom collections exist, show system collections but gray them out
  const collections = customCollections.length > 0 
    ? customCollections 
    : systemCollections;
  const shouldDisableSystemCollections = customCollections.length === 0 && systemCollections.length > 0;

  // Save generated recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: async (recipeData) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/recipes/save-generated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.jwt && { "Authorization": `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...recipeData,
          recognitionId: recognitionResult?.recognitionId,
          collectionIds: selectedCollectionIds, // Include selected collections
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save recipe");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setSavedRecipeId(data.data.id);
        setIsSavingRecipe(false);
        setShowCollectionModal(false);
        setSelectedCollectionIds([]);
        
        // Invalidate collections cache to refresh MyRecipe page
        queryClient.invalidateQueries({ queryKey: ["collections", auth?.user?.id] });
        
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        Alert.alert(
          "Recipe Kept!",
          "This recipe has been added to your collections.",
          [{ text: "OK" }]
        );
      }
    },
    onError: (error) => {
      setIsSavingRecipe(false);
      Alert.alert("Error", error.message || "Failed to save recipe");
    },
  });

  const handleSaveRecipe = () => {
    if (!recognitionResult?.generatedRecipe) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Show collection selection modal
    setShowCollectionModal(true);
  };

  const handleConfirmKeepRecipe = () => {
    if (!recognitionResult?.generatedRecipe) return;
    
    setIsSavingRecipe(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const recipe = recognitionResult.generatedRecipe;
    
    // Get image URL - prioritize from recipe, then from selectedImage if available
    let imageUrl = recipe.image_url || recipe._imageUrl;
    if (!imageUrl && selectedImage?.uri) {
      // Fallback to selectedImage URI if recipe doesn't have image_url
      // This can happen if using an existing similar recipe
      imageUrl = selectedImage.uri;
    }
    
    saveRecipeMutation.mutate({
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      cuisine: recipe.cuisine,
      cooking_time: recipe.cooking_time,
      prep_time: recipe.prep_time,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      image_url: imageUrl, // Use the resolved image URL
      nutrition: recipe.nutrition,
      tags: recipe.tags || ["ai-generated", "image-recognized"],
    });
  };

  const toggleCollectionSelection = (collectionId) => {
    if (selectedCollectionIds.includes(collectionId)) {
      setSelectedCollectionIds(selectedCollectionIds.filter(id => id !== collectionId));
    } else {
      setSelectedCollectionIds([...selectedCollectionIds, collectionId]);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetToStart = () => {
    setSelectedImage(null);
    setRecognitionResult(null);
    setSearchText("");
    setSavedRecipeId(null);
    setIsSavingRecipe(false);
    setShowRecipePreview(false);
  };

  const isLoading =
    uploadLoading ||
    photoRecognitionMutation.isPending ||
    textSearchMutation.isPending;

  if (!fontsLoaded) return null;

  // Calculate tab indicator position - use percentage for reliability
  const screenWidth = Dimensions.get("window").width;
  const tabContainerWidth = screenWidth - 32; // padding horizontal 16 on each side
  const calculatedTabWidth = (tabContainerWidth - 8) / 2; // 8 for padding in tabBackground
  
  const tabIndicatorPosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, calculatedTabWidth],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Recipe Generator
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Mode Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBackground}>
          <Animated.View
            style={[
              styles.tabIndicator,
              { 
                width: calculatedTabWidth,
                transform: [{ translateX: tabIndicatorPosition }] 
              },
            ]}
          />
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleModeSwitch("scan")}
          >
            <Camera
              size={20}
              color={activeMode === "scan" ? "#FFFFFF" : "#666666"}
            />
            <Text
              style={[
                styles.tabText,
                { fontFamily: "Inter_600SemiBold" },
                activeMode === "scan" && styles.tabTextActive,
              ]}
            >
              Scan Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleModeSwitch("search")}
          >
            <Type
              size={20}
              color={activeMode === "search" ? "#FFFFFF" : "#666666"}
            />
            <Text
              style={[
                styles.tabText,
                { fontFamily: "Inter_600SemiBold" },
                activeMode === "search" && styles.tabTextActive,
              ]}
            >
              Search Name
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.modeContent, { opacity: fadeAnim }]}>
          {/* Scan Mode */}
          {activeMode === "scan" && (
            <View style={styles.scanMode}>
              {!selectedImage ? (
                <View style={styles.scanPrompt}>
                  <View style={styles.scanIcon}>
                    <Sparkles size={32} color="#FF9F1C" />
                  </View>
                  <Text
                    style={[
                      styles.promptTitle,
                      { fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    Scan Any Dish
                  </Text>
                  <Text
                    style={[
                      styles.promptSubtitle,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    Take a photo of any food and get an instant recipe with
                    AI-powered recognition
                  </Text>
                  <View style={styles.scanActions}>
                    <TouchableOpacity
                      style={styles.primaryAction}
                      onPress={handleTakePhoto}
                    >
                      <Camera size={24} color="#FFFFFF" />
                      <Text
                        style={[
                          styles.primaryActionText,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        Take Photo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      onPress={handleSelectPhoto}
                    >
                      <ImageIcon size={24} color="#000000" />
                      <Text
                        style={[
                          styles.secondaryActionText,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        Choose from Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.imageAnalysis}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: selectedImage.uri }}
                      style={styles.selectedImage}
                      contentFit="cover"
                      transition={200}
                    />

                    {isLoading && (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text
                          style={[
                            styles.loadingText,
                            { fontFamily: "Inter_600SemiBold" },
                          ]}
                        >
                          Analyzing image...
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Search Mode */}
          {activeMode === "search" && (
            <View style={styles.searchMode}>
              <View style={styles.searchPrompt}>
                <View style={styles.searchIcon}>
                  <Search size={32} color="#FF9F1C" />
                </View>
                <Text
                  style={[styles.promptTitle, { fontFamily: "Inter_700Bold" }]}
                >
                  Search by Name
                </Text>
                <Text
                  style={[
                    styles.promptSubtitle,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Enter any food name and get a complete recipe with ingredients
                  and instructions
                </Text>
              </View>

              {/* Search Input */}
              <View style={styles.searchInputContainer}>
                <TextInput
                  ref={searchInputRef}
                  style={[
                    styles.searchInput,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                  placeholder="Enter food name (e.g., Chicken Tikka Masala)"
                  placeholderTextColor="#999999"
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.searchButton,
                    isLoading && styles.searchButtonDisabled,
                  ]}
                  onPress={handleSearchSubmit}
                  disabled={isLoading || !searchText.trim()}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Search size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Search Options */}
              {!recognitionResult && (
                <View style={styles.quickSearchContainer}>
                  {/* Popular Searches */}
                  <View style={styles.searchSection}>
                    <View style={styles.sectionHeader}>
                      <TrendingUp size={16} color="#FF9F1C" />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        Popular Searches
                      </Text>
                    </View>
                    <View style={styles.searchTags}>
                      {popularSearches.map((food, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.searchTag}
                          onPress={() => handleQuickSearch(food)}
                        >
                          <Text
                            style={[
                              styles.searchTagText,
                              { fontFamily: "Inter_500Medium" },
                            ]}
                          >
                            {food}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Recent Searches */}
                  {searchHistory.length > 0 && (
                    <View style={styles.searchSection}>
                      <View style={styles.sectionHeader}>
                        <Clock size={16} color="#666666" />
                        <Text
                          style={[
                            styles.sectionTitle,
                            { fontFamily: "Inter_600SemiBold" },
                          ]}
                        >
                          Recent Searches
                        </Text>
                      </View>
                      <View style={styles.historyList}>
                        {searchHistory.map((search, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.historyItem}
                            onPress={() => handleQuickSearch(search)}
                          >
                            <Text
                              style={[
                                styles.historyText,
                                { fontFamily: "Inter_400Regular" },
                              ]}
                            >
                              {search}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Results Section (shared) */}
        {recognitionResult && (
          <View style={styles.resultsContainer}>
            <Text
              style={[styles.resultsTitle, { fontFamily: "Inter_700Bold" }]}
            >
              Recipe Found!
            </Text>
            <View style={styles.analysisCard}>
              <Text
                style={[styles.dishName, { fontFamily: "Inter_600SemiBold" }]}
              >
                {recognitionResult.analysis?.dish_name ||
                  recognitionResult.recipe?.name}
              </Text>
              {recognitionResult.analysis?.confidence && (
                <Text
                  style={[
                    styles.confidence,
                    { fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Confidence:{" "}
                  {Math.round(recognitionResult.analysis.confidence * 100)}%
                </Text>
              )}
              <Text
                style={[styles.cuisine, { fontFamily: "Inter_400Regular" }]}
              >
                {recognitionResult.analysis?.cuisine ||
                  recognitionResult.recipe?.cuisine ||
                  "International"}{" "}
                • {recognitionResult.analysis?.difficulty || "Medium"}
              </Text>
              {recognitionResult.analysis?.detected_ingredients &&
                recognitionResult.analysis.detected_ingredients.length > 0 && (
                  <>
                    <Text
                      style={[
                        styles.ingredientsLabel,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      Main Ingredients:
                    </Text>
                    <Text
                      style={[
                        styles.ingredients,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {recognitionResult.analysis.detected_ingredients.join(", ")}
                    </Text>
                  </>
                )}
            </View>

            {/* Generated Recipe Actions */}
            {recognitionResult.generatedRecipe && (
              <View style={styles.recipeActionsContainer}>
                {/* Preview Toggle Button */}
                <TouchableOpacity
                  style={styles.previewToggleButton}
                  onPress={() => {
                    setShowRecipePreview(!showRecipePreview);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.previewToggleText,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {showRecipePreview ? "Hide" : "Preview"} Recipe
                  </Text>
                  {showRecipePreview ? (
                    <ChevronUp size={18} color="#000000" />
                  ) : (
                    <ChevronDown size={18} color="#000000" />
                  )}
                </TouchableOpacity>

                {/* Recipe Preview */}
                {showRecipePreview && recognitionResult.generatedRecipe && (
                  <View style={styles.recipePreviewCard}>
                    {recognitionResult.generatedRecipe.description && (
                      <Text
                        style={[
                          styles.previewDescription,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        {recognitionResult.generatedRecipe.description}
                      </Text>
                    )}
                    
                    {recognitionResult.generatedRecipe.ingredients && 
                     Array.isArray(recognitionResult.generatedRecipe.ingredients) &&
                     recognitionResult.generatedRecipe.ingredients.length > 0 && (
                      <View style={styles.previewSection}>
                        <Text
                          style={[
                            styles.previewSectionTitle,
                            { fontFamily: "Inter_600SemiBold" },
                          ]}
                        >
                          Ingredients
                        </Text>
                        {recognitionResult.generatedRecipe.ingredients.map((ing, idx) => {
                          const ingredientName = typeof ing === 'string' ? ing : (ing.name || ing.ingredient || '');
                          const ingredientText = typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ingredientName}`.trim();
                          return (
                            <View key={idx} style={styles.ingredientRow}>
                              <IngredientIcon ingredient={ingredientName} size={28} />
                              <Text
                                style={[
                                  styles.previewItem,
                                  { fontFamily: "Inter_400Regular" },
                                ]}
                              >
                                {ingredientText}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {recognitionResult.generatedRecipe.instructions && 
                     Array.isArray(recognitionResult.generatedRecipe.instructions) &&
                     recognitionResult.generatedRecipe.instructions.length > 0 && (
                      <View style={styles.previewSection}>
                        <Text
                          style={[
                            styles.previewSectionTitle,
                            { fontFamily: "Inter_600SemiBold" },
                          ]}
                        >
                          Instructions
                        </Text>
                        {recognitionResult.generatedRecipe.instructions.map((inst, idx) => (
                          <View key={idx} style={styles.previewInstructionItem}>
                            <Text
                              style={[
                                styles.previewStepNumber,
                                { fontFamily: "Inter_600SemiBold" },
                              ]}
                            >
                              {inst.step || idx + 1}.
                            </Text>
                            <Text
                              style={[
                                styles.previewInstructionText,
                                { fontFamily: "Inter_400Regular" },
                              ]}
                            >
                              {inst.instruction || inst}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Keep Recipe Button */}
                {!savedRecipeId ? (
                  <TouchableOpacity
                    style={[
                      styles.recipeButton,
                      isSavingRecipe && styles.recipeButtonDisabled,
                    ]}
                    onPress={handleSaveRecipe}
                    disabled={isSavingRecipe}
                  >
                    {isSavingRecipe ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text
                          style={[
                            styles.recipeButtonText,
                            { fontFamily: "Inter_600SemiBold", marginLeft: 8 },
                          ]}
                        >
                          Keeping...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Save size={18} color="#FFFFFF" />
                        <Text
                          style={[
                            styles.recipeButtonText,
                            { fontFamily: "Inter_600SemiBold", marginLeft: 8 },
                          ]}
                        >
                          Keep Recipe (Generated)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.recipeButton, styles.recipeButtonSaved]}
                    onPress={() => handleViewRecipe(savedRecipeId)}
                  >
                    <Check size={18} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.recipeButtonText,
                        { fontFamily: "Inter_600SemiBold", marginLeft: 8 },
                      ]}
                    >
                      View Saved Recipe
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Similar Recipes */}
            {recognitionResult.similarRecipes &&
              recognitionResult.similarRecipes.length > 0 && (
                <View style={styles.similarContainer}>
                  <Text
                    style={[
                      styles.similarTitle,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Similar Recipes:
                  </Text>
                  {recognitionResult.similarRecipes.map((recipe) => (
                    <TouchableOpacity
                      key={recipe.id}
                      style={styles.similarItem}
                      onPress={() => handleViewRecipe(recipe.id)}
                    >
                      <Text
                        style={[
                          styles.similarName,
                          { fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        {recipe.name}
                      </Text>
                      <Text
                        style={[
                          styles.similarRating,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        ⭐ {recipe.average_rating || "4.0"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

            {/* Try Again Button */}
            <TouchableOpacity
              style={styles.tryAgainButton}
              onPress={resetToStart}
            >
              <Text
                style={[
                  styles.tryAgainText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Try Another {activeMode === "scan" ? "Photo" : "Search"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Collection Selection Modal */}
      <Modal
        visible={showCollectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCollectionModal(false)}
      >
        <View style={collectionModalStyles.overlay}>
          <View style={collectionModalStyles.modalContainer}>
            {/* Header */}
            <View style={collectionModalStyles.modalHeader}>
              <Text
                style={[
                  collectionModalStyles.modalTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Select Collections
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCollectionModal(false);
                  setSelectedCollectionIds([]);
                }}
                style={collectionModalStyles.closeButton}
              >
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Collections List */}
            <ScrollView style={collectionModalStyles.collectionsList}>
              {collections.length === 0 ? (
                <View style={collectionModalStyles.emptyState}>
                  <Text
                    style={[
                      collectionModalStyles.emptyText,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    No collections available. Create one in My Recipes.
                  </Text>
                </View>
              ) : (
                collections.map((collection) => {
                  const isSelected = selectedCollectionIds.includes(collection.id);
                  const isDisabled = shouldDisableSystemCollections && collection.collection_type === 'system';
                  return (
                    <TouchableOpacity
                      key={collection.id}
                      style={[
                        collectionModalStyles.collectionItem,
                        isSelected && collectionModalStyles.collectionItemSelected,
                        isDisabled && collectionModalStyles.collectionItemDisabled,
                      ]}
                      onPress={() => !isDisabled && toggleCollectionSelection(collection.id)}
                      disabled={isDisabled}
                    >
                      <Folder
                        size={20}
                        color={isSelected ? "#FFFFFF" : (isDisabled ? "#CCCCCC" : "#666666")}
                      />
                      <Text
                        style={[
                          collectionModalStyles.collectionItemText,
                          { fontFamily: "Inter_500Medium" },
                          isSelected && collectionModalStyles.collectionItemTextSelected,
                          isDisabled && collectionModalStyles.collectionItemTextDisabled,
                        ]}
                      >
                        {collection.name}
                      </Text>
                      {isSelected && <Check size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Actions */}
            <View style={collectionModalStyles.modalActions}>
              <TouchableOpacity
                style={collectionModalStyles.cancelButton}
                onPress={() => {
                  setShowCollectionModal(false);
                  setSelectedCollectionIds([]);
                }}
              >
                <Text
                  style={[
                    collectionModalStyles.cancelButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  collectionModalStyles.confirmButton,
                  isSavingRecipe && collectionModalStyles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmKeepRecipe}
                disabled={isSavingRecipe}
              >
                {isSavingRecipe ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      collectionModalStyles.confirmButtonText,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Keep Recipe (Generated)
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const collectionModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    color: "#000000",
  },
  closeButton: {
    padding: 4,
  },
  collectionsList: {
    maxHeight: 400,
    padding: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  collectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    marginBottom: 12,
  },
  collectionItemSelected: {
    backgroundColor: "#FF9F1C",
  },
  collectionItemDisabled: {
    backgroundColor: "#F5F5F5",
    opacity: 0.6,
  },
  collectionItemText: {
    fontSize: 16,
    color: "#000000",
    marginLeft: 12,
    flex: 1,
  },
  collectionItemTextSelected: {
    color: "#FFFFFF",
  },
  collectionItemTextDisabled: {
    color: "#999999",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#000000",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#FF9F1C",
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});

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
  placeholder: {
    width: 38,
  },
  // Tab System
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabBackground: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    height: 40, // Approximate height (44 - 4 padding on each side)
    backgroundColor: "#000000",
    borderRadius: 8,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    color: "#666666",
    marginLeft: 6,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  // Content Areas
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  modeContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Scan Mode
  scanMode: {
    flex: 1,
  },
  scanPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  scanIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#FFF5E6",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  promptTitle: {
    fontSize: 28,
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  promptSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  scanActions: {
    width: "100%",
    gap: 16,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  secondaryActionText: {
    color: "#000000",
    fontSize: 16,
    marginLeft: 12,
  },
  // Search Mode
  searchMode: {
    flex: 1,
    paddingTop: 20,
  },
  searchPrompt: {
    alignItems: "center",
    paddingVertical: 20,
  },
  searchIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#FFF5E6",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    paddingVertical: 16,
  },
  searchButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  searchButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  // Quick Search
  quickSearchContainer: {
    flex: 1,
  },
  searchSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#000000",
    marginLeft: 8,
  },
  searchTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  searchTag: {
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 8,
    marginBottom: 8,
  },
  searchTagText: {
    fontSize: 14,
    color: "#000000",
  },
  historyList: {
    gap: 4,
  },
  historyItem: {
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  historyText: {
    fontSize: 14,
    color: "#666666",
  },
  // Image Analysis
  imageAnalysis: {
    flex: 1,
    paddingTop: 20,
  },
  imageContainer: {
    position: "relative",
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 12,
  },
  // Results
  resultsContainer: {
    marginTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  resultsTitle: {
    fontSize: 24,
    color: "#000000",
    marginBottom: 20,
    textAlign: "center",
  },
  analysisCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9F1C",
  },
  dishName: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 8,
  },
  confidence: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
  },
  ingredientsLabel: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 8,
  },
  ingredients: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  recipeActionsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  previewToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 8,
  },
  previewToggleText: {
    color: "#000000",
    fontSize: 14,
  },
  recipePreviewCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    gap: 16,
  },
  previewDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  previewSection: {
    gap: 8,
  },
  previewSectionTitle: {
    fontSize: 15,
    color: "#000000",
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  previewItem: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 20,
    paddingLeft: 4,
  },
  previewInstructionItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  previewStepNumber: {
    fontSize: 13,
    color: "#000000",
    minWidth: 24,
  },
  previewInstructionText: {
    flex: 1,
    fontSize: 13,
    color: "#666666",
    lineHeight: 20,
  },
  recipeButton: {
    flexDirection: "row",
    backgroundColor: "#FF9F1C",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF9F1C",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recipeButtonDisabled: {
    opacity: 0.6,
  },
  recipeButtonSaved: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  recipeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  similarContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  similarTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 16,
  },
  similarItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  similarName: {
    fontSize: 14,
    color: "#000000",
    flex: 1,
  },
  similarRating: {
    fontSize: 14,
    color: "#666666",
  },
  tryAgainButton: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  tryAgainText: {
    color: "#000000",
    fontSize: 14,
  },
});
