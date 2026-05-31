module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  settings: {
    node: {
      version: '>=20.0.0',
    },
  },
  plugins: ['security', 'node'],
  extends: ['eslint:recommended', 'plugin:node/recommended'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-process-exit': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
  },
  overrides: [
    {
      files: ['tests/**', 'vitest.config.js'],
      rules: {
        'node/no-unpublished-import': 'off',
        'node/no-missing-import': 'off',
      },
    },
  ],
}
