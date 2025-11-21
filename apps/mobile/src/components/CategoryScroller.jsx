import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useFonts, Inter_500Medium } from "@expo-google-fonts/inter";

export default function CategoryScroller({
  categories,
  activeCategory,
  onCategoryPress,
}) {
  const [fontsLoaded] = useFonts({
    Inter_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.categoryContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              activeCategory === category.id && styles.categoryButtonActive,
            ]}
            onPress={() => onCategoryPress(category.id)}
          >
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text
              style={[
                styles.categoryText,
                { fontFamily: "Inter_500Medium" },
                activeCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryContainer: {
    marginTop: 20,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingRight: 32,
  },
  categoryButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    minWidth: 80,
  },
  categoryButtonActive: {
    backgroundColor: "#000000",
  },
  categoryEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
});
