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
  
  // First, fix the super.init call to remove releaseLevel parameter (do this FIRST)
  // Handle: super.init(delegate: delegate, releaseLevel: releaseLevel)
  if (content.includes('super.init(delegate: delegate, releaseLevel: releaseLevel)')) {
    content = content.replace(
      /super\.init\(delegate:\s*delegate,\s*releaseLevel:\s*releaseLevel\)/g,
      'super.init(delegate: delegate)'
    );
    modified = true;
  }
  
  // Also handle: super.init(delegate: delegate, releaseLevel: someValue)
  const swiftSuperInitPattern = /super\.init\(delegate:\s*delegate,\s*releaseLevel:\s*[^)]+\)/g;
  if (swiftSuperInitPattern.test(content)) {
    content = content.replace(swiftSuperInitPattern, 'super.init(delegate: delegate)');
    modified = true;
  }
  
  // Now remove the releaseLevel variable declaration block (more carefully using line-by-line)
  // This is safer than regex which might remove too much
  const lines = content.split('\n');
  let newLines = [];
  let inReleaseLevelBlock = false;
  let blockStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line starts the releaseLevel declaration
    if (line.includes('let releaseLevel = (Bundle.main.object(forInfoDictionaryKey: "ReactNativeReleaseLevel")')) {
      inReleaseLevelBlock = true;
      blockStartIndex = i;
      // Skip this line
      continue;
    }
    
    // If we're in the releaseLevel block, skip lines until we find the ?? RCTReleaseLevel.Stable line
    if (inReleaseLevelBlock) {
      if (line.includes('?? RCTReleaseLevel.Stable')) {
        inReleaseLevelBlock = false;
        // Skip this line too
        continue;
      }
      // Skip all lines in between
      continue;
    }
    
    newLines.push(line);
  }
  
  // If we removed lines, update content
  if (newLines.length !== lines.length) {
    content = newLines.join('\n');
    modified = true;
  }
  
  // Remove Objective-C variable declarations with RCTReleaseLevel
  const objcVarPattern = /RCTReleaseLevel\s+releaseLevel\s*=\s*RCTReleaseLevel\.(Stable|Experimental|Canary)\s*;/g;
  if (objcVarPattern.test(content)) {
    content = content.replace(objcVarPattern, '');
    modified = true;
  }
  
  // Remove Objective-C enum references
  const enumPattern = /RCTReleaseLevel\.(Stable|Experimental|Canary)/g;
  if (enumPattern.test(content)) {
    content = content.replace(enumPattern, '');
    modified = true;
  }
  
  // Fix Objective-C method calls
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
  
  // Remove any remaining releaseLevel: parameter (with comma)
  const remainingReleaseLevelPattern = /,\s*releaseLevel:\s*[^,\])]+/g;
  if (remainingReleaseLevelPattern.test(content)) {
    content = content.replace(remainingReleaseLevelPattern, '');
    modified = true;
  }
  
  // Clean up
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/\[\s*\]/g, '[]');
  content = content.replace(/\s{2,}/g, ' ');
  
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

