import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Modal,
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
  Plus,
  Search,
  ChefHat,
  Clock,
  BookOpen,
  Folder,
  ChevronDown,
  ChevronRight,
  Heart,
  Trash2,
  Edit,
  Sparkles,
} from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth, useRequireAuth } from "@/utils/auth/useAuth";

// Collection Item Component
function CollectionItem({ collection, isExpanded, onToggle, onDelete, onViewRecipe, onEditRecipe, onDeleteRecipe, apiUrl, auth, formatTime, searchText }) {
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const loadRecipes = useCallback(async () => {
    setLoadingRecipes(true);
    try {
      const response = await fetch(`${apiUrl}/api/collections/${collection.id}?userId=${auth?.user?.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        setRecipes(result.data?.recipes || []);
      }
    } catch (error) {
      console.error("Error loading collection recipes:", error);
    } finally {
      setLoadingRecipes(false);
    }
  }, [apiUrl, auth?.user?.id, auth?.jwt, collection.id]);

  useEffect(() => {
    if (isExpanded) {
      loadRecipes();
    }
  }, [isExpanded, loadRecipes]);

  const getCollectionIcon = () => {
    if (collection.system_type === 'favorites') return <Heart size={20} color="#10B981" />;
    if (collection.system_type === 'my_creations') return <ChefHat size={20} color="#FF9F1C" />;
    if (collection.system_type === 'generated') return <Sparkles size={20} color="#8B5CF6" />;
    return <Folder size={20} color="#666666" />;
  };

  // Filter recipes based on searchText
  const filteredRecipes = React.useMemo(() => {
    if (!searchText || !searchText.trim()) {
      return recipes;
    }
    const searchLower = searchText.toLowerCase();
    return recipes.filter(recipe => 
      recipe.name?.toLowerCase().includes(searchLower) ||
      recipe.description?.toLowerCase().includes(searchLower) ||
      recipe.cuisine?.toLowerCase().includes(searchLower) ||
      recipe.category?.toLowerCase().includes(searchLower)
    );
  }, [recipes, searchText]);

  return (
    <View style={collectionStyles.container}>
      <TouchableOpacity
        style={collectionStyles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={collectionStyles.headerLeft}>
          {isExpanded ? (
            <ChevronDown size={20} color="#666666" />
          ) : (
            <ChevronRight size={20} color="#666666" />
          )}
          <View style={collectionStyles.iconContainer}>
            {getCollectionIcon()}
          </View>
          <View style={collectionStyles.headerText}>
            <Text style={[collectionStyles.collectionName, { fontFamily: "Inter_600SemiBold" }]}>
              {collection.name}
            </Text>
            <Text style={[collectionStyles.recipeCount, { fontFamily: "Inter_400Regular" }]}>
              {collection.recipe_count || 0} {collection.recipe_count === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
        </View>
        {collection.collection_type === 'custom' && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={collectionStyles.deleteButton}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={collectionStyles.recipesContainer}>
          {loadingRecipes ? (
            <View style={collectionStyles.loadingContainer}>
              <Text style={[{ fontFamily: "Inter_400Regular", color: "#999999" }]}>Loading...</Text>
            </View>
          ) : filteredRecipes.length === 0 ? (
            <View style={collectionStyles.emptyCollection}>
              <Text style={[{ fontFamily: "Inter_400Regular", color: "#999999", fontSize: 14 }]}>
                {searchText ? "No recipes match your search" : "No recipes in this collection"}
              </Text>
            </View>
          ) : (
            filteredRecipes.map((recipe) => (
              <View key={recipe.id} style={collectionStyles.recipeItemContainer}>
                <TouchableOpacity
                  style={collectionStyles.recipeItem}
                  onPress={() => onViewRecipe(recipe.id)}
                >
                  <View style={collectionStyles.recipeItemLeft}>
                    {recipe.image_url ? (
                      <Image
                        source={{ uri: recipe.image_url }}
                        style={collectionStyles.recipeThumbnail}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[collectionStyles.recipeThumbnail, collectionStyles.recipeThumbnailPlaceholder]}>
                        <ChefHat size={20} color="#FF9F1C" />
                      </View>
                    )}
                    <View style={collectionStyles.recipeItemInfo}>
                      <Text
                        style={[collectionStyles.recipeItemName, { fontFamily: "Inter_600SemiBold" }]}
                        numberOfLines={1}
                      >
                        {recipe.name}
                      </Text>
                      <View style={collectionStyles.recipeItemMeta}>
                        <Clock size={12} color="#999999" />
                        <Text style={[collectionStyles.recipeItemMetaText, { fontFamily: "Inter_400Regular" }]}>
                          {formatTime(recipe.cooking_time)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={collectionStyles.recipeActions}>
                  <TouchableOpacity
                    style={collectionStyles.recipeActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      onEditRecipe(recipe.id);
                    }}
                  >
                    <Edit size={16} color="#FF9F1C" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={collectionStyles.recipeActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      onDeleteRecipe(recipe);
                    }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export default function MyRecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCollections, setExpandedCollections] = useState(new Set());
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
  
  // Automatically redirect to sign-in if not authenticated
  useRequireAuth();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch collections
  const {
    data: collectionsData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["collections", auth?.user?.id],
    queryFn: async () => {
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
    staleTime: 30 * 1000,
    enabled: isAuthenticated && !!auth?.user?.id,
  });

  const collections = collectionsData?.data || [];
  
  // Auto-expand system collections by default
  useEffect(() => {
    if (collections.length > 0) {
      const systemCollectionIds = collections
        .filter(c => c.collection_type === 'system')
        .map(c => c.id.toString());
      setExpandedCollections(new Set(systemCollectionIds));
    }
  }, [collections.length]);

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async ({ name, description }) => {
      const response = await fetch(`${apiUrl}/api/collections?userId=${auth?.user?.id}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create collection");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["collections"]);
      setShowCreateCollectionModal(false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId) => {
      const response = await fetch(`${apiUrl}/api/collections/${collectionId}?userId=${auth?.user?.id}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete collection");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["collections"]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId) => {
      // Try user-recipes endpoint first (for user-created recipes)
      let response = await fetch(`${apiUrl}/api/user-recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      // If 404, try main recipes endpoint (for AI-generated recipes owned by user)
      if (response.status === 404) {
        response = await fetch(`${apiUrl}/api/recipes/${recipeId}`, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
            ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
          },
          credentials: 'include',
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", auth?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ["collection-recipes"] });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreateRecipe = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/recipe-form");
  };

  const handleViewRecipe = (recipeId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-detail?id=${recipeId}`);
  };

  const handleEditRecipe = (recipeId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-form?edit=${recipeId}`);
  };

  const toggleCollection = (collectionId) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId.toString())) {
      newExpanded.delete(collectionId.toString());
    } else {
      newExpanded.add(collectionId.toString());
    }
    setExpandedCollections(newExpanded);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCreateCollection = () => {
    setShowCreateCollectionModal(true);
  };

  const handleDeleteCollection = (collection) => {
    if (collection.collection_type === 'system') {
      Alert.alert("Cannot Delete", "System collections cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete Collection",
      `Are you sure you want to delete "${collection.name}"? This will not delete the recipes, only the collection.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCollectionMutation.mutate(collection.id),
        },
      ],
    );
  };

  const handleDeleteRecipe = (recipe) => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteRecipeMutation.mutate(recipe.id),
        },
      ],
    );
  };

  const formatTime = (minutes) => {
    if (!minutes) return "Quick";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (!fontsLoaded) return null;

  const isEmpty = collections.length === 0 && !loading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={[styles.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>
          My Recipes
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { marginRight: 8 }]}
            onPress={handleCreateCollection}
          >
            <Folder size={20} color="#FF9F1C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateRecipe}
          >
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#999999" />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Search your recipes..."
            placeholderTextColor="#999999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Empty State */}
        {isEmpty && !loading && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <BookOpen size={48} color="#CCCCCC" />
            </View>
            <Text style={[styles.emptyTitle, { fontFamily: "Inter_700Bold" }]}>
              No Recipes Yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { fontFamily: "Inter_400Regular" }]}
            >
              Your recipes will be organized into collections here
            </Text>
          </View>
        )}

        {/* Collections List */}
        {collections.map((collection) => (
          <CollectionItem
            key={collection.id}
            collection={collection}
            isExpanded={expandedCollections.has(collection.id.toString())}
            onToggle={() => toggleCollection(collection.id)}
            onDelete={() => handleDeleteCollection(collection)}
            onViewRecipe={handleViewRecipe}
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            apiUrl={apiUrl}
            auth={auth}
            formatTime={formatTime}
            searchText={searchText}
          />
        ))}
      </ScrollView>

      {/* Create Collection Modal */}
      <CreateCollectionModal
        visible={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
        onCreate={(name, description) => {
          createCollectionMutation.mutate({ name, description });
        }}
        isLoading={createCollectionMutation.isPending}
      />
    </View>
  );
}

// Create Collection Modal Component
function CreateCollectionModal({ visible, onClose, onCreate, isLoading }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim() || null);
      setName("");
      setDescription("");
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { fontFamily: "Inter_700Bold" }]}>
              New Collection
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={[modalStyles.closeButton, { fontFamily: "Inter_600SemiBold" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          <View style={modalStyles.content}>
            <View style={modalStyles.inputGroup}>
              <Text style={[modalStyles.label, { fontFamily: "Inter_600SemiBold" }]}>
                Collection Name *
              </Text>
              <TextInput
                style={[modalStyles.input, { fontFamily: "Inter_400Regular" }]}
                placeholder="e.g., Quick Weeknight Meals"
                placeholderTextColor="#999999"
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={100}
              />
            </View>

            <View style={modalStyles.inputGroup}>
              <Text style={[modalStyles.label, { fontFamily: "Inter_600SemiBold" }]}>
                Description (optional)
              </Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textArea, { fontFamily: "Inter_400Regular" }]}
                placeholder="Add a description for this collection"
                placeholderTextColor="#999999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            <TouchableOpacity
              style={[
                modalStyles.createButton,
                (!name.trim() || isLoading) && modalStyles.createButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || isLoading}
            >
              <Text
                style={[
                  modalStyles.createButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {isLoading ? "Creating..." : "Create Collection"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    fontSize: 20,
    color: "#000000",
  },
  closeButton: {
    fontSize: 16,
    color: "#666666",
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "#F8F8F8",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
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
  headerLeft: {
    width: 38,
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FF9F1C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF9F1C",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 24,
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
    marginBottom: 32,
  },
});

const collectionStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F8F8F8",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 2,
  },
  recipeCount: {
    fontSize: 12,
    color: "#666666",
  },
  deleteButton: {
    padding: 8,
  },
  recipesContainer: {
    padding: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyCollection: {
    padding: 20,
    alignItems: "center",
  },
  recipeItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recipeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
  },
  recipeItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recipeThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  recipeThumbnailPlaceholder: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  recipeItemInfo: {
    flex: 1,
  },
  recipeItemName: {
    fontSize: 15,
    color: "#000000",
    marginBottom: 4,
  },
  recipeItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipeItemMetaText: {
    fontSize: 12,
    color: "#999999",
  },
  recipeActions: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 8,
  },
  recipeActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
});
