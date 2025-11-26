import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Calendar, Coffee, Sun, Moon } from "lucide-react-native";

const { width: screenWidth } = Dimensions.get("window");

export function MealPlanModal({
  visible,
  onClose,
  recipeName,
  selectedDate: initialSelectedDate,
  selectedMealType: initialSelectedMealType,
  onDateSelect: externalOnDateSelect,
  onMealTypeSelect: externalOnMealTypeSelect,
  onConfirm,
  isLoading,
  nextDays,
  fontFamily,
}) {
  const insets = useSafeAreaInsets();
  const [internalSelectedDate, setInternalSelectedDate] = useState(
    initialSelectedDate || null,
  );
  const [internalSelectedMealType, setInternalSelectedMealType] = useState(
    initialSelectedMealType || null,
  );

  // Sync with external props when they change
  useEffect(() => {
    if (initialSelectedDate !== undefined) {
      setInternalSelectedDate(initialSelectedDate);
    }
    if (initialSelectedMealType !== undefined) {
      setInternalSelectedMealType(initialSelectedMealType);
    }
  }, [initialSelectedDate, initialSelectedMealType]);

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setInternalSelectedDate(initialSelectedDate || null);
      setInternalSelectedMealType(initialSelectedMealType || null);
    }
  }, [visible, initialSelectedDate, initialSelectedMealType]);

  const handleDateSelect = (date) => {
    setInternalSelectedDate(date);
    if (externalOnDateSelect) {
      externalOnDateSelect(date);
    }
  };

  const handleMealTypeSelect = (mealType) => {
    setInternalSelectedMealType(mealType);
    if (externalOnMealTypeSelect) {
      externalOnMealTypeSelect(mealType);
    }
  };

  const handleConfirm = () => {
    if (internalSelectedDate && internalSelectedMealType) {
      onConfirm({
        date: internalSelectedDate,
        mealType: internalSelectedMealType,
      });
    }
  };

  const formatDateForDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return {
        label: "Today",
        date: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
      };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return {
        label: "Tomorrow",
        date: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
      };
    } else {
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
      };
    }
  };

  const getMealTypeIcon = (mealType) => {
    switch (mealType) {
      case "breakfast":
        return <Coffee size={20} color="#FF9F1C" />;
      case "lunch":
        return <Sun size={20} color="#4CAF50" />;
      case "dinner":
        return <Moon size={20} color="#2196F3" />;
      default:
        return null;
    }
  };

  const mealTypes = [
    {
      id: "breakfast",
      label: "Breakfast",
      color: "#FF9F1C",
      bgColor: "#FFF4E6",
    },
    { id: "lunch", label: "Lunch", color: "#4CAF50", bgColor: "#E8F5E8" },
    { id: "dinner", label: "Dinner", color: "#2196F3", bgColor: "#E3F2FD" },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Calendar size={24} color="#FF9F1C" />
              <Text
                style={[styles.modalTitle, { fontFamily: fontFamily.bold }]}
              >
                Add to Meal Plan
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Recipe Name */}
          <View style={styles.recipeSection}>
            <Text
              style={[styles.recipeLabel, { fontFamily: fontFamily.medium }]}
            >
              Recipe
            </Text>
            <Text
              style={[styles.recipeName, { fontFamily: fontFamily.semiBold }]}
            >
              {recipeName}
            </Text>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { fontFamily: fontFamily.semiBold }]}
            >
              Choose Date
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScrollContainer}
              contentContainerStyle={styles.dateScrollContent}
            >
              {nextDays.map((day) => {
                const displayDate = formatDateForDisplay(day.date);
                const isSelected = internalSelectedDate === day.date;

                return (
                  <TouchableOpacity
                    key={day.date}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                    ]}
                    onPress={() => handleDateSelect(day.date)}
                  >
                    <Text
                      style={[
                        styles.dateLabel,
                        { fontFamily: fontFamily.medium },
                        isSelected && styles.dateLabelSelected,
                      ]}
                    >
                      {displayDate.label}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumber,
                        { fontFamily: fontFamily.bold },
                        isSelected && styles.dateNumberSelected,
                      ]}
                    >
                      {displayDate.date}
                    </Text>
                    <Text
                      style={[
                        styles.dateMonth,
                        { fontFamily: fontFamily.regular },
                        isSelected && styles.dateMonthSelected,
                      ]}
                    >
                      {displayDate.month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Meal Type Selection */}
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { fontFamily: fontFamily.semiBold }]}
            >
              Meal Type
            </Text>
            <View style={styles.mealTypeGrid}>
              {mealTypes.map((mealType) => {
                const isSelected = internalSelectedMealType === mealType.id;

                return (
                  <TouchableOpacity
                    key={mealType.id}
                    style={[
                      styles.mealTypeCard,
                      isSelected && styles.mealTypeCardSelected,
                      {
                        backgroundColor: isSelected
                          ? mealType.color
                          : mealType.bgColor,
                      },
                    ]}
                    onPress={() => handleMealTypeSelect(mealType.id)}
                  >
                    <View style={styles.mealTypeIcon}>
                      {getMealTypeIcon(mealType.id)}
                    </View>
                    <Text
                      style={[
                        styles.mealTypeText,
                        { fontFamily: fontFamily.semiBold },
                        { color: isSelected ? "#FFFFFF" : mealType.color },
                      ]}
                    >
                      {mealType.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              (!internalSelectedDate ||
                !internalSelectedMealType) &&
                styles.addButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={
              isLoading ||
              !internalSelectedDate ||
              !internalSelectedMealType
            }
          >
            <Text
              style={[
                styles.addButtonText,
                { fontFamily: fontFamily.semiBold },
              ]}
            >
              {isLoading ? "Adding..." : "Add to Meal Plan"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "80%",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },

  // Header
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    color: "#000000",
    marginLeft: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },

  // Recipe Section
  recipeSection: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  recipeLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recipeName: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 16,
  },

  // Date Selection
  dateScrollContainer: {
    marginHorizontal: -20,
  },
  dateScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dateCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    minWidth: 80,
    borderWidth: 2,
    borderColor: "transparent",
  },
  dateCardSelected: {
    backgroundColor: "#FF9F1C",
    borderColor: "#FF9F1C",
  },
  dateLabel: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateLabelSelected: {
    color: "#FFFFFF",
  },
  dateNumber: {
    fontSize: 20,
    color: "#000000",
    marginBottom: 2,
  },
  dateNumberSelected: {
    color: "#FFFFFF",
  },
  dateMonth: {
    fontSize: 11,
    color: "#666666",
    textTransform: "uppercase",
  },
  dateMonthSelected: {
    color: "#FFFFFF",
  },

  // Meal Type Selection
  mealTypeGrid: {
    gap: 12,
  },
  mealTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  mealTypeCardSelected: {
    borderColor: "#FF9F1C",
    shadowColor: "#FF9F1C",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mealTypeIcon: {
    marginRight: 12,
  },
  mealTypeText: {
    fontSize: 16,
    flex: 1,
  },

  // Add Button
  addButton: {
    backgroundColor: "#FF9F1C",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#FF9F1C",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonDisabled: {
    backgroundColor: "#CCCCCC",
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});
