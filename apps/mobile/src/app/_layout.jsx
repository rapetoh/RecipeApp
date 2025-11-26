import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initiate, isReady } = useAuth();

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
          <Stack.Screen name="index" />
          <Stack.Screen name="account/signin" />
          <Stack.Screen name="account/signup" />
          {/* Explicitly register routes to ensure they're recognized */}
          <Stack.Screen name="my-recipes" />
          <Stack.Screen name="recipe-form" />
          <Stack.Screen name="recipe-detail" />
          <Stack.Screen name="food-recognition" />
          <Stack.Screen name="meal-planning" />
          <Stack.Screen name="preferences" />
          <Stack.Screen name="cooking-mode" />
          <Stack.Screen name="onboarding-cooking" />
          <Stack.Screen name="onboarding-cuisines" />
          <Stack.Screen name="onboarding-diet" />
          <Stack.Screen name="onboarding-goals" />
          <Stack.Screen name="onboarding-notifications" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
