import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SplashScreen({ fontsLoaded = true }) {
  // Fonts are loaded at root level (_layout.jsx), but we provide fallback
  // in case fonts aren't loaded yet (shouldn't happen, but safety first)

  return (
    <View style={styles.container}>
      {/* Logo Container */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          {/* Three vertical bars (audio equalizer style) */}
          <View style={styles.barsContainer}>
            <View style={[styles.bar, styles.bar1]} />
            <View style={[styles.bar, styles.bar2]} />
            <View style={[styles.bar, styles.bar3]} />
          </View>
        </View>
      </View>

      {/* App Name */}
      <Text style={[styles.appName, fontsLoaded && { fontFamily: 'Inter_700Bold' }]}>
        ChefVibe
      </Text>

      {/* Tagline */}
      <Text style={[styles.tagline, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
        Your personal chef, powered by voice & vibe.
      </Text>

      {/* Loading Button/Indicator */}
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          SETTING THE MOOD...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    height: 40,
  },
  bar: {
    width: 6,
    backgroundColor: '#FF9F1C',
    borderRadius: 3,
  },
  bar1: {
    height: 24,
  },
  bar2: {
    height: 32,
  },
  bar3: {
    height: 20,
  },
  appName: {
    fontSize: 36,
    color: '#000000',
    marginBottom: 16,
    letterSpacing: -0.5,
    fontWeight: '700', // Fallback if font not loaded
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 60,
    paddingHorizontal: 20,
    fontWeight: '400', // Fallback if font not loaded
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    backgroundColor: '#FFF5E6',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#999999',
    letterSpacing: 1,
    fontWeight: '600', // Fallback if font not loaded
  },
});

