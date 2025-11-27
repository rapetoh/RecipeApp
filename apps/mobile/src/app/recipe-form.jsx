import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Animated,
  KeyboardAvoidingView,
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
  Save,
  Camera,
  ImageIcon,
  Plus,
  Minus,
  Clock,
  Users,
  ChefHat,
  X,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useUpload } from "@/utils/useUpload";
import { useAuth, useRequireAuth } from "@/utils/auth/useAuth";

export default function RecipeFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { edit } = useLocalSearchParams(); // If edit=recipeId, we're editing
  const [upload, { loading: uploadLoading }] = useUpload();
  const { auth, isAuthenticated } = useAuth();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
  
  // Automatically redirect to sign-in if not authenticated
  useRequireAuth();

  const isEditing = Boolean(edit);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Category options
  const categoryOptions = [
    { value: "breakfast", label: "Breakfast", emoji: "🍳" },
    { value: "lunch", label: "Lunch", emoji: "🥗" },
    { value: "dinner", label: "Dinner", emoji: "🍽️" },
    { value: "dessert", label: "Dessert", emoji: "🍰" },
    { value: "snack", label: "Snack", emoji: "🍿" },
  ];

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "dinner",
    cuisine: "",
    cooking_time: "",
    prep_time: "",
    difficulty: "",
    servings: "",
    image_url: "",
    ingredients: [{ name: "", amount: "", unit: "" }],
    instructions: [{ step: 1, instruction: "" }],
    tags: [],
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [newTag, setNewTag] = useState("");
  const [isGeneratedRecipe, setIsGeneratedRecipe] = useState(false); // Track if editing AI-generated recipe
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch recipe for editing
  const { data: recipeData, isLoading: fetchLoading } = useQuery({
    queryKey: ["userRecipe", edit],
    queryFn: async () => {
      if (!edit) return null;
      
      // Try user-recipes first (manually created recipes)
      try {
        const userResponse = await fetch(`${apiUrl}/api/user-recipes/${edit}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
          },
          credentials: 'include',
        });
        
        if (userResponse.ok) {
          return await userResponse.json();
        }
      } catch (error) {
        console.log('Not in user-recipes, trying main recipes table');
      }
      
      // Fall back to main recipes table (for AI-generated recipes owned by user)
      const response = await fetch(`${apiUrl}/api/recipes/${edit}?userId=${auth?.user?.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to edit recipes");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch recipe");
      }
      return response.json();
    },
    enabled: isEditing && isAuthenticated && !!auth?.jwt,
  });

  // Populate form with existing recipe data
  useEffect(() => {
    if (recipeData?.success && recipeData.data) {
      const recipe = recipeData.data;
      
      // Detect if this is an AI-generated recipe from main recipes table
      setIsGeneratedRecipe(recipe.creator_type === 'ai');
      
      // Parse ingredients and instructions if they're JSON strings
      let ingredients = recipe.ingredients;
      if (typeof ingredients === 'string') {
        try {
          ingredients = JSON.parse(ingredients);
        } catch {
          ingredients = [{ name: "", amount: "", unit: "" }];
        }
      }
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        ingredients = [{ name: "", amount: "", unit: "" }];
      }
      
      let instructions = recipe.instructions;
      if (typeof instructions === 'string') {
        try {
          instructions = JSON.parse(instructions);
        } catch {
          instructions = [{ step: 1, instruction: "" }];
        }
      }
      if (!Array.isArray(instructions) || instructions.length === 0) {
        instructions = [{ step: 1, instruction: "" }];
      }
      
      setFormData({
        name: recipe.name || "",
        description: recipe.description || "",
        category: recipe.category || "dinner",
        cuisine: recipe.cuisine || "",
        cooking_time: recipe.cooking_time?.toString() || "",
        prep_time: recipe.prep_time?.toString() || "",
        difficulty: recipe.difficulty || "",
        servings: recipe.servings?.toString() || "",
        image_url: recipe.image_url || "",
        ingredients: ingredients,
        instructions: instructions,
        tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      });
    }
  }, [recipeData]);

  // Animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!auth?.jwt) {
        throw new Error("Please sign in to save recipes");
      }

      // Determine endpoint based on recipe type
      let url, method;
      
      if (isEditing && isGeneratedRecipe) {
        // Editing AI-generated recipe - use main recipes endpoint
        url = `${apiUrl}/api/recipes/${edit}`;
        method = "PUT";
      } else {
        // Creating new or editing user-created recipe - use user-recipes endpoint
        url = isEditing 
          ? `${apiUrl}/api/user-recipes/${edit}` 
          : `${apiUrl}/api/user-recipes`;
        method = isEditing ? "PUT" : "POST";
      }

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...(auth?.jwt && { "Authorization": `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to save recipes");
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      // Invalidate caches
      queryClient.invalidateQueries(["userRecipes"]);
      if (isEditing && edit) {
        queryClient.invalidateQueries(["recipe", edit]);
        queryClient.invalidateQueries(["userRecipe", edit]);
      }
      Alert.alert(
        "Success",
        `Recipe ${isEditing ? "updated" : "created"} successfully!`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert("Error", "Recipe name is required");
      return;
    }

    const validIngredients = formData.ingredients.filter(
      (ing) => ing.name.trim() || ing.amount.trim(),
    );
    if (validIngredients.length === 0) {
      Alert.alert("Error", "At least one ingredient is required");
      return;
    }

    const validInstructions = formData.instructions.filter((inst) =>
      inst.instruction.trim(),
    );
    if (validInstructions.length === 0) {
      Alert.alert("Error", "At least one instruction is required");
      return;
    }

    // Clean and prepare data
    const cleanData = {
      ...formData,
      cooking_time: formData.cooking_time ? parseInt(formData.cooking_time) : null,
      prep_time: formData.prep_time ? parseInt(formData.prep_time) : null,
      servings: formData.servings ? parseInt(formData.servings) : null,
      difficulty: formData.difficulty || null,
      description: formData.description || null,
      ingredients: validIngredients,
      instructions: validInstructions.map((inst, index) => ({
        step: index + 1,
        instruction: inst.instruction.trim(),
      })),
    };

    saveMutation.mutate(cleanData);
  };

  const handleImagePick = async (source) => {
    try {
      let result;

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Required", "Camera permission is required");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);

        // Upload image
        const uploadResult = await upload({
          reactNativeAsset: result.assets[0],
        });
        if (uploadResult.url) {
          setFormData({ ...formData, image_url: uploadResult.url });
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { name: "", amount: "", unit: "" },
      ],
    });
  };

  const removeIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addInstruction = () => {
    const newStep = formData.instructions.length + 1;
    setFormData({
      ...formData,
      instructions: [
        ...formData.instructions,
        { step: newStep, instruction: "" },
      ],
    });
  };

  const removeInstruction = (index) => {
    const newInstructions = formData.instructions.filter((_, i) => i !== index);
    // Renumber steps
    const renumbered = newInstructions.map((inst, i) => ({
      ...inst,
      step: i + 1,
    }));
    setFormData({ ...formData, instructions: renumbered });
  };

  const updateInstruction = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index].instruction = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  if (!fontsLoaded || (isEditing && fetchLoading)) return null;

  const isSaving = saveMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          {isEditing ? "Edit Recipe" : "Create Recipe"}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Save size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={[styles.content, { opacity: fadeAnim }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Section */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Recipe Photo
          </Text>

          {formData.image_url || selectedImage ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: selectedImage?.uri || formData.image_url }}
                style={styles.selectedImage}
                contentFit="cover"
                transition={200}
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setSelectedImage(null);
                  setFormData({ ...formData, image_url: "" });
                }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <ChefHat size={32} color="#CCCCCC" />
              <Text
                style={[
                  styles.imagePlaceholderText,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                Add a photo to make your recipe more appealing
              </Text>
            </View>
          )}

          <View style={styles.imageActions}>
            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={() => handleImagePick("camera")}
            >
              <Camera size={20} color="#FF9F1C" />
              <Text
                style={[
                  styles.imageActionText,
                  { fontFamily: "Inter_500Medium" },
                ]}
              >
                Camera
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={() => handleImagePick("gallery")}
            >
              <ImageIcon size={20} color="#FF9F1C" />
              <Text
                style={[
                  styles.imageActionText,
                  { fontFamily: "Inter_500Medium" },
                ]}
              >
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Basic Information
          </Text>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
            >
              Recipe Name *
            </Text>
            <TextInput
              style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
              placeholder="Enter recipe name"
              value={formData.name}
              onChangeText={(value) =>
                setFormData({ ...formData, name: value })
              }
            />
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
            >
              Description
            </Text>
            <TextInput
              style={[styles.textArea, { fontFamily: "Inter_400Regular" }]}
              placeholder="Describe your recipe..."
              value={formData.description}
              onChangeText={(value) =>
                setFormData({ ...formData, description: value })
              }
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
            >
              Cuisine
            </Text>
            <TextInput
              style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
              placeholder="e.g. Italian"
              value={formData.cuisine}
              onChangeText={(value) =>
                setFormData({ ...formData, cuisine: value })
              }
            />
          </View>

          <View style={styles.formGroup}>
            <Text
              style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
            >
              Category
            </Text>
            <View style={styles.categorySelector}>
              {categoryOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.categoryOption,
                    formData.category === option.value && styles.categoryOptionActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, category: option.value });
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Text style={styles.categoryEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryOptionText,
                      { fontFamily: "Inter_500Medium" },
                      formData.category === option.value && styles.categoryOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Recipe Details */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Recipe Details
          </Text>

          <View style={styles.rowInputs}>
            <View style={styles.rowInput}>
              <Text
                style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
              >
                <Clock size={14} color="#666666" /> Prep Time (min)
              </Text>
              <TextInput
                style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
                placeholder="15"
                value={formData.prep_time}
                onChangeText={(value) =>
                  setFormData({ ...formData, prep_time: value })
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowInput}>
              <Text
                style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
              >
                <Clock size={14} color="#666666" /> Cook Time (min)
              </Text>
              <TextInput
                style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
                placeholder="30"
                value={formData.cooking_time}
                onChangeText={(value) =>
                  setFormData({ ...formData, cooking_time: value })
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.rowInput}>
              <Text
                style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
              >
                <Users size={14} color="#666666" /> Servings
              </Text>
              <TextInput
                style={[styles.textInput, { fontFamily: "Inter_400Regular" }]}
                placeholder="4"
                value={formData.servings}
                onChangeText={(value) =>
                  setFormData({ ...formData, servings: value })
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowInput}>
              <Text
                style={[styles.inputLabel, { fontFamily: "Inter_500Medium" }]}
              >
                Difficulty
              </Text>
              <View style={styles.difficultySelector}>
                {["easy", "medium", "hard"].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.difficultyOption,
                      formData.difficulty === level &&
                        styles.difficultyOptionActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, difficulty: level })
                    }
                  >
                    <Text
                      style={[
                        styles.difficultyOptionText,
                        { fontFamily: "Inter_500Medium" },
                        formData.difficulty === level &&
                          styles.difficultyOptionTextActive,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Ingredients *
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
              <Plus size={20} color="#FF9F1C" />
            </TouchableOpacity>
          </View>

          {formData.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <View style={styles.ingredientInputs}>
                <TextInput
                  style={[
                    styles.ingredientInput,
                    { fontFamily: "Inter_400Regular" },
                    { flex: 2 },
                  ]}
                  placeholder="Ingredient name"
                  value={ingredient.name}
                  onChangeText={(value) =>
                    updateIngredient(index, "name", value)
                  }
                />
                <TextInput
                  style={[
                    styles.ingredientInput,
                    { fontFamily: "Inter_400Regular" },
                    { flex: 1 },
                  ]}
                  placeholder="Amount"
                  value={ingredient.amount}
                  onChangeText={(value) =>
                    updateIngredient(index, "amount", value)
                  }
                />
                <TextInput
                  style={[
                    styles.ingredientInput,
                    { fontFamily: "Inter_400Regular" },
                    { flex: 1 },
                  ]}
                  placeholder="Unit"
                  value={ingredient.unit}
                  onChangeText={(value) =>
                    updateIngredient(index, "unit", value)
                  }
                />
              </View>
              {formData.ingredients.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeIngredient(index)}
                >
                  <Minus size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Instructions *
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={addInstruction}>
              <Plus size={20} color="#FF9F1C" />
            </TouchableOpacity>
          </View>

          {formData.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.stepNumber}>
                <Text
                  style={[
                    styles.stepNumberText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.instructionInput,
                  { fontFamily: "Inter_400Regular" },
                ]}
                placeholder="Describe this step..."
                value={instruction.instruction}
                onChangeText={(value) => updateInstruction(index, value)}
                multiline
                textAlignVertical="top"
              />
              {formData.instructions.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeInstruction(index)}
                >
                  <Minus size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}
          >
            Tags
          </Text>

          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.tagInput, { fontFamily: "Inter_400Regular" }]}
              placeholder="Add tag..."
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {formData.tags.length > 0 && (
            <View style={styles.tagsList}>
              {formData.tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tag}
                  onPress={() => removeTag(tag)}
                >
                  <Text
                    style={[styles.tagText, { fontFamily: "Inter_400Regular" }]}
                  >
                    {tag}
                  </Text>
                  <X size={14} color="#666666" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.finalSaveButton,
            isSaving && styles.finalSaveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Save size={20} color="#FFFFFF" />
          <Text
            style={[
              styles.finalSaveButtonText,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Update Recipe"
                : "Create Recipe"}
          </Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 18,
    color: "#000000",
  },
  saveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Sections
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
    fontSize: 18,
    color: "#000000",
    marginBottom: 16,
  },

  // Image Section
  imageContainer: {
    position: "relative",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  imageActions: {
    flexDirection: "row",
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  imageActionText: {
    fontSize: 14,
    color: "#FF9F1C",
  },

  // Form Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    height: 80,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  rowInput: {
    flex: 1,
  },

  // Difficulty Selector
  difficultySelector: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 2,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  difficultyOptionActive: {
    backgroundColor: "#FF9F1C",
  },
  difficultyOptionText: {
    fontSize: 12,
    color: "#666666",
  },
  difficultyOptionTextActive: {
    color: "#FFFFFF",
  },

  // Add/Remove Buttons
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Ingredients
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ingredientInputs: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  ingredientInput: {
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  // Instructions
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 4,
  },
  stepNumberText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  instructionInput: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 60,
  },

  // Tags
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    color: "#333333",
  },

  // Final Save Button
  finalSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9F1C",
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 20,
    gap: 8,
    shadowColor: "#FF9F1C",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  finalSaveButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  finalSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },

  // Category Selector
  formGroup: {
    marginBottom: 20,
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginHorizontal: -4,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: 8,
    marginBottom: 8,
  },
  categoryOptionActive: {
    backgroundColor: "#FFF5E6",
    borderColor: "#FF9F1C",
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#666666",
  },
  categoryOptionTextActive: {
    color: "#FF9F1C",
  },
});     
