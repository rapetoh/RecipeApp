import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ChevronLeft, Camera, ImageIcon, Loader, Search } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import { useUpload } from "@/utils/useUpload";
import { useAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/utils/api";

export default function FoodRecognitionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const [upload, { loading: uploadLoading }] = useUpload();
  const [selectedImage, setSelectedImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [dishName, setDishName] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Food recognition mutation
  const recognitionMutation = useMutation({
    mutationFn: async (imageUrl) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/food-recognition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          userId: auth?.user?.id, // Use actual user ID
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
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        throw new Error("Invalid response format");
      }
    },
    onError: (error) => {
      console.error("Recognition error:", error);
      let errorMessage = "Failed to analyze the image. Please try again.";

      if (error.message.includes("Failed to process")) {
        errorMessage =
          "Could not process the image. Please try a different photo.";
      } else if (error.message.includes("Failed to analyze")) {
        errorMessage =
          "Could not identify food in this image. Try a clearer photo of a dish.";
      }

      Alert.alert("Analysis Failed", errorMessage);
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
          "Camera permission is required to take photos.",
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
      console.error("Camera error:", error);
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
      console.error("Gallery error:", error);
    }
  };

  const analyzeImage = async (imageAsset) => {
    try {
      // Upload the image first
      const uploadResult = await upload({ reactNativeAsset: imageAsset });

      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      // Analyze the uploaded image
      recognitionMutation.mutate(uploadResult.url);
    } catch (error) {
      Alert.alert("Error", "Failed to upload image. Please try again.");
      console.error("Upload error:", error);
    }
  };

  const handleViewRecipe = (recipeId) => {
    router.push(`/recipe-detail?id=${recipeId}`);
  };

  // Dish name search mutation - generates recipe using AI
  const dishNameSearchMutation = useMutation({
    mutationFn: async (query) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/generate-recipe-from-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishName: query,
          userId: auth?.user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate recipe");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.data && data.data.recipe) {
        const recipe = data.data.recipe;
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        handleViewRecipe(recipe.id);
      } else {
        Alert.alert(
          "Recipe Not Found",
          `We couldn't generate a recipe for '${dishName}'. Please check the spelling or try another name.`,
        );
      }
    },
    onError: (error) => {
      console.error("Recipe generation error:", error);
      Alert.alert(
        "Error",
        error.message || `We couldn't generate a recipe for '${dishName}'. Please check the spelling or try another name.`,
      );
    },
  });

  const handleGenerateRecipe = () => {
    if (!dishName.trim()) {
      Alert.alert("Empty Input", "Please enter a dish name");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    dishNameSearchMutation.mutate(dishName.trim());
  };

  const isLoading = uploadLoading || recognitionMutation.isPending || dishNameSearchMutation.isPending;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Recipe Assistant
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>
      
      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={[styles.headerSubtitle, { fontFamily: "Inter_400Regular" }]}>
          Get a recipe from a photo or a dish name.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        {/* Selected Image */}
        {selectedImage && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.selectedImage}
              contentFit="cover"
              transition={200}
            />

            {isLoading && (
              <View style={styles.loadingOverlay}>
                <Loader size={32} color="#FFFFFF" />
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
        )}

        {/* Recognition Results */}
        {recognitionResult && (
          <View style={styles.resultsContainer}>
            <Text
              style={[styles.resultsTitle, { fontFamily: "Inter_700Bold" }]}
            >
              Analysis Results
            </Text>

            <View style={styles.analysisCard}>
              <Text
                style={[styles.dishName, { fontFamily: "Inter_600SemiBold" }]}
              >
                {recognitionResult.analysis.dish_name}
              </Text>
              <Text
                style={[styles.confidence, { fontFamily: "Inter_400Regular" }]}
              >
                Confidence:{" "}
                {Math.round(recognitionResult.analysis.confidence * 100)}%
              </Text>
              <Text
                style={[styles.cuisine, { fontFamily: "Inter_400Regular" }]}
              >
                {recognitionResult.analysis.cuisine} •{" "}
                {recognitionResult.analysis.difficulty}
              </Text>

              <Text
                style={[
                  styles.ingredientsLabel,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Detected Ingredients:
              </Text>
              <Text
                style={[styles.ingredients, { fontFamily: "Inter_400Regular" }]}
              >
                {recognitionResult.analysis.detected_ingredients.join(", ")}
              </Text>
            </View>

            {/* Generated Recipe */}
            {recognitionResult.generatedRecipe && (
              <TouchableOpacity
                style={styles.recipeButton}
                onPress={() =>
                  handleViewRecipe(recognitionResult.generatedRecipe.id)
                }
              >
                <Text
                  style={[
                    styles.recipeButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  View Generated Recipe
                </Text>
              </TouchableOpacity>
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
                        ⭐ {recipe.average_rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
          </View>
        )}

        {/* Photo Section */}
        {!selectedImage && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Use a photo
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleTakePhoto}
            >
              <Camera size={24} color="#FFFFFF" />
              <Text
                style={[
                  styles.actionButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleSelectPhoto}
            >
              <ImageIcon size={24} color="#000000" />
              <Text
                style={[
                  styles.actionButtonText,
                  styles.secondaryButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Retry Button for Photo */}
        {selectedImage && !isLoading && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setSelectedImage(null);
              setRecognitionResult(null);
            }}
          >
            <Text
              style={[
                styles.retryButtonText,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Try Another Photo
            </Text>
          </TouchableOpacity>
        )}

        {/* OR Separator */}
        {!selectedImage && (
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={[styles.separatorText, { fontFamily: "Inter_400Regular" }]}>
              OR
            </Text>
            <View style={styles.separatorLine} />
          </View>
        )}

        {/* Dish Name Section */}
        {!selectedImage && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Use a dish name
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Type a dish (e.g. 'Pepperoni Pizza' or 'Bibimbap')"
              placeholderTextColor="#999999"
              value={dishName}
              onChangeText={setDishName}
              onSubmitEditing={handleGenerateRecipe}
              returnKeyType="search"
            />

            <TouchableOpacity
              style={[
                styles.generateButton,
                (dishNameSearchMutation.isPending || !dishName.trim()) &&
                  styles.generateButtonDisabled,
              ]}
              onPress={handleGenerateRecipe}
              disabled={dishNameSearchMutation.isPending || !dishName.trim()}
            >
              {dishNameSearchMutation.isPending ? (
                <Loader size={20} color="#FFFFFF" />
              ) : (
                <Search size={20} color="#FFFFFF" />
              )}
              <Text
                style={[
                  styles.generateButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {dishNameSearchMutation.isPending
                  ? "Searching..."
                  : "Generate Recipe"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </ScrollView>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
    textAlign: "center",
  },
  subtitleContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  placeholder: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  imageContainer: {
    position: "relative",
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
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
  resultsContainer: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 16,
  },
  analysisCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dishName: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 4,
  },
  confidence: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 12,
  },
  ingredientsLabel: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  recipeButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  recipeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  similarContainer: {
    marginTop: 8,
  },
  similarTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 12,
  },
  similarItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  separatorText: {
    fontSize: 14,
    color: "#999999",
    marginHorizontal: 16,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000000",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
    minWidth: 200,
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
  },
  secondaryButtonText: {
    color: "#000000",
  },
  retryButton: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  retryButtonText: {
    color: "#000000",
    fontSize: 14,
  },
});
