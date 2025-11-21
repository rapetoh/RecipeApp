import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFonts, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Menu, Bell } from "lucide-react-native";

export default function Header({
  onMenuPress,
  onNotificationPress,
  userName = "Sarah",
}) {
  const [fontsLoaded] = useFonts({
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <Menu size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.greetingContainer}>
          <Text style={[styles.greeting, { fontFamily: "Inter_600SemiBold" }]}>
            Good Morning,
          </Text>
          <Text style={[styles.userName, { fontFamily: "Inter_600SemiBold" }]}>
            {userName}! 👋
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.notificationButton}
        onPress={onNotificationPress}
      >
        <Bell size={24} color="#000000" />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    color: "#000000",
  },
  notificationButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4444",
  },
});
