import React, { useState, useCallback } from "react";
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
  Dimensions,
  FlatList,
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
  Plus,
  Search,
  ChefHat,
  Folder,
  Heart,
  Sparkles,
  BookOpen,
} from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth, useRequireAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/config/api";

const { width: screenWidth } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_PADDING = 16;
const collectionCardWidth = (screenWidth - CARD_PADDING * 2 - CARD_MARGIN) / 2;

export default function MyRecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth, isAuthenticated } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  
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
      const apiUrl = getApiUrl();
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
    staleTime: 0,
    refetchOnMount: true,
    enabled: isAuthenticated && !!auth?.user?.id,
  });

  const collections = collectionsData?.data || [];

  // Filter collections by search
  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async ({ name, description }) => {
      const apiUrl = getApiUrl();
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
      queryClient.refetchQueries({ queryKey: ["collections", auth?.user?.id] });
      queryClient.refetchQueries({ queryKey: ["collection-recipes"] });
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
      const apiUrl = getApiUrl();
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
      queryClient.refetchQueries({ queryKey: ["collections", auth?.user?.id] });
      queryClient.refetchQueries({ queryKey: ["collection-recipes"] });
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

  const handleBackPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleCreateRecipe = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/recipe-form");
  };

  const handleCollectionPress = (collectionId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/my-recipes/${collectionId}`);
  };

  const handleCreateCollection = () => {
    setShowCreateCollectionModal(true);
  };

  const handleDeleteCollection = (collection, event) => {
    event?.stopPropagation();
    
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

  const getCollectionIcon = (collection) => {
    if (collection.system_type === 'favorites') return <Heart size={24} color="#10B981" />;
    if (collection.system_type === 'my_creations') return <ChefHat size={24} color="#FF9F1C" />;
    if (collection.system_type === 'generated') return <Sparkles size={24} color="#8B5CF6" />;
    return <Folder size={24} color="#666666" />;
  };

  const getCollectionColor = (collection) => {
    if (collection.system_type === 'favorites') return "#10B981";
    if (collection.system_type === 'my_creations') return "#FF9F1C";
    if (collection.system_type === 'generated') return "#8B5CF6";
    return "#666666";
  };

  const renderCollectionCard = ({ item: collection }) => {
    const iconColor = getCollectionColor(collection);
    
    return (
      <TouchableOpacity
        style={[styles.collectionCard, { width: collectionCardWidth }]}
        onPress={() => handleCollectionPress(collection.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.collectionIconContainer, { backgroundColor: `${iconColor}15` }]}>
          {getCollectionIcon(collection)}
        </View>
        <Text style={[styles.collectionName, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
          {collection.name}
        </Text>
        <Text style={[styles.collectionCount, { fontFamily: "Inter_400Regular" }]}>
          {collection.recipe_count || 0} {collection.recipe_count === 1 ? 'recipe' : 'recipes'}
        </Text>
        {collection.collection_type === 'custom' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => handleDeleteCollection(collection, e)}
          >
            <Text style={[styles.deleteButtonText, { fontFamily: "Inter_500Medium" }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) return null;

  const isEmpty = filteredCollections.length === 0 && !loading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
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
            placeholder="Search collections..."
            placeholderTextColor="#999999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Collections Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>Loading...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <BookOpen size={48} color="#CCCCCC" />
          </View>
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_700Bold" }]}>
            No Collections Yet
          </Text>
          <Text style={[styles.emptySubtitle, { fontFamily: "Inter_400Regular" }]}>
            Create a collection to organize your recipes
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCollections}
          renderItem={renderCollectionCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

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
  gridContent: {
    padding: CARD_PADDING,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: CARD_MARGIN * 2,
  },
  collectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: CARD_MARGIN * 2,
  },
  collectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  collectionName: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
    minHeight: 40,
  },
  collectionCount: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 8,
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  deleteButtonText: {
    fontSize: 12,
    color: "#EF4444",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
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
  },
});
