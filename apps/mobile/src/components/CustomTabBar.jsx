import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { Home, Heart, BookOpen, Calendar, Menu } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const tabs = [
  {
    name: "home",
    title: "Home",
    icon: Home,
    route: "/(tabs)/home",
  },
  {
    name: "search",
    title: "My Recipes",
    icon: BookOpen,
    route: "/(tabs)/search",
  },
  {
    name: "save",
    title: "Favorite",
    icon: Heart,
    route: "/(tabs)/save",
  },
  {
    name: "meal-plan",
    title: "Meal Plan",
    icon: Calendar,
    route: "/(tabs)/meal-plan",
  },
  {
    name: "menu",
    title: "Menu",
    icon: Menu,
    route: "/(tabs)/profile",
  },
];

export default function CustomTabBar({ state, descriptors, navigation }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleTabPress = (tab, isFocused) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (tab.name === "menu") {
      router.push("/(tabs)/profile");
      return;
    }

    const route = state.routes.find((r) => r.name === tab.name);
    if (route) {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }
  };

  const activeRoute = state.routes[state.index]?.name;
  const isActive = (tab) => {
    if (tab.name === "menu") {
      return pathname === "/(tabs)/profile" || pathname?.includes("profile");
    }
    return activeRoute === tab.name || pathname === tab.route;
  };

  return (
    <BlurView 
      intensity={Platform.OS === "ios" ? 100 : 80} 
      tint="light" 
      style={[
        styles.blurContainer, 
        { 
          bottom: 8 + insets.bottom, // Add gap from bottom for floating effect
          marginHorizontal: 12, // Add horizontal margins for floating effect
        }
      ]}
    >
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const active = isActive(tab);
          const iconColor = active ? "#000000" : "rgba(0, 0, 0, 0.5)";
          const labelColor = active ? "#000000" : "rgba(0, 0, 0, 0.5)";

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab, active)}
              activeOpacity={0.6}
            >
              <View style={styles.tabContent}>
                <IconComponent size={22} color={iconColor} />
                <Text style={[styles.tabLabel, { color: labelColor }]}>
                  {tab.title}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 20, // Rounded corners like Telegram
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    // Shadow for floating effect
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8, // Android shadow
    // No backgroundColor - let BlurView handle transparency
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    minHeight: Platform.OS === "ios" ? 49 : 56,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});

