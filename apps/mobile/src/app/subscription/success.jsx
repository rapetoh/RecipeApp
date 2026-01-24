import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
import { useRouter } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { CheckCircle } from "lucide-react-native";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/config/api";
import { useAuth } from "@/utils/auth/useAuth";
import * as Haptics from "expo-haptics";

export default function SubscriptionSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const { subscriptionStatus } = useSubscription();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Get subscription details
  const { data: subscriptionDetails } = useQuery({
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

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const getPlanName = () => {
    if (subscriptionDetails?.plan === "yearly") return "Yearly Premium";
    if (subscriptionDetails?.plan === "monthly") return "Monthly Premium";
    return "Premium";
  };

  const getNextBillingDate = () => {
    if (!subscriptionDetails?.expiresAt) return "7 days from now";
    
    const expiresDate = new Date(subscriptionDetails.expiresAt);
    const now = new Date();
    const daysUntil = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 7) {
      return `${daysUntil} day${daysUntil !== 1 ? "s" : ""} from now`;
    }
    
    return expiresDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleContinue = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.replace("/(tabs)/home");
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      <View style={[styles.content, { maxHeight: SCREEN_HEIGHT - insets.top - insets.bottom - 40 }]}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <CheckCircle size={64} color="#FFFFFF" fill="#FF9F1C" />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>You're all set!</Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
          Welcome to PocketChef Premium. Start cooking with unlimited recipes.
        </Text>

        {/* Plan Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontFamily: "Inter_400Regular" }]}>
              Current Plan
            </Text>
            <Text style={[styles.detailValue, { fontFamily: "Inter_600SemiBold" }]}>
              {getPlanName()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontFamily: "Inter_400Regular" }]}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { fontFamily: "Inter_600SemiBold" }]}>
                {subscriptionDetails?.status === 'trial' ? 'ACTIVE • TRIAL' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { fontFamily: "Inter_400Regular" }]}>
              Next Billing
            </Text>
            <Text style={[styles.detailValue, { fontFamily: "Inter_600SemiBold" }]}>
              {getNextBillingDate()}
            </Text>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueButtonText, { fontFamily: "Inter_600SemiBold" }]}>
            Let's Cook
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF9F1C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    color: "#000000",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#999999",
  },
  detailValue: {
    fontSize: 16,
    color: "#000000",
  },
  statusBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 12,
  },
  continueButton: {
    backgroundColor: "#000000",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
});

