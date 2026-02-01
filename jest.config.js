const reporters = ['default'];
if (process.env.CI === 'true') {
  reporters.push([
    'jest-junit',
    {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      suiteName: 'Jest tests',
    },
  ]);
}

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  reporters,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo/.*|@expo/html-elements)',
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
