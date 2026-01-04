import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

/**
 * Root index component that handles initial routing logic:
 * - Not authenticated -> Sign in
 * - Authenticated + needs onboarding -> Onboarding
 * - Authenticated + onboarding complete -> Home
 */
export default function Index() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuth();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboardingStatus();

  useEffect(() => {
    // Wait for auth to be ready
    if (!isReady) {
      return;
    }

    // If not authenticated, redirect to sign in
    if (!isAuthenticated) {
      router.replace("/account/signin");
      return;
    }

    // Wait for onboarding check to complete
    if (onboardingLoading) {
      return;
    }

    // If onboarding is needed, redirect to onboarding
    if (needsOnboarding === true) {
      router.replace("/onboarding-goals");
      return;
    }

    // If onboarding is complete, redirect to home
    if (needsOnboarding === false) {
      router.replace("/(tabs)/home");
      return;
    }
  }, [isReady, isAuthenticated, needsOnboarding, onboardingLoading, router]);

  // Show loading screen while determining route
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
