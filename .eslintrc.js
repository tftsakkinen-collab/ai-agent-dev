module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
  env: { node: true, jest: true },
  rules: { 'no-unused-vars': ['warn'], 'react/prop-types': 'off' }
};
