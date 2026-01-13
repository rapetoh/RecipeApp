import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Platform,
  ActivityIndicator,
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
import {
  ArrowLeft,
  Save,
  Target,
  Heart,
  Globe,
  Users,
  DollarSign,
  UtensilsCrossed,
  Leaf,
  Fish,
  AlertTriangle,
  ChefHat,
  Clock,
  Scale,
  CheckCircle,
  X,
  Plus,
  Minus,
  RotateCcw,
  Sliders,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { IngredientIcon } from "@/components/IngredientIcon";
import { getApiUrl } from "@/config/api";

const GOALS_OPTIONS = [
  { id: "save_time", label: "Save time", icon: Target, color: "#FF6B6B" },
  {
    id: "eat_healthier",
    label: "Eat healthier",
    icon: Heart,
    color: "#4ECDC4",
  },
  {
    id: "discover_cuisines",
    label: "Discover new cuisines",
    icon: Globe,
    color: "#45B7D1",
  },
  {
    id: "family_meals",
    label: "Plan meals for my family",
    icon: Users,
    color: "#FFA07A",
  },
  {
    id: "budget_friendly",
    label: "Stick to a budget",
    icon: DollarSign,
    color: "#98D8C8",
  },
  {
    id: "tasty_food",
    label: "Just eat tasty food",
    icon: UtensilsCrossed,
    color: "#F7DC6F",
  },
];

const DIET_OPTIONS = [
  { id: null, label: "No specific diet" },
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "pescatarian", label: "Pescatarian", icon: Fish },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
];

const ALLERGY_OPTIONS = [
  "Gluten",
  "Dairy / Lactose",
  "Nuts",
  "Eggs",
  "Shellfish",
  "Soy",
];

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

const SKILL_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Simple recipes with basic techniques",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "More complex dishes with varied techniques",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Challenging recipes with advanced skills",
  },
];

const TIME_OPTIONS = [
  { id: "under_15", label: "Under 15 minutes" },
  { id: "15_30", label: "15-30 minutes" },
  { id: "30_45", label: "30-45 minutes" },
  { id: "no_limit", label: "No time limit" },
];

