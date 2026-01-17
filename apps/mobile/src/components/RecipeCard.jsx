import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { Heart, Clock, ChefHat } from "lucide-react-native";
import IngredientPreview from "./IngredientPreview";

export default function RecipeCard({ recipe, cardWidth, onPress }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handlePress = () => {
    onPress(recipe);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={handlePress}
    >
      <View style={[styles.imageContainer, { height: recipe.height || 180 }]}>
        {recipe.image && recipe.image.trim() !== "" ? (
          <Image
            source={{ uri: recipe.image }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : recipe.ingredientsList && recipe.ingredientsList.length > 0 ? (
          <IngredientPreview 
            ingredients={recipe.ingredientsList} 
            recipeId={recipe.id}
            maxItems={6}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <ChefHat size={32} color="#FF9F1C" />
          </View>
        )}

        <TouchableOpacity style={styles.favoriteButton}>
          <Heart
            size={16}
            color="#FFFFFF"
            fill={recipe.isSaved ? "#FFFFFF" : "none"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { fontFamily: "Inter_600SemiBold" }]}
          numberOfLines={2}
        >
          {recipe.title}
        </Text>

        <Text
          style={[styles.author, { fontFamily: "Inter_400Regular" }]}
          numberOfLines={1}
        >
          By {recipe.author}
        </Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Clock size={12} color="#999999" />
            <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>
              {recipe.time}
            </Text>
          </View>

          <Text
            style={[styles.ingredients, { fontFamily: "Inter_400Regular" }]}
          >
            {recipe.ingredients}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 4,
    lineHeight: 18,
  },
  author: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: "column",
    gap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    color: "#999999",
    marginLeft: 4,
  },
  ingredients: {
    fontSize: 11,
    color: "#999999",
  },
});
