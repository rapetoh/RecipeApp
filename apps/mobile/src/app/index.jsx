import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useRoutingContext } from "@/contexts/RoutingContext";

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
  const { setRoutingComplete } = useRoutingContext();

  useEffect(() => {
    // Wait for auth to be ready
    if (!isReady) {
      return;
    }

    // If not authenticated, redirect to sign in
    if (!isAuthenticated) {
      router.replace("/account/signin");
      setRoutingComplete(true);
      return;
    }

    // Wait for onboarding check to complete
    if (onboardingLoading) {
      return;
    }

    // If onboarding is needed, redirect to onboarding
    if (needsOnboarding === true) {
      router.replace("/onboarding-goals");
      setRoutingComplete(true);
      return;
    }

    // If onboarding is complete, redirect to home
    if (needsOnboarding === false) {
      router.replace("/(tabs)/home");
      setRoutingComplete(true);
      return;
    }
  }, [isReady, isAuthenticated, needsOnboarding, onboardingLoading, router, setRoutingComplete]);

  // Return null - splash screen handles loading state
  return null;
}