const DAYS_OF_WEEK = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const SUGGESTION_TIMES = [
  { value: "08:00", label: "8:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "20:00", label: "8:00 PM" },
];

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // All preference states
  const [goals, setGoals] = useState([]);
  const [dietType, setDietType] = useState(null);
  const [otherDiet, setOtherDiet] = useState("");
  const [allergies, setAllergies] = useState([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [favoriteCuisines, setFavoriteCuisines] = useState([]);
  const [dislikedIngredients, setDislikedIngredients] = useState([]);
  const [customDislike, setCustomDislike] = useState("");
  const [cookingSkill, setCookingSkill] = useState("beginner");
  const [preferredCookingTime, setPreferredCookingTime] = useState("15_30");
  const [peopleCount, setPeopleCount] = useState(1);
  const [dailySuggestionEnabled, setDailySuggestionEnabled] = useState(true);
  const [dailySuggestionTime, setDailySuggestionTime] = useState("18:00");
  const [weeklyPlanEnabled, setWeeklyPlanEnabled] = useState(false);
  const [weeklyPlanDays, setWeeklyPlanDays] = useState([
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
  ]);
  const [measurementSystem, setMeasurementSystem] = useState("metric");
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [applyPreferencesInAssistant, setApplyPreferencesInAssistant] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const userId = auth?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/preferences?userId=${userId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        const prefs = result.data;
        setGoals(prefs.goals || []);
        // Handle diet type - if it's not in the standard list, it's a custom diet
        const standardDietIds = [null, "vegetarian", "vegan", "pescatarian", "halal", "kosher"];
        if (prefs.dietType && !standardDietIds.includes(prefs.dietType)) {
          setDietType("other");
          setOtherDiet(prefs.dietType);
        } else {
          setDietType(prefs.dietType);
          setOtherDiet("");
        }
        setAllergies(prefs.allergies || []);
        setFavoriteCuisines(prefs.favoriteCuisines || []);
        setDislikedIngredients(prefs.dislikedIngredients || []);
        setCookingSkill(prefs.cookingSkill || "beginner");
        setPreferredCookingTime(prefs.preferredCookingTime || "15_30");
        setPeopleCount(prefs.peopleCount || 1);
        setDailySuggestionEnabled(prefs.dailySuggestionEnabled !== false);
        setDailySuggestionTime(prefs.dailySuggestionTime || "18:00");
        setWeeklyPlanEnabled(prefs.weeklyPlanEnabled || false);
        setWeeklyPlanDays(
          prefs.weeklyPlanDays || ["mon", "tue", "wed", "thu", "fri"],
        );
        setMeasurementSystem(prefs.measurementSystem || "metric");
        setOnboardingCompleted(prefs.onboardingCompleted || false);
        setApplyPreferencesInAssistant(prefs.applyPreferencesInAssistant !== false); // Default to true
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      Alert.alert("Error", "Failed to load your preferences");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const userId = auth?.user?.id;
      if (!userId) {
        Alert.alert("Error", "Please sign in to save preferences");
        return;
      }

      const preferences = {
        userId: userId,
        goals,
        dietType: dietType === "other" ? otherDiet.trim() : dietType,
        allergies,
        favoriteCuisines,
        dislikedIngredients,
        cookingSkill,
        preferredCookingTime,
        peopleCount,
        dailySuggestionEnabled,
        dailySuggestionTime,
        weeklyPlanEnabled,
        weeklyPlanDays,
        measurementSystem,
        onboardingCompleted: onboardingCompleted, // Preserve onboarding status
        applyPreferencesInAssistant,
      };

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save preferences");
      }

      // Invalidate preferences cache so other components refetch with new data
      queryClient.invalidateQueries({ queryKey: ["preferences", userId] });
      
      // Also invalidate recipe queries so they refetch with new measurement system
      queryClient.invalidateQueries({ queryKey: ["recipe"] });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert("Success", "Your preferences have been saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Alert.alert(
        "Error",
        "Failed to save your preferences. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetPreferences = () => {
    Alert.alert(
      "Reset Preferences",
      "Are you sure you want to reset all preferences to defaults? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setResetting(true);

            // Reset to defaults
            setGoals([]);
            setDietType(null);
            setOtherDiet("");
            setAllergies([]);
            setFavoriteCuisines([]);
            setDislikedIngredients([]);
            setCookingSkill("beginner");
            setPreferredCookingTime("15_30");
            setPeopleCount(1);
            setDailySuggestionEnabled(true);
            setDailySuggestionTime("18:00");
            setWeeklyPlanEnabled(false);
            setWeeklyPlanDays(["mon", "tue", "wed", "thu", "fri"]);
            setMeasurementSystem("metric");
            setApplyPreferencesInAssistant(true);

            setResetting(false);

            if (Platform.OS !== "web") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
            }
          },
        },
      ],
    );
  };

  const handleGoalPress = (goalId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId],
    );
  };

  const handleAllergyPress = (allergy) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy],
    );
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim())) {
      setAllergies((prev) => [...prev, customAllergy.trim()]);
      setCustomAllergy("");
    }
  };

  const removeAllergy = (allergy) => {
    setAllergies((prev) => prev.filter((a) => a !== allergy));
  };

  const handleCuisinePress = (cuisineId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFavoriteCuisines((prev) =>
      prev.includes(cuisineId)
        ? prev.filter((c) => c !== cuisineId)
        : [...prev, cuisineId],
    );
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

  const removeDislike = (ingredient) => {
    setDislikedIngredients((prev) => prev.filter((i) => i !== ingredient));
  };

  const adjustPeopleCount = (change) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPeopleCount((prev) => Math.max(1, Math.min(20, prev + change)));
  };

  const handleDayPress = (dayId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWeeklyPlanDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    );
  };

  const handleBack = () => {
    router.back();
  };

  if (!fontsLoaded || loading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color="#FF9F1C" />
        <Text style={[styles.loadingText, { fontFamily: "Inter_500Medium" }]}>
          Loading your preferences...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#666666" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Preferences
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetPreferences}>
          <RotateCcw size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Recipe Assistant Section */}
        <View style={styles.section}>
          <View style={styles.infoBar}>
            <Text style={[styles.infoBarText, { fontFamily: "Inter_400Regular" }]}>
              Control how preferences are applied when generating recipes
            </Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchRowContent}>
              <Text
                style={[styles.switchLabel, { fontFamily: "Inter_600SemiBold" }]}
              >
                Apply My Preferences
              </Text>
              <Text
                style={[styles.switchSubtext, { fontFamily: "Inter_400Regular" }]}
              >
                Adapt recipes to match your diet, allergies, cuisines, and cooking preferences. Allergies and strict diets are always enforced for safety.
              </Text>
            </View>
            <Switch
              value={applyPreferencesInAssistant}
              onValueChange={setApplyPreferencesInAssistant}
              trackColor={{ false: "#E8E8E8", true: "#FF9F1C" }}
              thumbColor={applyPreferencesInAssistant ? "#FFFFFF" : "#CCCCCC"}
            />
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
            Your Goals
          </Text>
          <View style={styles.goalsGrid}>
            {GOALS_OPTIONS.map((goal) => {
              const IconComponent = goal.icon;
              const isSelected = goals.includes(goal.id);

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalChip,
                    isSelected && styles.goalChipSelected,
                  ]}
                  onPress={() => handleGoalPress(goal.id)}
                >
                  <IconComponent
                    size={16}
                    color={isSelected ? "#FFFFFF" : goal.color}
                  />
                  <Text
                    style={[
                      styles.goalChipText,
                      { fontFamily: "Inter_500Medium" },
                      isSelected && styles.goalChipTextSelected,
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Diet Type Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
            Diet Type
          </Text>
          <View style={styles.optionsGrid}>
            {DIET_OPTIONS.map((diet) => {
              const isSelected = dietType === diet.id;
              const IconComponent = diet.icon;

              return (
                <TouchableOpacity
                  key={diet.id || "none"}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => {
                    setDietType(diet.id);
                    if (diet.id !== "other") {
                      setOtherDiet("");
                    }
                  }}
                >
                  <View style={styles.optionContent}>
                    {IconComponent && (
                      <IconComponent
                        size={16}
                        color={isSelected ? "#FF9F1C" : "#666666"}
                      />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        { fontFamily: "Inter_500Medium" },
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {diet.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Other Diet Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                dietType === "other" && styles.optionCardSelected,
              ]}
              onPress={() => setDietType("other")}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    { fontFamily: "Inter_500Medium" },
                    dietType === "other" && styles.optionTextSelected,
                  ]}
                >
                  Other
                </Text>
              </View>
              {dietType === "other" && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {dietType === "other" && (
              <TextInput
                style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
                placeholder="Please specify your diet..."
                value={otherDiet}
                onChangeText={setOtherDiet}
                placeholderTextColor="#999999"
              />
            )}
          </View>
        </View>

        {/* Allergies Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={24} color="#FF6B6B" />
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
                Allergies & Intolerances
              </Text>
              <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
                Select all that apply
              </Text>
            </View>
          </View>

          <View style={styles.allergyGrid}>
            {ALLERGY_OPTIONS.map((allergy) => {
              const isSelected = allergies.includes(allergy);

              return (
                <TouchableOpacity
                  key={allergy}
                  style={[
                    styles.allergyChip,
                    isSelected && styles.allergyChipSelected,
                  ]}
                  onPress={() => handleAllergyPress(allergy)}
                >
                  <Text
                    style={[
                      styles.allergyLabel,
                      { fontFamily: "Inter_500Medium" },
                      isSelected && styles.allergyLabelSelected,
                    ]}
                  >
                    {allergy}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Allergy Input */}
          <View style={styles.customInputContainer}>
            <TextInput
              style={[styles.customInput, { fontFamily: "Inter_400Regular" }]}
              placeholder="Add other allergies (separate with commas)"
              value={customAllergy}
              onChangeText={setCustomAllergy}
              placeholderTextColor="#999999"
              onSubmitEditing={addCustomAllergy}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                !customAllergy.trim() && styles.addButtonDisabled,
              ]}
              onPress={addCustomAllergy}
              disabled={!customAllergy.trim()}
            >
              <Plus size={18} color={customAllergy.trim() ? "#FFFFFF" : "#CCCCCC"} />
            </TouchableOpacity>
          </View>

          {/* Selected Allergies Display */}
          {allergies.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              <Text
                style={[
                  styles.selectedTagsTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Selected:
              </Text>
              <View style={styles.selectedTagsGrid}>
                {allergies.map((allergy, index) => (
                  <View key={index} style={styles.selectedTag}>
                    <Text
                      style={[
                        styles.selectedTagText,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {allergy}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeAllergy(allergy)}
                      style={styles.removeTagButton}
                    >
                      <X size={14} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Favorite Cuisines Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={24} color="#45B7D1" />
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
                Favorite Cuisines
              </Text>
              <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
                Select all cuisines you enjoy
              </Text>
            </View>
          </View>

          <View style={styles.cuisineGrid}>
            {CUISINE_OPTIONS.map((cuisine) => {
              const isSelected = favoriteCuisines.includes(cuisine.id);

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
        </View>

        {/* Disliked Ingredients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <X size={24} color="#FF6B6B" />
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
                Ingredients to Avoid
              </Text>
              <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
                We'll avoid these in your recommendations
              </Text>
            </View>
          </View>

          {/* Custom Dislike Input */}
          <View style={styles.customInputContainer}>
            <TextInput
              style={[styles.customInput, { fontFamily: "Inter_400Regular" }]}
              placeholder="Add ingredient (e.g., onions, mushrooms)"
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
              <Plus size={18} color={customDislike.trim() ? "#FFFFFF" : "#CCCCCC"} />
            </TouchableOpacity>
          </View>

          {/* Selected Dislikes Display */}
          {dislikedIngredients.length > 0 ? (
            <View style={styles.selectedTagsContainer}>
              <View style={styles.selectedTagsGrid}>
                {dislikedIngredients.map((ingredient, index) => (
                  <View key={index} style={styles.selectedTag}>
                    <IngredientIcon ingredient={ingredient} size={24} />
                    <Text
                      style={[
                        styles.selectedTagText,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {ingredient}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeDislike(ingredient)}
                      style={styles.removeTagButton}
                    >
                      <X size={14} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={[styles.emptyStateText, { fontFamily: "Inter_400Regular" }]}>
              No ingredients to avoid yet
            </Text>
          )}
        </View>

        {/* Cooking Style Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ChefHat size={24} color="#FF9F1C" />
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
                Cooking Style
              </Text>
              <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
                Your comfort level and preferences
              </Text>
            </View>
          </View>

          {/* Skill Level */}
          <Text style={[styles.subsectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Skill Level
          </Text>
          <View style={styles.skillContainer}>
            {SKILL_LEVELS.map((skill) => {
              const isSelected = cookingSkill === skill.id;

              return (
                <TouchableOpacity
                  key={skill.id}
                  style={[
                    styles.skillCard,
                    isSelected && styles.skillCardSelected,
                  ]}
                  onPress={() => setCookingSkill(skill.id)}
                >
                  <Text
                    style={[
                      styles.skillLabel,
                      { fontFamily: "Inter_600SemiBold" },
                      isSelected && styles.skillLabelSelected,
                    ]}
                  >
                    {skill.label}
                  </Text>
                  <Text
                    style={[
                      styles.skillDescription,
                      { fontFamily: "Inter_400Regular" },
                      isSelected && styles.skillDescriptionSelected,
                    ]}
                  >
                    {skill.description}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preferred Cooking Time */}
          <Text
            style={[
              styles.subsectionTitle,
              { fontFamily: "Inter_600SemiBold" },
              { marginTop: 24 },
            ]}
          >
            Preferred Cooking Time
          </Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((time) => {
              const isSelected = preferredCookingTime === time.id;

              return (
                <TouchableOpacity
                  key={time.id}
                  style={[
                    styles.timeCard,
                    isSelected && styles.timeCardSelected,
                  ]}
                  onPress={() => setPreferredCookingTime(time.id)}
                >
                  <Text
                    style={[
                      styles.timeLabel,
                      { fontFamily: "Inter_500Medium" },
                      isSelected && styles.timeLabelSelected,
                    ]}
                  >
                    {time.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* People Count */}
          <Text
            style={[
              styles.subsectionTitle,
              { fontFamily: "Inter_600SemiBold" },
              { marginTop: 24 },
            ]}
          >
            People Usually Cooked For
          </Text>
          <View style={styles.peopleCountContainer}>
            <TouchableOpacity
              style={[
                styles.countButton,
                peopleCount <= 1 && styles.countButtonDisabled,
              ]}
              onPress={() => adjustPeopleCount(-1)}
              disabled={peopleCount <= 1}
            >
              <Minus
                size={20}
                color={peopleCount <= 1 ? "#CCCCCC" : "#666666"}
              />
            </TouchableOpacity>

            <View style={styles.countDisplay}>
              <Text
                style={[styles.countNumber, { fontFamily: "Inter_700Bold" }]}
              >
                {peopleCount}
              </Text>
              <Text
                style={[styles.countLabel, { fontFamily: "Inter_500Medium" }]}
              >
                {peopleCount === 1 ? "person" : "people"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.countButton,
                peopleCount >= 20 && styles.countButtonDisabled,
              ]}
              onPress={() => adjustPeopleCount(1)}
              disabled={peopleCount >= 20}
            >
              <Plus
                size={20}
                color={peopleCount >= 20 ? "#CCCCCC" : "#666666"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Measurement System Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Scale size={24} color="#FFA07A" />
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold" }]}>
                Measurement Units
              </Text>
              <Text style={[styles.sectionSubtitle, { fontFamily: "Inter_400Regular" }]}>
                Choose your preferred measurement system
              </Text>
            </View>
          </View>

          <View style={styles.measurementOptions}>
            <TouchableOpacity
              style={[
                styles.measurementOption,
                measurementSystem === "metric" &&
                  styles.measurementOptionSelected,
              ]}
              onPress={() => setMeasurementSystem("metric")}
            >
              <View style={styles.measurementContent}>
                <Text
                  style={[
                    styles.measurementLabel,
                    { fontFamily: "Inter_600SemiBold" },
                    measurementSystem === "metric" &&
                      styles.measurementLabelSelected,
                  ]}
                >
                  Metric
                </Text>
                <Text
                  style={[
                    styles.measurementDescription,
                    { fontFamily: "Inter_400Regular" },
                    measurementSystem === "metric" &&
                      styles.measurementDescriptionSelected,
                  ]}
                >
                  grams, kilograms, liters
                </Text>
              </View>
              {measurementSystem === "metric" && (
                <CheckCircle size={20} color="#FFA07A" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.measurementOption,
                measurementSystem === "imperial" &&
                  styles.measurementOptionSelected,
              ]}
              onPress={() => setMeasurementSystem("imperial")}
            >
              <View style={styles.measurementContent}>
                <Text
                  style={[
                    styles.measurementLabel,
                    { fontFamily: "Inter_600SemiBold" },
                    measurementSystem === "imperial" &&
                      styles.measurementLabelSelected,
                  ]}
                >
                  US Imperial
                </Text>
                <Text
                  style={[
                    styles.measurementDescription,
                    { fontFamily: "Inter_400Regular" },
                    measurementSystem === "imperial" &&
                      styles.measurementDescriptionSelected,
                  ]}
                >
                  cups, ounces, pounds
                </Text>
              </View>
              {measurementSystem === "imperial" && (
                <CheckCircle size={20} color="#FFA07A" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={savePreferences}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text
                  style={[
                    styles.saveButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Save Preferences
                </Text>
              </>
            )}
          </TouchableOpacity>
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    color: "#000000",
  },
  resetButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  sectionTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 16,
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 8,
  },
  goalChipSelected: {
    backgroundColor: "#FF9F1C",
  },
  goalChipText: {
    fontSize: 14,
    color: "#333333",
  },
  goalChipTextSelected: {
    color: "#FFFFFF",
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionText: {
    fontSize: 16,
    color: "#333333",
  },
  optionTextSelected: {
    color: "#FF9F1C",
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  saveSection: {
    paddingVertical: 32,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  saveButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
  },
  subsectionTitle: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 12,
  },
  allergyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  allergyChip: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  allergyChipSelected: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFF5F5",
  },
  allergyLabel: {
    fontSize: 14,
    color: "#333333",
  },
  allergyLabelSelected: {
    color: "#FF6B6B",
  },
  customInputContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  customInput: {
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
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  selectedTagsContainer: {
    marginTop: 8,
  },
  selectedTagsTitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  selectedTagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTag: {
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
  selectedTagText: {
    fontSize: 12,
    color: "#333333",
  },
  removeTagButton: {
    padding: 2,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
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
  emptyStateText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    paddingVertical: 16,
  },
  skillContainer: {
    gap: 12,
  },
  skillCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  skillCardSelected: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  skillLabel: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 4,
  },
  skillLabelSelected: {
    color: "#FF9F1C",
  },
  skillDescription: {
    fontSize: 14,
    color: "#666666",
  },
  skillDescriptionSelected: {
    color: "#CC7A00",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  timeCardSelected: {
    borderColor: "#FF9F1C",
    backgroundColor: "#FFF9F0",
  },
  timeLabel: {
    fontSize: 14,
    color: "#333333",
  },
  timeLabelSelected: {
    color: "#FF9F1C",
  },
  peopleCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    padding: 20,
    gap: 32,
  },
  countButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countButtonDisabled: {
    backgroundColor: "#F0F0F0",
  },
  countDisplay: {
    alignItems: "center",
    minWidth: 80,
  },
  countNumber: {
    fontSize: 32,
    color: "#FF9F1C",
    marginBottom: 4,
  },
  countLabel: {
    fontSize: 16,
    color: "#666666",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  switchRowContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 14,
    color: "#666666",
  },
  timeSelectionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  timeSelectionLabel: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 12,
  },
  timeOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeOption: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  timeOptionSelected: {
    borderColor: "#4ECDC4",
    backgroundColor: "#F0FFFE",
  },
  timeOptionText: {
    fontSize: 14,
    color: "#333333",
  },
  timeOptionTextSelected: {
    color: "#4ECDC4",
  },
  daysSelectionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  daysSelectionLabel: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: 50,
    alignItems: "center",
  },
  dayChipSelected: {
    borderColor: "#45B7D1",
    backgroundColor: "#F0F8FF",
  },
  dayChipText: {
    fontSize: 14,
    color: "#333333",
  },
  dayChipTextSelected: {
    color: "#45B7D1",
  },
  measurementOptions: {
    marginTop: 16,
    gap: 12,
  },
  measurementOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  measurementOptionSelected: {
    borderColor: "#FFA07A",
    backgroundColor: "#FFF8F5",
  },
  measurementContent: {
    flex: 1,
  },
  measurementLabel: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 4,
  },
  measurementLabelSelected: {
    color: "#FFA07A",
  },
  measurementDescription: {
    fontSize: 14,
    color: "#666666",
  },
  measurementDescriptionSelected: {
    color: "#D1845A",
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginTop: 8,
  },
  infoBar: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoBarText: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
  },
});
