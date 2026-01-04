import React, { useState } from "react";
import { Text } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { getIngredientIcon } from "@/utils/ingredientIcons";

export function IngredientIcon({ 
  ingredient, 
  size = 40, 
  style,
  showBackground = false 
}) {
  const iconData = getIngredientIcon(ingredient);
  const [imageError, setImageError] = useState(false);
  
  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(showBackground && { backgroundColor: "#F5F5F5" }),
    ...style,
  };
  
  const emojiStyle = {
    fontSize: size * 0.7,
    width: size,
    textAlign: "center",
    ...style,
  };
  
  if (imageError) {
    return <Text style={emojiStyle}>{iconData.emoji}</Text>;
  }
  
  return (
    <ExpoImage
      source={{ uri: iconData.imageUrl }}
      style={imageStyle}
      contentFit="cover"
      onError={() => setImageError(true)}
      defaultSource={{ uri: iconData.fallbackUrl }}
    />
  );
}

