import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
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
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // New in eslint-plugin-react-hooks v7's recommended config; flags
    // existing effect patterns in these three components. They're rewritten
    // in the Phase 5 UX pass (out of scope for this dependency-upgrade
    // session), so scoped to a warning here rather than downgraded
    // repo-wide - new violations elsewhere still fail lint as errors.
    files: [
      'src/components/BottomSheet.jsx',
      'src/components/Map.jsx',
      'src/components/PoiEditorSheet.jsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
