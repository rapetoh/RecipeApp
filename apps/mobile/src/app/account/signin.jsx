import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
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
import { useAuth } from "@/utils/auth/useAuth";
import { useOAuth } from "@/utils/auth/useOAuth";
import { getApiUrl } from "@/utils/api";
import * as Haptics from "expo-haptics";

const ERROR_MESSAGES = {
  MISSING_FIELDS: 'Please fill in all fields',
  INVALID_CREDENTIALS: 'Invalid email or password',
  SERVER_ERROR: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuth();
  const { signInWithGoogle, signInWithApple } = useOAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'apple' | null
  const [error, setError] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleSubmit = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setError(null);

    // Basic validation
    if (!email.trim() || !password) {
      setError(ERROR_MESSAGES.MISSING_FIELDS);
      return;
    }

    setLoading(true);

    try {
      const apiUrl = getApiUrl();
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('callbackUrl', '/api/auth/token');

      const response = await fetch(`${apiUrl}/api/auth/signin`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = ERROR_MESSAGES[data.error] || data.message || ERROR_MESSAGES.SERVER_ERROR;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Save auth data
      setAuth({
        jwt: data.sessionToken,
        user: data.user,
      });

      // Navigate to root - index.jsx will handle routing based on auth state
      router.replace("/");

    } catch (err) {
      console.error('Signin error:', err);
      setError(ERROR_MESSAGES.NETWORK_ERROR);
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backButton} />
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Sign In
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
              Welcome Back
            </Text>
            <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
              Sign in to your RecipeApp account
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>
                {error}
              </Text>
            </View>
          )}

          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              style={[styles.oauthButton, oauthLoading === 'google' && styles.oauthButtonDisabled]}
              onPress={async () => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setError(null);
                setOauthLoading('google');
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setError('Google sign in failed. Please try again.');
                  setOauthLoading(null);
                }
              }}
              disabled={oauthLoading !== null || loading}
            >
              {oauthLoading === 'google' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.oauthButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                  Continue with Google
                </Text>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.oauthButton, styles.oauthButtonApple, oauthLoading === 'apple' && styles.oauthButtonDisabled]}
                onPress={async () => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setError(null);
                  setOauthLoading('apple');
                  try {
                    await signInWithApple();
                  } catch (err) {
                    setError('Apple sign in failed. Please try again.');
                    setOauthLoading(null);
                  }
                }}
                disabled={oauthLoading !== null || loading}
              >
                {oauthLoading === 'apple' ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.oauthButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                    Continue with Apple
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, { fontFamily: "Inter_400Regular" }]}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Email
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { fontFamily: "Inter_400Regular" }]}
                  placeholder="Enter your email"
                  placeholderTextColor="#999999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Password
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { fontFamily: "Inter_400Regular" }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#999999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.submitButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { fontFamily: "Inter_400Regular" }]}>
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/account/signup")}>
                <Text style={[styles.footerLink, { fontFamily: "Inter_600SemiBold" }]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
  },
  oauthContainer: {
    marginBottom: 24,
  },
  oauthButton: {
    backgroundColor: "#4285F4",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  oauthButtonApple: {
    backgroundColor: "#000000",
  },
  oauthButtonDisabled: {
    opacity: 0.6,
  },
  oauthButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    fontSize: 14,
    color: "#999999",
    paddingHorizontal: 16,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    fontSize: 16,
    color: "#000000",
    padding: 0,
  },
  submitButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#666666",
  },
  footerLink: {
    fontSize: 14,
    color: "#FF9F1C",
  },
});





