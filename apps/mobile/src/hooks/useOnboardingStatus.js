import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";

/**
 * Hook to check if user needs onboarding.
 * Returns:
 * - needsOnboarding: boolean | null (null = still loading)
 * - isLoading: boolean
 * - preferences: object | null
 */
export function useOnboardingStatus() {
  const { auth, isAuthenticated } = useAuth();

  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ["preferences", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;
      
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
        const response = await fetch(`${apiUrl}/api/preferences?userId=${auth.user.id}`);
        
        if (!response.ok) {
          // If 404 or other error, user has no preferences
          return null;
        }
        
        const result = await response.json();
        return result.success ? result.data : null;
      } catch (error) {
        console.error("Error checking preferences:", error);
        // On error, assume no preferences (will trigger onboarding)
        return null;
      }
    },
    enabled: !!auth?.user?.id && isAuthenticated,
    staleTime: 0, // Always fetch fresh data for onboarding check
    retry: 1, // Only retry once
  });

  // Determine if onboarding is needed
  const needsOnboarding = 
    isAuthenticated && 
    auth?.user?.id && 
    !isLoading && 
    (!preferencesData || !preferencesData.onboardingCompleted);

  return {
    needsOnboarding: isLoading ? null : needsOnboarding,
    isLoading,
    preferences: preferencesData,
  };
}

