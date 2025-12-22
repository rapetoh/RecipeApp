#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'expo-dev-launcher', 'ios', 'ReactDelegateHandler', 'ExpoDevLauncherReactDelegateHandler.swift');

if (!fs.existsSync(filePath)) {
  console.log('ExpoDevLauncherReactDelegateHandler.swift not found');
  process.exit(0);
}

console.log('Fixing ExpoReactDelegate.reactNativeFactory issue...');

let content = fs.readFileSync(filePath, 'utf8');
const originalContent = content;
let modified = false;

// Fix: Remove references to reactDelegate?.reactNativeFactory which doesn't exist in SDK 53
if (content.includes('reactDelegate?.reactNativeFactory')) {
  // Fix line 58: Remove the fallback to reactDelegate?.reactNativeFactory
  content = content.replace(
    /appDelegate\?\.factory as\? RCTReactNativeFactory \?\? reactDelegate\?\.reactNativeFactory as\? RCTReactNativeFactory/g,
    'appDelegate?.factory as? RCTReactNativeFactory'
  );
  modified = true;
  
  // Fix line 85: Remove the if branch that uses reactDelegate?.reactNativeFactory
  // Replace it with a fatalError since this code path can't work
  content = content.replace(
    /if let factory = reactDelegate\?\.reactNativeFactory \{[^}]*\}/g,
    '// Removed: reactDelegate?.reactNativeFactory does not exist in SDK 53\n        fatalError("reactDelegate.reactNativeFactory is not available in this SDK version")'
  );
  
  // Also handle multi-line version
  const lines = content.split('\n');
  let newLines = [];
  let inInvalidIf = false;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('if let factory = reactDelegate?.reactNativeFactory')) {
      inInvalidIf = true;
      braceCount = (line.match(/\{/g) || []).length;
      // Skip this entire if block - it will fall through to the fatalError below
      continue;
    }
    
    if (inInvalidIf) {
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      if (braceCount <= 0) {
        inInvalidIf = false;
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  content = newLines.join('\n');
  modified = true;
}

if (modified) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully fixed ExpoDevLauncherReactDelegateHandler.swift');
} else {
  console.log('No fixes needed in ExpoDevLauncherReactDelegateHandler.swift');
}

