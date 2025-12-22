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

// Fix Color extensions in BOTH expo-dev-menu AND expo-dev-launcher
const packagesToFix = [
  { name: 'expo-dev-menu', path: path.join(__dirname, '..', 'node_modules', 'expo-dev-menu', 'ios') },
  { name: 'expo-dev-launcher', path: path.join(__dirname, '..', 'node_modules', 'expo-dev-launcher', 'ios') },
];

const allFilesToFix = [];
packagesToFix.forEach(pkg => {
  const files = findSwiftFiles(pkg.path);
  allFilesToFix.push(...files.map(f => ({ file: f, package: pkg.name, basePath: pkg.path })));
});

const filesToFix = allFilesToFix;

function fixFile(fileInfo) {
  const filePath = fileInfo.file || fileInfo; // Support both old and new format
  const basePath = fileInfo.basePath || path.dirname(filePath);
  
  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Use a single comprehensive regex to catch ALL Color.expo* patterns
  // This handles: expoSystemBackground, expoSecondarySystemBackground, 
  // expoSystemGray6, expoSecondarySystemGroupedBackground, expoSystemGroupedBackground, etc.
  const colorExpoPattern = /Color\.expo(\w+)/g;
  
  if (colorExpoPattern.test(content)) {
    // Reset the regex lastIndex since we tested it
    colorExpoPattern.lastIndex = 0;
    
    // Replace all Color.expo* with Color(UIColor.*)
    content = content.replace(colorExpoPattern, (match, propertyName) => {
      // Convert camelCase property name to UIKit equivalent
      // Examples:
      // expoSystemBackground -> systemBackground
      // expoSecondarySystemBackground -> secondarySystemBackground
      // expoSystemGray6 -> systemGray6
      // expoSecondarySystemGroupedBackground -> secondarySystemGroupedBackground
      // expoSystemGroupedBackground -> systemGroupedBackground
      const uikitName = propertyName.charAt(0).toLowerCase() + propertyName.slice(1);
      return `Color(UIColor.${uikitName})`;
    });
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    const packageName = fileInfo.package || 'unknown';
    const relativePath = path.relative(basePath, filePath);
    console.log(`Fixed Color extensions in ${packageName}/${relativePath}`);
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
  console.log('No Swift files found in expo-dev-menu or expo-dev-launcher (packages may not be installed)');
} else if (fixedCount === 0) {
  console.log(`Checked ${checkedCount} Swift file(s) - no Color extension issues found`);
} else {
  console.log(`Fixed Color extensions in ${fixedCount} of ${checkedCount} Swift file(s)`);
}

