import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { X, Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/useSubscription";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export default function UpgradePrompt({ visible, onClose, feature, usage }) {
  const router = useRouter();
  const { hasPremiumAccess } = useSubscription();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleUpgrade = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onClose();
    router.push("/subscription/plans");
  };

  const getFeatureName = () => {
    const names = {
      voice_suggestions: "Voice Suggestions",
      food_recognition: "Food Recognition",
      ingredients_to_recipes: "Cook with Ingredients",
      recipe_generation: "Recipe Generation",
      today_suggestions: "Today's Suggestions",
      meal_plan_ai: "AI Meal Planning",
    };
    return names[feature] || "Premium Feature";
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <X size={24} color="#666666" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Sparkles size={32} color="#FF9F1C" />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
            Upgrade to Premium
          </Text>

          {/* Message */}
          <Text style={[styles.message, { fontFamily: "Inter_400Regular" }]}>
            You've reached your free limit for {getFeatureName()}. Upgrade to Premium for unlimited
            access to all AI features.
          </Text>

          {/* Usage Info */}
          {usage && (
            <View style={styles.usageCard}>
              <Text style={[styles.usageText, { fontFamily: "Inter_400Regular" }]}>
                You've used {usage.count} of {usage.limit} free {getFeatureName()} this month.
              </Text>
            </View>
          )}

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <BenefitItem text="Unlimited voice suggestions" fontsLoaded={fontsLoaded} />
            <BenefitItem text="Unlimited food recognition" fontsLoaded={fontsLoaded} />
            <BenefitItem text="Unlimited recipe generation" fontsLoaded={fontsLoaded} />
          </View>

          {/* Upgrade Button */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#FF9F1C", "#FF8C00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeButtonGradient}
            >
              <Text style={[styles.upgradeButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                Upgrade Now
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.cancelText, { fontFamily: "Inter_400Regular" }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function BenefitItem({ text, fontsLoaded }) {
  if (!fontsLoaded) return null;
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitDot} />
      <Text style={[styles.benefitText, { fontFamily: "Inter_400Regular" }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  usageCard: {
    backgroundColor: "#FFF5E6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: "100%",
  },
  usageText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  benefitsContainer: {
    width: "100%",
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF9F1C",
  },
  benefitText: {
    fontSize: 16,
    color: "#333333",
    flex: 1,
  },
  upgradeButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#FF9F1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  cancelText: {
    fontSize: 16,
    color: "#999999",
  },
});

