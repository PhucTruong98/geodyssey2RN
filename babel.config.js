module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      // 'react-native-worklets/plugin',
      'expo-router/babel',
      'react-native-reanimated/plugin', // keep LAST

    ],
  };
};