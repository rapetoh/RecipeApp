import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Flame, Beef, Wheat, Droplets } from "lucide-react-native";

const { width: screenWidth } = Dimensions.get("window");

// Circular Progress Ring Component
const CircularProgress = ({ 
  value, 
  maxValue, 
  size = 70, 
  strokeWidth = 5, 
  color = "#FF9F1C",
  backgroundColor = "#E8E8E8",
  children 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </View>
  );
};

// Nutrient Pill Component
const NutrientPill = ({ label, value, unit, color = "#666" }) => (
  <View style={[styles.nutrientPill, { borderColor: color + "40" }]}>
    <Text style={[styles.nutrientPillLabel, { color }]}>{label}</Text>
    <Text style={styles.nutrientPillValue}>{value}{unit}</Text>
  </View>
);

// Helper to get smart insight label
const getInsightLabel = (type, value, dailyValue) => {
  const percent = Math.round((value / dailyValue) * 100);
  
  if (type === "calories") {
    if (percent <= 15) return "Light meal";
    if (percent <= 25) return "Moderate";
    if (percent <= 40) return "Filling meal";
    return "High calorie";
  }
  if (type === "protein") {
    if (percent >= 40) return "High protein";
    if (percent >= 20) return "Good protein";
    return "Low protein";
  }
  if (type === "carbs") {
    if (percent <= 10) return "Low carb";
    if (percent <= 20) return "Moderate carb";
    return "Carb-rich";
  }
  if (type === "fat") {
    if (percent <= 15) return "Low fat";
    if (percent <= 30) return "Moderate fat";
    return "High fat";
  }
  return "";
};

