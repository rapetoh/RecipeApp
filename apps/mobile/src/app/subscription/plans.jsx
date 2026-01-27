import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
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
import { X, Mic, Sparkles, Camera, ChefHat, Lock, ArrowRight, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSubscription } from "@/hooks/useSubscription";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SubscriptionPlansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    packages,
    isLoadingPackages,
    purchase,
    purchaseAsync,
    isPurchasing,
    purchaseError,
    restoreAsync,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState("yearly"); // "monthly" or "yearly"
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Find packages for monthly and yearly
  // Note: packages come from RevenueCat and need to be used directly
  const monthlyPackage = packages?.find((pkg) =>
    pkg.product?.identifier?.toLowerCase().includes("monthly") ||
    pkg.identifier?.toLowerCase().includes("monthly")
  );
  const yearlyPackage = packages?.find((pkg) =>
    pkg.product?.identifier?.toLowerCase().includes("yearly") ||
    pkg.identifier?.toLowerCase().includes("yearly")
  );

  const currentPackage = selectedPlan === "monthly" ? monthlyPackage : yearlyPackage;

  const handlePurchase = async () => {
    if (!currentPackage) {
      Alert.alert("Error", "Subscription package not available. Please try again later.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // purchaseAsync expects the package object from RevenueCat
      const result = await purchaseAsync(currentPackage);
      
      if (result.success) {
        // Navigate to confirmation screen (replace to clear Plans from stack)
        router.replace("/subscription/success");
      } else {
        if (!result.userCancelled) {
          Alert.alert(
            "Purchase Failed",
            result.error || "Unable to complete purchase. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Purchase error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const formatPrice = (priceString) => {
    if (!priceString) return "$0.00";
    return priceString;
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9F1C" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      
      {/* Top Background Gradient */}
      <LinearGradient
        colors={["#FFE8D1", "#FFF5E6", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.topGradient}
      />

      {/* Close Button - Absolute positioned */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={() => router.replace("/(tabs)/profile")}
        activeOpacity={0.7}
      >
        <X size={24} color="#000000" />
      </TouchableOpacity>

      <ScrollView 
        style={[styles.scrollView, { zIndex: 1 }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Premium Badge */}
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={["#FFC966", "#FF9F1C", "#FF7A00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumBadge}
          >
            <Text style={[styles.badgeText, { fontFamily: "Inter_600SemiBold" }]}>
              POCKETCHEF PREMIUM
            </Text>
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
          Never run out of recipe ideas
        </Text>

        {/* Description */}
        <Text style={[styles.description, { fontFamily: "Inter_400Regular" }]}>
          Cook with confidence. Get unlimited recipe suggestions, recognize any dish, and turn your ingredients into meals—all without limits.
        </Text>

        {/* Features - All 4 cards together */}
        <View style={styles.featuresContainer}>
          <FeatureCard
            icon={<Mic size={20} color="#FF9F1C" />}
            title="Never stuck on what to cook"
            subtitle="Unlimited premium voice suggestions"
            fontsLoaded={fontsLoaded}
          />
          <FeatureCard
            icon={<Camera size={20} color="#FF9F1C" />}
            title="See a dish? Get the recipe"
            subtitle="Unlimited premium photo recognition"
            fontsLoaded={fontsLoaded}
          />
          <FeatureCard
            icon={<ChefHat size={20} color="#FF9F1C" />}
            title="Use what you have, waste nothing"
            subtitle="Unlimited premium ingredient recipes"
            fontsLoaded={fontsLoaded}
          />
          <FeatureCard
            icon={<Sparkles size={20} color="#FF9F1C" />}
            title="Any dish name, full recipe ready"
            subtitle="Unlimited premium recipe generation"
            fontsLoaded={fontsLoaded}
          />
        </View>

        {/* Plan Toggle */}
        <View style={styles.planToggleContainer}>
          <View style={styles.planToggle}>
            <TouchableOpacity
              style={[
                styles.planOption,
                selectedPlan === "monthly" && styles.planOptionSelected,
              ]}
              onPress={() => {
                setSelectedPlan("monthly");
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.planOptionText,
                  selectedPlan === "monthly" && styles.planOptionTextSelected,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.planOption,
                selectedPlan === "yearly" && styles.planOptionSelected,
              ]}
              onPress={() => {
                setSelectedPlan("yearly");
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.7}
            >
              {selectedPlan === "yearly" && (
                <View style={styles.saveBadge}>
                  <Text style={[styles.saveBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                    SAVE 40%
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.planOptionText,
                  selectedPlan === "yearly" && styles.planOptionTextSelected,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price - Standalone */}
        {isLoadingPackages ? (
          <View style={styles.priceLoadingContainer}>
            <ActivityIndicator size="small" color="#FF9F1C" />
          </View>
        ) : (
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { fontFamily: "Inter_700Bold" }]}>
              {currentPackage
                ? formatPrice(currentPackage.product?.priceString || currentPackage.product?.price?.toString())
                : "Loading..."}
              {selectedPlan === "monthly" ? (
                <Text style={[styles.pricePeriod, { fontFamily: "Inter_400Regular" }]}>
                  {" "}/ month
                </Text>
              ) : (
                <Text style={[styles.pricePeriod, { fontFamily: "Inter_400Regular" }]}>
                  {" "}/ year
                </Text>
              )}
            </Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing || !currentPackage}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={[styles.purchaseButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                Subscribe Now
              </Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Security Footer */}
        <View style={styles.securityFooter}>
          <Lock size={14} color="#999999" />
          <Text style={[styles.securityText, { fontFamily: "Inter_400Regular" }]}>
            Secured with {Platform.OS === "ios" ? "App Store" : "Google Play"}
          </Text>
        </View>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.push("/legal-center");
            }} 
            activeOpacity={0.7}
          >
            <Text style={[styles.footerLink, { fontFamily: "Inter_400Regular" }]}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.push("/legal-center");
            }} 
            activeOpacity={0.7}
          >
            <Text style={[styles.footerLink, { fontFamily: "Inter_400Regular" }]}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                const result = await restoreAsync();
                if (result.success) {
                  Alert.alert("Success", "Purchases restored successfully!");
                  router.replace("/subscription/success");
                } else {
                  // Show the actual error message from RevenueCat
                  const errorMessage = result.error || "No previous purchases found to restore.";
                  Alert.alert("No Purchases", errorMessage);
                }
              } catch (error) {
                Alert.alert("Error", "Failed to restore purchases. Please try again.");
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.footerLink, { fontFamily: "Inter_400Regular" }]}>Restore</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FeatureCard({ icon, title, subtitle, fontsLoaded }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
        <View style={styles.featureSubtitleContainer}>
          <Check size={14} color="#FF9F1C" style={styles.checkIcon} />
          <Text 
            style={[styles.featureSubtitle, { fontFamily: "Inter_400Regular" }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
    pointerEvents: "none",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: "100%",
  },
  badgeContainer: {
    alignItems: "center",
    marginTop: 0,
    marginBottom: 12,
  },
  premiumBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
    fontWeight: "700",
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 3,
    fontWeight: "600",
  },
  featureSubtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkIcon: {
    marginRight: 2,
  },
  featureSubtitle: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
    flex: 1,
  },
  planToggleContainer: {
    marginBottom: 12,
  },
  planToggle: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 4,
    position: "relative",
  },
  planOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  planOptionSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  planOptionText: {
    fontSize: 14,
    color: "#999999",
    fontWeight: "600",
  },
  planOptionTextSelected: {
    color: "#1A1A1A",
    fontWeight: "600",
  },
  saveBadge: {
    position: "absolute",
    top: -8,
    right: 10,
    backgroundColor: "#FF9F1C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  saveBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  priceLoadingContainer: {
    alignItems: "center",
    marginBottom: 8,
    height: 50,
    justifyContent: "center",
  },
  priceContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  price: {
    fontSize: 40,
    color: "#1A1A1A",
    marginBottom: 2,
    fontWeight: "700",
  },
  pricePeriod: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "400",
  },
  purchaseButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  securityText: {
    fontSize: 11,
    color: "#999999",
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 12,
    color: "#999999",
  },
  footerSeparator: {
    fontSize: 12,
    color: "#CCCCCC",
  },
});

