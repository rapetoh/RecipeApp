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
  Modal,
  KeyboardAvoidingView,
  AppState,
  FlatList,
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
import { Mic, X, ChefHat, Clock, Leaf, ArrowRight, Save, Check, Folder, Heart } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import ErrorState from "@/components/ErrorState";
import IngredientPreview from "@/components/IngredientPreview";
import UpgradePrompt from "@/components/UpgradePrompt";
import { getApiUrl } from "@/utils/api";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth } = Dimensions.get("window");

// Module-level refs for AbortController (survives component unmount)
let globalAbortController = null;
let globalRequestId = null;

// AsyncStorage keys
const STORAGE_KEYS = {
  VOICE_REQUEST_STATE: '@voice_request_state',
  VOICE_RESULTS: '@voice_results',
  VOICE_VIBE_TEXT: '@voice_vibe_text',
};
const CARD_MARGIN = 8;
const CARD_PADDING = 16;
// Account for BottomSheet structure: contentContainer (20px) + gridContent (16px) padding on each side
const HORIZONTAL_PADDING = 20 + 16; // contentContainer paddingHorizontal + gridContent padding
const recipeCardWidth = (screenWidth - (HORIZONTAL_PADDING * 2) - CARD_MARGIN) / 2;

/**
 * Fetch with timeout and automatic retry for network resilience
 * Handles iOS background/foreground transitions that can break network connections
 * Supports external abort signal for cancellation
 */
