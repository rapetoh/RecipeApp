#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Try specific known file paths - add EXDevLauncherController.m
const possibleFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo', 'ios', 'AppDelegates', 'ExpoReactNativeFactory.swift'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-launcher', 'ios', 'EXDevLauncherReactNativeFactory.swift'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-launcher', 'ios', 'EXDevLauncherReactNativeFactory.m'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-launcher', 'ios', 'EXDevLauncherReactNativeFactory.mm'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-launcher', 'ios', 'EXDevLauncherController.m'),
];

// Filter to only existing files
const filesToFix = possibleFiles.filter(file => {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
});

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  console.log(`Fixing RCTReleaseLevel issue in ${path.basename(filePath)}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Remove Swift lines that define releaseLevel using RCTReleaseLevel
  const releaseLevelPattern = /(\s+)let releaseLevel = \(Bundle\.main\.object\(forInfoDictionaryKey: "ReactNativeReleaseLevel"\) as\? String\)\s+\.flatMap \{ \[[\s\S]*?\}\s+\?\? RCTReleaseLevel\.Stable\s*/;
  
  if (releaseLevelPattern.test(content)) {
    content = content.replace(releaseLevelPattern, '');
    modified = true;
  }
  
  // Remove Objective-C variable declarations with RCTReleaseLevel
  // Pattern: RCTReleaseLevel releaseLevel = RCTReleaseLevel.Stable;
  const objcVarPattern = /RCTReleaseLevel\s+releaseLevel\s*=\s*RCTReleaseLevel\.(Stable|Experimental|Canary)\s*;/g;
  if (objcVarPattern.test(content)) {
    content = content.replace(objcVarPattern, '');
    modified = true;
  }
  
  // Remove Objective-C enum references (RCTReleaseLevel.Canary, etc.)
  const enumPattern = /RCTReleaseLevel\.(Stable|Experimental|Canary)/g;
  if (enumPattern.test(content)) {
    content = content.replace(enumPattern, '');
    modified = true;
  }
  
  // Fix Objective-C method calls with releaseLevel parameter
  // Pattern: [factory initWithDelegate:delegate releaseLevel:releaseLevel]
  const objcMethodPattern = /\[([^\]]+)\s+initWithDelegate:\s*([^\s]+)\s+releaseLevel:\s*([^\]]+)\]/g;
  if (objcMethodPattern.test(content)) {
    content = content.replace(objcMethodPattern, '[$1 initWithDelegate:$2]');
    modified = true;
  }
  
  // Fix self = [super initWithDelegate:delegate releaseLevel:releaseLevel]
  const superInitPattern = /self\s*=\s*\[super\s+initWithDelegate:\s*([^\s]+)\s+releaseLevel:\s*([^\]]+)\]/g;
  if (superInitPattern.test(content)) {
    content = content.replace(superInitPattern, 'self = [super initWithDelegate:$1]');
    modified = true;
  }
  
  // Remove any remaining releaseLevel: parameter from method calls
  const remainingReleaseLevelPattern = /releaseLevel:\s*[^,\]]+/g;
  if (remainingReleaseLevelPattern.test(content)) {
    content = content.replace(remainingReleaseLevelPattern, '');
    modified = true;
  }
  
  // Clean up any double spaces, commas, or brackets left behind
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/\[\s*\]/g, '[]');
  content = content.replace(/\s{2,}/g, ' ');
  
  // Fix Swift style super.init call to remove releaseLevel parameter
  if (content.includes('super.init(delegate: delegate, releaseLevel: releaseLevel)')) {
    content = content.replace(
      /super\.init\(delegate: delegate, releaseLevel: releaseLevel\)/g,
      'super.init(delegate: delegate)'
    );
    modified = true;
  }
  
  // Remove any standalone references to releaseLevel variable (but keep ReactNativeReleaseLevel string keys)
  if (content.includes('releaseLevel') && !content.includes('ReactNativeReleaseLevel')) {
    // Remove lines that just reference releaseLevel variable assignment
    const standalonePattern = /^\s*releaseLevel\s*=[^;]+;?\s*$/gm;
    if (standalonePattern.test(content)) {
      content = content.replace(standalonePattern, '');
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully fixed ${path.basename(filePath)}`);
    return true;
  }
  
  return false;
}

let fixedCount = 0;
for (const filePath of filesToFix) {
  if (fixFile(filePath)) {
    fixedCount++;
  }
}

if (fixedCount === 0) {
  console.log('No RCTReleaseLevel issues found (may have been fixed already)');
} else {
  console.log(`Fixed ${fixedCount} file(s)`);
}

