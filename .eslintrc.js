module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }]
  },
  overrides: [
    {
      // Gatherer files contain page.evaluate() callbacks that run in browser context
      files: ['src/gatherers/**/*.js'],
      env: {
        browser: true,
        node: true
      }
    },
    {
      // Legacy UI file runs in browser
      files: ['src/ui/public/**/*.js'],
      env: {
        browser: true
      }
    }
  ]
};
