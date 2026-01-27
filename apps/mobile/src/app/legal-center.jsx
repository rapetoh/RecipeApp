import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ArrowLeft, Shield, FileText } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { getApiUrl } from "@/utils/api";

export default function LegalCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("privacy"); // "privacy" or "terms"

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      const apiUrl = getApiUrl();
      const url = `${apiUrl}/privacy`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open privacy policy link");
      }
    } catch (error) {
      console.error("Error opening privacy policy:", error);
    }
  };

  const handleOpenTermsOfUse = async () => {
    try {
      const apiUrl = getApiUrl();
      const url = `${apiUrl}/terms`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open terms of use link");
      }
    } catch (error) {
      console.error("Error opening terms of use:", error);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
            Legal Center
          </Text>
          <Text style={[styles.headerSubtitle, { fontFamily: "Inter_400Regular" }]}>
            Review our policies and terms
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "privacy" && styles.tabActive,
          ]}
          onPress={() => {
            setActiveTab("privacy");
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { fontFamily: "Inter_600SemiBold" },
              activeTab === "privacy" && styles.tabTextActive,
            ]}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "terms" && styles.tabActive,
          ]}
          onPress={() => {
            setActiveTab("terms");
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { fontFamily: "Inter_600SemiBold" },
              activeTab === "terms" && styles.tabTextActive,
            ]}
          >
            Terms of Use
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {activeTab === "privacy" ? (
          <View style={styles.contentSection}>
            {/* Privacy Matters Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.iconContainer}>
                  <Shield size={20} color="#FF9F1C" />
                </View>
                <Text style={[styles.infoCardTitle, { fontFamily: "Inter_600SemiBold" }]}>
                  Privacy Matters
                </Text>
              </View>
              <Text style={[styles.infoCardText, { fontFamily: "Inter_400Regular" }]}>
                We value your privacy. This summary explains how PocketChef processes your data to provide personalized meal planning and recipe suggestions.
              </Text>
              <Text style={[styles.lastUpdated, { fontFamily: "Inter_400Regular" }]}>
                Last updated: December 28, 2024
              </Text>
            </View>

            {/* Information We Collect */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FileText size={18} color="#1A1A1A" />
                <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
                  1. Information We Collect
                </Text>
              </View>
              <Text style={[styles.sectionText, { fontFamily: "Inter_400Regular" }]}>
                We collect information to provide better recipe recommendations and grocery services.
              </Text>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Account Data: Name, email, preferences
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Usage Data: Recipes viewed, features used
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Voice Data: Processed for recipe suggestions
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Photos/Videos: Food images for recognition
                  </Text>
                </View>
              </View>
            </View>

            {/* Full Privacy Policy Link */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleOpenPrivacyPolicy}
              activeOpacity={0.7}
            >
              <Text style={[styles.linkButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                View Full Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contentSection}>
            {/* Terms Summary Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <View style={styles.iconContainer}>
                  <FileText size={20} color="#FF9F1C" />
                </View>
                <Text style={[styles.infoCardTitle, { fontFamily: "Inter_600SemiBold" }]}>
                  Terms of Use
                </Text>
              </View>
              <Text style={[styles.infoCardText, { fontFamily: "Inter_400Regular" }]}>
                By using PocketChef, you agree to our Terms of Use. This includes subscription terms, user responsibilities, and service limitations.
              </Text>
              <Text style={[styles.lastUpdated, { fontFamily: "Inter_400Regular" }]}>
                Last updated: December 28, 2024
              </Text>
            </View>

            {/* Subscription Terms */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FileText size={18} color="#1A1A1A" />
                <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
                  Subscription Terms
                </Text>
              </View>
              <Text style={[styles.sectionText, { fontFamily: "Inter_400Regular" }]}>
                PocketChef Premium subscriptions automatically renew unless cancelled.
              </Text>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Monthly: Auto-renews every month
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Yearly: Auto-renews every year
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Cancel anytime in App Store settings
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.bulletText, { fontFamily: "Inter_400Regular" }]}>
                    Access continues until period ends
                  </Text>
                </View>
              </View>
            </View>

            {/* Full Terms Link */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleOpenTermsOfUse}
              activeOpacity={0.7}
            >
              <Text style={[styles.linkButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                View Full Terms of Use
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666666",
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  tabText: {
    fontSize: 14,
    color: "#666666",
  },
  tabTextActive: {
    color: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  contentSection: {
    gap: 20,
  },
  infoCard: {
    backgroundColor: "#FFF5E6",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9F1C",
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCardTitle: {
    fontSize: 18,
    color: "#1A1A1A",
  },
  infoCardText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#666666",
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#1A1A1A",
  },
  sectionText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
    marginBottom: 16,
  },
  bulletList: {
    gap: 12,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF9F1C",
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
  },
  linkButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 8,
  },
  linkButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});
