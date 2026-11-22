// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import compat from 'eslint-plugin-compat'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import storybook from 'eslint-plugin-storybook'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['dist', './.storybook/**', './storybook-static/**', 'public/mockServiceWorker.js'],
  },
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
          enableAutofixRemoval: {
            imports: true,
          },
        },
      ],
    },
  },
  {
    ignores: [
      './src/components/ui/*.tsx', // shadcn components
      './src/**/*.stories.tsx',
    ],
    files: ['./src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    extends: [...tseslint.configs.recommendedTypeChecked],
    rules: {
      '@typescript-eslint/no-redundant-type-constituents': ['off'], // shows intent
    },
  },
  {
    files: ['./src/**/*.{ts,tsx}'],
    extends: [...pluginQuery.configs['flat/recommended']],
    rules: {
      '@tanstack/query/exhaustive-deps': [
        'error',
        {
          allowlist: {
            variables: ['client', 'token'],
          },
        },
      ],
    },
  },
  {
    extends: [eslintPluginUnicorn.configs.recommended],
    ignores: [
      './src/components/ui/*.tsx', // shadcn components
    ],
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
      'unicorn/no-negated-condition': ['off'], // allows handling errors first
      'unicorn/catch-error-name': [
        'error',
        {
          ignore: ['_ignoredOnPurpose'],
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
      'unicorn/name-replacements': [
        'error',
        {
          checkFilenames: false,
          allowList: {
            acc: true,
            args: true,
            i: true,
            val: true,
            Fn: true,
            props: true,
            Props: true,
            dev: true,
            Dev: true,
            ref: true,
            Ref: true,
          },
        },
      ],
      'unicorn/number-literal-case': [
        'error',
        {
          hexadecimalValue: 'lowercase',
        },
      ],

      'unicorn/switch-case-braces': ['off'], // TODO: enable
      'unicorn/no-null': ['off'], // TODO: enable

      // rules added to `recommended` in eslint-plugin-unicorn v66–v79
      'unicorn/consistent-boolean-name': ['off'], // TODO: enable
      'unicorn/no-asterisk-prefix-in-documentation-comments': ['off'], // keep JSDoc style
      'unicorn/single-line-block-comment-style': ['off'], // keep JSDoc style
      'unicorn/max-nested-calls': ['off'], // too restrictive for tests and jsx
      'unicorn/no-unnecessary-boolean-comparison': ['off'], // not type-aware: `x === false` differs from `!x` for optional booleans
      'unicorn/prefer-await': ['off'], // promise chaining can improve readability
      'unicorn/prefer-number-coercion': ['off'], // TODO: enable
      'unicorn/prefer-smaller-scope': ['off'], // can improve readability
      'unicorn/no-top-level-assignment-in-function': ['off'], // TODO: enable
      'unicorn/no-non-function-verb-prefix': ['off'], // TODO: enable
      'unicorn/prefer-simple-condition-first': ['off'], // can improve comprehensibility
      'unicorn/no-unnecessary-parameters': ['off'], // TODO: enable
      'unicorn/no-unreadable-object-destructuring': ['off'], // TODO: enable
      'unicorn/no-unreadable-array-destructuring': ['off'], // TODO: enable
      'unicorn/no-unreadable-for-of-expression': ['off'], // TODO: enable
      'unicorn/prefer-iterator-to-array': ['off'], // requires ES2025 iterator helpers
      'unicorn/prefer-iterator-helpers': ['off'], // requires ES2025 iterator helpers
      'unicorn/prefer-group-by': ['off'], // requires ES2024 `Map.groupBy`
      'unicorn/prefer-promise-with-resolvers': ['off'], // requires ES2024 `Promise.withResolvers`
      'unicorn/prefer-number-is-safe-integer': ['off'], // not equivalent to `Number.isInteger`
      'unicorn/prefer-math-constants': ['off'], // approximate values are used intentionally in tests
      'unicorn/no-declarations-before-early-exit': ['off'], // TODO: enable
      'unicorn/prefer-default-parameters': ['off'], // TODO: enable
      'unicorn/prefer-logical-operator-over-ternary': ['off'], // TODO: enable
      'unicorn/prefer-early-return': ['off'], // TODO: enable
      'unicorn/no-useless-else': ['off'], // TODO: enable
      'unicorn/no-useless-template-literals': ['off'], // TODO: enable
      'unicorn/prefer-hoisting-branch-code': ['off'], // TODO: enable
      'unicorn/prefer-else-if': ['off'], // TODO: enable
      'unicorn/prefer-then-catch': ['off'], // TODO: enable
      'unicorn/prefer-object-define-properties': ['off'], // TODO: enable
      'unicorn/default-export-style': ['off'], // TODO: enable
      'unicorn/require-array-sort-compare': ['off'], // TODO: enable
      'unicorn/no-error-property-assignment': ['off'], // TODO: enable
      'unicorn/no-global-object-property-assignment': ['off'], // TODO: enable
      'unicorn/no-unnecessary-array-flat-map': ['off'], // TODO: enable
      'unicorn/no-unsafe-string-replacement': ['off'], // TODO: enable
    },
  },
  {
    files: ['./src/**/*.tsx'],
    ignores: [
      './src/components/ui/*.tsx', // shadcn components
      './src/**/*.test.tsx',
      './src/**/*.stories.tsx',
    ],
    extends: [jsxA11y.flatConfigs.recommended],
    rules: {
      'jsx-a11y/anchor-has-content': ['off'], // content is injected by <Trans components={...}>
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
    },
  },
  compat.configs['flat/recommended'],
  storybook.configs['flat/recommended'],
)
