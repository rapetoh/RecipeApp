import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import {
  useFonts,
  Inter_600SemiBold,
  Inter_400Regular,
} from "@expo-google-fonts/inter";
import { Camera } from "lucide-react-native";

const { width: screenWidth } = Dimensions.get("window");

export default function PromoBanner({ onOrderPress }) {
  const [fontsLoaded] = useFonts({
    Inter_600SemiBold,
    Inter_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.promoBanner}>
      <View style={styles.promoImageContainer}>
        <Image
          source={{
            uri: "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg",
          }}
          style={styles.promoImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.promoOverlay} />
      </View>

      <View style={styles.promoContent}>
        <Text style={[styles.promoTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Identify Any Dish
        </Text>
        <Text
          style={[styles.promoSubtitle, { fontFamily: "Inter_400Regular" }]}
        >
          Take a photo and get instant recipe with ingredients
        </Text>

        <TouchableOpacity style={styles.promoButton} onPress={onOrderPress}>
          <Camera size={16} color="#FFFFFF" />
          <Text
            style={[
              styles.promoButtonText,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Try Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  promoBanner: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
    backgroundColor: "#000000",
    position: "relative",
  },
  promoImageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  promoImage: {
    width: "100%",
    height: "100%",
  },
  promoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  promoContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  promoTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  promoSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 20,
  },
  promoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9F1C",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  promoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 6,
  },
});