// Main Component
export const NutritionSnapshot = ({ nutrition, servings = 1, fontFamily = "Inter_400Regular", fontFamilyBold = "Inter_600SemiBold" }) => {
  const [viewMode, setViewMode] = useState("serving"); // "serving" or "full"

  if (!nutrition || !nutrition.calories) {
    return null;
  }

  // Calculate values based on view mode
  const multiplier = viewMode === "full" ? servings : 1;
  
  const calories = Math.round((nutrition.calories || 0) * multiplier);
  const protein = Math.round((nutrition.protein || 0) * multiplier);
  const carbs = Math.round((nutrition.carbs || 0) * multiplier);
  const fat = Math.round((nutrition.fat || 0) * multiplier);
  const fiber = Math.round((nutrition.fiber || 0) * multiplier);
  const sugar = Math.round((nutrition.sugar || 0) * multiplier);
  const sodium = Math.round((nutrition.sodium || 0) * multiplier);
  const saturatedFat = Math.round((nutrition.saturated_fat || 0) * multiplier);
  const cholesterol = Math.round((nutrition.cholesterol || 0) * multiplier);
  
  // Vitamins (as % daily value)
  const vitaminA = nutrition.vitamin_a || 0;
  const vitaminC = nutrition.vitamin_c || 0;
  const calcium = nutrition.calcium || 0;
  const iron = nutrition.iron || 0;
  const potassium = nutrition.potassium || 0;

  // Daily value references for progress rings
  const dailyCalories = 2000;
  const dailyProtein = 50;
  const dailyCarbs = 300;
  const dailyFat = 65;

  // Calculate percentages
  const caloriesPercent = Math.round((calories / dailyCalories) * 100);
  const proteinPercent = Math.round((protein / dailyProtein) * 100);
  const carbsPercent = Math.round((carbs / dailyCarbs) * 100);
  const fatPercent = Math.round((fat / dailyFat) * 100);

  // Get insight labels
  const caloriesInsight = getInsightLabel("calories", calories, dailyCalories);
  const proteinInsight = getInsightLabel("protein", protein, dailyProtein);
  const carbsInsight = getInsightLabel("carbs", carbs, dailyCarbs);
  const fatInsight = getInsightLabel("fat", fat, dailyFat);

  return (
    <View style={styles.container}>
      {/* Header - Vertical Layout */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: fontFamilyBold }]}>
          Nutrition Snapshot
        </Text>
        <Text style={[styles.subtitle, { fontFamily }]}>
          {viewMode === "serving" ? "Per serving" : `Full recipe (${servings} servings)`}
        </Text>
        
        {/* Toggle - on its own row */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "serving" && styles.toggleButtonActive
              ]}
              onPress={() => setViewMode("serving")}
            >
              <Text style={[
                styles.toggleText,
                { fontFamily },
                viewMode === "serving" && styles.toggleTextActive
              ]}>
                Per serving
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "full" && styles.toggleButtonActive
              ]}
              onPress={() => setViewMode("full")}
            >
              <Text style={[
                styles.toggleText,
                { fontFamily },
                viewMode === "full" && styles.toggleTextActive
              ]}>
                Full recipe
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Macros with Circular Progress */}
      <View style={styles.macrosRow}>
        {/* Calories */}
        <View style={styles.macroItem}>
          <CircularProgress 
            value={calories} 
            maxValue={dailyCalories} 
            color="#FF6B35"
            size={76}
          >
            <Flame size={18} color="#FF6B35" />
            <Text style={[styles.macroValue, { fontFamily: fontFamilyBold }]}>{calories}</Text>
          </CircularProgress>
          <Text style={[styles.macroLabel, { fontFamily: fontFamilyBold }]}>Calories</Text>
          <Text style={[styles.macroPercent, { fontFamily }]}>~{caloriesPercent}% daily</Text>
          <Text style={[styles.macroInsight, { fontFamily, color: "#FF6B35" }]}>{caloriesInsight}</Text>
        </View>

        {/* Protein */}
        <View style={styles.macroItem}>
          <CircularProgress 
            value={protein} 
            maxValue={dailyProtein} 
            color="#4CAF50"
            size={76}
          >
            <Beef size={16} color="#4CAF50" />
            <Text style={[styles.macroValue, { fontFamily: fontFamilyBold }]}>{protein}g</Text>
          </CircularProgress>
          <Text style={[styles.macroLabel, { fontFamily: fontFamilyBold }]}>Protein</Text>
          <Text style={[styles.macroPercent, { fontFamily }]}>{proteinPercent}% daily</Text>
          <Text style={[styles.macroInsight, { fontFamily, color: "#4CAF50" }]}>{proteinInsight}</Text>
        </View>

        {/* Carbs */}
        <View style={styles.macroItem}>
          <CircularProgress 
            value={carbs} 
            maxValue={dailyCarbs} 
            color="#FF9800"
            size={76}
          >
            <Wheat size={16} color="#FF9800" />
            <Text style={[styles.macroValue, { fontFamily: fontFamilyBold }]}>{carbs}g</Text>
          </CircularProgress>
          <Text style={[styles.macroLabel, { fontFamily: fontFamilyBold }]}>Carbs</Text>
          <Text style={[styles.macroPercent, { fontFamily }]}>{carbsPercent}% daily</Text>
          <Text style={[styles.macroInsight, { fontFamily, color: "#FF9800" }]}>{carbsInsight}</Text>
        </View>

        {/* Fat */}
        <View style={styles.macroItem}>
          <CircularProgress 
            value={fat} 
            maxValue={dailyFat} 
            color="#2196F3"
            size={76}
          >
            <Droplets size={16} color="#2196F3" />
            <Text style={[styles.macroValue, { fontFamily: fontFamilyBold }]}>{fat}g</Text>
          </CircularProgress>
          <Text style={[styles.macroLabel, { fontFamily: fontFamilyBold }]}>Fat</Text>
          <Text style={[styles.macroPercent, { fontFamily }]}>{fatPercent}% daily</Text>
          <Text style={[styles.macroInsight, { fontFamily, color: "#2196F3" }]}>{fatInsight}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Micros Section */}
      <View style={styles.microsSection}>
        <Text style={[styles.sectionLabel, { fontFamily: fontFamilyBold }]}>
          More Details
        </Text>
        <View style={styles.nutrientPillsRow}>
          {fiber > 0 && <NutrientPill label="Fiber" value={fiber} unit="g" color="#8BC34A" />}
          {sugar > 0 && <NutrientPill label="Sugar" value={sugar} unit="g" color="#E91E63" />}
          {sodium > 0 && <NutrientPill label="Sodium" value={sodium} unit="mg" color="#9C27B0" />}
          {cholesterol > 0 && <NutrientPill label="Cholesterol" value={cholesterol} unit="mg" color="#795548" />}
          {saturatedFat > 0 && <NutrientPill label="Sat. Fat" value={saturatedFat} unit="g" color="#607D8B" />}
        </View>
      </View>

      {/* Vitamins Section */}
      {(vitaminA > 0 || vitaminC > 0 || calcium > 0 || iron > 0 || potassium > 0) && (
        <View style={styles.vitaminsSection}>
          <Text style={[styles.sectionLabel, { fontFamily: fontFamilyBold }]}>
            Vitamins & Minerals
          </Text>
          <Text style={[styles.vitaminSubtitle, { fontFamily }]}>
            % of daily value per serving
          </Text>
          <View style={styles.vitaminsGrid}>
            {vitaminA > 0 && (
              <View style={styles.vitaminItem}>
                <View style={styles.vitaminBar}>
                  <View style={[styles.vitaminFill, { width: `${Math.min(vitaminA, 100)}%`, backgroundColor: "#FF9800" }]} />
                </View>
                <Text style={[styles.vitaminLabel, { fontFamily }]}>Vitamin A</Text>
                <Text style={[styles.vitaminValue, { fontFamily: fontFamilyBold }]}>{vitaminA}%</Text>
              </View>
            )}
            {vitaminC > 0 && (
              <View style={styles.vitaminItem}>
                <View style={styles.vitaminBar}>
                  <View style={[styles.vitaminFill, { width: `${Math.min(vitaminC, 100)}%`, backgroundColor: "#FF5722" }]} />
                </View>
                <Text style={[styles.vitaminLabel, { fontFamily }]}>Vitamin C</Text>
                <Text style={[styles.vitaminValue, { fontFamily: fontFamilyBold }]}>{vitaminC}%</Text>
              </View>
            )}
            {calcium > 0 && (
              <View style={styles.vitaminItem}>
                <View style={styles.vitaminBar}>
                  <View style={[styles.vitaminFill, { width: `${Math.min(calcium, 100)}%`, backgroundColor: "#00BCD4" }]} />
                </View>
                <Text style={[styles.vitaminLabel, { fontFamily }]}>Calcium</Text>
                <Text style={[styles.vitaminValue, { fontFamily: fontFamilyBold }]}>{calcium}%</Text>
              </View>
            )}
            {iron > 0 && (
              <View style={styles.vitaminItem}>
                <View style={styles.vitaminBar}>
                  <View style={[styles.vitaminFill, { width: `${Math.min(iron, 100)}%`, backgroundColor: "#795548" }]} />
                </View>
                <Text style={[styles.vitaminLabel, { fontFamily }]}>Iron</Text>
                <Text style={[styles.vitaminValue, { fontFamily: fontFamilyBold }]}>{iron}%</Text>
              </View>
            )}
            {potassium > 0 && (
              <View style={styles.vitaminItem}>
                <View style={styles.vitaminBar}>
                  <View style={[styles.vitaminFill, { width: `${Math.min(potassium, 100)}%`, backgroundColor: "#673AB7" }]} />
                </View>
                <Text style={[styles.vitaminLabel, { fontFamily }]}>Potassium</Text>
                <Text style={[styles.vitaminValue, { fontFamily: fontFamilyBold }]}>{potassium}%</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF8F5",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFE8E0",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    padding: 3,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 17,
  },
  toggleButtonActive: {
    backgroundColor: "#FF9F1C",
  },
  toggleText: {
    fontSize: 12,
    color: "#666666",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroValue: {
    fontSize: 15,
    color: "#1A1A1A",
    marginTop: 2,
  },
  macroLabel: {
    fontSize: 12,
    color: "#1A1A1A",
    marginTop: 8,
  },
  macroPercent: {
    fontSize: 10,
    color: "#888888",
    marginTop: 2,
  },
  macroInsight: {
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#FFE8E0",
    marginVertical: 20,
  },
  microsSection: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 10,
  },
  nutrientPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nutrientPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  nutrientPillLabel: {
    fontSize: 12,
    marginRight: 6,
  },
  nutrientPillValue: {
    fontSize: 12,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  vitaminsSection: {
    marginTop: 16,
  },
  vitaminSubtitle: {
    fontSize: 11,
    color: "#999999",
    marginBottom: 12,
    marginTop: -6,
  },
  vitaminsGrid: {
    gap: 10,
  },
  vitaminItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  vitaminBar: {
    width: 80,
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 10,
  },
  vitaminFill: {
    height: "100%",
    borderRadius: 3,
  },
  vitaminLabel: {
    fontSize: 12,
    color: "#666666",
    flex: 1,
  },
  vitaminValue: {
    fontSize: 12,
    color: "#1A1A1A",
    minWidth: 35,
    textAlign: "right",
  },
});

export default NutritionSnapshot;
