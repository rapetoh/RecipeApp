import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import LottieView from 'lottie-react-native';

/**
 * Branded error state component with chef animation
 * 
 * @param {string} title - Error title (default: "Oops!")
 * @param {string} message - Error description
 * @param {function} onRetry - Optional retry callback
 * @param {string} retryText - Custom retry button text (default: "Try Again")
 * @param {boolean} compact - Smaller version for inline errors
 */
export default function ErrorState({
  title = "Oops!",
  message = "Something went wrong. Please try again.",
  onRetry,
  retryText = "Try Again",
  compact = false,
}) {
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <LottieView
          source={require('@/assets/chef-animation.lottie')}
          autoPlay
          loop
          speed={0.5}
          style={styles.compactAnimation}
        />
        <View style={styles.compactTextContainer}>
          <Text style={styles.compactTitle}>{title}</Text>
          <Text style={styles.compactMessage}>{message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Chef Animation */}
      <View style={styles.animationContainer}>
        <LottieView
          source={require('@/assets/chef-animation.lottie')}
          autoPlay
          loop
          speed={0.5}
          style={styles.animation}
        />
      </View>

      {/* Error Content */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {/* Retry Button */}
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Full error state
  container: {
    backgroundColor: '#FFF9F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  animationContainer: {
    marginBottom: 16,
  },
  animation: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF9F1C',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Compact version (for inline errors)
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 12,
    marginVertical: 8,
  },
  compactAnimation: {
    width: 50,
    height: 50,
  },
  compactTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  compactMessage: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
});

