import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  User,
  Heart,
  Settings,
  Camera,
  Clock,
  Bell,
  ChefHat,
  LogOut,
  Star,
  Calendar,
  ShoppingCart,
  DollarSign,
  Edit,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/utils/api";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, isAuthenticated, signIn, signOut } = useAuth();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleSignInPress = () => {
    signIn();
  };

  const handleSignOutPress = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          signOut();
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
      },
    ]);
  };

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/user/me?userId=${auth.user.id}`, {
        headers: {
          'Authorization': `Bearer ${auth.jwt}`,
        },
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.success ? result.data.stats : { recipeCount: 0, favoriteCount: 0 };
    },
    enabled: !!auth?.user?.id && isAuthenticated && !!auth?.jwt,
  });

  const handleMenuPress = (action, requiresAuth = true) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (requiresAuth && !isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to access this feature", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => signIn() },
      ]);
      return;
    }

    // Handle different actions
    switch (action) {
      case "my-recipes":
        router.push("/my-recipes");
        break;
      case "saved":
        router.push("/(tabs)/save");
        break;
      case "food-recognition":
        router.push("/food-recognition");
        break;
      case "meal-plans":
        router.push("/meal-planning");
        break;
      case "settings":
        router.push("/preferences");
        break;
      case "meal-plan-history":
        router.push("/meal-plan-history");
        break;
      case "grocery-lists":
        router.push("/grocery-lists");
        break;
      case "food-budget":
        router.push("/food-budget");
        break;
      default:
        Alert.alert("Coming Soon", "This feature is coming soon!");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const menuItems = [
    {
      id: "my-recipes",
      title: "My Recipes",
      subtitle: "Create and manage your recipes",
      icon: ChefHat,
      color: "#FF9F1C",
      requiresAuth: true,
    },
    {
      id: "saved",
      title: "Favorite Recipes",
      subtitle: "Your favorite recipes",
      icon: Heart,
      color: "#FF9F1C",
      requiresAuth: true,
    },
    {
      id: "food-recognition",
      title: "Food Recognition",
      subtitle: "Scan food for recipes",
      icon: Camera,
      color: "#4CAF50",
      requiresAuth: false,
    },
    {
      id: "meal-plans",
      title: "Meal Plans",
      subtitle: "Plan your weekly meals",
      icon: Clock,
      color: "#2196F3",
      requiresAuth: true,
    },
    {
      id: "meal-plan-history",
      title: "Meal Plan History",
      subtitle: "View past meal plans",
      icon: Calendar,
      color: "#FF9F1C",
      requiresAuth: true,
    },
    {
      id: "grocery-lists",
      title: "Grocery Lists",
      subtitle: "Manage your shopping lists",
      icon: ShoppingCart,
      color: "#22C55E",
      requiresAuth: true,
    },
    {
      id: "food-budget",
      title: "Food Budget",
      subtitle: "Track your spending",
      icon: DollarSign,
      color: "#F59E0B",
      requiresAuth: true,
    },
    {
      id: "settings",
      title: "Preferences",
      subtitle: "Food & meal settings",
      icon: Settings,
      color: "#607D8B",
      requiresAuth: false,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: "Inter_600SemiBold" }]}>
          Profile
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        {isAuthenticated ? (
          <View style={styles.userSection}>
            <View style={styles.userInfoRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <User size={40} color="#666666" />
                </View>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { fontFamily: "Inter_700Bold" }]}>
                  {auth?.user?.name || "User"}
                </Text>
                <Text
                  style={[styles.userEmail, { fontFamily: "Inter_400Regular" }]}
                >
                  {auth?.user?.email}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push("/edit-profile")}
              >
                <Edit size={20} color="#FF9F1C" />
              </TouchableOpacity>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ChefHat size={16} color="#FF9F1C" />
                <Text
                  style={[styles.statText, { fontFamily: "Inter_500Medium" }]}
                >
                  {userStats?.recipeCount || 0} Recipes
                </Text>
              </View>
              <View style={styles.statItem}>
                <Heart size={16} color="#FF9F1C" />
                <Text
                  style={[styles.statText, { fontFamily: "Inter_500Medium" }]}
                >
                  {userStats?.favoriteCount || 0} Favorites
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.signInSection}>
            <View style={styles.signInIcon}>
              <User size={48} color="#999999" />
            </View>
            <Text style={[styles.signInTitle, { fontFamily: "Inter_700Bold" }]}>
              Welcome to RecipeApp
            </Text>
            <Text
              style={[
                styles.signInSubtitle,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              Sign in to save recipes, get personalized recommendations, and
              track your cooking journey
            </Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignInPress}
            >
              <Text
                style={[
                  styles.signInButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Features
          </Text>

          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.id, item.requiresAuth)}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuIcon,
                      { backgroundColor: `${item.color}20` },
                    ]}
                  >
                    <IconComponent size={24} color={item.color} />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text
                      style={[
                        styles.menuItemTitle,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.menuItemSubtitle,
                        { fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sign Out Button */}
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOutPress}
          >
            <LogOut size={20} color="#FF4444" />
            <Text
              style={[styles.signOutText, { fontFamily: "Inter_600SemiBold" }]}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        )}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text
            style={[styles.appInfoText, { fontFamily: "Inter_400Regular" }]}
          >
            RecipeApp v1.0.0
          </Text>
          <Text
            style={[styles.appInfoText, { fontFamily: "Inter_400Regular" }]}
          >
            Made with ❤️ for food lovers
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  userSection: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666666",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: "#333333",
  },
  signInSection: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  signInIcon: {
    marginBottom: 24,
  },
  signInTitle: {
    fontSize: 24,
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  signInSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  signInButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  menuSection: {
    paddingTop: 24,
  },
  menuTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: "#666666",
  },
  menuArrow: {
    fontSize: 20,
    color: "#CCCCCC",
    fontWeight: "bold",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF4444",
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    color: "#FF4444",
  },
  appInfo: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 16,
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
    color: "#999999",
  },
});
