const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude test files from the bundle so they never get loaded by the dev server
const defaultBlockList = config.resolver.blockList;
const existing = Array.isArray(defaultBlockList)
  ? defaultBlockList
  : defaultBlockList != null
    ? [defaultBlockList]
    : [];
config.resolver.blockList = [
  ...existing,
  /__tests__\/.*/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
];

module.exports = config;
