#!/usr/bin/env node
/**
 * Applies fixes for Expo Android build:
 * 1. expo-module-gradle-plugin not found: copy patched build.gradle for expo-font and expo-asset
 * 2. expo-modules-core compileReleaseKotlin: disable "warnings as errors" so Kotlin warnings don't fail the build
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const patchesDir = path.join(root, 'patches');
const nodeModules = path.join(root, 'node_modules');

// Copy patched build.gradle files
const fixes = [
  { from: path.join(patchesDir, 'expo-font-build.gradle'), to: path.join(nodeModules, 'expo-font', 'android', 'build.gradle') },
  { from: path.join(patchesDir, 'expo-asset-build.gradle'), to: path.join(nodeModules, 'expo-asset', 'android', 'build.gradle') },
];

for (const { from, to } of fixes) {
  if (fs.existsSync(from) && fs.existsSync(path.dirname(to))) {
    fs.copyFileSync(from, to);
    console.log('Applied gradle fix:', path.relative(root, to));
  }
}

// Disable "allWarningsAsErrors" in expo-modules-core so Kotlin warnings don't fail compileReleaseKotlin
const expoCoreBuild = path.join(nodeModules, 'expo-modules-core', 'android', 'build.gradle');
if (fs.existsSync(expoCoreBuild)) {
  let content = fs.readFileSync(expoCoreBuild, 'utf8');
  if (content.includes('if (shouldTurnWarningsIntoErrors)') && !content.includes('if (false && shouldTurnWarningsIntoErrors)')) {
    content = content.replace('if (shouldTurnWarningsIntoErrors)', 'if (false && shouldTurnWarningsIntoErrors)');
    fs.writeFileSync(expoCoreBuild, content);
    console.log('Applied gradle fix: expo-modules-core android/build.gradle (disabled warnings-as-errors)');
  }
}
