module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!@react-native|react-native|@react-navigation)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect']
};
