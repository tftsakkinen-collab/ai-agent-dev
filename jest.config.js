module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!@react-native|react-native|@react-navigation)'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect']
};
