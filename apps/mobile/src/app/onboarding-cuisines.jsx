import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
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
import { ArrowRight, ArrowLeft, Globe, X } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { getIngredientIcon } from "@/utils/ingredientIcons";

const CUISINE_OPTIONS = [
  { id: "african", label: "African", emoji: "🌍" },
  { id: "west_african", label: "West African", emoji: "🇳🇬" },
  { id: "american", label: "American", emoji: "🇺🇸" },
  { id: "italian", label: "Italian", emoji: "🇮🇹" },
  { id: "asian", label: "Asian", emoji: "🥢" },
  { id: "indian", label: "Indian", emoji: "🇮🇳" },
  { id: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { id: "middle_eastern", label: "Middle Eastern", emoji: "🧄" },
  { id: "chinese", label: "Chinese", emoji: "🇨🇳" },
  { id: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { id: "thai", label: "Thai", emoji: "🇹🇭" },
];

const COMMON_DISLIKED = [
  "Onions",
  "Mushrooms",
  "Cilantro",
  "Seafood",
  "Spicy food",
  "Olives",
  "Bell peppers",
  "Coconut",
  "Ginger",
  "Mayonnaise",
  "Avocado",
  "Tomatoes",
];

export default function OnboardingCuisinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get data from previous screens
  const goals = params.goals ? JSON.parse(params.goals) : [];
  const dietType = params.dietType || "";
  const allergies = params.allergies ? JSON.parse(params.allergies) : [];

  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [otherCuisines, setOtherCuisines] = useState("");
  const [dislikedIngredients, setDislikedIngredients] = useState([]);
  const [customDislike, setCustomDislike] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleCuisinePress = (cuisineId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectedCuisines((prev) => {
      if (prev.includes(cuisineId)) {
        return prev.filter((id) => id !== cuisineId);
      } else {
        return [...prev, cuisineId];
      }
    });
  };

  const handleDislikePress = (ingredient) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setDislikedIngredients((prev) => {
      if (prev.includes(ingredient)) {
        return prev.filter((item) => item !== ingredient);
      } else {
        return [...prev, ingredient];
      }
    });
  };

  const addCustomDislike = () => {
    if (
      customDislike.trim() &&
      !dislikedIngredients.includes(customDislike.trim())
    ) {
      setDislikedIngredients((prev) => [...prev, customDislike.trim()]);
      setCustomDislike("");
    }
  };

  const removeDislikedIngredient = (ingredient) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDislikedIngredients((prev) =>
      prev.filter((item) => item !== ingredient),
    );
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleContinue = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const allCuisines = [...selectedCuisines];
    if (otherCuisines.trim()) {
      allCuisines.push(
        ...otherCuisines
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }

    // Pass data to next screen
    router.push({
      pathname: "/onboarding-cooking",
      params: {
        goals: JSON.stringify(goals),
        dietType: dietType,
        allergies: JSON.stringify(allergies),
        favoriteCuisines: JSON.stringify(allCuisines),
        dislikedIngredients: JSON.stringify(dislikedIngredients),
      },
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Progress Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#666666" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "60%" }]} />
          </View>
          <Text
            style={[styles.stepIndicator, { fontFamily: "Inter_500Medium" }]}
          >
            Step 3 of 5
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cuisines Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
            Which cuisines do you like? 🍜
          </Text>
          <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            Select all that appeal to you
          </Text>

          <View style={styles.cuisineGrid}>
            {CUISINE_OPTIONS.map((cuisine) => {
              const isSelected = selectedCuisines.includes(cuisine.id);

              return (
                <TouchableOpacity
                  key={cuisine.id}
                  style={[
                    styles.cuisineChip,
                    isSelected && styles.cuisineChipSelected,
                  ]}
                  onPress={() => handleCuisinePress(cuisine.id)}
                >
                  <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text>
                  <Text
                    style={[
                      styles.cuisineLabel,
                      { fontFamily: "Inter_500Medium" },
                      isSelected && styles.cuisineLabelSelected,
                    ]}
                  >
                    {cuisine.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Other cuisines you love (separate with commas)"
            value={otherCuisines}
            onChangeText={setOtherCuisines}
            placeholderTextColor="#999999"
            multiline
          />
        </View>

        {/* Dislikes Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
            Any ingredients you don't like? 🚫
          </Text>
          <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            We'll avoid these in your recommendations
          </Text>

          {/* Common dislikes */}
          <View style={styles.dislikeGrid}>
            {COMMON_DISLIKED.map((ingredient) => {
              const isSelected = dislikedIngredients.includes(ingredient);

              return (
                <TouchableOpacity
                  key={ingredient}
                  style={[
                    styles.dislikeChip,
                    isSelected && styles.dislikeChipSelected,
                  ]}
                  onPress={() => handleDislikePress(ingredient)}
                >
                  <Text style={styles.dislikeEmoji}>
                    {getIngredientIcon(ingredient)}
                  </Text>
                  <Text
                    style={[
                      styles.dislikeLabel,
                      { fontFamily: "Inter_400Regular" },
                      isSelected && styles.dislikeLabelSelected,
                    ]}
                  >
                    {ingredient}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom dislike input */}
          <View style={styles.customDislikeContainer}>
            <TextInput
              style={[
                styles.customDislikeInput,
                { fontFamily: "Inter_400Regular" },
              ]}
              placeholder="Add another ingredient..."
              value={customDislike}
              onChangeText={setCustomDislike}
              placeholderTextColor="#999999"
              onSubmitEditing={addCustomDislike}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                !customDislike.trim() && styles.addButtonDisabled,
              ]}
              onPress={addCustomDislike}
              disabled={!customDislike.trim()}
            >
              <Text
                style={[
                  styles.addButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected dislikes display */}
          {dislikedIngredients.length > 0 && (
            <View style={styles.selectedDislikesContainer}>
              <Text
                style={[
                  styles.selectedDislikesTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Avoiding these ingredients:
              </Text>
              <View style={styles.selectedDislikesGrid}>
                {dislikedIngredients.map((ingredient, index) => (
                  <View key={index} style={styles.selectedDislikeTag}>
                    <Text style={styles.selectedDislikeEmoji}>
                      {getIngredientIcon(ingredient)}
                    </Text>
                    <Text
                      style={[
                        styles.selectedDislikeText,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {ingredient}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeDislikedIngredient(ingredient)}
                      style={styles.removeButton}
                    >
                      <X size={14} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedCuisines.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedCuisines.length === 0}
        >
          <Text
            style={[
              styles.continueButtonText,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Continue
          </Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {selectedCuisines.length === 0 && (
          <Text style={[styles.helperText, { fontFamily: "Inter_400Regular" }]}>
            Select at least one cuisine to continue
          </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#E8E8E8",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF9F1C",
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 14,
    color: "#666666",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 24,
    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 20,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  cuisineChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
  },
  cuisineChipSelected: {
    borderColor: "#45B7D1",
    backgroundColor: "#F0F8FF",
  },
  cuisineEmoji: {
    fontSize: 18,
  },
  cuisineLabel: {
    fontSize: 14,
    color: "#333333",
  },
  cuisineLabelSelected: {
    color: "#45B7D1",
  },
  dislikeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  dislikeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
  },
  dislikeChipSelected: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFF5F5",
  },
  dislikeEmoji: {
    fontSize: 18,
  },
  dislikeLabel: {
    fontSize: 13,
    color: "#333333",
  },
  dislikeLabelSelected: {
    color: "#FF6B6B",
  },
  customDislikeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  customDislikeInput: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  addButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  addButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  selectedDislikesContainer: {
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 16,
  },
  selectedDislikesTitle: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 12,
  },
  selectedDislikesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedDislikeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  selectedDislikeEmoji: {
    fontSize: 16,
  },
  selectedDislikeText: {
    fontSize: 12,
    color: "#333333",
  },
  removeButton: {
    padding: 2,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    minHeight: 50,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  continueButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  continueButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  helperText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    marginTop: 12,
  },
});
