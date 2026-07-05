import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        __BUILD_SHA__: 'readonly',
        __BUILD_DATE__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // TypeScript components (Phase 5): typescript-eslint's parser replaces
    // the default one so ESLint understands TS syntax; the recommended
    // configs disable core rules that TS itself enforces better (e.g.
    // no-undef) and add TS-specific ones. Type-AWARE linting (rules that
    // need the type checker) is deliberately not enabled - `tsc --noEmit`
    // already runs in CI and covers that ground.
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        __BUILD_SHA__: 'readonly',
        __BUILD_DATE__: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.{js,ts}', 'tests/**/*'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
