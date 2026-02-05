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
      ecmaVersion: 2023,
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
      'unicorn/prefer-global-this': ['off'],
      'unicorn/no-thenable': ['off'], // used by yup schema validation
      'unicorn/prefer-ternary': ['off'], // can improve readability
      'unicorn/no-nested-ternary': ['off'], // can improve readability
      'unicorn/no-useless-undefined': ['off'], // can improve comprehensibility
      'unicorn/catch-error-name': [
        'error',
        {
          ignore: [
            String.raw`^error\d*$`,
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
      'unicorn/no-null': ['off'], // TODO: enable
      'unicorn/no-negated-condition': ['off'], // TODO: enable
    },
  },
  compat.configs['flat/recommended'],
  storybook.configs['flat/recommended'],
)
