import React from "react";
import { Tabs } from "expo-router";
import { Home, Heart, BookOpen, Calendar, Menu } from "lucide-react-native";
import CustomTabBar from "@/components/CustomTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 0, // Hide default tab bar
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "My Recipes",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="save"
        options={{
          title: "Favorite",
          tabBarIcon: ({ color, size }) => <Heart color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: "Meal Plan",
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar but keep route accessible
        }}
      />
    </Tabs>
  );
}
