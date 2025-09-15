module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|react-native-svg|zustand|@tanstack).*)'
  ],
  testEnvironment: 'node',
};