import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFonts, Inter_600SemiBold } from "@expo-google-fonts/inter";

export default function ScreenHeader({ title }) {
  const [fontsLoaded] = useFonts({
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.header}>
      <Text style={[styles.title, { fontFamily: "Inter_600SemiBold" }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 24,
    color: "#000000",
    textAlign: "center",
  },
});
