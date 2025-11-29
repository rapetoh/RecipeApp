import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { PreferenceHeader } from "@/components/AdvancedPreferences/PreferenceHeader";
import { AuthPrompt } from "@/components/AdvancedPreferences/AuthPrompt";
import { DietTypeSection } from "@/components/AdvancedPreferences/DietTypeSection";
import { AllergiesSection } from "@/components/AdvancedPreferences/AllergiesSection";
import { DislikesSection } from "@/components/AdvancedPreferences/DislikesSection";
import { CuisinesSection } from "@/components/AdvancedPreferences/CuisinesSection";
import { TimePreferencesSection } from "@/components/AdvancedPreferences/TimePreferencesSection";
import { ServingSizeSection } from "@/components/AdvancedPreferences/ServingSizeSection";
import { DifficultySection } from "@/components/AdvancedPreferences/DifficultySection";
import { GoalsSection } from "@/components/AdvancedPreferences/GoalsSection";
import { AddCustomModal } from "@/components/AdvancedPreferences/AddCustomModal";

export default function AdvancedPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated, signIn } = useAuth();

  const [showAddModal, setShowAddModal] = useState(null);

  const {
    preferences,
    handleToggleOption,
    handleSingleSelect,
    handleAddCustom,
    handleRemoveItem,
    handleSavePreferences,
  } = usePreferences();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleAddCustomItem = (value) => {
    const category = showAddModal === "allergy" ? "allergies" : "dislikes";
    handleAddCustom(category, value);
    setShowAddModal(null);
  };

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      <PreferenceHeader
        onBack={() => router.back()}
        onSave={handleSavePreferences}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isAuthenticated ? (
          <AuthPrompt onSignIn={signIn} />
        ) : (
          <>
            <DietTypeSection
              selectedDiets={preferences.dietType || []}
              onToggle={(id) => handleToggleOption("dietType", id)}
            />

            <AllergiesSection
              allergies={preferences.allergies || []}
              onRemove={(item) => handleRemoveItem("allergies", item)}
              onAdd={() => setShowAddModal("allergy")}
              onQuickAdd={(allergy) => handleToggleOption("allergies", allergy)}
            />

            <DislikesSection
              dislikes={preferences.dislikes || []}
              onRemove={(item) => handleRemoveItem("dislikes", item)}
              onAdd={() => setShowAddModal("dislike")}
              onQuickAdd={(dislike) => handleToggleOption("dislikes", dislike)}
            />

            <CuisinesSection
              selectedCuisines={preferences.favoriteCuisines || []}
              onToggle={(id) => handleToggleOption("favoriteCuisines", id)}
            />

            <TimePreferencesSection
              preferredTime={preferences.preferredCookingTime}
              maxTime={preferences.maxCookingTime}
              onChangePreferred={(value) =>
                handleSingleSelect("preferredCookingTime", value)
              }
              onChangeMax={(value) =>
                handleSingleSelect("maxCookingTime", value)
              }
            />

            <ServingSizeSection
              servings={preferences.defaultServings}
              onChange={(value) => handleSingleSelect("defaultServings", value)}
            />

            <DifficultySection
              selectedDifficulty={preferences.preferredDifficulty}
              onSelect={(id) => handleSingleSelect("preferredDifficulty", id)}
            />

            <GoalsSection
              selectedGoals={preferences.cookingGoals || []}
              onToggle={(id) => handleToggleOption("cookingGoals", id)}
            />
          </>
        )}
      </ScrollView>

      <AddCustomModal
        visible={!!showAddModal}
        type={showAddModal}
        onClose={() => setShowAddModal(null)}
        onAdd={handleAddCustomItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
