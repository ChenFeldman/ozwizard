import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // `web/` has its own React/Vite toolchain; Playwright writes report dirs.
    // The eval `subject.ts` files are review fixtures, not app code — they are
    // deliberately wrong, and they are outside `tsconfig`'s `include`.
    ignores: [
      'dist',
      'node_modules',
      'data',
      'coverage',
      'web',
      'playwright-report',
      'test-results',
      '.claude/skills/deep-review/evals/cases/**/subject.ts',
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
