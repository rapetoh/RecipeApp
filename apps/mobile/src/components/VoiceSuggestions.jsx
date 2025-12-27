import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { Mic, X, ChefHat, Clock, Leaf, ArrowRight } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { getApiUrl } from "@/utils/api";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

const { width: screenWidth } = Dimensions.get("window");

export default function VoiceSuggestions({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const bottomSheetRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [stage, setStage] = useState("listening"); // listening, processing, results
  const [activeStep, setActiveStep] = useState(0); // 0: voice recognized, 1: filtering, 2: checking pantry
  const [results, setResults] = useState([]);
  const [vibeText, setVibeText] = useState("");
  const recordingAttemptedRef = useRef(false);

  // Animation for waveform
  const waveformAnim = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.3))
  ).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const snapPoints = ["85%"];
  const [sheetIndex, setSheetIndex] = useState(-1);

  useEffect(() => {
    if (visible) {
      // Set index to 0 to open the sheet
      setSheetIndex(0);
      // Reset recording attempt flag when sheet opens
      recordingAttemptedRef.current = false;
    } else {
      // Set index to -1 to close the sheet
      setSheetIndex(-1);
      stopRecording();
      recordingAttemptedRef.current = false;
    }
  }, [visible]);

  const startRecording = async () => {
    try {
      console.log("🎤 [DEBUG] startRecording called");
      if (Platform.OS !== "web") {
        const { status } = await Audio.requestPermissionsAsync();
        console.log("🎤 [DEBUG] Permission status:", status);
        if (status !== "granted") {
          Alert.alert("Permission Required", "Microphone permission is required.");
          // Don't close - let user use text input instead
          recordingAttemptedRef.current = false;
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log("🎤 [DEBUG] Audio mode set");

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      console.log("🎤 [DEBUG] Recording object created:", !!newRecording);
      setRecording(newRecording);
      setIsRecording(true);
      console.log("✅ [DEBUG] Recording started successfully, isRecording set to true");
    } catch (err) {
      console.error("❌ [DEBUG] Failed to start recording", err);
      // Reset flag so user can try again
      recordingAttemptedRef.current = false;
      setIsRecording(false);
      Alert.alert(
        "Recording Error",
        `Failed to start recording: ${err.message}. You can use the quick suggestions below or try again.`,
        [
          { text: "OK" },
          {
            text: "Try Again",
            onPress: () => {
              setTimeout(() => {
                if (visible && stage === "listening") {
                  startRecording();
                }
              }, 500);
            },
          },
        ]
      );
    }
  };

  // Handle bottom sheet state changes - start recording when fully expanded
  const handleSheetChange = useCallback((index) => {
    console.log("📱 [DEBUG] Sheet changed to index:", index);
    setSheetIndex(index);
    
    // Log all state values to see why condition might fail
    console.log("📱 [DEBUG] State values - index:", index, "visible:", visible, "stage:", stage, "isRecording:", isRecording, "attempted:", recordingAttemptedRef.current);
    
    // Only proceed if sheet is fully expanded (index 0) and we haven't already attempted recording
    // Note: We don't check 'visible' because index === 0 already indicates the sheet is open
    // and checking 'visible' causes stale closure issues
    if (index === 0 && stage === "listening" && !isRecording && !recordingAttemptedRef.current) {
      console.log("📱 [DEBUG] Conditions met, will attempt to start recording");
      console.log("📱 [DEBUG] stage:", stage, "isRecording:", isRecording);
      recordingAttemptedRef.current = true;
      // Small delay to ensure sheet is fully ready and app is in foreground
      setTimeout(() => {
        console.log("📱 [DEBUG] Timeout fired, checking state before starting recording");
        console.log("📱 [DEBUG] stage:", stage, "isRecording:", isRecording);
        // Double-check state before starting
        if (stage === "listening" && !isRecording) {
          startRecording();
        } else {
          console.log("📱 [DEBUG] State changed, not starting recording");
          recordingAttemptedRef.current = false;
        }
      }, 500);
    }
    // Reset flag if sheet closes
    if (index === -1) {
      recordingAttemptedRef.current = false;
    }
  }, [stage, isRecording]);

  // Animate waveform
  useEffect(() => {
    if (isRecording) {
      const animations = waveformAnim.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 200 + Math.random() * 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 200 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ])
        );
      });
      Animated.parallel(animations).start();
    } else {
      waveformAnim.forEach((anim) => {
        anim.setValue(0.3);
      });
    }
  }, [isRecording]);

  const stopRecording = async () => {
    console.log("🛑 [DEBUG] stopRecording called, recording exists:", !!recording);
    if (!recording) {
      console.log("🛑 [DEBUG] No recording object, returning null");
      return null;
    }

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log("🛑 [DEBUG] Recording stopped, URI:", uri ? "exists" : "null");
      setRecording(null);
      return uri;
    } catch (err) {
      console.error("❌ [DEBUG] Failed to stop recording", err);
      return null;
    }
  };

  const handleDoneSpeaking = async () => {
    console.log("🛑 [DEBUG] handleDoneSpeaking called");
    console.log("🛑 [DEBUG] recording exists:", !!recording);
    console.log("🛑 [DEBUG] isRecording:", isRecording);
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Show processing screen immediately for better UX
    setStage("processing");
    setActiveStep(0);

    const audioUri = await stopRecording();
    console.log("🛑 [DEBUG] audioUri received:", !!audioUri, audioUri ? "has URI" : "null");
    if (!audioUri) {
      Alert.alert("Error", "Failed to process recording");
      setStage("listening"); // Go back to listening if error
      return;
    }

    // Process the voice input
    processVoiceInput(audioUri);
  };

  const processVoiceInput = async (audioUri) => {
    try {
      // Step 1: Voice recognized
      setActiveStep(0);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Filtering recipes
      setActiveStep(1);

      // Convert audio to base64 - React Native compatible
      let base64Audio;
      try {
        if (Platform.OS === 'web') {
          // Web implementation
          const response = await fetch(audioUri);
          const blob = await response.blob();
          base64Audio = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          // React Native implementation using expo-file-system
          const FileSystem = require('expo-file-system');
          base64Audio = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch (conversionError) {
        console.error("Error converting audio to base64:", conversionError);
        Alert.alert("Error", `Failed to process audio: ${conversionError.message}`);
        setStage("listening");
        return;
      }

      // Call API
      const apiUrl = getApiUrl();
      const result = await fetch(`${apiUrl}/api/voice-suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: auth?.user?.id,
          audio: base64Audio,
          mimeType: "audio/m4a",
        }),
      });

      // Check response status
      if (!result.ok) {
        const errorText = await result.text();
        let errorMessage = "Failed to process voice input";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error (${result.status})`;
        }
        console.error("API error:", result.status, errorMessage);
        Alert.alert("Error", errorMessage);
        setStage("listening");
        return;
      }

      const data = await result.json();

      if (data.success) {
        setActiveStep(2); // Checking pantry
        await new Promise((resolve) => setTimeout(resolve, 800));

        setVibeText(data.transcription || "your request");
        setResults(data.recipes || []);
        setStage("results");
      } else {
        Alert.alert("Error", data.error || "Failed to process voice input");
        setStage("listening");
        startRecording();
      }
    } catch (error) {
      console.error("Error processing voice:", error);
      Alert.alert("Error", `Failed to process voice input: ${error.message}`);
      setStage("listening");
      startRecording();
    }
  };

  const handleQuickSuggestion = (text) => {
    setVibeText(text);
    setStage("processing");
    setActiveStep(0);

    // Process text directly
    processTextInput(text);
  };

  const processTextInput = async (text) => {
    try {
      setActiveStep(0);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setActiveStep(1);

      const apiUrl = getApiUrl();
      const result = await fetch(`${apiUrl}/api/voice-suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: auth?.user?.id,
          text: text,
        }),
      });

      // Check response status
      if (!result.ok) {
        const errorText = await result.text();
        let errorMessage = "Failed to process request";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error (${result.status})`;
        }
        console.error("API error:", result.status, errorMessage);
        Alert.alert("Error", errorMessage);
        setStage("listening");
        return;
      }

      const data = await result.json();

      if (data.success) {
        setActiveStep(2);
        await new Promise((resolve) => setTimeout(resolve, 800));

        setResults(data.recipes || []);
        setStage("results");
      } else {
        Alert.alert("Error", data.error || "Failed to process request");
        setStage("listening");
      }
    } catch (error) {
      console.error("Error processing text:", error);
      Alert.alert("Error", `Failed to process request: ${error.message}`);
      setStage("listening");
    }
  };

  const handleTryAgain = () => {
    setStage("listening");
    setResults([]);
    setVibeText("");
    setActiveStep(0);
    recordingAttemptedRef.current = false;
    // Wait a bit before starting recording again
    setTimeout(() => {
      startRecording();
    }, 300);
  };

  // Button handler - closes the sheet using imperative API
  const handleCloseButton = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    bottomSheetRef.current?.close();
  }, []);

  // Cleanup when sheet actually closes
  const handleSheetClose = useCallback(() => {
    stopRecording();
    setStage("listening");
    setResults([]);
    setVibeText("");
    setActiveStep(0);
    recordingAttemptedRef.current = false;
    setSheetIndex(-1);
    onClose();
  }, [onClose]);

  const handleRecipePress = (recipe) => {
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  if (!fontsLoaded) return null;

  return (
      <BottomSheet
        ref={bottomSheetRef}
        index={sheetIndex}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={handleSheetClose}
        onChange={handleSheetChange}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        animateOnMount={true}
      >
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.blurOverlay}>
          <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
            {stage === "listening" && "I'm listening..."}
            {stage === "processing" && "Processing..."}
            {stage === "results" && `Found ${results.length} Recipe${results.length !== 1 ? "s" : ""}`}
          </Text>
          <TouchableOpacity 
            onPress={handleCloseButton}
            style={styles.closeButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Listening Stage */}
        {stage === "listening" && (
          <View style={styles.listeningContainer}>
            <Text
              style={[
                styles.instructionText,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              Say something like "I'm tired and want something spicy"
            </Text>

            {/* Waveform Visualizer */}
            <View style={styles.waveformContainer}>
              {waveformAnim.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      transform: [
                        {
                          scaleY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.25, 1], // Scale from 25% to 100% (20px to 80px)
                          }),
                        },
                      ],
                      opacity: anim,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Quick Suggestions */}
            <View style={styles.quickSuggestions}>
              <TouchableOpacity
                style={styles.quickSuggestionButton}
                onPress={() => handleQuickSuggestion("Something sweet")}
              >
                <Text
                  style={[
                    styles.quickSuggestionText,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  Something sweet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickSuggestionButton}
                onPress={() => handleQuickSuggestion("Dinner in 15 mins")}
              >
                <Text
                  style={[
                    styles.quickSuggestionText,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  Dinner in 15 mins
                </Text>
              </TouchableOpacity>
            </View>

            {/* Done Button */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDoneSpeaking}
            >
              <Text
                style={[
                  styles.doneButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                I'm Done Speaking
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Processing Stage */}
        {stage === "processing" && (
          <View style={styles.processingContainer}>
            <Text
              style={[
                styles.processingSubtitle,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              Analyzing your request for {vibeText || "your vibe"}.
            </Text>

            <ActivityIndicator
              size="large"
              color="#FF9F1C"
              style={styles.loader}
            />

            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <View
                  style={[
                    styles.stepIcon,
                    activeStep >= 0 && styles.stepIconCompleted,
                  ]}
                >
                  {activeStep >= 0 ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <View style={styles.stepDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    { fontFamily: "Inter_400Regular" },
                    activeStep >= 0 && styles.stepTextCompleted,
                  ]}
                >
                  Voice recognized
                </Text>
              </View>

              <View style={styles.step}>
                <View
                  style={[
                    styles.stepIcon,
                    activeStep >= 1 && styles.stepIconActive,
                  ]}
                >
                  {activeStep >= 1 ? (
                    <View style={styles.stepDotActive} />
                  ) : (
                    <View style={styles.stepDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    { fontFamily: "Inter_400Regular" },
                    activeStep >= 1 && styles.stepTextActive,
                  ]}
                >
                  Filtering recipes...
                </Text>
              </View>

              <View style={styles.step}>
                <View
                  style={[
                    styles.stepIcon,
                    activeStep >= 2 && styles.stepIconActive,
                  ]}
                >
                  {activeStep >= 2 ? (
                    <View style={styles.stepDotActive} />
                  ) : (
                    <View style={styles.stepDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    { fontFamily: "Inter_400Regular" },
                    activeStep >= 2 && styles.stepTextActive,
                  ]}
                >
                  Checking pantry
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Results Stage */}
        {stage === "results" && (
          <ScrollView
            style={styles.resultsContainer}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={true}
          >
            <Text
              style={[
                styles.resultsSubtitle,
                { fontFamily: "Inter_400Regular" },
              ]}
            >
              Based on '{vibeText}'
            </Text>

            {results.map((recipe) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.recipeCard}
                onPress={() => handleRecipePress(recipe)}
              >
                <Image
                  source={{ uri: recipe.image_url || "" }}
                  style={styles.recipeImage}
                  contentFit="cover"
                />
                <View style={styles.recipeContent}>
                  <View style={styles.recipeHeader}>
                    <View style={styles.matchBadge}>
                      <Text
                        style={[
                          styles.matchText,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {recipe.matchPercentage || 95}% Match
                      </Text>
                    </View>
                    <ArrowRight size={20} color="#666666" />
                  </View>
                  <Text
                    style={[
                      styles.recipeName,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {recipe.name}
                  </Text>
                  <View style={styles.recipeMeta}>
                    <View style={styles.metaItem}>
                      <Clock size={14} color="#666666" />
                      <Text
                        style={[
                          styles.metaText,
                          { fontFamily: "Inter_400Regular" },
                        ]}
                      >
                        {recipe.cooking_time || 30} min
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      {recipe.dietary_info ? (
                        <>
                          <Leaf size={14} color="#666666" />
                          <Text
                            style={[
                              styles.metaText,
                              { fontFamily: "Inter_400Regular" },
                            ]}
                          >
                            {recipe.dietary_info}
                          </Text>
                        </>
                      ) : (
                        <>
                          <ChefHat size={14} color="#666666" />
                          <Text
                            style={[
                              styles.metaText,
                              { fontFamily: "Inter_400Regular" },
                            ]}
                          >
                            {recipe.difficulty || "Easy"}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={handleTryAgain}
              >
                <Mic size={18} color="#FF9F1C" />
                <Text
                  style={[
                    styles.tryAgainText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Try Again
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewPlannerButton}
                onPress={handleCloseButton}
              >
                <Text
                  style={[
                    styles.viewPlannerText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  View Planner
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
          </BottomSheetView>
        </View>
      </BlurView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: "transparent",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  blurContainer: {
    flex: 1,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    overflow: "hidden",
  },
  blurOverlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderTopLeftRadius: 55,
    borderTopRightRadius: 55,
  },
  handleIndicator: {
    backgroundColor: "#E0E0E0",
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 44,
    marginBottom: 24,
    zIndex: 999,
  },
  headerTitle: {
    fontSize: 24,
    color: "#000000",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    elevation: 10,
  },
  listeningContainer: {
    flex: 1,
    alignItems: "center",
  },
  instructionText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 40,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    marginBottom: 40,
    gap: 4,
  },
  waveformBar: {
    width: 4,
    height: 80, // Fixed height, will be scaled via transform
    backgroundColor: "#FF9F1C",
    borderRadius: 2,
    marginHorizontal: 2,
  },
  quickSuggestions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  quickSuggestionButton: {
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  quickSuggestionText: {
    fontSize: 14,
    color: "#FF9F1C",
  },
  doneButton: {
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    width: "100%",
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 16,
    color: "#FF9F1C",
  },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
  },
  processingSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 32,
  },
  loader: {
    marginBottom: 40,
  },
  stepsContainer: {
    width: "100%",
    gap: 24,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepIconCompleted: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  stepIconActive: {
    borderColor: "#FF9F1C",
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
  },
  stepDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF9F1C",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  stepText: {
    fontSize: 16,
    color: "#999999",
  },
  stepTextCompleted: {
    color: "#4CAF50",
  },
  stepTextActive: {
    color: "#000000",
    fontFamily: "Inter_600SemiBold",
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 150, // Increased to ensure buttons are accessible
  },
  resultsSubtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 24,
  },
  recipeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImage: {
    width: 100,
    height: 100,
    backgroundColor: "#F8F9FA",
  },
  recipeContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  matchBadge: {
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    fontSize: 12,
    color: "#FF9F1C",
  },
  recipeName: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 8,
  },
  recipeMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#666666",
  },
  resultsActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  tryAgainButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E6",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  tryAgainText: {
    fontSize: 16,
    color: "#FF9F1C",
  },
  viewPlannerButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9F1C",
    paddingVertical: 14,
    borderRadius: 12,
  },
  viewPlannerText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});

