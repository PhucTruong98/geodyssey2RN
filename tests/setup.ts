import '@testing-library/react-native/extend-expect';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => require('react-native-gesture-handler/jest-utils'));

// Mock expo modules
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ code: 'USA' }),
}));

// Mock react-native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.useColorScheme = jest.fn(() => 'light');
  return RN;
});