import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { X, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export function AddCustomModal({ visible, type, onClose, onAdd }) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (value.trim()) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onAdd(value.trim());
      setValue("");
    }
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setValue("");
    onClose();
  };

  const title = type === "allergy" ? "Add Custom Allergy" : "Add Ingredient to Avoid";
  const placeholder = type === "allergy" 
    ? "Enter allergy name (e.g., Peanuts)" 
    : "Enter ingredient name (e.g., Onions)";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily: "Inter_600SemiBold" }]}>
              {title}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <TextInput
              style={[styles.input, { fontFamily: "Inter_400Regular" }]}
              placeholder={placeholder}
              placeholderTextColor="#999999"
              value={value}
              onChangeText={setValue}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />

            <TouchableOpacity
              style={[
                styles.addButton,
                !value.trim() && styles.addButtonDisabled,
              ]}
              onPress={handleAdd}
              disabled={!value.trim()}
            >
              <Plus size={18} color={value.trim() ? "#FFFFFF" : "#CCCCCC"} />
              <Text
                style={[
                  styles.addButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                  !value.trim() && styles.addButtonTextDisabled,
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    color: "#000000",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F3F3",
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    gap: 16,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9F1C",
    borderRadius: 12,
    paddingVertical: 16,
  },
  addButtonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  addButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  addButtonTextDisabled: {
    color: "#CCCCCC",
  },
});

