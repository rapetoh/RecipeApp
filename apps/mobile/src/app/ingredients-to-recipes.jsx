import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  FlatList,
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
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  ChevronLeft,
  Camera,
  ImageIcon,
  ChefHat,
  Clock,
  Heart,
  X,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@/utils/useUpload";
import { useAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/utils/api";

const { width: screenWidth } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_PADDING = 16;
// Full screen layout: account for screen padding only
const recipeCardWidth = (screenWidth - CARD_PADDING * 2 - CARD_MARGIN) / 2;

export default function IngredientsToRecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [upload, { loading: uploadLoading }] = useUpload();

  const [selectedImage, setSelectedImage] = useState(null);
  const [detectedIngredients, setDetectedIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [stage, setStage] = useState("select"); // select, processing, results, error
  const [errorMessage, setErrorMessage] = useState("");
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Process ingredients mutation
  const processIngredientsMutation = useMutation({
    mutationFn: async (imageUrl) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/ingredients-to-recipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.jwt && { Authorization: `Bearer ${auth.jwt}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          imageUrl,
          userId: auth?.user?.id,
        }),
      });

      const data = await response.json();

      // Handle low confidence error
      if (response.status === 400 && data.type === "low_confidence") {
        return data; // Return to onSuccess to handle gracefully
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to process ingredients");
      }

      return data;
    },
    onSuccess: (data) => {
      if (!data.success) {
        if (data.type === "low_confidence") {
          setStage("error");
          setErrorMessage(
            data.error ||
              "Could not clearly identify ingredients. Please try a clearer photo."
          );
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return;
        }
        throw new Error(data.error || "Failed to process ingredients");
      }

      setDetectedIngredients(data.detectedIngredients || []);
      setRecipes(data.recipes || []);
      setStage("results");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      console.error("Processing error:", error);
      setStage("error");
      setErrorMessage(
        error.message || "Failed to process ingredients. Please try again."
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  // Save recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: async (recipeId) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/recipe-favorites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.jwt && { Authorization: `Bearer ${auth.jwt}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          userId: auth?.user?.id,
          recipeId: recipeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["collections", auth?.user?.id] });
      queryClient.refetchQueries({ queryKey: ["recipe-favorites"] });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to save recipe");
    },
  });

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
        handleImageSelected(result.assets[0]);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Photo library permission is required to select images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        handleImageSelected(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleImageSelected = async (imageAsset) => {
    setStage("processing");
    setErrorMessage("");

    try {
      // Upload image
      const uploadResult = await upload({ reactNativeAsset: imageAsset });
      if (!uploadResult?.url) {
        throw new Error(uploadResult?.error || "Failed to upload image");
      }

      // Process ingredients
      processIngredientsMutation.mutate(uploadResult.url);
    } catch (error) {
      console.error("Error processing image:", error);
      setStage("error");
      setErrorMessage(error.message || "Failed to process image. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleRecipePress = (recipe) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  const handleFavoritePress = (recipe, e) => {
    e?.stopPropagation();
    if (!auth?.user?.id) {
      Alert.alert("Sign In Required", "Please sign in to save recipes");
      return;
    }
    saveRecipeMutation.mutate(recipe.id);
    setSavedRecipeIds(new Set([...savedRecipeIds, recipe.id]));
  };

  const handleTryAgain = () => {
    setSelectedImage(null);
    setDetectedIngredients([]);
    setRecipes([]);
    setErrorMessage("");
    setStage("select");
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

  const renderRecipeCard = ({ item: recipe }) => {
    const isSaved = savedRecipeIds.has(recipe.id);

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
          <TouchableOpacity
            style={styles.heartBadge}
            onPress={(e) => handleFavoritePress(recipe, e)}
            activeOpacity={0.7}
          >
            <Heart
              size={14}
              color="#FFFFFF"
              fill={isSaved ? "#FFFFFF" : "none"}
            />
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

  const isLoading = uploadLoading || processIngredientsMutation.isPending;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          What Can I Cook?
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Content */}
      {stage === "select" && (
        <View style={styles.selectContainer}>
          <Text
            style={[styles.selectTitle, { fontFamily: "Inter_700Bold" }]}
          >
            Take a photo of your ingredients
          </Text>
          <Text
            style={[styles.selectSubtitle, { fontFamily: "Inter_400Regular" }]}
          >
            Snap a picture of your fridge, pantry, or ingredients and we'll
            suggest recipes you can make
          </Text>

          <View style={styles.imageOptions}>
            <TouchableOpacity
              style={[styles.imageOption, styles.imageOptionBlack]}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={styles.imageOptionIcon}>
                <Camera size={28} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.imageOptionText,
                  styles.imageOptionTextWhite,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.imageOption, styles.imageOptionOrange]}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <View style={styles.imageOptionIcon}>
                <ImageIcon size={28} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.imageOptionText,
                  styles.imageOptionTextWhite,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.selectedImage}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setSelectedImage(null);
                }}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Processing Stage */}
      {stage === "processing" && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#FF9F1C" />
          <Text
            style={[
              styles.processingText,
              { fontFamily: "Inter_500Medium" },
            ]}
          >
            Analyzing ingredients...
          </Text>
          <Text
            style={[
              styles.processingSubtext,
              { fontFamily: "Inter_400Regular" },
            ]}
          >
            This may take a few seconds
          </Text>
        </View>
      )}

      {/* Results Stage */}
      {stage === "results" && (
        <View style={styles.resultsContainer}>
          {detectedIngredients.length > 0 && (
            <View style={styles.ingredientsBadge}>
              <Text
                style={[
                  styles.ingredientsText,
                  { fontFamily: "Inter_500Medium" },
                ]}
              >
                Detected: {detectedIngredients.slice(0, 5).join(", ")}
                {detectedIngredients.length > 5 &&
                  ` +${detectedIngredients.length - 5} more`}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.resultsTitle,
              { fontFamily: "Inter_700Bold" },
            ]}
          >
            Found {recipes.length} Recipe{recipes.length !== 1 ? "s" : ""}
          </Text>

          <FlatList
            data={recipes}
            renderItem={renderRecipeCard}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={handleTryAgain}
              >
                <Text
                  style={[
                    styles.tryAgainText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Try Another Photo
                </Text>
              </TouchableOpacity>
            }
          />
        </View>
      )}

      {/* Error Stage */}
      {stage === "error" && (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={[styles.errorTitle, { fontFamily: "Inter_700Bold" }]}>
              Oops!
            </Text>
            <Text
              style={[styles.errorMessage, { fontFamily: "Inter_400Regular" }]}
            >
              {errorMessage}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.tryAgainButton}
            onPress={handleTryAgain}
          >
            <Text
              style={[
                styles.tryAgainText,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
  },
  selectContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  selectTitle: {
    fontSize: 24,
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  selectSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  imageOptions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 30,
  },
  imageOption: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
  },
  imageOptionBlack: {
    backgroundColor: "#000000",
  },
  imageOptionOrange: {
    backgroundColor: "#FF9F1C",
  },
  imageOptionIcon: {
    marginBottom: 12,
  },
  imageOptionText: {
    fontSize: 16,
    textAlign: "center",
  },
  imageOptionTextWhite: {
    color: "#FFFFFF",
  },
  selectedImageContainer: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    marginTop: 20,
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  processingText: {
    fontSize: 18,
    color: "#000000",
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    color: "#666666",
  },
  resultsContainer: {
    flex: 1,
  },
  ingredientsBadge: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#FFF4E6",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9F1C",
  },
  ingredientsText: {
    fontSize: 14,
    color: "#000000",
  },
  resultsTitle: {
    fontSize: 20,
    color: "#000000",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  gridContent: {
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: CARD_MARGIN * 2,
  },
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    lineHeight: 20,
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
  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  errorCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorTitle: {
    fontSize: 20,
    color: "#DC2626",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  tryAgainButton: {
    backgroundColor: "#FF9F1C",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  tryAgainText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});

