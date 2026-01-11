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
        
        // Debug logging to verify what URL is being used
        console.log('🔍 [DEBUG] useOnboardingStatus API check:', {
          envVar: process.env.EXPO_PUBLIC_API_URL,
          apiUrl: apiUrl,
          isLocalhost: apiUrl.includes('localhost'),
          userId: auth.user.id,
        });
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${apiUrl}/api/preferences?userId=${auth.user.id}`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.log('⚠️ [DEBUG] Preferences response not OK:', response.status);
          // If 404 or other error, user has no preferences
          return null;
        }
        
        const result = await response.json();
        console.log('✅ [DEBUG] Preferences fetched successfully');
        return result.success ? result.data : null;
      } catch (error) {
        console.error("❌ [DEBUG] Error checking preferences:", {
          error: error.message,
          name: error.name,
          isAbort: error.name === 'AbortError',
        });
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


