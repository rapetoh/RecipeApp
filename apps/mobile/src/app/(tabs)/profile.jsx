import React, { useState } from "react";
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
  ShoppingCart,
  Edit,
  Sparkles,
  BarChart3,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/utils/api";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import UsageOverviewModal from "@/components/UsageOverviewModal";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, isAuthenticated, signIn, signOut } = useAuth();
  const { hasPremiumAccess, isLoadingStatus } = useSubscription();
  const [usageModalVisible, setUsageModalVisible] = useState(false);

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
      case "ingredients-to-recipes":
        router.push("/ingredients-to-recipes");
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
      case "grocery-lists":
        router.push("/grocery-lists");
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
      id: "ingredients-to-recipes",
      title: "Cook with Ingredients",
      subtitle: "Photo your ingredients, get recipes",
      icon: ChefHat,
      color: "#0EA5E9",
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
      id: "grocery-lists",
      title: "Grocery Lists",
      subtitle: "Manage your shopping lists",
      icon: ShoppingCart,
      color: "#22C55E",
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
        ) : null}

        {/* Usage Overview Card - Only for free users */}
        {isAuthenticated && !hasPremiumAccess && (
          <View style={styles.usageCard}>
            <TouchableOpacity
              style={styles.usageCardContent}
              onPress={() => {
                setUsageModalVisible(true);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.usageCardLeft}>
                <View style={styles.usageIconContainer}>
                  <BarChart3 size={20} color="#FF9F1C" />
                </View>
                <View style={styles.usageTextContainer}>
                  <Text style={[styles.usageCardTitle, { fontFamily: "Inter_600SemiBold" }]}>
                    Your Usage This Month
                  </Text>
                  <Text style={[styles.usageCardSubtitle, { fontFamily: "Inter_400Regular" }]}>
                    Tap to view details
                  </Text>
                </View>
              </View>
              <Text style={styles.usageArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Section */}
        {isAuthenticated && (
          <View style={styles.subscriptionSection}>
            {hasPremiumAccess ? (
              <View style={styles.premiumCard}>
                <View style={styles.premiumHeader}>
                  <View style={styles.premiumBadge}>
                    <Star size={16} color="#FF9F1C" fill="#FF9F1C" />
                    <Text
                      style={[styles.premiumBadgeText, { fontFamily: "Inter_600SemiBold" }]}
                    >
                      Premium
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.premiumTitle, { fontFamily: "Inter_700Bold" }]}
                >
                  You're a Premium Member
                </Text>
                <Text
                  style={[styles.premiumSubtitle, { fontFamily: "Inter_400Regular" }]}
                >
                  Enjoy unlimited access to all AI features
                </Text>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    router.push("/subscription/manage");
                  }}
                >
                  <Text
                    style={[styles.manageButtonText, { fontFamily: "Inter_600SemiBold" }]}
                  >
                    Manage Subscription
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.upgradeCard}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  router.push("/subscription/plans");
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#FFC966", "#FF9F1C", "#FF7A00"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeGradient}
                >
                  <View style={styles.upgradeContent}>
                    <View style={styles.upgradeIcon}>
                      <Sparkles size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.upgradeTextContainer}>
                      <Text
                        style={[styles.upgradeTitle, { fontFamily: "Inter_700Bold" }]}
                      >
                        Upgrade to Premium
                      </Text>
                      <Text
                        style={[styles.upgradeSubtitle, { fontFamily: "Inter_400Regular" }]}
                      >
                        Unlock unlimited AI recipes & features
                      </Text>
                    </View>
                    <Text style={styles.upgradeArrow}>›</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sign In Section */}
        {!isAuthenticated && (
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

      {/* Usage Overview Modal */}
      <UsageOverviewModal
        visible={usageModalVisible}
        onClose={() => setUsageModalVisible(false)}
      />
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
  subscriptionSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  premiumCard: {
    backgroundColor: "#FFF5E6",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FF9F1C",
  },
  premiumHeader: {
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  premiumBadgeText: {
    fontSize: 12,
    color: "#FF9F1C",
    letterSpacing: 0.5,
  },
  premiumTitle: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 6,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
    lineHeight: 20,
  },
  manageButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#FF9F1C",
    alignItems: "center",
  },
  manageButtonText: {
    fontSize: 16,
    color: "#FF9F1C",
  },
  upgradeCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF9F1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeGradient: {
    padding: 20,
  },
  upgradeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  upgradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  upgradeArrow: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  usageCard: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  usageCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  usageCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  usageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  usageTextContainer: {
    flex: 1,
  },
  usageCardTitle: {
    fontSize: 15,
    color: "#000000",
    marginBottom: 2,
  },
  usageCardSubtitle: {
    fontSize: 13,
    color: "#666666",
  },
  usageArrow: {
    fontSize: 24,
    color: "#CCCCCC",
    marginLeft: 8,
  },
});
