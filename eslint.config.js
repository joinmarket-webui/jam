// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import js from '@eslint/js'
import compat from 'eslint-plugin-compat'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import storybook from 'eslint-plugin-storybook'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['dist', './.storybook/**', './storybook-static/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Allow unused variables when they start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '_ignoredOnPurpose',
        },
      ],
    },
  },
  {
    extends: [eslintPluginUnicorn.configs.recommended],
    ignores: ['./src/components/ui/*.tsx'],
    rules: {
      'unicorn/filename-case': ['off'],
      'unicorn/no-array-reduce': ['off'],
      'unicorn/no-array-for-each': ['off'],
      'unicorn/prefer-optional-catch-binding': ['off'],
      'unicorn/prefer-string-slice': ['off'],
      'unicorn/catch-error-name': [
        'error',
        {
          ignore: [
            '^error\\d*$',
            '_ignoredOnPurpose',
            'e', // TODO: remove
          ],
        },
      ],
      'unicorn/numeric-separators-style': [
        'error',
        {
          onlyIfContainsSeparator: true, // TODO: set to false
          number: {
            minimumDigits: 4,
            groupLength: 3,
          },
        },
      ],

      'unicorn/switch-case-braces': ['off'], // TODO: enable
      'unicorn/prevent-abbreviations': ['off'], // TODO: enable
      'unicorn/no-useless-undefined': ['off'], // TODO: enable
      'unicorn/no-null': ['off'], // TODO: enable
      'unicorn/no-array-sort': ['off'], // TODO: enable
      'unicorn/no-null': ['off'], // TODO: enable
      'unicorn/no-null': ['off'], // TODO: enable
      'unicorn/no-null': ['off'], // TODO: enable
      'unicorn/prefer-number-properties': ['off'], // TODO: enable
      'unicorn/no-array-reverse': ['off'], // TODO: enable
      'unicorn/prefer-array-some': ['off'], // TODO: enable
      'unicorn/prefer-at': ['off'], // TODO: enable
      'unicorn/no-negated-condition': ['off'], // TODO: enable
      'unicorn/consistent-function-scoping': ['off'], // TODO: enable
      'unicorn/no-array-callback-reference': ['off'], // TODO: enable
      'unicorn/prefer-export-from': ['off'], // TODO: enable
      'unicorn/no-useless-fallback-in-spread': ['off'], // TODO: enable
      'unicorn/prefer-query-selector': ['off'], // TODO: enable

      'unicorn/prefer-ternary': ['off'], // TODO: enable
      'unicorn/prefer-includes': ['off'], // TODO: enable
      'unicorn/prefer-global-this': ['off'], // TODO: enable
      'unicorn/prefer-node-protocol': ['off'], // TODO: enable
      'unicorn/no-thenable': ['off'], // TODO: enable
      'unicorn/no-nested-ternary': ['off'], // TODO: enable
      'unicorn/prefer-spread': ['off'], // TODO: enable
      'unicorn/prefer-string-replace-all': ['off'], // TODO: enable
      'unicorn/no-useless-promise-resolve-reject': ['off'], // TODO: enable
      'unicorn/prefer-dom-node-append': ['off'], // TODO: enable
      'unicorn/prefer-dom-node-remove': ['off'], // TODO: enable
      'unicorn/no-for-loop': ['off'], // TODO: enable
      'unicorn/prefer-string-raw': ['off'], // TODO: enable
    },
  },
  compat.configs['flat/recommended'],
  storybook.configs['flat/recommended'],
)
