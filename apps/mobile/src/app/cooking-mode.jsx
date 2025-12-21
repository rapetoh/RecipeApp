import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Vibration,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
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
  Check,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ChefHat,
  CheckCircle2,
  Timer,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";

const { width: screenWidth } = Dimensions.get("window");

export default function CookingModeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  // Cooking state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [activeTimers, setActiveTimers] = useState({});
  const [cookingStarted, setCookingStarted] = useState(false);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch recipe details
  const { data: recipeData, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Recipe ID is required");
      }
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(
        `${apiUrl}/api/recipes/${id}?userId=${auth?.user?.id || ""}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch recipe");
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive, timerSeconds]);

  const handleTimerComplete = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Vibration.vibrate([0, 500, 200, 500]);
    }
    Alert.alert("Timer Complete!", "Time's up for this step!");
  };

  const handleBackPress = () => {
    if (cookingStarted) {
      Alert.alert(
        "Exit Cooking Mode?",
        "Your progress will be saved. Are you sure you want to exit?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", style: "destructive", onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  };

  const handleIngredientToggle = (index) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCheckedIngredients((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleStepComplete = (stepIndex) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCompletedSteps((prev) => {
      if (prev.includes(stepIndex)) {
        return prev.filter((i) => i !== stepIndex);
      } else {
        return [...prev, stepIndex];
      }
    });
  };

  const handleNextStep = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const instructions = recipeData?.data?.instructions || [];
    if (currentStep < instructions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const startTimer = (minutes) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setTimerSeconds(minutes * 60);
    setIsTimerActive(true);
  };

  const pauseTimer = () => {
    setIsTimerActive(false);
  };

  const resumeTimer = () => {
    setIsTimerActive(true);
  };

  const resetTimer = () => {
    setIsTimerActive(false);
    setTimerSeconds(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartCooking = () => {
    setCookingStarted(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const handleCompleteCooking = () => {
    Alert.alert(
      "Recipe Complete! 🎉",
      "Congratulations! You've finished cooking. How did it turn out?",
      [
        {
          text: "Rate Recipe",
          onPress: () => {
            // Navigate to rating if you have that feature
            router.back();
          },
        },
        { text: "Done", onPress: () => router.back() },
      ],
    );
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
          Loading cooking mode...
        </Text>
      </View>
    );
  }

  const recipe = recipeData?.data;
  if (!recipe) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
          Recipe not found
        </Text>
      </View>
    );
  }

  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];
  const allStepsCompleted = completedSteps.length === instructions.length;
  const allIngredientsChecked =
    checkedIngredients.length === ingredients.length;

  if (!cookingStarted) {
    // Pre-cooking ingredient checklist
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <ChevronLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Prepare Ingredients
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Recipe Header */}
          <View style={styles.recipeHeader}>
            {recipe.image_url && (
              <Image
                source={{ uri: recipe.image_url }}
                style={styles.recipeImage}
                contentFit="cover"
                transition={200}
              />
            )}
            <Text style={[styles.recipeTitle, { fontFamily: "Inter_700Bold" }]}>
              {recipe.name}
            </Text>
            <Text
              style={[
                styles.recipeSubtitle,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              Get your ingredients ready before we start cooking
            </Text>
          </View>

          {/* Ingredients Checklist */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Ingredients Checklist
              </Text>
              <Text
                style={[
                  styles.progressText,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                {checkedIngredients.length}/{ingredients.length}
              </Text>
            </View>
            {ingredients.map((ingredient, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.ingredientItem,
                  checkedIngredients.includes(index) &&
                    styles.ingredientItemChecked,
                ]}
                onPress={() => handleIngredientToggle(index)}
              >
                <View
                  style={[
                    styles.checkbox,
                    checkedIngredients.includes(index) &&
                      styles.checkboxChecked,
                  ]}
                >
                  {checkedIngredients.includes(index) && (
                    <Check size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.ingredientInfo}>
                  <Text
                    style={[
                      styles.ingredientAmount,
                      { fontFamily: "Inter_600SemiBold" },
                      checkedIngredients.includes(index) &&
                        styles.ingredientTextChecked,
                    ]}
                  >
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                  <Text
                    style={[
                      styles.ingredientName,
                      { fontFamily: "Inter_400Regular" },
                      checkedIngredients.includes(index) &&
                        styles.ingredientTextChecked,
                    ]}
                  >
                    {ingredient.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recipe Info */}
          <View style={styles.recipeInfoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Clock size={20} color="#666666" />
                <Text
                  style={[styles.infoText, { fontFamily: "Inter_400Regular" }]}
                >
                  {recipe.cooking_time || 30} minutes
                </Text>
              </View>
              <View style={styles.infoItem}>
                <ChefHat size={20} color="#666666" />
                <Text
                  style={[styles.infoText, { fontFamily: "Inter_400Regular" }]}
                >
                  {recipe.difficulty || "Medium"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Start Cooking Button */}
        <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.startButton,
              !allIngredientsChecked && styles.startButtonDisabled,
            ]}
            onPress={handleStartCooking}
            disabled={!allIngredientsChecked}
          >
            <Text
              style={[
                styles.startButtonText,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {allIngredientsChecked
                ? "Start Cooking! 🔥"
                : `Check all ingredients (${checkedIngredients.length}/${ingredients.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main cooking interface
  const currentInstruction = instructions[currentStep];
  const progress = (currentStep + 1) / instructions.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Cooking Mode
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={[styles.progressLabel, { fontFamily: "Inter_500Medium" }]}>
          Step {currentStep + 1} of {instructions.length}
        </Text>
      </View>

      {/* Timer Section */}
      {timerSeconds > 0 && (
        <View style={styles.timerSection}>
          <View style={styles.timerDisplay}>
            <Timer size={24} color="#FF9F1C" />
            <Text style={[styles.timerText, { fontFamily: "Inter_700Bold" }]}>
              {formatTime(timerSeconds)}
            </Text>
          </View>
          <View style={styles.timerControls}>
            <TouchableOpacity
              style={styles.timerButton}
              onPress={isTimerActive ? pauseTimer : resumeTimer}
            >
              {isTimerActive ? (
                <Pause size={16} color="#000000" />
              ) : (
                <Play size={16} color="#000000" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerButton} onPress={resetTimer}>
              <RotateCcw size={16} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Step */}
        <View style={styles.currentStepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text
                style={[styles.stepNumberText, { fontFamily: "Inter_700Bold" }]}
              >
                {currentStep + 1}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.completeButton,
                completedSteps.includes(currentStep) &&
                  styles.completeButtonActive,
              ]}
              onPress={() => handleStepComplete(currentStep)}
            >
              <CheckCircle2
                size={24}
                color={
                  completedSteps.includes(currentStep) ? "#FFFFFF" : "#CCCCCC"
                }
              />
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.stepInstruction,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {currentInstruction?.instruction || currentInstruction?.step || ""}
          </Text>
          {/* Quick Timer Buttons */}
          <View style={styles.quickTimers}>
            <Text
              style={[
                styles.quickTimersLabel,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              Quick Timers:
            </Text>
            <View style={styles.quickTimerButtons}>
              {[1, 3, 5, 10].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={styles.quickTimerButton}
                  onPress={() => startTimer(minutes)}
                >
                  <Text
                    style={[
                      styles.quickTimerText,
                      { fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    {minutes}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Steps Overview */}
        <View style={styles.stepsOverview}>
          <Text
            style={[styles.overviewTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            All Steps
          </Text>
          {instructions.map((instruction, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.stepOverviewItem,
                index === currentStep && styles.stepOverviewItemActive,
                completedSteps.includes(index) &&
                  styles.stepOverviewItemCompleted,
              ]}
              onPress={() => setCurrentStep(index)}
            >
              <View
                style={[
                  styles.stepOverviewNumber,
                  index === currentStep && styles.stepOverviewNumberActive,
                  completedSteps.includes(index) &&
                    styles.stepOverviewNumberCompleted,
                ]}
              >
                {completedSteps.includes(index) ? (
                  <Check size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepOverviewNumberText,
                      { fontFamily: "Inter_600SemiBold" },
                      index === currentStep &&
                        styles.stepOverviewNumberTextActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepOverviewText,
                  { fontFamily: "Inter_400Regular" },
                  index === currentStep && styles.stepOverviewTextActive,
                  completedSteps.includes(index) &&
                    styles.stepOverviewTextCompleted,
                ]}
              >
                {instruction.instruction || instruction.step || ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View
        style={[styles.bottomNavigation, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          style={[
            styles.navButton,
            currentStep === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePreviousStep}
          disabled={currentStep === 0}
        >
          <Text
            style={[styles.navButtonText, { fontFamily: "Inter_500Medium" }]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        {allStepsCompleted ? (
          <TouchableOpacity
            style={styles.completeRecipeButton}
            onPress={handleCompleteCooking}
          >
            <Text
              style={[
                styles.completeRecipeText,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Complete Recipe! 🎉
            </Text>
          </TouchableOpacity>
        ) : currentStep === instructions.length - 1 ? (
          <TouchableOpacity
            style={[
              styles.finalStepButton,
              !completedSteps.includes(currentStep) &&
                styles.finalStepButtonDisabled,
            ]}
            onPress={handleCompleteCooking}
            disabled={!completedSteps.includes(currentStep)}
          >
            <Text
              style={[
                styles.finalStepText,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Finish Cooking
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
            <Text
              style={[
                styles.nextButtonText,
                { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Next Step
            </Text>
          </TouchableOpacity>
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Pre-cooking styles
  recipeHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  recipeImage: {
    width: screenWidth - 80,
    height: (screenWidth - 80) * 0.6,
    borderRadius: 12,
    marginBottom: 16,
  },
  recipeTitle: {
    fontSize: 24,
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },
  recipeSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#000000",
  },
  progressText: {
    fontSize: 16,
    color: "#666666",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 8,
  },
  ingredientItemChecked: {
    backgroundColor: "#E8F5E8",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientAmount: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 2,
  },
  ingredientName: {
    fontSize: 14,
    color: "#666666",
    textTransform: "capitalize",
  },
  ingredientTextChecked: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  recipeInfoCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#666666",
    marginLeft: 8,
    textTransform: "capitalize",
  },
  bottomCTA: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  startButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  startButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  // Cooking mode styles
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF9F1C",
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  timerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  timerDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    fontSize: 20,
    color: "#FF9F1C",
    marginLeft: 8,
  },
  timerControls: {
    flexDirection: "row",
  },
  timerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  currentStepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  completeButtonActive: {
    backgroundColor: "#4CAF50",
  },
  stepInstruction: {
    fontSize: 18,
    color: "#000000",
    lineHeight: 26,
    marginBottom: 20,
  },
  quickTimers: {
    marginTop: 16,
  },
  quickTimersLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  quickTimerButtons: {
    flexDirection: "row",
  },
  quickTimerButton: {
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  quickTimerText: {
    fontSize: 12,
    color: "#000000",
  },
  stepsOverview: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  overviewTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },
  stepOverviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  stepOverviewItemActive: {
    backgroundColor: "#E8F4FD",
  },
  stepOverviewItemCompleted: {
    backgroundColor: "#E8F5E8",
  },
  stepOverviewNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepOverviewNumberActive: {
    backgroundColor: "#2196F3",
  },
  stepOverviewNumberCompleted: {
    backgroundColor: "#4CAF50",
  },
  stepOverviewNumberText: {
    fontSize: 12,
    color: "#666666",
  },
  stepOverviewNumberTextActive: {
    color: "#FFFFFF",
  },
  stepOverviewText: {
    fontSize: 14,
    color: "#666666",
    flex: 1,
    lineHeight: 20,
  },
  stepOverviewTextActive: {
    color: "#2196F3",
  },
  stepOverviewTextCompleted: {
    color: "#4CAF50",
  },
  bottomNavigation: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  navButton: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  navButtonDisabled: {
    backgroundColor: "#F0F0F0",
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: "#000000",
  },
  nextButton: {
    flex: 2,
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  completeRecipeButton: {
    flex: 2,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  completeRecipeText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  finalStepButton: {
    flex: 2,
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  finalStepButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  finalStepText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
  },
});





