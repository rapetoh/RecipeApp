// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .lottie as an asset extension for Lottie animations
config.resolver.assetExts.push('lottie');

module.exports = config;

