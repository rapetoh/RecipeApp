import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { CalendarPlus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

export function RecipeActionButtons({
  recipeId,
  isAuthenticated,
  signIn,
  onAddToMealPlan,
  insets,
  fontFamily,
}) {
  const router = useRouter();

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

    // Navigate to cooking mode
    router.push(`/cooking-mode?id=${recipeId}`);
  };

  return (
    <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.ctaButtons}>
        <TouchableOpacity
          style={[styles.ctaButton, styles.secondaryButton]}
          onPress={onAddToMealPlan}
          accessibilityLabel="Add to meal plan"
          accessibilityRole="button"
        >
          <CalendarPlus size={20} color="#FF9F1C" />
          <Text
            style={[
              styles.secondaryButtonText,
              { fontFamily: fontFamily.semiBold },
            ]}
          >
            Add to Plan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctaButton, styles.primaryButton]}
          onPress={handleStartCooking}
          accessibilityLabel="Start cooking this recipe"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.primaryButtonText,
              { fontFamily: fontFamily.semiBold },
            ]}
          >
            Start Cooking
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  ctaButtons: {
    flexDirection: "row",
    gap: 12,
  },
  ctaButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: "#FF9F1C",
    flex: 2,
  },
  secondaryButton: {
    backgroundColor: "#FFF4E6",
    borderWidth: 2,
    borderColor: "#FF9F1C",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    color: "#FF9F1C",
    textAlign: "center",
  },
});

