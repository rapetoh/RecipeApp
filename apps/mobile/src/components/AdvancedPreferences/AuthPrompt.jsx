import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Lock } from "lucide-react-native";

export function AuthPrompt({ onSignIn }) {
  return (
    <View style={styles.container}>
      <Lock size={48} color="#FF9F1C" />
      <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
        Sign In Required
      </Text>
      <Text style={[styles.text, { fontFamily: "Inter_400Regular" }]}>
        Please sign in to manage your preferences
      </Text>
      <TouchableOpacity style={styles.button} onPress={onSignIn}>
        <Text
          style={[styles.buttonText, { fontFamily: "Inter_600SemiBold" }]}
        >
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    margin: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    color: "#000000",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  buttonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});

