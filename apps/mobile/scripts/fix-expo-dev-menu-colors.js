#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files in expo-dev-menu that use the custom Color extensions
const possibleFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios', 'SwiftUI', 'CustomItems.swift'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios', 'SwiftUI', 'DevMenuAppInfo.swift'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios', 'SwiftUI', 'DevMenuButtons.swift'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios', 'SwiftUI', 'DevMenuDeveloperTools.swift'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios', 'SwiftUI', 'DevMenuRNDevMenu.swift'),
  path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios', 'SwiftUI', 'HostUrl.swift'),
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

  console.log(`Fixing Color extensions in ${path.basename(filePath)}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Replace Color.expoSecondarySystemBackground with Color(UIColor.secondarySystemBackground)
  if (content.includes('Color.expoSecondarySystemBackground')) {
    content = content.replace(
      /Color\.expoSecondarySystemBackground/g,
      'Color(UIColor.secondarySystemBackground)'
    );
    modified = true;
  }
  
  // Replace Color.expoSystemBackground with Color(UIColor.systemBackground)
  if (content.includes('Color.expoSystemBackground')) {
    content = content.replace(
      /Color\.expoSystemBackground/g,
      'Color(UIColor.systemBackground)'
    );
    modified = true;
  }
  
  // Replace Color.expoSystemGray6 with Color(UIColor.systemGray6) if it exists
  if (content.includes('Color.expoSystemGray6')) {
    content = content.replace(
      /Color\.expoSystemGray6/g,
      'Color(UIColor.systemGray6)'
    );
    modified = true;
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
  console.log('No Color extension issues found (may have been fixed already or files not present)');
} else {
  console.log(`Fixed ${fixedCount} file(s)`);
}

