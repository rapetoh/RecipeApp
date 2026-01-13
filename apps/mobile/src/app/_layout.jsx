import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Inter_700Bold, Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import CustomSplashScreen from "@/components/SplashScreen";
import { RoutingProvider, useRoutingContext } from "@/contexts/RoutingContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const MIN_SPLASH_DURATION = 2500; // 2.5 seconds minimum
const FADE_OUT_DURATION = 400; // 400ms fade-out animation

function RootLayoutContent() {
  const { initiate, isReady } = useAuth();
  const [fontsLoaded] = useFonts({
    Inter_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  const { isRoutingComplete } = useRoutingContext();
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);
  const splashStartTime = useRef(Date.now());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    // Wait for auth, fonts, AND routing to be ready before hiding splash
    if (isReady && fontsLoaded && isRoutingComplete) {
      const elapsed = Date.now() - splashStartTime.current;
      const remainingTime = Math.max(0, MIN_SPLASH_DURATION - elapsed);

      // Hide native splash first
      SplashScreen.hideAsync().then(() => {
        // Wait for minimum duration, then fade out
        setTimeout(() => {
          // Start fade-out animation
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: FADE_OUT_DURATION,
            useNativeDriver: true,
          }).start(() => {
            // Remove splash from render after animation completes
            setSplashMounted(false);
            setShowCustomSplash(false);
          });
        }, remainingTime);
      });
    }
  }, [isReady, fontsLoaded, isRoutingComplete, fadeAnim]);

  // ALWAYS render the Stack (so index.jsx can mount and run)
  // Overlay splash screen until ready
  return (
    <View style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
            <Stack.Screen name="index" />
            <Stack.Screen name="account/signin" />
            <Stack.Screen name="account/signup" />
            {/* Explicitly register routes to ensure they're recognized */}
            <Stack.Screen name="my-recipes" />
            <Stack.Screen name="my-recipes/[id]" />
            <Stack.Screen name="recipe-form" />
            <Stack.Screen name="recipe-detail" />
            <Stack.Screen name="food-recognition" />
            <Stack.Screen name="ingredients-to-recipes" />
            <Stack.Screen name="meal-planning" />
            <Stack.Screen name="preferences" />
            <Stack.Screen name="cooking-mode" />
            <Stack.Screen name="onboarding-cooking" />
            <Stack.Screen name="onboarding-cuisines" />
            <Stack.Screen name="onboarding-diet" />
            <Stack.Screen name="onboarding-goals" />
            <Stack.Screen name="onboarding-notifications" />
            <Stack.Screen name="meal-plan-history" />
            <Stack.Screen name="food-budget" />
            <Stack.Screen name="grocery-lists" />
            <Stack.Screen name="grocery-history" />
            <Stack.Screen name="edit-profile" />
          </Stack>
        </GestureHandlerRootView>
      </QueryClientProvider>

      {/* Overlay splash screen until ready - with fade animation */}
      {splashMounted && (
        <Animated.View style={[styles.splashOverlay, { opacity: fadeAnim }]}>
          <CustomSplashScreen fontsLoaded={fontsLoaded} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999, // Android
  },
});

export default function RootLayout() {
  return (
    <RoutingProvider>
      <RootLayoutContent />
    </RoutingProvider>
  );
}
