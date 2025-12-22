#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find ALL Swift files in expo-dev-menu that might have Color extension issues
function findSwiftFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findSwiftFiles(filePath, fileList);
    } else if (file.endsWith('.swift')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const expoDevMenuPath = path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios');
const filesToFix = findSwiftFiles(expoDevMenuPath);

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Define all Color extension replacements - comprehensive list
  // Order matters: specific ones first, then generic pattern
  const specificReplacements = [
    { pattern: /Color\.expoSecondarySystemBackground/g, replacement: 'Color(UIColor.secondarySystemBackground)' },
    { pattern: /Color\.expoSystemBackground/g, replacement: 'Color(UIColor.systemBackground)' },
    { pattern: /Color\.expoSystemGray6/g, replacement: 'Color(UIColor.systemGray6)' },
    { pattern: /Color\.expoSystemGray5/g, replacement: 'Color(UIColor.systemGray5)' },
    { pattern: /Color\.expoSystemGray4/g, replacement: 'Color(UIColor.systemGray4)' },
    { pattern: /Color\.expoSystemGray3/g, replacement: 'Color(UIColor.systemGray3)' },
    { pattern: /Color\.expoSystemGray2/g, replacement: 'Color(UIColor.systemGray2)' },
    { pattern: /Color\.expoSystemGray/g, replacement: 'Color(UIColor.systemGray)' },
  ];
  
  // Apply specific replacements first
  for (const { pattern, replacement } of specificReplacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }
  
  // Handle any other expo* Color extensions generically (catch-all)
  const genericPattern = /Color\.expo(\w+)/g;
  const genericMatches = content.match(genericPattern);
  if (genericMatches) {
    genericMatches.forEach(match => {
      const propertyName = match.match(/Color\.expo(\w+)/)[1];
      // Convert camelCase to proper UIKit name (e.g., ExpoSystemGray -> systemGray)
      const uikitName = propertyName.charAt(0).toLowerCase() + propertyName.slice(1);
      const replacement = `Color(UIColor.${uikitName})`;
      content = content.replace(match, replacement);
      modified = true;
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed Color extensions in ${path.relative(expoDevMenuPath, filePath)}`);
    return true;
  }
  
  return false;
}

let fixedCount = 0;
let checkedCount = 0;

for (const filePath of filesToFix) {
  checkedCount++;
  if (fixFile(filePath)) {
    fixedCount++;
  }
}

if (checkedCount === 0) {
  console.log('No Swift files found in expo-dev-menu (package may not be installed)');
} else if (fixedCount === 0) {
  console.log(`Checked ${checkedCount} Swift file(s) - no Color extension issues found`);
} else {
  console.log(`Fixed Color extensions in ${fixedCount} of ${checkedCount} Swift file(s)`);
}

