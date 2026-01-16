import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SplashScreen({ fontsLoaded = true }) {
  return (
    <View style={styles.container}>
      {/* Chef Animation */}
      <View style={styles.animationContainer}>
        <LottieView
          source={require('@/assets/chef-splash.lottie')}
          autoPlay
          loop
          speed={0.5}
          style={styles.animation}
        />
      </View>

      {/* App Name */}
      <View style={styles.nameContainer}>
        <Text style={[styles.appName, fontsLoaded && { fontFamily: 'Inter_700Bold' }]}>
          PocketChef
        </Text>
        <View style={styles.orangeDot} />
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
  animationContainer: {
    marginBottom: 24,
  },
  animation: {
    width: 160,
    height: 160,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 34,
    color: '#1A1A1A',
    letterSpacing: -0.5,
    fontWeight: '700',
  },
  orangeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF9F1C',
    marginLeft: 4,
    marginTop: 4,
  },
});

