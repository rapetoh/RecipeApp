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
import { Image } from "expo-image";
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
  MISSING_FIELDS: "Please fill in all required fields",
  USER_EXISTS: "An account with this email already exists",
  SERVER_ERROR: "An error occurred. Please try again.",
  NETWORK_ERROR: "Network error. Please check your connection.",
};

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuth();
  const { signInWithGoogle, signInWithApple } = useOAuth();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState("");
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
      const formData = new FormData();
      if (name.trim()) formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("password", password);
      formData.append("callbackUrl", "/api/auth/token");

      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

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
      console.error("Signup error:", err);
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

  // Email form view - Modern design with gradient header
  if (showEmailForm) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="light" />
        
        {/* Orange Gradient Header */}
        <LinearGradient
          colors={["#FF9F1C", "#FF8C00"]}
          style={[styles.emailGradientHeader, { paddingTop: insets.top + 20 }]}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.emailBackButton}
            onPress={() => setShowEmailForm(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Chef Icon */}
          <View style={styles.emailIconContainer}>
            <Image
              source={require("../../../assets/images/icon.png")}
              style={styles.emailChefIcon}
              contentFit="contain"
            />
          </View>

          {/* Title */}
          <Text style={[styles.emailGradientTitle, { fontFamily: "Inter_700Bold" }]}>
            Create your account
          </Text>
          <Text style={[styles.emailGradientSubtitle, { fontFamily: "Inter_400Regular" }]}>
            Enter your details below
          </Text>
        </LinearGradient>

        {/* White Content Area */}
        <View style={styles.emailContentContainer}>
          <ScrollView
            contentContainerStyle={styles.emailModernScrollContent}
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

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Full Name
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: "Inter_400Regular" }]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Email <Text style={styles.required}>*</Text>
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
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontFamily: "Inter_500Medium" }]}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: "Inter_400Regular" }]}
                  placeholder="Create a password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.submitButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms Text */}
            <Text style={[styles.termsText, { fontFamily: "Inter_400Regular" }]}>
              By creating an account, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Main signup view
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Orange Gradient Header */}
      <LinearGradient
        colors={["#FF9F1C", "#FF8C00"]}
        style={[styles.gradientHeader, { paddingTop: insets.top + 40 }]}
      >
        {/* Chef Icon */}
        <View style={styles.iconContainer}>
          <Image
            source={require("../../../assets/images/icon.png")}
            style={styles.chefIcon}
            contentFit="contain"
          />
        </View>

        {/* Title */}
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Let's get cooking
        </Text>
        <Text style={[styles.headerSubtitle, { fontFamily: "Inter_400Regular" }]}>
          Your personalized AI kitchen{"\n"}companion awaits.
        </Text>
      </LinearGradient>

      {/* White Content Area */}
      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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

          {/* Apple Sign In Button */}
          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.oauthButton, oauthLoading === "apple" && styles.buttonDisabled]}
              onPress={() => handleOAuth("apple")}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === "apple" ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#000" />
                  <Text style={[styles.oauthButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                    Continue with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[styles.oauthButton, oauthLoading === "google" && styles.buttonDisabled]}
            onPress={() => handleOAuth("google")}
            disabled={oauthLoading !== null}
          >
            {oauthLoading === "google" ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={[styles.oauthButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontFamily: "Inter_400Regular" }]}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Sign Up Button */}
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => setShowEmailForm(true)}
          >
            <Ionicons name="mail" size={20} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={[styles.emailButtonText, { fontFamily: "Inter_600SemiBold" }]}>
              Sign up with Email
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { fontFamily: "Inter_400Regular" }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/account/signin")}>
              <Text style={[styles.footerLink, { fontFamily: "Inter_600SemiBold" }]}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={[styles.termsText, { fontFamily: "Inter_400Regular" }]}>
            By continuing, you agree to PocketChef's{"\n"}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </View>
    </View>
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
    paddingBottom: 48,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  chefIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 20,
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
    fontSize: 28,
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 24,
  },
  // Content Area Styles
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
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
  // OAuth Button Styles
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  oauthButtonText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    fontSize: 14,
    color: "#999",
    paddingHorizontal: 16,
  },
  // Email Button
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9F1C",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: "#FF9F1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emailButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  footerLink: {
    fontSize: 14,
    color: "#FF9F1C",
  },
  // Terms
  termsText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: "#666",
    textDecorationLine: "underline",
  },
  // Email Form Styles
  emailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  emailHeaderTitle: {
    fontSize: 17,
    color: "#333",
  },
  emailScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  emailFormContainer: {
    flex: 1,
  },
  emailFormTitle: {
    fontSize: 26,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emailFormSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
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
  submitButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
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
  // Modern Email Form Styles (with gradient header)
  emailGradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  emailBackButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  emailIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  emailChefIcon: {
    width: 70,
    height: 70,
    borderRadius: 18,
  },
  emailGradientTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  emailGradientSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  emailContentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  emailModernScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
});