const fetchWithRetry = async (url, options = {}, maxRetries = 2) => {
  const timeout = 60000; // 60 second timeout for voice processing (AI can be slow)
  const externalSignal = options.signal; // Get external abort signal if provided
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if external signal is already aborted
    if (externalSignal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    
    // Combine external signal with timeout signal
    let combinedSignal = timeoutController.signal;
    if (externalSignal) {
      // Create a combined signal that aborts if either signal aborts
      const combinedController = new AbortController();
      const abortCombined = () => combinedController.abort();
      externalSignal.addEventListener('abort', abortCombined);
      timeoutController.signal.addEventListener('abort', abortCombined);
      combinedSignal = combinedController.signal;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', () => {});
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', () => {});
      }
      
      // If aborted by external signal, don't retry
      if (error.name === 'AbortError' && externalSignal?.aborted) {
        throw error;
      }
      
      // Check if error is retryable (network issues, timeouts, aborts)
      const isRetryable = 
        error.name === 'AbortError' ||
        error.message?.includes('Network request failed') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('aborted');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`🔄 Network request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default function VoiceSuggestions({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [stage, setStage] = useState("listening"); // listening, processing, results, error
  const [activeStep, setActiveStep] = useState(0); // 0: voice recognized, 1: filtering, 2: checking pantry
  const [results, setResults] = useState([]);
  const [vibeText, setVibeText] = useState("");
  const [invalidMessage, setInvalidMessage] = useState(""); // Error message for invalid input
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeUsage, setUpgradeUsage] = useState(null);
  const recordingAttemptedRef = useRef(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set()); // Track saved recipes
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllProgress, setSaveAllProgress] = useState(0);
  const stepIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation for waveform
  const waveformAnim = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.3))
  ).current;

  // Helper function to clear step interval
  const clearStepInterval = () => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  };

  // Save request state to AsyncStorage
  const saveRequestState = async (state) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_REQUEST_STATE, JSON.stringify({
        ...state,
        timestamp: Date.now(),
        startTime: state.startTime || Date.now(), // Save when processing started
      }));
    } catch (error) {
      console.error('Error saving request state:', error);
    }
  };

  // Load request state from AsyncStorage
  const loadRequestState = async () => {
    try {
      const stateStr = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_REQUEST_STATE);
      if (stateStr) {
        const state = JSON.parse(stateStr);
        // Check if state is not too old (e.g., 5 minutes)
        if (Date.now() - state.timestamp < 5 * 60 * 1000) {
          return state;
        } else {
          // Clear stale state
          await clearRequestState();
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading request state:', error);
      return null;
    }
  };

  // Clear all request state from AsyncStorage
  const clearRequestState = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.VOICE_REQUEST_STATE,
        STORAGE_KEYS.VOICE_RESULTS,
        STORAGE_KEYS.VOICE_VIBE_TEXT,
      ]);
    } catch (error) {
      console.error('Error clearing request state:', error);
    }
  };

  // Restore state when sheet opens
  const restoreRequestState = async () => {
    const savedState = await loadRequestState();
    if (savedState) {
      if (savedState.stage === 'processing') {
        // Check if we have results (request might have completed)
        try {
          const resultsStr = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_RESULTS);
          const vibeText = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_VIBE_TEXT);
          
          if (resultsStr) {
            // Request completed, show results
            const results = JSON.parse(resultsStr);
            setResults(results);
            setVibeText(vibeText || '');
            setStage('results');
            setIsProcessing(false);
            await clearRequestState();
          } else {
            // Still processing - restore state and restart step progression
            setStage('processing');
            setIsProcessing(true);
            setVibeText(vibeText || '');
            
            // Calculate current step based on elapsed time
            // Step 0: 0-600ms, Step 1: 600-4600ms, Step 2: 4600-8600ms, Step 3: 8600-12600ms, Step 4: 12600+
            const startTime = savedState.startTime || savedState.timestamp;
            const elapsed = Date.now() - startTime;
            let calculatedStep = 1; // Default to step 1
            if (elapsed < 600) {
              calculatedStep = 0;
            } else if (elapsed < 4600) {
              calculatedStep = 1;
            } else if (elapsed < 8600) {
              calculatedStep = 2;
            } else if (elapsed < 12600) {
              calculatedStep = 3;
            } else {
              calculatedStep = 4;
            }
            
            setActiveStep(calculatedStep);
            
            // Restart step progression interval
            // Clear any existing interval first
            clearStepInterval();
            
            let currentStep = calculatedStep;
            stepIntervalRef.current = setInterval(() => {
              currentStep++;
              if (currentStep <= 4) {
                setActiveStep(currentStep);
              }
            }, 4000); // Progress every 4 seconds
          }
        } catch (error) {
          console.error('Error restoring state:', error);
          // If error, clear and start fresh
          await clearRequestState();
        }
      } else if (savedState.stage === 'results') {
        try {
          const resultsStr = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_RESULTS);
          const vibeText = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_VIBE_TEXT);
          if (resultsStr) {
            setResults(JSON.parse(resultsStr));
            setVibeText(vibeText || '');
            setStage('results');
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Error restoring results:', error);
          await clearRequestState();
        }
      }
    }
  };

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
      // Restore state when sheet opens
      restoreRequestState();
    } else {
      // Set index to -1 to close the sheet
      setSheetIndex(-1);
      stopRecording();
      recordingAttemptedRef.current = false;
      // DON'T reset state if processing - let it continue
      if (!isProcessing) {
        setStage("listening");
        setResults([]);
        setVibeText("");
        setInvalidMessage("");
        setActiveStep(0);
      }
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

        // Wait for app to be in foreground after permission dialog
        // Permission dialog puts app in background, need to wait for it to return
        let attempts = 0;
        while (AppState.currentState !== 'active' && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        // Additional small delay to ensure audio session can activate
        await new Promise(resolve => setTimeout(resolve, 200));
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
      
      // Don't show error if it's the background audio session error on first permission
      // User can still use the feature after permission is granted
      if (err.message && err.message.includes("background") && err.message.includes("audio session")) {
        // Silently handle - permission was granted, just timing issue
        console.log("⚠️ [DEBUG] Background audio session error (first permission), will work on retry");
        return;
      }
      
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
      // Create new AbortController
      abortControllerRef.current = new AbortController();
      globalAbortController = abortControllerRef.current;
      const requestId = Date.now().toString();
      globalRequestId = requestId;
      const startTime = Date.now(); // Save start time for step calculation
      
      // Save initial state with startTime
      await saveRequestState({ stage: 'processing', requestId, startTime });
      setIsProcessing(true);
      setStage('processing');

      // Step 0: "Got it!"
      setActiveStep(0);
      await new Promise((resolve) => setTimeout(resolve, 600));

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
        setIsProcessing(false);
        clearStepInterval();
        await clearRequestState();
        return;
      }

      // Step 1: "The Chef is Finding the perfect recipes" - Start at 1s
      setActiveStep(1);
      
      // Start automatic step progression during API call
      let currentStep = 1;
      stepIntervalRef.current = setInterval(() => {
        currentStep++;
        if (currentStep <= 4) { // Steps 1-4 (0-indexed: 1, 2, 3, 4)
          setActiveStep(currentStep);
        }
      }, 4000); // Progress every 4 seconds

      // Call API with retry logic and abort signal
      const apiUrl = getApiUrl();
      const result = await fetchWithRetry(`${apiUrl}/api/voice-suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: auth?.user?.id,
          audio: base64Audio,
          mimeType: "audio/m4a",
        }),
        signal: abortControllerRef.current.signal, // Add abort signal
      });

      // Clear interval once API responds
      clearStepInterval();

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return; // Request was cancelled
      }

      // Check response status
      if (!result.ok) {
        const errorText = await result.text();
        let errorMessage = "Failed to process voice input";
        let errorType = null;
        let requiresUpgrade = false;
        let usage = null;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          errorType = errorData.type;
          requiresUpgrade = errorData.requiresUpgrade || false;
          usage = errorData.usage || null;
        } catch (e) {
          errorMessage = `Server error (${result.status})`;
        }
        
        // Handle upgrade required (403)
        if (result.status === 403 && requiresUpgrade) {
          setUpgradeUsage(usage);
          setShowUpgradePrompt(true);
          setStage("listening");
          setIsProcessing(false);
          await clearRequestState();
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          return;
        }
        
        // Handle invalid input (400 with type: "invalid") - show error card instead of alert
        if (result.status === 400 && errorType === "invalid") {
          setInvalidMessage(errorMessage);
          // Try to get transcription from error response
          try {
            const errorData = JSON.parse(errorText);
            setVibeText(errorData.transcription || transcription || "your request");
          } catch (e) {
            setVibeText(transcription || "your request");
          }
          setStage("error");
          setIsProcessing(false);
          await clearRequestState();
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return;
        }
        
        console.error("API error:", result.status, errorMessage);
        Alert.alert("Error", errorMessage);
        setStage("listening");
        setIsProcessing(false);
        await clearRequestState();
        return;
      }

      const data = await result.json();

      if (data.success) {
        // Step 4: "Almost there..." - Final step before results
        setActiveStep(4);
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Save results to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.VOICE_RESULTS, JSON.stringify(data.recipes || []));
        await AsyncStorage.setItem(STORAGE_KEYS.VOICE_VIBE_TEXT, data.transcription || '');
        await saveRequestState({ stage: 'results', requestId });

        setVibeText(data.transcription || "your request");
        setResults(data.recipes || []);
        setStage("results");
        setIsProcessing(false);
        // Don't clear request state here - keep results for when user reopens
      } else {
        // Handle invalid input response
        if (data.type === "invalid") {
          setInvalidMessage(data.error || "This doesn't seem to be a food-related request. Please try asking about recipes or meals.");
          setVibeText(data.transcription || transcription || "your request");
          setStage("error");
          setIsProcessing(false);
          await clearRequestState();
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return;
        }
        
        Alert.alert("Error", data.error || "Failed to process voice input");
        setStage("listening");
        setIsProcessing(false);
        await clearRequestState();
        startRecording();
      }
    } catch (error) {
      clearStepInterval();
      
      // Check if error is from abort
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('Request was cancelled');
        setIsProcessing(false);
        setStage('listening');
        await clearRequestState();
        return;
      }
      
      console.error("Error processing voice:", error);
      // Provide user-friendly error message for network issues
      const isNetworkError = 
        error.message?.includes('Network request failed') ||
        error.message?.includes('network') ||
        error.name === 'AbortError';
      
      const userMessage = isNetworkError
        ? "Connection lost. Please check your internet and try again."
        : `Failed to process voice input: ${error.message}`;
      
      Alert.alert("Error", userMessage);
      setStage("listening");
      setIsProcessing(false);
      await clearRequestState();
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
      // Create new AbortController
      abortControllerRef.current = new AbortController();
      globalAbortController = abortControllerRef.current;
      const requestId = Date.now().toString();
      globalRequestId = requestId;
      const startTime = Date.now(); // Save start time for step calculation
      
      // Save initial state with startTime
      await saveRequestState({ stage: 'processing', requestId, startTime });
      setIsProcessing(true);
      setStage('processing');

      // Step 0: "Got it!"
      setActiveStep(0);
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Step 1: "The Chef is Finding the perfect recipes"
      setActiveStep(1);
      
      // Start automatic step progression during API call
      let currentStep = 1;
      stepIntervalRef.current = setInterval(() => {
        currentStep++;
        if (currentStep <= 4) {
          setActiveStep(currentStep);
        }
      }, 4000); // Progress every 4 seconds

      const apiUrl = getApiUrl();
      const result = await fetchWithRetry(`${apiUrl}/api/voice-suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: auth?.user?.id,
          text: text,
        }),
        signal: abortControllerRef.current.signal, // Add abort signal
      });

      // Clear interval once API responds
      clearStepInterval();

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return; // Request was cancelled
      }

      // Check response status
      if (!result.ok) {
        const errorText = await result.text();
        let errorMessage = "Failed to process request";
        let errorType = null;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          errorType = errorData.type;
        } catch (e) {
          errorMessage = `Server error (${result.status})`;
        }
        
        // Handle invalid input (400 with type: "invalid") - show error card instead of alert
        if (result.status === 400 && errorType === "invalid") {
          setInvalidMessage(errorMessage);
          // Try to get transcription from error response
          try {
            const errorData = JSON.parse(errorText);
            setVibeText(errorData.transcription || text || "your request");
          } catch (e) {
            setVibeText(text || "your request");
          }
          setStage("error");
          setIsProcessing(false);
          await clearRequestState();
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return;
        }
        
        // Handle upgrade required (403)
        if (result.status === 403) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.requiresUpgrade) {
              setUpgradeUsage(errorData.usage || null);
              setShowUpgradePrompt(true);
              setStage("listening");
              setIsProcessing(false);
              await clearRequestState();
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              return;
            }
          } catch (e) {
            // Not a JSON response, continue with normal error handling
          }
        }
        
        console.error("API error:", result.status, errorMessage);
        Alert.alert("Error", errorMessage);
        setStage("listening");
        setIsProcessing(false);
        await clearRequestState();
        return;
      }

      const data = await result.json();

      if (data.success) {
        // Step 4: "Almost there..."
        setActiveStep(4);
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Save results to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.VOICE_RESULTS, JSON.stringify(data.recipes || []));
        await AsyncStorage.setItem(STORAGE_KEYS.VOICE_VIBE_TEXT, text || '');
        await saveRequestState({ stage: 'results', requestId });

        setResults(data.recipes || []);
        setStage("results");
        setIsProcessing(false);
        // Don't clear request state here - keep results for when user reopens
      } else {
        // Handle invalid input response
        if (data.type === "invalid") {
          setInvalidMessage(data.error || "This doesn't seem to be a food-related request. Please try asking about recipes or meals.");
          setVibeText(data.transcription || text || "your request");
          setStage("error");
          setIsProcessing(false);
          await clearRequestState();
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return;
        }
        
        Alert.alert("Error", data.error || "Failed to process request");
        setStage("listening");
        setIsProcessing(false);
        await clearRequestState();
      }
    } catch (error) {
      clearStepInterval();
      
      // Check if error is from abort
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('Request was cancelled');
        setIsProcessing(false);
        setStage('listening');
        await clearRequestState();
        return;
      }
      
      console.error("Error processing text:", error);
      // Provide user-friendly error message for network issues
      const isNetworkError = 
        error.message?.includes('Network request failed') ||
        error.message?.includes('network') ||
        error.name === 'AbortError';
      
      const userMessage = isNetworkError
        ? "Connection lost. Please check your internet and try again."
        : `Failed to process request: ${error.message}`;
      
      Alert.alert("Error", userMessage);
      setStage("listening");
      setIsProcessing(false);
      await clearRequestState();
    }
  };

  // Cancel active request
  const handleCancelRequest = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      globalAbortController = null;
    }
    clearStepInterval();
    setIsProcessing(false);
    setStage('listening');
    setResults([]);
    setVibeText("");
    setInvalidMessage("");
    setActiveStep(0);
    await clearRequestState();
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTryAgain = async () => {
    // Cancel any active request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      globalAbortController = null;
    }
    clearStepInterval();
    await clearRequestState(); // Clear all persisted state
    setStage("listening");
    setResults([]);
    setVibeText("");
    setInvalidMessage("");
    setActiveStep(0);
    setIsProcessing(false);
    recordingAttemptedRef.current = false;
    // Wait a bit before starting recording again
    setTimeout(() => {
      startRecording();
    }, 300);
  };

  const formatTime = (minutes) => {
    if (!minutes) return "Quick";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getCategory = (recipe) => {
    if (recipe.category) return recipe.category;
    if (recipe.cuisine) return recipe.cuisine;
    return "Recipe";
  };

  const renderRecipeCard = ({ item: recipe }) => {
    const isSaved = savedRecipeIds.has(recipe.id);
    
    return (
      <TouchableOpacity
        style={[styles.gridRecipeCard, { width: recipeCardWidth }]}
        onPress={() => handleRecipePress(recipe)}
        activeOpacity={0.7}
      >
        {/* Recipe Image */}
        <View style={styles.gridImageContainer}>
          {recipe.image_url && recipe.image_url.trim() !== "" ? (
            <Image
              source={{ uri: recipe.image_url }}
              style={styles.gridRecipeImage}
              contentFit="cover"
              transition={200}
            />
          ) : recipe.ingredients && recipe.ingredients.length > 0 ? (
            <IngredientPreview 
              ingredients={recipe.ingredients} 
              recipeId={recipe.id || recipe.name}
              maxItems={6}
            />
          ) : (
            <View style={styles.gridPlaceholderImage}>
              <ChefHat size={32} color="#CCCCCC" />
            </View>
          )}
          
          {/* Heart Badge - Favorite Button */}
          <TouchableOpacity
            style={styles.gridHeartBadge}
            onPress={(e) => {
              e.stopPropagation();
              if (!isSaved) {
                handleKeepRecipe(recipe, e);
              } else {
                handleRecipePress(recipe);
              }
            }}
            activeOpacity={0.7}
          >
            <Heart 
              size={14} 
              color="#FFFFFF" 
              fill={isSaved ? "#FFFFFF" : "none"} 
            />
          </TouchableOpacity>
        </View>

        {/* Recipe Info */}
        <View style={styles.gridRecipeInfo}>
          <Text
            style={[styles.gridRecipeTitle, { fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={2}
          >
            {recipe.name}
          </Text>
          <View style={styles.gridRecipeMeta}>
            <View style={styles.gridMetaItem}>
              <Clock size={12} color="#999999" />
              <Text style={[styles.gridMetaText, { fontFamily: "Inter_400Regular" }]}>
                {formatTime(recipe.cooking_time)}
              </Text>
            </View>
            <Text style={[styles.gridCategoryText, { fontFamily: "Inter_400Regular" }]}>
              {getCategory(recipe)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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
    clearStepInterval();
    stopRecording();
    // Only reset if not processing - let processing continue
    if (!isProcessing) {
      setStage("listening");
      setResults([]);
      setVibeText("");
      setInvalidMessage("");
      setActiveStep(0);
    }
    recordingAttemptedRef.current = false;
    setSheetIndex(-1);
    onClose();
  }, [onClose, isProcessing]);

  const handleRecipePress = (recipe) => {
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  // Fetch collections for Keep Recipe modal
  const { data: collectionsData } = useQuery({
    queryKey: ["collections", auth?.user?.id],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/collections?userId=${auth?.user?.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.jwt && { 'Authorization': `Bearer ${auth.jwt}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to fetch collections");
      }

      const result = await response.json();
      return result;
    },
    enabled: !!auth?.user?.id && showCollectionModal,
  });

  const allCollections = collectionsData?.data || [];
  const customCollections = allCollections.filter(c => c.collection_type === 'custom');
  const systemCollections = allCollections.filter(c => c.collection_type === 'system');
  
  // If no custom collections exist, show system collections but gray them out
  const collections = customCollections.length > 0 
    ? customCollections 
    : systemCollections;
  const shouldDisableSystemCollections = customCollections.length === 0 && systemCollections.length > 0;

  const toggleCollectionSelection = (collectionId) => {
    if (selectedCollectionIds.includes(collectionId)) {
      setSelectedCollectionIds(selectedCollectionIds.filter(id => id !== collectionId));
    } else {
      setSelectedCollectionIds([...selectedCollectionIds, collectionId]);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleKeepRecipe = (recipe, e) => {
    e?.stopPropagation(); // Prevent triggering recipe card press
    if (!auth?.user?.id) {
      Alert.alert("Sign In Required", "Please sign in to keep recipes", [
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    setSelectedRecipe(recipe);
    setShowCollectionModal(true);
  };

  const handleSaveAll = () => {
    if (!auth?.user?.id) {
      Alert.alert("Sign In Required", "Please sign in to save recipes");
      return;
    }

    if (results.length === 0) return;

    // Show collection selection modal first (use null to indicate "save all" mode)
    setSelectedRecipe(null);
    setShowCollectionModal(true);
  };

  const handleConfirmKeepRecipe = async () => {
    // Handle both single recipe and "save all" modes
    if (!selectedRecipe && results.length === 0) return;
    
    setIsSavingRecipe(true);
    setIsSavingAll(!selectedRecipe); // true if saving all, false if single
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      const apiUrl = getApiUrl();
      const recipesToSave = selectedRecipe ? [selectedRecipe] : results;
      const savedIds = new Set();
      let successCount = 0;
      let errorCount = 0;

      // Save each recipe
      for (let i = 0; i < recipesToSave.length; i++) {
        const recipe = recipesToSave[i];
        if (!selectedRecipe) {
          setSaveAllProgress(i + 1);
        }
        
        try {
          const response = await fetchWithRetry(`${apiUrl}/api/recipes/save-generated`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(auth?.jwt && { "Authorization": `Bearer ${auth.jwt}` }),
            },
            credentials: 'include',
            body: JSON.stringify({
              name: recipe.name,
              description: recipe.description,
              category: recipe.category,
              cuisine: recipe.cuisine,
              cooking_time: recipe.cooking_time,
              prep_time: recipe.prep_time,
              difficulty: recipe.difficulty,
              servings: recipe.servings,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              image_url: recipe.image_url,
              nutrition: recipe.nutrition,
              tags: recipe.tags || ["ai-generated", "voice-suggested"],
              collectionIds: selectedCollectionIds,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              savedIds.add(recipe.id);
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            const error = await response.json().catch(() => ({}));
            console.error(`Error saving recipe ${recipe.name}:`, error);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error saving recipe ${recipe.name}:`, error);
          errorCount++;
        }
      }

      // Update state
      setSavedRecipeIds(new Set([...savedRecipeIds, ...savedIds]));
      setIsSavingRecipe(false);
      setIsSavingAll(false);
      setShowCollectionModal(false);
      setSelectedRecipe(null);
      setSelectedCollectionIds([]);
      setSaveAllProgress(0);
      
      // Refetch collections cache to refresh MyRecipe page immediately
      queryClient.refetchQueries({ queryKey: ["collections", auth?.user?.id] });
      queryClient.refetchQueries({ queryKey: ["collection-recipes"] });
      
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Show success/error message
      if (selectedRecipe) {
        // Single recipe mode
        Alert.alert(
          "Recipe Kept!",
          "This recipe has been added to your collections.",
          [{ text: "OK" }]
        );
      } else {
        // Save all mode
        if (successCount > 0 && errorCount === 0) {
          Alert.alert(
            "All Recipes Saved!",
            `${successCount} recipe${successCount !== 1 ? 's' : ''} added to your collections.`,
            [{ text: "OK" }]
          );
        } else if (successCount > 0 && errorCount > 0) {
          Alert.alert(
            "Partially Saved",
            `${successCount} saved, ${errorCount} failed.`,
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "Error",
            "Failed to save recipes. Please try again.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      setIsSavingRecipe(false);
      setIsSavingAll(false);
      setSaveAllProgress(0);
      Alert.alert("Error", error.message || "Failed to save recipes");
    }
  };

  if (!fontsLoaded) return null;

  return (
    <>
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
          <View style={styles.headerLeft}>
            {stage === "results" && (
              <Image
                source={require("../../assets/images/icon.png")}
                style={{
                  width: 28,
                  height: 28,
                }}
                contentFit="contain"
              />
            )}
            <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
              {stage === "listening" && "I'm listening..."}
              {stage === "processing" && "Processing..."}
              {stage === "results" && "Here we go!"}
              {stage === "error" && "Oops!"}
            </Text>
          </View>
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
              {[
                { step: 0, label: "Got it!" },
                { step: 1, label: "The Chef is Finding the perfect recipes" },
                { step: 2, label: "Selecting top matches" },
                { step: 3, label: "Adding special touches" },
                { step: 4, label: "Almost there..." },
              ].map((stepConfig, index) => (
                <View key={index} style={styles.step}>
                  <View
                    style={[
                      styles.stepIcon,
                      activeStep > stepConfig.step && styles.stepIconCompleted,
                      activeStep === stepConfig.step && styles.stepIconActive,
                    ]}
                  >
                    {activeStep > stepConfig.step ? (
                      <Text style={styles.checkmark}>✓</Text>
                    ) : activeStep === stepConfig.step ? (
                      <View style={styles.stepDotActive} />
                    ) : (
                      <View style={styles.stepDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      { fontFamily: "Inter_400Regular" },
                      activeStep > stepConfig.step && styles.stepTextCompleted,
                      activeStep === stepConfig.step && styles.stepTextActive,
                    ]}
                  >
                    {stepConfig.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelRequest}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results Stage */}
        {stage === "results" && (
          <View style={styles.resultsContainer}>
            <TouchableOpacity 
              onPress={() => setIsQueryExpanded(!isQueryExpanded)}
              activeOpacity={0.7}
              style={styles.queryContainer}
            >
              <Text
                style={[
                  styles.resultsSubtitle,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                Based on '{isQueryExpanded || vibeText.length <= 100 
                  ? vibeText 
                  : `${vibeText.substring(0, 100)}...`}'
              </Text>
              {vibeText.length > 100 && (
                <Text style={styles.expandText}>
                  {isQueryExpanded ? "Show less" : "Show more"}
                </Text>
              )}
            </TouchableOpacity>

            <FlatList
              data={results}
              renderItem={renderRecipeCard}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={true}
              ListFooterComponent={
            <View style={[styles.resultsActions, { paddingBottom: insets.bottom + 80 }]}>
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
                style={[styles.saveAllButton, (isSavingAll || results.length === 0) && styles.saveAllButtonDisabled]}
                onPress={handleSaveAll}
                disabled={isSavingAll || results.length === 0}
              >
                {isSavingAll ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text
                      style={[
                        styles.saveAllText,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      Saving... ({saveAllProgress}/{results.length})
                    </Text>
                  </>
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.saveAllText,
                        { fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      Save All
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
              }
            />
          </View>
        )}

        {/* Error Stage - Invalid Input */}
        {stage === "error" && invalidMessage && (
          <ScrollView
            style={styles.resultsContainer}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity 
              onPress={() => setIsQueryExpanded(!isQueryExpanded)}
              activeOpacity={0.7}
              style={styles.queryContainer}
            >
              <Text
                style={[
                  styles.resultsSubtitle,
                  { fontFamily: "Inter_400Regular" },
                ]}
              >
                Based on '{isQueryExpanded || vibeText.length <= 100 
                  ? vibeText 
                  : `${vibeText.substring(0, 100)}...`}'
              </Text>
              {vibeText.length > 100 && (
                <Text style={styles.expandText}>
                  {isQueryExpanded ? "Show less" : "Show more"}
                </Text>
              )}
            </TouchableOpacity>

            <ErrorState
              title="Oops!"
              message={invalidMessage}
              onRetry={handleTryAgain}
              retryText="Try Again"
            />
          </ScrollView>
        )}
          </BottomSheetView>
        </View>
      </BlurView>
    </BottomSheet>

    {/* Collection Selection Modal */}
    <Modal
      visible={showCollectionModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCollectionModal(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {selectedRecipe ? "Select Collections" : `Save All ${results.length} Recipe${results.length !== 1 ? 's' : ''}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCollectionModal(false);
                  setSelectedCollectionIds([]);
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Collections List */}
            <ScrollView style={styles.modalCollectionsList}>
              {collections.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Text
                    style={[
                      styles.modalEmptyText,
                      { fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    No collections available. Create one in My Recipes.
                  </Text>
                </View>
              ) : (
                collections.map((collection) => {
                  const isSelected = selectedCollectionIds.includes(collection.id);
                  const isDisabled = shouldDisableSystemCollections && collection.collection_type === 'system';
                  return (
                    <TouchableOpacity
                      key={collection.id}
                      style={[
                        styles.modalCollectionItem,
                        isSelected && styles.modalCollectionItemSelected,
                        isDisabled && styles.modalCollectionItemDisabled,
                      ]}
                      onPress={() => !isDisabled && toggleCollectionSelection(collection.id)}
                      disabled={isDisabled}
                    >
                      <Folder
                        size={20}
                        color={isSelected ? "#FFFFFF" : (isDisabled ? "#CCCCCC" : "#666666")}
                      />
                      <Text
                        style={[
                          styles.modalCollectionItemText,
                          { fontFamily: "Inter_500Medium" },
                          isSelected && styles.modalCollectionItemTextSelected,
                          isDisabled && styles.modalCollectionItemTextDisabled,
                        ]}
                      >
                        {collection.name}
                      </Text>
                      {isSelected && <Check size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCollectionModal(false);
                  setSelectedCollectionIds([]);
                }}
              >
                <Text
                  style={[
                    styles.modalCancelButtonText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  isSavingRecipe && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleConfirmKeepRecipe}
                disabled={isSavingRecipe}
              >
                {isSavingRecipe ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.modalConfirmButtonText,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {selectedRecipe ? "Keep Recipe (Generated)" : `Save All ${results.length} Recipe${results.length !== 1 ? 's' : ''}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    
    {/* Upgrade Prompt */}
    <UpgradePrompt
      visible={showUpgradePrompt}
      onClose={() => setShowUpgradePrompt(false)}
      feature="voice_suggestions"
      usage={upgradeUsage}
    />
    </>
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  queryContainer: {
    marginBottom: 20,
    paddingTop: 20,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 4,
  },
  expandText: {
    fontSize: 14,
    color: "#FF9F1C",
    marginTop: 4,
  },
  recipeCardWrapper: {
    marginBottom: 16,
  },
  recipeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  keepRecipeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FF9F1C",
  },
  keepRecipeButtonSaved: {
    backgroundColor: "#FF9F1C",
    borderColor: "#FF9F1C",
  },
  keepRecipeButtonText: {
    fontSize: 14,
    color: "#FF9F1C",
    marginLeft: 6,
  },
  keepRecipeButtonTextSaved: {
    color: "#FFFFFF",
  },
  recipeImage: {
    width: 100,
    height: 100,
    backgroundColor: "#F8F9FA",
  },
  recipeImagePlaceholder: {
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
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
  saveAllButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9F1C",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveAllButtonDisabled: {
    opacity: 0.6,
  },
  saveAllText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    color: "#000000",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCollectionsList: {
    maxHeight: 400,
    padding: 20,
  },
  modalEmptyState: {
    padding: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  modalCollectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    marginBottom: 12,
  },
  modalCollectionItemSelected: {
    backgroundColor: "#FF9F1C",
  },
  modalCollectionItemDisabled: {
    backgroundColor: "#F5F5F5",
    opacity: 0.6,
  },
  modalCollectionItemText: {
    fontSize: 16,
    color: "#000000",
    marginLeft: 12,
    flex: 1,
  },
  modalCollectionItemTextSelected: {
    color: "#FFFFFF",
  },
  modalCollectionItemTextDisabled: {
    color: "#999999",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: "#000000",
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#FF9F1C",
    alignItems: "center",
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  // Grid Layout Styles
  gridContent: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: 0,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: CARD_MARGIN * 2,
  },
  gridRecipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridImageContainer: {
    position: "relative",
    width: "100%",
    height: 180,
  },
  gridRecipeImage: {
    width: "100%",
    height: "100%",
  },
  gridPlaceholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  gridHeartBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  gridRecipeInfo: {
    padding: 12,
  },
  gridRecipeTitle: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 8,
    minHeight: 44,
    lineHeight: 20,
  },
  gridRecipeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gridMetaText: {
    fontSize: 11,
    color: "#999999",
  },
  gridCategoryText: {
    fontSize: 11,
    color: "#999999",
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666666",
  },
});

