import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/utils/auth/useAuth";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { getApiUrl } from "@/config/api";

const DEFAULT_PREFERENCES = {
  dietType: [],
  allergies: [],
  dislikes: [],
  favoriteCuisines: [],
  preferredCookingTime: "15_30",
  maxCookingTime: "no_limit",
  defaultServings: 4,
  preferredDifficulty: "beginner",
  cookingGoals: [],
};

export function usePreferences() {
  const { auth, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated && auth?.user?.id) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, auth?.user?.id]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl(); // Use centralized config
      const response = await fetch(
        `${apiUrl}/api/preferences?userId=${auth.user.id}`
      );
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...result.data,
            dietType: Array.isArray(result.data.dietType) ? result.data.dietType : (result.data.dietType ? [result.data.dietType] : []),
            allergies: Array.isArray(result.data.allergies) ? result.data.allergies : [],
            dislikes: Array.isArray(result.data.dislikes) ? result.data.dislikes : [],
            favoriteCuisines: Array.isArray(result.data.favoriteCuisines) ? result.data.favoriteCuisines : [],
            cookingGoals: Array.isArray(result.data.cookingGoals) ? result.data.cookingGoals : [],
          });
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOption = useCallback((category, value) => {
    setPreferences((prev) => {
      const current = prev[category] || [];
      if (!Array.isArray(current)) {
        return prev;
      }
      const isSelected = current.includes(value);
      
      return {
        ...prev,
        [category]: isSelected
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  }, []);

  const handleSingleSelect = useCallback((category, value) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: value,
    }));
  }, []);

  const handleAddCustom = useCallback((category, value) => {
    if (!value || !value.trim()) return;
    
    setPreferences((prev) => {
      const current = prev[category] || [];
      const trimmedValue = value.trim();
      
      if (Array.isArray(current) && !current.includes(trimmedValue)) {
        return {
          ...prev,
          [category]: [...current, trimmedValue],
        };
      }
      return prev;
    });
  }, []);

  const handleRemoveItem = useCallback((category, item) => {
    setPreferences((prev) => {
      const current = prev[category] || [];
      if (Array.isArray(current)) {
        return {
          ...prev,
          [category]: current.filter((i) => i !== item),
        };
      }
      return prev;
    });
  }, []);

  const handleSavePreferences = useCallback(async () => {
    if (!isAuthenticated || !auth?.user?.id) {
      Alert.alert("Error", "Please sign in to save preferences");
      return;
    }

    setSaving(true);
    
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const apiUrl = getApiUrl(); // Use centralized config
      const response = await fetch(`${apiUrl}/api/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: auth.user.id,
          ...preferences,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save preferences");
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert("Success", "Your preferences have been saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [preferences, isAuthenticated, auth?.user?.id]);

  return {
    preferences,
    loading,
    saving,
    handleToggleOption,
    handleSingleSelect,
    handleAddCustom,
    handleRemoveItem,
    handleSavePreferences,
  };
}

