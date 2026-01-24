import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/utils/auth/useAuth';
import * as RevenueCat from '@/utils/revenuecat';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/config/api';

/**
 * Hook for managing subscriptions
 */
export function useSubscription() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false); // Track if we're currently initializing

  // Initialize RevenueCat when user logs in
  useEffect(() => {
    let isMounted = true;
    
    if (auth?.user?.id && !isInitialized && !initializationRef.current) {
      initializationRef.current = true;
      
      RevenueCat.initializeRevenueCat(auth.user.id)
        .then(async (success) => {
          // Only proceed if initialization actually succeeded
          if (isMounted && success === true) {
            // Verify RevenueCat is actually ready before setting state
            try {
              const isReady = await RevenueCat.isRevenueCatReady();
              if (isReady && isMounted) {
                // Small delay to ensure everything is settled
                await new Promise(resolve => setTimeout(resolve, 150));
                if (isMounted) {
                  setIsInitialized(true);
                }
              } else if (isMounted) {
                console.warn('RevenueCat initialization completed but verification failed');
                initializationRef.current = false;
              }
            } catch (verifyError) {
              console.error('Error verifying RevenueCat readiness:', verifyError);
              if (isMounted) {
                initializationRef.current = false;
              }
            }
          } else if (isMounted) {
            console.warn('RevenueCat initialization returned false');
            initializationRef.current = false;
          }
        })
        .catch((error) => {
          console.error('Failed to initialize RevenueCat:', error);
          if (isMounted) {
            initializationRef.current = false;
          }
        });
    } else if (!auth?.user?.id && isInitialized) {
      // User logged out
      RevenueCat.logoutRevenueCat();
      setIsInitialized(false);
      initializationRef.current = false;
    }
    
    return () => {
      isMounted = false;
    };
  }, [auth?.user?.id, isInitialized]);

  // Get subscription status from backend
  const { data: subscriptionStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['subscription-status', auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;

      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/api/subscriptions/check?userId=${auth.user.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!auth?.user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Get feature usage
  const { data: usage, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['subscription-usage', auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user?.id) return null;

      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/api/subscriptions/usage?userId=${auth.user.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch usage');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!auth?.user?.id && subscriptionStatus?.isPremium === false,
    refetchInterval: 30000, // Refetch every 30 seconds for free users
  });

  // Get available packages - only fetch after initialization is complete and verified
  const { data: packages, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['subscription-packages', isInitialized, auth?.user?.id],
    queryFn: async () => {
      // Double-check initialization before calling
      if (!isInitialized) {
        throw new Error('RevenueCat not initialized');
      }
      
      // Verify one more time that RevenueCat is ready
      const isReady = await RevenueCat.isRevenueCatReady();
      if (!isReady) {
        setIsInitialized(false);
        throw new Error('RevenueCat not ready');
      }
      
      return await RevenueCat.getSubscriptionPackages();
    },
    enabled: isInitialized && !!auth?.user?.id,
    retry: 1, // Retry once in case of timing issues
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase) => {
      // Pass user ID to ensure correct verification
      return await RevenueCat.purchasePackage(packageToPurchase, auth?.user?.id);
    },
    onSuccess: async () => {
      // Wait a moment for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
      // Invalidate queries to refresh subscription status
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-usage'] });
    },
  });

  // Restore purchases mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      // Pass user ID to ensure correct verification
      return await RevenueCat.restorePurchases(auth?.user?.id);
    },
    onSuccess: async () => {
      // Wait a moment for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-usage'] });
    },
  });

  // Check if user has premium access
  const hasPremiumAccess = subscriptionStatus?.isPremium === true;

  // Check if user can use a feature (for free tier limits)
  const canUseFeature = useCallback(
    (feature) => {
      if (hasPremiumAccess) {
        return { canUse: true, reason: 'premium' };
      }

      if (!usage || !usage[feature]) {
        return { canUse: true, reason: 'no_limit' };
      }

      const featureUsage = usage[feature];
      const canUse = featureUsage.remaining > 0;

      return {
        canUse,
        reason: canUse ? 'within_limit' : 'limit_reached',
        usage: featureUsage,
      };
    },
    [hasPremiumAccess, usage]
  );

  return {
    // Status
    isInitialized,
    subscriptionStatus,
    isLoadingStatus,
    hasPremiumAccess,

    // Usage
    usage,
    isLoadingUsage,
    canUseFeature,

    // Packages
    packages,
    isLoadingPackages,

    // Actions
    purchase: purchaseMutation.mutate,
    purchaseAsync: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    purchaseError: purchaseMutation.error,

    restore: restoreMutation.mutate,
    restoreAsync: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    restoreError: restoreMutation.error,
  };
}

