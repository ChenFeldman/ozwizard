import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // `web/` has its own React/Vite toolchain; Playwright writes report dirs.
    ignores: [
      'dist',
      'node_modules',
      'data',
      'coverage',
      'web',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    // Plain Node scripts (build helpers) run outside TS type-awareness.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
  }
);
