import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { X, BarChart3, Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/useSubscription";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export default function UsageOverviewModal({ visible, onClose }) {
  const router = useRouter();
  const { usage, isLoadingUsage, hasPremiumAccess } = useSubscription();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
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

  const getFeatureName = (featureKey) => {
    const names = {
      voice_suggestions: "Voice Suggestions",
      food_recognition: "Food Recognition",
      ingredients_to_recipes: "Cook with Ingredients",
      recipe_generation: "Recipe Generation",
    };
    return names[featureKey] || featureKey;
  };

  const getFeatureLimit = (featureKey) => {
    const limits = {
      voice_suggestions: 5,
      food_recognition: 3,
      ingredients_to_recipes: 3,
      recipe_generation: 3,
    };
    return limits[featureKey] || 0;
  };

  const getUsageData = () => {
    if (!usage) return [];
    
    const features = ['voice_suggestions', 'food_recognition', 'ingredients_to_recipes', 'recipe_generation'];
    
    return features.map(featureKey => {
      const featureUsage = usage[featureKey];
      const limit = getFeatureLimit(featureKey);
      
      if (!featureUsage) {
        return {
          key: featureKey,
          name: getFeatureName(featureKey),
          used: 0,
          limit: limit,
          remaining: limit,
          percentage: 0,
        };
      }
      
      const used = featureUsage.count || 0;
      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? (used / limit) * 100 : 0;
      
      return {
        key: featureKey,
        name: getFeatureName(featureKey),
        used: used,
        limit: limit,
        remaining: remaining,
        percentage: percentage,
      };
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  const usageData = getUsageData();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <BarChart3 size={20} color="#FF9F1C" />
              <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
                Your Usage This Month
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <X size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          {isLoadingUsage ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular" }]}>
                Loading usage...
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {usageData.map((feature) => {
                const isLow = feature.remaining <= 1;
                const isMedium = feature.remaining > 1 && feature.remaining <= feature.limit * 0.5;
                
                return (
                  <View key={feature.key} style={styles.featureCard}>
                    <View style={styles.featureHeader}>
                      <Text style={[styles.featureName, { fontFamily: "Inter_600SemiBold" }]}>
                        {feature.name}
                      </Text>
                      <View style={[
                        styles.usageBadge,
                        isLow && styles.usageBadgeLow,
                        isMedium && styles.usageBadgeMedium,
                      ]}>
                        <Text style={[styles.usageBadgeText, { fontFamily: "Inter_500Medium" }]}>
                          {feature.used}/{feature.limit}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(feature.percentage, 100)}%`,
                              backgroundColor: isLow ? "#EF4444" : isMedium ? "#F59E0B" : "#10B981",
                            },
                          ]}
                        />
                      </View>
                    </View>
                    
                    {/* Remaining Text */}
                    <Text style={[styles.remainingText, { fontFamily: "Inter_400Regular" }]}>
                      {feature.remaining > 0 
                        ? `${feature.remaining} ${feature.remaining === 1 ? 'use' : 'uses'} remaining`
                        : 'Limit reached'
                      }
                    </Text>
                  </View>
                );
              })}

              {/* Upgrade CTA */}
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
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={[styles.upgradeButtonText, { fontFamily: "Inter_600SemiBold" }]}>
                    Upgrade to Premium
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={[styles.upgradeSubtext, { fontFamily: "Inter_400Regular" }]}>
                Get unlimited access to all AI features
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    color: "#000000",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#666666",
  },
  content: {
    padding: 20,
  },
  featureCard: {
    marginBottom: 20,
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  featureName: {
    fontSize: 16,
    color: "#000000",
    flex: 1,
  },
  usageBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usageBadgeLow: {
    backgroundColor: "#FEE2E2",
  },
  usageBadgeMedium: {
    backgroundColor: "#FEF3C7",
  },
  usageBadgeText: {
    fontSize: 12,
    color: "#000000",
  },
  progressBarContainer: {
    marginBottom: 6,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 13,
    color: "#666666",
  },
  upgradeButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 8,
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
    flexDirection: "row",
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  upgradeSubtext: {
    fontSize: 13,
    color: "#999999",
    textAlign: "center",
    marginBottom: 8,
  },
});

