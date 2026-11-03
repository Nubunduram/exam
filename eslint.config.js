// eslint.config.js : analyse statique des services Node (backend, gateway, microservices).
// Le frontend est analysé par la configuration ESLint de react-scripts (eslintConfig dans frontend/package.json).
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['**/node_modules/**', 'frontend/**', 'docs/**', '**/logs/**'],
  },
  js.configs.recommended,
  {
    files: ['backend/**/*.js', 'gateway/**/*.js', 'microservices/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$', ignoreRestSiblings: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Scripts en ligne de commande : l'affichage console est leur sortie normale
    files: ['backend/seeder.js', 'backend/createAdmin.js'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['backend/tests/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier, // désactive les règles de style gérées par Prettier
];
