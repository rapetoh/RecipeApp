import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { Search as SearchIcon, Filter, X } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    cuisine: "",
    difficulty: "",
    maxTime: "",
  });

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Search recipes query
  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["search-recipes", debouncedSearch, filters],
    queryFn: async () => {
      if (!debouncedSearch.trim() && !Object.values(filters).some((f) => f)) {
        return { data: [], pagination: { total: 0 } };
      }

      const params = new URLSearchParams({
        search: debouncedSearch,
        limit: "50",
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
      const response = await fetch(`${apiUrl}/api/recipes?${params}`);
      if (!response.ok) {
        throw new Error("Failed to search recipes");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: true, // Always enabled to show empty state
  });

  const handleRecipePress = (recipe) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  const handleFilterPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowFilters(true);
  };

  const applyFilters = () => {
    setShowFilters(false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      cuisine: "",
      difficulty: "",
      maxTime: "",
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  const recipes = searchResults?.data || [];
  const hasActiveFilters = Object.values(filters).some((f) => f);
  const hasSearchOrFilters = debouncedSearch.trim() || hasActiveFilters;

  const renderRecipeItem = ({ item: recipe }) => (
    <TouchableOpacity
      style={styles.recipeItem}
      onPress={() => handleRecipePress(recipe)}
    >
      <View style={styles.recipeContent}>
        <Text style={[styles.recipeTitle, { fontFamily: "Inter_600SemiBold" }]}>
          {recipe.name}
        </Text>
        <Text
          style={[styles.recipeDescription, { fontFamily: "Inter_400Regular" }]}
          numberOfLines={2}
        >
          {recipe.description}
        </Text>
        <View style={styles.recipeMeta}>
          <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>
            {recipe.cooking_time || 30} mins • {recipe.cuisine || "Global"} •{" "}
            {recipe.difficulty || "Easy"}
          </Text>
          <Text style={[styles.rating, { fontFamily: "Inter_500Medium" }]}>
            ⭐ {recipe.average_rating || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: "Inter_600SemiBold" }]}>
          Search Recipes
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color="#666" />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Search for recipes, ingredients, cuisines..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={handleFilterPress}
        >
          <Filter size={20} color={hasActiveFilters ? "#FFFFFF" : "#666"} />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <View style={styles.content}>
        {!hasSearchOrFilters ? (
          <View style={styles.emptyState}>
            <Text
              style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Search for recipes
            </Text>
            <Text
              style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}
            >
              Try searching for ingredients, dish names, or cuisines
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#FF9F1C" />
            <Text
              style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}
            >
              Searching recipes...
            </Text>
          </View>
        ) : recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text
              style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              No recipes found
            </Text>
            <Text
              style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}
            >
              Try different search terms or adjust your filters
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text
                style={[styles.resultsCount, { fontFamily: "Inter_500Medium" }]}
              >
                {searchResults.pagination.total} recipe
                {searchResults.pagination.total !== 1 ? "s" : ""} found
              </Text>
            </View>
            <FlatList
              data={recipes}
              renderItem={renderRecipeItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            />
          </>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={[styles.filterModal, { paddingTop: insets.top }]}>
          <View style={styles.filterHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color="#000" />
            </TouchableOpacity>
            <Text
              style={[styles.filterTitle, { fontFamily: "Inter_600SemiBold" }]}
            >
              Filters
            </Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text
                style={[styles.clearButton, { fontFamily: "Inter_500Medium" }]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text
                style={[
                  styles.filterSectionTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {[
                    "",
                    "breakfast",
                    "lunch",
                    "dinner",
                    "dessert",
                    "snack",
                    "appetizer",
                  ].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterChip,
                        filters.category === category &&
                          styles.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, category })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { fontFamily: "Inter_500Medium" },
                          filters.category === category &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {category || "All"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Difficulty Filter */}
            <View style={styles.filterSection}>
              <Text
                style={[
                  styles.filterSectionTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Difficulty
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {["", "easy", "medium", "hard"].map((difficulty) => (
                    <TouchableOpacity
                      key={difficulty}
                      style={[
                        styles.filterChip,
                        filters.difficulty === difficulty &&
                          styles.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, difficulty })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { fontFamily: "Inter_500Medium" },
                          filters.difficulty === difficulty &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {difficulty || "All"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Cuisine Filter */}
            <View style={styles.filterSection}>
              <Text
                style={[
                  styles.filterSectionTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Cuisine
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {[
                    "",
                    "italian",
                    "chinese",
                    "indian",
                    "mexican",
                    "thai",
                    "japanese",
                    "mediterranean",
                    "american",
                  ].map((cuisine) => (
                    <TouchableOpacity
                      key={cuisine}
                      style={[
                        styles.filterChip,
                        filters.cuisine === cuisine && styles.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, cuisine })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { fontFamily: "Inter_500Medium" },
                          filters.cuisine === cuisine &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {cuisine || "All"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Max Time Filter */}
            <View style={styles.filterSection}>
              <Text
                style={[
                  styles.filterSectionTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Max Cooking Time
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {["", "15", "30", "45", "60", "90"].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.filterChip,
                        filters.maxTime === time && styles.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, maxTime: time })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { fontFamily: "Inter_500Medium" },
                          filters.maxTime === time &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {time ? `${time} min` : "Any"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>

          <View
            style={[styles.filterFooter, { paddingBottom: insets.bottom + 20 }]}
          >
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text
                style={[
                  styles.applyButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    fontSize: 24,
    color: "#000000",
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    marginLeft: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#FF9F1C",
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 16,
  },
  resultsHeader: {
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: "#666666",
  },
  recipeItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recipeContent: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 18,
    color: "#000000",
    marginBottom: 6,
  },
  recipeDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
    lineHeight: 20,
  },
  recipeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#666666",
  },
  rating: {
    fontSize: 12,
    color: "#666666",
  },
  filterModal: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterTitle: {
    fontSize: 20,
    color: "#000000",
  },
  clearButton: {
    fontSize: 16,
    color: "#FF9F1C",
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#FF9F1C",
    borderColor: "#FF9F1C",
  },
  filterChipText: {
    fontSize: 14,
    color: "#666666",
    textTransform: "capitalize",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterFooter: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  applyButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});
