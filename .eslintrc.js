module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  parserOptions: { ecmaVersion: 2024, sourceType: 'module' },
  env: { node: true, jest: true, browser: true, es2024: true },
  settings: { react: { version: 'detect' } },
  rules: { 'no-unused-vars': ['warn'], 'react/prop-types': 'off' }
};
