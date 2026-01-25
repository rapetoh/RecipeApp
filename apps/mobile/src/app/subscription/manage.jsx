import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ArrowLeft, Crown, CreditCard, FileText, ChevronRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/config/api";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

export default function SubscriptionManageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const { packages, subscriptionStatus, isLoadingPackages } = useSubscription();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Get detailed subscription info
  const { data: subscriptionDetails, isLoading } = useQuery({
    queryKey: ["subscription-details", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;

      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/api/subscriptions/check?userId=${auth.user.id}`
      );

      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    },
    enabled: !!auth?.user?.id,
  });

  // Get app name from config
  const appName = Constants.expoConfig?.name || "PocketChef";

  // Get price from packages
  const getPrice = () => {
    if (!subscriptionDetails?.plan || !packages || packages.length === 0) return null;
    
    // More reliable matching: check both identifier and package type
    const planPackage = packages.find((pkg) => {
      const identifier = pkg.product?.identifier?.toLowerCase() || pkg.identifier?.toLowerCase() || "";
      const packageType = pkg.packageType?.toLowerCase() || "";
      const planType = subscriptionDetails.plan.toLowerCase();
      
      // Match by plan type in identifier or package type
      return (
        identifier.includes(planType) ||
        packageType.includes(planType) ||
        identifier.includes(planType === "yearly" ? "annual" : planType)
      );
    });
    
    if (!planPackage?.product?.priceString) return null;
    
    // Add period suffix to match screenshot format
    const period = subscriptionDetails.plan === "yearly" ? "/ yr" : "/ mo";
    return `${planPackage.product.priceString}${period}`;
  };

  const getPlanName = () => {
    if (!subscriptionDetails?.plan) return `${appName} Premium`;
    const planType = subscriptionDetails.plan === "yearly" ? "Yearly" : "Monthly";
    return `${appName} Premium ${planType}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRenewalDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const openSubscriptionManagement = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      let url;
      let fallbackMessage;

      if (Platform.OS === "ios") {
        // Open Apple's subscription management page
        url = "https://apps.apple.com/account/subscriptions";
        fallbackMessage = "Please manage your subscription in Settings > [Your Name] > Subscriptions";
      } else if (Platform.OS === "android") {
        // Open Google Play subscription management
        url = "https://play.google.com/store/account/subscriptions";
        fallbackMessage = "Please manage your subscription in Google Play Store > Subscriptions";
      } else {
        Alert.alert(
          "Not Available",
          "Subscription management is only available on iOS and Android devices."
        );
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Unable to Open", fallbackMessage);
      }
    } catch (error) {
      console.error("Error opening subscription management:", error);
      const fallbackMessage = Platform.OS === "ios"
        ? "Please go to Settings > [Your Name] > Subscriptions"
        : "Please go to Google Play Store > Subscriptions";
      Alert.alert("Error", `Unable to open subscription management. ${fallbackMessage}`);
    }
  };

  const handleUpdatePayment = () => {
    openSubscriptionManagement();
  };

  const handleBillingHistory = () => {
    openSubscriptionManagement();
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "You can cancel your subscription at any time. Your access will continue until the end of the current billing period.",
      [
        {
          text: "Keep Subscription",
          style: "cancel",
        },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: openSubscriptionManagement,
        },
      ]
    );
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  // Handle case where user doesn't have subscription
  if (!subscriptionDetails || !subscriptionDetails.isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
            Subscription
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
            No active subscription found.
          </Text>
        </View>
      </View>
    );
  }

  const price = getPrice();
  const autoRenewStatus = subscriptionDetails?.cancelAtPeriodEnd ? "Auto-Renew Off" : "Auto-Renew On";
  const platformName = Platform.OS === "ios" ? "Apple App Store" : Platform.OS === "android" ? "Google Play Store" : "App Store";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Subscription
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Status Section */}
        <View style={styles.premiumSection}>
          <LinearGradient
            colors={["#FFC966", "#FF9F1C", "#FF7A00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.crownContainer}
          >
            <Crown size={48} color="#FFFFFF" fill="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.premiumActiveText, { fontFamily: "Inter_700Bold" }]}>
            Premium Active
          </Text>
          <Text style={[styles.renewalText, { fontFamily: "Inter_400Regular" }]}>
            Renews on {formatRenewalDate(subscriptionDetails?.renewalDate || subscriptionDetails?.expiresAt)}
          </Text>
        </View>

        {/* Subscription Details Grid */}
        <View style={styles.detailsGrid}>
          {/* Current Plan */}
          <View style={styles.detailCard}>
            <Text style={[styles.detailLabel, { fontFamily: "Inter_400Regular" }]}>
              CURRENT PLAN
            </Text>
            <Text style={[styles.detailValue, { fontFamily: "Inter_600SemiBold" }]}>
              {getPlanName()}
            </Text>
          </View>

          {/* Price */}
          <View style={styles.detailCard}>
            <Text style={[styles.detailLabel, { fontFamily: "Inter_400Regular" }]}>
              PRICE
            </Text>
            {isLoadingPackages ? (
              <Text style={[styles.detailValue, { fontFamily: "Inter_400Regular", color: "#999999" }]}>
                Loading...
              </Text>
            ) : (
              <Text style={[styles.detailValue, { fontFamily: "Inter_600SemiBold" }]}>
                {price || "N/A"}
              </Text>
            )}
          </View>

          {/* Status */}
          <View style={styles.detailCard}>
            <Text style={[styles.detailLabel, { fontFamily: "Inter_400Regular" }]}>
              STATUS
            </Text>
            <Text
              style={[
                styles.detailValue,
                {
                  fontFamily: "Inter_600SemiBold",
                  color: subscriptionDetails?.cancelAtPeriodEnd ? "#EF4444" : "#22C55E",
                },
              ]}
            >
              {autoRenewStatus}
            </Text>
          </View>

          {/* Member Since */}
          <View style={styles.detailCard}>
            <Text style={[styles.detailLabel, { fontFamily: "Inter_400Regular" }]}>
              MEMBER SINCE
            </Text>
            <Text style={[styles.detailValue, { fontFamily: "Inter_600SemiBold" }]}>
              {formatDate(subscriptionDetails?.memberSince)}
            </Text>
          </View>
        </View>

        {/* Management Options */}
        <View style={styles.managementSection}>
          <TouchableOpacity
            style={styles.managementRow}
            onPress={handleUpdatePayment}
            activeOpacity={0.7}
          >
            <View style={styles.managementIconContainer}>
              <CreditCard size={24} color="#FF9F1C" />
            </View>
            <Text style={[styles.managementText, { fontFamily: "Inter_500Medium" }]}>
              Update Payment Method
            </Text>
            <ChevronRight size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.managementRow}
            onPress={handleBillingHistory}
            activeOpacity={0.7}
          >
            <View style={styles.managementIconContainer}>
              <FileText size={24} color="#FF9F1C" />
            </View>
            <Text style={[styles.managementText, { fontFamily: "Inter_500Medium" }]}>
              Billing History
            </Text>
            <ChevronRight size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Cancel Subscription Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelSubscription}
          activeOpacity={0.8}
        >
          <Text style={[styles.cancelButtonText, { fontFamily: "Inter_600SemiBold" }]}>
            Cancel Subscription
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontFamily: "Inter_400Regular" }]}>
            Managed via {platformName}
          </Text>
          {subscriptionDetails?.subscriptionId && (
            <Text style={[styles.footerText, { fontFamily: "Inter_400Regular" }]}>
              Subscription ID: {(() => {
                const id = subscriptionDetails.subscriptionId;
                // Format ID to match screenshot style (e.g., "8493-2938-1029")
                // If it's a long string, show last portion or format it
                if (id.length > 20) {
                  // Try to extract a meaningful portion (last 15 chars or formatted)
                  const lastPart = id.substring(id.length - 15);
                  // If it contains dashes or is already formatted, use it
                  if (id.includes('-')) {
                    return id.split('-').slice(-3).join('-');
                  }
                  return lastPart;
                }
                return id;
              })()}
            </Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#999999",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: "#000000",
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  premiumSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
  },
  crownContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#FF9F1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumActiveText: {
    fontSize: 24,
    color: "#000000",
    marginBottom: 8,
  },
  renewalText: {
    fontSize: 14,
    color: "#666666",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  detailCard: {
    width: "50%",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: "#999999",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: "#000000",
  },
  managementSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  managementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 12,
  },
  managementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  managementText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#DC2626",
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999999",
    marginBottom: 4,
    textAlign: "center",
  },
});
