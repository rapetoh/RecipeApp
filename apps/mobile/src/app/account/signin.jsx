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
  KeyboardAvoidingView,
  Dimensions,
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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/utils/auth/useAuth";
import { useOAuth } from "@/utils/auth/useOAuth";
import { getApiUrl } from "@/utils/api";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const ERROR_MESSAGES = {
  MISSING_FIELDS: "Please fill in all fields",
  INVALID_CREDENTIALS: "Invalid email or password",
  SERVER_ERROR: "An error occurred. Please try again.",
  NETWORK_ERROR: "Network error. Please check your connection.",
};

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuth();
  const { signInWithGoogle, signInWithApple } = useOAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
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

    if (!email.trim() || !password) {
      setError(ERROR_MESSAGES.MISSING_FIELDS);
      return;
    }

    setLoading(true);

    try {
      const apiUrl = getApiUrl();
      const signinUrl = `${apiUrl}/api/auth/signin`;
      
      console.log('🔍 [SIGNIN DEBUG] API URL:', apiUrl);
      console.log('🔍 [SIGNIN DEBUG] Full URL:', signinUrl);
      console.log('🔍 [SIGNIN DEBUG] Is Dev Mode:', __DEV__);
      
      const formData = new FormData();
      formData.append("email", email.trim());
      formData.append("password", password);
      formData.append("callbackUrl", "/api/auth/token");

      console.log('🔍 [SIGNIN DEBUG] Starting fetch...');
      const response = await fetch(signinUrl, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      console.log('🔍 [SIGNIN DEBUG] Response status:', response.status);

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          ERROR_MESSAGES[data.error] || data.message || ERROR_MESSAGES.SERVER_ERROR;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      setAuth({
        jwt: data.sessionToken,
        user: data.user,
      });

      router.replace("/");
    } catch (err) {
      console.error("Signin error:", err);
      setError(ERROR_MESSAGES.NETWORK_ERROR);
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setError(null);
    setOauthLoading(provider);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
    } catch (err) {
      setError(`${provider === "google" ? "Google" : "Apple"} sign in failed. Please try again.`);
      setOauthLoading(null);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      {/* Orange Gradient Header */}
      <LinearGradient
        colors={["#FF9F1C", "#FF8C00"]}
        style={[styles.gradientHeader, { paddingTop: insets.top + 32 }]}
      >
        {/* Chef Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="restaurant" size={28} color="#FF9F1C" />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Welcome back
        </Text>
        <Text style={[styles.headerSubtitle, { fontFamily: "Inter_400Regular" }]}>
          Sign in to continue cooking
        </Text>
      </LinearGradient>

      {/* White Content Area */}
      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
              Email
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { fontFamily: "Inter_400Regular" }]}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading && oauthLoading === null}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Password
              </Text>
              <TouchableOpacity>
                <Text style={[styles.forgotPassword, { fontFamily: "Inter_500Medium" }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { fontFamily: "Inter_400Regular" }]}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading && oauthLoading === null}
              />
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || oauthLoading !== null}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.submitButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                Continue to your kitchen
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontFamily: "Inter_400Regular" }]}>
              One-tap sign in
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Buttons */}
          <View style={styles.oauthRow}>
            {/* Apple Sign In Button */}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={[styles.oauthButton, oauthLoading === "apple" && styles.buttonDisabled]}
                onPress={() => handleOAuth("apple")}
                disabled={oauthLoading !== null || loading}
              >
                {oauthLoading === "apple" ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={22} color="#000" />
                    <Text style={[styles.oauthButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                      Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[
                styles.oauthButton,
                Platform.OS !== "ios" && styles.oauthButtonFull,
                oauthLoading === "google" && styles.buttonDisabled,
              ]}
              onPress={() => handleOAuth("google")}
              disabled={oauthLoading !== null || loading}
            >
              {oauthLoading === "google" ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={[styles.oauthButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                    Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { fontFamily: "Inter_400Regular" }]}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/account/signup")}>
              <Text style={[styles.footerLink, { fontFamily: "Inter_600SemiBold" }]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  // Gradient Header Styles
  gradientHeader: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 26,
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  // Content Area Styles
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Error Styles
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    marginLeft: 10,
    flex: 1,
  },
  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 13,
    color: "#FF9F1C",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    padding: 0,
  },
  // Submit Button
  submitButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#FF9F1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    fontSize: 13,
    color: "#999",
    paddingHorizontal: 14,
  },
  // OAuth Buttons
  oauthRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  oauthButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  oauthButtonFull: {
    flex: 1,
  },
  oauthButtonText: {
    fontSize: 15,
    color: "#333333",
    marginLeft: 8,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  footerLink: {
    fontSize: 14,
    color: "#FF9F1C",
  },
});
